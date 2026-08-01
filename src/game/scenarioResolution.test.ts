import { describe, expect, it } from 'vitest';
import { initializeCellularState } from './cellularSimulation';
import { createInitialHypothalamicState } from './hypothalamus';
import { initializePhysiologyState } from './physiology';
import { evaluateScenarioResolution } from './scenarioResolution';

describe('somatória entre evento, hormônios e condição do organismo', () => {
  it('amplifica um caminho prejudicial até risco catastrófico quando os sinais se somam', () => {
    const baseline = evaluateScenarioResolution(
      'stair-climb',
      'harmful',
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
      'harmful',
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
      'adaptive',
      physiology,
      cellular,
      createInitialHypothalamicState(),
    );
    const protectiveAxis = { ...createInitialHypothalamicState(), osmoticDrive: .85 };
    const protectedResolution = evaluateScenarioResolution(
      'heat-dehydration',
      'adaptive',
      physiology,
      cellular,
      protectiveAxis,
    );
    expect(protectedResolution.protectiveScore).toBeGreaterThan(neutral.protectiveScore);
    expect(protectedResolution.effectMultiplier).toBeGreaterThan(neutral.effectMultiplier);
  });
});
