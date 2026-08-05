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
  CENTRAL_REGULATORY_SIGNALS,
  isCentralRegulatorySignalSafe,
  type CentralRegulatoryAxis,
} from '../../game/centralRegulation';
import { useSimulationStore } from '../../game/simulationStore';
import { ActionButton, GlassPanel, PanelLabel, cn } from './ui';

const categories = Object.keys(ACTION_CATEGORIES) as HormoneCategory[];
const axisMeta: Record<CentralRegulatoryAxis, { label: string; icon: typeof Activity }> = {
  autonomic: { label: 'Autonômico', icon: Activity },
  respiratory: { label: 'Tronco / quimiorreflexo', icon: Wind },
  osmotic: { label: 'Osmótico / ADH', icon: Droplets },
  appetite: { label: 'Apetite', icon: BrainCircuit },
};

const launcherShortcuts = [
  { id: 'hormonal', label: 'Sinais hormonais', icon: Zap, mode: 'hormonal' },
  { id: 'central', label: 'Regulação central', icon: Activity, mode: 'hypothalamus', axis: 'autonomic' },
  { id: 'respiratory', label: 'Controle respiratório', icon: Wind, mode: 'hypothalamus', axis: 'respiratory' },
  { id: 'osmotic', label: 'Osmorregulação / ADH', icon: Droplets, mode: 'hypothalamus', axis: 'osmotic' },
  { id: 'appetite', label: 'POMC / NPY', icon: BrainCircuit, mode: 'hypothalamus', axis: 'appetite' },
] as const;

interface GlobalPhysiologyDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalPhysiologyDock({ open, onOpenChange }: GlobalPhysiologyDockProps) {
  const [mode, setMode] = useState<'hormonal' | 'hypothalamus'>('hormonal');
  const [category, setCategory] = useState<HormoneCategory>('anabolic');
  const [axis, setAxis] = useState<CentralRegulatoryAxis>('autonomic');
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
  const decisionPending = useSimulationStore(state => Boolean(state.cellular.routine));
  const iatrogenicEpisodes = useSimulationStore(state => state.iatrogenicEpisodes);
  const trace = useSimulationStore(state => state.lastCausalTrace);
  const simulationTime = useSimulationStore(state => state.physiology.timeElapsed);
  const release = useSimulationStore(state => state.releaseHormone);
  const physiology = useSimulationStore(state => state.physiology);
  const hypothalamus = useSimulationStore(state => state.hypothalamus);
  const hypothalamicCooldowns = useSimulationStore(state => state.hypothalamicCooldowns);
  const sendHypothalamicSignal = useSimulationStore(state => state.sendHypothalamicSignal);

