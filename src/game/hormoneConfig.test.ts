import { describe, expect, it } from 'vitest';
import { HORMONAL_ACTIONS, HORMONE_DEFINITIONS } from './config/hormones';
import { detectActiveCombos } from './actions';
import { initializePhysiologyState } from './physiology';

describe('registro hormonal único', () => {
  it('mantém IDs únicos e metadados executáveis completos', () => {
    expect(new Set(HORMONAL_ACTIONS.map(action => action.id)).size).toBe(HORMONAL_ACTIONS.length);
    for (const action of HORMONAL_ACTIONS) {
      expect(HORMONE_DEFINITIONS[action.hormone]).toBeDefined();
      expect(action.dose).toBeGreaterThan(0);
      expect(action.infusionSeconds).toBeGreaterThan(0);
      expect(action.cooldownSeconds).toBeGreaterThan(0);
      expect(action.implementedEffects.length).toBeGreaterThan(0);
    }
  });

  it('não considera concentrações basais como combos ativos', () => {
    const state = initializePhysiologyState();
    const combos = detectActiveCombos(state.hormones, {
      glucose: state.nutrients.bloodGlucose,
      aminoAcids: state.nutrients.aminoAcids,
      heartRate: state.cardiovascular.heartRate,
      energyDemand: state.energy.atpDemand,
      allostaticLoad: state.allostaticLoad.currentLoad,
      liverGlycogen: state.nutrients.liverGlycogen,
      fattyAcids: state.nutrients.fattyAcids,
    });
    expect(combos).toHaveLength(0);
  });
});
