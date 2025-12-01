import { Activity } from 'lucide-react';

interface HeaderProps {
    isRunning: boolean;
    tick: number;
    onToggleSimulation: () => void;
}

export function Header({ isRunning, tick, onToggleSimulation }: HeaderProps) {
    return (
        <header className="bg-white border-b border-gray-200">
            <div className="max-w-[1800px] mx-auto px-8 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Overview Conditions</h1>
                            <p className="text-sm text-gray-500">Physiological Simulator</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={onToggleSimulation}
                            className={`px-8 py-3 rounded-xl font-semibold transition-all shadow-md ${isRunning
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                        >
                            {isRunning ? '⏸ Pause' : '▶ Start'}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
