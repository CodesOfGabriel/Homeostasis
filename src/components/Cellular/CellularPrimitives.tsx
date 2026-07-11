import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type MetricTone = 'neutral' | 'normal' | 'warning' | 'critical' | 'atp' | 'oxygen';

interface ClinicalPanelProps {
    children: ReactNode;
    className?: string;
    ariaLabel?: string;
}

export function ClinicalPanel({ children, className = '', ariaLabel }: ClinicalPanelProps) {
    return (
        <section
            className={`border border-app-border/80 bg-app-surface/90 ${className}`}
            aria-label={ariaLabel}
        >
            {children}
        </section>
    );
}

interface PanelHeadingProps {
    title: string;
    eyebrow?: string;
    action?: ReactNode;
}

export function PanelHeading({ title, eyebrow, action }: PanelHeadingProps) {
    return (
        <header className="flex min-h-10 items-center justify-between gap-3 border-b border-app-border/80 px-3 py-2">
            <div className="min-w-0">
                {eyebrow && (
                    <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-dim">
                        {eyebrow}
                    </div>
                )}
                <h2 className="text-[11px] font-semibold uppercase leading-snug tracking-[0.18em] text-text-primary">
                    {title}
                </h2>
            </div>
            {action}
        </header>
    );
}

interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    hint?: string;
    tone?: MetricTone;
    decimals?: number;
}

function metricToneClass(tone: MetricTone): string {
    if (tone === 'normal') return 'text-status-normal';
    if (tone === 'warning') return 'text-status-warning';
    if (tone === 'critical') return 'text-status-critical';
    if (tone === 'atp') return 'text-data-atp';
    if (tone === 'oxygen') return 'text-data-o2';
    return 'text-text-primary';
}

export function MetricCard({
    label,
    value,
    unit = '',
    hint,
    tone = 'neutral',
    decimals = 1,
}: MetricCardProps) {
    const formattedValue = typeof value === 'number' ? value.toFixed(decimals) : value;

    return (
        <div
            className="min-w-0 border-b border-app-border/70 bg-transparent px-0 pb-2 pt-1"
            aria-label={`${label}: ${formattedValue}${unit ? ` ${unit}` : ''}${hint ? `. ${hint}` : ''}`}
        >
            <div className="min-h-6 text-[9px] font-medium uppercase leading-snug tracking-[0.18em] text-text-dim">
                {label}
            </div>
            <div className="mt-0.5 flex min-w-0 items-baseline gap-1">
                <output className={`truncate font-mono text-base tabular-nums leading-none ${metricToneClass(tone)}`}>
                    {formattedValue}
                </output>
                {unit && <span className="truncate text-[10px] text-text-secondary">{unit}</span>}
            </div>
            {hint && <div className="mt-0.5 text-[10px] leading-snug text-text-dim">{hint}</div>}
        </div>
    );
}

interface LevelBarProps {
    label: string;
    value: number;
    max?: number;
    valueLabel?: string;
    tone?: Exclude<MetricTone, 'neutral'>;
}

function barToneClass(tone: Exclude<MetricTone, 'neutral'>): string {
    if (tone === 'normal') return 'bg-status-normal';
    if (tone === 'warning') return 'bg-status-warning';
    if (tone === 'critical') return 'bg-status-critical';
    if (tone === 'atp') return 'bg-data-atp';
    return 'bg-data-o2';
}

export function LevelBar({ label, value, max = 100, valueLabel, tone = 'normal' }: LevelBarProps) {
    const percentage = Math.max(0, Math.min(100, (value / Math.max(0.001, max)) * 100));

    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.18em] text-text-dim">
                <span>{label}</span>
                <span className="font-mono tabular-nums text-text-primary">
                    {valueLabel ?? `${value.toFixed(0)}%`}
                </span>
            </div>
            <div
                className="h-1 overflow-hidden bg-app-border/80"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={Math.max(0, Math.min(max, value))}
                aria-valuetext={valueLabel ?? `${value.toFixed(0)}%`}
            >
                <div
                    className={`h-full transition-all duration-300 ${barToneClass(tone)}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

interface WireButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    critical?: boolean;
}

export function WireButton({
    active = false,
    critical = false,
    className = '',
    type = 'button',
    ...props
}: WireButtonProps) {
    const toneClass = critical
        ? 'border-status-critical text-status-critical hover:bg-status-critical/10'
        : active
            ? 'border-data-atp bg-data-atp/10 text-data-atp'
            : 'border-app-border bg-transparent text-text-primary hover:border-text-secondary hover:bg-app-hover';

    return (
        <button
            type={type}
            className={`min-h-10 border px-3 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal disabled:cursor-not-allowed disabled:border-app-border disabled:text-text-disabled disabled:hover:bg-transparent ${toneClass} ${className}`}
            {...props}
        />
    );
}
