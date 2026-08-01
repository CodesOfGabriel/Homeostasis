import type { HormonalProfile } from '../types';

export type HormoneKey = keyof HormonalProfile;
export type HormoneCategory = 'anabolic' | 'catabolic' | 'regulatory';
export type SafetyRuleId =
    | 'glucose-for-insulin'
    | 'cardiac-catecholamine'
    | 'energy-for-cortisol'
    | 'substrate-for-anabolism'
    | 'cardiac-thyroid';
export type HormoneEffectModelId =
    | 'insulin'
    | 'glucagon'
    | 'catecholamine'
    | 'glucocorticoid'
    | 'growth-axis'
    | 'androgen'
    | 'thyroid'
    | 'mtor';

export interface HormoneDefinition {
    label: string;
    unit: string;
    baseline: number;
    halfLifeSeconds: number;
    upperLimit: number;
}

export const HORMONE_DEFINITIONS: Record<HormoneKey, HormoneDefinition> = {
    insulin: { label: 'Insulina', unit: 'μIU/mL', baseline: 10, halfLifeSeconds: 5 * 60, upperLimit: 300 },
    gh: { label: 'Hormônio do crescimento', unit: 'ng/mL', baseline: 1, halfLifeSeconds: 20 * 60, upperLimit: 100 },
    testosterone: { label: 'Testosterona', unit: 'ng/dL', baseline: 600, halfLifeSeconds: 60 * 60, upperLimit: 3000 },
    igf1: { label: 'IGF-1', unit: 'ng/mL', baseline: 200, halfLifeSeconds: 8 * 60 * 60, upperLimit: 1000 },
    cortisol: { label: 'Cortisol', unit: 'μg/dL', baseline: 12, halfLifeSeconds: 70 * 60, upperLimit: 150 },
    glucagon: { label: 'Glucagon', unit: 'pg/mL', baseline: 80, halfLifeSeconds: 6 * 60, upperLimit: 1000 },
    adrenaline: { label: 'Adrenalina', unit: 'pg/mL', baseline: 30, halfLifeSeconds: 2 * 60, upperLimit: 3000 },
    noradrenaline: { label: 'Noradrenalina', unit: 'pg/mL', baseline: 200, halfLifeSeconds: 2.5 * 60, upperLimit: 5000 },
    t3: { label: 'Triiodotironina', unit: 'ng/dL', baseline: 120, halfLifeSeconds: 24 * 60 * 60, upperLimit: 800 },
    t4: { label: 'Tiroxina', unit: 'μg/dL', baseline: 8, halfLifeSeconds: 7 * 24 * 60 * 60, upperLimit: 60 },
    tsh: { label: 'TSH', unit: 'μIU/mL', baseline: 2, halfLifeSeconds: 50 * 60, upperLimit: 100 },
    mTORActivity: { label: 'Atividade da via mTOR', unit: '%', baseline: 50, halfLifeSeconds: 15 * 60, upperLimit: 100 },
};

export interface HormoneActionDefinition {
    id: string;
    name: string;
    shortName: string;
    description: string;
    hormone: HormoneKey;
    dose: number;
    bolusFraction: number;
    infusionSeconds: number;
    cooldownSeconds: number;
    metabolicCost: number;
    category: HormoneCategory;
    safetyRules: SafetyRuleId[];
    effectModel: HormoneEffectModelId;
    implementedEffects: string[];
    expectedDirections: string[];
    latency: string;
}

