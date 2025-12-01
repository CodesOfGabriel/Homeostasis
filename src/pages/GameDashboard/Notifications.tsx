import { EventPopup } from '../../components/HUD/EventPopup';
import { Bell } from 'lucide-react';

interface NotificationsProps {
    notifications: string[];
    onClearNotification: (index: number) => void;
    compact?: boolean;
}

export function Notifications({ notifications, onClearNotification, compact = false }: NotificationsProps) {
    if (compact) {
        return (
            <div className="group relative flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <div className="text-xs text-gray-300 max-w-[200px] truncate">
                    {notifications.length > 0 ? notifications[notifications.length - 1] : 'Sem alertas'}
                </div>
                {notifications.length > 1 && (
                    <span className="text-xs font-bold text-cyan-400">+{notifications.length - 1}</span>
                )}

                {/* Expanded notifications on hover */}
                {notifications.length > 0 && (
                    <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                        <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800">
                                <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                                    <Bell className="w-4 h-4" />
                                    Notificações
                                </h3>
                                <span className="text-xs text-gray-500">{notifications.length} total</span>
                            </div>
                            {notifications.slice().reverse().map((notification, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-cyan-500/50 transition-all group/item"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs text-gray-300 flex-1">{notification}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClearNotification(notifications.length - 1 - index);
                                            }}
                                            className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed top-24 right-6 space-y-3 z-50 max-w-md">
            {notifications.slice(-3).map((notification, index) => (
                <EventPopup
                    key={index}
                    title="System Alert"
                    description={notification}
                    onClose={() => onClearNotification(index)}
                />
            ))}
        </div>
    );
}
