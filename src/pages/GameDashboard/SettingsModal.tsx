import { X, Info, Clock, Zap } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showTips: boolean;
    onToggleTips: (value: boolean) => void;
    pauseOnEvent: boolean;
    onTogglePauseOnEvent: (value: boolean) => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    showTips,
    onToggleTips,
    pauseOnEvent,
    onTogglePauseOnEvent
}: SettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <h2 className="text-xl font-bold">Configurações</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 rounded-lg p-2 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Tips Toggle */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <Info className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Dicas de Tutorial</h3>
                                    <p className="text-xs text-gray-600">Mostra sugestões de ações ótimas</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onToggleTips(!showTips)}
                                className={`relative w-12 h-6 rounded-full transition-all ${showTips ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showTips ? 'left-7' : 'left-1'
                                        }`}
                                />
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Quando ativado, você verá dicas sobre quais ações e combinações são mais eficientes
                            para resolver os eventos metabólicos ativos.
                        </p>
                    </div>

                    {/* Pause on Event Toggle */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Pausar em Eventos</h3>
                                    <p className="text-xs text-gray-600">Pausa automaticamente em novos eventos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onTogglePauseOnEvent(!pauseOnEvent)}
                                className={`relative w-12 h-6 rounded-full transition-all ${pauseOnEvent ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pauseOnEvent ? 'left-7' : 'left-1'
                                        }`}
                                />
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Quando ativado, a simulação pausa automaticamente sempre que um novo evento metabólico
                            ocorrer, dando mais tempo para você analisar e tomar decisões.
                        </p>
                    </div>

                    {/* Info Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                        <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-purple-900 mb-1 text-sm">Dica Profissional</h4>
                                <p className="text-xs text-purple-700 leading-relaxed">
                                    Combine ações corretas para desbloquear combos! Ações ótimas dão +50 pontos,
                                    e combos dão +100 pontos adicionais.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
