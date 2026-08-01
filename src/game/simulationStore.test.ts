import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceCellularSimulation,
  allocateAtp,
  captureSubstrate,
  initializeCellularState,
  oxidizeSubstrate,
  purchaseAutomation,
  resolveRoutineDecision,
  runGlycolysis,
} from './cellularSimulation';
import { initializePhysiologyState } from './physiology';
import { getScenarioContext } from './scenarios';
import { useSimulationStore } from './simulationStore';

describe('controles da simulação', () => {
  beforeEach(() => {
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
      cellular: { ...cellular, nextRoutineAt: 0 },
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

    expect(useSimulationStore.getState().captureCellularSubstrate('oxygen')).toBe(true);
    expect(useSimulationStore.getState().recentEvents).toHaveLength(eventCount);
    expect(useSimulationStore.getState().resolveCellularRoutine('stair-aerobic')).toBe(true);
    const resolved = useSimulationStore.getState();
    expect(resolved.cellular.routine).toBeNull();
    expect(resolved.isRunning).toBe(true);
    expect(resolved.lastDecision?.outcome).toBe('adaptive');
    expect(resolved.physiology.energy.energyDeficit).toBeLessThan(deficitDuringEvent);
  });

  it('aplica prejuízo sistêmico quando o caminho escolhido está errado', () => {
    const cellular = useSimulationStore.getState().cellular;
    useSimulationStore.setState({
      cellular: { ...cellular, nextRoutineAt: 0 },
      isRunning: true,
      lastTickTime: Date.now() - 1000,
    });
    useSimulationStore.getState().tick();
    const loadDuringEvent = useSimulationStore.getState().physiology.allostaticLoad.currentLoad;

    expect(useSimulationStore.getState().resolveCellularRoutine('stair-glycolytic')).toBe(true);
    const resolved = useSimulationStore.getState();
    expect(resolved.lastDecision?.outcome).toBe('harmful');
    expect(resolved.physiology.allostaticLoad.currentLoad).toBeGreaterThan(loadDuringEvent);
    expect(resolved.recentEvents[0].severity).toBe('critical');
  });
});

describe('ciclo de gameplay celular', () => {
  const controls = { heartRateTarget: 70, ventilationDrive: 100, renalWaterReabsorption: 99.2, pendingWaterMl: 0, exercise: 60, temperature: 22 };

  it('capta glicose, executa glicólise e oxida piruvato', () => {
    let state = initializeCellularState();
    const glucose = captureSubstrate(state, 'glucose');
    expect(glucose.ok).toBe(true);
    state = glucose.state;
    const glycolysis = runGlycolysis(state);
    expect(glycolysis.ok).toBe(true);
    state = glycolysis.state;
    const oxygen = captureSubstrate(state, 'oxygen');
    expect(oxygen.ok).toBe(true);
    state = oxygen.state;
    const oxidation = oxidizeSubstrate(state, 'pyruvate');
    expect(oxidation.ok).toBe(true);
    expect(oxidation.state.totalAtpProduced).toBeGreaterThan(state.totalAtpProduced);
    expect(oxidation.state.mitochondria.processing.pyruvatePerMin).toBeGreaterThan(0);
    expect(oxidation.state.mitochondria.processing.nadhPerMin).toBeGreaterThan(0);
    expect(oxidation.state.mitochondria.processing.oxygenPerMin).toBeGreaterThan(0);
    const continued = advanceCellularSimulation(oxidation.state, initializePhysiologyState(), controls, .25);
    expect(continued.state.mitochondria.processing.pyruvatePerMin).toBeGreaterThan(0);
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

  it('cria evento com contexto embutido e distingue decisão adaptativa da prejudicial', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    const started = advanceCellularSimulation(initial, initializePhysiologyState(), controls, 0.25);
    expect(started.state.routine?.id).toBe('stair-climb');
    expect(started.state.routine?.choices).toHaveLength(2);
    expect(getScenarioContext(started.state.routine?.id).exercise).toBe(78);

    started.state.pools.captured.oxygen = 1;
    const correct = resolveRoutineDecision(started.state, 'stair-aerobic');
    expect(correct.ok).toBe(true);
    expect(correct.decisionOutcome).toBe('adaptive');
    expect(correct.state.routine).toBeNull();

    const lactateBefore = started.state.tissue.lactateMmolL;
    const wrong = resolveRoutineDecision(started.state, 'stair-glycolytic');
    expect(wrong.ok).toBe(true);
    expect(wrong.decisionOutcome).toBe('harmful');
    expect(wrong.state.tissue.lactateMmolL).toBeGreaterThan(lactateBefore);
    expect(wrong.state.damage.oxidativeStress).toBeGreaterThan(correct.state.damage.oxidativeStress);
  });

  it('bloqueia uma decisão sem recursos e cobra os substratos ao liberá-la', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    const started = advanceCellularSimulation(initial, initializePhysiologyState(), controls, .25).state;
    const blocked = resolveRoutineDecision(started, 'stair-aerobic');
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain('O₂ captado');
    expect(blocked.state.routine?.id).toBe('stair-climb');

    started.pools.captured.oxygen = 1;
    const oxygenBefore = started.pools.captured.oxygen;
    const spentBefore = started.totalAtpSpent;
    const resolved = resolveRoutineDecision(started, 'stair-aerobic');
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
    expect(result.state.routine?.triggerReason).toContain('78%');
    expect(macro.activityLevel).toBe(0);
  });

  it('mantém a situação bloqueante até o jogador escolher um caminho', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    let state = advanceCellularSimulation(initial, initializePhysiologyState(), controls, 0.25).state;
    state = advanceCellularSimulation(state, initializePhysiologyState(), controls, 60).state;
    expect(state.routine?.id).toBe('stair-climb');
    expect(state.routine?.remainingSeconds).toBeGreaterThan(0);
  });

  it('oferece adaptação variável somente após estabilidade fisiológica', () => {
    let rewarded = false;
    for (let index = 0; index < 20 && !rewarded; index += 1) {
      const prepared = initializeCellularState();
      prepared.nextRoutineAt = 9999;
      prepared.simulationTime = 100 + index * 7;
      prepared.rewards = {
        homeostasisSeconds: 60,
        rosControlSeconds: 60,
        balancedFuelSeconds: 60,
        phStableSeconds: 60,
        hypoxiaStableSeconds: 0,
        lastOpportunityAt: 0,
      };
      prepared.pools.captured.glucose = 1;
      prepared.pools.captured.fattyAcid = 1;
      const result = advanceCellularSimulation(prepared, initializePhysiologyState(), controls, .25);
      const rewardEvent = result.events.find(event => event.affectedSystems.includes('reward'));
      if (rewardEvent) {
        rewarded = true;
        expect(rewardEvent.message).toContain('Adaptação desbloqueada');
        expect(Object.values(result.state.adaptations).reduce((sum, level) => sum + level, 0)).toBe(1);
      }
    }
    expect(rewarded).toBe(true);
  });
});
