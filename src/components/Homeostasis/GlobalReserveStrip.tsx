import { useSimulationStore } from '../../game/simulationStore';
import { GlassPanel, cn } from './ui';

export function GlobalReserveStrip() {
  const atp = useSimulationStore(state => state.physiology.energy.atpPool / state.physiology.energy.maxATP * 100);
  const perfusion = useSimulationStore(state => state.physiology.cardiovascular.perfusionIndex);
  const oxygen = useSimulationStore(state => state.physiology.respiratory.spo2);
  const pH = useSimulationStore(state => state.physiology.acidBase.pH);
  const viability = useSimulationStore(state => state.cellular.cell.viabilityPercent);
  const acidBaseReserve = Math.max(0, 100 - Math.abs(pH - 7.4) / .4 * 100);
  const values = [
    ['ATP', atp],
    ['Perfusão', perfusion],
    ['O₂', oxygen],
    ['pH', acidBaseReserve],
    ['Viabilidade', viability],
  ] as const;
  return (
    <GlassPanel soft className="pointer-events-none absolute left-1/2 top-[58px] z-20 hidden -translate-x-1/2 items-center gap-3 rounded-full px-3 py-2 lg:flex" aria-label="Reservas fisiológicas globais">
      {values.map(([label, value]) => <div key={label} className="w-20"><div className="mb-1 flex items-center justify-between text-[8px] uppercase tracking-wider text-muted-foreground"><span>{label}</span><span className={cn('font-mono', value < 40 ? 'text-danger' : value < 70 ? 'text-warning' : 'text-good')}>{value.toFixed(0)}</span></div><div className="h-0.5 overflow-hidden rounded-full bg-white/10"><div className={cn('h-full rounded-full', value < 40 ? 'bg-danger' : value < 70 ? 'bg-warning' : 'bg-good')} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div></div>)}
    </GlassPanel>
  );
}
