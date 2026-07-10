import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Activity, AlertTriangle, ArrowLeft, Droplets, Heart, Shield, Wind, Zap } from 'lucide-react';
import type {
    AutomationKind,
    CellularState,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
} from '../../game/cellularTypes';
import type { PhysiologyState } from '../../game/types';
import type { PhysiologicalWarning } from '../../game/types';
import { useSimulationStore, type SystemicInterventions } from '../../game/simulationStore';
import {
    ClinicalPanel,
    LevelBar,
    MetricCard,
    type MetricTone,
    PanelHeading,
    WireButton,
} from './CellularPrimitives';
import { IntracellularView, MachineryView, TissueView } from './CellularViews';

type CellularTab = 'tissue' | 'intracellular' | 'machinery';

interface CellularWorkbenchProps {
    onClose: () => void;
}

const TABS: Array<{ id: CellularTab; label: string; description: string }> = [
    { id: 'tissue', label: 'TECIDO', description: 'Perfusão, LEC e troca capilar' },
    { id: 'intracellular', label: 'INTRACELULAR', description: 'LIC, membrana e organelas' },
    { id: 'machinery', label: 'MAQUINARIA', description: 'Glicólise, mitocôndria e reparo' },
];

function rangeTone(value: number, normalMin: number, normalMax: number, criticalMin: number, criticalMax: number): MetricTone {
    if (value < criticalMin || value > criticalMax) return 'critical';
    if (value < normalMin || value > normalMax) return 'warning';
    return 'normal';
}

function eventToneClass(severity: 'info' | 'warning' | 'critical'): string {
    if (severity === 'critical') return 'border-status-critical text-status-critical';
    if (severity === 'warning') return 'border-status-warning text-status-warning';
    return 'border-status-optimal text-status-optimal';
}

