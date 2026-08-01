import type { PhysiologyState } from './types';
import type {
    AutomationKind,
    AutomationRecipe,
    CellularActionResult,
    CellularAdaptationKind,
    CellularControls,
    CellularEvent,
    CellularState,
    CellularTickResult,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
    SubstratePool,
} from './cellularTypes';
import {
    createRoutineEvent,
    getScenarioChoice,
    getScenarioChoiceAvailability,
    getScenarioDefinition,
    selectEligibleScenario,
    type ScenarioEffect,
} from './scenarios';

const BASE_OSMOLARITY = 290;
const TOTAL_ADENYLATE = 6;
const MAX_ATP = 5.8;
const FIXED_STEP = 0.25;
const GLYCOLYSIS_ATP_YIELD = 0.08;
const PYRUVATE_ATP_YIELD = 0.45;
const FATTY_ACID_ATP_YIELD = 0.85;

export const AUTOMATION_MAX_LEVEL = 4;
export const CELLULAR_OPTIMIZATION_BUDGET = 8;

export function getAutomationRecipe(kind: AutomationKind, level: number): AutomationRecipe {
    const tier = clamp(level, 0, AUTOMATION_MAX_LEVEL - 1);
    if (kind === 'transporters') {
        return {
            atp: 0.55 + tier * 0.20,
            substrates: { glucose: 0.5 + tier * 0.25, aminoAcid: 0.5 + tier * 0.25 },
        };
    }
    if (kind === 'mitochondrialShuttle') {
        return {
            atp: 0.70 + tier * 0.22,
            substrates: { fattyAcid: 0.5 + tier * 0.25, aminoAcid: 0.5 + tier * 0.25 },
        };
    }
    return {
        atp: 0.80 + tier * 0.24,
        substrates: { glucose: 0.5 + tier * 0.25, aminoAcid: 1 + tier * 0.30 },
    };
}

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const approach = (current: number, target: number, timeConstant: number, dt: number) => {
    if (timeConstant <= 0) return target;
    return current + (target - current) * (1 - Math.exp(-dt / timeConstant));
};

function syncAdenylates(state: CellularState) {
    state.cell.atpMmolL = clamp(state.cell.atpMmolL, 0.2, MAX_ATP);
    state.cell.adpMmolL = TOTAL_ADENYLATE - state.cell.atpMmolL;
}

const createPool = (glucose: number, oxygen: number, fattyAcid: number, aminoAcid: number): SubstratePool => ({
    glucose,
    oxygen,
    fattyAcid,
    aminoAcid,
});

export const CAPTURED_POOL_CAPS = createPool(6, 20, 4, 4);
export const CAPTURE_AMOUNTS = createPool(1, 3, 0.5, 0.5);

const createInitialCollectionProgress = () => ({
    score: 0,
    chain: 0,
    lastCaptureAt: -10,
    lastKind: null as SubstrateKind | null,
    priorityCaptures: 0,
});

const createInitialAdaptations = () => ({
    enzymaticEfficiency: 0,
    antioxidantDefense: 0,
    metabolicFlexibility: 0,
    bufferCapacity: 0,
    hypoxiaTolerance: 0,
});

const createInitialRewardProgress = () => ({
    homeostasisSeconds: 0,
    rosControlSeconds: 0,
    balancedFuelSeconds: 0,
    phStableSeconds: 0,
    hypoxiaStableSeconds: 0,
    lastOpportunityAt: 0,
});

export function initializeCellularState(): CellularState {
    return {
        tissue: {
            perfusionPercent: 100,
            oxygenMmHg: 40,
            carbonDioxideMmHg: 46,
            glucoseMmolL: 5,
            lactateMmolL: 1,
            pH: 7.38,
            osmolarity: BASE_OSMOLARITY,
            sodium: 140,
            potassium: 4,
            wasteLoad: 8,
        },
        cell: {
            pH: 7.2,
            osmolarity: BASE_OSMOLARITY,
            volumePercent: 100,
            membranePotentialMv: -70,
            sodium: 12,
            potassium: 140,
            calciumNm: 100,
            atpMmolL: 5,
            adpMmolL: 1,
            nadhPercent: 48,
            viabilityPercent: 100,
        },
        mitochondria: {
            membranePotentialMv: -155,
            etcFluxPercent: 24,
            atpSynthaseFlux: 24,
            oxygenConsumption: 2.5,
            healthPercent: 100,
            processing: {
                pyruvatePerMin: 0,
                fattyAcidPerMin: 0,
                nadhPerMin: 0,
                fadh2PerMin: 0,
                oxygenPerMin: 0,
                protonsPerMin: 0,
                adpPerMin: 0,
                atpPerMin: 0,
                waterPerMin: 0,
            },
        },
        pools: {
            available: createPool(4, 10, 2, 2),
            captured: createPool(0, 0, 0, 0),
            pyruvate: 0,
        },
        transportSaturation: createPool(0, 0, 0, 0),
        damage: {
            oxidativeStress: 10,
            membrane: 0,
            proteins: 0,
            dna: 0,
            antioxidantCapacity: 80,
        },
        fate: {
            status: 'homeostasis',
            apoptoticCommitment: 0,
            infectionSusceptibility: 5,
            lastTransition: 'Célula viável em homeostase',
        },
        collection: createInitialCollectionProgress(),
        adaptations: createInitialAdaptations(),
        rewards: createInitialRewardProgress(),
        automation: {
            transporters: 0,
            mitochondrialShuttle: 0,
            repair: 0,
        },
        atpAllocation: {
            ionPumps: 0,
            repair: 0,
            biosynthesis: 0,
        },
        routine: null,
        totalAtpProduced: 0,
        totalAtpSpent: 0,
        lastEvent: 'Microambiente em homeostase basal',
        nextRoutineAt: 15,
        scenarioCooldowns: {},
        simulationTime: 0,
    };
}

function cloneState(state: CellularState): CellularState {
    return {
        ...state,
        tissue: { ...state.tissue },
        cell: { ...state.cell },
        mitochondria: { ...state.mitochondria, processing: { ...state.mitochondria.processing } },
        pools: {
            ...state.pools,
            available: { ...state.pools.available },
            captured: { ...state.pools.captured },
        },
        transportSaturation: { ...(state.transportSaturation ?? createPool(0, 0, 0, 0)) },
        damage: { ...state.damage },
        fate: { ...(state.fate ?? { status: 'homeostasis', apoptoticCommitment: 0, infectionSusceptibility: 5, lastTransition: 'Célula viável em homeostase' }) },
        collection: { ...(state.collection ?? createInitialCollectionProgress()) },
        adaptations: { ...(state.adaptations ?? createInitialAdaptations()) },
        rewards: { ...(state.rewards ?? createInitialRewardProgress()) },
        automation: { ...state.automation },
        atpAllocation: { ...state.atpAllocation },
        routine: state.routine ? { ...state.routine } : null,
        scenarioCooldowns: { ...(state.scenarioCooldowns ?? {}) },
    };
}

