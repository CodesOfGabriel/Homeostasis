import { AlertCircle, Clock } from 'lucide-react';

interface ActiveEventsProps {
    events: any[];
}

export function ActiveEvents({ events }: ActiveEventsProps) {
    if (events.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                <AlertCircle className="w-5 h-5" />
                Active Physiological Events
            </h3>
            <div className="space-y-3">
                {events.map((event, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-white rounded-lg border border-amber-200"
                    >
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-gray-900">{event.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                            {event.duration && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                    <Clock className="w-3 h-3" />
                                    Duration: {event.duration} cycles
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
