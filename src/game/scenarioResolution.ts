import type { CellularState, RoutineDecisionOutcome } from './cellularTypes';
import type { HypothalamicRegulationState } from './hypothalamus';
import type { PhysiologyState } from './types';

export interface ScenarioResolutionModifier {
    effectMultiplier: number;
    protectiveScore: number;
    pressureScore: number;
    risk: 'recoverable' | 'unstable' | 'catastrophic';
    summary: string;
}

/**
 * Soma o evento à condição endócrina, regulação central, reservas e dano já
 * acumulado. A decisão define a direção; o contexto define a intensidade e
 * se a recuperação ainda é eficiente.
 */
export function evaluateScenarioResolution(
    scenarioId: string,
    outcome: RoutineDecisionOutcome,
    physiology: PhysiologyState,
    cellular: CellularState,
    hypothalamus: HypothalamicRegulationState,
): ScenarioResolutionModifier {
    const hormones = physiology.hormones;
    const catecholamineExcess = clamp(
        Math.max(0, hormones.adrenaline / 30 - 1) * .55
        + Math.max(0, hormones.noradrenaline / 200 - 1) * .25,
        0,
        2,
    );
    const cortisolExcess = clamp(Math.max(0, hormones.cortisol / 12 - 1), 0, 2);
    const thyroidExcess = clamp(Math.max(0, hormones.t3 / 120 - 1), 0, 1.5);
    const insulinAction = clamp(hormones.insulin / 10 * physiology.endocrine.insulinReceptorSensitivity, 0, 2.5);
    const glucagonDrive = clamp(hormones.glucagon / 80 * physiology.capacities.hepaticGlucoseResponsiveness, 0, 2.5);
    const anabolicDrive = clamp(
        (hormones.gh / 1.2 + hormones.igf1 / 180 + hormones.mTORActivity / 50) / 3
        * physiology.endocrine.anabolicSensitivity,
        0,
        2,
    );

    let protectiveScore = 0;
    let pressureScore = catecholamineExcess * .18
        + cortisolExcess * .22
        + thyroidExcess * catecholamineExcess * .18
        + physiology.pathophysiology.diseaseBurden / 100 * .38
        + physiology.allostaticLoad.currentLoad / 100 * .22
        + (100 - cellular.cell.viabilityPercent) / 100 * .35
        + cellular.fate.apoptoticCommitment / 100 * .3;

    if (scenarioId === 'stair-climb') {
        protectiveScore += clamp(physiology.respiratory.spo2 / 98, 0, 1.1) * .45
            + clamp(cellular.cell.atpMmolL / 5, 0, 1) * .35;
        pressureScore += Math.max(0, catecholamineExcess - .45) * .55 + thyroidExcess * .2;
    } else if (scenarioId === 'meal-surge') {
        protectiveScore += insulinAction * .55;
        pressureScore += glucagonDrive * .42 + cortisolExcess * .25
            + Math.max(0, physiology.nutrients.bloodGlucose - 160) / 140;
    } else if (scenarioId === 'morning-fast') {
        protectiveScore += glucagonDrive * .4 + clamp(physiology.nutrients.fattyAcids / .6, 0, 1.2) * .25;
        pressureScore += insulinAction * .5 + Math.max(0, 70 - physiology.nutrients.bloodGlucose) / 35;
    } else if (scenarioId === 'micro-injury') {
        protectiveScore += anabolicDrive * .5 + clamp(cellular.pools.captured.aminoAcid / 1.5, 0, 1) * .25;
        pressureScore += cortisolExcess * .45 + cellular.damage.proteins / 100 * .35;
    } else if (scenarioId === 'immune-challenge') {
        protectiveScore += physiology.capacities.immuneActivation * (1 - clamp(cortisolExcess * .32, 0, .85)) * .55
            + cellular.damage.antioxidantCapacity / 100 * .3;
        pressureScore += cortisolExcess * .7 + physiology.pathophysiology.infectionSeverity / 100 * .7
            + cellular.fate.infectionSusceptibility / 100 * .45;
    } else if (scenarioId === 'heat-dehydration') {
        protectiveScore += Math.max(0, hypothalamus.osmoticDrive) * .55
            + clamp(physiology.nutrients.hydration / 42, 0, 1.1) * .3;
        pressureScore += Math.max(0, -hypothalamus.osmoticDrive) * .5
            + catecholamineExcess * .35
            + Math.max(0, physiology.bodyTemperature - 38) * .35;
    } else if (scenarioId === 'orthostatic-transition') {
        protectiveScore += Math.max(0, hypothalamus.autonomicTone) * .65
            + clamp(physiology.cardiovascular.meanArterialPressure / 90, 0, 1.1) * .25;
        pressureScore += Math.max(0, -hypothalamus.autonomicTone) * .7
            + Math.max(0, 65 - physiology.cardiovascular.meanArterialPressure) / 30;
    } else if (scenarioId === 'hypercapnic-challenge') {
        protectiveScore += Math.max(0, hypothalamus.respiratoryDrive) * .72;
        pressureScore += Math.max(0, physiology.respiratory.paco2 - 45) / 25
            + Math.max(0, 7.35 - physiology.acidBase.pH) * 4
            + catecholamineExcess * .25;
    } else if (scenarioId === 'acute-water-load') {
        protectiveScore += Math.max(0, -hypothalamus.osmoticDrive) * .7;
        pressureScore += Math.max(0, hypothalamus.osmoticDrive) * .72
            + Math.max(0, 135 - physiology.nutrients.sodium) / 12;
    } else if (scenarioId === 'nocturnal-hypoglycemia') {
        protectiveScore += glucagonDrive * .48 + clamp(catecholamineExcess, 0, 1) * .35;
        pressureScore += insulinAction * .58
            + Math.max(0, 72 - physiology.nutrients.bloodGlucose) / 28;
    }

    protectiveScore = clamp(protectiveScore, 0, 2);
    pressureScore = clamp(pressureScore, 0, 3);
    const effectMultiplier = outcome === 'adaptive'
        ? clamp(1 + protectiveScore * .42 - pressureScore * .38, .2, 1.75)
        : clamp(1 + pressureScore * .62 - protectiveScore * .18, .65, 2.8);
    const catastrophicIndex = pressureScore + (outcome === 'harmful' ? effectMultiplier * .35 : 0)
        + (cellular.fate.status === 'apoptosis' || cellular.fate.status === 'necrosis' ? .8 : 0);
    const risk = catastrophicIndex >= 2.15 ? 'catastrophic' : catastrophicIndex >= 1.15 ? 'unstable' : 'recoverable';
    const summary = `proteção ${Math.round(protectiveScore * 50)}% · pressão ${Math.round(pressureScore / 3 * 100)}% · efeito ×${effectMultiplier.toFixed(2)} · risco ${risk === 'catastrophic' ? 'catastrófico' : risk === 'unstable' ? 'instável' : 'reversível'}`;
    return { effectMultiplier, protectiveScore, pressureScore, risk, summary };
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