function routineDemand(state: CellularState) {
    if (!state.routine) return { atp: 0, ros: 0, lactate: 0, aminoAcid: 0 };

    switch (state.routine.id) {
        case 'stair-climb':
            return { atp: 0.012, ros: 0.0008, lactate: 0.022, aminoAcid: 0 };
        case 'meal-surge':
            return { atp: 0.004, ros: 0.0007, lactate: 0.004, aminoAcid: 0 };
        case 'morning-fast':
            return { atp: 0.007, ros: 0.0005, lactate: 0, aminoAcid: 0 };
        case 'micro-injury':
            return { atp: 0.006, ros: 0.0005, lactate: 0, aminoAcid: 0.006 };
        case 'immune-challenge':
            return { atp: 0.005, ros: 0.0017, lactate: 0.005, aminoAcid: 0 };
        case 'heat-dehydration':
            return { atp: 0.009, ros: 0.0006, lactate: 0, aminoAcid: 0 };
        default:
            return { atp: 0, ros: 0, lactate: 0, aminoAcid: 0 };
    }
}

function applyRoutineOnset(state: CellularState) {
    if (!state.routine) return;
    const definition = getScenarioDefinition(state.routine.id);
    if (definition) applyScenarioEffects(state, definition.onStart);
}

function applyScenarioEffects(state: CellularState, effects: ScenarioEffect[], multiplier = 1) {
    for (const effect of effects) {
        const delta = effect.delta * multiplier;
        if (effect.target === 'cell.atp') state.cell.atpMmolL += delta;
        else if (effect.target === 'cell.volume') state.cell.volumePercent += delta;
        else if (effect.target === 'tissue.glucose') state.tissue.glucoseMmolL += delta;
        else if (effect.target === 'tissue.lactate') state.tissue.lactateMmolL += delta;
        else if (effect.target === 'tissue.osmolarity') state.tissue.osmolarity += delta;
        else if (effect.target === 'available.glucose') state.pools.available.glucose += delta;
        else if (effect.target === 'available.fattyAcid') state.pools.available.fattyAcid += delta;
        else if (effect.target === 'damage.oxidative') state.damage.oxidativeStress += delta;
        else if (effect.target === 'damage.membrane') state.damage.membrane += delta;
        else if (effect.target === 'damage.proteins') state.damage.proteins += delta;
    }
    state.cell.atpMmolL = clamp(state.cell.atpMmolL, .2, MAX_ATP);
    state.cell.volumePercent = clamp(state.cell.volumePercent, 70, 140);
    state.tissue.glucoseMmolL = clamp(state.tissue.glucoseMmolL, 1, 20);
    state.tissue.lactateMmolL = clamp(state.tissue.lactateMmolL, 0, 20);
    state.tissue.osmolarity = clamp(state.tissue.osmolarity, 260, 340);
    state.pools.available.glucose = clamp(state.pools.available.glucose, 0, 8);
    state.pools.available.fattyAcid = clamp(state.pools.available.fattyAcid, 0, 5);
    state.damage.oxidativeStress = clamp(state.damage.oxidativeStress, 0, 100);
    state.damage.membrane = clamp(state.damage.membrane, 0, 100);
    state.damage.proteins = clamp(state.damage.proteins, 0, 100);
    syncAdenylates(state);
}

export function resolveRoutineDecision(state: CellularState, choiceId: string, effectMultiplier = 1): CellularActionResult {
    if (!state.routine || !state.routine.choices.some(choice => choice.id === choiceId)) {
        return actionFailure(state, 'Esta decisão não está disponível no cenário atual.');
    }

    const scenarioId = state.routine.id;
    const choice = getScenarioChoice(scenarioId, choiceId);
    if (!choice) return actionFailure(state, 'A consequência desta decisão não está configurada.');
    const availability = getScenarioChoiceAvailability(state, scenarioId, choiceId);
    if (!availability.available) {
        return actionFailure(state, `Recursos insuficientes: ${availability.missing.join(' · ')}.`);
    }

    const next = cloneState(state);
    for (const requirement of choice.requirements) {
        if (requirement.cost <= 0) continue;
        if (requirement.resource === 'atp') {
            next.cell.atpMmolL -= requirement.cost;
            next.totalAtpSpent += requirement.cost;
        }
        else if (requirement.resource === 'pyruvate') next.pools.pyruvate -= requirement.cost;
        else if (requirement.resource === 'antioxidants') next.damage.antioxidantCapacity -= requirement.cost;
        else next.pools.captured[requirement.resource] -= requirement.cost;
    }
    applyScenarioEffects(next, choice.cellularEffects, effectMultiplier);

    next.routine = null;
    next.lastEvent = choice.result;
    next.cell.atpMmolL = clamp(next.cell.atpMmolL, 0.2, MAX_ATP);
    next.cell.nadhPercent = clamp(next.cell.nadhPercent, 0, 100);
    next.tissue.glucoseMmolL = clamp(next.tissue.glucoseMmolL, 1, 20);
    next.tissue.lactateMmolL = clamp(next.tissue.lactateMmolL, 0, 20);
    next.damage.oxidativeStress = clamp(next.damage.oxidativeStress, 0, 100);
    next.damage.antioxidantCapacity = clamp(next.damage.antioxidantCapacity, 0, 100);
    next.damage.proteins = clamp(next.damage.proteins, 0, 100);
    next.damage.membrane = clamp(next.damage.membrane, 0, 100);
    next.cell.volumePercent = clamp(next.cell.volumePercent, 70, 140);
    syncAdenylates(next);
    return {
        state: next,
        ok: true,
        decisionOutcome: choice.outcome,
        scenarioId,
        event: {
            message: `${choice.outcome === 'adaptive' ? 'Decisão correta' : 'Decisão prejudicial'} — ${choice.result}`,
            severity: choice.outcome === 'adaptive' ? 'info' : 'critical',
            affectedSystems: ['cellular', 'decision', choice.outcome],
        },
    };
}

function autoCapture(state: CellularState, dt: number) {
    const level = state.automation.transporters;
    // A célula já possui transportadores constitutivos. A progressão compra
    // expressão/recrutamento adicional, não cria a fisiologia basal do zero.
    const basalRates: SubstratePool = createPool(0.014, 0.085, 0.002, 0.003);
    const levelRates: SubstratePool = createPool(0.018, 0.07, 0.008, 0.009);
    (Object.keys(basalRates) as SubstrateKind[]).forEach(kind => {
        const rate = basalRates[kind] + levelRates[kind] * level;
        const amount = Math.min(
            state.pools.available[kind],
            Math.max(0, CAPTURED_POOL_CAPS[kind] - state.pools.captured[kind]),
            rate * dt,
        );
        state.pools.available[kind] -= amount;
        state.pools.captured[kind] += amount;
    });
}

interface AutomaticMetabolismResult {
    atpProduced: number;
    oxygenUsed: number;
    glycolyticAtp: number;
    pyruvateUsed: number;
    fattyAcidUsed: number;
}

