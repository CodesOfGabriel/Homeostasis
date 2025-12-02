// SubstancePanel: Painel de substâncias lícitas e ilícitas

import { motion } from 'framer-motion';

export interface Substance {
    id: string;
    name: string;
    icon: string;
    category: 'medication' | 'supplement' | 'stimulant' | 'depressant' | 'illicit';
    effects: string[];
    sideEffects: string[];
    duration: number; // minutos
    cooldown: number; // minutos
    isLegal: boolean;
}

interface SubstancePanelProps {
    onUseSubstance: (substanceId: string) => void;
    cooldowns: Record<string, number>;
    categoryFilter?: string;
    searchFilter?: string;
}

const SUBSTANCES: Substance[] = [
    // Medicamentos
    {
        id: 'aspirin',
        name: 'Aspirina',
        icon: '💊',
        category: 'medication',
        effects: ['Reduz inflamação', 'Anticoagulante', '-10% dor'],
        sideEffects: ['Risco de sangramento'],
        duration: 240,
        cooldown: 360,
        isLegal: true,
    },
    {
        id: 'ibuprofen',
        name: 'Ibuprofeno',
        icon: '💊',
        category: 'medication',
        effects: ['Anti-inflamatório', 'Analgésico', '-15% dor'],
        sideEffects: ['Irritação gástrica'],
        duration: 180,
        cooldown: 240,
        isLegal: true,
    },
    {
        id: 'antibiotic',
        name: 'Antibiótico',
        icon: '💉',
        category: 'medication',
        effects: ['Combate infecções', '+20% imunidade'],
        sideEffects: ['Náusea', 'Flora intestinal'],
        duration: 480,
        cooldown: 720,
        isLegal: true,
    },

    // Suplementos
    {
        id: 'vitamins',
        name: 'Multivitamínico',
        icon: '🌟',
        category: 'supplement',
        effects: ['+5% metabolismo', '+10% energia', '+5% imunidade'],
        sideEffects: [],
        duration: 360,
        cooldown: 720,
        isLegal: true,
    },
    {
        id: 'protein',
        name: 'Whey Protein',
        icon: '🥛',
        category: 'supplement',
        effects: ['+15% recuperação muscular', '+5 testosterona'],
        sideEffects: [],
        duration: 120,
        cooldown: 240,
        isLegal: true,
    },
    {
        id: 'creatine',
        name: 'Creatina',
        icon: '💪',
        category: 'supplement',
        effects: ['+10% força', '+5% performance muscular'],
        sideEffects: ['Retenção hídrica'],
        duration: 480,
        cooldown: 1440,
        isLegal: true,
    },

    // Estimulantes Lícitos
    {
        id: 'coffee',
        name: 'Café',
        icon: '☕',
        category: 'stimulant',
        effects: ['+20 adrenalina', '+15% foco', '-20 melatonina'],
        sideEffects: ['Ansiedade', '+10 FC', 'Insônia'],
        duration: 180,
        cooldown: 240,
        isLegal: true,
    },
    {
        id: 'energyDrink',
        name: 'Energético',
        icon: '🥤',
        category: 'stimulant',
        effects: ['+30 adrenalina', '+20% energia', '+15 glicose'],
        sideEffects: ['+20 FC', 'Taquicardia', 'Crash energético'],
        duration: 120,
        cooldown: 360,
        isLegal: true,
    },

    // Depressores Lícitos
    {
        id: 'alcohol',
        name: 'Álcool',
        icon: '🍺',
        category: 'depressant',
        effects: ['-20 cortisol', '+10 dopamina', 'Relaxamento'],
        sideEffects: ['-20% coordenação', '-15% função hepática', 'Desidratação'],
        duration: 240,
        cooldown: 480,
        isLegal: true,
    },
    {
        id: 'melatoninPill',
        name: 'Melatonina',
        icon: '💤',
        category: 'medication',
        effects: ['+40 melatonina', 'Induz sono', '-10 cortisol'],
        sideEffects: ['Sonolência diurna'],
        duration: 360,
        cooldown: 1440,
        isLegal: true,
    },

    // Ilícitos
    {
        id: 'nicotine',
        name: 'Nicotina',
        icon: '🚬',
        category: 'stimulant',
        effects: ['+15 dopamina', '+10 adrenalina', 'Foco temporário'],
        sideEffects: ['Dependência', '-5% capacidade pulmonar', '+15 FC'],
        duration: 30,
        cooldown: 60,
        isLegal: false,
    },
    {
        id: 'cocaine',
        name: 'Cocaína',
        icon: '❄️',
        category: 'illicit',
        effects: ['+60 dopamina', '+50 adrenalina', '+30% energia'],
        sideEffects: ['+40 FC', '+30 PA', 'Paranoia', 'Arritmia', 'Colapso cardiovascular'],
        duration: 60,
        cooldown: 720,
        isLegal: false,
    },
    {
        id: 'marijuana',
        name: 'Maconha',
        icon: '🍃',
        category: 'illicit',
        effects: ['+20 serotonina', '-15 cortisol', 'Relaxamento'],
        sideEffects: ['-20% cognição', '+15 apetite', '-10% coordenação'],
        duration: 180,
        cooldown: 360,
        isLegal: false,
    },
    {
        id: 'mdma',
        name: 'MDMA/Ecstasy',
        icon: '💊',
        category: 'illicit',
        effects: ['+80 serotonina', '+40 dopamina', 'Euforia extrema'],
        sideEffects: ['Hipertermia', '+35 FC', 'Desidratação severa', 'Depressão pós-uso'],
        duration: 240,
        cooldown: 2880,
        isLegal: false,
    },
    {
        id: 'amphetamine',
        name: 'Anfetamina',
        icon: '💊',
        category: 'illicit',
        effects: ['+50 adrenalina', '+40 dopamina', '+40% foco', '-40 apetite'],
        sideEffects: ['+30 FC', '+25 PA', 'Paranoia', 'Insônia severa'],
        duration: 360,
        cooldown: 1440,
        isLegal: false,
    },
];

