import { ACTIONS } from '../../game/actions';
import { ActionButton } from '../../components/HUD/ActionButton';
import { SimulationAction } from '../../game/actions';

interface ActionsPanelProps {
    actionCooldowns: any[];
    onApplyAction: (action: SimulationAction) => void;
}

export function ActionsPanel({ actionCooldowns, onApplyAction }: ActionsPanelProps) {
    const getCooldownTime = (actionId: string): number => {
        const cooldown = actionCooldowns.find((cd: any) => cd.actionId === actionId);
        return cooldown?.remainingTime || 0;
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 border-l-4 border-blue-500 pl-3">
                Actions & Interventions
            </h2>
            <div className="grid grid-cols-3 gap-4">
                {Object.values(ACTIONS).map((action) => (
                    <ActionButton
                        key={action.id}
                        label={action.name}
                        description={action.description}
                        onClick={() => onApplyAction(action)}
                        cooldown={getCooldownTime(action.id)}
                        maxCooldown={action.cooldown}
                        cost={action.cost}
                    />
                ))}
            </div>
        </div>
    );
}
