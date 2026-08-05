import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  GitFork,
  HeartPulse,
  Route,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  DECISION_RESOURCE_LABELS,
  getDecisionResourceAmount,
  getScenarioChoiceAvailability,
  getScenarioDefinition,
} from '../../game/scenarios';
import { collectPreparedDecisionSignals, useSimulationStore } from '../../game/simulationStore';
import { getScenarioNarrative } from '../../game/scenarioNarrative';
import { getSimulationCalendar } from '../../game/simulationCalendar';
import { GlassPanel, PanelLabel, ProgressBar, cn } from './ui';

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
  const simulationTime = physiology.timeElapsed;
  const resolve = useSimulationStore(state => state.resolveCellularRoutine);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scenarioId = routine?.id ?? response?.scenarioId;
  const definition = scenarioId ? getScenarioDefinition(scenarioId) : undefined;
  const narrative = scenarioId ? getScenarioNarrative(scenarioId) : undefined;
  const previousDefinition = cellular.narrative?.previousScenarioId
    ? getScenarioDefinition(cellular.narrative.previousScenarioId)
    : undefined;
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
  const progress = response ? (1 - response.remainingSeconds / response.totalSeconds) * 100 : 0;
  const investigatingHardEvent = definition.difficulty === 'hard' && !observing;
  const eventCalendar = getSimulationCalendar(scenarioOnset?.time ?? physiology.timeElapsed);

  return (
    <aside
      aria-label={observing ? 'Observação da resposta fisiológica' : 'Evento fisiológico aguardando decisão'}
      className={cn(
        'fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 top-auto z-[45] flex max-h-[64dvh] w-[calc(100%-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-x-hidden [contain:layout_paint] lg:bottom-[82px] lg:left-3 lg:top-[68px] lg:max-h-none lg:w-[400px]',
        definition.difficulty === 'hard' && 'lg:w-[440px]',
        collapsed && 'max-lg:max-h-16',
      )}
    >
      <GlassPanel className={cn('flex min-h-0 flex-1 flex-col overflow-hidden border-warning/35 p-0 shadow-[0_18px_70px_rgba(0,0,0,.55)]', definition.severity === 'critical' && 'border-danger/45')}>
        <header className="flex flex-none items-start gap-3 border-b border-white/8 p-4">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl border bg-black/25', definition.severity === 'critical' ? 'border-danger/35 text-danger' : 'border-warning/35 text-warning')}>
            {definition.severity === 'critical' ? <AlertTriangle className="size-4.5"/> : <HeartPulse className="size-4.5"/>}
          </span>
          <div className="min-w-0 flex-1">
            <PanelLabel icon={observing ? <Eye className="size-3.5"/> : <GitFork className="size-3.5"/>}>{observing ? 'Resposta em observação' : definition.difficulty === 'hard' ? 'Decisão sistêmica · Difícil' : 'Situação fisiológica'}</PanelLabel>
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

          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Eixos de aprendizagem do evento">
            {['Fisiologia aplicada', 'Regulação endócrina', 'Manejo clínico'].map(axis => <span key={axis} className="rounded-full border border-primary/20 bg-primary/[.06] px-2 py-1 text-[7px] uppercase tracking-[.14em] text-primary/85">{axis}</span>)}
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[.09] via-black/15 to-black/25">
            <div className="border-b border-white/8 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] uppercase tracking-[.18em] text-primary">{narrative?.eyebrow}</span>
                <span className="text-right text-[8px] uppercase tracking-wider text-muted-foreground">Dia {eventCalendar.day} · {eventCalendar.clock}<span className="ml-1.5 text-foreground/45">Cap. {cellular.narrative?.chapter || 1}</span></span>
              </div>
              {previousDefinition && <p className="mt-1.5 text-[9px] text-muted-foreground"><Route className="mr-1 inline size-3 text-primary"/>Continuação de <strong className="text-foreground/75">{previousDefinition.title}</strong></p>}
            </div>
            <div className="p-3">
              <p className="font-display text-[13px] leading-relaxed text-foreground">{narrative?.scene ?? definition.description}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-foreground/65">{definition.description}</p>
              <div className="mt-3 rounded-lg border border-cyan/20 bg-cyan/[.05] px-3 py-2">
                <span className="text-[8px] uppercase tracking-[.16em] text-cyan">{investigatingHardEvent ? 'O que precisa ser explicado?' : 'Raciocínio fisiológico-clínico'}</span>
                <p className="mt-1 text-[9px] leading-relaxed text-foreground/75">{investigatingHardEvent ? definition.investigationPrompt : definition.explanation}</p>
              </div>
              <div className="mt-3 rounded-lg border border-warning/20 bg-warning/[.06] px-3 py-2">
                <span className="text-[8px] uppercase tracking-[.16em] text-warning">Sua missão</span>
                <p className="mt-1 text-[10px] leading-relaxed text-foreground/85">{narrative?.objective}</p>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{definition.contextSummary}</p>
            </div>
          </div>

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
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">As opções combinam manobras, fármacos e suporte fisiológico. Cruze sinais vitais, eixo endócrino e perfusão antes de escolher; os requisitos indicam a resposta interna que precisa acompanhar a conduta.</p>
              <div className="mt-2 space-y-2">
                {routine.choices.map((choice, index) => {
                  const availability = getScenarioChoiceAvailability(cellular, routine.id, choice.id, preparedSignals);
                  const hasRequirements = choice.requirements.length > 0 || (choice.signalRequirements?.length ?? 0) > 0;
                  return <button type="button" key={choice.id} disabled={!availability.available} onClick={() => { if (!resolve(choice.id)) setError('Não foi possível iniciar essa resposta. Revise os recursos e tente novamente.'); }} className="group w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-primary/55 hover:bg-primary/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:border-warning/20 disabled:opacity-55">
                    <span className="text-[8px] uppercase tracking-[.16em] text-muted-foreground">Conduta {index + 1}</span>
                    <strong className="mt-1.5 block text-[11px] text-foreground group-hover:text-primary">{choice.label}</strong>
                    <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{choice.description}</span>
                    {definition.difficulty === 'hard' && <span className="mt-1.5 block text-[9px] leading-relaxed text-foreground/65"><span className="text-primary">Risco fisiológico:</span> {choice.tradeoff}</span>}
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
