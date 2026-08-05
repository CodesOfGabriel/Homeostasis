import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
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
  getPredictionDirectionLabel,
  getScenarioLearning,
  type PredictionDirection,
  type ScenarioReasoningSubmission,
} from '../../game/scenarioLearning';
import { collectPreparedDecisionSignals, useSimulationStore } from '../../game/simulationStore';
import { getScenarioNarrative } from '../../game/scenarioNarrative';
import { getSimulationCalendar } from '../../game/simulationCalendar';
import { getUnlockedAdaptationCaseVariant } from '../../game/adaptationWindow';
import { GlassPanel, PanelLabel, ProgressBar, cn } from './ui';

const PREDICTION_DIRECTIONS: PredictionDirection[] = ['increase', 'stable', 'decrease'];
const DIRECTION_SYMBOLS: Record<PredictionDirection, string> = { increase: '↑', stable: '→', decrease: '↓' };

export function PhysiologicalDecisionLayer() {
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
  const [collapsed, setCollapsed] = useState(false);
  const [hypothesisId, setHypothesisId] = useState('');
  const [predictionAnswers, setPredictionAnswers] = useState<Record<string, PredictionDirection>>({});
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
  const selectedChoiceId = response?.choiceId ?? freshDecision?.choiceId;
  const selectedChoice = selectedChoiceId ? definition?.choices.find(choice => choice.id === selectedChoiceId) : undefined;
  const progress = response ? (1 - response.remainingSeconds / response.totalSeconds) * 100 : 0;
  const eventCalendar = getSimulationCalendar((response?.onset ?? scenarioOnset)?.time ?? physiology.timeElapsed);
  const reasoningComplete = Boolean(
    learning
    && learning.hypotheses.some(option => option.id === hypothesisId)
    && learning.predictions.every(item => predictionAnswers[item.id]),
  );
  const currentSnapshot = useMemo(
    () => createScenarioMetricSnapshot(physiology, cellular),
    [physiology, cellular],
  );

  useEffect(() => {
    if (!routine?.id) return;
    setError('');
    setCollapsed(false);
    setHypothesisId('');
    setPredictionAnswers({});
  }, [routine?.id]);

  if (!scenarioId || !definition || !learning) return null;

  const reasoningSubmission = (): ScenarioReasoningSubmission => ({
    hypothesisId,
    predictions: predictionAnswers,
  });
  const activePhase = observing || debriefing ? 3 : reasoningComplete ? 2 : 1;
  const outcome = freshDecision?.outcome;
  const outcomeTone = outcome === 'adaptive' ? 'good' : outcome === 'partial' ? 'warning' : 'danger';

  return (
    <aside
      aria-label={debriefing ? 'Debrief fisiológico' : observing ? 'Observação da resposta fisiológica' : 'Evento fisiológico aguardando decisão'}
      className={cn(
        'fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 top-auto z-[45] flex max-h-[64dvh] w-[calc(100%-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-x-hidden [contain:layout_paint] lg:bottom-[82px] lg:left-3 lg:top-[68px] lg:max-h-none lg:w-[400px]',
        definition.difficulty === 'hard' && 'lg:w-[440px]',
        collapsed && 'max-lg:max-h-16',
      )}
    >
      <GlassPanel className={cn('flex min-h-0 flex-1 flex-col overflow-hidden border-warning/35 p-0 shadow-[0_18px_70px_rgba(0,0,0,.55)]', definition.severity === 'critical' && 'border-danger/45', debriefing && outcomeTone === 'good' && 'border-good/40')}>
        <header className="flex flex-none items-start gap-3 border-b border-white/8 p-4">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl border bg-black/25', debriefing ? outcomeTone === 'good' ? 'border-good/35 text-good' : outcomeTone === 'warning' ? 'border-warning/35 text-warning' : 'border-danger/35 text-danger' : definition.severity === 'critical' ? 'border-danger/35 text-danger' : 'border-warning/35 text-warning')}>
            {debriefing ? outcomeTone === 'good' ? <CheckCircle2 className="size-4.5"/> : <ShieldAlert className="size-4.5"/> : definition.severity === 'critical' ? <AlertTriangle className="size-4.5"/> : <HeartPulse className="size-4.5"/>}
          </span>
          <div className="min-w-0 flex-1">
            <PanelLabel icon={debriefing ? <Target className="size-3.5"/> : observing ? <Eye className="size-3.5"/> : <GitFork className="size-3.5"/>}>{debriefing ? 'Previsão × resultado' : observing ? 'Resposta em observação' : definition.difficulty === 'hard' ? 'Decisão sistêmica · Difícil' : 'Situação fisiológica'}</PanelLabel>
            <h2 className="mt-1.5 truncate font-display text-lg text-foreground">{definition.title}</h2>
          </div>
          <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir evento' : 'Recolher evento'} className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"><ChevronDown className={cn('size-4 transition', collapsed && 'rotate-180')}/></button>
        </header>

        <div className={cn('scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4', collapsed && 'max-lg:hidden')}>
          <div className="grid grid-cols-4 gap-1" aria-label="Fases da decisão">
            {['Detectar', 'Investigar', 'Intervir', 'Observar'].map((phase, index) => <div key={phase} className={cn('rounded-md border px-1.5 py-1.5 text-center text-[8px] uppercase tracking-wider', index === activePhase ? 'border-primary/45 bg-primary/10 text-primary' : index < activePhase ? 'border-white/10 text-foreground/65' : 'border-white/6 text-muted-foreground/55')}>{phase}</div>)}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Eixos de aprendizagem do evento">
            {['Fisiologia aplicada', 'Regulação endócrina', 'Manejo clínico'].map(axis => <span key={axis} className="rounded-full border border-primary/20 bg-primary/[.06] px-2 py-1 text-[7px] uppercase tracking-[.14em] text-primary/85">{axis}</span>)}
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[.09] via-black/15 to-black/25">
            <div className="border-b border-white/8 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] uppercase tracking-[.18em] text-primary">{caseVariant?.eyebrow ?? narrative?.eyebrow}</span>
                <span className="text-right text-[8px] uppercase tracking-wider text-muted-foreground">Dia {eventCalendar.day} · {eventCalendar.clock}<span className="ml-1.5 text-foreground/45">Cap. {cellular.narrative?.chapter || 1}</span></span>
              </div>
              {previousDefinition && <p className="mt-1.5 text-[9px] text-muted-foreground"><Route className="mr-1 inline size-3 text-primary"/>Continuação de <strong className="text-foreground/75">{previousDefinition.title}</strong></p>}
            </div>
            <div className="p-3">
              <p className="font-display text-[13px] leading-relaxed text-foreground">{caseVariant?.scene ?? narrative?.scene ?? definition.description}</p>
              {caseVariant && <span className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/[.08] px-2 py-1 text-[7px] uppercase tracking-[.14em] text-primary">Variante desbloqueada · {caseVariant.label}</span>}
              <p className="mt-2 text-[10px] leading-relaxed text-foreground/65">{definition.description}</p>
              <div className="mt-3 rounded-lg border border-cyan/20 bg-cyan/[.05] px-3 py-2">
                <span className="text-[8px] uppercase tracking-[.16em] text-cyan">{routine ? 'O que precisa ser explicado?' : 'Raciocínio fisiológico-clínico'}</span>
                <p className="mt-1 text-[9px] leading-relaxed text-foreground/75">{routine ? definition.investigationPrompt ?? learning.hypothesisPrompt : definition.explanation}</p>
              </div>
              <div className="mt-3 rounded-lg border border-warning/20 bg-warning/[.06] px-3 py-2">
                <span className="text-[8px] uppercase tracking-[.16em] text-warning">Variável controlada ameaçada</span>
                <p className="mt-1 text-[10px] leading-relaxed text-foreground/85">{learning.controlledVariable}</p>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{definition.contextSummary}</p>
            </div>
          </div>

          {routine ? (
            <>
              <section className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
                <PanelLabel icon={<BrainCircuit className="size-3.5"/>}>1 · Formule a hipótese</PanelLabel>
                <p className="mt-2 text-[10px] leading-relaxed text-foreground/75">{learning.hypothesisPrompt}</p>
                <div className="mt-2 space-y-1.5">
                  {learning.hypotheses.map(option => <button key={option.id} type="button" aria-pressed={hypothesisId === option.id} onClick={() => { setHypothesisId(option.id); setError(''); }} className={cn('min-h-11 w-full rounded-lg border px-3 py-2 text-left text-[9px] leading-relaxed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70', hypothesisId === option.id ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-white/8 bg-black/15 text-muted-foreground hover:border-white/18 hover:text-foreground')}>{option.label}</button>)}
                </div>
              </section>

              <section className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3">
                <PanelLabel icon={<Target className="size-3.5"/>}>2 · Preveja duas trajetórias</PanelLabel>
                <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Registre a direção antes de agir. O motor comparará sua previsão com a variação realmente produzida.</p>
                <div className="mt-2 space-y-3">
                  {learning.predictions.map(item => <div key={item.id}>
                    <p className="text-[10px] leading-relaxed text-foreground/80">{item.prompt}</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      {PREDICTION_DIRECTIONS.map(direction => <button key={direction} type="button" aria-pressed={predictionAnswers[item.id] === direction} onClick={() => { setPredictionAnswers(current => ({ ...current, [item.id]: direction })); setError(''); }} className={cn('min-h-10 rounded-md border px-1 text-[8px] uppercase tracking-wider transition', predictionAnswers[item.id] === direction ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 text-muted-foreground hover:border-white/18 hover:text-foreground')}><span className="mr-1 font-mono text-[11px]">{DIRECTION_SYMBOLS[direction]}</span>{getPredictionDirectionLabel(direction)}</button>)}
                    </div>
                  </div>)}
                </div>
              </section>

              <section className="mt-4">
                <PanelLabel icon={<GitFork className="size-3.5"/>}>3 · Escolha a intervenção</PanelLabel>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">As condutas aplicam mecanismos; recuperação, resposta parcial ou falha serão calculadas pela trajetória e pelas reservas reais.</p>
                <div className="mt-2 space-y-2">
                  {routine.choices.map((choice, index) => {
                    const availability = getScenarioChoiceAvailability(cellular, routine.id, choice.id, preparedSignals);
                    const hasRequirements = choice.requirements.length > 0 || (choice.signalRequirements?.length ?? 0) > 0;
                    const available = availability.available && reasoningComplete;
                    return <button type="button" key={choice.id} disabled={!available} onClick={() => { if (!resolve(choice.id, reasoningSubmission())) setError('Não foi possível iniciar a resposta. Complete o raciocínio e revise sinais e recursos.'); }} className="group w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-primary/55 hover:bg-primary/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:border-warning/20 disabled:opacity-55">
                      <span className="text-[8px] uppercase tracking-[.16em] text-muted-foreground">Conduta {index + 1}</span>
                      <strong className="mt-1.5 block text-[11px] text-foreground group-hover:text-primary">{choice.label}</strong>
                      <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{choice.description}</span>
                      {definition.difficulty === 'hard' && <span className="mt-1.5 block text-[9px] leading-relaxed text-foreground/65"><span className="text-primary">Risco fisiológico:</span> {choice.tradeoff}</span>}
                      {!reasoningComplete && <span className="mt-2 block border-t border-white/8 pt-2 text-[9px] text-warning">Complete hipótese e previsões para intervir.</span>}
                      {reasoningComplete && hasRequirements && <span className="mt-2 block border-t border-white/8 pt-2 text-[9px] leading-relaxed"><strong className={availability.available ? 'text-primary' : 'text-warning'}>{availability.available ? 'Preparação compatível' : `Faltam: ${availability.missing.join(' · ')}`}</strong>{choice.requirements.map(requirement => <span key={requirement.resource} className="mt-1 block text-muted-foreground">{DECISION_RESOURCE_LABELS[requirement.resource]} {getDecisionResourceAmount(cellular, requirement.resource).toFixed(requirement.resource === 'antioxidants' ? 0 : 1)} / {requirement.minimum.toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}{requirement.cost > 0 ? ` · uso ${requirement.cost}` : ''}</span>)}{(choice.signalRequirements ?? []).map(requirement => { const ready = requirement.anyOf.some(signal => preparedSignalSet.has(signal)); return <span key={requirement.label} className={cn('mt-1 block', ready ? 'text-primary' : 'text-muted-foreground')}><Zap className="mr-1 inline size-3"/>{requirement.label} · {ready ? 'preparado' : 'aguardando sinal'}</span>; })}</span>}
                    </button>;
                  })}
                </div>
                {error && <p className="mt-2 text-[10px] text-danger" role="alert">{error}</p>}
              </section>
            </>
          ) : observing && response ? (
            <section className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3" aria-live="polite">
              <PanelLabel icon={<Eye className="size-3.5"/>}>Trajetória em curso</PanelLabel>
              <strong className="mt-2 block text-xs text-foreground">{selectedChoice?.label}</strong>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">A explicação foi liberada depois da escolha. Compare agora sua previsão com as métricas, sem antecipar o veredito.</p>
              <div className="mt-3 space-y-2">
                {learning.predictions.map(item => {
                  const metric = SCENARIO_METRIC_CATALOG[item.metricKey];
                  const initial = response.onset.values[item.metricKey];
                  const current = currentSnapshot.values[item.metricKey];
                  const observed = getObservedDirection(initial, current, item.threshold);
                  const predicted = response.reasoning.predictions[item.id];
                  return <div key={item.id} className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2 text-[9px]"><span className="text-foreground/75">{metric.label}</span><span className={predicted === observed ? 'text-good' : 'text-warning'}>prev. {DIRECTION_SYMBOLS[predicted]} · obs. {DIRECTION_SYMBOLS[observed]}</span></div>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground">{initial.toFixed(metric.digits)} → {current.toFixed(metric.digits)} {metric.unit}</p>
                  </div>;
                })}
              </div>
              <div className="mt-3"><div className="mb-1 flex justify-between font-mono text-[9px] text-muted-foreground"><span>Resposta observada</span><span>{progress.toFixed(0)}%</span></div><ProgressBar value={progress}/></div>
              <p className="mt-2 text-[9px] text-primary">{response.remainingSeconds.toFixed(0)} s fisiológicos restantes</p>
            </section>
          ) : debriefing && freshDecision ? (
            <section className={cn('mt-4 rounded-xl border p-3', outcomeTone === 'good' ? 'border-good/30 bg-good/[.06]' : outcomeTone === 'warning' ? 'border-warning/30 bg-warning/[.06]' : 'border-danger/35 bg-danger/[.06]')} aria-live="polite">
              <PanelLabel icon={<Target className="size-3.5"/>}>{freshDecision.title}</PanelLabel>
              <strong className="mt-2 block text-xs text-foreground">{selectedChoice?.label}</strong>
              <p className="mt-1 text-[10px] leading-relaxed text-foreground/75">{freshDecision.message}</p>
              <div className="mt-3 rounded-lg border border-white/8 bg-black/15 p-2.5">
                <span className="text-[8px] uppercase tracking-[.14em] text-muted-foreground">Hipótese formulada</span>
                <p className={cn('mt-1 text-[9px] leading-relaxed', freshDecision.assessment.hypothesisMatched ? 'text-good' : 'text-warning')}>{freshDecision.assessment.hypothesisLabel}</p>
              </div>
              <div className="mt-2 space-y-2">
                {freshDecision.assessment.predictions.map(item => <div key={item.id} className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2 text-[9px]"><span className="text-foreground/75">{item.label}</span><span className={item.predictionMatched ? 'text-good' : 'text-warning'}>prev. {DIRECTION_SYMBOLS[item.predictedDirection]} · obs. {DIRECTION_SYMBOLS[item.observedDirection]}</span></div>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">{item.initialValue.toFixed(item.digits)} → {item.finalValue.toFixed(item.digits)} {item.unit} · meta {DIRECTION_SYMBOLS[item.adaptiveDirection]}</p>
                </div>)}
              </div>
              <div className="mt-3 border-t border-white/8 pt-3">
                <span className="text-[8px] uppercase tracking-[.14em] text-primary">Cadeia causal</span>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{learning.causalChain.join(' → ')}</p>
              </div>
            </section>
          ) : null}
        </div>
      </GlassPanel>
    </aside>
  );
}
