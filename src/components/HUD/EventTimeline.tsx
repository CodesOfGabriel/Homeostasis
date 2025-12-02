// EventTimeline: Timeline horizontal de eventos estilo Frostpunk com controles avançados

import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

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
    isPlaying?: boolean;
    timeSpeed?: number;
    onEventClick?: (event: TimelineEvent) => void;
    onTogglePlay?: () => void;
    onSpeedChange?: (speed: number) => void;
}

export function EventTimeline({
    events,
    currentTime,
    isPlaying = true,
    timeSpeed = 1,
    onEventClick,
    onTogglePlay,
    onSpeedChange
}: EventTimelineProps) {
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

    const speedOptions = [0.5, 1, 2, 5, 10];

    const getEventPosition = (eventTime: number) => {
        return (eventTime / dayDuration) * 100;
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 border border-cyan-500/30 rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-semibold text-xs">
                        {formatTime(currentTime)}
                    </span>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-1">
                        {onTogglePlay && (
                            <motion.button
                                onClick={onTogglePlay}
                                className={`p-1 rounded transition-all ${isPlaying
                                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
                                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            </motion.button>
                        )}

                        {/* Speed Control */}
                        {onSpeedChange && (
                            <div className="flex items-center gap-0.5 bg-black/50 rounded px-1.5 py-0.5">
                                {speedOptions.map(speed => (
                                    <motion.button
                                        key={speed}
                                        onClick={() => onSpeedChange(speed)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${timeSpeed === speed
                                            ? 'bg-cyan-500 text-white'
                                            : 'text-gray-400 hover:text-cyan-400'
                                            }`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {speed}x
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-[10px] text-gray-400">
                    Próximo: <span className="text-yellow-400 font-semibold">
                        {events.find(e => e.type === 'scheduled')?.name || 'Nenhum'}
                    </span>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative h-16 bg-black/50 rounded border border-cyan-500/20 overflow-hidden">
                {/* Time markers */}
                <div className="absolute top-0 left-0 right-0 h-full flex">
                    {[0, 6, 12, 18, 24].map((hour) => (
                        <div
                            key={hour}
                            className="flex-1 border-l border-gray-700/30 relative"
                            style={{ left: `${(hour / 24) * 100}%` }}
                        >
                            <span className="absolute top-0 left-0.5 text-[9px] text-gray-500">
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
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50" />
                </motion.div>

                {/* Events */}
                <div className="absolute top-3 left-0 right-0 h-10">
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
                                    className={`relative w-6 h-6 rounded bg-gradient-to-br ${getSeverityColor(
                                        event.severity
                                    )} border ${isActive
                                        ? 'border-white shadow-xl shadow-white/50'
                                        : isPast
                                            ? 'border-gray-600 opacity-40'
                                            : 'border-cyan-400 shadow-md shadow-cyan-500/30'
                                        } flex items-center justify-center`}
                                >
                                    <span className="text-sm">{event.icon}</span>

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
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400 font-mono whitespace-nowrap">
                                    {formatTime(event.time)}
                                </div>

                                {/* Event tooltip */}
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                                    <div className="bg-black/95 border border-cyan-500 rounded p-2 shadow-xl min-w-[150px]">
                                        <div className="text-cyan-400 font-bold mb-0.5 text-xs">
                                            {event.icon} {event.name}
                                        </div>
                                        <div className="text-gray-300 text-[10px] mb-1">
                                            {event.description}
                                        </div>
                                        <div className="flex items-center justify-between text-[9px]">
                                            <span className={`px-1 py-0.5 rounded ${event.type === 'completed'
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
                                            <span className={`px-1 py-0.5 rounded ${event.severity === 'critical'
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
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-cyan-500" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Legend - Compacta */}
            <div className="mt-2 flex items-center gap-3 text-[9px] text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Baixo</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>Médio</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Alto</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <span>Crítico</span>
                </div>
            </div>
        </div>
    );
}
