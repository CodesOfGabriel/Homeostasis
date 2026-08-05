import type {
    CellularRoutineChoice,
    CellularRoutineEvent,
    CellularState,
    DecisionResource,
    DecisionSignalId,
    SimulationDifficulty,
} from './cellularTypes';
import type { PhysiologicalContextFactors, PhysiologyState } from './types';
import { ALL_SCENARIO_METRIC_KEYS, type ScenarioMetricKey } from './scenarioMetrics';
import {
    createInitialScenarioNarrativeState,
    isDirectNarrativeContinuation,
    isScenarioNarrativelyCompatible,
    narrativeAffinity,
} from './scenarioNarrative';
import { isSimulationTimeWithinWindows, type SimulationTimeWindow } from './simulationCalendar';
import { getCellularDamageBurden, getDominantCellularDamage } from './cellularDamage';

export const BASELINE_PHYSIOLOGICAL_CONTEXT: PhysiologicalContextFactors = {
    exercise: 0,
    nutrition: 80,
    stress: 20,
    sleep: 80,
    temperature: 22,
};

export type ScenarioEffectTarget =
    | 'cell.atp'
    | 'cell.pH'
    | 'cell.osmolarity'
    | 'cell.volume'
    | 'cell.membranePotential'
    | 'cell.sodium'
    | 'cell.potassium'
    | 'cell.calcium'
    | 'cell.nadh'
    | 'cell.viability'
    | 'tissue.perfusion'
    | 'tissue.oxygen'
    | 'tissue.carbonDioxide'
    | 'tissue.glucose'
    | 'tissue.lactate'
    | 'tissue.pH'
    | 'tissue.osmolarity'
    | 'tissue.sodium'
    | 'tissue.potassium'
    | 'tissue.waste'
    | 'available.glucose'
    | 'available.oxygen'
    | 'available.fattyAcid'
    | 'available.aminoAcid'
    | 'captured.glucose'
    | 'captured.oxygen'
    | 'captured.fattyAcid'
    | 'captured.aminoAcid'
    | 'pool.pyruvate'
    | 'mitochondria.membranePotential'
    | 'mitochondria.etcFlux'
    | 'mitochondria.atpSynthase'
    | 'mitochondria.oxygenConsumption'
    | 'mitochondria.health'
    | 'processing.pyruvate'
    | 'processing.fattyAcid'
    | 'processing.nadh'
    | 'processing.fadh2'
    | 'processing.oxygen'
    | 'processing.protons'
    | 'processing.adp'
    | 'processing.atp'
    | 'processing.water'
    | 'damage.oxidative'
    | 'damage.membrane'
    | 'damage.proteins'
    | 'damage.dna'
    | 'damage.antioxidants'
    | 'fate.apoptoticCommitment'
    | 'fate.infectionSusceptibility';

export interface ScenarioEffect {
    target: ScenarioEffectTarget;
    delta: number;
}

export type ScenarioPhysiologyTarget =
    | 'energy.atp'
    | 'energy.deficit'
    | 'energy.lactate'
    | 'nutrients.glucose'
    | 'nutrients.hydration'
    | 'nutrients.sodium'
    | 'nutrients.potassium'
    | 'nutrients.ketones'
    | 'nutrients.hoursSinceMeal'
    | 'allostatic.load'
    | 'allostatic.inflammation'
    | 'allostatic.oxidative'
    | 'pathophysiology.infection'
    | 'pathophysiology.capillaryLeak'
    | 'cardiovascular.heartRate'
    | 'cardiovascular.hrv'
    | 'cardiovascular.systolic'
    | 'cardiovascular.diastolic'
    | 'cardiovascular.map'
    | 'cardiovascular.cardiacOutput'
    | 'cardiovascular.strokeVolume'
    | 'cardiovascular.svr'
    | 'cardiovascular.perfusion'
    | 'respiratory.rate'
    | 'respiratory.pao2'
    | 'respiratory.paco2'
    | 'respiratory.spo2'
    | 'respiratory.tidalVolume'
    | 'respiratory.minuteVentilation'
    | 'acidBase.pH'
    | 'acidBase.bicarbonate'
    | 'acidBase.baseExcess'
    | 'acidBase.anionGap'
    | 'renal.gfr'
    | 'renal.adh'
    | 'hormones.insulin'
    | 'hormones.glucagon'
    | 'hormones.adrenaline'
    | 'hormones.cortisol'
    | 'endocrine.hpaDrive'
    | 'endocrine.sympatheticDrive'
    | 'endocrine.cortisolExposure'
    | 'endocrine.catecholamineExposure'
    | 'organs.liver.perfusion'
    | 'organs.liver.oxygenation'
    | 'organs.liver.damage'
    | 'organs.liver.functionality'
    | 'organs.brain.perfusion'
    | 'organs.brain.oxygenation'
    | 'organs.brain.damage'
    | 'organs.brain.functionality'
    | 'organs.muscles.perfusion'
    | 'organs.muscles.oxygenation'
    | 'organs.muscles.damage'
    | 'organs.muscles.functionality'
    | 'body.temperature';

export interface ScenarioPhysiologyEffect {
    target: ScenarioPhysiologyTarget;
    delta?: number;
    value?: number;
}

export interface ScenarioEligibility {
    eligible: boolean;
    weight: number;
    reason: string;
}

interface ScenarioChoiceDefinition extends CellularRoutineChoice {
    result: string;
    cellularEffects: ScenarioEffect[];
    physiologyEffects: ScenarioPhysiologyEffect[];
}

export interface ScenarioDefinition {
    id: string;
    title: string;
    description: string;
    explanation: string;
    investigationPrompt?: string;
    contextSummary: string;
    context: PhysiologicalContextFactors;
    category: CellularRoutineEvent['category'];
    severity: CellularRoutineEvent['severity'];
    durationSeconds: number;
    cooldownSeconds: number;
    difficulty: SimulationDifficulty;
    metricKeys: readonly ScenarioMetricKey[];
    priorityMetricKeys: readonly ScenarioMetricKey[];
    choices: ScenarioChoiceDefinition[];
    isEligible: (state: CellularState, macro: PhysiologyState) => ScenarioEligibility;
    onStart: ScenarioEffect[];
    onStartPhysiology: ScenarioPhysiologyEffect[];
    onTimeout: ScenarioEffect[];
    onTimeoutPhysiology: ScenarioPhysiologyEffect[];
}

const eligibleWhen = (
    weight: number,
    reason: string,
    predicate: (state: CellularState, macro: PhysiologyState) => boolean,
) =>
    (state: CellularState, macro: PhysiologyState): ScenarioEligibility => ({
        eligible: macro.isAlive && predicate(state, macro),
        weight,
        reason,
    });

const ALL_DAY: readonly SimulationTimeWindow[] = [
    { startHour: 0, endHour: 24, label: 'qualquer horário' },
];

/**
 * Janelas narrativas do calendário comprimido. Eventos encadeados mantêm sua
 * própria janela: whisky surge à noite e sua complicação aparece na madrugada.
 */
export const SCENARIO_TIME_WINDOWS: Record<string, readonly SimulationTimeWindow[]> = {
    'stair-climb': [{ startHour: 7, endHour: 20, label: 'manhã ao início da noite' }],
    'meal-surge': [
        { startHour: 11, endHour: 15, label: 'almoço' },
        { startHour: 19, endHour: 22, label: 'jantar' },
    ],
    'morning-fast': [{ startHour: 6, endHour: 10, label: 'início da manhã' }],
    'micro-injury': [{ startHour: 8, endHour: 22, label: 'período desperto após esforço' }],
    'immune-challenge': [{ startHour: 7, endHour: 23, label: 'período desperto' }],
    'heat-dehydration': [{ startHour: 11, endHour: 18, label: 'horas mais quentes' }],
    'orthostatic-transition': [{ startHour: 6, endHour: 11, label: 'ao levantar pela manhã' }],
    'hypercapnic-challenge': [{ startHour: 20, endHour: 6, label: 'noite em ambiente fechado' }],
    'acute-water-load': [{ startHour: 12, endHour: 21, label: 'tarde ou início da noite após hidratação' }],
    'nocturnal-hypoglycemia': [{ startHour: 0, endHour: 6, label: 'madrugada' }],
    'mitochondrial-uncoupling': [
        { startHour: 6, endHour: 12, label: 'treino matinal' },
        { startHour: 16, endHour: 21, label: 'treino no fim do dia' },
    ],
    'mixed-ketoacidotic-fatigue': [{ startHour: 4, endHour: 12, label: 'fim da madrugada à manhã' }],
    'distributive-dysoxia': [{ startHour: 12, endHour: 23, label: 'deterioração ao longo do dia' }],
    'reperfusion-paradox': ALL_DAY,
    'hyperosmolar-renal-conflict': [{ startHour: 13, endHour: 21, label: 'fim de um turno prolongado' }],
    'whisky-party-hepatic-overload': [{ startHour: 20, endHour: 2, label: 'noite de festa' }],
    'alcohol-nocturnal-hypoglycemia': [{ startHour: 1, endHour: 7, label: 'madrugada após a festa' }],
    'fasted-workout-free-fatty-acids': [{ startHour: 6, endHour: 10, label: 'treino matinal em jejum' }],
    'chronic-anxiety-sedentary': [{ startHour: 17, endHour: 23, label: 'fim do dia em repouso' }],
    'panic-hyperventilation': [{ startHour: 20, endHour: 2, label: 'noite em casa' }],
    'major-hemorrhage': ALL_DAY,
};

