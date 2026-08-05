import type { ScenarioLearningAssessment } from './scenarioLearning';

export type MasteryDomain = 'perfusion' | 'ventilation' | 'metabolism' | 'electrolytes' | 'inflammation' | 'endocrinology';
export type PhenotypeId = 'standard' | 'athlete' | 'older-adult' | 'type2-diabetes' | 'chronic-kidney';

export interface DomainMastery {
    xp: number;
    level: number;
    demonstratedScenarios: string[];
}

export interface ClinicalScoreTotals {
    hypothesis: number;
    prediction: number;
    stability: number;
    responseTime: number;
    parsimony: number;
    iatrogenicSafety: number;
    cases: number;
}

export interface MasteryProgressState {
    domains: Record<MasteryDomain, DomainMastery>;
    mechanismCards: string[];
    unlockedAutomations: string[];
    milestones: string[];
    unlockedPhenotypes: PhenotypeId[];
    activePhenotype: PhenotypeId;
    completedOrganisms: number;
    clinicalScores: ClinicalScoreTotals;
}

export interface ScenarioMasteryAward {
    progress: MasteryProgressState;
    domain: MasteryDomain;
    xp: number;
    milestoneMultiplier: number;
    levelUp: boolean;
    unlocked: string[];
    score: Record<'hypothesis' | 'prediction' | 'stability' | 'responseTime' | 'parsimony' | 'iatrogenicSafety', number>;
}

export const DOMAIN_LABELS: Record<MasteryDomain, string> = {
    perfusion: 'Perfusão',
    ventilation: 'Ventilação',
    metabolism: 'Metabolismo',
    electrolytes: 'Eletrólitos',
    inflammation: 'Inflamação',
    endocrinology: 'Endocrinologia',
};

export const PHENOTYPE_LABELS: Record<PhenotypeId, string> = {
    standard: 'Adulto padrão',
    athlete: 'Atleta',
    'older-adult': 'Idoso',
    'type2-diabetes': 'Diabetes tipo 2',
    'chronic-kidney': 'Doença renal crônica',
};

const LEVEL_THRESHOLDS = [0, 60, 160, 320, 560];
const STORAGE_KEY = 'homeostasis:mastery:v1';

const SCENARIO_DOMAINS: Record<string, MasteryDomain> = {
    'stair-climb': 'ventilation',
    'meal-surge': 'metabolism',
    'morning-fast': 'metabolism',
    'micro-injury': 'inflammation',
    'immune-challenge': 'inflammation',
    'heat-dehydration': 'electrolytes',
    'orthostatic-transition': 'perfusion',
    'hypercapnic-challenge': 'ventilation',
    'acute-water-load': 'electrolytes',
    'nocturnal-hypoglycemia': 'endocrinology',
    'mitochondrial-uncoupling': 'metabolism',
    'mixed-ketoacidotic-fatigue': 'metabolism',
    'distributive-dysoxia': 'perfusion',
    'reperfusion-paradox': 'perfusion',
    'hyperosmolar-renal-conflict': 'electrolytes',
    'whisky-party-hepatic-overload': 'metabolism',
    'alcohol-nocturnal-hypoglycemia': 'ventilation',
    'fasted-workout-free-fatty-acids': 'metabolism',
    'chronic-anxiety-sedentary': 'endocrinology',
    'panic-hyperventilation': 'ventilation',
    'major-hemorrhage': 'perfusion',
    'fasting-orexigenic-switch': 'endocrinology',
    'leptin-resistance-satiety': 'endocrinology',
    'primary-hypothyroid-failure': 'endocrinology',
    'thyrotoxic-decompensation': 'endocrinology',
    'cushing-metabolic-load': 'endocrinology',
};

const SCENARIO_MECHANISMS: Record<string, string[]> = {
    'orthostatic-transition': ['Barorreflexo'],
    'hypercapnic-challenge': ['Quimiorreflexo bulbar', 'Efeito Bohr'],
    'acute-water-load': ['ADH e água livre'],
    'mixed-ketoacidotic-fatigue': ['Fórmula de Winter'],
    'major-hemorrhage': ['Frank–Starling'],
    'distributive-dysoxia': ['Entrega de O₂'],
    'reperfusion-paradox': ['Lesão de reperfusão'],
    'panic-hyperventilation': ['Acoplamento CO₂–pH'],
    'meal-surge': ['Feedback insulina–glucagon'],
    'hyperosmolar-renal-conflict': ['Feedback túbulo-glomerular'],
    'fasting-orexigenic-switch': ['Eixo grelina–NPY/AgRP'],
    'leptin-resistance-satiety': ['Eixo leptina–POMC/CART'],
    'primary-hypothyroid-failure': ['Feedback TSH–T4–T3'],
    'thyrotoxic-decompensation': ['Excesso tireoidiano'],
    'cushing-metabolic-load': ['Autonomia do cortisol'],
};

