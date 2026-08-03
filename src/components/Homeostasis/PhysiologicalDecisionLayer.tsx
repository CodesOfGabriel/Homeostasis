import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  GitFork,
  HeartPulse,
  Microscope,
  Route,
  ShieldAlert,
  Stethoscope,
  Zap,
} from 'lucide-react';
import type { StepKey } from './navigation';
import {
  DECISION_RESOURCE_LABELS,
  getDecisionResourceAmount,
  getScenarioChoiceAvailability,
  getScenarioDefinition,
} from '../../game/scenarios';
import { collectPreparedDecisionSignals, useSimulationStore } from '../../game/simulationStore';
import { GlassPanel, PanelLabel, ProgressBar, cn } from './ui';

interface PhysiologicalDecisionLayerProps {
  onNavigate: (step: StepKey) => void;
}

const stepMeta: Record<StepKey, { label: string; icon: typeof Activity }> = {
  tissue: { label: 'Tecido e oferta', icon: Activity },
  mitochondria: { label: 'Rotas energéticas', icon: Route },
  defense: { label: 'Célula e defesa', icon: Microscope },
  vitals: { label: 'Sistema e sinais', icon: Stethoscope },
};

const scenarioSteps: Record<string, StepKey[]> = {
  'stair-climb': ['vitals', 'tissue', 'mitochondria'],
  'meal-surge': ['vitals', 'tissue', 'mitochondria'],
  'morning-fast': ['vitals', 'tissue', 'mitochondria'],
  'micro-injury': ['defense', 'tissue', 'vitals'],
  'immune-challenge': ['defense', 'vitals', 'tissue'],
  'heat-dehydration': ['vitals', 'tissue', 'defense'],
  'orthostatic-transition': ['vitals', 'tissue'],
  'hypercapnic-challenge': ['vitals', 'tissue'],
  'acute-water-load': ['vitals', 'defense'],
  'nocturnal-hypoglycemia': ['vitals', 'tissue', 'mitochondria'],
};

const scenarioMetrics: Record<string, string[]> = {
  'stair-climb': ['heartRate', 'respiratoryRate', 'spo2', 'tissueOxygen', 'lactate', 'cellularAtp'],
  'meal-surge': ['glucose', 'cellularAtp', 'oxidativeStress', 'lactate', 'pH'],
  'morning-fast': ['glucose', 'cellularAtp', 'tissueOxygen', 'lactate', 'pH'],
  'micro-injury': ['inflammation', 'cellularAtp', 'oxidativeStress', 'lactate', 'temperature'],
  'immune-challenge': ['infection', 'temperature', 'inflammation', 'oxidativeStress', 'cellularAtp'],
  'heat-dehydration': ['temperature', 'hydration', 'meanArterialPressure', 'heartRate', 'cellVolume'],
  'orthostatic-transition': ['meanArterialPressure', 'perfusionIndex', 'heartRate', 'tissueOxygen', 'lactate'],
  'hypercapnic-challenge': ['paco2', 'pH', 'respiratoryRate', 'spo2', 'lactate'],
  'acute-water-load': ['sodium', 'hydration', 'cellVolume', 'meanArterialPressure'],
  'nocturnal-hypoglycemia': ['glucose', 'cellularAtp', 'heartRate', 'lactate', 'pH'],
};

