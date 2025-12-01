// Modal de detalhes do Órgão
import { OrganGenerator, formatNumber, calculateOrganProduction } from '../../game/idleSystem';
import { X } from 'lucide-react';

interface OrganModalProps {
    organ: OrganGenerator;
    globalMultiplier: number;
    onClose: () => void;
    onUpgrade: () => void;
    canAfford: boolean;
}

export function OrganModal({ organ, globalMultiplier, onClose, onUpgrade, canAfford }: OrganModalProps) {
    const currentProduction = calculateOrganProduction(organ, globalMultiplier);
    const nextLevelProduction = calculateOrganProduction(
        { ...organ, level: organ.level + 1 },
        globalMultiplier
    );
    const productionIncrease = nextLevelProduction - currentProduction;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-lg w-full border-2 border-cyan-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-5xl">{organ.icon}</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{organ.name}</h2>
                            <p className="text-sm text-gray-400">
                                {organ.owned ? `Nível ${organ.level}` : 'Bloqueado'}
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

                {/* Stats */}
                <div className="space-y-4 mb-6">
                    {organ.owned ? (
                        <>
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <div className="text-xs text-gray-400 mb-1">Produção Atual</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {organ.id === 'brain' ? '🧬' : '⚡'} {formatNumber(currentProduction)}/s
                                </div>
                            </div>

                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <div className="text-xs text-gray-400 mb-1">Próximo Nível ({organ.level + 1})</div>
                                <div className="text-xl font-bold text-cyan-400">
                                    {organ.id === 'brain' ? '🧬' : '⚡'} {formatNumber(nextLevelProduction)}/s
                                </div>
                                <div className="text-sm text-green-400 mt-1">
                                    +{formatNumber(productionIncrease)}/s ({((productionIncrease / currentProduction) * 100).toFixed(1)}%)
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-xs text-gray-400">Produção Base</div>
                                    <div className="text-lg font-bold">{organ.baseProduction}/s</div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-xs text-gray-400">Multiplicador</div>
                                    <div className="text-lg font-bold">{organ.productionMultiplier.toFixed(2)}x/nível</div>
                                </div>
                            </div>

                            {organ.automated && (
                                <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-3 flex items-center gap-2">
                                    <span className="text-2xl">🤖</span>
                                    <div>
                                        <div className="font-bold text-blue-400">Automatizado</div>
                                        <div className="text-xs text-gray-400">Produz continuamente sem cliques</div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                            <div className="text-4xl mb-3">🔒</div>
                            <div className="text-lg font-bold mb-2">Órgão Bloqueado</div>
                            <div className="text-sm text-gray-400">
                                Desbloqueie para começar a produzir {organ.baseProduction} {organ.id === 'brain' ? 'Hormônios' : 'ATP'}/s
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                    <div className="text-xs text-gray-400 mb-2">📚 Informação Fisiológica</div>
                    <div className="text-sm text-gray-300">
                        {getOrganDescription(organ.id)}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={onUpgrade}
                    disabled={!canAfford}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${canAfford
                            ? 'bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {organ.owned ? 'Melhorar' : 'Desbloquear'} - {formatNumber(organ.cost)} ATP
                </button>
            </div>
        </div>
    );
}

function getOrganDescription(organId: string): string {
    const descriptions: Record<string, string> = {
        heart: 'O coração bombeia sangue oxigenado para todo o corpo. Cada batimento transporta ATP e nutrientes essenciais para manter a vida celular.',
        lungs: 'Os pulmões realizam trocas gasosas através dos alvéolos, captando O₂ e eliminando CO₂. A respiração aeróbica multiplica a produção de ATP.',
        liver: 'O fígado é a central metabólica do corpo. Processa nutrientes, sintetiza proteínas e regula a glicemia, sendo crucial para a produção energética.',
        brain: 'O cérebro controla sistemas homeostáticos e produz hormônios reguladores. Gasta 20% da energia corporal apesar de ser apenas 2% do peso.',
        kidneys: 'Os rins filtram 180L de sangue por dia, mantendo o equilíbrio hídrico e eletrolítico. Essenciais para a homeostase celular.',
        stomach: 'O estômago inicia a digestão proteica através do ácido clorídrico e pepsina, convertendo alimentos em nutrientes absorvíveis.'
    };
    return descriptions[organId] || 'Órgão vital do corpo humano.';
}
