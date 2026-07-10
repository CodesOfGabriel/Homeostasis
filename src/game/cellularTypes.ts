/**
 * Estado da microcirculação e de um voxel de tecido metabolicamente ativo.
 * Concentrações usam unidades clínicas; os pools clicáveis são pacotes
 * normalizados de fluxo para manter a interação legível.
 */

export type SubstrateKind = 'glucose' | 'oxygen' | 'fattyAcid' | 'aminoAcid';
export type OxidationSubstrate = 'pyruvate' | 'fattyAcid';
export type RepairTarget = 'membrane' | 'proteins' | 'dna' | 'antioxidants';
export type AutomationKind = 'transporters' | 'mitochondrialShuttle' | 'repair';
export type AtpAllocationTarget = 'ionPumps' | 'repair' | 'biosynthesis';

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

export interface CellularRoutineEvent {
    id: string;
    title: string;
    description: string;
    remainingSeconds: number;
    severity: 'info' | 'warning' | 'critical';
}

export interface CellularState {
    tissue: TissueEnvironment;
    cell: IntracellularEnvironment;
    mitochondria: MitochondrialState;
    pools: CellularPools;
    damage: CellularDamage;
    automation: Record<AutomationKind, number>;
    atpAllocation: Record<AtpAllocationTarget, number>;
    routine: CellularRoutineEvent | null;
    totalAtpProduced: number;
    totalAtpSpent: number;
    lastEvent: string;
    nextRoutineAt: number;
    simulationTime: number;
}

export interface CellularControls {
    heartRateTarget: number;
    ventilationDrive: number;
    renalWaterReabsorption: number;
    pendingWaterMl: number;
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
}