export function getScenarioTimeWindows(id: string): readonly SimulationTimeWindow[] {
    return SCENARIO_TIME_WINDOWS[id] ?? ALL_DAY;
}

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
    {
        id: 'stair-climb',
        title: 'Subida inesperada de escadas',
        description: 'Após vários lances de escada, o humano está dispneico, com taquicardia e queimação nas pernas, mas ainda mantém oxigenação arterial.',
        explanation: 'Antes de tratar a taquicardia, diferencie uma resposta fisiológica ao esforço de instabilidade: interromper a carga e permitir recuperação ventilatória costuma ser a primeira manobra.',
        contextSummary: 'Exercício 78% · estresse 42% · oferta nutricional basal',
        context: { exercise: 78, nutrition: 80, stress: 42, sleep: 80, temperature: 23 },
        category: 'organ', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['heartRate', 'respiratoryRate', 'spo2', 'tissueOxygen', 'tissueLactate', 'cellularAtp', 'energyDeficit'],
        priorityMetricKeys: ['heartRate', 'respiratoryRate', 'spo2', 'tissueOxygen', 'tissueLactate', 'cellularAtp', 'energyDeficit'],
        choices: [
            {
                id: 'stair-aerobic', label: 'Interromper a subida, sentar e recuperar a ventilação',
                description: 'Reduz a demanda muscular e permite que ventilação e perfusão eliminem o déficit acumulado.',
                tradeoff: 'É apropriado se pressão, SpO₂ e nível de consciência estiverem preservados; sinais de alarme exigiriam avaliação clínica.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .15 }, { resource: 'oxygen', minimum: 1, cost: 1 }],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Reforçar o quimiorreflexo ventilatório' }],
                result: 'A entrega de O₂ acompanhou a demanda; o déficit e o lactato recuaram.',
                cellularEffects: [{ target: 'cell.atp', delta: .5 }, { target: 'tissue.lactate', delta: -.7 }, { target: 'damage.oxidative', delta: -1 }],
                physiologyEffects: [{ target: 'energy.atp', delta: .35 }, { target: 'energy.deficit', delta: -4 }, { target: 'energy.lactate', delta: -.8 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'stair-glycolytic', label: 'Usar estimulante e continuar a subida',
                description: 'Tenta vencer o cansaço elevando catecolaminas sem reduzir a carga física.',
                tradeoff: 'Pode mascarar sintomas enquanto aumenta frequência, demanda de O₂ e acúmulo de lactato.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'A demanda foi mascarada por pouco tempo; lactato, ROS e déficit energético aumentaram.',
                cellularEffects: [{ target: 'cell.atp', delta: -.2 }, { target: 'tissue.lactate', delta: 1.6 }, { target: 'damage.oxidative', delta: 4 }],
                physiologyEffects: [{ target: 'energy.deficit', delta: 6 }, { target: 'energy.lactate', delta: 2 }, { target: 'allostatic.load', delta: 8 }],
            },
        ],
        isEligible: eligibleWhen(1, 'uma necessidade locomotora súbita elevou a intensidade do exercício para 78%',
            (state, macro) => state.cell.viabilityPercent > 55 && macro.energy.energyDeficit < 80),
        onStart: [{ target: 'cell.atp', delta: -.25 }, { target: 'tissue.lactate', delta: .45 }],
        onStartPhysiology: [{ target: 'energy.deficit', delta: 2.5 }, { target: 'energy.lactate', delta: .45 }],
        onTimeout: [{ target: 'cell.atp', delta: -.55 }, { target: 'tissue.lactate', delta: 1.4 }, { target: 'damage.oxidative', delta: 4 }],
        onTimeoutPhysiology: [{ target: 'energy.deficit', delta: 8 }, { target: 'energy.lactate', delta: 2.5 }, { target: 'allostatic.load', delta: 10 }],
    },
    {
        id: 'meal-surge',
        title: 'Sobrecarga pós-prandial',
        description: 'Depois de uma refeição muito rica em carboidratos, a glicemia subiu e o pâncreas precisa coordenar captação e armazenamento.',
        explanation: 'Este é um estado alimentado: a resposta insulinêmica fisiológica e atividade leve favorecem captação. Glucagon ou mais açúcar contradizem o contexto e mantêm produção hepática de glicose.',
        contextSummary: 'Refeição recente · nutrição 100% · glicose em ascensão',
        context: { exercise: 5, nutrition: 100, stress: 24, sleep: 80, temperature: 22 },
        category: 'molecule', severity: 'warning', durationSeconds: 30, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['bloodGlucose', 'cellularAtp', 'ros', 'bloodLactate', 'arterialPH'],
        priorityMetricKeys: ['bloodGlucose', 'cellularAtp', 'ros', 'bloodLactate', 'arterialPH'],
        choices: [
            {
                id: 'meal-insulin', label: 'Favorecer resposta insulinêmica e caminhada leve',
                description: 'Estimula captação periférica e armazenamento sem adicionar nova carga alimentar.',
                tradeoff: 'Consome ATP, mas reduz glicose e pressão oxidativa.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .25 }],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                result: 'A glicose foi captada e armazenada; o eixo insulina/glucagon retornou ao equilíbrio pós-prandial.',
                cellularEffects: [{ target: 'tissue.glucose', delta: -.8 }, { target: 'damage.oxidative', delta: -3 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -16 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'meal-glucagon', label: 'Ingerir mais açúcar e estimular glucagon',
                description: 'Soma glicose dietética e produção hepática apesar da glicemia já elevada.',
                tradeoff: 'Aumenta substrato circulante e a carga osmótica.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Liberar glucagon' }],
                result: 'O glucagon somou produção hepática à refeição; hiperglicemia e estresse oxidativo pioraram.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1.5 }, { target: 'damage.oxidative', delta: 6 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 24 }, { target: 'nutrients.ketones', delta: .25 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: eligibleWhen(.95, 'uma refeição com alta carga de carboidratos iniciou absorção intestinal',
            (_state, macro) => macro.nutrients.hoursSinceMeal >= 2 && macro.nutrients.bloodGlucose < 190),
        onStart: [{ target: 'available.glucose', delta: 2 }, { target: 'tissue.glucose', delta: .9 }],
        onStartPhysiology: [{ target: 'nutrients.glucose', delta: 20 }, { target: 'nutrients.hoursSinceMeal', value: 0 }],
        onTimeout: [{ target: 'damage.oxidative', delta: 7 }, { target: 'tissue.glucose', delta: 1 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: 28 }, { target: 'allostatic.load', delta: 8 }],
    },
    {
        id: 'morning-fast',
        title: 'Jejum prolongado',
        description: 'Após muitas horas sem alimentação, o humano sente fraqueza leve, mas ainda está consciente e com glicemia compensada no limite.',
        explanation: 'No jejum sem neuroglicopenia, glucagon e lipólise preservam glicose. Se surgirem sintomas ou queda importante, interromper o jejum e oferecer carboidrato passa a ser prioridade.',
        contextSummary: '12 h de jejum · nutrição 15% · estresse contrarregulatório moderado',
        context: { exercise: 8, nutrition: 15, stress: 35, sleep: 70, temperature: 21 },
        category: 'molecule', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['bloodGlucose', 'cellularAtp', 'tissueOxygen', 'bloodLactate', 'arterialPH'],
        priorityMetricKeys: ['bloodGlucose', 'cellularAtp', 'tissueOxygen', 'bloodLactate', 'arterialPH'],
        choices: [
            {
                id: 'fast-fat', label: 'Reduzir atividade e permitir contrarregulação do jejum',
                description: 'Preserva glicose com glucagon e uso gradual de gordura enquanto sintomas e glicemia são reavaliados.',
                tradeoff: 'Exige O₂ e eleva discretamente a produção fisiológica de cetonas.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .1 }, { resource: 'fattyAcid', minimum: .5, cost: .5 }, { resource: 'oxygen', minimum: 1, cost: 1 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon', 'hormone:release-adrenaline'], label: 'Mobilizar glucagon ou adrenalina' }],
                result: 'A troca de combustível sustentou ATP e preservou a glicemia dentro da faixa funcional.',
                cellularEffects: [{ target: 'available.fattyAcid', delta: 1 }, { target: 'cell.atp', delta: .5 }, { target: 'damage.oxidative', delta: 1 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 5 }, { target: 'nutrients.ketones', delta: .2 }, { target: 'energy.deficit', delta: -4 }],
            },
            {
                id: 'fast-insulin', label: 'Aplicar insulina apesar da baixa ingestão',
                description: 'Aumenta a retirada de glicose e bloqueia a contrarregulação num organismo ainda em jejum.',
                tradeoff: 'Inibe lipólise, mas remove o principal combustível circulante.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                result: 'A insulina sem aporte alimentar aprofundou a hipoglicemia e o déficit energético.',
                cellularEffects: [{ target: 'available.glucose', delta: -1.5 }, { target: 'cell.atp', delta: -.45 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -18 }, { target: 'energy.deficit', delta: 7 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: eligibleWhen(.9, 'o intervalo sem alimentação avançou até 12 horas',
            (_state, macro) => macro.nutrients.hoursSinceMeal >= 6 && macro.nutrients.bloodGlucose > 55),
        onStart: [{ target: 'available.glucose', delta: -1.2 }, { target: 'tissue.glucose', delta: -.55 }],
        onStartPhysiology: [{ target: 'nutrients.hoursSinceMeal', value: 12 }, { target: 'nutrients.glucose', delta: -8 }, { target: 'nutrients.ketones', delta: .25 }],
        onTimeout: [{ target: 'cell.atp', delta: -.6 }, { target: 'damage.oxidative', delta: 3 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: -14 }, { target: 'energy.deficit', delta: 9 }, { target: 'allostatic.load', delta: 8 }],
    },
    {
        id: 'micro-injury',
        title: 'Microlesão muscular',
        description: 'Após exercício excêntrico, surgiu dor muscular localizada sem instabilidade sistêmica ou perda funcional importante.',
        explanation: 'Microlesão pede redução temporária de carga, avaliação funcional e recuperação progressiva. Corticoide ou treino intenso para mascarar dor pode atrasar reparo e ampliar dano.',
        contextSummary: 'Esforço excêntrico 72% · estresse 38% · demanda de reparo elevada',
        context: { exercise: 72, nutrition: 75, stress: 38, sleep: 75, temperature: 22 },
        category: 'cell', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['inflammation', 'cellularAtp', 'ros', 'proteinDamage', 'temperature'],
        priorityMetricKeys: ['inflammation', 'cellularAtp', 'ros', 'proteinDamage', 'temperature'],
        choices: [
            {
                id: 'injury-repair', label: 'Suspender carga, comprimir e iniciar recuperação gradual',
                description: 'Protege a área e permite reparo proporcional com hidratação, nutrição e retorno progressivo ao esforço.',
                tradeoff: 'Reduz ATP transitório, protegendo a viabilidade futura.',
                requirements: [{ resource: 'atp', minimum: 1.55, cost: .55 }, { resource: 'aminoAcid', minimum: .5, cost: .5 }],
                signalRequirements: [{ anyOf: ['hormone:boost-mtor', 'hormone:release-gh'], label: 'Ativar mTOR ou eixo GH' }],
                result: 'O reparo conteve o dano estrutural e reduziu o sinal inflamatório.',
                cellularEffects: [{ target: 'damage.proteins', delta: -9 }, { target: 'damage.membrane', delta: -2 }],
                physiologyEffects: [{ target: 'allostatic.inflammation', delta: -2 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'injury-defer', label: 'Mascarar a dor com corticoide e manter o treino',
                description: 'Reduz o sinal inflamatório percebido para continuar a carga sobre fibras já lesionadas.',
                tradeoff: 'Proteínas lesadas permanecem ativas e amplificam inflamação.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol para sustentar a carga' }],
                result: 'A carga continuou sobre proteínas danificadas; inflamação e perda de viabilidade aumentaram.',
                cellularEffects: [{ target: 'damage.proteins', delta: 8 }, { target: 'damage.membrane', delta: 3 }, { target: 'cell.atp', delta: -.2 }],
                physiologyEffects: [{ target: 'allostatic.inflammation', delta: 7 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: eligibleWhen(.85, 'uma carga mecânica excêntrica produziu microlesões musculares',
            state => state.damage.proteins < 65 && state.cell.viabilityPercent > 45),
        onStart: [{ target: 'damage.proteins', delta: 5 }],
        onStartPhysiology: [{ target: 'allostatic.inflammation', delta: 3 }, { target: 'allostatic.load', delta: 3 }],
        onTimeout: [{ target: 'damage.proteins', delta: 8 }, { target: 'damage.membrane', delta: 4 }],
        onTimeoutPhysiology: [{ target: 'allostatic.inflammation', delta: 9 }, { target: 'allostatic.load', delta: 9 }],
    },
    {
        id: 'immune-challenge',
        title: 'Desafio imune agudo',
        description: 'Um pequeno corte contaminado ficou doloroso, quente e eritematoso; febre e inflamação começam a subir.',
        explanation: 'A prioridade clínica é avaliar e controlar o foco: limpeza, drenagem quando indicada e antimicrobiano conforme gravidade. Corticoide isolado pode esconder sinais enquanto a infecção progride.',
        contextSummary: 'Infecção aguda · estresse 76% · sono prejudicado · febre em formação',
        context: { exercise: 4, nutrition: 65, stress: 76, sleep: 35, temperature: 25 },
        category: 'cell', severity: 'critical', durationSeconds: 26, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['infection', 'temperature', 'inflammation', 'ros', 'cellularAtp'],
        priorityMetricKeys: ['infection', 'temperature', 'inflammation', 'ros', 'cellularAtp'],
        choices: [
            {
                id: 'immune-control', label: 'Limpar o foco e iniciar tratamento antimicrobiano indicado',
                description: 'Combina controle local da fonte, suporte e defesa imune proporcional, monitorando febre e progressão.',
                tradeoff: 'Consome ATP, mas protege membranas e proteínas.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .4 }, { resource: 'antioxidants', minimum: 35, cost: 8 }],
                result: 'A resposta conteve o foco sem ampliar o dano oxidativo; febre e inflamação começaram a recuar.',
                cellularEffects: [{ target: 'damage.oxidative', delta: -8 }, { target: 'damage.proteins', delta: -2 }],
                physiologyEffects: [{ target: 'pathophysiology.infection', delta: -12 }, { target: 'allostatic.inflammation', delta: -9 }, { target: 'body.temperature', delta: -.35 }],
            },
            {
                id: 'immune-suppress', label: 'Usar apenas corticoide para esconder febre e dor',
                description: 'Reduz sinais inflamatórios antes de limpar ou tratar o agente infeccioso.',
                tradeoff: 'Alivia sintomas, mas enfraquece contenção imune e eleva glicose.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }],
                result: 'A inflamação aparente caiu, mas o foco infeccioso progrediu e aumentou a carga sistêmica.',
                cellularEffects: [{ target: 'damage.oxidative', delta: 7 }, { target: 'damage.proteins', delta: 4 }, { target: 'cell.atp', delta: -.35 }],
                physiologyEffects: [{ target: 'pathophysiology.infection', delta: 14 }, { target: 'pathophysiology.capillaryLeak', delta: .08 }, { target: 'nutrients.glucose', delta: 10 }, { target: 'allostatic.load', delta: 10 }],
            },
        ],
        isEligible: eligibleWhen(.8, 'um foco infeccioso ativou a resposta imune inata',
            (_state, macro) => macro.pathophysiology.infectionSeverity < 65 && macro.capacities.immuneActivation > .25),
        onStart: [{ target: 'damage.oxidative', delta: 5 }, { target: 'cell.atp', delta: -.15 }],
        onStartPhysiology: [{ target: 'pathophysiology.infection', delta: 18 }, { target: 'allostatic.inflammation', delta: 8 }, { target: 'body.temperature', delta: .35 }],
        onTimeout: [{ target: 'damage.oxidative', delta: 11 }, { target: 'damage.proteins', delta: 4 }],
        onTimeoutPhysiology: [{ target: 'pathophysiology.infection', delta: 18 }, { target: 'pathophysiology.capillaryLeak', delta: .07 }, { target: 'allostatic.load', delta: 12 }],
    },
    {
        id: 'heat-dehydration',
        title: 'Onda de calor e desidratação',
        description: 'Após esforço no calor, o humano está taquicárdico, muito suado e com sinais de desidratação, mas ainda responde adequadamente.',
        explanation: 'A conduta inicial combina retirada do calor, resfriamento e reposição hidroeletrolítica proporcional. Estimulantes e continuação do exercício aumentam termogênese e perdas.',
        contextSummary: 'Ambiente 39 °C · estresse 55% · exercício leve · perda hídrica acelerada',
        context: { exercise: 18, nutrition: 75, stress: 55, sleep: 72, temperature: 39 },
        category: 'organ', severity: 'critical', durationSeconds: 26, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['temperature', 'hydration', 'meanArterialPressure', 'heartRate', 'cellVolume'],
        priorityMetricKeys: ['temperature', 'hydration', 'meanArterialPressure', 'heartRate', 'cellVolume'],
        choices: [
            {
                id: 'heat-conserve', label: 'Levar à sombra, resfriar e repor solução isotônica',
                description: 'Interrompe o esforço, favorece dissipação térmica e repõe água e eletrólitos com monitorização.',
                tradeoff: 'A reposição deve acompanhar estado mental, pressão e sódio; resfriamento não substitui avaliação se houver hipertermia grave.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .4 }],
                signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Ativar osmorreceptores e ADH' }],
                result: 'A perda hídrica foi contida; osmolaridade, volume celular e temperatura caminharam ao basal.',
                cellularEffects: [{ target: 'cell.volume', delta: 5 }, { target: 'tissue.osmolarity', delta: -5 }, { target: 'damage.membrane', delta: -3 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: 1.2 }, { target: 'body.temperature', delta: -.65 }, { target: 'allostatic.load', delta: -4 }],
            },
            {
                id: 'heat-adrenaline', label: 'Dar estimulante e insistir no exercício',
                description: 'Eleva débito e alerta sem corrigir calor ou perda hidroeletrolítica.',
                tradeoff: 'Gera mais calor, suor e consumo de ATP.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'A produção de calor e o suor aumentaram; desidratação, osmolaridade e dano de membrana pioraram.',
                cellularEffects: [{ target: 'cell.volume', delta: -7 }, { target: 'tissue.osmolarity', delta: 7 }, { target: 'damage.membrane', delta: 6 }, { target: 'cell.atp', delta: -.3 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: -1.1 }, { target: 'body.temperature', delta: .7 }, { target: 'allostatic.load', delta: 9 }],
            },
        ],
        isEligible: eligibleWhen(.75, 'uma onda de calor elevou o ambiente para 39 °C e acelerou a perda de água',
            (_state, macro) => macro.nutrients.hydration > 30 && macro.bodyTemperature < 40.2),
        onStart: [{ target: 'tissue.osmolarity', delta: 5 }, { target: 'cell.volume', delta: -4 }],
        onStartPhysiology: [{ target: 'nutrients.hydration', delta: -.45 }, { target: 'body.temperature', delta: .3 }],
        onTimeout: [{ target: 'cell.volume', delta: -8 }, { target: 'damage.membrane', delta: 7 }, { target: 'tissue.osmolarity', delta: 6 }],
        onTimeoutPhysiology: [{ target: 'nutrients.hydration', delta: -1.4 }, { target: 'body.temperature', delta: .8 }, { target: 'allostatic.load', delta: 12 }],
    },
    {
        id: 'orthostatic-transition',
        title: 'Hipotensão ortostática súbita',
        description: 'Ao levantar rapidamente, o retorno venoso e a perfusão cerebral caíram antes que o barorreflexo compensasse.',
        explanation: 'Primeiro deite o paciente, eleve as pernas e reavalie pressão, frequência e hidratação. O barorreflexo deve sustentar perfusão; bloquear a taquicardia compensatória pode precipitar síncope.',
        contextSummary: 'Mudança postural · PAM e perfusão em queda · demanda autonômica imediata',
        context: { exercise: 12, nutrition: 75, stress: 58, sleep: 72, temperature: 22 },
        category: 'organ', severity: 'critical', durationSeconds: 24, cooldownSeconds: 240, difficulty: 'easy',
        metricKeys: ['meanArterialPressure', 'perfusionIndex', 'heartRate', 'tissueOxygen', 'bloodLactate'],
        priorityMetricKeys: ['meanArterialPressure', 'perfusionIndex', 'heartRate', 'tissueOxygen', 'bloodLactate'],
        choices: [
            {
                id: 'orthostasis-sympathetic', label: 'Deitar, elevar as pernas e permitir o barorreflexo',
                description: 'Aumenta retorno venoso enquanto tônus vascular e frequência restauram a perfusão cerebral.',
                tradeoff: 'Compensação rápida com custo autonômico e energético transitório.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .1 }],
                signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar resposta simpática' }],
                result: 'O barorreflexo restaurou pressão e perfusão sem manter uma descarga excessiva.',
                cellularEffects: [{ target: 'cell.atp', delta: .2 }, { target: 'tissue.lactate', delta: -.25 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 9 }, { target: 'cardiovascular.perfusion', delta: 13 }, { target: 'energy.deficit', delta: -2 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'orthostasis-vagal', label: 'Administrar bloqueador de frequência imediatamente',
                description: 'Trata a taquicardia compensatória antes de corrigir posição, retorno venoso ou volume.',
                tradeoff: 'Poupa ativação simpática, mas pode aprofundar hipoperfusão e síncope.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Favorecer recuperação parassimpática' }],
                result: 'A resposta vagal precoce prolongou a hipotensão e aumentou o déficit de perfusão.',
                cellularEffects: [{ target: 'cell.atp', delta: -.25 }, { target: 'tissue.lactate', delta: .8 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: -7 }, { target: 'cardiovascular.perfusion', delta: -10 }, { target: 'energy.deficit', delta: 6 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: eligibleWhen(.82, 'a mudança postural deslocou volume para os membros inferiores antes da compensação barorreflexa',
            (state, macro) => state.cell.viabilityPercent > 60 && macro.cardiovascular.meanArterialPressure > 72 && macro.cardiovascular.heartRate < 115),
        onStart: [{ target: 'cell.atp', delta: -.15 }, { target: 'tissue.lactate', delta: .3 }],
        onStartPhysiology: [{ target: 'cardiovascular.map', delta: -13 }, { target: 'cardiovascular.perfusion', delta: -17 }, { target: 'energy.deficit', delta: 3 }],
        onTimeout: [{ target: 'cell.atp', delta: -.4 }, { target: 'tissue.lactate', delta: 1 }],
        onTimeoutPhysiology: [{ target: 'cardiovascular.map', delta: -10 }, { target: 'cardiovascular.perfusion', delta: -14 }, { target: 'energy.deficit', delta: 8 }],
    },
    {
        id: 'hypercapnic-challenge',
        title: 'Retenção aguda de CO₂',
        description: 'O humano está sonolento e ventilando pouco; PaCO₂ sobe e o pH cai, mesmo antes de a SpO₂ mostrar toda a gravidade.',
        explanation: 'Retenção de CO₂ exige avaliar via aérea e ventilação alveolar. Posicionamento e suporte ventilatório tratam a causa; estimulante ou adrenalina isolados só elevam demanda em acidemia.',
        contextSummary: 'PaCO₂ em elevação · pH em queda · oxigenação sob pressão',
        context: { exercise: 6, nutrition: 70, stress: 64, sleep: 52, temperature: 23 },
        category: 'organ', severity: 'critical', durationSeconds: 24, cooldownSeconds: 240, difficulty: 'easy',
        metricKeys: ['paco2', 'arterialPH', 'respiratoryRate', 'spo2', 'bloodLactate'],
        priorityMetricKeys: ['paco2', 'arterialPH', 'respiratoryRate', 'spo2', 'bloodLactate'],
        choices: [
            {
                id: 'hypercapnia-chemoreflex', label: 'Posicionar a via aérea e iniciar suporte ventilatório',
                description: 'Corrige ventilação alveolar enquanto nível de consciência, PaCO₂, pH e fadiga respiratória são monitorados.',
                tradeoff: 'Eleva trabalho respiratório, mas corrige a causa gasométrica.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .15 }],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Reforçar resposta quimiorreflexa' }],
                result: 'A ventilação aumentou, PaCO₂ recuou e o pH caminhou para compensação.',
                cellularEffects: [{ target: 'tissue.lactate', delta: -.35 }, { target: 'cell.atp', delta: .15 }],
                physiologyEffects: [{ target: 'respiratory.paco2', delta: -10 }, { target: 'respiratory.spo2', delta: 1.5 }, { target: 'acidBase.pH', delta: .05 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'hypercapnia-catecholamine', label: 'Dar estimulante e observar sem ventilar',
                description: 'Tenta elevar alerta e débito sem remover o CO₂ acumulado nem proteger a via aérea.',
                tradeoff: 'Aumenta demanda miocárdica em ambiente acidótico.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'A descarga adrenérgica elevou a demanda sem corrigir a hipoventilação; acidemia e lactato pioraram.',
                cellularEffects: [{ target: 'tissue.lactate', delta: 1.2 }, { target: 'damage.oxidative', delta: 3 }],
                physiologyEffects: [{ target: 'respiratory.paco2', delta: 6 }, { target: 'acidBase.pH', delta: -.035 }, { target: 'energy.lactate', delta: 1.3 }, { target: 'allostatic.load', delta: 8 }],
            },
        ],
        isEligible: eligibleWhen(.78, 'uma queda da ventilação alveolar iniciou retenção de CO₂',
            (_state, macro) => macro.respiratory.paco2 < 49 && macro.acidBase.pH > 7.3),
        onStart: [{ target: 'tissue.lactate', delta: .3 }, { target: 'cell.atp', delta: -.12 }],
        onStartPhysiology: [{ target: 'respiratory.paco2', delta: 11 }, { target: 'respiratory.spo2', delta: -2 }, { target: 'acidBase.pH', delta: -.055 }],
        onTimeout: [{ target: 'tissue.lactate', delta: 1 }, { target: 'damage.oxidative', delta: 4 }],
        onTimeoutPhysiology: [{ target: 'respiratory.paco2', delta: 10 }, { target: 'acidBase.pH', delta: -.07 }, { target: 'allostatic.load', delta: 9 }],
    },
    {
        id: 'acute-water-load',
        title: 'Sobrecarga hídrica aguda',
        description: 'Uma ingestão rápida de água reduziu a osmolaridade e começou a diluir o sódio plasmático.',
        explanation: 'Suspenda a ingestão, avalie sintomas neurológicos e acompanhe sódio. ADH deve cair para excretar água; desmopressina sem indicação aprofundaria a hiponatremia dilucional.',
        contextSummary: 'Água corporal em alta · sódio diluído · necessidade de diurese aquosa',
        context: { exercise: 2, nutrition: 72, stress: 28, sleep: 78, temperature: 21 },
        category: 'molecule', severity: 'warning', durationSeconds: 28, cooldownSeconds: 260, difficulty: 'easy',
        metricKeys: ['plasmaSodium', 'hydration', 'cellVolume', 'meanArterialPressure'],
        priorityMetricKeys: ['plasmaSodium', 'hydration', 'cellVolume', 'meanArterialPressure'],
        choices: [
            {
                id: 'water-load-suppress-adh', label: 'Suspender água e monitorar a diurese e o sódio',
                description: 'Permite supressão fisiológica de ADH e excreção de água livre, com reavaliação neurológica.',
                tradeoff: 'Aumenta diurese e exige monitorar a correção do volume.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .08 }],
                signalRequirements: [{ anyOf: ['central:suppress-adh'], label: 'Suprimir sinal osmótico de ADH' }],
                result: 'A diurese aquosa reduziu o excesso de volume e o sódio voltou em direção à faixa funcional.',
                cellularEffects: [{ target: 'cell.volume', delta: -3 }, { target: 'tissue.osmolarity', delta: 4 }, { target: 'damage.membrane', delta: -1 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: -.9 }, { target: 'nutrients.sodium', delta: 2.2 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'water-load-retain-adh', label: 'Administrar desmopressina e manter hidratação',
                description: 'Mantém reabsorção renal apesar da osmolaridade já reduzida e da água corporal elevada.',
                tradeoff: 'Preserva volume, mas aprofunda diluição do sódio e edema celular.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Ativar osmorreceptores e ADH' }],
                result: 'A retenção adicional ampliou hiponatremia dilucional e edema celular.',
                cellularEffects: [{ target: 'cell.volume', delta: 6 }, { target: 'tissue.osmolarity', delta: -6 }, { target: 'damage.membrane', delta: 3 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: 1.1 }, { target: 'nutrients.sodium', delta: -3 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: eligibleWhen(.7, 'uma ingestão hídrica rápida ultrapassou momentaneamente a capacidade de excreção renal',
            (_state, macro) => macro.nutrients.hydration < 43.5 && macro.nutrients.sodium > 134),
        onStart: [{ target: 'cell.volume', delta: 3 }, { target: 'tissue.osmolarity', delta: -4 }],
        onStartPhysiology: [{ target: 'nutrients.hydration', delta: 1.4 }, { target: 'nutrients.sodium', delta: -2.5 }],
        onTimeout: [{ target: 'cell.volume', delta: 5 }, { target: 'damage.membrane', delta: 3 }],
        onTimeoutPhysiology: [{ target: 'nutrients.hydration', delta: 1.2 }, { target: 'nutrients.sodium', delta: -3 }, { target: 'allostatic.load', delta: 8 }],
    },
    {
        id: 'nocturnal-hypoglycemia',
        title: 'Hipoglicemia durante o sono',
        description: 'Durante o sono, o humano acordou confuso, sudorético e taquicárdico; a glicemia está caindo e há risco de neuroglicopenia.',
        explanation: 'Se estiver consciente, ofereça glicose de absorção rápida; se não puder engolir, use dextrose IV ou glucagon e proteja a via aérea. Insulina agravaria o quadro.',
        contextSummary: 'Sono interrompido · glicose em queda · contrarregulação necessária',
        context: { exercise: 1, nutrition: 8, stress: 68, sleep: 18, temperature: 21 },
        category: 'molecule', severity: 'critical', durationSeconds: 24, cooldownSeconds: 260, difficulty: 'easy',
        metricKeys: ['bloodGlucose', 'cellularAtp', 'heartRate', 'bloodLactate', 'arterialPH'],
        priorityMetricKeys: ['bloodGlucose', 'cellularAtp', 'heartRate', 'bloodLactate', 'arterialPH'],
        choices: [
            {
                id: 'hypoglycemia-counterregulate', label: 'Tratar com glicose rápida ou glucagon conforme consciência',
                description: 'Repõe glicose quando a deglutição é segura ou mobiliza glicogênio enquanto a via aérea é protegida.',
                tradeoff: 'Eleva carga adrenérgica ou cetogênica conforme o sinal escolhido.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .1 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon', 'hormone:release-adrenaline'], label: 'Liberar glucagon ou adrenalina' }],
                result: 'A contrarregulação recuperou a oferta de glicose antes de ocorrer falência neuroglicopênica.',
                cellularEffects: [{ target: 'available.glucose', delta: 1.4 }, { target: 'cell.atp', delta: .35 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 14 }, { target: 'energy.deficit', delta: -5 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'hypoglycemia-insulin', label: 'Aplicar insulina para “normalizar” a glicemia',
                description: 'Retira ainda mais glicose da circulação durante uma oferta cerebral já insuficiente.',
                tradeoff: 'Favorece armazenamento, mas agrava a neuroglicopenia.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                result: 'A insulina aprofundou a hipoglicemia e elevou o déficit energético sistêmico.',
                cellularEffects: [{ target: 'available.glucose', delta: -1.2 }, { target: 'cell.atp', delta: -.4 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -14 }, { target: 'energy.deficit', delta: 9 }, { target: 'allostatic.load', delta: 9 }],
            },
        ],
        isEligible: eligibleWhen(.76, 'o intervalo alimentar durante o sono esgotou parte da oferta rápida de glicose',
            (_state, macro) => macro.nutrients.hoursSinceMeal >= 4 && macro.nutrients.bloodGlucose > 80),
        onStart: [{ target: 'available.glucose', delta: -1 }, { target: 'cell.atp', delta: -.2 }],
        onStartPhysiology: [{ target: 'nutrients.glucose', delta: -12 }, { target: 'nutrients.hoursSinceMeal', value: 9 }, { target: 'energy.deficit', delta: 4 }],
        onTimeout: [{ target: 'available.glucose', delta: -1.2 }, { target: 'cell.atp', delta: -.5 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: -16 }, { target: 'energy.deficit', delta: 10 }, { target: 'allostatic.load', delta: 10 }],
    },
    {
        id: 'mitochondrial-uncoupling',
        title: 'Termogênico adulterado: calor sem energia',
        description: 'Depois de tomar um termogênico sem procedência, o humano ficou muito quente e com o coração acelerado. O corpo gasta mais O₂, mas a “bateria” celular, o ATP, continua descarregando.',
        explanation: 'O conjunto sugere desacoplamento: a mitocôndria queima combustível, mas parte da energia escapa como calor em vez de virar ATP. Suspenda o produto, resfrie, reduza a demanda e dê suporte; mais estimulante alimenta o problema.',
        investigationPrompt: 'Temperatura e consumo de O₂ sobem, mas o ATP cai. Qual falha transforma combustível em calor sem recarregar a célula, e quais condutas reduziriam a demanda em vez de alimentar essa fornalha?',
        contextSummary: 'Exposição tóxica · hipertermia · SpO₂ preservada · ATP em queda apesar do alto consumo de O₂',
        context: { exercise: 12, nutrition: 78, stress: 62, sleep: 66, temperature: 28 },
        category: 'cell', severity: 'critical', durationSeconds: 34, cooldownSeconds: 320, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['spo2', 'temperature', 'adrenaline', 't3', 'mtorActivity', 'cellularAtp', 'cellularAdp', 'nadh', 'mitochondrialPotential', 'etcFlux', 'atpSynthaseFlux', 'mitochondrialOxygenConsumption', 'mitochondrialHealth', 'ros', 'antioxidants'],
        choices: [
            {
                id: 'uncoupling-conserve-gradient', label: 'Suspender o agente, resfriar e iniciar suporte monitorizado',
                description: 'Interrompe o termogênico, reduz atividade autonômica, resfria e sustenta o organismo durante a depuração.',
                tradeoff: 'A queda de ATP pode persistir; temperatura, consciência, eletrólitos, ritmo e função orgânica precisam de vigilância.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .18 }, { resource: 'antioxidants', minimum: 42, cost: 12 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir demanda autonômica' }],
                result: 'A redução de demanda limitou calor e ROS; ΔΨ, ATP sintase e balanço ATP/ADP iniciaram recuperação.',
                cellularEffects: [{ target: 'mitochondria.membranePotential', delta: -24 }, { target: 'mitochondria.etcFlux', delta: -22 }, { target: 'mitochondria.atpSynthase', delta: 20 }, { target: 'mitochondria.oxygenConsumption', delta: -3.5 }, { target: 'cell.atp', delta: .75 }, { target: 'cell.nadh', delta: 8 }, { target: 'damage.oxidative', delta: -16 }, { target: 'mitochondria.health', delta: 5 }],
                physiologyEffects: [{ target: 'body.temperature', delta: -.55 }, { target: 'energy.deficit', delta: -8 }, { target: 'allostatic.load', delta: -5 }],
            },
            {
                id: 'uncoupling-maximize-oxygen', label: 'Dar estimulante e forçar hiperventilação',
                description: 'Tenta corrigir a queda de energia aumentando catecolamina, oferta de combustível e fluxo respiratório.',
                tradeoff: 'A oferta não é o gargalo; mais fluxo alimenta calor e estresse oxidativo sem restaurar acoplamento.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Ampliar ventilação' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'A oferta adicional alimentou uma cadeia já desacoplada; consumo de O₂, calor, ROS e dano de membrana aceleraram sem ganho proporcional de ATP.',
                cellularEffects: [{ target: 'mitochondria.etcFlux', delta: 24 }, { target: 'mitochondria.oxygenConsumption', delta: 5 }, { target: 'mitochondria.membranePotential', delta: 18 }, { target: 'cell.atp', delta: -.65 }, { target: 'damage.oxidative', delta: 19 }, { target: 'damage.membrane', delta: 8 }, { target: 'mitochondria.health', delta: -9 }],
                physiologyEffects: [{ target: 'body.temperature', delta: .9 }, { target: 'energy.deficit', delta: 11 }, { target: 'cardiovascular.heartRate', delta: 18 }, { target: 'allostatic.load', delta: 11 }],
            },
            {
                id: 'uncoupling-build-machinery', label: 'Administrar GH e aminoácidos para “reconstruir”',
                description: 'Prioriza anabolismo enquanto hipertermia, instabilidade iônica e toxicidade permanecem ativas.',
                tradeoff: 'Consome ATP antes de estabilizar temperatura, circulação e função mitocondrial.',
                requirements: [{ resource: 'aminoAcid', minimum: .3, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:boost-mtor', 'hormone:release-gh'], label: 'Ativar mTOR ou eixo GH' }],
                result: 'A síntese precoce desviou ATP do controle iônico; Ca²⁺, dano proteico e compromisso apoptótico aumentaram durante o desacoplamento.',
                cellularEffects: [{ target: 'cell.atp', delta: -.85 }, { target: 'cell.calcium', delta: 120 }, { target: 'damage.proteins', delta: 10 }, { target: 'damage.oxidative', delta: 9 }, { target: 'fate.apoptoticCommitment', delta: 12 }],
                physiologyEffects: [{ target: 'energy.deficit', delta: 9 }, { target: 'allostatic.load', delta: 8 }],
            },
        ],
        isEligible: eligibleWhen(1.05, 'um desacoplador elevou a condutância de prótons da membrana mitocondrial interna',
            (state, macro) => state.cell.viabilityPercent > 62 && macro.bodyTemperature < 38.8),
        onStart: [{ target: 'mitochondria.membranePotential', delta: 34 }, { target: 'mitochondria.etcFlux', delta: 42 }, { target: 'mitochondria.atpSynthase', delta: -10 }, { target: 'mitochondria.oxygenConsumption', delta: 6 }, { target: 'mitochondria.health', delta: -7 }, { target: 'cell.atp', delta: -1.05 }, { target: 'cell.nadh', delta: -16 }, { target: 'damage.oxidative', delta: 15 }, { target: 'damage.antioxidants', delta: -14 }, { target: 'processing.oxygen', delta: 4 }, { target: 'processing.protons', delta: 7 }, { target: 'processing.atp', delta: -1 }],
        onStartPhysiology: [{ target: 'body.temperature', delta: .65 }, { target: 'energy.deficit', delta: 7 }, { target: 'cardiovascular.heartRate', delta: 12 }, { target: 'respiratory.rate', delta: 3 }, { target: 'allostatic.load', delta: 7 }],
        onTimeout: [{ target: 'cell.atp', delta: -1.1 }, { target: 'cell.calcium', delta: 180 }, { target: 'damage.oxidative', delta: 20 }, { target: 'damage.membrane', delta: 8 }, { target: 'mitochondria.health', delta: -12 }, { target: 'fate.apoptoticCommitment', delta: 15 }],
        onTimeoutPhysiology: [{ target: 'body.temperature', delta: 1.1 }, { target: 'energy.deficit', delta: 13 }, { target: 'allostatic.load', delta: 12 }],
    },
    {
        id: 'mixed-ketoacidotic-fatigue',
        title: 'Diabetes descompensado e respiração cansando',
        description: 'A glicose e as cetonas dispararam, o sangue ficou ácido e o corpo tentou compensar respirando fundo e rápido. Agora a respiração continua acelerada, mas já não elimina CO₂ como deveria: os músculos estão cansando.',
        explanation: 'É uma cetoacidose com compensação respiratória falhando. Reponha volume, acompanhe o potássio e use insulina quando for seguro, sem desligar a respiração que ainda segura o pH. Sedar cedo demais pode fazer a acidez piorar de repente.',
        investigationPrompt: 'Cruze glicose, cetonas, pH, bicarbonato, CO₂, hidratação e potássio. A respiração rápida ainda ajuda ou já falha? Decida o que precisa vir antes e o que não pode ser retirado cedo demais.',
        contextSummary: 'Hiperglicemia · cetose · desidratação · K⁺ dinâmico · respiração compensatória fatigando',
        context: { exercise: 4, nutrition: 18, stress: 82, sleep: 32, temperature: 24 },
        category: 'organ', severity: 'critical', durationSeconds: 32, cooldownSeconds: 340, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'ketones', 'insulin', 'cortisol', 'arterialPH', 'bicarbonate', 'baseExcess', 'anionGap', 'paco2', 'respiratoryRate', 'plasmaPotassium', 'hydration', 'gfr', 'cellularAtp', 'cellPH'],
        choices: [
            {
                id: 'ketoacidosis-dual-control', label: 'Repor volume, checar K⁺, iniciar insulina e sustentar ventilação',
                description: 'Trata desidratação e cetogênese sem retirar precocemente a compensação respiratória.',
                tradeoff: 'Insulina desloca K⁺ para a célula; potássio e capacidade ventilatória precisam ser reavaliados em série.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Sustentar quimiorreflexo ventilatório' }],
                result: 'A produção de cetonas recuou sem perder a compensação; pH, bicarbonato, PaCO₂ e potássio convergiram gradualmente.',
                cellularEffects: [{ target: 'cell.pH', delta: .11 }, { target: 'cell.potassium', delta: 3 }, { target: 'cell.atp', delta: .55 }, { target: 'tissue.pH', delta: .09 }, { target: 'tissue.lactate', delta: -.8 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -48 }, { target: 'nutrients.ketones', delta: -2.2 }, { target: 'nutrients.potassium', delta: -.7 }, { target: 'respiratory.paco2', delta: -8 }, { target: 'acidBase.pH', delta: .11 }, { target: 'acidBase.bicarbonate', delta: 5 }, { target: 'acidBase.baseExcess', delta: 6 }, { target: 'acidBase.anionGap', delta: -8 }, { target: 'energy.deficit', delta: -7 }],
            },
            {
                id: 'ketoacidosis-metabolic-only', label: 'Aplicar insulina e sedar para reduzir a respiração',
                description: 'Interrompe parte da cetogênese, mas retira a hiperventilação que ainda compensa a acidose.',
                tradeoff: 'Sem controle de via aérea e ventilação, a PaCO₂ sobe mais rápido que a correção metabólica.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir demanda autonômica' }],
                result: 'A cetogênese diminuiu, mas a fadiga ventilatória reteve CO₂; a acidose tornou-se mista e o ATP celular continuou caindo.',
                cellularEffects: [{ target: 'cell.atp', delta: -.55 }, { target: 'cell.pH', delta: -.06 }, { target: 'tissue.carbonDioxide', delta: 9 }, { target: 'damage.oxidative', delta: 7 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -30 }, { target: 'nutrients.ketones', delta: -1 }, { target: 'respiratory.paco2', delta: 12 }, { target: 'acidBase.pH', delta: -.07 }, { target: 'acidBase.bicarbonate', delta: -3 }, { target: 'energy.deficit', delta: 8 }],
            },
            {
                id: 'ketoacidosis-stress-support', label: 'Usar corticoide e ventilação sem insulina ou fluidos',
                description: 'Mantém tônus e frequência respiratória, mas não corrige hipovolemia nem interrompe a formação de cetonas.',
                tradeoff: 'Cortisol aumenta glicose e favorece manutenção do estado catabólico.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Sustentar quimiorreflexo ventilatório' }],
                result: 'A ventilação removeu parte do CO₂, porém cortisol e ausência de insulina mantiveram hiperglicemia, cetonas, osmolaridade e perda renal de água.',
                cellularEffects: [{ target: 'cell.volume', delta: -5 }, { target: 'cell.osmolarity', delta: 9 }, { target: 'damage.oxidative', delta: 10 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 34 }, { target: 'nutrients.ketones', delta: 1.2 }, { target: 'nutrients.hydration', delta: -1.2 }, { target: 'acidBase.anionGap', delta: 5 }, { target: 'renal.gfr', delta: -10 }, { target: 'allostatic.load', delta: 10 }],
            },
        ],
        isEligible: eligibleWhen(1, 'deficiência relativa de insulina iniciou cetogênese e a compensação ventilatória começou a falhar',
            (state, macro) => state.cell.viabilityPercent > 58 && macro.nutrients.bloodGlucose < 210),
        onStart: [{ target: 'tissue.glucose', delta: 4 }, { target: 'tissue.lactate', delta: 1 }, { target: 'tissue.pH', delta: -.12 }, { target: 'tissue.osmolarity', delta: 20 }, { target: 'cell.pH', delta: -.13 }, { target: 'cell.osmolarity', delta: 18 }, { target: 'cell.volume', delta: -6 }, { target: 'cell.atp', delta: -.85 }, { target: 'cell.nadh', delta: 12 }, { target: 'damage.oxidative', delta: 11 }],
        onStartPhysiology: [{ target: 'nutrients.glucose', delta: 105 }, { target: 'nutrients.ketones', delta: 3.1 }, { target: 'nutrients.potassium', delta: 1.1 }, { target: 'nutrients.hydration', delta: -3 }, { target: 'respiratory.rate', delta: 9 }, { target: 'respiratory.paco2', delta: 4 }, { target: 'respiratory.pao2', delta: -5 }, { target: 'acidBase.pH', delta: -.17 }, { target: 'acidBase.bicarbonate', delta: -10 }, { target: 'acidBase.baseExcess', delta: -12 }, { target: 'acidBase.anionGap', delta: 14 }, { target: 'renal.gfr', delta: -20 }, { target: 'energy.deficit', delta: 10 }],
        onTimeout: [{ target: 'cell.atp', delta: -1 }, { target: 'cell.pH', delta: -.1 }, { target: 'cell.calcium', delta: 140 }, { target: 'damage.membrane', delta: 8 }, { target: 'fate.apoptoticCommitment', delta: 12 }],
        onTimeoutPhysiology: [{ target: 'respiratory.paco2', delta: 12 }, { target: 'acidBase.pH', delta: -.12 }, { target: 'acidBase.bicarbonate', delta: -5 }, { target: 'nutrients.hydration', delta: -1.5 }, { target: 'energy.deficit', delta: 12 }, { target: 'allostatic.load', delta: 12 }],
    },
    {
        id: 'distributive-dysoxia',
        title: 'Infecção com pressão despencando',
        description: 'O oxímetro ainda exibe um número bonito, mas a pressão média, a circulação nos tecidos e o ATP estão caindo. Ao mesmo tempo, lactato e inflamação sobem: há oxigênio no sangue, porém ele não chega nem é usado direito.',
        explanation: 'Isso é compatível com sepse e choque distributivo. Uma SpO₂ normal não garante boa perfusão. Trate o foco e a infecção, reponha volume com reavaliação e use norepinefrina se a pressão continuar insuficiente.',
        investigationPrompt: 'Se a SpO₂ parece boa, por que pressão, perfusão, ATP e função mitocondrial pioram enquanto o lactato sobe? Identifique o número tranquilizador que está escondendo o choque e escolha uma intervenção que trate a causa.',
        contextSummary: 'Infecção · vasoplegia · PAM baixa · lactato alto apesar de SpO₂ preservada',
        context: { exercise: 2, nutrition: 58, stress: 92, sleep: 24, temperature: 29 },
        category: 'organ', severity: 'critical', durationSeconds: 34, cooldownSeconds: 360, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['systolicBP', 'diastolicBP', 'meanArterialPressure', 'cardiacOutput', 'perfusionIndex', 'spo2', 'pao2', 'cortisol', 'adrenaline', 'bloodLactate', 'inflammation', 'infection', 'tissuePerfusion', 'tissueOxygen', 'cellularAtp', 'ros', 'mitochondrialHealth'],
        choices: [
            {
                id: 'dysoxia-restore-tone', label: 'Controlar foco, repor volume e titular norepinefrina',
                description: 'Combina antimicrobiano/controle da fonte com ressuscitação guiada e vasopressor quando a PAM não responde.',
                tradeoff: 'Volume excessivo aumenta edema; norepinefrina exige titulação pela perfusão, PAM e resposta miocárdica.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .18 }, { resource: 'antioxidants', minimum: 38, cost: 10 }],
                signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar suporte simpático central' }],
                result: 'PAM e perfusão tecidual se recuperaram; lactato caiu e a mitocôndria voltou a converter oferta em ATP sem perder a contenção imune.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: 24 }, { target: 'tissue.oxygen', delta: 9 }, { target: 'tissue.lactate', delta: -1.8 }, { target: 'cell.atp', delta: .8 }, { target: 'damage.oxidative', delta: -11 }, { target: 'mitochondria.health', delta: 5 }, { target: 'mitochondria.atpSynthase', delta: 12 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 16 }, { target: 'cardiovascular.systolic', delta: 18 }, { target: 'cardiovascular.diastolic', delta: 11 }, { target: 'cardiovascular.perfusion', delta: 20 }, { target: 'energy.lactate', delta: -2.1 }, { target: 'allostatic.load', delta: -4 }],
            },
            {
                id: 'dysoxia-ventilate', label: 'Oferecer apenas oxigênio e adrenalina',
                description: 'Melhora números respiratórios e frequência sem tratar foco, volume efetivo ou vasoplegia.',
                tradeoff: 'A SpO₂ pode ficar excelente enquanto perfusão microcirculatória, lactato e função orgânica pioram.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Ampliar ventilação' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'SpO₂ e débito subiram, mas o shunt microcirculatório persistiu; demanda, lactato, ROS e lesão mitocondrial aumentaram.',
                cellularEffects: [{ target: 'tissue.oxygen', delta: -5 }, { target: 'tissue.lactate', delta: 2.2 }, { target: 'cell.atp', delta: -.6 }, { target: 'damage.oxidative', delta: 15 }, { target: 'mitochondria.health', delta: -8 }],
                physiologyEffects: [{ target: 'respiratory.spo2', delta: 1 }, { target: 'respiratory.pao2', delta: 5 }, { target: 'cardiovascular.cardiacOutput', delta: 1.4 }, { target: 'cardiovascular.heartRate', delta: 20 }, { target: 'energy.lactate', delta: 2.5 }, { target: 'energy.deficit', delta: 9 }],
            },
            {
                id: 'dysoxia-suppress-inflammation', label: 'Usar corticoide isolado antes do controle do foco',
                description: 'Tenta reduzir inflamação e vasoplegia sem antimicrobiano, drenagem ou ressuscitação adequada.',
                tradeoff: 'Pode mascarar sinais e reduzir a contenção imune enquanto a infecção continua ativa.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }],
                result: 'A inflamação caiu transitoriamente, porém a carga infecciosa, o leak capilar e a disfunção mitocondrial progrediram; a perfusão voltou a deteriorar.',
                cellularEffects: [{ target: 'fate.infectionSusceptibility', delta: 18 }, { target: 'damage.oxidative', delta: 9 }, { target: 'mitochondria.health', delta: -7 }, { target: 'cell.viability', delta: -5 }],
                physiologyEffects: [{ target: 'allostatic.inflammation', delta: -7 }, { target: 'pathophysiology.infection', delta: 15 }, { target: 'pathophysiology.capillaryLeak', delta: .12 }, { target: 'cardiovascular.perfusion', delta: -12 }, { target: 'energy.lactate', delta: 1.8 }, { target: 'allostatic.load', delta: 10 }],
            },
        ],
        isEligible: eligibleWhen(.98, 'um foco infeccioso precipitou vasoplegia e heterogeneidade microcirculatória',
            (state, macro) => state.cell.viabilityPercent > 60 && macro.pathophysiology.infectionSeverity < 45),
        onStart: [{ target: 'tissue.perfusion', delta: -34 }, { target: 'tissue.oxygen', delta: -9 }, { target: 'tissue.carbonDioxide', delta: 8 }, { target: 'tissue.lactate', delta: 2.4 }, { target: 'tissue.waste', delta: 18 }, { target: 'cell.atp', delta: -.8 }, { target: 'damage.oxidative', delta: 16 }, { target: 'mitochondria.etcFlux', delta: -10 }, { target: 'mitochondria.atpSynthase', delta: -13 }, { target: 'mitochondria.health', delta: -9 }],
        onStartPhysiology: [{ target: 'pathophysiology.infection', delta: 24 }, { target: 'pathophysiology.capillaryLeak', delta: .14 }, { target: 'allostatic.inflammation', delta: 26 }, { target: 'cardiovascular.heartRate', delta: 25 }, { target: 'cardiovascular.hrv', delta: -24 }, { target: 'cardiovascular.systolic', delta: -26 }, { target: 'cardiovascular.diastolic', delta: -20 }, { target: 'cardiovascular.map', delta: -22 }, { target: 'cardiovascular.cardiacOutput', delta: 1.3 }, { target: 'cardiovascular.svr', delta: -420 }, { target: 'cardiovascular.perfusion', delta: -31 }, { target: 'energy.lactate', delta: 3 }, { target: 'body.temperature', delta: .8 }],
        onTimeout: [{ target: 'cell.atp', delta: -.9 }, { target: 'damage.oxidative', delta: 18 }, { target: 'mitochondria.health', delta: -12 }, { target: 'fate.apoptoticCommitment', delta: 12 }],
        onTimeoutPhysiology: [{ target: 'cardiovascular.map', delta: -15 }, { target: 'cardiovascular.perfusion', delta: -18 }, { target: 'pathophysiology.infection', delta: 12 }, { target: 'pathophysiology.capillaryLeak', delta: .1 }, { target: 'energy.lactate', delta: 3 }, { target: 'allostatic.load', delta: 13 }],
    },
    {
        id: 'reperfusion-paradox',
        title: 'O sangue voltou ao membro esmagado — e trouxe outro risco',
        description: 'O membro passou muito tempo quase sem circulação. Quando o sangue volta, potássio, ácidos e moléculas oxidantes acumuladas no tecido podem alcançar o restante do corpo e ameaçar o ritmo do coração.',
        explanation: 'Reperfusão salva tecido, mas precisa de preparo. Garanta monitorização cardíaca, volume e prontidão para corrigir eletrólitos antes e durante o retorno do fluxo. Abrir tudo de uma vez e somar adrenalina pode espalhar a instabilidade.',
        investigationPrompt: 'O retorno do fluxo é necessário, mas o que pode sair do membro isquêmico e alcançar o coração? Compare potássio, cálcio, pH, ROS, membrana e ritmo antes de decidir como preparar a reperfusão.',
        contextSummary: 'Trauma por esmagamento · reperfusão · risco de hipercalemia, arritmia e lesão oxidativa',
        context: { exercise: 35, nutrition: 72, stress: 88, sleep: 52, temperature: 23 },
        category: 'cell', severity: 'critical', durationSeconds: 30, cooldownSeconds: 340, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['tissuePerfusion', 'tissueOxygen', 'adrenaline', 'mtorActivity', 'cellCalcium', 'cellMembranePotential', 'cellularAtp', 'nadh', 'mitochondrialPotential', 'etcFlux', 'atpSynthaseFlux', 'mitochondrialOxygenConsumption', 'ros', 'antioxidants', 'membraneDamage', 'proteinDamage', 'dnaDamage', 'apoptoticCommitment'],
        choices: [
            {
                id: 'reperfusion-paced-redox', label: 'Preparar volume, ECG e eletrólitos antes da reperfusão',
                description: 'Reperfunde sob monitorização, com suporte de volume e prontidão para tratar instabilidade por K⁺ e Ca²⁺.',
                tradeoff: 'A recuperação do membro é mais controlada, mas reduz o risco sistêmico de arritmia e colapso metabólico.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .2 }, { resource: 'antioxidants', minimum: 35, cost: 14 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Modular demanda autonômica' }],
                result: 'O pico de ROS foi amortecido; Ca²⁺, NADH e ΔΨ normalizaram sem perder a perfusão restaurada, reduzindo dano e compromisso apoptótico.',
                cellularEffects: [{ target: 'cell.calcium', delta: -210 }, { target: 'cell.nadh', delta: -20 }, { target: 'cell.membranePotential', delta: -10 }, { target: 'mitochondria.membranePotential', delta: 20 }, { target: 'mitochondria.etcFlux', delta: -22 }, { target: 'mitochondria.atpSynthase', delta: 18 }, { target: 'damage.oxidative', delta: -24 }, { target: 'damage.membrane', delta: -7 }, { target: 'damage.proteins', delta: -6 }, { target: 'damage.dna', delta: -4 }, { target: 'fate.apoptoticCommitment', delta: -8 }],
                physiologyEffects: [{ target: 'energy.deficit', delta: -6 }, { target: 'allostatic.load', delta: -5 }],
            },
            {
                id: 'reperfusion-max-flow', label: 'Liberar o fluxo de uma vez e usar adrenalina',
                description: 'Restaura perfusão abruptamente sem preparo eletrolítico e aumenta catecolaminas diante da instabilidade.',
                tradeoff: 'Pode elevar a oferta local, mas amplia pico de ROS, sobrecarga de Ca²⁺ e risco arrítmico sistêmico.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Ampliar ventilação' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'A cadeia hiper-reduzida recebeu mais fluxo; ROS, Ca²⁺, dano de DNA e compromisso apoptótico superaram o pequeno ganho transitório de ATP.',
                cellularEffects: [{ target: 'cell.atp', delta: .2 }, { target: 'cell.calcium', delta: 180 }, { target: 'mitochondria.etcFlux', delta: 24 }, { target: 'mitochondria.oxygenConsumption', delta: 4 }, { target: 'damage.oxidative', delta: 22 }, { target: 'damage.dna', delta: 9 }, { target: 'fate.apoptoticCommitment', delta: 16 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 18 }, { target: 'energy.deficit', delta: 8 }, { target: 'allostatic.load', delta: 11 }],
            },
            {
                id: 'reperfusion-early-repair', label: 'Priorizar anabolismo antes de estabilizar eletrólitos',
                description: 'Ativa mTOR e oferta aminoácidos enquanto bombas iônicas e defesa antioxidante ainda estão sobrecarregadas.',
                tradeoff: 'Desvia ATP do controle de Ca²⁺ e membrana durante a janela crítica de reperfusão.',
                requirements: [{ resource: 'aminoAcid', minimum: .3, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:boost-mtor'], label: 'Ativar via mTOR' }],
                result: 'O reparo anabólico precoce consumiu ATP das bombas iônicas; Ca²⁺, dano de membrana e necrose secundária avançaram apesar do substrato disponível.',
                cellularEffects: [{ target: 'cell.atp', delta: -.9 }, { target: 'cell.calcium', delta: 160 }, { target: 'damage.membrane', delta: 10 }, { target: 'damage.proteins', delta: 7 }, { target: 'cell.viability', delta: -7 }, { target: 'fate.apoptoticCommitment', delta: 10 }],
                physiologyEffects: [{ target: 'energy.deficit', delta: 10 }, { target: 'allostatic.load', delta: 8 }],
            },
        ],
        isEligible: eligibleWhen(.92, 'a reperfusão de um território transitoriamente isquêmico restaurou O₂ sobre uma matriz altamente reduzida',
            (state, macro) => state.cell.viabilityPercent > 64 && macro.cardiovascular.perfusionIndex > 65),
        onStart: [{ target: 'tissue.perfusion', delta: -4 }, { target: 'tissue.oxygen', delta: 18 }, { target: 'cell.calcium', delta: 260 }, { target: 'cell.nadh', delta: 28 }, { target: 'cell.membranePotential', delta: 13 }, { target: 'cell.atp', delta: -.65 }, { target: 'mitochondria.membranePotential', delta: -24 }, { target: 'mitochondria.etcFlux', delta: 46 }, { target: 'mitochondria.atpSynthase', delta: -5 }, { target: 'mitochondria.oxygenConsumption', delta: 6 }, { target: 'mitochondria.health', delta: -8 }, { target: 'processing.pyruvate', delta: 2 }, { target: 'processing.nadh', delta: 5 }, { target: 'processing.fadh2', delta: 2 }, { target: 'processing.oxygen', delta: 6 }, { target: 'processing.protons', delta: 8 }, { target: 'processing.adp', delta: 1 }, { target: 'processing.atp', delta: .3 }, { target: 'processing.water', delta: 4 }, { target: 'damage.oxidative', delta: 32 }, { target: 'damage.antioxidants', delta: -28 }, { target: 'damage.membrane', delta: 7 }, { target: 'damage.proteins', delta: 6 }, { target: 'damage.dna', delta: 4 }, { target: 'fate.apoptoticCommitment', delta: 9 }],
        onStartPhysiology: [{ target: 'cardiovascular.perfusion', delta: 8 }, { target: 'respiratory.pao2', delta: 4 }, { target: 'energy.lactate', delta: 1 }, { target: 'allostatic.oxidative', delta: 22 }, { target: 'allostatic.load', delta: 8 }],
        onTimeout: [{ target: 'cell.atp', delta: -.9 }, { target: 'cell.calcium', delta: 180 }, { target: 'damage.oxidative', delta: 20 }, { target: 'damage.dna', delta: 9 }, { target: 'mitochondria.health', delta: -12 }, { target: 'fate.apoptoticCommitment', delta: 18 }],
        onTimeoutPhysiology: [{ target: 'energy.deficit', delta: 11 }, { target: 'energy.lactate', delta: 2 }, { target: 'allostatic.load', delta: 12 }],
    },
    {
        id: 'hyperosmolar-renal-conflict',
        title: 'Glicose muito alta e o corpo ficando sem água',
        description: 'O humano passou horas urinando, adiando o copo d’água para “depois do próximo e-mail”. Agora está confuso e muito desidratado; a glicose concentra o sangue, enquanto os rins começam a perder capacidade de filtrar.',
        explanation: 'O quadro lembra um estado hiperosmolar. Primeiro recupere o volume com solução isotônica e acompanhe sódio, potássio, urina e consciência. A insulina entra depois da reposição inicial; baixar a glicose sem devolver água pode piorar a circulação.',
        investigationPrompt: 'Glicose, osmolaridade e perda urinária de água subiram enquanto perfusão e filtração renal caíram. Qual correção recupera a circulação primeiro, e por que o potássio precisa ser revisto antes de acelerar a insulina?',
        contextSummary: 'Hiperglicemia intensa · hipovolemia · alteração neurológica · K⁺ corporal depletado',
        context: { exercise: 3, nutrition: 20, stress: 78, sleep: 38, temperature: 26 },
        category: 'molecule', severity: 'critical', durationSeconds: 32, cooldownSeconds: 360, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'insulin', 'glucagon', 'hydration', 'plasmaSodium', 'plasmaPotassium', 'gfr', 'adhActivity', 'tissueOsmolarity', 'cellOsmolarity', 'cellVolume', 'cellSodium', 'cellPotassium', 'cellMembranePotential', 'cellularAtp'],
        choices: [
            {
                id: 'hyperosmolar-source-volume', label: 'Repor solução isotônica, avaliar K⁺ e então iniciar insulina',
                description: 'Recupera perfusão antes de reduzir glicose, acompanhando sódio corrigido, diurese e redistribuição do potássio.',
                tradeoff: 'A insulina pode revelar hipocalemia; velocidade de fluidos e eletrólitos deve seguir coração, rim e osmolaridade.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:adh-retention'], label: 'Ativar conservação renal de água' }],
                result: 'Glicose e osmolaridade recuaram, o volume foi preservado e o deslocamento de K⁺ ocorreu com recuperação do potencial de membrana e da filtração.',
                cellularEffects: [{ target: 'cell.osmolarity', delta: -13 }, { target: 'cell.volume', delta: 7 }, { target: 'cell.sodium', delta: -4 }, { target: 'cell.potassium', delta: 8 }, { target: 'cell.membranePotential', delta: -10 }, { target: 'cell.atp', delta: .5 }, { target: 'tissue.osmolarity', delta: -14 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -62 }, { target: 'nutrients.hydration', delta: 1.8 }, { target: 'nutrients.sodium', delta: -3.5 }, { target: 'nutrients.potassium', delta: -.8 }, { target: 'renal.gfr', delta: 18 }, { target: 'renal.adh', delta: 12 }, { target: 'energy.deficit', delta: -6 }],
            },
            {
                id: 'hyperosmolar-insulin-diuresis', label: 'Aplicar insulina em bolus antes de repor volume',
                description: 'Derruba glicose e favorece saída de água enquanto o volume circulante e a função renal continuam reduzidos.',
                tradeoff: 'Pode causar queda abrupta de osmolaridade, hipocalemia e piora de perfusão.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:suppress-adh'], label: 'Suprimir ADH' }],
                result: 'A glicose caiu, mas a perda adicional de água reduziu perfusão e GFR; o deslocamento de K⁺ aprofundou a depleção intracelular e a instabilidade elétrica.',
                cellularEffects: [{ target: 'cell.potassium', delta: -7 }, { target: 'cell.membranePotential', delta: 15 }, { target: 'cell.atp', delta: -.65 }, { target: 'cell.volume', delta: -5 }, { target: 'damage.membrane', delta: 7 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -48 }, { target: 'nutrients.hydration', delta: -1.6 }, { target: 'cardiovascular.map', delta: -12 }, { target: 'cardiovascular.perfusion', delta: -15 }, { target: 'renal.gfr', delta: -16 }, { target: 'energy.deficit', delta: 9 }],
            },
            {
                id: 'hyperosmolar-volume-only', label: 'Expandir volume e adiar insulina até normalizar a perfusão',
                description: 'Prioriza uma reposição isotônica cautelosa, mas posterga demais a correção da hiperglicemia e da diurese osmótica.',
                tradeoff: 'A perfusão pode melhorar primeiro, porém o gradiente osmótico continua retirando água enquanto a glicose permanece alta.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Conservar água durante a expansão inicial' }],
                result: 'O volume e a filtração melhoraram parcialmente, mas a hiperglicemia sustentou diurese osmótica e impediu recuperação completa.',
                cellularEffects: [{ target: 'cell.osmolarity', delta: -3 }, { target: 'cell.volume', delta: 3 }, { target: 'damage.oxidative', delta: 4 }, { target: 'cell.atp', delta: .1 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 15 }, { target: 'nutrients.sodium', delta: 1 }, { target: 'nutrients.hydration', delta: 1.4 }, { target: 'cardiovascular.map', delta: 8 }, { target: 'cardiovascular.perfusion', delta: 8 }, { target: 'renal.gfr', delta: 5 }, { target: 'allostatic.load', delta: 4 }],
            },
        ],
        isEligible: eligibleWhen(.9, 'hiperglicemia sustentada ultrapassou a reabsorção tubular e iniciou diurese osmótica',
            (state, macro) => state.cell.viabilityPercent > 62 && macro.nutrients.bloodGlucose < 145 && macro.nutrients.hydration > 40),
        onStart: [{ target: 'tissue.glucose', delta: 4.5 }, { target: 'tissue.osmolarity', delta: 22 }, { target: 'tissue.sodium', delta: 5 }, { target: 'tissue.potassium', delta: 1.2 }, { target: 'cell.osmolarity', delta: 18 }, { target: 'cell.volume', delta: -8 }, { target: 'cell.sodium', delta: 6 }, { target: 'cell.potassium', delta: -9 }, { target: 'cell.membranePotential', delta: 14 }, { target: 'cell.calcium', delta: 80 }, { target: 'cell.atp', delta: -.7 }, { target: 'damage.oxidative', delta: 10 }],
        onStartPhysiology: [{ target: 'nutrients.glucose', delta: 92 }, { target: 'nutrients.hydration', delta: -3.5 }, { target: 'nutrients.sodium', delta: 6 }, { target: 'nutrients.potassium', delta: 1.2 }, { target: 'renal.gfr', delta: -24 }, { target: 'renal.adh', delta: 18 }, { target: 'cardiovascular.map', delta: -10 }, { target: 'cardiovascular.perfusion', delta: -13 }, { target: 'energy.deficit', delta: 8 }],
        onTimeout: [{ target: 'cell.volume', delta: -7 }, { target: 'cell.potassium', delta: -7 }, { target: 'cell.membranePotential', delta: 12 }, { target: 'cell.atp', delta: -.8 }, { target: 'damage.membrane', delta: 8 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: 35 }, { target: 'nutrients.hydration', delta: -1.8 }, { target: 'nutrients.sodium', delta: 3 }, { target: 'renal.gfr', delta: -16 }, { target: 'cardiovascular.map', delta: -12 }, { target: 'allostatic.load', delta: 12 }],
    },
    {
        id: 'whisky-party-hepatic-overload',
        title: 'Whisky em jejum: o fígado ficou sem plano B',
        description: 'Depois de alguns copos e pouca comida, a confiança no karaokê subiu, mas a glicose fez o caminho contrário. O humano está sonolento e enjoado; lactato aumenta e a respiração começa a perder segurança.',
        explanation: 'O fígado está ocupado processando álcool e sustenta pior a glicose. Verifique via aérea, respiração e circulação, meça a glicemia e trate a queda. Tiamina pode ser necessária em risco nutricional; café e energético não depuram álcool.',
        investigationPrompt: 'Relacione jejum, álcool, glicose, lactato, consciência e ventilação. A sonolência é apenas efeito da festa? Escolha uma conduta que proteja cérebro e via aérea sem confundir agitação com recuperação.',
        contextSummary: 'Intoxicação alcoólica · jejum · risco de broncoaspiração, hipoglicemia e depressão ventilatória',
        context: { exercise: 4, nutrition: 24, stress: 42, sleep: 35, temperature: 25 },
        category: 'organ', severity: 'critical', durationSeconds: 36, cooldownSeconds: 420, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'glucagon', 'insulin', 'bloodLactate', 'arterialPH', 'paco2', 'respiratoryRate', 'tissueGlucose', 'tissueLactate', 'cellularAtp', 'nadh', 'ros', 'antioxidants', 'mitochondrialPotential', 'etcFlux', 'atpSynthaseFlux', 'mitochondrialHealth'],
        choices: [
            {
                id: 'alcohol-preserve-glucose-redox', label: 'Proteger via aérea, checar glicose e dar tiamina/suporte',
                description: 'Posiciona lateralmente, monitora ventilação e usa glicose ou glucagon conforme o estado, com tiamina quando indicada.',
                tradeoff: 'Glucagon depende de glicogênio e não substitui dextrose no paciente grave; vigilância respiratória continua essencial.',
                requirements: [{ resource: 'antioxidants', minimum: 20, cost: 8 }, { resource: 'atp', minimum: 1.4, cost: .2 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir demanda autonômica' }, { anyOf: ['hormone:release-glucagon'], label: 'Mobilizar glicogênio hepático' }],
                result: 'A demanda caiu, a glicose foi sustentada pela reserva disponível e a contenção de ROS preservou fígado, cérebro e acoplamento mitocondrial.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1.2 }, { target: 'tissue.lactate', delta: -1.3 }, { target: 'cell.atp', delta: .55 }, { target: 'cell.nadh', delta: -18 }, { target: 'damage.oxidative', delta: -16 }, { target: 'damage.antioxidants', delta: 6 }, { target: 'mitochondria.health', delta: 5 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 18 }, { target: 'energy.lactate', delta: -1.2 }, { target: 'energy.deficit', delta: -7 }, { target: 'cardiovascular.heartRate', delta: -7 }, { target: 'allostatic.oxidative', delta: -13 }, { target: 'organs.liver.functionality', delta: 5 }, { target: 'organs.brain.functionality', delta: 3 }],
            },
            {
                id: 'alcohol-insulin-storage', label: 'Oferecer carboidrato oral e observar sem proteger a via aérea',
                description: 'Tenta corrigir a glicose, mas usa a via oral apesar da sonolência e não acompanha ventilação ou broncoaspiração.',
                tradeoff: 'A glicemia pode subir, mas a escolha da via cria risco imediato e não corrige depressão ventilatória nem pressão redox hepática.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Sustentar a oferta endógena de glicose' }],
                result: 'A glicose melhorou parcialmente, mas lactato, CO₂ e risco de broncoaspiração mantiveram cérebro e via aérea sob pressão.',
                cellularEffects: [{ target: 'tissue.glucose', delta: .7 }, { target: 'tissue.lactate', delta: .6 }, { target: 'cell.atp', delta: .1 }, { target: 'fate.infectionSusceptibility', delta: 6 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 10 }, { target: 'energy.lactate', delta: .8 }, { target: 'respiratory.paco2', delta: 4 }, { target: 'organs.brain.functionality', delta: -3 }, { target: 'allostatic.load', delta: 5 }],
            },
            {
                id: 'alcohol-adrenergic-mask', label: 'Dar energético e adrenalina para despertar',
                description: 'Aumenta alerta e frequência por pouco tempo sem proteger via aérea, corrigir glicose ou depurar etanol.',
                tradeoff: 'Eleva consumo de O₂ e glicose sem corrigir o bloqueio redox hepático.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Aumentar ventilação' }],
                result: 'O alerta transitório cobrou mais ATP, acelerou lactato e ROS e ocultou a piora metabólica até a reserva cerebral diminuir.',
                cellularEffects: [{ target: 'cell.atp', delta: -.65 }, { target: 'cell.nadh', delta: 10 }, { target: 'damage.oxidative', delta: 15 }, { target: 'mitochondria.oxygenConsumption', delta: 3 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 20 }, { target: 'respiratory.rate', delta: 5 }, { target: 'energy.deficit', delta: 9 }, { target: 'energy.lactate', delta: 1.5 }, { target: 'allostatic.load', delta: 11 }],
            },
        ],
        isEligible: eligibleWhen(1.05, 'a ingestão de álcool em jejum deslocou o balanço redox hepático e reduziu a sustentação da glicemia', (state, macro) => state.cell.viabilityPercent > 68 && macro.nutrients.bloodGlucose > 72),
        onStart: [{ target: 'tissue.glucose', delta: -1.1 }, { target: 'tissue.lactate', delta: 1.5 }, { target: 'tissue.pH', delta: -.045 }, { target: 'cell.atp', delta: -.55 }, { target: 'cell.nadh', delta: 25 }, { target: 'mitochondria.etcFlux', delta: -8 }, { target: 'mitochondria.atpSynthase', delta: -10 }, { target: 'mitochondria.health', delta: -5 }, { target: 'damage.oxidative', delta: 16 }, { target: 'damage.antioxidants', delta: -12 }],
        onStartPhysiology: [{ target: 'nutrients.glucose', delta: -15 }, { target: 'nutrients.hoursSinceMeal', value: 8 }, { target: 'energy.lactate', delta: 1.8 }, { target: 'acidBase.pH', delta: -.045 }, { target: 'hormones.insulin', delta: -3 }, { target: 'hormones.glucagon', delta: 35 }, { target: 'allostatic.oxidative', delta: 14 }, { target: 'organs.liver.damage', delta: 8 }, { target: 'organs.liver.functionality', delta: -12 }, { target: 'organs.brain.functionality', delta: -4 }],
        onTimeout: [{ target: 'tissue.glucose', delta: -1.2 }, { target: 'cell.atp', delta: -.8 }, { target: 'cell.nadh', delta: 12 }, { target: 'damage.oxidative', delta: 13 }, { target: 'cell.viability', delta: -7 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: -18 }, { target: 'respiratory.rate', delta: -3 }, { target: 'respiratory.paco2', delta: 7 }, { target: 'energy.deficit', delta: 12 }, { target: 'organs.liver.functionality', delta: -8 }, { target: 'organs.brain.functionality', delta: -10 }],
    },
    {
        id: 'alcohol-nocturnal-hypoglycemia',
        title: 'Depois da festa: glicose e respiração em queda',
        description: 'Horas depois, o humano parece apenas “apagado”, mas o corpo não está descansando: a glicose continua caindo e a respiração ficou superficial. O oxímetro pode demorar a reclamar, enquanto CO₂ e sonolência aumentam.',
        explanation: 'Não escolha entre glicose e respiração: cuide das duas. Proteja a via aérea, apoie a ventilação conforme consciência e gasometria e use glicose IV quando necessário, com tiamina se houver risco nutricional.',
        investigationPrompt: 'Duas ameaças evoluem ao mesmo tempo: pouca glicose para o cérebro e pouca ventilação para eliminar CO₂. Qual número pode se alterar tarde, e quais duas funções precisam ser resgatadas juntas?',
        contextSummary: 'Pós-álcool · sono · glicogênio curto · hipoglicemia + retenção de CO₂',
        context: { exercise: 0, nutrition: 12, stress: 52, sleep: 82, temperature: 23 },
        category: 'organ', severity: 'critical', durationSeconds: 30, cooldownSeconds: 480, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'paco2', 'spo2', 'respiratoryRate', 'arterialPH', 'bloodLactate', 'glucagon', 'tissueGlucose', 'tissueCarbonDioxide', 'tissueOxygen', 'cellularAtp', 'nadh', 'ros', 'mitochondrialPotential', 'atpSynthaseFlux', 'mitochondrialHealth'],
        choices: [
            {
                id: 'alcohol-night-dual-rescue', label: 'Dar glicose IV/tiamina e oferecer suporte ventilatório',
                description: 'Resgata a glicemia, protege via aérea e corrige retenção de CO₂ conforme o nível de consciência.',
                tradeoff: 'Glucagon pode falhar com glicogênio esgotado; glicemia, gasometria e consciência precisam ser reavaliadas.',
                requirements: [{ resource: 'glucose', minimum: .4, cost: .25 }, { resource: 'oxygen', minimum: 1, cost: .4 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Sustentar glicose' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Restaurar ventilação' }],
                result: 'Glicose, eliminação de CO₂ e ATP se recuperaram em conjunto; a função cerebral saiu da trajetória de coma.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1.4 }, { target: 'tissue.carbonDioxide', delta: -8 }, { target: 'tissue.oxygen', delta: 8 }, { target: 'cell.atp', delta: .7 }, { target: 'cell.nadh', delta: -13 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 24 }, { target: 'respiratory.rate', delta: 5 }, { target: 'respiratory.paco2', delta: -9 }, { target: 'respiratory.spo2', delta: 2 }, { target: 'acidBase.pH', delta: .05 }, { target: 'energy.deficit', delta: -10 }, { target: 'organs.brain.functionality', delta: 9 }],
            },
            {
                id: 'alcohol-night-adrenaline', label: 'Usar adrenalina para forçar o despertar',
                description: 'Confunde agitação transitória com recuperação de glicose, ventilação e proteção de via aérea.',
                tradeoff: 'O despertar não repõe glicose nem remove de forma sustentável a carga hepática.',
                requirements: [], signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar simpático' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'A consciência oscilou enquanto demanda cerebral e cardíaca consumiram a glicose restante; lactato e ROS subiram.',
                cellularEffects: [{ target: 'cell.atp', delta: -.75 }, { target: 'damage.oxidative', delta: 13 }, { target: 'tissue.lactate', delta: 1.1 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 22 }, { target: 'nutrients.glucose', delta: -12 }, { target: 'energy.lactate', delta: 1.5 }, { target: 'energy.deficit', delta: 10 }, { target: 'organs.brain.functionality', delta: -8 }],
            },
            {
                id: 'alcohol-night-insulin-sedation', label: 'Corrigir apenas a glicose e aguardar a respiração recuperar',
                description: 'Trata uma ameaça real, mas supõe que ventilação e via aérea melhorarão sozinhas depois da dextrose.',
                tradeoff: 'A glicose pode responder enquanto CO₂ e depressão neurológica continuam progredindo silenciosamente.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Sustentar contrarregulação da glicose' }],
                result: 'A glicemia subiu, porém a hipercapnia continuou; a recuperação energética ficou limitada pela acidose respiratória persistente.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1 }, { target: 'tissue.carbonDioxide', delta: 6 }, { target: 'cell.pH', delta: -.04 }, { target: 'cell.atp', delta: .15 }, { target: 'cell.viability', delta: -3 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 20 }, { target: 'respiratory.rate', delta: -2 }, { target: 'respiratory.paco2', delta: 7 }, { target: 'acidBase.pH', delta: -.035 }, { target: 'organs.brain.functionality', delta: -6 }],
            },
        ],
        isEligible: eligibleWhen(1.1, 'a depuração do álcool atravessou a madrugada com glicogênio curto e ventilação deprimida', (state, macro) => state.cell.viabilityPercent > 58 && macro.nutrients.bloodGlucose > 65),
        onStart: [{ target: 'tissue.glucose', delta: -1.4 }, { target: 'tissue.carbonDioxide', delta: 9 }, { target: 'tissue.oxygen', delta: -6 }, { target: 'tissue.pH', delta: -.06 }, { target: 'cell.atp', delta: -.8 }, { target: 'cell.nadh', delta: 14 }, { target: 'damage.oxidative', delta: 9 }],
        onStartPhysiology: [{ target: 'nutrients.glucose', delta: -18 }, { target: 'nutrients.hoursSinceMeal', value: 12 }, { target: 'respiratory.rate', delta: -4 }, { target: 'respiratory.paco2', delta: 9 }, { target: 'respiratory.spo2', delta: -3 }, { target: 'acidBase.pH', delta: -.055 }, { target: 'energy.deficit', delta: 8 }, { target: 'organs.brain.oxygenation', delta: -9 }, { target: 'organs.brain.functionality', delta: -9 }, { target: 'organs.liver.functionality', delta: -6 }],
        onTimeout: [{ target: 'cell.atp', delta: -1 }, { target: 'cell.pH', delta: -.06 }, { target: 'cell.viability', delta: -10 }, { target: 'fate.apoptoticCommitment', delta: 12 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: -14 }, { target: 'respiratory.paco2', delta: 8 }, { target: 'respiratory.spo2', delta: -4 }, { target: 'acidBase.pH', delta: -.05 }, { target: 'organs.brain.functionality', delta: -14 }],
    },
    {
        id: 'fasted-workout-free-fatty-acids',
        title: 'Treino em jejum: combustível no lugar errado',
        description: 'O café da manhã foi substituído por coragem e um pré-treino. No meio do exercício, o humano ficou tonto, suado e com o coração acelerado. Há gordura circulando, mas a glicose que o cérebro usa rapidamente está caindo.',
        explanation: 'Pare o exercício e coloque o humano em posição segura. Se estiver consciente e puder engolir, ofereça carboidrato de absorção rápida. A gordura é útil no esforço prolongado, mas não resgata o cérebro de uma hipoglicemia imediata.',
        investigationPrompt: 'Por que muita gordura disponível não impede tontura e sudorese quando a glicose cai? Cruze demanda muscular, glicemia, consciência, perfusão e O₂ antes de escolher entre insistir no treino ou interromper a carga.',
        contextSummary: 'Treino intenso · 12 h de jejum · AGL altos · glicose e ATP caindo',
        context: { exercise: 86, nutrition: 18, stress: 58, sleep: 65, temperature: 24 },
        category: 'molecule', severity: 'critical', durationSeconds: 32, cooldownSeconds: 390, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'ketones', 'glucagon', 'adrenaline', 'heartRate', 'meanArterialPressure', 'tissuePerfusion', 'tissueOxygen', 'tissueLactate', 'cellularAtp', 'availableFattyAcid', 'capturedFattyAcid', 'fattyAcidFlux', 'oxygenFlux', 'nadh', 'ros', 'mitochondrialPotential', 'atpSynthaseFlux'],
        choices: [
            {
                id: 'fasted-workout-mixed-fuel', label: 'Parar o treino, deitar e oferecer carboidrato rápido',
                description: 'Reduz demanda, protege contra queda e recupera glicose enquanto contrarregulação e ventilação se reorganizam.',
                tradeoff: 'Depois da recuperação, retorno ao exercício deve ser gradual; gordura não substitui glicose cerebral no episódio agudo.',
                requirements: [{ resource: 'fattyAcid', minimum: .45, cost: .3 }, { resource: 'oxygen', minimum: 1.2, cost: .6 }, { resource: 'atp', minimum: 1.3, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Preservar glicemia' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Casar oferta de O₂' }],
                result: 'Glicose, O₂ e AGL foram usados em proporção compatível; ATP e perfusão se recuperaram sem um pico desnecessário de ROS.',
                cellularEffects: [{ target: 'tissue.glucose', delta: .9 }, { target: 'tissue.oxygen', delta: 7 }, { target: 'tissue.lactate', delta: -1.1 }, { target: 'cell.atp', delta: .75 }, { target: 'processing.fattyAcid', delta: 2 }, { target: 'processing.oxygen', delta: 2.4 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 16 }, { target: 'nutrients.ketones', delta: .4 }, { target: 'energy.deficit', delta: -9 }, { target: 'energy.lactate', delta: -1 }, { target: 'respiratory.rate', delta: 4 }, { target: 'cardiovascular.perfusion', delta: 8 }, { target: 'organs.muscles.oxygenation', delta: 8 }],
            },
            {
                id: 'fasted-workout-insulin', label: 'Reduzir a carga e manter hidratação sem oferecer carboidrato',
                description: 'Diminui parte da demanda e trata o componente volêmico, mas tenta atravessar a hipoglicemia apenas com gordura e contrarregulação.',
                tradeoff: 'Pode melhorar tontura postural, porém não repõe rapidamente o substrato limitante para o cérebro.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Mobilizar a reserva hepática restante' }],
                result: 'A demanda caiu e a perfusão melhorou, mas a glicose permaneceu curta; a recuperação neurológica e do ATP foi apenas parcial.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: 5 }, { target: 'tissue.lactate', delta: -.4 }, { target: 'cell.atp', delta: .1 }, { target: 'cell.viability', delta: -1 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -3 }, { target: 'nutrients.hydration', delta: .6 }, { target: 'energy.deficit', delta: -2 }, { target: 'cardiovascular.perfusion', delta: 5 }, { target: 'organs.brain.functionality', delta: -3 }],
            },
            {
                id: 'fasted-workout-more-drive', label: 'Tomar pré-treino e aumentar a carga',
                description: 'Usa catecolaminas para mascarar tontura e manter o esforço apesar da queda de glicose e perfusão.',
                tradeoff: 'Substrato já não é o único limite; demanda, O₂ e gradiente mitocondrial estão desencontrados.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:sympathetic-arousal'], label: 'Manter descarga simpática' }],
                result: 'Demanda, frequência e lipólise cresceram além da capacidade oxidativa; NADH, lactato e ROS antecederam o desmaio.',
                cellularEffects: [{ target: 'available.fattyAcid', delta: 1.2 }, { target: 'cell.nadh', delta: 16 }, { target: 'cell.atp', delta: -.8 }, { target: 'damage.oxidative', delta: 15 }, { target: 'tissue.lactate', delta: 1.6 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 24 }, { target: 'energy.deficit', delta: 12 }, { target: 'energy.lactate', delta: 2 }, { target: 'nutrients.glucose', delta: -12 }, { target: 'allostatic.load', delta: 10 }],
            },
        ],
        isEligible: eligibleWhen(1.08, 'o esforço em jejum elevou lipólise antes que oferta de O₂ e fluxos mitocondriais acompanhassem', (state, macro) => state.cell.viabilityPercent > 66 && macro.nutrients.bloodGlucose > 75),
        onStart: [{ target: 'available.fattyAcid', delta: 2 }, { target: 'tissue.glucose', delta: -1 }, { target: 'tissue.oxygen', delta: -10 }, { target: 'tissue.lactate', delta: 1.6 }, { target: 'tissue.perfusion', delta: -9 }, { target: 'cell.atp', delta: -.7 }, { target: 'cell.nadh', delta: 14 }, { target: 'mitochondria.oxygenConsumption', delta: 3 }, { target: 'damage.oxidative', delta: 10 }],
        onStartPhysiology: [{ target: 'nutrients.hoursSinceMeal', value: 12 }, { target: 'nutrients.glucose', delta: -14 }, { target: 'nutrients.ketones', delta: .8 }, { target: 'hormones.glucagon', delta: 45 }, { target: 'hormones.adrenaline', delta: 90 }, { target: 'cardiovascular.heartRate', delta: 38 }, { target: 'cardiovascular.perfusion', delta: -10 }, { target: 'respiratory.rate', delta: 8 }, { target: 'energy.lactate', delta: 1.8 }, { target: 'energy.deficit', delta: 9 }, { target: 'organs.muscles.perfusion', delta: 12 }, { target: 'organs.muscles.oxygenation', delta: -12 }],
        onTimeout: [{ target: 'tissue.oxygen', delta: -8 }, { target: 'cell.atp', delta: -.9 }, { target: 'cell.nadh', delta: 10 }, { target: 'damage.oxidative', delta: 12 }, { target: 'cell.viability', delta: -6 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: -14 }, { target: 'cardiovascular.map', delta: -10 }, { target: 'cardiovascular.perfusion', delta: -12 }, { target: 'energy.lactate', delta: 1.8 }, { target: 'energy.deficit', delta: 11 }, { target: 'organs.brain.perfusion', delta: -12 }],
    },
    {
        id: 'chronic-anxiety-sedentary',
        title: 'Ansiedade crônica: o alarme interno não desliga',
        description: 'Há semanas o sofá ganhou um morador fixo e cada notificação do celular parece uma sirene. Mesmo parado, o humano dorme mal, respira rápido e mantém frequência cardíaca e cortisol altos; a variabilidade do coração caiu.',
        explanation: 'O sistema simpático está agindo como se houvesse perigo o tempo todo. Primeiro exclua doença e uso de substâncias; depois trabalhe sono, respiração, apoio e atividade gradual. Estimulantes, corticoide ou T3 apertam ainda mais o alarme.',
        investigationPrompt: 'O corpo está em modo de ameaça mesmo em repouso. Compare frequência, variabilidade cardíaca, cortisol, ventilação, sono e demanda de O₂: falta ativação ou sobra alerta? Considere também causas orgânicas e substâncias.',
        contextSummary: 'Semanas sedentárias · estresse crônico · simpático/HPA altos · HRV baixa',
        context: { exercise: 1, nutrition: 66, stress: 92, sleep: 38, temperature: 22 },
        category: 'organ', severity: 'warning', durationSeconds: 38, cooldownSeconds: 480, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['heartRate', 'heartRateVariability', 'systolicBP', 'diastolicBP', 'meanArterialPressure', 'respiratoryRate', 'paco2', 'arterialPH', 'adrenaline', 'cortisol', 'bloodGlucose', 'allostaticLoad', 'systemicAtpReserve', 'cellularAtp', 'ros', 'antioxidants', 'mitochondrialOxygenConsumption'],
        choices: [
            {
                id: 'anxiety-autonomic-offload', label: 'Excluir causas e iniciar respiração, sono e atividade graduais',
                description: 'Reduz hiperventilação e excesso simpático com reabilitação progressiva e acompanhamento do quadro crônico.',
                tradeoff: 'A retirada deve ser gradual e individualizada; sedação ou bloqueio autonômico abruptos podem causar hipotensão e não tratam a causa.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .15 }, { resource: 'antioxidants', minimum: 16, cost: 5 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Favorecer recuperação vagal' }, { anyOf: ['central:reduce-respiratory-drive'], label: 'Reduzir hiperventilação de alerta' }],
                result: 'FC, ventilação e pressão se aproximaram da demanda; HRV, PaCO₂, ATP e reserva antioxidante começaram a se recuperar.',
                cellularEffects: [{ target: 'cell.atp', delta: .55 }, { target: 'damage.oxidative', delta: -13 }, { target: 'damage.antioxidants', delta: 5 }, { target: 'mitochondria.oxygenConsumption', delta: -1.2 }, { target: 'cell.calcium', delta: -55 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: -17 }, { target: 'cardiovascular.hrv', delta: 20 }, { target: 'cardiovascular.systolic', delta: -10 }, { target: 'cardiovascular.diastolic', delta: -6 }, { target: 'respiratory.rate', delta: -5 }, { target: 'respiratory.paco2', delta: 5 }, { target: 'acidBase.pH', delta: -.035 }, { target: 'endocrine.sympatheticDrive', delta: -.42 }, { target: 'endocrine.hpaDrive', delta: -.22 }, { target: 'allostatic.load', delta: -12 }],
            },
            {
                id: 'anxiety-more-sympathetic', label: 'Prescrever estimulante para vencer o cansaço',
                description: 'Interpreta fadiga como baixa ativação e reforça simpático e catecolaminas já elevados.',
                tradeoff: 'PAM já está sustentada; o custo oculto aparece em HRV, ATP, Ca²⁺ e ROS.',
                requirements: [], signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar simpático' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                result: 'Pressão subiu, mas a reserva caiu: taquicardia, Ca²⁺, demanda de O₂ e ROS ampliaram a carga alostática.',
                cellularEffects: [{ target: 'cell.atp', delta: -.65 }, { target: 'cell.calcium', delta: 110 }, { target: 'damage.oxidative', delta: 14 }, { target: 'mitochondria.oxygenConsumption', delta: 2 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 24 }, { target: 'cardiovascular.systolic', delta: 18 }, { target: 'cardiovascular.hrv', delta: -15 }, { target: 'endocrine.sympatheticDrive', delta: .25 }, { target: 'endocrine.catecholamineExposure', delta: 18 }, { target: 'allostatic.load', delta: 13 }],
            },
            {
                id: 'anxiety-cortisol-thyroid', label: 'Usar corticoide e T3 para elevar energia',
                description: 'Aumenta oferta de combustível e gasto basal sem indicação para tentar vencer a exaustão.',
                tradeoff: 'A fadiga decorre do excesso de drive, não de baixa estimulação metabólica.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }, { anyOf: ['hormone:increase-t3'], label: 'Aumentar T3' }],
                result: 'Glicose e potência subiram transitoriamente, mas consumo de O₂, calor, proteólise e carga cardiovascular aprofundaram o desgaste crônico.',
                cellularEffects: [{ target: 'cell.atp', delta: -.5 }, { target: 'damage.proteins', delta: 8 }, { target: 'damage.oxidative', delta: 11 }, { target: 'mitochondria.etcFlux', delta: 10 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 18 }, { target: 'body.temperature', delta: .35 }, { target: 'cardiovascular.heartRate', delta: 12 }, { target: 'hormones.cortisol', delta: 20 }, { target: 'endocrine.cortisolExposure', delta: 18 }, { target: 'energy.deficit', delta: 8 }, { target: 'allostatic.load', delta: 12 }],
            },
        ],
        isEligible: eligibleWhen(.96, 'semanas de estresse com baixa atividade mantiveram os eixos simpático e HPA acima da demanda de repouso', (state, macro) => state.cell.viabilityPercent > 72 && macro.cardiovascular.heartRate < 96),
        onStart: [{ target: 'tissue.oxygen', delta: -5 }, { target: 'tissue.carbonDioxide', delta: -5 }, { target: 'cell.atp', delta: -.45 }, { target: 'cell.calcium', delta: 80 }, { target: 'mitochondria.oxygenConsumption', delta: 1.8 }, { target: 'damage.oxidative', delta: 12 }, { target: 'damage.antioxidants', delta: -8 }],
        onStartPhysiology: [{ target: 'cardiovascular.heartRate', delta: 26 }, { target: 'cardiovascular.hrv', delta: -28 }, { target: 'cardiovascular.systolic', delta: 18 }, { target: 'cardiovascular.diastolic', delta: 10 }, { target: 'cardiovascular.map', delta: 12 }, { target: 'respiratory.rate', delta: 7 }, { target: 'respiratory.paco2', delta: -7 }, { target: 'acidBase.pH', delta: .045 }, { target: 'hormones.adrenaline', delta: 120 }, { target: 'hormones.cortisol', delta: 18 }, { target: 'endocrine.sympatheticDrive', value: .82 }, { target: 'endocrine.hpaDrive', value: .74 }, { target: 'endocrine.cortisolExposure', delta: 28 }, { target: 'endocrine.catecholamineExposure', delta: 30 }, { target: 'allostatic.load', delta: 22 }, { target: 'allostatic.oxidative', delta: 12 }],
        onTimeout: [{ target: 'cell.atp', delta: -.65 }, { target: 'cell.calcium', delta: 75 }, { target: 'damage.oxidative', delta: 11 }, { target: 'damage.proteins', delta: 5 }],
        onTimeoutPhysiology: [{ target: 'cardiovascular.heartRate', delta: 10 }, { target: 'cardiovascular.hrv', delta: -12 }, { target: 'endocrine.cortisolExposure', delta: 12 }, { target: 'endocrine.catecholamineExposure', delta: 15 }, { target: 'allostatic.load', delta: 10 }],
    },
    {
        id: 'panic-hyperventilation',
        title: 'Crise de pânico: muito ar, pouco CO₂',
        description: 'O humano está no sofá, mas os pulmões trabalham como se ele estivesse fugindo de um rinoceronte. O oxigênio está normal; respirar rápido demais derrubou o CO₂, causando tontura, formigamento e menor circulação cerebral.',
        explanation: 'Confirme primeiro que pressão e oxigenação estão estáveis, acolha e guie uma respiração mais lenta. Mandar puxar ainda mais ar ou usar adrenalina piora a falta de CO₂. Sedação só deve ser considerada após avaliação e monitorização.',
        investigationPrompt: 'A sensação é de falta de ar, mas SpO₂ e PaO₂ estão preservadas. Relacione respiração rápida, CO₂ baixo, pH alto e perfusão cerebral: oferecer ainda mais ventilação resolveria ou ampliaria os sintomas?',
        contextSummary: 'Crise aguda · hiperventilação · alcalose respiratória · vasoconstrição cerebral',
        context: { exercise: 0, nutrition: 62, stress: 100, sleep: 32, temperature: 22 },
        category: 'organ', severity: 'critical', durationSeconds: 28, cooldownSeconds: 420, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['spo2', 'pao2', 'paco2', 'arterialPH', 'bicarbonate', 'respiratoryRate', 'heartRate', 'heartRateVariability', 'meanArterialPressure', 'perfusionIndex', 'adrenaline', 'cortisol', 'cellCalcium', 'cellularAtp', 'ros'],
        choices: [
            {
                id: 'panic-match-ventilation-demand', label: 'Acolher, monitorar e guiar respiração lenta',
                description: 'Reduz alerta e frequência respiratória depois de confirmar que oxigenação e pressão estão preservadas.',
                tradeoff: 'Só é seguro porque as métricas excluem hipoxemia, hipercapnia e acidemia.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .12 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Retirar alerta autonômico' }, { anyOf: ['central:reduce-respiratory-drive'], label: 'Reduzir drive respiratório' }],
                result: 'PaCO₂ e pH retornaram em direção ao basal; perfusão cerebral, HRV e cálcio celular se recuperaram sem perder oxigenação.',
                cellularEffects: [{ target: 'tissue.carbonDioxide', delta: 7 }, { target: 'tissue.pH', delta: -.05 }, { target: 'cell.calcium', delta: -95 }, { target: 'cell.atp', delta: .45 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'respiratory.rate', delta: -10 }, { target: 'respiratory.paco2', delta: 10 }, { target: 'acidBase.pH', delta: -.075 }, { target: 'cardiovascular.heartRate', delta: -18 }, { target: 'cardiovascular.hrv', delta: 18 }, { target: 'organs.brain.perfusion', delta: 14 }, { target: 'organs.brain.functionality', delta: 8 }, { target: 'allostatic.load', delta: -10 }],
            },
            {
                id: 'panic-more-air', label: 'Mandar respirar cada vez mais fundo e rápido',
                description: 'Trata tontura e parestesia como falta de ar apesar da SpO₂ preservada e PaCO₂ baixa.',
                tradeoff: 'SpO₂ e PaO₂ já estão preservadas; o gradiente anormal é de CO₂.',
                requirements: [], signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Aumentar ventilação' }],
                result: 'PaCO₂ caiu ainda mais, a alcalose aumentou e a vasoconstrição cerebral piorou a tontura apesar da SpO₂ perfeita.',
                cellularEffects: [{ target: 'tissue.carbonDioxide', delta: -6 }, { target: 'tissue.pH', delta: .05 }, { target: 'cell.calcium', delta: 90 }, { target: 'cell.atp', delta: -.45 }],
                physiologyEffects: [{ target: 'respiratory.rate', delta: 9 }, { target: 'respiratory.paco2', delta: -8 }, { target: 'acidBase.pH', delta: .065 }, { target: 'organs.brain.perfusion', delta: -13 }, { target: 'organs.brain.functionality', delta: -9 }],
            },
            {
                id: 'panic-adrenergic-perfusion', label: 'Oferecer O₂ e observar sem reduzir a hiperventilação',
                description: 'Trata a sensação de falta de ar como hipóxia apesar de PaO₂ e SpO₂ preservadas, mantendo o drive elevado.',
                tradeoff: 'Pode tranquilizar por alguns instantes, mas não recupera CO₂ nem perfusão cerebral enquanto a hiperventilação persiste.',
                requirements: [], signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Sustentar ventilação durante a observação' }],
                result: 'A oxigenação permaneceu alta, porém PaCO₂, pH e perfusão cerebral quase não se corrigiram; os sintomas persistiram.',
                cellularEffects: [{ target: 'tissue.oxygen', delta: 3 }, { target: 'tissue.carbonDioxide', delta: -1 }, { target: 'cell.atp', delta: -.15 }, { target: 'cell.calcium', delta: 35 }],
                physiologyEffects: [{ target: 'respiratory.pao2', delta: 6 }, { target: 'respiratory.spo2', delta: 1 }, { target: 'respiratory.paco2', delta: -1 }, { target: 'acidBase.pH', delta: .01 }, { target: 'organs.brain.perfusion', delta: -4 }, { target: 'allostatic.load', delta: 3 }],
            },
        ],
        isEligible: eligibleWhen(1.12, 'a ativação autonômica crônica transbordou para hiperventilação aguda sem hipoxemia', (state, macro) => state.cell.viabilityPercent > 68 && macro.respiratory.paco2 > 30),
        onStart: [{ target: 'tissue.carbonDioxide', delta: -8 }, { target: 'tissue.pH', delta: .055 }, { target: 'tissue.perfusion', delta: -7 }, { target: 'cell.calcium', delta: 125 }, { target: 'cell.atp', delta: -.5 }, { target: 'damage.oxidative', delta: 8 }],
        onStartPhysiology: [{ target: 'respiratory.rate', delta: 14 }, { target: 'respiratory.paco2', delta: -11 }, { target: 'respiratory.pao2', delta: 4 }, { target: 'respiratory.spo2', value: 99 }, { target: 'acidBase.pH', delta: .085 }, { target: 'acidBase.bicarbonate', delta: -1.5 }, { target: 'cardiovascular.heartRate', delta: 24 }, { target: 'cardiovascular.hrv', delta: -18 }, { target: 'organs.brain.perfusion', delta: -16 }, { target: 'organs.brain.functionality', delta: -8 }, { target: 'hormones.adrenaline', delta: 100 }, { target: 'allostatic.load', delta: 12 }],
        onTimeout: [{ target: 'cell.calcium', delta: 100 }, { target: 'cell.atp', delta: -.6 }, { target: 'damage.oxidative', delta: 9 }, { target: 'cell.viability', delta: -4 }],
        onTimeoutPhysiology: [{ target: 'respiratory.paco2', delta: -6 }, { target: 'acidBase.pH', delta: .045 }, { target: 'cardiovascular.heartRate', delta: 10 }, { target: 'organs.brain.perfusion', delta: -10 }, { target: 'allostatic.load', delta: 9 }],
    },
    {
        id: 'major-hemorrhage',
        title: 'Acidente com hemorragia importante',
        description: 'O humano está perdendo muito sangue. O coração acelera para compensar, mas há cada vez menos volume voltando a ele; a pressão, a circulação no cérebro e nos tecidos e a produção de ATP caem rapidamente.',
        explanation: 'A prioridade é parar a perda: compressão direta ou torniquete quando indicado, acionamento do protocolo de hemorragia e reposição balanceada de sangue e componentes. Oxigênio ou adrenalina, sozinhos, não substituem volume nem hemoglobina.',
        investigationPrompt: 'A frequência alta é parte do problema ou uma tentativa de manter o débito com pouco volume? Cruze pressão, volume sistólico, perfusão, lactato, oxigênio tecidual e ATP e identifique a fonte que precisa ser controlada primeiro.',
        contextSummary: 'Trauma · perda de volume · choque hemorrágico · hipóxia tecidual',
        context: { exercise: 0, nutrition: 55, stress: 100, sleep: 45, temperature: 21 },
        category: 'organ', severity: 'critical', durationSeconds: 26, cooldownSeconds: 520, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['heartRate', 'heartRateVariability', 'systolicBP', 'diastolicBP', 'meanArterialPressure', 'cardiacOutput', 'perfusionIndex', 'hydration', 'adhActivity', 'bloodLactate', 'arterialPH', 'tissuePerfusion', 'tissueOxygen', 'tissueGlucose', 'tissueLactate', 'cellularAtp', 'cellMembranePotential', 'cellCalcium', 'ros', 'mitochondrialPotential', 'atpSynthaseFlux'],
        choices: [
            {
                id: 'hemorrhage-centralize-conserve', label: 'Comprimir o sangramento e ativar transfusão maciça',
                description: 'Controla a fonte, preserva a compensação simpática e inicia reposição balanceada enquanto monitora perfusão.',
                tradeoff: 'Cristaloide isolado não repõe hemácias nem fatores; a resposta deve acompanhar temperatura, cálcio, coagulação e choque.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .25 }, { resource: 'antioxidants', minimum: 18, cost: 6 }],
                signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Sustentar resposta compensatória' }, { anyOf: ['central:adh-retention'], label: 'Conservar água renal' }],
                result: 'PAM e perfusão cerebral estabilizaram enquanto ADH reduziu perda de água; a célula preservou ATP suficiente para atravessar a janela até a hemostasia.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: 18 }, { target: 'tissue.oxygen', delta: 8 }, { target: 'tissue.lactate', delta: -1.2 }, { target: 'cell.atp', delta: .65 }, { target: 'cell.membranePotential', delta: -7 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 18 }, { target: 'cardiovascular.systolic', delta: 20 }, { target: 'cardiovascular.diastolic', delta: 12 }, { target: 'cardiovascular.perfusion', delta: 20 }, { target: 'renal.adh', delta: 25 }, { target: 'nutrients.hydration', delta: .8 }, { target: 'energy.lactate', delta: -1.2 }, { target: 'energy.deficit', delta: -8 }, { target: 'organs.brain.perfusion', delta: 18 }, { target: 'organs.brain.oxygenation', delta: 9 }],
            },
            {
                id: 'hemorrhage-vagal-diuresis', label: 'Infundir grande volume de cristaloide antes de controlar a fonte',
                description: 'Tenta recuperar pressão rapidamente, mas posterga hemostasia e dilui hemácias, fatores e plaquetas.',
                tradeoff: 'A PAM pode reagir por instantes enquanto sangramento, hemodiluição e entrega de O₂ continuam piorando.',
                requirements: [], signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Conservar volume durante a expansão' }],
                result: 'A pressão teve melhora transitória, mas a fonte permaneceu ativa; perfusão útil, coagulação e ATP não acompanharam o volume infundido.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: -2 }, { target: 'tissue.oxygen', delta: -6 }, { target: 'cell.atp', delta: -.45 }, { target: 'cell.membranePotential', delta: 6 }, { target: 'cell.viability', delta: -4 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 6 }, { target: 'cardiovascular.cardiacOutput', delta: .3 }, { target: 'cardiovascular.perfusion', delta: -4 }, { target: 'nutrients.hydration', delta: 2 }, { target: 'energy.lactate', delta: .8 }, { target: 'organs.brain.perfusion', delta: -5 }, { target: 'organs.brain.functionality', delta: -4 }],
            },
            {
                id: 'hemorrhage-adrenaline-ventilation-only', label: 'Usar apenas adrenalina e oxigênio',
                description: 'Tenta compensar a entrega sem comprimir o foco, repor volume circulante ou restaurar hemoglobina.',
                tradeoff: 'Sem volume e hemoglobina, mais PaO₂ e cronotropismo não garantem entrega tecidual.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Aumentar ventilação' }],
                result: 'SpO₂ permaneceu atraente, mas enchimento ventricular e perfusão não melhoraram; demanda cardíaca, lactato e ROS cresceram.',
                cellularEffects: [{ target: 'tissue.oxygen', delta: -4 }, { target: 'cell.atp', delta: -.75 }, { target: 'cell.calcium', delta: 115 }, { target: 'damage.oxidative', delta: 13 }, { target: 'tissue.lactate', delta: 1.5 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 26 }, { target: 'respiratory.rate', delta: 8 }, { target: 'respiratory.pao2', delta: 8 }, { target: 'respiratory.spo2', delta: 1 }, { target: 'energy.lactate', delta: 2 }, { target: 'energy.deficit', delta: 10 }, { target: 'allostatic.load', delta: 11 }],
            },
        ],
        isEligible: eligibleWhen(.9, 'uma perda sanguínea aguda reduziu pré-carga e entrega de oxigênio antes de a compensação restaurar a perfusão', (state, macro) => state.cell.viabilityPercent > 72 && macro.cardiovascular.meanArterialPressure > 65),
        onStart: [{ target: 'tissue.perfusion', delta: -38 }, { target: 'tissue.oxygen', delta: -18 }, { target: 'tissue.glucose', delta: -1.4 }, { target: 'tissue.lactate', delta: 3 }, { target: 'tissue.pH', delta: -.09 }, { target: 'cell.atp', delta: -1 }, { target: 'cell.membranePotential', delta: 11 }, { target: 'cell.calcium', delta: 130 }, { target: 'mitochondria.etcFlux', delta: -20 }, { target: 'mitochondria.atpSynthase', delta: -22 }, { target: 'mitochondria.health', delta: -6 }, { target: 'damage.oxidative', delta: 10 }],
        onStartPhysiology: [{ target: 'nutrients.hydration', delta: -4.8 }, { target: 'cardiovascular.heartRate', delta: 38 }, { target: 'cardiovascular.hrv', delta: -30 }, { target: 'cardiovascular.systolic', delta: -42 }, { target: 'cardiovascular.diastolic', delta: -28 }, { target: 'cardiovascular.map', delta: -34 }, { target: 'cardiovascular.cardiacOutput', delta: -2 }, { target: 'cardiovascular.strokeVolume', delta: -35 }, { target: 'cardiovascular.svr', delta: 430 }, { target: 'cardiovascular.perfusion', delta: -42 }, { target: 'energy.lactate', delta: 3.5 }, { target: 'energy.deficit', delta: 13 }, { target: 'renal.gfr', delta: -55 }, { target: 'renal.adh', delta: 25 }, { target: 'endocrine.sympatheticDrive', value: .95 }, { target: 'hormones.adrenaline', delta: 180 }, { target: 'organs.brain.perfusion', delta: -38 }, { target: 'organs.brain.oxygenation', delta: -22 }, { target: 'organs.liver.perfusion', delta: -32 }, { target: 'organs.liver.oxygenation', delta: -20 }, { target: 'organs.muscles.perfusion', delta: -45 }],
        onTimeout: [{ target: 'tissue.perfusion', delta: -18 }, { target: 'tissue.oxygen', delta: -10 }, { target: 'cell.atp', delta: -1.1 }, { target: 'cell.viability', delta: -12 }, { target: 'fate.apoptoticCommitment', delta: 14 }],
        onTimeoutPhysiology: [{ target: 'nutrients.hydration', delta: -1.5 }, { target: 'cardiovascular.map', delta: -16 }, { target: 'cardiovascular.cardiacOutput', delta: -1 }, { target: 'cardiovascular.perfusion', delta: -18 }, { target: 'energy.lactate', delta: 2 }, { target: 'renal.gfr', delta: -20 }, { target: 'organs.brain.functionality', delta: -15 }, { target: 'organs.liver.damage', delta: 8 }],
    },
];

