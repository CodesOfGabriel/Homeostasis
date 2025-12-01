// Sistema de Conquistas/Achievements
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'production' | 'organs' | 'mastery' | 'prestige' | 'speed';
    requirement: number;
    reward: {
        type: 'experience' | 'hormones' | 'multiplier';
        amount: number;
    };
    unlocked: boolean;
    progress: number;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
    // Production Achievements
    firstThousand: {
        id: 'firstThousand',
        name: 'Primeiros Passos',
        description: 'Gere 1.000 ATP total',
        icon: '🌟',
        category: 'production',
        requirement: 1000,
        reward: { type: 'experience', amount: 10 },
        unlocked: false,
        progress: 0
    },
    hundredK: {
        id: 'hundredK',
        name: 'Metabolismo Ativo',
        description: 'Gere 100.000 ATP total',
        icon: '⚡',
        category: 'production',
        requirement: 100000,
        reward: { type: 'experience', amount: 50 },
        unlocked: false,
        progress: 0
    },
    oneMillion: {
        id: 'oneMillion',
        name: 'Energia Abundante',
        description: 'Gere 1.000.000 ATP total',
        icon: '💫',
        category: 'production',
        requirement: 1000000,
        reward: { type: 'hormones', amount: 50 },
        unlocked: false,
        progress: 0
    },
    oneBillion: {
        id: 'oneBillion',
        name: 'Usina Nuclear',
        description: 'Gere 1.000.000.000 ATP total',
        icon: '☢️',
        category: 'production',
        requirement: 1000000000,
        reward: { type: 'hormones', amount: 200 },
        unlocked: false,
        progress: 0
    },

    // Organ Achievements
    firstOrgan: {
        id: 'firstOrgan',
        name: 'Corpo em Formação',
        description: 'Desbloqueie seu primeiro órgão adicional',
        icon: '🫀',
        category: 'organs',
        requirement: 1,
        reward: { type: 'experience', amount: 20 },
        unlocked: false,
        progress: 0
    },
    allOrgans: {
        id: 'allOrgans',
        name: 'Sistema Completo',
        description: 'Desbloqueie todos os 6 órgãos',
        icon: '🧬',
        category: 'organs',
        requirement: 6,
        reward: { type: 'hormones', amount: 100 },
        unlocked: false,
        progress: 0
    },
    organLevel10: {
        id: 'organLevel10',
        name: 'Especialista',
        description: 'Evolua qualquer órgão para nível 10',
        icon: '📈',
        category: 'organs',
        requirement: 10,
        reward: { type: 'experience', amount: 30 },
        unlocked: false,
        progress: 0
    },
    organLevel50: {
        id: 'organLevel50',
        name: 'Mestre Fisiológico',
        description: 'Evolua qualquer órgão para nível 50',
        icon: '🏆',
        category: 'organs',
        requirement: 50,
        reward: { type: 'hormones', amount: 150 },
        unlocked: false,
        progress: 0
    },

    // Mastery Achievements
    firstManager: {
        id: 'firstManager',
        name: 'Delegação Inteligente',
        description: 'Contrate seu primeiro gerente',
        icon: '👨‍💼',
        category: 'mastery',
        requirement: 1,
        reward: { type: 'experience', amount: 40 },
        unlocked: false,
        progress: 0
    },
    allManagers: {
        id: 'allManagers',
        name: 'Homeostase Perfeita',
        description: 'Contrate todos os 4 gerentes',
        icon: '🎯',
        category: 'mastery',
        requirement: 4,
        reward: { type: 'multiplier', amount: 1.1 },
        unlocked: false,
        progress: 0
    },
    firstUpgrade: {
        id: 'firstUpgrade',
        name: 'Evolução Celular',
        description: 'Compre seu primeiro upgrade global',
        icon: '🔬',
        category: 'mastery',
        requirement: 1,
        reward: { type: 'experience', amount: 30 },
        unlocked: false,
        progress: 0
    },
    allUpgrades: {
        id: 'allUpgrades',
        name: 'Maximização Metabólica',
        description: 'Compre todos os upgrades globais',
        icon: '💎',
        category: 'mastery',
        requirement: 6,
        reward: { type: 'multiplier', amount: 1.25 },
        unlocked: false,
        progress: 0
    },

    // Prestige Achievements
    firstPrestige: {
        id: 'firstPrestige',
        name: 'Renascimento',
        description: 'Complete sua primeira Reencarnação Celular',
        icon: '🧬',
        category: 'prestige',
        requirement: 1,
        reward: { type: 'multiplier', amount: 1.05 },
        unlocked: false,
        progress: 0
    },
    prestige5: {
        id: 'prestige5',
        name: 'Ciclo Evolutivo',
        description: 'Complete 5 Reencarnações Celulares',
        icon: '🔄',
        category: 'prestige',
        requirement: 5,
        reward: { type: 'multiplier', amount: 1.15 },
        unlocked: false,
        progress: 0
    },
    prestige10: {
        id: 'prestige10',
        name: 'Imortalidade Celular',
        description: 'Complete 10 Reencarnações Celulares',
        icon: '♾️',
        category: 'prestige',
        requirement: 10,
        reward: { type: 'multiplier', amount: 1.50 },
        unlocked: false,
        progress: 0
    },

    // Speed Achievements
    fast100k: {
        id: 'fast100k',
        name: 'Metabolismo Rápido',
        description: 'Atinja 100 ATP/s de produção',
        icon: '⚡',
        category: 'speed',
        requirement: 100,
        reward: { type: 'hormones', amount: 25 },
        unlocked: false,
        progress: 0
    },
    fast1M: {
        id: 'fast1M',
        name: 'Hiperatividade Celular',
        description: 'Atinja 1.000 ATP/s de produção',
        icon: '🚀',
        category: 'speed',
        requirement: 1000,
        reward: { type: 'hormones', amount: 100 },
        unlocked: false,
        progress: 0
    }
};

