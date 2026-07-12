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

  it('aplica água e controles sistêmicos dentro dos limites', () => {
    const store = useSimulationStore.getState();
    store.ingestWater(500);
    store.setHeartRateTarget(220);
    store.setVentilationDrive(40);
    store.setRenalWaterReabsorption(100);
    const state = useSimulationStore.getState();
    expect(state.interventions.pendingWaterMl).toBeGreaterThan(0);
    expect(state.interventions.cumulativeWaterMl).toBe(500);
    expect(state.interventions.heartRateTarget).toBe(180);
    expect(state.interventions.ventilationDrive).toBe(50);
    expect(state.interventions.renalWaterReabsorption).toBe(99.8);
  });

  it('libera hormônio, cobra ATP e cria cooldown', () => {
    const before = useSimulationStore.getState().physiology.energy.atpPool;
    useSimulationStore.getState().releaseHormone('adrenaline', 200);
    const state = useSimulationStore.getState();
    expect(state.activeHormonalActions).toHaveLength(1);
    expect(state.hormonalCooldowns.has('adrenaline')).toBe(true);
    expect(state.physiology.energy.atpPool).toBeLessThan(before);
  });
});

describe('ciclo de gameplay celular', () => {
  const controls = { heartRateTarget: 70, ventilationDrive: 100, renalWaterReabsorption: 99.2, pendingWaterMl: 0 };

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

  it('cria cenário cotidiano e aplica a decisão do jogador', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    initial.pools.captured.glucose = 1;
    const started = advanceCellularSimulation(initial, initializePhysiologyState(), controls, 0.25);
    expect(started.state.routine?.id).toBe('stair-climb');
    expect(started.state.routine?.choices).toHaveLength(2);

    const lactateBefore = started.state.tissue.lactateMmolL;
    const decision = resolveRoutineDecision(started.state, 'stair-glycolytic');
    expect(decision.ok).toBe(true);
    expect(decision.state.routine).toBeNull();
    expect(decision.state.tissue.lactateMmolL).toBeGreaterThan(lactateBefore);
  });

  it('aplica consequência quando o cenário expira sem decisão', () => {
    const initial = initializeCellularState();
    initial.nextRoutineAt = 0;
    let state = advanceCellularSimulation(initial, initializePhysiologyState(), controls, 0.25).state;
    const atpBefore = state.cell.atpMmolL;
    for (let index = 0; index < 3; index += 1) {
      state = advanceCellularSimulation(state, initializePhysiologyState(), controls, 10).state;
    }
    expect(state.routine).toBeNull();
    expect(state.lastEvent).toContain('Decisão não tomada');
    expect(state.cell.atpMmolL).toBeLessThan(atpBefore);
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
