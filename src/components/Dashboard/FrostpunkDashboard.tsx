/**
 * Frostpunk-Inspired Dashboard
 * Interface densa, clínica, sombria
 */

import React from 'react';
import { Zap, Droplets, Wind, AlertTriangle, TrendingUp, Microscope } from 'lucide-react';
import { useSimulationStore, selectors } from '../../game/simulationStore';
import { CellularWorkbench } from '../Cellular/CellularWorkbench';
import { HeartBpmCard } from './HeartBpmCard';
import { ClinicalEcgMonitor } from './ClinicalEcgMonitor';

export const FrostpunkDashboard: React.FC = () => {
    const physiology = useSimulationStore(state => state.physiology);
    const history = useSimulationStore(state => state.history);
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
                        <CenterPanel physiology={physiology} history={history} />

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
                <span className="text-[9px] text-text-dim uppercase tracking-wider">LINHA DO TEMPO</span>
                <span className="font-mono text-sm text-text-primary tabular-nums">
                    {formatTimeShort(timeElapsed)}
                </span>
            </div>

            {/* Active Warnings */}
            {activeWarnings.length > 0 && (
                <div className="flex items-center gap-2 px-3 border-r border-app-border">
                    <AlertTriangle className="w-3 h-3 text-status-warning animate-pulse" strokeWidth={1.5} />
                    <div className="flex flex-col">
                        <span className="text-[9px] text-text-dim uppercase">ALERTAS ATIVOS</span>
                        <span className="text-[10px] text-status-warning font-medium">
                            {activeWarnings[0].parameter}: {activeWarnings[0].currentValue.toFixed(1)}
                        </span>
                        <span className="max-w-56 truncate text-[9px] text-text-dim">
                            {activeWarnings[0].recommendation}
                        </span>
                    </div>
                    {activeWarnings.length > 1 && (
                        <span className="ml-1 rounded-none border border-status-warning/30 px-1.5 py-0.5 font-mono text-[9px] text-status-warning">
                            +{activeWarnings.length - 1}
                        </span>
                    )}
                </div>
            )}

            {/* Recent Events Scroll */}
            <div className="flex-1 flex items-center gap-3 overflow-x-auto scrollbar-thin">
                {recentEvents.length === 0 ? (
                    <span className="text-[10px] text-text-disabled italic">Sistema inicializado - aguardando decisões...</span>
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
                label="ADENOSINA TRIFOSFATO (ATP)"
                value={energy.atpPool}
                max={energy.maxATP}
                unit="mmol"
                color="data-atp"
                icon={<Zap className="w-3 h-3" strokeWidth={1.5} />}
            />

            {/* PCr Store */}
            <StatusMetric
                label="FOSFOCREATINA (PCr)"
                value={energy.pCrStore}
                max={energy.maxPCr}
                unit="mmol"
                color="data-atp"
                icon={<Zap className="w-3 h-3" strokeWidth={1.5} />}
            />

            {/* Blood Glucose */}
            <StatusMetric
                label="GLICOSE"
                value={nutrients.bloodGlucose}
                max={120}
                unit="mg/dL"
                color="data-glucose"
                icon={<Droplets className="w-3 h-3" strokeWidth={1.5} />}
            />

            {/* pH Blood */}
            <div className="flex flex-none items-center gap-2">
                <div className="text-text-dim text-[10px] uppercase tracking-wider">pH SANGUÍNEO</div>
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
                <span className="hidden sm:inline">MICROSCOPIA CELULAR</span>
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
            <HeartBpmCard bpm={cardio.heartRate} />

            {/* Blood Pressure */}
            <VitalMetricLarge
                label="PRESSÃO ARTERIAL"
                value={`${cardio.systolicBP.toFixed(0)}/${cardio.diastolicBP.toFixed(0)}`}
                unit="mmHg"
                range={[90, 140]}
                icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
                color="data-o2"
                numericValue={cardio.systolicBP}
            />

            {/* SpO2 */}
            <VitalMetricLarge
                label="SATURAÇÃO O₂"
                value={resp.spo2}
                unit="%"
                range={[95, 100]}
                icon={<Wind className="w-4 h-4" strokeWidth={1.5} />}
                color="data-co2"
            />

            {/* Respiratory Rate */}
            <VitalMetricLarge
                label="FREQUÊNCIA RESPIRATÓRIA"
                value={resp.respiratoryRate}
                unit="rpm"
                range={[12, 20]}
                icon={<Wind className="w-4 h-4" strokeWidth={1.5} />}
                color="data-co2"
            />

            {/* Lactate */}
            <VitalMetricLarge
                label="LACTATO"
                value={physiology.energy.lactateLevel}
                unit="mmol/L"
                range={[0.5, 2.0]}
                icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.5} />}
                color="data-lactate"
            />

            <div className="panel p-3">
                <div className="metric-label mb-2">HEMODINÂMICA E TROCA GASOSA</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <MicroMetric label="Pressão arterial média" value={cardio.meanArterialPressure} unit="mmHg" />
                    <MicroMetric label="Débito cardíaco" value={cardio.cardiacOutput} unit="L/min" />
                    <MicroMetric label="Volume sistólico" value={cardio.strokeVolume} unit="mL" />
                    <MicroMetric label="Fração de ejeção" value={cardio.ejectionFraction} unit="%" />
                    <MicroMetric label="Variabilidade cardíaca" value={cardio.heartRateVariability} unit="ms" />
                    <MicroMetric label="Índice de perfusão" value={cardio.perfusionIndex} unit="%" />
                    <MicroMetric label="Pressão arterial de oxigênio" value={resp.pao2} unit="mmHg" />
                    <MicroMetric label="Pressão arterial de dióxido de carbono" value={resp.paco2} unit="mmHg" />
                    <MicroMetric label="Volume corrente" value={resp.tidalVolume} unit="mL" />
                    <MicroMetric label="Ventilação por minuto" value={resp.minuteVentilation} unit="L/min" />
                </div>
            </div>

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
    const stateClasses = isCritical
        ? {
            shell: 'border-status-critical/60 bg-status-critical/10 shadow-[0_0_0_1px_rgba(220,38,38,0.24),0_0_30px_rgba(220,38,38,0.12)]',
            value: 'text-status-critical animate-heartbeat',
            chip: 'bg-status-critical/15 text-status-critical',
            bar: 'bg-status-critical',
            note: 'CRITICAL',
        }
        : isOutOfRange
            ? {
                shell: 'border-status-warning/60 bg-status-warning/10 shadow-[0_0_0_1px_rgba(249,115,22,0.18),0_0_20px_rgba(249,115,22,0.08)]',
                value: 'text-status-warning',
                chip: 'bg-status-warning/15 text-status-warning',
                bar: 'bg-status-warning',
                note: 'WARNING',
            }
            : {
                shell: 'border-app-border bg-app-surface/90',
                value: 'text-text-primary',
                chip: 'bg-status-normal/15 text-status-normal',
                bar: 'bg-status-normal',
                note: 'NORMAL',
            };

    return (
        <div className={`panel p-3 flex flex-col gap-2 relative overflow-hidden ${stateClasses.shell}`}>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_45%)]" />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={colorClasses.text}>{icon}</div>
                    <span className="metric-label">{label}</span>
                </div>
                <div className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] font-medium ${stateClasses.chip}`}>
                    {stateClasses.note}
                </div>
            </div>

            <div className="flex items-baseline gap-1">
                <span className={`font-mono text-3xl tabular-nums leading-none ${stateClasses.value}`}>
                    {typeof value === 'number' ? value.toFixed(0) : value}
                </span>
                <span className="metric-unit">{unit}</span>
            </div>

            <div className="text-[9px] text-text-dim font-mono">
                NORMAL: {range[0]}-{range[1]} {unit}
            </div>

            <div className="bar-thin">
                <div
                    className={`bar-fill ${stateClasses.bar}`}
                    style={{
                        width: `${Math.min(100, Math.max(0, ((numVal - range[0]) / (range[1] - range[0])) * 100))}%`,
                    }}
                />
            </div>
        </div>
    );
};

// ============================================================================
// CENTER PANEL
// ============================================================================

const CenterPanel: React.FC<{ physiology: any; history: any }> = ({ physiology, history }) => {
    return (
        <div className="flex flex-col gap-px">

            {/* Energy Matrix (Top) */}
            <div className="panel p-4" style={{ height: '200px' }}>
                <div className="metric-label mb-3">MATRIZ DE PRODUÇÃO ENERGÉTICA</div>
                <EnergyMatrix energy={physiology.energy} />
            </div>

            {/* Waveform Display (Middle) */}
            <div className="panel p-4 flex-1">
                <div className="metric-label mb-2">MONITORAMENTO EM TEMPO REAL</div>
                <div className="grid grid-cols-1 gap-2 h-full">
                    <ClinicalEcgMonitor
                        bpm={physiology.cardiovascular.heartRate}
                        rhythm={physiology.cardiovascular.rhythm}
                        heartRateVariabilityMs={physiology.cardiovascular.heartRateVariability}
                    />
                    <WaveformDisplay
                        label="PLETISMOGRAFIA DE OXIGÊNIO"
                        subtitle="Sinal periférico da saturação de oxigênio"
                        color="data-co2"
                        samples={history.spo2}
                        physiologicalValue={physiology.respiratory.spo2}
                        min={70}
                        max={100}
                        time={physiology.timeElapsed}
                    />
                </div>
            </div>

            {/* Metabolic Status (Bottom) */}
            <div className="panel p-4" style={{ height: '120px' }}>
                <div className="metric-label mb-2">ESTADO METABÓLICO</div>
                <MetabolicGrid physiology={physiology} />
            </div>

        </div>
    );
};

const EnergyMatrix: React.FC<{ energy: any }> = ({ energy }) => {
    return (
        <div className="space-y-3">
            <EnergySystemBar
                label="SISTEMA FOSFAGÊNICO"
                current={energy.pCrStore}
                max={energy.maxPCr}
                color="data-atp"
                info="Imediato (0-10s)"
            />
            <EnergySystemBar
                label="SISTEMA GLICOLÍTICO"
                current={energy.glycolyticRate * 10}
                max={100}
                color="data-lactate"
                info={`Anaeróbio | Lactato: ${energy.lactateLevel.toFixed(1)} mmol/L`}
            />
            <EnergySystemBar
                label="SISTEMA OXIDATIVO"
                current={energy.aerobicContribution}
                max={100}
                color="data-glucose"
                info={`Aeróbio | consumo de oxigênio: ${energy.vo2Current.toFixed(1)} mL/kg/min`}
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

interface WaveformDisplayProps {
    label: string;
    subtitle: string;
    color: DataColor;
    samples: number[];
    physiologicalValue: number;
    min: number;
    max: number;
    time: number;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
    label,
    subtitle,
    color,
    samples,
    physiologicalValue,
    min,
    max,
    time,
}) => {
    const colorClasses = DATA_COLOR_CLASSES[color];
    const displaySamples = createDisplaySamples(samples, physiologicalValue, time);
    const path = buildWaveformPath(displaySamples, 420, 110, 10);
    const fillPath = `${path} L 410 100 L 10 100 Z`;
    const latest = displaySamples[displaySamples.length - 1] ?? physiologicalValue;
    const safeId = label.replace(/\s+/g, '-').toLowerCase();
    const gridId = `grid-${safeId}`;
    const waveId = `wave-${safeId}`;

    return (
        <div className="relative flex-1 overflow-hidden border border-app-border bg-black/20 p-2 min-h-[180px]">
            <div className="absolute top-2 left-2 z-10 flex flex-col">
                <span className="text-[9px] text-text-dim uppercase tracking-wider">{label}</span>
                <span className="text-[9px] text-text-dim">{subtitle}</span>
            </div>
            <div className="absolute top-2 right-2 z-10 text-right">
                <div className={`font-mono text-sm tabular-nums ${colorClasses.text}`}>{latest.toFixed(1)}</div>
                <div className="text-[9px] text-text-dim">faixa {min}–{max}%</div>
            </div>

            <svg viewBox="0 0 420 110" className="absolute inset-0 h-full w-full">
                <defs>
                    <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
                    </pattern>
                    <linearGradient id={waveId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
                    </linearGradient>
                </defs>
                <rect width="420" height="110" fill={`url(#${gridId})`} opacity="0.2" />
                <path d={fillPath} className={colorClasses.text} fill={`url(#${waveId})`} opacity="0.45" />
                <path d={path} fill="none" className={colorClasses.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>

            <div className="absolute inset-x-0 bottom-0 h-7 border-t border-app-border bg-black/30 px-2 text-[9px] text-text-dim flex items-center justify-between">
                <span>Perfusão periférica em tempo real</span>
                <span>{samples.length > 0 ? `${samples.length} amostras` : 'Coletando'}</span>
            </div>
        </div>
    );
};

