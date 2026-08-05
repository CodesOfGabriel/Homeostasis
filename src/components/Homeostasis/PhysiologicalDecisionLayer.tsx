import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  GitFork,
  HeartPulse,
  Route,
  ShieldAlert,
  Target,
  Zap,
} from 'lucide-react';
import {
  DECISION_RESOURCE_LABELS,
  getDecisionResourceAmount,
  getScenarioChoiceAvailability,
  getScenarioDefinition,
} from '../../game/scenarios';
import { createScenarioMetricSnapshot, SCENARIO_METRIC_CATALOG } from '../../game/scenarioMetrics';
import {
  getObservedDirection,
  getScenarioLearning,
} from '../../game/scenarioLearning';
import { collectPreparedDecisionSignals, useSimulationStore } from '../../game/simulationStore';
import { getScenarioNarrative } from '../../game/scenarioNarrative';
import { getSimulationCalendar } from '../../game/simulationCalendar';
import { getUnlockedAdaptationCaseVariant } from '../../game/adaptationWindow';
import { GlassPanel, PanelLabel, ProgressBar, cn } from './ui';

const DIRECTION_SYMBOLS = { increase: '↑', stable: '→', decrease: '↓' } as const;

interface PhysiologicalDecisionLayerProps {
  onExpandedChange?: (expanded: boolean) => void;
  collapseRequested?: boolean;
}