export const HORMONAL_ACTIONS = [
    {
        id: 'release-insulin', name: 'Liberar Insulina', shortName: 'Insulina',
        description: 'Favorece captação de glicose, glicogênio e síntese dependente de substrato.',
        hormone: 'insulin', dose: 20, bolusFraction: .45, infusionSeconds: 30,
        cooldownSeconds: 120, metabolicCost: .5, category: 'anabolic',
        safetyRules: ['glucose-for-insulin'], effectModel: 'insulin',
        implementedEffects: ['Captação de glicose', 'Síntese de glicogênio', 'Entrada celular de K⁺', 'Inibição de cetogênese'],
        expectedDirections: ['glicose ↓', 'glicogênio ↑', 'K⁺ plasmático ↓'], latency: 'segundos a minutos simulados',
    },
    {
        id: 'release-gh', name: 'Liberar GH', shortName: 'GH',
        description: 'Ativa o eixo GH–IGF-1 e favorece lipólise e síntese quando há energia.',
        hormone: 'gh', dose: 5, bolusFraction: .2, infusionSeconds: 180,
        cooldownSeconds: 3600, metabolicCost: 2, category: 'anabolic',
        safetyRules: ['substrate-for-anabolism'], effectModel: 'growth-axis',
        implementedEffects: ['Produção hepática de IGF-1', 'Lipólise', 'Sinal anabólico dependente de ATP'],
        expectedDirections: ['IGF-1 ↑ lento', 'lipólise ↑', 'mTOR ↑'], latency: 'minutos a horas biológicas',
    },
    {
        id: 'release-testosterone', name: 'Liberar Testosterona', shortName: 'Testosterona',
        description: 'Aumenta lentamente recuperação e síntese proteica quando há substrato e repouso.',
        hormone: 'testosterone', dose: 300, bolusFraction: .1, infusionSeconds: 600,
        cooldownSeconds: 7200, metabolicCost: 3, category: 'anabolic',
        safetyRules: ['substrate-for-anabolism'], effectModel: 'androgen',
        implementedEffects: ['Síntese proteica lenta', 'Recuperação de dano muscular', 'Sensibilização anabólica'],
        expectedDirections: ['síntese proteica ↑ lento', 'recuperação ↑'], latency: 'horas a dias biológicos',
    },
    {
        id: 'release-glucagon', name: 'Liberar Glucagon', shortName: 'Glucagon',
        description: 'Mobiliza glicogênio hepático e aumenta produção de glicose e cetonas.',
        hormone: 'glucagon', dose: 100, bolusFraction: .45, infusionSeconds: 24,
        cooldownSeconds: 180, metabolicCost: .3, category: 'catabolic',
        safetyRules: [], effectModel: 'glucagon',
        implementedEffects: ['Glicogenólise hepática', 'Gliconeogênese', 'Lipólise/cetogênese dependente da insulina'],
        expectedDirections: ['glicose ↑', 'glicogênio hepático ↓', 'cetonas ↗'], latency: 'segundos a minutos simulados',
    },
    {
        id: 'release-adrenaline', name: 'Liberar Adrenalina', shortName: 'Adrenalina',
        description: 'Amplifica a resposta de luta ou fuga e mobiliza rapidamente energia.',
        hormone: 'adrenaline', dose: 200, bolusFraction: .65, infusionSeconds: 12,
        cooldownSeconds: 300, metabolicCost: 1, category: 'catabolic',
        safetyRules: ['cardiac-catecholamine'], effectModel: 'catecholamine',
        implementedEffects: ['Frequência e contratilidade', 'Tônus vascular', 'Glicogenólise', 'Lipólise', 'Broncodilatação'],
        expectedDirections: ['FC ↑', 'PAM ↗', 'glicose ↑', 'lipólise ↑'], latency: 'imediato',
    },
    {
        id: 'release-cortisol', name: 'Liberar Cortisol', shortName: 'Cortisol',
        description: 'Sustenta gliconeogênese, tônus vascular e mobilização proteica sob estresse.',
        hormone: 'cortisol', dose: 30, bolusFraction: .15, infusionSeconds: 120,
        cooldownSeconds: 600, metabolicCost: 1.5, category: 'catabolic',
        safetyRules: ['energy-for-cortisol'], effectModel: 'glucocorticoid',
        implementedEffects: ['Gliconeogênese', 'Proteólise', 'Permissividade vascular', 'Modulação imune e de eixos'],
        expectedDirections: ['glicose ↑ lento', 'aminoácidos ↑', 'recuperação ↓ se crônico'], latency: 'minutos a horas biológicas',
    },
    {
        id: 'increase-t3', name: 'Aumentar T3', shortName: 'T3',
        description: 'Eleva gasto basal, consumo de O₂, termogênese e sensibilidade adrenérgica.',
        hormone: 't3', dose: 50, bolusFraction: .05, infusionSeconds: 600,
        cooldownSeconds: 14400, metabolicCost: 2, category: 'regulatory',
        safetyRules: ['cardiac-thyroid'], effectModel: 'thyroid',
        implementedEffects: ['TMB e consumo de O₂', 'Termogênese', 'Sensibilidade adrenérgica', 'Feedback sobre TSH'],
        expectedDirections: ['TMB ↑ lento', 'temperatura ↗', 'FC ↗'], latency: 'horas a dias biológicos',
    },
    {
        id: 'boost-mtor', name: 'Ativar via mTOR', shortName: 'mTOR',
        description: 'Ativa a via anabólica apenas quando aminoácidos, insulina e ATP permitem.',
        hormone: 'mTORActivity', dose: 30, bolusFraction: .25, infusionSeconds: 90,
        cooldownSeconds: 1800, metabolicCost: 1, category: 'anabolic',
        safetyRules: ['substrate-for-anabolism'], effectModel: 'mtor',
        implementedEffects: ['Síntese proteica dependente de energia', 'Sinal de crescimento muscular'],
        expectedDirections: ['síntese proteica ↑', 'demanda de ATP ↑'], latency: 'minutos simulados',
    },
] as const satisfies readonly HormoneActionDefinition[];

export type HormoneActionId = typeof HORMONAL_ACTIONS[number]['id'];

export function getHormoneAction(actionId: string): HormoneActionDefinition | undefined {
    return HORMONAL_ACTIONS.find(action => action.id === actionId);
}

export const HORMONE_CATEGORIES: Record<HormoneCategory, { name: string; description: string }> = {
    anabolic: { name: 'Anabólicos', description: 'Construção, armazenamento e reparo' },
    catabolic: { name: 'Catabólicos', description: 'Mobilização e resposta ao estresse' },
    regulatory: { name: 'Regulatórios', description: 'Ajuste de metabolismo e eixos' },
};
