// QuestPanel - Sistema de missões e objetivos
import { motion, AnimatePresence } from 'framer-motion';
import { Quest, QuestDifficulty } from '../../game/questSystem';
import { useSimulationStore } from '../../game/simulationStore';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface QuestPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuestPanel({ isOpen, onClose }: QuestPanelProps) {
    const [activeTab, setActiveTab] = useState<'daily' | 'story'>('daily');
    const dailyQuests = useSimulationStore((state: any) => state.dailyQuests);
    const storyQuests = useSimulationStore((state: any) => state.storyQuests);

    const handleClaimReward = (quest: Quest) => {
        if (!quest.completed || quest.claimed) return;

        // Apply rewards directly (useIdleGame doesn't expose setState)
        // We'll manually update the game state through localStorage
        const currentState = JSON.parse(localStorage.getItem('homeostasis_idle_save') || '{}');

        if (quest.rewards.homeostasisPoints) {
            currentState.homeostasisPoints = (currentState.homeostasisPoints || 0) + quest.rewards.homeostasisPoints;
            currentState.totalHomeostasisPointsEarned = (currentState.totalHomeostasisPointsEarned || 0) + quest.rewards.homeostasisPoints;
        }
        if (quest.rewards.atp) {
            currentState.atp = (currentState.atp || 0) + quest.rewards.atp;
        }
        if (quest.rewards.hormones) {
            currentState.hormones = (currentState.hormones || 0) + quest.rewards.hormones;
        }
        if (quest.rewards.experience) {
            currentState.experience = (currentState.experience || 0) + quest.rewards.experience;
        }

        localStorage.setItem('homeostasis_idle_save', JSON.stringify(currentState));

        // Force a reload to apply changes (or we could dispatch a custom event)
        window.location.reload();

        // Mark quest as claimed
        const store = useSimulationStore.getState();
        if (activeTab === 'daily') {
            const updated = store.dailyQuests.map((q: any) =>
                q.id === quest.id ? { ...q, claimed: true } : q
            );
            useSimulationStore.setState({ dailyQuests: updated });
        } else {
            const updated = store.storyQuests.map((q: any) =>
                q.id === quest.id ? { ...q, claimed: true } : q
            );
            useSimulationStore.setState({ storyQuests: updated });
        }

        // Show notification
        const rewards: string[] = [];
        if (quest.rewards.homeostasisPoints) rewards.push(`+${quest.rewards.homeostasisPoints} HP`);
        if (quest.rewards.atp) rewards.push(`+${quest.rewards.atp} ATP`);
        if (quest.rewards.hormones) rewards.push(`+${quest.rewards.hormones} Hormônios`);
        if (quest.rewards.experience) rewards.push(`+${quest.rewards.experience} XP`);

        toast.success(`Quest completa! ${rewards.join(', ')}`, {
            icon: '🎉',
            duration: 4000,
        });
    };

    const getDifficultyColor = (difficulty: QuestDifficulty) => {
        switch (difficulty) {
            case QuestDifficulty.EASY:
                return 'text-green-400';
            case QuestDifficulty.MEDIUM:
                return 'text-yellow-400';
            case QuestDifficulty.HARD:
                return 'text-red-400';
        }
    };

    const getDifficultyBg = (difficulty: QuestDifficulty) => {
        switch (difficulty) {
            case QuestDifficulty.EASY:
                return 'bg-green-500/20 border-green-500/30';
            case QuestDifficulty.MEDIUM:
                return 'bg-yellow-500/20 border-yellow-500/30';
            case QuestDifficulty.HARD:
                return 'bg-red-500/20 border-red-500/30';
        }
    };

    const renderQuest = (quest: Quest) => {
        if (!quest.unlocked) return null;

        const isCompleted = quest.completed;
        const isClaimed = quest.claimed;

        return (
            <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative p-4 rounded-lg border-2 backdrop-blur-sm transition-all ${isCompleted && !isClaimed
                    ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/50 shadow-lg shadow-green-500/20'
                    : isClaimed
                        ? 'bg-gray-800/40 border-gray-600/30 opacity-60'
                        : getDifficultyBg(quest.difficulty)
                    }`}
            >
                {/* Completed Badge */}
                {isCompleted && !isClaimed && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                    >
                        ✓ Completa!
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white">
                                {quest.title}
                            </h3>
                            <span className={`text-xs font-semibold uppercase ${getDifficultyColor(quest.difficulty)}`}>
                                {quest.difficulty}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300">{quest.description}</p>
                    </div>
                </div>

                {/* Objectives */}
                <div className="space-y-2 mb-4">
                    {quest.objectives.map((obj, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{obj.description}</span>
                                <span className="text-white font-mono">
                                    {Math.floor(obj.current)}/{obj.target}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(obj.current / obj.target) * 100}%` }}
                                    className={`h-full ${obj.completed
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                        }`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Rewards */}
                <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">Recompensas:</p>
                    <div className="flex flex-wrap gap-2">
                        {quest.rewards.homeostasisPoints && (
                            <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-300">
                                +{quest.rewards.homeostasisPoints} HP
                            </div>
                        )}
                        {quest.rewards.atp && (
                            <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-300">
                                +{quest.rewards.atp} ATP
                            </div>
                        )}
                        {quest.rewards.hormones && (
                            <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300">
                                +{quest.rewards.hormones} Hormônios
                            </div>
                        )}
                        {quest.rewards.experience && (
                            <div className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">
                                +{quest.rewards.experience} XP
                            </div>
                        )}
                    </div>
                </div>

                {/* Claim Button */}
                {isCompleted && !isClaimed && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleClaimReward(quest)}
                        className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all"
                    >
                        🎁 Resgatar Recompensas
                    </motion.button>
                )}

                {/* Claimed indicator */}
                {isClaimed && (
                    <div className="text-center text-sm text-gray-500 font-semibold">
                        ✓ Recompensas resgatadas
                    </div>
                )}

                {/* Expires indicator for daily quests */}
                {activeTab === 'daily' && quest.expiresAt && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                        Expira em {Math.floor((quest.expiresAt - Date.now()) / (1000 * 60 * 60))}h
                    </div>
                )}
            </motion.div>
        );
    };

    const quests = activeTab === 'daily' ? dailyQuests : storyQuests;
    const completedCount = quests.filter((q: Quest) => q.completed && q.unlocked).length;
    const totalCount = quests.filter((q: Quest) => q.unlocked).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-cyan-500/20">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                        📜 Missões
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Complete objetivos para ganhar recompensas
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-white transition-colors text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveTab('daily')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'daily'
                                        ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500/50 text-white'
                                        : 'bg-gray-700/30 border-2 border-transparent text-gray-400 hover:text-white'
                                        }`}
                                >
                                    🗓️ Diárias ({dailyQuests.filter((q: Quest) => q.completed && !q.claimed).length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('story')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'story'
                                        ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 text-white'
                                        : 'bg-gray-700/30 border-2 border-transparent text-gray-400 hover:text-white'
                                        }`}
                                >
                                    📖 Principais ({storyQuests.filter((q: Quest) => q.completed && !q.claimed).length})
                                </button>
                            </div>

                            {/* Progress */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-300">Progresso</span>
                                    <span className="text-white font-mono">{completedCount}/{totalCount}</span>
                                </div>
                                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Quest List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {quests.filter((q: Quest) => q.unlocked).map(renderQuest)}

                            {quests.filter((q: Quest) => q.unlocked).length === 0 && (
                                <div className="text-center text-gray-500 py-12">
                                    <p className="text-lg">Nenhuma quest disponível</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
