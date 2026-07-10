/**
 * Homeostasis v3.0 - deterministic physiology engine.
 *
 * Every transition is expressed as a rate or an exponential approach over
 * deltaTime. Nothing in this file is tied to the rendering frame rate.
 */

import {
    AcidBaseBalance,
    AllostaticLoad,
    CardiovascularState,
    EnergyMatrix,
    HormonalAction,
    HormonalProfile,
    NutrientState,
    OrganState,
    OrganSystem,
    PHYSIOLOGY_CONSTANTS,
    PhysiologicalEvent,
    PhysiologicalWarning,
    PhysiologyState,
    RespiratoryExchange,
    RespiratoryState,
    SimulationInput,
    SimulationOutput,
} from './types';

const BASE_ATP_DEMAND = 30; // mmol/min in the simulator's whole-body scale
const BASE_VO2 = 3.5; // mL/kg/min (1 MET)
const BASE_VCO2 = 200; // mL/min
const BASE_ALVEOLAR_VENTILATION = 4.9; // L/min: (500 - 150) * 14
const BASE_HEART_RATE = 70;
const BASE_STROKE_VOLUME = 70;
const BASE_HYDRATION = 42; // L, 70 kg adult
const BASE_SODIUM = 140; // mmol/L
const BASE_LACTATE = 0.8; // mmol/L
const BASE_GLUCOSE = 90; // mg/dL
const BASE_RENAL_REABSORPTION = 99; // %
const GFR_ML_MIN = 125;
const INSENSIBLE_WATER_LOSS_ML_MIN = 0.6;
const STANDARD_ATMOSPHERIC_PRESSURE = 760;
const WATER_VAPOUR_PRESSURE = 47;
const INSPIRED_OXYGEN_FRACTION = 0.21;
const RESPIRATORY_QUOTIENT = 0.8;

const DEFAULT_INTERVENTIONS: SimulationInput['interventions'] = {
    heartRateTarget: BASE_HEART_RATE,
    ventilationDrive: 100,
    renalWaterReabsorption: BASE_RENAL_REABSORPTION,
    waterAbsorptionRate: 0,
};

interface EnergyDemandResult {
    bmr: number;
    activityCost: number;
    allostaticCost: number;
    totalExpenditure: number;
    atpDemandRate: number;
    exerciseFraction: number;
}

interface HormonalEffectsResult {
    newProfile: HormonalProfile;
    glucoseUptakeRate: number; // mg/dL/min above basal
    hepaticGlucoseDrive: number; // mg/dL/min above basal
    lipolysisRate: number; // relative fraction/hour
    proteinSynthesisRate: number; // g/day
    glycogenSynthesisRate: number; // mg/dL/min equivalent
}

const HORMONE_BASELINES: HormonalProfile = {
    insulin: 10,
    gh: 1,
    testosterone: 600,
    igf1: 200,
    cortisol: 12,
    glucagon: 80,
    adrenaline: 30,
    noradrenaline: 200,
    t3: 120,
    t4: 8,
    tsh: 2,
    mTORActivity: 50,
};

const HORMONE_HALF_LIVES_SEC: Record<keyof HormonalProfile, number> = {
    insulin: 5 * 60,
    gh: 20 * 60,
    testosterone: 60 * 60,
    igf1: 8 * 60 * 60,
    cortisol: 70 * 60,
    glucagon: 6 * 60,
    adrenaline: 2 * 60,
    noradrenaline: 2.5 * 60,
    t3: 24 * 60 * 60,
    t4: 7 * 24 * 60 * 60,
    tsh: 50 * 60,
    mTORActivity: 15 * 60,
};

const HORMONE_KEYS = Object.keys(HORMONE_BASELINES) as Array<keyof HormonalProfile>;

/** Calculate one physiological transition while preserving the public API. */
export function calculatePhysiologyTick(
    prevState: PhysiologyState,
    input: SimulationInput
): SimulationOutput {
    const dt = Math.max(0, finiteOr(input.deltaTime, 0));
    if (dt === 0 || !prevState.isAlive) {
        return {
            newState: prevState,
            events: [],
            warnings: generateWarnings(prevState),
        };
    }

    const interventions = input.interventions ?? DEFAULT_INTERVENTIONS;
    const externalFactors = input.externalFactors;
    const nextTime = prevState.timeElapsed + dt;
    const events: PhysiologicalEvent[] = [];

    const energyDemand = calculateEnergyDemand(
        prevState.basalMetabolicRate,
        externalFactors.exercise,
        prevState.allostaticLoad.currentLoad
    );

    const hormonalEffects = calculateHormonalEffects(
        prevState.hormones,
        input.hormonalActions,
        externalFactors.exercise,
        dt
    );

    const newEnergy = updateEnergyMatrix(
        prevState.energy,
        energyDemand,
        prevState.nutrients,
        prevState.respiratory.spo2,
        dt
    );

    const newNutrients = updateNutrients(
        prevState.nutrients,
        hormonalEffects,
        energyDemand,
        externalFactors,
        interventions,
        dt
    );

    const respiratoryExchange = calculateRespiratoryExchange(newEnergy, newNutrients);

    const newCardiovascular = updateCardiovascular(
        prevState.cardiovascular,
        energyDemand,
        newEnergy,
        hormonalEffects,
        newNutrients,
        interventions.heartRateTarget,
        externalFactors.stress,
        dt
    );

    const newRespiratory = updateRespiratory(
        prevState.respiratory,
        prevState.acidBase,
        respiratoryExchange,
        energyDemand.exerciseFraction,
        interventions.ventilationDrive,
        dt
    );

    const newAcidBase = updateAcidBase(
        prevState.acidBase,
        newEnergy,
        newRespiratory.paco2,
        newNutrients,
        dt
    );

    const newAllostaticLoad = updateAllostaticLoad(
        prevState.allostaticLoad,
        newEnergy,
        newAcidBase,
        newCardiovascular,
        newRespiratory,
        externalFactors.stress,
        dt
    );

    const newOrgans = updateOrgans(
        prevState.organs,
        newCardiovascular,
        newRespiratory,
        newAcidBase,
        newEnergy,
        newNutrients,
        hormonalEffects,
        dt
    );

    const isAlive = checkVitalSigns(
        newAcidBase,
        newCardiovascular,
        newRespiratory,
        newOrgans
    );
    const causeOfDeath = isAlive
        ? undefined
        : determineCauseOfDeath(newAcidBase, newCardiovascular, newRespiratory, newOrgans);

    if (!isAlive) {
        events.push({
            type: 'critical',
            severity: 'critical',
            message: `ÓBITO: ${causeOfDeath}`,
            timestamp: nextTime,
            affectedSystems: ['all'],
        });
    }

    const newState: PhysiologyState = {
        energy: newEnergy,
        nutrients: newNutrients,
        hormones: hormonalEffects.newProfile,
        cardiovascular: newCardiovascular,
        respiratory: newRespiratory,
        organs: newOrgans,
        acidBase: newAcidBase,
        allostaticLoad: newAllostaticLoad,
        respiratoryExchange,
        basalMetabolicRate: prevState.basalMetabolicRate,
        totalEnergyExpenditure: energyDemand.totalExpenditure,
        activityLevel: clamp(externalFactors.exercise, 0, 100),
        timeElapsed: nextTime,
        cyclePhase: prevState.cyclePhase,
        isAlive,
        causeOfDeath,
    };

    events.push(...generatePhysiologicalEvents(prevState, newState));

    return {
        newState,
        events,
        warnings: generateWarnings(newState),
    };
}