  const safetyState = useMemo(() => ({ glucose, pH, heartRate, energyDeficit, aminoAcids, atpPool, cortisol: hormones.cortisol, t3: hormones.t3 }), [aminoAcids, atpPool, energyDeficit, glucose, heartRate, hormones.cortisol, hormones.t3, pH]);
  const availableCount = HORMONAL_ACTIONS.filter(action => isActionSafe(action.id, safetyState).safe && !(cooldowns[action.id] > 0)).length;
  const warningCount = HORMONAL_ACTIONS.filter(action => !isActionSafe(action.id, safetyState).safe).length;
  const hypothalamicAvailableCount = CENTRAL_REGULATORY_SIGNALS.filter(signal =>
    isCentralRegulatorySignalSafe(signal.id, physiology).safe && !(hypothalamicCooldowns[signal.id] > 0)).length;
  const hypothalamicWarningCount = CENTRAL_REGULATORY_SIGNALS.filter(signal =>
    !isCentralRegulatorySignalSafe(signal.id, physiology).safe).length;
  const totalAvailableCount = availableCount + hypothalamicAvailableCount;
  const totalWarningCount = warningCount + hypothalamicWarningCount + iatrogenicEpisodes.length;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
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
  }, [onOpenChange, open]);

  if (!mounted) return null;

  const close = () => {
    onOpenChange(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openShortcut = (shortcut: typeof launcherShortcuts[number]) => {
    setMode(shortcut.mode);
    if ('axis' in shortcut) setAxis(shortcut.axis);
    onOpenChange(true);
  };

  const dock = (
    <>
      {open && <button type="button" aria-label="Fechar central de sinalização" onClick={close} className="fixed inset-0 z-[46] bg-black/30 backdrop-blur-[2px] sm:hidden"/>}

      {open && (
        <GlassPanel
          ref={panelRef}
          id="global-hormone-panel"
          role="dialog"
          aria-label="Central de sinalização hormonal e regulação central"
          className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[48] flex max-h-[72dvh] flex-col overflow-hidden p-0 sm:inset-x-auto sm:bottom-[86px] sm:right-6 sm:max-h-[min(72dvh,680px)] sm:w-[430px]"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden"/>
          <div className="flex flex-none items-start justify-between gap-3 border-b border-white/8 p-4">
            <div><PanelLabel icon={mode === 'hormonal' ? <Zap className="size-4"/> : <BrainCircuit className="size-4"/>}>Central de sinalização</PanelLabel><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{mode === 'hormonal' ? `${availableCount} manipulações hormonais disponíveis · ${Object.keys(cooldowns).length} em recarga` : `${hypothalamicAvailableCount} circuitos disponíveis · ${Object.keys(hypothalamicCooldowns).length} em recarga`}</p></div>
            <button type="button" onClick={close} aria-label="Fechar central de sinalização" className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"><X className="size-5"/></button>
          </div>

          <div className="grid flex-none grid-cols-2 gap-1 border-b border-white/8 p-2" role="tablist" aria-label="Tipo de sinalização">
            <button type="button" role="tab" aria-selected={mode === 'hormonal'} onClick={() => setMode('hormonal')} className={cn('min-h-11 rounded-lg border px-3 text-[11px] font-medium uppercase tracking-wider transition', mode === 'hormonal' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground')}><Zap className="mr-1.5 inline size-3.5"/>Hormônios</button>
            <button type="button" role="tab" aria-selected={mode === 'hypothalamus'} onClick={() => setMode('hypothalamus')} className={cn('min-h-11 rounded-lg border px-3 text-[11px] font-medium uppercase tracking-wider transition', mode === 'hypothalamus' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground')}><BrainCircuit className="mr-1.5 inline size-3.5"/>Regulação central</button>
          </div>

          {mode === 'hormonal' ? <div className="flex flex-none gap-1 overflow-x-auto border-b border-white/8 px-3 py-2" role="tablist" aria-label="Categorias hormonais">
            {categories.map(item => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={cn('min-h-11 flex-1 rounded-lg border px-2 text-[11px] font-medium uppercase tracking-wider transition', category === item ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground hover:text-foreground')}>{ACTION_CATEGORIES[item].name}</button>)}
          </div> : <div className="flex flex-none gap-1 overflow-x-auto border-b border-white/8 px-3 py-2" role="tablist" aria-label="Eixos de regulação central">
            {(Object.keys(axisMeta) as CentralRegulatoryAxis[]).map(item => { const Icon = axisMeta[item].icon; return <button key={item} type="button" role="tab" aria-selected={axis === item} onClick={() => setAxis(item)} className={cn('min-h-11 flex-1 rounded-lg border px-2 text-[11px] font-medium uppercase tracking-wider transition', axis === item ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/8 bg-black/10 text-muted-foreground hover:text-foreground')}><Icon className="mr-1 inline size-3"/>{axisMeta[item].label}</button>; })}
          </div>}

          <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {iatrogenicEpisodes.length > 0 && <section className="rounded-xl border border-danger/45 bg-danger/10 p-3" aria-label="Carga iatrogênica ativa">
              <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger"/><div><strong className="text-[11px] uppercase tracking-wider text-danger">Carga iatrogênica ativa</strong><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">A penalidade cresce com a intensidade e o tempo de exposição. O relógio abaixo é fisiológico.</p></div></div>
              <div className="mt-2 space-y-2">{iatrogenicEpisodes.map(episode => { const progress = episode.remainingSeconds / episode.totalSeconds * 100; return <div key={episode.id} className="rounded-lg border border-danger/20 bg-black/20 px-2.5 py-2"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-foreground">{episode.label}</strong><span className={cn('font-mono text-[11px] uppercase', episode.severity === 'critical' ? 'text-danger' : 'text-warning')}>{episode.severity === 'critical' ? 'crítica' : episode.severity === 'severe' ? 'grave' : 'moderada'} · erro {(episode.intensity * 100).toFixed(0)}% · {episode.remainingSeconds.toFixed(0)} s</span></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{episode.reason}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-danger transition-[width]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}/></div></div>; })}</div>
            </section>}
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
                    <span className="shrink-0 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-[11px] text-primary">{hormones[action.hormone].toFixed(1)} {definition.unit}</span>
                  </div>
                  <div className="mt-2 rounded-lg border border-white/5 bg-black/15 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-foreground">Efeito modelado:</span> {action.implementedEffects.slice(0, 2).join(' · ')}<br/>
                    <span className="text-foreground">Preview:</span> {action.expectedDirections.join(' · ')}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="size-3"/> {action.cooldownSeconds}s</span><span>ATP {action.metabolicCost.toFixed(2)}</span><span>{action.latency}</span></div>
                  {!safety.safe && <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning"><AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>{safety.reason}</p>}
                  <ActionButton
                    className="mt-3 min-h-11 w-full"
                    disabled={disabled}
                    onClick={() => {
                      const result = release(action.id);
                      setFeedback(result.ok ? decisionPending ? `${action.shortName} foi preparado para a decisão atual; volte à sidebar para escolher a estratégia.` : `${action.shortName} entrou na fila do próximo passo fisiológico.` : result.reason ?? 'Sinal indisponível.');
                    }}
                  >
                    {queued ? 'Sinal na fila' : cooldown > 0 ? `Recarga: ${cooldown.toFixed(0)} s` : !safety.safe ? 'Contraindicado no contexto' : 'Aplicar manipulação'}
                  </ActionButton>
                </article>
              );
            }) : <>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="text-primary">Resposta endógena integrada</strong><br/>
                Autonômico: {hypothalamus.autonomicTone > .08 ? 'simpático' : hypothalamus.autonomicTone < -.08 ? 'parassimpático' : 'basal'} · Respiratório: {hypothalamus.respiratoryDrive > .08 ? 'reforçado' : hypothalamus.respiratoryDrive < -.08 ? 'reduzido' : 'basal'} · Osmótico: {hypothalamus.osmoticDrive > .08 ? 'retenção' : hypothalamus.osmoticDrive < -.08 ? 'diurese' : 'basal'} · Apetite: {hypothalamus.feedingDrive > .08 ? 'NPY/AgRP' : hypothalamus.feedingDrive < -.08 ? 'POMC/CART' : 'basal'}
              </div>
              {CENTRAL_REGULATORY_SIGNALS.filter(signal => signal.axis === axis).map(signal => {
                const safety = isCentralRegulatorySignalSafe(signal.id, physiology);
                const cooldown = hypothalamicCooldowns[signal.id] ?? 0;
                const queued = pendingCommands.some(command => command.type === 'hypothalamic-signal' && command.signalId === signal.id);
                const disabled = !safety.safe || cooldown > 0 || queued || physiology.energy.atpPool < signal.cost;
                const Icon = axisMeta[signal.axis].icon;
                return <article key={signal.id} className={cn('rounded-xl border bg-black/15 p-3.5', !safety.safe ? 'border-warning/30' : 'border-white/8')}>
                  <span className="mb-2 inline-flex rounded-full border border-good/25 bg-good/5 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-good">Resposta endógena</span>
                  <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/5 text-primary"><Icon className="size-4"/></span><div><strong className="text-[12px] font-medium text-foreground">{signal.label}</strong><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{signal.description}</p></div></div>
                  <div className="mt-2 rounded-lg border border-white/5 bg-black/15 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground"><span className="text-foreground">Mecanismo:</span> {signal.mechanism}</div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground"><span><Clock3 className="mr-1 inline size-3"/>{signal.cooldownSeconds}s</span><span>ATP {signal.cost.toFixed(2)}</span></div>
                  {!safety.safe && <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning"><AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>{safety.reason}</p>}
                  <ActionButton className="mt-3 min-h-11 w-full" disabled={disabled} onClick={() => { const result = sendHypothalamicSignal(signal.id); setFeedback(result.ok ? decisionPending ? `${signal.shortLabel} foi preparado para a decisão atual; volte à sidebar para escolher a estratégia.` : `${signal.shortLabel} entrou na fila do próximo passo fisiológico.` : result.reason ?? 'Circuito indisponível.'); }}>{queued ? 'Sinal na fila' : cooldown > 0 ? `Recarga: ${cooldown.toFixed(0)} s` : !safety.safe ? 'Bloqueado pelo contexto' : 'Recrutar circuito'}</ActionButton>
                </article>;
              })}
            </>}
          </div>

          <div className="flex-none border-t border-white/8 p-3" aria-live="polite"><p className="text-[11px] leading-relaxed text-muted-foreground">{feedback}</p></div>
        </GlassPanel>
      )}

      {trace && simulationTime - trace.timestamp <= 8 && (
        <GlassPanel className={cn('fixed bottom-[146px] left-3 z-[42] hidden w-[340px] p-3 sm:block', trace.severity === 'warning' && 'border-warning/40')} role="status">
          <div className="flex items-start gap-2"><CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', trace.severity === 'warning' ? 'text-warning' : 'text-good')}/><div><strong className="text-[11px] font-medium text-foreground">{trace.title}</strong><p className="mt-1 text-[11px] text-muted-foreground">{trace.context}</p><p className="mt-1.5 text-[11px] leading-relaxed text-primary">→ {trace.steps.join(' → ')}</p></div></div>
        </GlassPanel>
      )}

      <div className={cn('group fixed bottom-[calc(86px+env(safe-area-inset-bottom))] right-3 z-[47] flex flex-col items-end gap-2 transition sm:bottom-[86px] sm:right-6', open && 'pointer-events-none opacity-0')}>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Abrir central de sinalização"
          aria-expanded={open}
          aria-controls="global-hormone-panel global-signaling-shortcuts"
          onClick={() => onOpenChange(true)}
          className={cn('relative order-2 grid size-12 place-items-center rounded-full border bg-[#111722]/85 text-primary shadow-[0_0_22px_-6px_rgba(217,180,95,.55)] backdrop-blur-xl transition hover:scale-[1.04] focus-visible:scale-[1.04]', iatrogenicEpisodes.length > 0 ? 'border-danger/80' : totalWarningCount ? 'border-warning/70' : 'border-primary/60')}
        >
          {iatrogenicEpisodes.length > 0 ? <AlertTriangle className="size-5 text-danger"/> : <Zap className="size-5"/>}
          <span className={cn('absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border px-1 font-mono text-[11px]', iatrogenicEpisodes.length > 0 ? 'border-danger bg-[#271010] text-danger' : totalWarningCount ? 'border-warning bg-[#21170d] text-warning' : 'border-primary/60 bg-[#17140d] text-primary')}>{iatrogenicEpisodes.length > 0 ? `!${iatrogenicEpisodes.length}` : totalAvailableCount}</span>
        </button>

        <div
          id="global-signaling-shortcuts"
          aria-label="Atalhos da central de sinalização"
          className="pointer-events-none order-1 hidden translate-y-2 flex-col items-end gap-1.5 opacity-0 transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:flex"
        >
          {launcherShortcuts.map(shortcut => {
            const Icon = shortcut.icon;
            const active = shortcut.mode === mode && (shortcut.mode === 'hormonal' || shortcut.axis === axis);
            return <button
              key={shortcut.id}
              type="button"
              aria-controls="global-hormone-panel"
              onClick={() => openShortcut(shortcut)}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-full border bg-[#111722]/92 py-1.5 pl-3 pr-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground shadow-[0_8px_24px_-12px_rgba(0,0,0,.9)] backdrop-blur-xl transition hover:border-primary/60 hover:text-primary focus-visible:border-primary/60 focus-visible:text-primary',
                active ? 'border-primary/45 text-primary' : 'border-white/10',
              )}
            >
              <span>{shortcut.label}</span>
              <span className="grid size-7 place-items-center rounded-full border border-primary/20 bg-primary/5 text-primary"><Icon className="size-3.5"/></span>
            </button>;
          })}
        </div>
      </div>
    </>
  );

  return createPortal(dock, document.body);
}