function automaticMetabolism(
    state: CellularState,
    requestedAtp: number,
    oxygenFactor: number,
    metabolicDemand: number,
    dt: number,
): AutomaticMetabolismResult {
    const level = state.automation.mitochondrialShuttle;
    const headroom = Math.max(0, MAX_ATP - state.cell.atpMmolL);
    const availableAdp = Math.max(0, state.cell.adpMmolL - 0.2);
    const productionTarget = Math.min(requestedAtp, headroom, availableAdp);
    if (productionTarget <= 0) return { atpProduced: 0, oxygenUsed: 0, glycolyticAtp: 0, pyruvateUsed: 0, fattyAcidUsed: 0 };

    // Glicólise constitutiva fornece piruvato e um pequeno rendimento direto.
    const pyruvateNeeded = productionTarget / PYRUVATE_ATP_YIELD;
    const glucoseNeeded = Math.max(0, pyruvateNeeded - state.pools.pyruvate) / 2;
    const maxGlycolysis = (0.012 + level * 0.004) * clamp(metabolicDemand, 0.6, 4) * dt;
    const glucoseFlux = Math.min(state.pools.captured.glucose, glucoseNeeded, maxGlycolysis);
    state.pools.captured.glucose -= glucoseFlux;
    state.pools.pyruvate += glucoseFlux * 2;
    const glycolyticAtp = glucoseFlux * GLYCOLYSIS_ATP_YIELD;

    const remainingTarget = Math.max(0, productionTarget - glycolyticAtp);
    const mitochondrialCapacity = clamp(state.mitochondria.healthPercent / 100, 0.1, 1)
        * clamp(oxygenFactor, 0, 1.2)
        * (1 + level * 0.18);
    const maxPyruvateFlux = 0.025 * clamp(metabolicDemand, 0.5, 6) * mitochondrialCapacity * dt;
    const pyruvateFlux = Math.min(
        state.pools.pyruvate,
        state.pools.captured.oxygen / 3,
        remainingTarget / PYRUVATE_ATP_YIELD,
        maxPyruvateFlux,
    );
    let oxygenUsed = 0;
    let oxidativeAtp = 0;
    if (pyruvateFlux > 0) {
        state.pools.pyruvate -= pyruvateFlux;
        state.pools.captured.oxygen -= pyruvateFlux * 3;
        oxygenUsed += pyruvateFlux * 3;
        oxidativeAtp += pyruvateFlux * PYRUVATE_ATP_YIELD;
        state.damage.oxidativeStress += pyruvateFlux * 0.8;
    }

    // A navette adquirida pode complementar a produção com beta-oxidação.
    const afterPyruvate = Math.max(0, remainingTarget - oxidativeAtp);
    const fattyFlux = Math.min(
        state.pools.captured.fattyAcid,
        state.pools.captured.oxygen / 6,
        afterPyruvate / FATTY_ACID_ATP_YIELD,
        0.004 * level * mitochondrialCapacity * dt,
    );
    if (fattyFlux > 0) {
        state.pools.captured.fattyAcid -= fattyFlux;
        state.pools.captured.oxygen -= fattyFlux * 6;
        oxygenUsed += fattyFlux * 6;
        oxidativeAtp += fattyFlux * FATTY_ACID_ATP_YIELD;
        state.damage.oxidativeStress += fattyFlux * 1.8;
    }

    let anaerobicAtp = 0;
    const residualTarget = Math.max(0, productionTarget - glycolyticAtp - oxidativeAtp);
    if (residualTarget > 0) {
        const maxAnaerobicGlycolysis = 0.02 * clamp(metabolicDemand, 0.5, 6) * dt;
        const anaerobicGlucose = Math.min(
            state.pools.captured.glucose,
            residualTarget / GLYCOLYSIS_ATP_YIELD,
            maxAnaerobicGlycolysis,
        );
        state.pools.captured.glucose -= anaerobicGlucose;
        anaerobicAtp = anaerobicGlucose * GLYCOLYSIS_ATP_YIELD;
        if (oxygenFactor < 0.6) {
            // Piruvato → lactato regenera NAD+ quando a CTE está limitada.
            state.tissue.lactateMmolL += anaerobicGlucose * 0.16;
        } else {
            state.pools.pyruvate += anaerobicGlucose * 2;
        }
    }

    return {
        atpProduced: Math.min(productionTarget, glycolyticAtp + oxidativeAtp + anaerobicAtp),
        oxygenUsed,
        glycolyticAtp: glycolyticAtp + anaerobicAtp,
        pyruvateUsed: pyruvateFlux,
        fattyAcidUsed: fattyFlux,
    };
}

function autoRepair(state: CellularState, dt: number) {
    const level = state.automation.repair;
    if (level <= 0 || state.cell.atpMmolL < 1.2) return 0;

    const target = (['membrane', 'proteins', 'dna'] as const)
        .reduce((worst, key) => state.damage[key] > state.damage[worst] ? key : worst, 'membrane');
    if (state.damage[target] <= 1) return 0;

    const atpSpent = Math.min(state.cell.atpMmolL - 1, 0.008 * level * dt);
    state.cell.atpMmolL -= atpSpent;
    syncAdenylates(state);
    state.damage[target] = Math.max(0, state.damage[target] - atpSpent * 7);
    state.atpAllocation.repair += atpSpent;
    return atpSpent;
}