function calculateEnergyDemand(
    bmr: number,
    exerciseIntensity: number,
    allostaticLoad: number
): EnergyDemandResult {
    const safeBmr = Math.max(800, finiteOr(bmr, 1800));
    const exerciseFraction = clamp(exerciseIntensity / 100, 0, 1);
    const activityMultiplier = 1 + 3.5 * Math.pow(exerciseFraction, 1.35);
    const activityCost = safeBmr * (activityMultiplier - 1);
    const excessAllostaticLoad = Math.max(0, allostaticLoad - 10) / 90;
    const allostaticCost = safeBmr * 0.12 * excessAllostaticLoad;
    const totalExpenditure = safeBmr + activityCost + allostaticCost;
    const atpDemandRate = BASE_ATP_DEMAND * (totalExpenditure / safeBmr);

    return {
        bmr: safeBmr,
        activityCost,
        allostaticCost,
        totalExpenditure,
        atpDemandRate,
        exerciseFraction,
    };
}

function updateEnergyMatrix(
    prevEnergy: EnergyMatrix,
    demand: EnergyDemandResult,
    nutrients: NutrientState,
    spo2: number,
    dt: number
): EnergyMatrix {
    const dtMin = dt / 60;
    const demandRate = demand.atpDemandRate;
    const oxygenAvailability = clamp((spo2 - 70) / 28, 0, 1);
    const substrateAvailability = clamp((nutrients.bloodGlucose - 45) / 45, 0, 1);
    const aerobicCapacity = BASE_ATP_DEMAND
        * Math.max(1, prevEnergy.vo2Max / BASE_VO2)
        * oxygenAvailability
        * (0.45 + 0.55 * substrateAvailability);

    // Rest is predominantly oxidative; the anaerobic share rises only as
    // exercise intensity and the rate of demand change increase.
    const desiredAerobicFraction = clamp(
        0.96 - 0.24 * Math.pow(demand.exerciseFraction, 1.7),
        0.68,
        0.98
    );
    const aerobicForDemand = Math.min(aerobicCapacity, demandRate * desiredAerobicFraction);
    let remainingDemand = Math.max(0, demandRate - aerobicForDemand);

    const demandRise = Math.max(0, demandRate - prevEnergy.atpDemand);
    const maxPcrRate = Math.min(
        80,
        dtMin > 0 ? prevEnergy.pCrStore / dtMin : 0
    );
    const pcrRate = Math.min(remainingDemand, demandRise * 0.65, maxPcrRate);
    remainingDemand -= pcrRate;

    const glycolyticCapacity = 95 * substrateAvailability;
    const glycolyticRate = Math.min(remainingDemand, glycolyticCapacity);
    remainingDemand -= glycolyticRate;

    const poolTarget = prevEnergy.maxATP * 0.82;
    const poolRecoveryNeedRate = Math.max(0, poolTarget - prevEnergy.atpPool) / (20 / 60);
    const spareAerobicCapacity = Math.max(0, aerobicCapacity - aerobicForDemand);
    const poolRecoveryRate = Math.min(poolRecoveryNeedRate, spareAerobicCapacity);

    const maxPoolDrawRate = dtMin > 0 ? prevEnergy.atpPool / dtMin : 0;
    const poolDrawRate = Math.min(remainingDemand, maxPoolDrawRate);
    remainingDemand -= poolDrawRate;

    let atpPool = prevEnergy.atpPool + (poolRecoveryRate - poolDrawRate) * dtMin;
    atpPool = clamp(atpPool, 0, prevEnergy.maxATP);

    let pCrStore = prevEnergy.pCrStore - pcrRate * dtMin;
    const pcrRecoveryNeedRate = Math.max(0, prevEnergy.maxPCr - pCrStore) / 0.5;
    const aerobicReserveAfterPool = Math.max(0, spareAerobicCapacity - poolRecoveryRate);
    const pcrRecoveryRate = Math.min(
        pcrRecoveryNeedRate,
        aerobicReserveAfterPool,
        demand.exerciseFraction < 0.35 ? 12 : 2
    );
    pCrStore = clamp(pCrStore + pcrRecoveryRate * dtMin, 0, prevEnergy.maxPCr);

    let energyDeficit = prevEnergy.energyDeficit + remainingDemand * dtMin;
    if (remainingDemand <= 0 && energyDeficit > 0) {
        const deficitRecoveryRate = Math.min(
            energyDeficit / Math.max(dtMin, 1e-6),
            aerobicReserveAfterPool * 0.15
        );
        energyDeficit -= deficitRecoveryRate * dtMin;
    }
    energyDeficit = clamp(energyDeficit, 0, 500);

    // A small basal lactate flux is continuously produced and cleared. Extra
    // glycolytic ATP raises lactate; clearance rises with concentration and O2.
    const basalGlycolyticRate = demandRate * 0.04;
    const lactateProductionRate = 0.012
        + Math.max(0, glycolyticRate - basalGlycolyticRate) * 0.018;
    const lactateClearanceRate = (
        0.012 + Math.max(0, prevEnergy.lactateLevel - BASE_LACTATE) * 0.12
    ) * (0.35 + 0.65 * oxygenAvailability);
    const lactateLevel = clamp(
        prevEnergy.lactateLevel + (lactateProductionRate - lactateClearanceRate) * dtMin,
        0.4,
        20
    );

    const aerobicContributionTarget = clamp(
        100 * aerobicForDemand / Math.max(demandRate, 1e-6),
        0,
        100
    );
    const aerobicContribution = approachExp(
        prevEnergy.aerobicContribution,
        aerobicContributionTarget,
        8,
        dt
    );
    const vo2Target = clamp(
        BASE_VO2 * aerobicForDemand / (BASE_ATP_DEMAND * 0.96),
        0.5,
        prevEnergy.vo2Max
    );
    const vo2Current = approachExp(prevEnergy.vo2Current, vo2Target, 10, dt);

    return {
        ...prevEnergy,
        atpPool,
        pCrStore,
        glycolyticRate,
        lactateLevel,
        lactateClearance: lactateClearanceRate,
        aerobicContribution,
        vo2Current,
        atpDemand: demandRate,
        energyDeficit,
    };
}

