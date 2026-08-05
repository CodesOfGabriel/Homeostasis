import { detectActiveCombos, type HormonalCombo } from './actions';
import { HORMONE_DEFINITIONS, type HormoneKey } from './config/hormones';
import { getSimulationCalendar } from './simulationCalendar';
import type {
    CellularSignalingState,
    EndocrineRegulationState,
    HormonalAction,
    HormonalProfile,
    NutrientState,
    PhysiologicalCapacities,
} from './types';

export interface EndocrineTickContext {
    profile: HormonalProfile;
    cellularSignaling: CellularSignalingState;
    regulation: EndocrineRegulationState;
    capacities: PhysiologicalCapacities;
    nutrients: NutrientState;
    actions: HormonalAction[];
    exercise: number;
    stress: number;
    sleep: number;
    inflammation: number;
    energyDemand: number;
    energyDeficit: number;
    heartRate: number;
    simulationTime: number;
    dt: number;
}

export interface EndocrineEffectsResult {
    newProfile: HormonalProfile;
    cellularSignaling: CellularSignalingState;
    regulation: EndocrineRegulationState;
    glucoseUptakeRate: number;
    hepaticGlucoseDrive: number;
    lipolysisRate: number;
    ketogenesisRate: number;
    proteolysisRate: number;
    proteinSynthesisRate: number;
    glycogenSynthesisRate: number;
    thyroidMetabolicMultiplier: number;
    adrenergicCardiacDrive: number;
    adrenergicVascularDrive: number;
    glucocorticoidVascularSupport: number;
    immuneSuppression: number;
    activeCombos: HormonalCombo[];
}

const HORMONE_KEYS = Object.keys(HORMONE_DEFINITIONS) as HormoneKey[];

/**
 * Eixos endócrinos simplificados com secreção endógena, feedback, exposição,
 * sensibilidade de receptor e farmacocinética das ações exógenas.
 */