function advanceStep(
    previous: CellularState,
    macro: PhysiologyState,
    controls: CellularControls,
    dt: number,
): CellularState {
    const state = cloneState(previous);
    state.simulationTime += dt;

    if (state.collection.chain > 0 && state.simulationTime - state.collection.lastCaptureAt > 3.2) {
        state.collection.chain = 0;
    }

    const cardiacFlow = macro.cardiovascular.cardiacOutput / 4.9;
    const pressureFlow = Math.sqrt(clamp(macro.cardiovascular.meanArterialPressure / 93, 0.25, 1.8));
    const perfusionFactor = clamp(cardiacFlow * pressureFlow, 0.2, 1.6);
    const perfusionTarget = clamp(perfusionFactor * 100, 20, 160);
    const oxygenDelivery = perfusionFactor * clamp(macro.respiratory.spo2 / 98, 0.3, 1.05);
    const metabolicDemand = clamp(macro.energy.atpDemand / 30, 0.6, 6);
    const routine = routineDemand(state);

    state.tissue.perfusionPercent = approach(state.tissue.perfusionPercent, perfusionTarget, 5, dt);
    state.tissue.oxygenMmHg = approach(
        state.tissue.oxygenMmHg,
        clamp(40 * oxygenDelivery - (metabolicDemand - 1) * 3, 5, 65),
        7,
        dt,
    );
    state.tissue.carbonDioxideMmHg = approach(
        state.tissue.carbonDioxideMmHg,
        clamp(macro.respiratory.paco2 + 6 + (metabolicDemand - perfusionFactor) * 2, 30, 90),
        8,
        dt,
    );
    state.tissue.glucoseMmolL = approach(
        state.tissue.glucoseMmolL,
        clamp((macro.nutrients.bloodGlucose / 18) * (0.78 + 0.22 * perfusionFactor), 1, 14),
        12,
        dt,
    );

    const osmolarityTarget = clamp(
        2 * macro.nutrients.sodium + macro.nutrients.bloodGlucose / 18 + 5,
        255,
        330,
    );
    state.tissue.osmolarity = approach(state.tissue.osmolarity, osmolarityTarget, 22, dt);
    state.tissue.sodium = approach(state.tissue.sodium, macro.nutrients.sodium, 20, dt);
    state.tissue.potassium = approach(state.tissue.potassium, macro.nutrients.potassium, 20, dt);

    const lactateTarget = clamp(macro.energy.lactateLevel + routine.lactate * 8, 0.6, 16);
    state.tissue.lactateMmolL = approach(state.tissue.lactateMmolL, lactateTarget, 12, dt);
    const tissuePhTarget = clamp(
        macro.acidBase.pH - 0.02 - Math.max(0, state.tissue.lactateMmolL - 1) * 0.018 * (1 - state.adaptations.bufferCapacity * 0.06),
        6.65,
        7.55,
    );
    state.tissue.pH = approach(state.tissue.pH, tissuePhTarget, 9, dt);

    const deliveryRates: SubstratePool = createPool(0.035, 0.14, 0.012, 0.012);
    const deliveryCaps: SubstratePool = createPool(8, 16, 4, 4);
    const deliveryAvailability: SubstratePool = createPool(
        clamp(state.tissue.glucoseMmolL / 5, 0.05, 2.5),
        clamp(state.tissue.oxygenMmHg / 40, 0.02, 1.6),
        clamp(macro.nutrients.fattyAcids / 0.4, 0.05, 3) * (1 + state.adaptations.metabolicFlexibility * 0.05),
        clamp(macro.nutrients.aminoAcids / 40, 0.05, 2.5),
    );
    (Object.keys(deliveryRates) as SubstrateKind[]).forEach(kind => {
        const delivered = deliveryRates[kind] * perfusionFactor * deliveryAvailability[kind] * dt;
        state.pools.available[kind] = Math.min(deliveryCaps[kind], state.pools.available[kind] + delivered);
    });
    autoCapture(state, dt);

    // Excesso de piruvato sem capacidade oxidativa é reduzido a lactato, regenerando NAD+.
    if (state.pools.pyruvate > 4) {
        const lactateFlux = Math.min(state.pools.pyruvate - 4, 0.025 * dt);
        state.pools.pyruvate -= lactateFlux;
        state.tissue.lactateMmolL += lactateFlux * 0.12;
    }

    const hypoxiaFloor = 5 - state.adaptations.hypoxiaTolerance * 0.55;
    const oxygenFactor = clamp((state.tissue.oxygenMmHg - hypoxiaFloor) / (40 - hypoxiaFloor), 0, 1.3);
    const efficiencyFactor = 1 - state.adaptations.enzymaticEfficiency * 0.015;
    const atpConsumptionRate = (0.0098 * metabolicDemand
        + routine.atp
        + Math.max(0, 7.2 - state.cell.pH) * 0.02) * efficiencyFactor;
    const recoveryDrive = clamp((5 - state.cell.atpMmolL) * 0.002, -0.0015, 0.012);
    const metabolism = automaticMetabolism(
        state,
        Math.max(0, atpConsumptionRate + recoveryDrive) * dt,
        oxygenFactor,
        metabolicDemand,
        dt,
    );
    const atpProduced = metabolism.atpProduced;
    const atpSpent = Math.min(state.cell.atpMmolL + atpProduced, atpConsumptionRate * dt);

    state.cell.atpMmolL += atpProduced - atpSpent;
    syncAdenylates(state);
    state.totalAtpProduced += atpProduced;
    state.totalAtpSpent += atpSpent;

    const oxidativeAtpProduced = Math.max(0, atpProduced - metabolism.glycolyticAtp);
    const rateScale = 60 / Math.max(dt, .001);
    const processingTargets = {
        pyruvatePerMin: metabolism.pyruvateUsed * rateScale,
        fattyAcidPerMin: metabolism.fattyAcidUsed * rateScale,
        nadhPerMin: (metabolism.pyruvateUsed * 4 + metabolism.fattyAcidUsed * 31) * rateScale,
        fadh2PerMin: (metabolism.pyruvateUsed + metabolism.fattyAcidUsed * 15) * rateScale,
        oxygenPerMin: metabolism.oxygenUsed * rateScale,
        protonsPerMin: (metabolism.pyruvateUsed * 46 + metabolism.fattyAcidUsed * 400) * rateScale,
        adpPerMin: oxidativeAtpProduced * rateScale,
        atpPerMin: oxidativeAtpProduced * rateScale,
        waterPerMin: metabolism.oxygenUsed * 2 * rateScale,
    };
    (Object.keys(processingTargets) as Array<keyof typeof processingTargets>).forEach(key => {
        state.mitochondria.processing[key] = approach(state.mitochondria.processing[key], processingTargets[key], 2.4, dt);
    });

    const automatedRepairCost = autoRepair(state, dt);
    state.totalAtpSpent += automatedRepairCost;

    state.atpAllocation.ionPumps = Math.max(0, state.atpAllocation.ionPumps - 0.025 * dt);
    state.atpAllocation.repair = Math.max(0, state.atpAllocation.repair - 0.02 * dt);
    state.atpAllocation.biosynthesis = Math.max(0, state.atpAllocation.biosynthesis - 0.015 * dt);
    const atpAdequacy = clamp(state.cell.atpMmolL / 5, 0, 1.25);
    const pumpSupport = clamp(atpAdequacy + state.atpAllocation.ionPumps * 0.01, 0, 1.2);
    state.cell.sodium = approach(state.cell.sodium, 12 + (1 - pumpSupport) * 28, 14, dt);
    state.cell.potassium = approach(state.cell.potassium, 140 - (1 - pumpSupport) * 48, 14, dt);
    state.cell.membranePotentialMv = approach(state.cell.membranePotentialMv, -25 - 45 * pumpSupport, 8, dt);
    state.cell.calciumNm = approach(
        state.cell.calciumNm,
        100 + Math.max(0, 1 - pumpSupport) * 650 + state.damage.membrane * 2,
        10,
        dt,
    );

    state.cell.osmolarity = approach(state.cell.osmolarity, state.tissue.osmolarity, 18, dt);
    state.cell.volumePercent = approach(
        state.cell.volumePercent,
        clamp(100 * BASE_OSMOLARITY / state.tissue.osmolarity, 82, 120),
        20,
        dt,
    );
    state.cell.pH = approach(
        state.cell.pH,
        clamp(state.tissue.pH - 0.18 - Math.max(0, state.tissue.lactateMmolL - 1) * 0.012, 6.45, 7.35),
        12,
        dt,
    );

    (Object.keys(CAPTURED_POOL_CAPS) as SubstrateKind[]).forEach(kind => {
        const occupancy = state.pools.captured[kind] / CAPTURED_POOL_CAPS[kind] * 100;
        state.transportSaturation[kind] = approach(state.transportSaturation[kind], occupancy, 3, dt);
    });
    const glucoseSaturation = clamp((state.transportSaturation.glucose - 75) / 25, 0, 1);
    const oxygenSaturation = clamp((state.transportSaturation.oxygen - 82) / 18, 0, 1);
    const fattyAcidSaturation = clamp((state.transportSaturation.fattyAcid - 70) / 30, 0, 1);
    const aminoAcidSaturation = clamp((state.transportSaturation.aminoAcid - 80) / 20, 0, 1);
    const saturationRos = glucoseSaturation * .006 + oxygenSaturation * .004 + fattyAcidSaturation * .008;
    state.damage.membrane = clamp(state.damage.membrane + fattyAcidSaturation * .006 * dt, 0, 100);
    state.damage.proteins = clamp(state.damage.proteins + (fattyAcidSaturation * .004 + aminoAcidSaturation * .003) * dt, 0, 100);
    state.tissue.wasteLoad = clamp(state.tissue.wasteLoad + aminoAcidSaturation * .012 * dt, 0, 100);

    const redoxPressure = clamp((state.cell.nadhPercent - 50) / 50, 0, 1);
    const mitochondrialHealth = state.mitochondria.healthPercent / 100;
    const oxidativeAtp = Math.max(0, atpProduced - metabolism.glycolyticAtp);
    const oxidativeRate = oxidativeAtp / Math.max(dt, 0.001);
    const etcTarget = clamp((oxidativeRate / 0.03) * 100, 0, 100);
    state.mitochondria.etcFluxPercent = approach(state.mitochondria.etcFluxPercent, etcTarget, 4, dt);
    state.mitochondria.atpSynthaseFlux = approach(
        state.mitochondria.atpSynthaseFlux,
        etcTarget,
        3,
        dt,
    );
    state.mitochondria.oxygenConsumption = approach(
        state.mitochondria.oxygenConsumption,
        metabolism.oxygenUsed / Math.max(dt, 0.001) * 60,
        5,
        dt,
    );
    state.tissue.carbonDioxideMmHg = clamp(
        state.tissue.carbonDioxideMmHg + metabolism.oxygenUsed * 0.025,
        25,
        100,
    );
    state.mitochondria.membranePotentialMv = approach(
        state.mitochondria.membranePotentialMv,
        -110 - 50 * oxygenFactor * mitochondrialHealth,
        5,
        dt,
    );
    state.cell.nadhPercent = approach(
        state.cell.nadhPercent,
        clamp(48 + (1 - oxygenFactor) * 35 - state.mitochondria.etcFluxPercent * 0.08, 15, 95),
        8,
        dt,
    );

    const hyperglycemia = Math.max(0, state.tissue.glucoseMmolL - 7) * 0.002;
    const hypoxia = Math.max(0, 25 - state.tissue.oxygenMmHg) * 0.0012;
    const rosGeneration = 0.011 + state.mitochondria.etcFluxPercent * 0.00004 +
        hyperglycemia + hypoxia + routine.ros + redoxPressure * 0.004 + saturationRos;
    const rosClearance = 0.0115 * clamp(state.damage.antioxidantCapacity / 80, 0.15, 1.2)
        * (1 + state.adaptations.antioxidantDefense * 0.07);
    state.damage.oxidativeStress = clamp(
        state.damage.oxidativeStress + (rosGeneration - rosClearance) * dt * 10,
        0,
        100,
    );
    state.damage.antioxidantCapacity = clamp(
        state.damage.antioxidantCapacity + (0.015 * atpAdequacy - state.damage.oxidativeStress * 0.00016) * dt,
        0,
        100,
    );

    const oxidativeInjury = Math.max(0, state.damage.oxidativeStress - 25) * 0.00022;
    const acidInjury = Math.max(0, 6.9 - state.cell.pH) * 0.025;
    const osmoticInjury = Math.max(0, Math.abs(state.cell.volumePercent - 100) - 8) * 0.001;
    const energyInjury = Math.max(0, 1.5 - state.cell.atpMmolL) * 0.006;
    state.damage.membrane = clamp(state.damage.membrane + (oxidativeInjury + osmoticInjury + energyInjury) * dt, 0, 100);
    state.damage.proteins = clamp(state.damage.proteins + (oxidativeInjury * 0.8 + acidInjury) * dt, 0, 100);
    state.damage.dna = clamp(state.damage.dna + oxidativeInjury * 0.35 * dt, 0, 100);

    const averageDamage = state.damage.membrane * 0.35 + state.damage.proteins * 0.4 + state.damage.dna * 0.25;
    const acutePenalty = Math.max(0, 1 - state.cell.atpMmolL) * 8 + Math.max(0, 6.75 - state.cell.pH) * 25;
    state.cell.viabilityPercent = clamp(100 - averageDamage - acutePenalty, 0, 100);

    const cortisolExcess = clamp((macro.hormones.cortisol - 18) / 32, 0, 1);
    const hyperglycemicStress = clamp((macro.nutrients.bloodGlucose - 140) / 180, 0, 1);
    const anabolicProtection = clamp(
        (macro.hormones.igf1 / 180 + macro.hormones.mTORActivity / 50) / 2,
        0,
        1.35,
    );
    const apoptoticPressure = clamp(
        state.damage.dna / 100 * .38
        + state.damage.proteins / 100 * .18
        + state.damage.oxidativeStress / 100 * .24
        + Math.max(0, 1.1 - state.cell.atpMmolL) * .22
        + hyperglycemicStress * .12
        - anabolicProtection * .08,
        0,
        1,
    );
    const commitmentDelta = (apoptoticPressure * .32 - (1 - apoptoticPressure) * .055) * dt;
    state.fate.apoptoticCommitment = clamp(state.fate.apoptoticCommitment + commitmentDelta, 0, 100);
    state.fate.infectionSusceptibility = approach(
        state.fate.infectionSusceptibility,
        clamp(
            5
            + (100 - state.cell.viabilityPercent) * .42
            + state.damage.membrane * .22
            + cortisolExcess * 28
            + hyperglycemicStress * 18,
            0,
            100,
        ),
        18,
        dt,
    );
    const previousFate = state.fate.status;
    if (state.cell.viabilityPercent <= 8 && state.cell.atpMmolL <= .45) state.fate.status = 'necrosis';
    else if (state.fate.apoptoticCommitment >= 80 || state.damage.dna >= 78) state.fate.status = 'apoptosis';
    else if (state.cell.viabilityPercent < 70 || state.fate.apoptoticCommitment >= 25) state.fate.status = 'stress';
    else state.fate.status = 'homeostasis';
    if (state.fate.status === 'apoptosis') {
        state.cell.viabilityPercent = approach(state.cell.viabilityPercent, 0, 45, dt);
        state.cell.atpMmolL = Math.max(.2, state.cell.atpMmolL - .0025 * dt);
    } else if (state.fate.status === 'necrosis') {
        state.cell.viabilityPercent = approach(state.cell.viabilityPercent, 0, 8, dt);
        state.damage.membrane = clamp(state.damage.membrane + .08 * dt, 0, 100);
    }
    if (state.fate.status !== previousFate) {
        state.fate.lastTransition = state.fate.status === 'homeostasis'
            ? 'Sinais de morte celular recuaram; homeostase recuperada'
            : state.fate.status === 'stress'
                ? 'Dano acumulado ativou resposta celular de estresse'
                : state.fate.status === 'apoptosis'
                    ? 'Compromisso apoptótico ultrapassou o limiar de reversibilidade'
                    : 'Falência energética e de membrana iniciou necrose';
    }
    state.mitochondria.healthPercent = approach(
        state.mitochondria.healthPercent,
        clamp(100 - state.damage.oxidativeStress * 0.18 - state.damage.proteins * 0.35, 10, 100),
        18,
        dt,
    );

    const wasteProduction = 0.025 * metabolicDemand + routine.lactate;
    const wasteClearance = 0.03 * perfusionFactor;
    state.tissue.wasteLoad = clamp(state.tissue.wasteLoad + (wasteProduction - wasteClearance) * dt, 0, 100);

    if (routine.aminoAcid > 0) {
        const used = Math.min(state.pools.captured.aminoAcid, routine.aminoAcid * dt);
        state.pools.captured.aminoAcid -= used;
        state.atpAllocation.biosynthesis += used * 0.25;
    }

    // Mantém o controle explicitamente acoplado para inspeção e evita
    // que uma FC-alvo extrema pareça não ter consequência microvascular.
    if (controls.heartRateTarget > 130) {
        state.damage.oxidativeStress = clamp(state.damage.oxidativeStress + 0.001 * dt, 0, 100);
    }

    const accumulate = (current: number, condition: boolean) => condition ? current + dt : Math.max(0, current - dt * 0.6);
    const stableAtp = state.cell.atpMmolL >= 1.5 && state.cell.atpMmolL <= 5.5;
    const stablePh = state.tissue.pH >= 7.30 && state.tissue.pH <= 7.45;
    const stableRos = state.damage.oxidativeStress <= 28;
    const globallyStable = stableAtp && stablePh && stableRos && state.tissue.oxygenMmHg >= 32 && state.cell.viabilityPercent >= 70;
    state.rewards.homeostasisSeconds = accumulate(state.rewards.homeostasisSeconds, globallyStable);
    state.rewards.rosControlSeconds = accumulate(state.rewards.rosControlSeconds, stableRos && state.damage.antioxidantCapacity >= 55);
    state.rewards.phStableSeconds = accumulate(state.rewards.phStableSeconds, stablePh && state.tissue.lactateMmolL <= 3);
    state.rewards.balancedFuelSeconds = accumulate(
        state.rewards.balancedFuelSeconds,
        stableAtp && state.pools.captured.glucose >= .35 && state.pools.captured.fattyAcid >= .15,
    );
    state.rewards.hypoxiaStableSeconds = accumulate(
        state.rewards.hypoxiaStableSeconds,
        state.tissue.oxygenMmHg >= 15 && state.tissue.oxygenMmHg < 32 && stableAtp,
    );

    return state;
}