function calculateHormonalEffects(
    prevHormones: HormonalProfile,
    actions: HormonalAction[],
    exerciseIntensity: number,
    dt: number
): HormonalEffectsResult {
    const newProfile = { ...prevHormones };

    for (const hormone of HORMONE_KEYS) {
        if (hormone === 'mTORActivity') continue;

        const baseline = HORMONE_BASELINES[hormone];
        const halfLife = HORMONE_HALF_LIVES_SEC[hormone];
        const eliminationConstant = Math.log(2) / halfLife;
        const decay = Math.exp(-eliminationConstant * dt);
        let value = baseline + (finiteOr(prevHormones[hormone], baseline) - baseline) * decay;

        for (const action of actions) {
            if (action.hormone !== hormone || action.duration <= 0) continue;
            const totalDurationSec = Math.max(
                1e-3,
                finiteOr(action.totalDuration, action.duration) / 1000
            );
            const activeSeconds = Math.min(dt, Math.max(0, action.duration / 1000));
            const infusionRate = finiteOr(action.amount, 0) / totalDurationSec;
            const postInfusionDecay = Math.exp(-eliminationConstant * (dt - activeSeconds));
            value += (infusionRate / eliminationConstant)
                * (1 - Math.exp(-eliminationConstant * activeSeconds))
                * postInfusionDecay;
        }

        newProfile[hormone] = clamp(value, 0, hormoneUpperLimit(hormone));
    }

    const mTorTarget = clamp(
        30
        + newProfile.insulin * 1.5
        + newProfile.igf1 * 0.025
        + Math.max(0, newProfile.gh - 1) * 1.2,
        0,
        100
    );
    let mTorActivity = approachExp(prevHormones.mTORActivity, mTorTarget, 180, dt);
    for (const action of actions) {
        if (action.hormone !== 'mTORActivity' || action.duration <= 0) continue;
        const totalDurationSec = Math.max(
            1e-3,
            finiteOr(action.totalDuration, action.duration) / 1000
        );
        const activeSeconds = Math.min(dt, action.duration / 1000);
        mTorActivity += action.amount * activeSeconds / totalDurationSec;
    }
    newProfile.mTORActivity = clamp(mTorActivity, 0, 100);

    const exerciseFraction = clamp(exerciseIntensity / 100, 0, 1);
    const insulinAboveBasal = Math.max(0, newProfile.insulin / HORMONE_BASELINES.insulin - 1);
    const glucagonAboveBasal = Math.max(0, newProfile.glucagon / HORMONE_BASELINES.glucagon - 1);
    const adrenalineAboveBasal = Math.max(0, newProfile.adrenaline / HORMONE_BASELINES.adrenaline - 1);
    const glucoseUptakeRate = 0.22 * insulinAboveBasal + 0.35 * exerciseFraction;
    const hepaticGlucoseDrive = 0.18 * glucagonAboveBasal + 0.12 * adrenalineAboveBasal;
    const lipolysisRate = clamp(
        0.002 + 0.012 * glucagonAboveBasal + 0.018 * adrenalineAboveBasal,
        0,
        0.08
    );
    const proteinSynthesisRate = clamp(
        250 * (0.7 + 0.3 * newProfile.mTORActivity / 50),
        80,
        600
    );
    const glycogenSynthesisRate = 0.15 * insulinAboveBasal;

    return {
        newProfile,
        glucoseUptakeRate,
        hepaticGlucoseDrive,
        lipolysisRate,
        proteinSynthesisRate,
        glycogenSynthesisRate,
    };
}