function MetricsRail({ tab, cellular }: { tab: CellularTab; cellular: CellularState }) {
    const tissue = cellular.tissue;
    const cell = cellular.cell;
    const mitochondria = cellular.mitochondria;

    return (
        <ClinicalPanel
            className="min-w-0 lg:col-span-3 xl:col-span-2 xl:min-h-0 xl:overflow-y-auto"
            ariaLabel="Marcadores locais"
        >
            <PanelHeading eyebrow="Telemetria local" title={tab === 'tissue' ? 'LEC / tecido' : tab === 'intracellular' ? 'LIC / célula' : 'Mitocôndria'} />

            {tab === 'tissue' && (
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-2">
                    <MetricCard label="Perfusão" value={tissue.perfusionPercent} unit="%" tone={rangeTone(tissue.perfusionPercent, 75, 115, 40, 145)} decimals={0} />
                    <MetricCard label="PO₂ tecidual" value={tissue.oxygenMmHg} unit="mmHg" tone={rangeTone(tissue.oxygenMmHg, 25, 55, 10, 70)} />
                    <MetricCard label="PCO₂ tecidual" value={tissue.carbonDioxideMmHg} unit="mmHg" tone={rangeTone(tissue.carbonDioxideMmHg, 40, 50, 28, 65)} />
                    <MetricCard label="Glicose LEC" value={tissue.glucoseMmolL} unit="mmol/L" tone={rangeTone(tissue.glucoseMmolL, 3.9, 6.1, 2.5, 10)} />
                    <MetricCard label="Lactato LEC" value={tissue.lactateMmolL} unit="mmol/L" tone={rangeTone(tissue.lactateMmolL, 0.5, 2.0, 0, 4)} />
                    <MetricCard label="pH LEC" value={tissue.pH} tone={rangeTone(tissue.pH, 7.35, 7.45, 7.1, 7.65)} decimals={2} />
                    <MetricCard label="Osm LEC" value={tissue.osmolarity} unit="mOsm/kg" tone={rangeTone(tissue.osmolarity, 280, 300, 260, 320)} decimals={0} />
                    <MetricCard label="Na⁺ LEC" value={tissue.sodium} unit="mmol/L" tone={rangeTone(tissue.sodium, 135, 145, 125, 155)} />
                    <MetricCard label="K⁺ LEC" value={tissue.potassium} unit="mmol/L" tone={rangeTone(tissue.potassium, 3.5, 5, 2.5, 6.5)} />
                    <MetricCard label="Resíduos" value={tissue.wasteLoad} unit="%" tone={tissue.wasteLoad > 65 ? 'critical' : tissue.wasteLoad > 35 ? 'warning' : 'normal'} decimals={0} />
                </div>
            )}

            {tab === 'intracellular' && (
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-2">
                    <MetricCard label="pH LIC" value={cell.pH} tone={rangeTone(cell.pH, 7.0, 7.3, 6.7, 7.55)} decimals={2} />
                    <MetricCard label="Osm LIC" value={cell.osmolarity} unit="mOsm/kg" tone={rangeTone(cell.osmolarity, 280, 300, 255, 325)} decimals={0} />
                    <MetricCard label="Volume" value={cell.volumePercent} unit="%" tone={rangeTone(cell.volumePercent, 95, 105, 82, 118)} decimals={0} />
                    <MetricCard label="Potencial" value={cell.membranePotentialMv} unit="mV" tone={rangeTone(cell.membranePotentialMv, -90, -60, -105, -40)} decimals={0} />
                    <MetricCard label="Na⁺ LIC" value={cell.sodium} unit="mmol/L" tone={rangeTone(cell.sodium, 8, 18, 3, 35)} />
                    <MetricCard label="K⁺ LIC" value={cell.potassium} unit="mmol/L" tone={rangeTone(cell.potassium, 120, 155, 90, 175)} decimals={0} />
                    <MetricCard label="Ca²⁺ LIC" value={cell.calciumNm} unit="nM" tone={rangeTone(cell.calciumNm, 70, 150, 30, 500)} decimals={0} />
                    <MetricCard label="ATP LIC" value={cell.atpMmolL} unit="mmol/L" tone={cell.atpMmolL < 1.2 ? 'critical' : cell.atpMmolL < 2.2 ? 'warning' : 'atp'} decimals={2} />
                    <MetricCard label="ADP LIC" value={cell.adpMmolL} unit="mmol/L" tone="neutral" decimals={2} />
                    <MetricCard label="Viabilidade" value={cell.viabilityPercent} unit="%" tone={cell.viabilityPercent < 50 ? 'critical' : cell.viabilityPercent < 80 ? 'warning' : 'normal'} decimals={0} />
                </div>
            )}

            {tab === 'machinery' && (
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-2">
                    <MetricCard label="ΔΨ mitocondrial" value={mitochondria.membranePotentialMv} unit="mV" tone={rangeTone(mitochondria.membranePotentialMv, -180, -120, -205, -85)} decimals={0} />
                    <MetricCard label="Fluxo ETC" value={mitochondria.etcFluxPercent} unit="%" tone={mitochondria.etcFluxPercent < 20 ? 'warning' : 'oxygen'} decimals={0} />
                    <MetricCard label="ATP sintase" value={mitochondria.atpSynthaseFlux} unit="%" tone="atp" decimals={0} />
                    <MetricCard label="Consumo O₂" value={mitochondria.oxygenConsumption} unit="u/min" tone="oxygen" decimals={2} />
                    <MetricCard label="Saúde mitocondrial" value={mitochondria.healthPercent} unit="%" tone={mitochondria.healthPercent < 45 ? 'critical' : mitochondria.healthPercent < 75 ? 'warning' : 'normal'} decimals={0} />
                    <MetricCard label="Piruvato" value={cellular.pools.pyruvate} unit="pacotes" tone="neutral" decimals={0} />
                    <MetricCard label="ATP produzido" value={cellular.totalAtpProduced} unit="mmol/L" tone="atp" decimals={1} />
                    <MetricCard label="ATP consumido" value={cellular.totalAtpSpent} unit="mmol/L" tone="warning" decimals={1} />
                    <MetricCard label="Estresse ROS" value={cellular.damage.oxidativeStress} unit="%" tone={cellular.damage.oxidativeStress > 65 ? 'critical' : cellular.damage.oxidativeStress > 35 ? 'warning' : 'normal'} decimals={0} />
                    <MetricCard label="Antioxidantes" value={cellular.damage.antioxidantCapacity} unit="%" tone={cellular.damage.antioxidantCapacity < 30 ? 'critical' : cellular.damage.antioxidantCapacity < 55 ? 'warning' : 'normal'} decimals={0} />
                </div>
            )}

            <div className="space-y-3 border-t border-app-border p-3">
                <LevelBar label="Viabilidade celular" value={cell.viabilityPercent} tone={cell.viabilityPercent < 50 ? 'critical' : cell.viabilityPercent < 80 ? 'warning' : 'normal'} />
                <LevelBar label="Dano de membrana" value={cellular.damage.membrane} tone={cellular.damage.membrane > 65 ? 'critical' : 'warning'} />
            </div>
        </ClinicalPanel>
    );
}