export function PhysiologicalDecisionLayer({ onExpandedChange, collapseRequested = false }: PhysiologicalDecisionLayerProps) {
  const cellular = useSimulationStore(state => state.cellular);
  const physiology = useSimulationStore(state => state.physiology);
  const routine = cellular.routine;
  const response = useSimulationStore(state => state.scenarioResponse);
  const scenarioOnset = useSimulationStore(state => state.scenarioOnset);
  const pendingCommands = useSimulationStore(state => state.pendingCommands);
  const activeHormonalActions = useSimulationStore(state => state.activeHormonalActions);
  const hypothalamus = useSimulationStore(state => state.hypothalamus);
  const lastDecision = useSimulationStore(state => state.lastDecision);
  const unlockedCaseVariants = useSimulationStore(state => state.adaptationProgress.unlockedCaseVariants);
  const resolve = useSimulationStore(state => state.resolveCellularRoutine);
  const [error, setError] = useState('');
  const [expandedPanelKey, setExpandedPanelKey] = useState<string | null>(null);
  const simulationTime = physiology.timeElapsed;
  const freshDecision = lastDecision && simulationTime - lastDecision.timestamp <= 18 ? lastDecision : null;
  const scenarioId = routine?.id ?? response?.scenarioId ?? freshDecision?.scenarioId;
  const definition = scenarioId ? getScenarioDefinition(scenarioId) : undefined;
  const learning = scenarioId ? getScenarioLearning(scenarioId) : undefined;
  const narrative = scenarioId ? getScenarioNarrative(scenarioId) : undefined;
  const caseVariant = scenarioId ? getUnlockedAdaptationCaseVariant(scenarioId, unlockedCaseVariants) : null;
  const previousDefinition = cellular.narrative?.previousScenarioId
    ? getScenarioDefinition(cellular.narrative.previousScenarioId)
    : undefined;
  const preparedSignals = collectPreparedDecisionSignals(pendingCommands, activeHormonalActions, hypothalamus);
  const preparedSignalSet = new Set(preparedSignals);
  const observing = Boolean(response && !routine);
  const debriefing = Boolean(freshDecision && !routine && !response);
  const panelPhase = routine ? 'decision' : observing ? 'observation' : 'debrief';
  const panelMoment = routine
    ? scenarioOnset?.time ?? cellular.simulationTime
    : response
      ? response.onset.time
      : freshDecision?.timestamp ?? 0;
  const panelKey = `${panelPhase}:${scenarioId ?? 'unknown'}:${panelMoment}`;
  const panelExpanded = expandedPanelKey === panelKey;
  const selectedChoiceId = response?.choiceId ?? freshDecision?.choiceId;
  const selectedChoice = selectedChoiceId ? definition?.choices.find(choice => choice.id === selectedChoiceId) : undefined;
  const progress = response ? (1 - response.remainingSeconds / response.totalSeconds) * 100 : 0;
  const eventCalendar = getSimulationCalendar((response?.onset ?? scenarioOnset)?.time ?? physiology.timeElapsed);
  const currentSnapshot = useMemo(
    () => createScenarioMetricSnapshot(physiology, cellular),
    [physiology, cellular],
  );

  useEffect(() => {
    if (!routine?.id) return;
    setError('');
  }, [routine?.id]);

  useEffect(() => {
    onExpandedChange?.(panelExpanded);
  }, [onExpandedChange, panelExpanded]);

  useEffect(() => {
    if (collapseRequested) setExpandedPanelKey(null);
  }, [collapseRequested]);

  if (!scenarioId || !definition || !learning) return null;

  const activePhase = observing || debriefing ? 3 : 2;
  const outcome = freshDecision?.outcome;
  const outcomeTone = outcome === 'adaptive' ? 'good' : outcome === 'partial' ? 'warning' : 'danger';
  const outcomeLabel = outcome === 'adaptive' ? 'Recuperação observada' : outcome === 'partial' ? 'Resposta parcial' : 'Descompensação observada';
  const compactLabel = debriefing
    ? 'Resultado da intervenção'
    : observing
      ? 'Resposta em observação'
      : definition.difficulty === 'hard'
        ? 'Decisão sistêmica · Difícil'
        : 'Situação fisiológica';
  const compactDetail = debriefing
    ? outcomeLabel
    : observing && response
      ? `${progress.toFixed(0)}% observado · ${response.remainingSeconds.toFixed(0)} s restantes`
      : definition.severity === 'critical'
        ? 'Evento crítico · decisão necessária'
        : 'Simulação pausada · decisão necessária';
  const compactTone = debriefing ? outcomeTone : definition.severity === 'critical' ? 'danger' : 'warning';

  if (!panelExpanded) {
    return (
      <button
        type="button"
        aria-label={`Abrir ${compactLabel}: ${definition.title}`}
        aria-expanded={false}
        aria-controls="physiological-decision-card"
        onClick={() => setExpandedPanelKey(panelKey)}
        className={cn(
          'fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 z-[45] flex min-h-14 max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-2xl border bg-[#111722]/92 px-3 py-2 text-left shadow-[0_18px_55px_rgba(0,0,0,.55)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 lg:bottom-[82px]',
          compactTone === 'good' ? 'border-good/40' : compactTone === 'warning' ? 'border-warning/40' : 'border-danger/45',
        )}
      >
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl border bg-black/25', compactTone === 'good' ? 'border-good/35 text-good' : compactTone === 'warning' ? 'border-warning/35 text-warning' : 'border-danger/35 text-danger')}>
          {debriefing
            ? compactTone === 'good' ? <CheckCircle2 className="size-4.5"/> : <ShieldAlert className="size-4.5"/>
            : observing
              ? <Eye className="size-4.5"/>
              : definition.severity === 'critical' ? <AlertTriangle className="size-4.5"/> : <HeartPulse className="size-4.5"/>}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-primary">{compactLabel}</span>
          <strong className="mt-0.5 block max-w-64 truncate text-[11px] text-foreground">{definition.title}</strong>
          <span className={cn('mt-0.5 block text-[11px]', compactTone === 'good' ? 'text-good' : compactTone === 'warning' ? 'text-warning' : 'text-danger')}>{compactDetail}</span>
        </span>
        <ChevronDown className="ml-1 size-4 shrink-0 rotate-180 text-muted-foreground"/>
      </button>
    );
  }

  return (
    <aside
      id="physiological-decision-card"
      aria-label={debriefing ? 'Debrief fisiológico' : observing ? 'Observação da resposta fisiológica' : 'Evento fisiológico aguardando decisão'}
      className={cn(
        'fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 top-auto z-[45] flex max-h-[64dvh] w-[calc(100%-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-x-hidden [contain:layout_paint] lg:bottom-[82px] lg:left-3 lg:top-[68px] lg:max-h-none lg:w-[400px]',
        definition.difficulty === 'hard' && 'lg:w-[440px]',
      )}
    >
      <GlassPanel className={cn('flex min-h-0 flex-1 flex-col overflow-hidden border-warning/35 p-0 shadow-[0_18px_70px_rgba(0,0,0,.55)]', definition.severity === 'critical' && 'border-danger/45', debriefing && outcomeTone === 'good' && 'border-good/40')}>
        <header className="flex flex-none items-start gap-3 border-b border-white/8 p-4">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl border bg-black/25', debriefing ? outcomeTone === 'good' ? 'border-good/35 text-good' : outcomeTone === 'warning' ? 'border-warning/35 text-warning' : 'border-danger/35 text-danger' : definition.severity === 'critical' ? 'border-danger/35 text-danger' : 'border-warning/35 text-warning')}>
            {debriefing ? outcomeTone === 'good' ? <CheckCircle2 className="size-4.5"/> : <ShieldAlert className="size-4.5"/> : definition.severity === 'critical' ? <AlertTriangle className="size-4.5"/> : <HeartPulse className="size-4.5"/>}
          </span>
          <div className="min-w-0 flex-1">
            <PanelLabel icon={debriefing ? <Target className="size-3.5"/> : observing ? <Eye className="size-3.5"/> : <GitFork className="size-3.5"/>}>{debriefing ? 'Resultado da intervenção' : observing ? 'Resposta em observação' : definition.difficulty === 'hard' ? 'Decisão sistêmica · Difícil' : 'Situação fisiológica'}</PanelLabel>
            <h2 className="mt-1.5 truncate font-display text-lg text-foreground">{definition.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setExpandedPanelKey(null)}
            aria-label={`Minimizar ${compactLabel}`}
            className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <ChevronDown className="size-4 transition"/>
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-1" aria-label="Fases da decisão">
            {['Detectar', 'Investigar', 'Intervir', 'Observar'].map((phase, index) => <div key={phase} className={cn('rounded-md border px-1.5 py-1.5 text-center text-[11px] uppercase tracking-wider', index === activePhase ? 'border-primary/45 bg-primary/10 text-primary' : index < activePhase ? 'border-white/10 text-foreground/65' : 'border-white/6 text-muted-foreground/55')}>{phase}</div>)}
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[.09] via-black/15 to-black/25">
            <div className="border-b border-white/8 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[.18em] text-primary">{caseVariant?.eyebrow ?? narrative?.eyebrow}</span>
                <span className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Dia {eventCalendar.day} · {eventCalendar.clock}<span className="ml-1.5 text-foreground/45">Cap. {cellular.narrative?.chapter || 1}</span></span>
              </div>
              {previousDefinition && <p className="mt-1.5 text-[11px] text-muted-foreground"><Route className="mr-1 inline size-3 text-primary"/>Continuação de <strong className="text-foreground/75">{previousDefinition.title}</strong></p>}
            </div>
            <div className="p-3">
              <p className="font-display text-[13px] leading-relaxed text-foreground">{caseVariant?.scene ?? narrative?.scene ?? definition.description}</p>
              {caseVariant && <span className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/[.08] px-2 py-1 text-[11px] uppercase tracking-[.14em] text-primary">Variante desbloqueada · {caseVariant.label}</span>}
              <p className="mt-2 text-[11px] leading-relaxed text-foreground/65">{definition.description}</p>
              <div className="mt-3 rounded-lg border border-cyan/20 bg-cyan/[.05] px-3 py-2">
                <span className="text-[11px] uppercase tracking-[.16em] text-cyan">{routine ? 'Quadro atual' : 'Resposta fisiológica'}</span>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground/75">{routine ? definition.investigationPrompt ?? definition.explanation : definition.explanation}</p>
              </div>
              <div className="mt-3 rounded-lg border border-warning/20 bg-warning/[.06] px-3 py-2">
                <span className="text-[11px] uppercase tracking-[.16em] text-warning">Variável controlada ameaçada</span>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground/85">{learning.controlledVariable}</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{definition.contextSummary}</p>
            </div>
          </div>

          {routine ? (
            <section className="mt-4">
                <PanelLabel icon={<GitFork className="size-3.5"/>}>Escolha a intervenção</PanelLabel>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">As condutas aplicam mecanismos; recuperação, resposta parcial ou falha serão calculadas pela trajetória e pelas reservas reais.</p>
                <div className="mt-2 space-y-2">
                  {routine.choices.map((choice, index) => {
                    const availability = getScenarioChoiceAvailability(cellular, routine.id, choice.id, preparedSignals);
                    const hasRequirements = choice.requirements.length > 0 || (choice.signalRequirements?.length ?? 0) > 0;
                    return <button type="button" key={choice.id} disabled={!availability.available} onClick={() => { if (!resolve(choice.id)) setError('Não foi possível iniciar a resposta. Revise os sinais e recursos necessários.'); }} className="group w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-primary/55 hover:bg-primary/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:border-warning/20 disabled:opacity-55">
                      <span className="text-[11px] uppercase tracking-[.16em] text-muted-foreground">Conduta {index + 1}</span>
                      <strong className="mt-1.5 block text-[11px] text-foreground group-hover:text-primary">{choice.label}</strong>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{choice.description}</span>
                      {definition.difficulty === 'hard' && <span className="mt-1.5 block text-[11px] leading-relaxed text-foreground/65"><span className="text-primary">Risco fisiológico:</span> {choice.tradeoff}</span>}
                      {hasRequirements && <span className="mt-2 block border-t border-white/8 pt-2 text-[11px] leading-relaxed"><strong className={availability.available ? 'text-primary' : 'text-warning'}>{availability.available ? 'Preparação compatível' : `Faltam: ${availability.missing.join(' · ')}`}</strong>{choice.requirements.map(requirement => <span key={requirement.resource} className="mt-1 block text-muted-foreground">{DECISION_RESOURCE_LABELS[requirement.resource]} {getDecisionResourceAmount(cellular, requirement.resource).toFixed(requirement.resource === 'antioxidants' ? 0 : 1)} / {requirement.minimum.toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}{requirement.cost > 0 ? ` · uso ${requirement.cost}` : ''}</span>)}{(choice.signalRequirements ?? []).map(requirement => { const ready = requirement.anyOf.some(signal => preparedSignalSet.has(signal)); return <span key={requirement.label} className={cn('mt-1 block', ready ? 'text-primary' : 'text-muted-foreground')}><Zap className="mr-1 inline size-3"/>{requirement.label} · {ready ? 'preparado' : 'aguardando sinal'}</span>; })}</span>}
                    </button>;
                  })}
                </div>
                {error && <p className="mt-2 text-[11px] text-danger" role="alert">{error}</p>}
              </section>
          ) : observing && response ? (
            <section className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3" aria-live="polite">
              <PanelLabel icon={<Eye className="size-3.5"/>}>Trajetória em curso</PanelLabel>
              <strong className="mt-2 block text-xs text-foreground">{selectedChoice?.label}</strong>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Acompanhe a resposta pelas métricas enquanto o motor integra sinais, reservas e dano acumulado.</p>
              <div className="mt-3 space-y-2">
                {learning.predictions.map(item => {
                  const metric = SCENARIO_METRIC_CATALOG[item.metricKey];
                  const initial = response.onset.values[item.metricKey];
                  const current = currentSnapshot.values[item.metricKey];
                  const observed = getObservedDirection(initial, current, item.threshold);
                  return <div key={item.id} className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-foreground/75">{metric.label}</span><span className={item.adaptiveDirection === observed ? 'text-good' : 'text-warning'}>traj. {DIRECTION_SYMBOLS[observed]} · alvo {DIRECTION_SYMBOLS[item.adaptiveDirection]}</span></div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{initial.toFixed(metric.digits)} → {current.toFixed(metric.digits)} {metric.unit}</p>
                  </div>;
                })}
              </div>
              <div className="mt-3"><div className="mb-1 flex justify-between font-mono text-[11px] text-muted-foreground"><span>Resposta observada</span><span>{progress.toFixed(0)}%</span></div><ProgressBar value={progress}/></div>
              <p className="mt-2 text-[11px] text-primary">{response.remainingSeconds.toFixed(0)} s fisiológicos restantes</p>
            </section>
          ) : debriefing && freshDecision ? (
            <section className={cn('mt-4 rounded-xl border p-3', outcomeTone === 'good' ? 'border-good/30 bg-good/[.06]' : outcomeTone === 'warning' ? 'border-warning/30 bg-warning/[.06]' : 'border-danger/35 bg-danger/[.06]')} aria-live="polite">
              <PanelLabel icon={<Target className="size-3.5"/>}>{freshDecision.title}</PanelLabel>
              <strong className="mt-2 block text-xs text-foreground">{selectedChoice?.label}</strong>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/75">{freshDecision.message}</p>
              <div className="mt-2 space-y-2">
                {freshDecision.assessment.predictions.map(item => <div key={item.id} className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-foreground/75">{item.label}</span><span className={item.adaptiveTargetMatched ? 'text-good' : 'text-warning'}>traj. {DIRECTION_SYMBOLS[item.observedDirection]} · alvo {DIRECTION_SYMBOLS[item.adaptiveDirection]}</span></div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.initialValue.toFixed(item.digits)} → {item.finalValue.toFixed(item.digits)} {item.unit} · meta {DIRECTION_SYMBOLS[item.adaptiveDirection]}</p>
                </div>)}
              </div>
              <div className="mt-3 border-t border-white/8 pt-3">
                <span className="text-[11px] uppercase tracking-[.14em] text-primary">Cadeia causal</span>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{learning.causalChain.join(' → ')}</p>
              </div>
            </section>
          ) : null}
        </div>
      </GlassPanel>
    </aside>
  );
}
