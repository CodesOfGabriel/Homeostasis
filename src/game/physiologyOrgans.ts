// Órgãos Fisiológicos - Sistema v2.0
// Cada órgão possui capacidade, eficiência e custo de ATP real

export interface PhysiologicalOrgan {
    id: string;
    name: string;
    icon: string;

    // Capacidade Funcional
    capacity: number;           // 0-100 (output máximo do órgão)
    efficiency: number;         // 0-100 (quanto ATP gasta por unidade de trabalho)
    robustness: number;         // 0-100 (resistência a estresse fisiológico)

    // Custos e Outputs
    baseAtpConsumption: number; // mmol/s (custo basal em repouso)
    maxAtpConsumption: number;  // mmol/s (custo sob estresse máximo)
    currentOutput: number;      // unidade específica do órgão

    // Adaptações Disponíveis
    hypertrophyLevel: number;   // 0-10 (aumenta capacity, aumenta custo)
    efficiencyLevel: number;    // 0-10 (reduz custo basal)

    // Estado de Saúde
    health: number;             // 0-100 (saúde atual)
    damage: number;             // 0-100 (dano acumulado)
    inflammation: number;       // 0-100 (inflamação local)

    // Requisitos para Hipertrofia (Crescimento)
    hypertrophyRequirements: {
        biomass: number;          // custo em biomassa (g)
        hormones: string[];       // hormônios necessários
        chronicUse: number;       // horas de uso contínuo necessárias
    };

    // Requisitos para Eficiência (Otimização)
    efficiencyRequirements: {
        micronutrients: number;   // vitaminas/minerais necessários
        time: number;             // tempo de adaptação (horas)
        restTime: number;         // tempo de descanso necessário (horas)
    };
}

export const PHYSIOLOGICAL_ORGANS: Record<string, PhysiologicalOrgan> = {
    heart: {
        id: 'heart',
        name: 'Coração',
        icon: '🫀',
        capacity: 70,           // DC = 5L/min base (70% do máximo)
        efficiency: 50,         // eficiência média
        robustness: 60,         // resistência moderada
        baseAtpConsumption: 10, // mmol/s
        maxAtpConsumption: 30,  // sob esforço máximo
        currentOutput: 5.0,     // L/min (débito cardíaco)
        hypertrophyLevel: 0,
        efficiencyLevel: 0,
        health: 100,
        damage: 0,
        inflammation: 5,
        hypertrophyRequirements: {
            biomass: 100,         // 100g de proteína
            hormones: ['growthHormone', 'testosterone'],
            chronicUse: 20        // 20h de exercício contínuo
        },
        efficiencyRequirements: {
            micronutrients: 50,   // 50 pontos de micro
            time: 72,             // 3 dias de adaptação
            restTime: 8           // 8h de sono
        }
    },

    lungs: {
        id: 'lungs',
        name: 'Pulmões',
        icon: '🫁',
        capacity: 75,
        efficiency: 60,
        robustness: 50,
        baseAtpConsumption: 5,  // mmol/s
        maxAtpConsumption: 20,
        currentOutput: 7.0,     // L/min (ventilação)
        hypertrophyLevel: 0,
        efficiencyLevel: 0,
        health: 100,
        damage: 0,
        inflammation: 3,
        hypertrophyRequirements: {
            biomass: 80,
            hormones: ['growthHormone'],
            chronicUse: 15
        },
        efficiencyRequirements: {
            micronutrients: 40,
            time: 48,
            restTime: 6
        }
    },

    liver: {
        id: 'liver',
        name: 'Fígado',
        icon: '🪼',
        capacity: 80,
        efficiency: 55,
        robustness: 70,         // fígado é muito robusto (regeneração)
        baseAtpConsumption: 15, // mmol/s (órgão metabolicamente ativo)
        maxAtpConsumption: 40,
        currentOutput: 1.0,     // unidade arbitrária (função hepática)
        hypertrophyLevel: 0,
        efficiencyLevel: 0,
        health: 100,
        damage: 0,
        inflammation: 10,       // pode ter inflamação baseline
        hypertrophyRequirements: {
            biomass: 150,
            hormones: ['growthHormone', 'insulin'],
            chronicUse: 30        // uso metabólico crônico
        },
        efficiencyRequirements: {
            micronutrients: 60,
            time: 96,             // 4 dias (fígado adapta lento)
            restTime: 10
        }
    },

    kidneys: {
        id: 'kidneys',
        name: 'Rins',
        icon: '🫘',
        capacity: 85,
        efficiency: 65,
        robustness: 55,
        baseAtpConsumption: 12, // mmol/s (filtração ativa)
        maxAtpConsumption: 25,
        currentOutput: 120,     // mL/min (GFR)
        hypertrophyLevel: 0,
        efficiencyLevel: 0,
        health: 100,
        damage: 0,
        inflammation: 5,
        hypertrophyRequirements: {
            biomass: 120,
            hormones: ['growthHormone'],
            chronicUse: 25
        },
        efficiencyRequirements: {
            micronutrients: 55,
            time: 72,
            restTime: 8
        }
    },

    brain: {
        id: 'brain',
        name: 'Cérebro',
        icon: '🧠',
        capacity: 90,
        efficiency: 40,         // cérebro é pouco eficiente (20% do ATP total)
        robustness: 30,         // muito sensível a hipóxia
        baseAtpConsumption: 20, // mmol/s (sempre alto)
        maxAtpConsumption: 25,  // não varia muito
        currentOutput: 1.0,     // função cognitiva (arbitrário)
        hypertrophyLevel: 0,
        efficiencyLevel: 0,
        health: 100,
        damage: 0,
        inflammation: 2,
        hypertrophyRequirements: {
            biomass: 0,           // cérebro não hipertrofia (plasticidade neural)
            hormones: [],
            chronicUse: 0
        },
        efficiencyRequirements: {
            micronutrients: 70,   // precisa muito de vitaminas B, omega-3
            time: 168,            // 1 semana (neuroplasticidade é lenta)
            restTime: 12          // precisa muito descanso
        }
    },

    muscles: {
        id: 'muscles',
        name: 'Músculos',
        icon: '💪',
        capacity: 60,
        efficiency: 45,
        robustness: 80,         // músculos aguentam muito
        baseAtpConsumption: 8,  // mmol/s (em repouso)
        maxAtpConsumption: 60,  // sob exercício intenso
        currentOutput: 1.0,     // força/resistência (arbitrário)
        hypertrophyLevel: 0,
        efficiencyLevel: 0,
        health: 100,
        damage: 0,
        inflammation: 8,        // inflamação pós-treino é normal
        hypertrophyRequirements: {
            biomass: 200,         // músculos precisam muita proteína
            hormones: ['testosterone', 'growthHormone', 'insulin'],
            chronicUse: 40        // precisa treinar muito
        },
        efficiencyRequirements: {
            micronutrients: 45,
            time: 36,             // músculos adaptam rápido
            restTime: 6
        }
    }
};

