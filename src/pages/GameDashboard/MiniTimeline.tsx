import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TimelineEvent {
    id: string;
    name: string;
    time: number;
    icon: string;
    type: 'completed' | 'active' | 'scheduled';
}

interface MiniTimelineProps {
    currentTime: number;
}

export function MiniTimeline({ currentTime }: MiniTimelineProps) {
    const [scrollIndex, setScrollIndex] = useState(0);

    const events: TimelineEvent[] = [
        { id: '1', name: 'Wake Up', time: 420, icon: '🌅', type: 'completed' },
        { id: '2', name: 'Breakfast', time: 480, icon: '🍳', type: 'active' },
        { id: '3', name: 'Exercise', time: 600, icon: '🏃', type: 'scheduled' },
        { id: '4', name: 'Lunch', time: 780, icon: '🍽️', type: 'scheduled' },
        { id: '5', name: 'Work Stress', time: 900, icon: '💼', type: 'scheduled' },
        { id: '6', name: 'Snack', time: 960, icon: '☕', type: 'scheduled' },
        { id: '7', name: 'Dinner', time: 1140, icon: '🍲', type: 'scheduled' },
        { id: '8', name: 'Relax', time: 1260, icon: '📺', type: 'scheduled' },
        { id: '9', name: 'Sleep Prep', time: 1320, icon: '🌙', type: 'scheduled' },
    ];

    const visibleEvents = events.slice(scrollIndex, scrollIndex + 6);
    const canScrollLeft = scrollIndex > 0;
    const canScrollRight = scrollIndex < events.length - 6;

    const formatTime = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const getEventStatus = (event: TimelineEvent) => {
        if (currentTime >= event.time + 60) return 'completed';
        if (currentTime >= event.time - 30 && currentTime <= event.time + 60) return 'active';
        return 'scheduled';
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700">Daily Events</h3>
                <div className="text-xs text-gray-500">{formatTime(currentTime)}</div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
                    disabled={!canScrollLeft}
                    className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${canScrollLeft ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex gap-2 overflow-hidden">
                    {visibleEvents.map((event) => {
                        const status = getEventStatus(event);
                        return (
                            <div
                                key={event.id}
                                className={`flex-1 min-w-0 text-center py-2 px-1 rounded-lg transition-all ${status === 'active'
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : status === 'completed'
                                            ? 'bg-gray-100 text-gray-500'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="text-lg mb-0.5">{event.icon}</div>
                                <div className="text-[10px] font-medium truncate">{event.name}</div>
                                <div className="text-[9px] opacity-75">{formatTime(event.time)}</div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={() => setScrollIndex(Math.min(events.length - 6, scrollIndex + 1))}
                    disabled={!canScrollRight}
                    className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${canScrollRight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