type RewardTimer = 'homeostasisSeconds' | 'rosControlSeconds' | 'balancedFuelSeconds' | 'phStableSeconds' | 'hypoxiaStableSeconds';

function maybeAwardAdaptation(state: CellularState): CellularEvent | null {
    if (state.simulationTime - state.rewards.lastOpportunityAt < 6) return null;
    const opportunities: Array<{ kind: CellularAdaptationKind; timer: RewardTimer; threshold: number; label: string; reason: string }> = [
        { kind: 'enzymaticEfficiency', timer: 'homeostasisSeconds', threshold: 30, label: 'Eficiência enzimática', reason: 'ATP, O₂, pH e viabilidade permaneceram em faixa funcional' },
        { kind: 'antioxidantDefense', timer: 'rosControlSeconds', threshold: 24, label: 'Defesa antioxidante', reason: 'ROS ficou controlado com reserva antioxidante disponível' },
        { kind: 'metabolicFlexibility', timer: 'balancedFuelSeconds', threshold: 28, label: 'Flexibilidade metabólica', reason: 'glicose e ácidos graxos foram mantidos disponíveis sem colapso energético' },
        { kind: 'bufferCapacity', timer: 'phStableSeconds', threshold: 26, label: 'Buffer intracelular', reason: 'o pH foi preservado apesar da produção metabólica' },
        { kind: 'hypoxiaTolerance', timer: 'hypoxiaStableSeconds', threshold: 18, label: 'Tolerância à hipóxia', reason: 'o ATP foi sustentado com tensão de O₂ reduzida' },
    ];
    const eligibleOpportunities = opportunities.filter(opportunity => state.rewards[opportunity.timer] >= opportunity.threshold && state.adaptations[opportunity.kind] < 4);
    if (eligibleOpportunities.length === 0) return null;

    const quality = clamp(
        state.cell.viabilityPercent / 100 * .28
        + clamp(state.cell.atpMmolL / 5, 0, 1) * .24
        + clamp(state.tissue.oxygenMmHg / 40, 0, 1) * .18
        + clamp((45 - state.damage.oxidativeStress) / 45, 0, 1) * .30,
        0,
        1,
    );
    const stateSeed = Math.sin(state.simulationTime * 12.9898 + state.collection.score * .37 + quality * 19.19) * 43758.5453;
    const opportunityRoll = stateSeed - Math.floor(stateSeed);
    const chosen = eligibleOpportunities[Math.floor(opportunityRoll * eligibleOpportunities.length) % eligibleOpportunities.length];
    const rewardSeed = Math.sin(state.simulationTime * 7.13 + quality * 31.7 + chosen.threshold) * 24634.6345;
    const rewardRoll = rewardSeed - Math.floor(rewardSeed);
    state.rewards.lastOpportunityAt = state.simulationTime;
    if (rewardRoll > .35 + quality * .45) return null;

    state.adaptations[chosen.kind] += 1;
    state.rewards[chosen.timer] = chosen.threshold * .2;
    if (chosen.kind === 'enzymaticEfficiency') state.cell.atpMmolL = clamp(state.cell.atpMmolL + .12, .2, MAX_ATP);
    if (chosen.kind === 'antioxidantDefense') state.damage.oxidativeStress = clamp(state.damage.oxidativeStress - 2.5, 0, 100);
    if (chosen.kind === 'bufferCapacity') state.cell.pH = approach(state.cell.pH, 7.2, 1, .5);
    syncAdenylates(state);
    state.lastEvent = `${chosen.label} +1: ${chosen.reason}`;
    return {
        message: `Adaptação desbloqueada — ${chosen.label}: ${chosen.reason}.`,
        severity: 'info',
        affectedSystems: ['cellular-adaptation', 'reward'],
    };
}

