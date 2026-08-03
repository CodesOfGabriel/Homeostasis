import type { PhysiologyState } from './types';

export type HypothalamicSignalId =
    | 'sympathetic-arousal'
    | 'parasympathetic-recovery'
    | 'chemoreflex-ventilation'
    | 'reduce-respiratory-drive'
    | 'adh-retention'
    | 'suppress-adh';

export type HypothalamicAxis = 'autonomic' | 'respiratory' | 'osmotic';

export interface HypothalamicRegulationState {
    autonomicTone: number;      // -1 parassimpático, +1 simpático
    respiratoryDrive: number;  // -1 abaixo do basal, +1 acima do basal
    osmoticDrive: number;       // -1 supressão de ADH, +1 retenção hídrica
    lastSignal: HypothalamicSignalId | null;
}

export interface HypothalamicSignalDefinition {
    id: HypothalamicSignalId;
    label: string;
    shortLabel: string;
    description: string;
    mechanism: string;
    axis: HypothalamicAxis;
    cost: number;
    cooldownSeconds: number;
    effects: Partial<Pick<HypothalamicRegulationState, 'autonomicTone' | 'respiratoryDrive' | 'osmoticDrive'>>;
}

export interface RegulatoryCommands {
    heartRateTarget: number;
    ventilationDrive: number;
    renalWaterReabsorption: number;
}

export const HYPOTHALAMIC_SIGNALS: HypothalamicSignalDefinition[] = [
    {
        id: 'sympathetic-arousal',
        label: 'Ativar resposta simpática',
        shortLabel: 'Simpático',
        description: 'Aumenta alerta autonômico, cronotropismo e suporte ventilatório.',
        mechanism: 'Núcleos hipotalâmicos → tronco encefálico → descarga simpática sistêmica.',
        axis: 'autonomic', cost: .10, cooldownSeconds: 16,
        effects: { autonomicTone: .62, respiratoryDrive: .12 },
    },
    {
        id: 'parasympathetic-recovery',
        label: 'Favorecer recuperação parassimpática',
        shortLabel: 'Parassimpático',
        description: 'Reduz o estado de alerta e favorece recuperação cardiovascular.',
        mechanism: 'Inibição hipotalâmica do alerta → maior influência vagal sobre o nó sinusal.',
        axis: 'autonomic', cost: .07, cooldownSeconds: 14,
        effects: { autonomicTone: -.58, respiratoryDrive: -.08 },
    },
    {
        id: 'chemoreflex-ventilation',
        label: 'Reforçar resposta quimiorreflexa',
        shortLabel: 'Quimiorreflexo ↑',
        description: 'Amplifica o drive respiratório central diante de CO₂, acidemia ou hipóxia.',
        mechanism: 'Quimiorreceptores e centros bulbares aumentam o drive ventilatório; o hipotálamo modula o contexto autonômico.',
        axis: 'respiratory', cost: .09, cooldownSeconds: 14,
        effects: { respiratoryDrive: .68 },
    },
    {
        id: 'reduce-respiratory-drive',
        label: 'Reduzir estado respiratório de alerta',
        shortLabel: 'Drive respiratório ↓',
        description: 'Diminui hiperventilação ligada ao alerta quando gases e pH permitem.',
        mechanism: 'Menor sinal excitatório central aproxima a ventilação do ritmo metabólico basal.',
        axis: 'respiratory', cost: .06, cooldownSeconds: 14,
        effects: { respiratoryDrive: -.48 },
    },
    {
        id: 'adh-retention',
        label: 'Ativar osmorreceptores e liberar ADH',
        shortLabel: 'ADH ↑',
        description: 'Favorece conservação renal de água em resposta à hipovolemia ou hiperosmolaridade.',
        mechanism: 'Osmorreceptores → núcleos supraóptico/paraventricular → neuro-hipófise → ADH.',
        axis: 'osmotic', cost: .08, cooldownSeconds: 18,
        effects: { osmoticDrive: .72 },
    },
    {
        id: 'suppress-adh',
        label: 'Suprimir sinal osmótico de ADH',
        shortLabel: 'ADH ↓',
        description: 'Permite maior excreção de água quando há excesso hídrico e sódio diluído.',
        mechanism: 'Menor disparo dos osmorreceptores reduz a liberação neuro-hipofisária de ADH.',
        axis: 'osmotic', cost: .05, cooldownSeconds: 18,
        effects: { osmoticDrive: -.68 },
    },
];

