import { useState } from 'react';
import { SubstancePanel } from '../../components/HUD/SubstancePanel';
import { AlertTriangle, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubstancesTabProps {
    cooldowns: Record<string, number>;
    onUseSubstance: (id: string) => void;
}

const SUBSTANCE_FILTERS = [
    { id: 'all', label: '🌟 Todas', color: 'gray' },
    { id: 'medication', label: '💊 Medicamentos', color: 'cyan' },
    { id: 'supplement', label: '🌟 Suplementos', color: 'green' },
    { id: 'stimulant', label: '☕ Estimulantes', color: 'yellow' },
    { id: 'depressant', label: '💤 Depressores', color: 'purple' },
    { id: 'illicit', label: '⚠️ Ilícitas', color: 'red' },
];

export function SubstancesTab({ cooldowns, onUseSubstance }: SubstancesTabProps) {
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getFilterColor = (color: string, active: boolean) => {
        if (!active) return 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100';

        const colors: Record<string, string> = {
            gray: 'border-gray-500 bg-gray-500/10 text-gray-700',
            cyan: 'border-cyan-500 bg-cyan-500/10 text-cyan-700',
            green: 'border-green-500 bg-green-500/10 text-green-700',
            yellow: 'border-yellow-500 bg-yellow-500/10 text-yellow-700',
            purple: 'border-purple-500 bg-purple-500/10 text-purple-700',
            red: 'border-red-500 bg-red-500/10 text-red-700',
        };
        return colors[color] || colors.gray;
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-3">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-red-900 mb-1 text-sm">Substâncias Médicas</h3>
                        <p className="text-xs text-red-700">
                            Use com cautela. Todas as substâncias têm efeitos fisiológicos e potenciais efeitos colaterais.
                            Monitore os sinais vitais após administração.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="🔍 Buscar substância..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                {SUBSTANCE_FILTERS.map((filter) => (
                    <motion.button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border-2 transition-all ${getFilterColor(filter.color, selectedFilter === filter.id)
                            }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {filter.label}
                    </motion.button>
                ))}
            </div>

            {/* Substance Panel */}
            <div className="flex-1 bg-white rounded-2xl p-4 border border-gray-200 overflow-y-auto">
                <SubstancePanel
                    onUseSubstance={onUseSubstance}
                    cooldowns={cooldowns}
                    categoryFilter={selectedFilter === 'all' ? undefined : selectedFilter}
                    searchFilter={searchTerm}
                />
            </div>
        </div>
    );
}
