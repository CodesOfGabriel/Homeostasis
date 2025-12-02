import { useState } from 'react';
import { ACTIONS } from '../../game/actions';
import { ActionButton } from '../../components/HUD/ActionButton';
import { SimulationAction } from '../../game/actions';
import { motion } from 'framer-motion';

interface ActionsPanelProps {
    actionCooldowns: any[];
    onApplyAction: (action: SimulationAction) => void;
}

// Categorias de ações
const ACTION_CATEGORIES = {
    hormonal: {
        name: '🧬 Hormonal & Eixo HPA',
        icon: '🧬',
        color: 'purple',
        actions: [
            'releaseAdrenaline', 'reduceCortisol', 'antioxidantBoost', 'antiInflammatory',
            'metabolicSwitch', 'thermoregulation', 'anabolicPush', 'neurotransmitterBalance',
            'sleepDrive', 'wakefulnessBoost', 'melatoninRelease', 'circadianReset',
            'gnrhPulse', 'thyroidBoost', 'prolactinSuppress'
        ]
    },
    respiratory: {
        name: '🫁 Sistema Respiratório',
        icon: '🫁',
        color: 'cyan',
        actions: ['increaseVentilation', 'oxygenationBoost']
    },
    metabolic: {
        name: '⚡ Metabolismo & Energia',
        icon: '⚡',
        color: 'yellow',
        actions: [
            'releaseInsulin', 'releaseGlucose', 'hungerSignal', 'satietySignal',
            'leptinResponse', 'thirstDrive'
        ]
    },
    cardiovascular: {
        name: '❤️ Sistema Cardiovascular',
        icon: '❤️',
        color: 'red',
        actions: ['vasodilation', 'hydrationBoost']
    },
    detox: {
        name: '🧹 Detoxificação & Suporte',
        icon: '🧹',
        color: 'green',
        actions: ['detoxification', 'renalSupport', 'immunoBoost']
    },
    autonomic: {
        name: '⚖️ Sistema Nervoso Autônomo',
        icon: '⚖️',
        color: 'indigo',
        actions: ['sympatheticDrive', 'parasympatheticDrive']
    },
    temperature: {
        name: '🌡️ Termorregulação',
        icon: '🌡️',
        color: 'orange',
        actions: ['heatProduction', 'coolDown', 'feverResponse']
    },
    pain: {
        name: '😌 Dor & Bem-estar',
        icon: '😌',
        color: 'pink',
        actions: ['endorphinRelease', 'painModulation']
    },
    defense: {
        name: '🛡️ Respostas Defensivas',
        icon: '🛡️',
        color: 'blue',
        actions: ['freezeResponse', 'aggressionDrive']
    },
    emergency: {
        name: '🚨 Emergência',
        icon: '🚨',
        color: 'red',
        actions: ['lastResort']
    }
};

export function ActionsPanel({ actionCooldowns, onApplyAction }: ActionsPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const getCooldownTime = (actionId: string): number => {
        const cooldown = actionCooldowns.find((cd: any) => cd.actionId === actionId);
        return cooldown?.remainingTime || 0;
    };

    const filterActions = (categoryActions: string[]) => {
        return Object.values(ACTIONS).filter(action => {
            const inCategory = categoryActions.includes(action.id);
            const matchesSearch = searchTerm === '' ||
                action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                action.description.toLowerCase().includes(searchTerm.toLowerCase());
            return inCategory && matchesSearch;
        });
    };

    return (
        <div className="bg-white rounded-2xl p-4 border border-gray-200 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 border-l-4 border-blue-500 pl-3">
                ⚡ Ações & Intervenções
            </h2>

            {/* Search Bar */}
            <div className="mb-3">
                <input
                    type="text"
                    placeholder="🔍 Buscar ação..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
            </div>

            {/* Actions by Category Groups */}
            <div className="flex-1 overflow-y-auto space-y-3">
                {Object.entries(ACTION_CATEGORIES).map(([key, category]) => {
                    const categoryActions = filterActions(category.actions);
                    if (categoryActions.length === 0 && searchTerm) return null;

                    return (
                        <div key={key} className="mb-3">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                {category.icon} {category.name}
                            </h4>
                            <div className="space-y-2">
                                {categoryActions.length === 0 ? (
                                    <div className="text-xs text-gray-400 italic ml-2">Nenhuma ação disponível</div>
                                ) : (
                                    categoryActions.map((action) => (
                                        <ActionButton
                                            key={action.id}
                                            label={action.name}
                                            description={action.description}
                                            onClick={() => onApplyAction(action)}
                                            cooldown={getCooldownTime(action.id)}
                                            maxCooldown={action.cooldown}
                                            cost={action.cost}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
