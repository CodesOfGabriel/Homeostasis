// GameDashboard: Interface estilo game sci-fi com abas e controles refinados

import { useState } from 'react';
import { useSimulationStore } from '../game/simulationStore';
import { useInterval } from '../game/useInterval';
import { ACTIONS } from '../game/actions';
import { AnatomicalHeart } from '../components/HUD/AnatomicalHeart';
import { AnatomicalBody } from '../components/HUD/AnatomicalBody';
import { Circulation } from '../components/HUD/Circulation';
import { Lungs } from '../components/HUD/Lungs';
import { ParameterCard } from '../components/HUD/ParameterCard';
import { EventPopup } from '../components/HUD/EventPopup';
import { ActionButton } from '../components/HUD/ActionButton';
import { LiverTissue } from '../components/HUD/LiverTissue';
import { KidneyNephrons } from '../components/HUD/KidneyNephrons';
import { MuscleFibers } from '../components/HUD/MuscleFibers';
import { NeuronNetwork } from '../components/HUD/NeuronNetwork';
import { MolecularPathways } from '../components/HUD/MolecularPathways';
import { RealTimeChart } from '../components/HUD/RealTimeChart';
import { DetailModal } from '../components/HUD/DetailModal';
import { EventTimeline, TimelineEvent } from '../components/HUD/EventTimeline';
import { SubstancePanel } from '../components/HUD/SubstancePanel';
import { BiomedicCard } from '../components/HUD/BiomedicCard';
import { MolecularPathway } from '../components/HUD/MolecularPathway';
import {
    Heart,
    Droplet,
    Wind,
    Activity,
    Thermometer,
    Flame,
    Zap,
    Dna,
    ArrowUp,
    Moon,
    Smile,
    Target
} from 'lucide-react'; type TabType = 'overview' | 'organs' | 'molecular' | 'charts' | 'substances';

