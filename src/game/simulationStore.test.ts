import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceCellularSimulation,
  allocateAtp,
  captureSubstrate,
  getCellularAutomationPerformance,
  initializeCellularState,
  oxidizeSubstrate,
  purchaseAutomation,
  resolveRoutineDecision,
  runGlycolysis,
} from './cellularSimulation';
import { initializePhysiologyState } from './physiology';
import { isActionSafe } from './actions';
import { isHypothalamicSignalSafe, type HypothalamicSignalId } from './hypothalamus';
import { applyScenarioPhysiologyEffects, getScenarioContext, getScenarioDefinition, SCENARIO_DEFINITIONS, selectEligibleScenario } from './scenarios';
import { useSimulationStore } from './simulationStore';
import { ALL_SCENARIO_METRIC_KEYS, createScenarioMetricSnapshot, SCENARIO_METRICS } from './scenarioMetrics';
import { advanceScenarioNarrative, getScenarioNarrative } from './scenarioNarrative';
import { physiologicalSecondsAt } from './simulationCalendar';
import { getScenarioLearning, type ScenarioReasoningSubmission } from './scenarioLearning';
import { createInitialAdaptationProgress } from './adaptationWindow';

function forceScenario<T extends ReturnType<typeof initializeCellularState>>(state: T, scenarioId: string): T {
  return {
    ...state,
    nextRoutineAt: 0,
    scenarioCooldowns: Object.fromEntries(
      SCENARIO_DEFINITIONS.map(definition => [definition.id, definition.id === scenarioId ? 0 : 9999]),
    ),
  };
}

function advanceStoreTicks(count: number) {
  for (let index = 0; index < count; index += 1) {
    useSimulationStore.setState({ lastTickTime: Date.now() - 1000 });
    useSimulationStore.getState().tick();
  }
}

function adaptiveReasoning(scenarioId: string): ScenarioReasoningSubmission {
  const learning = getScenarioLearning(scenarioId);
  if (!learning) throw new Error(`Aprendizado ausente para ${scenarioId}`);
  return {
    hypothesisId: learning.hypotheses.find(option => option.correct)?.id ?? '',
    predictions: Object.fromEntries(
      learning.predictions.map(item => [item.id, item.adaptiveDirection]),
    ),
  };
}