export function selectEligibleScenario(
    state: CellularState,
    macro: PhysiologyState,
    difficulty: SimulationDifficulty = 'easy',
): { definition: ScenarioDefinition; eligibility: ScenarioEligibility } | null {
    const narrative = state.narrative ?? createInitialScenarioNarrativeState();
    const eligible = SCENARIO_DEFINITIONS
        .filter(definition => definition.difficulty === difficulty)
        .filter(definition => (state.scenarioCooldowns[definition.id] ?? 0) <= state.simulationTime)
        .filter(definition => isSimulationTimeWithinWindows(macro.timeElapsed, getScenarioTimeWindows(definition.id)))
        .filter(definition => isScenarioNarrativelyCompatible(definition.id, narrative))
        .map(definition => ({ definition, eligibility: definition.isEligible(state, macro) }))
        .filter(candidate => candidate.eligibility.eligible);
    if (eligible.length === 0) return null;

    const directContinuations = eligible.filter(candidate =>
        isDirectNarrativeContinuation(candidate.definition.id, narrative.lastScenarioId));
    const pool = directContinuations.length > 0 ? directContinuations : eligible;
    const weighted = pool.map(candidate => ({
        ...candidate,
        narrativeWeight: candidate.eligibility.weight * narrativeAffinity(candidate.definition.id, narrative),
    }));
    const totalWeight = weighted.reduce((sum, candidate) => sum + candidate.narrativeWeight, 0);
    const seed = Math.sin(state.simulationTime * 12.9898 + state.collection.score * .37 + 8.17) * 43758.5453;
    let cursor = (seed - Math.floor(seed)) * totalWeight;
    for (const candidate of weighted) {
        cursor -= candidate.narrativeWeight;
        if (cursor <= 0) return candidate;
    }
    return weighted[weighted.length - 1];
}

