// This file defines default physiological parameters, limits and helper functions
// for the Body Ops simulation system.

export interface Physiology {
  // Cardiac
  heartRate: number; // bpm
  strokeVolume: number; // ml
  cardiacOutput: number; // L/min
  bloodPressureSystolic: number; // mmHg
  bloodPressureDiastolic: number; // mmHg

  // Respiratory
  respiratoryRate: number; // breaths/min
  bloodOxygen: number; // % saturation
  tidalVolume: number; // ml

  // Metabolic
  glucose: number; // mg/dL
  lactate: number; // mmol/L
  temperature: number; // °C

  // Hormonal
  adrenaline: number; // arbitrary units 0-100
  cortisol: number; // arbitrary units 0-100
  insulin: number; // arbitrary units 0-100
  glucagon: number; // arbitrary units 0-100 (antagonista da insulina)
  testosterone: number; // arbitrary units 0-100 (anabolismo)
  growthHormone: number; // arbitrary units 0-100 (GH - crescimento)
  thyroid: number; // arbitrary units 0-100 (T3/T4 - metabolismo)
  melatonin: number; // arbitrary units 0-100 (sono/ritmo circadiano)
  dopamine: number; // arbitrary units 0-100 (motivação/recompensa)
  serotonin: number; // arbitrary units 0-100 (bem-estar/humor)

  // Perfusion
  brainPerfusion: number; // %
  heartPerfusion: number; // %
  musclePerfusion: number; // %
  organsPerfusion: number; // %

  // Meta
  stress: number; // 0-100
  energy: number; // 0-100
  time: number; // seconds since start

  // Advanced parameters
  osmolarity: number; // mOsm/L
  vo2Max: number; // mL/kg/min
  pH: number; // blood pH
  sodium: number; // mmol/L
  potassium: number; // mmol/L
  calcium: number; // mmol/L

  // Molecular pathways (0-100 activation)
  nrf2: number;
  mtor: number;
  ampk: number;
  nfkb: number;
}

export const DEFAULT_PHYSIOLOGY: Physiology = {
  heartRate: 70,
  strokeVolume: 70,
  cardiacOutput: 5.0,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,

  respiratoryRate: 14,
  bloodOxygen: 98,
  tidalVolume: 500,

  glucose: 90,
  lactate: 1.0,
  temperature: 36.8,

  adrenaline: 10,
  cortisol: 20,
  insulin: 30,
  glucagon: 25,
  testosterone: 50,
  growthHormone: 40,
  thyroid: 60,
  melatonin: 20,
  dopamine: 70,
  serotonin: 75,

  brainPerfusion: 100,
  heartPerfusion: 100,
  musclePerfusion: 100,
  organsPerfusion: 100,

  stress: 10,
  energy: 80,
  time: 0,

  osmolarity: 290,
  vo2Max: 45,
  pH: 7.4,
  sodium: 140,
  potassium: 4.0,
  calcium: 2.4,

  nrf2: 30,
  mtor: 50,
  ampk: 40,
  nfkb: 20,
};

export const LIMITS = {
  heartRate: { min: 40, max: 200 },
  strokeVolume: { min: 40, max: 120 },
  bloodOxygen: { min: 70, max: 100 },
  respiratoryRate: { min: 8, max: 40 },
  glucose: { min: 40, max: 300 },
  temperature: { min: 35, max: 42 },
  adrenaline: { min: 0, max: 100 },
  cortisol: { min: 0, max: 100 },
  insulin: { min: 0, max: 100 },
  glucagon: { min: 0, max: 100 },
  testosterone: { min: 0, max: 100 },
  growthHormone: { min: 0, max: 100 },
  thyroid: { min: 0, max: 100 },
  melatonin: { min: 0, max: 100 },
  dopamine: { min: 0, max: 100 },
  serotonin: { min: 0, max: 100 },
  stress: { min: 0, max: 100 },
  energy: { min: 0, max: 100 },
  perfusion: { min: 0, max: 100 },
  osmolarity: { min: 270, max: 310 },
  vo2Max: { min: 20, max: 80 },
  pH: { min: 7.0, max: 7.8 },
  sodium: { min: 125, max: 155 },
  potassium: { min: 3.0, max: 6.0 },
  calcium: { min: 2.0, max: 2.8 },
  pathway: { min: 0, max: 100 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampParameter(
  param: keyof typeof LIMITS,
  value: number
): number {
  const limit = LIMITS[param];
  return clamp(value, limit.min, limit.max);
}
