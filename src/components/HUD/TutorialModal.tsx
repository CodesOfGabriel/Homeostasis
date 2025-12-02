// Modal de Tutorial/Ajuda
import { X, Zap, TrendingUp, Award, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface TutorialModalProps {
    onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
    const [currentPage, setCurrentPage] = useState(0);

    const pages = [
        {
            title: 'Bem-vindo ao Homeostasis Idle! 🧬',
            icon: '🎮',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Este é um jogo incremental/idle onde você gerencia o corpo humano como um império de produção de energia!
                    </p>
                    <div className="bg-cyan-600/20 border border-cyan-500/50 rounded-lg p-4">
                        <h4 className="font-bold text-cyan-400 mb-2">🎯 Objetivo Principal</h4>
                        <p className="text-sm text-gray-300">
                            Gere ATP (energia celular) através dos seus órgãos, evolua-os, contrate gerentes para automatização,
                            e faça "Reencarnação Celular" (prestige) para multiplicadores permanentes!
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Sistema de Moedas 💰',
            icon: '💵',
            content: (
                <div className="space-y-3">
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-800/20 border border-green-500/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">⚖️</span>
                            <h4 className="font-bold text-green-400">Pontos de Homeostase (NOVO!)</h4>
                        </div>
                        <p className="text-sm text-gray-300">
                            <strong>Moeda PRINCIPAL do jogo!</strong> Gerada automaticamente quando você mantém o corpo em equilíbrio.
                            Homeostase {'>'} 70 e Carga Alostática {'<'} 30 = Ganhe HP/s!
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border border-yellow-500/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="text-yellow-400" size={24} />
                            <h4 className="font-bold text-yellow-400">ATP (Adenosina Trifosfato)</h4>
                        </div>
                        <p className="text-sm text-gray-300">
                            Moeda gerada pelos órgãos. Use para desbloquear e melhorar órgãos,
                            comprar upgrades metabólicos.
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-500/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🧬</span>
                            <h4 className="font-bold text-purple-400">Hormônios</h4>
                        </div>
                        <p className="text-sm text-gray-300">
                            Moeda premium gerada pelo Cérebro. Necessária para contratar Gerentes
                            e comprar upgrades hormonais.
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-cyan-600/20 to-cyan-800/20 border border-cyan-500/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🔬</span>
                            <h4 className="font-bold text-cyan-400">Células-Tronco</h4>
                        </div>
                        <p className="text-sm text-gray-300">
                            Moeda de prestígio obtida através da Reencarnação Celular.
                            Cada célula fornece +10% multiplicador PERMANENTE!
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Órgãos Geradores 🫀',
            icon: '🫀',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Cada órgão funciona como um departamento idle que gera recursos automaticamente:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-2xl mb-1">🫀</div>
                            <div className="font-bold text-sm text-white">Coração</div>
                            <div className="text-xs text-gray-400">10 ATP/s (inicial)</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-2xl mb-1">🫁</div>
                            <div className="font-bold text-sm text-white">Pulmões</div>
                            <div className="text-xs text-gray-400">15 ATP/s</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-2xl mb-1">🟤</div>
                            <div className="font-bold text-sm text-white">Fígado</div>
                            <div className="text-xs text-gray-400">20 ATP/s</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-2xl mb-1">🧠</div>
                            <div className="font-bold text-sm text-white">Cérebro</div>
                            <div className="text-xs text-gray-400">2 Hormônios/min</div>
                        </div>
                    </div>
                    <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-3">
                        <p className="text-xs text-gray-300">
                            <span className="font-bold text-green-400">💡 Dica:</span> Clique nos órgãos para ver detalhes!
                            Melhorar aumenta produção em ~5% por nível. Custos crescem exponencialmente (×1.15).
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Sistema de Homeostase ⚖️ (NOVO!)',
            icon: '⚖️',
            content: (
                <div className="space-y-4">
                    <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4">
                        <h4 className="font-bold text-green-400 mb-2">📊 Score de Homeostase (0-100)</h4>
                        <p className="text-sm text-gray-300 mb-3">
                            Mede o quão bem seu corpo está equilibrado. Quanto mais próximo dos valores ideais,
                            maior o score!
                        </p>
                        <div className="text-xs space-y-1 text-gray-400">
                            <div>✓ Frequência Cardíaca: ~70 bpm</div>
                            <div>✓ Respiração: ~14 rpm</div>
                            <div>✓ Glicose: ~90 mg/dL</div>
                            <div>✓ Temperatura: ~36.8°C</div>
                            <div>✓ pH: ~7.4</div>
                            <div>✓ Oxigênio: ~98%</div>
                        </div>
                    </div>

                    <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-4">
                        <h4 className="font-bold text-red-400 mb-2">⚠️ Carga Alostática (0-100)</h4>
                        <p className="text-sm text-gray-300 mb-2">
                            Acumula quando você está em estresse crônico. Reduz lentamente durante descanso.
                        </p>
                        <div className="text-xs text-gray-400">
                            Alto cortisol, glicose desregulada, baixo O₂ = aumenta carga!
                        </div>
                    </div>

                    <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-4">
                        <h4 className="font-bold text-yellow-400 mb-2">⚡ Balanço de ATP</h4>
                        <p className="text-sm text-gray-300">
                            <strong>Produção - Consumo = Balanço</strong><br />
                            Positivo = armazena glicogênio/gordura<br />
                            Negativo = queima reservas!<br />
                            Crítico negativo = aumenta carga alostática
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Gerentes e Automação 👨‍💼',
            icon: '👨‍💼',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Gerentes automatizam órgãos e fornecem bônus de produção:
                    </p>
                    <div className="space-y-2">
                        <div className="bg-blue-800/30 border border-blue-500/50 rounded-lg p-3">
                            <div className="font-bold text-blue-400 mb-1">Sistema Nervoso Autônomo</div>
                            <div className="text-xs text-gray-300">
                                • Automatiza: Coração + Pulmões<br />
                                • Bônus: +10% produção<br />
                                • Custo: 100 🧬 Hormônios
                            </div>
                        </div>
                        <div className="bg-purple-800/30 border border-purple-500/50 rounded-lg p-3">
                            <div className="font-bold text-purple-400 mb-1">Homeostase Master</div>
                            <div className="text-xs text-gray-300">
                                • Automatiza: TODOS os órgãos<br />
                                • Bônus: +50% offline<br />
                                • Custo: 500 🧬 Hormônios
                            </div>
                        </div>
                    </div>
                    <div className="bg-cyan-600/20 border border-cyan-500/50 rounded-lg p-3">
                        <p className="text-xs text-gray-300">
                            <span className="font-bold text-cyan-400">⚡ Importante:</span> Sem gerentes, você ganha apenas
                            50% de ATP offline. Com gerentes, ganha 100%!
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Upgrades Globais 🔬',
            icon: '🔬',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Upgrades permanentes que multiplicam TODA a produção:
                    </p>
                    <div className="space-y-2">
                        <div className="bg-yellow-800/30 border border-yellow-500/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={16} className="text-yellow-400" />
                                <div className="font-bold text-yellow-400">Upgrades Metabólicos (ATP)</div>
                            </div>
                            <div className="text-xs text-gray-300">
                                Mitocôndrias Eficientes (+25%), Ciclo de Krebs (+50%), ATP Sintase (×2)
                            </div>
                        </div>
                        <div className="bg-purple-800/30 border border-purple-500/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-purple-400">🧬</span>
                                <div className="font-bold text-purple-400">Upgrades Hormonais (Hormônios)</div>
                            </div>
                            <div className="text-xs text-gray-300">
                                Eixo HPA (+30%), Tiroxina Boost (×2)
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-3">
                        <p className="text-xs text-gray-300">
                            <span className="font-bold text-green-400">📚 Educacional:</span> Cada upgrade é baseado
                            em processos fisiológicos reais. Aprenda enquanto joga!
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Reencarnação Celular 🧬',
            icon: '🧬',
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-2 border-pink-500/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <RefreshCw className="text-pink-400" size={24} />
                            <h4 className="font-bold text-pink-400 text-lg">Sistema de Prestígio</h4>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">
                            Ao atingir 1.000.000 ATP total, você pode fazer Reencarnação Celular:
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <span className="text-red-400">⚠️</span>
                                <span className="text-gray-300">
                                    <span className="font-bold">Reset:</span> ATP, Hormônios, níveis e upgrades
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-300">
                                    <span className="font-bold">Mantém:</span> Multiplicador permanente
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-cyan-400">🔬</span>
                                <span className="text-gray-300">
                                    <span className="font-bold">Ganha:</span> Células-Tronco (cada = +10% permanente)
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-3">
                        <p className="text-xs text-gray-300">
                            <span className="font-bold text-yellow-400">💎 Estratégia:</span> Quanto mais ATP você
                            acumular antes do prestige, mais Células-Tronco receberá. Mas não demore demais!
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Conquistas 🏆',
            icon: '🏆',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Desbloqueie conquistas para ganhar recompensas extras:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">⚡</div>
                            <div className="text-xs font-bold text-white">Produção</div>
                            <div className="text-xs text-gray-400">ATP gerado</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">🫀</div>
                            <div className="text-xs font-bold text-white">Órgãos</div>
                            <div className="text-xs text-gray-400">Desbloqueios</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">🎯</div>
                            <div className="text-xs font-bold text-white">Maestria</div>
                            <div className="text-xs text-gray-400">Gerentes/Upgrades</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">🧬</div>
                            <div className="text-xs font-bold text-white">Prestígio</div>
                            <div className="text-xs text-gray-400">Reencarnações</div>
                        </div>
                    </div>
                    <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="text-purple-400" size={20} />
                            <span className="font-bold text-purple-400">Recompensas</span>
                        </div>
                        <p className="text-xs text-gray-300">
                            Conquistas dão XP, Hormônios ou Multiplicadores permanentes!
                            Clique no botão 🏆 para ver todas.
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'Dicas de Progressão 💡',
            icon: '💡',
            content: (
                <div className="space-y-3">
                    <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-3">
                        <div className="font-bold text-green-400 mb-1">1. Comece com Pulmões</div>
                        <p className="text-xs text-gray-300">
                            Desbloqueie os Pulmões (100 ATP) primeiro. Eles geram 50% mais que o Coração!
                        </p>
                    </div>
                    <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-3">
                        <div className="font-bold text-blue-400 mb-1">2. Foco no Cérebro</div>
                        <p className="text-xs text-gray-300">
                            Desbloqueie o Cérebro (1K ATP) para começar a gerar Hormônios e contratar gerentes.
                        </p>
                    </div>
                    <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-3">
                        <div className="font-bold text-purple-400 mb-1">3. Primeiro Gerente</div>
                        <p className="text-xs text-gray-300">
                            Contrate o Sistema Nervoso Autônomo (100H) para automatizar Coração e Pulmões.
                        </p>
                    </div>
                    <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-3">
                        <div className="font-bold text-yellow-400 mb-1">4. Balance Upgrades</div>
                        <p className="text-xs text-gray-300">
                            Compre upgrades metabólicos para multiplicadores globais antes de focar em níveis altos.
                        </p>
                    </div>
                    <div className="bg-pink-600/20 border border-pink-500/50 rounded-lg p-3">
                        <div className="font-bold text-pink-400 mb-1">5. Prestige no 1M</div>
                        <p className="text-xs text-gray-300">
                            Faça seu primeiro prestige assim que atingir 1M ATP. O multiplicador acelera MUITO!
                        </p>
                    </div>
                </div>
            )
        }
    ];

    const currentPageData = pages[currentPage];

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 max-w-2xl w-full border-2 border-cyan-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-5xl">{currentPageData.icon}</span>
                        <h2 className="text-2xl font-bold text-white">{currentPageData.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6 min-h-[400px]">
                    {currentPageData.content}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === 0
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            }`}
                    >
                        ← Anterior
                    </button>

                    <div className="flex gap-2">
                        {pages.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPage(index)}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentPage
                                    ? 'bg-cyan-400 w-8'
                                    : 'bg-gray-600 hover:bg-gray-500'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            if (currentPage === pages.length - 1) {
                                onClose();
                            } else {
                                setCurrentPage(Math.min(pages.length - 1, currentPage + 1));
                            }
                        }}
                        className="px-4 py-2 rounded-lg font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                    >
                        {currentPage === pages.length - 1 ? 'Começar! 🚀' : 'Próximo →'}
                    </button>
                </div>

                {/* Page indicator */}
                <div className="text-center mt-4 text-sm text-gray-500">
                    Página {currentPage + 1} de {pages.length}
                </div>
            </div>
        </div>
    );
}
