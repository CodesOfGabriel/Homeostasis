import type {
    CellularRoutineChoice,
    CellularRoutineEvent,
    CellularState,
    DecisionResource,
    DecisionSignalId,
    RoutineDecisionOutcome,
} from './cellularTypes';
import type { PhysiologicalContextFactors, PhysiologyState } from './types';

export const BASELINE_PHYSIOLOGICAL_CONTEXT: PhysiologicalContextFactors = {
    exercise: 0,
    nutrition: 80,
    stress: 20,
    sleep: 80,
    temperature: 22,
};

export type ScenarioEffectTarget =
    | 'cell.atp'
    | 'cell.volume'
    | 'tissue.glucose'
    | 'tissue.lactate'
    | 'tissue.osmolarity'
    | 'available.glucose'
    | 'available.fattyAcid'
    | 'damage.oxidative'
    | 'damage.membrane'
    | 'damage.proteins';

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
    | 'nutrients.ketones'
    | 'nutrients.hoursSinceMeal'
    | 'allostatic.load'
    | 'allostatic.inflammation'
    | 'pathophysiology.infection'
    | 'pathophysiology.capillaryLeak'
    | 'cardiovascular.map'
    | 'cardiovascular.perfusion'
    | 'respiratory.paco2'
    | 'respiratory.spo2'
    | 'acidBase.pH'
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
        category: 'organ', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180,
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
        category: 'molecule', severity: 'warning', durationSeconds: 30, cooldownSeconds: 180,
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
        category: 'molecule', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180,
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
        category: 'cell', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180,
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
        category: 'cell', severity: 'critical', durationSeconds: 26, cooldownSeconds: 180,
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
        category: 'organ', severity: 'critical', durationSeconds: 26, cooldownSeconds: 180,
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
        category: 'organ', severity: 'critical', durationSeconds: 24, cooldownSeconds: 240,
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
        category: 'organ', severity: 'critical', durationSeconds: 24, cooldownSeconds: 240,
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
        category: 'molecule', severity: 'warning', durationSeconds: 28, cooldownSeconds: 260,
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
        category: 'molecule', severity: 'critical', durationSeconds: 24, cooldownSeconds: 260,
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
];

