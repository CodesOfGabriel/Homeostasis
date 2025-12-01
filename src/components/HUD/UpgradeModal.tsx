// Modal de detalhes do Upgrade
import { GlobalUpgrade, formatNumber } from '../../game/idleSystem';
import { X, TrendingUp } from 'lucide-react';

interface UpgradeModalProps {
    upgrade: GlobalUpgrade;
    currentCurrency: number;
    currencyName: string;
    currencyIcon: string;
    onClose: () => void;
    onPurchase: () => void;
}

export function UpgradeModal({
    upgrade,
    currentCurrency,
    currencyName,
    currencyIcon,
    onClose,
    onPurchase
}: UpgradeModalProps) {
    const canAfford = currentCurrency >= upgrade.cost;
    const isPurchased = upgrade.purchased;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-yellow-900 to-orange-900 rounded-2xl p-6 max-w-lg w-full border-2 border-yellow-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-5xl">{upgrade.icon}</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{upgrade.name}</h2>
                            <p className="text-sm text-yellow-300">
                                {isPurchased ? 'Ativo ✓' : 'Upgrade Global'}
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

                {/* Status */}
                {isPurchased ? (
                    <div className="bg-green-600/20 border border-green-500/50 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">✅</span>
                            <div>
                                <div className="font-bold text-green-400 text-lg">Upgrade Ativo</div>
                                <div className="text-sm text-gray-300">
                                    Este upgrade está aplicado permanentemente!
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">💰</span>
                                <div>
                                    <div className="text-sm text-gray-400">Custo</div>
                                    <div className="text-2xl font-bold text-yellow-300">
                                        {formatNumber(upgrade.cost)} {currencyIcon} {currencyName}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400">Você tem</div>
                                <div className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatNumber(currentCurrency)} {currencyIcon}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Effect */}
                <div className="bg-gradient-to-r from-green-600/20 to-cyan-600/20 rounded-xl p-5 mb-6 border-2 border-green-500/50">
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingUp size={24} className="text-green-400" />
                        <div className="text-lg font-bold text-green-400">Efeito do Upgrade</div>
                    </div>
                    <div className="text-3xl font-bold text-white text-center mb-2">
                        {upgrade.multiplier >= 2
                            ? `${upgrade.multiplier}x`
                            : `+${((upgrade.multiplier - 1) * 100).toFixed(0)}%`}
                    </div>
                    <div className="text-sm text-gray-300 text-center">
                        {upgrade.description}
                    </div>
                </div>

                {/* Description */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                    <div className="text-xs text-gray-400 mb-2">📋 Como Funciona</div>
                    <div className="text-sm text-gray-300 mb-4">
                        {getUpgradeExplanation(upgrade.id)}
                    </div>
                </div>

                {/* Impact Simulation */}
                {!isPurchased && (
                    <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
                        <div className="text-xs text-gray-400 mb-3">📊 Impacto Estimado</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <div className="text-xs text-gray-400">Produção Atual</div>
                                <div className="text-lg font-bold text-white">1,000 ATP/s</div>
                            </div>
                            <div className="bg-green-700/50 rounded-lg p-3 border border-green-500/30">
                                <div className="text-xs text-gray-400">Após Upgrade</div>
                                <div className="text-lg font-bold text-green-400">
                                    {(1000 * upgrade.multiplier).toFixed(0)} ATP/s
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Educational Info */}
                <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
                    <div className="text-xs text-gray-400 mb-2">🧠 Informação Fisiológica</div>
                    <div className="text-sm text-gray-300">
                        {getUpgradeEducation(upgrade.id)}
                    </div>
                </div>

                {/* Action Button */}
                {!isPurchased && (
                    <button
                        onClick={onPurchase}
                        disabled={!canAfford}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${canAfford
                                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Comprar Upgrade - {formatNumber(upgrade.cost)} {currencyIcon}
                    </button>
                )}
            </div>
        </div>
    );
}

function getUpgradeExplanation(upgradeId: string): string {
    const explanations: Record<string, string> = {
        efficientMitochondria: 'Multiplica a produção de ATP de TODOS os órgãos em 25%. Este é um boost global permanente que acelera significativamente sua progressão.',
        krebsCycle: 'O Ciclo de Krebs é otimizado para produzir 50% mais ATP através da respiração aeróbica. Afeta principalmente órgãos com alta demanda energética.',
        atpSynthase: 'Dobra a velocidade da enzima ATP Sintase nas mitocôndrias. Isso resulta em 2x mais ATP gerado por segundo em todos os órgãos.',
        hpaAxis: 'Converte situações de stress em produtividade através do cortisol controlado. Aumenta a produção em 30% durante eventos desafiadores.',
        thyroxineBoost: 'Aumenta os níveis de T3 e T4, acelerando o metabolismo basal. Dobra a taxa metabólica de todos os processos celulares.',
        cellularAdaptation: 'Permite que células evoluam automaticamente através de seleção natural. Aumenta eficiência em 50% através de adaptações epigenéticas.'
    };
    return explanations[upgradeId] || 'Melhoria permanente que aumenta a eficiência dos sistemas corporais.';
}

function getUpgradeEducation(upgradeId: string): string {
    const education: Record<string, string> = {
        efficientMitochondria: 'Mitocôndrias são as "usinas de energia" celulares. Cada célula tem 100-1000 mitocôndrias. Uma única molécula de glicose pode gerar 30-32 ATP através da fosforilação oxidativa.',
        krebsCycle: 'Descoberto por Hans Krebs (1937, Nobel 1953), o Ciclo de Krebs (ou Ciclo do Ácido Cítrico) é a via central do metabolismo aeróbico, gerando NADH e FADH₂ que alimentam a cadeia respiratória.',
        atpSynthase: 'A ATP Sintase é uma "nano-máquina" molecular que gira a 200 rev/s. Usa gradiente de prótons H⁺ para sintetizar ATP. É considerada uma das estruturas mais eficientes da natureza (>90% eficiência).',
        hpaAxis: 'O Eixo Hipotálamo-Pituitária-Adrenal controla a resposta ao stress. Libera cortisol que mobiliza glicose e ácidos graxos. Stress crônico desregula este sistema.',
        thyroxineBoost: 'Hormônios tireoidianos (T3/T4) regulam metabolismo em TODAS as células. Hipertireoidismo pode aumentar metabolismo em 60-100%. Controlam expressão de >100 genes.',
        cellularAdaptation: 'Adaptação celular ocorre via mudanças epigenéticas (metilação de DNA, histonas). Permite que células modifiquem função sem alterar DNA. Exemplos: hipertrofia muscular, aclimatação à altitude.'
    };
    return education[upgradeId] || 'Processo fisiológico que melhora eficiência corporal.';
}