export function advanceCellularSimulation(
    previous: CellularState,
    macro: PhysiologyState,
    controls: CellularControls,
    deltaTime: number,
): CellularTickResult {
    const events: CellularEvent[] = [];
    const totalTime = clamp(deltaTime, 0, 10);
    let state = cloneState(previous);
    let remaining = totalTime;

    const startRoutineIfDue = () => {
        if (state.routine || state.simulationTime < state.nextRoutineAt) return;
        const candidate = selectEligibleScenario(state, macro);
        if (!candidate) {
            state.nextRoutineAt = state.simulationTime + 8;
            return;
        }
        state.routine = createRoutineEvent(candidate.definition, candidate.eligibility.reason);
        applyRoutineOnset(state);
        state.nextRoutineAt = state.simulationTime + 18;
        state.scenarioCooldowns[candidate.definition.id] = state.simulationTime + candidate.definition.cooldownSeconds;
        state.lastEvent = state.routine.title;
        events.push({
            message: `${state.routine.title}: ${state.routine.triggerReason}.`,
            severity: state.routine.severity,
            affectedSystems: ['tissue', 'cellular-energy'],
        });
    };

    while (remaining > 0) {
        startRoutineIfDue();
        const dt = Math.min(FIXED_STEP, remaining);
        state = advanceStep(state, macro, controls, dt);
        remaining -= dt;
    }
    startRoutineIfDue();

    const adaptationEvent = maybeAwardAdaptation(state);
    if (adaptationEvent) events.push(adaptationEvent);

    if (previous.cell.viabilityPercent >= 70 && state.cell.viabilityPercent < 70) {
        events.push({
            message: 'Viabilidade celular comprometida: priorize ATP, perfusão e reparo',
            severity: 'warning',
            affectedSystems: ['cellular'],
        });
    }
    if (previous.cell.viabilityPercent >= 35 && state.cell.viabilityPercent < 35) {
        events.push({
            message: 'Falência celular iminente no voxel observado',
            severity: 'critical',
            affectedSystems: ['cellular', 'tissue'],
        });
    }
    if ((previous.fate?.status ?? 'homeostasis') !== state.fate.status) {
        events.push({
            message: state.fate.lastTransition,
            severity: state.fate.status === 'homeostasis' ? 'info' : state.fate.status === 'stress' ? 'warning' : 'critical',
            affectedSystems: ['cellular-fate', state.fate.status, state.fate.status === 'necrosis' ? 'inflammation' : 'cellular'],
        });
    }

    return { state, events };
}

