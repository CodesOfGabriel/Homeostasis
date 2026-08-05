import type { PhysiologyState } from './types';

export type HypothalamicSignalId =
    | 'sympathetic-arousal'
    | 'parasympathetic-recovery'
    | 'chemoreflex-ventilation'
    | 'reduce-respiratory-drive'
    | 'adh-retention'
    | 'suppress-adh'
    | 'activate-pomc-cart'
    | 'activate-npy-agrp';

export type HypothalamicAxis = 'autonomic' | 'respiratory' | 'osmotic' | 'appetite';

/**
 * Estado integrado de tronco encefálico, barorreflexo, hipotálamo e controle
 * autonômico. Os aliases históricos são mantidos para migração do save/API.
 */
export interface HypothalamicRegulationState {
    autonomicTone: number;
    respiratoryDrive: number;
    osmoticDrive: number;
    feedingDrive: number;
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
    effects: Partial<Pick<HypothalamicRegulationState, 'autonomicTone' | 'respiratoryDrive' | 'osmoticDrive' | 'feedingDrive'>>;
}

export interface RegulatoryCommands {
    heartRateTarget: number;
    ventilationDrive: number;
    renalWaterReabsorption: number;
}

export const HYPOTHALAMIC_SIGNALS: HypothalamicSignalDefinition[] = [
    {
        id: 'sympathetic-arousal',
        label: 'Recrutar controle autonômico simpático',
        shortLabel: 'Simpático',
        description: 'Aumenta alerta autonômico, cronotropismo e suporte ventilatório.',
        mechanism: 'Integração hipotalâmica e bulbar → descarga simpática sistêmica.',
        axis: 'autonomic', cost: .10, cooldownSeconds: 16,
        effects: { autonomicTone: .62, respiratoryDrive: .12 },
    },
    {
        id: 'parasympathetic-recovery',
        label: 'Favorecer recuperação parassimpática',
        shortLabel: 'Parassimpático',
        description: 'Reduz o estado de alerta e favorece recuperação cardiovascular.',
        mechanism: 'Integração autonômica → maior influência vagal sobre o nó sinusal.',
        axis: 'autonomic', cost: .07, cooldownSeconds: 14,
        effects: { autonomicTone: -.58, respiratoryDrive: -.08 },
    },
    {
        id: 'chemoreflex-ventilation',
        label: 'Reforçar resposta quimiorreflexa bulbar',
        shortLabel: 'Quimiorreflexo ↑',
        description: 'Amplifica o drive respiratório central diante de CO₂, acidemia ou hipóxia.',
        mechanism: 'Quimiorreceptores centrais/periféricos → medula e ponte → drive ventilatório; o hipotálamo apenas modula o contexto.',
        axis: 'respiratory', cost: .09, cooldownSeconds: 14,
        effects: { respiratoryDrive: .68 },
    },
    {
        id: 'reduce-respiratory-drive',
        label: 'Reduzir estado respiratório de alerta',
        shortLabel: 'Drive respiratório ↓',
        description: 'Diminui hiperventilação ligada ao alerta quando gases e pH permitem.',
        mechanism: 'Centros bulbares aproximam a ventilação da demanda metabólica após aferir CO₂, O₂ e pH.',
        axis: 'respiratory', cost: .06, cooldownSeconds: 14,
        effects: { respiratoryDrive: -.48 },
    },
    {
        id: 'adh-retention',
        label: 'Ativar osmorreceptores e liberar ADH',
        shortLabel: 'ADH ↑',
        description: 'Favorece conservação de água livre no ducto coletor em hipovolemia ou hiperosmolaridade.',
        mechanism: 'Osmorreceptores → núcleos supraóptico/paraventricular → neuro-hipófise → ADH → AQP2.',
        axis: 'osmotic', cost: .08, cooldownSeconds: 18,
        effects: { osmoticDrive: .72 },
    },
    {
        id: 'suppress-adh',
        label: 'Suprimir sinal osmótico de ADH',
        shortLabel: 'ADH ↓',
        description: 'Permite maior excreção de água livre quando há excesso hídrico e sódio diluído.',
        mechanism: 'Menor disparo osmorreceptor reduz ADH e a inserção distal de AQP2.',
        axis: 'osmotic', cost: .05, cooldownSeconds: 18,
        effects: { osmoticDrive: -.68 },
    },
    {
        id: 'activate-pomc-cart',
        label: 'Recrutar eixo anorexígeno POMC/CART',
        shortLabel: 'POMC/CART',
        description: 'Integra leptina e insulina para reduzir o drive alimentar quando a reserva energética é suficiente.',
        mechanism: 'Leptina/insulina → neurônios POMC/CART → melanocortina → saciedade e maior gasto energético.',
        axis: 'appetite', cost: .08, cooldownSeconds: 20,
        effects: { feedingDrive: -.72 },
    },
    {
        id: 'activate-npy-agrp',
        label: 'Recrutar eixo orexígeno NPY/AgRP',
        shortLabel: 'NPY/AgRP',
        description: 'Integra grelina, jejum e baixa disponibilidade de glicose para priorizar busca e ingestão de alimento.',
        mechanism: 'Grelina/baixa leptina → neurônios NPY/AgRP → fome e conservação de energia.',
        axis: 'appetite', cost: .07, cooldownSeconds: 20,
        effects: { feedingDrive: .72 },
    },
];

export function createInitialHypothalamicState(): HypothalamicRegulationState {
    return { autonomicTone: 0, respiratoryDrive: 0, osmoticDrive: 0, feedingDrive: 0, lastSignal: null };
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
    if (id === 'activate-pomc-cart'
        && (physiology.nutrients.bloodGlucose < 70 || physiology.nutrients.hoursSinceMeal > 16)) {
        return { safe: false, reason: 'POMC/CART bloqueado: baixa oferta energética exige preservar o drive alimentar.' };
    }
    if (id === 'activate-npy-agrp'
        && physiology.nutrients.bloodGlucose > 155 && physiology.nutrients.hoursSinceMeal < 2) {
        return { safe: false, reason: 'NPY/AgRP bloqueado: há substrato pós-prandial abundante e risco de nova sobrecarga.' };
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
        feedingDrive: clamp(state.feedingDrive + (definition.effects.feedingDrive ?? 0), -1, 1),
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
        feedingDrive: state.feedingDrive * decay,
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
        // O motor renal converte este comando legado em água livre distal.
        renalWaterReabsorption: clamp(99.2 + state.osmoticDrive * .58, 98.6, 99.78),
    };
}

export type CentralRegulationState = HypothalamicRegulationState;
export type CentralRegulatorySignalId = HypothalamicSignalId;
export type CentralRegulatoryAxis = HypothalamicAxis;
export const CENTRAL_REGULATORY_SIGNALS = HYPOTHALAMIC_SIGNALS;
export const createInitialCentralRegulationState = createInitialHypothalamicState;
export const getCentralRegulatorySignal = getHypothalamicSignal;
export const isCentralRegulatorySignalSafe = isHypothalamicSignalSafe;
export const applyCentralRegulatorySignal = applyHypothalamicSignal;
export const advanceCentralRegulation = advanceHypothalamicRegulation;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