// Helper: Calcular custo total de ATP de todos os órgãos
export function calculateTotalOrganATPCost(organs: Record<string, PhysiologicalOrgan>): number {
    let totalCost = 0;

    Object.values(organs).forEach(organ => {
        const basalCost = organ.baseAtpConsumption;

        // Hipertrofia aumenta custo (+15% por nível)
        const hypertrophyPenalty = 1 + (organ.hypertrophyLevel * 0.15);

        // Eficiência reduz custo (-5% por nível)
        const efficiencyBonus = 1 - (organ.efficiencyLevel * 0.05);

        // Dano aumenta custo (órgão danificado é menos eficiente)
        const damagePenalty = 1 + ((organ.damage / 100) * 0.3);

        const organCost = basalCost * hypertrophyPenalty * efficiencyBonus * damagePenalty;
        totalCost += organCost;
    });

    return totalCost;
}

// Helper: Aplicar dano a órgãos (quando falta ATP)
export function applyDamageToOrgans(
    organs: Record<string, PhysiologicalOrgan>,
    damageAmount: number
): Record<string, PhysiologicalOrgan> {
    const newOrgans = { ...organs };

    // Distribuir dano proporcionalmente à robustez (órgãos fracos sofrem mais)
    Object.keys(newOrgans).forEach(organId => {
        const organ = newOrgans[organId];
        const vulnerabilityFactor = 1 - (organ.robustness / 100);
        const organDamage = damageAmount * (1 + vulnerabilityFactor);

        newOrgans[organId] = {
            ...organ,
            health: Math.max(0, organ.health - organDamage),
            damage: Math.min(100, organ.damage + organDamage)
        };
    });

    return newOrgans;
}

// Helper: Curar órgãos ao longo do tempo (regeneração)
export function regenerateOrgans(
    organs: Record<string, PhysiologicalOrgan>,
    deltaTime: number,
    homeostasisScore: number
): Record<string, PhysiologicalOrgan> {
    const newOrgans = { ...organs };

    // Regeneração só acontece com homeostase alta
    if (homeostasisScore < 60) return organs;

    const regenerationRate = (homeostasisScore - 60) / 100; // 0-0.4 por segundo

    Object.keys(newOrgans).forEach(organId => {
        const organ = newOrgans[organId];

        // Curar dano
        const healAmount = regenerationRate * deltaTime * organ.robustness / 100;

        newOrgans[organId] = {
            ...organ,
            health: Math.min(100, organ.health + healAmount),
            damage: Math.max(0, organ.damage - healAmount),
            inflammation: Math.max(0, organ.inflammation - (healAmount * 0.5))
        };
    });

    return newOrgans;
}
