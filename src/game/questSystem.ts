// Quest System - Missões e objetivos diários
import { GameState } from './idleSystem';
import { Physiology } from './physiology';

export enum QuestDifficulty {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard'
}

export enum QuestType {
    HOMEOSTASIS = 'homeostasis',
    PRODUCTION = 'production',
    UPGRADE = 'upgrade',
    SURVIVAL = 'survival'
}

export interface QuestObjective {
    description: string;
    current: number;
    target: number;
    completed: boolean;
}

export interface QuestReward {
    homeostasisPoints?: number;
    atp?: number;
    hormones?: number;
    experience?: number;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    type: QuestType;
    difficulty: QuestDifficulty;
    objectives: QuestObjective[];
    rewards: QuestReward;
    progress: number; // 0-100
    completed: boolean;
    claimed: boolean;
    expiresAt?: number; // timestamp for daily quests
    unlocked: boolean;
}

// Daily Quests (refresh every 24h)
export const DAILY_QUESTS: Quest[] = [
    {
        id: 'daily_homeostasis_1',
        title: '⚖️ Equilíbrio Perfeito',
        description: 'Mantenha homeostase acima de 80 por 5 minutos',
        type: QuestType.HOMEOSTASIS,
        difficulty: QuestDifficulty.EASY,
        objectives: [
            {
                description: 'Tempo em homeostase alta',
                current: 0,
                target: 300, // 300 segundos = 5 minutos
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 100,
            experience: 50
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: true
    },
    {
        id: 'daily_production_1',
        title: '⚡ Produtor Eficiente',
        description: 'Gere 10.000 ATP',
        type: QuestType.PRODUCTION,
        difficulty: QuestDifficulty.EASY,
        objectives: [
            {
                description: 'ATP gerado',
                current: 0,
                target: 10000,
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 75,
            hormones: 10
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: true
    },
    {
        id: 'daily_upgrade_1',
        title: '📈 Evolução Constante',
        description: 'Melhore qualquer órgão 3 vezes',
        type: QuestType.UPGRADE,
        difficulty: QuestDifficulty.MEDIUM,
        objectives: [
            {
                description: 'Upgrades realizados',
                current: 0,
                target: 3,
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 150,
            experience: 100
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: true
    },
    {
        id: 'daily_survival_1',
        title: '💪 Sobrevivente',
        description: 'Mantenha carga alostática abaixo de 30',
        type: QuestType.SURVIVAL,
        difficulty: QuestDifficulty.MEDIUM,
        objectives: [
            {
                description: 'Tempo com baixa carga',
                current: 0,
                target: 600, // 10 minutos
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 200,
            atp: 5000
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: true
    }
];

// Main Story Quests (unlock progressively)
export const STORY_QUESTS: Quest[] = [
    {
        id: 'story_first_hp',
        title: '🌟 Primeiro Equilíbrio',
        description: 'Ganhe seu primeiro Ponto de Homeostase',
        type: QuestType.HOMEOSTASIS,
        difficulty: QuestDifficulty.EASY,
        objectives: [
            {
                description: 'Ganhar 1 HP',
                current: 0,
                target: 1,
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 50,
            experience: 25
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: true
    },
    {
        id: 'story_100_hp',
        title: '💎 Mestre do Equilíbrio',
        description: 'Acumule 100 Pontos de Homeostase',
        type: QuestType.HOMEOSTASIS,
        difficulty: QuestDifficulty.MEDIUM,
        objectives: [
            {
                description: 'Acumular 100 HP',
                current: 0,
                target: 100,
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 500,
            experience: 200,
            hormones: 50
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: false // Unlocks after first_hp
    },
    {
        id: 'story_all_organs',
        title: '🫀 Sistema Completo',
        description: 'Desbloqueie todos os órgãos',
        type: QuestType.UPGRADE,
        difficulty: QuestDifficulty.HARD,
        objectives: [
            {
                description: 'Órgãos desbloqueados',
                current: 0,
                target: 8, // Total de órgãos
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 1000,
            experience: 500,
            atp: 50000
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: false
    },
    {
        id: 'story_first_prestige',
        title: '🔄 Renascimento',
        description: 'Complete seu primeiro Prestige',
        type: QuestType.UPGRADE,
        difficulty: QuestDifficulty.HARD,
        objectives: [
            {
                description: 'Fazer prestige',
                current: 0,
                target: 1,
                completed: false
            }
        ],
        rewards: {
            homeostasisPoints: 2000,
            experience: 1000,
            hormones: 100
        },
        progress: 0,
        completed: false,
        claimed: false,
        unlocked: false
    }
];

// Check and update quest progress
export function updateQuestProgress(
    quests: Quest[],
    gameState: GameState,
    physiology: Physiology,
    deltaTime: number
): Quest[] {
    // Safety check: return unchanged quests if gameState is invalid
    if (!gameState || !gameState.organs) {
        return quests;
    }

    return quests.map(quest => {
        if (quest.completed || !quest.unlocked) return quest;

        const objectives = quest.objectives.map(obj => {
            if (obj.completed) return obj;

            let newCurrent = obj.current;

            // Update based on quest type
            switch (quest.type) {
                case QuestType.HOMEOSTASIS:
                    if (quest.id === 'daily_homeostasis_1' || quest.id === 'story_first_hp') {
                        // Count time with high homeostasis
                        if (physiology.homeostasisScore > 80 && physiology.allostaticLoad < 30) {
                            newCurrent += deltaTime;
                        }
                    } else if (quest.id === 'story_100_hp') {
                        newCurrent = gameState.homeostasisPoints || 0;
                    }
                    break;

                case QuestType.PRODUCTION:
                    if (quest.id === 'daily_production_1') {
                        newCurrent = gameState.totalATPEarned || 0;
                    }
                    break;

                case QuestType.UPGRADE:
                    if (quest.id === 'story_all_organs') {
                        newCurrent = Object.values(gameState.organs).filter(o => o.owned).length;
                    }
                    // daily_upgrade_1 tracked separately when upgrade happens
                    break;

                case QuestType.SURVIVAL:
                    if (quest.id === 'daily_survival_1') {
                        if (physiology.allostaticLoad < 30) {
                            newCurrent += deltaTime;
                        }
                    }
                    break;
            }

            const completed = newCurrent >= obj.target;

            return {
                ...obj,
                current: Math.min(newCurrent, obj.target),
                completed
            };
        });

        const allCompleted = objectives.every(obj => obj.completed);
        const progress = (objectives.reduce((sum, obj) => sum + (obj.current / obj.target), 0) / objectives.length) * 100;

        return {
            ...quest,
            objectives,
            progress: Math.min(100, progress),
            completed: allCompleted
        };
    });
}

// Claim quest rewards
export function claimQuestRewards(quest: Quest, gameState: GameState): GameState {
    if (!quest.completed || quest.claimed) return gameState;

    const newState = { ...gameState };
    const rewards = quest.rewards;

    if (rewards.homeostasisPoints) {
        newState.homeostasisPoints += rewards.homeostasisPoints;
        newState.totalHomeostasisPointsEarned += rewards.homeostasisPoints;
    }
    if (rewards.atp) {
        newState.atp += rewards.atp;
    }
    if (rewards.hormones) {
        newState.hormones += rewards.hormones;
    }
    if (rewards.experience) {
        newState.experience += rewards.experience;
    }

    return newState;
}

// Check if should unlock new story quests
export function checkQuestUnlocks(quests: Quest[]): Quest[] {
    return quests.map(quest => {
        if (quest.unlocked) return quest;

        // Unlock logic
        if (quest.id === 'story_100_hp') {
            const firstHPQuest = quests.find(q => q.id === 'story_first_hp');
            if (firstHPQuest?.completed) {
                return { ...quest, unlocked: true };
            }
        }

        if (quest.id === 'story_all_organs') {
            const firstHPQuest = quests.find(q => q.id === 'story_first_hp');
            if (firstHPQuest?.completed) {
                return { ...quest, unlocked: true };
            }
        }

        return quest;
    });
}

// Reset daily quests (call once per day)
export function resetDailyQuests(): Quest[] {
    const now = Date.now();
    const tomorrow = now + (24 * 60 * 60 * 1000);

    return DAILY_QUESTS.map(quest => ({
        ...quest,
        objectives: quest.objectives.map(obj => ({
            ...obj,
            current: 0,
            completed: false
        })),
        progress: 0,
        completed: false,
        claimed: false,
        expiresAt: tomorrow
    }));
}
