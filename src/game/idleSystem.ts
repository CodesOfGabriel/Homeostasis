// Idle/Incremental Game System for Homeostasis
// Inspired by Adventure Capitalist with physiological mechanics

export interface OrganGenerator {
    id: string;
    name: string;
    icon: string;
    level: number;
    baseProduction: number; // ATP per second at level 1
    cost: number; // Current upgrade cost
    baseCost: number; // Initial cost
    costMultiplier: number; // Cost increases by this factor
    productionMultiplier: number; // Production increases by this %
    owned: boolean;
    automated: boolean; // Has manager
    lastCollected: number; // Timestamp
}

export interface Manager {
    id: string;
    name: string;
    organId: string;
    cost: number; // Hormone cost
    bonus: number; // % bonus production
    description: string;
    unlocked: boolean;
}

export interface GlobalUpgrade {
    id: string;
    name: string;
    description: string;
    cost: number;
    currency: 'atp' | 'hormones' | 'experience';
    multiplier: number;
    purchased: boolean;
    icon: string;
}

export interface PrestigeData {
    level: number;
    stemCells: number; // Prestige currency
    totalATPEarned: number;
    permanentMultiplier: number;
}

export interface GameState {
    // Currencies
    atp: number;
    hormones: number;
    experience: number;

    // Statistics
    totalATPEarned: number;
    totalATPSpent: number;
    atpPerSecond: number;

    // Generators
    organs: Record<string, OrganGenerator>;
    managers: Record<string, Manager>;
    upgrades: Record<string, GlobalUpgrade>;

    // Prestige
    prestige: PrestigeData;

    // Meta
    startTime: number;
    lastUpdate: number;
    offlineTime: number;
}

// Initial organ generators
export const INITIAL_ORGANS: Record<string, OrganGenerator> = {
    heart: {
        id: 'heart',
        name: 'Coração',
        icon: '🫀',
        level: 1,
        baseProduction: 10,
        cost: 50,
        baseCost: 50,
        costMultiplier: 1.15,
        productionMultiplier: 1.05,
        owned: true,
        automated: false,
        lastCollected: Date.now()
    },
    lungs: {
        id: 'lungs',
        name: 'Pulmões',
        icon: '🫁',
        level: 0,
        baseProduction: 15,
        cost: 100,
        baseCost: 100,
        costMultiplier: 1.15,
        productionMultiplier: 1.07,
        owned: false,
        automated: false,
        lastCollected: Date.now()
    },
    liver: {
        id: 'liver',
        name: 'Fígado',
        icon: '🟤',
        level: 0,
        baseProduction: 20,
        cost: 500,
        baseCost: 500,
        costMultiplier: 1.15,
        productionMultiplier: 1.10,
        owned: false,
        automated: false,
        lastCollected: Date.now()
    },
    brain: {
        id: 'brain',
        name: 'Cérebro',
        icon: '🧠',
        level: 0,
        baseProduction: 2, // Generates hormones instead
        cost: 1000,
        baseCost: 1000,
        costMultiplier: 1.20,
        productionMultiplier: 1.15,
        owned: false,
        automated: false,
        lastCollected: Date.now()
    },
    kidneys: {
        id: 'kidneys',
        name: 'Rins',
        icon: '🫘',
        level: 0,
        baseProduction: 12,
        cost: 2500,
        baseCost: 2500,
        costMultiplier: 1.15,
        productionMultiplier: 1.06,
        owned: false,
        automated: false,
        lastCollected: Date.now()
    },
    stomach: {
        id: 'stomach',
        name: 'Estômago',
        icon: '🟡',
        level: 0,
        baseProduction: 8,
        cost: 150,
        baseCost: 150,
        costMultiplier: 1.15,
        productionMultiplier: 1.04,
        owned: false,
        automated: false,
        lastCollected: Date.now()
    }
};

// Manager definitions
export const MANAGERS: Record<string, Manager> = {
    autonomicNervous: {
        id: 'autonomicNervous',
        name: 'Sistema Nervoso Autônomo',
        organId: 'heart',
        cost: 100,
        bonus: 10,
        description: 'Automatiza Coração e Pulmões (+10% produção)',
        unlocked: false
    },
    endocrineSystem: {
        id: 'endocrineSystem',
        name: 'Sistema Endócrino',
        organId: 'liver',
        cost: 250,
        bonus: 15,
        description: 'Automatiza Fígado e balanceia metabolismo (+15% global)',
        unlocked: false
    },
    renalSystem: {
        id: 'renalSystem',
        name: 'Sistema Renal',
        organId: 'kidneys',
        cost: 180,
        bonus: 20,
        description: 'Automatiza Rins e remove debuffs (+20% eficiência)',
        unlocked: false
    },
    homeostasisMaster: {
        id: 'homeostasisMaster',
        name: 'Homeostase Master',
        organId: 'all',
        cost: 500,
        bonus: 50,
        description: 'Automatiza TODOS os órgãos (+50% produção offline)',
        unlocked: false
    }
};

