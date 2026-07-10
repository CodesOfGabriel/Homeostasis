import { useEffect, useState, type DragEvent } from 'react';
import { Atom, Flame, Wind, Zap } from 'lucide-react';
import type {
    CellularState,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
} from '../../game/cellularTypes';
import { ClinicalPanel, LevelBar, PanelHeading, WireButton } from './CellularPrimitives';

interface CellularViewProps {
    cellular: CellularState;
    onCapture: (kind: SubstrateKind) => boolean;
}

interface SubstrateMeta {
    label: string;
    shortLabel: string;
    borderClass: string;
    textClass: string;
    dotClass: string;
    icon: typeof Zap;
    accentClass: string;
}

const SUBSTRATE_META: Record<SubstrateKind, SubstrateMeta> = {
    glucose: {
        label: 'Glicose',
        shortLabel: 'GLC',
        borderClass: 'border-data-glucose',
        textClass: 'text-data-glucose',
        dotClass: 'bg-data-glucose',
        icon: Zap,
        accentClass: 'from-data-glucose/25 via-data-glucose/10 to-transparent',
    },
    oxygen: {
        label: 'Oxigênio',
        shortLabel: 'O₂',
        borderClass: 'border-data-o2',
        textClass: 'text-data-o2',
        dotClass: 'bg-data-o2',
        icon: Wind,
        accentClass: 'from-data-o2/25 via-data-o2/10 to-transparent',
    },
    fattyAcid: {
        label: 'Ácido graxo',
        shortLabel: 'AG',
        borderClass: 'border-data-lactate',
        textClass: 'text-data-lactate',
        dotClass: 'bg-data-lactate',
        icon: Flame,
        accentClass: 'from-data-lactate/25 via-data-lactate/10 to-transparent',
    },
    aminoAcid: {
        label: 'Aminoácido',
        shortLabel: 'AA',
        borderClass: 'border-status-optimal',
        textClass: 'text-status-optimal',
        dotClass: 'bg-status-optimal',
        icon: Atom,
        accentClass: 'from-status-optimal/25 via-status-optimal/10 to-transparent',
    },
};

const CAPTURE_COST: Record<SubstrateKind, number> = {
    glucose: 1,
    oxygen: 3,
    fattyAcid: 0.5,
    aminoAcid: 0.5,
};

