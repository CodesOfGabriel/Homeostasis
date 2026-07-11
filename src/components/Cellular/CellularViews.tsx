import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Atom, Factory, Flame, Wind, Zap } from 'lucide-react';
import type {
    CellularState,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
} from '../../game/cellularTypes';
import { ClinicalPanel, PanelHeading, WireButton } from './CellularPrimitives';
import { TissueFlowAnimation } from './TissueFlowAnimation';

interface CellularViewProps {
    cellular: CellularState;
    onCapture: (kind: SubstrateKind) => boolean;
}

interface ResourceMeta {
    label: string;
    formula: string;
    role: string;
    transport: string;
    captureAmount: number;
    capacity: number;
    icon: typeof Zap;
    borderClass: string;
    textClass: string;
    barClass: string;
}

const RESOURCE_META: Record<SubstrateKind, ResourceMeta> = {
    glucose: {
        label: 'Glicose',
        formula: 'C₆H₁₂O₆',
        role: 'Alimenta a glicólise e gera piruvato.',
        transport: 'Transportadores de glicose',
        captureAmount: 1,
        capacity: 6,
        icon: Zap,
        borderClass: 'border-data-glucose',
        textClass: 'text-data-glucose',
        barClass: 'bg-data-glucose',
    },
    oxygen: {
        label: 'Oxigênio',
        formula: 'O₂',
        role: 'Sustenta a cadeia respiratória mitocondrial.',
        transport: 'Difusão através da membrana',
        captureAmount: 3,
        capacity: 20,
        icon: Wind,
        borderClass: 'border-data-o2',
        textClass: 'text-data-o2',
        barClass: 'bg-data-o2',
    },
    fattyAcid: {
        label: 'Ácido graxo',
        formula: 'Lipídio circulante',
        role: 'Combustível de alto rendimento para beta-oxidação.',
        transport: 'Translocase de ácidos graxos',
        captureAmount: 0.5,
        capacity: 4,
        icon: Flame,
        borderClass: 'border-data-lactate',
        textClass: 'text-data-lactate',
        barClass: 'bg-data-lactate',
    },
    aminoAcid: {
        label: 'Aminoácido',
        formula: 'Unidade de proteína',
        role: 'Constrói transportadores e maquinaria de reparo.',
        transport: 'Cotransporte de aminoácidos',
        captureAmount: 0.5,
        capacity: 4,
        icon: Atom,
        borderClass: 'border-status-optimal',
        textClass: 'text-status-optimal',
        barClass: 'bg-status-optimal',
    },
};

function clearTimer(timer: React.MutableRefObject<number | null>) {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
}

function ManualResourceCard({
    kind,
    cellular,
    onCapture,
    onFeedback,
}: {
    kind: SubstrateKind;
    cellular: CellularState;
    onCapture: (kind: SubstrateKind) => boolean;
    onFeedback: (message: string, succeeded: boolean) => void;
}) {
    const meta = RESOURCE_META[kind];
    const available = cellular.pools.available[kind];
    const captured = cellular.pools.captured[kind];
    const saturation = Math.min(100, captured / meta.capacity * 100);
    const canCapture = available >= meta.captureAmount
        && captured + meta.captureAmount <= meta.capacity;
    const holdTimer = useRef<number | null>(null);
    const repeatTimer = useRef<number | null>(null);
    const repeated = useRef(false);
    const Icon = meta.icon;

    const attemptCapture = () => {
        const succeeded = onCapture(kind);
        onFeedback(
            succeeded
                ? `${meta.label} transferido do tecido para a célula.`
                : `${meta.label} indisponível: aguarde perfusão ou processe a reserva.`,
            succeeded,
        );
        return succeeded;
    };

    const stopHolding = () => {
        clearTimer(holdTimer);
        if (repeatTimer.current !== null) window.clearInterval(repeatTimer.current);
        repeatTimer.current = null;
    };

    useEffect(() => stopHolding, []);

    const beginHolding = () => {
        if (!canCapture) return;
        repeated.current = false;
        holdTimer.current = window.setTimeout(() => {
            repeated.current = true;
            attemptCapture();
            repeatTimer.current = window.setInterval(() => {
                if (!attemptCapture()) stopHolding();
            }, 190);
        }, 360);
    };

    const handleClick = () => {
        if (repeated.current) {
            repeated.current = false;
            return;
        }
        attemptCapture();
    };

    const automationLevel = cellular.automation.transporters;
    const status = captured + meta.captureAmount > meta.capacity
        ? 'Reserva cheia'
        : available < meta.captureAmount
            ? 'Aguardando perfusão'
            : 'Disponível para coleta';

    return (
        <button
            type="button"
            onClick={handleClick}
            onPointerDown={beginHolding}
            onPointerUp={stopHolding}
            onPointerCancel={stopHolding}
            onPointerLeave={stopHolding}
            disabled={!canCapture}
            className={`group relative min-h-40 overflow-hidden border bg-app-bg p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-optimal disabled:cursor-not-allowed disabled:border-app-border disabled:opacity-55 ${meta.borderClass}`}
            aria-label={`Coletar ${meta.label}. ${available.toFixed(1)} no tecido e ${captured.toFixed(1)} na célula`}
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`flex h-9 w-9 items-center justify-center border bg-black/30 ${meta.borderClass} ${meta.textClass}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="border border-app-border px-2 py-1 text-[8px] uppercase tracking-wider text-text-secondary">
                    {status}
                </span>
            </div>
            <div className={`mt-3 text-sm font-semibold uppercase tracking-wider ${meta.textClass}`}>{meta.label}</div>
            <div className="font-mono text-[9px] text-text-secondary">{meta.formula} · {meta.transport}</div>
            <p className="mt-1 text-[9px] leading-relaxed text-text-secondary">{meta.role}</p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-[9px] uppercase tracking-wider text-text-secondary">
                <span>No tecido<strong className="block font-mono text-sm font-medium text-text-primary">{available.toFixed(1)}</strong></span>
                <span className="text-right">Na célula<strong className="block font-mono text-sm font-medium text-text-primary">{captured.toFixed(1)} / {meta.capacity}</strong></span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden bg-app-border">
                <div className={`h-full transition-all duration-200 ${meta.barClass}`} style={{ width: `${saturation}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[8px] uppercase tracking-wider text-text-secondary">
                <span>Clique ou segure</span>
                <span>Automação nível {automationLevel} de 4</span>
            </div>
        </button>
    );
}

