// AdvancedDashboard: Enhanced medical HUD with detailed visualizations

import { useState } from 'react';
import { useSimulationStore } from '../game/simulationStore';
import { useInterval } from '../game/useInterval';
import { ACTIONS } from '../game/actions';
import { Heart } from '../components/HUD/Heart';
import { Circulation } from '../components/HUD/Circulation';
import { Lungs } from '../components/HUD/Lungs';
import { BodySilhouette } from '../components/HUD/BodySilhouette';
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

type TabType = 'overview' | 'organs' | 'molecular' | 'charts';

export function AdvancedDashboard() {
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

    // Simulation loop
    useInterval(() => {
        if (isRunning) {
            tick();
        }
    }, 200);

    const getCooldownTime = (actionId: string): number => {
        const cooldown = actionCooldowns.find((cd: any) => cd.actionId === actionId);
        return cooldown?.remainingTime || 0;
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
                        { id: 'overview', label: '📊 Visão Geral', icon: '📊' },
                        { id: 'organs', label: '🫀 Órgãos', icon: '🫀' },
                        { id: 'molecular', label: '🧬 Molecular', icon: '🧬' },
                        { id: 'charts', label: '📈 Gráficos', icon: '📈' },
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
            <main className="p-6 space-y-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        {/* Vitals Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            <ParameterCard
                                title="HEART RATE"
                                value={parameters.heartRate}
                                unit="BPM"
                                color="text-red-500"
                                icon="❤️"
                                warning={parameters.heartRate > 120 || parameters.heartRate < 50}
                            />
                            <ParameterCard
                                title="BLOOD GLUCOSE"
                                value={parameters.glucose}
                                unit="mg/dL"
                                color="text-yellow-400"
                                icon="🍬"
                                warning={parameters.glucose < 70 || parameters.glucose > 180}
                            />
                            <ParameterCard
                                title="LACTATE"
                                value={parameters.lactate.toFixed(1)}
                                unit="mmol/L"
                                color="text-orange-400"
                                warning={parameters.lactate > 2.5}
                            />
                            <ParameterCard
                                title="VO₂ MAX"
                                value={parameters.vo2Max.toFixed(0)}
                                unit="mL/kg/min"
                                color="text-cyan-400"
                            />
                            <ParameterCard
                                title="CORE TEMP"
                                value={parameters.temperature.toFixed(1)}
                                unit="°C"
                                color="text-orange-400"
                                icon="🌡️"
                                warning={parameters.temperature > 38}
                            />
                            <ParameterCard
                                title="OSMOLARITY"
                                value={parameters.osmolarity.toFixed(0)}
                                unit="mOsm/L"
                                color="text-blue-400"
                                warning={parameters.osmolarity > 300 || parameters.osmolarity < 280}
                            />
                        </div>

                        {/* Second Row - Hormones & Electrolytes */}
                        <div className="grid grid-cols-6 gap-3 mb-4">
                            <ParameterCard
                                title="CORTISOL"
                                value={parameters.cortisol.toFixed(0)}
                                unit="mcg/dL"
                                color="text-purple-400"
                                icon="😰"
                                warning={parameters.cortisol > 60}
                            />
                            <ParameterCard
                                title="INSULIN"
                                value={parameters.insulin.toFixed(0)}
                                unit="μIU/mL"
                                color="text-blue-300"
                            />
                            <ParameterCard
                                title="SODIUM"
                                value={parameters.sodium.toFixed(0)}
                                unit="mmol/L"
                                color="text-yellow-300"
                                warning={parameters.sodium > 145 || parameters.sodium < 135}
                            />
                            <ParameterCard
                                title="POTASSIUM"
                                value={parameters.potassium.toFixed(1)}
                                unit="mmol/L"
                                color="text-orange-300"
                                warning={parameters.potassium > 5.0 || parameters.potassium < 3.5}
                            />
                            <ParameterCard
                                title="CALCIUM"
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

                        {/* Main Grid - Body Visualization + Charts */}
                        <div className="grid grid-cols-12 gap-4 mb-4">
                            {/* Left Panel - Tissue Details */}
                            <div className="col-span-3 space-y-3">
                                <div
                                    className="cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setSelectedOrgan('liver')}
                                >
                                    <LiverTissue
                                        perfusion={parameters.organsPerfusion}
                                        glucose={parameters.glucose}
                                        detoxification={100 - parameters.stress}
                                    />
                                </div>

                                <div
                                    className="cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setSelectedOrgan('kidney')}
                                >
                                    <KidneyNephrons
                                        perfusion={parameters.organsPerfusion}
                                        osmolarity={parameters.osmolarity}
                                        filtrationRate={parameters.organsPerfusion}
                                    />
                                </div>
                            </div>

                            {/* Center Panel - Main Body */}
                            <div className="col-span-6">
                                <div className="bg-gray-900 border-2 border-cyan-500 rounded-xl p-4 shadow-2xl">
                                    <div className="grid grid-cols-3 gap-4 h-[500px]">
                                        <div className="flex items-center justify-center">
                                            <Heart
                                                heartRate={parameters.heartRate}
                                                perfusion={parameters.heartPerfusion}
                                            />
                                        </div>

                                        <div className="flex items-center justify-center">
                                            <BodySilhouette
                                                brainPerfusion={parameters.brainPerfusion}
                                                heartPerfusion={parameters.heartPerfusion}
                                                musclePerfusion={parameters.musclePerfusion}
                                                organsPerfusion={parameters.organsPerfusion}
                                            />
                                        </div>

                                        <div className="flex items-center justify-center">
                                            <Lungs
                                                respiratoryRate={parameters.respiratoryRate}
                                                bloodOxygen={parameters.bloodOxygen}
                                                tidalVolume={parameters.tidalVolume}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 h-[150px]">
                                        <Circulation
                                            cardiacOutput={parameters.cardiacOutput}
                                            bloodOxygen={parameters.bloodOxygen}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel - Cellular Details */}
                            <div className="col-span-3 space-y-3">
                                <div
                                    className="cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setSelectedOrgan('muscle')}
                                >
                                    <MuscleFibers
                                        perfusion={parameters.musclePerfusion}
                                        vo2Max={parameters.vo2Max}
                                        lactate={parameters.lactate}
                                        contractionRate={parameters.heartRate / 60}
                                    />
                                </div>

                                <div
                                    className="cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setSelectedOrgan('neuron')}
                                >
                                    <NeuronNetwork
                                        brainPerfusion={parameters.brainPerfusion}
                                        glucose={parameters.glucose}
                                        neurotransmitters={100 - parameters.stress}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <RealTimeChart
                                title="Heart Rate"
                                currentValue={parameters.heartRate}
                                unit="BPM"
                                color="#EF4444"
                                min={40}
                                max={180}
                            />
                            <RealTimeChart
                                title="Blood Oxygen"
                                currentValue={parameters.bloodOxygen}
                                unit="%"
                                color="#06B6D4"
                                min={70}
                                max={100}
                            />
                            <RealTimeChart
                                title="Blood Glucose"
                                currentValue={parameters.glucose}
                                unit="mg/dL"
                                color="#FBBF24"
                                min={40}
                                max={200}
                            />
                        </div>

                        {/* Molecular Pathways */}
                        <div className="mb-4">
                            <MolecularPathways
                                nrf2={parameters.nrf2}
                                mtor={parameters.mtor}
                                ampk={parameters.ampk}
                                nfkb={parameters.nfkb}
                            />
                        </div>

                        {/* Actions Panel */}
                        <div className="bg-gray-900 border-2 border-purple-500 rounded-xl p-4">
                            <h2 className="text-xl font-bold text-purple-400 mb-3">
                                🧠 NEURAL COMMAND CENTER
                            </h2>
                            <div className="grid grid-cols-6 gap-3">
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
                            <div className="mt-4 bg-gray-900 border-2 border-yellow-500 rounded-xl p-4">
                                <h3 className="text-lg font-bold text-yellow-400 mb-2">
                                    ⚠️ ACTIVE PHYSIOLOGICAL EVENTS
                                </h3>
                                <div className="space-y-2">
                                    {activeEvents.map((ae: any, i: number) => (
                                        <div
                                            key={i}
                                            className="text-sm text-gray-300 flex justify-between bg-gray-800 p-2 rounded"
                                        >
                                            <span>
                                                {ae.event.title} - {ae.event.description}
                                            </span>
                                            <span className="text-yellow-400 font-mono">
                                                {Math.ceil(ae.remainingTime)}s
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>

                {/* Notifications */}
                <div className="fixed top-20 right-6 space-y-3 z-50">
                    {notifications.slice(-3).map((notification: string, index: number) => (
                        <EventPopup
                            key={index}
                            title="📢 SYSTEM ALERT"
                            description={notification}
                            onClose={() => clearNotification(index)}
                        />
                    ))}
                </div>

                {/* Detail Modals */}
                <DetailModal
                    isOpen={selectedOrgan === 'liver'}
                    onClose={() => setSelectedOrgan(null)}
                    title="LIVER TISSUE - DETAILED ANALYSIS"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <LiverTissue
                            perfusion={parameters.organsPerfusion}
                            glucose={parameters.glucose}
                            detoxification={100 - parameters.stress}
                        />
                        <div>
                            <h4 className="text-cyan-400 font-bold mb-2">HEPATIC FUNCTIONS</h4>
                            <ul className="text-sm text-gray-300 space-y-2">
                                <li>• Glucose metabolism & storage</li>
                                <li>• Protein synthesis</li>
                                <li>• Detoxification of toxins</li>
                                <li>• Bile production</li>
                                <li>• Vitamin storage</li>
                            </ul>
                            <div className="mt-4">
                                <ParameterCard
                                    title="Liver Perfusion"
                                    value={parameters.organsPerfusion}
                                    unit="%"
                                    color="text-orange-400"
                                />
                            </div>
                        </div>
                    </div>
                </DetailModal>

                <DetailModal
                    isOpen={selectedOrgan === 'kidney'}
                    onClose={() => setSelectedOrgan(null)}
                    title="KIDNEY NEPHRONS - DETAILED ANALYSIS"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <KidneyNephrons
                            perfusion={parameters.organsPerfusion}
                            osmolarity={parameters.osmolarity}
                            filtrationRate={parameters.organsPerfusion}
                        />
                        <div>
                            <h4 className="text-purple-400 font-bold mb-2">RENAL FUNCTIONS</h4>
                            <ul className="text-sm text-gray-300 space-y-2">
                                <li>• Blood filtration (GFR)</li>
                                <li>• Electrolyte balance</li>
                                <li>• Osmolarity regulation</li>
                                <li>• Acid-base balance</li>
                                <li>• Blood pressure control</li>
                            </ul>
                        </div>
                    </div>
                </DetailModal>

                <DetailModal
                    isOpen={selectedOrgan === 'muscle'}
                    onClose={() => setSelectedOrgan(null)}
                    title="SKELETAL MUSCLE FIBERS - DETAILED ANALYSIS"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <MuscleFibers
                            perfusion={parameters.musclePerfusion}
                            vo2Max={parameters.vo2Max}
                            lactate={parameters.lactate}
                            contractionRate={parameters.heartRate / 60}
                        />
                        <div>
                            <h4 className="text-red-400 font-bold mb-2">MUSCLE PHYSIOLOGY</h4>
                            <ul className="text-sm text-gray-300 space-y-2">
                                <li>• Type I fibers: Slow twitch, aerobic</li>
                                <li>• Type II fibers: Fast twitch, anaerobic</li>
                                <li>• Mitochondrial density</li>
                                <li>• Lactate threshold</li>
                                <li>• VO₂ max capacity</li>
                            </ul>
                        </div>
                    </div>
                </DetailModal>

                <DetailModal
                    isOpen={selectedOrgan === 'neuron'}
                    onClose={() => setSelectedOrgan(null)}
                    title="NEURONAL NETWORK - DETAILED ANALYSIS"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <NeuronNetwork
                            brainPerfusion={parameters.brainPerfusion}
                            glucose={parameters.glucose}
                            neurotransmitters={100 - parameters.stress}
                        />
                        <div>
                            <h4 className="text-blue-400 font-bold mb-2">NEURAL FUNCTIONS</h4>
                            <ul className="text-sm text-gray-300 space-y-2">
                                <li>• Synaptic transmission</li>
                                <li>• Neurotransmitter release</li>
                                <li>• Action potential propagation</li>
                                <li>• Neuroplasticity</li>
                                <li>• Brain perfusion critical</li>
                            </ul>
                        </div>
                    </div>
                </DetailModal>
        </div>
    );
}
