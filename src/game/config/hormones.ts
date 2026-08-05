import type { HormonalProfile } from '../types';

export type HormoneKey = keyof HormonalProfile;
export type HormoneCategory = 'anabolic' | 'catabolic' | 'regulatory';
export type SafetyRuleId =
    | 'glucose-for-insulin'
    | 'cardiac-catecholamine'
    | 'energy-for-cortisol'
    | 'substrate-for-anabolism'
    | 'cardiac-thyroid'
    | 'glucose-for-satiety'
    | 'thyroid-excess-for-suppression'
    | 'cortisol-excess-for-suppression';
export type HormoneEffectModelId =
    | 'insulin'
    | 'glucagon'
    | 'catecholamine'
    | 'glucocorticoid'
    | 'growth-axis'
    | 'androgen'
    | 'thyroid'
    | 'appetite-axis'
    | 'adipokine';

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
    ghrelin: { label: 'Grelina', unit: 'pg/mL', baseline: 600, halfLifeSeconds: 30 * 60, upperLimit: 2500 },
    leptin: { label: 'Leptina', unit: 'ng/mL', baseline: 10, halfLifeSeconds: 28 * 60, upperLimit: 100 },
    adiponectin: { label: 'Adiponectina', unit: 'μg/mL', baseline: 10, halfLifeSeconds: 2.5 * 60 * 60, upperLimit: 50 },
    t3: { label: 'Triiodotironina', unit: 'ng/dL', baseline: 120, halfLifeSeconds: 24 * 60 * 60, upperLimit: 800 },
    t4: { label: 'Tiroxina', unit: 'μg/dL', baseline: 8, halfLifeSeconds: 7 * 24 * 60 * 60, upperLimit: 60 },
    tsh: { label: 'TSH', unit: 'μIU/mL', baseline: 2, halfLifeSeconds: 50 * 60, upperLimit: 100 },
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
    effectDirection?: 'increase' | 'decrease';
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
        id: 'signal-ghrelin', name: 'Sinalizar Grelina', shortName: 'Grelina',
        description: 'Reforça o sinal pré-prandial que recruta NPY/AgRP e prepara ingestão e mobilização de energia.',
        hormone: 'ghrelin', dose: 500, bolusFraction: .25, infusionSeconds: 90,
        cooldownSeconds: 300, metabolicCost: .25, category: 'regulatory',
        safetyRules: [], effectModel: 'appetite-axis',
        implementedEffects: ['Drive orexígeno', 'Recrutamento de NPY/AgRP', 'Pulso permissivo de GH'],
        expectedDirections: ['grelina ↑', 'fome ↑', 'NPY/AgRP ↑'], latency: 'minutos biológicos',
    },
    {
        id: 'signal-leptin', name: 'Sinalizar Leptina', shortName: 'Leptina',
        description: 'Informa suficiência da reserva adiposa e favorece POMC/CART quando há sensibilidade ao sinal.',
        hormone: 'leptin', dose: 10, bolusFraction: .2, infusionSeconds: 180,
        cooldownSeconds: 600, metabolicCost: .35, category: 'regulatory',
        safetyRules: ['glucose-for-satiety'], effectModel: 'appetite-axis',
        implementedEffects: ['Drive POMC/CART', 'Inibição relativa de NPY/AgRP', 'Sinal de reserva energética'],
        expectedDirections: ['leptina ↑', 'saciedade ↑', 'drive orexígeno ↓'], latency: 'minutos a horas biológicas',
    },
    {
        id: 'increase-adiponectin', name: 'Aumentar Adiponectina', shortName: 'Adiponectina',
        description: 'Melhora a sensibilidade periférica à insulina e favorece o uso metabólico de ácidos graxos.',
        hormone: 'adiponectin', dose: 8, bolusFraction: .15, infusionSeconds: 300,
        cooldownSeconds: 900, metabolicCost: .45, category: 'regulatory',
        safetyRules: [], effectModel: 'adipokine',
        implementedEffects: ['Sensibilidade à insulina', 'Oxidação de ácidos graxos', 'Menor pressão lipotóxica'],
        expectedDirections: ['adiponectina ↑', 'sensibilidade insulínica ↑', 'AGL ↘'], latency: 'horas biológicas',
    },
    {
        id: 'replace-t4', name: 'Repor T4', shortName: 'T4',
        description: 'Repõe gradualmente substrato tireoidiano quando a glândula falha, respeitando a reserva cardiovascular.',
        hormone: 't4', dose: 5, bolusFraction: .08, infusionSeconds: 600,
        cooldownSeconds: 3600, metabolicCost: .5, category: 'regulatory',
        safetyRules: ['cardiac-thyroid'], effectModel: 'thyroid',
        implementedEffects: ['Reposição de T4', 'Conversão periférica gradual para T3', 'Recuperação lenta da TMB'],
        expectedDirections: ['T4 ↑ lento', 'T3 ↗ lento', 'TSH ↓ tardio'], latency: 'horas a dias biológicos',
    },
    {
        id: 'suppress-thyroid', name: 'Reduzir sinal tireoidiano', shortName: 'T3 ↓',
        description: 'Reduz a exposição efetora ao T3 durante excesso tireoidiano sustentado.',
        hormone: 't3', dose: 70, bolusFraction: .12, infusionSeconds: 300, effectDirection: 'decrease',
        cooldownSeconds: 1200, metabolicCost: .55, category: 'regulatory',
        safetyRules: ['thyroid-excess-for-suppression'], effectModel: 'thyroid',
        implementedEffects: ['Redução do sinal de T3', 'Menor termogênese', 'Menor sensibilização adrenérgica'],
        expectedDirections: ['T3 ↓', 'temperatura ↓', 'demanda cardíaca ↓'], latency: 'minutos a horas simuladas',
    },
    {
        id: 'inhibit-cortisol', name: 'Reduzir Cortisol', shortName: 'Cortisol ↓',
        description: 'Reduz o excesso glucocorticoide quando a exposição sustentada domina glicose, pressão e catabolismo.',
        hormone: 'cortisol', dose: 24, bolusFraction: .18, infusionSeconds: 240, effectDirection: 'decrease',
        cooldownSeconds: 900, metabolicCost: .6, category: 'regulatory',
        safetyRules: ['cortisol-excess-for-suppression'], effectModel: 'glucocorticoid',
        implementedEffects: ['Redução de cortisol', 'Menor gliconeogênese', 'Menor proteólise e suporte mineralocorticoide'],
        expectedDirections: ['cortisol ↓', 'glicose ↓', 'exposição HPA ↓'], latency: 'minutos a horas simuladas',
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
