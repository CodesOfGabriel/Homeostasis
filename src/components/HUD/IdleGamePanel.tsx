// Idle Game UI Panel Component - Sincronizado com simulação
import { useState } from 'react';
import { useIdleGameContext } from '../../game/IdleGameContext';
import { formatNumber, formatTime, calculateGlobalMultiplier } from '../../game/idleSystem';
import { OrganModal } from './OrganModal';
import { ManagerModal } from './ManagerModal';
import { UpgradeModal } from './UpgradeModal';

import { AchievementUnlockPopup } from './AchievementUnlockPopup';


export default function IdleGamePanel() {
    const {
        gameState,
        upgradeOrgan,
        purchaseManager,
        purchaseUpgrade,
        showOfflinePopup,
        floatingNumbers,
        newAchievementUnlocks
    } = useIdleGameContext();    // Modal states
    const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
    const [selectedManager, setSelectedManager] = useState<string | null>(null);
    const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);

    const globalMultiplier = calculateGlobalMultiplier(gameState);

    return (
        <div className="idle-game-panel bg-slate-900/95 text-white p-6 rounded-xl relative">
            {/* Modals */}
            {selectedOrgan && (
                <OrganModal
                    organ={gameState.organs[selectedOrgan]}
                    globalMultiplier={globalMultiplier}
                    onClose={() => setSelectedOrgan(null)}
                    onUpgrade={() => {
                        upgradeOrgan(selectedOrgan);
                        setSelectedOrgan(null);
                    }}
                    canAfford={gameState.atp >= gameState.organs[selectedOrgan].cost}
                />
            )}

            {selectedManager && (
                <ManagerModal
                    manager={gameState.managers[selectedManager]}
                    currentHormones={gameState.hormones}
                    onClose={() => setSelectedManager(null)}
                    onPurchase={() => {
                        purchaseManager(selectedManager);
                        setSelectedManager(null);
                    }}
                />
            )}

            {selectedUpgrade && (
                <UpgradeModal
                    upgrade={gameState.upgrades[selectedUpgrade]}
                    currentCurrency={
                        gameState.upgrades[selectedUpgrade].currency === 'atp' ? gameState.atp :
                            gameState.upgrades[selectedUpgrade].currency === 'hormones' ? gameState.hormones :
                                gameState.experience
                    }
                    currencyName={
                        gameState.upgrades[selectedUpgrade].currency === 'atp' ? 'ATP' :
                            gameState.upgrades[selectedUpgrade].currency === 'hormones' ? 'Hormônios' :
                                'Experiência'
                    }
                    currencyIcon={
                        gameState.upgrades[selectedUpgrade].currency === 'atp' ? '⚡' :
                            gameState.upgrades[selectedUpgrade].currency === 'hormones' ? '🧬' :
                                '🎓'
                    }
                    onClose={() => setSelectedUpgrade(null)}
                    onPurchase={() => {
                        purchaseUpgrade(selectedUpgrade);
                        setSelectedUpgrade(null);
                    }}
                />
            )}



            {/* Achievement Unlock Popups */}
            {newAchievementUnlocks.map((achievement) => (
                <AchievementUnlockPopup
                    key={achievement.id}
                    achievement={achievement}
                    onClose={() => { }}
                />
            ))}



            {/* Offline Earnings Popup */}
            {showOfflinePopup && gameState.offlineTime > 0 && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 px-6 py-4 rounded-lg shadow-2xl z-50 animate-bounce">
                    <div className="text-xl font-bold">Bem-vindo de volta! 🎉</div>
                    <div className="text-sm">
                        Você esteve offline por {formatTime(gameState.offlineTime)}
                    </div>
                    <div className="text-lg mt-2">
                        Ganhou {formatNumber(gameState.offlineTime * gameState.atpPerSecond * 0.5)} ATP offline!
                    </div>
                </div>
            )}

            {/* Floating Numbers */}
            {floatingNumbers.map(num => (
                <div
                    key={num.id}
                    className="fixed text-green-400 font-bold text-xl pointer-events-none animate-float-up z-40"
                    style={{ left: num.x, top: num.y }}
                >
                    +{formatNumber(num.amount)} ATP
                </div>
            ))}





            {/* Organs Grid */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">🫀 Órgãos Geradores</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(gameState.organs).map(organ => {
                        const production = organ.owned
                            ? formatNumber(organ.baseProduction * Math.pow(organ.productionMultiplier, organ.level - 1))
                            : '0';
                        const cost = organ.owned ? organ.cost : organ.baseCost;
                        const canAfford = gameState.atp >= cost;

                        return (
                            <div
                                key={organ.id}
                                className={`p-4 rounded-lg border-2 transition-all relative group ${organ.owned
                                    ? 'bg-slate-800 border-green-500 hover:border-green-400'
                                    : 'bg-slate-800/50 border-slate-600'
                                    } ${canAfford ? 'cursor-pointer' : 'opacity-60'}`}
                                onClick={() => {
                                    if (canAfford) upgradeOrgan(organ.id);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSelectedOrgan(organ.id);
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrgan(organ.id);
                                    }}
                                    className="absolute top-2 right-2 text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Ver detalhes"
                                >
                                    ℹ️
                                </button>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-3xl">{organ.icon}</span>
                                    {organ.automated && <span className="text-xs bg-blue-600 px-2 py-1 rounded">AUTO</span>}
                                </div>
                                <div className="font-bold">{organ.name}</div>
                                <div className="text-xs opacity-70">
                                    {organ.owned ? `Nível ${organ.level}` : 'Bloqueado'}
                                </div>
                                <div className="text-sm mt-2 text-green-400">
                                    {organ.id === 'brain' ? '🧬' : '⚡'} {production}/s
                                </div>
                                <div className="text-xs mt-1">
                                    {organ.owned ? 'Melhorar' : 'Desbloquear'}: {formatNumber(cost)} ATP
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Managers */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">👨‍💼 Gerentes de Sistemas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {Object.values(gameState.managers).map(manager => {
                        const canAfford = gameState.hormones >= manager.cost;
                        const isUnlocked = manager.unlocked;

                        return (
                            <div
                                key={manager.id}
                                className={`p-4 rounded-lg border-2 transition-all relative group ${isUnlocked
                                    ? 'bg-blue-900 border-blue-500'
                                    : canAfford
                                        ? 'bg-slate-800 border-purple-500 cursor-pointer hover:border-purple-400'
                                        : 'bg-slate-800/50 border-slate-600 opacity-60'
                                    }`}
                                onClick={() => {
                                    if (!isUnlocked && canAfford) purchaseManager(manager.id);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSelectedManager(manager.id);
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedManager(manager.id);
                                    }}
                                    className="absolute top-2 right-2 text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Ver detalhes"
                                >
                                    ℹ️
                                </button>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="font-bold">{manager.name}</div>
                                        <div className="text-xs opacity-70 mt-1">{manager.description}</div>
                                        {!isUnlocked && (
                                            <div className="text-sm mt-2 text-purple-400">
                                                Custo: {formatNumber(manager.cost)} 🧬 Hormônios
                                            </div>
                                        )}
                                    </div>
                                    {isUnlocked && (
                                        <div className="ml-4 text-3xl">✅</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>            {/* Global Upgrades */}
            <div>
                <h2 className="text-xl font-bold mb-3">🔬 Melhorias Globais</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {Object.values(gameState.upgrades).map(upgrade => {
                        let canAfford = false;
                        let currencyIcon = '';
                        let currencyAmount = 0;

                        switch (upgrade.currency) {
                            case 'atp':
                                canAfford = gameState.atp >= upgrade.cost;
                                currencyIcon = '⚡';
                                currencyAmount = gameState.atp;
                                break;
                            case 'hormones':
                                canAfford = gameState.hormones >= upgrade.cost;
                                currencyIcon = '🧬';
                                currencyAmount = gameState.hormones;
                                break;
                            case 'experience':
                                canAfford = gameState.experience >= upgrade.cost;
                                currencyIcon = '🎓';
                                currencyAmount = gameState.experience;
                                break;
                        }

                        const isPurchased = upgrade.purchased;

                        return (
                            <div
                                key={upgrade.id}
                                className={`p-4 rounded-lg border-2 transition-all relative group ${isPurchased
                                    ? 'bg-green-900/50 border-green-600'
                                    : canAfford
                                        ? 'bg-slate-800 border-yellow-500 cursor-pointer hover:border-yellow-400'
                                        : 'bg-slate-800/50 border-slate-600 opacity-60'
                                    }`}
                                onClick={() => {
                                    if (!isPurchased && canAfford) purchaseUpgrade(upgrade.id);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSelectedUpgrade(upgrade.id);
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUpgrade(upgrade.id);
                                    }}
                                    className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Ver detalhes"
                                >
                                    ℹ️
                                </button>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{upgrade.icon}</span>
                                            <span className="font-bold">{upgrade.name}</span>
                                        </div>
                                        <div className="text-xs opacity-70 mt-1">{upgrade.description}</div>
                                        {!isPurchased && (
                                            <div className="text-sm mt-2 text-yellow-400">
                                                {currencyIcon} {formatNumber(upgrade.cost)} / {formatNumber(currencyAmount)}
                                            </div>
                                        )}
                                    </div>
                                    {isPurchased && (
                                        <div className="ml-4 text-3xl">✅</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-6 pt-4 border-t border-slate-700 text-xs opacity-70">
                <div className="grid grid-cols-2 gap-2">
                    <div>Total ATP Ganho: {formatNumber(gameState.totalATPEarned)}</div>
                    <div>Total ATP Gasto: {formatNumber(gameState.totalATPSpent)}</div>
                    <div>Multiplicador: {gameState.prestige.permanentMultiplier.toFixed(2)}x</div>
                    <div>Tempo de jogo: {formatTime((Date.now() - gameState.startTime) / 1000)}</div>
                </div>
            </div>
        </div>
    );
}
