import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, AlertTriangle, BrainCircuit, CheckCircle2, Clock3, Droplets, Wind, X, Zap } from 'lucide-react';
import {
  ACTION_CATEGORIES,
  HORMONAL_ACTIONS,
  HORMONE_DEFINITIONS,
  isActionSafe,
} from '../../game/actions';
import type { HormoneCategory } from '../../game/config/hormones';
import {
  HYPOTHALAMIC_SIGNALS,
  isHypothalamicSignalSafe,
  type HypothalamicAxis,
} from '../../game/hypothalamus';
import { useSimulationStore } from '../../game/simulationStore';
import { ActionButton, GlassPanel, PanelLabel, cn } from './ui';

const categories = Object.keys(ACTION_CATEGORIES) as HormoneCategory[];
const axisMeta: Record<HypothalamicAxis, { label: string; icon: typeof Activity }> = {
  autonomic: { label: 'Autonômico', icon: Activity },
  respiratory: { label: 'Respiratório', icon: Wind },
  osmotic: { label: 'Osmótico / ADH', icon: Droplets },
};

export function GlobalPhysiologyDock() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hormonal' | 'hypothalamus'>('hormonal');
  const [category, setCategory] = useState<HormoneCategory>('anabolic');
  const [axis, setAxis] = useState<HypothalamicAxis>('autonomic');
  const [feedback, setFeedback] = useState('Selecione um sinal para ver sua resposta causal.');
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hormones = useSimulationStore(state => state.physiology.hormones);
  const glucose = useSimulationStore(state => state.physiology.nutrients.bloodGlucose);
  const aminoAcids = useSimulationStore(state => state.physiology.nutrients.aminoAcids);
  const pH = useSimulationStore(state => state.physiology.acidBase.pH);
  const heartRate = useSimulationStore(state => state.physiology.cardiovascular.heartRate);
  const energyDeficit = useSimulationStore(state => state.physiology.energy.energyDeficit);
  const atpPool = useSimulationStore(state => state.physiology.energy.atpPool);
  const cooldowns = useSimulationStore(state => state.hormonalCooldowns);
  const pendingCommands = useSimulationStore(state => state.pendingCommands);
  const trace = useSimulationStore(state => state.lastCausalTrace);
  const simulationTime = useSimulationStore(state => state.physiology.timeElapsed);
  const release = useSimulationStore(state => state.releaseHormone);
  const physiology = useSimulationStore(state => state.physiology);
  const hypothalamus = useSimulationStore(state => state.hypothalamus);
  const hypothalamicCooldowns = useSimulationStore(state => state.hypothalamicCooldowns);
  const sendHypothalamicSignal = useSimulationStore(state => state.sendHypothalamicSignal);

  const safetyState = useMemo(() => ({ glucose, pH, heartRate, energyDeficit, aminoAcids, atpPool }), [aminoAcids, atpPool, energyDeficit, glucose, heartRate, pH]);
  const availableCount = HORMONAL_ACTIONS.filter(action => isActionSafe(action.id, safetyState).safe && !(cooldowns[action.id] > 0)).length;
  const warningCount = HORMONAL_ACTIONS.filter(action => !isActionSafe(action.id, safetyState).safe).length;
  const hypothalamicAvailableCount = HYPOTHALAMIC_SIGNALS.filter(signal =>
    isHypothalamicSignalSafe(signal.id, physiology).safe && !(hypothalamicCooldowns[signal.id] > 0)).length;
  const hypothalamicWarningCount = HYPOTHALAMIC_SIGNALS.filter(signal =>
    !isHypothalamicSignalSafe(signal.id, physiology).safe).length;
  const totalAvailableCount = availableCount + hypothalamicAvailableCount;
  const totalWarningCount = warningCount + hypothalamicWarningCount;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || window.innerWidth >= 640 || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus());
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!mounted) return null;

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const dock = (
    <>
      {open && <button type="button" aria-label="Fechar central de sinalização" onClick={close} className="fixed inset-0 z-[41] bg-black/30 backdrop-blur-[2px] sm:hidden"/>}

      {open && (
        <GlassPanel
          ref={panelRef}
          id="global-hormone-panel"
          role="dialog"
          aria-label="Central de sinalização hormonal e hipotalâmica"
          className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[43] flex max-h-[72dvh] flex-col overflow-hidden p-0 sm:inset-x-auto sm:bottom-[86px] sm:right-6 sm:max-h-[min(72dvh,680px)] sm:w-[430px]"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden"/>
          <div className="flex flex-none items-start justify-between gap-3 border-b border-white/8 p-4">
            <div><PanelLabel icon={mode === 'hormonal' ? <Zap className="size-4"/> : <BrainCircuit className="size-4"/>}>Central de sinalização</PanelLabel><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{mode === 'hormonal' ? `${availableCount} hormônios disponíveis · ${Object.keys(cooldowns).length} em recarga` : `${hypothalamicAvailableCount} circuitos disponíveis · ${Object.keys(hypothalamicCooldowns).length} em recarga`}</p></div>
            <button type="button" onClick={close} aria-label="Fechar central de sinalização" className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"><X className="size-5"/></button>
          </div>

          <div className="grid flex-none grid-cols-2 gap-1 border-b border-white/8 p-2" role="tablist" aria-label="Tipo de sinalização">
            <button type="button" role="tab" aria-selected={mode === 'hormonal'} onClick={() => setMode('hormonal')} className={cn('min-h-11 rounded-lg border px-3 text-[10px] font-medium uppercase tracking-wider transition', mode === 'hormonal' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground')}><Zap className="mr-1.5 inline size-3.5"/>Hormônios</button>
            <button type="button" role="tab" aria-selected={mode === 'hypothalamus'} onClick={() => setMode('hypothalamus')} className={cn('min-h-11 rounded-lg border px-3 text-[10px] font-medium uppercase tracking-wider transition', mode === 'hypothalamus' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground')}><BrainCircuit className="mr-1.5 inline size-3.5"/>Hipotálamo</button>
          </div>

          {mode === 'hormonal' ? <div className="flex flex-none gap-1 overflow-x-auto border-b border-white/8 px-3 py-2" role="tablist" aria-label="Categorias hormonais">
            {categories.map(item => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={cn('min-h-11 flex-1 rounded-lg border px-2 text-[10px] font-medium uppercase tracking-wider transition', category === item ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground hover:text-foreground')}>{ACTION_CATEGORIES[item].name}</button>)}
          </div> : <div className="flex flex-none gap-1 overflow-x-auto border-b border-white/8 px-3 py-2" role="tablist" aria-label="Eixos hipotalâmicos">
            {(Object.keys(axisMeta) as HypothalamicAxis[]).map(item => { const Icon = axisMeta[item].icon; return <button key={item} type="button" role="tab" aria-selected={axis === item} onClick={() => setAxis(item)} className={cn('min-h-11 flex-1 rounded-lg border px-2 text-[9px] font-medium uppercase tracking-wider transition', axis === item ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground hover:text-foreground')}><Icon className="mr-1 inline size-3"/>{axisMeta[item].label}</button>; })}
          </div>}

          <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {mode === 'hormonal' ? HORMONAL_ACTIONS.filter(action => action.category === category).map(action => {
              const definition = HORMONE_DEFINITIONS[action.hormone];
              const safety = isActionSafe(action.id, safetyState);
              const cooldown = cooldowns[action.id] ?? 0;
              const queued = pendingCommands.some(command => command.type === 'release-hormone' && command.actionId === action.id);
              const disabled = !safety.safe || cooldown > 0 || queued;
              return (
                <article key={action.id} className={cn('rounded-xl border bg-black/15 p-3.5', !safety.safe ? 'border-warning/30' : 'border-white/8')}>
                  <div className="flex items-start justify-between gap-3">
                    <div><strong className="text-[12px] font-medium text-foreground">{action.shortName}</strong><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{action.description}</p></div>
                    <span className="shrink-0 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-[10px] text-primary">{hormones[action.hormone].toFixed(1)} {definition.unit}</span>
                  </div>
                  <div className="mt-2 rounded-lg border border-white/5 bg-black/15 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                    <span className="text-foreground">Efeito modelado:</span> {action.implementedEffects.slice(0, 2).join(' · ')}<br/>
                    <span className="text-foreground">Preview:</span> {action.expectedDirections.join(' · ')}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="size-3"/> {action.cooldownSeconds}s</span><span>ATP {action.metabolicCost.toFixed(2)}</span><span>{action.latency}</span></div>
                  {!safety.safe && <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning"><AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>{safety.reason}</p>}
                  <ActionButton
                    className="mt-3 min-h-11 w-full"
                    disabled={disabled}
                    onClick={() => {
                      const result = release(action.id);
                      setFeedback(result.ok ? `${action.shortName} entrou na fila do próximo passo fisiológico.` : result.reason ?? 'Sinal indisponível.');
                    }}
                  >
                    {queued ? 'Sinal na fila' : cooldown > 0 ? `Recarga: ${cooldown.toFixed(0)} s` : !safety.safe ? 'Contraindicado no contexto' : 'Liberar sinal'}
                  </ActionButton>
                </article>
              );
            }) : <>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[10px] leading-relaxed text-muted-foreground">
                <strong className="text-primary">Estado integrado</strong><br/>
                Autonômico: {hypothalamus.autonomicTone > .08 ? 'simpático' : hypothalamus.autonomicTone < -.08 ? 'parassimpático' : 'basal'} · Respiratório: {hypothalamus.respiratoryDrive > .08 ? 'reforçado' : hypothalamus.respiratoryDrive < -.08 ? 'reduzido' : 'basal'} · Osmótico: {hypothalamus.osmoticDrive > .08 ? 'retenção' : hypothalamus.osmoticDrive < -.08 ? 'diurese' : 'basal'}
              </div>
              {HYPOTHALAMIC_SIGNALS.filter(signal => signal.axis === axis).map(signal => {
                const safety = isHypothalamicSignalSafe(signal.id, physiology);
                const cooldown = hypothalamicCooldowns[signal.id] ?? 0;
                const queued = pendingCommands.some(command => command.type === 'hypothalamic-signal' && command.signalId === signal.id);
                const disabled = !safety.safe || cooldown > 0 || queued || physiology.energy.atpPool < signal.cost;
                const Icon = axisMeta[signal.axis].icon;
                return <article key={signal.id} className={cn('rounded-xl border bg-black/15 p-3.5', !safety.safe ? 'border-warning/30' : 'border-white/8')}>
                  <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/5 text-primary"><Icon className="size-4"/></span><div><strong className="text-[12px] font-medium text-foreground">{signal.label}</strong><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{signal.description}</p></div></div>
                  <div className="mt-2 rounded-lg border border-white/5 bg-black/15 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground"><span className="text-foreground">Mecanismo:</span> {signal.mechanism}</div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground"><span><Clock3 className="mr-1 inline size-3"/>{signal.cooldownSeconds}s</span><span>ATP {signal.cost.toFixed(2)}</span></div>
                  {!safety.safe && <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning"><AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>{safety.reason}</p>}
                  <ActionButton className="mt-3 min-h-11 w-full" disabled={disabled} onClick={() => { const result = sendHypothalamicSignal(signal.id); setFeedback(result.ok ? `${signal.shortLabel} entrou na fila do próximo passo fisiológico.` : result.reason ?? 'Circuito indisponível.'); }}>{queued ? 'Sinal na fila' : cooldown > 0 ? `Recarga: ${cooldown.toFixed(0)} s` : !safety.safe ? 'Bloqueado pelo contexto' : 'Recrutar circuito'}</ActionButton>
                </article>;
              })}
            </>}
          </div>

          <div className="flex-none border-t border-white/8 p-3" aria-live="polite"><p className="text-[11px] leading-relaxed text-muted-foreground">{feedback}</p></div>
        </GlassPanel>
      )}

      {trace && simulationTime - trace.timestamp <= 8 && (
        <GlassPanel className={cn('fixed bottom-[146px] left-3 z-[42] hidden w-[340px] p-3 sm:block', trace.severity === 'warning' && 'border-warning/40')} role="status">
          <div className="flex items-start gap-2"><CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', trace.severity === 'warning' ? 'text-warning' : 'text-good')}/><div><strong className="text-[11px] font-medium text-foreground">{trace.title}</strong><p className="mt-1 text-[10px] text-muted-foreground">{trace.context}</p><p className="mt-1.5 text-[10px] leading-relaxed text-primary">→ {trace.steps.join(' → ')}</p></div></div>
        </GlassPanel>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? 'Fechar central de sinalização' : 'Abrir sinalização hormonal e hipotalâmica'}
        aria-expanded={open}
        aria-controls="global-hormone-panel"
        onClick={() => setOpen(value => !value)}
        className={cn('fixed bottom-[calc(86px+env(safe-area-inset-bottom))] right-3 z-[44] grid size-12 place-items-center rounded-full border bg-[#111722]/85 text-primary shadow-[0_0_22px_-6px_rgba(217,180,95,.55)] backdrop-blur-xl transition sm:bottom-[86px] sm:right-6', totalWarningCount ? 'border-warning/70' : 'border-primary/60', open && 'pointer-events-none opacity-0')}
      >
        {open ? <X className="size-5"/> : <Zap className="size-5"/>}
        <span className={cn('absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border px-1 font-mono text-[9px]', totalWarningCount ? 'border-warning bg-[#21170d] text-warning' : 'border-primary/60 bg-[#17140d] text-primary')}>{open ? '×' : totalAvailableCount}</span>
      </button>
    </>
  );

  return createPortal(dock, document.body);
}
