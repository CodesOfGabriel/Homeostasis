import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Droplets,
    Heart,
    Settings2,
    Shield,
    X,
    Zap,
} from 'lucide-react';
import type {
    AutomationKind,
    CellularState,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
} from '../../game/cellularTypes';
import type { PhysiologicalWarning, PhysiologyState } from '../../game/types';
import { useSimulationStore, type SystemicInterventions } from '../../game/simulationStore';
import {
    AUTOMATION_MAX_LEVEL,
    CELLULAR_OPTIMIZATION_BUDGET,
    getAutomationRecipe,
} from '../../game/cellularSimulation';
import {
    ClinicalPanel,
    LevelBar,
    MetricCard,
    type MetricTone,
    PanelHeading,
    WireButton,
} from './CellularPrimitives';
import { MachineryView, TissueView } from './CellularViews';

type CellularTab = 'cell' | 'machinery';
type TelemetrySection = 'tissue' | 'cell' | 'mitochondria';
type ToolPanel = 'automation' | 'interventions' | 'alerts';

interface CellularWorkbenchProps {
    onClose: () => void;
}

const TABS: Array<{ id: CellularTab; label: string; description: string }> = [
    {
        id: 'cell',
        label: 'TECIDO E CÉLULA',
        description: 'Coleta manual, perfusão e reservas intracelulares',
    },
    {
        id: 'machinery',
        label: 'MAQUINARIA',
        description: 'Produção, rotas bioquímicas e reparo',
    },
];

function rangeTone(
    value: number,
    normalMin: number,
    normalMax: number,
    criticalMin: number,
    criticalMax: number,
): MetricTone {
    if (value < criticalMin || value > criticalMax) return 'critical';
    if (value < normalMin || value > normalMax) return 'warning';
    return 'normal';
}