function createDisplaySamples(
    samples: number[],
    physiologicalValue: number,
    time: number,
): number[] {
    const windowSize = 72;
    const source = samples.slice(-windowSize);

    if (source.length >= 4) {
        return source;
    }

    const generated: number[] = [];
    for (let index = 0; index < windowSize; index += 1) {
        const phase = (index / windowSize) * Math.PI * 2;
        const bpmPhase = time * (physiologicalValue / 60) * Math.PI * 2;

        const pulse = 0.55 + Math.sin(phase * 2.1 + bpmPhase) * 0.18 + Math.sin(phase * 6 + bpmPhase * 1.4) * 0.06;
        const perfusionBoost = clamp((physiologicalValue - 82) / 18, 0, 1) * 0.12;
        generated.push(clamp(pulse + perfusionBoost, 0.08, 1.2));
    }

    return generated;
}

function buildWaveformPath(values: number[], width: number, height: number, padding: number): string {
    if (values.length === 0) return '';

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(0.0001, maxValue - minValue);
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    return values
        .map((value, index) => {
            const x = padding + (index / Math.max(1, values.length - 1)) * plotWidth;
            const normalized = (value - minValue) / range;
            const y = height - padding - normalized * plotHeight;
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
}

const MetabolicGrid: React.FC<{ physiology: any }> = ({ physiology }) => {
    const nutrients = physiology.nutrients;
    const acidBase = physiology.acidBase;

    return (
        <div className="grid grid-cols-4 gap-2">
            <MicroMetric label="GLICOSE SANGUÍNEA" value={nutrients.bloodGlucose} unit="mg/dL" />
            <MicroMetric label="pH SANGUÍNEO" value={acidBase.pH} unit="" decimals={2} />
            <MicroMetric label="BICARBONATO (HCO₃⁻)" value={acidBase.bicarbonate} unit="mmol/L" />
            <MicroMetric label="PRESSÃO PARCIAL DE CO₂" value={acidBase.pco2} unit="mmHg" />
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
        unit: string;
        effect: string;
        cost: number;
    }> = [
        { id: 'insulin', name: 'INSULINA', amount: 20, cooldown: 30, category: 'ANABÓLICO', unit: 'μIU/mL', effect: 'Aumenta captação de glicose e síntese de glicogênio.', cost: 0.5 },
        { id: 'glucagon', name: 'GLUCAGON', amount: 100, cooldown: 35, category: 'CATABÓLICO', unit: 'pg/mL', effect: 'Mobiliza glicogênio hepático e eleva a glicemia.', cost: 0.35 },
        { id: 'adrenaline', name: 'ADRENALINA', amount: 200, cooldown: 45, category: 'EMERGÊNCIA', unit: 'pg/mL', effect: 'Eleva frequência cardíaca, perfusão e oferta energética.', cost: 0.65 },
        { id: 'cortisol', name: 'CORTISOL', amount: 30, cooldown: 60, category: 'ESTRESSE', unit: 'μg/dL', effect: 'Sustenta gliconeogênese e mobilização energética.', cost: 0.7 },
        { id: 'gh', name: 'HORMÔNIO DO CRESCIMENTO', amount: 5, cooldown: 75, category: 'CRESCIMENTO', unit: 'ng/mL', effect: 'Estimula síntese proteica e sinalização de crescimento.', cost: 0.8 },
    ];

    return (
        <div className="panel p-3 flex flex-col gap-2">
                <div className="metric-label mb-1">CONTROLE HORMONAL</div>

            <div className="text-[9px] text-text-dim mb-3 leading-relaxed">
                Interface do sistema endócrino. Libere hormônios para modular o estado metabólico.
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
                            amount={hormone.amount}
                            unit={hormone.unit}
                            effect={hormone.effect}
                            cost={hormone.cost}
                            onClick={() => releaseHormone(hormone.id, hormone.amount)}
                        />
                    );
                })}
            </div>

            {/* Hormonal Levels Display */}
            <div className="border-t border-app-border pt-3 mt-2">
                <div className="text-[9px] text-text-dim uppercase tracking-wider mb-2">NÍVEIS ATUAIS</div>
                <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                    <HormoneLevel label="Insulina" value={physiology.hormones.insulin} unit="μIU/mL" />
                    <HormoneLevel label="Glucagon" value={physiology.hormones.glucagon} unit="pg/mL" />
                    <HormoneLevel label="Adrenalina" value={physiology.hormones.adrenaline} unit="pg/mL" />
                    <HormoneLevel label="Noradrenalina" value={physiology.hormones.noradrenaline} unit="pg/mL" />
                    <HormoneLevel label="Cortisol" value={physiology.hormones.cortisol} unit="μg/dL" />
                    <HormoneLevel label="Hormônio do crescimento" value={physiology.hormones.gh} unit="ng/mL" />
                    <HormoneLevel label="Testosterona" value={physiology.hormones.testosterone} unit="ng/dL" />
                    <HormoneLevel label="Fator de crescimento semelhante à insulina 1 (IGF-1)" value={physiology.hormones.igf1} unit="ng/mL" />
                    <HormoneLevel label="Triiodotironina (T3)" value={physiology.hormones.t3} unit="ng/dL" />
                    <HormoneLevel label="Tiroxina (T4)" value={physiology.hormones.t4} unit="μg/dL" />
                    <HormoneLevel label="Hormônio estimulante da tireoide (TSH)" value={physiology.hormones.tsh} unit="μIU/mL" />
                    <HormoneLevel label="Atividade da via mTOR" value={physiology.hormones.mTORActivity} unit="%" />
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
    amount: number;
    unit: string;
    effect: string;
    cost: number;
    onClick: () => void;
}