function actionFailure(state: CellularState, reason: string): CellularActionResult {
    return { state, ok: false, reason };
}

export function captureSubstrate(state: CellularState, kind: SubstrateKind): CellularActionResult {
    const next = cloneState(state);
    const previousCollection = state.collection ?? createInitialCollectionProgress();
    const amount = CAPTURE_AMOUNTS[kind];
    if (next.pools.available[kind] < amount) {
        return actionFailure(state, 'Oferta no LEC insuficiente; melhore a perfusão e aguarde a entrega capilar.');
    }
    if (next.pools.captured[kind] + amount > CAPTURED_POOL_CAPS[kind]) {
        return actionFailure(state, 'Pool intracelular saturado; processe o substrato antes de captar mais.');
    }

    next.pools.available[kind] -= amount;
    next.pools.captured[kind] += amount;
    const occupancy = next.pools.captured[kind] / CAPTURED_POOL_CAPS[kind] * 100;
    next.transportSaturation[kind] = Math.max(next.transportSaturation[kind], occupancy);
    if (occupancy >= 80) {
        if (kind === 'glucose') next.damage.oxidativeStress = clamp(next.damage.oxidativeStress + 1.2, 0, 100);
        else if (kind === 'oxygen') next.damage.oxidativeStress = clamp(next.damage.oxidativeStress + .8, 0, 100);
        else if (kind === 'fattyAcid') {
            next.damage.oxidativeStress = clamp(next.damage.oxidativeStress + 1.4, 0, 100);
            next.damage.membrane = clamp(next.damage.membrane + .7, 0, 100);
        } else {
            next.tissue.wasteLoad = clamp(next.tissue.wasteLoad + 1, 0, 100);
            next.damage.proteins = clamp(next.damage.proteins + .5, 0, 100);
        }
    }
    const priorityThresholds: SubstratePool = createPool(2, 6, 1, 1);
    const wasPriority = state.pools.captured[kind] < priorityThresholds[kind];
    const chained = state.simulationTime - previousCollection.lastCaptureAt <= 2.5;
    next.collection.chain = chained ? Math.min(9, previousCollection.chain + 1) : 1;
    next.collection.lastCaptureAt = state.simulationTime;
    next.collection.lastKind = kind;
    next.collection.priorityCaptures = previousCollection.priorityCaptures + (wasPriority ? 1 : 0);
    next.collection.score = previousCollection.score + 10 + Math.max(0, next.collection.chain - 1) * 2 + (wasPriority ? 8 : 0);
    const labels: Record<SubstrateKind, string> = {
        glucose: 'Glicose captada por transportador',
        oxygen: 'O₂ difundido para o LIC',
        fattyAcid: 'Ácido graxo captado',
        aminoAcid: 'Aminoácido captado por cotransporte',
    };
    const saturationConsequences: Record<SubstrateKind, string> = {
        glucose: 'sobrecarga favorece ROS e glicotoxicidade',
        oxygen: 'excesso aumenta pressão redox e ROS',
        fattyAcid: 'excesso causa lipotoxicidade e dano de membrana',
        aminoAcid: 'excesso aumenta carga nitrogenada e estresse proteico',
    };
    next.lastEvent = occupancy >= 80
        ? `${labels[kind]} · ocupação ${occupancy.toFixed(0)}%: ${saturationConsequences[kind]}`
        : `${labels[kind]} · ocupação ${occupancy.toFixed(0)}% · cadeia ${next.collection.chain}`;
    return {
        state: next,
        ok: true,
        event: { message: next.lastEvent, severity: occupancy >= 80 ? 'warning' : 'info', affectedSystems: ['cellular-transport', occupancy >= 80 ? 'saturation' : 'capture'] },
    };
}

export function runGlycolysis(state: CellularState): CellularActionResult {
    if (state.pools.captured.glucose < 1) {
        return actionFailure(state, 'Capte ao menos um pacote de glicose antes de iniciar a glicólise.');
    }
    if (state.cell.atpMmolL > MAX_ATP - GLYCOLYSIS_ATP_YIELD) {
        return actionFailure(state, 'Pool de ATP quase saturado; aloque energia antes de produzir mais.');
    }

    const next = cloneState(state);
    next.pools.captured.glucose -= 1;
    const anaerobic = next.tissue.oxygenMmHg < 15;
    if (anaerobic) {
        next.tissue.lactateMmolL = clamp(next.tissue.lactateMmolL + 0.16, 0, 20);
    } else {
        next.pools.pyruvate += 2;
        next.cell.nadhPercent = clamp(next.cell.nadhPercent + 4, 0, 100);
    }
    next.cell.atpMmolL += GLYCOLYSIS_ATP_YIELD;
    syncAdenylates(next);
    next.totalAtpProduced += GLYCOLYSIS_ATP_YIELD;
    next.lastEvent = anaerobic
        ? 'Glicólise anaeróbia: glicose → lactato + 2 ATP equivalentes'
        : 'Glicólise: glicose → 2 piruvatos + NADH + 2 ATP equivalentes';

    return {
        state: next,
        ok: true,
        event: {
            message: next.lastEvent,
            severity: 'info',
            affectedSystems: ['glycolysis', 'cellular-energy'],
        },
    };
}

