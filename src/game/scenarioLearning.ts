import type { RoutineDecisionOutcome } from './cellularTypes';
import {
    SCENARIO_METRIC_CATALOG,
    type ScenarioMetricKey,
    type ScenarioMetricSnapshot,
} from './scenarioMetrics';

export type PredictionDirection = 'increase' | 'decrease' | 'stable';

export interface MechanismHypothesis {
    id: string;
    label: string;
    correct: boolean;
}

export interface ScenarioPredictionPrompt {
    id: string;
    metricKey: ScenarioMetricKey;
    prompt: string;
    adaptiveDirection: PredictionDirection;
    threshold: number;
}

export interface ScenarioLearningDefinition {
    controlledVariable: string;
    hypothesisPrompt: string;
    hypotheses: MechanismHypothesis[];
    predictions: [ScenarioPredictionPrompt, ScenarioPredictionPrompt];
    causalChain: string[];
}

export interface ScenarioReasoningSubmission {
    hypothesisId: string;
    predictions: Record<string, PredictionDirection>;
}

export interface ScenarioPredictionAssessment {
    id: string;
    metricKey: ScenarioMetricKey;
    label: string;
    unit: string;
    digits: number;
    initialValue: number;
    finalValue: number;
    predictedDirection: PredictionDirection;
    observedDirection: PredictionDirection;
    adaptiveDirection: PredictionDirection;
    predictionMatched: boolean;
    adaptiveTargetMatched: boolean;
}

export interface ScenarioLearningAssessment {
    outcome: RoutineDecisionOutcome;
    hypothesisMatched: boolean;
    hypothesisLabel: string;
    predictionMatches: number;
    adaptiveTargetsMatched: number;
    reasoningScore: number;
    predictions: ScenarioPredictionAssessment[];
    summary: string;
}

type ResolutionRisk = 'recoverable' | 'unstable' | 'catastrophic';

const directionLabels: Record<PredictionDirection, string> = {
    increase: 'subir',
    decrease: 'cair',
    stable: 'permanecer estável',
};

const hypothesis = (id: string, label: string, correct = false): MechanismHypothesis => ({ id, label, correct });
const prediction = (
    id: string,
    metricKey: ScenarioMetricKey,
    prompt: string,
    adaptiveDirection: PredictionDirection,
    threshold: number,
): ScenarioPredictionPrompt => ({ id, metricKey, prompt, adaptiveDirection, threshold });

/**
 * Camada pedagógica deliberadamente separada dos deltas do cenário. A escolha
 * aplica mecanismos; estas metas descrevem o que uma recuperação funcional
 * precisa produzir. Assim, o desfecho nasce da trajetória observada.
 */