function updateNutrients(
    prev: NutrientState,
    hormones: HormonalEffectsResult,
    demand: EnergyDemandResult,
    external: SimulationInput['externalFactors'],
    interventions: SimulationInput['interventions'],
    dt: number
): NutrientState {
    const dtMin = dt / 60;
    const dtHours = dt / 3600;
    const exerciseFraction = demand.exerciseFraction;
    const nutritionInput = clamp((external.nutrition - 80) / 20, -1, 1);

    const passiveGlucoseRegulation = (BASE_GLUCOSE - prev.bloodGlucose) / 15;
    const dietaryGlucoseRate = Math.max(0, nutritionInput) * 0.30;
    const lowNutritionCost = Math.max(0, -nutritionInput) * 0.04;
    const extraExerciseUse = exerciseFraction * 0.45;
    const netGlucoseRate = passiveGlucoseRegulation
        + dietaryGlucoseRate
        + hormones.hepaticGlucoseDrive
        - hormones.glucoseUptakeRate
        - extraExerciseUse
        - lowNutritionCost;
    const bloodGlucose = clamp(prev.bloodGlucose + netGlucoseRate * dtMin, 20, 400);

    const hepaticReleaseRate = Math.max(0, hormones.hepaticGlucoseDrive - passiveGlucoseRegulation);
    const liverStorageRate = Math.max(0, hormones.glycogenSynthesisRate + (bloodGlucose - 100) * 0.01);
    const liverGlycogen = clamp(
        prev.liverGlycogen + (liverStorageRate - hepaticReleaseRate) * 0.05 * dtMin,
        0,
        120
    );
    const muscleGlycogenUseRate = exerciseFraction * (0.08 + 0.12 * exerciseFraction);
    const muscleGlycogen = clamp(
        prev.muscleGlycogen
        + liverStorageRate * 0.08 * dtMin
        - muscleGlycogenUseRate * dtMin,
        0,
        500
    );

    const lipolysisKg = prev.adiposeTissue * hormones.lipolysisRate * dtHours;
    const fattyAcidUse = exerciseFraction * 0.06 * dtMin;
    const adiposeTissue = clamp(prev.adiposeTissue - lipolysisKg, 2, 80);
    const fattyAcids = clamp(
        prev.fattyAcids + lipolysisKg * 20 - fattyAcidUse,
        0.05,
        3
    );

    const reabsorption = clamp(
        finiteOr(interventions.renalWaterReabsorption, BASE_RENAL_REABSORPTION),
        95,
        99.9
    );
    const urineFlow = GFR_ML_MIN * (1 - reabsorption / 100);
    const waterAbsorption = clamp(finiteOr(interventions.waterAbsorptionRate, 0), 0, 1500);
    const heatLoad = Math.max(0, external.temperature - 26) / 14;
    const sweatLoss = 0.2 + exerciseFraction * 8 + heatLoad * 3;
    const netWaterMlMin = waterAbsorption
        - urineFlow
        - INSENSIBLE_WATER_LOSS_ML_MIN
        - sweatLoss;
    const hydration = clamp(prev.hydration + netWaterMlMin * dtMin / 1000, 28, 55);

    // On short time scales sodium mass is nearly conserved, so water movement
    // changes concentration. A slow renal controller returns it toward 140.
    const dilutionAdjustedSodium = prev.sodium * prev.hydration / hydration;
    const sodium = clamp(
        approachExp(dilutionAdjustedSodium, BASE_SODIUM, 12 * 60 * 60, dt),
        115,
        170
    );
    const potassium = clamp(approachExp(prev.potassium, 4, 4 * 60 * 60, dt), 2, 7);
    const hoursSinceMeal = prev.hoursSinceMeal + dtHours;

    return {
        ...prev,
        bloodGlucose,
        liverGlycogen,
        muscleGlycogen,
        fattyAcids,
        adiposeTissue,
        proteinSynthesisRate: approachExp(
            prev.proteinSynthesisRate,
            hormones.proteinSynthesisRate,
            30 * 60,
            dt
        ),
        hydration,
        sodium,
        potassium,
        fedState: hoursSinceMeal < 6,
        hoursSinceMeal,
    };
}

function calculateRespiratoryExchange(
    energy: EnergyMatrix,
    nutrients: NutrientState
): RespiratoryExchange {
    const intensityFraction = clamp((energy.atpDemand / BASE_ATP_DEMAND - 1) / 3.5, 0, 1);
    const glucoseAvailability = clamp((nutrients.bloodGlucose - 60) / 50, 0, 1);
    let rer = 0.72 + 0.13 * glucoseAvailability + 0.12 * intensityFraction;
    if (!nutrients.fedState) rer -= 0.04;
    rer = clamp(rer, 0.70, 1.05);

    let substrate: RespiratoryExchange['substrate'];
    if (rer >= 0.93) substrate = 'glucose';
    else if (rer <= 0.78) substrate = 'fatty-acids';
    else substrate = 'mixed';

    const vo2 = clamp(energy.vo2Current * 70, 80, energy.vo2Max * 70);
    const vco2 = vo2 * rer;
    return { rer, vo2, vco2, substrate };
}

