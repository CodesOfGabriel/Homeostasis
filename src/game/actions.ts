import {
    HORMONAL_ACTIONS,
    HORMONE_CATEGORIES,
    HORMONE_DEFINITIONS,
    getHormoneAction,
    type HormoneActionDefinition,
    type HormoneCategory,
} from './config/hormones';
import type { HormonalProfile } from './types';

export {
    HORMONAL_ACTIONS,
    HORMONE_CATEGORIES as ACTION_CATEGORIES,
    HORMONE_DEFINITIONS,
    getHormoneAction as getActionDefinition,
};
export type { HormoneActionDefinition };

export interface HormoneSafetyContext {
    glucose: number;
    pH: number;
    heartRate: number;
    energyDeficit: number;
    aminoAcids?: number;
    atpPool?: number;
    cortisol?: number;
    t3?: number;
}

export function getActionsByCategory(category: HormoneCategory): HormoneActionDefinition[] {
    return HORMONAL_ACTIONS.filter(action => action.category === category);
}

/** Segurança de domínio. O store chama esta função novamente antes de enfileirar. */
export function isActionSafe(
    actionId: string,
    state: HormoneSafetyContext,
): { safe: boolean; reason?: string } {
    const action = getHormoneAction(actionId);
    if (!action) return { safe: false, reason: 'Ação hormonal não encontrada.' };

    for (const rule of action.safetyRules) {
        if (rule === 'glucose-for-insulin' && state.glucose < 70) {
            return { safe: false, reason: 'Glicemia baixa: insulina ampliaria o risco de hipoglicemia.' };
        }
        if (rule === 'cardiac-catecholamine' && (state.pH < 7.2 || state.heartRate > 150)) {
            return { safe: false, reason: state.pH < 7.2 ? 'Acidemia aumenta o risco de arritmia por catecolaminas.' : 'Frequência cardíaca já elevada; risco de taquiarritmia.' };
        }
        if (rule === 'energy-for-cortisol' && state.energyDeficit > 50) {
            return { safe: false, reason: 'Déficit energético alto: cortisol ampliaria o catabolismo.' };
        }
        if (rule === 'substrate-for-anabolism' && ((state.aminoAcids ?? 40) < 25 || (state.atpPool ?? 10) < 2)) {
            return { safe: false, reason: 'Aminoácidos ou ATP insuficientes para sustentar a resposta anabólica.' };
        }
        if (rule === 'cardiac-thyroid' && state.heartRate > 120) {
            return { safe: false, reason: 'Taquicardia presente: elevar T3 aumentaria demanda e sensibilidade adrenérgica.' };
        }
        if (rule === 'glucose-for-satiety' && state.glucose < 70) {
            return { safe: false, reason: 'Glicemia baixa: reforçar saciedade pode atrasar a reposição de substrato.' };
        }
        if (rule === 'thyroid-excess-for-suppression' && (state.t3 ?? 120) < 160) {
            return { safe: false, reason: 'Supressão bloqueada: não há excesso tireoidiano efetor.' };
        }
        if (rule === 'cortisol-excess-for-suppression' && (state.cortisol ?? 12) < 22) {
            return { safe: false, reason: 'Supressão bloqueada: cortisol não está elevado.' };
        }
    }
    return { safe: true };
}

export interface HormonalCombo {
    id: 'anabolism' | 'energy-mobilization' | 'stress-response' | 'thermogenesis';
    name: string;
    description: string;
    synergy: number;
}

export interface HormonalComboContext {
    glucose: number;
    aminoAcids: number;
    heartRate: number;
    energyDemand: number;
    allostaticLoad: number;
    liverGlycogen: number;
    fattyAcids: number;
}

/** Combos exigem concentração supra-basal e condições fisiológicas verdadeiras. */
export function detectActiveCombos(
    profile: HormonalProfile,
    context: HormonalComboContext,
): HormonalCombo[] {
    const elevated = (key: keyof HormonalProfile, fraction = .15) =>
        profile[key] > HORMONE_DEFINITIONS[key].baseline * (1 + fraction);
    const combos: HormonalCombo[] = [];

    if (elevated('insulin') && elevated('gh') && elevated('testosterone', .08)
        && context.glucose > 100 && context.aminoAcids >= 35 && context.heartRate < 85) {
        combos.push({ id: 'anabolism', name: 'Anabolismo coordenado', description: 'Insulina, GH e andrógeno encontram substrato e repouso.', synergy: 1.35 });
    }
    if (elevated('glucagon') && elevated('adrenaline')
        && context.glucose < 85 && context.energyDemand > 36 && context.liverGlycogen > 5) {
        combos.push({ id: 'energy-mobilization', name: 'Mobilização energética', description: 'Glucagon e adrenalina mobilizam reserva sob demanda.', synergy: 1.25 });
    }
    if (elevated('cortisol') && elevated('adrenaline') && context.allostaticLoad > 40) {
        combos.push({ id: 'stress-response', name: 'Resposta integrada ao estresse', description: 'HPA e simpático sustentam mobilização e tônus.', synergy: 1.2 });
    }
    if (elevated('t3', .08) && elevated('adrenaline') && context.fattyAcids > .25) {
        combos.push({ id: 'thermogenesis', name: 'Termogênese', description: 'T3 sensibiliza a resposta adrenérgica com combustível disponível.', synergy: 1.15 });
    }
    return combos;
}
