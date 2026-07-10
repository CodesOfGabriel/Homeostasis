/**
 * Homeostasis v3.0 - Monitor Panel
 * Dashboard estilo monitor multiparamétrico de UTI
 * Design minimalista, clinical, sem decorações
 */

import React from 'react';
import { Activity, Heart, Wind, AlertTriangle } from 'lucide-react';
import { useSimulationStore, selectors } from '../game/simulationStore';
import { CLINICAL_RANGES } from '../game/physiology';

export const MonitorPanel: React.FC = () => {
    const vitalSigns = useSimulationStore(selectors.vitalSigns);
    const metabolicPanel = useSimulationStore(selectors.metabolicPanel);
    const energyMatrix = useSimulationStore(selectors.energyMatrix);
    const systemHealth = useSimulationStore(selectors.systemHealth);
    const isAlive = useSimulationStore(selectors.isAlive);
    const causeOfDeath = useSimulationStore(selectors.causeOfDeath);

    if (!isAlive) {
        return <DeathScreen causeOfDeath={causeOfDeath} />;
    }

    return (
        <div className="h-screen bg-medical-bg text-clinical-text font-sans">
            {/* Grid Principal - Layout Denso */}
            <div className="grid grid-cols-12 gap-px h-full p-px bg-medical-border">

                {/* Coluna Esquerda - Sinais Vitais */}
                <div className="col-span-3 flex flex-col gap-px">
                    <VitalSignCard
                        label="FC"
                        value={vitalSigns.hr}
                        unit="bpm"
                        icon={<Heart className="w-4 h-4" strokeWidth={1.5} />}
                        range={CLINICAL_RANGES.heartRate}
                        color="arterial"
                    />
                    <VitalSignCard
                        label="SpO₂"
                        value={vitalSigns.spo2}
                        unit="%"
                        icon={<Wind className="w-4 h-4" strokeWidth={1.5} />}
                        range={CLINICAL_RANGES.spo2}
                        color="venous"
                    />
                    <VitalSignCard
                        label="PA"
                        value={`${vitalSigns.bp.systolic}/${vitalSigns.bp.diastolic}`}
                        unit="mmHg"
                        icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
                        range={CLINICAL_RANGES.bloodPressure.systolic}
                        color="arterial"
                    />
                    <VitalSignCard
                        label="FR"
                        value={vitalSigns.rr}
                        unit="rpm"
                        icon={<Wind className="w-4 h-4" strokeWidth={1.5} />}
                        range={{ min: 12, max: 20, optimal: 14 }}
                        color="venous"
                    />
                </div>

                {/* Coluna Central - Gráficos em Tempo Real */}
                <div className="col-span-6 flex flex-col gap-px">
                    <div className="bg-medical-surface p-4 flex-1">
                        <WaveformDisplay label="ECG" data={[]} color="arterial" />
                    </div>
                    <div className="bg-medical-surface p-4 flex-1">
                        <WaveformDisplay label="Pleth (SpO₂)" data={[]} color="venous" />
                    </div>
                    <div className="bg-medical-surface p-4 flex-1">
                        <WaveformDisplay label="Capnografia" data={[]} color="metabolic" />
                    </div>
                </div>

                {/* Coluna Direita - Painel Metabólico */}
                <div className="col-span-3 flex flex-col gap-px">
                    <MetabolicCard
                        label="Glicose"
                        value={metabolicPanel.glucose}
                        unit="mg/dL"
                        range={CLINICAL_RANGES.glucose}
                    />
                    <MetabolicCard
                        label="Lactato"
                        value={metabolicPanel.lactate}
                        unit="mmol/L"
                        range={CLINICAL_RANGES.lactate}
                    />
                    <MetabolicCard
                        label="pH"
                        value={metabolicPanel.pH}
                        unit=""
                        range={CLINICAL_RANGES.pH}
                    />
                    <MetabolicCard
                        label="HCO₃⁻"
                        value={metabolicPanel.bicarbonate}
                        unit="mmol/L"
                        range={{ min: 22, max: 26, optimal: 24 }}
                    />
                </div>

                {/* Linha Inferior - Matriz Energética e Sistema */}
                <div className="col-span-12 h-32 grid grid-cols-4 gap-px">
                    <EnergyMatrixDisplay energyMatrix={energyMatrix} />
                    <SystemHealthDisplay systemHealth={systemHealth} />
                    <div className="bg-medical-surface col-span-2 p-3">
                        <div className="text-xs text-clinical-muted mb-2">SISTEMA</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <StatusIndicator label="Cardiovascular" value={systemHealth.cardiovascular} />
                            <StatusIndicator label="Respiratório" value={systemHealth.respiratory} />
                            <StatusIndicator label="Metabólico" value={systemHealth.metabolic} />
                            <StatusIndicator label="Ácido-Base" value={systemHealth.acidBase} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface VitalSignCardProps {
    label: string;
    value: number | string;
    unit: string;
    icon: React.ReactNode;
    range: { min: number; max: number; optimal: number };
    color: 'arterial' | 'venous' | 'metabolic' | 'hormonal';
}

const VitalSignCard: React.FC<VitalSignCardProps> = ({
    label,
    value,
    unit,
    icon,
    range,
    color,
}) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const status = getStatus(numValue, range);
    const statusColor = getStatusColor(status);

    return (
        <div className="bg-medical-surface p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`text-${color}`}>{icon}</div>
                    <span className="text-xs text-clinical-muted font-medium tracking-wide">
                        {label}
                    </span>
                </div>
                <StatusDot status={status} />
            </div>

            <div className="flex-1 flex items-center">
                <span className="font-mono text-4xl font-semibold tabular-nums">
                    {typeof value === 'number' ? value.toFixed(0) : value}
                </span>
                <span className="ml-2 text-sm text-clinical-muted font-mono">{unit}</span>
            </div>

            <div className="mt-2">
                <div className="h-1 bg-medical-border rounded-none overflow-hidden">
                    <div
                        className={`h-full bg-${statusColor} transition-all duration-300`}
                        style={{
                            width: `${Math.min(100, ((numValue - range.min) / (range.max - range.min)) * 100)}%`,
                        }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-clinical-muted font-mono">
                    <span>{range.min}</span>
                    <span>{range.max}</span>
                </div>
            </div>
        </div>
    );
};

interface MetabolicCardProps {
    label: string;
    value: number;
    unit: string;
    range: { min: number; max: number; optimal: number };
}

const MetabolicCard: React.FC<MetabolicCardProps> = ({ label, value, unit, range }) => {
    const status = getStatus(value, range);

    return (
        <div className="bg-medical-surface p-3 flex-1">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-clinical-muted tracking-wide">{label}</span>
                <StatusDot status={status} />
            </div>
            <div className="flex items-baseline">
                <span className="font-mono text-2xl font-semibold tabular-nums">
                    {value.toFixed(value < 10 ? 2 : 1)}
                </span>
                <span className="ml-1 text-xs text-clinical-muted font-mono">{unit}</span>
            </div>
            <div className="mt-2 text-[9px] text-clinical-muted font-mono">
                Ref: {range.min.toFixed(1)} - {range.max.toFixed(1)}
            </div>
        </div>
    );
};

interface WaveformDisplayProps {
    label: string;
    data: number[];
    color: 'arterial' | 'venous' | 'metabolic';
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ label }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="text-[10px] text-clinical-muted mb-2 tracking-wide">{label}</div>
            <div className="flex-1 border border-medical-border relative">
                {/* Grid de fundo */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path
                                d="M 20 0 L 0 0 0 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="text-clinical-muted"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Placeholder para waveform real */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] text-clinical-muted opacity-30">
                        [Waveform - Implementar Canvas]
                    </span>
                </div>
            </div>
        </div>
    );
};

interface EnergyMatrixDisplayProps {
    energyMatrix: any;
}

const EnergyMatrixDisplay: React.FC<EnergyMatrixDisplayProps> = ({ energyMatrix }) => {
    return (
        <div className="bg-medical-surface p-3">
            <div className="text-xs text-clinical-muted mb-2">MATRIZ ENERGÉTICA</div>
            <div className="space-y-1">
                <EnergyBar
                    label="ATP"
                    value={energyMatrix.atpPool}
                    max={energyMatrix.maxATP}
                    color="metabolic"
                />
                <EnergyBar
                    label="PCr"
                    value={energyMatrix.pCrStore}
                    max={energyMatrix.maxPCr}
                    color="hormonal"
                />
                <div className="flex justify-between text-[10px] font-mono mt-2">
                    <span className="text-clinical-muted">Aeróbio</span>
                    <span className="text-metabolic">{energyMatrix.aerobicContribution.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-clinical-muted">Lactato</span>
                    <span className="text-alert">{energyMatrix.lactateLevel.toFixed(1)} mmol/L</span>
                </div>
            </div>
        </div>
    );
};

interface EnergyBarProps {
    label: string;
    value: number;
    max: number;
    color: string;
}

const EnergyBar: React.FC<EnergyBarProps> = ({ label, value, max, color }) => {
    const percentage = (value / max) * 100;
    return (
        <div>
            <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-clinical-muted font-mono">{label}</span>
                <span className="text-clinical-text font-mono tabular-nums">
                    {value.toFixed(1)}/{max}
                </span>
            </div>
            <div className="h-1 bg-medical-border">
                <div
                    className={`h-full bg-${color} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

interface SystemHealthDisplayProps {
    systemHealth: any;
}

const SystemHealthDisplay: React.FC<SystemHealthDisplayProps> = ({ systemHealth }) => {
    const avgHealth = (Object.values(systemHealth) as number[]).reduce((a, b) => a + b, 0) / 4;

    return (
        <div className="bg-medical-surface p-3">
            <div className="text-xs text-clinical-muted mb-2">SAÚDE DO SISTEMA</div>
            <div className="flex items-center justify-center h-16">
                <div className="relative">
                    <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                            cx="40"
                            cy="40"
                            r="35"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-medical-border"
                        />
                        <circle
                            cx="40"
                            cy="40"
                            r="35"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 35}`}
                            strokeDashoffset={`${2 * Math.PI * 35 * (1 - avgHealth / 100)}`}
                            className={avgHealth > 70 ? 'text-normal' : avgHealth > 40 ? 'text-alert' : 'text-critical'}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-xl font-semibold">{avgHealth.toFixed(0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatusIndicatorProps {
    label: string;
    value: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ label, value }) => {
    const color = value > 70 ? 'text-normal' : value > 40 ? 'text-alert' : 'text-critical';

    return (
        <div className="flex items-center justify-between">
            <span className="text-clinical-muted">{label}</span>
            <span className={`font-mono ${color}`}>{value.toFixed(0)}%</span>
        </div>
    );
};

interface StatusDotProps {
    status: 'normal' | 'warning' | 'critical';
}

const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
    const colorClass = {
        normal: 'bg-normal',
        warning: 'bg-alert',
        critical: 'bg-critical',
    }[status];

    return (
        <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${colorClass}`} />
        </div>
    );
};

// ============================================================================
// DEATH SCREEN
// ============================================================================

interface DeathScreenProps {
    causeOfDeath?: string;
}

const DeathScreen: React.FC<DeathScreenProps> = ({ causeOfDeath }) => {
    const reset = useSimulationStore(state => state.reset);

    return (
        <div className="h-screen bg-medical-bg flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
                <AlertTriangle className="w-16 h-16 text-critical mx-auto" strokeWidth={1.5} />
                <div>
                    <h1 className="text-3xl font-semibold text-clinical-text mb-2">
                        COLAPSO FISIOLÓGICO
                    </h1>
                    <p className="text-clinical-muted text-sm">
                        {causeOfDeath || 'Falência múltipla de órgãos'}
                    </p>
                </div>
                <button
                    onClick={reset}
                    className="btn-clinical-outline px-6 py-3 text-sm"
                >
                    Reiniciar Simulação
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatus(
    value: number,
    range: { min: number; max: number; optimal: number }
): 'normal' | 'warning' | 'critical' {
    const deviation = Math.abs(value - range.optimal);
    const tolerance = (range.max - range.min) / 2;

    if (deviation < tolerance * 0.3) return 'normal';
    if (deviation < tolerance * 0.7) return 'warning';
    return 'critical';
}

function getStatusColor(status: 'normal' | 'warning' | 'critical'): string {
    return {
        normal: 'normal',
        warning: 'alert',
        critical: 'critical',
    }[status];
}