function updateCardiovascular(
    prev: CardiovascularState,
    demand: EnergyDemandResult,
    energy: EnergyMatrix,
    hormones: HormonalEffectsResult,
    nutrients: NutrientState,
    commandedHeartRate: number,
    stress: number,
    dt: number
): CardiovascularState {
    const exercise = demand.exerciseFraction;
    const command = clamp(finiteOr(commandedHeartRate, BASE_HEART_RATE), 35, 200);
    const stressAboveBasal = clamp((stress - 20) / 80, -0.25, 1);
    const adrenalineAboveBasal = Math.max(
        0,
        hormones.newProfile.adrenaline - HORMONE_BASELINES.adrenaline
    );
    const hypovolemia = Math.max(0, (BASE_HYDRATION - nutrients.hydration) / 6);
    const targetHeartRate = clamp(
        command
        + exercise * 78
        + stressAboveBasal * 12
        + adrenalineAboveBasal * 0.10
        + hypovolemia * 18
        + energy.energyDeficit * 0.08,
        35,
        220
    );
    const heartRate = approachExp(prev.heartRate, targetHeartRate, exercise > 0.2 ? 6 : 12, dt);

    const volumeFactor = clamp(nutrients.hydration / BASE_HYDRATION, 0.70, 1.20);
    const fillingPenalty = clamp(1 - Math.max(0, heartRate - 170) / 180, 0.65, 1);
    const targetStrokeVolume = clamp(
        BASE_STROKE_VOLUME * volumeFactor * (1 + 0.42 * exercise) * fillingPenalty,
        35,
        135
    );
    const strokeVolume = approachExp(prev.strokeVolume, targetStrokeVolume, 18, dt);
    const cardiacOutput = clamp(heartRate * strokeVolume / 1000, 1.5, 28);

    const targetSvr = clamp(
        1000
        * (1 - 0.35 * exercise)
        * (1 + 0.16 * stressAboveBasal)
        * (1 + adrenalineAboveBasal * 0.0015)
        * (1 + hypovolemia * 0.28),
        450,
        1900
    );
    const systemicVascularResistance = approachExp(
        prev.systemicVascularResistance,
        targetSvr,
        20,
        dt
    );
    const mapTarget = 93
        * Math.pow(cardiacOutput / 4.9, 0.45)
        * Math.pow(systemicVascularResistance / 1000, 0.55);
    const pulsePressure = clamp(40 * strokeVolume / BASE_STROKE_VOLUME, 22, 85);
    const meanArterialPressure = clamp(mapTarget, 40, 180);
    const systolicBP = clamp(meanArterialPressure + pulsePressure * 2 / 3, 50, 260);
    const diastolicBP = clamp(meanArterialPressure - pulsePressure / 3, 30, 180);
    const hrvTarget = clamp(50 - exercise * 35 - Math.max(0, stressAboveBasal) * 20, 5, 90);
    const heartRateVariability = approachExp(prev.heartRateVariability, hrvTarget, 30, dt);
    const ejectionFraction = clamp(60 + exercise * 10 - energy.energyDeficit * 0.03, 30, 78);
    const perfusionIndex = clamp(85 * cardiacOutput / 4.9 * volumeFactor, 10, 100);
    const rhythm: CardiovascularState['rhythm'] = heartRate > 210
        ? 'fibrillation'
        : heartRate > 185 || nutrients.potassium < 2.7 || nutrients.potassium > 6.2
            ? 'arrhythmia'
            : 'sinus';

    return {
        ...prev,
        heartRate,
        heartRateVariability,
        rhythm,
        systolicBP,
        diastolicBP,
        meanArterialPressure,
        strokeVolume,
        cardiacOutput,
        ejectionFraction,
        systemicVascularResistance,
        perfusionIndex,
    };
}

function updateRespiratory(
    prev: RespiratoryState,
    acidBase: AcidBaseBalance,
    exchange: RespiratoryExchange,
    exerciseFraction: number,
    commandedDrive: number,
    dt: number
): RespiratoryState {
    const drive = clamp(finiteOr(commandedDrive, 100), 35, 300) / 100;
    const co2Feedback = clamp((prev.paco2 - 40) * 0.18, -3, 12);
    const acidFeedback = clamp((7.4 - acidBase.pH) * 18, -2, 10);
    const targetRespiratoryRate = clamp(
        14 * drive + exerciseFraction * 18 + co2Feedback + acidFeedback,
        5,
        55
    );
    const targetTidalVolume = clamp(
        500 * Math.pow(drive, 0.3) + exerciseFraction * 750,
        280,
        2200
    );
    const respiratoryRate = approachExp(prev.respiratoryRate, targetRespiratoryRate, 5, dt);
    const tidalVolume = approachExp(prev.tidalVolume, targetTidalVolume, 7, dt);
    const minuteVentilation = respiratoryRate * tidalVolume / 1000;
    const alveolarVentilation = Math.max(
        0.8,
        respiratoryRate * Math.max(50, tidalVolume - prev.deadSpace) / 1000
    );

    const targetPaco2 = clamp(
        40 * (exchange.vco2 / BASE_VCO2)
        * (BASE_ALVEOLAR_VENTILATION / alveolarVentilation),
        12,
        140
    );
    const paco2 = approachExp(prev.paco2, targetPaco2, 8, dt);

    const alveolarOxygen = INSPIRED_OXYGEN_FRACTION
        * (STANDARD_ATMOSPHERIC_PRESSURE - WATER_VAPOUR_PRESSURE)
        - paco2 / RESPIRATORY_QUOTIENT;
    const targetPao2 = clamp(alveolarOxygen - 5, 20, 110);
    const pao2 = approachExp(prev.pao2, targetPao2, 8, dt);
    // A Hill coefficient of 3 closely matches the clinically relevant upper
    // portion of the oxyhaemoglobin dissociation curve used by the monitor.
    const hillPower = 3;
    const targetSpo2 = 100 * Math.pow(pao2, hillPower)
        / (Math.pow(pao2, hillPower) + Math.pow(26.8, hillPower));
    const spo2 = clamp(approachExp(prev.spo2, targetSpo2, 5, dt), 35, 100);

    return {
        ...prev,
        respiratoryRate,
        tidalVolume,
        minuteVentilation,
        spo2,
        pao2,
        paco2,
    };
}