export function createInitialMasteryProgress(saved?: Partial<MasteryProgressState>): MasteryProgressState {
    const domain = (): DomainMastery => ({ xp: 0, level: 0, demonstratedScenarios: [] });
    const domains = Object.fromEntries((Object.keys(DOMAIN_LABELS) as MasteryDomain[]).map(key => [key, domain()])) as Record<MasteryDomain, DomainMastery>;
    if (saved?.domains) {
        for (const key of Object.keys(domains) as MasteryDomain[]) {
            const candidate = saved.domains[key];
            if (candidate) domains[key] = { xp: candidate.xp ?? 0, level: levelForXp(candidate.xp ?? 0), demonstratedScenarios: [...(candidate.demonstratedScenarios ?? [])] };
        }
    }
    return {
        domains,
        mechanismCards: [...(saved?.mechanismCards ?? [])],
        unlockedAutomations: [...(saved?.unlockedAutomations ?? [])],
        milestones: [...(saved?.milestones ?? [])],
        unlockedPhenotypes: unique(['standard', ...(saved?.unlockedPhenotypes ?? [])]) as PhenotypeId[],
        activePhenotype: saved?.activePhenotype ?? 'standard',
        completedOrganisms: saved?.completedOrganisms ?? 0,
        clinicalScores: {
            hypothesis: saved?.clinicalScores?.hypothesis ?? 0,
            prediction: saved?.clinicalScores?.prediction ?? 0,
            stability: saved?.clinicalScores?.stability ?? 0,
            responseTime: saved?.clinicalScores?.responseTime ?? 0,
            parsimony: saved?.clinicalScores?.parsimony ?? 0,
            iatrogenicSafety: saved?.clinicalScores?.iatrogenicSafety ?? 0,
            cases: saved?.clinicalScores?.cases ?? 0,
        },
    };
}

export function awardScenarioMastery(
    input: MasteryProgressState,
    scenarioId: string,
    assessment: ScenarioLearningAssessment,
    preparedSignalCount: number,
    iatrogenicBurden: number,
    responseTimeSeconds = 90,
): ScenarioMasteryAward {
    const progress = clone(input);
    const domain = SCENARIO_DOMAINS[scenarioId] ?? 'metabolism';
    const beforeLevel = progress.domains[domain].level;
    const score = {
        hypothesis: assessment.outcome === 'adaptive' ? 100 : assessment.outcome === 'partial' ? 55 : 10,
        prediction: assessment.predictions.length ? assessment.adaptiveTargetsMatched / assessment.predictions.length * 100 : 0,
        stability: assessment.outcome === 'adaptive' ? 100 : assessment.outcome === 'partial' ? 55 : 10,
        responseTime: clamp(110 - Math.max(0, responseTimeSeconds - 30) * .45, 35, 100),
        parsimony: clamp(100 - Math.max(0, preparedSignalCount - 1) * 22, 20, 100),
        iatrogenicSafety: clamp(100 - iatrogenicBurden * 100, 0, 100),
    };
    const composite = Object.values(score).reduce((sum, value) => sum + value, 0) / 6;
    const firstDemonstration = !progress.domains[domain].demonstratedScenarios.includes(scenarioId);
    const milestoneMultiplier = getDomainMilestoneMultiplier(progress, domain);
    const xp = Math.max(4, Math.round(composite / 5 * (firstDemonstration ? 1.35 : .55) * milestoneMultiplier));
    progress.domains[domain].xp += xp;
    if (firstDemonstration) progress.domains[domain].demonstratedScenarios.push(scenarioId);
    progress.domains[domain].level = levelForXp(progress.domains[domain].xp);

    const unlocked: string[] = [];
    const mechanisms = SCENARIO_MECHANISMS[scenarioId] ?? [];
    for (const mechanism of mechanisms) {
        if (assessment.outcome === 'adaptive' && !progress.mechanismCards.includes(mechanism)) {
            progress.mechanismCards.push(mechanism);
            unlocked.push(`Mecanismo: ${mechanism}`);
        }
    }
    unlockDomainAutomation(progress, domain, unlocked);
    unlockPhenotypes(progress, unlocked);
    if (progress.domains[domain].level > beforeLevel) {
        const milestone = `${DOMAIN_LABELS[domain]} nível ${progress.domains[domain].level}`;
        if (!progress.milestones.includes(milestone)) progress.milestones.push(milestone);
        unlocked.push(milestone);
    }

    const totals = progress.clinicalScores;
    totals.hypothesis += score.hypothesis;
    totals.prediction += score.prediction;
    totals.stability += score.stability;
    totals.responseTime += score.responseTime;
    totals.parsimony += score.parsimony;
    totals.iatrogenicSafety += score.iatrogenicSafety;
    totals.cases += 1;
    saveMasteryProgress(progress);
    return { progress, domain, xp, milestoneMultiplier, levelUp: progress.domains[domain].level > beforeLevel, unlocked, score };
}

