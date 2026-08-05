/**
 * Homeostasis v3.0 - Physiology Initialization
 * Estado fisiológico inicial realista com parâmetros clínicos
 */

import {
    PhysiologyState,
    EnergyMatrix,
    NutrientState,
    HormonalProfile,
    CardiovascularState,
    RespiratoryState,
    AcidBaseBalance,
    RespiratoryExchange,
    AllostaticLoad,
    OrganSystem,
    OrganState,
} from './types';
import { HORMONE_DEFINITIONS } from './config/hormones';
import {
    createHealthyCapacities,
    createInitialEndocrineState,
    createInitialPathophysiology,
    createInitialRenalState,
} from './pathology';

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

/**
 * Inicializa o estado fisiológico completo com valores basais normais
 * Representa um adulto saudável de 70kg em repouso
 */
export function initializePhysiologyState(): PhysiologyState {
    return {
        energy: initializeEnergyMatrix(),
        nutrients: initializeNutrientState(),
        hormones: initializeHormonalProfile(),
        cellularSignaling: initializeCellularSignaling(),
        endocrine: createInitialEndocrineState(),
        capacities: createHealthyCapacities(),
        renal: createInitialRenalState(),
        pathophysiology: createInitialPathophysiology(),
        cardiovascular: initializeCardiovascularState(),
        respiratory: initializeRespiratoryState(),
        organs: initializeOrganSystem(),
        acidBase: initializeAcidBaseBalance(),
        allostaticLoad: initializeAllostaticLoad(),
        respiratoryExchange: initializeRespiratoryExchange(),
        basalMetabolicRate: 1800, // kcal/day para 70kg
        totalEnergyExpenditure: 1800,
        activityLevel: 0,
        bodyTemperature: 36.8,
        timeElapsed: 0,
        cyclePhase: 'awake',
        isAlive: true,
    };
}

// ============================================================================
// ENERGY MATRIX
// ============================================================================

function initializeEnergyMatrix(): EnergyMatrix {
    return {
        // Phosphagen System
        atpPool: 10,             // mmol - Pool imediato aumentado
        pCrStore: 28,            // mmol - Reserva de fosfocreatina
        maxATP: 12,              // mmol - Capacidade máxima
        maxPCr: 30,              // mmol - Capacidade máxima PCr

        // Glycolytic System
        glycolyticRate: 0,       // mmol/min - Em repouso não usa
        lactateLevel: 0.8,       // mmol/L - Nível basal reduzido
        lactateClearance: 0.5,   // mmol/min - Remoção mais eficiente

        // Oxidative System
        aerobicContribution: 100, // % - Em repouso é 100% aeróbio
        vo2Current: 3.5,         // mL/kg/min - VO2 basal (~1 MET)
        vo2Max: 45,              // mL/kg/min - Pessoa sedentária

        // Demanda
        atpDemand: 30,           // mmol/min - Demanda basal normalizada do modelo
        energyDeficit: 0,        // mmol - Sem déficit inicial
    };
}

// ============================================================================
// NUTRIENTS
// ============================================================================

function initializeNutrientState(): NutrientState {
    return {
        // Carboidratos
        bloodGlucose: 90,        // mg/dL - Jejum normal
        liverGlycogen: 80,       // g - ~80% da capacidade
        muscleGlycogen: 300,     // g - ~75% da capacidade

        // Lipídios
        fattyAcids: 0.4,         // mmol/L - Nível basal
        triglycerides: 100,      // mg/dL - Normal
        adiposeTissue: 15,       // kg - ~20% de gordura corporal

        // Proteínas
        aminoAcids: 40,          // mg/dL - Pool circulante
        muscleMass: 30,          // kg - Massa magra típica
        proteinSynthesisRate: 250, // g/day - Taxa normal

        // Hidratação
        hydration: 42,           // L - 60% do peso corporal (70kg)
        sodium: 140,             // mmol/L - Normal
        potassium: 4.0,          // mmol/L - Normal
        chloride: 104,            // mmol/L - Medido/modelado explicitamente
        calcium: 9.4,             // mg/dL - Cálcio total
        phosphate: 3.5,           // mg/dL - Fosfato
        magnesium: 2.0,           // mg/dL - Magnésio
        albumin: 4.0,             // g/dL - Proteína plasmática basal
        hemoglobin: 14.0,         // g/dL - Capacidade de transporte de O₂
        hematocrit: 42,           // %
        ketones: 0.2,            // mmol/L - Cetose basal ausente

        // Estado
        fedState: true,
        hoursSinceMeal: 3,
    };
}

// ============================================================================
// HORMONES
// ============================================================================