const HormonalButton: React.FC<HormonalButtonProps> = ({
    label,
    category,
    onCooldown,
    cooldownRemaining,
    cooldownTotal,
    amount,
    unit,
    effect,
    cost,
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
            <div className="mb-2 text-[9px] normal-case leading-relaxed tracking-normal text-text-secondary">{effect}</div>
            <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[9px] text-text-dim">
                <span>Dose {amount} {unit}</span>
                <span>Custo {cost.toFixed(2)} mmol de ATP</span>
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
                <div className="text-[9px] text-data-atp">► PRONTO</div>
            )}
        </button>
    );
};

const HormoneLevel: React.FC<{ label: string; value: number; unit: string }> = ({ label, value, unit }) => {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 leading-snug text-text-dim">{label}</span>
            <span className="flex-none whitespace-nowrap font-mono text-text-primary tabular-nums">{value.toFixed(1)} <span className="text-text-dim">{unit}</span></span>
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
                <span className="metric-label">CARGA ALOSTÁTICA</span>
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
                    <span className="text-text-dim">METABÓLICO</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.metabolicStress.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">OXIDATIVO</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.oxidativeStress.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">INFLAMAÇÃO</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.inflammationLevel.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">CARDIOVASCULAR</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.cardiovascularStress.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">FADIGA</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.fatigueLevel.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-text-dim">CAPACIDADE DE ADAPTAÇÃO</span>
                    <span className="font-mono text-text-primary">{allostaticLoad.adaptationCapacity.toFixed(0)}</span>
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-text-dim">ESTADO DO SISTEMA:</span>
                <span className={`text-[10px] font-medium ${physiology.isAlive ? 'text-status-normal' : 'text-status-critical'
                    }`}>
                    {physiology.isAlive ? 'OPERACIONAL' : 'FALHA CRÍTICA'}
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

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
