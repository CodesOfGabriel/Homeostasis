// Panel showing ATP Flow, Biomass Reserves, Homeostasis Score
import { useSimulationStore } from '../../game/simulationStore';
import { Activity, Droplet, Gauge, Scale, TrendingDown, TrendingUp } from 'lucide-react';

export function PhysiologyStatusPanel() {
    const physiology = useSimulationStore(state => state.parameters);

    // Calculate percentages for visual bars
    const glycogenPercent = (physiology.glycogen / 600) * 100;
    const fatPercent = ((physiology.adiposeTissue - 5) / 45) * 100; // 5-50kg range

    // Determine status colors
    const getHomeostasisColor = (score: number) => {
        if (score >= 80) return 'text-green-400 bg-green-900/20 border-green-500/30';
        if (score >= 60) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
        return 'text-red-400 bg-red-900/20 border-red-500/30';
    };

    const getAllostaticColor = (load: number) => {
        if (load < 30) return 'text-green-400 bg-green-900/20 border-green-500/30';
        if (load < 60) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
        return 'text-red-400 bg-red-900/20 border-red-500/30';
    };

    const getBalanceColor = (balance: number) => {
        if (balance > 5) return 'text-green-400';
        if (balance > 0) return 'text-yellow-400';
        if (balance > -5) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm rounded-xl border border-cyan-500/20 shadow-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    Status Fisiológico
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* ATP FLOW */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            Produção ATP
                        </span>
                        <span className="text-green-400 font-bold">
                            {physiology.atpProduction.toFixed(1)} mmol/s
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-1">
                            <TrendingDown className="w-4 h-4 text-orange-400" />
                            Consumo ATP
                        </span>
                        <span className="text-orange-400 font-bold">
                            {physiology.atpConsumption.toFixed(1)} mmol/s
                        </span>
                    </div>

                    <div className={`flex items-center justify-between text-sm p-2 rounded-lg border ${physiology.atpBalance >= 0
                            ? 'bg-green-900/20 border-green-500/30'
                            : 'bg-red-900/20 border-red-500/30'
                        }`}>
                        <span className="text-gray-300 flex items-center gap-1 font-bold">
                            <Scale className="w-4 h-4" />
                            Balanço
                        </span>
                        <span className={`font-bold flex items-center gap-1 ${getBalanceColor(physiology.atpBalance)}`}>
                            {physiology.atpBalance >= 0 ? '+' : ''}
                            {physiology.atpBalance.toFixed(1)} mmol/s
                            {physiology.atpBalance > 0 ? ' 📈' : physiology.atpBalance < 0 ? ' 📉' : ' ⚖️'}
                        </span>
                    </div>
                </div>

                {/* BIOMASS RESERVES */}
                <div className="space-y-3">
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">Glicogênio</span>
                            <span className="text-yellow-400 font-bold">
                                {physiology.glycogen.toFixed(0)}g / 600g
                            </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-300"
                                style={{ width: `${glycogenPercent}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">Gordura</span>
                            <span className="text-orange-400 font-bold">
                                {physiology.adiposeTissue.toFixed(1)}kg / 50kg
                            </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                                style={{ width: `${fatPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 flex items-center gap-1 pt-1">
                        <Droplet className="w-3 h-3" />
                        {physiology.atpBalance > 0
                            ? 'Acumulando reservas...'
                            : physiology.atpBalance < 0
                                ? 'Queimando reservas!'
                                : 'Equilíbrio energético'}
                    </div>
                </div>
            </div>

            {/* HOMEOSTASIS & ALLOSTATIC LOAD */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/50">
                <div className={`p-3 rounded-lg border ${getHomeostasisColor(physiology.homeostasisScore)}`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs opacity-70 flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            Homeostase
                        </span>
                        <span className="text-xl font-bold">
                            {physiology.homeostasisScore.toFixed(0)}
                        </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${physiology.homeostasisScore >= 80 ? 'bg-green-500' :
                                    physiology.homeostasisScore >= 60 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                }`}
                            style={{ width: `${physiology.homeostasisScore}%` }}
                        />
                    </div>
                    {physiology.homeostasisScore > 70 && (
                        <div className="text-xs mt-1 text-green-400 font-medium">
                            ✅ Gerando HP!
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-lg border ${getAllostaticColor(physiology.allostaticLoad)}`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs opacity-70">Carga Alostática</span>
                        <span className="text-xl font-bold">
                            {physiology.allostaticLoad.toFixed(0)}
                        </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${physiology.allostaticLoad < 30 ? 'bg-green-500' :
                                    physiology.allostaticLoad < 60 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                }`}
                            style={{ width: `${physiology.allostaticLoad}%` }}
                        />
                    </div>
                    {physiology.allostaticLoad > 60 && (
                        <div className="text-xs mt-1 text-red-400 font-medium">
                            ⚠️ Estresse crônico!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