function initializeHormonalProfile(): HormonalProfile {
    return {
        // Anabólicos
        insulin: HORMONE_DEFINITIONS.insulin.baseline,
        gh: HORMONE_DEFINITIONS.gh.baseline,
        testosterone: HORMONE_DEFINITIONS.testosterone.baseline,
        igf1: HORMONE_DEFINITIONS.igf1.baseline,

        // Catabólicos
        cortisol: HORMONE_DEFINITIONS.cortisol.baseline,
        glucagon: HORMONE_DEFINITIONS.glucagon.baseline,
        adrenaline: HORMONE_DEFINITIONS.adrenaline.baseline,
        noradrenaline: HORMONE_DEFINITIONS.noradrenaline.baseline,

        // Gastrointestinais e adipocitários
        ghrelin: HORMONE_DEFINITIONS.ghrelin.baseline,
        leptin: HORMONE_DEFINITIONS.leptin.baseline,
        adiponectin: HORMONE_DEFINITIONS.adiponectin.baseline,

        // Tireoidianos
        t3: HORMONE_DEFINITIONS.t3.baseline,
        t4: HORMONE_DEFINITIONS.t4.baseline,
        tsh: HORMONE_DEFINITIONS.tsh.baseline,

    };
}

function initializeCellularSignaling() {
    return {
        mTorActivity: 50,
        ampkActivity: 24,
        autophagyActivity: 20,
        unfoldedProteinResponse: 8,
    };
}

// ============================================================================
// CARDIOVASCULAR
// ============================================================================

function initializeCardiovascularState(): CardiovascularState {
    return {
        // Frequência e Ritmo
        heartRate: 70,           // bpm - Repouso normal
        heartRateVariability: 50, // ms - RMSSD normal
        rhythm: 'sinus',
        arrhythmiaRisk: 3,
        baroreflexActivity: 0,

        // Pressão Arterial
        systolicBP: 120,         // mmHg - Normal
        diastolicBP: 80,         // mmHg - Normal
        meanArterialPressure: 93, // mmHg - MAP normal

        // Débito Cardíaco
        strokeVolume: 70,        // mL - Normal
        cardiacOutput: 4.9,      // L/min - 70bpm × 70mL
        ejectionFraction: 60,    // % - Normal

        // Resistência Vascular
        systemicVascularResistance: 1000, // dyn·s/cm⁵ - Normal

        // Perfusão
        perfusionIndex: 100,     // % - Perfusão sistêmica relativa ao basal
    };
}

// ============================================================================
// RESPIRATORY
// ============================================================================

function initializeRespiratoryState(): RespiratoryState {
    return {
        // Ventilação
        respiratoryRate: 14,     // resp/min - Repouso normal
        tidalVolume: 500,        // mL - Normal
        minuteVentilation: 7.0,  // L/min - 14 × 500mL

        // Oxigenação
        spo2: 98,                // % - Normal
        pao2: 95,                // mmHg - Normal
        paco2: 40,               // mmHg - Normal

        // Mecânica
        lungCompliance: 100,     // mL/cmH2O - Normal
        deadSpace: 150,          // mL - Anatômico normal
        shuntFraction: 0.03,     // shunt fisiológico
        vqEfficiency: 0.98,      // relação V/Q preservada
    };
}

// ============================================================================
// ACID-BASE BALANCE
// ============================================================================

function initializeAcidBaseBalance(): AcidBaseBalance {
    return {
        pH: 7.40,                // Normal
        bicarbonate: 24,         // mmol/L - Ponto basal compatível com pH 7,40
        pco2: 40,                // mmHg - Normal
        baseExcess: 0,           // mmol/L - Sem excesso ou déficit de base
        anionGap: 12,            // mmol/L - Normal
        correctedAnionGap: 12,
        deltaRatio: null,
        expectedCompensation: null,
        expectedCompensationLabel: 'Sem compensação esperada fora do basal',
        interpretation: 'Sem distúrbio ácido-base primário detectável',
        mixedDisorder: false,
        state: 'normal',
        compensationActive: false,
        compensationRate: 0,
    };
}

// ============================================================================
// RESPIRATORY EXCHANGE
// ============================================================================

function initializeRespiratoryExchange(): RespiratoryExchange {
    return {
        rer: 0.85,               // Mistura metabólica em repouso
        vco2: 200,               // mL/min - Produção de CO2 basal
        vo2: 245,                // mL/min - Consumo de O2 basal (3.5 mL/kg/min × 70kg)
        substrate: 'mixed',      // Queimando mistura de substratos
    };
}

// ============================================================================
// ALLOSTATIC LOAD
// ============================================================================

function initializeAllostaticLoad(): AllostaticLoad {
    return {
        currentLoad: 10,         // Baixa carga inicial
        maxCapacity: 100,
        recoveryRate: 5,         // units/hour

        metabolicStress: 5,
        cardiovascularStress: 5,
        oxidativeStress: 5,
        inflammationLevel: 5,

        fatigueLevel: 0,
        adaptationCapacity: 100,
    };
}

// ============================================================================
// ORGAN SYSTEM
// ============================================================================

