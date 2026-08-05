/**
 * Estado da microcirculação e de um voxel de tecido metabolicamente ativo.
 * Concentrações usam unidades clínicas; os pools clicáveis são pacotes
 * normalizados de fluxo para manter a interação legível.
 */

import type { HormoneActionId } from './config/hormones';
import type { CentralRegulatorySignalId } from './centralRegulation';
import type { ScenarioNarrativeState } from './scenarioNarrative';

export type SubstrateKind = 'glucose' | 'oxygen' | 'fattyAcid' | 'aminoAcid';
export type OxidationSubstrate = 'pyruvate' | 'fattyAcid';
export type RepairTarget = 'membrane' | 'proteins' | 'dna' | 'antioxidants';
export type AutomationKind = 'transporters' | 'mitochondrialShuttle' | 'repair';
export type AtpAllocationTarget = 'ionPumps' | 'repair' | 'biosynthesis';
export type CellularAdaptationKind = 'enzymaticEfficiency' | 'antioxidantDefense' | 'metabolicFlexibility' | 'bufferCapacity' | 'hypoxiaTolerance';
export type SimulationDifficulty = 'easy' | 'hard';

export interface TissueEnvironment {
    perfusionPercent: number;
    oxygenMmHg: number;
    carbonDioxideMmHg: number;
    glucoseMmolL: number;
    lactateMmolL: number;
    pH: number;
    osmolarity: number;
    sodium: number;
    potassium: number;
    wasteLoad: number;
}

export interface IntracellularEnvironment {
    pH: number;
    osmolarity: number;
    volumePercent: number;
    membranePotentialMv: number;
    sodium: number;
    potassium: number;
    calciumNm: number;
    atpMmolL: number;
    adpMmolL: number;
    nadhPercent: number;
    viabilityPercent: number;
}

export interface MitochondrialState {
    membranePotentialMv: number;
    etcFluxPercent: number;
    atpSynthaseFlux: number;
    oxygenConsumption: number;
    healthPercent: number;
    processing: MitochondrialProcessing;
}

export interface MitochondrialProcessing {
    pyruvatePerMin: number;
    fattyAcidPerMin: number;
    nadhPerMin: number;
    fadh2PerMin: number;
    oxygenPerMin: number;
    protonsPerMin: number;
    adpPerMin: number;
    atpPerMin: number;
    waterPerMin: number;
}

export type SubstratePool = Record<SubstrateKind, number>;

export interface CellularPools {
    available: SubstratePool;
    captured: SubstratePool;
    pyruvate: number;
}

export interface CellularDamage {
    oxidativeStress: number;
    membrane: number;
    proteins: number;
    dna: number;
    antioxidantCapacity: number;
}

export interface CellularCollectionProgress {
    score: number;
    chain: number;
    lastCaptureAt: number;
    lastKind: SubstrateKind | null;
    priorityCaptures: number;
}

export type CellularAdaptations = Record<CellularAdaptationKind, number>;

export interface CellularRewardProgress {
    homeostasisSeconds: number;
    rosControlSeconds: number;
    balancedFuelSeconds: number;
    phStableSeconds: number;
    hypoxiaStableSeconds: number;
    lastOpportunityAt: number;
}

export interface CellularRoutineEvent {
    id: string;
    title: string;
    description: string;
    explanation: string;
    triggerReason: string;
    category: 'organ' | 'cell' | 'molecule';
    choices: CellularRoutineChoice[];
    remainingSeconds: number;
    severity: 'info' | 'warning' | 'critical';
}

export interface CellularRoutineChoice {
    id: string;
    label: string;
    description: string;
    tradeoff: string;
    requirements: DecisionResourceRequirement[];
    signalRequirements?: DecisionSignalRequirement[];
}

export type DecisionResource = 'atp' | 'glucose' | 'oxygen' | 'fattyAcid' | 'aminoAcid' | 'pyruvate' | 'antioxidants';

export interface DecisionResourceRequirement {
    resource: DecisionResource;
    minimum: number;
    cost: number;
}

export type DecisionSignalId =
    | `hormone:${HormoneActionId}`
    | `central:${CentralRegulatorySignalId}`;

export interface DecisionSignalRequirement {
    /** Um dos sinais listados é suficiente para cumprir este requisito. */
    anyOf: DecisionSignalId[];
    label: string;
}

export type RoutineDecisionOutcome = 'adaptive' | 'partial' | 'harmful';

export interface CellularFateState {
    status: 'homeostasis' | 'stress' | 'apoptosis' | 'necrosis';
    apoptoticCommitment: number;
    infectionSusceptibility: number;
    lastTransition: string;
}

export interface CellularState {
    tissue: TissueEnvironment;
    cell: IntracellularEnvironment;
    mitochondria: MitochondrialState;
    pools: CellularPools;
    transportSaturation: SubstratePool;
    damage: CellularDamage;
    fate: CellularFateState;
    collection: CellularCollectionProgress;
    adaptations: CellularAdaptations;
    rewards: CellularRewardProgress;
    automation: Record<AutomationKind, number>;
    atpAllocation: Record<AtpAllocationTarget, number>;
    routine: CellularRoutineEvent | null;
    totalAtpProduced: number;
    totalAtpSpent: number;
    lastEvent: string;
    nextRoutineAt: number;
    scenarioCooldowns: Record<string, number>;
    narrative: ScenarioNarrativeState;
    simulationTime: number;
}

export interface CellularControls {
    heartRateTarget: number;
    ventilationDrive: number;
    renalWaterReabsorption: number;
    pendingWaterMl: number;
    difficulty?: SimulationDifficulty;
    adaptationOpportunityActive?: boolean;
}

export interface CellularEvent {
    message: string;
    severity: 'info' | 'warning' | 'critical';
    affectedSystems: string[];
}

export interface CellularTickResult {
    state: CellularState;
    events: CellularEvent[];
}

export interface CellularActionResult {
    state: CellularState;
    ok: boolean;
    reason?: string;
    event?: CellularEvent;
    scenarioId?: string;
}

export interface AutomationRecipe {
    atp: number;
    substrates: Partial<SubstratePool>;
}