interface SystemicControlsProps {
    physiology: PhysiologyState;
    interventions: SystemicInterventions;
    onIngestWater: (ml: number) => void;
    onHeartRateTarget: (bpm: number) => void;
    onVentilationDrive: (percent: number) => void;
    onRenalReabsorption: (percent: number) => void;
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
            <label htmlFor={id} className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-text-secondary">
                <span>{label}</span>
                <span className="font-mono text-text-primary">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
            </label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={event => onChange(Number(event.target.value))}
                className="mt-2 h-6 w-full cursor-pointer accent-data-atp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal"
            />
            <div className="flex justify-between gap-2 text-[9px] text-text-secondary">
                <span>{min}</span>
                <span className="text-right">OBSERVADO: {measured}</span>
                <span>{max}</span>
            </div>
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
}: SystemicControlsProps) {
    return (
        <ClinicalPanel ariaLabel="Intervenções sistêmicas">
            <PanelHeading eyebrow="Causa sistêmica" title="Intervenções" action={<Activity className="h-4 w-4 text-text-secondary" aria-hidden="true" />} />
            <div className="space-y-2 p-3">
                <div className="border border-app-border bg-app-bg p-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-secondary">
                            <Droplets className="h-4 w-4 text-data-co2" aria-hidden="true" />
                            Ingestão hídrica
                        </div>
                        <span className="font-mono text-[10px] text-text-primary">
                            PENDENTE {interventions.pendingWaterMl.toFixed(0)} mL
                        </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <WireButton onClick={() => onIngestWater(250)} disabled={interventions.pendingWaterMl >= 2000}>+250 mL</WireButton>
                        <WireButton onClick={() => onIngestWater(500)} disabled={interventions.pendingWaterMl >= 2000}>+500 mL</WireButton>
                    </div>
                    <div className="mt-2 text-[9px] text-text-secondary">
                        Água corporal {physiology.nutrients.hydration.toFixed(1)} L · absorção gastrointestinal gradual
                    </div>
                </div>

                <RangeControl
                    id="cellular-heart-rate-target"
                    label="Alvo cronotrópico"
                    value={interventions.heartRateTarget}
                    unit="bpm"
                    min={45}
                    max={180}
                    step={1}
                    measured={`${physiology.cardiovascular.heartRate.toFixed(0)} bpm`}
                    onChange={onHeartRateTarget}
                />
                <RangeControl
                    id="cellular-ventilation-drive"
                    label="Drive ventilatório"
                    value={interventions.ventilationDrive}
                    unit="%"
                    min={50}
                    max={180}
                    step={1}
                    measured={`${physiology.respiratory.respiratoryRate.toFixed(0)} rpm`}
                    onChange={onVentilationDrive}
                />
                <RangeControl
                    id="cellular-renal-reabsorption"
                    label="Reabsorção renal de água"
                    value={interventions.renalWaterReabsorption}
                    unit="%"
                    min={98.5}
                    max={99.8}
                    step={0.1}
                    measured={`${physiology.nutrients.hydration.toFixed(1)} L corporais`}
                    onChange={onRenalReabsorption}
                />

                <p className="border-l-2 border-status-optimal pl-2 text-[10px] leading-relaxed text-text-secondary">
                    Os controles são intervenções. FC, pH, osmolaridade e perfusão respondem com atraso fisiológico.
                </p>
            </div>
        </ClinicalPanel>
    );
}