export const SCENARIO_LEARNING: Record<string, ScenarioLearningDefinition> = {
    'stair-climb': {
        controlledVariable: 'entrega de O₂ proporcional à demanda muscular',
        hypothesisPrompt: 'Qual mecanismo explica dispneia e lactato com SpO₂ ainda preservada?',
        hypotheses: [
            hypothesis('demand-mismatch', 'A demanda muscular superou transitoriamente a entrega tecidual de O₂.', true),
            hypothesis('arterial-hypoxemia', 'A causa primária é uma falha grave de oxigenação arterial.'),
            hypothesis('insulin-excess', 'A insulina bloqueou diretamente a ventilação durante o esforço.'),
        ],
        predictions: [
            prediction('lactate', 'tissueLactate', 'Após uma conduta adequada, o lactato tecidual tende a…', 'decrease', .2),
            prediction('deficit', 'energyDeficit', 'Com demanda e oferta novamente acopladas, o déficit energético tende a…', 'decrease', .5),
        ],
        causalChain: ['esforço eleva demanda', 'entrega tecidual fica relativamente curta', 'recuperação ventilatória recompõe ATP e remove lactato'],
    },
    'meal-surge': {
        controlledVariable: 'glicemia pós-prandial sem saturar armazenamento e oxidação',
        hypothesisPrompt: 'Qual eixo deve dominar depois de uma refeição rica em carboidratos?',
        hypotheses: [
            hypothesis('counterregulation', 'Glucagon e produção hepática precisam aumentar.'),
            hypothesis('fed-insulin', 'Insulina deve coordenar captação e armazenamento no estado alimentado.', true),
            hypothesis('adrenergic', 'Adrenalina deve sustentar a glicose acima do pico da refeição.'),
        ],
        predictions: [
            prediction('glucose', 'bloodGlucose', 'Com o fluxo pós-prandial bem regulado, a glicose sanguínea tende a…', 'decrease', 3),
            prediction('ros', 'ros', 'Ao evitar sobrecarga de substrato, o estresse oxidativo tende a…', 'decrease', 1),
        ],
        causalChain: ['refeição eleva glicose', 'insulina distribui e armazena substrato', 'glicemia e pressão redox retornam ao basal'],
    },
    'morning-fast': {
        controlledVariable: 'glicose disponível ao cérebro durante a troca de combustível',
        hypothesisPrompt: 'Qual compensação sustenta um jejum ainda sem neuroglicopenia grave?',
        hypotheses: [
            hypothesis('glucagon-lipolysis', 'Glucagon, produção hepática e lipólise poupam glicose.', true),
            hypothesis('insulin-storage', 'Insulina deve intensificar armazenamento periférico.'),
            hypothesis('anabolic-growth', 'GH e mTOR devem priorizar síntese proteica imediata.'),
        ],
        predictions: [
            prediction('glucose', 'bloodGlucose', 'Se a contrarregulação for suficiente, a glicose tende a…', 'increase', 2),
            prediction('atp', 'cellularAtp', 'Com combustível alternativo e menor demanda, o ATP celular tende a…', 'increase', .08),
        ],
        causalChain: ['jejum reduz aporte', 'contrarregulação mobiliza glicose e gordura', 'ATP é preservado sem captação insulinodependente excessiva'],
    },
    'micro-injury': {
        controlledVariable: 'reparo estrutural sem ampliar inflamação e demanda',
        hypothesisPrompt: 'O que mantém dor e dano depois do exercício excêntrico?',
        hypotheses: [
            hypothesis('systemic-infection', 'Uma infecção sistêmica é a causa mais provável.'),
            hypothesis('protein-remodeling', 'Microdano proteico exige contenção de carga e remodelamento.', true),
            hypothesis('oxygen-toxicity', 'Oxigênio arterial alto está destruindo o músculo.'),
        ],
        predictions: [
            prediction('protein-damage', 'proteinDamage', 'Com reparo proporcional, o dano proteico tende a…', 'decrease', .5),
            prediction('inflammation', 'inflammation', 'Sem nova sobrecarga, a inflamação sistêmica tende a…', 'decrease', 1),
        ],
        causalChain: ['carga excêntrica lesiona proteínas', 'redução de carga libera ATP para reparo', 'dano e inflamação recuam progressivamente'],
    },
    'immune-challenge': {
        controlledVariable: 'contenção do foco infeccioso com dano inflamatório proporcional',
        hypothesisPrompt: 'Qual mecanismo diferencia inflamação protetora de piora silenciosa do foco?',
        hypotheses: [
            hypothesis('source-control', 'A carga microbiana exige controle do foco e resposta imune preservada.', true),
            hypothesis('sterile-allergy', 'É apenas uma reação alérgica estéril sem agente local.'),
            hypothesis('cortisol-deficit', 'Falta cortisol e por isso toda inflamação deve ser bloqueada.'),
        ],
        predictions: [
            prediction('infection', 'infection', 'Depois de controlar a fonte, a carga infecciosa tende a…', 'decrease', 1),
            prediction('inflammation', 'inflammation', 'Com o foco cedendo, a inflamação sistêmica tende a…', 'decrease', 1),
        ],
        causalChain: ['barreira rompida permite inoculação', 'defesa contém o agente quando a fonte é tratada', 'carga e inflamação recuam sem imunossupressão precoce'],
    },
    'heat-dehydration': {
        controlledVariable: 'temperatura e volume circulante durante perda de água',
        hypothesisPrompt: 'O que liga suor, taquicardia, calor e queda de volume?',
        hypotheses: [
            hypothesis('water-heat-loss', 'Termorregulação dissipou calor ao custo de água e perfusão.', true),
            hypothesis('primary-bradycardia', 'Bradicardia primária reduziu a produção de suor.'),
            hypothesis('insulin-deficit', 'Falta de insulina é a causa imediata da hipertermia.'),
        ],
        predictions: [
            prediction('temperature', 'temperature', 'Após interromper a carga térmica e resfriar, a temperatura tende a…', 'decrease', .15),
            prediction('hydration', 'hydration', 'Com reposição proporcional, a água corporal tende a…', 'increase', .15),
        ],
        causalChain: ['calor ativa sudorese', 'perda hídrica compromete volume e perfusão', 'resfriamento mais reposição restauram as duas variáveis'],
    },
    'orthostatic-transition': {
        controlledVariable: 'perfusão cerebral durante mudança postural',
        hypothesisPrompt: 'A taquicardia inicial é causa do quadro ou compensação?',
        hypotheses: [
            hypothesis('vagal-excess', 'Predomínio vagal deve ser reforçado para baixar a frequência.'),
            hypothesis('baroreflex', 'Queda de retorno venoso recruta barorreflexo simpático compensatório.', true),
            hypothesis('hypervolemia', 'Excesso de volume elevou a pressão cerebral.'),
        ],
        predictions: [
            prediction('map', 'meanArterialPressure', 'Com retorno venoso e tônus restaurados, a PAM tende a…', 'increase', 2),
            prediction('perfusion', 'perfusionIndex', 'Quando o retorno venoso melhora, o índice de perfusão tende a…', 'increase', 2),
        ],
        causalChain: ['ortostase reduz retorno venoso', 'barorreceptores elevam tônus e frequência', 'PAM e entrega tecidual se recuperam'],
    },
    'hypercapnic-challenge': {
        controlledVariable: 'ventilação alveolar suficiente para eliminar CO₂',
        hypothesisPrompt: 'Por que o pH cai antes de a SpO₂ revelar toda a gravidade?',
        hypotheses: [
            hypothesis('metabolic-alkalosis', 'O rim eliminou bicarbonato rápido demais.'),
            hypothesis('hyperoxia', 'Oxigênio excessivo tornou o sangue alcalino.'),
            hypothesis('alveolar-hypoventilation', 'Hipoventilação alveolar reteve CO₂ e gerou acidose respiratória.', true),
        ],
        predictions: [
            prediction('paco2', 'paco2', 'Com ventilação alveolar efetiva, a PaCO₂ tende a…', 'decrease', 1),
            prediction('ph', 'arterialPH', 'À medida que o CO₂ é eliminado, o pH arterial tende a…', 'increase', .015),
        ],
        causalChain: ['ventilação insuficiente retém CO₂', 'ácido carbônico reduz pH', 'suporte ventilatório reverte a acidose respiratória'],
    },
    'acute-water-load': {
        controlledVariable: 'osmolaridade efetiva e volume celular',
        hypothesisPrompt: 'Qual resposta endógena deve ocorrer após grande carga de água livre?',
        hypotheses: [
            hypothesis('adh-release', 'ADH deve subir para reter ainda mais água.'),
            hypothesis('adh-suppression', 'ADH deve cair, permitindo diurese de água livre.', true),
            hypothesis('aldosterone-only', 'Aldosterona isolada corrige a diluição sem mudar água.'),
        ],
        predictions: [
            prediction('sodium', 'plasmaSodium', 'Ao excretar água livre, o sódio diluído tende a…', 'increase', .4),
            prediction('cell-volume', 'cellVolume', 'Com osmolaridade corrigida, o volume celular tende a…', 'decrease', .3),
        ],
        causalChain: ['água livre dilui sódio', 'ADH suprimido permite diurese aquosa', 'osmolaridade e volume celular normalizam'],
    },
    'nocturnal-hypoglycemia': {
        controlledVariable: 'oferta imediata de glicose ao cérebro',
        hypothesisPrompt: 'Sudorese e taquicardia representam causa ou tentativa de resgate?',
        hypotheses: [
            hypothesis('insulin-need', 'A glicose baixa indica que mais insulina é necessária.'),
            hypothesis('counterregulation', 'Simpático e glucagon são compensações contra a neuroglicopenia.', true),
            hypothesis('isolated-fever', 'Febre isolada explica a confusão e a sudorese.'),
        ],
        predictions: [
            prediction('glucose', 'bloodGlucose', 'Depois do resgate, a glicose sanguínea tende a…', 'increase', 3),
            prediction('atp', 'cellularAtp', 'Com substrato novamente disponível, o ATP celular tende a…', 'increase', .08),
        ],
        causalChain: ['glicose cai durante o sono', 'contrarregulação alerta e mobiliza reserva', 'glicose disponível recompõe ATP cerebral'],
    },
    'mitochondrial-uncoupling': {
        controlledVariable: 'acoplamento entre gradiente mitocondrial e síntese de ATP',
        hypothesisPrompt: 'Como o consumo de O₂ pode subir enquanto ATP cai e calor aumenta?',
        hypotheses: [
            hypothesis('uncoupling', 'Prótons retornam sem produzir ATP e a energia vira calor.', true),
            hypothesis('oxygen-delivery', 'Falta absoluta de O₂ arterial parou a cadeia respiratória.'),
            hypothesis('glucose-transport', 'Bloqueio isolado de GLUT4 explica toda a hipertermia.'),
        ],
        predictions: [
            prediction('temperature', 'temperature', 'Ao retirar o agente e reduzir demanda, a temperatura tende a…', 'decrease', .15),
            prediction('atp', 'cellularAtp', 'Se o gradiente voltar a acoplar, o ATP celular tende a…', 'increase', .08),
        ],
        causalChain: ['desacoplador dissipa gradiente', 'combustível vira calor sem ATP proporcional', 'retirada e suporte reduzem demanda até recuperar acoplamento'],
    },
    'mixed-ketoacidotic-fatigue': {
        controlledVariable: 'pH durante correção de cetose, volume e ventilação',
        hypothesisPrompt: 'A respiração rápida ainda compensa ou a retenção de CO₂ mostra falha?',
        hypotheses: [
            hypothesis('isolated-respiratory', 'A acidose é apenas respiratória e glicose/cetonas são incidentais.'),
            hypothesis('mixed-dka-fatigue', 'Cetoacidose metabólica somou-se à fadiga da compensação ventilatória.', true),
            hypothesis('metabolic-alkalosis', 'A hiperventilação produziu uma alcalose metabólica primária.'),
        ],
        predictions: [
            prediction('ketones', 'ketones', 'Com volume e insulina seguros, as cetonas tendem a…', 'decrease', .15),
            prediction('ph', 'arterialPH', 'Preservando ventilação durante a correção, o pH tende a…', 'increase', .015),
        ],
        causalChain: ['falta de insulina gera cetonas', 'bicarbonato cai e ventilação compensa', 'volume, K⁺, insulina e ventilação precisam convergir'],
    },
    'distributive-dysoxia': {
        controlledVariable: 'entrega e utilização microcirculatória de O₂',
        hypothesisPrompt: 'Por que SpO₂ normal não exclui choque neste caso?',
        hypotheses: [
            hypothesis('arterial-hypoxemia', 'A baixa SpO₂ é o mecanismo dominante da queda de ATP.'),
            hypothesis('vasoplegia-shunt', 'Vasoplegia, leak e shunt microcirculatório impedem entrega útil.', true),
            hypothesis('isolated-anemia', 'Somente a hemoglobina baixa explica inflamação e vasoplegia.'),
        ],
        predictions: [
            prediction('map', 'meanArterialPressure', 'Com fonte, volume e tônus tratados, a PAM tende a…', 'increase', 2),
            prediction('lactate', 'bloodLactate', 'Quando a perfusão volta a ser útil, o lactato tende a…', 'decrease', .2),
        ],
        causalChain: ['infecção causa vasoplegia e leak', 'SpO₂ não mede distribuição microvascular', 'controle da fonte e ressuscitação restauram perfusão e ATP'],
    },
    'reperfusion-paradox': {
        controlledVariable: 'retorno do fluxo sem sobrecarga elétrica e oxidativa',
        hypothesisPrompt: 'Qual ameaça aparece quando o fluxo retorna ao tecido isquêmico?',
        hypotheses: [
            hypothesis('safe-flow', 'O retorno do sangue é sempre neutro depois da isquemia.'),
            hypothesis('reperfusion-load', 'K⁺, Ca²⁺ e ROS podem produzir instabilidade de reperfusão.', true),
            hypothesis('insulin-only', 'A única ameaça é captação excessiva de glicose por insulina.'),
        ],
        predictions: [
            prediction('calcium', 'cellCalcium', 'Com eletrólitos preparados, o Ca²⁺ intracelular tende a…', 'decrease', 10),
            prediction('ros', 'ros', 'Com controle redox e de eletrólitos, ROS tende a…', 'decrease', 1),
        ],
        causalChain: ['isquemia acumula metabólitos e reduz a cadeia', 'refluxo reintroduz O₂ e mobiliza eletrólitos', 'preparo limita ROS e instabilidade elétrica'],
    },
    'hyperosmolar-renal-conflict': {
        controlledVariable: 'volume circulante durante correção gradual da hiperosmolaridade',
        hypothesisPrompt: 'Qual mecanismo liga hiperglicemia, poliúria e queda da filtração?',
        hypotheses: [
            hypothesis('water-intoxication', 'Excesso de água livre diluiu a glicose e bloqueou o rim.'),
            hypothesis('osmotic-diuresis', 'Diurese osmótica retirou água, reduziu perfusão e GFR.', true),
            hypothesis('primary-hyperkalemia', 'Potássio alto isolado provocou toda a perda de volume.'),
        ],
        predictions: [
            prediction('hydration', 'hydration', 'Após reposição inicial de volume, a água corporal tende a…', 'increase', .15),
            prediction('glucose', 'bloodGlucose', 'Com perfusão e K⁺ avaliados, a glicose tende a…', 'decrease', 3),
        ],
        causalChain: ['glicose alta causa diurese osmótica', 'hipovolemia reduz perfusão e filtração', 'volume precede correção insulinêmica gradual'],
    },
    'whisky-party-hepatic-overload': {
        controlledVariable: 'glicose cerebral e ventilação durante metabolismo do álcool',
        hypothesisPrompt: 'O que torna jejum mais álcool uma combinação perigosa?',
        hypotheses: [
            hypothesis('calorie-excess', 'As calorias da bebida exigem insulina imediata.'),
            hypothesis('hepatic-redox', 'O metabolismo hepático do álcool limita produção de glicose e eleva lactato.', true),
            hypothesis('isolated-anxiety', 'A sonolência decorre apenas de ansiedade social.'),
        ],
        predictions: [
            prediction('glucose', 'bloodGlucose', 'Com suporte metabólico adequado, a glicose tende a…', 'increase', 3),
            prediction('lactate', 'bloodLactate', 'Reduzindo a pressão redox hepática, o lactato tende a…', 'decrease', .2),
        ],
        causalChain: ['álcool eleva NADH hepático', 'gliconeogênese fica limitada e lactato acumula', 'glicose, tiamina e suporte protegem cérebro e via aérea'],
    },
    'alcohol-nocturnal-hypoglycemia': {
        controlledVariable: 'energia cerebral e eliminação de CO₂ durante depressão noturna',
        hypothesisPrompt: 'Quais duas ameaças evoluem ao mesmo tempo durante o sono?',
        hypotheses: [
            hypothesis('sleep-only', 'É sono fisiológico; nenhuma função precisa ser resgatada.'),
            hypothesis('dual-failure', 'Hipoglicemia e hipoventilação ameaçam ATP e pH em paralelo.', true),
            hypothesis('oxygen-only', 'SpO₂ normal exclui qualquer falha ventilatória.'),
        ],
        predictions: [
            prediction('glucose', 'bloodGlucose', 'Depois de glicose IV, a glicemia tende a…', 'increase', 3),
            prediction('paco2', 'paco2', 'Com suporte ventilatório efetivo, a PaCO₂ tende a…', 'decrease', 1),
        ],
        causalChain: ['álcool limita oferta hepática e deprime ventilação', 'glicose cai enquanto CO₂ sobe', 'resgate precisa tratar substrato e ventilação juntos'],
    },
    'fasted-workout-free-fatty-acids': {
        controlledVariable: 'glicose cerebral durante alta demanda muscular',
        hypothesisPrompt: 'Por que gordura circulante não impede sintomas neuroglicopênicos imediatos?',
        hypotheses: [
            hypothesis('brain-glucose-gap', 'O cérebro não substitui rapidamente sua necessidade de glicose por AGL.', true),
            hypothesis('fat-deficit', 'Falta gordura circulante e por isso a glicose subiu demais.'),
            hypothesis('rest-excess', 'Repouso prévio reduziu demais a demanda de ATP.'),
        ],
        predictions: [
            prediction('glucose', 'bloodGlucose', 'Após interromper o treino e oferecer carboidrato, a glicose tende a…', 'increase', 3),
            prediction('lactate', 'tissueLactate', 'Com menor demanda anaeróbia, o lactato tecidual tende a…', 'decrease', .2),
        ],
        causalChain: ['jejum encurta reserva de glicose', 'exercício aumenta demanda muscular e cerebral', 'interromper carga e repor carboidrato restaura o substrato limitante'],
    },
    'chronic-anxiety-sedentary': {
        controlledVariable: 'carga autonômica proporcional à demanda real',
        hypothesisPrompt: 'Em repouso, o organismo precisa de mais ativação ou de retirar carga?',
        hypotheses: [
            hypothesis('energy-deficit', 'Falta estímulo simpático e tireoidiano para gerar energia.'),
            hypothesis('chronic-alarm', 'Simpático/HPA persistentes elevaram demanda e reduziram reserva.', true),
            hypothesis('vagal-excess', 'Excesso vagal explica taquicardia e HRV baixa.'),
        ],
        predictions: [
            prediction('heart-rate', 'heartRate', 'Com descarga autonômica reduzida, a frequência tende a…', 'decrease', 2),
            prediction('hrv', 'heartRateVariability', 'Ao recuperar modulação vagal, a variabilidade tende a…', 'increase', 1),
        ],
        causalChain: ['alerta crônico mantém simpático e HPA', 'demanda sobe sem trabalho útil', 'sono, respiração e atividade gradual recompõem flexibilidade autonômica'],
    },
    'panic-hyperventilation': {
        controlledVariable: 'PaCO₂ e perfusão cerebral durante ventilação desproporcional',
        hypothesisPrompt: 'A sensação de falta de ar representa pouco O₂ ou CO₂ excessivamente baixo?',
        hypotheses: [
            hypothesis('hypoxemia', 'Hipoxemia grave exige ventilar cada vez mais rápido.'),
            hypothesis('hypocapnia', 'Hiperventilação causou hipocapnia, alcalose e vasoconstrição cerebral.', true),
            hypothesis('low-adrenaline', 'Falta adrenalina para manter a perfusão cerebral.'),
        ],
        predictions: [
            prediction('paco2', 'paco2', 'Com ventilação ajustada à demanda, a PaCO₂ tende a…', 'increase', 1),
            prediction('ph', 'arterialPH', 'À medida que a hipocapnia cede, o pH tende a…', 'decrease', .015),
        ],
        causalChain: ['alarme aumenta ventilação sem demanda metabólica', 'CO₂ cai e pH sobe', 'respiração guiada restaura CO₂ e perfusão cerebral'],
    },
    'major-hemorrhage': {
        controlledVariable: 'volume circulante e entrega de O₂ após perda sanguínea',
        hypothesisPrompt: 'A taquicardia é a fonte do choque ou uma compensação ainda necessária?',
        hypotheses: [
            hypothesis('primary-tachycardia', 'A frequência alta é a causa; bloqueá-la restaura perfusão.'),
            hypothesis('oxygen-only', 'Aumentar PaO₂ substitui volume e hemoglobina perdidos.'),
            hypothesis('volume-loss', 'Perda de volume reduz pré-carga; simpático tenta preservar débito.', true),
        ],
        predictions: [
            prediction('map', 'meanArterialPressure', 'Com hemostasia e reposição balanceada, a PAM tende a…', 'increase', 2),
            prediction('perfusion', 'tissuePerfusion', 'Quando volume e entrega melhoram, a perfusão tecidual tende a…', 'increase', 2),
        ],
        causalChain: ['sangramento reduz volume e hemoglobina', 'taquicardia e vasoconstrição compensam temporariamente', 'controle da fonte e transfusão restauram entrega'],
    },
};