export function checkAchievements(
    totalATP: number,
    organsOwned: number,
    maxOrganLevel: number,
    managersHired: number,
    upgradesPurchased: number,
    prestigeLevel: number,
    atpPerSecond: number,
    currentAchievements: Record<string, Achievement>
): { newUnlocks: Achievement[]; updatedAchievements: Record<string, Achievement> } {
    const updatedAchievements = { ...currentAchievements };
    const newUnlocks: Achievement[] = [];

    // Check each achievement
    Object.values(updatedAchievements).forEach(achievement => {
        if (achievement.unlocked) return;

        let currentProgress = 0;
        let shouldUnlock = false;

        switch (achievement.category) {
            case 'production':
                currentProgress = totalATP;
                shouldUnlock = totalATP >= achievement.requirement;
                break;
            case 'organs':
                if (achievement.id === 'firstOrgan' || achievement.id === 'allOrgans') {
                    currentProgress = organsOwned;
                    shouldUnlock = organsOwned >= achievement.requirement;
                } else {
                    currentProgress = maxOrganLevel;
                    shouldUnlock = maxOrganLevel >= achievement.requirement;
                }
                break;
            case 'mastery':
                if (achievement.id === 'firstManager' || achievement.id === 'allManagers') {
                    currentProgress = managersHired;
                    shouldUnlock = managersHired >= achievement.requirement;
                } else {
                    currentProgress = upgradesPurchased;
                    shouldUnlock = upgradesPurchased >= achievement.requirement;
                }
                break;
            case 'prestige':
                currentProgress = prestigeLevel;
                shouldUnlock = prestigeLevel >= achievement.requirement;
                break;
            case 'speed':
                currentProgress = atpPerSecond;
                shouldUnlock = atpPerSecond >= achievement.requirement;
                break;
        }

        achievement.progress = currentProgress;

        if (shouldUnlock) {
            achievement.unlocked = true;
            newUnlocks.push(achievement);
        }
    });

    return { newUnlocks, updatedAchievements };
}