interface WarningResponsePanelProps {
    activeWarnings: PhysiologicalWarning[];
    physiology: PhysiologyState;
    interventions: SystemicInterventions;
    activeTab: CellularTab;
    onClose: () => void;
    onSelectTab: (tab: CellularTab, focus?: boolean) => void;
    onHeartRateTarget: (bpm: number) => void;
    onVentilationDrive: (percent: number) => void;
    onIngestWater: (ml: number) => void;
}

function WarningResponsePanel({
    activeWarnings,
    physiology,
    interventions,
    activeTab,
    onClose,
    onSelectTab,
    onHeartRateTarget,
    onVentilationDrive,
    onIngestWater,
}: WarningResponsePanelProps) {
    const responses = activeWarnings.slice(0, 4).map(warning => buildWarningResponse({
        warning,
        physiology,
        interventions,
        activeTab,
        onClose,
        onSelectTab,
        onHeartRateTarget,
        onVentilationDrive,
        onIngestWater,
    }));

    return (
        <ClinicalPanel ariaLabel="Respostas clínicas disponíveis">
            <PanelHeading eyebrow="Resposta guiada" title="O que fazer agora" action={<AlertTriangle className="h-4 w-4 text-status-warning" aria-hidden="true" />} />
            <div className="space-y-2 p-3">
                {responses.length === 0 ? (
                    <div className="border border-app-border bg-app-bg p-3 text-[10px] text-text-secondary">
                        Sem alertas ativos. A microfisiologia está estável e não exige intervenção imediata.
                    </div>
                ) : responses.map(response => (
                    <div key={response.id} className={`border p-3 ${response.borderClass} bg-app-bg`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                                    {response.parameter}
                                </div>
                                <div className="mt-1 text-xs text-text-primary">
                                    {response.title}
                                </div>
                            </div>
                            <span className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-wider ${response.badgeClass}`}>
                                {response.scopeLabel}
                            </span>
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">
                            {response.detail}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {response.available ? (
                                <WireButton active className="min-h-9" onClick={response.onActivate}>
                                    {response.buttonLabel}
                                </WireButton>
                            ) : (
                                <WireButton className="min-h-9" onClick={response.onActivate}>
                                    {response.buttonLabel}
                                </WireButton>
                            )}
                            <span className="text-[9px] text-text-secondary">
                                {response.hint}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </ClinicalPanel>
    );
}

interface WarningResponse {
    id: string;
    parameter: string;
    title: string;
    detail: string;
    hint: string;
    buttonLabel: string;
    scopeLabel: string;
    available: boolean;
    borderClass: string;
    badgeClass: string;
    onActivate: () => void;
}

type WarningResponseBuilderInput = Omit<WarningResponsePanelProps, 'activeWarnings'> & {
    warning: PhysiologicalWarning;
};

function buildWarningResponse({
    warning,
    physiology,
    interventions,
    activeTab,
    onClose,
    onSelectTab,
    onHeartRateTarget,
    onVentilationDrive,
    onIngestWater,
}: WarningResponseBuilderInput): WarningResponse {
    const acidBase = physiology.acidBase;
    const cardio = physiology.cardiovascular;

    if (warning.parameter === 'pH sanguíneo') {
        const acidosis = acidBase.pH < 7.35;
        const actionLabel = acidosis ? 'Aumentar ventilação +15%' : 'Reduzir ventilação -15%';
        const nextDrive = acidosis
            ? Math.min(180, interventions.ventilationDrive + 15)
            : Math.max(50, interventions.ventilationDrive - 15);
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: acidosis ? 'Corrigir acidose com suporte ventilatório' : 'Corrigir alcalose reduzindo hiperventilação',
            detail: warning.recommendation,
            hint: acidosis ? 'Alvo ventilatório disponível nesta tela.' : 'Menor drive ventilatório reduz PaCO₂ e tende a normalizar o pH.',
            buttonLabel: actionLabel,
            scopeLabel: 'Local',
            available: true,
            borderClass: acidosis ? 'border-status-critical/60' : 'border-status-warning/60',
            badgeClass: acidosis ? 'border-status-critical/60 text-status-critical' : 'border-status-warning/60 text-status-warning',
            onActivate: () => onVentilationDrive(nextDrive),
        };
    }

    if (warning.parameter === 'Saturação de O₂') {
        const useTissue = activeTab !== 'tissue';
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: 'Garantir oferta de oxigênio ao microambiente',
            detail: warning.recommendation,
            hint: useTissue ? 'Aba TECIDO abre a captura direta de O₂ no LEC.' : 'A captura do O₂ fica mais efetiva com o tecido aberto.',
            buttonLabel: useTissue ? 'Abrir TECIDO' : 'Captar O₂ agora',
            scopeLabel: useTissue ? 'Trocar aba' : 'Local',
            available: true,
            borderClass: 'border-data-o2/60',
            badgeClass: 'border-data-o2/60 text-data-o2',
            onActivate: () => {
                if (useTissue) {
                    onSelectTab('tissue', true);
                } else {
                    onSelectTab('tissue', true);
                }
            },
        };
    }

    if (warning.parameter === 'Frequência cardíaca') {
        const target = cardio.heartRate > 110 ? Math.max(60, cardio.heartRate - 15) : Math.min(120, cardio.heartRate + 10);
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: cardio.heartRate > 100 ? 'Reduzir taquicardia' : 'Sustentar perfusão e débito',
            detail: warning.recommendation,
            hint: cardio.heartRate > 100 ? 'Leve o alvo cronotrópico para baixo.' : 'Suba o alvo se houver bradicardia ou hipoperfusão.',
            buttonLabel: `Ajustar FC alvo para ${target.toFixed(0)} bpm`,
            scopeLabel: 'Local',
            available: true,
            borderClass: 'border-data-o2/60',
            badgeClass: 'border-data-o2/60 text-data-o2',
            onActivate: () => onHeartRateTarget(target),
        };
    }

    if (warning.parameter === 'Hidratação corporal' || warning.parameter === 'Sódio plasmático') {
        const needsWater = physiology.nutrients.hydration < 40 || physiology.nutrients.sodium > 145;
        const amount = needsWater ? 250 : 100;
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: needsWater ? 'Reposição hídrica e correção renal' : 'Evitar correção osmótica rápida',
            detail: warning.recommendation,
            hint: needsWater ? 'Água resolve a alavanca principal; reabsorção renal complementa.' : 'Ajustes lentos preservam osmolaridade e volume celular.',
            buttonLabel: needsWater ? 'Ingerir 250 mL' : 'Ajustar água + renais',
            scopeLabel: 'Local',
            available: true,
            borderClass: 'border-data-ph/60',
            badgeClass: 'border-data-ph/60 text-data-ph',
            onActivate: () => onIngestWater(amount),
        };
    }

    if (warning.parameter === 'Glicose sanguínea') {
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: 'Correção hormonal fora da microvista',
            detail: warning.recommendation,
            hint: 'Feche esta tela para abrir o painel hormonal e liberar insulina/glucagon.',
            buttonLabel: 'Voltar ao painel principal',
            scopeLabel: 'Global',
            available: true,
            borderClass: 'border-data-glucose/60',
            badgeClass: 'border-data-glucose/60 text-data-glucose',
            onActivate: onClose,
        };
    }

    if (warning.parameter === 'Lactato') {
        const canUseMachinery = activeTab !== 'machinery';
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: 'Melhorar clareamento oxidativo do lactato',
            detail: warning.recommendation,
            hint: canUseMachinery ? 'A maquinaria permite oxidar piruvato e consumir O₂ com mais precisão.' : 'Na aba MAQUINARIA você pode oxidar substratos e alocar ATP.',
            buttonLabel: canUseMachinery ? 'Abrir MAQUINARIA' : 'Já estou na MAQUINARIA',
            scopeLabel: canUseMachinery ? 'Trocar aba' : 'Local',
            available: true,
            borderClass: 'border-data-lactate/60',
            badgeClass: 'border-data-lactate/60 text-data-lactate',
            onActivate: () => onSelectTab('machinery', true),
        };
    }

    if (warning.parameter === 'Déficit energético') {
        return {
            id: warning.parameter,
            parameter: warning.parameter,
            title: 'Reabastecer ATP, O₂ e substratos',
            detail: warning.recommendation,
            hint: 'A aba MAQUINARIA concentra glicólise, oxidação e reparo.',
            buttonLabel: 'Abrir MAQUINARIA',
            scopeLabel: 'Trocar aba',
            available: true,
            borderClass: 'border-data-atp/60',
            badgeClass: 'border-data-atp/60 text-data-atp',
            onActivate: () => onSelectTab('machinery', true),
        };
    }

    return {
        id: warning.parameter,
        parameter: warning.parameter,
        title: warning.severity === 'severe' ? 'Intervenção necessária' : 'Acompanhar tendência',
        detail: warning.recommendation,
        hint: 'Use a microvista ou volte ao painel sistêmico conforme a origem do distúrbio.',
        buttonLabel: 'Reavaliar tela principal',
        scopeLabel: 'Global',
        available: true,
        borderClass: eventToneClass(warning.severity === 'severe' ? 'critical' : warning.severity === 'moderate' ? 'warning' : 'info'),
        badgeClass: warning.severity === 'severe'
            ? 'border-status-critical/60 text-status-critical'
            : warning.severity === 'moderate'
                ? 'border-status-warning/60 text-status-warning'
                : 'border-status-optimal/60 text-status-optimal',
        onActivate: onClose,
    };
}

const AUTOMATION_DETAILS: Record<AutomationKind, { label: string; description: string; baseCost: number }> = {
    transporters: {
        label: 'Transportadores',
        description: 'Aumenta a captação por proteínas de membrana dentro dos gradientes disponíveis.',
        baseCost: 0.8,
    },
    mitochondrialShuttle: {
        label: 'Navette mitocondrial',
        description: 'Encaminha ADP e substratos para oxidação; não transporta ATP em vesículas.',
        baseCost: 1.1,
    },
    repair: {
        label: 'Maquinaria de reparo',
        description: 'Prioriza automaticamente membrana, proteínas e DNA danificados.',
        baseCost: 1.35,
    },
};

function AutomationPanel({ cellular, onPurchase }: { cellular: CellularState; onPurchase: (kind: AutomationKind) => void }) {
    const kinds: AutomationKind[] = ['transporters', 'mitochondrialShuttle', 'repair'];

    return (
        <ClinicalPanel ariaLabel="Automação celular">
            <PanelHeading eyebrow="Progressão" title="Automação celular" action={<Shield className="h-4 w-4 text-data-atp" aria-hidden="true" />} />
            <div className="space-y-2 p-3">
                {kinds.map(kind => {
                    const level = cellular.automation[kind];
                    const detail = AUTOMATION_DETAILS[kind];
                    const nextCost = detail.baseCost + level * 0.55;

                    return (
                        <div key={kind} className="border border-app-border bg-app-bg p-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-[10px] font-medium uppercase tracking-wider text-text-primary">
                                        {detail.label}
                                    </div>
                                    <p className="mt-1 text-[9px] leading-relaxed text-text-secondary">{detail.description}</p>
                                </div>
                                <div className="flex gap-1" aria-label={`Nível ${level} de 3`}>
                                    {[1, 2, 3].map(marker => (
                                        <span
                                            key={marker}
                                            className={marker <= level ? 'h-2 w-4 bg-data-atp' : 'h-2 w-4 bg-app-border'}
                                            aria-hidden="true"
                                        />
                                    ))}
                                </div>
                            </div>
                            <WireButton
                                className="mt-2 w-full"
                                onClick={() => onPurchase(kind)}
                                disabled={level >= 3 || cellular.cell.atpMmolL - nextCost < 1}
                            >
                                {level >= 3 ? 'Nível máximo' : `Automatizar · ${nextCost.toFixed(2)} ATP`}
                            </WireButton>
                        </div>
                    );
                })}
            </div>
        </ClinicalPanel>
    );
}

export function CellularWorkbench({ onClose }: CellularWorkbenchProps) {
    const [activeTab, setActiveTab] = useState<CellularTab>('tissue');
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
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    const selectTab = (tab: CellularTab, focus = false) => {
        setActiveTab(tab);
        if (focus) {
            const index = TABS.findIndex(candidate => candidate.id === tab);
            requestAnimationFrame(() => tabRefs.current[index]?.focus());
        }
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = TABS.length - 1;
        else return;

        event.preventDefault();
        selectTab(TABS[nextIndex].id, true);
    };

    const routine = cellular.routine;

    return (
        <div id="cellular-workbench" className="flex h-full min-h-0 flex-col overflow-hidden bg-app-bg text-text-primary" aria-label="Microscopia celular">
            <header className="flex flex-col border-b border-app-border bg-app-surface lg:flex-row lg:items-stretch">
                <div className="flex min-h-14 items-center gap-3 px-3">
                    <WireButton onClick={onClose} aria-label="Voltar ao painel sistêmico" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Voltar
                    </WireButton>
                    <div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Microscopia celular</div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-text-primary">Tecido metabolicamente ativo</div>
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 items-center border-t border-app-border px-3 py-2 lg:border-l lg:border-t-0">
                    {routine ? (
                        <div className={`flex min-w-0 flex-1 items-center gap-3 border-l-2 pl-3 ${eventToneClass(routine.severity)}`}>
                            <AlertTriangle className="h-4 w-4 flex-none" aria-hidden="true" />
                            <div className="min-w-0">
                                <div className="truncate text-[10px] font-medium uppercase tracking-wider" role="status" aria-live="polite">{routine.title}</div>
                                <div className="truncate text-[10px] text-text-secondary">{routine.description}</div>
                            </div>
                            <span className="ml-auto flex-none font-mono text-[10px] tabular-nums">
                                {Math.ceil(routine.remainingSeconds)}s
                            </span>
                        </div>
                    ) : (
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-wider text-text-secondary">Último evento celular</div>
                            <div className="truncate text-[10px] text-text-primary" role="status" aria-live="polite">{cellular.lastEvent}</div>
                        </div>
                    )}
                    <div className="ml-4 hidden items-center gap-2 border-l border-app-border pl-4 sm:flex">
                        <Zap className="h-4 w-4 text-data-atp" aria-hidden="true" />
                        <span className="font-mono text-sm tabular-nums text-data-atp">{cellular.cell.atpMmolL.toFixed(2)}</span>
                        <span className="text-[9px] text-text-secondary">ATP mmol/L</span>
                    </div>
                </div>
            </header>

            <nav className="flex flex-none overflow-x-auto border-b border-app-border bg-app-panel" role="tablist" aria-label="Escala da visualização celular">
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
                                ? 'min-h-12 min-w-44 flex-1 border-b-2 border-data-atp bg-data-atp/10 px-4 py-2 text-left text-data-atp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-optimal'
                                : 'min-h-12 min-w-44 flex-1 border-b-2 border-transparent px-4 py-2 text-left text-text-secondary hover:bg-app-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-optimal'}
                        >
                            <span className="block text-[11px] font-semibold tracking-wider">{tab.label}</span>
                            <span className="block text-[9px] text-text-secondary">{tab.description}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-hidden">
                <div className="grid min-h-full grid-cols-1 gap-px bg-app-border lg:grid-cols-3 xl:h-full xl:grid-cols-12">
                    <MetricsRail tab={activeTab} cellular={cellular} />

                    <main className="min-w-0 bg-app-bg lg:col-span-2 xl:col-span-7 xl:min-h-0">
                        <div
                            id="cellular-panel-tissue"
                            role="tabpanel"
                            aria-labelledby="cellular-tab-tissue"
                            tabIndex={activeTab === 'tissue' ? 0 : -1}
                            hidden={activeTab !== 'tissue'}
                            className="h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-optimal"
                        >
                            {activeTab === 'tissue' && (
                                <TissueView cellular={cellular} onCapture={(kind: SubstrateKind) => captureCellularSubstrate(kind)} />
                            )}
                        </div>
                        <div
                            id="cellular-panel-intracellular"
                            role="tabpanel"
                            aria-labelledby="cellular-tab-intracellular"
                            tabIndex={activeTab === 'intracellular' ? 0 : -1}
                            hidden={activeTab !== 'intracellular'}
                            className="h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-optimal"
                        >
                            {activeTab === 'intracellular' && (
                                <IntracellularView cellular={cellular} onCapture={(kind: SubstrateKind) => captureCellularSubstrate(kind)} />
                            )}
                        </div>
                        <div
                            id="cellular-panel-machinery"
                            role="tabpanel"
                            aria-labelledby="cellular-tab-machinery"
                            tabIndex={activeTab === 'machinery' ? 0 : -1}
                            hidden={activeTab !== 'machinery'}
                            className="h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-optimal"
                        >
                            {activeTab === 'machinery' && (
                                <MachineryView
                                    cellular={cellular}
                                    onGlycolysis={runCellularGlycolysis}
                                    onOxidize={(kind: OxidationSubstrate) => oxidizeCellularSubstrate(kind)}
                                    onAllocateAtp={(target: RepairTarget) => allocateCellularAtp(target)}
                                />
                            )}
                        </div>
                    </main>

                    <aside className="min-w-0 space-y-px bg-app-border lg:col-span-1 xl:col-span-3 xl:min-h-0 xl:overflow-y-auto" aria-label="Controles da microscopia celular">
                        <SystemicControls
                            physiology={physiology}
                            interventions={interventions}
                            onIngestWater={ingestWater}
                            onHeartRateTarget={setHeartRateTarget}
                            onVentilationDrive={setVentilationDrive}
                            onRenalReabsorption={setRenalWaterReabsorption}
                        />
                        <WarningResponsePanel
                            activeWarnings={activeWarnings}
                            physiology={physiology}
                            interventions={interventions}
                            activeTab={activeTab}
                            onClose={onClose}
                            onSelectTab={selectTab}
                            onHeartRateTarget={setHeartRateTarget}
                            onVentilationDrive={setVentilationDrive}
                            onIngestWater={ingestWater}
                        />
                        <AutomationPanel
                            cellular={cellular}
                            onPurchase={(kind: AutomationKind) => purchaseCellularAutomation(kind)}
                        />
                        <ClinicalPanel className="p-3" ariaLabel="Resumo de estabilidade celular">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-secondary">
                                    <Heart className="h-4 w-4 text-data-o2" aria-hidden="true" />
                                    FC
                                </div>
                                <span className="font-mono text-xs text-text-primary">{physiology.cardiovascular.heartRate.toFixed(0)} bpm</span>
                            </div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-secondary">
                                    <Wind className="h-4 w-4 text-data-co2" aria-hidden="true" />
                                    SpO₂
                                </div>
                                <span className="font-mono text-xs text-text-primary">{physiology.respiratory.spo2.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-secondary">
                                    <Droplets className="h-4 w-4 text-data-ph" aria-hidden="true" />
                                    pH arterial
                                </div>
                                <span className="font-mono text-xs text-text-primary">{physiology.acidBase.pH.toFixed(2)}</span>
                            </div>
                        </ClinicalPanel>
                    </aside>
                </div>
            </div>
        </div>
    );
}