export function TissueView({ cellular, onCapture }: CellularViewProps) {
    const [feedback, setFeedback] = useState({
        message: 'Escolha um substrato. Segure o botão para coleta contínua.',
        succeeded: true,
    });
    const collection = cellular.collection ?? { score: 0, chain: 0, lastCaptureAt: -10 };
    const chainActive = collection.chain > 0
        && cellular.simulationTime - collection.lastCaptureAt <= 3.2;

    return (
        <ClinicalPanel className="flex min-h-[620px] flex-col overflow-y-auto xl:h-full xl:min-h-0" ariaLabel="Tecido e célula">
            <PanelHeading
                eyebrow="Operação celular"
                title="Tecido e célula · captação manual de substratos"
                action={(
                    <div className="flex items-center gap-3 font-mono text-[9px] text-text-secondary">
                        <span>Pontuação <strong className="text-data-atp">{collection.score}</strong></span>
                        <span>Cadeia <strong className={chainActive ? 'text-status-optimal' : 'text-text-dim'}>{chainActive ? `×${collection.chain}` : '—'}</strong></span>
                    </div>
                )}
            />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-app-border xl:grid-cols-12">
                <section className="relative min-h-64 overflow-hidden bg-black xl:col-span-5" aria-label="Microcirculação do tecido">
                    <TissueFlowAnimation />
                    <div className="absolute inset-x-3 top-3 border border-app-border bg-black/80 p-3 backdrop-blur-sm">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-text-primary">Fluxo capilar ativo</div>
                        <div className="mt-1 text-[9px] leading-relaxed text-text-secondary">
                            A perfusão repõe os recursos no tecido. A coleta transfere esses recursos para a reserva intracelular.
                        </div>
                    </div>
                    <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-px border border-app-border bg-app-border text-center">
                        <div className="bg-black/85 p-2"><span className="block text-[8px] uppercase text-text-secondary">Viabilidade</span><strong className="font-mono text-sm text-status-normal">{cellular.cell.viabilityPercent.toFixed(0)}%</strong></div>
                        <div className="bg-black/85 p-2"><span className="block text-[8px] uppercase text-text-secondary">Energia celular</span><strong className="font-mono text-sm text-data-atp">{cellular.cell.atpMmolL.toFixed(2)}</strong></div>
                        <div className="bg-black/85 p-2"><span className="block text-[8px] uppercase text-text-secondary">Perfusão</span><strong className="font-mono text-sm text-data-o2">{cellular.tissue.perfusionPercent.toFixed(0)}%</strong></div>
                    </div>
                </section>

                <section className="bg-app-surface p-3 xl:col-span-7" aria-label="Coletores manuais">
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-primary">Coletores de membrana</div>
                            <div className="mt-1 text-[9px] text-text-secondary">Colete, processe na maquinaria e volte para buscar mais.</div>
                        </div>
                        <span className="text-right text-[8px] uppercase tracking-wider text-text-dim">Limites impedem armazenamento infinito</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(Object.keys(RESOURCE_META) as SubstrateKind[]).map(kind => (
                            <ManualResourceCard
                                key={kind}
                                kind={kind}
                                cellular={cellular}
                                onCapture={onCapture}
                                onFeedback={(message, succeeded) => setFeedback({ message, succeeded })}
                            />
                        ))}
                    </div>
                    <div className={`mt-3 border-l-2 px-3 py-2 text-[10px] ${feedback.succeeded ? 'border-status-optimal bg-status-optimal/5 text-status-optimal' : 'border-status-warning bg-status-warning/5 text-status-warning'}`} role="status" aria-live="polite">
                        {feedback.message}
                    </div>
                </section>
            </div>
        </ClinicalPanel>
    );
}

