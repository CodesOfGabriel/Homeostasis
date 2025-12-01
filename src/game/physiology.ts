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

  // Respiratory Markers
  pO2: number; // mmHg - Pressão parcial de O2
  pCO2: number; // mmHg - Pressão parcial de CO2
  hco3: number; // mEq/L - Bicarbonato
  baseExcess: number; // mEq/L - Excesso de base

  // Lipid Profile
  totalCholesterol: number; // mg/dL
  ldl: number; // mg/dL - "Colesterol ruim"
  hdl: number; // mg/dL - "Colesterol bom"
  triglycerides: number; // mg/dL
  vldl: number; // mg/dL

  // Hepatic Profile
  alt: number; // U/L - Alanina aminotransferase
  ast: number; // U/L - Aspartato aminotransferase
  alp: number; // U/L - Fosfatase alcalina
  ggt: number; // U/L - Gama glutamil transferase
  bilirubin: number; // mg/dL - Bilirrubina total
  albumin: number; // g/dL
  totalProtein: number; // g/dL

  // Renal Profile
  creatinine: number; // mg/dL
  urea: number; // mg/dL
  bun: number; // mg/dL - Blood Urea Nitrogen
  gfr: number; // mL/min/1.73m² - Taxa de filtração glomerular
  uricAcid: number; // mg/dL

  // Inflammatory Markers
  crp: number; // mg/L - Proteína C reativa
  esr: number; // mm/h - Velocidade de hemossedimentação

  // Complete Blood Count (Hemograma)
  hemoglobin: number; // g/dL
  hematocrit: number; // %
  rbc: number; // milhões/μL - Hemácias
  wbc: number; // mil/μL - Leucócitos
  platelets: number; // mil/μL - Plaquetas

  // Electrolytes Extended
  chloride: number; // mEq/L
  magnesium: number; // mg/dL
  phosphorus: number; // mg/dL

  // Molecular pathways (0-100 activation)
  nrf2: number;
  mtor: number;
  ampk: number;
  nfkb: number;

  // Body Composition / Energy Balance
  bodyMass: number; // kg - peso corporal
  fatMass: number; // kg - massa gorda
  leanMass: number; // kg - massa magra
  bmi: number; // kg/m² - índice de massa corporal
  metabolicRate: number; // kcal/day - taxa metabólica
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

  // Respiratory Markers
  pO2: 95, // 80-100 mmHg normal
  pCO2: 40, // 35-45 mmHg normal
  hco3: 24, // 22-26 mEq/L normal
  baseExcess: 0, // -2 a +2 normal

  // Lipid Profile
  totalCholesterol: 180, // <200 desejável
  ldl: 100, // <100 ótimo
  hdl: 55, // >40 homens, >50 mulheres
  triglycerides: 120, // <150 normal
  vldl: 25, // <30 normal

  // Hepatic Profile
  alt: 25, // 7-56 U/L normal
  ast: 22, // 10-40 U/L normal
  alp: 70, // 44-147 U/L normal
  ggt: 30, // 9-48 U/L normal
  bilirubin: 0.8, // 0.1-1.2 mg/dL normal
  albumin: 4.2, // 3.5-5.5 g/dL normal
  totalProtein: 7.0, // 6.0-8.3 g/dL normal

  // Renal Profile
  creatinine: 1.0, // 0.7-1.3 mg/dL normal
  urea: 30, // 15-45 mg/dL normal
  bun: 15, // 7-20 mg/dL normal
  gfr: 95, // >90 normal
  uricAcid: 5.5, // 3.5-7.2 mg/dL normal

  // Inflammatory Markers
  crp: 1.0, // <3.0 mg/L normal
  esr: 10, // <20 mm/h normal

  // Complete Blood Count
  hemoglobin: 14.5, // 13.5-17.5 g/dL homens
  hematocrit: 45, // 38-50% normal
  rbc: 5.0, // 4.5-5.5 milhões/μL
  wbc: 7.5, // 4.5-11.0 mil/μL
  platelets: 250, // 150-400 mil/μL

  // Electrolytes Extended
  chloride: 102, // 96-106 mEq/L
  magnesium: 2.0, // 1.7-2.2 mg/dL
  phosphorus: 3.5, // 2.5-4.5 mg/dL

  nrf2: 50,
  mtor: 50,
  ampk: 50,
  nfkb: 20,

  // Body Composition (70kg adult, 1.75m height)
  bodyMass: 70, // kg
  fatMass: 14, // kg (20% body fat)
  leanMass: 56, // kg (80% lean mass)
  bmi: 22.9, // Normal weight
  metabolicRate: 1800, // kcal/day
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
