import { Activity, Atom, Hexagon, LifeBuoy, Pause, Play, Settings, ShieldHalf } from 'lucide-react';
import type { CellularRoutineEvent } from '../../game/cellularTypes';
import type { PhysiologicalEvent } from '../../game/types';
import { cn, GlassPanel } from './ui';

export type SimulatorTab = 'tissue' | 'intracellular' | 'machinery' | 'system';
export type StepKey = 'tissue' | 'mitochondria' | 'defense' | 'vitals';

const STEPS: Array<{ id: StepKey; label: string; icon: typeof Activity }> = [
  { id: 'tissue', label: 'Tecido', icon: LifeBuoy },
  { id: 'mitochondria', label: 'Mitocôndria', icon: Atom },
  { id: 'defense', label: 'Defesa', icon: ShieldHalf },
  { id: 'vitals', label: 'Sinais vitais', icon: Activity },
];

const routineEffects: Record<string, string> = {
  'stair-climb': 'ATP↓ · O₂↓ · Lactato↑',
  'meal-surge': 'Glicose↑ · NADH↑ · ROS↔',
  'morning-fast': 'Glicose↓ · AG↑ · AMPK↑',
  'micro-injury': 'Dano↑ · ATP↓ · Reparo↑',
  'immune-challenge': 'ROS↑ · ATP↓ · Inflamação↑',
  'heat-dehydration': 'Osm↑ · Volume↓ · Perfusão↓',
};

function eventEffects(event: PhysiologicalEvent) {
  const message = event.message.toLowerCase();
  if (message.includes('glicólise')) return 'ATP↑ · Piruvato↑ · Lactato↔';
  if (message.includes('beta-oxidação') || message.includes('ácido graxo')) return 'ATP↑ · O₂↓ · ROS↑';
  if (message.includes('horm') || event.type === 'hormonal') return 'Sinal↑ · Custo ATP · Resposta↗';
  if (message.includes('reparo')) return 'Dano↓ · ATP↓ · Viabilidade↑';
  if (message.includes('oxig') || message.includes('o₂')) return 'O₂↔ · ATP↔ · Perfusão↔';
  if (message.includes('água') || message.includes('osm')) return 'H₂O↑ · Osm↔ · Volume↔';
  if (event.severity === 'critical') return 'Risco↑ · Reserva↓ · Ação urgente';
  return event.affectedSystems.slice(0, 3).map(system => `${system.replace('cellular-', '')}↔`).join(' · ');
}

export function TopNav({ day, clock, condition, healthy, events, routine, onSettings }: {
  day: number;
  clock: string;
  condition: string;
  healthy: boolean;
  events: PhysiologicalEvent[];
  routine: CellularRoutineEvent | null;
  onSettings: () => void;
}) {
  const visibleEvents = events.slice(0, routine ? 2 : 3);
  return (
    <header className="relative z-30 grid flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative grid size-9 place-items-center rounded-full border border-primary/40 text-primary"><Hexagon className="size-5" strokeWidth={1.5}/><span className="absolute size-1.5 rounded-full bg-primary"/></div>
        <div className="hidden leading-none sm:block"><h1 className="font-display text-sm text-hair text-foreground lg:text-base">HOMEOSTASIS</h1><p className="mt-1 text-[7px] text-hair text-muted-foreground">SIMULADOR FISIOLÓGICO</p></div>
      </div>

      <div className="scrollbar-thin flex min-w-0 items-center gap-1.5 overflow-x-auto" aria-label="Eventos recentes">
        <span className="hidden flex-none text-[8px] font-medium uppercase tracking-[.18em] text-muted-foreground lg:inline">Eventos</span>
        {routine && <div className={cn('event-chip border-warning/35', routine.severity === 'critical' && 'event-chip-critical')} title={routine.explanation}>
          <span className="event-dot bg-warning"/><span className="font-medium text-foreground">{routine.title}</span><span>{routineEffects[routine.id] ?? 'Estado↔ · ATP↔ · Resposta?'}</span>
        </div>}
        {visibleEvents.map((event, index) => <div key={`${event.timestamp}-${index}`} className={cn('event-chip', event.severity === 'critical' && 'event-chip-critical')} title={event.message}>
          <span className={cn('event-dot', event.severity === 'critical' ? 'bg-danger' : event.severity === 'warning' ? 'bg-warning' : 'bg-cyan')}/><span className="max-w-32 truncate font-medium text-foreground">{event.message}</span><span className="hidden xl:inline">{eventEffects(event)}</span>
        </div>)}
      </div>

      <div className="flex items-center gap-3 text-[9px] uppercase text-wide lg:gap-4">
        <div className="hidden items-center gap-2 text-muted-foreground md:flex"><span>Dia {day}</span><span className="text-primary/50">|</span><span className="tabular-nums text-foreground">{clock}</span></div>
        <div className="hidden items-center gap-2 lg:flex"><span className="text-muted-foreground">Condição:</span><span className="text-foreground">{condition}</span><span className={cn('size-2 rounded-full', healthy ? 'bg-good shadow-[0_0_8px_var(--good)]' : 'bg-danger shadow-[0_0_8px_var(--danger)]')}/></div>
        <button type="button" aria-label="Abrir configurações" onClick={onSettings} className="text-muted-foreground hover:text-primary"><Settings className="size-5" strokeWidth={1.5}/></button>
      </div>
    </header>
  );
}

export function Playback({ running, speed, onToggle, onSpeed }: { running: boolean; speed: number; onToggle: () => void; onSpeed: () => void }) {
  const Icon = running ? Pause : Play;
  const label = running ? 'Pausar simulação' : 'Executar simulação';
  return <GlassPanel className="flex items-center gap-1 p-1.5"><button type="button" onClick={onToggle} aria-label={label} title={label} className="grid size-11 place-items-center rounded-md text-primary hover:bg-primary/10"><Icon className={cn('size-4', !running && 'fill-current')}/></button><span className="mx-1 h-5 w-px bg-white/10"/><button type="button" onClick={onSpeed} className="h-11 min-w-11 px-2 text-sm font-medium tabular-nums text-foreground hover:text-primary" aria-label="Alterar velocidade">{speed}x</button></GlassPanel>;
}

export function Stepper({ active, onChange }: { active: StepKey; onChange: (step: StepKey) => void }) {
  return <div className="scrollbar-thin pointer-events-auto max-w-full overflow-x-auto px-1"><div className="flex min-w-max items-center justify-center">{STEPS.map((step, index) => { const Icon = step.icon; const selected = step.id === active; return <div key={step.id} className="flex items-center">{index > 0 && <span className={cn('h-px w-5 sm:w-9', selected ? 'bg-primary/50' : 'bg-white/10')}/>}<button type="button" data-active={selected} onClick={() => onChange(step.id)} aria-label={step.label} aria-current={selected ? 'step' : undefined} title={step.label} className={cn('stepper-node relative grid size-10 place-items-center rounded-full border transition-all sm:size-11', selected ? 'border-primary/70 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground hover:border-primary/40 hover:text-foreground')}><Icon className="relative z-10 size-4" strokeWidth={1.5}/></button></div>; })}</div></div>;
}