export function createRoutineEvent(
    definition: ScenarioDefinition,
    triggerReason: string,
    state: CellularState,
    simulationTime = state.simulationTime,
): CellularRoutineEvent {
    const seed = Math.sin(simulationTime * 7.31 + definition.id.length * 3.17) * 24634.6345;
    const choices = [...definition.choices];
    if (seed - Math.floor(seed) >= .5) choices.reverse();
    const molecularBurden = getCellularDamageBurden(state.damage);
    const dominantDamage = getDominantCellularDamage(state.damage);
    const aggravated = molecularBurden >= 35 || dominantDamage.value >= 50;
    const damageContext = molecularBurden >= 8
        ? `; carga molecular ${molecularBurden.toFixed(1)}%, dominada por ${dominantDamage.label.toLowerCase()} em ${dominantDamage.value.toFixed(1)}%`
        : '';
    return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        explanation: definition.explanation,
        triggerReason: `${triggerReason}${damageContext}`,
        category: definition.category,
        choices: choices.map(({ id, label, description, tradeoff, requirements, signalRequirements }) => ({
            id,
            label,
            description,
            tradeoff,
            requirements,
            signalRequirements: signalRequirements ?? [],
        })),
        remainingSeconds: definition.durationSeconds,
        severity: aggravated ? 'critical' : definition.severity,
    };
}

