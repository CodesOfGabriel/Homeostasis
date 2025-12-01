// Cardiac equations for the Body Ops simulation
// Updates heart rate, stroke volume, cardiac output and blood pressure

import { Physiology, clampParameter } from '../physiology';

export function updateCardiacOutput(params: Physiology): number {
  // CO = HR × SV / 1000 (converted to L/min)
  return (params.heartRate * params.strokeVolume) / 1000;
}

export function updateHeartRate(
  params: Physiology,
  _deltaTime: number
): number {
  let hr = params.heartRate;

  // Adrenaline increases HR
  hr += (params.adrenaline - 10) * 0.02;

  // Stress increases HR
  hr += (params.stress - 10) * 0.015;

  // Low oxygen increases HR (compensatory)
  if (params.bloodOxygen < 95) {
    hr += (95 - params.bloodOxygen) * 0.5;
  }

  // Energy affects HR (low energy = lower HR)
  if (params.energy < 30) {
    hr -= (30 - params.energy) * 0.1;
  }

  // Homeostatic drift towards baseline (70 bpm)
  const baseline = 70;
  const drift = (baseline - hr) * 0.01;
  hr += drift;

  return clampParameter('heartRate', hr);
}

export function updateStrokeVolume(params: Physiology): number {
  let sv = params.strokeVolume;

  // Adrenaline increases contractility
  sv += (params.adrenaline - 10) * 0.01;

  // Low perfusion decreases SV
  const avgPerfusion =
    (params.brainPerfusion +
      params.heartPerfusion +
      params.musclePerfusion +
      params.organsPerfusion) /
    4;

  if (avgPerfusion < 80) {
    sv -= (80 - avgPerfusion) * 0.05;
  }

  // Homeostatic drift towards 70ml
  const baseline = 70;
  const drift = (baseline - sv) * 0.01;
  sv += drift;

  return clampParameter('strokeVolume', sv);
}

export function updateBloodPressure(
  params: Physiology
): { systolic: number; diastolic: number } {
  // Simplified BP calculation based on CO and peripheral resistance
  const baselineSystolic = 120;
  const baselineDiastolic = 80;

  let systolic = baselineSystolic;
  let diastolic = baselineDiastolic;

  // CO affects both
  const coFactor = (params.cardiacOutput - 5.0) * 10;
  systolic += coFactor;
  diastolic += coFactor * 0.6;

  // Adrenaline increases BP (vasoconstriction)
  systolic += (params.adrenaline - 10) * 0.3;
  diastolic += (params.adrenaline - 10) * 0.2;

  // Stress increases BP
  systolic += (params.stress - 10) * 0.15;
  diastolic += (params.stress - 10) * 0.1;

  return {
    systolic: Math.round(systolic),
    diastolic: Math.round(diastolic),
  };
}
