import { Activity, Award, Zap } from 'lucide-react';

interface ComboDisplayProps {
    comboScore: number;
    activeCombo: {
        name: string;
        description: string;
    } | null;
    compact?: boolean;
}

export function ComboDisplay({ comboScore, activeCombo, compact = false }: ComboDisplayProps) {
    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-300">Score:</span>
                    <span className="text-sm font-bold text-purple-400">{comboScore}</span>
                </div>
                {activeCombo && (
                    <div className="flex items-center gap-1 animate-pulse">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs font-bold text-purple-300">{activeCombo.name}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-950/30 to-pink-950/30 rounded-xl p-4 border border-purple-900/30">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-bold text-purple-300">Pontuação de Performance</h3>
                </div>
                <div className="text-2xl font-bold text-purple-400">{comboScore}</div>
            </div>

            {activeCombo && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-purple-800/30 animate-pulse">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-yellow-400 animate-bounce" />
                        <span className="text-xs font-bold text-purple-300">{activeCombo.name}</span>
                    </div>
                    <p className="text-xs text-purple-400">{activeCombo.description}</p>
                </div>
            )}

            {!activeCombo && comboScore > 0 && (
                <div className="text-xs text-purple-400 text-center">
                    Continue com ações ótimas para desbloquear combos! 🎯
                </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-800">
                    <Activity className="w-3 h-3 text-purple-400 mx-auto mb-1" />
                    <div className="text-[10px] text-purple-400 font-semibold">Ações</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-800">
                    <Zap className="w-3 h-3 text-yellow-400 mx-auto mb-1" />
                    <div className="text-[10px] text-yellow-400 font-semibold">Combos</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-800">
                    <Award className="w-3 h-3 text-pink-400 mx-auto mb-1" />
                    <div className="text-[10px] text-pink-400 font-semibold">Ótimas</div>
                </div>
            </div>

            {comboScore === 0 && (
                <div className="mt-3 text-xs text-gray-400 text-center">
                    <p>💡 Dica: Use ações ótimas para ganhar pontos!</p>
                </div>
            )}
        </div>
    );
}