describe('controles da simulação', () => {
  beforeEach(() => {
    useSimulationStore.getState().setSimulationDifficulty('easy');
    useSimulationStore.getState().reset();
  });

  it('inicia, pausa e altera a velocidade', () => {
    useSimulationStore.getState().pause();
    expect(useSimulationStore.getState().isRunning).toBe(false);
    useSimulationStore.getState().setTimeSpeed(4);
    useSimulationStore.getState().start();
    expect(useSimulationStore.getState().isRunning).toBe(true);
    expect(useSimulationStore.getState().timeSpeed).toBe(4);
  });

  it('mantém a dificuldade escolhida ao reiniciar e usa esse modo na seleção', () => {
    useSimulationStore.getState().setSimulationDifficulty('hard');
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().simulationDifficulty).toBe('hard');

    const cellular = useSimulationStore.getState().cellular;
    useSimulationStore.setState({
      cellular: forceScenario(cellular, 'mitochondrial-uncoupling'),
      isRunning: true,
      lastTickTime: Date.now() - 1000,
    });
    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().cellular.routine?.id).toBe('mitochondrial-uncoupling');
  });

  it('oferece e resolve a janela adaptativa sem pausar ou abrir cenário clínico', () => {
    const cellular = initializeCellularState();
    cellular.simulationTime = 180;
    cellular.nextRoutineAt = 9999;
    cellular.rewards.homeostasisSeconds = 60;
    cellular.rewards.rosControlSeconds = 60;
    cellular.rewards.phStableSeconds = 60;
    const progress = createInitialAdaptationProgress();
    useSimulationStore.setState({
      cellular,
      adaptationOpportunity: null,
      adaptationProgress: progress,
      isRunning: true,
      lastTickTime: Date.now() - 250,
    });

    useSimulationStore.getState().tick();
    const offered = useSimulationStore.getState();
    expect(offered.adaptationOpportunity).not.toBeNull();
    expect(offered.cellular.routine).toBeNull();
    expect(offered.isRunning).toBe(true);

    const choiceId = offered.adaptationOpportunity?.choices[0]?.id;
    expect(choiceId && offered.resolveAdaptationOpportunity(choiceId)).toBe(true);
    expect(useSimulationStore.getState().adaptationOpportunity).toBeNull();
    expect(useSimulationStore.getState().adaptationProgress.resolved).toBe(1);
  });

  it('aplica água e converte sinais hipotalâmicos em comandos internos', () => {
    const store = useSimulationStore.getState();
    store.ingestWater(500);
    expect(store.sendHypothalamicSignal('sympathetic-arousal').ok).toBe(true);
    expect(store.sendHypothalamicSignal('chemoreflex-ventilation').ok).toBe(true);
    expect(store.sendHypothalamicSignal('adh-retention').ok).toBe(true);
    useSimulationStore.setState({ lastTickTime: Date.now() - 100 });
    useSimulationStore.getState().tick();
    const state = useSimulationStore.getState();
    expect(state.interventions.pendingWaterMl).toBeGreaterThan(0);
    expect(state.interventions.cumulativeWaterMl).toBe(500);
    expect(state.hypothalamus.autonomicTone).toBeGreaterThan(0);
    expect(state.hypothalamus.respiratoryDrive).toBeGreaterThan(0);
    expect(state.hypothalamus.osmoticDrive).toBeGreaterThan(0);
    expect(state.interventions.heartRateTarget).toBeGreaterThan(70);
    expect(state.interventions.ventilationDrive).toBeGreaterThan(100);
    expect(state.interventions.renalWaterReabsorption).toBeGreaterThan(99.2);
  });

  it('libera hormônio, cobra ATP e cria cooldown', () => {
    const before = useSimulationStore.getState().physiology.energy.atpPool;
    const queued = useSimulationStore.getState().releaseHormone('release-adrenaline');
    expect(queued.ok).toBe(true);
    useSimulationStore.setState({ lastTickTime: Date.now() - 100 });
    useSimulationStore.getState().tick();
    const state = useSimulationStore.getState();
    expect(state.activeHormonalActions).toHaveLength(1);
    expect(state.hormonalCooldowns['release-adrenaline']).toBeGreaterThan(0);
    expect(state.physiology.energy.atpPool).toBeLessThan(before);
  });

  it('revalida segurança hormonal no domínio antes de enfileirar', () => {
    const physiology = useSimulationStore.getState().physiology;
    useSimulationStore.setState({
      physiology: { ...physiology, nutrients: { ...physiology.nutrients, bloodGlucose: 55 } },
    });
    const result = useSimulationStore.getState().releaseHormone('release-insulin');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Glicemia');
    expect(useSimulationStore.getState().pendingCommands).toHaveLength(0);
  });

  it('pausa em todo evento e só retoma depois de uma decisão obrigatória', () => {
    const cellular = useSimulationStore.getState().cellular;
    useSimulationStore.setState({
      cellular: forceScenario(cellular, 'stair-climb'),
      isRunning: true,
      lastTickTime: Date.now() - 1000,
    });

    useSimulationStore.getState().tick();
    const waiting = useSimulationStore.getState();
    expect(waiting.cellular.routine?.id).toBe('stair-climb');
    expect(waiting.isRunning).toBe(false);
    expect(waiting.resumeAfterDecision).toBe(true);
    const deficitDuringEvent = waiting.physiology.energy.energyDeficit;

    const eventCount = waiting.recentEvents.length;
    waiting.start();
    useSimulationStore.setState({ lastTickTime: Date.now() - 1000 });
    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().isRunning).toBe(false);
    expect(useSimulationStore.getState().cellular.routine?.id).toBe('stair-climb');
    expect(useSimulationStore.getState().recentEvents).toHaveLength(eventCount);

    useSimulationStore.setState({
      cellular: {
        ...useSimulationStore.getState().cellular,
        pools: {
          ...useSimulationStore.getState().cellular.pools,
          captured: { ...useSimulationStore.getState().cellular.pools.captured, oxygen: 1 },
        },
      },
    });
    expect(useSimulationStore.getState().sendHypothalamicSignal('chemoreflex-ventilation').ok).toBe(true);
    expect(useSimulationStore.getState().resolveCellularRoutine('stair-aerobic', adaptiveReasoning('stair-climb'))).toBe(true);
    const resolved = useSimulationStore.getState();
    expect(resolved.cellular.routine).toBeNull();
    expect(resolved.isRunning).toBe(true);
    expect(resolved.lastDecision).toBeNull();
    expect(resolved.scenarioResponse?.reasoning.hypothesisId).toBe('demand-mismatch');
    expect(resolved.activeScenarioId).toBe('stair-climb');
    expect(resolved.hypothalamus.respiratoryDrive).toBeGreaterThan(0);
    expect(resolved.physiology.energy.energyDeficit).toBe(deficitDuringEvent);

    useSimulationStore.getState().setTimeSpeed(4);
    advanceStoreTicks(1);
    expect(useSimulationStore.getState().physiology.activityLevel).toBeGreaterThan(0);
    advanceStoreTicks(20);
    const observed = useSimulationStore.getState();
    expect(observed.scenarioResponse).toBeNull();
    expect(observed.activeScenarioId).toBeNull();
    expect(observed.lastDecision?.outcome).toBe('adaptive');
  });

  it('aplica prejuízo sistêmico quando o caminho escolhido está errado', () => {
    const cellular = useSimulationStore.getState().cellular;
    useSimulationStore.setState({
      cellular: forceScenario(cellular, 'stair-climb'),
      isRunning: true,
      lastTickTime: Date.now() - 1000,
    });
    useSimulationStore.getState().tick();
    const loadDuringEvent = useSimulationStore.getState().physiology.allostaticLoad.currentLoad;

    expect(useSimulationStore.getState().releaseHormone('release-adrenaline').ok).toBe(true);
    expect(useSimulationStore.getState().resolveCellularRoutine('stair-glycolytic', adaptiveReasoning('stair-climb'))).toBe(true);
    const startedResponse = useSimulationStore.getState();
    expect(startedResponse.lastDecision).toBeNull();
    expect(startedResponse.physiology.allostaticLoad.currentLoad).toBe(loadDuringEvent);
    useSimulationStore.getState().setTimeSpeed(4);
    advanceStoreTicks(20);
    const resolved = useSimulationStore.getState();
    expect(resolved.lastDecision?.outcome).toBe('harmful');
    expect(resolved.physiology.allostaticLoad.currentLoad).toBeGreaterThan(loadDuringEvent);
    expect(resolved.recentEvents.some(event => event.severity === 'critical' && event.affectedSystems.includes('decision'))).toBe(true);
    expect(resolved.iatrogenicEpisodes.some(episode => episode.mechanism === 'decision-error')).toBe(true);
    expect(resolved.recentEvents.some(event => event.message.startsWith('Erro de decisão:'))).toBe(true);
  });

  it('exige e aplica regulação simpática na hipotensão ortostática', () => {
    const cellular = forceScenario(useSimulationStore.getState().cellular, 'orthostatic-transition');
    useSimulationStore.setState({ cellular, isRunning: true, lastTickTime: Date.now() - 1000 });
    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().cellular.routine?.id).toBe('orthostatic-transition');
    expect(useSimulationStore.getState().resolveCellularRoutine('orthostasis-sympathetic', adaptiveReasoning('orthostatic-transition'))).toBe(false);

    expect(useSimulationStore.getState().sendHypothalamicSignal('sympathetic-arousal').ok).toBe(true);
    expect(useSimulationStore.getState().resolveCellularRoutine('orthostasis-sympathetic', adaptiveReasoning('orthostatic-transition'))).toBe(true);
    const response = useSimulationStore.getState();
    expect(response.hypothalamus.autonomicTone).toBeGreaterThan(0);
    expect(response.scenarioResponse?.scenarioId).toBe('orthostatic-transition');
    expect(response.iatrogenicEpisodes).toHaveLength(0);
  });

  it('exige contrarregulação hormonal na hipoglicemia noturna', () => {
    const physiology = useSimulationStore.getState().physiology;
    const nightTime = physiologicalSecondsAt(2, 2);
    const cellular = {
      ...forceScenario(useSimulationStore.getState().cellular, 'nocturnal-hypoglycemia'),
      simulationTime: nightTime,
    };
    useSimulationStore.setState({
      physiology: {
        ...physiology,
        timeElapsed: nightTime,
        nutrients: { ...physiology.nutrients, hoursSinceMeal: 6, bloodGlucose: 92 },
      },
      cellular,
      isRunning: true,
      lastTickTime: Date.now() - 1000,
    });
    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().cellular.routine?.id).toBe('nocturnal-hypoglycemia');
    expect(useSimulationStore.getState().resolveCellularRoutine('hypoglycemia-counterregulate', adaptiveReasoning('nocturnal-hypoglycemia'))).toBe(false);

    expect(useSimulationStore.getState().releaseHormone('release-glucagon').ok).toBe(true);
    expect(useSimulationStore.getState().resolveCellularRoutine('hypoglycemia-counterregulate', adaptiveReasoning('nocturnal-hypoglycemia'))).toBe(true);
    const response = useSimulationStore.getState();
    expect(response.activeHormonalActions.some(action => action.actionId === 'release-glucagon')).toBe(true);
    expect(response.scenarioResponse?.scenarioId).toBe('nocturnal-hypoglycemia');
    expect(response.iatrogenicEpisodes).toHaveLength(0);
  });

  it('mantém penalidade crítica enquanto a insulina inadequada permanece ativa', () => {
    const physiology = useSimulationStore.getState().physiology;
    const nightTime = physiologicalSecondsAt(2, 2);
    const cellular = {
      ...forceScenario(useSimulationStore.getState().cellular, 'nocturnal-hypoglycemia'),
      simulationTime: nightTime,
    };
    useSimulationStore.setState({
      physiology: {
        ...physiology,
        timeElapsed: nightTime,
        nutrients: { ...physiology.nutrients, hoursSinceMeal: 6, bloodGlucose: 92 },
      },
      cellular,
      isRunning: true,
      lastTickTime: Date.now() - 1000,
    });
    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().releaseHormone('release-insulin').ok).toBe(true);
    expect(useSimulationStore.getState().resolveCellularRoutine('hypoglycemia-insulin', adaptiveReasoning('nocturnal-hypoglycemia'))).toBe(true);
    const exposed = useSimulationStore.getState();
    expect(exposed.iatrogenicEpisodes[0]?.severity).toBe('critical');
    expect(exposed.iatrogenicEpisodes[0]?.remainingSeconds).toBeGreaterThan(80);
    const glucoseBeforeExposure = exposed.physiology.nutrients.bloodGlucose;

    exposed.setTimeSpeed(4);
    advanceStoreTicks(5);
    const progressed = useSimulationStore.getState();
    expect(progressed.physiology.nutrients.bloodGlucose).toBeLessThan(glucoseBeforeExposure);
    expect(progressed.iatrogenicEpisodes[0]?.remainingSeconds).toBeLessThan(exposed.iatrogenicEpisodes[0].remainingSeconds);
    expect(progressed.recentEvents.some(event => event.message.includes('Iatrogenia crítica'))).toBe(true);
  });
});