export function getScenarioDefinition(id: string): ScenarioDefinition | undefined {
    return SCENARIO_DEFINITIONS.find(definition => definition.id === id);
}

export function getScenarioContext(id: string | undefined): PhysiologicalContextFactors {
    if (!id) return BASELINE_PHYSIOLOGICAL_CONTEXT;
    return getScenarioDefinition(id)?.context ?? BASELINE_PHYSIOLOGICAL_CONTEXT;
}

export function getScenarioChoice(scenarioId: string, choiceId: string): ScenarioChoiceDefinition | undefined {
    return getScenarioDefinition(scenarioId)?.choices.find(choice => choice.id === choiceId);
}

export const DECISION_RESOURCE_LABELS: Record<DecisionResource, string> = {
    atp: 'ATP',
    glucose: 'Glicose captada',
    oxygen: 'O₂ disponível à cadeia respiratória',
    fattyAcid: 'Ácido graxo captado',
    aminoAcid: 'Aminoácido captado',
    pyruvate: 'Piruvato',
    antioxidants: 'Reserva antioxidante',
};

export function getDecisionResourceAmount(state: CellularState, resource: DecisionResource): number {
    if (resource === 'atp') return state.cell.atpMmolL;
    if (resource === 'pyruvate') return state.pools.pyruvate;
    if (resource === 'antioxidants') return state.damage.antioxidantCapacity;
    return state.pools.captured[resource];
}