function CaptureDock({ cellular, onCapture }: CellularViewProps) {
    const [flashKind, setFlashKind] = useState<SubstrateKind | null>(null);
    const kinds: SubstrateKind[] = ['glucose', 'oxygen', 'fattyAcid', 'aminoAcid'];

    useEffect(() => {
        if (!flashKind) return;
        const timeout = window.setTimeout(() => setFlashKind(null), 320);
        return () => window.clearTimeout(timeout);
    }, [flashKind]);

    const handleCapture = (kind: SubstrateKind) => {
        const succeeded = onCapture(kind);
        if (succeeded) setFlashKind(kind);
    };

    return (
        <div className="border-t border-app-border bg-app-bg p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                        Substratos no LEC
                    </div>
                    <p className="text-[10px] text-text-secondary">
                        Clique para captar pela membrana. A saturação dos transportadores limita o fluxo.
                    </p>
                </div>
                <div className="font-mono text-[10px] text-text-secondary" aria-live="polite">
                    CAPTURADOS: {Object.values(cellular.pools.captured).reduce((sum, value) => sum + value, 0).toFixed(0)}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {kinds.map(kind => {
                    const meta = SUBSTRATE_META[kind];
                    const available = cellular.pools.available[kind];
                    const captured = cellular.pools.captured[kind];
                    const Icon = meta.icon;
                    const isFlashing = flashKind === kind;

                    return (
                        <button
                            key={kind}
                            type="button"
                            onClick={() => handleCapture(kind)}
                            disabled={available < CAPTURE_COST[kind]}
                            className={`group relative overflow-hidden min-h-16 border bg-app-surface p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal disabled:cursor-not-allowed disabled:border-app-border disabled:text-text-disabled ${meta.borderClass} ${isFlashing ? 'animate-collect-burst shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_24px_rgba(255,255,255,0.12)]' : ''}`}
                            aria-label={`Captar ${meta.label}. ${available.toFixed(1)} pacotes disponíveis e ${captured.toFixed(1)} capturados`}
                        >
                            <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.accentClass} opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${isFlashing ? 'opacity-100' : ''}`} />
                            {isFlashing && <span className={`pointer-events-none absolute inset-0 rounded-none border border-current opacity-50 animate-collect-ring ${meta.textClass}`} aria-hidden="true" />}
                            <div className="relative z-10 flex items-center justify-between gap-2">
                                <span className={`flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider ${meta.textClass}`}>
                                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                    {meta.shortLabel}
                                </span>
                                <span className="font-mono text-xs tabular-nums text-text-primary">{available.toFixed(1)}</span>
                            </div>
                            <div className="relative z-10 mt-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-text-secondary">
                                <span>{meta.label}</span>
                                <span className="font-mono text-text-primary">LIC {captured.toFixed(1)}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function TissueParticle({
    kind,
    label,
    className,
    available,
    onCapture,
    isFlashing,
}: {
    kind: SubstrateKind;
    label: string;
    className: string;
    available: number;
    onCapture: (kind: SubstrateKind) => boolean;
    isFlashing: boolean;
}) {
    const meta = SUBSTRATE_META[kind];
    const Icon = meta.icon;

    return (
        <button
            type="button"
            onClick={() => onCapture(kind)}
            disabled={available < CAPTURE_COST[kind]}
            className={`group absolute flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full border bg-app-bg/90 font-mono text-[9px] font-semibold shadow-lg shadow-black/25 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal disabled:cursor-not-allowed disabled:opacity-35 ${meta.borderClass} ${meta.textClass} ${className} ${isFlashing ? 'animate-collect-burst' : 'animate-float-gentle'}`}
            aria-label={`${label}. Clique para captar ${meta.label}`}
        >
            <span className={`pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b ${meta.accentClass} opacity-30 transition-opacity duration-150 group-hover:opacity-70`} />
            {isFlashing && <span className={`pointer-events-none absolute inset-0 rounded-full border border-current opacity-60 animate-collect-ring ${meta.textClass}`} aria-hidden="true" />}
            <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
            <span className="relative z-10 leading-none">{meta.shortLabel}</span>
            <span className="relative z-10 text-[8px] uppercase tracking-[0.18em] text-text-secondary">{meta.label}</span>
        </button>
    );
}

export function TissueView({ cellular, onCapture }: CellularViewProps) {
    const tissue = cellular.tissue;
    const [flashKind, setFlashKind] = useState<SubstrateKind | null>(null);

    useEffect(() => {
        if (!flashKind) return;
        const timeout = window.setTimeout(() => setFlashKind(null), 320);
        return () => window.clearTimeout(timeout);
    }, [flashKind]);

    const handleCapture = (kind: SubstrateKind) => {
        const succeeded = onCapture(kind);
        if (succeeded) setFlashKind(kind);
        return succeeded;
    };

    return (
        <ClinicalPanel className="flex min-h-[500px] flex-col xl:h-full xl:min-h-0" ariaLabel="Vista esquemática do tecido">
            <PanelHeading
                eyebrow="Microcirculação"
                title="Capilar → LEC → membrana → LIC"
                action={(
                    <span className="border border-app-border px-2 py-1 font-mono text-[9px] text-text-secondary">
                        ESQUEMA · NÃO À ESCALA
                    </span>
                )}
            />

            <div className="relative min-h-[350px] flex-1 overflow-hidden bg-app-bg">
                <svg
                    viewBox="0 0 760 430"
                    className="absolute inset-0 h-full w-full"
                    role="img"
                    aria-labelledby="tissue-view-title tissue-view-description"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <title id="tissue-view-title">Fluxo entre capilar, líquido extracelular e células</title>
                    <desc id="tissue-view-description">
                        Nutrientes e oxigênio deixam o capilar, atravessam o líquido extracelular e são captados pela célula. Dióxido de carbono, lactato e resíduos fazem o caminho inverso.
                    </desc>
                    <defs>
                        <pattern id="tissue-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#27272a" strokeWidth="1" />
                        </pattern>
                        <marker id="arrow-forward" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                        </marker>
                        <marker id="arrow-waste" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
                        </marker>
                    </defs>
                    <rect width="760" height="430" fill="url(#tissue-grid)" opacity="0.7" />

                    <rect x="30" y="34" width="155" height="362" rx="70" fill="#18181b" stroke="#ef4444" strokeWidth="2" />
                    <path d="M108 72 L108 350" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 8" opacity="0.7" />
                    <text x="107" y="55" fill="#a1a1aa" fontSize="11" textAnchor="middle" letterSpacing="1.5">CAPILAR</text>
                    <text x="107" y="379" fill="#52525b" fontSize="10" textAnchor="middle">PERFUSÃO {tissue.perfusionPercent.toFixed(0)}%</text>

                    <rect x="215" y="34" width="220" height="362" fill="#121214" stroke="#27272a" strokeWidth="1" />
                    <text x="325" y="55" fill="#a1a1aa" fontSize="11" textAnchor="middle" letterSpacing="1.5">LEC / INTERSTÍCIO</text>
                    <text x="325" y="378" fill="#52525b" fontSize="10" textAnchor="middle">{tissue.osmolarity.toFixed(0)} mOsm/kg · pH {tissue.pH.toFixed(2)}</text>

                    <circle cx="590" cy="215" r="152" fill="#121214" stroke="#8b5cf6" strokeWidth="3" />
                    <circle cx="590" cy="215" r="132" fill="#09090b" stroke="#27272a" strokeWidth="1" strokeDasharray="4 5" />
                    <ellipse cx="620" cy="225" rx="55" ry="29" fill="#18181b" stroke="#eab308" strokeWidth="2" />
                    <path d="M575 225 C590 205 610 245 632 220 C642 209 651 212 662 225" fill="none" stroke="#eab308" strokeWidth="2" opacity="0.8" />
                    <text x="590" y="92" fill="#a1a1aa" fontSize="11" textAnchor="middle" letterSpacing="1.5">CÉLULA / LIC</text>
                    <text x="620" y="269" fill="#eab308" fontSize="10" textAnchor="middle">MITOCÔNDRIA</text>

                    <path d="M165 128 C250 100 365 120 455 158" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-forward)" />
                    <path d="M165 185 C270 172 370 180 455 195" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-forward)" />
                    <path d="M455 286 C350 320 260 315 165 286" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#arrow-waste)" />
                    <text x="310" y="108" fill="#10b981" fontSize="10" textAnchor="middle">NUTRIENTES / O₂</text>
                    <text x="310" y="337" fill="#f97316" fontSize="10" textAnchor="middle">CO₂ · LACTATO · RESÍDUOS</text>
                </svg>

                <TissueParticle kind="glucose" label="Glicose no interstício" className="left-[33%] top-[22%]" available={cellular.pools.available.glucose} onCapture={handleCapture} isFlashing={flashKind === 'glucose'} />
                <TissueParticle kind="oxygen" label="Oxigênio no interstício" className="left-[44%] top-[38%]" available={cellular.pools.available.oxygen} onCapture={handleCapture} isFlashing={flashKind === 'oxygen'} />
                <TissueParticle kind="fattyAcid" label="Ácido graxo no interstício" className="left-[29%] top-[55%]" available={cellular.pools.available.fattyAcid} onCapture={handleCapture} isFlashing={flashKind === 'fattyAcid'} />
                <TissueParticle kind="aminoAcid" label="Aminoácido no interstício" className="left-[50%] top-[66%]" available={cellular.pools.available.aminoAcid} onCapture={handleCapture} isFlashing={flashKind === 'aminoAcid'} />

                <div className="absolute bottom-3 right-3 max-w-56 border border-app-border bg-app-surface/95 p-2 text-[10px] text-text-secondary">
                    <span className="font-medium text-text-primary">Fluxo real:</span> perfusão entrega ao LEC; gradientes e transportadores controlam a entrada no LIC.
                </div>
            </div>

            <CaptureDock cellular={cellular} onCapture={onCapture} />
        </ClinicalPanel>
    );
}

export function IntracellularView({ cellular, onCapture }: CellularViewProps) {
    const cell = cellular.cell;
    const [flashKind, setFlashKind] = useState<SubstrateKind | null>(null);

    useEffect(() => {
        if (!flashKind) return;
        const timeout = window.setTimeout(() => setFlashKind(null), 320);
        return () => window.clearTimeout(timeout);
    }, [flashKind]);

    const handleCapture = (kind: SubstrateKind) => {
        const succeeded = onCapture(kind);
        if (succeeded) setFlashKind(kind);
        return succeeded;
    };

    return (
        <ClinicalPanel className="flex min-h-[500px] flex-col xl:h-full xl:min-h-0" ariaLabel="Vista intracelular">
            <PanelHeading
                eyebrow="Compartimentos"
                title="Membrana celular e citosol"
                action={(
                    <span className="font-mono text-[10px] text-text-secondary">
                        ΔΨ {cell.membranePotentialMv.toFixed(0)} mV
                    </span>
                )}
            />

            <div className="relative min-h-[350px] flex-1 overflow-hidden bg-app-bg">
                <svg
                    viewBox="0 0 760 430"
                    className="absolute inset-0 h-full w-full"
                    role="img"
                    aria-labelledby="cell-view-title cell-view-description"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <title id="cell-view-title">Célula e seus principais compartimentos</title>
                    <desc id="cell-view-description">
                        Corte esquemático mostrando membrana plasmática, citosol, núcleo e mitocôndrias, com gradientes de sódio, potássio e cálcio.
                    </desc>
                    <defs>
                        <pattern id="cell-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#27272a" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="760" height="430" fill="url(#cell-grid)" opacity="0.55" />
                    <circle cx="380" cy="218" r="188" fill="#121214" stroke="#8b5cf6" strokeWidth="5" />
                    <circle cx="380" cy="218" r="174" fill="#09090b" stroke="#27272a" strokeWidth="1" strokeDasharray="5 6" />
                    <circle cx="378" cy="207" r="70" fill="#18181b" stroke="#3b82f6" strokeWidth="2" />
                    <circle cx="378" cy="207" r="24" fill="#121214" stroke="#52525b" strokeWidth="1" />
                    <text x="378" y="202" fill="#a1a1aa" fontSize="11" textAnchor="middle">NÚCLEO</text>
                    <text x="378" y="220" fill="#52525b" fontSize="9" textAnchor="middle">DNA {cell.viabilityPercent.toFixed(0)}% VIÁVEL</text>

                    <ellipse cx="228" cy="215" rx="60" ry="31" fill="#18181b" stroke="#eab308" strokeWidth="2" />
                    <path d="M180 215 C198 190 215 240 237 209 C250 193 268 200 277 218" fill="none" stroke="#eab308" strokeWidth="2" />
                    <text x="228" y="260" fill="#eab308" fontSize="9" textAnchor="middle">MITOCÔNDRIA</text>

                    <ellipse cx="548" cy="280" rx="58" ry="29" fill="#18181b" stroke="#eab308" strokeWidth="2" />
                    <path d="M502 280 C520 255 538 305 557 275 C568 260 585 264 594 282" fill="none" stroke="#eab308" strokeWidth="2" />

                    <path d="M190 94 L225 130" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M568 82 L536 128" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M150 320 L210 295" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 4" />
                    <text x="88" y="88" fill="#10b981" fontSize="10">GLICOSE</text>
                    <text x="584" y="78" fill="#ef4444" fontSize="10">O₂</text>
                    <text x="72" y="338" fill="#06b6d4" fontSize="10">AMINOÁCIDOS</text>

                    <text x="380" y="402" fill="#a1a1aa" fontSize="10" textAnchor="middle">
                        LIC {cell.osmolarity.toFixed(0)} mOsm/kg · pH {cell.pH.toFixed(2)} · VOLUME {cell.volumePercent.toFixed(0)}%
                    </text>
                </svg>

                <div className="absolute left-3 top-3 w-44 space-y-2 border border-app-border bg-app-surface/95 p-2">
                    <LevelBar label="ATP citosólico" value={cell.atpMmolL} max={8} valueLabel={`${cell.atpMmolL.toFixed(2)} mmol/L`} tone="atp" />
                    <LevelBar label="NADH" value={cell.nadhPercent} tone="oxygen" />
                </div>

                <div className="absolute right-3 top-3 w-44 space-y-1 border border-app-border bg-app-surface/95 p-2 text-[10px]">
                    <div className="flex justify-between"><span className="text-text-secondary">Na⁺ LIC</span><span className="font-mono text-text-primary">{cell.sodium.toFixed(1)} mmol/L</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">K⁺ LIC</span><span className="font-mono text-text-primary">{cell.potassium.toFixed(0)} mmol/L</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">Ca²⁺ LIC</span><span className="font-mono text-text-primary">{cell.calciumNm.toFixed(0)} nM</span></div>
                </div>
            </div>

            <CaptureDock cellular={cellular} onCapture={handleCapture} />
        </ClinicalPanel>
    );
}

interface MachineryViewProps {
    cellular: CellularState;
    onGlycolysis: () => boolean;
    onOxidize: (kind: OxidationSubstrate) => boolean;
    onAllocateAtp: (target: RepairTarget) => boolean;
}

function OxidationToken({
    kind,
    label,
    amount,
    selected,
    onSelect,
}: {
    kind: OxidationSubstrate;
    label: string;
    amount: number;
    selected: boolean;
    onSelect: (kind: OxidationSubstrate) => void;
}) {
    const isPyruvate = kind === 'pyruvate';

    const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
        event.dataTransfer.setData('application/x-cellular-substrate', kind);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <button
            type="button"
            draggable={amount >= 1}
            disabled={amount < 1}
            onDragStart={handleDragStart}
            onClick={() => onSelect(kind)}
            className={selected
                ? 'min-h-12 border border-data-atp bg-data-atp/10 p-2 text-left text-data-atp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal'
                : isPyruvate
                    ? 'min-h-12 border border-data-glucose bg-app-bg p-2 text-left text-data-glucose hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal disabled:cursor-not-allowed disabled:border-app-border disabled:text-text-disabled'
                    : 'min-h-12 border border-data-lactate bg-app-bg p-2 text-left text-data-lactate hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal disabled:cursor-not-allowed disabled:border-app-border disabled:text-text-disabled'}
            aria-pressed={selected}
            aria-label={`${label}: ${amount.toFixed(0)} pacotes. Clique para selecionar ou arraste para a mitocôndria`}
        >
            <div className="flex justify-between gap-2 font-mono text-xs">
                <span>{label}</span>
                <span>{amount.toFixed(0)}</span>
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-wider text-text-secondary">Selecionar / arrastar</div>
        </button>
    );
}

export function MachineryView({ cellular, onGlycolysis, onOxidize, onAllocateAtp }: MachineryViewProps) {
    const [selectedSubstrate, setSelectedSubstrate] = useState<OxidationSubstrate | null>(null);
    const [interactionMessage, setInteractionMessage] = useState('Selecione ou arraste piruvato/ácido graxo para a mitocôndria.');
    const mitochondria = cellular.mitochondria;

    const oxidize = (kind: OxidationSubstrate) => {
        const succeeded = onOxidize(kind);
        if (succeeded) {
            setSelectedSubstrate(null);
            setInteractionMessage(`${kind === 'pyruvate' ? 'Piruvato' : 'Ácido graxo'} oxidado na mitocôndria.`);
        } else {
            setInteractionMessage('Oxidação bloqueada; confira O₂, ADP, reserva de ATP e saúde mitocondrial.');
        }
    };

    const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const kind = event.dataTransfer.getData('application/x-cellular-substrate');
        if (kind === 'pyruvate' || kind === 'fattyAcid') oxidize(kind);
    };

    const handleMitochondriaClick = () => {
        if (selectedSubstrate) oxidize(selectedSubstrate);
        else setInteractionMessage('Primeiro selecione piruvato ou ácido graxo.');
    };

    return (
        <ClinicalPanel className="flex min-h-[560px] flex-col xl:h-full xl:min-h-0" ariaLabel="Maquinaria celular">
            <PanelHeading
                eyebrow="Bioenergética"
                title="Glicólise · cadeia respiratória · ATP sintase"
                action={(
                    <span className="font-mono text-[10px] text-data-atp">
                        ATP TOTAL +{cellular.totalAtpProduced.toFixed(1)}
                    </span>
                )}
            />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto bg-app-border lg:grid-cols-12">
                <section className="bg-app-surface p-3 lg:col-span-3" aria-label="Preparação de substratos">
                    <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                        01 · Preparação citosólica
                    </div>
                    <div className="border border-data-glucose bg-app-bg p-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-text-primary">GLICÓLISE</span>
                            <span className="font-mono text-[10px] text-data-glucose">
                                GLC {cellular.pools.captured.glucose.toFixed(0)}
                            </span>
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">
                            Glicose → piruvato + ATP citosólico + NADH. Não exige mitocôndria.
                        </p>
                        <WireButton
                            className="mt-3 w-full"
                            onClick={() => {
                                const succeeded = onGlycolysis();
                                setInteractionMessage(succeeded
                                    ? 'Glicólise concluída: ATP citosólico e piruvato gerados.'
                                    : 'Glicólise bloqueada; capte glicose ou aloque o ATP acumulado.');
                            }}
                            disabled={cellular.pools.captured.glucose < 1 || cellular.cell.atpMmolL > 5.72}
                        >
                            Executar glicólise
                        </WireButton>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
                        <OxidationToken
                            kind="pyruvate"
                            label="PIRUVATO"
                            amount={cellular.pools.pyruvate}
                            selected={selectedSubstrate === 'pyruvate'}
                            onSelect={setSelectedSubstrate}
                        />
                        <OxidationToken
                            kind="fattyAcid"
                            label="ÁCIDO GRAXO"
                            amount={cellular.pools.captured.fattyAcid}
                            selected={selectedSubstrate === 'fattyAcid'}
                            onSelect={setSelectedSubstrate}
                        />
                    </div>
                </section>

                <section className="relative flex min-h-[390px] flex-col bg-app-bg p-3 lg:col-span-6" aria-label="Mitocôndria e cadeia respiratória">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                            02 · Oxidação mitocondrial
                        </div>
                        <div className="font-mono text-[10px] text-text-secondary">
                            O₂ CAPTADO {cellular.pools.captured.oxygen.toFixed(0)}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleMitochondriaClick}
                        onDragOver={event => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={handleDrop}
                        className={selectedSubstrate
                            ? 'relative min-h-[250px] flex-1 overflow-hidden border-2 border-data-atp bg-data-atp/10 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal'
                            : 'relative min-h-[250px] flex-1 overflow-hidden border border-app-border bg-app-surface p-3 text-left hover:border-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal'}
                        aria-label="Mitocôndria. Zona de destino para piruvato ou ácido graxo. Não recebe ATP; ela produz ATP a partir de ADP e fosfato"
                    >
                        <svg viewBox="0 0 520 250" className="absolute inset-0 h-full w-full" role="img" aria-label="Esquema da cadeia transportadora de elétrons">
                            <ellipse cx="260" cy="125" rx="232" ry="100" fill="#121214" stroke="#eab308" strokeWidth="3" />
                            <path d="M56 126 C95 55 135 196 180 110 C222 30 260 208 307 103 C352 10 395 195 463 118" fill="none" stroke="#52525b" strokeWidth="3" />
                            <rect x="112" y="95" width="42" height="58" fill="#18181b" stroke="#3b82f6" />
                            <rect x="196" y="95" width="42" height="58" fill="#18181b" stroke="#3b82f6" />
                            <rect x="280" y="95" width="42" height="58" fill="#18181b" stroke="#3b82f6" />
                            <rect x="364" y="95" width="42" height="58" fill="#18181b" stroke="#ef4444" />
                            <text x="133" y="128" fill="#e4e4e7" fontSize="10" textAnchor="middle">I</text>
                            <text x="217" y="128" fill="#e4e4e7" fontSize="10" textAnchor="middle">II</text>
                            <text x="301" y="128" fill="#e4e4e7" fontSize="10" textAnchor="middle">III</text>
                            <text x="385" y="128" fill="#e4e4e7" fontSize="10" textAnchor="middle">IV</text>
                            <path d="M134 87 L134 56 M301 87 L301 56 M385 87 L385 56" stroke="#8b5cf6" strokeWidth="2" />
                            <text x="260" y="48" fill="#8b5cf6" fontSize="10" textAnchor="middle">GRADIENTE DE H⁺</text>
                            <circle cx="448" cy="73" r="24" fill="#18181b" stroke="#eab308" strokeWidth="2" />
                            <text x="448" y="70" fill="#eab308" fontSize="9" textAnchor="middle">ATP</text>
                            <text x="448" y="82" fill="#eab308" fontSize="8" textAnchor="middle">SINTASE</text>
                            <text x="260" y="208" fill="#a1a1aa" fontSize="10" textAnchor="middle">ADP + Pi + gradiente de H⁺ → ATP</text>
                        </svg>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 border border-app-border bg-app-bg/95 px-3 py-2">
                            <span className="text-[10px] text-text-secondary">SOLTE AQUI OU CLIQUE APÓS SELECIONAR</span>
                            <span className="font-mono text-[10px] text-data-atp">ΔΨm {mitochondria.membranePotentialMv.toFixed(0)} mV</span>
                        </div>
                    </button>

                    <div className="mt-2 text-[10px] text-text-secondary" role="status" aria-live="polite">
                        {interactionMessage}
                    </div>
                </section>

                <section className="bg-app-surface p-3 lg:col-span-3" aria-label="Destinos do ATP">
                    <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                        03 · Alocação de ATP
                    </div>
                    <div className="space-y-2">
                        <LevelBar label="Fluxo ETC" value={mitochondria.etcFluxPercent} tone="oxygen" />
                        <LevelBar label="Saúde mitocondrial" value={mitochondria.healthPercent} tone={mitochondria.healthPercent < 45 ? 'critical' : 'normal'} />
                        <LevelBar label="ATP sintase" value={mitochondria.atpSynthaseFlux} max={100} tone="atp" />
                    </div>

                    <div className="mt-4 space-y-2">
                        <WireButton className="w-full text-left" onClick={() => onAllocateAtp('membrane')} disabled={cellular.cell.atpMmolL < 1.25 || cellular.damage.membrane <= 0.1}>
                            Membrana + bombas · {cellular.atpAllocation.ionPumps.toFixed(1)}
                        </WireButton>
                        <WireButton className="w-full text-left" onClick={() => onAllocateAtp('proteins')} disabled={cellular.cell.atpMmolL < 1.3 || cellular.damage.proteins <= 0.1}>
                            Reparo proteico · dano {cellular.damage.proteins.toFixed(0)}%
                        </WireButton>
                        <WireButton className="w-full text-left" onClick={() => onAllocateAtp('dna')} disabled={cellular.cell.atpMmolL < 1.5 || cellular.damage.dna <= 0.1}>
                            Reparo de DNA · dano {cellular.damage.dna.toFixed(0)}%
                        </WireButton>
                        <WireButton className="w-full text-left" onClick={() => onAllocateAtp('antioxidants')} disabled={cellular.cell.atpMmolL < 1.15 || (cellular.damage.antioxidantCapacity >= 98 && cellular.damage.oxidativeStress <= 5)}>
                            Antioxidantes · {cellular.damage.antioxidantCapacity.toFixed(0)}%
                        </WireButton>
                    </div>

                    <p className="mt-4 border-l-2 border-data-atp pl-2 text-[10px] leading-relaxed text-text-secondary">
                        ATP sai da mitocôndria para os consumidores celulares. Ele não é transportado para dentro dela por vesículas.
                    </p>
                </section>
            </div>
        </ClinicalPanel>
    );
}
