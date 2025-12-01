// Energy Balance Scale - Visual feedback for nutritional status
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Scale } from 'lucide-react';

interface EnergyBalanceScaleProps {
    bmi: number;
    bodyMass: number;
    fatMass: number;
    leanMass: number;
    energy: number;
    glucose: number;
}

export function EnergyBalanceScale({
    bmi,
    bodyMass,
    fatMass,
    energy,
}: EnergyBalanceScaleProps) {
    // Calculate nutritional status
    const getStatus = () => {
        if (bmi < 16) return { level: 'severe-underweight', label: 'Inanição Severa', color: '#DC2626', icon: '💀' };
        if (bmi < 17) return { level: 'underweight-critical', label: 'Desnutrição Crítica', color: '#EF4444', icon: '⚠️' };
        if (bmi < 18.5) return { level: 'underweight', label: 'Abaixo do Peso', color: '#F59E0B', icon: '📉' };
        if (bmi < 25) return { level: 'normal', label: 'Peso Saudável', color: '#10B981', icon: '✅' };
        if (bmi < 30) return { level: 'overweight', label: 'Sobrepeso', color: '#F59E0B', icon: '📈' };
        if (bmi < 35) return { level: 'obese-1', label: 'Obesidade Grau I', color: '#EF4444', icon: '⚠️' };
        if (bmi < 40) return { level: 'obese-2', label: 'Obesidade Grau II', color: '#DC2626', icon: '🚨' };
        return { level: 'obese-3', label: 'Obesidade Grau III', color: '#991B1B', icon: '💀' };
    };

    const status = getStatus();
    const bodyFatPercentage = (fatMass / bodyMass) * 100;
    const isCritical = bmi < 17 || bmi > 35;

    // Energy deficit/surplus indicator
    const energyBalance = energy < 30 ? 'deficit' : energy > 80 ? 'surplus' : 'balanced';

    return (
        <div className={`bg-gradient-to-br ${isCritical
            ? 'from-red-900/30 to-red-800/20 border-red-500'
            : 'from-gray-900/30 to-gray-800/20 border-purple-500/30'
            } border-2 rounded-xl p-4 transition-all`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Scale className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-purple-400'}`} />
                    <h3 className={`text-sm font-bold ${isCritical ? 'text-red-400' : 'text-purple-400'}`}>
                        Balanço Energético
                    </h3>
                </div>
                <span className="text-2xl">{status.icon}</span>
            </div>

            {/* BMI Display */}
            <div className="bg-black/30 rounded-lg p-3 mb-3 border border-gray-700">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-gray-400">BMI (Índice de Massa Corporal)</span>
                    <motion.span
                        className="text-2xl font-bold font-mono"
                        style={{ color: status.color }}
                        animate={isCritical ? {
                            scale: [1, 1.1, 1],
                            opacity: [1, 0.7, 1]
                        } : {}}
                        transition={{
                            duration: 1.5,
                            repeat: isCritical ? Infinity : 0
                        }}
                    >
                        {bmi.toFixed(1)}
                    </motion.span>
                </div>
                <div className="text-center">
                    <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{
                            backgroundColor: `${status.color}20`,
                            color: status.color,
                            border: `1px solid ${status.color}`
                        }}
                    >
                        {status.label}
                    </span>
                </div>
            </div>

            {/* BMI Scale Visualization */}
            <div className="mb-3">
                <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden">
                    {/* Color gradient background */}
                    <div className="absolute inset-0 flex">
                        <div className="flex-1 bg-red-600"></div>
                        <div className="flex-1 bg-orange-500"></div>
                        <div className="flex-1 bg-green-500"></div>
                        <div className="flex-1 bg-orange-500"></div>
                        <div className="flex-1 bg-red-600"></div>
                    </div>

                    {/* BMI Pointer */}
                    <motion.div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                        style={{
                            left: `${Math.max(0, Math.min(100, ((bmi - 15) / 30) * 100))}%`,
                        }}
                        animate={{
                            boxShadow: isCritical
                                ? ['0 0 10px #fff', '0 0 20px #fff', '0 0 10px #fff']
                                : '0 0 10px #fff',
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-black px-2 py-0.5 rounded whitespace-nowrap">
                            ▼ {bmi.toFixed(1)}
                        </div>
                    </motion.div>
                </div>

                {/* Scale labels */}
                <div className="flex justify-between text-[8px] text-gray-500 mt-1 px-1">
                    <span>15</span>
                    <span>18.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>35</span>
                    <span>45</span>
                </div>
            </div>

            {/* Body Composition */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black/20 rounded-lg p-2 border border-gray-700">
                    <div className="text-[9px] text-gray-400 mb-1">Peso Total</div>
                    <div className="text-lg font-bold text-cyan-400">{bodyMass.toFixed(1)} kg</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2 border border-gray-700">
                    <div className="text-[9px] text-gray-400 mb-1">Gordura</div>
                    <div className={`text-lg font-bold ${bodyFatPercentage > 25 ? 'text-orange-400' : 'text-green-400'}`}>
                        {bodyFatPercentage.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Energy Balance Indicator */}
            <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Balanço Calórico</span>
                    {energyBalance === 'deficit' && <TrendingDown className="w-4 h-4 text-red-400" />}
                    {energyBalance === 'surplus' && <TrendingUp className="w-4 h-4 text-blue-400" />}
                    {energyBalance === 'balanced' && <span className="text-green-400">⚖️</span>}
                </div>

                {/* Energy bar */}
                <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <motion.div
                        className={`absolute inset-y-0 left-0 rounded-full ${energy < 30 ? 'bg-red-500' : energy > 80 ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                        style={{ width: `${energy}%` }}
                        animate={{
                            opacity: energy < 30 || energy > 80 ? [1, 0.6, 1] : 1,
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </div>

                <div className="text-[9px] text-gray-400">
                    {energyBalance === 'deficit' && '⚠️ Déficit energético - risco de catabolismo'}
                    {energyBalance === 'surplus' && '📈 Excesso calórico - acúmulo de gordura'}
                    {energyBalance === 'balanced' && '✅ Balanço energético adequado'}
                </div>
            </div>

            {/* Critical Warning */}
            {isCritical && (
                <motion.div
                    className="mt-3 bg-red-900/50 border-2 border-red-500 rounded-lg p-2"
                    animate={{
                        opacity: [1, 0.7, 1],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    <div className="text-xs font-bold text-red-300 text-center">
                        ⚠️ ESTADO NUTRICIONAL CRÍTICO ⚠️
                    </div>
                    <div className="text-[10px] text-red-400 text-center mt-1">
                        {bmi < 17 ? 'Risco de falência orgânica!' : 'Risco metabólico elevado!'}
                    </div>
                </motion.div>
            )}

            {/* Tips */}
            <div className="mt-3 text-[9px] text-gray-500 text-center">
                {bmi < 18.5 && '💡 Use ações anabólicas (GHRH, NPY/AgRP)'}
                {bmi >= 18.5 && bmi < 25 && '💡 Mantenha o equilíbrio!'}
                {bmi >= 25 && '💡 Ative AMPK e POMC/CART para catabolismo'}
            </div>
        </div>
    );
}
