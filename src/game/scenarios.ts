import type {
    CellularRoutineChoice,
    CellularRoutineEvent,
    CellularState,
    DecisionResource,
    DecisionSignalId,
    RoutineDecisionOutcome,
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
    outcome: RoutineDecisionOutcome;
    result: string;
    cellularEffects: ScenarioEffect[];
    physiologyEffects: ScenarioPhysiologyEffect[];
}

export interface ScenarioDefinition {
    id: string;
    title: string;
    description: string;
    explanation: string;
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

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
    {
        id: 'stair-climb',
        title: 'Subida inesperada de escadas',
        description: 'A demanda muscular subiu abruptamente e começou a consumir ATP e O₂ mais rápido do que no repouso.',
        explanation: 'O evento impõe exercício intenso. A resposta precisa coordenar perfusão, ventilação e uma mistura de fluxos oxidativos e glicolíticos compatível com a demanda.',
        contextSummary: 'Exercício 78% · estresse 42% · oferta nutricional basal',
        context: { exercise: 78, nutrition: 80, stress: 42, sleep: 80, temperature: 23 },
        category: 'organ', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['heartRate', 'respiratoryRate', 'spo2', 'tissueOxygen', 'tissueLactate', 'cellularAtp'],
        priorityMetricKeys: ['heartRate', 'respiratoryRate', 'spo2', 'tissueOxygen', 'tissueLactate', 'cellularAtp'],
        choices: [
            {
                id: 'stair-aerobic', label: 'Coordenar ventilação e via aeróbia',
                description: 'Aumenta a entrega de O₂ e direciona piruvato à mitocôndria.',
                tradeoff: 'Resposta mais eficiente, dependente de perfusão e reserva oxidativa.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .15 }, { resource: 'oxygen', minimum: 1, cost: 1 }],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Reforçar o quimiorreflexo ventilatório' }],
                outcome: 'adaptive', result: 'A entrega de O₂ acompanhou a demanda; o déficit e o lactato recuaram.',
                cellularEffects: [{ target: 'cell.atp', delta: .5 }, { target: 'tissue.lactate', delta: -.7 }, { target: 'damage.oxidative', delta: -1 }],
                physiologyEffects: [{ target: 'energy.atp', delta: .35 }, { target: 'energy.deficit', delta: -4 }, { target: 'energy.lactate', delta: -.8 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'stair-glycolytic', label: 'Forçar descarga adrenérgica sem ampliar entrega',
                description: 'Eleva a demanda e a mobilização de substratos sem coordenar perfusão e ventilação.',
                tradeoff: 'Resposta rápida, mas com maior descompasso entre demanda, entrega e remoção de metabólitos.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'A demanda foi mascarada por pouco tempo; lactato, ROS e déficit energético aumentaram.',
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
        description: 'Uma refeição rica em carboidratos elevou a glicose e aumentou a pressão sobre o controle redox.',
        explanation: 'O evento cria o estado alimentado. Insulina e armazenamento reduzem a glicemia; glucagon no mesmo contexto soma sinais contraditórios e agrava a hiperglicemia.',
        contextSummary: 'Refeição recente · nutrição 100% · glicose em ascensão',
        context: { exercise: 5, nutrition: 100, stress: 24, sleep: 80, temperature: 22 },
        category: 'molecule', severity: 'warning', durationSeconds: 30, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['bloodGlucose', 'cellularAtp', 'ros', 'bloodLactate', 'arterialPH'],
        priorityMetricKeys: ['bloodGlucose', 'cellularAtp', 'ros', 'bloodLactate', 'arterialPH'],
        choices: [
            {
                id: 'meal-insulin', label: 'Favorecer insulina e armazenamento',
                description: 'Aumenta captação periférica e síntese de glicogênio.',
                tradeoff: 'Consome ATP, mas reduz glicose e pressão oxidativa.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .25 }],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                outcome: 'adaptive', result: 'A glicose foi captada e armazenada; o eixo insulina/glucagon retornou ao equilíbrio pós-prandial.',
                cellularEffects: [{ target: 'tissue.glucose', delta: -.8 }, { target: 'damage.oxidative', delta: -3 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -16 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'meal-glucagon', label: 'Liberar glucagon para elevar a oferta',
                description: 'Mobiliza glicogênio hepático apesar da glicose já elevada.',
                tradeoff: 'Aumenta substrato circulante e a carga osmótica.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Liberar glucagon' }],
                outcome: 'harmful', result: 'O glucagon somou produção hepática à refeição; hiperglicemia e estresse oxidativo pioraram.',
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
        description: 'Após muitas horas sem alimentação, a glicose disponível caiu e o organismo precisa mudar de combustível.',
        explanation: 'No jejum, glucagon e oxidação de ácidos graxos preservam glicose. Insulina adicional bloqueia a compensação e pode precipitar hipoglicemia.',
        contextSummary: '12 h de jejum · nutrição 15% · estresse contrarregulatório moderado',
        context: { exercise: 8, nutrition: 15, stress: 35, sleep: 70, temperature: 21 },
        category: 'molecule', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['bloodGlucose', 'cellularAtp', 'tissueOxygen', 'bloodLactate', 'arterialPH'],
        priorityMetricKeys: ['bloodGlucose', 'cellularAtp', 'tissueOxygen', 'bloodLactate', 'arterialPH'],
        choices: [
            {
                id: 'fast-fat', label: 'Mobilizar glucagon e oxidar gordura',
                description: 'Preserva glicose e desloca a produção de ATP para ácidos graxos.',
                tradeoff: 'Exige O₂ e eleva discretamente a produção fisiológica de cetonas.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .1 }, { resource: 'fattyAcid', minimum: .5, cost: .5 }, { resource: 'oxygen', minimum: 1, cost: 1 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon', 'hormone:release-adrenaline'], label: 'Mobilizar glucagon ou adrenalina' }],
                outcome: 'adaptive', result: 'A troca de combustível sustentou ATP e preservou a glicemia dentro da faixa funcional.',
                cellularEffects: [{ target: 'available.fattyAcid', delta: 1 }, { target: 'cell.atp', delta: .5 }, { target: 'damage.oxidative', delta: 1 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 5 }, { target: 'nutrients.ketones', delta: .2 }, { target: 'energy.deficit', delta: -4 }],
            },
            {
                id: 'fast-insulin', label: 'Liberar insulina e bloquear mobilização',
                description: 'Aumenta a retirada de glicose apesar da baixa oferta alimentar.',
                tradeoff: 'Inibe lipólise, mas remove o principal combustível circulante.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                outcome: 'harmful', result: 'A insulina sem aporte alimentar aprofundou a hipoglicemia e o déficit energético.',
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
        description: 'Uma carga mecânica inesperada danificou proteínas estruturais e iniciou inflamação local.',
        explanation: 'Uma inflamação local proporcional recruta reparo; o problema é sua amplificação ou persistência. ATP e aminoácidos sustentam a reconstrução estrutural.',
        contextSummary: 'Esforço excêntrico 72% · estresse 38% · demanda de reparo elevada',
        context: { exercise: 72, nutrition: 75, stress: 38, sleep: 75, temperature: 22 },
        category: 'cell', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['inflammation', 'cellularAtp', 'ros', 'proteinDamage', 'temperature'],
        priorityMetricKeys: ['inflammation', 'cellularAtp', 'ros', 'proteinDamage', 'temperature'],
        choices: [
            {
                id: 'injury-repair', label: 'Orquestrar inflamação local e reparo',
                description: 'Mantém o sinal inflamatório proporcional e direciona aminoácidos e ATP à renovação estrutural.',
                tradeoff: 'Reduz ATP transitório, protegendo a viabilidade futura.',
                requirements: [{ resource: 'atp', minimum: 1.55, cost: .55 }, { resource: 'aminoAcid', minimum: .5, cost: .5 }],
                signalRequirements: [{ anyOf: ['hormone:boost-mtor', 'hormone:release-gh'], label: 'Ativar mTOR ou eixo GH' }],
                outcome: 'adaptive', result: 'O reparo conteve o dano estrutural e reduziu o sinal inflamatório.',
                cellularEffects: [{ target: 'damage.proteins', delta: -9 }, { target: 'damage.membrane', delta: -2 }],
                physiologyEffects: [{ target: 'allostatic.inflammation', delta: -2 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'injury-defer', label: 'Manter esforço e adiar reparo',
                description: 'Preserva energia para continuar a atividade.',
                tradeoff: 'Proteínas lesadas permanecem ativas e amplificam inflamação.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol para sustentar a carga' }],
                outcome: 'harmful', result: 'A carga continuou sobre proteínas danificadas; inflamação e perda de viabilidade aumentaram.',
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
        description: 'Um foco infeccioso ativou a imunidade e elevou ROS, temperatura e consumo energético.',
        explanation: 'A resposta precisa ser proporcional e acompanhada de defesa antioxidante. Imunossupressão precoce permite progressão; uma descarga indiscriminada também lesa tecido.',
        contextSummary: 'Infecção aguda · estresse 76% · sono prejudicado · febre em formação',
        context: { exercise: 4, nutrition: 65, stress: 76, sleep: 35, temperature: 25 },
        category: 'cell', severity: 'critical', durationSeconds: 26, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['infection', 'temperature', 'inflammation', 'ros', 'cellularAtp'],
        priorityMetricKeys: ['infection', 'temperature', 'inflammation', 'ros', 'cellularAtp'],
        choices: [
            {
                id: 'immune-control', label: 'Sustentar defesa proporcional e antioxidantes',
                description: 'Mantém resposta imune com contenção de ROS.',
                tradeoff: 'Consome ATP, mas protege membranas e proteínas.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .4 }, { resource: 'antioxidants', minimum: 35, cost: 8 }],
                outcome: 'adaptive', result: 'A resposta conteve o foco sem ampliar o dano oxidativo; febre e inflamação começaram a recuar.',
                cellularEffects: [{ target: 'damage.oxidative', delta: -8 }, { target: 'damage.proteins', delta: -2 }],
                physiologyEffects: [{ target: 'pathophysiology.infection', delta: -12 }, { target: 'allostatic.inflammation', delta: -9 }, { target: 'body.temperature', delta: -.35 }],
            },
            {
                id: 'immune-suppress', label: 'Suprimir intensamente com cortisol',
                description: 'Reduz sinais inflamatórios antes de controlar o agente.',
                tradeoff: 'Alivia sintomas, mas enfraquece contenção imune e eleva glicose.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }],
                outcome: 'harmful', result: 'A inflamação aparente caiu, mas o foco infeccioso progrediu e aumentou a carga sistêmica.',
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
        description: 'A temperatura ambiente elevou suor e osmolaridade, reduzindo o volume celular e a perfusão.',
        explanation: 'Conservar água precisa ser combinado com dissipação térmica. Aumentar atividade ou catecolaminas soma produção de calor e perda hídrica ao evento.',
        contextSummary: 'Ambiente 39 °C · estresse 55% · exercício leve · perda hídrica acelerada',
        context: { exercise: 18, nutrition: 75, stress: 55, sleep: 72, temperature: 39 },
        category: 'organ', severity: 'critical', durationSeconds: 26, cooldownSeconds: 180, difficulty: 'easy',
        metricKeys: ['temperature', 'hydration', 'meanArterialPressure', 'heartRate', 'cellVolume'],
        priorityMetricKeys: ['temperature', 'hydration', 'meanArterialPressure', 'heartRate', 'cellVolume'],
        choices: [
            {
                id: 'heat-conserve', label: 'Conservar água e dissipar calor',
                description: 'Reduz atividade, favorece retenção renal e dissipação térmica; água ingerida ainda precisa ser absorvida.',
                tradeoff: 'Contém perdas, mas não cria água corporal e exige reposição quando disponível.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .4 }],
                signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Ativar osmorreceptores e ADH' }],
                outcome: 'adaptive', result: 'A perda hídrica foi contida; osmolaridade, volume celular e temperatura caminharam ao basal.',
                cellularEffects: [{ target: 'cell.volume', delta: 5 }, { target: 'tissue.osmolarity', delta: -5 }, { target: 'damage.membrane', delta: -3 }],
                physiologyEffects: [{ target: 'body.temperature', delta: -.45 }, { target: 'allostatic.load', delta: -4 }],
            },
            {
                id: 'heat-adrenaline', label: 'Aumentar atividade e adrenalina',
                description: 'Eleva débito e produção energética sem corrigir a perda de água.',
                tradeoff: 'Gera mais calor, suor e consumo de ATP.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'A produção de calor e o suor aumentaram; desidratação, osmolaridade e dano de membrana pioraram.',
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
        explanation: 'A compensação aguda depende de descarga simpática, aumento de tônus vascular e suporte cronotrópico. Aumentar influência vagal prolonga a hipoperfusão.',
        contextSummary: 'Mudança postural · PAM e perfusão em queda · demanda autonômica imediata',
        context: { exercise: 12, nutrition: 75, stress: 58, sleep: 72, temperature: 22 },
        category: 'organ', severity: 'critical', durationSeconds: 24, cooldownSeconds: 240, difficulty: 'easy',
        metricKeys: ['meanArterialPressure', 'perfusionIndex', 'heartRate', 'tissueOxygen', 'bloodLactate'],
        priorityMetricKeys: ['meanArterialPressure', 'perfusionIndex', 'heartRate', 'tissueOxygen', 'bloodLactate'],
        choices: [
            {
                id: 'orthostasis-sympathetic', label: 'Recrutar barorreflexo simpático',
                description: 'Aumenta tônus vascular e suporte cardíaco para restaurar a perfusão.',
                tradeoff: 'Compensação rápida com custo autonômico e energético transitório.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .1 }],
                signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar resposta simpática' }],
                outcome: 'adaptive', result: 'O barorreflexo restaurou pressão e perfusão sem manter uma descarga excessiva.',
                cellularEffects: [{ target: 'cell.atp', delta: .2 }, { target: 'tissue.lactate', delta: -.25 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 9 }, { target: 'cardiovascular.perfusion', delta: 13 }, { target: 'energy.deficit', delta: -2 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'orthostasis-vagal', label: 'Favorecer influência vagal durante a queda',
                description: 'Reduz o suporte cronotrópico enquanto o retorno venoso ainda está comprometido.',
                tradeoff: 'Poupa ativação simpática, mas pode aprofundar hipoperfusão e síncope.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Favorecer recuperação parassimpática' }],
                outcome: 'harmful', result: 'A resposta vagal precoce prolongou a hipotensão e aumentou o déficit de perfusão.',
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
        description: 'Uma redução abrupta da ventilação alveolar elevou PaCO₂ e começou a deslocar o pH para acidemia respiratória.',
        explanation: 'Quimiorreceptores centrais e periféricos devem ampliar a ventilação. Catecolaminas sem correção ventilatória elevam demanda e risco arrítmico na acidemia.',
        contextSummary: 'PaCO₂ em elevação · pH em queda · oxigenação sob pressão',
        context: { exercise: 6, nutrition: 70, stress: 64, sleep: 52, temperature: 23 },
        category: 'organ', severity: 'critical', durationSeconds: 24, cooldownSeconds: 240, difficulty: 'easy',
        metricKeys: ['paco2', 'arterialPH', 'respiratoryRate', 'spo2', 'bloodLactate'],
        priorityMetricKeys: ['paco2', 'arterialPH', 'respiratoryRate', 'spo2', 'bloodLactate'],
        choices: [
            {
                id: 'hypercapnia-chemoreflex', label: 'Reforçar quimiorreflexo ventilatório',
                description: 'Amplia o drive ventilatório em resposta a CO₂ e H⁺.',
                tradeoff: 'Eleva trabalho respiratório, mas corrige a causa gasométrica.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .15 }],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Reforçar resposta quimiorreflexa' }],
                outcome: 'adaptive', result: 'A ventilação aumentou, PaCO₂ recuou e o pH caminhou para compensação.',
                cellularEffects: [{ target: 'tissue.lactate', delta: -.35 }, { target: 'cell.atp', delta: .15 }],
                physiologyEffects: [{ target: 'respiratory.paco2', delta: -10 }, { target: 'respiratory.spo2', delta: 1.5 }, { target: 'acidBase.pH', delta: .05 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'hypercapnia-catecholamine', label: 'Compensar apenas com descarga adrenérgica',
                description: 'Eleva débito e mobilização energética sem remover o CO₂ acumulado.',
                tradeoff: 'Aumenta demanda miocárdica em ambiente acidótico.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'A descarga adrenérgica elevou a demanda sem corrigir a hipoventilação; acidemia e lactato pioraram.',
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
        explanation: 'A queda de osmolaridade deve suprimir ADH e permitir excreção de água livre. Reter água nesse contexto amplia a hiponatremia dilucional.',
        contextSummary: 'Água corporal em alta · sódio diluído · necessidade de diurese aquosa',
        context: { exercise: 2, nutrition: 72, stress: 28, sleep: 78, temperature: 21 },
        category: 'molecule', severity: 'warning', durationSeconds: 28, cooldownSeconds: 260, difficulty: 'easy',
        metricKeys: ['plasmaSodium', 'hydration', 'cellVolume', 'meanArterialPressure'],
        priorityMetricKeys: ['plasmaSodium', 'hydration', 'cellVolume', 'meanArterialPressure'],
        choices: [
            {
                id: 'water-load-suppress-adh', label: 'Suprimir ADH e excretar água livre',
                description: 'Reduz reabsorção renal para recuperar osmolaridade e sódio.',
                tradeoff: 'Aumenta diurese e exige monitorar a correção do volume.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .08 }],
                signalRequirements: [{ anyOf: ['central:suppress-adh'], label: 'Suprimir sinal osmótico de ADH' }],
                outcome: 'adaptive', result: 'A diurese aquosa reduziu o excesso de volume e o sódio voltou em direção à faixa funcional.',
                cellularEffects: [{ target: 'cell.volume', delta: -3 }, { target: 'tissue.osmolarity', delta: 4 }, { target: 'damage.membrane', delta: -1 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: -.9 }, { target: 'nutrients.sodium', delta: 2.2 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'water-load-retain-adh', label: 'Conservar água por ativação de ADH',
                description: 'Mantém reabsorção renal apesar da osmolaridade já reduzida.',
                tradeoff: 'Preserva volume, mas aprofunda diluição do sódio e edema celular.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Ativar osmorreceptores e ADH' }],
                outcome: 'harmful', result: 'A retenção adicional ampliou hiponatremia dilucional e edema celular.',
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
        description: 'A glicose caiu durante um intervalo alimentar prolongado e o sistema nervoso precisa de contrarregulação rápida.',
        explanation: 'Glucagon e catecolaminas mobilizam glicogênio e produção hepática de glicose. Insulina adicional aprofunda a retirada do substrato circulante.',
        contextSummary: 'Sono interrompido · glicose em queda · contrarregulação necessária',
        context: { exercise: 1, nutrition: 8, stress: 68, sleep: 18, temperature: 21 },
        category: 'molecule', severity: 'critical', durationSeconds: 24, cooldownSeconds: 260, difficulty: 'easy',
        metricKeys: ['bloodGlucose', 'cellularAtp', 'heartRate', 'bloodLactate', 'arterialPH'],
        priorityMetricKeys: ['bloodGlucose', 'cellularAtp', 'heartRate', 'bloodLactate', 'arterialPH'],
        choices: [
            {
                id: 'hypoglycemia-counterregulate', label: 'Ativar contrarregulação hepática',
                description: 'Mobiliza glicogênio e sustenta glicose para tecidos dependentes.',
                tradeoff: 'Eleva carga adrenérgica ou cetogênica conforme o sinal escolhido.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .1 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon', 'hormone:release-adrenaline'], label: 'Liberar glucagon ou adrenalina' }],
                outcome: 'adaptive', result: 'A contrarregulação recuperou a oferta de glicose antes de ocorrer falência neuroglicopênica.',
                cellularEffects: [{ target: 'available.glucose', delta: 1.4 }, { target: 'cell.atp', delta: .35 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 14 }, { target: 'energy.deficit', delta: -5 }, { target: 'allostatic.load', delta: -2 }],
            },
            {
                id: 'hypoglycemia-insulin', label: 'Ampliar captação periférica com insulina',
                description: 'Retira mais glicose da circulação durante uma oferta já insuficiente.',
                tradeoff: 'Favorece armazenamento, mas agrava a neuroglicopenia.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                outcome: 'harmful', result: 'A insulina aprofundou a hipoglicemia e elevou o déficit energético sistêmico.',
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
        title: 'Desacoplamento mitocondrial progressivo',
        description: 'O consumo de O₂ e o fluxo eletrônico aceleraram, mas ATP e força próton-motriz caíram enquanto a temperatura começou a subir. A oxigenação arterial permanece preservada.',
        explanation: 'O padrão separa oferta de O₂ de utilização eficiente: acelerar ainda mais a CTE aumenta calor e pressão redox sem restaurar o acoplamento.',
        contextSummary: 'SpO₂ preservada · consumo mitocondrial alto · ΔΨ e rendimento de ATP divergentes',
        context: { exercise: 12, nutrition: 78, stress: 62, sleep: 66, temperature: 28 },
        category: 'cell', severity: 'critical', durationSeconds: 34, cooldownSeconds: 320, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['spo2', 'temperature', 'adrenaline', 't3', 'mtorActivity', 'cellularAtp', 'cellularAdp', 'nadh', 'mitochondrialPotential', 'etcFlux', 'atpSynthaseFlux', 'mitochondrialOxygenConsumption', 'mitochondrialHealth', 'ros', 'antioxidants'],
        choices: [
            {
                id: 'uncoupling-conserve-gradient', label: 'Reduzir demanda e sustentar defesa redox',
                description: 'Diminui o drive autonômico enquanto a reserva antioxidante contém a fuga eletrônica durante a depuração do agente.',
                tradeoff: 'Aceita menor entrega instantânea de potência para preservar membrana e acoplamento residual.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .18 }, { resource: 'antioxidants', minimum: 42, cost: 12 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir demanda autonômica' }],
                outcome: 'adaptive', result: 'A redução de demanda limitou calor e ROS; ΔΨ, ATP sintase e balanço ATP/ADP iniciaram recuperação.',
                cellularEffects: [{ target: 'mitochondria.membranePotential', delta: -24 }, { target: 'mitochondria.etcFlux', delta: -22 }, { target: 'mitochondria.atpSynthase', delta: 20 }, { target: 'mitochondria.oxygenConsumption', delta: -3.5 }, { target: 'cell.atp', delta: .75 }, { target: 'cell.nadh', delta: 8 }, { target: 'damage.oxidative', delta: -16 }, { target: 'mitochondria.health', delta: 5 }],
                physiologyEffects: [{ target: 'body.temperature', delta: -.55 }, { target: 'energy.deficit', delta: -8 }, { target: 'allostatic.load', delta: -5 }],
            },
            {
                id: 'uncoupling-maximize-oxygen', label: 'Maximizar ventilação e descarga adrenérgica',
                description: 'Eleva entrega, mobilização de combustível e velocidade da cadeia diante da queda de ATP.',
                tradeoff: 'Pode sustentar débito por alguns instantes às custas de maior fluxo e termogênese.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Ampliar ventilação' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'A oferta adicional alimentou uma cadeia já desacoplada; consumo de O₂, calor, ROS e dano de membrana aceleraram sem ganho proporcional de ATP.',
                cellularEffects: [{ target: 'mitochondria.etcFlux', delta: 24 }, { target: 'mitochondria.oxygenConsumption', delta: 5 }, { target: 'mitochondria.membranePotential', delta: 18 }, { target: 'cell.atp', delta: -.65 }, { target: 'damage.oxidative', delta: 19 }, { target: 'damage.membrane', delta: 8 }, { target: 'mitochondria.health', delta: -9 }],
                physiologyEffects: [{ target: 'body.temperature', delta: .9 }, { target: 'energy.deficit', delta: 11 }, { target: 'cardiovascular.heartRate', delta: 18 }, { target: 'allostatic.load', delta: 11 }],
            },
            {
                id: 'uncoupling-build-machinery', label: 'Priorizar reconstrução anabólica da maquinaria',
                description: 'Direciona sinal de crescimento para substituir proteínas mitocondriais enquanto o fluxo permanece elevado.',
                tradeoff: 'Consome energia e aminoácidos antes de estabilizar o gradiente eletroquímico.',
                requirements: [{ resource: 'aminoAcid', minimum: .3, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:boost-mtor', 'hormone:release-gh'], label: 'Ativar mTOR ou eixo GH' }],
                outcome: 'harmful', result: 'A síntese precoce desviou ATP do controle iônico; Ca²⁺, dano proteico e compromisso apoptótico aumentaram durante o desacoplamento.',
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
        title: 'Acidose de alto ânion gap com fadiga ventilatória',
        description: 'Glicose, cetonas e ânion gap subiram; bicarbonato e pH caíram. A frequência respiratória está alta, porém a PaCO₂ deixou de cair como seria esperado para a intensidade da acidemia.',
        explanation: 'Há produção contínua de cetoácidos e compensação respiratória insuficiente. Corrigir apenas um ramo mantém a outra fonte de H⁺ ativa ou permite retenção de CO₂.',
        contextSummary: 'Hiperglicemia hiperosmolar · cetose · compensação respiratória aquém do distúrbio metabólico',
        context: { exercise: 4, nutrition: 18, stress: 82, sleep: 32, temperature: 24 },
        category: 'organ', severity: 'critical', durationSeconds: 32, cooldownSeconds: 340, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'ketones', 'insulin', 'cortisol', 'arterialPH', 'bicarbonate', 'baseExcess', 'anionGap', 'paco2', 'respiratoryRate', 'plasmaPotassium', 'hydration', 'gfr', 'cellularAtp', 'cellPH'],
        choices: [
            {
                id: 'ketoacidosis-dual-control', label: 'Conter cetogênese e sustentar compensação ventilatória',
                description: 'Atua simultaneamente na produção metabólica de ácidos e na remoção respiratória de CO₂.',
                tradeoff: 'A insulina desloca K⁺ para a célula; a ventilação aumenta o custo muscular respiratório.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Sustentar quimiorreflexo ventilatório' }],
                outcome: 'adaptive', result: 'A produção de cetonas recuou sem perder a compensação; pH, bicarbonato, PaCO₂ e potássio convergiram gradualmente.',
                cellularEffects: [{ target: 'cell.pH', delta: .11 }, { target: 'cell.potassium', delta: 3 }, { target: 'cell.atp', delta: .55 }, { target: 'tissue.pH', delta: .09 }, { target: 'tissue.lactate', delta: -.8 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -48 }, { target: 'nutrients.ketones', delta: -2.2 }, { target: 'nutrients.potassium', delta: -.7 }, { target: 'respiratory.paco2', delta: -8 }, { target: 'acidBase.pH', delta: .11 }, { target: 'acidBase.bicarbonate', delta: 5 }, { target: 'acidBase.baseExcess', delta: 6 }, { target: 'acidBase.anionGap', delta: -8 }, { target: 'energy.deficit', delta: -7 }],
            },
            {
                id: 'ketoacidosis-metabolic-only', label: 'Priorizar bloqueio cetônico e reduzir esforço respiratório',
                description: 'Interrompe a formação de cetonas e poupa o trabalho muscular ventilatório para conservar ATP.',
                tradeoff: 'A retenção de CO₂ pode competir com a melhora metabólica inicial.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir demanda autonômica' }],
                outcome: 'harmful', result: 'A cetogênese diminuiu, mas a fadiga ventilatória reteve CO₂; a acidose tornou-se mista e o ATP celular continuou caindo.',
                cellularEffects: [{ target: 'cell.atp', delta: -.55 }, { target: 'cell.pH', delta: -.06 }, { target: 'tissue.carbonDioxide', delta: 9 }, { target: 'damage.oxidative', delta: 7 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -30 }, { target: 'nutrients.ketones', delta: -1 }, { target: 'respiratory.paco2', delta: 12 }, { target: 'acidBase.pH', delta: -.07 }, { target: 'acidBase.bicarbonate', delta: -3 }, { target: 'energy.deficit', delta: 8 }],
            },
            {
                id: 'ketoacidosis-stress-support', label: 'Sustentar pressão e ventilação com resposta de estresse',
                description: 'Preserva tônus e drive respiratório por glucocorticoide e quimiorreflexo antes de alterar o uso de combustível.',
                tradeoff: 'Mantém perfusão, mas também disponibiliza substrato hepático durante cetogênese ativa.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Sustentar quimiorreflexo ventilatório' }],
                outcome: 'harmful', result: 'A ventilação removeu parte do CO₂, porém cortisol e ausência de insulina mantiveram hiperglicemia, cetonas, osmolaridade e perda renal de água.',
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
        title: 'Choque distributivo com disfunção bioenergética',
        description: 'A PaO₂ e a SpO₂ ainda parecem adequadas, porém PAM, perfusão tecidual e ATP caíram enquanto lactato, inflamação, ROS e débito cardíaco subiram.',
        explanation: 'Oxigênio arterial normal não garante entrega microcirculatória nem utilização mitocondrial. A prioridade é restaurar tônus/perfusão sem suprimir precocemente a contenção imune.',
        contextSummary: 'Débito alto · resistência vascular baixa · hipoperfusão tecidual · disóxia apesar de oxigenação arterial',
        context: { exercise: 2, nutrition: 58, stress: 92, sleep: 24, temperature: 29 },
        category: 'organ', severity: 'critical', durationSeconds: 34, cooldownSeconds: 360, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['systolicBP', 'diastolicBP', 'meanArterialPressure', 'cardiacOutput', 'perfusionIndex', 'spo2', 'pao2', 'cortisol', 'adrenaline', 'bloodLactate', 'inflammation', 'infection', 'tissuePerfusion', 'tissueOxygen', 'cellularAtp', 'ros', 'mitochondrialHealth'],
        choices: [
            {
                id: 'dysoxia-restore-tone', label: 'Recrutar tônus com proteção microcirculatória',
                description: 'Usa resposta simpática central e reserva antioxidante para recuperar pressão de perfusão sem ampliar indiscriminadamente a demanda.',
                tradeoff: 'Aumenta pós-carga; o benefício depende de ainda haver reserva miocárdica e redox.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .18 }, { resource: 'antioxidants', minimum: 38, cost: 10 }],
                signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar suporte simpático central' }],
                outcome: 'adaptive', result: 'PAM e perfusão tecidual se recuperaram; lactato caiu e a mitocôndria voltou a converter oferta em ATP sem perder a contenção imune.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: 24 }, { target: 'tissue.oxygen', delta: 9 }, { target: 'tissue.lactate', delta: -1.8 }, { target: 'cell.atp', delta: .8 }, { target: 'damage.oxidative', delta: -11 }, { target: 'mitochondria.health', delta: 5 }, { target: 'mitochondria.atpSynthase', delta: 12 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 16 }, { target: 'cardiovascular.systolic', delta: 18 }, { target: 'cardiovascular.diastolic', delta: 11 }, { target: 'cardiovascular.perfusion', delta: 20 }, { target: 'energy.lactate', delta: -2.1 }, { target: 'allostatic.load', delta: -4 }],
            },
            {
                id: 'dysoxia-ventilate', label: 'Tratar a queda de ATP como insuficiência de oferta pulmonar',
                description: 'Aumenta ventilação e descarga adrenérgica para elevar transporte convectivo de O₂.',
                tradeoff: 'Melhora números respiratórios e débito, mas pode não recrutar a microcirculação distributiva.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Ampliar ventilação' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'SpO₂ e débito subiram, mas o shunt microcirculatório persistiu; demanda, lactato, ROS e lesão mitocondrial aumentaram.',
                cellularEffects: [{ target: 'tissue.oxygen', delta: -5 }, { target: 'tissue.lactate', delta: 2.2 }, { target: 'cell.atp', delta: -.6 }, { target: 'damage.oxidative', delta: 15 }, { target: 'mitochondria.health', delta: -8 }],
                physiologyEffects: [{ target: 'respiratory.spo2', delta: 1 }, { target: 'respiratory.pao2', delta: 5 }, { target: 'cardiovascular.cardiacOutput', delta: 1.4 }, { target: 'cardiovascular.heartRate', delta: 20 }, { target: 'energy.lactate', delta: 2.5 }, { target: 'energy.deficit', delta: 9 }],
            },
            {
                id: 'dysoxia-suppress-inflammation', label: 'Conter inflamação antes de restaurar perfusão',
                description: 'Usa glucocorticoide para reduzir vasoplegia inflamatória e custo imune sistêmico.',
                tradeoff: 'Pode preservar tônus, mas também reduz a capacidade de controlar o foco infeccioso.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }],
                outcome: 'harmful', result: 'A inflamação caiu transitoriamente, porém a carga infecciosa, o leak capilar e a disfunção mitocondrial progrediram; a perfusão voltou a deteriorar.',
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
        title: 'Paradoxo de reperfusão celular',
        description: 'Perfusão e PO₂ voltaram rapidamente, mas NADH, ΔΨ, Ca²⁺ e ROS dispararam. A ATP sintase não acompanhou o fluxo eletrônico e os marcadores de membrana, proteína e DNA começaram a divergir.',
        explanation: 'A reoxigenação abrupta de uma matriz altamente reduzida produz um pico de ROS e sobrecarga de Ca²⁺. Mais fluxo ou anabolismo precoce amplia dano antes de estabilizar o estado redox.',
        contextSummary: 'Oferta restaurada · matriz reduzida · hiperpolarização transitória · explosão oxidativa',
        context: { exercise: 35, nutrition: 72, stress: 88, sleep: 52, temperature: 23 },
        category: 'cell', severity: 'critical', durationSeconds: 30, cooldownSeconds: 340, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['tissuePerfusion', 'tissueOxygen', 'adrenaline', 'mtorActivity', 'cellCalcium', 'cellMembranePotential', 'cellularAtp', 'nadh', 'mitochondrialPotential', 'etcFlux', 'atpSynthaseFlux', 'mitochondrialOxygenConsumption', 'ros', 'antioxidants', 'membraneDamage', 'proteinDamage', 'dnaDamage', 'apoptoticCommitment'],
        choices: [
            {
                id: 'reperfusion-paced-redox', label: 'Modular fluxo e amortecer o pico redox',
                description: 'Reduz demanda autonômica, consome reserva antioxidante e permite que ATP sintase e bombas iônicas alcancem o fluxo de elétrons.',
                tradeoff: 'Recuperação energética mais lenta, com menor pressão sobre Ca²⁺ e macromoléculas.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .2 }, { resource: 'antioxidants', minimum: 35, cost: 14 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Modular demanda autonômica' }],
                outcome: 'adaptive', result: 'O pico de ROS foi amortecido; Ca²⁺, NADH e ΔΨ normalizaram sem perder a perfusão restaurada, reduzindo dano e compromisso apoptótico.',
                cellularEffects: [{ target: 'cell.calcium', delta: -210 }, { target: 'cell.nadh', delta: -20 }, { target: 'cell.membranePotential', delta: -10 }, { target: 'mitochondria.membranePotential', delta: 20 }, { target: 'mitochondria.etcFlux', delta: -22 }, { target: 'mitochondria.atpSynthase', delta: 18 }, { target: 'damage.oxidative', delta: -24 }, { target: 'damage.membrane', delta: -7 }, { target: 'damage.proteins', delta: -6 }, { target: 'damage.dna', delta: -4 }, { target: 'fate.apoptoticCommitment', delta: -8 }],
                physiologyEffects: [{ target: 'energy.deficit', delta: -6 }, { target: 'allostatic.load', delta: -5 }],
            },
            {
                id: 'reperfusion-max-flow', label: 'Explorar a oferta restaurada com fluxo máximo',
                description: 'Combina ventilação e catecolamina para converter imediatamente a nova oferta de O₂ em potência celular.',
                tradeoff: 'Pode recuperar ATP rápido se o gargalo ainda for entrega, mas aumenta pressão sobre a cadeia reduzida.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Ampliar ventilação' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'A cadeia hiper-reduzida recebeu mais fluxo; ROS, Ca²⁺, dano de DNA e compromisso apoptótico superaram o pequeno ganho transitório de ATP.',
                cellularEffects: [{ target: 'cell.atp', delta: .2 }, { target: 'cell.calcium', delta: 180 }, { target: 'mitochondria.etcFlux', delta: 24 }, { target: 'mitochondria.oxygenConsumption', delta: 4 }, { target: 'damage.oxidative', delta: 22 }, { target: 'damage.dna', delta: 9 }, { target: 'fate.apoptoticCommitment', delta: 16 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 18 }, { target: 'energy.deficit', delta: 8 }, { target: 'allostatic.load', delta: 11 }],
            },
            {
                id: 'reperfusion-early-repair', label: 'Iniciar síntese e reparo estrutural imediatamente',
                description: 'Ativa mTOR para substituir proteínas oxidadas enquanto perfusão e aminoácidos voltaram a ficar disponíveis.',
                tradeoff: 'Disputa ATP com bombas de Ca²⁺ e defesa redox durante a janela de reperfusão.',
                requirements: [{ resource: 'aminoAcid', minimum: .3, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:boost-mtor'], label: 'Ativar via mTOR' }],
                outcome: 'harmful', result: 'O reparo anabólico precoce consumiu ATP das bombas iônicas; Ca²⁺, dano de membrana e necrose secundária avançaram apesar do substrato disponível.',
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
        title: 'Conflito hiperosmolar com perda renal de água e K⁺ instável',
        description: 'Glicose e osmolaridade subiram junto com perda de água; sódio e K⁺ plasmáticos parecem altos, enquanto o K⁺ intracelular caiu e a membrana despolarizou. A filtração renal começou a recuar.',
        explanation: 'O valor plasmático de K⁺ mascara depleção corporal e saída transcelular. É preciso interromper a diurese osmótica e conservar volume, antecipando a mudança de K⁺ induzida pela insulina.',
        contextSummary: 'Hiperglicemia · hipovolemia hiperosmolar · K⁺ extracelular alto com reserva intracelular baixa',
        context: { exercise: 3, nutrition: 20, stress: 78, sleep: 38, temperature: 26 },
        category: 'molecule', severity: 'critical', durationSeconds: 32, cooldownSeconds: 360, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'insulin', 'glucagon', 'hydration', 'plasmaSodium', 'plasmaPotassium', 'gfr', 'adhActivity', 'tissueOsmolarity', 'cellOsmolarity', 'cellVolume', 'cellSodium', 'cellPotassium', 'cellMembranePotential', 'cellularAtp'],
        choices: [
            {
                id: 'hyperosmolar-source-volume', label: 'Interromper diurese osmótica e conservar volume',
                description: 'Combina redução da glicose com retenção hídrica regulada, observando a redistribuição de K⁺ para o intracelular.',
                tradeoff: 'Pode revelar rapidamente a depleção real de K⁺ e exige reserva energética para bombas iônicas.',
                requirements: [{ resource: 'atp', minimum: 1.35, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:adh-retention'], label: 'Ativar conservação renal de água' }],
                outcome: 'adaptive', result: 'Glicose e osmolaridade recuaram, o volume foi preservado e o deslocamento de K⁺ ocorreu com recuperação do potencial de membrana e da filtração.',
                cellularEffects: [{ target: 'cell.osmolarity', delta: -13 }, { target: 'cell.volume', delta: 7 }, { target: 'cell.sodium', delta: -4 }, { target: 'cell.potassium', delta: 8 }, { target: 'cell.membranePotential', delta: -10 }, { target: 'cell.atp', delta: .5 }, { target: 'tissue.osmolarity', delta: -14 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -62 }, { target: 'nutrients.hydration', delta: 1.8 }, { target: 'nutrients.sodium', delta: -3.5 }, { target: 'nutrients.potassium', delta: -.8 }, { target: 'renal.gfr', delta: 18 }, { target: 'renal.adh', delta: 12 }, { target: 'energy.deficit', delta: -6 }],
            },
            {
                id: 'hyperosmolar-insulin-diuresis', label: 'Corrigir glicose e liberar água livre',
                description: 'Usa insulina e reduz ADH para evitar queda rápida demais do sódio durante a correção osmótica.',
                tradeoff: 'Favorece excreção de água justamente quando o volume efetivo está reduzido.',
                requirements: [],
                signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:suppress-adh'], label: 'Suprimir ADH' }],
                outcome: 'harmful', result: 'A glicose caiu, mas a perda adicional de água reduziu perfusão e GFR; o deslocamento de K⁺ aprofundou a depleção intracelular e a instabilidade elétrica.',
                cellularEffects: [{ target: 'cell.potassium', delta: -7 }, { target: 'cell.membranePotential', delta: 15 }, { target: 'cell.atp', delta: -.65 }, { target: 'cell.volume', delta: -5 }, { target: 'damage.membrane', delta: 7 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -48 }, { target: 'nutrients.hydration', delta: -1.6 }, { target: 'cardiovascular.map', delta: -12 }, { target: 'cardiovascular.perfusion', delta: -15 }, { target: 'renal.gfr', delta: -16 }, { target: 'energy.deficit', delta: 9 }],
            },
            {
                id: 'hyperosmolar-volume-only', label: 'Preservar volume e mobilizar glicose hepática',
                description: 'Ativa ADH e glucagon para sustentar pressão e combustível enquanto a filtração renal se recupera.',
                tradeoff: 'Conserva água, mas pode manter o gradiente osmótico que produz a própria diurese.',
                requirements: [],
                signalRequirements: [{ anyOf: ['central:adh-retention'], label: 'Ativar conservação renal de água' }, { anyOf: ['hormone:release-glucagon'], label: 'Liberar glucagon' }],
                outcome: 'harmful', result: 'O volume estabilizou apenas por instantes; mais glicose sustentou diurese osmótica, hipernatremia, estresse redox e perda progressiva da função renal.',
                cellularEffects: [{ target: 'cell.osmolarity', delta: 11 }, { target: 'cell.volume', delta: -5 }, { target: 'damage.oxidative', delta: 12 }, { target: 'cell.atp', delta: -.55 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 42 }, { target: 'nutrients.sodium', delta: 3 }, { target: 'nutrients.hydration', delta: -.8 }, { target: 'renal.gfr', delta: -12 }, { target: 'allostatic.load', delta: 10 }],
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
        title: 'Sobrecarga hepática após whisky em jejum',
        description: 'Etanol monopoliza o estado redox hepático: NADH, lactato e ROS sobem enquanto glicogenólise e gliconeogênese deixam de garantir glicose ao cérebro.',
        explanation: 'A prioridade não é “acelerar” o organismo intoxicado. É preservar glicemia e ventilação, reduzir demanda e conter estresse redox enquanto o fígado metaboliza o etanol.',
        contextSummary: 'Exposição alcoólica · pouca ingestão · demanda hepática alta · risco neuroglicopênico',
        context: { exercise: 4, nutrition: 24, stress: 42, sleep: 35, temperature: 25 },
        category: 'organ', severity: 'critical', durationSeconds: 36, cooldownSeconds: 420, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'glucagon', 'insulin', 'bloodLactate', 'arterialPH', 'paco2', 'respiratoryRate', 'tissueGlucose', 'tissueLactate', 'cellularAtp', 'nadh', 'ros', 'antioxidants', 'mitochondrialPotential', 'etcFlux', 'atpSynthaseFlux', 'mitochondrialHealth'],
        choices: [
            {
                id: 'alcohol-preserve-glucose-redox', label: 'Poupar demanda e preservar glicose hepática',
                description: 'Favorece recuperação autonômica e usa glucagon sobre a reserva ainda disponível, sustentando defesa antioxidante.',
                tradeoff: 'Glicogênio é finito e a gliconeogênese continua limitada enquanto o etanol mantiver NADH alto.',
                requirements: [{ resource: 'antioxidants', minimum: 20, cost: 8 }, { resource: 'atp', minimum: 1.4, cost: .2 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir demanda autonômica' }, { anyOf: ['hormone:release-glucagon'], label: 'Mobilizar glicogênio hepático' }],
                outcome: 'adaptive', result: 'A demanda caiu, a glicose foi sustentada pela reserva disponível e a contenção de ROS preservou fígado, cérebro e acoplamento mitocondrial.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1.2 }, { target: 'tissue.lactate', delta: -1.3 }, { target: 'cell.atp', delta: .55 }, { target: 'cell.nadh', delta: -18 }, { target: 'damage.oxidative', delta: -16 }, { target: 'damage.antioxidants', delta: 6 }, { target: 'mitochondria.health', delta: 5 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 18 }, { target: 'energy.lactate', delta: -1.2 }, { target: 'energy.deficit', delta: -7 }, { target: 'cardiovascular.heartRate', delta: -7 }, { target: 'allostatic.oxidative', delta: -13 }, { target: 'organs.liver.functionality', delta: 5 }, { target: 'organs.brain.functionality', delta: 3 }],
            },
            {
                id: 'alcohol-insulin-storage', label: 'Liberar insulina para retirar glicose do sangue',
                description: 'Interpreta a chegada de bebidas calóricas como estado alimentado e tenta armazenar substrato.',
                tradeoff: 'A glicose circulante já é a reserva crítica e o fígado não consegue repô-la normalmente.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                outcome: 'harmful', result: 'A captação periférica aprofundou a hipoglicemia; ATP e função cerebral caíram apesar da aparente redução da glicose tecidual.',
                cellularEffects: [{ target: 'tissue.glucose', delta: -1.5 }, { target: 'cell.atp', delta: -.7 }, { target: 'cell.viability', delta: -5 }, { target: 'fate.apoptoticCommitment', delta: 7 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -22 }, { target: 'energy.deficit', delta: 10 }, { target: 'organs.brain.functionality', delta: -12 }, { target: 'allostatic.load', delta: 8 }],
            },
            {
                id: 'alcohol-adrenergic-mask', label: 'Mascarar sonolência com descarga adrenérgica',
                description: 'Aumenta alerta, frequência cardíaca e ventilação para manter o humano desperto.',
                tradeoff: 'Eleva consumo de O₂ e glicose sem corrigir o bloqueio redox hepático.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Aumentar ventilação' }],
                outcome: 'harmful', result: 'O alerta transitório cobrou mais ATP, acelerou lactato e ROS e ocultou a piora metabólica até a reserva cerebral diminuir.',
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
        title: 'Hipoglicemia e hipoventilação horas após a festa',
        description: 'Durante o sono, glicose e ventilação caíram juntas; a SpO₂ pode atrasar, mas PaCO₂, ATP e função cerebral já se deterioram.',
        explanation: 'A continuação combina neuroglicopenia com depressão ventilatória. Corrigir apenas uma escala deixa a outra progredir.',
        contextSummary: 'Pós-álcool · sono · glicogênio curto · hipoglicemia + retenção de CO₂',
        context: { exercise: 0, nutrition: 12, stress: 52, sleep: 82, temperature: 23 },
        category: 'organ', severity: 'critical', durationSeconds: 30, cooldownSeconds: 480, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'paco2', 'spo2', 'respiratoryRate', 'arterialPH', 'bloodLactate', 'glucagon', 'tissueGlucose', 'tissueCarbonDioxide', 'tissueOxygen', 'cellularAtp', 'nadh', 'ros', 'mitochondrialPotential', 'atpSynthaseFlux', 'mitochondrialHealth'],
        choices: [
            {
                id: 'alcohol-night-dual-rescue', label: 'Sustentar glicose e restaurar drive ventilatório',
                description: 'Mobiliza a reserva hepática remanescente e responde ao CO₂ enquanto protege a célula com substrato imediato.',
                tradeoff: 'O glucagon perde potência quando o glicogênio acaba; a resposta depende de combustível já captado.',
                requirements: [{ resource: 'glucose', minimum: .4, cost: .25 }, { resource: 'oxygen', minimum: 1, cost: .4 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Sustentar glicose' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Restaurar ventilação' }],
                outcome: 'adaptive', result: 'Glicose, eliminação de CO₂ e ATP se recuperaram em conjunto; a função cerebral saiu da trajetória de coma.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1.4 }, { target: 'tissue.carbonDioxide', delta: -8 }, { target: 'tissue.oxygen', delta: 8 }, { target: 'cell.atp', delta: .7 }, { target: 'cell.nadh', delta: -13 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 24 }, { target: 'respiratory.rate', delta: 5 }, { target: 'respiratory.paco2', delta: -9 }, { target: 'respiratory.spo2', delta: 2 }, { target: 'acidBase.pH', delta: .05 }, { target: 'energy.deficit', delta: -10 }, { target: 'organs.brain.functionality', delta: 9 }],
            },
            {
                id: 'alcohol-night-adrenaline', label: 'Forçar despertar com simpático e adrenalina',
                description: 'Usa resposta de luta ou fuga como marcador de segurança neurológica.',
                tradeoff: 'O despertar não repõe glicose nem remove de forma sustentável a carga hepática.',
                requirements: [], signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar simpático' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'A consciência oscilou enquanto demanda cerebral e cardíaca consumiram a glicose restante; lactato e ROS subiram.',
                cellularEffects: [{ target: 'cell.atp', delta: -.75 }, { target: 'damage.oxidative', delta: 13 }, { target: 'tissue.lactate', delta: 1.1 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 22 }, { target: 'nutrients.glucose', delta: -12 }, { target: 'energy.lactate', delta: 1.5 }, { target: 'energy.deficit', delta: 10 }, { target: 'organs.brain.functionality', delta: -8 }],
            },
            {
                id: 'alcohol-night-insulin-sedation', label: 'Reduzir glicose e favorecer repouso vagal',
                description: 'Tenta “normalizar” o metabolismo calórico e interpreta a sonolência como simples necessidade de recuperação.',
                tradeoff: 'Retira glicose e tônus compensatório sem corrigir a retenção de CO₂ que causa a depressão neurológica.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }, { anyOf: ['central:parasympathetic-recovery'], label: 'Favorecer repouso vagal' }],
                outcome: 'harmful', result: 'Hipoglicemia, baixo débito e hipercapnia convergiram; ATP cerebral e viabilidade celular caíram rapidamente.',
                cellularEffects: [{ target: 'tissue.glucose', delta: -1.3 }, { target: 'tissue.carbonDioxide', delta: 8 }, { target: 'cell.pH', delta: -.07 }, { target: 'cell.atp', delta: -1 }, { target: 'cell.viability', delta: -9 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -20 }, { target: 'respiratory.rate', delta: -5 }, { target: 'respiratory.paco2', delta: 10 }, { target: 'acidBase.pH', delta: -.06 }, { target: 'organs.brain.functionality', delta: -14 }],
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
        title: 'Treino em jejum com mobilização de ácidos graxos',
        description: 'A lipólise aumentou ácidos graxos livres, mas isso não garante ATP: O₂, transporte, beta-oxidação e glicose para fluxos rápidos ainda precisam convergir.',
        explanation: 'O evento exige diferenciar disponibilidade de gordura de capacidade de oxidá-la durante demanda alta. Excesso de catecolamina pode piorar a discrepância.',
        contextSummary: 'Treino intenso · 12 h de jejum · AGL altos · glicose e ATP caindo',
        context: { exercise: 86, nutrition: 18, stress: 58, sleep: 65, temperature: 24 },
        category: 'molecule', severity: 'critical', durationSeconds: 32, cooldownSeconds: 390, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['bloodGlucose', 'ketones', 'glucagon', 'adrenaline', 'heartRate', 'meanArterialPressure', 'tissuePerfusion', 'tissueOxygen', 'tissueLactate', 'cellularAtp', 'availableFattyAcid', 'capturedFattyAcid', 'fattyAcidFlux', 'oxygenFlux', 'nadh', 'ros', 'mitochondrialPotential', 'atpSynthaseFlux'],
        choices: [
            {
                id: 'fasted-workout-mixed-fuel', label: 'Mobilizar glicose e casar gordura com O₂',
                description: 'Usa glucagon para preservar glicemia e reforça ventilação, permitindo oxidação lipídica sem abandonar o fluxo rápido de glicose.',
                tradeoff: 'A beta-oxidação rende ATP, mas cobra mais O₂ e não substitui instantaneamente a glicólise no pico de esforço.',
                requirements: [{ resource: 'fattyAcid', minimum: .45, cost: .3 }, { resource: 'oxygen', minimum: 1.2, cost: .6 }, { resource: 'atp', minimum: 1.3, cost: .2 }],
                signalRequirements: [{ anyOf: ['hormone:release-glucagon'], label: 'Preservar glicemia' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Casar oferta de O₂' }],
                outcome: 'adaptive', result: 'Glicose, O₂ e AGL foram usados em proporção compatível; ATP e perfusão se recuperaram sem um pico desnecessário de ROS.',
                cellularEffects: [{ target: 'tissue.glucose', delta: .9 }, { target: 'tissue.oxygen', delta: 7 }, { target: 'tissue.lactate', delta: -1.1 }, { target: 'cell.atp', delta: .75 }, { target: 'processing.fattyAcid', delta: 2 }, { target: 'processing.oxygen', delta: 2.4 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 16 }, { target: 'nutrients.ketones', delta: .4 }, { target: 'energy.deficit', delta: -9 }, { target: 'energy.lactate', delta: -1 }, { target: 'respiratory.rate', delta: 4 }, { target: 'cardiovascular.perfusion', delta: 8 }, { target: 'organs.muscles.oxygenation', delta: 8 }],
            },
            {
                id: 'fasted-workout-insulin', label: 'Liberar insulina para acelerar GLUT4',
                description: 'Aumenta captação muscular de glicose em plena queda glicêmica.',
                tradeoff: 'O músculo melhora a entrada por instantes retirando combustível que o cérebro não consegue substituir.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-insulin'], label: 'Liberar insulina' }],
                outcome: 'harmful', result: 'A glicose saiu da circulação, a neuroglicopenia avançou e a melhora local de captação não sustentou ATP sistêmico.',
                cellularEffects: [{ target: 'captured.glucose', delta: .7 }, { target: 'tissue.glucose', delta: -1.3 }, { target: 'cell.atp', delta: -.55 }, { target: 'cell.viability', delta: -5 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -24 }, { target: 'energy.deficit', delta: 11 }, { target: 'organs.brain.functionality', delta: -9 }, { target: 'allostatic.load', delta: 7 }],
            },
            {
                id: 'fasted-workout-more-drive', label: 'Aumentar catecolamina e potência de treino',
                description: 'Mobiliza ainda mais AGL e glicogênio muscular para não reduzir a carga.',
                tradeoff: 'Substrato já não é o único limite; demanda, O₂ e gradiente mitocondrial estão desencontrados.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:sympathetic-arousal'], label: 'Manter descarga simpática' }],
                outcome: 'harmful', result: 'Demanda, frequência e lipólise cresceram além da capacidade oxidativa; NADH, lactato e ROS antecederam o desmaio.',
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
        title: 'Ansiedade crônica com simpático ativo em repouso',
        description: 'Sem demanda física, simpático, cortisol e ventilação permanecem elevados; HRV caiu e a exposição cumulativa começa a consumir reserva e produzir ROS.',
        explanation: 'Taquicardia não significa que falta descarga simpática. É preciso comparar PaCO₂, pH, perfusão e HRV para retirar alerta sem provocar hipotensão.',
        contextSummary: 'Semanas sedentárias · estresse crônico · simpático/HPA altos · HRV baixa',
        context: { exercise: 1, nutrition: 66, stress: 92, sleep: 38, temperature: 22 },
        category: 'organ', severity: 'warning', durationSeconds: 38, cooldownSeconds: 480, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['heartRate', 'heartRateVariability', 'systolicBP', 'diastolicBP', 'meanArterialPressure', 'respiratoryRate', 'paco2', 'arterialPH', 'adrenaline', 'cortisol', 'bloodGlucose', 'allostaticLoad', 'systemicAtpReserve', 'cellularAtp', 'ros', 'antioxidants', 'mitochondrialOxygenConsumption'],
        choices: [
            {
                id: 'anxiety-autonomic-offload', label: 'Retirar alerta autonômico e respiratório gradualmente',
                description: 'Favorece recuperação vagal e reduz o drive ventilatório que está além da demanda metabólica real.',
                tradeoff: 'A retirada deve ser coordenada: excesso vagal isolado poderia reduzir pressão em um organismo ainda vasoconstrito.',
                requirements: [{ resource: 'atp', minimum: 1.3, cost: .15 }, { resource: 'antioxidants', minimum: 16, cost: 5 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Favorecer recuperação vagal' }, { anyOf: ['central:reduce-respiratory-drive'], label: 'Reduzir hiperventilação de alerta' }],
                outcome: 'adaptive', result: 'FC, ventilação e pressão se aproximaram da demanda; HRV, PaCO₂, ATP e reserva antioxidante começaram a se recuperar.',
                cellularEffects: [{ target: 'cell.atp', delta: .55 }, { target: 'damage.oxidative', delta: -13 }, { target: 'damage.antioxidants', delta: 5 }, { target: 'mitochondria.oxygenConsumption', delta: -1.2 }, { target: 'cell.calcium', delta: -55 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: -17 }, { target: 'cardiovascular.hrv', delta: 20 }, { target: 'cardiovascular.systolic', delta: -10 }, { target: 'cardiovascular.diastolic', delta: -6 }, { target: 'respiratory.rate', delta: -5 }, { target: 'respiratory.paco2', delta: 5 }, { target: 'acidBase.pH', delta: -.035 }, { target: 'endocrine.sympatheticDrive', delta: -.42 }, { target: 'endocrine.hpaDrive', delta: -.22 }, { target: 'allostatic.load', delta: -12 }],
            },
            {
                id: 'anxiety-more-sympathetic', label: 'Sustentar pressão com mais simpático e adrenalina',
                description: 'Interpreta cansaço e tontura como falha de perfusão e reforça a resposta de luta ou fuga.',
                tradeoff: 'PAM já está sustentada; o custo oculto aparece em HRV, ATP, Ca²⁺ e ROS.',
                requirements: [], signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Ativar simpático' }, { anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }],
                outcome: 'harmful', result: 'Pressão subiu, mas a reserva caiu: taquicardia, Ca²⁺, demanda de O₂ e ROS ampliaram a carga alostática.',
                cellularEffects: [{ target: 'cell.atp', delta: -.65 }, { target: 'cell.calcium', delta: 110 }, { target: 'damage.oxidative', delta: 14 }, { target: 'mitochondria.oxygenConsumption', delta: 2 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 24 }, { target: 'cardiovascular.systolic', delta: 18 }, { target: 'cardiovascular.hrv', delta: -15 }, { target: 'endocrine.sympatheticDrive', delta: .25 }, { target: 'endocrine.catecholamineExposure', delta: 18 }, { target: 'allostatic.load', delta: 13 }],
            },
            {
                id: 'anxiety-cortisol-thyroid', label: 'Compensar fadiga elevando cortisol e T3',
                description: 'Aumenta oferta de combustível e gasto basal para vencer a sensação de exaustão.',
                tradeoff: 'A fadiga decorre do excesso de drive, não de baixa estimulação metabólica.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-cortisol'], label: 'Liberar cortisol' }, { anyOf: ['hormone:increase-t3'], label: 'Aumentar T3' }],
                outcome: 'harmful', result: 'Glicose e potência subiram transitoriamente, mas consumo de O₂, calor, proteólise e carga cardiovascular aprofundaram o desgaste crônico.',
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
        title: 'Crise de pânico com hipocapnia e tontura',
        description: 'A SpO₂ está normal, mas hiperventilação derrubou PaCO₂, elevou o pH e reduziu perfusão cerebral; formigamento não representa falta de O₂.',
        explanation: 'O desafio é não responder ao sintoma com mais ventilação ou catecolamina. A direção correta está no conjunto PaCO₂–pH–SpO₂–perfusão.',
        contextSummary: 'Crise aguda · hiperventilação · alcalose respiratória · vasoconstrição cerebral',
        context: { exercise: 0, nutrition: 62, stress: 100, sleep: 32, temperature: 22 },
        category: 'organ', severity: 'critical', durationSeconds: 28, cooldownSeconds: 420, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['spo2', 'pao2', 'paco2', 'arterialPH', 'bicarbonate', 'respiratoryRate', 'heartRate', 'heartRateVariability', 'meanArterialPressure', 'perfusionIndex', 'adrenaline', 'cortisol', 'cellCalcium', 'cellularAtp', 'ros'],
        choices: [
            {
                id: 'panic-match-ventilation-demand', label: 'Retirar alerta e casar ventilação com demanda',
                description: 'Usa modulação vagal e reduz o drive respiratório porque O₂ está preservado e PaCO₂ está baixo.',
                tradeoff: 'Só é seguro porque as métricas excluem hipoxemia, hipercapnia e acidemia.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .12 }],
                signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Retirar alerta autonômico' }, { anyOf: ['central:reduce-respiratory-drive'], label: 'Reduzir drive respiratório' }],
                outcome: 'adaptive', result: 'PaCO₂ e pH retornaram em direção ao basal; perfusão cerebral, HRV e cálcio celular se recuperaram sem perder oxigenação.',
                cellularEffects: [{ target: 'tissue.carbonDioxide', delta: 7 }, { target: 'tissue.pH', delta: -.05 }, { target: 'cell.calcium', delta: -95 }, { target: 'cell.atp', delta: .45 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'respiratory.rate', delta: -10 }, { target: 'respiratory.paco2', delta: 10 }, { target: 'acidBase.pH', delta: -.075 }, { target: 'cardiovascular.heartRate', delta: -18 }, { target: 'cardiovascular.hrv', delta: 18 }, { target: 'organs.brain.perfusion', delta: 14 }, { target: 'organs.brain.functionality', delta: 8 }, { target: 'allostatic.load', delta: -10 }],
            },
            {
                id: 'panic-more-air', label: 'Reforçar quimiorreflexo para “entrar mais oxigênio”',
                description: 'Trata tontura e parestesia como evidência de ventilação insuficiente.',
                tradeoff: 'SpO₂ e PaO₂ já estão preservadas; o gradiente anormal é de CO₂.',
                requirements: [], signalRequirements: [{ anyOf: ['central:chemoreflex-ventilation'], label: 'Aumentar ventilação' }],
                outcome: 'harmful', result: 'PaCO₂ caiu ainda mais, a alcalose aumentou e a vasoconstrição cerebral piorou a tontura apesar da SpO₂ perfeita.',
                cellularEffects: [{ target: 'tissue.carbonDioxide', delta: -6 }, { target: 'tissue.pH', delta: .05 }, { target: 'cell.calcium', delta: 90 }, { target: 'cell.atp', delta: -.45 }],
                physiologyEffects: [{ target: 'respiratory.rate', delta: 9 }, { target: 'respiratory.paco2', delta: -8 }, { target: 'acidBase.pH', delta: .065 }, { target: 'organs.brain.perfusion', delta: -13 }, { target: 'organs.brain.functionality', delta: -9 }],
            },
            {
                id: 'panic-adrenergic-perfusion', label: 'Usar adrenalina para corrigir a tontura',
                description: 'Eleva pressão e débito supondo que a perfusão cerebral caiu por hipotensão.',
                tradeoff: 'A pressão não é o mecanismo primário; catecolamina reforça o mesmo circuito de alerta.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:sympathetic-arousal'], label: 'Ativar simpático' }],
                outcome: 'harmful', result: 'Pressão subiu sem corrigir hipocapnia; taquicardia, consumo de ATP e ROS intensificaram a crise.',
                cellularEffects: [{ target: 'cell.atp', delta: -.65 }, { target: 'cell.calcium', delta: 105 }, { target: 'damage.oxidative', delta: 12 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: 25 }, { target: 'cardiovascular.systolic', delta: 20 }, { target: 'cardiovascular.hrv', delta: -15 }, { target: 'endocrine.catecholamineExposure', delta: 17 }, { target: 'allostatic.load', delta: 12 }],
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
        title: 'Acidente com hemorragia de grande volume',
        description: 'Volume circulante, retorno venoso e volume sistólico despencaram. Taquicardia mantém parte do débito, mas PAM, perfusão, PO₂ tecidual e ATP já caem.',
        explanation: 'No simulador, a intervenção fisiológica apenas ganha tempo para o controle externo do sangramento: é preciso centralizar perfusão e conservar água sem confundir taquicardia compensatória com excesso de simpático.',
        contextSummary: 'Trauma · perda de volume · choque hemorrágico · hipóxia tecidual',
        context: { exercise: 0, nutrition: 55, stress: 100, sleep: 45, temperature: 21 },
        category: 'organ', severity: 'critical', durationSeconds: 26, cooldownSeconds: 520, difficulty: 'hard',
        metricKeys: ALL_SCENARIO_METRIC_KEYS,
        priorityMetricKeys: ['heartRate', 'heartRateVariability', 'systolicBP', 'diastolicBP', 'meanArterialPressure', 'cardiacOutput', 'perfusionIndex', 'hydration', 'adhActivity', 'bloodLactate', 'arterialPH', 'tissuePerfusion', 'tissueOxygen', 'tissueGlucose', 'tissueLactate', 'cellularAtp', 'cellMembranePotential', 'cellCalcium', 'ros', 'mitochondrialPotential', 'atpSynthaseFlux'],
        choices: [
            {
                id: 'hemorrhage-centralize-conserve', label: 'Centralizar perfusão e conservar volume',
                description: 'Mantém compensação simpática proporcional e ativa ADH para ganhar tempo até o controle do sangramento.',
                tradeoff: 'A vasoconstrição sacrifica territórios periféricos e não repõe hemácias; é uma ponte, não a solução definitiva.',
                requirements: [{ resource: 'atp', minimum: 1.2, cost: .25 }, { resource: 'antioxidants', minimum: 18, cost: 6 }],
                signalRequirements: [{ anyOf: ['central:sympathetic-arousal'], label: 'Sustentar resposta compensatória' }, { anyOf: ['central:adh-retention'], label: 'Conservar água renal' }],
                outcome: 'adaptive', result: 'PAM e perfusão cerebral estabilizaram enquanto ADH reduziu perda de água; a célula preservou ATP suficiente para atravessar a janela até a hemostasia.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: 18 }, { target: 'tissue.oxygen', delta: 8 }, { target: 'tissue.lactate', delta: -1.2 }, { target: 'cell.atp', delta: .65 }, { target: 'cell.membranePotential', delta: -7 }, { target: 'damage.oxidative', delta: -8 }],
                physiologyEffects: [{ target: 'cardiovascular.map', delta: 18 }, { target: 'cardiovascular.systolic', delta: 20 }, { target: 'cardiovascular.diastolic', delta: 12 }, { target: 'cardiovascular.perfusion', delta: 20 }, { target: 'renal.adh', delta: 25 }, { target: 'nutrients.hydration', delta: .8 }, { target: 'energy.lactate', delta: -1.2 }, { target: 'energy.deficit', delta: -8 }, { target: 'organs.brain.perfusion', delta: 18 }, { target: 'organs.brain.oxygenation', delta: 9 }],
            },
            {
                id: 'hemorrhage-vagal-diuresis', label: 'Reduzir a taquicardia para poupar o coração',
                description: 'Trata a frequência alta como causa primária do problema e tenta diminuir o consumo miocárdico.',
                tradeoff: 'A taquicardia é compensatória; retirar tônus reduz débito quando volume sistólico e retorno venoso já despencaram.',
                requirements: [], signalRequirements: [{ anyOf: ['central:parasympathetic-recovery'], label: 'Reduzir frequência cardíaca' }],
                outcome: 'harmful', result: 'FC e débito caíram enquanto a perda de volume continuou; PAM, perfusão cerebral, ATP e viabilidade despencaram.',
                cellularEffects: [{ target: 'tissue.perfusion', delta: -16 }, { target: 'tissue.oxygen', delta: -10 }, { target: 'cell.atp', delta: -1 }, { target: 'cell.membranePotential', delta: 12 }, { target: 'cell.viability', delta: -9 }],
                physiologyEffects: [{ target: 'cardiovascular.heartRate', delta: -24 }, { target: 'cardiovascular.map', delta: -18 }, { target: 'cardiovascular.cardiacOutput', delta: -1.2 }, { target: 'cardiovascular.perfusion', delta: -20 }, { target: 'nutrients.hydration', delta: -1 }, { target: 'organs.brain.perfusion', delta: -18 }, { target: 'organs.brain.functionality', delta: -12 }],
            },
            {
                id: 'hemorrhage-adrenaline-ventilation-only', label: 'Maximizar adrenalina e ventilação',
                description: 'Tenta compensar a falta de entrega elevando frequência, contratilidade e entrada de O₂.',
                tradeoff: 'Sem volume e hemoglobina, mais PaO₂ e cronotropismo não garantem entrega tecidual.',
                requirements: [], signalRequirements: [{ anyOf: ['hormone:release-adrenaline'], label: 'Liberar adrenalina' }, { anyOf: ['central:chemoreflex-ventilation'], label: 'Aumentar ventilação' }],
                outcome: 'harmful', result: 'SpO₂ permaneceu atraente, mas enchimento ventricular e perfusão não melhoraram; demanda cardíaca, lactato e ROS cresceram.',
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

export function createRoutineEvent(definition: ScenarioDefinition, triggerReason: string, simulationTime = 0): CellularRoutineEvent {
    const seed = Math.sin(simulationTime * 7.31 + definition.id.length * 3.17) * 24634.6345;
    const choices = [...definition.choices];
    if (seed - Math.floor(seed) >= .5) choices.reverse();
    return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        explanation: definition.explanation,
        triggerReason,
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
        severity: definition.severity,
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
