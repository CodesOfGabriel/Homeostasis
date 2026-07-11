import type { PhysiologyState } from './types';
import type {
    AutomationKind,
    AutomationRecipe,
    CellularActionResult,
    CellularControls,
    CellularEvent,
    CellularState,
    CellularTickResult,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
    SubstratePool,
} from './cellularTypes';

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

const CAPTURED_POOL_CAPS = createPool(6, 20, 4, 4);

const createInitialCollectionProgress = () => ({
    score: 0,
    chain: 0,
    lastCaptureAt: -10,
    lastKind: null as SubstrateKind | null,
    priorityCaptures: 0,
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
        },
        pools: {
            available: createPool(4, 10, 2, 2),
            captured: createPool(0, 0, 0, 0),
            pyruvate: 0,
        },
        damage: {
            oxidativeStress: 10,
            membrane: 0,
            proteins: 0,
            dna: 0,
            antioxidantCapacity: 80,
        },
        collection: createInitialCollectionProgress(),
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
        nextRoutineAt: 30,
        simulationTime: 0,
    };
}

function cloneState(state: CellularState): CellularState {
    return {
        ...state,
        tissue: { ...state.tissue },
        cell: { ...state.cell },
        mitochondria: { ...state.mitochondria },
        pools: {
            ...state.pools,
            available: { ...state.pools.available },
            captured: { ...state.pools.captured },
        },
        damage: { ...state.damage },
        collection: { ...(state.collection ?? createInitialCollectionProgress()) },
        automation: { ...state.automation },
        atpAllocation: { ...state.atpAllocation },
        routine: state.routine ? { ...state.routine } : null,
    };
}

function routineDemand(state: CellularState) {
    if (!state.routine) return { atp: 0, ros: 0, lactate: 0, aminoAcid: 0 };

    switch (state.routine.id) {
        case 'contraction':
            return { atp: 0.008, ros: 0.0006, lactate: 0.018, aminoAcid: 0 };
        case 'protein-turnover':
            return { atp: 0.004, ros: 0.0002, lactate: 0, aminoAcid: 0.004 };
        case 'immune-pulse':
            return { atp: 0.003, ros: 0.0012, lactate: 0.004, aminoAcid: 0 };
        case 'osmotic-load':
            return { atp: 0.005, ros: 0.0003, lactate: 0, aminoAcid: 0 };
        default:
            return { atp: 0, ros: 0, lactate: 0, aminoAcid: 0 };
    }
}

function createRoutine(state: CellularState) {
    const index = Math.floor(Math.max(0, state.nextRoutineAt - 30) / 55) % 4;
    const routines = [
        {
            id: 'contraction',
            title: 'Contração muscular local',
            description: 'A demanda por ATP e a produção de lactato aumentaram temporariamente.',
            remainingSeconds: 22,
            severity: 'warning' as const,
        },
        {
            id: 'protein-turnover',
            title: 'Renovação proteica',
            description: 'A célula precisa de aminoácidos e ATP para substituir proteínas.',
            remainingSeconds: 24,
            severity: 'info' as const,
        },
        {
            id: 'immune-pulse',
            title: 'Sinal inflamatório transitório',
            description: 'A produção de espécies reativas de oxigênio aumentou.',
            remainingSeconds: 18,
            severity: 'warning' as const,
        },
        {
            id: 'osmotic-load',
            title: 'Carga osmótica',
            description: 'Bombas iônicas exigem mais ATP para preservar o volume celular.',
            remainingSeconds: 20,
            severity: 'warning' as const,
        },
    ];
    return routines[index];
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
    if (productionTarget <= 0) return { atpProduced: 0, oxygenUsed: 0, glycolyticAtp: 0 };

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

    if (state.routine) {
        state.routine.remainingSeconds -= dt;
        if (state.routine.remainingSeconds <= 0) state.routine = null;
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
        macro.acidBase.pH - 0.02 - Math.max(0, state.tissue.lactateMmolL - 1) * 0.018,
        6.65,
        7.55,
    );
    state.tissue.pH = approach(state.tissue.pH, tissuePhTarget, 9, dt);

    const deliveryRates: SubstratePool = createPool(0.035, 0.14, 0.012, 0.012);
    const deliveryCaps: SubstratePool = createPool(8, 16, 4, 4);
    const deliveryAvailability: SubstratePool = createPool(
        clamp(state.tissue.glucoseMmolL / 5, 0.05, 2.5),
        clamp(state.tissue.oxygenMmHg / 40, 0.02, 1.6),
        clamp(macro.nutrients.fattyAcids / 0.4, 0.05, 3),
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

    const oxygenFactor = clamp((state.tissue.oxygenMmHg - 5) / 35, 0, 1.3);
    const atpConsumptionRate = 0.0098 * metabolicDemand
        + routine.atp
        + Math.max(0, 7.2 - state.cell.pH) * 0.02;
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
        hyperglycemia + hypoxia + routine.ros + redoxPressure * 0.004;
    const rosClearance = 0.0115 * clamp(state.damage.antioxidantCapacity / 80, 0.15, 1.2);
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

    return state;
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
        state.routine = createRoutine(state);
        state.nextRoutineAt += 55;
        state.lastEvent = state.routine.title;
        events.push({
            message: state.routine.title,
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

    return { state, events };
}

function actionFailure(state: CellularState, reason: string): CellularActionResult {
    return { state, ok: false, reason };
}

export function captureSubstrate(state: CellularState, kind: SubstrateKind): CellularActionResult {
    const next = cloneState(state);
    const previousCollection = state.collection ?? createInitialCollectionProgress();
    const amounts: SubstratePool = createPool(1, 3, 0.5, 0.5);
    const amount = amounts[kind];
    if (next.pools.available[kind] < amount) {
        return actionFailure(state, 'Oferta no LEC insuficiente; melhore a perfusão e aguarde a entrega capilar.');
    }
    if (next.pools.captured[kind] + amount > CAPTURED_POOL_CAPS[kind]) {
        return actionFailure(state, 'Pool intracelular saturado; processe o substrato antes de captar mais.');
    }

    next.pools.available[kind] -= amount;
    next.pools.captured[kind] += amount;
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
    next.lastEvent = `${labels[kind]} · cadeia ${next.collection.chain} · +${10 + Math.max(0, next.collection.chain - 1) * 2 + (wasPriority ? 8 : 0)} pontos`;
    return {
        state: next,
        ok: true,
        event: { message: labels[kind], severity: 'info', affectedSystems: ['cellular-transport'] },
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

    const baseYield = isPyruvate ? PYRUVATE_ATP_YIELD : FATTY_ACID_ATP_YIELD;
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