interface MachineryViewProps {
    cellular: CellularState;
    onGlycolysis: () => boolean;
    onOxidize: (kind: OxidationSubstrate) => boolean;
    onAllocateAtp: (target: RepairTarget) => boolean;
}

function Requirement({ label, value, enough }: { label: string; value: string; enough: boolean }) {
    return (
        <span className={enough ? 'border border-status-normal/30 px-2 py-1 text-[8px] text-status-normal' : 'border border-status-warning/40 px-2 py-1 text-[8px] text-status-warning'}>
            {label} {value}
        </span>
    );
}

function RouteCard({
    index,
    title,
    description,
    requirements,
    actionLabel,
    disabled,
    onAction,
}: {
    index: string;
    title: string;
    description: string;
    requirements: React.ReactNode;
    actionLabel: string;
    disabled: boolean;
    onAction: () => void;
}) {
    return (
        <section className="flex min-h-56 flex-col border border-app-border bg-app-bg p-3">
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] text-data-atp">ROTA {index}</span>
                <Factory className="h-4 w-4 text-text-dim" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-xs font-semibold uppercase tracking-wider text-text-primary">{title}</h3>
            <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">{description}</p>
            <div className="mt-3 flex flex-wrap gap-1">{requirements}</div>
            <WireButton className="mt-auto w-full" onClick={onAction} disabled={disabled}>{actionLabel}</WireButton>
        </section>
    );
}