export function selectEligibleScenario(
    state: CellularState,
    macro: PhysiologyState,
): { definition: ScenarioDefinition; eligibility: ScenarioEligibility } | null {
    const eligible = SCENARIO_DEFINITIONS
        .filter(definition => (state.scenarioCooldowns[definition.id] ?? 0) <= state.simulationTime)
        .map(definition => ({ definition, eligibility: definition.isEligible(state, macro) }))
        .filter(candidate => candidate.eligibility.eligible);
    if (eligible.length === 0) return null;

    const totalWeight = eligible.reduce((sum, candidate) => sum + candidate.eligibility.weight, 0);
    const seed = Math.sin(state.simulationTime * 12.9898 + state.collection.score * .37 + 8.17) * 43758.5453;
    let cursor = (seed - Math.floor(seed)) * totalWeight;
    for (const candidate of eligible) {
        cursor -= candidate.eligibility.weight;
        if (cursor <= 0) return candidate;
    }
    return eligible[eligible.length - 1];
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
        cardiovascular: { ...state.cardiovascular },
        respiratory: { ...state.respiratory },
        acidBase: { ...state.acidBase },
    };
    const change = (current: number, effect: ScenarioPhysiologyEffect) => effect.value ?? current + (effect.delta ?? 0) * multiplier;

    for (const effect of effects) {
        if (effect.target === 'energy.atp') next.energy.atpPool = change(next.energy.atpPool, effect);
        else if (effect.target === 'energy.deficit') next.energy.energyDeficit = change(next.energy.energyDeficit, effect);
        else if (effect.target === 'energy.lactate') next.energy.lactateLevel = change(next.energy.lactateLevel, effect);
        else if (effect.target === 'nutrients.glucose') next.nutrients.bloodGlucose = change(next.nutrients.bloodGlucose, effect);
        else if (effect.target === 'nutrients.hydration') next.nutrients.hydration = change(next.nutrients.hydration, effect);
        else if (effect.target === 'nutrients.sodium') next.nutrients.sodium = change(next.nutrients.sodium, effect);
        else if (effect.target === 'nutrients.ketones') next.nutrients.ketones = change(next.nutrients.ketones, effect);
        else if (effect.target === 'nutrients.hoursSinceMeal') next.nutrients.hoursSinceMeal = change(next.nutrients.hoursSinceMeal, effect);
        else if (effect.target === 'allostatic.load') next.allostaticLoad.currentLoad = change(next.allostaticLoad.currentLoad, effect);
        else if (effect.target === 'allostatic.inflammation') next.allostaticLoad.inflammationLevel = change(next.allostaticLoad.inflammationLevel, effect);
        else if (effect.target === 'pathophysiology.infection') next.pathophysiology.infectionSeverity = change(next.pathophysiology.infectionSeverity, effect);
        else if (effect.target === 'pathophysiology.capillaryLeak') next.pathophysiology.capillaryLeak = change(next.pathophysiology.capillaryLeak, effect);
        else if (effect.target === 'cardiovascular.map') next.cardiovascular.meanArterialPressure = change(next.cardiovascular.meanArterialPressure, effect);
        else if (effect.target === 'cardiovascular.perfusion') next.cardiovascular.perfusionIndex = change(next.cardiovascular.perfusionIndex, effect);
        else if (effect.target === 'respiratory.paco2') next.respiratory.paco2 = change(next.respiratory.paco2, effect);
        else if (effect.target === 'respiratory.spo2') next.respiratory.spo2 = change(next.respiratory.spo2, effect);
        else if (effect.target === 'acidBase.pH') next.acidBase.pH = change(next.acidBase.pH, effect);
        else if (effect.target === 'body.temperature') next.bodyTemperature = change(next.bodyTemperature, effect);
    }

    next.energy.atpPool = clamp(next.energy.atpPool, 0, next.energy.maxATP);
    next.energy.energyDeficit = clamp(next.energy.energyDeficit, 0, 100);
    next.energy.lactateLevel = clamp(next.energy.lactateLevel, .4, 20);
    next.nutrients.bloodGlucose = clamp(next.nutrients.bloodGlucose, 20, 400);
    next.nutrients.hydration = clamp(next.nutrients.hydration, 28, 55);
    next.nutrients.sodium = clamp(next.nutrients.sodium, 120, 165);
    next.nutrients.ketones = clamp(next.nutrients.ketones, .1, 15);
    next.nutrients.hoursSinceMeal = clamp(next.nutrients.hoursSinceMeal, 0, 48);
    next.nutrients.fedState = next.nutrients.hoursSinceMeal < 6;
    next.allostaticLoad.currentLoad = clamp(next.allostaticLoad.currentLoad, 0, 100);
    next.allostaticLoad.inflammationLevel = clamp(next.allostaticLoad.inflammationLevel, 0, 100);
    next.pathophysiology.infectionSeverity = clamp(next.pathophysiology.infectionSeverity, 0, 100);
    next.pathophysiology.capillaryLeak = clamp(next.pathophysiology.capillaryLeak, 0, .55);
    next.cardiovascular.meanArterialPressure = clamp(next.cardiovascular.meanArterialPressure, 30, 180);
    next.cardiovascular.perfusionIndex = clamp(next.cardiovascular.perfusionIndex, 5, 160);
    next.respiratory.paco2 = clamp(next.respiratory.paco2, 20, 100);
    next.respiratory.spo2 = clamp(next.respiratory.spo2, 50, 100);
    next.acidBase.pH = clamp(next.acidBase.pH, 6.7, 7.7);
    next.bodyTemperature = clamp(next.bodyTemperature, 34, 42.5);
    return next;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
