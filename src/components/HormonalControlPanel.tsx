/**
 * Homeostasis v3.0 - Hormonal Control Panel
 * Interface para o jogador liberar hormônios
 */

import React, { useState } from 'react';
import { Activity, AlertCircle, Clock, Zap } from 'lucide-react';
import { useSimulationStore } from '../game/simulationStore';
import {
    getActionsByCategory,
    isActionSafe,
    HormonalActionDefinition,
    ACTION_CATEGORIES,
} from '../game/actions';

export const HormonalControlPanel: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<'anabolic' | 'catabolic' | 'regulatory'>('anabolic');
    const releaseHormone = useSimulationStore(state => state.releaseHormone);
    const cooldowns = useSimulationStore(state => state.hormonalCooldowns);
    const physiology = useSimulationStore(state => state.physiology);

    const actions = getActionsByCategory(selectedCategory);

    return (
        <div className="bg-medical-surface border-l border-medical-border h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-medical-border">
                <h2 className="text-sm font-medium text-clinical-text mb-1">
                    CONTROLE HORMONAL
                </h2>
                <p className="text-xs text-clinical-muted">
                    Libere hormônios para controlar o metabolismo
                </p>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-medical-border">
                {(Object.keys(ACTION_CATEGORIES) as Array<keyof typeof ACTION_CATEGORIES>).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${selectedCategory === cat
                            ? 'bg-medical-hover text-clinical-text border-b-2 border-metabolic'
                            : 'text-clinical-muted hover:bg-medical-hover'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>{ACTION_CATEGORIES[cat].icon}</span>
                            <span>{ACTION_CATEGORIES[cat].name}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Category Description */}
            <div className="p-3 bg-medical-bg border-b border-medical-border">
                <p className="text-xs text-clinical-muted">
                    {ACTION_CATEGORIES[selectedCategory].description}
                </p>
            </div>

            {/* Actions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {actions.map(action => (
                    <HormonalActionCard
                        key={action.id}
                        action={action}
                        onActivate={() => {
                            releaseHormone(action.hormone as any, action.baseAmount);
                        }}
                        cooldownRemaining={cooldowns.get(action.hormone) || 0}
                        physiology={physiology}
                    />
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// HORMONAL ACTION CARD
// ============================================================================

interface HormonalActionCardProps {
    action: HormonalActionDefinition;
    onActivate: () => void;
    cooldownRemaining: number;
    physiology: any;
}

const HormonalActionCard: React.FC<HormonalActionCardProps> = ({
    action,
    onActivate,
    cooldownRemaining,
    physiology,
}) => {
    const [showDetails, setShowDetails] = useState(false);

    const isOnCooldown = cooldownRemaining > 0;
    const safetyCheck = isActionSafe(action.id, {
        glucose: physiology.nutrients.bloodGlucose,
        pH: physiology.acidBase.pH,
        heartRate: physiology.cardiovascular.heartRate,
        energyDeficit: physiology.energy.energyDeficit,
    });

    const canActivate = !isOnCooldown && safetyCheck.safe;

    return (
        <div className="card-clinical">
            {/* Header */}
            <div className="p-3 flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-clinical-text">
                            {action.name}
                        </h3>
                        {!safetyCheck.safe && (
                            <AlertCircle className="w-4 h-4 text-alert" strokeWidth={1.5} />
                        )}
                    </div>
                    <p className="text-xs text-clinical-muted">{action.description}</p>
                </div>

                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-clinical-muted hover:text-clinical-text ml-2"
                >
                    <Activity className="w-4 h-4" strokeWidth={1.5} />
                </button>
            </div>

            {/* Metadata */}
            <div className="px-3 pb-2 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-clinical-muted">
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    <span className="font-mono">{formatTime(action.cooldown)}</span>
                </div>
                <div className="flex items-center gap-1 text-clinical-muted">
                    <Zap className="w-3 h-3" strokeWidth={1.5} />
                    <span className="font-mono">{action.metabolicCost.toFixed(1)} ATP</span>
                </div>
            </div>

            {/* Safety Warning */}
            {!safetyCheck.safe && (
                <div className="px-3 pb-2">
                    <div className="bg-alert/10 border border-alert/20 p-2 rounded-sm">
                        <p className="text-xs text-alert">{safetyCheck.reason}</p>
                    </div>
                </div>
            )}

            {/* Details */}
            {showDetails && (
                <div className="border-t border-medical-border p-3 space-y-2">
                    <div>
                        <h4 className="text-xs font-medium text-clinical-muted mb-1">EFEITOS:</h4>
                        <ul className="space-y-1">
                            {action.effects.map((effect, i) => (
                                <li key={i} className="text-xs text-clinical-text flex items-start gap-2">
                                    <span className="text-metabolic">•</span>
                                    <span>{effect}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {action.warnings.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-clinical-muted mb-1">AVISOS:</h4>
                            <ul className="space-y-1">
                                {action.warnings.map((warning, i) => (
                                    <li key={i} className="text-xs text-alert flex items-start gap-2">
                                        <span>⚠</span>
                                        <span>{warning}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Action Button */}
            <div className="p-3 border-t border-medical-border">
                <button
                    onClick={onActivate}
                    disabled={!canActivate}
                    className={`w-full py-2 px-4 text-sm font-medium transition-colors ${canActivate
                        ? 'btn-clinical-outline hover:bg-medical-hover'
                        : 'bg-medical-border text-clinical-disabled cursor-not-allowed'
                        }`}
                >
                    {isOnCooldown ? (
                        <span className="font-mono">
                            Espera: {formatTime(cooldownRemaining)}
                        </span>
                    ) : !safetyCheck.safe ? (
                        'Bloqueado - não seguro'
                    ) : (
                        `Liberar ${action.baseAmount} ${getUnit(action.hormone)}`
                    )}
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getUnit(hormone: string): string {
    const units: Record<string, string> = {
        insulin: 'μIU/mL',
        glucagon: 'pg/mL',
        adrenaline: 'pg/mL',
        cortisol: 'μg/dL',
        gh: 'ng/mL',
        testosterone: 'ng/dL',
        t3: 'ng/dL',
        t4: 'μg/dL',
        mTORActivity: '%',
    };
    return units[hormone] || 'un';
}
