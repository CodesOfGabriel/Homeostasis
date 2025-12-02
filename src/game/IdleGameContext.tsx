// Context for shared Idle Game state
import { createContext, useContext, ReactNode } from 'react';
import { useIdleGame } from './useIdleGame';
import { useSimulationStore } from './simulationStore';

interface IdleGameContextValue {
    gameState: ReturnType<typeof useIdleGame>['gameState'];
    collectOrgan: ReturnType<typeof useIdleGame>['collectOrgan'];
    upgradeOrgan: ReturnType<typeof useIdleGame>['upgradeOrgan'];
    purchaseManager: ReturnType<typeof useIdleGame>['purchaseManager'];
    purchaseUpgrade: ReturnType<typeof useIdleGame>['purchaseUpgrade'];
    prestige: ReturnType<typeof useIdleGame>['prestige'];
    resetGame: ReturnType<typeof useIdleGame>['resetGame'];
    showOfflinePopup: ReturnType<typeof useIdleGame>['showOfflinePopup'];
    floatingNumbers: ReturnType<typeof useIdleGame>['floatingNumbers'];
    canPrestige: ReturnType<typeof useIdleGame>['canPrestige'];
    prestigeReward: ReturnType<typeof useIdleGame>['prestigeReward'];
    achievements: ReturnType<typeof useIdleGame>['achievements'];
    newAchievementUnlocks: ReturnType<typeof useIdleGame>['newAchievementUnlocks'];
}

const IdleGameContext = createContext<IdleGameContextValue | null>(null);

export function IdleGameProvider({ children }: { children: ReactNode }) {
    const { isRunning, timeSpeed } = useSimulationStore();
    const idleGameState = useIdleGame({ isRunning, timeSpeed });

    return (
        <IdleGameContext.Provider value={idleGameState}>
            {children}
        </IdleGameContext.Provider>
    );
}

export function useIdleGameContext() {
    const context = useContext(IdleGameContext);
    if (!context) {
        throw new Error('useIdleGameContext must be used within IdleGameProvider');
    }
    return context;
}