export function getScenarioLearning(scenarioId: string): ScenarioLearningDefinition | undefined {
    return SCENARIO_LEARNING[scenarioId];
}

export function validateScenarioReasoning(
    scenarioId: string,
    reasoning: ScenarioReasoningSubmission | undefined,
): { valid: boolean; missing: string[] } {
    const learning = getScenarioLearning(scenarioId);
    if (!learning) return { valid: true, missing: [] };
    if (!reasoning) return { valid: false, missing: ['hipótese', 'duas previsões'] };

    const missing: string[] = [];
    if (!learning.hypotheses.some(option => option.id === reasoning.hypothesisId)) missing.push('hipótese');
    const missingPredictions = learning.predictions.filter(item => !reasoning.predictions[item.id]);
    if (missingPredictions.length > 0) missing.push(`${missingPredictions.length} previsão(ões)`);
    return { valid: missing.length === 0, missing };
}

export function getObservedDirection(
    initialValue: number,
    finalValue: number,
    threshold: number,
): PredictionDirection {
    const delta = finalValue - initialValue;
    if (Math.abs(delta) <= threshold) return 'stable';
    return delta > 0 ? 'increase' : 'decrease';
}

export function assessScenarioLearning(
    scenarioId: string,
    onset: ScenarioMetricSnapshot,
    final: ScenarioMetricSnapshot,
    reasoning: ScenarioReasoningSubmission,
    risk: ResolutionRisk,
): ScenarioLearningAssessment {
    const learning = getScenarioLearning(scenarioId);
    if (!learning) throw new Error(`Aprendizado do cenário ${scenarioId} não configurado.`);

    const selectedHypothesis = learning.hypotheses.find(option => option.id === reasoning.hypothesisId);
    const hypothesisMatched = Boolean(selectedHypothesis?.correct);
    const predictions = learning.predictions.map(item => {
        const definition = SCENARIO_METRIC_CATALOG[item.metricKey];
        const initialValue = onset.values[item.metricKey];
        const finalValue = final.values[item.metricKey];
        const observedDirection = getObservedDirection(initialValue, finalValue, item.threshold);
        const predictedDirection = reasoning.predictions[item.id];
        return {
            id: item.id,
            metricKey: item.metricKey,
            label: definition.label,
            unit: definition.unit,
            digits: definition.digits,
            initialValue,
            finalValue,
            predictedDirection,
            observedDirection,
            adaptiveDirection: item.adaptiveDirection,
            predictionMatched: predictedDirection === observedDirection,
            adaptiveTargetMatched: item.adaptiveDirection === observedDirection,
        };
    });
    const predictionMatches = predictions.filter(item => item.predictionMatched).length;
    const adaptiveTargetsMatched = predictions.filter(item => item.adaptiveTargetMatched).length;
    let outcome: RoutineDecisionOutcome = adaptiveTargetsMatched === predictions.length
        ? 'adaptive'
        : adaptiveTargetsMatched > 0
            ? 'partial'
            : 'harmful';
    if (outcome === 'partial' && risk !== 'recoverable') outcome = 'harmful';
    if (risk === 'catastrophic') {
        outcome = outcome === 'adaptive' ? 'partial' : 'harmful';
    }
    const reasoningScore = (Number(hypothesisMatched) + predictionMatches) / (predictions.length + 1);
    const outcomeLabel = outcome === 'adaptive' ? 'recuperação funcional' : outcome === 'partial' ? 'resposta parcial' : 'descompensação';
    const summary = `${outcomeLabel}: ${adaptiveTargetsMatched}/${predictions.length} metas fisiológicas seguiram a direção necessária. Hipótese ${hypothesisMatched ? 'compatível' : 'incompatível'}; ${predictionMatches}/${predictions.length} previsões coincidiram com a trajetória.`;
    return {
        outcome,
        hypothesisMatched,
        hypothesisLabel: selectedHypothesis?.label ?? 'Hipótese não reconhecida',
        predictionMatches,
        adaptiveTargetsMatched,
        reasoningScore,
        predictions,
        summary,
    };
}

export function getPredictionDirectionLabel(direction: PredictionDirection): string {
    return directionLabels[direction];
}