export function PhysiologicalDecisionLayer({ onNavigate }: PhysiologicalDecisionLayerProps) {
  const cellular = useSimulationStore(state => state.cellular);
  const physiology = useSimulationStore(state => state.physiology);
  const routine = cellular.routine;
  const response = useSimulationStore(state => state.scenarioResponse);
  const onset = useSimulationStore(state => state.scenarioOnset);
  const pendingCommands = useSimulationStore(state => state.pendingCommands);
  const activeHormonalActions = useSimulationStore(state => state.activeHormonalActions);
  const hypothalamus = useSimulationStore(state => state.hypothalamus);
  const lastDecision = useSimulationStore(state => state.lastDecision);
  const simulationTime = physiology.timeElapsed;
  const resolve = useSimulationStore(state => state.resolveCellularRoutine);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scenarioId = routine?.id ?? response?.scenarioId;
  const definition = scenarioId ? getScenarioDefinition(scenarioId) : undefined;
  const preparedSignals = collectPreparedDecisionSignals(pendingCommands, activeHormonalActions, hypothalamus);
  const preparedSignalSet = new Set(preparedSignals);

  useEffect(() => {
    if (!scenarioId) return;
    setError('');
    setCollapsed(false);
  }, [scenarioId]);

  if (!scenarioId || !definition) {
    if (!lastDecision || simulationTime - lastDecision.timestamp > 8) return null;
    const adaptive = lastDecision.outcome === 'adaptive';
    return (
      <div className="pointer-events-none fixed inset-x-3 top-16 z-[55] flex justify-center sm:top-20">
        <GlassPanel className={cn('max-w-xl px-4 py-3 shadow-2xl', adaptive ? 'border-good/35' : 'border-danger/45')} role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            {adaptive ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good"/> : <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger"/>}
            <div><strong className={cn('text-xs', adaptive ? 'text-good' : 'text-danger')}>{lastDecision.title}</strong><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{lastDecision.message}</p></div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const observing = Boolean(response && !routine);
  const selectedChoice = response ? definition.choices.find(choice => choice.id === response.choiceId) : undefined;
  const metricCatalog = {
    heartRate: metric('Frequência cardíaca', physiology.cardiovascular.heartRate, onset?.heartRate, 'bpm', 0),
    meanArterialPressure: metric('Pressão arterial média', physiology.cardiovascular.meanArterialPressure, onset?.meanArterialPressure, 'mmHg', 0),
    perfusionIndex: metric('Índice de perfusão', physiology.cardiovascular.perfusionIndex, onset?.perfusionIndex, '%', 0),
    spo2: metric('Saturação de O₂', physiology.respiratory.spo2, onset?.spo2, '%', 1),
    respiratoryRate: metric('Frequência respiratória', physiology.respiratory.respiratoryRate, onset?.respiratoryRate, '/min', 1),
    paco2: metric('PaCO₂', physiology.respiratory.paco2, onset?.paco2, 'mmHg', 0),
    glucose: metric('Glicose sanguínea', physiology.nutrients.bloodGlucose, onset?.glucose, 'mg/dL', 0),
    lactate: metric('Lactato', physiology.energy.lactateLevel, onset?.lactate, 'mmol/L', 1),
    pH: metric('pH arterial', physiology.acidBase.pH, onset?.pH, '', 2),
    hydration: metric('Água corporal', physiology.nutrients.hydration, onset?.hydration, 'L', 1),
    sodium: metric('Sódio plasmático', physiology.nutrients.sodium, onset?.sodium, 'mmol/L', 1),
    temperature: metric('Temperatura central', physiology.bodyTemperature, onset?.temperature, '°C', 1),
    cellularAtp: metric('ATP celular', cellular.cell.atpMmolL, onset?.cellularAtp, 'mmol/L', 2),
    tissueOxygen: metric('PO₂ tecidual', cellular.tissue.oxygenMmHg, onset?.tissueOxygen, 'mmHg', 0),
    oxidativeStress: metric('Estresse oxidativo', cellular.damage.oxidativeStress, onset?.oxidativeStress, '%', 0),
    inflammation: metric('Inflamação sistêmica', physiology.allostaticLoad.inflammationLevel, onset?.inflammation, '%', 0),
    infection: metric('Carga infecciosa', physiology.pathophysiology.infectionSeverity, onset?.infection, '%', 0),
    cellVolume: metric('Volume celular', cellular.cell.volumePercent, onset?.cellVolume, '%', 1),
  };
  const visibleMetrics = (scenarioMetrics[scenarioId] ?? scenarioMetrics['stair-climb'])
    .map(key => metricCatalog[key as keyof typeof metricCatalog]);
  const relevantSteps = scenarioSteps[scenarioId] ?? ['vitals', 'tissue'];
  const progress = response ? (1 - response.remainingSeconds / response.totalSeconds) * 100 : 0;

  return (
    <aside
      aria-label={observing ? 'Observação da resposta fisiológica' : 'Evento fisiológico aguardando decisão'}
      className={cn(
        'fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 top-auto z-[45] flex max-h-[64dvh] w-[calc(100%-1.5rem)] flex-col lg:bottom-[82px] lg:left-3 lg:top-[68px] lg:max-h-none lg:w-[400px]',
        collapsed && 'max-lg:max-h-16',
      )}
    >
      <GlassPanel className={cn('flex min-h-0 flex-1 flex-col overflow-hidden border-warning/35 p-0 shadow-[0_18px_70px_rgba(0,0,0,.55)]', definition.severity === 'critical' && 'border-danger/45')}>
        <header className="flex flex-none items-start gap-3 border-b border-white/8 p-4">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl border bg-black/25', definition.severity === 'critical' ? 'border-danger/35 text-danger' : 'border-warning/35 text-warning')}>
            {definition.severity === 'critical' ? <AlertTriangle className="size-4.5"/> : <HeartPulse className="size-4.5"/>}
          </span>
          <div className="min-w-0 flex-1">
            <PanelLabel icon={observing ? <Eye className="size-3.5"/> : <GitFork className="size-3.5"/>}>{observing ? 'Resposta em observação' : 'Situação fisiológica'}</PanelLabel>
            <h2 className="mt-1.5 truncate font-display text-lg text-foreground">{definition.title}</h2>
          </div>
          <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir evento' : 'Recolher evento'} className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"><ChevronDown className={cn('size-4 transition', collapsed && 'rotate-180')}/></button>
        </header>

        <div className={cn('scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4', collapsed && 'max-lg:hidden')}>
          <div className="grid grid-cols-4 gap-1" aria-label="Fases da decisão">
            {['Detectar', 'Investigar', 'Intervir', 'Observar'].map((phase, index) => {
              const activeIndex = observing ? 3 : 1;
              return <div key={phase} className={cn('rounded-md border px-1.5 py-1.5 text-center text-[8px] uppercase tracking-wider', index === activeIndex ? 'border-primary/45 bg-primary/10 text-primary' : index < activeIndex ? 'border-white/10 text-foreground/65' : 'border-white/6 text-muted-foreground/55')}>{phase}</div>;
            })}
          </div>

          <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
            <p className="text-[11px] leading-relaxed text-foreground/85">{definition.description}</p>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{definition.contextSummary}</p>
          </div>

          <section className="mt-4" aria-labelledby="event-metrics-title">
            <div className="flex items-center justify-between gap-2"><div id="event-metrics-title"><PanelLabel icon={<Activity className="size-3.5"/>}>Métricas para investigar</PanelLabel></div><span className="text-[8px] uppercase tracking-wider text-muted-foreground">Δ desde detecção</span></div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {visibleMetrics.map(item => <div key={item.label} className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2"><span className="block truncate text-[8px] uppercase tracking-wider text-muted-foreground">{item.label}</span><div className="mt-1 flex items-baseline justify-between gap-2"><strong className="font-mono text-[12px] text-foreground">{item.value} <small className="text-[8px] font-normal text-muted-foreground">{item.unit}</small></strong><span className={cn('font-mono text-[9px]', item.delta === '—' ? 'text-muted-foreground' : 'text-primary')}>{item.delta}</span></div></div>)}
            </div>
          </section>

          <section className="mt-4">
            <PanelLabel icon={<Eye className="size-3.5"/>}>Abrir investigação</PanelLabel>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
              {relevantSteps.map(step => { const meta = stepMeta[step]; const Icon = meta.icon; return <button type="button" key={step} onClick={() => onNavigate(step)} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/8 bg-black/15 px-3 text-left text-[10px] text-foreground transition hover:border-primary/40 hover:text-primary"><Icon className="size-3.5 text-primary"/>{meta.label}</button>; })}
            </div>
            {!observing && <div className="mt-2 rounded-lg border border-primary/15 bg-black/15 px-3 py-2 text-[9px] leading-relaxed text-muted-foreground"><Zap className="mr-1 inline size-3 text-primary"/>A central flutuante à direita permanece disponível para hormônios, água e regulação central. {pendingCommands.length > 0 ? <strong className="text-primary">{pendingCommands.length} intervenção(ões) preparada(s) para esta decisão.</strong> : 'Os sinais escolhidos serão integrados ao contexto no momento da decisão.'}</div>}
          </section>

          {observing && response ? (
            <section className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3" aria-live="polite">
              <PanelLabel icon={<Eye className="size-3.5"/>}>Trajetória em curso</PanelLabel>
              <strong className="mt-2 block text-xs text-foreground">{selectedChoice?.label}</strong>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">O contexto do evento continua ativo. Compare as métricas com o instante de detecção antes de julgar a resposta.</p>
              <div className="mt-3"><div className="mb-1 flex justify-between font-mono text-[9px] text-muted-foreground"><span>Resposta observada</span><span>{progress.toFixed(0)}%</span></div><ProgressBar value={progress}/></div>
              <p className="mt-2 text-[9px] text-primary">{response.remainingSeconds.toFixed(0)} s fisiológicos restantes</p>
            </section>
          ) : routine ? (
            <section className="mt-4">
              <PanelLabel icon={<GitFork className="size-3.5"/>}>Escolher intervenção</PanelLabel>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">As opções mostram mecanismo e requisitos, não o resultado. A qualidade da resposta depende das reservas e sinais que você preparou.</p>
              <div className="mt-2 space-y-2">
                {routine.choices.map((choice, index) => {
                  const availability = getScenarioChoiceAvailability(cellular, routine.id, choice.id, preparedSignals);
                  const hasRequirements = choice.requirements.length > 0 || (choice.signalRequirements?.length ?? 0) > 0;
                  return <button type="button" key={choice.id} disabled={!availability.available} onClick={() => { if (!resolve(choice.id)) setError('Não foi possível iniciar essa resposta. Revise os recursos e tente novamente.'); }} className="group w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-primary/55 hover:bg-primary/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:border-warning/20 disabled:opacity-55">
                    <span className="text-[8px] uppercase tracking-[.16em] text-muted-foreground">Estratégia {index + 1}</span>
                    <strong className="mt-1.5 block text-[11px] text-foreground group-hover:text-primary">{choice.label}</strong>
                    <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{choice.description}</span>
                    {hasRequirements && <span className="mt-2 block border-t border-white/8 pt-2 text-[9px] leading-relaxed"><strong className={availability.available ? 'text-primary' : 'text-warning'}>{availability.available ? 'Preparação compatível' : `Faltam: ${availability.missing.join(' · ')}`}</strong>{choice.requirements.map(requirement => <span key={requirement.resource} className="mt-1 block text-muted-foreground">{DECISION_RESOURCE_LABELS[requirement.resource]} {getDecisionResourceAmount(cellular, requirement.resource).toFixed(requirement.resource === 'antioxidants' ? 0 : 1)} / {requirement.minimum.toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}{requirement.cost > 0 ? ` · uso ${requirement.cost}` : ''}</span>)}{(choice.signalRequirements ?? []).map(requirement => { const ready = requirement.anyOf.some(signal => preparedSignalSet.has(signal)); return <span key={requirement.label} className={cn('mt-1 block', ready ? 'text-primary' : 'text-muted-foreground')}><Zap className="mr-1 inline size-3"/>{requirement.label} · {ready ? 'preparado' : 'aguardando sinal'}</span>; })}</span>}
                  </button>;
                })}
              </div>
              {error && <p className="mt-2 text-[10px] text-danger" role="alert">{error}</p>}
            </section>
          ) : null}
        </div>
      </GlassPanel>
    </aside>
  );
}

function metric(label: string, current: number, initial: number | undefined, unit: string, digits: number) {
  const difference = initial === undefined ? null : current - initial;
  const threshold = 10 ** -digits / 2;
  return {
    label,
    value: current.toFixed(digits),
    unit,
    delta: difference === null
      ? '—'
      : Math.abs(difference) < threshold
        ? '→ 0'
        : `${difference > 0 ? '↑ +' : '↓ '}${difference.toFixed(digits)}`,
  };
}