export function MachineryView({ cellular, onGlycolysis, onOxidize, onAllocateAtp }: MachineryViewProps) {
    const [message, setMessage] = useState('A maquinaria está pronta. Escolha uma rota de produção.');
    const run = (action: () => boolean, success: string, failure: string) => {
        setMessage(action() ? success : failure);
    };
    const canGlycolysis = cellular.pools.captured.glucose >= 1 && cellular.cell.atpMmolL <= 5.72;
    const canOxidizePyruvate = cellular.pools.pyruvate >= 1
        && cellular.pools.captured.oxygen >= 3
        && cellular.cell.adpMmolL >= 0.45;
    const canOxidizeFat = cellular.pools.captured.fattyAcid >= 1
        && cellular.pools.captured.oxygen >= 6
        && cellular.cell.adpMmolL >= 0.85;

    return (
        <ClinicalPanel className="flex min-h-[620px] flex-col overflow-y-auto xl:h-full xl:min-h-0" ariaLabel="Maquinaria e rotas bioquímicas">
            <PanelHeading
                eyebrow="Produção celular"
                title="Maquinaria · rotas bioquímicas"
                action={<span className="font-mono text-[10px] text-data-atp">Energia {cellular.cell.atpMmolL.toFixed(2)} mmol/L</span>}
            />

            <div className="border-b border-app-border bg-app-bg p-3">
                <div className="grid grid-cols-5 gap-px border border-app-border bg-app-border text-center">
                    <div className="bg-app-surface p-2"><span className="block text-[8px] uppercase text-text-secondary">Glicose</span><strong className="font-mono text-data-glucose">{cellular.pools.captured.glucose.toFixed(1)}</strong></div>
                    <div className="bg-app-surface p-2"><span className="block text-[8px] uppercase text-text-secondary">Oxigênio</span><strong className="font-mono text-data-o2">{cellular.pools.captured.oxygen.toFixed(1)}</strong></div>
                    <div className="bg-app-surface p-2"><span className="block text-[8px] uppercase text-text-secondary">Ácido graxo</span><strong className="font-mono text-data-lactate">{cellular.pools.captured.fattyAcid.toFixed(1)}</strong></div>
                    <div className="bg-app-surface p-2"><span className="block text-[8px] uppercase text-text-secondary">Aminoácido</span><strong className="font-mono text-status-optimal">{cellular.pools.captured.aminoAcid.toFixed(1)}</strong></div>
                    <div className="bg-app-surface p-2"><span className="block text-[8px] uppercase text-text-secondary">Piruvato</span><strong className="font-mono text-text-primary">{cellular.pools.pyruvate.toFixed(1)}</strong></div>
                </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2 bg-app-surface p-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
                <RouteCard
                    index="01"
                    title="Glicólise"
                    description="Converte glicose em dois piruvatos, adenosina trifosfato citosólica e nicotinamida adenina dinucleotídeo reduzida."
                    requirements={<Requirement label="Glicose" value="1,0" enough={cellular.pools.captured.glucose >= 1} />}
                    actionLabel="Processar glicose"
                    disabled={!canGlycolysis}
                    onAction={() => run(onGlycolysis, 'Glicólise concluída: dois piruvatos disponíveis.', 'Glicólise bloqueada: colete glicose ou consuma a energia acumulada.')}
                />
                <div className="hidden items-center justify-center lg:flex"><ArrowRight className="h-5 w-5 text-text-dim" aria-hidden="true" /></div>
                <section className="flex min-h-56 flex-col gap-2 border border-app-border bg-app-bg p-3">
                    <div className="font-mono text-[9px] text-data-atp">ROTA 02</div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">Oxidação mitocondrial</h3>
                    <div className="border border-data-glucose/40 p-2">
                        <div className="text-[9px] text-text-secondary">Piruvato + 3 oxigênios</div>
                        <WireButton className="mt-2 w-full" disabled={!canOxidizePyruvate} onClick={() => run(() => onOxidize('pyruvate'), 'Piruvato oxidado; energia mitocondrial produzida.', 'Oxidação bloqueada: confira piruvato, oxigênio e adenosina difosfato.')}>Oxidar piruvato</WireButton>
                    </div>
                    <div className="border border-data-lactate/40 p-2">
                        <div className="text-[9px] text-text-secondary">Ácido graxo + 6 oxigênios</div>
                        <WireButton className="mt-2 w-full" disabled={!canOxidizeFat} onClick={() => run(() => onOxidize('fattyAcid'), 'Beta-oxidação concluída; alto rendimento energético.', 'Beta-oxidação bloqueada: confira ácido graxo, oxigênio e adenosina difosfato.')}>Executar beta-oxidação</WireButton>
                    </div>
                </section>
                <div className="hidden items-center justify-center lg:flex"><ArrowRight className="h-5 w-5 text-text-dim" aria-hidden="true" /></div>
                <section className="flex min-h-56 flex-col border border-app-border bg-app-bg p-3">
                    <div className="font-mono text-[9px] text-data-atp">ROTA 03</div>
                    <h3 className="mt-2 text-xs font-semibold uppercase tracking-wider text-text-primary">Alocação e reparo</h3>
                    <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">Consome energia produzida para estabilizar a célula.</p>
                    <div className="mt-3 space-y-2">
                        <WireButton className="w-full" onClick={() => run(() => onAllocateAtp('membrane'), 'Membrana e bombas iônicas reparadas.', 'Não há dano suficiente ou falta energia.')} disabled={cellular.cell.atpMmolL < 1.25 || cellular.damage.membrane <= 0.1}>Reparar membrana</WireButton>
                        <WireButton className="w-full" onClick={() => run(() => onAllocateAtp('proteins'), 'Proteínas celulares reparadas.', 'Não há dano suficiente ou falta energia.')} disabled={cellular.cell.atpMmolL < 1.3 || cellular.damage.proteins <= 0.1}>Reparar proteínas</WireButton>
                        <WireButton className="w-full" onClick={() => run(() => onAllocateAtp('antioxidants'), 'Defesas antioxidantes restauradas.', 'Defesas completas ou falta energia.')} disabled={cellular.cell.atpMmolL < 1.15 || (cellular.damage.antioxidantCapacity >= 98 && cellular.damage.oxidativeStress <= 5)}>Restaurar antioxidantes</WireButton>
                    </div>
                </section>
            </div>

            <div className="border-t border-app-border bg-app-bg px-3 py-2 text-[10px] text-text-secondary" role="status" aria-live="polite">
                {message}
            </div>
        </ClinicalPanel>
    );
}
