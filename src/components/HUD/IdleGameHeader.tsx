// Sticky Currency Cards - Always visible at top
import { useIdleGameContext } from '../../game/IdleGameContext';
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
    } = useIdleGameContext(); const [showAchievementsModal, setShowAchievementsModal] = useState(false);
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

            {/* Compact Header - Left Aligned */}
            <div className="sticky top-0 z-40 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-sm border-b border-cyan-500/20 shadow-xl">
                <div className="max-w-[1900px] mx-auto px-6 py-2">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left Section - Title and Currency Cards */}
                        <div className="flex items-center gap-4">
                            {/* Title */}
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 whitespace-nowrap">
                                    Homeostasis Idle
                                </h1>
                                <div className="text-[10px] text-gray-400 bg-slate-800/70 px-1.5 py-0.5 rounded">
                                    {gameState.prestige.permanentMultiplier.toFixed(2)}x Multiplicador
                                </div>
                            </div>

                            {/* Currency Cards - Compact Inline */}
                            <div className="flex items-center gap-2">
                                {/* NEW: HOMEOSTASIS POINTS - PRIMARY CURRENCY */}
                                <div className={`bg-gradient-to-br from-green-600 to-emerald-800 px-3 py-1.5 rounded-lg shadow-md border hover:scale-105 transition-transform relative ${gameState.currentHomeostasisRate > 0
                                        ? 'border-green-400/50 shadow-green-500/50 animate-pulse'
                                        : 'border-green-500/30'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] opacity-70 font-medium">Homeostase</div>
                                        <div className="text-base font-bold">{formatNumber(gameState.homeostasisPoints)}</div>
                                        <div className="text-[10px] flex items-center gap-0.5">
                                            {gameState.currentHomeostasisRate > 0 ? (
                                                <>
                                                    <span className="animate-pulse">✅</span>
                                                    <span className="font-medium text-green-200">+{gameState.currentHomeostasisRate.toFixed(2)}/s</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>⚖️</span>
                                                    <span className="font-medium opacity-50">0/s</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {gameState.currentHomeostasisRate > 0 && (
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                                    )}
                                </div>

                                <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 px-3 py-1.5 rounded-lg shadow-md border border-yellow-500/30 hover:scale-105 transition-transform">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] opacity-70 font-medium">ATP Total</div>
                                        <div className="text-base font-bold">{formatNumber(gameState.atp)}</div>
                                        <div className="text-[10px] flex items-center gap-0.5">
                                            <span className="animate-pulse">⚡</span>
                                            <span className="font-medium">{formatNumber(gameState.atpPerSecond)}/s</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-3 py-1.5 rounded-lg shadow-md border border-purple-500/30 hover:scale-105 transition-transform">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] opacity-70 font-medium">Hormônios</div>
                                        <div className="text-base font-bold">{formatNumber(gameState.hormones)}</div>
                                        <div className="text-[10px] flex items-center gap-0.5">
                                            <span>🧬</span>
                                            <span className="font-medium">Premium</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 px-3 py-1.5 rounded-lg shadow-md border border-cyan-500/30 hover:scale-105 transition-transform">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] opacity-70 font-medium">Células-Tronco</div>
                                        <div className="text-base font-bold">{gameState.prestige.stemCells}</div>
                                        <div className="text-[10px] flex items-center gap-0.5">
                                            <span>🔬</span>
                                            <span className="font-medium">Nv.{gameState.prestige.level}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Action Buttons */}
                        <div className="flex gap-2">
                            {canDoPrestige && (
                                <button
                                    onClick={() => setShowPrestigeModal(true)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg font-bold transition-all flex items-center gap-1.5 animate-pulse shadow-lg text-sm"
                                    title="Reencarnação Celular"
                                >
                                    <RefreshCw size={14} />
                                    <span className="hidden sm:inline">Renascer</span>
                                    <span className="text-xs">+{prestigeReward} 🧬</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowTutorialModal(true)}
                                className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                                title="Tutorial"
                            >
                                <HelpCircle size={16} />
                            </button>
                            <button
                                onClick={() => setShowAchievementsModal(true)}
                                className="p-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors flex items-center gap-1.5"
                                title="Conquistas"
                            >
                                <Award size={16} />
                                <span className="text-xs font-bold">
                                    {Object.values(achievements).filter((a: any) => a.unlocked).length}/{Object.values(achievements).length}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
