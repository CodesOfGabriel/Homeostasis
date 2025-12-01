// Sticky Currency Cards - Always visible at top
import { useIdleGame } from '../../game/useIdleGame';
import { formatNumber } from '../../game/idleSystem';
import { Award, HelpCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AchievementsModal } from './AchievementsModal';
import { TutorialModal } from './TutorialModal';
import { PrestigeModal } from './PrestigeModal';

export function IdleGameHeader() {
    const {
        gameState,
        canPrestige: canDoPrestige,
        prestigeReward,
        achievements,
        prestige
    } = useIdleGame();

    const [showAchievementsModal, setShowAchievementsModal] = useState(false);
    const [showTutorialModal, setShowTutorialModal] = useState(false);
    const [showPrestigeModal, setShowPrestigeModal] = useState(false);

    return (
        <>
            {/* Modals */}
            {showAchievementsModal && (
                <AchievementsModal
                    achievements={achievements}
                    onClose={() => setShowAchievementsModal(false)}
                />
            )}

            {showTutorialModal && (
                <TutorialModal onClose={() => setShowTutorialModal(false)} />
            )}

            {showPrestigeModal && (
                <PrestigeModal
                    currentATP={gameState.atp}
                    totalATPEarned={gameState.totalATPEarned}
                    stemCellsGained={prestigeReward}
                    currentMultiplier={gameState.prestige.permanentMultiplier}
                    newMultiplier={1 + (prestigeReward * 0.1)}
                    prestigeLevel={gameState.prestige.level}
                    onConfirm={() => {
                        prestige();
                        setShowPrestigeModal(false);
                    }}
                    onCancel={() => setShowPrestigeModal(false)}
                />
            )}

            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b-2 border-cyan-500/30 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    {/* Title and Actions Row */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                                ⚡ Homeostasis Idle
                            </h1>
                            <div className="text-xs text-gray-400 bg-slate-800/50 px-2 py-1 rounded">
                                {gameState.prestige.permanentMultiplier.toFixed(2)}x Multiplicador
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {canDoPrestige && (
                                <button
                                    onClick={() => setShowPrestigeModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg font-bold transition-all flex items-center gap-2 animate-pulse shadow-lg"
                                    title="Reencarnação Celular"
                                >
                                    <RefreshCw size={16} />
                                    <span className="hidden sm:inline">Renascer</span>
                                    <span className="text-xs">+{prestigeReward} 🧬</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowTutorialModal(true)}
                                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                                title="Tutorial"
                            >
                                <HelpCircle size={20} />
                            </button>
                            <button
                                onClick={() => setShowAchievementsModal(true)}
                                className="p-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors flex items-center gap-2"
                                title="Conquistas"
                            >
                                <Award size={20} />
                                <span className="text-sm font-bold">
                                    {Object.values(achievements).filter((a: any) => a.unlocked).length}/{Object.values(achievements).length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Currency Cards Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 p-3 rounded-lg shadow-lg border border-yellow-500/30 hover:scale-105 transition-transform">
                            <div className="text-xs opacity-70 font-medium">ATP Total</div>
                            <div className="text-xl sm:text-2xl font-bold truncate">{formatNumber(gameState.atp)}</div>
                            <div className="text-xs mt-1 flex items-center gap-1">
                                <span className="animate-pulse">⚡</span>
                                <span className="font-medium">{formatNumber(gameState.atpPerSecond)}/s</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-3 rounded-lg shadow-lg border border-purple-500/30 hover:scale-105 transition-transform">
                            <div className="text-xs opacity-70 font-medium">Hormônios</div>
                            <div className="text-xl sm:text-2xl font-bold truncate">{formatNumber(gameState.hormones)}</div>
                            <div className="text-xs mt-1 flex items-center gap-1">
                                <span>🧬</span>
                                <span className="font-medium">Premium</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 p-3 rounded-lg shadow-lg border border-cyan-500/30 hover:scale-105 transition-transform">
                            <div className="text-xs opacity-70 font-medium">Células-Tronco</div>
                            <div className="text-xl sm:text-2xl font-bold truncate">{gameState.prestige.stemCells}</div>
                            <div className="text-xs mt-1 flex items-center gap-1">
                                <span>🔬</span>
                                <span className="font-medium">Nv.{gameState.prestige.level}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
