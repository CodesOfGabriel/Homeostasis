// Modal de detalhes do Gerente
import { Manager, formatNumber } from '../../game/idleSystem';
import { X, Zap } from 'lucide-react';

interface ManagerModalProps {
    manager: Manager;
    currentHormones: number;
    onClose: () => void;
    onPurchase: () => void;
}

export function ManagerModal({ manager, currentHormones, onClose, onPurchase }: ManagerModalProps) {
    const canAfford = currentHormones >= manager.cost;
    const isUnlocked = manager.unlocked;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 max-w-lg w-full border-2 border-purple-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-5xl">👨‍💼</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{manager.name}</h2>
                            <p className="text-sm text-purple-300">
                                {isUnlocked ? 'Contratado ✓' : 'Disponível para Contratação'}
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
                {isUnlocked ? (
                    <div className="bg-green-600/20 border border-green-500/50 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">✅</span>
                            <div>
                                <div className="font-bold text-green-400 text-lg">Gerente Ativo</div>
                                <div className="text-sm text-gray-300">
                                    Este gerente está trabalhando para você!
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-purple-600/20 border border-purple-500/50 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">💰</span>
                                <div>
                                    <div className="text-sm text-gray-400">Custo de Contratação</div>
                                    <div className="text-2xl font-bold text-purple-300">
                                        {formatNumber(manager.cost)} 🧬 Hormônios
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400">Você tem</div>
                                <div className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatNumber(currentHormones)} 🧬
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Description */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                    <div className="text-xs text-gray-400 mb-2">📋 Descrição</div>
                    <div className="text-sm text-gray-300 mb-4">
                        {manager.description}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">🎯 Responsabilidades</div>
                    <div className="text-sm text-gray-300">
                        {getManagerResponsibilities(manager.id)}
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-xl p-4 mb-6 border border-cyan-500/30">
                    <div className="text-sm font-bold text-cyan-400 mb-3">✨ Benefícios:</div>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-green-400">✓</span>
                            <span>
                                <span className="font-bold text-white">Automação Completa:</span> Órgãos produzem automaticamente
                            </span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-green-400">✓</span>
                            <span>
                                <span className="font-bold text-white">Bônus de Produção:</span> +{manager.bonus}% de eficiência
                            </span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-green-400">✓</span>
                            <span>
                                <span className="font-bold text-white">Ganhos Offline:</span> Continua produzindo quando você sai
                            </span>
                        </li>
                        {manager.id === 'homeostasisMaster' && (
                            <li className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="text-yellow-400">★</span>
                                <span>
                                    <span className="font-bold text-yellow-400">ESPECIAL:</span> +50% ganhos offline em todos os órgãos
                                </span>
                            </li>
                        )}
                    </ul>
                </div>

                {/* Educational Info */}
                <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
                    <div className="text-xs text-gray-400 mb-2">🧠 Informação Fisiológica</div>
                    <div className="text-sm text-gray-300">
                        {getManagerEducation(manager.id)}
                    </div>
                </div>

                {/* Action Button */}
                {!isUnlocked && (
                    <button
                        onClick={onPurchase}
                        disabled={!canAfford}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${canAfford
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Zap size={20} />
                        Contratar - {formatNumber(manager.cost)} 🧬 Hormônios
                    </button>
                )}
            </div>
        </div>
    );
}

function getManagerResponsibilities(managerId: string): string {
    const responsibilities: Record<string, string> = {
        autonomicNervous: 'Monitora e regula automaticamente a frequência cardíaca e respiratória. Mantém funções vitais sem necessidade de controle consciente.',
        endocrineSystem: 'Coordena a liberação hormonal para otimizar o metabolismo. Balanceia insulina, glucagon e hormônios tireoidianos.',
        renalSystem: 'Gerencia a filtração glomerular e reabsorção tubular. Remove toxinas e mantém o equilíbrio hidroeletrolítico.',
        homeostasisMaster: 'Integra TODOS os sistemas do corpo. Usa feedback negativo para manter a estabilidade interna (temperatura, pH, glicemia) dentro de faixas ideais.'
    };
    return responsibilities[managerId] || 'Gerencia sistemas fisiológicos automaticamente.';
}

function getManagerEducation(managerId: string): string {
    const education: Record<string, string> = {
        autonomicNervous: 'O Sistema Nervoso Autônomo divide-se em Simpático (luta/fuga) e Parassimpático (descanso/digestão). É involuntário e opera 24/7.',
        endocrineSystem: 'O Sistema Endócrino usa mensageiros químicos (hormônios) no sangue. Mais lento que nervos, mas efeitos duradouros. Inclui hipófise, tireoide, pâncreas e adrenais.',
        renalSystem: 'Os néfrons renais filtram 180L de sangue/dia, mas reabsorvem 99%. Regulam pressão arterial via sistema renina-angiotensina-aldosterona.',
        homeostasisMaster: 'Homeostase é o princípio central da fisiologia: manter constância interna apesar de mudanças externas. Descoberto por Claude Bernard (1865).'
    };
    return education[managerId] || 'Sistema vital do corpo humano.';
}
