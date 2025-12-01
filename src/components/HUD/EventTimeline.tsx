// EventTimeline: Timeline horizontal de eventos estilo Frostpunk

import { motion } from 'framer-motion';

export interface TimelineEvent {
    id: string;
    name: string;
    description: string;
    time: number; // minutos desde o início do dia (0-1440)
    type: 'scheduled' | 'active' | 'completed';
    severity: 'low' | 'medium' | 'high' | 'critical';
    icon: string;
}

interface EventTimelineProps {
    events: TimelineEvent[];
    currentTime: number; // minutos atuais do dia
    onEventClick?: (event: TimelineEvent) => void;
}

export function EventTimeline({ events, currentTime, onEventClick }: EventTimelineProps) {
    const dayDuration = 1440; // 24 horas em minutos
    const currentProgress = (currentTime / dayDuration) * 100;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low': return 'from-blue-500 to-cyan-500';
            case 'medium': return 'from-yellow-500 to-orange-500';
            case 'high': return 'from-orange-500 to-red-500';
            case 'critical': return 'from-red-600 to-pink-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getEventPosition = (eventTime: number) => {
        return (eventTime / dayDuration) * 100;
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gradient-to-br from-gray-900/95 to-black border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl shadow-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-cyan-400 font-bold text-lg tracking-wider flex items-center gap-2">
                    ⏰ TIMELINE DO DIA - {formatTime(currentTime)}
                </h3>
                <div className="text-sm text-gray-400">
                    Próximo: <span className="text-yellow-400 font-semibold">
                        {events.find(e => e.type === 'scheduled')?.name || 'Nenhum'}
                    </span>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative h-32 bg-black/50 rounded-lg border border-cyan-500/30 overflow-hidden">
                {/* Time markers */}
                <div className="absolute top-0 left-0 right-0 h-full flex">
                    {[0, 6, 12, 18, 24].map((hour) => (
                        <div
                            key={hour}
                            className="flex-1 border-l border-gray-700/50 relative"
                            style={{ left: `${(hour / 24) * 100}%` }}
                        >
                            <span className="absolute -top-1 left-1 text-xs text-gray-500">
                                {hour}h
                            </span>
                        </div>
                    ))}
                </div>

                {/* Progress line */}
                <motion.div
                    className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 to-cyan-600 z-20"
                    style={{ left: `${currentProgress}%` }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50" />
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50" />
                </motion.div>

                {/* Events */}
                <div className="absolute top-8 left-0 right-0 h-20">
                    {events.map((event) => {
                        const position = getEventPosition(event.time);
                        const isPast = event.time < currentTime;
                        const isActive = event.type === 'active';
                        const isNear = Math.abs(event.time - currentTime) < 60; // próximo dos próximos 60min

                        return (
                            <motion.div
                                key={event.id}
                                className="absolute cursor-pointer group"
                                style={{ left: `${position}%` }}
                                initial={{ scale: 0 }}
                                animate={{
                                    scale: isActive ? [1, 1.2, 1] : 1,
                                    y: isNear ? [0, -5, 0] : 0,
                                }}
                                transition={{
                                    scale: { duration: 1, repeat: isActive ? Infinity : 0 },
                                    y: { duration: 2, repeat: Infinity },
                                }}
                                onClick={() => onEventClick?.(event)}
                            >
                                {/* Event marker */}
                                <div
                                    className={`relative w-12 h-12 rounded-lg bg-gradient-to-br ${getSeverityColor(
                                        event.severity
                                    )} border-2 ${isActive
                                        ? 'border-white shadow-2xl shadow-white/50'
                                        : isPast
                                            ? 'border-gray-600 opacity-40'
                                            : 'border-cyan-400 shadow-lg shadow-cyan-500/30'
                                        } flex items-center justify-center`}
                                >
                                    <span className="text-2xl">{event.icon}</span>

                                    {/* Pulse effect for active */}
                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 rounded-lg bg-white"
                                            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.5, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </div>

                                {/* Time label */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-cyan-400 font-mono whitespace-nowrap">
                                    {formatTime(event.time)}
                                </div>

                                {/* Event tooltip */}
                                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                                    <div className="bg-black/95 border-2 border-cyan-500 rounded-lg p-3 shadow-xl min-w-[200px]">
                                        <div className="text-cyan-400 font-bold mb-1 text-sm">
                                            {event.icon} {event.name}
                                        </div>
                                        <div className="text-gray-300 text-xs mb-2">
                                            {event.description}
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className={`px-2 py-1 rounded ${event.type === 'completed'
                                                ? 'bg-green-500/20 text-green-400'
                                                : event.type === 'active'
                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                    : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {event.type === 'completed'
                                                    ? 'Concluído'
                                                    : event.type === 'active'
                                                        ? 'Em Andamento'
                                                        : 'Agendado'}
                                            </span>
                                            <span className={`px-2 py-1 rounded ${event.severity === 'critical'
                                                ? 'bg-red-500/20 text-red-400'
                                                : event.severity === 'high'
                                                    ? 'bg-orange-500/20 text-orange-400'
                                                    : event.severity === 'medium'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {event.severity === 'critical'
                                                    ? 'Crítico'
                                                    : event.severity === 'high'
                                                        ? 'Alto'
                                                        : event.severity === 'medium'
                                                            ? 'Médio'
                                                            : 'Baixo'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-cyan-500" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Baixo</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Médio</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>Alto</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span>Crítico</span>
                </div>
            </div>
        </div>
    );
}
