// Respiratory equations for the Body Ops simulation
// Updates respiratory rate, blood oxygenation and tidal volume

import { Physiology, clampParameter } from '../physiology';

export function updateRespiratoryRate(params: Physiology): number {
  let rr = params.respiratoryRate;

  // Low oxygen increases RR
  if (params.bloodOxygen < 95) {
    rr += (95 - params.bloodOxygen) * 0.3;
  }

  // High lactate increases RR (metabolic acidosis)
  if (params.lactate > 2.0) {
    rr += (params.lactate - 2.0) * 2;
  }

  // Stress/adrenaline increases RR
  rr += (params.stress - 10) * 0.01;
  rr += (params.adrenaline - 10) * 0.01;

  // Homeostatic drift towards 14 breaths/min
  const baseline = 14;
  const drift = (baseline - rr) * 0.02;
  rr += drift;

  return clampParameter('respiratoryRate', rr);
}

export function updateBloodOxygen(params: Physiology): number {
  let o2 = params.bloodOxygen;

  // Respiratory rate affects oxygenation
  if (params.respiratoryRate > 10) {
    // Good ventilation improves O2
    const ventilationEffect = (params.respiratoryRate - 10) * 0.1;
    o2 += ventilationEffect * 0.05;
  } else {
    // Poor ventilation decreases O2
    o2 -= (10 - params.respiratoryRate) * 0.2;
  }

  // Cardiac output affects O2 delivery
  if (params.cardiacOutput < 4.0) {
    o2 -= (4.0 - params.cardiacOutput) * 0.5;
  }

  // Lung perfusion affects oxygenation
  const avgPerfusion =
    (params.brainPerfusion +
      params.heartPerfusion +
      params.musclePerfusion +
      params.organsPerfusion) /
    4;

  if (avgPerfusion < 80) {
    o2 -= (80 - avgPerfusion) * 0.02;
  }

  // Natural drift towards 98%
  const baseline = 98;
  const drift = (baseline - o2) * 0.03;
  o2 += drift;

  return clampParameter('bloodOxygen', o2);
}

export function updateTidalVolume(params: Physiology): number {
  let tv = params.tidalVolume;

  // Adrenaline increases TV (deeper breaths)
  tv += (params.adrenaline - 10) * 0.2;

  // Energy affects breathing depth
  if (params.energy < 30) {
    tv -= (30 - params.energy) * 0.5;
  }

  // Homeostatic drift towards 500ml
  const baseline = 500;
  const drift = (baseline - tv) * 0.01;
  tv += drift;

  return Math.round(tv);
}
