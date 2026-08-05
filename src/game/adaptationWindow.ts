import type { CellularAdaptationKind, CellularState } from './cellularTypes';
import { applyScenarioCellularEffects } from './cellularSimulation';
import {
    applyScenarioPhysiologyEffects,
    type ScenarioEffect,
    type ScenarioPhysiologyEffect,
} from './scenarios';
import type { PhysiologyState } from './types';

export type AdaptationOpportunityKind =
    | 'glucose-wave'
    | 'redox-pulse'
    | 'perfusion-window'
    | 'insulin-pulse'
    | 'mitochondrial-window';

export type AdaptationResponseOutcome = 'optimal' | 'partial' | 'harmful';
export type AdaptationRewardType = 'knowledge' | 'adaptation' | 'multiplier' | 'case-variant' | 'visual-effect' | 'none';

export interface AdaptationOpportunityChoice {
    id: string;
    label: string;
    description: string;
}

export interface AdaptationOpportunityState {
    id: string;
    kind: AdaptationOpportunityKind;
    title: string;
    clue: string;
    mechanismQuestion: string;
    indicators: Array<{ label: string; value: string; tone: 'primary' | 'warning' | 'danger' }>;
    choices: AdaptationOpportunityChoice[];
    quality: number;
    startedAt: number;
    totalSeconds: number;
    remainingSeconds: number;
}

export interface AdaptationRewardResult {
    type: AdaptationRewardType;
    outcome: AdaptationResponseOutcome | 'missed';
    title: string;
    detail: string;
    value?: number;
    timestamp: number;
}

export interface AdaptationProgressState {
    physiologicalKnowledge: number;
    knowledgeMultiplier: number;
    multiplierRemainingSeconds: number;
    unlockedCaseVariants: string[];
    unlockedVisualEffects: string[];
    activeVisualEffect: string | null;
    visualEffectRemainingSeconds: number;
    offered: number;
    resolved: number;
    successful: number;
    missed: number;
    cycleStartedAt: number;
    nextOpportunityAt: number;
    guaranteedOpportunityAt: number;
    lastCheckAt: number;
    lastReward: AdaptationRewardResult | null;
}

export interface AdaptationAdvanceResult {
    physiology: PhysiologyState;
    cellular: CellularState;
    opportunity: AdaptationOpportunityState | null;
    progress: AdaptationProgressState;
    events: Array<{ message: string; severity: 'info' | 'warning'; affectedSystems: string[] }>;
}

export interface AdaptationResolveResult {
    physiology: PhysiologyState;
    cellular: CellularState;
    progress: AdaptationProgressState;
    result: AdaptationRewardResult;
}

interface OpportunityDefinition {
    kind: AdaptationOpportunityKind;
    title: string;
    clue: string;
    mechanismQuestion: string;
    timer: keyof CellularState['rewards'];
    threshold: number;
    duration: number;
    choices: AdaptationOpportunityChoice[];
}

interface OpportunityEffect {
    cellular: ScenarioEffect[];
    physiology: ScenarioPhysiologyEffect[];
}

