// Modal de confirmação de Prestige
import { formatNumber } from '../../game/idleSystem';
import { X, TrendingUp, Zap, RefreshCw } from 'lucide-react';

interface PrestigeModalProps {
    currentATP: number;
    totalATPEarned: number;
    stemCellsGained: number;
    currentMultiplier: number;
    newMultiplier: number;
    prestigeLevel: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PrestigeModal({
    currentATP,
    totalATPEarned,
    stemCellsGained,
    currentMultiplier,
    newMultiplier,
    prestigeLevel,
    onConfirm,
    onCancel
}: PrestigeModalProps) {
    const multiplierIncrease = newMultiplier / currentMultiplier;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div
                className="bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 rounded-2xl p-8 max-w-2xl w-full border-4 border-pink-500/50 shadow-2xl animate-pulse-slow"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4 animate-bounce">🧬</div>
                    <h2 className="text-4xl font-bold text-white mb-2">Reencarnação Celular</h2>
                    <p className="text-xl text-pink-300">Nível {prestigeLevel} → {prestigeLevel + 1}</p>
                </div>

                {/* Warning */}
                <div className="bg-red-900/40 border-2 border-red-500/50 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <div className="font-bold text-red-300 mb-1">ATENÇÃO: Reset Completo!</div>
                            <div className="text-sm text-gray-300">
                                Todos os órgãos, upgrades e recursos serão resetados.
                                Apenas o multiplicador permanente será mantido.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/40 rounded-xl p-4 border border-yellow-500/30">
                        <div className="text-xs text-gray-400 mb-1">ATP Atual</div>
                        <div className="text-2xl font-bold text-yellow-400">
                            <Zap className="inline mb-1" size={20} /> {formatNumber(currentATP)}
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-yellow-500/30">
                        <div className="text-xs text-gray-400 mb-1">ATP Total Ganho</div>
                        <div className="text-2xl font-bold text-yellow-400">
                            <TrendingUp className="inline mb-1" size={20} /> {formatNumber(totalATPEarned)}
                        </div>
                    </div>
                </div>

                {/* Rewards */}
                <div className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-xl p-6 mb-6 border-2 border-pink-400/50">
                    <div className="text-center mb-4">
                        <div className="text-sm text-gray-300 mb-2">Você receberá:</div>
                        <div className="text-5xl font-bold text-pink-300">
                            +{stemCellsGained} <span className="text-3xl">🧬</span>
                        </div>
                        <div className="text-lg text-pink-400 mt-2">Células-Tronco</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-400 mb-1">Multiplicador Atual</div>
                            <div className="text-xl font-bold text-white">{currentMultiplier.toFixed(2)}x</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-400 mb-1">Novo Multiplicador</div>
                            <div className="text-xl font-bold text-green-400">{(currentMultiplier * newMultiplier).toFixed(2)}x</div>
                        </div>
                    </div>

                    <div className="mt-4 text-center">
                        <div className="text-sm text-gray-300">
                            Ganho: <span className="text-green-400 font-bold">+{((multiplierIncrease - 1) * 100).toFixed(1)}%</span> produção permanente
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-black/40 rounded-xl p-4 mb-6">
                    <div className="text-sm font-bold text-cyan-400 mb-3">✨ Benefícios da Reencarnação:</div>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            <span>Multiplicador permanente de produção</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            <span>Progressão muito mais rápida no próximo ciclo</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            <span>Acesso a upgrades evolutivos de alto nível</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            <span>Células-Tronco acumulam infinitamente</span>
                        </li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 rounded-xl font-bold text-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                    >
                        <X className="inline mb-1" size={20} /> Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg transition-all"
                    >
                        <RefreshCw className="inline mb-1" size={20} /> Renascer Agora
                    </button>
                </div>
            </div>
        </div>
    );
}
