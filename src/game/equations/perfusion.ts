// Perfusion equations for the Body Ops simulation
// Updates blood flow to different organs based on cardiac output and hormones

import { Physiology, clampParameter } from '../physiology';

export function updatePerfusion(params: Physiology): {
  brain: number;
  heart: number;
  muscle: number;
  organs: number;
} {
  // Base perfusion affected by cardiac output
  const coFactor = params.cardiacOutput / 5.0; // normalized to baseline

  let brain = params.brainPerfusion;
  let heart = params.heartPerfusion;
  let muscle = params.musclePerfusion;
  let organs = params.organsPerfusion;

  // Brain perfusion is prioritized (autoregulation)
  brain = 100 * coFactor;
  if (brain > 100) brain = 100;
  if (brain < 60) brain += (60 - brain) * 0.1; // Brain protection

  // Heart perfusion follows CO closely
  heart = 100 * coFactor;

  // Muscle perfusion affected by adrenaline (vasodilation)
  muscle = 100 * coFactor;
  muscle += (params.adrenaline - 10) * 0.2;

  // Organs perfusion (digestive, kidneys, etc)
  organs = 100 * coFactor;
  // Stress diverts blood away from organs
  organs -= (params.stress - 10) * 0.15;

  // Blood pressure affects perfusion
  const bpFactor =
    (params.bloodPressureSystolic - 120) / 120;
  brain += bpFactor * 5;
  heart += bpFactor * 5;
  muscle += bpFactor * 3;
  organs += bpFactor * 3;

  return {
    brain: clampParameter('perfusion', brain),
    heart: clampParameter('perfusion', heart),
    muscle: clampParameter('perfusion', muscle),
    organs: clampParameter('perfusion', organs),
  };
}

export function updateMetabolicParameters(params: Physiology): {
  glucose: number;
  lactate: number;
  temperature: number;
} {
  let glucose = params.glucose;
  let lactate = params.lactate;
  let temperature = params.temperature;

  // Glucose consumption
  const metabolicRate = params.heartRate / 70;
  glucose -= metabolicRate * 0.05;

  // Adrenaline increases glucose (glycogenolysis)
  glucose += (params.adrenaline - 10) * 0.03;

  // Insulin decreases glucose
  glucose -= (params.insulin - 30) * 0.02;

  // Lactate production (anaerobic metabolism)
  if (params.bloodOxygen < 90) {
    lactate += (90 - params.bloodOxygen) * 0.01;
  }

  // Lactate clearance
  if (lactate > 1.0) {
    lactate -= (lactate - 1.0) * 0.05;
  }

  // Temperature affected by metabolism
  const baseTemp = 36.8;
  temperature = baseTemp + (params.adrenaline - 10) * 0.002;
  temperature += (params.stress - 10) * 0.001;

  return {
    glucose: clampParameter('glucose', glucose),
    lactate: Math.max(0.5, Math.min(15, lactate)),
    temperature: clampParameter('temperature', temperature),
  };
}
