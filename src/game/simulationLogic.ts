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
    NutrientState,
    OrganState,
    OrganSystem,
    PathophysiologyState,
    PHYSIOLOGY_CONSTANTS,
    PhysiologicalCapacities,
    PhysiologicalEvent,
    PhysiologicalWarning,
    PhysiologyState,
    RenalRegulationState,
    RespiratoryExchange,
    RespiratoryState,
    SimulationInput,
    SimulationOutput,
} from './types';
import { calculateEndocrineTick, type EndocrineEffectsResult } from './endocrine';
import { getSimulationCalendar } from './simulationCalendar';
import { interpretAcidBase } from './acidBase';
import { assessCardiacRhythm } from './cardiacRhythm';

const BASE_ATP_DEMAND = 30; // mmol/min in the simulator's whole-body scale
const BASE_BMR = 1800; // kcal/day, paciente padrão de 70 kg
const BASE_VO2 = 3.5; // mL/kg/min (1 MET)
const BASE_VCO2 = 200; // mL/min
const BASE_ALVEOLAR_VENTILATION = 4.9; // L/min: (500 - 150) * 14
const BASE_HEART_RATE = 70;
const BASE_STROKE_VOLUME = 70;
const BASE_HYDRATION = 42; // L, 70 kg adult
const BASE_LACTATE = 0.8; // mmol/L
const BASE_GLUCOSE = 90; // mg/dL
const BASE_RENAL_REABSORPTION = 99; // %
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
    const calendarTime = getSimulationCalendar(nextTime);
    const events: PhysiologicalEvent[] = [];

    const provisionalDemand = calculateEnergyDemand(
        BASE_BMR,
        externalFactors.exercise,
        prevState.allostaticLoad.currentLoad,
        1,
        externalFactors.sleep,
    );

    const hormonalEffects = calculateEndocrineTick({
        profile: prevState.hormones,
        cellularSignaling: prevState.cellularSignaling,
        regulation: prevState.endocrine,
        capacities: prevState.capacities,
        nutrients: prevState.nutrients,
        actions: input.hormonalActions,
        exercise: externalFactors.exercise,
        stress: externalFactors.stress,
        sleep: externalFactors.sleep,
        inflammation: Math.max(prevState.allostaticLoad.inflammationLevel, prevState.pathophysiology.infectionSeverity),
        energyDemand: provisionalDemand.atpDemandRate,
        energyDeficit: prevState.energy.energyDeficit,
        heartRate: prevState.cardiovascular.heartRate,
        simulationTime: nextTime,
        dt,
    });

    const energyDemand = calculateEnergyDemand(
        BASE_BMR,
        externalFactors.exercise,
        prevState.allostaticLoad.currentLoad,
        hormonalEffects.thyroidMetabolicMultiplier,
        externalFactors.sleep,
    );

    const preliminaryRenal = updateRenalRegulation(
        prevState.renal,
        prevState.cardiovascular,
        prevState.nutrients,
        prevState.capacities,
        prevState.pathophysiology,
        hormonalEffects,
        interventions.renalWaterReabsorption,
        dt,
    );

    const newEnergy = updateEnergyMatrix(
        prevState.energy,
        energyDemand,
        prevState.nutrients,
        prevState.respiratory.spo2,
        prevState.capacities,
        prevState.pathophysiology,
        input.cellularFeedback,
        dt
    );

    const newNutrients = updateNutrients(
        prevState.nutrients,
        hormonalEffects,
        energyDemand,
        externalFactors,
        interventions,
        preliminaryRenal,
        prevState.pathophysiology,
        dt
    );

    const respiratoryExchange = calculateRespiratoryExchange(newEnergy, newNutrients, input.cellularFeedback);

    const newCardiovascular = updateCardiovascular(
        prevState.cardiovascular,
        energyDemand,
        newEnergy,
        hormonalEffects,
        newNutrients,
        interventions.heartRateTarget,
        externalFactors.stress,
        prevState.capacities,
        prevState.pathophysiology,
        prevState.acidBase.pH,
        prevState.respiratory.spo2,
        prevState.organs.heart.damage,
        nextTime,
        dt
    );

    const newRespiratory = updateRespiratory(
        prevState.respiratory,
        prevState.acidBase,
        respiratoryExchange,
        energyDemand.exerciseFraction,
        interventions.ventilationDrive,
        prevState.capacities,
        prevState.pathophysiology,
        dt
    );

    const newRenal = updateRenalRegulation(
        preliminaryRenal,
        newCardiovascular,
        newNutrients,
        prevState.capacities,
        prevState.pathophysiology,
        hormonalEffects,
        interventions.renalWaterReabsorption,
        dt,
    );

    const newAcidBase = updateAcidBase(
        prevState.acidBase,
        newEnergy,
        newRespiratory.paco2,
        newNutrients,
        newRenal,
        prevState.pathophysiology,
        dt
    );

    const newPathophysiology = updatePathophysiology(
        prevState.pathophysiology,
        prevState.capacities,
        newNutrients,
        hormonalEffects,
        newCardiovascular,
        newRespiratory,
        newAcidBase,
        input.cellularFeedback,
        dt,
    );

    const bodyTemperature = updateBodyTemperature(
        prevState.bodyTemperature,
        externalFactors.temperature,
        energyDemand.exerciseFraction,
        hormonalEffects.thyroidMetabolicMultiplier,
        newPathophysiology.infectionSeverity,
        dt,
    );

    const newAllostaticLoad = updateAllostaticLoad(
        prevState.allostaticLoad,
        newEnergy,
        newAcidBase,
        newCardiovascular,
        newRespiratory,
        externalFactors.stress,
        externalFactors.sleep,
        newPathophysiology,
        input.cellularFeedback,
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
        prevState.capacities,
        newPathophysiology,
        input.cellularFeedback,
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
        cellularSignaling: hormonalEffects.cellularSignaling,
        endocrine: hormonalEffects.regulation,
        capacities: prevState.capacities,
        renal: newRenal,
        pathophysiology: newPathophysiology,
        cardiovascular: newCardiovascular,
        respiratory: newRespiratory,
        organs: newOrgans,
        acidBase: newAcidBase,
        allostaticLoad: newAllostaticLoad,
        respiratoryExchange,
        basalMetabolicRate: BASE_BMR * hormonalEffects.thyroidMetabolicMultiplier,
        totalEnergyExpenditure: energyDemand.totalExpenditure,
        activityLevel: clamp(externalFactors.exercise, 0, 100),
        bodyTemperature,
        timeElapsed: nextTime,
        cyclePhase: externalFactors.sleep >= 70 && (calendarTime.hour >= 22 || calendarTime.hour < 7) ? 'sleep' : 'awake',
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
    allostaticLoad: number,
    thyroidMultiplier: number,
    sleepQuality: number,
): EnergyDemandResult {
    const safeBmr = Math.max(800, finiteOr(bmr, BASE_BMR));
    const exerciseFraction = clamp(exerciseIntensity / 100, 0, 1);
    const metabolicBmr = safeBmr * clamp(thyroidMultiplier, .7, 1.7);
    const activityMultiplier = 1 + 3.5 * Math.pow(exerciseFraction, 1.35);
    const activityCost = metabolicBmr * (activityMultiplier - 1);
    const excessAllostaticLoad = Math.max(0, allostaticLoad - 10) / 90;
    const sleepDebtCost = safeBmr * Math.max(0, 70 - sleepQuality) / 100 * .08;
    const allostaticCost = safeBmr * 0.12 * excessAllostaticLoad + sleepDebtCost;
    const totalExpenditure = metabolicBmr + activityCost + allostaticCost;
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
    capacities: PhysiologicalCapacities,
    pathophysiology: PathophysiologyState,
    cellularFeedback: SimulationInput['cellularFeedback'],
    dt: number
): EnergyMatrix {
    const dtMin = dt / 60;
    const demandRate = demand.atpDemandRate;
    const oxygenAvailability = clamp((spo2 - 70) / 28, 0, 1);
    const substrateAvailability = clamp((nutrients.bloodGlucose - 45) / 45, 0, 1);
    const aerobicCapacity = BASE_ATP_DEMAND
        * Math.max(1, prevEnergy.vo2Max / BASE_VO2)
        * oxygenAvailability
        * (0.45 + 0.55 * substrateAvailability)
        * clamp(capacities.mitochondrialCapacity, .2, 1);

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
        + Math.max(0, glycolyticRate - basalGlycolyticRate) * 0.018
        // Infecção sistêmica também acelera glicólise imune e cria
        // desbalanço perfusional; o termo mantém lactato mensurável na sepse.
        + pathophysiology.infectionSeverity / 100 * .07
        + Math.max(0, cellularFeedback?.lactateFlux ?? 0);
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

function updateRenalRegulation(
    prev: RenalRegulationState,
    cardio: CardiovascularState,
    nutrients: NutrientState,
    capacities: PhysiologicalCapacities,
    pathophysiology: PathophysiologyState,
    hormones: EndocrineEffectsResult,
    commandedReabsorption: number,
    dt: number,
): RenalRegulationState {
    const mapFactor = cardio.meanArterialPressure >= 80
        ? 1
        : clamp((cardio.meanArterialPressure - 35) / 45, .05, 1);
    const flowFactor = clamp(cardio.cardiacOutput / 4.9, .2, 1.35);
    const septicPenalty = 1 - pathophysiology.infectionSeverity / 100 * .25;
    const targetGfr = clamp(
        125 * capacities.renalFunction * Math.min(mapFactor, Math.pow(flowFactor, .45)) * septicPenalty,
        5,
        160,
    );
    const gfr = approachExp(prev.gfr, targetGfr, 90, dt);
    const renalBloodFlow = approachExp(
        prev.renalBloodFlow,
        clamp(1100 * flowFactor * mapFactor * capacities.renalFunction, 180, 1500),
        75,
        dt,
    );
    const hypovolemia = clamp((BASE_HYDRATION - nutrients.hydration) / 8, 0, 1);
    const hypervolemia = clamp((nutrients.hydration - BASE_HYDRATION) / 7, 0, 1);
    const hypotension = clamp((80 - cardio.meanArterialPressure) / 40, 0, 1);
    const hypertension = clamp((cardio.meanArterialPressure - 105) / 45, 0, 1);
    const anpTarget = clamp(18 + hypervolemia * 70 + hypertension * 35, 0, 100);
    const anpActivity = approachExp(prev.anpActivity, anpTarget, 4 * 60, dt);
    const reninTarget = clamp(18 + hypovolemia * 70 + hypotension * 58 - anpActivity * .35, 0, 100);
    const reninActivity = approachExp(prev.reninActivity, reninTarget, 2 * 60, dt);
    const angiotensinIIActivity = approachExp(prev.angiotensinIIActivity, reninActivity, 75, dt);
    const raasActivity = (reninActivity + angiotensinIIActivity) / 2;
    const estimatedOsmolarity = 2 * nutrients.sodium + nutrients.bloodGlucose / 18 + 5;
    const commandedFreeWater = clamp((commandedReabsorption - 98.6) / 1.18 * 100, 0, 100);
    const endogenousAdhTarget = clamp(35 + Math.max(0, estimatedOsmolarity - 290) * 4 + hypovolemia * 50 - anpActivity * .18, 0, 100);
    const adhTarget = clamp(endogenousAdhTarget * .65 + commandedFreeWater * .35, 0, 100);
    const adhActivity = approachExp(prev.adhActivity, adhTarget, 2 * 60, dt);
    const aldosteroneTarget = clamp(20 + angiotensinIIActivity * .62 + Math.max(0, nutrients.potassium - 4) * 18 - anpActivity * .22, 0, 100);
    const aldosteroneActivity = approachExp(prev.aldosteroneActivity, aldosteroneTarget, 12 * 60, dt);
    const cortisolMineralocorticoid = Math.max(0, hormones.newProfile.cortisol - 25) * .002;
    const proximalReabsorption = clamp(65 + hypovolemia * 2 - hypervolemia * 1.5, 62, 68);
    const distalSodiumReabsorption = clamp(1 + aldosteroneActivity * .025 + cortisolMineralocorticoid, .8, 3.8);
    const freeWaterReabsorption = clamp(adhActivity, 0, 100);
    const effectiveReabsorption = clamp(98.7 + freeWaterReabsorption * .012 + distalSodiumReabsorption * .035, 98.65, 99.9);
    const urineFlow = clamp(gfr * (1 - effectiveReabsorption / 100), .05, 20);
    const urineOsmolality = clamp(70 + adhActivity * 10.8, 60, 1200);
    const pthTarget = clamp(35 + Math.max(0, 9.2 - nutrients.calcium) * 24 + Math.max(0, nutrients.phosphate - 4.2) * 14, 0, 100);
    const pthActivity = approachExp(prev.pthActivity, pthTarget, 30 * 60, dt);
    const calcitriolTarget = clamp(58 * capacities.renalFunction + pthActivity * .28 - Math.max(0, nutrients.phosphate - 4) * 8, 0, 100);
    const calcitriolActivity = approachExp(prev.calcitriolActivity, calcitriolTarget, 8 * 60 * 60, dt);
    const epoTarget = clamp(35 + Math.max(0, 13 - nutrients.hemoglobin) * 18, 0, 100);
    const epoActivity = approachExp(prev.epoActivity, epoTarget * capacities.renalFunction, 12 * 60 * 60, dt);
    return {
        gfr,
        renalBloodFlow,
        urineFlow,
        urineOsmolality,
        adhActivity,
        aldosteroneActivity,
        reninActivity,
        angiotensinIIActivity,
        raasActivity,
        anpActivity,
        proximalReabsorption,
        distalSodiumReabsorption,
        freeWaterReabsorption,
        pthActivity,
        calcitriolActivity,
        epoActivity,
    };
}

function updatePathophysiology(
    prev: PathophysiologyState,
    capacities: PhysiologicalCapacities,
    nutrients: NutrientState,
    hormones: EndocrineEffectsResult,
    cardio: CardiovascularState,
    respiratory: RespiratoryState,
    acidBase: AcidBaseBalance,
    cellularFeedback: SimulationInput['cellularFeedback'],
    dt: number,
): PathophysiologyState {
    const insulinEffect = hormones.newProfile.insulin / 10
        * hormones.regulation.insulinReceptorSensitivity;
    const osmoticDiuresisTarget = Math.max(0, nutrients.bloodGlucose - 180) * .025
        + Math.max(0, nutrients.ketones - .6) * .18;
    const osmoticDiuresis = approachExp(prev.osmoticDiuresis, osmoticDiuresisTarget, 4 * 60, dt);
    const ketoneProduction = hormones.ketogenesisRate;
    const immuneCompetence = clamp(capacities.immuneActivation * (1 - hormones.immuneSuppression), .05, 1.4);
    const barrierFailure = cellularFeedback?.barrierFailureSignal ?? 0;
    const pathogenGrowthRate = prev.infectionSeverity
        * (.00025 + hormones.immuneSuppression * .002 + barrierFailure * .0012);
    const immuneClearanceRate = prev.infectionSeverity * .0012 * immuneCompetence
        + (prev.infectionSeverity > 0 ? .006 * immuneCompetence : 0);
    const infectionFloor = prev.preset === 'sepsis' ? 55 : 0;
    const infectionSeverity = clamp(
        Math.max(infectionFloor, prev.infectionSeverity + (pathogenGrowthRate - immuneClearanceRate) * dt),
        0,
        100,
    );
    const capillaryLeak = approachExp(
        prev.capillaryLeak,
        clamp(infectionSeverity / 100 * .5, 0, .55),
        6 * 60,
        dt,
    );

    let burdenTarget = 0;
    if (prev.preset === 'type1-diabetes' || prev.preset === 'type2-diabetes') {
        burdenTarget = Math.max(0, nutrients.bloodGlucose - 110) * .25
            + Math.max(0, nutrients.ketones - .6) * 8
            + Math.max(0, 1 - insulinEffect) * (1 - capacities.pancreaticBetaReserve) * 35;
    } else if (prev.preset === 'respiratory-failure') {
        burdenTarget = Math.max(0, 95 - respiratory.spo2) * 4 + respiratory.shuntFraction * 80;
    } else if (prev.preset === 'renal-failure') {
        burdenTarget = (1 - capacities.renalFunction) * 55 + Math.max(0, nutrients.potassium - 5) * 12;
    } else if (prev.preset === 'sepsis') {
        burdenTarget = infectionSeverity * .7 + Math.max(0, 70 - cardio.meanArterialPressure) * .5;
    } else if (prev.preset === 'hypothyroidism') {
        burdenTarget = Math.max(0, 80 - hormones.newProfile.t3) * .5
            + Math.max(0, 5 - hormones.newProfile.t4) * 5
            + Math.max(0, 55 - cardio.heartRate) * .35;
    } else if (prev.preset === 'hyperthyroidism') {
        burdenTarget = Math.max(0, hormones.newProfile.t3 - 180) * .35 + Math.max(0, cardio.heartRate - 100) * .4;
    } else if (prev.preset === 'cushing-syndrome') {
        burdenTarget = Math.max(0, hormones.newProfile.cortisol - 20) * 1.1
            + Math.max(0, nutrients.bloodGlucose - 110) * .22
            + Math.max(0, cardio.meanArterialPressure - 105) * .3;
    } else if (prev.preset === 'adrenal-insufficiency') {
        burdenTarget = Math.max(0, 8 - hormones.newProfile.cortisol) * 7 + Math.max(0, 80 - cardio.meanArterialPressure) * .6;
    }
    burdenTarget += Math.max(0, 7.30 - acidBase.pH) * 80
        + infectionSeverity * .35
        + (cellularFeedback?.apoptoticSignal ?? 0) * 18;
    const diseaseBurden = approachExp(prev.diseaseBurden, clamp(burdenTarget, 0, 100), 4 * 60, dt);
    return { ...prev, diseaseBurden, infectionSeverity, capillaryLeak, osmoticDiuresis, ketoneProduction };
}

function updateBodyTemperature(
    previous: number,
    ambient: number,
    exerciseFraction: number,
    thyroidMultiplier: number,
    infectionSeverity: number,
    dt: number,
): number {
    const target = 36.8
        + exerciseFraction * .7
        + Math.max(0, thyroidMultiplier - 1) * 1.2
        + infectionSeverity / 100 * 1.7
        + clamp((ambient - 26) / 20, -.25, .5);
    return clamp(approachExp(previous, target, 8 * 60, dt), 34, 42.5);
}

function updateNutrients(
    prev: NutrientState,
    hormones: EndocrineEffectsResult,
    demand: EnergyDemandResult,
    external: SimulationInput['externalFactors'],
    interventions: SimulationInput['interventions'],
    renal: RenalRegulationState,
    pathophysiology: PathophysiologyState,
    dt: number
): NutrientState {
    const dtMin = dt / 60;
    const dtHours = dt / 3600;
    const exerciseFraction = demand.exerciseFraction;
    const nutritionInput = clamp((external.nutrition - 80) / 20, -1, 1);

    // Um retorno físico muito lento permanece; o controle rápido agora vem dos
    // eixos insulina/glucagon. Em diabetes ele não mascara a falha pancreática.
    const passiveTauMinutes = pathophysiology.preset === 'healthy' ? 60 : 360;
    const passiveGlucoseRegulation = (BASE_GLUCOSE - prev.bloodGlucose) / passiveTauMinutes;
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

    const hepaticReleaseRate = Math.min(
        prev.liverGlycogen / Math.max(dtMin, 1e-6),
        Math.max(0, hormones.hepaticGlucoseDrive - passiveGlucoseRegulation),
    );
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

    const proteolysisKg = prev.muscleMass * hormones.proteolysisRate * dtHours / 24;
    const synthesisKg = hormones.proteinSynthesisRate / 1000 * dtHours / 24;
    const muscleMass = clamp(prev.muscleMass - proteolysisKg + synthesisKg, 10, 55);
    const aminoAcids = clamp(prev.aminoAcids + proteolysisKg * 100 - synthesisKg * 45, 15, 120);

    const waterAbsorption = clamp(finiteOr(interventions.waterAbsorptionRate, 0), 0, 1500);
    const heatLoad = Math.max(0, external.temperature - 26) / 14;
    const sweatLoss = 0.2 + exerciseFraction * 8 + heatLoad * 3;
    const netWaterMlMin = waterAbsorption
        - renal.urineFlow
        - pathophysiology.osmoticDiuresis
        - INSENSIBLE_WATER_LOSS_ML_MIN
        - sweatLoss;
    const hydration = clamp(prev.hydration + netWaterMlMin * dtMin / 1000, 28, 55);

    // On short time scales sodium mass is nearly conserved, so water movement
    // changes concentration. A slow renal controller returns it toward 140.
    const dilutionAdjustedSodium = prev.sodium * prev.hydration / hydration;
    const sodiumCorrectionTau = 12 * 60 * 60 / Math.max(.12, renal.gfr / 125);
    const sodiumRegulatoryTarget = 140
        + (renal.aldosteroneActivity - 35) * .012
        - (renal.anpActivity - 20) * .01;
    const sodium = clamp(
        approachExp(dilutionAdjustedSodium, sodiumRegulatoryTarget, sodiumCorrectionTau, dt),
        115,
        170
    );
    const insulinShift = Math.max(0, hormones.newProfile.insulin / 10 - 1) * .16;
    const renalPotassiumRetention = Math.max(0, 1 - renal.gfr / 125) * 2.2;
    const ketoneShift = Math.max(0, prev.ketones - .6) * .18;
    const aldosteronePotassiumExcretion = Math.max(0, renal.aldosteroneActivity - 30) * .008;
    const potassiumTarget = 4 + renalPotassiumRetention + ketoneShift - insulinShift - aldosteronePotassiumExcretion;
    const potassium = clamp(approachExp(prev.potassium, potassiumTarget, 45 * 60, dt), 2, 7);
    const dilutionAdjustedChloride = prev.chloride * prev.hydration / hydration;
    const chlorideTarget = 104 + (sodium - 140) * .45 - Math.max(0, prev.ketones - .6) * .2;
    const chloride = clamp(approachExp(dilutionAdjustedChloride, chlorideTarget, 8 * 60 * 60, dt), 75, 135);
    const dilutionFactor = prev.hydration / Math.max(1, hydration);
    const albuminTarget = pathophysiology.infectionSeverity > 40 ? 3.2 : 4;
    const albumin = clamp(approachExp(prev.albumin * dilutionFactor, albuminTarget, 24 * 60 * 60, dt), 1.5, 5.5);
    const phosphateTarget = 3.5 + Math.max(0, 1 - renal.gfr / 125) * 3 - renal.pthActivity * .008;
    const phosphate = clamp(approachExp(prev.phosphate, phosphateTarget, 4 * 60 * 60, dt), 1, 9);
    const calciumTarget = 9.4 + (renal.calcitriolActivity - 55) * .012 - Math.max(0, phosphate - 4.5) * .18;
    const calcium = clamp(approachExp(prev.calcium, calciumTarget, 6 * 60 * 60, dt), 6, 13);
    const magnesiumTarget = 2 + Math.max(0, 1 - renal.gfr / 125) * .8;
    const magnesium = clamp(approachExp(prev.magnesium, magnesiumTarget, 8 * 60 * 60, dt), .8, 4.5);
    const hemoglobinTarget = 14 + (renal.epoActivity - 35) * .01;
    const hemoglobin = clamp(approachExp(prev.hemoglobin * dilutionFactor, hemoglobinTarget, 20 * 24 * 60 * 60, dt), 5, 20);
    const hematocrit = clamp(hemoglobin * 3, 15, 60);
    const ketoneClearance = .012 * Math.max(.1, renal.gfr / 125) + Math.max(0, hormones.newProfile.insulin / 10 - .5) * .018;
    const ketones = clamp(prev.ketones + (hormones.ketogenesisRate - ketoneClearance) * dtMin, .1, 15);
    const hoursSinceMeal = prev.hoursSinceMeal + dtHours;

    return {
        ...prev,
        bloodGlucose,
        liverGlycogen,
        muscleGlycogen,
        fattyAcids,
        adiposeTissue,
        aminoAcids,
        muscleMass,
        proteinSynthesisRate: approachExp(
            prev.proteinSynthesisRate,
            hormones.proteinSynthesisRate,
            30 * 60,
            dt
        ),
        hydration,
        sodium,
        potassium,
        chloride,
        calcium,
        phosphate,
        magnesium,
        albumin,
        hemoglobin,
        hematocrit,
        ketones,
        fedState: hoursSinceMeal < 6,
        hoursSinceMeal,
    };
}

function calculateRespiratoryExchange(
    energy: EnergyMatrix,
    nutrients: NutrientState,
    cellularFeedback: SimulationInput['cellularFeedback'],
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
    const vco2 = vo2 * rer + Math.max(0, cellularFeedback?.carbonDioxideFlux ?? 0) * 20;
    return { rer, vo2, vco2, substrate };
}

function updateCardiovascular(
    prev: CardiovascularState,
    demand: EnergyDemandResult,
    energy: EnergyMatrix,
    hormones: EndocrineEffectsResult,
    nutrients: NutrientState,
    commandedHeartRate: number,
    stress: number,
    capacities: PhysiologicalCapacities,
    pathophysiology: PathophysiologyState,
    arterialPH: number,
    spo2: number,
    myocardialDamage: number,
    simulationTime: number,
    dt: number
): CardiovascularState {
    const exercise = demand.exerciseFraction;
    const command = clamp(finiteOr(commandedHeartRate, BASE_HEART_RATE), 35, 200);
    const stressAboveBasal = clamp((stress - 20) / 80, -0.25, 1);
    const effectiveHydration = nutrients.hydration * (1 - pathophysiology.capillaryLeak * .16);
    const hypovolemia = Math.max(0, (BASE_HYDRATION - effectiveHydration) / 6);
    const baroreflexTarget = clamp((90 - prev.meanArterialPressure) / 45, -1, 1) * 100;
    const baroreflexActivity = approachExp(prev.baroreflexActivity, baroreflexTarget, 8, dt);
    const baroreflexDrive = baroreflexActivity / 100;
    const targetHeartRate = clamp(
        command
        + exercise * 78
        + stressAboveBasal * 12
        + hormones.adrenergicCardiacDrive * 8
        + hypovolemia * 18
        + energy.energyDeficit * 0.08
        + (baroreflexDrive >= 0 ? baroreflexDrive * 28 : baroreflexDrive * 12),
        35,
        220
    );
    const heartRate = approachExp(prev.heartRate, targetHeartRate, exercise > 0.2 ? 6 : 12, dt);

    const volumeFactor = clamp(effectiveHydration / BASE_HYDRATION, 0.60, 1.20);
    const fillingPenalty = clamp(1 - Math.max(0, heartRate - 170) / 180, 0.65, 1);
    const targetStrokeVolume = clamp(
        BASE_STROKE_VOLUME * volumeFactor * (1 + 0.42 * exercise) * fillingPenalty,
        35,
        135
    );
    const strokeVolume = approachExp(prev.strokeVolume, targetStrokeVolume, 18, dt);
    const organizedCardiacOutput = clamp(heartRate * strokeVolume / 1000, .1, 28);
    const preliminaryPerfusion = clamp(100 * organizedCardiacOutput / 4.9 * volumeFactor, 0, 140);
    const rhythmAssessment = assessCardiacRhythm({
        previousRhythm: prev.rhythm,
        heartRate,
        potassium: nutrients.potassium,
        spo2,
        pH: arterialPH,
        perfusionRelative: preliminaryPerfusion,
        myocardialDamage,
        adrenergicDrive: hormones.adrenergicCardiacDrive,
        thyroidExcess: Math.max(0, hormones.newProfile.t3 / 120 - 1),
        timeSeconds: simulationTime,
    });
    const cardiacOutput = clamp(organizedCardiacOutput * rhythmAssessment.effectiveOutputFraction, .05, 28);

    const vasoplegia = pathophysiology.infectionSeverity / 100
        * (1 - capacities.vascularToneResponsiveness) * .85;
    const targetSvr = clamp(
        1000
        * (1 - 0.35 * exercise)
        * (1 + 0.16 * stressAboveBasal)
        * (1 + hormones.adrenergicVascularDrive * .08)
        * (1 + hormones.glucocorticoidVascularSupport)
        * (.4 + .6 * capacities.vascularToneResponsiveness)
        * (1 - vasoplegia)
        * (1 + hypovolemia * 0.28)
        * (1 + baroreflexDrive * .32),
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
    const perfusionIndex = clamp(100 * cardiacOutput / 4.9 * volumeFactor, 0, 140);

    return {
        ...prev,
        heartRate,
        heartRateVariability,
        rhythm: rhythmAssessment.rhythm,
        arrhythmiaRisk: rhythmAssessment.risk,
        baroreflexActivity,
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
    capacities: PhysiologicalCapacities,
    pathophysiology: PathophysiologyState,
    dt: number
): RespiratoryState {
    const ventilatoryCapacity = clamp(capacities.ventilatoryCapacity, .25, 1);
    const drive = clamp(finiteOr(commandedDrive, 100), 35, 300) / 100 * ventilatoryCapacity;
    const co2Feedback = clamp((prev.paco2 - 40) * 0.18, -3, 12);
    const acidFeedback = clamp((7.4 - acidBase.pH) * 18, -2, 10);
    const targetRespiratoryRate = clamp(
        14 * drive + exerciseFraction * 18 + co2Feedback + acidFeedback,
        5,
        55 * ventilatoryCapacity + 5
    );
    const complianceFactor = clamp(prev.lungCompliance / 100, .3, 1.2);
    const targetTidalVolume = clamp(
        (500 * Math.pow(Math.max(.2, drive), 0.3) + exerciseFraction * 750) * complianceFactor,
        280,
        2200 * ventilatoryCapacity
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
    const diseaseShunt = pathophysiology.preset === 'respiratory-failure'
        ? Math.max(.18, prev.shuntFraction)
        : pathophysiology.preset === 'sepsis' ? .08 : .03;
    const shuntFraction = approachExp(prev.shuntFraction, diseaseShunt, 3 * 60, dt);
    const vqTarget = pathophysiology.preset === 'respiratory-failure'
        ? Math.min(.68, prev.vqEfficiency)
        : pathophysiology.preset === 'sepsis' ? .88 : .98;
    const vqEfficiency = approachExp(prev.vqEfficiency, vqTarget, 3 * 60, dt);
    const aaGradient = 5 + (1 - vqEfficiency) * 90;
    const ventilatedPao2 = clamp(alveolarOxygen - aaGradient, 20, 110);
    const targetPao2 = clamp(ventilatedPao2 * (1 - shuntFraction) + 40 * shuntFraction, 20, 110);
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
        shuntFraction,
        vqEfficiency,
    };
}

function updateAcidBase(
    prev: AcidBaseBalance,
    energy: EnergyMatrix,
    paco2: number,
    nutrients: NutrientState,
    renal: RenalRegulationState,
    pathophysiology: PathophysiologyState,
    dt: number
): AcidBaseBalance {
    const lactateAcidLoad = Math.max(0, energy.lactateLevel - 1) * 0.85;
    const ketoneAcidLoad = Math.max(0, nutrients.ketones - .6) * 1.25;
    const deficitAcidLoad = Math.min(4, energy.energyDeficit * 0.02);
    const renalCapacity = clamp(renal.gfr / 125, .05, 1);
    const chronicRespiratoryCompensation = clamp((paco2 - 40) * 0.06, -4, 8) * renalCapacity;
    const renalFailureAcidLoad = Math.max(0, 1 - renalCapacity) * 5
        * (pathophysiology.preset === 'renal-failure' ? 1 : .25);
    const targetBicarbonate = clamp(
        24 - lactateAcidLoad - ketoneAcidLoad - deficitAcidLoad - renalFailureAcidLoad + chronicRespiratoryCompensation,
        10,
        40
    );
    const bicarbonateTau = lactateAcidLoad + ketoneAcidLoad > 0.5 ? 12 * 60 : 30 * 60 / renalCapacity;
    const bicarbonate = clamp(
        approachExp(prev.bicarbonate, targetBicarbonate, bicarbonateTau, dt),
        8,
        45
    );
    const safePaco2 = clamp(paco2, 8, 180);
    const rawPH = 6.1 + Math.log10(bicarbonate / (0.03 * safePaco2));
    const pH = clamp(rawPH, 6.4, 8.2);
    const analysis = interpretAcidBase({
        pH,
        bicarbonate,
        pco2: safePaco2,
        sodium: nutrients.sodium,
        chloride: nutrients.chloride,
        albumin: nutrients.albumin,
    });

    const compensationRate = dt > 0
        ? Math.abs(bicarbonate - prev.bicarbonate) * 3600 / dt
        : 0;

    return {
        pH,
        bicarbonate,
        pco2: safePaco2,
        ...analysis,
        compensationActive: analysis.state !== 'normal' || Math.abs(targetBicarbonate - 24) > 0.5,
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
    sleep: number,
    pathophysiology: PathophysiologyState,
    cellularFeedback: SimulationInput['cellularFeedback'],
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
    const contextualInflammationTarget = clamp(
        inflammationTarget
        + pathophysiology.infectionSeverity * .85
        + (cellularFeedback?.inflammationSignal ?? 0) * 35,
        0,
        100
    );

    const metabolicStress = approachExp(prev.metabolicStress, metabolicTarget, 60, dt);
    const cardiovascularStress = approachExp(prev.cardiovascularStress, cardiovascularTarget, 60, dt);
    const oxidativeStress = approachExp(prev.oxidativeStress, oxidativeTarget, 90, dt);
    const inflammationLevel = approachExp(prev.inflammationLevel, contextualInflammationTarget, 5 * 60, dt);
    const loadTarget = clamp(
        5 + (metabolicStress + cardiovascularStress + oxidativeStress + inflammationLevel) / 4,
        0,
        100
    );
    const currentLoad = approachExp(prev.currentLoad, loadTarget, 120, dt);

    const dtHours = dt / 3600;
    const fatigueGain = Math.max(0, currentLoad - 20) * 0.08 * dtHours;
    const recoveryMultiplier = clamp(sleep / 80, .15, 1.25);
    const fatigueRecovery = currentLoad < 35 ? prev.recoveryRate * recoveryMultiplier * dtHours : 0;
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
    hormones: EndocrineEffectsResult,
    capacities: PhysiologicalCapacities,
    pathophysiology: PathophysiologyState,
    cellularFeedback: SimulationInput['cellularFeedback'],
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
            capacities,
            pathophysiology,
            cellularFeedback,
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
    hormones: EndocrineEffectsResult,
    capacities: PhysiologicalCapacities,
    pathophysiology: PathophysiologyState,
    cellularFeedback: SimulationInput['cellularFeedback'],
    dt: number
): OrganState {
    const flowRatio = clamp(cardio.cardiacOutput / 4.9, 0.2, 3);
    const protectedOrgan = key === 'brain' || key === 'heart';
    const organCapacity = key === 'kidneys'
        ? capacities.renalFunction
        : key === 'lungs' ? capacities.ventilatoryCapacity
            : key === 'muscles' ? capacities.mitochondrialCapacity : 1;
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
    const energeticInjury = Math.max(0, energy.energyDeficit - 20) * 0.0015
        + Math.max(0, .5 - organCapacity) * .025;
    const glucoseInjury = key === 'brain' ? Math.max(0, 55 - nutrients.bloodGlucose) * 0.004 : 0;
    const septicInjury = pathophysiology.infectionSeverity / 100
        * (key === 'kidneys' || key === 'lungs' ? .035 : .018);
    const observedTissueInjury = key === 'muscles'
        ? Math.max(0, .7 - (cellularFeedback?.viabilitySignal ?? 1)) * .025
        : 0;
    const injuryRatePerMin = hypoxicInjury + ischemicInjury + phInjury + energeticInjury + glucoseInjury + septicInjury + observedTissueInjury;
    const healthyForRepair = oxygenation > 94
        && perfusion > 85
        && acidBase.pH >= 7.35
        && acidBase.pH <= 7.45
        && energy.energyDeficit < 5;
    const repairRatePerMin = healthyForRepair
        ? 0.025 * (.65 + hormones.regulation.anabolicSensitivity * .35)
        : 0;
    const damage = clamp(
        prev.damage + (injuryRatePerMin - repairRatePerMin) * dt / 60,
        0,
        100
    );
    const functionality = clamp(100 - damage - Math.max(0, 60 - perfusion) * 0.25, 0, 100);
    const growthSignalingTarget = prev.canGrow
        ? clamp(hormones.cellularSignaling.mTorActivity * energy.atpPool / Math.max(energy.maxATP, 1), 0, 100)
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
        && cardio.rhythm !== 'ventricular-fibrillation'
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
    if (cardio.rhythm === 'ventricular-fibrillation') return 'Fibrilação ventricular';
    if (cardio.rhythm === 'ventricular-tachycardia' || cardio.heartRate > 250) return 'Taquicardia ventricular sem débito sustentado';
    if (cardio.heartRate < 20) return 'Bradicardia extrema com assistolia';
    if (respiratory.spo2 < 55) return 'Hipoxemia severa';
    if (organs.brain.functionality <= 5) return 'Falência neurológica irreversível';
    if (organs.heart.functionality <= 5) return 'Falência cardíaca terminal';
    return 'Falência múltipla de órgãos';
}

function generateWarnings(state: PhysiologyState): PhysiologicalWarning[] {
    const warnings: PhysiologicalWarning[] = [];
    const { acidBase, cardiovascular, respiratory, nutrients, energy, renal } = state;

    pushWarning(
        warnings,
        'pH sanguíneo',
        acidBase.pH,
        [7.35, 7.45],
        Math.abs(acidBase.pH - 7.4) > 0.2 ? 'severe' : 'moderate',
        acidBase.pH < 7.35
            ? 'Aumentar ventilação quando houver hipercapnia e tratar a causa metabólica.'
            : 'Reduzir hiperventilação e revisar perdas de ácido ou excesso de base.',
        'vitals',
    );
    pushWarning(
        warnings,
        'Glicose sanguínea',
        nutrients.bloodGlucose,
        [70, 100],
        nutrients.bloodGlucose < 55 || nutrients.bloodGlucose > 180 ? 'severe' : 'moderate',
        nutrients.bloodGlucose < 70
            ? 'Fornecer substrato e reduzir captação excessiva; glucagon depende de glicogênio hepático.'
            : 'Aumentar captação insulinodependente e reduzir aporte de glicose.',
        'vitals',
    );
    pushWarning(
        warnings,
        'Frequência cardíaca',
        cardiovascular.heartRate,
        [60, 100],
        cardiovascular.heartRate < 40 || cardiovascular.heartRate > 150 ? 'severe' : 'mild',
        'Revisar comando autonômico, volume circulante, demanda e catecolaminas.',
        'vitals',
    );
    pushWarning(
        warnings,
        'Saturação de O₂',
        respiratory.spo2,
        [95, 100],
        respiratory.spo2 < 85 ? 'severe' : 'moderate',
        'Aumentar ventilação alveolar e avaliar perfusão e troca gasosa.',
        'tissue',
    );
    pushWarning(
        warnings,
        'Sódio plasmático',
        nutrients.sodium,
        [135, 145],
        nutrients.sodium < 125 || nutrients.sodium > 155 ? 'severe' : 'moderate',
        'Ajustar água absorvida e reabsorção renal lentamente para evitar correção osmótica rápida.',
        'vitals',
    );
    pushWarning(
        warnings,
        'Hidratação corporal',
        nutrients.hydration,
        [38, 46],
        nutrients.hydration < 34 || nutrients.hydration > 50 ? 'severe' : 'moderate',
        'Equilibrar ingestão/absorção de água, suor e excreção renal.',
        'tissue',
    );
    pushWarning(
        warnings,
        'Lactato',
        energy.lactateLevel,
        [0.5, 2],
        energy.lactateLevel > 4 ? 'severe' : 'moderate',
        'Melhorar oferta oxidativa ou reduzir demanda glicolítica.',
        'mitochondria',
    );

    pushWarning(
        warnings,
        'Potássio plasmático',
        nutrients.potassium,
        [3.5, 5],
        nutrients.potassium < 2.8 || nutrients.potassium > 6 ? 'severe' : 'moderate',
        'Revisar filtração renal, aldosterona, acidose e deslocamento por insulina.',
        'vitals',
    );
    pushWarning(
        warnings,
        'Corpos cetônicos',
        nutrients.ketones,
        [.1, .6],
        nutrients.ketones > 3 ? 'severe' : 'moderate',
        'Restaurar ação efetiva da insulina, hidratação e perfusão renal.',
        'vitals',
    );
    if (renal.gfr < 60) {
        warnings.push({
            parameter: 'Filtração glomerular',
            currentValue: renal.gfr,
            normalRange: [90, 140],
            severity: renal.gfr < 30 ? 'severe' : 'moderate',
            recommendation: 'Corrigir perfusão e considerar a capacidade renal estrutural do cenário.',
            navigationTarget: 'vitals',
        });
    }

    if (energy.energyDeficit > 10) {
        warnings.push({
            parameter: 'Déficit energético',
            currentValue: energy.energyDeficit,
            normalRange: [0, 10],
            severity: energy.energyDeficit > 50 ? 'severe' : 'moderate',
            recommendation: 'Reduzir demanda e restaurar oxigênio, substratos e fosfocreatina.',
            navigationTarget: 'mitochondria',
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
    recommendation: string,
    navigationTarget?: PhysiologicalWarning['navigationTarget'],
): void {
    if (value < normalRange[0] || value > normalRange[1]) {
        warnings.push({ parameter, currentValue: value, normalRange, severity, recommendation, navigationTarget });
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
