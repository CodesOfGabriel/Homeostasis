// Modal de Conquistas/Achievements
import { Achievement } from '../../game/achievements';
import { X, Award, Lock } from 'lucide-react';

interface AchievementsModalProps {
    achievements: Record<string, Achievement>;
    onClose: () => void;
}

export function AchievementsModal({ achievements, onClose }: AchievementsModalProps) {
    const categories = [
        { id: 'production', name: 'Produção', icon: '⚡' },
        { id: 'organs', name: 'Órgãos', icon: '🫀' },
        { id: 'mastery', name: 'Maestria', icon: '🎯' },
        { id: 'prestige', name: 'Prestígio', icon: '🧬' },
        { id: 'speed', name: 'Velocidade', icon: '🚀' }
    ];

    const achievementsByCategory = (categoryId: string) => {
        return Object.values(achievements).filter(a => a.category === categoryId);
    };

    const totalAchievements = Object.values(achievements).length;
    const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length;
    const completionPercent = (unlockedCount / totalAchievements) * 100;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900/95 pb-4 z-10">
                    <div className="flex items-center gap-3">
                        <Award size={40} className="text-yellow-400" />
                        <div>
                            <h2 className="text-3xl font-bold text-white">Conquistas</h2>
                            <p className="text-sm text-gray-400">
                                {unlockedCount} de {totalAchievements} desbloqueadas ({completionPercent.toFixed(0)}%)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="bg-slate-700 rounded-full h-4 mb-8 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 h-full transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                    />
                </div>

                {/* Categories */}
                {categories.map(category => {
                    const categoryAchievements = achievementsByCategory(category.id);
                    const categoryUnlocked = categoryAchievements.filter(a => a.unlocked).length;

                    return (
                        <div key={category.id} className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">{category.icon}</span>
                                <h3 className="text-xl font-bold text-white">{category.name}</h3>
                                <span className="text-sm text-gray-400">
                                    ({categoryUnlocked}/{categoryAchievements.length})
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {categoryAchievements.map(achievement => (
                                    <div
                                        key={achievement.id}
                                        className={`rounded-xl p-4 border-2 transition-all ${achievement.unlocked
                                                ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/50'
                                                : 'bg-slate-800/50 border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="text-4xl flex-shrink-0">
                                                {achievement.unlocked ? achievement.icon : <Lock size={32} className="text-gray-600" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-1">
                                                    <h4 className={`font-bold ${achievement.unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>
                                                        {achievement.name}
                                                    </h4>
                                                    {achievement.unlocked && (
                                                        <span className="text-green-400 text-sm">✓</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mb-2">
                                                    {achievement.description}
                                                </p>

                                                {/* Progress */}
                                                {!achievement.unlocked && (
                                                    <div className="mb-2">
                                                        <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-cyan-500 h-full transition-all"
                                                                style={{
                                                                    width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {achievement.progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Reward */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-gray-500">Recompensa:</span>
                                                    <span className={`text-xs font-bold ${achievement.unlocked ? 'text-green-400' : 'text-gray-400'}`}>
                                                        {achievement.reward.type === 'experience' && `${achievement.reward.amount} XP`}
                                                        {achievement.reward.type === 'hormones' && `${achievement.reward.amount} 🧬 Hormônios`}
                                                        {achievement.reward.type === 'multiplier' && `${((achievement.reward.amount - 1) * 100).toFixed(0)}% Multiplicador`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
