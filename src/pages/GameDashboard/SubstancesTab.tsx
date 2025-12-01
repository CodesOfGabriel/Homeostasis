import { SubstancePanel } from '../../components/HUD/SubstancePanel';
import { AlertTriangle } from 'lucide-react';

interface SubstancesTabProps {
    cooldowns: Record<string, number>;
    onUseSubstance: (id: string) => void;
}

export function SubstancesTab({ cooldowns, onUseSubstance }: SubstancesTabProps) {
    return (
        <div className="space-y-6">
            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-900 mb-1">Medical Substances</h3>
                        <p className="text-sm text-red-700">
                            Use with caution. All substances have physiological effects and potential side effects.
                            Monitor vital signs closely after administration.
                        </p>
                    </div>
                </div>
            </div>

            {/* Substance Panel */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <SubstancePanel
                    onUseSubstance={onUseSubstance}
                    cooldowns={cooldowns}
                />
            </div>
        </div>
    );
}