function updateAcidBase(
    prev: AcidBaseBalance,
    energy: EnergyMatrix,
    paco2: number,
    nutrients: NutrientState,
    dt: number
): AcidBaseBalance {
    const lactateAcidLoad = Math.max(0, energy.lactateLevel - 1) * 0.85;
    const deficitAcidLoad = Math.min(4, energy.energyDeficit * 0.02);
    const chronicRespiratoryCompensation = clamp((paco2 - 40) * 0.06, -4, 8);
    const targetBicarbonate = clamp(
        24 - lactateAcidLoad - deficitAcidLoad + chronicRespiratoryCompensation,
        10,
        40
    );
    const bicarbonateTau = lactateAcidLoad > 0.5 ? 12 * 60 : 30 * 60;
    const bicarbonate = clamp(
        approachExp(prev.bicarbonate, targetBicarbonate, bicarbonateTau, dt),
        8,
        45
    );
    const safePaco2 = clamp(paco2, 8, 180);
    const rawPH = 6.1 + Math.log10(bicarbonate / (0.03 * safePaco2));
    const pH = clamp(rawPH, 6.4, 8.2);
    const baseExcess = clamp(bicarbonate - 24, -20, 20);
    const chloride = clamp(100 + (nutrients.sodium - BASE_SODIUM) * 0.75, 80, 130);
    const anionGap = clamp(nutrients.sodium - chloride - bicarbonate, 0, 35);

    let state: AcidBaseBalance['state'] = 'normal';
    const metabolicAcidosis = bicarbonate < 22;
    const respiratoryAcidosis = safePaco2 > 45;
    const metabolicAlkalosis = bicarbonate > 26;
    const respiratoryAlkalosis = safePaco2 < 35;
    if (pH < 7.35 && metabolicAcidosis && respiratoryAcidosis) state = 'mixed';
    else if (pH < 7.35 && respiratoryAcidosis) state = 'acidosis-respiratory';
    else if (pH < 7.35 && metabolicAcidosis) state = 'acidosis-metabolic';
    else if (pH > 7.45 && metabolicAlkalosis && respiratoryAlkalosis) state = 'mixed';
    else if (pH > 7.45 && respiratoryAlkalosis) state = 'alkalosis-respiratory';
    else if (pH > 7.45 && metabolicAlkalosis) state = 'alkalosis-metabolic';

    const compensationRate = dt > 0
        ? Math.abs(bicarbonate - prev.bicarbonate) * 3600 / dt
        : 0;

    return {
        pH,
        bicarbonate,
        pco2: safePaco2,
        baseExcess,
        anionGap,
        state,
        compensationActive: state !== 'normal' || Math.abs(targetBicarbonate - 24) > 0.5,
        compensationRate,
    };
}

function updateAllostaticLoad(
    prev: AllostaticLoad,
    energy: EnergyMatrix,
    acidBase: AcidBaseBalance,
    cardio: CardiovascularState,
    respiratory: RespiratoryState,
    stress: number,
    dt: number
): AllostaticLoad {
    const stressAboveBasal = Math.max(0, stress - 20);
    const metabolicTarget = clamp(
        5 + energy.energyDeficit * 1.5 + Math.max(0, energy.lactateLevel - 2) * 12,
        0,
        100
    );
    const cardiovascularTarget = clamp(
        5
        + Math.max(0, Math.abs(cardio.heartRate - BASE_HEART_RATE) - 15) * 0.8
        + Math.max(0, Math.abs(cardio.meanArterialPressure - 93) - 15) * 0.6
        + stressAboveBasal * 0.45,
        0,
        100
    );
    const oxidativeTarget = clamp(
        5
        + Math.max(0, energy.lactateLevel - 1.5) * 10
        + energy.energyDeficit
        + Math.max(0, energy.vo2Current / Math.max(energy.vo2Max, 1) - 0.8) * 40,
        0,
        100
    );
    const inflammationTarget = clamp(
        5
        + Math.max(0, Math.abs(acidBase.pH - 7.4) - 0.05) * 220
        + Math.max(0, 94 - respiratory.spo2) * 3,
        0,
        100
    );

    const metabolicStress = approachExp(prev.metabolicStress, metabolicTarget, 60, dt);
    const cardiovascularStress = approachExp(prev.cardiovascularStress, cardiovascularTarget, 60, dt);
    const oxidativeStress = approachExp(prev.oxidativeStress, oxidativeTarget, 90, dt);
    const inflammationLevel = approachExp(prev.inflammationLevel, inflammationTarget, 5 * 60, dt);
    const loadTarget = clamp(
        5 + (metabolicStress + cardiovascularStress + oxidativeStress + inflammationLevel) / 4,
        0,
        100
    );
    const currentLoad = approachExp(prev.currentLoad, loadTarget, 120, dt);

    const dtHours = dt / 3600;
    const fatigueGain = Math.max(0, currentLoad - 20) * 0.08 * dtHours;
    const fatigueRecovery = currentLoad < 20 ? prev.recoveryRate * dtHours : 0;
    const fatigueLevel = clamp(prev.fatigueLevel + fatigueGain - fatigueRecovery, 0, 100);

    return {
        ...prev,
        currentLoad,
        metabolicStress,
        cardiovascularStress,
        oxidativeStress,
        inflammationLevel,
        fatigueLevel,
        adaptationCapacity: clamp(100 - fatigueLevel - Math.max(0, currentLoad - 60) * 0.2, 0, 100),
    };
}

