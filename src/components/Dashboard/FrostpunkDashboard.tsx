/**
 * Frostpunk-Inspired Dashboard
 * Interface densa, clínica, sombria
 */

import React from 'react';
import { Activity, Zap, Droplets, Wind, AlertTriangle, TrendingUp, Microscope } from 'lucide-react';
import { useSimulationStore, selectors } from '../../game/simulationStore';
import { CellularWorkbench } from '../Cellular/CellularWorkbench';

export const FrostpunkDashboard: React.FC = () => {
    const physiology = useSimulationStore(state => state.physiology);
    const isAlive = useSimulationStore(selectors.isAlive);
    const causeOfDeath = useSimulationStore(selectors.causeOfDeath);
    const [isCellularViewOpen, setCellularViewOpen] = React.useState(false);

    if (!isAlive) {
        return <DeathScreen cause={causeOfDeath} />;
    }

    return (
        <div className="h-[100dvh] bg-app-bg text-text-primary overflow-hidden scan-lines">
            {/* Layout Grid Principal */}
            <div className="h-full grid-dense" style={{ gridTemplateRows: 'auto auto 1fr auto', gridTemplateColumns: '1fr' }}>

                {/* Event Timeline */}
                <EventTimeline />

                {/* Top Bar - Status Críticos */}
                <TopStatusBar
                    physiology={physiology}
                    isCellularViewOpen={isCellularViewOpen}
                    onToggleCellularView={() => setCellularViewOpen(open => !open)}
                />

                {isCellularViewOpen ? (
                    <CellularWorkbench onClose={() => setCellularViewOpen(false)} />
                ) : (
                    /* Main Content Grid */
                    <div className="grid-dense dashboard-main-grid min-h-0 overflow-auto">

                        {/* Left Sidebar - Vital Signs */}
                        <VitalSignsPanel physiology={physiology} />

                        {/* Center - Graphs & Energy Matrix */}
                        <CenterPanel physiology={physiology} />

                        {/* Right Sidebar - Hormonal Controls */}
                        <HormonalRack />

                    </div>
                )}

                {/* Bottom Bar - System Status */}
                <BottomStatusBar physiology={physiology} />

            </div>
        </div>
    );
};

// ============================================================================
// EVENT TIMELINE
// ============================================================================