// Global upgrades
export const GLOBAL_UPGRADES: Record<string, GlobalUpgrade> = {
    efficientMitochondria: {
        id: 'efficientMitochondria',
        name: 'Mitocôndrias Eficientes',
        description: '+25% ATP de todos os órgãos',
        cost: 5000,
        currency: 'atp',
        multiplier: 1.25,
        purchased: false,
        icon: '⚡'
    },
    krebsCycle: {
        id: 'krebsCycle',
        name: 'Ciclo de Krebs Otimizado',
        description: '+50% produção aeróbica',
        cost: 25000,
        currency: 'atp',
        multiplier: 1.50,
        purchased: false,
        icon: '🔄'
    },
    atpSynthase: {
        id: 'atpSynthase',
        name: 'ATP Sintase Turbo',
        description: '2x velocidade de geração',
        cost: 100000,
        currency: 'atp',
        multiplier: 2.0,
        purchased: false,
        icon: '⚡⚡'
    },
    hpaAxis: {
        id: 'hpaAxis',
        name: 'Eixo HPA Calibrado',
        description: 'Stress vira produtividade (+30%)',
        cost: 50,
        currency: 'hormones',
        multiplier: 1.30,
        purchased: false,
        icon: '🧬'
    },
    thyroxineBoost: {
        id: 'thyroxineBoost',
        name: 'Tiroxina Boost',
        description: '+100% metabolismo basal',
        cost: 100,
        currency: 'hormones',
        multiplier: 2.0,
        purchased: false,
        icon: '🔥'
    },
    cellularAdaptation: {
        id: 'cellularAdaptation',
        name: 'Adaptação Celular',
        description: 'Órgãos evoluem automaticamente',
        cost: 1000,
        currency: 'experience',
        multiplier: 1.5,
        purchased: false,
        icon: '🧬'
    }
};

// Calculate production for an organ
export function calculateOrganProduction(organ: OrganGenerator, globalMultipliers: number = 1): number {
    if (!organ.owned || organ.level === 0) return 0;

    const baseProduction = organ.baseProduction;
    const levelMultiplier = Math.pow(organ.productionMultiplier, organ.level - 1);

    return baseProduction * levelMultiplier * globalMultipliers;
}

// Calculate upgrade cost
export function calculateUpgradeCost(organ: OrganGenerator): number {
    return Math.floor(organ.baseCost * Math.pow(organ.costMultiplier, organ.level));
}

// Calculate total ATP per second
export function calculateTotalATPPerSecond(state: GameState): number {
    let total = 0;
    const globalMultiplier = calculateGlobalMultiplier(state);

    Object.values(state.organs).forEach(organ => {
        if (organ.id === 'brain') return; // Brain generates hormones
        total += calculateOrganProduction(organ, globalMultiplier);
    });

    return total * state.prestige.permanentMultiplier;
}

// Calculate global multiplier from upgrades
export function calculateGlobalMultiplier(state: GameState): number {
    let multiplier = 1;

    Object.values(state.upgrades).forEach(upgrade => {
        if (upgrade.purchased) {
            multiplier *= upgrade.multiplier;
        }
    });

    return multiplier;
}

// Process offline earnings
export function processOfflineEarnings(state: GameState): number {
    const now = Date.now();
    const offlineTime = (now - state.lastUpdate) / 1000; // seconds

    if (offlineTime < 60) return 0; // Less than 1 minute, ignore

    // Cap offline time at 24 hours
    const cappedTime = Math.min(offlineTime, 24 * 60 * 60);

    // Offline production is reduced (50% for non-automated, 100% for automated)
    let offlineProduction = 0;
    const globalMultiplier = calculateGlobalMultiplier(state);

    Object.values(state.organs).forEach(organ => {
        if (!organ.owned) return;

        const production = calculateOrganProduction(organ, globalMultiplier);
        const efficiency = organ.automated ? 1.0 : 0.5; // 100% if automated, 50% if manual

        offlineProduction += production * cappedTime * efficiency;
    });

    return offlineProduction * state.prestige.permanentMultiplier;
}

// Check if can prestige
export function canPrestige(state: GameState): boolean {
    const milestone = 1000000; // 1 million ATP
    return state.totalATPEarned >= milestone * Math.pow(10, state.prestige.level);
}

// Calculate prestige reward
export function calculatePrestigeReward(state: GameState): number {
    const milestone = 1000000;
    const excess = state.totalATPEarned / (milestone * Math.pow(10, state.prestige.level));
    return Math.floor(Math.log10(excess) * 10);
}

// Create initial game state
export function createInitialGameState(): GameState {
    return {
        atp: 0,
        hormones: 0,
        experience: 0,
        totalATPEarned: 0,
        totalATPSpent: 0,
        atpPerSecond: 0,
        organs: { ...INITIAL_ORGANS },
        managers: { ...MANAGERS },
        upgrades: { ...GLOBAL_UPGRADES },
        prestige: {
            level: 0,
            stemCells: 0,
            totalATPEarned: 0,
            permanentMultiplier: 1
        },
        startTime: Date.now(),
        lastUpdate: Date.now(),
        offlineTime: 0
    };
}

// Format large numbers (1000 → 1K, 1000000 → 1M, etc)
export function formatNumber(num: number): string {
    if (num < 1000) return num.toFixed(0);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';
    return (num / 1000000000000).toFixed(1) + 'T';
}

// Format time (seconds to human readable)
export function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}
