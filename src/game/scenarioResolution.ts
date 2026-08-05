import type { CellularState } from './cellularTypes';
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
 * acumulado. A escolha aplica mecanismos e esta função mede a capacidade de
 * resposta do organismo sem antecipar se o desfecho será bom ou ruim.
 */
export function evaluateScenarioResolution(
    scenarioId: string,
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

    // Reserva transversal: progresso celular e métricas de outras abas não são
    // decorativos. Preparação metabólica, acoplamento mitocondrial, defesa,
    // perfusão e capacidade adaptativa modulam qualquer crise difícil.
    const adaptationReserve = clamp(
        Object.values(cellular.adaptations).reduce((sum, level) => sum + level, 0) / 15,
        0,
        1,
    );
    const automationReserve = clamp(
        Object.values(cellular.automation).reduce((sum, level) => sum + level, 0) / 8,
        0,
        1,
    );
    const substrateReserve = clamp(
        cellular.pools.captured.glucose / 6 * .2
        + cellular.pools.captured.oxygen / 20 * .35
        + cellular.pools.captured.fattyAcid / 4 * .15
        + cellular.pools.captured.aminoAcid / 4 * .15
        + cellular.pools.pyruvate / 12 * .15,
        0,
        1,
    );
    const couplingReserve = clamp(
        cellular.mitochondria.healthPercent / 100 * .45
        + (1 - Math.abs(cellular.mitochondria.etcFluxPercent - cellular.mitochondria.atpSynthaseFlux) / 100) * .3
        + (1 - Math.abs(Math.abs(cellular.mitochondria.membranePotentialMv) - 155) / 90) * .25,
        0,
        1,
    );
    const systemicReserve = clamp(
        physiology.energy.atpPool / physiology.energy.maxATP * .2
        + physiology.cardiovascular.perfusionIndex / 100 * .2
        + physiology.respiratory.spo2 / 100 * .15
        + physiology.renal.gfr / 120 * .15
        + (1 - Math.abs(physiology.acidBase.pH - 7.4) / .45) * .15
        + physiology.allostaticLoad.adaptationCapacity / 100 * .15,
        0,
        1,
    );
    const cellularReserve = clamp(
        cellular.cell.atpMmolL / 5.8 * .25
        + cellular.cell.viabilityPercent / 100 * .2
        + cellular.damage.antioxidantCapacity / 100 * .2
        + cellular.tissue.perfusionPercent / 100 * .15
        + cellular.tissue.oxygenMmHg / 40 * .1
        + (1 - Math.abs(cellular.cell.pH - 7.2) / .45) * .1,
        0,
        1,
    );
    const crossScaleReserve = systemicReserve * .24
        + cellularReserve * .24
        + couplingReserve * .2
        + substrateReserve * .12
        + adaptationReserve * .12
        + automationReserve * .08;
    const crossScalePressure = clamp(
        cellular.damage.oxidativeStress / 100 * .18
        + (cellular.damage.membrane + cellular.damage.proteins + cellular.damage.dna) / 300 * .16
        + Math.abs(cellular.cell.volumePercent - 100) / 35 * .1
        + Math.abs(cellular.cell.membranePotentialMv + 70) / 45 * .1
        + Math.max(0, cellular.cell.calciumNm - 150) / 850 * .1
        + cellular.tissue.wasteLoad / 100 * .1
        + Math.max(0, cellular.tissue.lactateMmolL - 2) / 10 * .12
        + physiology.energy.energyDeficit / 100 * .14,
        0,
        1.5,
    );
    protectiveScore += crossScaleReserve * .28;
    pressureScore += crossScalePressure * .42;

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
    } else if (scenarioId === 'mitochondrial-uncoupling') {
        protectiveScore += Math.max(0, -hypothalamus.autonomicTone) * .45
            + cellular.damage.antioxidantCapacity / 100 * .4
            + clamp(cellular.mitochondria.healthPercent / 100, 0, 1) * .2;
        pressureScore += catecholamineExcess * .45
            + thyroidExcess * .55
            + cellular.damage.oxidativeStress / 100 * .55
            + Math.max(0, physiology.bodyTemperature - 37.2) * .35;
    } else if (scenarioId === 'mixed-ketoacidotic-fatigue') {
        protectiveScore += insulinAction * .38
            + Math.max(0, hypothalamus.respiratoryDrive) * .5;
        pressureScore += Math.max(0, physiology.acidBase.anionGap - 16) / 18
            + Math.max(0, 7.3 - physiology.acidBase.pH) * 4
            + Math.max(0, physiology.respiratory.paco2 - 32) / 24
            + cortisolExcess * .25;
    } else if (scenarioId === 'distributive-dysoxia') {
        protectiveScore += Math.max(0, hypothalamus.autonomicTone) * .48
            + cellular.damage.antioxidantCapacity / 100 * .28
            + physiology.capacities.immuneActivation * .22;
        pressureScore += physiology.pathophysiology.infectionSeverity / 100 * .62
            + physiology.pathophysiology.capillaryLeak * .8
            + Math.max(0, 70 - physiology.cardiovascular.meanArterialPressure) / 35
            + cellular.damage.oxidativeStress / 100 * .35
            + cortisolExcess * .35;
    } else if (scenarioId === 'reperfusion-paradox') {
        protectiveScore += Math.max(0, -hypothalamus.autonomicTone) * .42
            + cellular.damage.antioxidantCapacity / 100 * .5;
        pressureScore += cellular.damage.oxidativeStress / 100 * .75
            + Math.max(0, cellular.cell.calciumNm - 150) / 700
            + Math.max(0, cellular.cell.nadhPercent - 60) / 55
            + catecholamineExcess * .4
            + anabolicDrive * .2;
    } else if (scenarioId === 'hyperosmolar-renal-conflict') {
        protectiveScore += insulinAction * .35
            + Math.max(0, hypothalamus.osmoticDrive) * .42
            + clamp(physiology.renal.gfr / 110, 0, 1) * .15;
        pressureScore += Math.max(0, physiology.nutrients.bloodGlucose - 150) / 180
            + Math.max(0, physiology.nutrients.sodium - 145) / 18
            + Math.max(0, 40 - physiology.nutrients.hydration) / 8
            + Math.max(0, -hypothalamus.osmoticDrive) * .55;
    } else if (scenarioId === 'whisky-party-hepatic-overload') {
        protectiveScore += glucagonDrive * .34
            + cellular.damage.antioxidantCapacity / 100 * .3
            + Math.max(0, hypothalamus.respiratoryDrive) * .22;
        pressureScore += Math.max(0, 78 - physiology.nutrients.bloodGlucose) / 32
            + Math.max(0, physiology.energy.lactateLevel - 2) / 7
            + Math.max(0, physiology.respiratory.paco2 - 45) / 28
            + Math.max(0, cellular.cell.nadhPercent - 65) / 70;
    } else if (scenarioId === 'alcohol-nocturnal-hypoglycemia') {
        protectiveScore += glucagonDrive * .42
            + Math.max(0, hypothalamus.respiratoryDrive) * .4;
        pressureScore += Math.max(0, 74 - physiology.nutrients.bloodGlucose) / 28
            + Math.max(0, physiology.respiratory.paco2 - 44) / 22
            + Math.max(0, 7.34 - physiology.acidBase.pH) * 4
            + physiology.energy.energyDeficit / 100 * .35;
    } else if (scenarioId === 'fasted-workout-free-fatty-acids') {
        protectiveScore += glucagonDrive * .32
            + clamp(physiology.nutrients.fattyAcids / .8, 0, 1.2) * .18
            + clamp(cellular.mitochondria.healthPercent / 100, 0, 1) * .18;
        pressureScore += Math.max(0, 76 - physiology.nutrients.bloodGlucose) / 30
            + catecholamineExcess * .32
            + Math.max(0, cellular.tissue.lactateMmolL - 2) / 8
            + Math.max(0, cellular.cell.nadhPercent - 70) / 65;
    } else if (scenarioId === 'chronic-anxiety-sedentary') {
        protectiveScore += Math.max(0, -hypothalamus.autonomicTone) * .46
            + clamp(physiology.cardiovascular.heartRateVariability / 70, 0, 1.2) * .2
            + physiology.allostaticLoad.adaptationCapacity / 100 * .2;
        pressureScore += catecholamineExcess * .42
            + cortisolExcess * .38
            + Math.max(0, physiology.cardiovascular.heartRate - 85) / 55
            + Math.max(0, 50 - physiology.cardiovascular.heartRateVariability) / 55
            + physiology.allostaticLoad.currentLoad / 100 * .25;
    } else if (scenarioId === 'panic-hyperventilation') {
        protectiveScore += Math.max(0, -hypothalamus.autonomicTone) * .5
            + Math.max(0, -hypothalamus.respiratoryDrive) * .48;
        pressureScore += catecholamineExcess * .4
            + Math.max(0, 34 - physiology.respiratory.paco2) / 18
            + Math.max(0, physiology.acidBase.pH - 7.45) * 5
            + Math.max(0, physiology.respiratory.respiratoryRate - 22) / 28;
    } else if (scenarioId === 'major-hemorrhage') {
        protectiveScore += Math.max(0, hypothalamus.autonomicTone) * .38
            + clamp(physiology.cardiovascular.meanArterialPressure / 75, 0, 1) * .22
            + clamp(cellular.cell.atpMmolL / 5, 0, 1) * .18;
        pressureScore += Math.max(0, 70 - physiology.cardiovascular.meanArterialPressure) / 30
            + Math.max(0, 3.5 - physiology.cardiovascular.cardiacOutput) / 2.5
            + Math.max(0, 45 - physiology.nutrients.hydration) / 7
            + Math.max(0, physiology.energy.lactateLevel - 2) / 7
            + Math.max(0, 55 - cellular.tissue.perfusionPercent) / 45;
    }

    protectiveScore = clamp(protectiveScore, 0, 2);
    pressureScore = clamp(pressureScore, 0, 3);
    // O multiplicador representa responsividade do organismo, não um veredito
    // embutido na opção. A classificação só ocorre após observar as métricas.
    const effectMultiplier = clamp(.75 + protectiveScore * .28 + pressureScore * .12, .65, 1.65);
    const catastrophicIndex = pressureScore + Math.max(0, 1 - protectiveScore) * .24
        + (cellular.fate.status === 'apoptosis' || cellular.fate.status === 'necrosis' ? .8 : 0);
    const risk = catastrophicIndex >= 2.15 ? 'catastrophic' : catastrophicIndex >= 1.15 ? 'unstable' : 'recoverable';
    const summary = `proteção ${Math.round(protectiveScore * 50)}% · pressão ${Math.round(pressureScore / 3 * 100)}% · efeito ×${effectMultiplier.toFixed(2)} · risco ${risk === 'catastrophic' ? 'catastrófico' : risk === 'unstable' ? 'instável' : 'reversível'}`;
    return { effectMultiplier, protectiveScore, pressureScore, risk, summary };
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
