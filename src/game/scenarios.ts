import type {
    CellularRoutineChoice,
    CellularRoutineEvent,
    CellularState,
    DecisionResource,
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
    | 'nutrients.ketones'
    | 'nutrients.hoursSinceMeal'
    | 'allostatic.load'
    | 'allostatic.inflammation'
    | 'pathophysiology.infection'
    | 'pathophysiology.capillaryLeak'
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

const alwaysEligible = (weight: number, reason: string) =>
    (_state: CellularState, macro: PhysiologyState): ScenarioEligibility => ({
        eligible: macro.isAlive,
        weight,
        reason,
    });

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
    {
        id: 'stair-climb',
        title: 'Subida inesperada de escadas',
        description: 'A demanda muscular subiu abruptamente e começou a consumir ATP e O₂ mais rápido do que no repouso.',
        explanation: 'O evento impõe exercício intenso. Uma resposta aeróbia coordenada sustenta o esforço; amplificar apenas a glicólise acumula lactato e déficit energético.',
        contextSummary: 'Exercício 78% · estresse 42% · oferta nutricional basal',
        context: { exercise: 78, nutrition: 80, stress: 42, sleep: 80, temperature: 23 },
        category: 'organ', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180,
        choices: [
            {
                id: 'stair-aerobic', label: 'Coordenar ventilação e via aeróbia',
                description: 'Aumenta a entrega de O₂ e direciona piruvato à mitocôndria.',
                tradeoff: 'Resposta mais eficiente, dependente de perfusão e reserva oxidativa.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .15 }, { resource: 'oxygen', minimum: 1, cost: 1 }],
                outcome: 'adaptive', result: 'A entrega de O₂ acompanhou a demanda; o déficit e o lactato recuaram.',
                cellularEffects: [{ target: 'cell.atp', delta: .5 }, { target: 'tissue.lactate', delta: -.7 }, { target: 'damage.oxidative', delta: -1 }],
                physiologyEffects: [{ target: 'energy.atp', delta: .35 }, { target: 'energy.deficit', delta: -4 }, { target: 'energy.lactate', delta: -.8 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'stair-glycolytic', label: 'Forçar descarga adrenérgica e glicólise',
                description: 'Busca ATP imediato sem corrigir a limitação de O₂.',
                tradeoff: 'Resposta rápida, com acidificação e custo alostático.',
                requirements: [],
                outcome: 'harmful', result: 'A demanda foi mascarada por pouco tempo; lactato, ROS e déficit energético aumentaram.',
                cellularEffects: [{ target: 'cell.atp', delta: -.2 }, { target: 'tissue.lactate', delta: 1.6 }, { target: 'damage.oxidative', delta: 4 }],
                physiologyEffects: [{ target: 'energy.deficit', delta: 6 }, { target: 'energy.lactate', delta: 2 }, { target: 'allostatic.load', delta: 8 }],
            },
        ],
        isEligible: alwaysEligible(1, 'uma necessidade locomotora súbita elevou a intensidade do exercício para 78%'),
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
                outcome: 'adaptive', result: 'A glicose foi captada e armazenada; o eixo insulina/glucagon retornou ao equilíbrio pós-prandial.',
                cellularEffects: [{ target: 'tissue.glucose', delta: -.8 }, { target: 'damage.oxidative', delta: -3 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -16 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'meal-glucagon', label: 'Liberar glucagon para elevar a oferta',
                description: 'Mobiliza glicogênio hepático apesar da glicose já elevada.',
                tradeoff: 'Aumenta substrato circulante e a carga osmótica.',
                requirements: [],
                outcome: 'harmful', result: 'O glucagon somou produção hepática à refeição; hiperglicemia e estresse oxidativo pioraram.',
                cellularEffects: [{ target: 'tissue.glucose', delta: 1.5 }, { target: 'damage.oxidative', delta: 6 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 24 }, { target: 'nutrients.ketones', delta: .25 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: alwaysEligible(.95, 'uma refeição com alta carga de carboidratos iniciou absorção intestinal'),
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
                outcome: 'adaptive', result: 'A troca de combustível sustentou ATP e preservou a glicemia dentro da faixa funcional.',
                cellularEffects: [{ target: 'available.fattyAcid', delta: 1 }, { target: 'cell.atp', delta: .5 }, { target: 'damage.oxidative', delta: 1 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: 5 }, { target: 'nutrients.ketones', delta: .2 }, { target: 'energy.deficit', delta: -4 }],
            },
            {
                id: 'fast-insulin', label: 'Liberar insulina e bloquear mobilização',
                description: 'Aumenta a retirada de glicose apesar da baixa oferta alimentar.',
                tradeoff: 'Inibe lipólise, mas remove o principal combustível circulante.',
                requirements: [],
                outcome: 'harmful', result: 'A insulina sem aporte alimentar aprofundou a hipoglicemia e o déficit energético.',
                cellularEffects: [{ target: 'available.glucose', delta: -1.5 }, { target: 'cell.atp', delta: -.45 }],
                physiologyEffects: [{ target: 'nutrients.glucose', delta: -18 }, { target: 'energy.deficit', delta: 7 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: alwaysEligible(.9, 'o intervalo sem alimentação avançou até 12 horas'),
        onStart: [{ target: 'available.glucose', delta: -1.2 }, { target: 'tissue.glucose', delta: -.55 }],
        onStartPhysiology: [{ target: 'nutrients.hoursSinceMeal', value: 12 }, { target: 'nutrients.glucose', delta: -8 }, { target: 'nutrients.ketones', delta: .25 }],
        onTimeout: [{ target: 'cell.atp', delta: -.6 }, { target: 'damage.oxidative', delta: 3 }],
        onTimeoutPhysiology: [{ target: 'nutrients.glucose', delta: -14 }, { target: 'energy.deficit', delta: 9 }, { target: 'allostatic.load', delta: 8 }],
    },
    {
        id: 'micro-injury',
        title: 'Microlesão muscular',
        description: 'Uma carga mecânica inesperada danificou proteínas estruturais e iniciou inflamação local.',
        explanation: 'Reparo precoce usa ATP e aminoácidos, mas limita a propagação do dano. Adiar preserva energia imediata às custas de função e inflamação.',
        contextSummary: 'Esforço excêntrico 72% · estresse 38% · demanda de reparo elevada',
        context: { exercise: 72, nutrition: 75, stress: 38, sleep: 75, temperature: 22 },
        category: 'cell', severity: 'warning', durationSeconds: 28, cooldownSeconds: 180,
        choices: [
            {
                id: 'injury-repair', label: 'Priorizar reparo proteico',
                description: 'Direciona aminoácidos e ATP à renovação estrutural.',
                tradeoff: 'Reduz ATP transitório, protegendo a viabilidade futura.',
                requirements: [{ resource: 'atp', minimum: 1.55, cost: .55 }, { resource: 'aminoAcid', minimum: .5, cost: .5 }],
                outcome: 'adaptive', result: 'O reparo conteve o dano estrutural e reduziu o sinal inflamatório.',
                cellularEffects: [{ target: 'damage.proteins', delta: -9 }, { target: 'damage.membrane', delta: -2 }],
                physiologyEffects: [{ target: 'allostatic.inflammation', delta: -6 }, { target: 'allostatic.load', delta: -3 }],
            },
            {
                id: 'injury-defer', label: 'Manter esforço e adiar reparo',
                description: 'Preserva energia para continuar a atividade.',
                tradeoff: 'Proteínas lesadas permanecem ativas e amplificam inflamação.',
                requirements: [],
                outcome: 'harmful', result: 'A carga continuou sobre proteínas danificadas; inflamação e perda de viabilidade aumentaram.',
                cellularEffects: [{ target: 'damage.proteins', delta: 8 }, { target: 'damage.membrane', delta: 3 }, { target: 'cell.atp', delta: -.2 }],
                physiologyEffects: [{ target: 'allostatic.inflammation', delta: 7 }, { target: 'allostatic.load', delta: 7 }],
            },
        ],
        isEligible: alwaysEligible(.85, 'uma carga mecânica excêntrica produziu microlesões musculares'),
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
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .4 }, { resource: 'antioxidants', minimum: 35, cost: 0 }],
                outcome: 'adaptive', result: 'A resposta conteve o foco sem ampliar o dano oxidativo; febre e inflamação começaram a recuar.',
                cellularEffects: [{ target: 'damage.oxidative', delta: -8 }, { target: 'damage.proteins', delta: -2 }],
                physiologyEffects: [{ target: 'pathophysiology.infection', delta: -12 }, { target: 'allostatic.inflammation', delta: -9 }, { target: 'body.temperature', delta: -.35 }],
            },
            {
                id: 'immune-suppress', label: 'Suprimir intensamente com cortisol',
                description: 'Reduz sinais inflamatórios antes de controlar o agente.',
                tradeoff: 'Alivia sintomas, mas enfraquece contenção imune e eleva glicose.',
                requirements: [],
                outcome: 'harmful', result: 'A inflamação aparente caiu, mas o foco infeccioso progrediu e aumentou a carga sistêmica.',
                cellularEffects: [{ target: 'damage.oxidative', delta: 7 }, { target: 'damage.proteins', delta: 4 }, { target: 'cell.atp', delta: -.35 }],
                physiologyEffects: [{ target: 'pathophysiology.infection', delta: 14 }, { target: 'pathophysiology.capillaryLeak', delta: .08 }, { target: 'nutrients.glucose', delta: 10 }, { target: 'allostatic.load', delta: 10 }],
            },
        ],
        isEligible: alwaysEligible(.8, 'um foco infeccioso ativou a resposta imune inata'),
        onStart: [{ target: 'damage.oxidative', delta: 5 }, { target: 'cell.atp', delta: -.15 }],
        onStartPhysiology: [{ target: 'pathophysiology.infection', delta: 18 }, { target: 'allostatic.inflammation', delta: 8 }, { target: 'body.temperature', delta: .35 }],
        onTimeout: [{ target: 'damage.oxidative', delta: 11 }, { target: 'damage.proteins', delta: 4 }],
        onTimeoutPhysiology: [{ target: 'pathophysiology.infection', delta: 18 }, { target: 'pathophysiology.capillaryLeak', delta: 7 }, { target: 'allostatic.load', delta: 12 }],
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
                description: 'Reduz atividade, favorece ADH e recupera gradientes celulares.',
                tradeoff: 'Poupa volume circulante com custo moderado de ATP para bombas.',
                requirements: [{ resource: 'atp', minimum: 1.4, cost: .4 }],
                outcome: 'adaptive', result: 'A perda hídrica foi contida; osmolaridade, volume celular e temperatura caminharam ao basal.',
                cellularEffects: [{ target: 'cell.volume', delta: 5 }, { target: 'tissue.osmolarity', delta: -5 }, { target: 'damage.membrane', delta: -3 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: .65 }, { target: 'body.temperature', delta: -.45 }, { target: 'allostatic.load', delta: -4 }],
            },
            {
                id: 'heat-adrenaline', label: 'Aumentar atividade e adrenalina',
                description: 'Eleva débito e produção energética sem corrigir a perda de água.',
                tradeoff: 'Gera mais calor, suor e consumo de ATP.',
                requirements: [],
                outcome: 'harmful', result: 'A produção de calor e o suor aumentaram; desidratação, osmolaridade e dano de membrana pioraram.',
                cellularEffects: [{ target: 'cell.volume', delta: -7 }, { target: 'tissue.osmolarity', delta: 7 }, { target: 'damage.membrane', delta: 6 }, { target: 'cell.atp', delta: -.3 }],
                physiologyEffects: [{ target: 'nutrients.hydration', delta: -1.1 }, { target: 'body.temperature', delta: .7 }, { target: 'allostatic.load', delta: 9 }],
            },
        ],
        isEligible: alwaysEligible(.75, 'uma onda de calor elevou o ambiente para 39 °C e acelerou a perda de água'),
        onStart: [{ target: 'tissue.osmolarity', delta: 5 }, { target: 'cell.volume', delta: -4 }],
        onStartPhysiology: [{ target: 'nutrients.hydration', delta: -.45 }, { target: 'body.temperature', delta: .3 }],
        onTimeout: [{ target: 'cell.volume', delta: -8 }, { target: 'damage.membrane', delta: 7 }, { target: 'tissue.osmolarity', delta: 6 }],
        onTimeoutPhysiology: [{ target: 'nutrients.hydration', delta: -1.4 }, { target: 'body.temperature', delta: .8 }, { target: 'allostatic.load', delta: 12 }],
    },
];

export function selectEligibleScenario(
    state: CellularState,
    macro: PhysiologyState,
): { definition: ScenarioDefinition; eligibility: ScenarioEligibility } | null {
    const eligible = SCENARIO_DEFINITIONS
        .filter(definition => (state.scenarioCooldowns[definition.id] ?? 0) <= state.simulationTime)
        .map(definition => ({ definition, eligibility: definition.isEligible(state, macro) }))
        .filter(candidate => candidate.eligibility.eligible)
        .sort((a, b) => b.eligibility.weight - a.eligibility.weight || a.definition.id.localeCompare(b.definition.id));
    return eligible[0] ?? null;
}

export function createRoutineEvent(definition: ScenarioDefinition, triggerReason: string): CellularRoutineEvent {
    return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        explanation: definition.explanation,
        triggerReason,
        category: definition.category,
        choices: definition.choices.map(({ id, label, description, tradeoff, requirements }) => ({ id, label, description, tradeoff, requirements })),
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
    oxygen: 'O₂ captado',
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
): { available: boolean; missing: string[] } {
    const choice = getScenarioChoice(scenarioId, choiceId);
    if (!choice) return { available: false, missing: ['Decisão não configurada'] };
    const missing = choice.requirements
        .filter(requirement => getDecisionResourceAmount(state, requirement.resource) + 1e-6 < requirement.minimum)
        .map(requirement => `${DECISION_RESOURCE_LABELS[requirement.resource]} ${getDecisionResourceAmount(state, requirement.resource).toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}/${requirement.minimum.toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}`);
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
    };
    const change = (current: number, effect: ScenarioPhysiologyEffect) => effect.value ?? current + (effect.delta ?? 0) * multiplier;

    for (const effect of effects) {
        if (effect.target === 'energy.atp') next.energy.atpPool = change(next.energy.atpPool, effect);
        else if (effect.target === 'energy.deficit') next.energy.energyDeficit = change(next.energy.energyDeficit, effect);
        else if (effect.target === 'energy.lactate') next.energy.lactateLevel = change(next.energy.lactateLevel, effect);
        else if (effect.target === 'nutrients.glucose') next.nutrients.bloodGlucose = change(next.nutrients.bloodGlucose, effect);
        else if (effect.target === 'nutrients.hydration') next.nutrients.hydration = change(next.nutrients.hydration, effect);
        else if (effect.target === 'nutrients.ketones') next.nutrients.ketones = change(next.nutrients.ketones, effect);
        else if (effect.target === 'nutrients.hoursSinceMeal') next.nutrients.hoursSinceMeal = change(next.nutrients.hoursSinceMeal, effect);
        else if (effect.target === 'allostatic.load') next.allostaticLoad.currentLoad = change(next.allostaticLoad.currentLoad, effect);
        else if (effect.target === 'allostatic.inflammation') next.allostaticLoad.inflammationLevel = change(next.allostaticLoad.inflammationLevel, effect);
        else if (effect.target === 'pathophysiology.infection') next.pathophysiology.infectionSeverity = change(next.pathophysiology.infectionSeverity, effect);
        else if (effect.target === 'pathophysiology.capillaryLeak') next.pathophysiology.capillaryLeak = change(next.pathophysiology.capillaryLeak, effect);
        else if (effect.target === 'body.temperature') next.bodyTemperature = change(next.bodyTemperature, effect);
    }

    next.energy.atpPool = clamp(next.energy.atpPool, 0, next.energy.maxATP);
    next.energy.energyDeficit = clamp(next.energy.energyDeficit, 0, 100);
    next.energy.lactateLevel = clamp(next.energy.lactateLevel, .4, 20);
    next.nutrients.bloodGlucose = clamp(next.nutrients.bloodGlucose, 20, 400);
    next.nutrients.hydration = clamp(next.nutrients.hydration, 28, 55);
    next.nutrients.ketones = clamp(next.nutrients.ketones, .1, 15);
    next.nutrients.hoursSinceMeal = clamp(next.nutrients.hoursSinceMeal, 0, 48);
    next.nutrients.fedState = next.nutrients.hoursSinceMeal < 6;
    next.allostaticLoad.currentLoad = clamp(next.allostaticLoad.currentLoad, 0, 100);
    next.allostaticLoad.inflammationLevel = clamp(next.allostaticLoad.inflammationLevel, 0, 100);
    next.pathophysiology.infectionSeverity = clamp(next.pathophysiology.infectionSeverity, 0, 100);
    next.pathophysiology.capillaryLeak = clamp(next.pathophysiology.capillaryLeak, 0, .55);
    next.bodyTemperature = clamp(next.bodyTemperature, 34, 42.5);
    return next;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