function updateOrgans(
    prev: OrganSystem,
    cardio: CardiovascularState,
    respiratory: RespiratoryState,
    acidBase: AcidBaseBalance,
    energy: EnergyMatrix,
    nutrients: NutrientState,
    hormones: HormonalEffectsResult,
    dt: number
): OrganSystem {
    const entries = Object.entries(prev) as Array<[keyof OrganSystem, OrganState]>;
    const next = {} as OrganSystem;
    for (const [key, organ] of entries) {
        next[key] = updateOrgan(
            key,
            organ,
            cardio,
            respiratory,
            acidBase,
            energy,
            nutrients,
            hormones,
            dt
        );
    }
    return next;
}

function updateOrgan(
    key: keyof OrganSystem,
    prev: OrganState,
    cardio: CardiovascularState,
    respiratory: RespiratoryState,
    acidBase: AcidBaseBalance,
    energy: EnergyMatrix,
    nutrients: NutrientState,
    hormones: HormonalEffectsResult,
    dt: number
): OrganState {
    const flowRatio = clamp(cardio.cardiacOutput / 4.9, 0.2, 3);
    const protectedOrgan = key === 'brain' || key === 'heart';
    const perfusionTarget = clamp(
        100 * Math.pow(flowRatio, protectedOrgan ? 0.35 : 0.65),
        protectedOrgan ? 25 : 10,
        100
    );
    const perfusion = approachExp(prev.perfusion, perfusionTarget, 15, dt);
    const oxygenationTarget = clamp(respiratory.spo2 * perfusion / 100, 0, 100);
    const oxygenation = approachExp(prev.oxygenation, oxygenationTarget, 12, dt);

    const hypoxicInjury = Math.max(0, 88 - oxygenation) * 0.003;
    const ischemicInjury = Math.max(0, 55 - perfusion) * 0.002;
    const phInjury = Math.max(0, Math.abs(acidBase.pH - 7.4) - 0.20) * 0.45;
    const energeticInjury = Math.max(0, energy.energyDeficit - 20) * 0.0015;
    const glucoseInjury = key === 'brain' ? Math.max(0, 55 - nutrients.bloodGlucose) * 0.004 : 0;
    const injuryRatePerMin = hypoxicInjury + ischemicInjury + phInjury + energeticInjury + glucoseInjury;
    const healthyForRepair = oxygenation > 94
        && perfusion > 85
        && acidBase.pH >= 7.35
        && acidBase.pH <= 7.45
        && energy.energyDeficit < 5;
    const repairRatePerMin = healthyForRepair ? 0.025 : 0;
    const damage = clamp(
        prev.damage + (injuryRatePerMin - repairRatePerMin) * dt / 60,
        0,
        100
    );
    const functionality = clamp(100 - damage - Math.max(0, 60 - perfusion) * 0.25, 0, 100);
    const growthSignalingTarget = prev.canGrow
        ? clamp(hormones.newProfile.mTORActivity * energy.atpPool / Math.max(energy.maxATP, 1), 0, 100)
        : 0;
    const growthSignaling = approachExp(prev.growthSignaling, growthSignalingTarget, 10 * 60, dt);
    const growthRate = prev.canGrow
        ? clamp((growthSignaling - 50) * 0.02, -0.5, 1.5)
        : 0;

    return {
        ...prev,
        perfusion,
        oxygenation,
        damage,
        functionality,
        growthSignaling,
        growthRate,
    };
}

function checkVitalSigns(
    acidBase: AcidBaseBalance,
    cardio: CardiovascularState,
    respiratory: RespiratoryState,
    organs: OrganSystem
): boolean {
    return acidBase.pH >= PHYSIOLOGY_CONSTANTS.PH_LETHAL_LOW
        && acidBase.pH <= PHYSIOLOGY_CONSTANTS.PH_LETHAL_HIGH
        && cardio.heartRate >= 20
        && cardio.heartRate <= 250
        && cardio.rhythm !== 'fibrillation'
        && respiratory.spo2 >= 55
        && organs.brain.functionality > 5
        && organs.heart.functionality > 5;
}

function determineCauseOfDeath(
    acidBase: AcidBaseBalance,
    cardio: CardiovascularState,
    respiratory: RespiratoryState,
    organs: OrganSystem
): string {
    if (acidBase.pH < PHYSIOLOGY_CONSTANTS.PH_LETHAL_LOW) return 'Acidose severa com colapso cardiovascular';
    if (acidBase.pH > PHYSIOLOGY_CONSTANTS.PH_LETHAL_HIGH) return 'Alcalose severa com arritmia letal';
    if (cardio.rhythm === 'fibrillation' || cardio.heartRate > 250) return 'Fibrilação ventricular';
    if (cardio.heartRate < 20) return 'Bradicardia extrema com assistolia';
    if (respiratory.spo2 < 55) return 'Hipoxemia severa';
    if (organs.brain.functionality <= 5) return 'Falência neurológica irreversível';
    if (organs.heart.functionality <= 5) return 'Falência cardíaca terminal';
    return 'Falência múltipla de órgãos';
}

