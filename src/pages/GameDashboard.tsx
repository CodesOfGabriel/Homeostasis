import { useState } from 'react';
import { useSimulationStore } from '../game/simulationStore';
import { useInterval } from '../game/useInterval';
import { OrgansTab } from './GameDashboard/OrgansTab';
import { MolecularTab } from './GameDashboard/MolecularTab';
import { ChartsTab } from './GameDashboard/ChartsTab';
import { LabMarkersPanel } from './GameDashboard/LabMarkersPanel';
import { Notifications } from './GameDashboard/Notifications';
import { OrganModals } from './GameDashboard/OrganModals';
import { EventTimeline, TimelineEvent } from '../components/HUD/EventTimeline';
import { IdleGameHeader } from '../components/HUD/IdleGameHeader';
import { ComboDisplay } from './GameDashboard/ComboDisplay';
import { ActiveEventHelp } from './GameDashboard/ActiveEventHelp';
import { SettingsModal } from './GameDashboard/SettingsModal';
import { AnatomicalBody3DImproved } from '../components/HUD/AnatomicalBody3DImproved';
import { BiomedicCard } from '../components/HUD/BiomedicCard';
import { EnergyBalanceScale } from '../components/HUD/EnergyBalanceScale';
import IdleGamePanel from '../components/HUD/IdleGamePanel';
import { PhysiologyStatusPanel } from '../components/HUD/PhysiologyStatusPanel';
import { QuestPanel } from '../components/HUD/QuestPanel';

import { ACTIONS } from '../game/actions';
import { Wind, Thermometer, Droplet, Activity, Settings } from 'lucide-react';

type TabType = 'overview' | 'organs' | 'molecular' | 'charts' | 'labs' | 'idle';
type ActionTabType = 'actions' | 'substances';