describe('ciclo de gameplay celular', () => {
  const controls = { heartRateTarget: 70, ventilationDrive: 100, renalWaterReabsorption: 99.2, pendingWaterMl: 0, exercise: 60, temperature: 22 };

  it('configura os novos desafios com requisitos reais de sinalização', () => {
    const scenarioIds = ['orthostatic-transition', 'hypercapnic-challenge', 'acute-water-load', 'nocturnal-hypoglycemia'];
    scenarioIds.forEach(id => {
      const definition = getScenarioDefinition(id);
      expect(definition?.choices).toHaveLength(2);
      expect(definition?.choices.every(choice => (choice.signalRequirements?.length ?? 0) > 0)).toBe(true);
    });
  });

  it('separa eventos fáceis de crises difíceis com três estratégias plausíveis', () => {
    const cellular = initializeCellularState();
    cellular.nextRoutineAt = 0;
    const physiology = initializePhysiologyState();
    const easy = selectEligibleScenario(cellular, physiology, 'easy');
    const hard = selectEligibleScenario(cellular, physiology, 'hard');

    expect(easy?.definition.difficulty).toBe('easy');
    expect(hard?.definition.difficulty).toBe('hard');
    SCENARIO_DEFINITIONS.filter(definition => definition.difficulty === 'hard').forEach(definition => {
      expect(definition.choices).toHaveLength(3);
      expect(definition.choices.every(choice => !('outcome' in choice))).toBe(true);
      expect(getScenarioLearning(definition.id)?.predictions).toHaveLength(2);
      expect(definition.choices.every(choice => (choice.signalRequirements?.length ?? 0) > 0)).toBe(true);
    });
  });

  it('integra todo marcador visível ao painel investigativo dos eventos difíceis', () => {
    const uniqueKeys = new Set(SCENARIO_METRICS.map(metric => metric.key));
    expect(uniqueKeys.size).toBe(SCENARIO_METRICS.length);
    const hardScenarios = SCENARIO_DEFINITIONS.filter(definition => definition.difficulty === 'hard');
    expect(hardScenarios.length).toBeGreaterThanOrEqual(11);
    hardScenarios.forEach(definition => {
      expect(new Set(definition.metricKeys)).toEqual(new Set(ALL_SCENARIO_METRIC_KEYS));
      expect(definition.priorityMetricKeys.length).toBeGreaterThanOrEqual(12);
    });

    const snapshot = createScenarioMetricSnapshot(initializePhysiologyState(), initializeCellularState());
    expect(Object.keys(snapshot.values)).toHaveLength(ALL_SCENARIO_METRIC_KEYS.length);
    expect(Object.values(snapshot.values).every(Number.isFinite)).toBe(true);
  });

  it('mantém continuidade e bloqueia sedentarismo depois de um treino', () => {
    const cellular = initializeCellularState();
    cellular.narrative = advanceScenarioNarrative(cellular.narrative, 'fasted-workout-free-fatty-acids');
    const selected = selectEligibleScenario(cellular, initializePhysiologyState(), 'hard');

    expect(selected?.definition.id).toBe('mitochondrial-uncoupling');
    expect(selected?.definition.id).not.toBe('chronic-anxiety-sedentary');
  });

  it('encadeia festa, ansiedade e trauma em capítulos fisiologicamente coerentes', () => {
    const continuations = [
      ['whisky-party-hepatic-overload', 'alcohol-nocturnal-hypoglycemia', physiologicalSecondsAt(2, 3)],
      ['chronic-anxiety-sedentary', 'panic-hyperventilation', physiologicalSecondsAt(1, 22)],
      ['major-hemorrhage', 'reperfusion-paradox', physiologicalSecondsAt(1, 12)],
    ] as const;

    continuations.forEach(([previousId, expectedId, elapsedSeconds]) => {
      const cellular = initializeCellularState();
      cellular.simulationTime = elapsedSeconds;
      cellular.narrative = advanceScenarioNarrative(cellular.narrative, previousId);
      const physiology = initializePhysiologyState();
      physiology.timeElapsed = elapsedSeconds;
      const selected = selectEligibleScenario(cellular, physiology, 'hard');
      expect(selected?.definition.id).toBe(expectedId);
    });
  });

  it('oferece storytelling e missão para todos os eventos cadastrados', () => {
    SCENARIO_DEFINITIONS.forEach(definition => {
      const narrative = getScenarioNarrative(definition.id);
      expect(narrative.scene.length, definition.id).toBeGreaterThan(80);
      expect(narrative.objective.length, definition.id).toBeGreaterThan(45);
    });
    SCENARIO_DEFINITIONS.filter(definition => definition.difficulty === 'hard').forEach(definition => {
      expect(definition.investigationPrompt?.length, definition.id).toBeGreaterThan(120);
      expect(definition.investigationPrompt, definition.id).toContain('?');
    });
  });

  it('mantém todas as estratégias difíceis executáveis no instante da decisão', () => {
    SCENARIO_DEFINITIONS.filter(definition => definition.difficulty === 'hard').forEach(definition => {
      const physiology = applyScenarioPhysiologyEffects(initializePhysiologyState(), definition.onStartPhysiology);
      definition.choices.flatMap(choice => choice.signalRequirements ?? []).flatMap(requirement => requirement.anyOf).forEach(signal => {
        const safety = signal.startsWith('hormone:')
          ? isActionSafe(signal.slice('hormone:'.length), {
            glucose: physiology.nutrients.bloodGlucose,
            pH: physiology.acidBase.pH,
            heartRate: physiology.cardiovascular.heartRate,
            energyDeficit: physiology.energy.energyDeficit,
            aminoAcids: physiology.nutrients.aminoAcids,
            atpPool: physiology.energy.atpPool,
          })
          : isHypothalamicSignalSafe(signal.slice('central:'.length) as HypothalamicSignalId, physiology);
        expect(safety.safe, `${definition.id}: ${signal} deveria estar disponível`).toBe(true);
      });
    });
  });

  it('produz a assinatura desacoplada mesmo com oxigenação arterial preservada', () => {
    const initial = forceScenario(initializeCellularState(), 'mitochondrial-uncoupling');
    const physiology = initializePhysiologyState();
    const started = advanceCellularSimulation(initial, physiology, { ...controls, difficulty: 'hard' }, .25).state;

    expect(started.routine?.id).toBe('mitochondrial-uncoupling');
    expect(started.mitochondria.membranePotentialMv).toBeGreaterThan(initial.mitochondria.membranePotentialMv);
    expect(started.mitochondria.etcFluxPercent).toBeGreaterThan(initial.mitochondria.etcFluxPercent);
    expect(started.cell.atpMmolL).toBeLessThan(initial.cell.atpMmolL);
    expect(started.damage.oxidativeStress).toBeGreaterThan(initial.damage.oxidativeStress);
    expect(physiology.respiratory.spo2).toBe(98);
  });

  it('exige correção combinada na acidose cetótica com fadiga ventilatória', () => {
    const initial = forceScenario(initializeCellularState(), 'mixed-ketoacidotic-fatigue');
    const started = advanceCellularSimulation(initial, initializePhysiologyState(), { ...controls, difficulty: 'hard' }, .25).state;
    expect(started.routine?.id).toBe('mixed-ketoacidotic-fatigue');

    const partial = resolveRoutineDecision(started, 'ketoacidosis-dual-control', 1, true, ['hormone:release-insulin']);
    expect(partial.ok).toBe(false);
    expect(partial.reason).toContain('quimiorreflexo');

    const combined = resolveRoutineDecision(started, 'ketoacidosis-dual-control', 1, true, ['hormone:release-insulin', 'central:chemoreflex-ventilation']);
    expect(combined.ok).toBe(true);
    expect(combined.scenarioId).toBe('mixed-ketoacidotic-fatigue');
  });

  it('aplica assinaturas sistêmicas derivadas e não apenas deltas celulares', () => {
    const definition = getScenarioDefinition('mixed-ketoacidotic-fatigue');
    const baseline = initializePhysiologyState();
    const challenged = applyScenarioPhysiologyEffects(baseline, definition?.onStartPhysiology ?? []);

    expect(challenged.nutrients.bloodGlucose).toBeGreaterThan(baseline.nutrients.bloodGlucose);
    expect(challenged.nutrients.ketones).toBeGreaterThan(baseline.nutrients.ketones);
    expect(challenged.acidBase.anionGap).toBeGreaterThan(baseline.acidBase.anionGap);
    expect(challenged.acidBase.bicarbonate).toBeLessThan(baseline.acidBase.bicarbonate);
    expect(challenged.respiratory.paco2).toBeGreaterThan(baseline.respiratory.paco2);
    expect(challenged.renal.gfr).toBeLessThan(baseline.renal.gfr);
  });

  it('capta glicose, executa glicólise e oxida piruvato', () => {
    let state = initializeCellularState();
    const glucose = captureSubstrate(state, 'glucose');
    expect(glucose.ok).toBe(true);
    state = glucose.state;
    const glycolysis = runGlycolysis(state);
    expect(glycolysis.ok).toBe(true);
    state = glycolysis.state;
    const oxygen = captureSubstrate(state, 'oxygen');
    expect(oxygen.ok).toBe(false);
    expect(oxygen.reason).toContain('gradiente de PO₂');
    state.pools.captured.oxygen = 3;
    const oxidation = oxidizeSubstrate(state, 'pyruvate');
    expect(oxidation.ok).toBe(true);
    expect(oxidation.state.totalAtpProduced).toBeGreaterThan(state.totalAtpProduced);
    expect(oxidation.state.mitochondria.processing.pyruvatePerMin).toBeGreaterThan(0);
    expect(oxidation.state.mitochondria.processing.nadhPerMin).toBeGreaterThan(0);
    expect(oxidation.state.mitochondria.processing.oxygenPerMin).toBeGreaterThan(0);
    const continued = advanceCellularSimulation(oxidation.state, initializePhysiologyState(), controls, .25);
    expect(continued.state.mitochondria.processing.pyruvatePerMin).toBeGreaterThan(0);
  });

  it('faz O₂ seguir o gradiente e modula GLUT4 por insulina e contração', () => {
    const lowSignal = initializePhysiologyState();
    lowSignal.hormones.insulin = 1;
    lowSignal.activityLevel = 0;
    const highSignal = initializePhysiologyState();
    highSignal.hormones.insulin = 18;
    highSignal.activityLevel = 75;

    const lowState = initializeCellularState();
    lowState.nextRoutineAt = 9999;
    const highState = initializeCellularState();
    highState.nextRoutineAt = 9999;
    const low = advanceCellularSimulation(lowState, lowSignal, controls, 5).state;
    const high = advanceCellularSimulation(highState, highSignal, controls, 5).state;

    expect(low.pools.captured.oxygen).toBeGreaterThan(0);
    expect(high.pools.captured.glucose).toBeGreaterThan(low.pools.captured.glucose);
    expect(captureSubstrate(high, 'oxygen').ok).toBe(false);
  });

  it('abastece glicose e aminoácidos coletáveis pela entrega capilar', () => {
    const state = initializeCellularState();
    state.nextRoutineAt = 9999;
    state.pools.available.glucose = 0;
    state.pools.available.aminoAcid = 0;

    const delivered = advanceCellularSimulation(state, initializePhysiologyState(), controls, 5).state;

    expect(delivered.pools.available.glucose).toBeGreaterThan(0);
    expect(delivered.pools.available.aminoAcid).toBeGreaterThan(0);
  });

  it('repara dano e compra automação quando há recursos', () => {
    const initial = initializeCellularState();
    const prepared = {
      ...initial,
      cell: { ...initial.cell, atpMmolL: 6 },
      damage: { ...initial.damage, membrane: 25 },
      pools: {
        ...initial.pools,
        captured: { glucose: 6, oxygen: 20, fattyAcid: 4, aminoAcid: 4 },
      },
    };
    const repair = allocateAtp(prepared, 'membrane');
    expect(repair.ok).toBe(true);
    expect(repair.state.damage.membrane).toBeLessThan(prepared.damage.membrane);
    const automation = purchaseAutomation(repair.state, 'transporters');
    expect(automation.ok).toBe(true);
    expect(automation.state.automation.transporters).toBe(1);
  });

  it('expõe ganhos quantitativos de cada automação sem atribuir transporte ao O₂', () => {
    const baseline = getCellularAutomationPerformance({ transporters: 0, mitochondrialShuttle: 0, repair: 0 });
    const upgraded = getCellularAutomationPerformance({ transporters: 1, mitochondrialShuttle: 1, repair: 1 });

    expect(upgraded.autoCaptureCapacityPerSecond.glucose).toBeGreaterThan(baseline.autoCaptureCapacityPerSecond.glucose);
    expect(upgraded.autoCaptureCapacityPerSecond.fattyAcid).toBeGreaterThan(baseline.autoCaptureCapacityPerSecond.fattyAcid);
    expect(upgraded.autoCaptureCapacityPerSecond.aminoAcid).toBeGreaterThan(baseline.autoCaptureCapacityPerSecond.aminoAcid);
    expect(upgraded.autoCaptureCapacityPerSecond.oxygen).toBe(baseline.autoCaptureCapacityPerSecond.oxygen);
    expect(upgraded.automaticGlycolysisCapacityPerSecond).toBeCloseTo(.016, 6);
    expect(upgraded.oxidativeCapacityMultiplier).toBeCloseTo(1.18, 6);
    expect(upgraded.automaticFattyAcidOxidationPerSecond).toBeCloseTo(.004, 6);
    expect(upgraded.automaticDamageRepairPerSecond).toBeCloseTo(.056, 6);
  });

  it('cria evento com contexto embutido e aplica mecanismos sem antecipar o desfecho', () => {
    const initial = forceScenario(initializeCellularState(), 'stair-climb');
    const started = advanceCellularSimulation(initial, initializePhysiologyState(), controls, 0.25);
    expect(started.state.routine?.id).toBe('stair-climb');
    expect(started.state.routine?.choices).toHaveLength(2);
    expect(getScenarioContext(started.state.routine?.id).exercise).toBe(78);

    started.state.pools.captured.oxygen = 1;
    const correct = resolveRoutineDecision(started.state, 'stair-aerobic', 1, true, ['central:chemoreflex-ventilation']);
    expect(correct.ok).toBe(true);
    expect(correct.scenarioId).toBe('stair-climb');
    expect(correct.state.routine).toBeNull();

    const lactateBefore = started.state.tissue.lactateMmolL;
    const wrong = resolveRoutineDecision(started.state, 'stair-glycolytic', 1, true, ['hormone:release-adrenaline']);
    expect(wrong.ok).toBe(true);
    expect(wrong.scenarioId).toBe('stair-climb');
    expect(wrong.state.tissue.lactateMmolL).toBeGreaterThan(lactateBefore);
    expect(wrong.state.damage.oxidativeStress).toBeGreaterThan(correct.state.damage.oxidativeStress);
  });

  it('bloqueia uma decisão sem recursos e cobra os substratos ao liberá-la', () => {
    const initial = forceScenario(initializeCellularState(), 'stair-climb');
    const started = advanceCellularSimulation(initial, initializePhysiologyState(), controls, .25).state;
    const blocked = resolveRoutineDecision(started, 'stair-aerobic');
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain('O₂ disponível à cadeia respiratória');
    expect(blocked.state.routine?.id).toBe('stair-climb');

    started.pools.captured.oxygen = 1;
    const oxygenBefore = started.pools.captured.oxygen;
    const spentBefore = started.totalAtpSpent;
    const resolved = resolveRoutineDecision(started, 'stair-aerobic', 1, true, ['central:chemoreflex-ventilation']);
    expect(resolved.ok).toBe(true);
    expect(resolved.state.pools.captured.oxygen).toBe(oxygenBefore - 1);
    expect(resolved.state.totalAtpSpent).toBeCloseTo(spentBefore + .15);
  });

  it('expõe a consequência de saturar transportadores e ativa destinos celulares graves', () => {
    const saturated = initializeCellularState();
    saturated.pools.captured.glucose = 5;
    const oxidativeBefore = saturated.damage.oxidativeStress;
    const captured = captureSubstrate(saturated, 'glucose');
    expect(captured.ok).toBe(true);
    expect(captured.state.transportSaturation.glucose).toBe(100);
    expect(captured.state.damage.oxidativeStress).toBeGreaterThan(oxidativeBefore);
    expect(captured.event?.severity).toBe('warning');
    expect(captured.event?.message).toContain('glicotoxicidade');

    const damaged = initializeCellularState();
    damaged.nextRoutineAt = 9999;
    damaged.damage.dna = 90;
    const progressed = advanceCellularSimulation(damaged, initializePhysiologyState(), controls, .25);
    expect(progressed.state.fate.status).toBe('apoptosis');
    expect(progressed.events.some(event => event.affectedSystems.includes('cellular-fate'))).toBe(true);
  });

  it('gera o contexto pelo evento sem depender de controles externos', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    const macro = initializePhysiologyState();
    const result = advanceCellularSimulation(initial, macro, controls, .25);
    expect(result.state.routine?.triggerReason).toBeTruthy();
    expect(getScenarioContext(result.state.routine?.id)).not.toEqual(getScenarioContext(undefined));
    expect(macro.activityLevel).toBe(0);
  });

  it('mantém a situação bloqueante até o jogador escolher um caminho', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    let state = advanceCellularSimulation(initial, initializePhysiologyState(), controls, 0.25).state;
    state = advanceCellularSimulation(state, initializePhysiologyState(), controls, 60).state;
    expect(state.routine).not.toBeNull();
    expect(state.routine?.remainingSeconds).toBeGreaterThan(0);
  });

  it('acumula estabilidade sem conceder adaptação passivamente', () => {
    const prepared = initializeCellularState();
    prepared.nextRoutineAt = 9999;
    prepared.pools.captured.glucose = 1;
    prepared.pools.captured.fattyAcid = 1;
    const result = advanceCellularSimulation(prepared, initializePhysiologyState(), controls, 2);
    expect(result.state.rewards.homeostasisSeconds).toBeGreaterThan(0);
    expect(result.events.some(event => event.affectedSystems.includes('reward'))).toBe(false);
    expect(Object.values(result.state.adaptations).reduce((sum, level) => sum + level, 0)).toBe(0);
  });
});
