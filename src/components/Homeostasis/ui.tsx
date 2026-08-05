import { forwardRef, useId, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  soft?: boolean;
  hover?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel({ children, soft, hover, className, ...props }, ref) {
  return (
    <div ref={ref} className={cn(soft ? 'glass-soft' : 'glass', hover && 'glass-hover', 'rounded-xl', className)} {...props}>
      {children}
    </div>
  );
});

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
        <strong className="block text-[11px] uppercase tracking-wider text-primary">{title}</strong>
        <div className="mt-1.5 text-[11px] normal-case leading-relaxed tracking-normal text-muted-foreground">{children}</div>
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
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
        <span className={cn('ml-auto size-2 rounded-full', good ? 'bg-good shadow-[0_0_8px_var(--good)]' : 'bg-warning shadow-[0_0_8px_var(--warning)]')} />
      </div>
      {detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}
      {history && <div className="mt-2"><Sparkline data={history} color={color} height={25} /></div>}
    </GlassPanel>
  );
}

export function ProgressBar({ value, color = 'var(--primary)' }: { value: number; color?: string }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>;
}
