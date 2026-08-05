import { describe, expect, it } from 'vitest';
import { initializePhysiologyState } from './physiology';
import { applyDiseasePreset } from './pathology';
import { calculatePhysiologyTick } from './simulationLogic';
import { physiologicalSecondsAt } from './simulationCalendar';
import type { PhysiologyState, SimulationInput } from './types';

const defaultInput: Omit<SimulationInput, 'deltaTime'> = {
  hormonalActions: [],
  externalFactors: { exercise: 0, nutrition: 80, stress: 20, sleep: 80, temperature: 22 },
  interventions: { heartRateTarget: 70, ventilationDrive: 100, renalWaterReabsorption: 99.2, waterAbsorptionRate: 0 },
};

function simulate(initial: PhysiologyState, seconds: number, override: Partial<Omit<SimulationInput, 'deltaTime'>> = {}, dt = 1) {
  let state = initial;
  const input = {
    ...defaultInput,
    ...override,
    externalFactors: { ...defaultInput.externalFactors, ...override.externalFactors },
    interventions: { ...defaultInput.interventions, ...override.interventions },
  };
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    state = calculatePhysiologyTick(state, { ...input, deltaTime: Math.min(dt, seconds - elapsed) }).newState;
  }
  return state;
}

describe('trajetórias do motor sistêmico', () => {
  it('mantém o basal em faixa e não produz valores inválidos', () => {
    const state = simulate(initializePhysiologyState(), 10 * 60);
    expect(state.cardiovascular.heartRate).toBeGreaterThan(60);
    expect(state.cardiovascular.heartRate).toBeLessThan(80);
    expect(state.respiratory.paco2).toBeGreaterThan(35);
    expect(state.respiratory.paco2).toBeLessThan(45);
    expect(state.acidBase.pH).toBeGreaterThan(7.35);
    expect(state.acidBase.pH).toBeLessThan(7.45);
    expect(state.nutrients.bloodGlucose).toBeGreaterThan(70);
    expect(Object.values(state.energy).every(value => Number.isFinite(value))).toBe(true);
  });

  it('preserva a direção da resposta com passos diferentes', () => {
    const slow = simulate(initializePhysiologyState(), 120, { externalFactors: { ...defaultInput.externalFactors, exercise: 70 } }, .25);
    const coarse = simulate(initializePhysiologyState(), 120, { externalFactors: { ...defaultInput.externalFactors, exercise: 70 } }, 2);
    expect(Math.abs(slow.cardiovascular.heartRate - coarse.cardiovascular.heartRate)).toBeLessThan(4);
    expect(Math.abs(slow.energy.lactateLevel - coarse.energy.lactateLevel)).toBeLessThan(.4);
  });

  it('hipoventilação eleva PaCO₂ e reduz pH; hiperventilação faz o oposto', () => {
    const low = simulate(initializePhysiologyState(), 10 * 60, { interventions: { ...defaultInput.interventions, ventilationDrive: 50 } });
    const high = simulate(initializePhysiologyState(), 10 * 60, { interventions: { ...defaultInput.interventions, ventilationDrive: 180 } });
    expect(low.respiratory.paco2).toBeGreaterThan(45);
    expect(low.acidBase.pH).toBeLessThan(7.35);
    expect(high.respiratory.paco2).toBeLessThan(35);
    expect(high.acidBase.pH).toBeGreaterThan(7.45);
  });

  it('exercício aumenta demanda, frequência e lactato', () => {
    const basal = simulate(initializePhysiologyState(), 5 * 60);
    const exercise = simulate(initializePhysiologyState(), 5 * 60, { externalFactors: { ...defaultInput.externalFactors, exercise: 100 } });
    expect(exercise.energy.atpDemand).toBeGreaterThan(basal.energy.atpDemand);
    expect(exercise.cardiovascular.heartRate).toBeGreaterThan(basal.cardiovascular.heartRate + 40);
    expect(exercise.energy.lactateLevel).toBeGreaterThan(basal.energy.lactateLevel);
  });

  it('glicose, estresse e sono modulam secreção endógena e sensibilidade', () => {
    const highGlucose = initializePhysiologyState();
    highGlucose.nutrients.bloodGlucose = 180;
    const fed = simulate(highGlucose, 5 * 60);
    const stressed = simulate(initializePhysiologyState(), 10 * 60, { externalFactors: { ...defaultInput.externalFactors, stress: 100, sleep: 10 } });
    expect(fed.hormones.insulin).toBeGreaterThan(15);
    expect(stressed.hormones.adrenaline).toBeGreaterThan(60);
    expect(stressed.hormones.cortisol).toBeGreaterThan(12);
    expect(stressed.endocrine.hpaDrive).toBeGreaterThan(.4);
  });

  it('sincroniza a fase circadiana com o calendário comprimido', () => {
    const daytime = initializePhysiologyState();
    daytime.timeElapsed = physiologicalSecondsAt(1, 12);
    const nighttime = initializePhysiologyState();
    nighttime.timeElapsed = physiologicalSecondsAt(1, 23);
    expect(simulate(daytime, 1).cyclePhase).toBe('awake');
    expect(simulate(nighttime, 1).cyclePhase).toBe('sleep');
  });
});