const DEFINITIONS: OpportunityDefinition[] = [
    {
        kind: 'glucose-wave',
        title: 'Onda transitória de glicose',
        clue: 'Alteração transitória detectada no transporte de glicose.',
        mechanismQuestion: 'A célula precisa de mais fluxo agora ou já deve proteger-se da saturação?',
        timer: 'homeostasisSeconds',
        threshold: 24,
        duration: 22,
        choices: [
            { id: 'store', label: 'Favorecer armazenamento', description: 'Retira pressão do fluxo glicolítico e preserva o balanço redox.' },
            { id: 'process', label: 'Captar e processar', description: 'Usa a janela para produzir piruvato e ATP quando há espaço metabólico.' },
            { id: 'observe', label: 'Observar o feedback', description: 'Permite que a resposta endógena atue sem acrescentar fluxo.' },
            { id: 'glucagon', label: 'Mobilizar mais glicose', description: 'Soma produção hepática ao pulso já presente.' },
        ],
    },
    {
        kind: 'redox-pulse',
        title: 'Pulso transitório de ROS',
        clue: 'A cadeia respiratória acelerou e a pressão redox mudou.',
        mechanismQuestion: 'Este ROS ainda sinaliza adaptação ou já exige reduzir fluxo e reparar defesas?',
        timer: 'rosControlSeconds',
        threshold: 22,
        duration: 18,
        choices: [
            { id: 'restore-antioxidants', label: 'Recuperar antioxidantes', description: 'Investe ATP para reconstituir a contenção redox.' },
            { id: 'reduce-flux', label: 'Reduzir o fluxo', description: 'Diminui temporariamente ETC e consumo de substratos.' },
            { id: 'maintain', label: 'Manter e observar', description: 'Aceita um pulso pequeno sem gastar reserva desnecessariamente.' },
            { id: 'add-substrate', label: 'Adicionar substrato', description: 'Alimenta a cadeia durante o pico oxidativo.' },
        ],
    },
    {
        kind: 'perfusion-window',
        title: 'Janela breve de reperfusão',
        clue: 'A oferta de O₂ e substratos melhorou por poucos segundos.',
        mechanismQuestion: 'Qual dívida celular deve usar primeiro essa melhora de entrega?',
        timer: 'phStableSeconds',
        threshold: 24,
        duration: 20,
        choices: [
            { id: 'restore-atp', label: 'Restaurar ATP', description: 'Oxida o que já foi captado quando ADP e O₂ permitem.' },
            { id: 'repair', label: 'Reparar estruturas', description: 'Direciona energia a membrana e proteínas lesionadas.' },
            { id: 'clear-pools', label: 'Processar pools acumulados', description: 'Reduz ocupação antes de captar novo substrato.' },
            { id: 'capture-more', label: 'Captar mais', description: 'Aproveita a entrega mesmo que os pools estejam ocupados.' },
        ],
    },
    {
        kind: 'insulin-pulse',
        title: 'Pulso fisiológico de insulina',
        clue: 'Transportadores estão sendo recrutados transitoriamente.',
        mechanismQuestion: 'O pulso deve alimentar demanda, armazenamento ou apenas o feedback endógeno?',
        timer: 'balancedFuelSeconds',
        threshold: 20,
        duration: 24,
        choices: [
            { id: 'store', label: 'Coordenar armazenamento', description: 'Desvia glicose do fluxo imediato quando ATP e pools estão altos.' },
            { id: 'capture', label: 'Aproveitar captação', description: 'Usa GLUT4 quando existe demanda e espaço intracelular.' },
            { id: 'activity', label: 'Aumentar atividade leve', description: 'Cria demanda proporcional para a oferta pós-prandial.' },
            { id: 'observe', label: 'Não intervir', description: 'Deixa insulina e glucagon reencontrarem o basal.' },
        ],
    },
    {
        kind: 'mitochondrial-window',
        title: 'Oportunidade de adaptação mitocondrial',
        clue: 'ATP, pH e O₂ permaneceram estáveis tempo suficiente para consolidar uma rota.',
        mechanismQuestion: 'Qual capacidade está sendo realmente limitada pelo estado atual dos pools e do redox?',
        timer: 'homeostasisSeconds',
        threshold: 32,
        duration: 25,
        choices: [
            { id: 'glycolysis', label: 'Consolidar glicólise', description: 'Favorece o processamento inicial da glicose.' },
            { id: 'pyruvate', label: 'Consolidar oxidação de piruvato', description: 'Prioriza acoplamento entre piruvato, ETC e ATP sintase.' },
            { id: 'beta-oxidation', label: 'Consolidar beta-oxidação', description: 'Aumenta flexibilidade quando gordura e O₂ estão disponíveis.' },
            { id: 'redox-defense', label: 'Consolidar defesa redox', description: 'Usa a janela para reforçar contenção de ROS.' },
        ],
    },
];

const CASE_VARIANTS = ['meal-surge-storage', 'reperfusion-paced', 'fasted-workout-recovery', 'panic-observation'];
const VISUAL_EFFECTS = ['mitochondrial-aurora', 'redox-constellation', 'perfusion-halo'];

export interface AdaptationCaseVariant {
    id: string;
    scenarioId: string;
    label: string;
    eyebrow: string;
    scene: string;
}