export function SubstancePanel({ onUseSubstance, cooldowns, categoryFilter, searchFilter }: SubstancePanelProps) {
    const categories = [
        { id: 'medication', label: '💊 Medicamentos', color: 'cyan' },
        { id: 'supplement', label: '🌟 Suplementos', color: 'green' },
        { id: 'stimulant', label: '☕ Estimulantes', color: 'yellow' },
        { id: 'depressant', label: '💤 Depressores', color: 'purple' },
        { id: 'illicit', label: '⚠️ Ilícitas', color: 'red' },
    ];

    // Aplicar filtros
    const filteredSubstances = SUBSTANCES.filter((substance) => {
        const categoryMatch = !categoryFilter || substance.category === categoryFilter;
        const searchMatch = !searchFilter ||
            substance.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            substance.effects.some(e => e.toLowerCase().includes(searchFilter.toLowerCase()));
        return categoryMatch && searchMatch;
    });

    return (
        <div className="space-y-6">
            {categories.map((category) => {
                const categorySubstances = filteredSubstances.filter((s) => s.category === category.id);
                if (categorySubstances.length === 0) return null;

                return (
                    <div
                        key={category.id}
                        className={`bg-gradient-to-br from-${category.color}-900/20 to-black border-2 border-${category.color}-500/50 rounded-2xl p-6 shadow-xl`}
                    >
                        <h3 className={`text-${category.color}-400 font-bold text-lg mb-4 tracking-wider`}>
                            {category.label}
                        </h3>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {categorySubstances.map((substance) => {
                                const cooldownRemaining = cooldowns[substance.id] || 0;
                                const isReady = cooldownRemaining === 0;

                                return (
                                    <motion.div
                                        key={substance.id}
                                        className={`relative bg-black/50 border-2 ${isReady
                                            ? `border-${category.color}-500/50 hover:border-${category.color}-400`
                                            : 'border-gray-700/50'
                                            } rounded-xl p-4 transition-all cursor-pointer group`}
                                        whileHover={{ scale: isReady ? 1.02 : 1 }}
                                        onClick={() => isReady && onUseSubstance(substance.id)}
                                    >
                                        {/* Legal status badge */}
                                        {!substance.isLegal && (
                                            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                                ILEGAL
                                            </div>
                                        )}

                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="text-4xl">{substance.icon}</div>
                                            <div className="flex-1">
                                                <div className={`text-${category.color}-400 font-bold text-sm`}>
                                                    {substance.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Duração: {substance.duration}min
                                                </div>
                                            </div>
                                        </div>

                                        {/* Effects */}
                                        <div className="space-y-2 mb-3">
                                            <div>
                                                <div className="text-xs text-green-400 font-semibold mb-1">
                                                    ✓ Efeitos:
                                                </div>
                                                {substance.effects.map((effect, i) => (
                                                    <div key={i} className="text-xs text-gray-400 ml-2">
                                                        • {effect}
                                                    </div>
                                                ))}
                                            </div>

                                            {substance.sideEffects.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-red-400 font-semibold mb-1">
                                                        ✗ Efeitos Colaterais:
                                                    </div>
                                                    {substance.sideEffects.map((effect, i) => (
                                                        <div key={i} className="text-xs text-gray-500 ml-2">
                                                            • {effect}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Cooldown bar */}
                                        {!isReady && (
                                            <div className="mt-3">
                                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full bg-gradient-to-r from-${category.color}-500 to-${category.color}-600`}
                                                        initial={{ width: '100%' }}
                                                        animate={{ width: '0%' }}
                                                        transition={{ duration: cooldownRemaining }}
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500 text-center mt-1">
                                                    {Math.ceil(cooldownRemaining / 60)}min restantes
                                                </div>
                                            </div>
                                        )}

                                        {/* Use button */}
                                        {isReady && (
                                            <motion.button
                                                className={`w-full mt-3 py-2 bg-gradient-to-r from-${category.color}-500 to-${category.color}-600 text-white font-bold rounded-lg text-sm`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                USAR
                                            </motion.button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