export function getScenarioChoiceAvailability(
    state: CellularState,
    scenarioId: string,
    choiceId: string,
    preparedSignals: readonly DecisionSignalId[] = [],
): { available: boolean; missing: string[] } {
    const choice = getScenarioChoice(scenarioId, choiceId);
    if (!choice) return { available: false, missing: ['Decisão não configurada'] };
    const missingResources = choice.requirements
        .filter(requirement => getDecisionResourceAmount(state, requirement.resource) + 1e-6 < requirement.minimum)
        .map(requirement => `${DECISION_RESOURCE_LABELS[requirement.resource]} ${getDecisionResourceAmount(state, requirement.resource).toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}/${requirement.minimum.toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}`);
    const prepared = new Set(preparedSignals);
    const missingSignals = (choice.signalRequirements ?? [])
        .filter(requirement => !requirement.anyOf.some(signal => prepared.has(signal)))
        .map(requirement => requirement.label);
    const missing = [...missingResources, ...missingSignals];
    return { available: missing.length === 0, missing };
}

export function applyScenarioPhysiologyEffects(
    state: PhysiologyState,
    effects: ScenarioPhysiologyEffect[],
    multiplier = 1,
): PhysiologyState {
    const next: PhysiologyState = {
        ...state,
        energy: { ...state.energy },
        nutrients: { ...state.nutrients },
        allostaticLoad: { ...state.allostaticLoad },
        pathophysiology: { ...state.pathophysiology },
        hormones: { ...state.hormones },
        endocrine: { ...state.endocrine },
        organs: {
            ...state.organs,
            liver: { ...state.organs.liver },
            brain: { ...state.organs.brain },
            muscles: { ...state.organs.muscles },
        },
        cardiovascular: { ...state.cardiovascular },
        respiratory: { ...state.respiratory },
        acidBase: { ...state.acidBase },
        renal: { ...state.renal },
    };
    const change = (current: number, effect: ScenarioPhysiologyEffect) => effect.value ?? current + (effect.delta ?? 0) * multiplier;

    for (const effect of effects) {
        if (effect.target === 'energy.atp') next.energy.atpPool = change(next.energy.atpPool, effect);
        else if (effect.target === 'energy.deficit') next.energy.energyDeficit = change(next.energy.energyDeficit, effect);
        else if (effect.target === 'energy.lactate') next.energy.lactateLevel = change(next.energy.lactateLevel, effect);
        else if (effect.target === 'nutrients.glucose') next.nutrients.bloodGlucose = change(next.nutrients.bloodGlucose, effect);
        else if (effect.target === 'nutrients.hydration') next.nutrients.hydration = change(next.nutrients.hydration, effect);
        else if (effect.target === 'nutrients.sodium') next.nutrients.sodium = change(next.nutrients.sodium, effect);
        else if (effect.target === 'nutrients.potassium') next.nutrients.potassium = change(next.nutrients.potassium, effect);
        else if (effect.target === 'nutrients.ketones') next.nutrients.ketones = change(next.nutrients.ketones, effect);
        else if (effect.target === 'nutrients.hoursSinceMeal') next.nutrients.hoursSinceMeal = change(next.nutrients.hoursSinceMeal, effect);
        else if (effect.target === 'allostatic.load') next.allostaticLoad.currentLoad = change(next.allostaticLoad.currentLoad, effect);
        else if (effect.target === 'allostatic.inflammation') next.allostaticLoad.inflammationLevel = change(next.allostaticLoad.inflammationLevel, effect);
        else if (effect.target === 'allostatic.oxidative') next.allostaticLoad.oxidativeStress = change(next.allostaticLoad.oxidativeStress, effect);
        else if (effect.target === 'pathophysiology.infection') next.pathophysiology.infectionSeverity = change(next.pathophysiology.infectionSeverity, effect);
        else if (effect.target === 'pathophysiology.capillaryLeak') next.pathophysiology.capillaryLeak = change(next.pathophysiology.capillaryLeak, effect);
        else if (effect.target === 'cardiovascular.heartRate') next.cardiovascular.heartRate = change(next.cardiovascular.heartRate, effect);
        else if (effect.target === 'cardiovascular.hrv') next.cardiovascular.heartRateVariability = change(next.cardiovascular.heartRateVariability, effect);
        else if (effect.target === 'cardiovascular.systolic') next.cardiovascular.systolicBP = change(next.cardiovascular.systolicBP, effect);
        else if (effect.target === 'cardiovascular.diastolic') next.cardiovascular.diastolicBP = change(next.cardiovascular.diastolicBP, effect);
        else if (effect.target === 'cardiovascular.map') next.cardiovascular.meanArterialPressure = change(next.cardiovascular.meanArterialPressure, effect);
        else if (effect.target === 'cardiovascular.cardiacOutput') next.cardiovascular.cardiacOutput = change(next.cardiovascular.cardiacOutput, effect);
        else if (effect.target === 'cardiovascular.strokeVolume') next.cardiovascular.strokeVolume = change(next.cardiovascular.strokeVolume, effect);
        else if (effect.target === 'cardiovascular.svr') next.cardiovascular.systemicVascularResistance = change(next.cardiovascular.systemicVascularResistance, effect);
        else if (effect.target === 'cardiovascular.perfusion') next.cardiovascular.perfusionIndex = change(next.cardiovascular.perfusionIndex, effect);
        else if (effect.target === 'respiratory.rate') next.respiratory.respiratoryRate = change(next.respiratory.respiratoryRate, effect);
        else if (effect.target === 'respiratory.pao2') next.respiratory.pao2 = change(next.respiratory.pao2, effect);
        else if (effect.target === 'respiratory.paco2') next.respiratory.paco2 = change(next.respiratory.paco2, effect);
        else if (effect.target === 'respiratory.spo2') next.respiratory.spo2 = change(next.respiratory.spo2, effect);
        else if (effect.target === 'respiratory.tidalVolume') next.respiratory.tidalVolume = change(next.respiratory.tidalVolume, effect);
        else if (effect.target === 'respiratory.minuteVentilation') next.respiratory.minuteVentilation = change(next.respiratory.minuteVentilation, effect);
        else if (effect.target === 'acidBase.pH') next.acidBase.pH = change(next.acidBase.pH, effect);
        else if (effect.target === 'acidBase.bicarbonate') next.acidBase.bicarbonate = change(next.acidBase.bicarbonate, effect);
        else if (effect.target === 'acidBase.baseExcess') next.acidBase.baseExcess = change(next.acidBase.baseExcess, effect);
        else if (effect.target === 'acidBase.anionGap') next.acidBase.anionGap = change(next.acidBase.anionGap, effect);
        else if (effect.target === 'renal.gfr') next.renal.gfr = change(next.renal.gfr, effect);
        else if (effect.target === 'renal.adh') next.renal.adhActivity = change(next.renal.adhActivity, effect);
        else if (effect.target === 'hormones.insulin') next.hormones.insulin = change(next.hormones.insulin, effect);
        else if (effect.target === 'hormones.glucagon') next.hormones.glucagon = change(next.hormones.glucagon, effect);
        else if (effect.target === 'hormones.adrenaline') next.hormones.adrenaline = change(next.hormones.adrenaline, effect);
        else if (effect.target === 'hormones.cortisol') next.hormones.cortisol = change(next.hormones.cortisol, effect);
        else if (effect.target === 'endocrine.hpaDrive') next.endocrine.hpaDrive = change(next.endocrine.hpaDrive, effect);
        else if (effect.target === 'endocrine.sympatheticDrive') next.endocrine.sympatheticDrive = change(next.endocrine.sympatheticDrive, effect);
        else if (effect.target === 'endocrine.cortisolExposure') next.endocrine.cortisolExposure = change(next.endocrine.cortisolExposure, effect);
        else if (effect.target === 'endocrine.catecholamineExposure') next.endocrine.catecholamineExposure = change(next.endocrine.catecholamineExposure, effect);
        else if (effect.target === 'organs.liver.perfusion') next.organs.liver.perfusion = change(next.organs.liver.perfusion, effect);
        else if (effect.target === 'organs.liver.oxygenation') next.organs.liver.oxygenation = change(next.organs.liver.oxygenation, effect);
        else if (effect.target === 'organs.liver.damage') next.organs.liver.damage = change(next.organs.liver.damage, effect);
        else if (effect.target === 'organs.liver.functionality') next.organs.liver.functionality = change(next.organs.liver.functionality, effect);
        else if (effect.target === 'organs.brain.perfusion') next.organs.brain.perfusion = change(next.organs.brain.perfusion, effect);
        else if (effect.target === 'organs.brain.oxygenation') next.organs.brain.oxygenation = change(next.organs.brain.oxygenation, effect);
        else if (effect.target === 'organs.brain.damage') next.organs.brain.damage = change(next.organs.brain.damage, effect);
        else if (effect.target === 'organs.brain.functionality') next.organs.brain.functionality = change(next.organs.brain.functionality, effect);
        else if (effect.target === 'organs.muscles.perfusion') next.organs.muscles.perfusion = change(next.organs.muscles.perfusion, effect);
        else if (effect.target === 'organs.muscles.oxygenation') next.organs.muscles.oxygenation = change(next.organs.muscles.oxygenation, effect);
        else if (effect.target === 'organs.muscles.damage') next.organs.muscles.damage = change(next.organs.muscles.damage, effect);
        else if (effect.target === 'organs.muscles.functionality') next.organs.muscles.functionality = change(next.organs.muscles.functionality, effect);
        else if (effect.target === 'body.temperature') next.bodyTemperature = change(next.bodyTemperature, effect);
    }

    next.energy.atpPool = clamp(next.energy.atpPool, 0, next.energy.maxATP);
    next.energy.energyDeficit = clamp(next.energy.energyDeficit, 0, 100);
    next.energy.lactateLevel = clamp(next.energy.lactateLevel, .4, 20);
    next.nutrients.bloodGlucose = clamp(next.nutrients.bloodGlucose, 20, 400);
    next.nutrients.hydration = clamp(next.nutrients.hydration, 28, 55);
    next.nutrients.sodium = clamp(next.nutrients.sodium, 120, 165);
    next.nutrients.potassium = clamp(next.nutrients.potassium, 2, 8);
    next.nutrients.ketones = clamp(next.nutrients.ketones, .1, 15);
    next.nutrients.hoursSinceMeal = clamp(next.nutrients.hoursSinceMeal, 0, 48);
    next.nutrients.fedState = next.nutrients.hoursSinceMeal < 6;
    next.allostaticLoad.currentLoad = clamp(next.allostaticLoad.currentLoad, 0, 100);
    next.allostaticLoad.inflammationLevel = clamp(next.allostaticLoad.inflammationLevel, 0, 100);
    next.allostaticLoad.oxidativeStress = clamp(next.allostaticLoad.oxidativeStress, 0, 100);
    next.pathophysiology.infectionSeverity = clamp(next.pathophysiology.infectionSeverity, 0, 100);
    next.pathophysiology.capillaryLeak = clamp(next.pathophysiology.capillaryLeak, 0, .55);
    next.cardiovascular.heartRate = clamp(next.cardiovascular.heartRate, 20, 260);
    next.cardiovascular.heartRateVariability = clamp(next.cardiovascular.heartRateVariability, 0, 200);
    next.cardiovascular.systolicBP = clamp(next.cardiovascular.systolicBP, 35, 260);
    next.cardiovascular.diastolicBP = clamp(next.cardiovascular.diastolicBP, 20, 160);
    next.cardiovascular.meanArterialPressure = clamp(next.cardiovascular.meanArterialPressure, 30, 180);
    next.cardiovascular.cardiacOutput = clamp(next.cardiovascular.cardiacOutput, 1, 30);
    next.cardiovascular.strokeVolume = clamp(next.cardiovascular.strokeVolume, 20, 180);
    next.cardiovascular.systemicVascularResistance = clamp(next.cardiovascular.systemicVascularResistance, 200, 3000);
    next.cardiovascular.perfusionIndex = clamp(next.cardiovascular.perfusionIndex, 5, 160);
    next.respiratory.respiratoryRate = clamp(next.respiratory.respiratoryRate, 3, 60);
    next.respiratory.pao2 = clamp(next.respiratory.pao2, 25, 180);
    next.respiratory.paco2 = clamp(next.respiratory.paco2, 20, 100);
    next.respiratory.spo2 = clamp(next.respiratory.spo2, 50, 100);
    next.respiratory.tidalVolume = clamp(next.respiratory.tidalVolume, 100, 1500);
    next.respiratory.minuteVentilation = clamp(next.respiratory.minuteVentilation, 1, 45);
    next.acidBase.pH = clamp(next.acidBase.pH, 6.7, 7.7);
    next.acidBase.bicarbonate = clamp(next.acidBase.bicarbonate, 4, 50);
    next.acidBase.baseExcess = clamp(next.acidBase.baseExcess, -30, 30);
    next.acidBase.anionGap = clamp(next.acidBase.anionGap, 2, 45);
    next.renal.gfr = clamp(next.renal.gfr, 0, 180);
    next.renal.adhActivity = clamp(next.renal.adhActivity, 0, 100);
    next.hormones.insulin = clamp(next.hormones.insulin, .1, 300);
    next.hormones.glucagon = clamp(next.hormones.glucagon, 0, 500);
    next.hormones.adrenaline = clamp(next.hormones.adrenaline, 0, 2000);
    next.hormones.cortisol = clamp(next.hormones.cortisol, 0, 100);
    next.endocrine.hpaDrive = clamp(next.endocrine.hpaDrive, 0, 1);
    next.endocrine.sympatheticDrive = clamp(next.endocrine.sympatheticDrive, 0, 1);
    next.endocrine.cortisolExposure = clamp(next.endocrine.cortisolExposure, 0, 100);
    next.endocrine.catecholamineExposure = clamp(next.endocrine.catecholamineExposure, 0, 100);
    for (const organ of [next.organs.liver, next.organs.brain, next.organs.muscles]) {
        organ.perfusion = clamp(organ.perfusion, 0, 140);
        organ.oxygenation = clamp(organ.oxygenation, 0, 100);
        organ.damage = clamp(organ.damage, 0, 100);
        organ.functionality = clamp(organ.functionality, 0, 100);
    }
    next.bodyTemperature = clamp(next.bodyTemperature, 34, 42.5);
    return next;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
