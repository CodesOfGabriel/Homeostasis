// React hook for Idle Game System - Sincronizado com simulação
import { useEffect, useState, useCallback, useRef } from 'react';
import {
    GameState,
    createInitialGameState,
    calculateOrganProduction,
    calculateUpgradeCost,
    calculateTotalATPPerSecond,
    calculateGlobalMultiplier,
    processOfflineEarnings,
    canPrestige,
    calculatePrestigeReward
} from './idleSystem';
import { Achievement, ACHIEVEMENTS, checkAchievements } from './achievements';
import { useSimulationStore } from './simulationStore';

const SAVE_KEY = 'homeostasis_idle_save';
const ACHIEVEMENTS_SAVE_KEY = 'homeostasis_achievements_save';

interface IdleGameHookOptions {
    isRunning?: boolean;
    timeSpeed?: number;
}

export function useIdleGame(options: IdleGameHookOptions = {}) {
    const { isRunning = true, timeSpeed = 1 } = options;
    const physiology = useSimulationStore(state => state.parameters);
    const [gameState, setGameState] = useState<GameState>(() => {
        // Try to load from localStorage
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as GameState;

                // Add default values for new Phase 2 fields (backward compatibility)
                if (parsed.homeostasisPoints === undefined) parsed.homeostasisPoints = 0;
                if (parsed.totalHomeostasisPointsEarned === undefined) parsed.totalHomeostasisPointsEarned = 0;
                if (parsed.currentHomeostasisRate === undefined) parsed.currentHomeostasisRate = 0;
                if (parsed.longestHomeostasisStreak === undefined) parsed.longestHomeostasisStreak = 0;

                // Process offline earnings
                const offlineEarnings = processOfflineEarnings(parsed);
                if (offlineEarnings > 0) {
                    parsed.atp += offlineEarnings;
                    parsed.totalATPEarned += offlineEarnings;
                    parsed.offlineTime = (Date.now() - parsed.lastUpdate) / 1000;
                }
                parsed.lastUpdate = Date.now();
                return parsed;
            } catch (e) {
                console.error('Failed to load save:', e);
            }
        }
        return createInitialGameState();
    });

    const [showOfflinePopup, setShowOfflinePopup] = useState(false);
    const [floatingNumbers, setFloatingNumbers] = useState<Array<{ id: string; amount: number; x: number; y: number }>>([]);
    const [achievements, setAchievements] = useState<Record<string, Achievement>>(() => {
        const saved = localStorage.getItem(ACHIEVEMENTS_SAVE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load achievements:', e);
            }
        }
        return { ...ACHIEVEMENTS };
    });
    const [newAchievementUnlocks, setNewAchievementUnlocks] = useState<Achievement[]>([]);
    const animationFrameRef = useRef<number>();
    const gameStateRef = useRef<GameState>(gameState);

    // Keep ref in sync with state
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Auto-save every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            localStorage.setItem(ACHIEVEMENTS_SAVE_KEY, JSON.stringify(achievements));
        }, 5000);
        return () => clearInterval(interval);
    }, [gameState, achievements]);

    // Check achievements on state change
    useEffect(() => {
        const organsOwned = Object.values(gameState.organs).filter(o => o.owned).length;
        const maxOrganLevel = Math.max(...Object.values(gameState.organs).map(o => o.level));
        const managersHired = Object.values(gameState.managers).filter(m => m.unlocked).length;
        const upgradesPurchased = Object.values(gameState.upgrades).filter(u => u.purchased).length;

        const { newUnlocks, updatedAchievements } = checkAchievements(
            gameState.totalATPEarned,
            organsOwned,
            maxOrganLevel,
            managersHired,
            upgradesPurchased,
            gameState.prestige.level,
            gameState.atpPerSecond,
            achievements
        );

        if (newUnlocks.length > 0) {
            setAchievements(updatedAchievements);
            setNewAchievementUnlocks(newUnlocks);

            // Award rewards
            setGameState(prev => {
                let newState = { ...prev };
                newUnlocks.forEach(achievement => {
                    if (achievement.reward.type === 'experience') {
                        newState.experience += achievement.reward.amount;
                    } else if (achievement.reward.type === 'hormones') {
                        newState.hormones += achievement.reward.amount;
                    } else if (achievement.reward.type === 'multiplier') {
                        newState.prestige.permanentMultiplier *= achievement.reward.amount;
                    }
                });
                return newState;
            });

            // Clear notification after 5 seconds
            setTimeout(() => {
                setNewAchievementUnlocks([]);
            }, 5000);
        } else if (JSON.stringify(updatedAchievements) !== JSON.stringify(achievements)) {
            setAchievements(updatedAchievements);
        }
    }, [gameState.totalATPEarned, gameState.prestige.level, gameState.atpPerSecond]);

    // Show offline popup if there was offline time
    useEffect(() => {
        if (gameState.offlineTime > 60) {
            setShowOfflinePopup(true);
            setTimeout(() => setShowOfflinePopup(false), 5000);
        }
    }, []);

    // Main game loop - passive income generation (sincronizado com simulação)
    useEffect(() => {
        if (!isRunning) return; // Pausa quando a simulação está pausada

        let lastTick = Date.now();
        let homeostasisStreakTime = 0;

        const gameLoop = () => {
            const now = Date.now();
            const deltaTime = ((now - lastTick) / 1000) * timeSpeed; // seconds com multiplicador de velocidade

            setGameState(prev => {
                const atpPerSecond = calculateTotalATPPerSecond(prev);
                const atpGained = atpPerSecond * deltaTime;

                // Brain generates hormones
                const brainOrgan = prev.organs.brain;
                let hormonesGained = 0;
                if (brainOrgan && brainOrgan.owned) {
                    const globalMultiplier = calculateGlobalMultiplier(prev);
                    const hormonesPerMinute = calculateOrganProduction(brainOrgan, globalMultiplier);
                    hormonesGained = (hormonesPerMinute / 60) * deltaTime;
                }

                // PHASE 2.5: HOMEOSTASIS POINTS GENERATION
                let homeostasisPointsGain = 0;
                let newHomeostasisRate = 0;
                let newLongestStreak = prev.longestHomeostasisStreak;

                // Get REAL physiology data from simulation store
                const currentHomeostasisScore = physiology.homeostasisScore || 75;
                const currentAllostaticLoad = physiology.allostaticLoad || 20;

                // Generate HP only when in good homeostasis (score > 70, load < 30)
                if (currentHomeostasisScore > 70 && currentAllostaticLoad < 30) {
                    homeostasisPointsGain = (currentHomeostasisScore / 100) * deltaTime;
                    newHomeostasisRate = currentHomeostasisScore / 100;

                    // Track streak
                    homeostasisStreakTime += deltaTime;
                    if (homeostasisStreakTime > newLongestStreak) {
                        newLongestStreak = homeostasisStreakTime;
                    }
                } else {
                    homeostasisStreakTime = 0; // Reset streak
                    newHomeostasisRate = 0;
                }

                return {
                    ...prev,
                    atp: prev.atp + atpGained,
                    hormones: prev.hormones + hormonesGained,
                    homeostasisPoints: prev.homeostasisPoints + homeostasisPointsGain,
                    totalATPEarned: prev.totalATPEarned + atpGained,
                    totalHomeostasisPointsEarned: prev.totalHomeostasisPointsEarned + homeostasisPointsGain,
                    currentHomeostasisRate: newHomeostasisRate,
                    longestHomeostasisStreak: newLongestStreak,
                    atpPerSecond,
                    lastUpdate: now
                };
            });

            // Update quests using the ref (which has the latest state)
            // Use setTimeout to defer to next tick to avoid race conditions
            setTimeout(() => {
                if (gameStateRef.current) {
                    useSimulationStore.getState().updateQuests(gameStateRef.current);
                    useSimulationStore.getState().checkDailyReset();
                }
            }, 0);

            lastTick = now;
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        };

        animationFrameRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isRunning, timeSpeed, physiology]); // Re-executa quando isRunning, timeSpeed ou physiology mudam

    // Manual collection (clicking organ when not automated)
    const collectOrgan = useCallback((organId: string, x?: number, y?: number) => {
        setGameState(prev => {
            const organ = prev.organs[organId];
            if (!organ || !organ.owned || organ.automated) return prev;

            const globalMultiplier = calculateGlobalMultiplier(prev);
            const production = calculateOrganProduction(organ, globalMultiplier);

            // Generate ATP for 1 second worth of production
            const atpGained = production;

            // Show floating number
            if (x !== undefined && y !== undefined) {
                const id = `${organId}-${Date.now()}`;
                setFloatingNumbers(nums => [...nums, { id, amount: atpGained, x, y }]);
                setTimeout(() => {
                    setFloatingNumbers(nums => nums.filter(n => n.id !== id));
                }, 1000);
            }

            return {
                ...prev,
                atp: prev.atp + atpGained,
                totalATPEarned: prev.totalATPEarned + atpGained,
                organs: {
                    ...prev.organs,
                    [organId]: {
                        ...organ,
                        lastCollected: Date.now()
                    }
                }
            };
        });
    }, []);

    // Purchase/Upgrade organ
    const upgradeOrgan = useCallback((organId: string) => {
        setGameState(prev => {
            const organ = prev.organs[organId];
            if (!organ) return prev;

            const cost = organ.owned ? calculateUpgradeCost(organ) : organ.cost;

            if (prev.atp < cost) return prev;

            return {
                ...prev,
                atp: prev.atp - cost,
                totalATPSpent: prev.totalATPSpent + cost,
                organs: {
                    ...prev.organs,
                    [organId]: {
                        ...organ,
                        level: organ.owned ? organ.level + 1 : 1,
                        owned: true,
                        cost: calculateUpgradeCost({
                            ...organ,
                            level: organ.owned ? organ.level + 1 : 1
                        })
                    }
                }
            };
        });
    }, []);

    // Purchase manager
    const purchaseManager = useCallback((managerId: string) => {
        setGameState(prev => {
            const manager = prev.managers[managerId];
            if (!manager || manager.unlocked) return prev;

            if (prev.hormones < manager.cost) return prev;

            // Apply automation
            const updatedOrgans = { ...prev.organs };
            if (manager.organId === 'all') {
                // Automate all organs
                Object.keys(updatedOrgans).forEach(key => {
                    if (updatedOrgans[key].owned) {
                        updatedOrgans[key] = { ...updatedOrgans[key], automated: true };
                    }
                });
            } else {
                // Automate specific organ(s)
                if (manager.organId === 'heart') {
                    updatedOrgans.heart = { ...updatedOrgans.heart, automated: true };
                    updatedOrgans.lungs = { ...updatedOrgans.lungs, automated: true };
                } else {
                    updatedOrgans[manager.organId] = {
                        ...updatedOrgans[manager.organId],
                        automated: true
                    };
                }
            }

            return {
                ...prev,
                hormones: prev.hormones - manager.cost,
                organs: updatedOrgans,
                managers: {
                    ...prev.managers,
                    [managerId]: {
                        ...manager,
                        unlocked: true
                    }
                }
            };
        });
    }, []);

    // Purchase upgrade
    const purchaseUpgrade = useCallback((upgradeId: string) => {
        setGameState(prev => {
            const upgrade = prev.upgrades[upgradeId];
            if (!upgrade || upgrade.purchased) return prev;

            let canAfford = false;
            switch (upgrade.currency) {
                case 'atp':
                    canAfford = prev.atp >= upgrade.cost;
                    break;
                case 'hormones':
                    canAfford = prev.hormones >= upgrade.cost;
                    break;
                case 'experience':
                    canAfford = prev.experience >= upgrade.cost;
                    break;
            }

            if (!canAfford) return prev;

            const newState = { ...prev };

            // Deduct cost
            switch (upgrade.currency) {
                case 'atp':
                    newState.atp -= upgrade.cost;
                    newState.totalATPSpent += upgrade.cost;
                    break;
                case 'hormones':
                    newState.hormones -= upgrade.cost;
                    break;
                case 'experience':
                    newState.experience -= upgrade.cost;
                    break;
            }

            newState.upgrades = {
                ...prev.upgrades,
                [upgradeId]: {
                    ...upgrade,
                    purchased: true
                }
            };

            return newState;
        });
    }, []);

    // Prestige/Reencarnação Celular
    const prestige = useCallback(() => {
        setGameState(prev => {
            if (!canPrestige(prev)) return prev;

            const stemCellsGained = calculatePrestigeReward(prev);
            const newPrestigeLevel = prev.prestige.level + 1;
            const newMultiplier = 1 + (stemCellsGained * 0.1); // Each stem cell = +10%

            // Reset everything except prestige data
            const newState = createInitialGameState();
            newState.prestige = {
                level: newPrestigeLevel,
                stemCells: prev.prestige.stemCells + stemCellsGained,
                totalATPEarned: prev.totalATPEarned,
                permanentMultiplier: prev.prestige.permanentMultiplier * newMultiplier
            };

            return newState;
        });
    }, []);

    // Reset game (for testing)
    const resetGame = useCallback(() => {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(ACHIEVEMENTS_SAVE_KEY);
        setGameState(createInitialGameState());
        setAchievements({ ...ACHIEVEMENTS });
    }, []);

    return {
        gameState,
        collectOrgan,
        upgradeOrgan,
        purchaseManager,
        purchaseUpgrade,
        prestige,
        resetGame,
        showOfflinePopup,
        floatingNumbers,
        canPrestige: canPrestige(gameState),
        prestigeReward: calculatePrestigeReward(gameState),
        achievements,
        newAchievementUnlocks
    };
}