export function calculateEndocrineTick(context: EndocrineTickContext): EndocrineEffectsResult {
    const { capacities, nutrients, dt } = context;
    const profile = { ...context.profile };
    const sleepFraction = clamp(context.sleep / 100, 0, 1);
    const stressFraction = clamp((context.stress - 20) / 80, 0, 1);
    const exerciseFraction = clamp(context.exercise / 100, 0, 1);
    const hypoglycemia = clamp((75 - nutrients.bloodGlucose) / 30, 0, 1);
    const hyperglycemia = clamp((nutrients.bloodGlucose - 90) / 120, 0, 1.5);
    const fasting = clamp((nutrients.hoursSinceMeal - 4) / 12, 0, 1);
    const sleepDebt = 1 - sleepFraction;
    const circadianHour = getSimulationCalendar(context.simulationTime).hourDecimal;
    const morningDrive = .5 + .5 * Math.cos((circadianHour - 8) / 24 * Math.PI * 2);

    const sympatheticTarget = clamp(
        .08 + stressFraction * .55 + exerciseFraction * .65 + hypoglycemia * .55,
        0,
        1,
    );
    const cortisolFeedback = clamp((profile.cortisol - 12) / 45, 0, .75);
    const hpaTarget = clamp(
        .1 + stressFraction * .55 + sleepDebt * .22 + hypoglycemia * .3
        + context.inflammation / 100 * .45 - cortisolFeedback,
        0,
        1,
    );
    const sympatheticDrive = approach(context.regulation.sympatheticDrive, sympatheticTarget, 25, dt);
    const crhDrive = approach(context.regulation.crhDrive, hpaTarget, 2 * 60, dt);
    const acthTarget = clamp(crhDrive - cortisolFeedback * .35, 0, 1);
    const acthDrive = approach(context.regulation.acthDrive, acthTarget, 3 * 60, dt);
    const hpaDrive = approach(context.regulation.hpaDrive, (crhDrive + acthDrive) / 2, 4 * 60, dt);

    const targets: Partial<Record<HormoneKey, number>> = {};
    targets.insulin = clamp(
        2 + capacities.pancreaticBetaReserve * (8 + hyperglycemia * 48 + (nutrients.fedState ? 5 : 0)),
        1,
        90,
    );
    targets.glucagon = clamp(
        70 + capacities.hepaticGlucoseResponsiveness * (hypoglycemia * 180 + fasting * 55)
        - Math.max(0, (targets.insulin - 10) * 1.1),
        25,
        360,
    );
    const sympatheticActivation = Math.max(0, sympatheticDrive - .08);
    targets.adrenaline = 30 + 420 * sympatheticActivation * capacities.adrenalReserve;
    targets.noradrenaline = 200 + 950 * sympatheticActivation * capacities.adrenalReserve;
    const circadianCortisol = 7 + morningDrive * 8;
    targets.cortisol = clamp(
        circadianCortisol + hpaDrive * 30 * capacities.adrenalReserve + capacities.adrenalCortisolAutonomy * 50,
        capacities.adrenalReserve < .25 ? 2 : 4,
        70,
    );

    const thyroidFeedback = clamp(
        ((profile.t3 / 120) * .55 + (profile.t4 / 8) * .45) - 1,
        -.8,
        2,
    );
    const thyroidDriveTarget = clamp(1 - thyroidFeedback * .7 - Math.max(0, profile.cortisol - 25) / 100, .1, 1.8);
    const thyroidDrive = approach(context.regulation.thyroidDrive, thyroidDriveTarget, 30 * 60, dt);
    targets.tsh = clamp(2 * thyroidDrive, .05, 12);
    targets.t4 = clamp(8 * capacities.thyroidGlandCapacity * (.45 + .55 * targets.tsh / 2), 1, 25);
    const conversionInhibition = clamp((profile.cortisol - 12) / 100, 0, .45);
    targets.t3 = clamp(120 * capacities.thyroidGlandCapacity * (.55 + .45 * targets.t4 / 8) * (1 - conversionInhibition), 25, 350);

    const adiposeSignal = clamp(nutrients.adiposeTissue / 15, .25, 4);
    targets.ghrelin = clamp(420 + fasting * 900 + hypoglycemia * 650 - (nutrients.fedState ? 180 : 0), 180, 2100);
    targets.leptin = clamp(7.5 * adiposeSignal * (.85 + (nutrients.fedState ? .25 : 0)), 2, 65);
    targets.adiponectin = clamp(13 / Math.max(.65, adiposeSignal) * (1 - context.inflammation / 180), 2, 24);

    const ghrelinPulse = clamp(profile.ghrelin / 600 - 1, 0, 1.5);
    const ghPulse = clamp(sleepFraction * (circadianHour >= 22 || circadianHour <= 6 ? 1 : .2) + exerciseFraction * .45 + ghrelinPulse * .16, 0, 1.2);
    targets.gh = 1 + ghPulse * 8 * (1 - clamp(profile.cortisol / 120, 0, .55));
    targets.igf1 = clamp(160 + profile.gh * 16 * capacities.hepaticGlucoseResponsiveness, 60, 420);
    targets.testosterone = clamp(600 * (.7 + .3 * sleepFraction) * (1 - clamp((profile.cortisol - 18) / 180, 0, .35)), 180, 850);

    for (const hormone of HORMONE_KEYS) {
        const definition = HORMONE_DEFINITIONS[hormone];
        const target = targets[hormone] ?? definition.baseline;
        const secretoryTau = secretoryTimeConstant(hormone);
        let value = approach(profile[hormone], target, secretoryTau, dt);
        const eliminationConstant = Math.log(2) / definition.halfLifeSeconds;
        value = target + (value - target) * Math.exp(-eliminationConstant * dt);

        for (const action of context.actions) {
            if (action.hormone !== hormone || action.duration <= 0) continue;
            const totalDurationSec = Math.max(1e-3, action.totalDuration / 1000);
            const activeSeconds = Math.min(dt, action.duration / 1000);
            const infusionRate = action.amount / totalDurationSec;
            value += eliminationConstant > 0
                ? (infusionRate / eliminationConstant) * (1 - Math.exp(-eliminationConstant * activeSeconds))
                : infusionRate * activeSeconds;
        }
        profile[hormone] = clamp(value, 0, definition.upperLimit);
    }

    const cortisolExposure = approach(
        context.regulation.cortisolExposure,
        clamp(profile.cortisol / 12 * 10, 0, 100),
        45 * 60,
        dt,
    );
    const catecholamineExposure = approach(
        context.regulation.catecholamineExposure,
        clamp((profile.adrenaline / 30 + profile.noradrenaline / 200) * 4, 0, 100),
        20 * 60,
        dt,
    );
    const thyroidExposure = approach(
        context.regulation.thyroidExposure,
        clamp(profile.t3 / 120 * 20, 0, 100),
        4 * 60 * 60,
        dt,
    );
    const insulinReceptorSensitivity = approach(
        context.regulation.insulinReceptorSensitivity,
        clamp(capacities.insulinSensitivity
            * clamp(.72 + profile.adiponectin / 10 * .28, .55, 1.35)
            * (1 - Math.max(0, profile.insulin - 25) / 500), .08, 1.25),
        20 * 60,
        dt,
    );
    const leptinSensitivity = approach(
        context.regulation.leptinSensitivity,
        clamp(capacities.leptinSensitivity * (1 - Math.max(0, profile.leptin - 18) / 180), .12, 1),
        30 * 60,
        dt,
    );
    const effectiveLeptin = clamp(profile.leptin / 10 * leptinSensitivity, 0, 2);
    const ghrelinSignal = clamp(profile.ghrelin / 600, .2, 3);
    const orexigenicDrive = approach(
        context.regulation.orexigenicDrive,
        clamp(.12 + ghrelinSignal * .38 + hypoglycemia * .45 - effectiveLeptin * .28, 0, 1),
        4 * 60,
        dt,
    );
    const anorexigenicDrive = approach(
        context.regulation.anorexigenicDrive,
        clamp(.1 + effectiveLeptin * .42 + Math.max(0, profile.insulin / 10 - .5) * .12 - ghrelinSignal * .14, 0, 1),
        5 * 60,
        dt,
    );
    const adrenergicReceptorSensitivity = approach(
        context.regulation.adrenergicReceptorSensitivity,
        clamp(1 - catecholamineExposure / 160, .25, 1),
        15 * 60,
        dt,
    );
    const glucocorticoidSensitivity = approach(
        context.regulation.glucocorticoidSensitivity,
        clamp(1 - cortisolExposure / 220, .35, 1),
        40 * 60,
        dt,
    );
    const anabolicSensitivity = approach(
        context.regulation.anabolicSensitivity,
        clamp(.45 + sleepFraction * .35 + capacities.mitochondrialCapacity * .2 - cortisolExposure / 300, .15, 1),
        30 * 60,
        dt,
    );

    const insulinEffect = Math.max(0, profile.insulin / 10 - .35) * insulinReceptorSensitivity;
    const glucagonEffect = Math.max(0, profile.glucagon / 80 - .45) * capacities.hepaticGlucoseResponsiveness;
    const adrenalineEffect = Math.max(0, profile.adrenaline / 30 - 1) * adrenergicReceptorSensitivity;
    const noradrenalineEffect = Math.max(0, profile.noradrenaline / 200 - 1) * adrenergicReceptorSensitivity;
    const cortisolEffect = Math.max(0, profile.cortisol / 12 - .65) * glucocorticoidSensitivity;
    const thyroidEffect = clamp((profile.t3 / 120 - 1) * adrenergicReceptorSensitivity, -.6, 2);
    const ghEffect = Math.max(0, profile.gh / 1 - 1) * .1;
    const androgenEffect = Math.max(0, profile.testosterone / 600 - .75);

    const activeCombos = detectActiveCombos(profile, {
        glucose: nutrients.bloodGlucose,
        aminoAcids: nutrients.aminoAcids,
        heartRate: context.heartRate,
        energyDemand: context.energyDemand,
        allostaticLoad: context.inflammation,
        liverGlycogen: nutrients.liverGlycogen,
        fattyAcids: nutrients.fattyAcids,
    });
    const combo = (id: HormonalCombo['id']) => activeCombos.find(item => item.id === id)?.synergy ?? 1;

    const mTorTarget = clamp(
        20
        + insulinEffect * 22
        + profile.igf1 / 200 * 18
        + ghEffect * 8
        + androgenEffect * 14
        + clamp((nutrients.aminoAcids - 25) / 20, 0, 1) * 18,
        0,
        100,
    );
    const mTorActivity = clamp(approach(context.cellularSignaling.mTorActivity, mTorTarget, 3 * 60, dt), 0, 100);
    const energyPressure = clamp(context.energyDeficit / 45 + Math.max(0, 75 - nutrients.bloodGlucose) / 55, 0, 1);
    const ampkTarget = clamp(18 + energyPressure * 72 + exerciseFraction * 24 - insulinEffect * 5, 0, 100);
    const ampkActivity = approach(context.cellularSignaling.ampkActivity, ampkTarget, 75, dt);
    const autophagyTarget = clamp(12 + fasting * 42 + ampkActivity * .32 - mTorActivity * .22, 0, 100);
    const autophagyActivity = approach(context.cellularSignaling.autophagyActivity, autophagyTarget, 5 * 60, dt);
    const proteinLoad = clamp(Math.max(0, context.inflammation - 35) * .7 + Math.max(0, mTorActivity - 70) * .5, 0, 100);
    const unfoldedProteinResponse = approach(context.cellularSignaling.unfoldedProteinResponse, proteinLoad, 8 * 60, dt);
    const cellularSignaling: CellularSignalingState = {
        mTorActivity,
        ampkActivity,
        autophagyActivity,
        unfoldedProteinResponse,
    };

    const regulation: EndocrineRegulationState = {
        hpaDrive,
        crhDrive,
        acthDrive,
        sympatheticDrive,
        thyroidDrive,
        insulinReceptorSensitivity,
        adrenergicReceptorSensitivity,
        glucocorticoidSensitivity,
        anabolicSensitivity,
        leptinSensitivity,
        orexigenicDrive,
        anorexigenicDrive,
        cortisolExposure,
        catecholamineExposure,
        thyroidExposure,
    };

    return {
        newProfile: profile,
        cellularSignaling,
        regulation,
        glucoseUptakeRate: (insulinEffect * .16 + exerciseFraction * .35) * combo('anabolism'),
        hepaticGlucoseDrive: (glucagonEffect * .13 + adrenalineEffect * .08 + cortisolEffect * .045) * combo('energy-mobilization'),
        lipolysisRate: clamp((.002 + glucagonEffect * .009 + adrenalineEffect * .012 + ghEffect * .003 + cortisolEffect * .002) * combo('thermogenesis'), 0, .12),
        ketogenesisRate: clamp((glucagonEffect + cortisolEffect * .35) * (1 / Math.max(.15, insulinEffect)) * .006, 0, .08),
        proteolysisRate: clamp(cortisolEffect * .012 - androgenEffect * .004, -.004, .04),
        proteinSynthesisRate: clamp(180 + mTorActivity * 2.2 * anabolicSensitivity * combo('anabolism'), 60, 650),
        glycogenSynthesisRate: insulinEffect * .12,
        thyroidMetabolicMultiplier: clamp(1 + thyroidEffect * .28, .72, 1.65),
        adrenergicCardiacDrive: adrenalineEffect * combo('stress-response') + thyroidEffect * .18,
        adrenergicVascularDrive: (adrenalineEffect * .45 + noradrenalineEffect) * combo('stress-response'),
        glucocorticoidVascularSupport: clamp(cortisolEffect * .12, 0, .45),
        immuneSuppression: clamp(cortisolEffect * .12, 0, .65),
        activeCombos,
    };
}

function secretoryTimeConstant(hormone: HormoneKey): number {
    if (hormone === 'adrenaline' || hormone === 'noradrenaline') return 8;
    if (hormone === 'insulin' || hormone === 'glucagon') return 45;
    if (hormone === 'ghrelin' || hormone === 'leptin') return 3 * 60;
    if (hormone === 'adiponectin') return 30 * 60;
    if (hormone === 'cortisol' || hormone === 'gh') return 4 * 60;
    if (hormone === 'tsh') return 20 * 60;
    if (hormone === 't3' || hormone === 't4' || hormone === 'testosterone' || hormone === 'igf1') return 2 * 60 * 60;
    return 3 * 60;
}

function approach(current: number, target: number, tau: number, dt: number): number {
    return target + (current - target) * Math.exp(-dt / Math.max(1e-6, tau));
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}
