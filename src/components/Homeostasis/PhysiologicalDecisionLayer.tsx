import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, GitFork, HeartPulse, ShieldAlert, Zap } from 'lucide-react';
import { CAPTURE_AMOUNTS, CAPTURED_POOL_CAPS } from '../../game/cellularSimulation';
import type { SubstrateKind } from '../../game/cellularTypes';
import {
  DECISION_RESOURCE_LABELS,
  getDecisionResourceAmount,
  getScenarioChoiceAvailability,
  getScenarioDefinition,
} from '../../game/scenarios';
import { evaluateScenarioResolution } from '../../game/scenarioResolution';
import { useSimulationStore } from '../../game/simulationStore';
import { GlassPanel, PanelLabel, cn } from './ui';

const preparationResources: Array<{ kind: SubstrateKind; label: string; amount: string }> = [
  { kind: 'glucose', label: 'Captar glicose', amount: '+1' },
  { kind: 'oxygen', label: 'Captar O₂', amount: '+3' },
  { kind: 'fattyAcid', label: 'Captar ácido graxo', amount: '+0,5' },
  { kind: 'aminoAcid', label: 'Captar aminoácido', amount: '+0,5' },
];

export function PhysiologicalDecisionLayer() {
  const cellular = useSimulationStore(state => state.cellular);
  const routine = cellular.routine;
  const physiology = useSimulationStore(state => state.physiology);
  const hypothalamus = useSimulationStore(state => state.hypothalamus);
  const lastDecision = useSimulationStore(state => state.lastDecision);
  const simulationTime = useSimulationStore(state => state.physiology.timeElapsed);
  const resolve = useSimulationStore(state => state.resolveCellularRoutine);
  const capture = useSimulationStore(state => state.captureCellularSubstrate);
  const glycolysis = useSimulationStore(state => state.runCellularGlycolysis);
  const oxidize = useSimulationStore(state => state.oxidizeCellularSubstrate);
  const panelRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [preparationFeedback, setPreparationFeedback] = useState('Capte ou processe recursos para liberar caminhos bloqueados.');
  const definition = routine ? getScenarioDefinition(routine.id) : undefined;

  useEffect(() => {
    if (!routine) return;
    setError('');
    setPreparationFeedback('Capte ou processe recursos para liberar caminhos bloqueados.');
    const firstButton = panelRef.current?.querySelector<HTMLButtonElement>('button');
    firstButton?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const buttons = [...panelRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', trapFocus);
    return () => window.removeEventListener('keydown', trapFocus);
  }, [routine]);

  if (!routine) {
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

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/78 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="physiological-decision-title" aria-describedby="physiological-decision-description">
      <GlassPanel ref={panelRef} className={cn('w-full max-w-2xl border-warning/40 p-5 shadow-[0_24px_90px_rgba(0,0,0,.65)] sm:p-6', routine.severity === 'critical' && 'border-danger/50')}>
        <div className="flex items-start gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl border bg-black/25', routine.severity === 'critical' ? 'border-danger/35 text-danger' : 'border-warning/35 text-warning')}>
            {routine.severity === 'critical' ? <AlertTriangle className="size-5"/> : <HeartPulse className="size-5"/>}
          </span>
          <div className="min-w-0 flex-1">
            <PanelLabel icon={<GitFork className="size-3.5"/>}>Decisão fisiológica obrigatória</PanelLabel>
            <h2 id="physiological-decision-title" className="mt-2 font-display text-xl text-foreground sm:text-2xl">{routine.title}</h2>
            <p id="physiological-decision-description" className="mt-2 text-xs leading-relaxed text-muted-foreground">{routine.description}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <strong className="text-[9px] uppercase tracking-[.16em] text-primary">Situação imposta pelo evento</strong>
          <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/85">{definition?.contextSummary ?? routine.triggerReason}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{routine.explanation}</p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0"/>
          <span>A simulação está pausada neste instante. Escolha um caminho para continuar; a situação não pode ser fechada ou ignorada.</span>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
          <div className="flex items-start justify-between gap-3"><div><strong className="text-[10px] uppercase tracking-[.14em] text-foreground">Preparação metabólica</strong><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">A timeline continua congelada. Recursos captados desbloqueiam decisões; pools acima de 75% começam a gerar sobrecarga.</p></div><span className="shrink-0 font-mono text-[10px] text-primary">ATP {cellular.cell.atpMmolL.toFixed(2)}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {preparationResources.map(resource => {
              const current = cellular.pools.captured[resource.kind];
              const saturation = cellular.transportSaturation[resource.kind];
              const captureAmount = CAPTURE_AMOUNTS[resource.kind];
              const disabled = cellular.pools.available[resource.kind] < captureAmount
                || current + captureAmount > CAPTURED_POOL_CAPS[resource.kind];
              return <button type="button" key={resource.kind} disabled={disabled} onClick={() => { const ok = capture(resource.kind); setPreparationFeedback(ok ? `${resource.label}: pool atualizado; confira os caminhos.` : `${resource.label} indisponível: falta oferta ou espaço no pool.`); }} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-left text-[9px] transition hover:border-primary/45 disabled:opacity-40"><strong className="block text-foreground">{resource.label}</strong><span className="mt-1 block font-mono text-muted-foreground">{current.toFixed(1)}/{CAPTURED_POOL_CAPS[resource.kind]} · {resource.amount}</span><span className={cn('mt-1 block', saturation >= 75 ? 'text-warning' : 'text-primary/75')}>ocupação {saturation.toFixed(0)}%</span></button>;
            })}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => setPreparationFeedback(glycolysis() ? 'Glicose processada em piruvato e ATP.' : 'Glicólise bloqueada: falta glicose ou espaço no pool de ATP.')} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[9px] text-foreground hover:border-primary/45">Glicólise</button>
            <button type="button" onClick={() => setPreparationFeedback(oxidize('pyruvate') ? 'Piruvato oxidado; ATP mitocondrial recuperado.' : 'Oxidação bloqueada: confira piruvato, O₂, ADP e espaço de ATP.')} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[9px] text-foreground hover:border-primary/45">Oxidar piruvato</button>
            <button type="button" onClick={() => setPreparationFeedback(oxidize('fattyAcid') ? 'Ácido graxo oxidado; ATP recuperado com custo redox.' : 'Beta-oxidação bloqueada: confira ácido graxo, O₂, ADP e espaço de ATP.')} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[9px] text-foreground hover:border-primary/45">Beta-oxidação</button>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-primary" role="status" aria-live="polite"><Zap className="mr-1 inline size-3"/>{preparationFeedback}</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {routine.choices.map((choice, index) => {
            const availability = getScenarioChoiceAvailability(cellular, routine.id, choice.id);
            const configuredChoice = definition?.choices.find(item => item.id === choice.id);
            const resolution = configuredChoice
              ? evaluateScenarioResolution(routine.id, configuredChoice.outcome, physiology, cellular, hypothalamus)
              : null;
            return <button
              type="button"
              key={choice.id}
              disabled={!availability.available}
              onClick={() => {
                const ok = resolve(choice.id);
                if (!ok) setError('Não foi possível aplicar essa decisão. Tente novamente.');
              }}
              className="group min-h-32 rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-primary/55 hover:bg-primary/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:border-danger/20 disabled:opacity-50"
            >
              <span className="text-[9px] uppercase tracking-[.16em] text-muted-foreground">Caminho {index + 1}</span>
              <strong className="mt-2 block text-xs text-foreground group-hover:text-primary">{choice.label}</strong>
              <span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground">{choice.description}</span>
              <span className="mt-2 block text-[10px] leading-relaxed text-primary/80">Consequência prevista: {choice.tradeoff}</span>
              {resolution && <span className={cn('mt-2 block rounded-md border px-2 py-1.5 text-[9px]', resolution.risk === 'catastrophic' ? 'border-danger/35 bg-danger/10 text-danger' : resolution.risk === 'unstable' ? 'border-warning/30 bg-warning/5 text-warning' : 'border-good/20 bg-good/5 text-good')}>Somatória evento + hormônios + reservas: {resolution.summary}</span>}
              {choice.requirements.length > 0 && <span className="mt-3 block border-t border-white/8 pt-2 text-[9px] leading-relaxed"><strong className={availability.available ? 'text-good' : 'text-danger'}>{availability.available ? 'Recursos disponíveis' : `Bloqueado: ${availability.missing.join(' · ')}`}</strong>{choice.requirements.map(requirement => <span key={requirement.resource} className="mt-1 block text-muted-foreground">{DECISION_RESOURCE_LABELS[requirement.resource]}: {getDecisionResourceAmount(cellular, requirement.resource).toFixed(requirement.resource === 'antioxidants' ? 0 : 1)} / mínimo {requirement.minimum.toFixed(requirement.resource === 'antioxidants' ? 0 : 1)}{requirement.cost > 0 ? ` · consome ${requirement.cost}` : ''}</span>)}</span>}
            </button>;
          })}
        </div>
        {error && <p className="mt-3 text-[11px] text-danger" role="alert">{error}</p>}
      </GlassPanel>
    </div>
  );
}
