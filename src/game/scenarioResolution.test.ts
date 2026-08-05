import { describe, expect, it } from 'vitest';
import { initializeCellularState } from './cellularSimulation';
import { createInitialHypothalamicState } from './hypothalamus';
import { initializePhysiologyState } from './physiology';
import { evaluateScenarioResolution } from './scenarioResolution';

describe('somatória entre evento, hormônios e condição do organismo', () => {
  it('amplifica um caminho prejudicial até risco catastrófico quando os sinais se somam', () => {
    const baseline = evaluateScenarioResolution(
      'stair-climb',
      initializePhysiologyState(),
      initializeCellularState(),
      createInitialHypothalamicState(),
    );
    const physiology = initializePhysiologyState();
    physiology.hormones.adrenaline = 180;
    physiology.hormones.noradrenaline = 650;
    physiology.hormones.cortisol = 58;
    physiology.hormones.t3 = 280;
    physiology.pathophysiology.diseaseBurden = 82;
    physiology.allostaticLoad.currentLoad = 88;
    const cellular = initializeCellularState();
    cellular.cell.viabilityPercent = 42;
    cellular.fate.apoptoticCommitment = 72;

    const compounded = evaluateScenarioResolution(
      'stair-climb',
      physiology,
      cellular,
      createInitialHypothalamicState(),
    );
    expect(compounded.effectMultiplier).toBeGreaterThan(baseline.effectMultiplier);
    expect(compounded.risk).toBe('catastrophic');
  });

  it('reconhece sinais protetores que aumentam a chance de recuperação', () => {
    const physiology = initializePhysiologyState();
    const cellular = initializeCellularState();
    const neutral = evaluateScenarioResolution(
      'heat-dehydration',
      physiology,
      cellular,
      createInitialHypothalamicState(),
    );
    const protectiveAxis = { ...createInitialHypothalamicState(), osmoticDrive: .85 };
    const protectedResolution = evaluateScenarioResolution(
      'heat-dehydration',
      physiology,
      cellular,
      protectiveAxis,
    );
    expect(protectedResolution.protectiveScore).toBeGreaterThan(neutral.protectiveScore);
    expect(protectedResolution.effectMultiplier).toBeGreaterThan(neutral.effectMultiplier);
  });

  it('faz reservas, adaptações, pools e acoplamento alterarem uma crise difícil', () => {
    const physiology = initializePhysiologyState();
    const baselineCellular = initializeCellularState();
    const baseline = evaluateScenarioResolution(
      'mitochondrial-uncoupling',
      physiology,
      baselineCellular,
      createInitialHypothalamicState(),
    );
    const prepared = initializeCellularState();
    prepared.pools.captured = { glucose: 5, oxygen: 18, fattyAcid: 3, aminoAcid: 3 };
    prepared.pools.pyruvate = 8;
    prepared.adaptations = {
      enzymaticEfficiency: 3,
      antioxidantDefense: 3,
      metabolicFlexibility: 3,
      bufferCapacity: 3,
      hypoxiaTolerance: 3,
    };
    prepared.automation = { transporters: 3, mitochondrialShuttle: 3, repair: 2 };
    prepared.damage.antioxidantCapacity = 100;
    prepared.mitochondria.etcFluxPercent = prepared.mitochondria.atpSynthaseFlux;

    const resilient = evaluateScenarioResolution(
      'mitochondrial-uncoupling',
      physiology,
      prepared,
      createInitialHypothalamicState(),
    );
    expect(resilient.protectiveScore).toBeGreaterThan(baseline.protectiveScore);
    expect(resilient.effectMultiplier).toBeGreaterThan(baseline.effectMultiplier);
  });
});