export function GameDashboard() {
    const {
        parameters,
        isRunning,
        timeSpeed,
        notifications,
        actionCooldowns,
        activeEvents,
        comboScore,
        activeCombo,
        tick,
        start,
        pause,
        setTimeSpeed,
        applyAction,
        clearNotification,
    } = useSimulationStore();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [actionTab, setActionTab] = useState<ActionTabType>('actions');
    const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
    const [substanceCooldowns, setSubstanceCooldowns] = useState<Record<string, number>>({});
    const [currentDayTime, setCurrentDayTime] = useState(480);
    const [myBodyTab, setMyBodyTab] = useState<'body' | 'events' | 'energy'>('body');

    // Mock timeline events
    const mockTimelineEvents: TimelineEvent[] = [
        { id: '1', name: 'Despertar', description: 'Início do dia', time: 420, icon: '🌅', type: 'completed', severity: 'low' },
        { id: '2', name: 'Café da Manhã', description: 'Refeição matinal', time: 480, icon: '🍳', type: currentDayTime >= 480 ? 'active' : 'scheduled', severity: 'low' },
        { id: '3', name: 'Exercício', description: 'Atividade física', time: 600, icon: '🏃', type: 'scheduled', severity: 'medium' },
        { id: '4', name: 'Almoço', description: 'Refeição principal', time: 780, icon: '🍽️', type: 'scheduled', severity: 'low' },
        { id: '5', name: 'Estresse Trabalho', description: 'Pico de cortisol', time: 900, icon: '💼', type: 'scheduled', severity: 'high' },
        { id: '6', name: 'Lanche', description: 'Lanche da tarde', time: 960, icon: '☕', type: 'scheduled', severity: 'low' },
        { id: '7', name: 'Jantar', description: 'Refeição noturna', time: 1140, icon: '🍲', type: 'scheduled', severity: 'low' },
        { id: '8', name: 'Relaxamento', description: 'Tempo de descanso', time: 1260, icon: '📺', type: 'scheduled', severity: 'low' },
        { id: '9', name: 'Sono', description: 'Preparação para dormir', time: 1320, icon: '🌙', type: 'scheduled', severity: 'medium' },
    ];

    // Settings
    const [showTips, setShowTips] = useState(true);
    const [pauseOnEvent, setPauseOnEvent] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [questPanelOpen, setQuestPanelOpen] = useState(false);

    // Death and critical condition system
    const [isDead, setIsDead] = useState(false);
    const [deathReason, setDeathReason] = useState('');
    const [criticalHRTimer, setCriticalHRTimer] = useState(0); // Tracks time in critical HR zone

    // Track previous event count to detect new events
    const [prevEventCount, setPrevEventCount] = useState(0);

    // Simulation tick
    useInterval(() => {
        if (isRunning) {
            tick();
            setCurrentDayTime((prev) => {
                const next = prev + (0.2 * timeSpeed);
                return next >= 1440 ? 0 : next;
            });

            // Update substance cooldowns (scaled by time speed)
            setSubstanceCooldowns((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((key) => {
                    if (updated[key] > 0) {
                        updated[key] = Math.max(0, updated[key] - (0.2 * timeSpeed));
                    }
                });
                return updated;
            });

            // Check for new events and pause if setting is enabled
            if (pauseOnEvent && activeEvents.length > prevEventCount) {
                pause();
            }
            setPrevEventCount(activeEvents.length);
        }
    }, 200);

    // Check death conditions continuously when running
    useInterval(() => {
        if (isRunning && !isDead) {
            checkDeathConditions();
        }
    }, 200);

    const checkDeathConditions = () => {
        if (isDead) return;

        // pH Alkalosis (pH > 7.52)
        if (parameters.pH > 7.52) {
            setIsDead(true);
            setDeathReason('Alcalose Metabólica');
            pause();
            return;
        }

        // pH Acidosis (pH < 7.18)
        if (parameters.pH < 7.18) {
            setIsDead(true);
            setDeathReason('Acidose Metabólica');
            pause();
            return;
        }

        // Critical Heart Rate (>190 bpm for >5 seconds)
        if (parameters.heartRate > 190) {
            const newTimer = criticalHRTimer + 0.2;
            setCriticalHRTimer(newTimer);

            if (newTimer >= 5) {
                setIsDead(true);
                setDeathReason('Taquicardia Extrema');
                pause();
                return;
            }
        } else if (parameters.heartRate < 35) {
            setIsDead(true);
            setDeathReason('Bradicardia Extrema');
            pause();
            return;
        } else {
            if (criticalHRTimer > 0) {
                setCriticalHRTimer(0);
            }
        }        // Very low oxygen - REDUZIDO PARA 70% (era 60%)
        if (parameters.bloodOxygen < 70) {
            setIsDead(true);
            setDeathReason('Hipoxemia Severa');
            pause();
            return;
        }

        // Extreme temperature - REDUZIDO PARA 40°C (era 42°C)
        if (parameters.temperature > 40) {
            setIsDead(true);
            setDeathReason('Hipertermia Fatal');
            pause();
            return;
        }

        // REDUZIDO PARA 32°C (era 30°C)
        if (parameters.temperature < 32) {
            setIsDead(true);
            setDeathReason('Hipotermia Fatal');
            pause();
            return;
        }

        // Severe Starvation (BMI < 13) - Organ failure
        if (parameters.bmi < 13) {
            setIsDead(true);
            setDeathReason('Inanição Severa (Falência Múltipla de Órgãos)');
            pause();
            return;
        }

        // Morbid Obesity complications (BMI > 45)
        if (parameters.bmi > 45) {
            setIsDead(true);
            setDeathReason('Obesidade Mórbida (Insuficiência Cardíaca)');
            pause();
            return;
        }

        // Check for heart attack event
        const hasHeartAttack = notifications.some(n => {
            const message = typeof n === 'string' ? n : (n as any).message || '';
            return message.toLowerCase().includes('infarto') ||
                message.toLowerCase().includes('heart attack');
        });
        if (hasHeartAttack) {
            setIsDead(true);
            setDeathReason('Infarto do Miocárdio');
            pause();
            return;
        }
    };

    const handleRespawn = () => {
        setIsDead(false);
        setDeathReason('');
        setCriticalHRTimer(0);
        // Reset simulation to default state
        window.location.reload();
    };

    const handleToggleSimulation = () => {
        isRunning ? pause() : start();
    };

    const handleUseSubstance = (substanceId: string) => {
        // Apply substance cooldown (5 minutes)
        setSubstanceCooldowns((prev) => ({ ...prev, [substanceId]: 300 }));
    };

    const getCooldownTime = (actionId: string): number => {
        const cooldown = actionCooldowns.find((cd: any) => cd.actionId === actionId);
        return cooldown?.remainingTime || 0;
    };

    // Check if in critical state
    const isCriticalState = !isDead && (
        parameters.pH > 7.48 || parameters.pH < 7.22 ||
        parameters.heartRate > 170 || parameters.heartRate < 40 ||
        parameters.bloodOxygen < 85 ||
        parameters.temperature > 38.5 || parameters.temperature < 35.5 ||
        parameters.bmi < 16 || parameters.bmi > 35
    );

    return (
        <div className="h-screen flex flex-col bg-[#0a0e27] overflow-hidden">
            {/* Death Modal Overlay */}
            {isDead && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-red-500/30">
                        <div className="text-center">
                            <div className="text-6xl mb-4">💀</div>
                            <h2 className="text-3xl font-bold text-red-400 mb-3">Sistema Falhou</h2>
                            <div className="bg-red-950/30 rounded-xl p-4 mb-6 border border-red-500/30">
                                <p className="text-lg font-semibold text-gray-300 mb-2">Causa da Morte:</p>
                                <p className="text-2xl font-bold text-red-400">{deathReason}</p>
                            </div>

                            {/* Death stats */}
                            <div className="bg-gray-900/50 rounded-xl p-4 mb-6 space-y-2 text-left border border-gray-800">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">pH Final:</span>
                                    <span className={`font-bold ${parameters.pH < 7.35 || parameters.pH > 7.45 ? 'text-red-400' : 'text-gray-200'
                                        }`}>{parameters.pH.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Frequência Cardíaca:</span>
                                    <span className={`font-bold ${parameters.heartRate < 40 || parameters.heartRate > 180 ? 'text-red-400' : 'text-gray-200'
                                        }`}>{Math.round(parameters.heartRate)} bpm</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Saturação O₂:</span>
                                    <span className={`font-bold ${parameters.bloodOxygen < 90 ? 'text-red-400' : 'text-gray-200'
                                        }`}>{parameters.bloodOxygen.toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Temperatura:</span>
                                    <span className={`font-bold ${parameters.temperature < 36 || parameters.temperature > 38 ? 'text-red-400' : 'text-gray-200'
                                        }`}>{parameters.temperature.toFixed(1)}°C</span>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-6">Deseja nascer novamente?</p>

                            <button
                                onClick={handleRespawn}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                🔄 Reiniciar Simulação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Idle Game Header - Always Visible */}
            <IdleGameHeader />

            {/* Main Content - Full Height Layout */}
            <main className={`flex-1 overflow-hidden ${isDead ? 'blur-sm pointer-events-none' : ''}`}>
                <div className="h-full max-w-[1900px] mx-auto px-6 py-3 flex flex-col gap-2">
                    {/* Critical Warning Banner */}
                    {!isDead && (
                        <>
                            {/* pH Critical Warning */}
                            {(parameters.pH > 7.48 || parameters.pH < 7.22) && (
                                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-xl shadow-lg animate-pulse flex items-center gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div className="flex-1">
                                        <p className="font-bold">ALERTA CRÍTICO: pH {parameters.pH > 7.48 ? 'ALTO' : 'BAIXO'}</p>
                                        <p className="text-sm opacity-90">
                                            pH atual: {parameters.pH.toFixed(2)} - MORTE EM: {parameters.pH > 7.48 ? '>7.52' : '<7.18'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Heart Rate Critical Warning */}
                            {(parameters.heartRate > 170 || parameters.heartRate < 40) && (
                                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl shadow-lg animate-pulse flex items-center gap-3">
                                    <span className="text-2xl">💓</span>
                                    <div className="flex-1">
                                        <p className="font-bold">ALERTA CRÍTICO: {parameters.heartRate > 170 ? 'Taquicardia' : 'Bradicardia'} Extrema</p>
                                        <p className="text-sm opacity-90">
                                            FC: {Math.round(parameters.heartRate)} bpm
                                            {parameters.heartRate > 190 && criticalHRTimer > 0 && (
                                                <span className="ml-2 font-bold bg-black/30 px-2 py-0.5 rounded">
                                                    ⚠️ ZONA FATAL: {criticalHRTimer.toFixed(1)}s / 5.0s
                                                </span>
                                            )}
                                            {parameters.heartRate < 40 && (
                                                <span className="ml-2 font-bold">- MORTE EM &lt;35 bpm</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}                            {/* Low Oxygen Warning */}
                            {parameters.bloodOxygen < 85 && (
                                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl shadow-lg animate-pulse flex items-center gap-3">
                                    <span className="text-2xl">😵</span>
                                    <div className="flex-1">
                                        <p className="font-bold">ALERTA CRÍTICO: Hipoxemia</p>
                                        <p className="text-sm opacity-90">SpO₂: {parameters.bloodOxygen.toFixed(0)}% - MORTE EM &lt;70%</p>
                                    </div>
                                </div>
                            )}

                            {/* Temperature Warning */}
                            {(parameters.temperature > 38.5 || parameters.temperature < 35.5) && (
                                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-4 py-2 rounded-xl shadow-lg animate-pulse flex items-center gap-3">
                                    <span className="text-2xl">{parameters.temperature > 38.5 ? '🔥' : '🥶'}</span>
                                    <div className="flex-1">
                                        <p className="font-bold">ALERTA CRÍTICO: {parameters.temperature > 38.5 ? 'Hipertermia' : 'Hipotermia'}</p>
                                        <p className="text-sm opacity-90">
                                            Temp: {parameters.temperature.toFixed(1)}°C - MORTE EM {parameters.temperature > 38.5 ? '>40°C' : '<32°C'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Timeline - Melhorada com controles */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <EventTimeline
                                events={mockTimelineEvents}
                                currentTime={currentDayTime}
                                isPlaying={isRunning}
                                timeSpeed={timeSpeed}
                                onTogglePlay={handleToggleSimulation}
                                onSpeedChange={setTimeSpeed}
                            />
                        </div>

                        {/* Performance Score - Minimized with Glassmorphism */}
                        <div className="backdrop-blur-md bg-gray-900/40 border border-gray-700/50 rounded-xl px-3 py-1.5 shadow-lg">
                            <ComboDisplay comboScore={comboScore} activeCombo={activeCombo} compact />
                        </div>

                        {/* Notifications - Small with Glassmorphism */}
                        {notifications.length > 0 && (
                            <div className="backdrop-blur-md bg-gray-900/40 border border-gray-700/50 rounded-xl px-3 py-1.5 shadow-lg max-w-xs z-50 relative">
                                <Notifications
                                    notifications={notifications.slice(0, 2)}
                                    onClearNotification={clearNotification}
                                    compact
                                />
                            </div>
                        )}

                        {/* Critical Status Indicator */}
                        {isCriticalState && (
                            <div className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 animate-pulse border border-red-500/50 shadow-lg shadow-red-500/20">
                                <span className="text-xl">⚠️</span>
                                <span>ESTADO CRÍTICO</span>
                            </div>
                        )}

                        {/* Quest Button */}
                        <button
                            onClick={() => setQuestPanelOpen(true)}
                            className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all shadow-md flex items-center gap-2 border border-purple-500/30"
                            title="Missões"
                        >
                            📜 Quests
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="px-3 py-2 rounded-xl font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all shadow-md flex items-center gap-2 border border-gray-700"
                            title="Configurações"
                        >
                            <Settings className="w-4 h-4" />
                        </button>

                        <button
                            onClick={handleToggleSimulation}
                            className={`px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md flex-shrink-0 border ${isRunning
                                ? 'bg-red-600 hover:bg-red-500 text-white border-red-500/30'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500/30'
                                }`}
                        >
                            {isRunning ? '⏸ Pausar' : '▶ Iniciar'}
                        </button>
                    </div>

                    {/* Main Grid - 3 Columns */}
                    <div className="flex-1 grid grid-cols-[380px_1fr_380px] gap-3 overflow-hidden transition-all">
                        {/* Left Sidebar - Body Condition */}
                        <div className={`bg-gray-900/50 backdrop-blur-sm rounded-2xl border p-4 overflow-y-auto transition-all ${isCriticalState
                            ? 'border-red-500/50 border-2 shadow-lg shadow-red-500/20 animate-pulse'
                            : 'border-gray-800'
                            }`}>
                            {/* Tab Navigation - Top Level */}
                            <div className="flex gap-2 mb-3 border-b border-gray-800 pb-2">
                                <button
                                    onClick={() => setMyBodyTab('body')}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myBodyTab === 'body'
                                        ? 'bg-cyan-600 text-white border border-cyan-500/30'
                                        : 'text-gray-400 hover:bg-gray-800 border border-transparent'
                                        }`}
                                >
                                    🧑 Meu Corpo
                                </button>
                                <button
                                    onClick={() => setMyBodyTab('events')}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myBodyTab === 'events'
                                        ? 'bg-cyan-600 text-white border border-cyan-500/30'
                                        : 'text-gray-400 hover:bg-gray-800 border border-transparent'
                                        }`}
                                >
                                    🎯 Eventos
                                </button>
                                <button
                                    onClick={() => setMyBodyTab('energy')}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myBodyTab === 'energy'
                                        ? 'bg-cyan-600 text-white border border-cyan-500/30'
                                        : 'text-gray-400 hover:bg-gray-800 border border-transparent'
                                        }`}
                                >
                                    ⚖️ Balanço
                                </button>
                            </div>

                            {/* Tab Content */}
                            {myBodyTab === 'body' && (
                                <>
                                    {/* Body Visualization 3D */}
                                    <div className="mb-3 h-[400px] relative">
                                        <AnatomicalBody3DImproved
                                            heartRate={parameters.heartRate}
                                            respiratoryRate={parameters.respiratoryRate}
                                            arterialPerfusion={parameters.musclePerfusion}
                                            venousPerfusion={parameters.organsPerfusion}
                                        />
                                    </div>

                                    {/* Organ Icons Grid - Compact */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setSelectedOrgan('neuron')}
                                            className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 hover:border-cyan-500/50 transition-all group"
                                        >
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">🧠</div>
                                                <div className="text-[10px] font-medium text-gray-400 group-hover:text-cyan-400">Cérebro</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setSelectedOrgan('liver')}
                                            className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 hover:border-orange-500/50 transition-all group"
                                        >
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">🪼</div>
                                                <div className="text-[10px] font-medium text-gray-400 group-hover:text-orange-400">Fígado</div>
                                            </div>
                                        </button>

                                        <button
                                            className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg p-2 cursor-pointer group hover:from-cyan-500 hover:to-blue-500 transition-all border border-cyan-500/30"
                                        >
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">❤️</div>
                                                <div className="text-[10px] font-semibold text-white">Meu Coração</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setSelectedOrgan('kidney')}
                                            className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 hover:border-purple-500/50 transition-all group"
                                        >
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">🪧</div>
                                                <div className="text-[10px] font-medium text-gray-400 group-hover:text-purple-400">Rim</div>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}

                            {myBodyTab === 'events' && (
                                <div>
                                    <ActiveEventHelp activeEvents={activeEvents} showTips={showTips} />
                                </div>
                            )}

                            {myBodyTab === 'energy' && (
                                <div>
                                    <EnergyBalanceScale
                                        bmi={parameters.bmi}
                                        bodyMass={parameters.bodyMass}
                                        fatMass={parameters.fatMass}
                                        leanMass={parameters.leanMass}
                                        energy={parameters.energy}
                                        glucose={parameters.glucose}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Center Content - Main Tabs */}
                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 overflow-y-auto">
                            {/* Tabs Navigation */}
                            <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2 flex-wrap">
                                {[
                                    { id: 'overview', label: 'Condição Cardíaca', icon: '💙' },
                                    { id: 'organs', label: 'Órgãos', icon: '🫀' },
                                    { id: 'molecular', label: 'Molecular', icon: '🧬' },
                                    { id: 'charts', label: 'Gráficos', icon: '📈' },
                                    { id: 'labs', label: 'Laboratório', icon: '🧪' },
                                    { id: 'idle', label: 'Idle Game', icon: '⚡' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as TabType)}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${activeTab === tab.id
                                            ? 'bg-cyan-600 text-white shadow-md border-cyan-500/30'
                                            : 'text-gray-400 hover:bg-gray-800 border-transparent'
                                            }`}
                                    >
                                        <span className="mr-1">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="space-y-6">
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        {/* NEW: Physiology Status Panel */}
                                        <PhysiologyStatusPanel />

                                        {/* Primary Vitals Cards */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gradient-to-br from-cyan-950/30 to-gray-900/50 rounded-xl p-4 border border-cyan-900/30">
                                                <div className="text-xs text-gray-400 mb-1">Blood Status</div>
                                                <div className="text-2xl font-bold text-gray-200">116/70</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-cyan-950/30 to-gray-900/50 rounded-xl p-4 border border-cyan-900/30">
                                                <div className="text-xs text-gray-400 mb-1">Heart Rate</div>
                                                <div className="text-2xl font-bold text-gray-200">{Math.round(parameters.heartRate)} bpm</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-gray-900/50 to-gray-950/30 rounded-xl p-4 border border-gray-800">
                                                <div className="text-xs text-gray-400 mb-1">Blood Count</div>
                                                <div className="text-2xl font-bold text-gray-200">80-90</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Glucose Level</div>
                                                <div className="text-2xl font-bold text-gray-900">{parameters.glucose.toFixed(0)} mg/dL</div>
                                            </div>
                                        </div>

                                        {/* Additional Metrics */}
                                        <div className="grid grid-cols-4 gap-3">
                                            <BiomedicCard
                                                title="O₂ Sat"
                                                value={parameters.bloodOxygen.toFixed(0)}
                                                unit="%"
                                                icon={<Wind className="w-4 h-4" />}
                                                color="text-blue-500"
                                                subtitle="SpO₂"
                                                warning={parameters.bloodOxygen < 90}
                                            />
                                            <BiomedicCard
                                                title="Temp"
                                                value={parameters.temperature}
                                                unit="°C"
                                                icon={<Thermometer className="w-4 h-4" />}
                                                color="text-orange-500"
                                                subtitle="Core"
                                                warning={parameters.temperature > 38}
                                            />
                                            <BiomedicCard
                                                title="pH"
                                                value={parameters.pH.toFixed(2)}
                                                unit=""
                                                icon={<Droplet className="w-4 h-4" />}
                                                color="text-cyan-500"
                                                subtitle="Blood"
                                                warning={parameters.pH < 7.35 || parameters.pH > 7.45}
                                            />
                                            <BiomedicCard
                                                title="Lactate"
                                                value={parameters.lactate.toFixed(1)}
                                                unit="mmol/L"
                                                icon={<Activity className="w-4 h-4" />}
                                                color="text-red-500"
                                                subtitle="Level"
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'organs' && <OrgansTab parameters={parameters} onOrganClick={setSelectedOrgan} />}
                                {activeTab === 'molecular' && <MolecularTab parameters={parameters} />}
                                {activeTab === 'charts' && <ChartsTab parameters={parameters} />}
                                {activeTab === 'labs' && <LabMarkersPanel parameters={parameters} />}
                                {activeTab === 'idle' && <IdleGamePanel />}
                            </div>
                        </div>

                        {/* Right Sidebar - Actions & Substances */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 overflow-y-auto">
                            {/* Action Tabs */}
                            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
                                {[
                                    { id: 'actions', label: 'Ações', icon: '⚡' },
                                    { id: 'substances', label: 'Substâncias', icon: '💊' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActionTab(tab.id as ActionTabType)}
                                        className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all ${actionTab === tab.id
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className="mr-1">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Actions Content */}
                            {actionTab === 'actions' && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-gray-900 mb-3">⚡ Ações</h3>

                                    {/* Hormonal & Stress Control */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🧠 Controle Hormonal & Estresse</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['releaseAdrenaline', 'reduceCortisol', 'vasodilation', 'antioxidantBoost', 'antiInflammatory', 'neurotransmitterBalance'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-50 to-white border-blue-200 hover:border-blue-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Respiratory & Oxygenation */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🫁 Respiratório & Oxigenação</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['increaseVentilation', 'oxygenationBoost'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-cyan-50 to-white border-cyan-200 hover:border-cyan-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Metabolic & Energy */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">⚡ Metabolismo & Energia</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['releaseInsulin', 'releaseGlucose', 'metabolicSwitch', 'thermoregulation', 'anabolicPush', 'thyroidBoost'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200 hover:border-yellow-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Hydration & Detox */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">💧 Hidratação & Desintoxicação</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['hydrationBoost', 'detoxification', 'renalSupport', 'thirstDrive'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-50 to-white border-blue-200 hover:border-blue-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Sleep & Circadian */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">😴 Sono & Ritmo Circadiano</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['sleepDrive', 'wakefulnessBoost', 'circadianReset', 'melatoninRelease'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-purple-50 to-white border-purple-200 hover:border-purple-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Appetite & Satiety */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🍽️ Apetite & Saciedade</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['hungerSignal', 'satietySignal', 'leptinResponse'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-orange-50 to-white border-orange-200 hover:border-orange-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Autonomic Balance */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">⚖️ Balanço Autonômico</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['sympatheticDrive', 'parasympatheticDrive'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-red-50 to-white border-red-200 hover:border-red-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Temperature Regulation */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🌡️ Regulação Térmica</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['heatProduction', 'coolDown', 'feverResponse'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-amber-50 to-white border-amber-200 hover:border-amber-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pain & Pleasure */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">😌 Dor & Prazer</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['endorphinRelease', 'painModulation'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-pink-50 to-white border-pink-200 hover:border-pink-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Defensive & Reproductive */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">⚔️ Defesa & Reprodução</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['freezeResponse', 'aggressionDrive', 'gnrhPulse', 'prolactinSuppress'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-violet-50 to-white border-violet-200 hover:border-violet-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Immune System */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🛡️ Sistema Imune</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['immunoBoost'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-green-50 to-white border-green-200 hover:border-green-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-900">{action.name}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Emergency */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-red-700 mb-2">🚨 EMERGÊNCIA</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['lastResort'].map((actionId) => {
                                                const action = ACTIONS[actionId];
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => applyAction(action)}
                                                        disabled={getCooldownTime(action.id) > 0}
                                                        className={`w-full text-left p-2.5 rounded-lg border-2 transition-all ${getCooldownTime(action.id) > 0
                                                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-red-100 to-orange-100 border-red-400 hover:border-red-600 hover:shadow-lg animate-pulse'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-bold text-red-900">{action.name}</div>
                                                        <div className="text-[10px] text-red-700 mt-0.5 font-medium">{action.description}</div>
                                                        {getCooldownTime(action.id) > 0 && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                ⏱ {getCooldownTime(action.id).toFixed(0)}s
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Substances Content */}
                            {actionTab === 'substances' && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-gray-900 mb-3">💊 Substâncias</h3>

                                    {/* Stimulants & Energy */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">⚡ Estimulantes & Energia</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <SubstanceButton id="caffeine" name="☕ Cafeína" description="↑ Energia, ↑ FC, ↓ Sono" cooldown={substanceCooldowns['caffeine']} onClick={handleUseSubstance} color="amber" />
                                            <SubstanceButton id="glucose" name="🍬 Glicose" description="↑ Glicemia, ↑ Energia" cooldown={substanceCooldowns['glucose']} onClick={handleUseSubstance} color="yellow" />
                                            <SubstanceButton id="energy_drink" name="⚡ Energético" description="↑↑ Energia, ↑↑ FC, Estresse" cooldown={substanceCooldowns['energy_drink']} onClick={handleUseSubstance} color="orange" />
                                            <SubstanceButton id="sugar" name="🍭 Açúcar" description="Pico rápido de glicose" cooldown={substanceCooldowns['sugar']} onClick={handleUseSubstance} color="pink" />
                                        </div>
                                    </div>

                                    {/* Hydration & Electrolytes */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">💧 Hidratação & Eletrólitos</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <SubstanceButton id="water" name="💧 Água" description="↑ Hidratação, Balanço" cooldown={substanceCooldowns['water']} onClick={handleUseSubstance} color="cyan" />
                                            <SubstanceButton id="electrolytes" name="⚡ Eletrólitos" description="↑ Na⁺, K⁺, Performance" cooldown={substanceCooldowns['electrolytes']} onClick={handleUseSubstance} color="blue" />
                                            <SubstanceButton id="isotonic" name="🥤 Isotônico" description="Hidratação + Energia" cooldown={substanceCooldowns['isotonic']} onClick={handleUseSubstance} color="indigo" />
                                            <SubstanceButton id="salt" name="🧂 Sal" description="↑ Sódio, ↑ PA" cooldown={substanceCooldowns['salt']} onClick={handleUseSubstance} color="gray" />
                                        </div>
                                    </div>

                                    {/* Medications */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">💊 Medicamentos</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <SubstanceButton id="painkiller" name="💊 Analgésico" description="↓ Dor, ↓ Inflamação" cooldown={substanceCooldowns['painkiller']} onClick={handleUseSubstance} color="red" />
                                            <SubstanceButton id="antihistamine" name="💊 Anti-histamínico" description="↓ Alergias, Sonência" cooldown={substanceCooldowns['antihistamine']} onClick={handleUseSubstance} color="purple" />
                                            <SubstanceButton id="beta_blocker" name="💊 Betabloqueador" description="↓ FC, ↓ PA" cooldown={substanceCooldowns['beta_blocker']} onClick={handleUseSubstance} color="indigo" />
                                            <SubstanceButton id="aspirin" name="💊 Aspirina" description="↓ Coagulação, ↓ Dor" cooldown={substanceCooldowns['aspirin']} onClick={handleUseSubstance} color="pink" />
                                        </div>
                                    </div>

                                    {/* Hormones - Hunger & Thirst */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🧬 Hormônios de Fome & Sede</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <SubstanceButton id="ghrelin" name="😋 Grelina" description="↑↑ Sinal de Fome" cooldown={substanceCooldowns['ghrelin']} onClick={handleUseSubstance} color="orange" />
                                            <SubstanceButton id="leptin" name="🚫 Leptina" description="↓ Fome, Saciedade" cooldown={substanceCooldowns['leptin']} onClick={handleUseSubstance} color="green" />
                                            <SubstanceButton id="adh" name="💧 ADH" description="↑ Sede, Retenção H₂O" cooldown={substanceCooldowns['adh']} onClick={handleUseSubstance} color="blue" />
                                            <SubstanceButton id="angiotensin" name="💦 Angiotensina" description="↑ Sede, ↑ PA" cooldown={substanceCooldowns['angiotensin']} onClick={handleUseSubstance} color="cyan" />
                                        </div>
                                    </div>

                                    {/* Stress & Relaxation */}
                                    <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">🧘 Estresse & Relaxamento</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <SubstanceButton id="melatonin" name="🌙 Melatonina" description="↑ Sono, ↓ Energia" cooldown={substanceCooldowns['melatonin']} onClick={handleUseSubstance} color="violet" />
                                            <SubstanceButton id="magnesium" name="✨ Magnésio" description="↓ Estresse, Relaxamento" cooldown={substanceCooldowns['magnesium']} onClick={handleUseSubstance} color="emerald" />
                                            <SubstanceButton id="cortisol_blocker" name="🛡️ Bloq. Cortisol" description="↓ Hormônio Estresse" cooldown={substanceCooldowns['cortisol_blocker']} onClick={handleUseSubstance} color="teal" />
                                            <SubstanceButton id="cbd" name="🌿 CBD" description="↓ Ansiedade, Calma" cooldown={substanceCooldowns['cbd']} onClick={handleUseSubstance} color="lime" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Quest Panel */}
            <QuestPanel
                isOpen={questPanelOpen}
                onClose={() => setQuestPanelOpen(false)}
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                showTips={showTips}
                onToggleTips={setShowTips}
                pauseOnEvent={pauseOnEvent}
                onTogglePauseOnEvent={setPauseOnEvent}
            />

            {/* Organ Detail Modals */}
            <OrganModals
                selectedOrgan={selectedOrgan}
                parameters={parameters}
                onClose={() => setSelectedOrgan(null)}
            />
        </div>
    );
}

// Helper component for substance buttons
function SubstanceButton({ id, name, description, cooldown, onClick, color }: {
    id: string;
    name: string;
    description: string;
    cooldown: number;
    onClick: (id: string) => void;
    color: string;
}) {
    const colorClasses = {
        cyan: 'from-cyan-50 border-cyan-200 hover:border-cyan-400',
        blue: 'from-blue-50 border-blue-200 hover:border-blue-400',
        purple: 'from-purple-50 border-purple-200 hover:border-purple-400',
        red: 'from-red-50 border-red-200 hover:border-red-400',
        amber: 'from-amber-50 border-amber-200 hover:border-amber-400',
        yellow: 'from-yellow-50 border-yellow-200 hover:border-yellow-400',
        orange: 'from-orange-50 border-orange-200 hover:border-orange-400',
        pink: 'from-pink-50 border-pink-200 hover:border-pink-400',
        indigo: 'from-indigo-50 border-indigo-200 hover:border-indigo-400',
        green: 'from-green-50 border-green-200 hover:border-green-400',
        teal: 'from-teal-50 border-teal-200 hover:border-teal-400',
        lime: 'from-lime-50 border-lime-200 hover:border-lime-400',
        emerald: 'from-emerald-50 border-emerald-200 hover:border-emerald-400',
        violet: 'from-violet-50 border-violet-200 hover:border-violet-400',
        gray: 'from-gray-50 border-gray-200 hover:border-gray-400',
    };

    return (
        <button
            onClick={() => onClick(id)}
            disabled={cooldown > 0}
            className={`w-full text-left p-2 rounded-lg border transition-all ${cooldown > 0
                ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                : `bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} to-white hover:shadow-md`
                }`}
        >
            <div className="text-xs font-semibold text-gray-900">{name}</div>
            <div className="text-[10px] text-gray-500">{description}</div>
            {cooldown > 0 && (
                <div className="text-[9px] text-red-500 mt-1">
                    ⏱ {cooldown.toFixed(0)}s
                </div>
            )}
        </button>
    );
}