const EventTimeline: React.FC = () => {
    const events = useSimulationStore(state => state.recentEvents);
    const warnings = useSimulationStore(state => state.activeWarnings);
    const timeElapsed = useSimulationStore(state => state.physiology.timeElapsed);

    // Pegar últimos 5 eventos (já estão na ordem correta, mais recentes primeiro)
    const recentEvents = events.slice(0, 5);
    const activeWarnings = warnings.slice(0, 3);

    return (
        <div className="panel h-16 px-4 py-2 border-b border-app-border flex items-center gap-4 overflow-hidden">

            {/* Time Indicator */}
            <div className="flex flex-col items-center justify-center px-3 border-r border-app-border">
                <span className="text-[9px] text-text-dim uppercase tracking-wider">TIMELINE</span>
                <span className="font-mono text-sm text-text-primary tabular-nums">
                    {formatTimeShort(timeElapsed)}
                </span>
            </div>

            {/* Active Warnings */}
            {activeWarnings.length > 0 && (
                <div className="flex items-center gap-2 px-3 border-r border-app-border">
                    <AlertTriangle className="w-3 h-3 text-status-warning animate-pulse" strokeWidth={1.5} />
                    <div className="flex flex-col">
                        <span className="text-[9px] text-text-dim uppercase">ACTIVE WARNINGS</span>
                        <span className="text-[10px] text-status-warning font-medium">
                            {activeWarnings[0].parameter}: {activeWarnings[0].currentValue.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Recent Events Scroll */}
            <div className="flex-1 flex items-center gap-3 overflow-x-auto scrollbar-thin">
                {recentEvents.length === 0 ? (
                    <span className="text-[10px] text-text-disabled italic">Sistema inicializado - Aguardando eventos...</span>
                ) : (
                    recentEvents.map((event: any, idx: number) => (
                        <EventCard key={`${event.timestamp}-${idx}`} event={event} />
                    ))
                )}
            </div>

        </div>
    );
};

interface EventCardProps {
    event: any;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'border-status-critical text-status-critical';
            case 'warning': return 'border-status-warning text-status-warning';
            default: return 'border-app-border text-text-secondary';
        }
    };

    return (
        <div className={`flex-shrink-0 border-l-2 pl-2 pr-3 py-1 ${getSeverityColor(event.severity)}`}>
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-text-dim font-mono tabular-nums">
                    +{formatTimeShort(event.timestamp)}
                </span>
                <span className="text-[10px] font-medium leading-tight">
                    {event.message}
                </span>
            </div>
            {event.effects && (
                <div className="text-[9px] text-text-dim mt-0.5">
                    {event.effects.slice(0, 2).join(' • ')}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// TOP STATUS BAR
// ============================================================================

interface TopStatusBarProps {
    physiology: any;
    isCellularViewOpen: boolean;
    onToggleCellularView: () => void;
}

const TopStatusBar: React.FC<TopStatusBarProps> = ({
    physiology,
    isCellularViewOpen,
    onToggleCellularView,
}) => {
    const energy = physiology.energy;
    const acidBase = physiology.acidBase;
    const nutrients = physiology.nutrients;

    return (
        <div className="panel h-12 flex items-center px-4 gap-6 border-b border-app-border overflow-x-auto">

            {/* ATP Pool */}
            <StatusMetric
                label="ATP"
                value={energy.atpPool}
                max={energy.maxATP}
                unit="mmol"
                color="data-atp"
                icon={<Zap className="w-3 h-3" strokeWidth={1.5} />}
            />

            {/* PCr Store */}
            <StatusMetric
                label="PCr"
                value={energy.pCrStore}
                max={energy.maxPCr}
                unit="mmol"
                color="data-atp"
                icon={<Zap className="w-3 h-3" strokeWidth={1.5} />}
            />

            {/* Blood Glucose */}
            <StatusMetric
                label="GLUCOSE"
                value={nutrients.bloodGlucose}
                max={120}
                unit="mg/dL"
                color="data-glucose"
                icon={<Droplets className="w-3 h-3" strokeWidth={1.5} />}
            />

            {/* pH Blood */}
            <div className="flex flex-none items-center gap-2">
                <div className="text-text-dim text-[10px] uppercase tracking-wider">pH</div>
                <div className="font-mono text-lg tabular-nums">{acidBase.pH.toFixed(2)}</div>
                <div className={`text-[10px] ${getPhStatus(acidBase.pH)}`}>
                    {acidBase.state.toUpperCase()}
                </div>
                {(acidBase.pH < 7.35 || acidBase.pH > 7.45) && (
                    <AlertTriangle className="w-3 h-3 text-status-critical animate-pulse-glow" strokeWidth={1.5} />
                )}
            </div>

            <button
                type="button"
                className={`ml-auto min-h-10 flex-none px-3 inline-flex items-center gap-2 ${isCellularViewOpen ? 'btn-wire-active' : 'btn-wire'}`}
                onClick={onToggleCellularView}
                aria-pressed={isCellularViewOpen}
                aria-controls="cellular-workbench"
                title={isCellularViewOpen ? 'Voltar ao painel sistêmico' : 'Abrir microscopia celular'}
            >
                <Microscope className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="hidden sm:inline">MICROVISTA</span>
            </button>

            {/* Time Elapsed */}
            <div className="text-xs text-text-secondary font-mono whitespace-nowrap">
                T+{formatTime(physiology.timeElapsed)}
            </div>

        </div>
    );
};

const DATA_COLOR_CLASSES = {
    'data-atp': { text: 'text-data-atp', background: 'bg-data-atp' },
    'data-o2': { text: 'text-data-o2', background: 'bg-data-o2' },
    'data-co2': { text: 'text-data-co2', background: 'bg-data-co2' },
    'data-ph': { text: 'text-data-ph', background: 'bg-data-ph' },
    'data-lactate': { text: 'text-data-lactate', background: 'bg-data-lactate' },
    'data-glucose': { text: 'text-data-glucose', background: 'bg-data-glucose' },
} as const;

type DataColor = keyof typeof DATA_COLOR_CLASSES;

interface StatusMetricProps {
    label: string;
    value: number;
    max: number;
    unit: string;
    color: DataColor;
    icon: React.ReactNode;
}

const StatusMetric: React.FC<StatusMetricProps> = ({ label, value, max, unit, color, icon }) => {
    const percentage = (value / max) * 100;
    const isCritical = percentage < 20;
    const colorClasses = DATA_COLOR_CLASSES[color];

    return (
        <div className="flex flex-none items-center gap-2">
            <div className={colorClasses.text}>{icon}</div>
            <div className="flex flex-col">
                <div className="text-[10px] text-text-dim uppercase tracking-wider leading-none">{label}</div>
                <div className="flex items-baseline gap-1">
                    <span className={`font-mono text-sm tabular-nums ${isCritical ? 'text-status-critical' : 'text-text-primary'}`}>
                        {value.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-text-dim font-mono">/{max}</span>
                    <span className="text-[10px] text-text-dim">{unit}</span>
                </div>
            </div>
            <div className="w-16 bar-thin">
                <div
                    className={`bar-fill ${isCritical ? 'bg-status-critical' : colorClasses.background}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                />
            </div>
        </div>
    );
};

// ============================================================================
// VITAL SIGNS PANEL (LEFT)
// ============================================================================

const VitalSignsPanel: React.FC<{ physiology: any }> = ({ physiology }) => {
    const cardio = physiology.cardiovascular;
    const resp = physiology.respiratory;

    return (
        <div className="flex flex-col gap-px">

            {/* Heart Rate */}
            <VitalMetricLarge
                label="HEART RATE"
                value={cardio.heartRate}
                unit="bpm"
                range={[60, 100]}
                icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
                color="data-o2"
            />

            {/* Blood Pressure */}
            <VitalMetricLarge
                label="BLOOD PRESSURE"
                value={`${cardio.systolicBP.toFixed(0)}/${cardio.diastolicBP.toFixed(0)}`}
                unit="mmHg"
                range={[90, 140]}
                icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
                color="data-o2"
                numericValue={cardio.systolicBP}
            />

            {/* SpO2 */}
            <VitalMetricLarge
                label="OXYGEN SAT"
                value={resp.spo2}
                unit="%"
                range={[95, 100]}
                icon={<Wind className="w-4 h-4" strokeWidth={1.5} />}
                color="data-co2"
            />

            {/* Respiratory Rate */}
            <VitalMetricLarge
                label="RESP RATE"
                value={resp.respiratoryRate}
                unit="rpm"
                range={[12, 20]}
                icon={<Wind className="w-4 h-4" strokeWidth={1.5} />}
                color="data-co2"
            />

            {/* Lactate */}
            <VitalMetricLarge
                label="LACTATE"
                value={physiology.energy.lactateLevel}
                unit="mmol/L"
                range={[0.5, 2.0]}
                icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.5} />}
                color="data-lactate"
            />

        </div>
    );
};

interface VitalMetricLargeProps {
    label: string;
    value: number | string;
    unit: string;
    range: [number, number];
    icon: React.ReactNode;
    color: DataColor;
    numericValue?: number;
}

const VitalMetricLarge: React.FC<VitalMetricLargeProps> = ({
    label,
    value,
    unit,
    range,
    icon,
    color,
    numericValue
}) => {
    const numVal = numericValue ?? (typeof value === 'number' ? value : parseFloat(value as string));
    const isOutOfRange = numVal < range[0] || numVal > range[1];
    const isCritical = numVal < range[0] * 0.8 || numVal > range[1] * 1.2;
    const colorClasses = DATA_COLOR_CLASSES[color];

    return (
        <div className="panel p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={colorClasses.text}>{icon}</div>
                    <span className="metric-label">{label}</span>
                </div>
                {isOutOfRange && (
                    <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-status-critical' : 'bg-status-warning'} animate-pulse-glow`} />
                )}
            </div>

            <div className="flex items-baseline gap-1">
                <span className={`font-mono text-3xl tabular-nums leading-none ${isCritical ? 'text-status-critical' :
                    isOutOfRange ? 'text-status-warning' :
                        'text-text-primary'
                    }`}>
                    {typeof value === 'number' ? value.toFixed(0) : value}
                </span>
                <span className="metric-unit">{unit}</span>
            </div>

            <div className="text-[9px] text-text-dim font-mono">
                NORMAL: {range[0]}-{range[1]} {unit}
            </div>
        </div>
    );
};

// ============================================================================
// CENTER PANEL
// ============================================================================

const CenterPanel: React.FC<{ physiology: any }> = ({ physiology }) => {
    return (
        <div className="flex flex-col gap-px">

            {/* Energy Matrix (Top) */}
            <div className="panel p-4" style={{ height: '200px' }}>
                <div className="metric-label mb-3">ENERGY PRODUCTION MATRIX</div>
                <EnergyMatrix energy={physiology.energy} />
            </div>

            {/* Waveform Display (Middle) */}
            <div className="panel p-4 flex-1">
                <div className="metric-label mb-2">REAL-TIME MONITORING</div>
                <div className="grid grid-cols-1 gap-2 h-full">
                    <WaveformPlaceholder label="ECG" color="data-o2" />
                    <WaveformPlaceholder label="SpO₂ PLETH" color="data-co2" />
                </div>
            </div>

            {/* Metabolic Status (Bottom) */}
            <div className="panel p-4" style={{ height: '120px' }}>
                <div className="metric-label mb-2">METABOLIC STATUS</div>
                <MetabolicGrid physiology={physiology} />
            </div>

        </div>
    );
};

const EnergyMatrix: React.FC<{ energy: any }> = ({ energy }) => {
    return (
        <div className="space-y-3">
            <EnergySystemBar
                label="PHOSPHAGEN SYSTEM"
                current={energy.pCrStore}
                max={energy.maxPCr}
                color="data-atp"
                info="Immediate (0-10s)"
            />
            <EnergySystemBar
                label="GLYCOLYTIC SYSTEM"
                current={energy.glycolyticRate * 10}
                max={100}
                color="data-lactate"
                info={`Anaerobic | Lactate: ${energy.lactateLevel.toFixed(1)} mmol/L`}
            />
            <EnergySystemBar
                label="OXIDATIVE SYSTEM"
                current={energy.aerobicContribution}
                max={100}
                color="data-glucose"
                info={`Aerobic | VO₂: ${energy.vo2Current.toFixed(1)} mL/kg/min`}
            />
        </div>
    );
};

interface EnergySystemBarProps {
    label: string;
    current: number;
    max: number;
    color: DataColor;
    info: string;
}

const EnergySystemBar: React.FC<EnergySystemBarProps> = ({ label, current, max, color, info }) => {
    const percentage = (current / max) * 100;
    const colorClasses = DATA_COLOR_CLASSES[color];

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</span>
                <span className="text-[10px] text-text-dim">{info}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-app-border">
                    <div
                        className={`h-full ${colorClasses.background} transition-all duration-300`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                </div>
                <span className="font-mono text-xs text-text-primary tabular-nums w-12 text-right">
                    {percentage.toFixed(0)}%
                </span>
            </div>
        </div>
    );
};

const WaveformPlaceholder: React.FC<{ label: string; color: DataColor }> = ({ label, color }) => {
    const colorClasses = DATA_COLOR_CLASSES[color];
    return (
        <div className="border border-app-border p-2 relative flex-1">
            <div className="absolute top-2 left-2 text-[9px] text-text-dim uppercase tracking-wider">{label}</div>
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full">
                    <defs>
                        <pattern id="grid-small" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-small)" />
                </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[10px] ${colorClasses.text} opacity-30`}>[WAVEFORM DATA]</span>
            </div>
        </div>
    );
};

const MetabolicGrid: React.FC<{ physiology: any }> = ({ physiology }) => {
    const nutrients = physiology.nutrients;
    const acidBase = physiology.acidBase;

    return (
        <div className="grid grid-cols-4 gap-2">
            <MicroMetric label="GLUCOSE" value={nutrients.bloodGlucose} unit="mg/dL" />
            <MicroMetric label="pH" value={acidBase.pH} unit="" decimals={2} />
            <MicroMetric label="HCO₃⁻" value={acidBase.bicarbonate} unit="mmol/L" />
            <MicroMetric label="PCO₂" value={acidBase.pco2} unit="mmHg" />
        </div>
    );
};

interface MicroMetricProps {
    label: string;
    value: number;
    unit: string;
    decimals?: number;
}

const MicroMetric: React.FC<MicroMetricProps> = ({ label, value, unit, decimals = 1 }) => {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] text-text-dim uppercase tracking-wider mb-0.5">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className="font-mono text-lg text-text-primary tabular-nums leading-none">
                    {value.toFixed(decimals)}
                </span>
                <span className="text-[9px] text-text-dim">{unit}</span>
            </div>
        </div>
    );
};

// ============================================================================
// HORMONAL RACK (RIGHT SIDEBAR)
// ============================================================================

const HormonalRack: React.FC = () => {
    const releaseHormone = useSimulationStore(state => state.releaseHormone);
    const cooldowns = useSimulationStore(state => state.hormonalCooldowns);
    const physiology = useSimulationStore(state => state.physiology);

    const hormones: Array<{
        id: keyof typeof physiology.hormones;
        name: string;
        amount: number;
        cooldown: number;
        category: string;
    }> = [
        { id: 'insulin', name: 'INSULIN', amount: 20, cooldown: 120, category: 'ANABOLIC' },
        { id: 'glucagon', name: 'GLUCAGON', amount: 100, cooldown: 180, category: 'CATABOLIC' },
        { id: 'adrenaline', name: 'ADRENALINE', amount: 200, cooldown: 300, category: 'EMERGENCY' },
        { id: 'cortisol', name: 'CORTISOL', amount: 30, cooldown: 600, category: 'STRESS' },
        { id: 'gh', name: 'GROWTH H.', amount: 5, cooldown: 3600, category: 'GROWTH' },
    ];

    return (
        <div className="panel p-3 flex flex-col gap-2">
            <div className="metric-label mb-1">HORMONAL CONTROL</div>

            <div className="text-[9px] text-text-dim mb-3 leading-relaxed">
                Endocrine system interface. Release hormones to modulate metabolic state.
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
                {hormones.map(hormone => {
                    const onCooldown = cooldowns.has(hormone.id);
                    const remaining = cooldowns.get(hormone.id) || 0;

                    return (
                        <HormonalButton
                            key={hormone.id}
                            label={hormone.name}
                            category={hormone.category}
                            onCooldown={onCooldown}
                            cooldownRemaining={remaining}
                            cooldownTotal={hormone.cooldown}
                            onClick={() => releaseHormone(hormone.id, hormone.amount)}
                        />
                    );
                })}
            </div>

            {/* Hormonal Levels Display */}
            <div className="border-t border-app-border pt-3 mt-2">
                <div className="text-[9px] text-text-dim uppercase tracking-wider mb-2">CURRENT LEVELS</div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <HormoneLevel label="Insulin" value={physiology.hormones.insulin} unit="μIU/mL" />
                    <HormoneLevel label="Glucagon" value={physiology.hormones.glucagon} unit="pg/mL" />
                    <HormoneLevel label="Adrenaline" value={physiology.hormones.adrenaline} unit="pg/mL" />
                    <HormoneLevel label="Cortisol" value={physiology.hormones.cortisol} unit="μg/dL" />
                </div>
            </div>
        </div>
    );
};

interface HormonalButtonProps {
    label: string;
    category: string;
    onCooldown: boolean;
    cooldownRemaining: number;
    cooldownTotal: number;
    onClick: () => void;
}

const HormonalButton: React.FC<HormonalButtonProps> = ({
    label,
    category,
    onCooldown,
    cooldownRemaining,
    cooldownTotal,
    onClick
}) => {
    return (
        <button
            onClick={onClick}
            disabled={onCooldown}
            className={`w-full text-left p-2 border transition-all duration-150 ${onCooldown
                ? 'border-app-border bg-app-surface text-text-disabled cursor-not-allowed'
                : 'btn-wire hover:border-data-atp'
                }`}
        >
            <div className="flex items-start justify-between mb-1">
                <span className="text-[11px] font-medium tracking-wider">{label}</span>
                <span className="text-[9px] text-text-dim">{category}</span>
            </div>
            {onCooldown ? (
                <div className="flex items-center gap-2">
                    <div className="flex-1 bar-thin">
                        <div
                            className="bar-fill bg-text-dim"
                            style={{ width: `${Math.min(100, (cooldownRemaining / cooldownTotal) * 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-mono text-text-dim tabular-nums">
                        {cooldownRemaining.toFixed(0)}s
                    </span>
                </div>
            ) : (
                <div className="text-[9px] text-data-atp">► READY</div>
            )}
        </button>
    );
};

const HormoneLevel: React.FC<{ label: string; value: number; unit: string }> = ({ label, value, unit }) => {
    return (
        <div className="flex justify-between items-baseline">
            <span className="text-text-dim">{label}</span>
            <span className="font-mono text-text-primary tabular-nums">{value.toFixed(1)} <span className="text-text-dim">{unit}</span></span>
        </div>
    );
};

// ============================================================================
// BOTTOM STATUS BAR
// ============================================================================

const BottomStatusBar: React.FC<{ physiology: any }> = ({ physiology }) => {
    const allostaticLoad = physiology.allostaticLoad;

    return (
        <div className="panel h-10 flex items-center px-4 gap-4 border-t border-app-border overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2">
                <span className="metric-label">ALLOSTATIC LOAD</span>
                <div className="w-32 bar-thin">
                    <div
                        className={`bar-fill ${allostaticLoad.currentLoad > 70 ? 'bg-status-critical' :
                            allostaticLoad.currentLoad > 40 ? 'bg-status-warning' :
                                'bg-status-normal'
                            }`}
                        style={{ width: `${allostaticLoad.currentLoad}%` }}
                    />
                </div>
                <span className="font-mono text-xs text-text-primary tabular-nums">
                    {allostaticLoad.currentLoad.toFixed(0)}%
                </span>
            </div>

            <div className="h-4 w-px bg-app-border" />

            <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">METABOLIC</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.metabolicStress.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">OXIDATIVE</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.oxidativeStress.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">INFLAMMATION</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.inflammationLevel.toFixed(0)}</span>
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-text-dim">SYSTEM STATUS:</span>
                <span className={`text-[10px] font-medium ${physiology.isAlive ? 'text-status-normal' : 'text-status-critical'
                    }`}>
                    {physiology.isAlive ? 'OPERATIONAL' : 'CRITICAL FAILURE'}
                </span>
            </div>
        </div>
    );
};

// ============================================================================
// DEATH SCREEN
// ============================================================================

const DeathScreen: React.FC<{ cause?: string }> = ({ cause }) => {
    const reset = useSimulationStore(state => state.reset);

    return (
        <div className="h-screen bg-app-bg flex items-center justify-center scan-lines">
            <div className="panel-elevated p-8 max-w-md text-center space-y-6">
                <AlertTriangle className="w-16 h-16 text-status-critical mx-auto animate-pulse-glow" strokeWidth={1} />

                <div>
                    <h1 className="text-2xl font-medium text-text-primary mb-2 tracking-wide">
                        SYSTEM FAILURE
                    </h1>
                    <p className="text-sm text-text-dim leading-relaxed">
                        {cause || 'Multiple organ failure detected'}
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        onClick={reset}
                        className="btn-wire px-6 py-3"
                    >
                        REINITIALIZE SYSTEM
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeShort(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPhStatus(pH: number): string {
    if (pH < 7.35) return 'text-status-critical';
    if (pH > 7.45) return 'text-status-warning';
    return 'text-status-normal';
}