export function GameDashboard() {
    const {
        parameters,
        isRunning,
        activeEvents,
        notifications,
        actionCooldowns,
        tick,
        start,
        pause,
        applyAction,
        clearNotification,
    } = useSimulationStore();

    const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [currentDayTime, setCurrentDayTime] = useState(480); // 08:00 início do dia
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
        { id: '1', name: 'Despertar', description: 'Cortisol naturalmente elevado', time: 420, type: 'completed', severity: 'low', icon: '🌅' },
        { id: '2', name: 'Café da Manhã', description: 'Pico de insulina e glicose', time: 480, type: 'active', severity: 'medium', icon: '🍳' },
        { id: '3', name: 'Exercício', description: 'Liberação de adrenalina e endorfinas', time: 600, type: 'scheduled', severity: 'high', icon: '🏃' },
        { id: '4', name: 'Almoço', description: 'Segunda refeição do dia', time: 780, type: 'scheduled', severity: 'medium', icon: '🍽️' },
        { id: '5', name: 'Pico Cortisol', description: 'Estresse do trabalho', time: 900, type: 'scheduled', severity: 'high', icon: '💼' },
        { id: '6', name: 'Lanche', description: 'Pequena elevação de glicose', time: 960, type: 'scheduled', severity: 'low', icon: '☕' },
        { id: '7', name: 'Jantar', description: 'Última refeição principal', time: 1140, type: 'scheduled', severity: 'medium', icon: '🍲' },
        { id: '8', name: 'Relaxamento', description: 'Redução de cortisol', time: 1260, type: 'scheduled', severity: 'low', icon: '📺' },
        { id: '9', name: 'Melatonina', description: 'Preparação para dormir', time: 1320, type: 'scheduled', severity: 'medium', icon: '🌙' },
        { id: '10', name: 'Sono', description: 'Ciclo de recuperação', time: 1380, type: 'scheduled', severity: 'critical', icon: '😴' },
    ]);
    const [substanceCooldowns, setSubstanceCooldowns] = useState<Record<string, number>>({});

    useInterval(() => {
        if (isRunning) {
            tick();
            // Avançar tempo do dia (1 minuto real = 1 minuto de jogo, ajustável)
            setCurrentDayTime((prev) => {
                const next = prev + 0.2; // 200ms = 0.2 minutos
                return next >= 1440 ? 0 : next; // Reset após 24h
            });

            // Atualizar cooldowns de substâncias
            setSubstanceCooldowns((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((key) => {
                    if (updated[key] > 0) {
                        updated[key] = Math.max(0, updated[key] - 0.2);
                    }
                });
                return updated;
            });
        }
    }, 200);

    const getCooldownTime = (actionId: string): number => {
        const cooldown = actionCooldowns.find((cd: any) => cd.actionId === actionId);
        return cooldown?.remainingTime || 0;
    };

    const handleUseSubstance = (substanceId: string) => {
        // Lógica para aplicar efeitos de substâncias será implementada
        console.log('Usando substância:', substanceId);
        // Por enquanto, apenas definir cooldown
        const substance = { cooldown: 300 }; // placeholder
        setSubstanceCooldowns((prev) => ({ ...prev, [substanceId]: substance.cooldown }));
    };

    const handleEventClick = (event: TimelineEvent) => {
        console.log('Evento clicado:', event);
    };

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {/* Scanline Effect */}
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-30 animate-pulse"></div>

            {/* Header */}
            <header className="relative border-b border-cyan-500/50 bg-gradient-to-r from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse"></div>
                <div className="relative px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                                <span className="text-2xl">🧬</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400">
                                    BODY OPS
                                </h1>
                                <p className="text-xs text-cyan-500/70 tracking-widest uppercase">
                                    Sistema de Controle Neurohormonal
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 items-center">
                        <div className="flex gap-4">
                            <div className="text-right border-l-2 border-cyan-500/50 pl-4">
                                <div className="text-2xl font-bold text-cyan-400 font-mono">
                                    {Math.floor(parameters.time)}
                                </div>
                                <div className="text-[10px] text-gray-500 tracking-widest uppercase">Tempo Missão</div>
                            </div>
                            <div className="text-right border-l-2 border-purple-500/50 pl-4">
                                <div className="text-2xl font-bold text-purple-400">
                                    {Math.round(parameters.heartRate)}
                                </div>
                                <div className="text-[10px] text-gray-500 tracking-widest uppercase">BPM</div>
                            </div>
                        </div>

                        <button
                            onClick={isRunning ? pause : start}
                            className={`px-6 py-3 rounded-lg font-bold tracking-wider transition-all shadow-lg ${isRunning
                                ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-red-500/50 text-white'
                                : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:shadow-cyan-500/50 text-white'
                                }`}
                        >
                            {isRunning ? '⏸ PAUSAR' : '▶ INICIAR'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="relative px-6 flex gap-2 border-t border-cyan-500/30">
                    {[
                        { id: 'overview', label: '📊 Visão Geral' },
                        { id: 'organs', label: '🫀 Órgãos' },
                        { id: 'molecular', label: '🧬 Molecular' },
                        { id: 'charts', label: '📈 Gráficos' },
                        { id: 'substances', label: '💊 Substâncias' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-6 py-3 font-semibold tracking-wider transition-all border-b-2 ${activeTab === tab.id
                                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content */}
            <main className="p-6 space-y-6 max-w-[1800px] mx-auto">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <>
                        {/* Event Timeline - Frostpunk Style */}
                        <EventTimeline
                            events={timelineEvents}
                            currentTime={currentDayTime}
                            onEventClick={handleEventClick}
                        />

                        {/* Vitals Grid - Biomedic Style */}
                        <div className="grid grid-cols-4 gap-4">
                            <BiomedicCard
                                title="Frequência Cardíaca"
                                value={parameters.heartRate}
                                unit="BPM"
                                icon={<Heart className="w-6 h-6" />}
                                color="text-red-400"
                                subtitle="Cardiac Output"
                                warning={parameters.heartRate > 120 || parameters.heartRate < 50}
                                pulseRate={parameters.heartRate}
                            />
                            <BiomedicCard
                                title="Glicose Sanguínea"
                                value={parameters.glucose}
                                unit="mg/dL"
                                icon={<Droplet className="w-6 h-6" />}
                                color="text-yellow-400"
                                subtitle="Blood Glucose"
                                warning={parameters.glucose < 70 || parameters.glucose > 180}
                            />
                            <BiomedicCard
                                title="Saturação O₂"
                                value={parameters.bloodOxygen.toFixed(0)}
                                unit="%"
                                icon={<Wind className="w-6 h-6" />}
                                color="text-cyan-400"
                                subtitle="SpO₂ Level"
                                warning={parameters.bloodOxygen < 90}
                                pulseRate={parameters.respiratoryRate}
                            />
                            <BiomedicCard
                                title="Temperatura"
                                value={parameters.temperature}
                                unit="°C"
                                icon={<Thermometer className="w-6 h-6" />}
                                color="text-orange-400"
                                subtitle="Core Temp"
                                warning={parameters.temperature > 38 || parameters.temperature < 36}
                            />
                        </div>

                        {/* Main Grid - Personagem + Órgãos */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Anatomia Realista - Sistema Circulatório */}
                            <div className="bg-gradient-to-br from-gray-900/80 to-black/90 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl shadow-cyan-500/20">
                                <h3 className="text-cyan-400 font-bold text-lg mb-4 tracking-wider text-center">🫀 SISTEMA CIRCULATÓRIO - ATLAS ANATÔMICO</h3>
                                <div className="h-[500px] flex items-center justify-center">
                                    <AnatomicalBody
                                        venousPerfusion={parameters.heartPerfusion}
                                        arterialPerfusion={parameters.musclePerfusion}
                                        heartRate={parameters.heartRate}
                                        respiratoryRate={parameters.respiratoryRate}
                                    />
                                </div>
                            </div>

                            {/* Painéis de Órgãos à Direita */}
                            <div className="space-y-4">
                                {/* Coração Anatômico */}
                                <div className="bg-gradient-to-br from-red-900/20 to-black border-2 border-red-500/50 rounded-2xl p-4 shadow-xl shadow-red-500/20">
                                    <h3 className="text-red-400 font-bold text-sm mb-2 tracking-wider">❤️ CORAÇÃO ANATÔMICO</h3>
                                    <div className="h-[220px]">
                                        <AnatomicalHeart
                                            heartRate={parameters.heartRate}
                                            perfusion={parameters.heartPerfusion}
                                            bloodOxygen={parameters.bloodOxygen}
                                        />
                                    </div>
                                </div>

                                {/* Pulmões */}
                                <div className="bg-gradient-to-br from-blue-900/20 to-black border-2 border-blue-500/50 rounded-2xl p-4 shadow-xl shadow-blue-500/20">
                                    <h3 className="text-blue-400 font-bold text-sm mb-2 tracking-wider">🫁 PULMÕES</h3>
                                    <div className="h-[160px] flex items-center justify-center">
                                        <Lungs
                                            respiratoryRate={parameters.respiratoryRate}
                                            bloodOxygen={parameters.bloodOxygen}
                                            tidalVolume={parameters.tidalVolume}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Circulação Sistêmica */}
                        <div className="bg-gradient-to-br from-purple-900/20 to-black border-2 border-purple-500/50 rounded-2xl p-4 shadow-xl shadow-purple-500/20">
                            <h3 className="text-purple-400 font-bold text-sm mb-3 tracking-wider">🔄 CIRCULAÇÃO SISTÊMICA</h3>
                            <div className="h-[150px]">
                                <Circulation
                                    cardiacOutput={parameters.cardiacOutput}
                                    bloodOxygen={parameters.bloodOxygen}
                                />
                            </div>
                        </div>

                        {/* Painel Hormonal Completo - Biomedic Style */}
                        <div className="bg-gradient-to-br from-purple-900/20 to-black border-2 border-purple-500/50 rounded-2xl p-6 shadow-xl shadow-purple-500/20">
                            <h3 className="text-purple-400 font-bold text-lg mb-4 tracking-wider flex items-center gap-2">
                                <Activity className="w-6 h-6" /> PAINEL NEURO-HORMONAL
                            </h3>
                            <div className="grid grid-cols-5 gap-3">
                                {/* Hormônios de Estresse */}
                                <BiomedicCard
                                    title="Adrenalina"
                                    value={parameters.adrenaline.toFixed(0)}
                                    unit="pg/mL"
                                    icon={<Zap className="w-5 h-5" />}
                                    color="text-red-400"
                                    subtitle="Epinephrine"
                                    warning={parameters.adrenaline > 70}
                                />
                                <BiomedicCard
                                    title="Cortisol"
                                    value={parameters.cortisol.toFixed(0)}
                                    unit="mcg/dL"
                                    icon={<Activity className="w-5 h-5" />}
                                    color="text-purple-400"
                                    subtitle="Stress Hormone"
                                    warning={parameters.cortisol > 60}
                                />

                                {/* Hormônios Metabólicos */}
                                <BiomedicCard
                                    title="Insulina"
                                    value={parameters.insulin.toFixed(0)}
                                    unit="μIU/mL"
                                    icon={<Droplet className="w-5 h-5" />}
                                    color="text-blue-300"
                                    subtitle="Glucose Control"
                                />
                                <BiomedicCard
                                    title="Glucagon"
                                    value={parameters.glucagon.toFixed(0)}
                                    unit="pg/mL"
                                    icon={<ArrowUp className="w-5 h-5" />}
                                    color="text-yellow-300"
                                    subtitle="Glycogenolysis"
                                />
                                <BiomedicCard
                                    title="Tireoide"
                                    value={parameters.thyroid.toFixed(0)}
                                    unit="μg/dL"
                                    icon={<Flame className="w-5 h-5" />}
                                    color="text-orange-400"
                                    subtitle="T3/T4"
                                />

                                {/* Hormônios Anabólicos */}
                                <BiomedicCard
                                    title="Testosterona"
                                    value={parameters.testosterone.toFixed(0)}
                                    unit="ng/dL"
                                    icon={<Dna className="w-5 h-5" />}
                                    color="text-cyan-400"
                                    subtitle="Anabolic"
                                />
                                <BiomedicCard
                                    title="GH"
                                    value={parameters.growthHormone.toFixed(0)}
                                    unit="ng/mL"
                                    icon={<ArrowUp className="w-5 h-5" />}
                                    color="text-green-400"
                                    subtitle="Somatotropin"
                                />

                                {/* Neurotransmissores */}
                                <BiomedicCard
                                    title="Dopamina"
                                    value={parameters.dopamine.toFixed(0)}
                                    unit="pg/mL"
                                    icon={<Target className="w-5 h-5" />}
                                    color="text-pink-400"
                                    subtitle="Reward System"
                                />
                                <BiomedicCard
                                    title="Serotonina"
                                    value={parameters.serotonin.toFixed(0)}
                                    unit="ng/mL"
                                    icon={<Smile className="w-5 h-5" />}
                                    color="text-indigo-400"
                                    subtitle="5-HT"
                                />

                                {/* Hormônio Circadiano */}
                                <BiomedicCard
                                    title="Melatonina"
                                    value={parameters.melatonin.toFixed(0)}
                                    unit="pg/mL"
                                    icon={<Moon className="w-5 h-5" />}
                                    color="text-purple-300"
                                    subtitle="Sleep Hormone"
                                />
                            </div>
                        </div>                        {/* Electrolytes */}
                        <div className="grid grid-cols-5 gap-3">
                            <ParameterCard
                                title="Sódio"
                                value={parameters.sodium.toFixed(0)}
                                unit="mmol/L"
                                color="text-yellow-300"
                                warning={parameters.sodium > 145 || parameters.sodium < 135}
                            />
                            <ParameterCard
                                title="Potássio"
                                value={parameters.potassium.toFixed(1)}
                                unit="mmol/L"
                                color="text-orange-300"
                                warning={parameters.potassium > 5.0 || parameters.potassium < 3.5}
                            />
                            <ParameterCard
                                title="Cálcio"
                                value={parameters.calcium.toFixed(1)}
                                unit="mmol/L"
                                color="text-green-300"
                            />
                            <ParameterCard
                                title="pH"
                                value={parameters.pH.toFixed(2)}
                                unit=""
                                color="text-cyan-300"
                                warning={parameters.pH < 7.35 || parameters.pH > 7.45}
                            />
                        </div>
                    </>
                )}

                {/* ORGANS TAB */}
                {activeTab === 'organs' && (
                    <div className="grid grid-cols-2 gap-6">
                        <div
                            className="bg-gradient-to-br from-orange-900/20 to-black border-2 border-orange-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform shadow-xl shadow-orange-500/20"
                            onClick={() => setSelectedOrgan('liver')}
                        >
                            <h3 className="text-orange-400 font-bold text-xl mb-4 tracking-wider">🫀 FÍGADO</h3>
                            <LiverTissue
                                perfusion={parameters.organsPerfusion}
                                glucose={parameters.glucose}
                                detoxification={100 - parameters.stress}
                            />
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-orange-300 text-xs">Perfusão</div>
                                    <div className="text-white font-bold">{parameters.organsPerfusion.toFixed(0)}%</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-yellow-300 text-xs">Glicose</div>
                                    <div className="text-white font-bold">{parameters.glucose.toFixed(0)}</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-green-300 text-xs">Detox</div>
                                    <div className="text-white font-bold">{(100 - parameters.stress).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-gradient-to-br from-purple-900/20 to-black border-2 border-purple-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform shadow-xl shadow-purple-500/20"
                            onClick={() => setSelectedOrgan('kidney')}
                        >
                            <h3 className="text-purple-400 font-bold text-xl mb-4 tracking-wider">🫘 RINS</h3>
                            <KidneyNephrons
                                perfusion={parameters.organsPerfusion}
                                osmolarity={parameters.osmolarity}
                                filtrationRate={parameters.organsPerfusion}
                            />
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-purple-300 text-xs">Perfusão</div>
                                    <div className="text-white font-bold">{parameters.organsPerfusion.toFixed(0)}%</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-blue-300 text-xs">Osmolaridade</div>
                                    <div className="text-white font-bold">{parameters.osmolarity.toFixed(0)}</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-cyan-300 text-xs">Taxa Filtração</div>
                                    <div className="text-white font-bold">{parameters.organsPerfusion.toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-gradient-to-br from-red-900/20 to-black border-2 border-red-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform shadow-xl shadow-red-500/20"
                            onClick={() => setSelectedOrgan('muscle')}
                        >
                            <h3 className="text-red-400 font-bold text-xl mb-4 tracking-wider">💪 MÚSCULOS</h3>
                            <MuscleFibers
                                perfusion={parameters.musclePerfusion}
                                vo2Max={parameters.vo2Max}
                                lactate={parameters.lactate}
                                contractionRate={parameters.heartRate / 60}
                            />
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-red-300 text-xs">Perfusão</div>
                                    <div className="text-white font-bold">{parameters.musclePerfusion.toFixed(0)}%</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-cyan-300 text-xs">VO₂ Max</div>
                                    <div className="text-white font-bold">{parameters.vo2Max.toFixed(0)}</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-orange-300 text-xs">Lactato</div>
                                    <div className="text-white font-bold">{parameters.lactate.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-gradient-to-br from-blue-900/20 to-black border-2 border-blue-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform shadow-xl shadow-blue-500/20"
                            onClick={() => setSelectedOrgan('neuron')}
                        >
                            <h3 className="text-blue-400 font-bold text-xl mb-4 tracking-wider">🧠 NEURÔNIOS</h3>
                            <NeuronNetwork
                                brainPerfusion={parameters.brainPerfusion}
                                glucose={parameters.glucose}
                                neurotransmitters={100 - parameters.stress}
                            />
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-blue-300 text-xs">Perfusão Cerebral</div>
                                    <div className="text-white font-bold">{parameters.brainPerfusion.toFixed(0)}%</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-yellow-300 text-xs">Glicose</div>
                                    <div className="text-white font-bold">{parameters.glucose.toFixed(0)}</div>
                                </div>
                                <div className="bg-black/50 rounded p-2">
                                    <div className="text-purple-300 text-xs">Neurotransmissores</div>
                                    <div className="text-white font-bold">{(100 - parameters.stress).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MOLECULAR TAB */}
                {activeTab === 'molecular' && (
                    <div className="space-y-6">
                        {/* Animated Molecular Pathways - GSAP Enhanced */}
                        <div className="grid grid-cols-2 gap-6">
                            <MolecularPathway
                                pathwayName="AMPK"
                                activity={parameters.ampk}
                                color="cyan"
                                nodes={[
                                    { id: 'amp', label: 'AMP/ATP', active: parameters.ampk > 50, position: { x: 40, y: 100 } },
                                    { id: 'lkb1', label: 'LKB1', active: parameters.ampk > 60, position: { x: 120, y: 80 } },
                                    { id: 'ampk', label: 'AMPK', active: parameters.ampk > 70, position: { x: 200, y: 100 } },
                                    { id: 'ppar', label: 'PPARα', active: parameters.ampk > 80, position: { x: 280, y: 80 } },
                                    { id: 'pgc1', label: 'PGC-1α', active: parameters.ampk > 85, position: { x: 360, y: 100 } },
                                ]}
                            />
                            <MolecularPathway
                                pathwayName="mTOR"
                                activity={parameters.mtor}
                                color="purple"
                                nodes={[
                                    { id: 'insulin', label: 'Insulin', active: parameters.mtor > 50, position: { x: 40, y: 100 } },
                                    { id: 'pi3k', label: 'PI3K', active: parameters.mtor > 60, position: { x: 120, y: 80 } },
                                    { id: 'akt', label: 'AKT', active: parameters.mtor > 70, position: { x: 200, y: 100 } },
                                    { id: 'mtor', label: 'mTOR', active: parameters.mtor > 80, position: { x: 280, y: 80 } },
                                    { id: 's6k', label: 'S6K', active: parameters.mtor > 85, position: { x: 360, y: 100 } },
                                ]}
                            />
                        </div>

                        <MolecularPathways
                            nrf2={parameters.nrf2}
                            mtor={parameters.mtor}
                            ampk={parameters.ampk}
                            nfkb={parameters.nfkb}
                        />

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-green-900/20 to-black border-2 border-green-500/50 rounded-2xl p-6">
                                <h3 className="text-green-400 font-bold text-xl mb-4">🛡️ Nrf2 - Proteção Antioxidante</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Via de sinalização que responde ao estresse oxidativo, ativando genes de proteção celular e detoxificação.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Ativação Atual:</span>
                                        <span className="text-green-400 font-bold">{parameters.nrf2.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-black/50 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-green-300 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${parameters.nrf2}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-900/20 to-black border-2 border-blue-500/50 rounded-2xl p-6">
                                <h3 className="text-blue-400 font-bold text-xl mb-4">🔧 mTOR - Crescimento Celular</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Regula crescimento, síntese proteica e metabolismo. Ativado por nutrientes e insulina.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Ativação Atual:</span>
                                        <span className="text-blue-400 font-bold">{parameters.mtor.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-black/50 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-300 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${parameters.mtor}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-yellow-900/20 to-black border-2 border-yellow-500/50 rounded-2xl p-6">
                                <h3 className="text-yellow-400 font-bold text-xl mb-4">⚡ AMPK - Sensor de Energia</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Ativado quando energia celular está baixa. Promove catabolismo e oxidação de gorduras.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Ativação Atual:</span>
                                        <span className="text-yellow-400 font-bold">{parameters.ampk.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-black/50 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${parameters.ampk}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-red-900/20 to-black border-2 border-red-500/50 rounded-2xl p-6">
                                <h3 className="text-red-400 font-bold text-xl mb-4">🔥 NF-κB - Inflamação</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Via de resposta inflamatória. Ativado por estresse, dano tecidual e lactato elevado.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Ativação Atual:</span>
                                        <span className="text-red-400 font-bold">{parameters.nfkb.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-black/50 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-red-500 to-red-300 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${parameters.nfkb}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CHARTS TAB */}
                {activeTab === 'charts' && (
                    <div className="grid grid-cols-2 gap-6">
                        <RealTimeChart
                            title="Frequência Cardíaca"
                            currentValue={parameters.heartRate}
                            unit="BPM"
                            color="#EF4444"
                            min={40}
                            max={180}
                        />
                        <RealTimeChart
                            title="Saturação de Oxigênio"
                            currentValue={parameters.bloodOxygen}
                            unit="%"
                            color="#06B6D4"
                            min={70}
                            max={100}
                        />
                        <RealTimeChart
                            title="Glicose Sanguínea"
                            currentValue={parameters.glucose}
                            unit="mg/dL"
                            color="#FBBF24"
                            min={40}
                            max={200}
                        />
                        <RealTimeChart
                            title="Lactato"
                            currentValue={parameters.lactate}
                            unit="mmol/L"
                            color="#F97316"
                            min={0}
                            max={5}
                        />
                        <RealTimeChart
                            title="Cortisol"
                            currentValue={parameters.cortisol}
                            unit="mcg/dL"
                            color="#A855F7"
                            min={0}
                            max={100}
                        />
                        <RealTimeChart
                            title="pH Sanguíneo"
                            currentValue={parameters.pH}
                            unit=""
                            color="#06B6D4"
                            min={7.0}
                            max={7.8}
                        />
                    </div>
                )}

                {/* Actions Panel - Always Visible */}
                <div className="bg-gradient-to-br from-purple-900/20 to-black border-2 border-purple-500/50 rounded-2xl p-6 shadow-xl shadow-purple-500/20">
                    <h2 className="text-xl font-bold text-purple-400 mb-4 tracking-wider uppercase border-l-4 border-purple-500 pl-3">
                        🎮 Centro de Comando Neural
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {Object.values(ACTIONS).map((action) => (
                            <ActionButton
                                key={action.id}
                                label={action.name}
                                description={action.description}
                                onClick={() => applyAction(action)}
                                cooldown={getCooldownTime(action.id)}
                                maxCooldown={action.cooldown}
                                cost={action.cost}
                            />
                        ))}
                    </div>
                </div>

                {/* Active Events */}
                {activeEvents.length > 0 && (
                    <div className="bg-gradient-to-br from-yellow-900/20 to-black border-2 border-yellow-500/50 rounded-2xl p-6 shadow-xl shadow-yellow-500/20">
                        <h3 className="text-lg font-bold text-yellow-400 mb-4 tracking-wider uppercase border-l-4 border-yellow-500 pl-3">
                            ⚠️ Eventos Fisiológicos Ativos
                        </h3>
                        <div className="space-y-3">
                            {activeEvents.map((ae: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex justify-between items-center bg-black/50 p-4 rounded-lg border border-yellow-500/30"
                                >
                                    <div>
                                        <div className="text-white font-semibold">{ae.event.title}</div>
                                        <div className="text-sm text-gray-400">{ae.event.description}</div>
                                    </div>
                                    <div className="text-yellow-400 font-mono text-xl font-bold">
                                        {Math.ceil(ae.remainingTime)}s
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SUBSTANCES TAB */}
                {activeTab === 'substances' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-red-900/30 to-black border-2 border-red-500/50 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="text-4xl">⚠️</div>
                                <div>
                                    <h3 className="text-red-400 font-bold text-xl tracking-wider">
                                        PAINEL DE SUBSTÂNCIAS
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Medicamentos, suplementos e substâncias controladas. Use com responsabilidade.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                                    <div className="text-cyan-400 font-bold mb-1">💊 Medicamentos</div>
                                    <div className="text-gray-400 text-xs">Aprovados pela ANVISA</div>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                    <div className="text-green-400 font-bold mb-1">🌟 Suplementos</div>
                                    <div className="text-gray-400 text-xs">Vitaminas e aminoácidos</div>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <div className="text-red-400 font-bold mb-1">⚠️ Substâncias Ilícitas</div>
                                    <div className="text-gray-400 text-xs">Alto risco - Apenas educacional</div>
                                </div>
                            </div>
                        </div>

                        <SubstancePanel
                            onUseSubstance={handleUseSubstance}
                            cooldowns={substanceCooldowns}
                        />
                    </div>
                )}
            </main>

            {/* Notifications */}
            <div className="fixed top-24 right-6 space-y-3 z-50 max-w-md">
                {notifications.slice(-3).map((notification: string, index: number) => (
                    <EventPopup
                        key={index}
                        title="📢 ALERTA DO SISTEMA"
                        description={notification}
                        onClose={() => clearNotification(index)}
                    />
                ))}
            </div>

            {/* Detail Modals */}
            <DetailModal
                isOpen={selectedOrgan === 'liver'}
                onClose={() => setSelectedOrgan(null)}
                title="ANÁLISE DETALHADA - TECIDO HEPÁTICO"
            >
                <div className="grid grid-cols-2 gap-6">
                    <LiverTissue
                        perfusion={parameters.organsPerfusion}
                        glucose={parameters.glucose}
                        detoxification={100 - parameters.stress}
                    />
                    <div>
                        <h4 className="text-orange-400 font-bold mb-4 text-xl">Funções Hepáticas</h4>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• Metabolismo e armazenamento de glicose</li>
                            <li>• Síntese de proteínas plasmáticas</li>
                            <li>• Detoxificação de toxinas</li>
                            <li>• Produção de bile</li>
                            <li>• Armazenamento de vitaminas</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>

            <DetailModal
                isOpen={selectedOrgan === 'kidney'}
                onClose={() => setSelectedOrgan(null)}
                title="ANÁLISE DETALHADA - NÉFRONS RENAIS"
            >
                <div className="grid grid-cols-2 gap-6">
                    <KidneyNephrons
                        perfusion={parameters.organsPerfusion}
                        osmolarity={parameters.osmolarity}
                        filtrationRate={parameters.organsPerfusion}
                    />
                    <div>
                        <h4 className="text-purple-400 font-bold mb-4 text-xl">Funções Renais</h4>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• Filtração sanguínea (TFG)</li>
                            <li>• Balanço de eletrólitos</li>
                            <li>• Regulação da osmolaridade</li>
                            <li>• Equilíbrio ácido-base</li>
                            <li>• Controle da pressão arterial</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>

            <DetailModal
                isOpen={selectedOrgan === 'muscle'}
                onClose={() => setSelectedOrgan(null)}
                title="ANÁLISE DETALHADA - FIBRAS MUSCULARES"
            >
                <div className="grid grid-cols-2 gap-6">
                    <MuscleFibers
                        perfusion={parameters.musclePerfusion}
                        vo2Max={parameters.vo2Max}
                        lactate={parameters.lactate}
                        contractionRate={parameters.heartRate / 60}
                    />
                    <div>
                        <h4 className="text-red-400 font-bold mb-4 text-xl">Fisiologia Muscular</h4>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• Fibras Tipo I: Contração lenta, aeróbicas</li>
                            <li>• Fibras Tipo II: Contração rápida, anaeróbicas</li>
                            <li>• Densidade mitocondrial</li>
                            <li>• Limiar de lactato</li>
                            <li>• Capacidade VO₂ máximo</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>

            <DetailModal
                isOpen={selectedOrgan === 'neuron'}
                onClose={() => setSelectedOrgan(null)}
                title="ANÁLISE DETALHADA - REDE NEURONAL"
            >
                <div className="grid grid-cols-2 gap-6">
                    <NeuronNetwork
                        brainPerfusion={parameters.brainPerfusion}
                        glucose={parameters.glucose}
                        neurotransmitters={100 - parameters.stress}
                    />
                    <div>
                        <h4 className="text-blue-400 font-bold mb-4 text-xl">Funções Neurais</h4>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• Transmissão sináptica</li>
                            <li>• Liberação de neurotransmissores</li>
                            <li>• Propagação do potencial de ação</li>
                            <li>• Neuroplasticidade</li>
                            <li>• Perfusão cerebral crítica</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>
        </div>
    );
}