export function createInitialHypothalamicState(): HypothalamicRegulationState {
    return { autonomicTone: 0, respiratoryDrive: 0, osmoticDrive: 0, lastSignal: null };
}

export function getHypothalamicSignal(id: string): HypothalamicSignalDefinition | undefined {
    return HYPOTHALAMIC_SIGNALS.find(signal => signal.id === id);
}

export function isHypothalamicSignalSafe(
    id: HypothalamicSignalId,
    physiology: PhysiologyState,
): { safe: boolean; reason?: string } {
    if (id === 'sympathetic-arousal' && physiology.cardiovascular.heartRate >= 130) {
        return { safe: false, reason: 'Descarga simpática bloqueada: frequência cardíaca já está muito elevada.' };
    }
    if (id === 'parasympathetic-recovery' && physiology.cardiovascular.heartRate <= 52) {
        return { safe: false, reason: 'Recuperação vagal bloqueada: frequência cardíaca já está baixa.' };
    }
    if (id === 'reduce-respiratory-drive'
        && (physiology.respiratory.paco2 >= 48 || physiology.acidBase.pH < 7.32 || physiology.respiratory.spo2 < 94)) {
        return { safe: false, reason: 'Redução bloqueada: CO₂, pH ou oxigenação exigem suporte ventilatório.' };
    }
    if (id === 'adh-retention'
        && (physiology.nutrients.sodium < 132 || physiology.nutrients.hydration > 44)) {
        return { safe: false, reason: 'ADH bloqueado: há risco de retenção excessiva ou hiponatremia dilucional.' };
    }
    if (id === 'suppress-adh'
        && (physiology.nutrients.hydration < 38 || physiology.nutrients.sodium > 147)) {
        return { safe: false, reason: 'Supressão de ADH bloqueada: o organismo precisa conservar água.' };
    }
    return { safe: true };
}

export function applyHypothalamicSignal(
    state: HypothalamicRegulationState,
    definition: HypothalamicSignalDefinition,
): HypothalamicRegulationState {
    return {
        autonomicTone: clamp(state.autonomicTone + (definition.effects.autonomicTone ?? 0), -1, 1),
        respiratoryDrive: clamp(state.respiratoryDrive + (definition.effects.respiratoryDrive ?? 0), -1, 1),
        osmoticDrive: clamp(state.osmoticDrive + (definition.effects.osmoticDrive ?? 0), -1, 1),
        lastSignal: definition.id,
    };
}

export function advanceHypothalamicRegulation(
    state: HypothalamicRegulationState,
    deltaTime: number,
): HypothalamicRegulationState {
    const decay = Math.exp(-Math.max(0, deltaTime) / 75);
    return {
        autonomicTone: state.autonomicTone * decay,
        respiratoryDrive: state.respiratoryDrive * decay,
        osmoticDrive: state.osmoticDrive * decay,
        lastSignal: state.lastSignal,
    };
}

export function deriveRegulatoryCommands(state: HypothalamicRegulationState): RegulatoryCommands {
    const autonomicHeartRate = state.autonomicTone >= 0
        ? 70 + state.autonomicTone * 58
        : 70 + state.autonomicTone * 24;
    return {
        heartRateTarget: clamp(autonomicHeartRate, 46, 145),
        ventilationDrive: clamp(100 + state.respiratoryDrive * 68 + Math.max(0, state.autonomicTone) * 12, 65, 175),
        renalWaterReabsorption: clamp(99.2 + state.osmoticDrive * .58, 98.6, 99.78),
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