/** Marco pequeno e previsível: acelera domínio sem alterar a fisiologia do fenótipo. */
export function getDomainMilestoneMultiplier(progress: MasteryProgressState, domain: MasteryDomain): number {
    return 1 + Math.min(4, progress.domains[domain].level) * .04;
}

export function canPrestige(progress: MasteryProgressState): boolean {
    return progress.clinicalScores.cases >= 12
        && (Object.values(progress.domains) as DomainMastery[]).every(domain => domain.level >= 2);
}

export function prestigeMastery(progressInput: MasteryProgressState, phenotype: PhenotypeId): MasteryProgressState | null {
    if (!canPrestige(progressInput) || !progressInput.unlockedPhenotypes.includes(phenotype)) return null;
    const progress = clone(progressInput);
    progress.activePhenotype = phenotype;
    progress.completedOrganisms += 1;
    saveMasteryProgress(progress);
    return progress;
}

export function averageClinicalScores(progress: MasteryProgressState) {
    const divisor = Math.max(1, progress.clinicalScores.cases);
    return {
        hypothesis: progress.clinicalScores.hypothesis / divisor,
        prediction: progress.clinicalScores.prediction / divisor,
        stability: progress.clinicalScores.stability / divisor,
        responseTime: progress.clinicalScores.responseTime / divisor,
        parsimony: progress.clinicalScores.parsimony / divisor,
        iatrogenicSafety: progress.clinicalScores.iatrogenicSafety / divisor,
    };
}

export function loadMasteryProgress(): MasteryProgressState {
    if (typeof localStorage === 'undefined') return createInitialMasteryProgress();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return createInitialMasteryProgress(raw ? JSON.parse(raw) as Partial<MasteryProgressState> : undefined);
    } catch {
        return createInitialMasteryProgress();
    }
}

export function saveMasteryProgress(progress: MasteryProgressState) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* armazenamento indisponível */ }
}

function unlockDomainAutomation(progress: MasteryProgressState, domain: MasteryDomain, unlocked: string[]) {
    const state = progress.domains[domain];
    if (state.level < 2 || state.demonstratedScenarios.length < 2) return;
    const id = `${domain}-manager`;
    if (!progress.unlockedAutomations.includes(id)) {
        progress.unlockedAutomations.push(id);
        unlocked.push(`Automação: ${DOMAIN_LABELS[domain]}`);
    }
}

function unlockPhenotypes(progress: MasteryProgressState, unlocked: string[]) {
    const candidates: Array<[PhenotypeId, boolean]> = [
        ['athlete', progress.domains.perfusion.level >= 2 && progress.domains.metabolism.level >= 2],
        ['older-adult', progress.clinicalScores.cases >= 8],
        ['type2-diabetes', progress.domains.metabolism.level >= 2 && progress.domains.endocrinology.level >= 2],
        ['chronic-kidney', progress.domains.electrolytes.level >= 2 && progress.domains.perfusion.level >= 2],
    ];
    for (const [id, eligible] of candidates) {
        if (eligible && !progress.unlockedPhenotypes.includes(id)) {
            progress.unlockedPhenotypes.push(id);
            unlocked.push(`Fenótipo: ${PHENOTYPE_LABELS[id]}`);
        }
    }
}

function levelForXp(xp: number) {
    let level = 0;
    LEVEL_THRESHOLDS.forEach((threshold, index) => { if (xp >= threshold) level = index; });
    return level;
}

function clone(progress: MasteryProgressState): MasteryProgressState {
    return {
        ...progress,
        domains: Object.fromEntries((Object.entries(progress.domains) as Array<[MasteryDomain, DomainMastery]>).map(([key, value]) => [key, { ...value, demonstratedScenarios: [...value.demonstratedScenarios] }])) as Record<MasteryDomain, DomainMastery>,
        mechanismCards: [...progress.mechanismCards],
        unlockedAutomations: [...progress.unlockedAutomations],
        milestones: [...progress.milestones],
        unlockedPhenotypes: [...progress.unlockedPhenotypes],
        clinicalScores: { ...progress.clinicalScores },
    };
}

function unique(values: string[]) { return [...new Set(values)]; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