function initializeOrganSystem(): OrganSystem {
    return {
        heart: createOrgan('Coração', 0.3, 100, 5),
        lungs: createOrgan('Pulmões', 1.0, 100, 3),
        liver: createOrgan('Fígado', 1.5, 100, 8),
        kidneys: createOrgan('Rins', 0.3, 100, 6),
        brain: createOrgan('Cérebro', 1.4, 100, 10),
        muscles: createOrgan('Músculos', 30.0, 100, 12),
        adipose: createOrgan('Tecido Adiposo', 15.0, 100, 2),
        gut: createOrgan('Intestinos', 1.5, 100, 4),
    };
}

function createOrgan(
    name: string,
    mass: number,
    perfusion: number,
    metabolicRate: number
): OrganState {
    return {
        name,
        mass,                    // kg
        perfusion,               // % (inicialmente 100)
        oxygenation: 98,         // % (inicialmente normal)
        metabolicRate,           // kcal/day
        damage: 0,               // % (sem dano)
        functionality: 100,      // % (plena função)
        canGrow: name === 'Músculos' || name === 'Tecido Adiposo',
        growthRate: 0,           // g/day (inicialmente sem crescimento)
        growthSignaling: 0,      // % (sem sinalização)
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcula BMR pela equação de Harris-Benedict
 * Homem: 88.362 + (13.397 × peso) + (4.799 × altura) - (5.677 × idade)
 */
export function calculateBMR(
    weight: number,
    height: number,
    age: number,
    sex: 'male' | 'female'
): number {
    if (sex === 'male') {
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
}

/**
 * Calcula VO2max teórico pela idade
 * VO2max = 15.3 × (MHR/RHR)
 * MHR = 220 - age
 */
export function calculateVO2Max(age: number, restingHR: number): number {
    const maxHR = 220 - age;
    return 15.3 * (maxHR / restingHR);
}

/**
 * Calcula composição corporal ideal
 */
export function calculateBodyComposition(
    totalMass: number,
    bodyFatPercentage: number
): { leanMass: number; fatMass: number } {
    const fatMass = totalMass * (bodyFatPercentage / 100);
    const leanMass = totalMass - fatMass;
    return { leanMass, fatMass };
}

/**
 * Verifica se um parâmetro está dentro da faixa normal
 */
export function isInNormalRange(
    value: number,
    normalLow: number,
    normalHigh: number
): boolean {
    return value >= normalLow && value <= normalHigh;
}

/**
 * Calcula severidade do desvio de um parâmetro
 */
export function calculateDeviation(
    value: number,
    target: number,
    tolerance: number
): 'normal' | 'mild' | 'moderate' | 'severe' {
    const deviation = Math.abs(value - target);
    const normalizedDeviation = deviation / tolerance;

    if (normalizedDeviation < 1) return 'normal';
    if (normalizedDeviation < 2) return 'mild';
    if (normalizedDeviation < 3) return 'moderate';
    return 'severe';
}

// ============================================================================
// EXPORTS ADICIONAIS (manter compatibilidade)
// ============================================================================

/**
 * Interface legada - manter para compatibilidade
 * @deprecated Use PhysiologyState do types.ts
 */
export interface Physiology {
    heartRate: number;
    strokeVolume: number;
    cardiacOutput: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    respiratoryRate: number;
    bloodOxygen: number;
    tidalVolume: number;
    glucose: number;
    lactate: number;
    temperature: number;
    [key: string]: number | string | boolean;
}

/**
 * Estado legado - manter para compatibilidade
 * @deprecated Use initializePhysiologyState()
 */
export const DEFAULT_PHYSIOLOGY: Physiology = {
    heartRate: 70,
    strokeVolume: 70,
    cardiacOutput: 4.9,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    respiratoryRate: 14,
    bloodOxygen: 98,
    tidalVolume: 500,
    glucose: 90,
    lactate: 1.0,
    temperature: 36.8,
};

// ============================================================================
// CONSTANTES CLÍNICAS
// ============================================================================

/**
 * Valores de referência clínicos
 */
export const CLINICAL_RANGES = {
    heartRate: { min: 60, max: 100, optimal: 70 },
    bloodPressure: {
        systolic: { min: 90, max: 120, optimal: 115 },
        diastolic: { min: 60, max: 80, optimal: 75 },
    },
    glucose: { min: 70, max: 100, optimal: 85 },
    pH: { min: 7.35, max: 7.45, optimal: 7.40 },
    lactate: { min: 0.5, max: 2.0, optimal: 1.0 },
    spo2: { min: 95, max: 100, optimal: 98 },
    temperature: { min: 36.1, max: 37.2, optimal: 36.8 },
    sodium: { min: 135, max: 145, optimal: 140 },
    potassium: { min: 3.5, max: 5.0, optimal: 4.0 },
} as const;