function generateWarnings(state: PhysiologyState): PhysiologicalWarning[] {
    const warnings: PhysiologicalWarning[] = [];
    const { acidBase, cardiovascular, respiratory, nutrients, energy } = state;

    pushWarning(
        warnings,
        'pH sanguíneo',
        acidBase.pH,
        [7.35, 7.45],
        Math.abs(acidBase.pH - 7.4) > 0.2 ? 'severe' : 'moderate',
        acidBase.pH < 7.35
            ? 'Aumentar ventilação quando houver hipercapnia e tratar a causa metabólica.'
            : 'Reduzir hiperventilação e revisar perdas de ácido ou excesso de base.'
    );
    pushWarning(
        warnings,
        'Glicose sanguínea',
        nutrients.bloodGlucose,
        [70, 100],
        nutrients.bloodGlucose < 55 || nutrients.bloodGlucose > 180 ? 'severe' : 'moderate',
        nutrients.bloodGlucose < 70
            ? 'Fornecer substrato e reduzir captação excessiva; glucagon depende de glicogênio hepático.'
            : 'Aumentar captação insulinodependente e reduzir aporte de glicose.'
    );
    pushWarning(
        warnings,
        'Frequência cardíaca',
        cardiovascular.heartRate,
        [60, 100],
        cardiovascular.heartRate < 40 || cardiovascular.heartRate > 150 ? 'severe' : 'mild',
        'Revisar comando autonômico, volume circulante, demanda e catecolaminas.'
    );
    pushWarning(
        warnings,
        'Saturação de O₂',
        respiratory.spo2,
        [95, 100],
        respiratory.spo2 < 85 ? 'severe' : 'moderate',
        'Aumentar ventilação alveolar e avaliar perfusão e troca gasosa.'
    );
    pushWarning(
        warnings,
        'Sódio plasmático',
        nutrients.sodium,
        [135, 145],
        nutrients.sodium < 125 || nutrients.sodium > 155 ? 'severe' : 'moderate',
        'Ajustar água absorvida e reabsorção renal lentamente para evitar correção osmótica rápida.'
    );
    pushWarning(
        warnings,
        'Hidratação corporal',
        nutrients.hydration,
        [38, 46],
        nutrients.hydration < 34 || nutrients.hydration > 50 ? 'severe' : 'moderate',
        'Equilibrar ingestão/absorção de água, suor e excreção renal.'
    );
    pushWarning(
        warnings,
        'Lactato',
        energy.lactateLevel,
        [0.5, 2],
        energy.lactateLevel > 4 ? 'severe' : 'moderate',
        'Melhorar oferta oxidativa ou reduzir demanda glicolítica.'
    );

    if (energy.energyDeficit > 10) {
        warnings.push({
            parameter: 'Déficit energético',
            currentValue: energy.energyDeficit,
            normalRange: [0, 10],
            severity: energy.energyDeficit > 50 ? 'severe' : 'moderate',
            recommendation: 'Reduzir demanda e restaurar oxigênio, substratos e fosfocreatina.',
        });
    }
    return warnings;
}

function pushWarning(
    warnings: PhysiologicalWarning[],
    parameter: string,
    value: number,
    normalRange: [number, number],
    severity: PhysiologicalWarning['severity'],
    recommendation: string
): void {
    if (value < normalRange[0] || value > normalRange[1]) {
        warnings.push({ parameter, currentValue: value, normalRange, severity, recommendation });
    }
}

function generatePhysiologicalEvents(
    prev: PhysiologyState,
    next: PhysiologyState
): PhysiologicalEvent[] {
    const events: PhysiologicalEvent[] = [];
    const previousPeriod = Math.floor(prev.timeElapsed / 30);
    const nextPeriod = Math.floor(next.timeElapsed / 30);
    if (nextPeriod <= previousPeriod) return events;

    if (next.energy.lactateLevel > 2.5) {
        events.push({
            type: 'metabolic',
            severity: next.energy.lactateLevel > 4 ? 'warning' : 'info',
            message: `Lactato ${next.energy.lactateLevel.toFixed(1)} mmol/L: fluxo glicolítico acima do clearance.`,
            timestamp: next.timeElapsed,
            affectedSystems: ['energy', 'acid-base'],
        });
    } else if (next.nutrients.bloodGlucose < 70) {
        events.push({
            type: 'metabolic',
            severity: next.nutrients.bloodGlucose < 55 ? 'critical' : 'warning',
            message: `Hipoglicemia: ${next.nutrients.bloodGlucose.toFixed(0)} mg/dL.`,
            timestamp: next.timeElapsed,
            affectedSystems: ['nutrients', 'brain'],
        });
    } else if (next.respiratory.spo2 < 94) {
        events.push({
            type: 'respiratory',
            severity: next.respiratory.spo2 < 85 ? 'critical' : 'warning',
            message: `Oxigenação reduzida: SpO₂ ${next.respiratory.spo2.toFixed(1)}%.`,
            timestamp: next.timeElapsed,
            affectedSystems: ['respiratory', 'organs'],
        });
    } else if (next.acidBase.pH < 7.35 || next.acidBase.pH > 7.45) {
        events.push({
            type: 'metabolic',
            severity: Math.abs(next.acidBase.pH - 7.4) > 0.2 ? 'warning' : 'info',
            message: `${next.acidBase.state}: pH ${next.acidBase.pH.toFixed(2)}, PaCO₂ ${next.acidBase.pco2.toFixed(0)} mmHg.`,
            timestamp: next.timeElapsed,
            affectedSystems: ['acid-base', 'respiratory', 'renal'],
        });
    } else {
        events.push({
            type: 'system',
            severity: 'info',
            message: `Homeostase mantida: ATP ${next.energy.atpPool.toFixed(1)} mmol, pH ${next.acidBase.pH.toFixed(2)}, glicose ${next.nutrients.bloodGlucose.toFixed(0)} mg/dL.`,
            timestamp: next.timeElapsed,
            affectedSystems: ['all'],
        });
    }
    return events;
}

function hormoneUpperLimit(hormone: keyof HormonalProfile): number {
    const limits: Record<keyof HormonalProfile, number> = {
        insulin: 300,
        gh: 100,
        testosterone: 3000,
        igf1: 1000,
        cortisol: 150,
        glucagon: 1000,
        adrenaline: 3000,
        noradrenaline: 5000,
        t3: 800,
        t4: 60,
        tsh: 100,
        mTORActivity: 100,
    };
    return limits[hormone];
}

function approachExp(current: number, target: number, timeConstantSec: number, dt: number): number {
    const safeCurrent = finiteOr(current, target);
    const tau = Math.max(1e-6, timeConstantSec);
    return target + (safeCurrent - target) * Math.exp(-dt / tau);
}

function finiteOr(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}