export function oxidizeSubstrate(
    state: CellularState,
    substrate: OxidationSubstrate,
): CellularActionResult {
    const isPyruvate = substrate === 'pyruvate';
    const oxygenCost = isPyruvate ? 3 : 6;
    const substrateAvailable = isPyruvate ? state.pools.pyruvate : state.pools.captured.fattyAcid;
    if (substrateAvailable < 1) {
        return actionFailure(state, isPyruvate
            ? 'Produza piruvato pela glicólise antes de alimentar a mitocôndria.'
            : 'Capte dois pacotes de ácido graxo antes da beta-oxidação.');
    }
    if (state.pools.captured.oxygen < oxygenCost) {
        return actionFailure(state, `O₂ insuficiente: são necessários ${oxygenCost} pacotes para esta oxidação.`);
    }
    if (state.tissue.oxygenMmHg < 10 || state.mitochondria.healthPercent < 20) {
        return actionFailure(state, 'A CTE está limitada por hipóxia tecidual ou dano mitocondrial grave.');
    }

    const baseYield = isPyruvate
        ? PYRUVATE_ATP_YIELD
        : FATTY_ACID_ATP_YIELD * (1 + state.adaptations.metabolicFlexibility * .03);
    const couplingEfficiency = clamp(state.mitochondria.healthPercent / 100, 0.3, 1)
        * clamp(state.tissue.oxygenMmHg / 40, 0.35, 1);
    const yieldAtp = baseYield * couplingEfficiency;
    if (state.cell.adpMmolL < yieldAtp || MAX_ATP - state.cell.atpMmolL < yieldAtp) {
        return actionFailure(state, 'ADP + Pi limitantes ou pool de ATP saturado; aloque ATP primeiro.');
    }

    const next = cloneState(state);
    if (isPyruvate) next.pools.pyruvate -= 1;
    else next.pools.captured.fattyAcid -= 1;
    next.pools.captured.oxygen -= oxygenCost;
    next.cell.atpMmolL += yieldAtp;
    syncAdenylates(next);
    next.totalAtpProduced += yieldAtp;
    next.tissue.carbonDioxideMmHg = clamp(next.tissue.carbonDioxideMmHg + (isPyruvate ? 0.15 : 0.25), 25, 100);
    next.tissue.wasteLoad = clamp(next.tissue.wasteLoad + (isPyruvate ? 0.2 : 0.35), 0, 100);
    next.damage.oxidativeStress = clamp(
        next.damage.oxidativeStress + (isPyruvate ? 1.2 : 2.8),
        0,
        100,
    );
    next.mitochondria.etcFluxPercent = Math.max(next.mitochondria.etcFluxPercent, isPyruvate ? 65 : 82);
    const pulseRate = 6;
    const nadhRate = (isPyruvate ? 4 : 31) * pulseRate;
    const fadh2Rate = (isPyruvate ? 1 : 15) * pulseRate;
    const oxygenRate = oxygenCost * pulseRate;
    const protonRate = (isPyruvate ? 46 : 400) * pulseRate;
    next.mitochondria.processing = {
        ...next.mitochondria.processing,
        pyruvatePerMin: Math.max(next.mitochondria.processing.pyruvatePerMin, isPyruvate ? pulseRate : 0),
        fattyAcidPerMin: Math.max(next.mitochondria.processing.fattyAcidPerMin, isPyruvate ? 0 : pulseRate),
        nadhPerMin: Math.max(next.mitochondria.processing.nadhPerMin, nadhRate),
        fadh2PerMin: Math.max(next.mitochondria.processing.fadh2PerMin, fadh2Rate),
        oxygenPerMin: Math.max(next.mitochondria.processing.oxygenPerMin, oxygenRate),
        protonsPerMin: Math.max(next.mitochondria.processing.protonsPerMin, protonRate),
        adpPerMin: Math.max(next.mitochondria.processing.adpPerMin, yieldAtp * pulseRate),
        atpPerMin: Math.max(next.mitochondria.processing.atpPerMin, yieldAtp * pulseRate),
        waterPerMin: Math.max(next.mitochondria.processing.waterPerMin, oxygenRate * 2),
    };
    next.mitochondria.oxygenConsumption = Math.max(next.mitochondria.oxygenConsumption, oxygenRate);
    next.lastEvent = isPyruvate
        ? 'Piruvato oxidado: Krebs + CTE + ATP sintase'
        : 'Beta-oxidação concluída: alto rendimento, maior pressão redox';

    return {
        state: next,
        ok: true,
        event: {
            message: next.lastEvent,
            severity: isPyruvate ? 'info' : 'warning',
            affectedSystems: ['mitochondria', 'cellular-energy'],
        },
    };
}

export function allocateAtp(state: CellularState, target: RepairTarget): CellularActionResult {
    const costs: Record<RepairTarget, number> = {
        membrane: 0.45,
        proteins: 0.5,
        dna: 0.7,
        antioxidants: 0.35,
    };
    const cost = costs[target];
    if (target === 'antioxidants') {
        if (state.damage.antioxidantCapacity >= 98 && state.damage.oxidativeStress <= 5) {
            return actionFailure(state, 'Defesas antioxidantes já estão repletas.');
        }
    } else if (state.damage[target] <= 0.1) {
        return actionFailure(state, 'Não há dano mensurável nesse alvo para reparar.');
    }
    if (state.cell.atpMmolL - cost < 0.8) {
        return actionFailure(state, 'ATP insuficiente; preserve ao menos 0,8 mmol/L para funções vitais.');
    }

    const next = cloneState(state);
    next.cell.atpMmolL -= cost;
    syncAdenylates(next);
    next.totalAtpSpent += cost;
    next.atpAllocation.repair += cost;

    if (target === 'antioxidants') {
        next.damage.antioxidantCapacity = clamp(next.damage.antioxidantCapacity + 10, 0, 100);
        next.damage.oxidativeStress = clamp(next.damage.oxidativeStress - 4, 0, 100);
        next.lastEvent = 'ATP alocado à reciclagem de glutationa e sistemas antioxidantes';
    } else {
        const repairGain = target === 'dna' ? 5 : target === 'proteins' ? 7 : 8;
        next.damage[target] = Math.max(0, next.damage[target] - repairGain);
        if (target === 'membrane') next.atpAllocation.ionPumps += cost * 0.5;
        next.lastEvent = `ATP alocado ao reparo de ${target === 'dna' ? 'DNA' : target === 'proteins' ? 'proteínas' : 'membrana'}`;
    }

    return {
        state: next,
        ok: true,
        event: { message: next.lastEvent, severity: 'info', affectedSystems: ['cellular-repair'] },
    };
}

export function purchaseAutomation(state: CellularState, kind: AutomationKind): CellularActionResult {
    const level = state.automation[kind];
    if (level >= AUTOMATION_MAX_LEVEL) {
        return actionFailure(state, 'Esta rota celular já atingiu o limite de otimização de quatro níveis.');
    }
    const usedBudget = Object.values(state.automation).reduce((sum, value) => sum + value, 0);
    if (usedBudget >= CELLULAR_OPTIMIZATION_BUDGET) {
        return actionFailure(state, 'Limite de especialização atingido: esta célula já alocou oito melhorias.');
    }

    const recipe = getAutomationRecipe(kind, level);
    if (state.cell.atpMmolL - recipe.atp < 1) {
        return actionFailure(state, `São necessários ${recipe.atp.toFixed(2)} mmol/L de ATP mantendo a reserva vital.`);
    }
    const missingSubstrate = (Object.entries(recipe.substrates) as Array<[SubstrateKind, number]>)
        .find(([substrate, amount]) => state.pools.captured[substrate] < amount);
    if (missingSubstrate) {
        const names: Record<SubstrateKind, string> = {
            glucose: 'glicose',
            oxygen: 'oxigênio',
            fattyAcid: 'ácido graxo',
            aminoAcid: 'aminoácido',
        };
        return actionFailure(
            state,
            `Receita incompleta: são necessários ${missingSubstrate[1].toFixed(2)} pacotes de ${names[missingSubstrate[0]]}.`,
        );
    }

    const next = cloneState(state);
    next.cell.atpMmolL -= recipe.atp;
    syncAdenylates(next);
    next.totalAtpSpent += recipe.atp;
    (Object.entries(recipe.substrates) as Array<[SubstrateKind, number]>).forEach(([substrate, amount]) => {
        next.pools.captured[substrate] -= amount;
    });
    next.automation[kind] += 1;
    const labels: Record<AutomationKind, string> = {
        transporters: 'Transportadores de membrana',
        mitochondrialShuttle: 'Navette mitocondrial ADP/substrato',
        repair: 'Maquinaria de reparo',
    };
    next.lastEvent = `${labels[kind]} automatizada no nível ${next.automation[kind]}`;

    return {
        state: next,
        ok: true,
        event: { message: next.lastEvent, severity: 'info', affectedSystems: ['cellular-automation'] },
    };
}