const CASE_VARIANT_CONTENT: Record<string, AdaptationCaseVariant> = {
    'meal-surge-storage': {
        id: 'meal-surge-storage',
        scenarioId: 'meal-surge',
        label: 'Armazenamento pós-prandial treinado',
        eyebrow: 'Almoço tardio · reserva muscular já preenchida',
        scene: 'A refeição elevou a glicose, mas o tecido chega desta vez com ATP alto e estoques parcialmente ocupados. O desafio não é captar o máximo: é distinguir demanda real de saturação e coordenar armazenamento sem amplificar ROS.',
    },
    'reperfusion-paced': {
        id: 'reperfusion-paced',
        scenarioId: 'reperfusion-paradox',
        label: 'Reperfusão em etapas',
        eyebrow: 'Depois do resgate · retorno de fluxo escalonado',
        scene: 'O fluxo volta em pulsos curtos ao membro. Cada etapa entrega O₂, mas também mobiliza potássio, ácidos e pressão oxidativa; a equipe precisa usar o intervalo para reavaliar ritmo, eletrólitos e defesa redox.',
    },
    'fasted-workout-recovery': {
        id: 'fasted-workout-recovery',
        scenarioId: 'fasted-workout-free-fatty-acids',
        label: 'Recuperação após treino em jejum',
        eyebrow: 'Pós-treino em jejum · demanda caiu, dívida permaneceu',
        scene: 'O exercício foi interrompido, mas tontura e taquicardia persistem. A demanda muscular recuou antes de glicose cerebral, volume e pools celulares se recomporem, tornando a fase de recuperação tão importante quanto parar o esforço.',
    },
    'panic-observation': {
        id: 'panic-observation',
        scenarioId: 'panic-hyperventilation',
        label: 'Pânico com observação seriada',
        eyebrow: 'Crise recorrente · sinais estáveis, CO₂ ainda baixo',
        scene: 'O padrão já ocorreu antes: oxigenação e pressão seguem estáveis, enquanto ventilação rápida derruba CO₂ e mantém tontura. A variante exige observar a trajetória, evitando que urgência subjetiva vire excesso de intervenção.',
    },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const unitSeed = (value: number) => {
    const seeded = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
    return seeded - Math.floor(seeded);
};

export function createInitialAdaptationProgress(
    preserved?: Pick<AdaptationProgressState, 'physiologicalKnowledge' | 'unlockedCaseVariants' | 'unlockedVisualEffects' | 'offered' | 'resolved' | 'successful' | 'missed'>,
): AdaptationProgressState {
    return {
        physiologicalKnowledge: preserved?.physiologicalKnowledge ?? 0,
        knowledgeMultiplier: 1,
        multiplierRemainingSeconds: 0,
        unlockedCaseVariants: [...(preserved?.unlockedCaseVariants ?? [])],
        unlockedVisualEffects: [...(preserved?.unlockedVisualEffects ?? [])],
        activeVisualEffect: null,
        visualEffectRemainingSeconds: 0,
        offered: preserved?.offered ?? 0,
        resolved: preserved?.resolved ?? 0,
        successful: preserved?.successful ?? 0,
        missed: preserved?.missed ?? 0,
        cycleStartedAt: 0,
        nextOpportunityAt: 60,
        guaranteedOpportunityAt: 180,
        lastCheckAt: 0,
        lastReward: null,
    };
}

export function computeOpportunityQuality(
    physiology: PhysiologyState,
    cellular: CellularState,
    iatrogenicBurden: number,
): number {
    const atpStability = clamp(1 - Math.abs(cellular.cell.atpMmolL - 4.6) / 3.6, 0, 1);
    const phStability = clamp(1 - Math.abs(cellular.tissue.pH - 7.38) / .22, 0, 1);
    const oxygenAdequacy = clamp((cellular.tissue.oxygenMmHg - 15) / 25, 0, 1);
    const redoxControl = clamp(1 - cellular.damage.oxidativeStress / 55, 0, 1)
        * clamp(cellular.damage.antioxidantCapacity / 65, .25, 1);
    const lowIatrogenicBurden = clamp(1 - iatrogenicBurden, 0, 1);
    const systemicViability = clamp(
        physiology.cardiovascular.perfusionIndex / 100 * .45
        + physiology.respiratory.spo2 / 100 * .25
        + cellular.cell.viabilityPercent / 100 * .3,
        0,
        1,
    );
    const poolPressure = clamp(Math.max(
        ...Object.values(cellular.transportSaturation).map(value => value / 100),
        cellular.pools.captured.glucose / 6,
        cellular.pools.captured.oxygen / 24,
        cellular.pools.captured.fattyAcid / 4,
        cellular.pools.captured.aminoAcid / 4,
    ), 0, 1);
    const poolHeadroom = 1 - poolPressure;
    return clamp(
        atpStability * .18
        + phStability * .18
        + oxygenAdequacy * .14
        + redoxControl * .18
        + lowIatrogenicBurden * .22
        + systemicViability * .05
        + poolHeadroom * .05,
        0,
        1,
    );
}

function cloneProgress(progress: AdaptationProgressState): AdaptationProgressState {
    return {
        ...progress,
        unlockedCaseVariants: [...progress.unlockedCaseVariants],
        unlockedVisualEffects: [...progress.unlockedVisualEffects],
        lastReward: progress.lastReward ? { ...progress.lastReward } : null,
    };
}

function advanceTemporaryRewards(progress: AdaptationProgressState, deltaTime: number) {
    progress.multiplierRemainingSeconds = Math.max(0, progress.multiplierRemainingSeconds - deltaTime);
    if (progress.multiplierRemainingSeconds <= 0) progress.knowledgeMultiplier = 1;
    progress.visualEffectRemainingSeconds = Math.max(0, progress.visualEffectRemainingSeconds - deltaTime);
    if (progress.visualEffectRemainingSeconds <= 0) progress.activeVisualEffect = null;
}

function eligibleDefinitions(cellular: CellularState): OpportunityDefinition[] {
    const candidates = DEFINITIONS.filter(definition => {
        const timerValue = cellular.rewards[definition.timer];
        return typeof timerValue === 'number' && timerValue >= definition.threshold;
    });
    return candidates.length > 0 ? candidates : DEFINITIONS.filter(definition => definition.kind === 'redox-pulse');
}

function createOpportunity(
    definition: OpportunityDefinition,
    physiology: PhysiologyState,
    cellular: CellularState,
    quality: number,
): AdaptationOpportunityState {
    const indicators = definition.kind === 'glucose-wave' || definition.kind === 'insulin-pulse'
        ? [
            { label: 'Glicose tecidual', value: `${cellular.tissue.glucoseMmolL.toFixed(1)} mmol/L`, tone: cellular.tissue.glucoseMmolL > 7 ? 'warning' : 'primary' },
            { label: 'ATP/ADP', value: `${cellular.cell.atpMmolL.toFixed(2)} / ${cellular.cell.adpMmolL.toFixed(2)}`, tone: cellular.cell.atpMmolL > 4.8 ? 'warning' : 'primary' },
            { label: 'Pool glicose', value: `${cellular.transportSaturation.glucose.toFixed(0)}%`, tone: cellular.transportSaturation.glucose > 70 ? 'danger' : 'primary' },
        ]
        : definition.kind === 'redox-pulse' || definition.kind === 'mitochondrial-window'
            ? [
                { label: 'ROS', value: `${cellular.damage.oxidativeStress.toFixed(0)}%`, tone: cellular.damage.oxidativeStress > 28 ? 'danger' : 'warning' },
                { label: 'Antioxidantes', value: `${cellular.damage.antioxidantCapacity.toFixed(0)}%`, tone: cellular.damage.antioxidantCapacity < 45 ? 'danger' : 'primary' },
                { label: 'Fluxo ETC', value: `${cellular.mitochondria.etcFluxPercent.toFixed(0)}%`, tone: 'primary' },
            ]
            : [
                { label: 'Perfusão', value: `${cellular.tissue.perfusionPercent.toFixed(0)}%`, tone: cellular.tissue.perfusionPercent < 70 ? 'danger' : 'primary' },
                { label: 'PO₂ tecidual', value: `${cellular.tissue.oxygenMmHg.toFixed(0)} mmHg`, tone: cellular.tissue.oxygenMmHg < 25 ? 'warning' : 'primary' },
                { label: 'ATP', value: `${cellular.cell.atpMmolL.toFixed(2)} mmol/L`, tone: cellular.cell.atpMmolL < 2 ? 'danger' : 'primary' },
            ];
    return {
        id: `${definition.kind}-${cellular.simulationTime.toFixed(2)}`,
        kind: definition.kind,
        title: definition.title,
        clue: definition.clue,
        mechanismQuestion: definition.mechanismQuestion,
        indicators: indicators as AdaptationOpportunityState['indicators'],
        choices: definition.choices,
        quality,
        startedAt: physiology.timeElapsed,
        totalSeconds: definition.duration,
        remainingSeconds: definition.duration,
    };
}

function opportunityOnset(
    kind: AdaptationOpportunityKind,
    physiology: PhysiologyState,
    cellular: CellularState,
): { physiology: PhysiologyState; cellular: CellularState } {
    const effects: Record<AdaptationOpportunityKind, OpportunityEffect> = {
        'glucose-wave': {
            cellular: [{ target: 'tissue.glucose', delta: .7 }, { target: 'available.glucose', delta: .5 }, { target: 'damage.oxidative', delta: 1.5 }],
            physiology: [{ target: 'nutrients.glucose', delta: 8 }, { target: 'hormones.insulin', delta: 3 }],
        },
        'redox-pulse': {
            cellular: [{ target: 'damage.oxidative', delta: 6 }, { target: 'mitochondria.etcFlux', delta: 8 }, { target: 'mitochondria.oxygenConsumption', delta: 1.2 }],
            physiology: [{ target: 'allostatic.oxidative', delta: 3 }],
        },
        'perfusion-window': {
            cellular: [{ target: 'tissue.perfusion', delta: 9 }, { target: 'tissue.oxygen', delta: 4 }, { target: 'available.oxygen', delta: 1 }],
            physiology: [{ target: 'cardiovascular.perfusion', delta: 5 }, { target: 'energy.deficit', delta: -1 }],
        },
        'insulin-pulse': {
            cellular: [{ target: 'available.glucose', delta: .5 }, { target: 'tissue.glucose', delta: .4 }],
            physiology: [{ target: 'hormones.insulin', delta: 4 }, { target: 'nutrients.glucose', delta: -3 }],
        },
        'mitochondrial-window': {
            cellular: [{ target: 'mitochondria.etcFlux', delta: 6 }, { target: 'mitochondria.atpSynthase', delta: 5 }, { target: 'damage.oxidative', delta: 2 }],
            physiology: [{ target: 'energy.deficit', delta: -1.5 }],
        },
    };
    return {
        physiology: applyScenarioPhysiologyEffects(physiology, effects[kind].physiology),
        cellular: applyScenarioCellularEffects(cellular, effects[kind].cellular),
    };
}

export function advanceAdaptationWindow(args: {
    physiology: PhysiologyState;
    cellular: CellularState;
    opportunity: AdaptationOpportunityState | null;
    progress: AdaptationProgressState;
    iatrogenicBurden: number;
    blocked: boolean;
    deltaTime: number;
    interactionDeltaTime?: number;
}): AdaptationAdvanceResult {
    let physiology = args.physiology;
    let cellular = args.cellular;
    let opportunity = args.opportunity ? { ...args.opportunity, indicators: [...args.opportunity.indicators], choices: [...args.opportunity.choices] } : null;
    const progress = cloneProgress(args.progress);
    const events: AdaptationAdvanceResult['events'] = [];
    advanceTemporaryRewards(progress, args.deltaTime);

    if (opportunity) {
        const definition = DEFINITIONS.find(item => item.kind === opportunity?.kind);
        if (definition) {
            opportunity.indicators = createOpportunity(
                definition,
                physiology,
                cellular,
                opportunity.quality,
            ).indicators;
        }
        // A velocidade 2×/4× acelera a fisiologia, mas não comprime o tempo
        // humano disponível para interpretar e escolher uma resposta.
        const interactionDeltaTime = clamp(args.interactionDeltaTime ?? args.deltaTime, 0, 2);
        opportunity.remainingSeconds = Math.max(0, opportunity.remainingSeconds - interactionDeltaTime);
        if (opportunity.remainingSeconds <= 0) {
            progress.missed += 1;
            progress.lastReward = {
                type: 'none',
                outcome: 'missed',
                title: 'Janela encerrada',
                detail: 'A alteração transitória passou sem intervenção; nenhuma adaptação foi consolidada.',
                timestamp: physiology.timeElapsed,
            };
            cellular = {
                ...cellular,
                lastEvent: 'Janela de adaptação encerrada sem resposta',
                rewards: { ...cellular.rewards, lastOpportunityAt: cellular.simulationTime },
            };
            events.push({
                message: progress.lastReward.detail,
                severity: 'warning',
                affectedSystems: ['adaptation-window', 'missed'],
            });
            opportunity = null;
        }
        return { physiology, cellular, opportunity, progress, events };
    }

    if (args.blocked || !physiology.isAlive || cellular.fate.status === 'necrosis') {
        return { physiology, cellular, opportunity, progress, events };
    }
    if (cellular.simulationTime < progress.nextOpportunityAt || cellular.simulationTime - progress.lastCheckAt < 1) {
        return { physiology, cellular, opportunity, progress, events };
    }
    progress.lastCheckAt = cellular.simulationTime;
    const quality = computeOpportunityQuality(physiology, cellular, args.iatrogenicBurden);
    const elapsed = cellular.simulationTime - progress.cycleStartedAt;
    const guaranteed = cellular.simulationTime >= progress.guaranteedOpportunityAt;
    if (!guaranteed && quality < .7) return { physiology, cellular, opportunity, progress, events };

    const chance = elapsed < 90
        ? .16
        : elapsed < 150
            ? .16 + (elapsed - 90) / 60 * .58
            : elapsed < 180
                ? .82 + (elapsed - 150) / 30 * .18
                : 1;
    const roll = unitSeed(cellular.simulationTime + progress.offered * 17.3 + quality * 31);
    if (!guaranteed && roll > chance) return { physiology, cellular, opportunity, progress, events };

    const eligible = eligibleDefinitions(cellular);
    const selected = eligible[Math.floor(unitSeed(cellular.simulationTime + quality * 43) * eligible.length) % eligible.length];
    const onset = opportunityOnset(selected.kind, physiology, cellular);
    physiology = onset.physiology;
    opportunity = createOpportunity(selected, physiology, onset.cellular, quality);
    cellular = {
        ...onset.cellular,
        rewards: { ...onset.cellular.rewards, lastOpportunityAt: cellular.simulationTime },
        lastEvent: `${opportunity.title}: alteração transitória detectada`,
    };
    progress.offered += 1;
    progress.cycleStartedAt = cellular.simulationTime;
    const intervalRoll = unitSeed(cellular.simulationTime + progress.offered * 9.7);
    // Estados mais coerentes reduzem a espera sem transformar a janela em
    // frequência fixa: todo intervalo permanece entre 45 e 120 s.
    const qualityDelay = (1 - quality) * 45;
    progress.nextOpportunityAt = cellular.simulationTime + 45 + qualityDelay + intervalRoll * 30;
    progress.guaranteedOpportunityAt = cellular.simulationTime + 180;
    events.push({
        message: `${opportunity.clue} Há ${opportunity.totalSeconds.toFixed(0)} s reais para interpretar a janela enquanto a fisiologia avança.`,
        severity: 'info',
        affectedSystems: ['adaptation-window', opportunity.kind],
    });
    return { physiology, cellular, opportunity, progress, events };
}

function responseScore(kind: AdaptationOpportunityKind, choiceId: string, physiology: PhysiologyState, cellular: CellularState): number {
    const glucoseSaturation = Math.max(cellular.transportSaturation.glucose / 100, cellular.pools.captured.glucose / 6);
    const highEnergy = cellular.cell.atpMmolL >= 4.6;
    const damageLoad = Math.max(cellular.damage.membrane, cellular.damage.proteins, cellular.damage.dna);
    const poolPressure = Math.max(
        cellular.transportSaturation.glucose,
        cellular.transportSaturation.fattyAcid,
        cellular.transportSaturation.aminoAcid,
    ) / 100;

    if (kind === 'glucose-wave') {
        if (choiceId === 'store') return highEnergy || glucoseSaturation >= .55 ? 1 : .58;
        if (choiceId === 'process') return !highEnergy && glucoseSaturation < .65 && cellular.pools.captured.oxygen >= 2 ? .95 : .35;
        if (choiceId === 'observe') return physiology.hormones.insulin >= 10 && (highEnergy || glucoseSaturation >= .7) ? .86 : .5;
        return .05;
    }
    if (kind === 'redox-pulse') {
        if (choiceId === 'restore-antioxidants') return cellular.cell.atpMmolL > 1.35 && (cellular.damage.oxidativeStress >= 20 || cellular.damage.antioxidantCapacity < 75) ? 1 : .48;
        if (choiceId === 'reduce-flux') return cellular.damage.oxidativeStress >= 26 || highEnergy ? .9 : .5;
        if (choiceId === 'maintain') return cellular.damage.oxidativeStress < 20 && cellular.damage.antioxidantCapacity >= 60 ? .84 : .3;
        return .04;
    }
    if (kind === 'perfusion-window') {
        if (choiceId === 'restore-atp') return cellular.cell.atpMmolL < 4.4 && cellular.pools.captured.oxygen >= 1 && (cellular.pools.pyruvate >= 1 || cellular.pools.captured.fattyAcid >= 1) ? 1 : .52;
        if (choiceId === 'repair') return damageLoad >= 6 && cellular.cell.atpMmolL > 1.2 ? 1 : .48;
        if (choiceId === 'clear-pools') return poolPressure >= .6 ? .9 : .55;
        return poolPressure < .25 && cellular.cell.atpMmolL < 3.8 ? .72 : .15;
    }
    if (kind === 'insulin-pulse') {
        if (choiceId === 'store') return highEnergy || glucoseSaturation >= .6 ? 1 : .55;
        if (choiceId === 'capture') return !highEnergy && glucoseSaturation < .55 ? .92 : .35;
        if (choiceId === 'activity') return physiology.nutrients.bloodGlucose > 115 && physiology.cardiovascular.perfusionIndex > 75 ? .82 : .45;
        return physiology.hormones.insulin >= 10 && (physiology.nutrients.bloodGlucose < 110 || glucoseSaturation >= .75) ? .88 : .52;
    }
    if (choiceId === 'glycolysis') return cellular.pools.captured.glucose >= 1 && cellular.pools.pyruvate < 3 ? .9 : .45;
    if (choiceId === 'pyruvate') return cellular.pools.pyruvate >= 1 && cellular.pools.captured.oxygen >= 3 ? 1 : .4;
    if (choiceId === 'beta-oxidation') return cellular.pools.captured.fattyAcid >= 1 && cellular.pools.captured.oxygen >= 6 && cellular.pools.captured.glucose < 1 ? 1 : .42;
    return cellular.damage.oxidativeStress >= 15 && cellular.cell.atpMmolL > 1.2 ? .92 : .55;
}

function responseEffects(kind: AdaptationOpportunityKind, choiceId: string): OpportunityEffect {
    if (kind === 'glucose-wave' || kind === 'insulin-pulse') {
        if (choiceId === 'store') return { cellular: [{ target: 'available.glucose', delta: -.4 }, { target: 'damage.oxidative', delta: -2 }], physiology: [{ target: 'nutrients.glucose', delta: -5 }, { target: 'energy.deficit', delta: -1 }] };
        if (choiceId === 'process' || choiceId === 'capture') return { cellular: [{ target: 'captured.glucose', delta: .4 }, { target: 'pool.pyruvate', delta: .5 }, { target: 'cell.atp', delta: .12 }, { target: 'damage.oxidative', delta: 1 }], physiology: [{ target: 'nutrients.glucose', delta: -4 }] };
        if (choiceId === 'activity') return { cellular: [{ target: 'tissue.glucose', delta: -.3 }, { target: 'cell.atp', delta: -.08 }], physiology: [{ target: 'nutrients.glucose', delta: -5 }, { target: 'cardiovascular.heartRate', delta: 4 }] };
        if (choiceId === 'glucagon') return { cellular: [{ target: 'tissue.glucose', delta: 1 }, { target: 'damage.oxidative', delta: 4 }], physiology: [{ target: 'nutrients.glucose', delta: 12 }, { target: 'hormones.glucagon', delta: 25 }] };
        return { cellular: [], physiology: [{ target: 'hormones.insulin', delta: -1 }] };
    }
    if (kind === 'redox-pulse') {
        if (choiceId === 'restore-antioxidants') return { cellular: [{ target: 'cell.atp', delta: -.22 }, { target: 'damage.antioxidants', delta: 10 }, { target: 'damage.oxidative', delta: -7 }], physiology: [{ target: 'allostatic.oxidative', delta: -4 }] };
        if (choiceId === 'reduce-flux') return { cellular: [{ target: 'mitochondria.etcFlux', delta: -10 }, { target: 'damage.oxidative', delta: -5 }, { target: 'cell.atp', delta: -.08 }], physiology: [{ target: 'energy.deficit', delta: 1 }] };
        if (choiceId === 'add-substrate') return { cellular: [{ target: 'captured.glucose', delta: .5 }, { target: 'damage.oxidative', delta: 8 }, { target: 'cell.nadh', delta: 8 }], physiology: [{ target: 'allostatic.oxidative', delta: 5 }] };
        return { cellular: [{ target: 'damage.oxidative', delta: -1 }], physiology: [] };
    }
    if (kind === 'perfusion-window') {
        if (choiceId === 'restore-atp') return { cellular: [{ target: 'pool.pyruvate', delta: -.5 }, { target: 'captured.oxygen', delta: -1 }, { target: 'cell.atp', delta: .35 }, { target: 'damage.oxidative', delta: 1 }], physiology: [{ target: 'energy.deficit', delta: -2 }] };
        if (choiceId === 'repair') return { cellular: [{ target: 'cell.atp', delta: -.25 }, { target: 'damage.membrane', delta: -4 }, { target: 'damage.proteins', delta: -3 }], physiology: [{ target: 'allostatic.inflammation', delta: -2 }] };
        if (choiceId === 'clear-pools') return { cellular: [{ target: 'captured.glucose', delta: -.3 }, { target: 'captured.fattyAcid', delta: -.2 }, { target: 'pool.pyruvate', delta: -.4 }, { target: 'cell.atp', delta: .18 }], physiology: [{ target: 'energy.deficit', delta: -1 }] };
        return { cellular: [{ target: 'available.glucose', delta: -.4 }, { target: 'captured.glucose', delta: .6 }, { target: 'damage.oxidative', delta: 3 }], physiology: [] };
    }
    if (choiceId === 'glycolysis') return { cellular: [{ target: 'captured.glucose', delta: -.5 }, { target: 'pool.pyruvate', delta: 1 }, { target: 'cell.atp', delta: .08 }], physiology: [] };
    if (choiceId === 'pyruvate') return { cellular: [{ target: 'pool.pyruvate', delta: -1 }, { target: 'captured.oxygen', delta: -3 }, { target: 'cell.atp', delta: .3 }], physiology: [{ target: 'energy.deficit', delta: -1 }] };
    if (choiceId === 'beta-oxidation') return { cellular: [{ target: 'captured.fattyAcid', delta: -1 }, { target: 'captured.oxygen', delta: -6 }, { target: 'cell.atp', delta: .5 }, { target: 'damage.oxidative', delta: 2 }], physiology: [{ target: 'energy.deficit', delta: -1.5 }] };
    return { cellular: [{ target: 'cell.atp', delta: -.18 }, { target: 'damage.antioxidants', delta: 8 }, { target: 'damage.oxidative', delta: -5 }], physiology: [{ target: 'allostatic.oxidative', delta: -3 }] };
}

function responseMechanism(kind: AdaptationOpportunityKind, choiceId: string): string {
    if (kind === 'glucose-wave' || kind === 'insulin-pulse') {
        if (choiceId === 'store') return 'O armazenamento retirou pressão do fluxo glicolítico e conteve a amplificação de ROS.';
        if (choiceId === 'process' || choiceId === 'capture') return 'A captação alimentou piruvato e ATP, mas também ocupou pools e acrescentou pressão redox.';
        if (choiceId === 'activity') return 'A atividade criou demanda para a glicose circulante, consumindo parte da reserva de ATP.';
        if (choiceId === 'glucagon') return 'O glucagon somou produção hepática ao pulso de glicose e aumentou a sobrecarga metabólica.';
        return 'A observação preservou o feedback endógeno sem acrescentar novo fluxo aos pools.';
    }
    if (kind === 'redox-pulse') {
        if (choiceId === 'restore-antioxidants') return 'ATP foi convertido em reserva antioxidante, reduzindo diretamente a pressão de ROS.';
        if (choiceId === 'reduce-flux') return 'A redução do fluxo ETC limitou novos elétrons e ROS, com pequeno custo de oferta energética.';
        if (choiceId === 'add-substrate') return 'Mais substrato elevou NADH durante uma cadeia já pressionada e ampliou o estresse oxidativo.';
        return 'O pulso foi observado sem gasto adicional; isso só é seguro quando ROS e antioxidantes ainda têm margem.';
    }
    if (kind === 'perfusion-window') {
        if (choiceId === 'restore-atp') return 'O₂ e piruvato capturados foram usados para recompor ATP durante a melhora de entrega.';
        if (choiceId === 'repair') return 'A energia disponível foi desviada para membrana e proteínas lesionadas.';
        if (choiceId === 'clear-pools') return 'Substratos acumulados foram processados antes de nova captação, liberando espaço intracelular.';
        return 'A captação adicional ocupou pools e aumentou ROS durante a reperfusão.';
    }
    if (choiceId === 'glycolysis') return 'A glicose capturada foi convertida em piruvato e pequeno rendimento direto de ATP.';
    if (choiceId === 'pyruvate') return 'Piruvato e O₂ foram acoplados à produção mitocondrial de ATP.';
    if (choiceId === 'beta-oxidation') return 'Ácido graxo e O₂ ampliaram ATP, com a pressão redox esperada da beta-oxidação.';
    return 'ATP foi investido na contenção antioxidante antes de consolidar maior fluxo metabólico.';
}

function adaptationKindFor(opportunity: AdaptationOpportunityState, choiceId: string): CellularAdaptationKind {
    if (opportunity.kind === 'redox-pulse' || choiceId === 'redox-defense') return 'antioxidantDefense';
    if (opportunity.kind === 'perfusion-window') return 'hypoxiaTolerance';
    if (choiceId === 'beta-oxidation') return 'metabolicFlexibility';
    if (opportunity.kind === 'glucose-wave' || opportunity.kind === 'insulin-pulse' || choiceId === 'glycolysis' || choiceId === 'pyruvate') return 'enzymaticEfficiency';
    return 'bufferCapacity';
}

export function selectAdaptationRewardType(
    roll: number,
    quality: number,
    outcome: AdaptationResponseOutcome,
): AdaptationRewardType {
    if (outcome === 'harmful') return 'none';
    let type: AdaptationRewardType = roll < .55
        ? 'knowledge'
        : roll < .8
            ? 'adaptation'
            : roll < .92
                ? 'multiplier'
                : roll < .98
                    ? 'case-variant'
                    : 'visual-effect';
    if ((type === 'case-variant' || type === 'visual-effect') && (quality < .8 || outcome !== 'optimal')) type = 'knowledge';
    return type;
}

function nextLocked(items: string[], unlocked: string[], seed: number): string | null {
    const locked = items.filter(item => !unlocked.includes(item));
    if (locked.length === 0) return null;
    return locked[Math.floor(unitSeed(seed) * locked.length) % locked.length];
}

export function resolveAdaptationWindow(
    physiology: PhysiologyState,
    cellular: CellularState,
    opportunity: AdaptationOpportunityState,
    progressInput: AdaptationProgressState,
    choiceId: string,
): AdaptationResolveResult | null {
    if (!opportunity.choices.some(choice => choice.id === choiceId)) return null;
    const score = responseScore(opportunity.kind, choiceId, physiology, cellular);
    const outcome: AdaptationResponseOutcome = score >= .8 ? 'optimal' : score >= .45 ? 'partial' : 'harmful';
    const effects = responseEffects(opportunity.kind, choiceId);
    const nextPhysiology = applyScenarioPhysiologyEffects(physiology, effects.physiology);
    let nextCellular = applyScenarioCellularEffects(cellular, effects.cellular);
    const progress = cloneProgress(progressInput);
    progress.resolved += 1;
    if (outcome === 'optimal') progress.successful += 1;
    const rewardRoll = unitSeed(opportunity.startedAt * 7.13 + opportunity.quality * 31.7 + score * 19 + progress.resolved);
    let rewardType = selectAdaptationRewardType(rewardRoll, opportunity.quality * score, outcome);
    const knowledge = Math.max(1, Math.round((6 + opportunity.quality * 10) * score * progress.knowledgeMultiplier));
    const title = outcome === 'optimal' ? 'Janela fisiológica aproveitada' : outcome === 'partial' ? 'Adaptação parcial' : 'Sobrecarga durante a janela';
    let detail = `${responseMechanism(opportunity.kind, choiceId)} ${outcome === 'optimal'
        ? 'A resposta acompanhou demanda, reservas e pressão dos pools.'
        : outcome === 'partial'
            ? 'Uma parte do mecanismo foi atendida, mas outra reserva permaneceu limitante.'
            : 'A ação aumentou demanda ou saturação no momento em que o sistema precisava de contenção.'}`;
    let value: number | undefined;

    if (rewardType === 'knowledge') {
        progress.physiologicalKnowledge += knowledge;
        value = knowledge;
        detail += ` +${knowledge} Conhecimento Fisiológico.`;
    } else if (rewardType === 'adaptation') {
        const kind = adaptationKindFor(opportunity, choiceId);
        if (nextCellular.adaptations[kind] < 4) {
            nextCellular = { ...nextCellular, adaptations: { ...nextCellular.adaptations, [kind]: nextCellular.adaptations[kind] + 1 } };
            detail += ' Uma capacidade coerente com a resposta avançou +1 nível.';
            value = 1;
        } else {
            rewardType = 'knowledge';
            progress.physiologicalKnowledge += knowledge;
            detail += ` A adaptação já estava no máximo; conversão em +${knowledge} Conhecimento Fisiológico.`;
            value = knowledge;
        }
    } else if (rewardType === 'multiplier') {
        progress.knowledgeMultiplier = Math.max(progress.knowledgeMultiplier, 1.5 + opportunity.quality * .25);
        progress.multiplierRemainingSeconds = 75;
        detail += ` Conhecimento ×${progress.knowledgeMultiplier.toFixed(2)} por 75 s fisiológicos.`;
        value = progress.knowledgeMultiplier;
    } else if (rewardType === 'case-variant') {
        const variant = nextLocked(CASE_VARIANTS, progress.unlockedCaseVariants, opportunity.startedAt + score * 11);
        if (variant) {
            progress.unlockedCaseVariants.push(variant);
            detail += ` Variante clínica desbloqueada: ${CASE_VARIANT_CONTENT[variant]?.label ?? variant}.`;
        } else {
            rewardType = 'knowledge';
            progress.physiologicalKnowledge += knowledge;
            detail += ` Variantes completas; conversão em +${knowledge} Conhecimento Fisiológico.`;
            value = knowledge;
        }
    } else if (rewardType === 'visual-effect') {
        const visual = nextLocked(VISUAL_EFFECTS, progress.unlockedVisualEffects, opportunity.startedAt + score * 23)
            ?? progress.unlockedVisualEffects[0];
        if (visual) {
            if (!progress.unlockedVisualEffects.includes(visual)) progress.unlockedVisualEffects.push(visual);
            progress.activeVisualEffect = visual;
            progress.visualEffectRemainingSeconds = 90;
            detail += ` Padrão visual raro ativado: ${visual}.`;
        } else {
            rewardType = 'knowledge';
            progress.physiologicalKnowledge += knowledge;
            detail += ` Conversão em +${knowledge} Conhecimento Fisiológico.`;
            value = knowledge;
        }
    } else if (outcome === 'harmful') {
        detail += ' A janela terminou sem recompensa.';
    }

    const definition = DEFINITIONS.find(item => item.kind === opportunity.kind);
    if (definition) {
        const timer = definition.timer;
        const current = nextCellular.rewards[timer];
        if (typeof current === 'number') {
            nextCellular = {
                ...nextCellular,
                rewards: { ...nextCellular.rewards, [timer]: Math.max(0, current - definition.threshold * .65) },
            };
        }
    }
    nextCellular = { ...nextCellular, lastEvent: `${title}: ${detail}` };
    const result: AdaptationRewardResult = {
        type: rewardType,
        outcome,
        title,
        detail,
        value,
        timestamp: nextPhysiology.timeElapsed,
    };
    progress.lastReward = result;
    return { physiology: nextPhysiology, cellular: nextCellular, progress, result };
}

export function getAdaptationOpportunityDefinitions() {
    return DEFINITIONS;
}

export function getUnlockedAdaptationCaseVariant(
    scenarioId: string,
    unlockedIds: readonly string[],
): AdaptationCaseVariant | null {
    const id = unlockedIds.find(candidate => CASE_VARIANT_CONTENT[candidate]?.scenarioId === scenarioId);
    return id ? CASE_VARIANT_CONTENT[id] : null;
}