describe('fisiopatologia por capacidades', () => {
  it('diabetes tipo 1 progride para cetose e diurese osmótica sem insulina efetiva', () => {
    const initial = applyDiseasePreset(initializePhysiologyState(), 'type1-diabetes');
    const state = simulate(initial, 60 * 60, {}, 2);
    expect(state.hormones.insulin).toBeLessThan(5);
    expect(state.nutrients.ketones).toBeGreaterThan(initial.nutrients.ketones);
    expect(state.pathophysiology.osmoticDiuresis).toBeGreaterThan(0);
    expect(state.pathophysiology.diseaseBurden).toBeGreaterThan(20);
  });

  it('falência respiratória mantém gradiente de shunt apesar do drive ventilatório', () => {
    const initial = applyDiseasePreset(initializePhysiologyState(), 'respiratory-failure');
    const state = simulate(initial, 10 * 60, { interventions: { ...defaultInput.interventions, ventilationDrive: 180 } });
    expect(state.respiratory.shuntFraction).toBeGreaterThan(.15);
    expect(state.respiratory.vqEfficiency).toBeLessThan(.75);
    expect(state.respiratory.spo2).toBeLessThan(97);
  });

  it('insuficiência renal reduz GFR e desloca potássio', () => {
    const initial = applyDiseasePreset(initializePhysiologyState(), 'renal-failure');
    const state = simulate(initial, 30 * 60, {}, 2);
    expect(state.renal.gfr).toBeLessThan(50);
    expect(state.nutrients.potassium).toBeGreaterThan(4.5);
  });

  it('sepse integra inflamação, vasoplegia e lactato', () => {
    const initial = applyDiseasePreset(initializePhysiologyState(), 'sepsis');
    const state = simulate(initial, 20 * 60, {}, 2);
    expect(state.allostaticLoad.inflammationLevel).toBeGreaterThan(30);
    expect(state.cardiovascular.systemicVascularResistance).toBeLessThan(1000);
    expect(state.energy.lactateLevel).toBeGreaterThan(1);
  });

  it('permite depuração ou progressão infecciosa conforme barreira e imunossupressão', () => {
    const recoverable = initializePhysiologyState();
    recoverable.pathophysiology.infectionSeverity = 25;
    const recovered = simulate(recoverable, 5 * 60, {
      cellularFeedback: {
        lactateFlux: 0,
        carbonDioxideFlux: 0,
        inflammationSignal: 0,
        oxygenDemand: 0,
        viabilitySignal: 1,
        barrierFailureSignal: 0,
        apoptoticSignal: 0,
      },
    });

    const vulnerable = initializePhysiologyState();
    vulnerable.pathophysiology.infectionSeverity = 25;
    vulnerable.hormones.cortisol = 90;
    const progressed = simulate(vulnerable, 5 * 60, {
      cellularFeedback: {
        lactateFlux: 0,
        carbonDioxideFlux: 0,
        inflammationSignal: .7,
        oxygenDemand: 0,
        viabilitySignal: .45,
        barrierFailureSignal: 1,
        apoptoticSignal: .6,
      },
    });

    expect(recovered.pathophysiology.infectionSeverity).toBeLessThan(25);
    expect(progressed.pathophysiology.infectionSeverity).toBeGreaterThan(recovered.pathophysiology.infectionSeverity);
    expect(progressed.pathophysiology.diseaseBurden).toBeGreaterThan(recovered.pathophysiology.diseaseBurden);
  });
});