function TelemetryDialog({
    section,
    cellular,
    onClose,
}: {
    section: TelemetrySection;
    cellular: CellularState;
    onClose: () => void;
}) {
    const tissue = cellular.tissue;
    const cell = cellular.cell;
    const mitochondria = cellular.mitochondria;
    const titles: Record<TelemetrySection, string> = {
        tissue: 'Métricas completas do tecido e do líquido extracelular',
        cell: 'Métricas completas da célula e do líquido intracelular',
        mitochondria: 'Métricas completas da maquinaria mitocondrial',
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={titles[section]}>
            <ClinicalPanel className="max-h-[88vh] w-full max-w-5xl overflow-y-auto shadow-[0_30px_90px_rgba(0,0,0,0.7)]" ariaLabel={titles[section]}>
                <PanelHeading
                    eyebrow="Telemetria sob demanda"
                    title={titles[section]}
                    action={(
                        <button type="button" onClick={onClose} className="btn-wire flex h-9 w-9 items-center justify-center" aria-label="Fechar métricas">
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                />

                {section === 'tissue' && (
                    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-5">
                        <MetricCard label="Perfusão do tecido" value={tissue.perfusionPercent} unit="%" tone={rangeTone(tissue.perfusionPercent, 75, 115, 40, 145)} decimals={0} />
                        <MetricCard label="Pressão de oxigênio no tecido" value={tissue.oxygenMmHg} unit="mmHg" tone={rangeTone(tissue.oxygenMmHg, 25, 55, 10, 70)} />
                        <MetricCard label="Pressão de dióxido de carbono no tecido" value={tissue.carbonDioxideMmHg} unit="mmHg" tone={rangeTone(tissue.carbonDioxideMmHg, 40, 50, 28, 65)} />
                        <MetricCard label="Concentração de glicose no líquido extracelular" value={tissue.glucoseMmolL} unit="mmol/L" tone={rangeTone(tissue.glucoseMmolL, 3.9, 6.1, 2.5, 10)} />
                        <MetricCard label="Concentração de lactato no líquido extracelular" value={tissue.lactateMmolL} unit="mmol/L" tone={rangeTone(tissue.lactateMmolL, 0.5, 2, 0, 4)} />
                        <MetricCard label="Potencial hidrogeniônico do líquido extracelular" value={tissue.pH} tone={rangeTone(tissue.pH, 7.35, 7.45, 7.1, 7.65)} decimals={2} />
                        <MetricCard label="Osmolaridade do líquido extracelular" value={tissue.osmolarity} unit="mOsm/kg" tone={rangeTone(tissue.osmolarity, 280, 300, 260, 320)} decimals={0} />
                        <MetricCard label="Concentração extracelular de sódio" value={tissue.sodium} unit="mmol/L" tone={rangeTone(tissue.sodium, 135, 145, 125, 155)} />
                        <MetricCard label="Concentração extracelular de potássio" value={tissue.potassium} unit="mmol/L" tone={rangeTone(tissue.potassium, 3.5, 5, 2.5, 6.5)} />
                        <MetricCard label="Carga de resíduos metabólicos" value={tissue.wasteLoad} unit="%" tone={tissue.wasteLoad > 65 ? 'critical' : tissue.wasteLoad > 35 ? 'warning' : 'normal'} decimals={0} />
                    </div>
                )}

                {section === 'cell' && (
                    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-5">
                        <MetricCard label="Potencial hidrogeniônico intracelular" value={cell.pH} tone={rangeTone(cell.pH, 7, 7.3, 6.7, 7.55)} decimals={2} />
                        <MetricCard label="Osmolaridade do líquido intracelular" value={cell.osmolarity} unit="mOsm/kg" tone={rangeTone(cell.osmolarity, 280, 300, 255, 325)} decimals={0} />
                        <MetricCard label="Volume relativo da célula" value={cell.volumePercent} unit="%" tone={rangeTone(cell.volumePercent, 95, 105, 82, 118)} decimals={0} />
                        <MetricCard label="Potencial elétrico da membrana celular" value={cell.membranePotentialMv} unit="mV" tone={rangeTone(cell.membranePotentialMv, -90, -60, -105, -40)} decimals={0} />
                        <MetricCard label="Concentração intracelular de sódio" value={cell.sodium} unit="mmol/L" tone={rangeTone(cell.sodium, 8, 18, 3, 35)} />
                        <MetricCard label="Concentração intracelular de potássio" value={cell.potassium} unit="mmol/L" tone={rangeTone(cell.potassium, 120, 155, 90, 175)} decimals={0} />
                        <MetricCard label="Concentração intracelular de cálcio" value={cell.calciumNm} unit="nM" tone={rangeTone(cell.calciumNm, 70, 150, 30, 500)} decimals={0} />
                        <MetricCard label="Concentração intracelular de adenosina trifosfato" value={cell.atpMmolL} unit="mmol/L" tone={cell.atpMmolL < 1.2 ? 'critical' : cell.atpMmolL < 2.2 ? 'warning' : 'atp'} decimals={2} />
                        <MetricCard label="Concentração intracelular de adenosina difosfato" value={cell.adpMmolL} unit="mmol/L" tone="neutral" decimals={2} />
                        <MetricCard label="Viabilidade da célula" value={cell.viabilityPercent} unit="%" tone={cell.viabilityPercent < 50 ? 'critical' : cell.viabilityPercent < 80 ? 'warning' : 'normal'} decimals={0} />
                    </div>
                )}

                {section === 'mitochondria' && (
                    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-5">
                        <MetricCard label="Potencial elétrico da membrana mitocondrial" value={mitochondria.membranePotentialMv} unit="mV" tone={rangeTone(mitochondria.membranePotentialMv, -180, -120, -205, -85)} decimals={0} />
                        <MetricCard label="Fluxo da cadeia transportadora de elétrons" value={mitochondria.etcFluxPercent} unit="%" tone={mitochondria.etcFluxPercent < 20 ? 'warning' : 'oxygen'} decimals={0} />
                        <MetricCard label="Fluxo da enzima adenosina trifosfato sintase" value={mitochondria.atpSynthaseFlux} unit="%" tone="atp" decimals={0} />
                        <MetricCard label="Consumo mitocondrial de oxigênio" value={mitochondria.oxygenConsumption} unit="unidades/min" tone="oxygen" decimals={2} />
                        <MetricCard label="Integridade da maquinaria mitocondrial" value={mitochondria.healthPercent} unit="%" tone={mitochondria.healthPercent < 45 ? 'critical' : mitochondria.healthPercent < 75 ? 'warning' : 'normal'} decimals={0} />
                        <MetricCard label="Reserva de piruvato" value={cellular.pools.pyruvate} unit="pacotes" tone="neutral" decimals={1} />
                        <MetricCard label="Adenosina trifosfato produzida" value={cellular.totalAtpProduced} unit="mmol/L" tone="atp" decimals={2} />
                        <MetricCard label="Adenosina trifosfato consumida" value={cellular.totalAtpSpent} unit="mmol/L" tone="warning" decimals={2} />
                        <MetricCard label="Estresse por espécies reativas de oxigênio" value={cellular.damage.oxidativeStress} unit="%" tone={cellular.damage.oxidativeStress > 65 ? 'critical' : cellular.damage.oxidativeStress > 35 ? 'warning' : 'normal'} decimals={0} />
                        <MetricCard label="Capacidade dos sistemas antioxidantes" value={cellular.damage.antioxidantCapacity} unit="%" tone={cellular.damage.antioxidantCapacity < 30 ? 'critical' : cellular.damage.antioxidantCapacity < 55 ? 'warning' : 'normal'} decimals={0} />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 border-t border-app-border p-4 sm:grid-cols-2">
                    <LevelBar label="Viabilidade celular" value={cell.viabilityPercent} tone={cell.viabilityPercent < 50 ? 'critical' : cell.viabilityPercent < 80 ? 'warning' : 'normal'} />
                    <LevelBar label="Dano acumulado na membrana" value={cellular.damage.membrane} tone={cellular.damage.membrane > 65 ? 'critical' : 'warning'} />
                </div>
            </ClinicalPanel>
        </div>
    );
}

function RangeControl({
    id,
    label,
    value,
    unit,
    min,
    max,
    step,
    measured,
    onChange,
}: {
    id: string;
    label: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    step: number;
    measured: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="border border-app-border bg-app-bg p-2">
            <label htmlFor={id} className="flex items-start justify-between gap-3 text-[9px] uppercase tracking-wider text-text-secondary">
                <span>{label}</span>
                <span className="flex-none font-mono text-text-primary">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
            </label>
            <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} className="mt-2 h-6 w-full cursor-pointer accent-data-atp" />
            <div className="text-right text-[8px] text-text-secondary">Valor observado: {measured}</div>
        </div>
    );
}

function SystemicControls({
    physiology,
    interventions,
    onIngestWater,
    onHeartRateTarget,
    onVentilationDrive,
    onRenalReabsorption,
}: {
    physiology: PhysiologyState;
    interventions: SystemicInterventions;
    onIngestWater: (ml: number) => void;
    onHeartRateTarget: (bpm: number) => void;
    onVentilationDrive: (percent: number) => void;
    onRenalReabsorption: (percent: number) => void;
}) {
    return (
        <ClinicalPanel ariaLabel="Intervenções sistêmicas">
            <PanelHeading eyebrow="Controles" title="Intervenções sistêmicas" action={<Activity className="h-4 w-4 text-text-secondary" aria-hidden="true" />} />
            <div className="space-y-2 p-3">
                <div className="border border-app-border bg-app-bg p-2">
                    <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-text-secondary">
                        <span className="flex items-center gap-2"><Droplets className="h-4 w-4 text-data-co2" aria-hidden="true" />Ingestão de água</span>
                        <span className="font-mono text-text-primary">{interventions.pendingWaterMl.toFixed(0)} mL no estômago</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <WireButton onClick={() => onIngestWater(250)} disabled={interventions.pendingWaterMl >= 2000}>Ingerir 250 mL</WireButton>
                        <WireButton onClick={() => onIngestWater(500)} disabled={interventions.pendingWaterMl >= 2000}>Ingerir 500 mL</WireButton>
                    </div>
                </div>
                <RangeControl id="cellular-heart-rate-target" label="Frequência cardíaca alvo" value={interventions.heartRateTarget} unit="batimentos/min" min={45} max={180} step={1} measured={`${physiology.cardiovascular.heartRate.toFixed(0)} batimentos/min`} onChange={onHeartRateTarget} />
                <RangeControl id="cellular-ventilation-drive" label="Comando ventilatório" value={interventions.ventilationDrive} unit="%" min={50} max={180} step={1} measured={`${physiology.respiratory.respiratoryRate.toFixed(0)} respirações/min`} onChange={onVentilationDrive} />
                <RangeControl id="cellular-renal-reabsorption" label="Reabsorção renal de água" value={interventions.renalWaterReabsorption} unit="%" min={98.5} max={99.8} step={0.1} measured={`${physiology.nutrients.hydration.toFixed(2)} litros corporais`} onChange={onRenalReabsorption} />
            </div>
        </ClinicalPanel>
    );
}

function AlertsPanel({ warnings }: { warnings: PhysiologicalWarning[] }) {
    return (
        <ClinicalPanel ariaLabel="Alertas fisiológicos">
            <PanelHeading eyebrow="Decisões" title="Alertas e recomendações" action={<AlertTriangle className="h-4 w-4 text-status-warning" aria-hidden="true" />} />
            <div className="space-y-2 p-3">
                {warnings.length === 0 ? (
                    <div className="border border-status-normal/30 bg-status-normal/5 p-3 text-[10px] text-status-normal">Nenhum alerta ativo.</div>
                ) : warnings.slice(0, 5).map(warning => (
                    <div key={warning.parameter} className="border border-status-warning/40 bg-app-bg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-status-warning">{warning.parameter}</div>
                        <div className="mt-1 font-mono text-xs text-text-primary">{warning.currentValue.toFixed(2)}</div>
                        <p className="mt-2 text-[9px] leading-relaxed text-text-secondary">{warning.recommendation}</p>
                    </div>
                ))}
            </div>
        </ClinicalPanel>
    );
}

const AUTOMATION_DETAILS: Record<AutomationKind, { label: string; description: string; benefit: string }> = {
    transporters: {
        label: 'Transportadores de membrana',
        description: 'Consome glicose e aminoácidos para ampliar a captação automática.',
        benefit: 'Aumenta o fluxo automático de todos os substratos.',
    },
    mitochondrialShuttle: {
        label: 'Transporte mitocondrial',
        description: 'Consome ácido graxo e aminoácidos para acelerar a oxidação.',
        benefit: 'Aumenta o processamento automático de piruvato e lipídios.',
    },
    repair: {
        label: 'Maquinaria de reparo',
        description: 'Consome glicose e aminoácidos para manter estruturas celulares.',
        benefit: 'Prioriza automaticamente membrana, proteínas e material genético.',
    },
};

function AutomationPanel({ cellular, onPurchase }: { cellular: CellularState; onPurchase: (kind: AutomationKind) => void }) {
    const kinds: AutomationKind[] = ['transporters', 'mitochondrialShuttle', 'repair'];
    const usedBudget = Object.values(cellular.automation).reduce((sum, level) => sum + level, 0);
    const substrateNames: Record<SubstrateKind, string> = {
        glucose: 'Glicose',
        oxygen: 'Oxigênio',
        fattyAcid: 'Ácido graxo',
        aminoAcid: 'Aminoácido',
    };

    return (
        <ClinicalPanel ariaLabel="Construção e automação celular">
            <PanelHeading eyebrow="Progressão" title="Construção de maquinaria" action={<Shield className="h-4 w-4 text-data-atp" aria-hidden="true" />} />
            <div className="p-3">
                <div className="mb-3 border border-app-border bg-app-bg p-3">
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-text-secondary">
                        <span>Orçamento de especialização</span>
                        <strong className="font-mono font-medium text-data-atp">{usedBudget} / {CELLULAR_OPTIMIZATION_BUDGET}</strong>
                    </div>
                    <div className="mt-2 grid grid-cols-8 gap-1" aria-label={`${usedBudget} de ${CELLULAR_OPTIMIZATION_BUDGET} melhorias utilizadas`}>
                        {Array.from({ length: CELLULAR_OPTIMIZATION_BUDGET }, (_, index) => (
                            <span key={index} className={index < usedBudget ? 'h-1.5 bg-data-atp' : 'h-1.5 bg-app-border'} />
                        ))}
                    </div>
                    <p className="mt-2 text-[9px] leading-relaxed text-text-secondary">Cada rota aceita quatro níveis, mas a célula só comporta oito melhorias no total.</p>
                </div>

                <div className="space-y-2">
                    {kinds.map(kind => {
                        const level = cellular.automation[kind];
                        const detail = AUTOMATION_DETAILS[kind];
                        const recipe = getAutomationRecipe(kind, level);
                        const budgetFull = usedBudget >= CELLULAR_OPTIMIZATION_BUDGET;
                        const maxed = level >= AUTOMATION_MAX_LEVEL;
                        const atpEnough = cellular.cell.atpMmolL - recipe.atp >= 1;
                        const substrateEntries = Object.entries(recipe.substrates) as Array<[SubstrateKind, number]>;
                        const substratesEnough = substrateEntries.every(([substrate, amount]) => cellular.pools.captured[substrate] >= amount);
                        const canBuild = !budgetFull && !maxed && atpEnough && substratesEnough;

                        return (
                            <div key={kind} className="border border-app-border bg-app-bg p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-primary">{detail.label}</div>
                                        <p className="mt-1 text-[9px] leading-relaxed text-text-secondary">{detail.description}</p>
                                    </div>
                                    <span className="flex-none font-mono text-[9px] text-data-atp">Nível {level} / {AUTOMATION_MAX_LEVEL}</span>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    {Array.from({ length: AUTOMATION_MAX_LEVEL }, (_, index) => (
                                        <span key={index} className={index < level ? 'h-1.5 flex-1 bg-data-atp' : 'h-1.5 flex-1 bg-app-border'} />
                                    ))}
                                </div>
                                <div className="mt-2 text-[9px] text-text-secondary">{detail.benefit}</div>
                                {!maxed && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        <span className={atpEnough ? 'border border-status-normal/30 px-1.5 py-1 text-[8px] text-status-normal' : 'border border-status-warning/40 px-1.5 py-1 text-[8px] text-status-warning'}>Energia {recipe.atp.toFixed(2)}</span>
                                        {substrateEntries.map(([substrate, amount]) => {
                                            const enough = cellular.pools.captured[substrate] >= amount;
                                            return <span key={substrate} className={enough ? 'border border-status-normal/30 px-1.5 py-1 text-[8px] text-status-normal' : 'border border-status-warning/40 px-1.5 py-1 text-[8px] text-status-warning'}>{substrateNames[substrate]} {amount.toFixed(2)}</span>;
                                        })}
                                    </div>
                                )}
                                <WireButton className="mt-3 w-full" onClick={() => onPurchase(kind)} disabled={!canBuild}>
                                    {maxed ? 'Rota no limite máximo' : budgetFull ? 'Limite da célula atingido' : `Construir nível ${level + 1}`}
                                </WireButton>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ClinicalPanel>
    );
}

export function CellularWorkbench({ onClose }: CellularWorkbenchProps) {
    const [activeTab, setActiveTab] = useState<CellularTab>('cell');
    const [toolPanel, setToolPanel] = useState<ToolPanel>('automation');
    const [telemetrySection, setTelemetrySection] = useState<TelemetrySection | null>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const cellular = useSimulationStore(state => state.cellular);
    const interventions = useSimulationStore(state => state.interventions);
    const physiology = useSimulationStore(state => state.physiology);
    const activeWarnings = useSimulationStore(state => state.activeWarnings);
    const captureCellularSubstrate = useSimulationStore(state => state.captureCellularSubstrate);
    const runCellularGlycolysis = useSimulationStore(state => state.runCellularGlycolysis);
    const oxidizeCellularSubstrate = useSimulationStore(state => state.oxidizeCellularSubstrate);
    const allocateCellularAtp = useSimulationStore(state => state.allocateCellularAtp);
    const purchaseCellularAutomation = useSimulationStore(state => state.purchaseCellularAutomation);
    const ingestWater = useSimulationStore(state => state.ingestWater);
    const setHeartRateTarget = useSimulationStore(state => state.setHeartRateTarget);
    const setVentilationDrive = useSimulationStore(state => state.setVentilationDrive);
    const setRenalWaterReabsorption = useSimulationStore(state => state.setRenalWaterReabsorption);

    useEffect(() => {
        const closeOnEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (telemetrySection) setTelemetrySection(null);
            else onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose, telemetrySection]);

    const selectTab = (tab: CellularTab, focus = false) => {
        setActiveTab(tab);
        if (tab === 'machinery') setToolPanel('automation');
        if (focus) {
            const index = TABS.findIndex(candidate => candidate.id === tab);
            requestAnimationFrame(() => tabRefs.current[index]?.focus());
        }
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? TABS.length - 1
                : event.key === 'ArrowRight'
                    ? (index + 1) % TABS.length
                    : (index - 1 + TABS.length) % TABS.length;
        selectTab(TABS[nextIndex].id, true);
    };

    return (
        <div id="cellular-workbench" className="relative flex h-full min-h-0 flex-col overflow-hidden bg-app-bg text-text-primary" aria-label="Microscopia celular">
            <header className="flex min-h-12 items-center gap-3 border-b border-app-border/80 bg-app-surface/90 px-3">
                <WireButton onClick={onClose} aria-label="Voltar ao painel sistêmico" className="flex items-center gap-2 px-3">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar
                </WireButton>
                <div className="min-w-0">
                    <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-dim">Microscopia celular</div>
                    <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-text-primary">{cellular.lastEvent}</div>
                </div>
                <div className="ml-auto hidden items-center gap-4 sm:flex">
                    <span className="flex items-center gap-2 text-[9px] text-text-dim"><Heart className="h-4 w-4 text-data-o2" aria-hidden="true" /><strong className="font-mono text-sm font-medium text-data-o2">{physiology.cardiovascular.heartRate.toFixed(0)}</strong> bpm</span>
                    <span className="flex items-center gap-2 text-[9px] text-text-dim"><Zap className="h-4 w-4 text-data-atp" aria-hidden="true" /><strong className="font-mono text-sm font-medium text-data-atp">{cellular.cell.atpMmolL.toFixed(2)}</strong> ATP</span>
                </div>
            </header>

            <div className="flex flex-col border-b border-app-border/80 bg-app-panel/90 xl:flex-row xl:items-stretch">
                <nav className="flex min-w-0 flex-1 overflow-x-auto p-1" role="tablist" aria-label="Etapas da operação celular">
                    {TABS.map((tab, index) => {
                        const selected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                ref={element => { tabRefs.current[index] = element; }}
                                id={`cellular-tab-${tab.id}`}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-controls={`cellular-panel-${tab.id}`}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => selectTab(tab.id)}
                                onKeyDown={event => handleTabKeyDown(event, index)}
                                className={selected
                                    ? 'min-h-12 min-w-52 flex-1 border border-app-border/70 bg-data-atp/10 px-4 py-2 text-left text-data-atp'
                                    : 'min-h-12 min-w-52 flex-1 border border-transparent px-4 py-2 text-left text-text-dim hover:border-app-border/70 hover:bg-app-hover/60 hover:text-text-primary'}
                            >
                                <span className="block text-[10px] font-semibold tracking-[0.18em]">{tab.label}</span>
                                <span className="block text-[8px] text-text-dim">{tab.description}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="flex flex-none items-center gap-2 border-t border-app-border/80 p-2 xl:border-l xl:border-t-0" aria-label="Abrir métricas completas">
                    <button type="button" className="btn-wire min-h-9 px-3" onClick={() => setTelemetrySection('tissue')}><BarChart3 className="mr-2 inline h-3.5 w-3.5" />Tecido</button>
                    <button type="button" className="btn-wire min-h-9 px-3" onClick={() => setTelemetrySection('cell')}><BarChart3 className="mr-2 inline h-3.5 w-3.5" />Célula</button>
                    <button type="button" className="btn-wire min-h-9 px-3" onClick={() => setTelemetrySection('mitochondria')}><BarChart3 className="mr-2 inline h-3.5 w-3.5" />Mitocôndria</button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-hidden">
                <div className="grid min-h-full grid-cols-1 gap-px bg-app-border xl:h-full xl:grid-cols-[minmax(0,1fr)_330px]">
                    <main className="min-w-0 bg-app-bg xl:min-h-0">
                        <div id="cellular-panel-cell" role="tabpanel" aria-labelledby="cellular-tab-cell" hidden={activeTab !== 'cell'} className="h-full">
                            {activeTab === 'cell' && <TissueView cellular={cellular} onCapture={captureCellularSubstrate} />}
                        </div>
                        <div id="cellular-panel-machinery" role="tabpanel" aria-labelledby="cellular-tab-machinery" hidden={activeTab !== 'machinery'} className="h-full">
                            {activeTab === 'machinery' && (
                                <MachineryView cellular={cellular} onGlycolysis={runCellularGlycolysis} onOxidize={(kind: OxidationSubstrate) => oxidizeCellularSubstrate(kind)} onAllocateAtp={(target: RepairTarget) => allocateCellularAtp(target)} />
                            )}
                        </div>
                    </main>

                    <aside className="min-w-0 bg-app-surface xl:min-h-0 xl:overflow-y-auto" aria-label="Ferramentas celulares">
                        <div className="sticky top-0 z-10 grid grid-cols-3 gap-px border-b border-app-border bg-app-border p-px">
                            <button type="button" className={toolPanel === 'automation' ? 'bg-data-atp/15 p-2 text-data-atp' : 'bg-app-panel p-2 text-text-secondary hover:bg-app-hover'} onClick={() => setToolPanel('automation')}><Shield className="mx-auto h-4 w-4" /><span className="mt-1 block text-[8px] uppercase">Automação</span></button>
                            <button type="button" className={toolPanel === 'interventions' ? 'bg-data-atp/15 p-2 text-data-atp' : 'bg-app-panel p-2 text-text-secondary hover:bg-app-hover'} onClick={() => setToolPanel('interventions')}><Settings2 className="mx-auto h-4 w-4" /><span className="mt-1 block text-[8px] uppercase">Intervenções</span></button>
                            <button type="button" className={toolPanel === 'alerts' ? 'bg-data-atp/15 p-2 text-data-atp' : 'bg-app-panel p-2 text-text-secondary hover:bg-app-hover'} onClick={() => setToolPanel('alerts')}><AlertTriangle className="mx-auto h-4 w-4" /><span className="mt-1 block text-[8px] uppercase">Alertas</span></button>
                        </div>
                        {toolPanel === 'automation' && <AutomationPanel cellular={cellular} onPurchase={(kind: AutomationKind) => purchaseCellularAutomation(kind)} />}
                        {toolPanel === 'interventions' && <SystemicControls physiology={physiology} interventions={interventions} onIngestWater={ingestWater} onHeartRateTarget={setHeartRateTarget} onVentilationDrive={setVentilationDrive} onRenalReabsorption={setRenalWaterReabsorption} />}
                        {toolPanel === 'alerts' && <AlertsPanel warnings={activeWarnings} />}
                    </aside>
                </div>
            </div>

            {telemetrySection && <TelemetryDialog section={telemetrySection} cellular={cellular} onClose={() => setTelemetrySection(null)} />}
        </div>
    );
}
