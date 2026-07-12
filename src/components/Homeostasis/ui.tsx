import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { HelpCircle, Minus, Plus } from 'lucide-react';

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  soft?: boolean;
  hover?: boolean;
}

export function GlassPanel({ children, soft, hover, className, ...props }: GlassPanelProps) {
  return (
    <div className={cn(soft ? 'glass-soft' : 'glass', hover && 'glass-hover', 'rounded-xl', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelLabel({ children, icon, className }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return <div className={cn('panel-label', className)}>{icon}<span>{children}</span></div>;
}

export function ActionButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn('action-button', className)} {...props}>{children}</button>;
}

export function HelpTip({ title, children, align = 'left' }: { title: string; children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <details className="help-tip relative">
      <summary className="grid size-5 cursor-pointer list-none place-items-center rounded-full border border-white/15 bg-black/25 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary" aria-label={`Ajuda: ${title}`}>
        <HelpCircle className="size-3.5"/>
      </summary>
      <div className={cn('absolute top-7 z-40 w-64 rounded-lg border border-primary/25 bg-[#111722]/95 p-3 text-left shadow-2xl backdrop-blur-xl', align === 'right' ? 'right-0' : 'left-0')}>
        <strong className="block text-[10px] uppercase tracking-wider text-primary">{title}</strong>
        <div className="mt-1.5 text-[10px] normal-case leading-relaxed tracking-normal text-muted-foreground">{children}</div>
      </div>
    </details>
  );
}

export function Sparkline({ data, color = 'var(--teal)', height = 32 }: { data: number[]; color?: string; height?: number }) {
  const id = useId();
  const values = data.length > 1 ? data : [data[0] ?? 0, data[0] ?? 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = index / (values.length - 1) * 100;
    const y = height - 3 - (value - min) / range * (height - 6);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
      <defs><linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".35"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={`${line} L100,${height} L0,${height} Z`} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MetricCard({ label, value, unit, detail, history, color = 'var(--teal)', good = true }: {
  label: string; value: string | number; unit?: string; detail?: string; history?: number[]; color?: string; good?: boolean;
}) {
  return (
    <GlassPanel soft hover className="min-w-0 p-3">
      <PanelLabel>{label}</PanelLabel>
      <div className="mt-1 flex items-baseline gap-1">
        <strong className="font-display text-xl font-medium tabular-nums text-foreground">{value}</strong>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        <span className={cn('ml-auto size-2 rounded-full', good ? 'bg-good shadow-[0_0_8px_var(--good)]' : 'bg-warning shadow-[0_0_8px_var(--warning)]')} />
      </div>
      {detail && <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>}
      {history && <div className="mt-2"><Sparkline data={history} color={color} height={25} /></div>}
    </GlassPanel>
  );
}

export function ProgressBar({ value, color = 'var(--primary)' }: { value: number; color?: string }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>;
}

export function RangeControl({ label, value, min, max, step = 1, unit, measured, description, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit: string; measured?: string; description?: string; onChange: (value: number) => void;
}) {
  const id = useId();
  const precision = step < 1 ? 1 : 0;
  const update = (next: number) => onChange(Math.max(min, Math.min(max, Number(next.toFixed(Math.max(0, precision))))));
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><label htmlFor={id} className="block text-[11px] font-medium text-foreground">{label}</label>{description && <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{description}</p>}</div>
        <strong className="shrink-0 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-[11px] font-medium text-primary">{value.toFixed(precision)} {unit}</strong>
      </div>
      <div className="mt-3 grid grid-cols-[30px_minmax(0,1fr)_30px] items-center gap-2">
        <button type="button" className="grid size-[30px] place-items-center rounded-md border border-white/10 bg-white/[.03] text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30" onClick={() => update(value - step)} disabled={value <= min} aria-label={`Diminuir ${label}`}><Minus className="size-3.5"/></button>
        <input id={id} className="range-control" type="range" min={min} max={max} step={step} value={value} onChange={event => update(Number(event.target.value))} aria-valuetext={`${value.toFixed(precision)} ${unit}`}/>
        <button type="button" className="grid size-[30px] place-items-center rounded-md border border-white/10 bg-white/[.03] text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30" onClick={() => update(value + step)} disabled={value >= max} aria-label={`Aumentar ${label}`}><Plus className="size-3.5"/></button>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[8px] text-muted-foreground/70"><span>{min.toFixed(precision)} {unit}</span><span>{max.toFixed(precision)} {unit}</span></div>
      {measured && <div className="mt-2 rounded-md border border-white/5 bg-black/15 px-2.5 py-2 text-[9px] text-muted-foreground">Resposta observada: <strong className="font-mono font-medium text-foreground">{measured}</strong></div>}
    </div>
  );
}
