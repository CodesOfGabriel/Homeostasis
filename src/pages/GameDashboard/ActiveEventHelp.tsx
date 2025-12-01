import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { EVENT_SOLUTIONS } from '../../game/eventSolutions';

interface ActiveEventHelpProps {
    activeEvents: Array<{
        event: {
            id: string;
            title: string;
            description: string;
        };
        remainingTime: number;
    }>;
    showTips?: boolean;
}

export function ActiveEventHelp({ activeEvents, showTips = true }: ActiveEventHelpProps) {
    if (activeEvents.length === 0) {
        return (
            <div className="bg-green-950/30 rounded-xl p-4 border border-green-900/30">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-bold text-green-300">Sistema Estável</h3>
                </div>
                <p className="text-xs text-green-400/80">
                    Nenhum evento ativo. Todos os parâmetros dentro da faixa normal.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-cyan-950/30 rounded-xl p-4 border border-cyan-900/30">
            <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-cyan-300">Eventos Ativos {showTips && '& Soluções'}</h3>
            </div>

            <div className="space-y-3">
                {activeEvents.map((ae, index) => {
                    const solution = EVENT_SOLUTIONS[ae.event.id];

                    return (
                        <div
                            key={index}
                            className="bg-gray-900/50 rounded-lg p-3 border border-gray-800"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-gray-200">
                                        {ae.event.title}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        {ae.event.description}
                                    </div>
                                </div>
                                <div className="text-[10px] text-cyan-400 font-semibold ml-2">
                                    {ae.remainingTime.toFixed(0)}s
                                </div>
                            </div>

                            {showTips && solution && solution.optimalActions.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-800">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Info className="w-3 h-3 text-green-400" />
                                        <span className="text-[10px] font-semibold text-green-400">
                                            Ações Ótimas:
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {solution.optimalActions.map((actionId, i) => (
                                            <span
                                                key={i}
                                                className="text-[10px] bg-green-950/50 text-green-300 px-2 py-0.5 rounded-full border border-green-900/30"
                                            >
                                                {actionId}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showTips && solution && solution.requiredSubstances && (
                                <div className="mt-2 pt-2 border-t border-gray-800">
                                    <div className="text-[10px] font-semibold text-cyan-400 mb-1">
                                        Parâmetros Alvo:
                                    </div>
                                    <div className="space-y-1">
                                        {Object.entries(solution.requiredSubstances).map(
                                            ([param, limits], i) => (
                                                <div key={i} className="text-[10px] text-gray-400">
                                                    <span className="font-medium">{param}:</span>{' '}
                                                    {limits.min !== undefined &&
                                                        `min ${limits.min}`}
                                                    {limits.min !== undefined &&
                                                        limits.max !== undefined &&
                                                        ', '}
                                                    {limits.max !== undefined &&
                                                        `max ${limits.max}`}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showTips && (
                <div className="mt-3 text-[10px] text-cyan-300 bg-cyan-950/30 rounded-lg p-2 border border-cyan-900/30">
                    💡 <strong>Dica:</strong> Use as ações ótimas sugeridas para resolver eventos
                    com eficiência e ganhar pontos bônus!
                </div>
            )}
        </div>
    );
}
