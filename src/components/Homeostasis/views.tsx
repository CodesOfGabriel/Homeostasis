import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Atom, Bot, ChevronDown, CircleDot, Crosshair, Dna, Flame, Layers3, LockKeyhole, RefreshCw, Shield, Target, Wind, Zap } from 'lucide-react';
import { AUTOMATION_MAX_LEVEL, CAPTURE_AMOUNTS, CAPTURED_POOL_CAPS, CELLULAR_OPTIMIZATION_BUDGET, getAutomationRecipe, getCellularAutomationPerformance } from '../../game/cellularSimulation';
import type { AutomationKind, OxidationSubstrate, RepairTarget, SubstrateKind } from '../../game/cellularTypes';
import { getScenarioDefinition } from '../../game/scenarios';
import {
  SCENARIO_METRIC_CATALOG,
  getScenarioMetricKeysByGroup,
  type ScenarioMetricGroup,
  type ScenarioMetricKey,
} from '../../game/scenarioMetrics';
import { useSimulationStore } from '../../game/simulationStore';
import { CellularFlowScene, type FlowChipDatum, type FlowSubstrateStatus } from './CellularFlowScene';
import { ElectronTransportChain } from './ElectronTransportChain';
import { ActionButton, GlassPanel, HelpTip, MetricCard, PanelLabel, ProgressBar, Sparkline, cn } from './ui';

const resourceMeta: Record<SubstrateKind, { label: string; receptor: string; unit: string; icon: typeof Zap; color: string; cost: string; effect: string; risk: string }> = {
  glucose: { label: 'Glicose', receptor: 'GLUT4', unit: '1 pacote', icon: Zap, color: 'var(--good)', cost: 'recrutado por insulina e contração', effect: 'Glicólise, piruvato e glicogênio', risk: 'Com pouca oxidação: maior pressão glicolítica e redox' },
  oxygen: { label: 'Oxigênio', receptor: 'difusão de O₂', unit: 'fluxo automático', icon: Wind, color: 'var(--cyan)', cost: 'gradiente de PO₂ + perfusão', effect: 'aceitador final da CTE', risk: 'ROS depende do fluxo ETC e do estado redox, não de um estoque de O₂' },
  fattyAcid: { label: 'Ácido graxo', receptor: 'CD36 / FATP', unit: '0,5 pacote', icon: Flame, color: 'var(--warning)', cost: 'transporte + CPT-1', effect: 'Beta-oxidação de alto rendimento', risk: 'Exige O₂ e eleva pressão redox' },
  aminoAcid: { label: 'Aminoácido', receptor: 'LAT1–4F2hc', unit: '0,5 pacote', icon: Atom, color: 'var(--primary)', cost: 'antiporte de aminoácidos neutros', effect: 'Reparo e síntese proteica', risk: 'Excesso aumenta carga nitrogenada' },
};

const statusLabels: Record<FlowSubstrateStatus, string> = {
  available: 'em equilíbrio', capturable: 'gradiente favorável', cooldown: 'recuperação de transporte', limited: 'oferta intersticial baixa', excess: 'oferta acima da demanda', toxic: 'sobrecarga metabólica', blocked: 'capacidade de transporte saturada', selected: 'em análise',
};
const adaptationLabels = {
  enzymaticEfficiency: 'Enzimas', antioxidantDefense: 'Antioxidantes', metabolicFlexibility: 'Flexibilidade', bufferCapacity: 'Buffer', hypoxiaTolerance: 'Hipóxia',
};
const saturationConsequences: Record<SubstrateKind, string> = {
  glucose: 'acúmulo aumenta ROS e glicotoxicidade; processe por glicólise antes de captar mais',
  oxygen: 'o fluxo acompanha PO₂, perfusão e consumo mitocondrial; não é um transportador saturável',
  fattyAcid: 'acúmulo causa lipotoxicidade, dano de membrana e estresse proteico',
  aminoAcid: 'acúmulo aumenta carga nitrogenada, resíduos e estresse de síntese',
};

function substrateStatus(kind: SubstrateKind, available: number, captured: number, tissue: { glucoseMmolL: number; oxygenMmHg: number }): FlowSubstrateStatus {
  if (kind === 'oxygen') return tissue.oxygenMmHg < 25 ? 'limited' : 'available';
  if (captured + CAPTURE_AMOUNTS[kind] > CAPTURED_POOL_CAPS[kind]) return 'blocked';
  if (available < CAPTURE_AMOUNTS[kind]) return 'limited';
  if (kind === 'glucose' && tissue.glucoseMmolL > 11) return 'toxic';
  if (kind === 'fattyAcid' && available > 3.2 && tissue.oxygenMmHg < 25) return 'toxic';
  if ((kind === 'glucose' && tissue.glucoseMmolL > 7) || (kind === 'fattyAcid' && available > 3.2) || (kind === 'aminoAcid' && available > 3.4)) return 'excess';
  return captured < CAPTURE_AMOUNTS[kind] ? 'capturable' : 'available';
}

function substrateStatusExplanation(kind: SubstrateKind, status: FlowSubstrateStatus) {
  const meta = resourceMeta[kind];
  if (kind === 'oxygen') return status === 'limited'
    ? 'PO₂ tecidual baixa: melhore ventilação e perfusão para ampliar a entrega à cadeia respiratória.'
    : 'O₂ difunde continuamente segundo PO₂, perfusão e consumo; não há botão fisiológico de captação.';
  if (status === 'blocked') return `${meta.receptor}: pool intracelular saturado; processe o substrato antes de aumentar a captação.`;
  if (status === 'limited') return `Entrega capilar reduzida: há pouco ${meta.label.toLowerCase()} disponível no interstício.`;
  if (status === 'excess') return `Oferta acima da demanda atual; a captação extra aumenta o risco descrito para ${meta.label.toLowerCase()}.`;
  if (status === 'toxic') return kind === 'glucose' ? 'Sobrecarga glicêmica: a entrada adicional favorece estresse redox e ROS.' : 'Sobrecarga lipídica com oxigenação insuficiente: a oxidação pode elevar ROS.';
  if (status === 'cooldown') return `${meta.receptor} está recuperando o gradiente após uma captação recente.`;
  if (status === 'capturable') return `${meta.receptor} tem gradiente favorável para uma nova captação.`;
  return `Oferta e capacidade de ${meta.receptor} estão equilibradas neste instante.`;
}

function substrateStatusLabel(kind: SubstrateKind, status: FlowSubstrateStatus) {
  if (status === 'blocked') return `${resourceMeta[kind].receptor} saturado`;
  return statusLabels[status];
}

function CompactTissueMetric({ label, value, unit, history, color = 'var(--teal)', good }: { label: string; value: string; unit?: string; history: number[]; color?: string; good: boolean }) {
  return <div className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2">
    <div className="flex items-center gap-2"><span className={cn('size-1.5 rounded-full', good ? 'bg-good' : 'bg-warning')}/><span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span><strong className="ml-auto font-mono text-sm font-medium text-foreground">{value}<small className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</small></strong></div>
    <div className="mt-1 opacity-75"><Sparkline data={history} color={color} height={15}/></div>
  </div>;
}

type InvestigationMetricScope = 'priority' | ScenarioMetricGroup;

const investigationMetricScopes: Array<{ id: InvestigationMetricScope; label: string }> = [
  { id: 'priority', label: 'Prioritárias' },
  { id: 'system', label: 'Sistema' },
  { id: 'endocrine', label: 'Hormônios' },
  { id: 'tissue', label: 'Tecido' },
  { id: 'cell', label: 'Célula' },
  { id: 'mitochondria', label: 'Mitocôndria' },
  { id: 'pools', label: 'Pools' },
];

function investigationMetric(
  definition: typeof SCENARIO_METRIC_CATALOG[ScenarioMetricKey],
  current: number,
  initial: number | undefined,
) {
  const difference = initial === undefined ? null : current - initial;
  const threshold = 10 ** -definition.digits / 2;
  return {
    label: definition.label,
    value: current.toFixed(definition.digits),
    unit: definition.unit,
    delta: difference === null
      ? '—'
      : Math.abs(difference) < threshold
        ? '→ 0'
        : `${difference > 0 ? '↑ +' : '↓ '}${difference.toFixed(definition.digits)}`,
  };
}

interface DecisionAwareViewProps {
  decisionPanelExpanded: boolean;
}

export function TissueView({ decisionPanelExpanded }: DecisionAwareViewProps) {
  const cellular = useSimulationStore(state => state.cellular);
  const physiology = useSimulationStore(state => state.physiology);
  const scenarioResponse = useSimulationStore(state => state.scenarioResponse);
  const scenarioOnset = useSimulationStore(state => state.scenarioOnset);
  const lastDecision = useSimulationStore(state => state.lastDecision);
  const history = useSimulationStore(state => state.history);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const capture = useSimulationStore(state => state.captureCellularSubstrate);
  const running = useSimulationStore(state => state.isRunning);
  const timeSpeed = useSimulationStore(state => state.timeSpeed);
  const [feedback, setFeedback] = useState('Observe a entrega capilar ao LEC e selecione a proteína de transporte para captar o substrato.');
  const [selectedKind, setSelectedKind] = useState<SubstrateKind>('oxygen');
  const [investigationScope, setInvestigationScope] = useState<InvestigationMetricScope>('priority');
  const [objectivePanelExpanded, setObjectivePanelExpanded] = useState(false);
  const scenarioId = cellular.routine?.id ?? scenarioResponse?.scenarioId;
  const scenarioDefinition = scenarioId ? getScenarioDefinition(scenarioId) : undefined;
  const tissue = cellular.tissue;
  const freshDecision = lastDecision && physiology.timeElapsed - lastDecision.timestamp <= 18;
  const decisionActive = Boolean(cellular.routine || scenarioResponse || freshDecision);
  const decisionVisible = decisionPanelExpanded && decisionActive;
  const sidebarExpanded = decisionActive ? decisionVisible : objectivePanelExpanded;
  const cell = cellular.cell;
  const selectedMeta = resourceMeta[selectedKind];
  const selectedAvailable = cellular.pools.available[selectedKind];
  const selectedCaptured = cellular.pools.captured[selectedKind];
  const selectedSaturation = cellular.transportSaturation[selectedKind];
  const selectedStatus = substrateStatus(selectedKind, selectedAvailable, selectedCaptured, tissue);
  const selectedStatusExplanation = substrateStatusExplanation(selectedKind, selectedStatus);
  const SelectedIcon = selectedMeta.icon;
  const leadingAdaptation = (Object.entries(cellular.adaptations) as Array<[keyof typeof adaptationLabels, number]>).sort((a, b) => b[1] - a[1])[0];
  const currentFocusTitle = warnings[0]?.parameter ? `Corrigir ${warnings[0].parameter}` : 'Sustentar metabolismo aeróbio';
  const currentFocusDescription = warnings[0]?.recommendation ?? 'Garanta O₂ e substratos sem saturar os pools celulares.';
  const availableMetricSet = new Set<ScenarioMetricKey>(scenarioDefinition?.metricKeys ?? []);
  const investigationMetricKeys = scenarioDefinition
    ? investigationScope === 'priority'
      ? scenarioDefinition.priorityMetricKeys
      : getScenarioMetricKeysByGroup(investigationScope).filter(key => availableMetricSet.has(key))
    : [];
  const investigationMetrics = investigationMetricKeys.map(key => {
    const metricDefinition = SCENARIO_METRIC_CATALOG[key];
    return investigationMetric(metricDefinition, metricDefinition.read(physiology, cellular), scenarioOnset?.values[key]);
  });

  useEffect(() => {
    setInvestigationScope('priority');
  }, [scenarioId]);

  useEffect(() => {
    if (decisionActive) setObjectivePanelExpanded(false);
  }, [decisionActive]);

  const flowChips = useMemo(() => Object.fromEntries((Object.keys(resourceMeta) as SubstrateKind[]).map(kind => {
    const status = substrateStatus(kind, cellular.pools.available[kind], cellular.pools.captured[kind], tissue);
    const datum: FlowChipDatum = {
      label: resourceMeta[kind].label,
      value: kind === 'glucose' ? tissue.glucoseMmolL.toFixed(1) : kind === 'oxygen' ? tissue.oxygenMmHg.toFixed(0) : cellular.pools.available[kind].toFixed(1),
      unit: kind === 'glucose' ? 'mM' : kind === 'oxygen' ? 'mmHg' : 'fluxo',
      status,
      statusLabel: substrateStatusLabel(kind, status),
      direction: 'in',
    };
    return [kind, datum];
  })) as Record<SubstrateKind, FlowChipDatum>, [cellular.pools.available, cellular.pools.captured, tissue]);

  const doCapture = (kind: SubstrateKind) => {
    if (kind === 'oxygen') {
      setFeedback('O₂ é ajustado continuamente pelo gradiente: use ventilação, perfusão e demanda mitocondrial.');
      return;
    }
    const status = substrateStatus(kind, cellular.pools.available[kind], cellular.pools.captured[kind], tissue);
    const ok = capture(kind);
    setFeedback(ok ? `${resourceMeta[kind].label} captado com sucesso.` : `Captação indisponível: ${substrateStatusExplanation(kind, status)}`);
  };

  return (
    <div className={cn(
      'relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-20 lg:px-6',
      sidebarExpanded
        ? 'lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_270px]'
        : 'lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px]',
    )}>
      {!decisionActive && !objectivePanelExpanded && <button
        type="button"
        aria-label="Abrir Objetivo e Foco atual"
        aria-expanded={false}
        aria-controls="tissue-objective-sidebar"
        onClick={() => setObjectivePanelExpanded(true)}
        className="fixed bottom-[82px] left-3 z-[45] hidden min-h-14 max-w-[360px] items-center gap-3 rounded-2xl border border-primary/35 bg-[#111722]/92 px-3 py-2 text-left shadow-[0_18px_55px_rgba(0,0,0,.55)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 lg:flex"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/35 bg-black/25 text-primary"><Crosshair className="size-4.5"/></span>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-primary">Objetivo e foco atual</span>
          <strong className="mt-0.5 block max-w-64 truncate text-[11px] text-foreground">Manter a homeostase tecidual</strong>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{currentFocusTitle}</span>
        </span>
        <ChevronDown className="ml-1 size-4 shrink-0 rotate-180 text-muted-foreground"/>
      </button>}

      {!decisionActive && objectivePanelExpanded && <GlassPanel id="tissue-objective-sidebar" className="relative z-20 hidden min-h-0 max-h-full self-stretch overflow-visible bg-black/25 p-3 lg:flex lg:flex-col">
        <div className="flex items-center gap-2"><PanelLabel icon={<Crosshair className="size-3.5"/>}>Objetivo</PanelLabel><HelpTip title="Como vencer este ciclo?">Mantenha ATP, oxigênio, pH e integridade celular. Prepare reservas sem saturá-las; decisões podem exigir esses recursos.</HelpTip><button type="button" onClick={() => setObjectivePanelExpanded(false)} aria-label="Minimizar Objetivo e Foco atual" className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"><ChevronDown className="size-4"/></button></div><div className="gold-line my-3 h-px"/>
        <h2 className="text-sm font-medium">Manter a homeostase tecidual</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Equilibre perfusão, gases, energia e pH sem criar outro desequilíbrio.</p>
        <div className="mt-4 flex items-center gap-2"><PanelLabel icon={<Target className="size-3.5"/>}>Foco atual</PanelLabel><HelpTip title="Prioridade atual">O foco muda com alertas e cenários. Prepare os substratos indicados antes de escolher uma resposta.</HelpTip></div><div className="gold-line my-2 h-px"/>
        <h3 className="text-xs font-medium">{currentFocusTitle}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{currentFocusDescription}</p>
        <div className="mt-auto rounded-lg border border-white/8 bg-black/15 p-2.5 text-[11px] leading-relaxed text-muted-foreground"><span className="mb-1 block uppercase tracking-wider text-primary">Leitura ativa</span>{feedback}</div>
      </GlassPanel>}

      <section className={cn('min-h-0 overflow-visible rounded-xl p-1 lg:row-start-1', sidebarExpanded ? 'lg:col-start-2' : 'lg:col-start-1')} aria-label="Microambiente tecidual">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-end">
          <CellularFlowScene
            available={cellular.pools.available}
            captured={cellular.pools.captured}
            wasteLoad={cellular.tissue.wasteLoad}
            oxidativeStress={cellular.damage.oxidativeStress}
            membranePotentialMv={cellular.cell.membranePotentialMv}
            perfusionPercent={cellular.tissue.perfusionPercent}
            lactateMmolL={cellular.tissue.lactateMmolL}
            carbonDioxideMmHg={cellular.tissue.carbonDioxideMmHg}
            running={running}
            timeSpeed={timeSpeed}
            lastCaptured={cellular.collection.lastKind}
            captureChain={cellular.collection.chain}
            captureScore={cellular.collection.score}
            chips={flowChips}
            selectedKind={selectedKind}
            onSelect={setSelectedKind}
          />
          <GlassPanel className="relative z-20 ml-auto mt-auto w-full max-w-[440px] overflow-hidden bg-black/35 p-2.5" aria-label={`Detalhes de ${selectedMeta.label}`}>
            <div className="grid items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-9 flex-none place-items-center rounded-full border bg-black/30" style={{ color: selectedMeta.color, borderColor: selectedMeta.color }}><SelectedIcon className="size-4"/></span>
                <div className="min-w-0"><div className="flex items-center gap-2"><strong className="font-display text-sm">{selectedMeta.label}</strong><span className="substrate-state" data-state={selectedStatus}>{substrateStatusLabel(selectedKind, selectedStatus)}</span></div><p className="mt-1 font-mono text-[11px] text-muted-foreground">{selectedKind === 'oxygen' ? `PO₂ ${tissue.oxygenMmHg.toFixed(0)} mmHg · fluxo CTE ${cellular.mitochondria.oxygenConsumption.toFixed(1)}/min` : `Tecido ${selectedAvailable.toFixed(1)} · Célula ${selectedCaptured.toFixed(1)} · ocupação ${selectedSaturation.toFixed(0)}%`}</p><p className="mt-1 truncate text-[11px] text-muted-foreground" title={selectedStatusExplanation}>{selectedStatusExplanation}</p></div>
              </div>
              <div className="grid gap-2 text-[11px] leading-relaxed text-muted-foreground sm:col-span-2 sm:row-start-2 sm:grid-cols-3"><p><span className="block uppercase tracking-wider text-foreground/55">Custo</span>{selectedMeta.cost}</p><p><span className="block uppercase tracking-wider text-foreground/55">Efeito</span>{selectedMeta.effect}</p><p><span className="block uppercase tracking-wider text-foreground/55">Risco</span>{selectedMeta.risk}</p></div>
              <ActionButton onClick={() => doCapture(selectedKind)} disabled={selectedKind === 'oxygen' || selectedStatus === 'limited' || selectedStatus === 'blocked'} className="min-w-24 border-primary/50 bg-primary/10 sm:col-start-2 sm:row-start-1">{selectedKind === 'oxygen' ? 'Automático' : 'Captar'} <span className="block text-[11px] normal-case text-muted-foreground">{selectedMeta.unit}</span></ActionButton>
            </div>
            <div className={cn('mt-2 rounded-md border px-2.5 py-2 text-[11px] leading-relaxed', selectedKind !== 'oxygen' && selectedSaturation >= 75 ? 'border-warning/35 bg-warning/5 text-warning' : 'border-white/5 bg-black/15 text-muted-foreground')}><strong>{selectedKind === 'oxygen' ? 'Fisiologia do fluxo:' : 'Economia do pool:'}</strong> {selectedKind === 'oxygen' ? saturationConsequences.oxygen : selectedSaturation >= 75 ? saturationConsequences[selectedKind] : `capte quando uma rota ou decisão exigir ${selectedMeta.label.toLowerCase()}; acima de 75% começam custos de saturação.`}</div>
            <div className="mt-2 flex items-center gap-3 border-t border-white/8 pt-2"><span className="flex-none text-[11px] uppercase tracking-wider text-primary">Console</span><p className="min-w-0 truncate text-[11px] text-muted-foreground" role="status" aria-live="polite">{feedback}</p><span className="ml-auto hidden flex-none font-mono text-[11px] text-foreground/70 sm:inline">ATP {cell.atpMmolL.toFixed(2)} · pH {tissue.pH.toFixed(2)} · {adaptationLabels[leadingAdaptation[0]]} Nv.{leadingAdaptation[1]}</span></div>
          </GlassPanel>
        </div>
      </section>

      <GlassPanel className={cn('scrollbar-thin relative z-20 hidden max-h-full self-start overflow-y-auto bg-black/25 p-3 xl:row-start-1 xl:block', sidebarExpanded ? 'xl:col-start-3' : 'xl:col-start-2')}>
        <div className="flex items-center justify-between gap-2"><PanelLabel>Status do tecido</PanelLabel><HelpTip title="Faixas de referência" align="right"><p>Faixas funcionais adotadas pelo simulador:</p><ul className="mt-2 space-y-1"><li>pH tecidual: 7,30–7,45</li><li>Tensão de O₂: ≥ 35 mmHg</li><li>ATP celular: ≥ 1,50 mmol/L</li><li>Estresse oxidativo: ≤ 40%</li><li>Potencial de membrana: −80 a −55 mV</li></ul></HelpTip></div><div className="gold-line my-3 h-px"/>
        {scenarioDefinition && <section aria-labelledby="tissue-investigation-title">
          <div className="flex items-center justify-between gap-2"><div id="tissue-investigation-title"><PanelLabel icon={<Activity className="size-3.5"/>}>Métricas para investigar</PanelLabel></div><span className="flex-none text-[11px] uppercase tracking-wider text-primary">Δ detecção</span></div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{scenarioDefinition.difficulty === 'hard' ? `${scenarioDefinition.metricKeys.length} marcadores integrados. Selecione uma escala e compare a trajetória antes de decidir.` : 'Marcadores prioritários deste evento e sua variação desde o instante de detecção.'}</p>
          {scenarioDefinition.difficulty === 'hard' && <div className="mt-2 grid grid-cols-2 gap-1" role="tablist" aria-label="Escala das métricas do evento">
            {investigationMetricScopes.map(scope => <button type="button" role="tab" aria-selected={investigationScope === scope.id} key={scope.id} onClick={() => setInvestigationScope(scope.id)} className={cn('min-h-9 rounded-md border px-1.5 text-[11px] uppercase tracking-wider transition', investigationScope === scope.id ? 'border-primary/45 bg-primary/10 text-primary' : 'border-white/8 bg-black/15 text-muted-foreground hover:border-primary/25 hover:text-foreground')}>{scope.label}</button>)}
          </div>}
          <div className="mt-2 space-y-1.5">
            {investigationMetrics.map(item => <div key={item.label} className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-2"><span className="block truncate text-[11px] uppercase tracking-wider text-muted-foreground" title={item.label}>{item.label}</span><div className="mt-1 flex items-baseline justify-between gap-2"><strong className="font-mono text-sm text-foreground">{item.value} <small className="text-[11px] font-normal text-muted-foreground">{item.unit}</small></strong><span className={cn('font-mono text-[11px]', item.delta === '—' ? 'text-muted-foreground' : 'text-primary')}>{item.delta}</span></div></div>)}
          </div>
          <div className="gold-line my-3 h-px"/>
          <PanelLabel>Referências basais do tecido</PanelLabel>
        </section>}
        <div className={cn('space-y-1.5', scenarioDefinition && 'mt-2')}>
          <CompactTissueMetric label="pH tecidual" value={tissue.pH.toFixed(2)} history={[...history.pH, tissue.pH]} good={tissue.pH >= 7.3 && tissue.pH <= 7.45}/>
          <CompactTissueMetric label="Tensão de O₂" value={tissue.oxygenMmHg.toFixed(0)} unit="mmHg" history={[...history.tissueOxygen, tissue.oxygenMmHg]} color="var(--cyan)" good={tissue.oxygenMmHg >= 35}/>
          <CompactTissueMetric label="ATP celular" value={cell.atpMmolL.toFixed(2)} unit="mmol/L" history={[...history.cellularAtp, cell.atpMmolL]} color="var(--primary)" good={cell.atpMmolL >= 1.5}/>
          <CompactTissueMetric label="Estresse oxidativo" value={cellular.damage.oxidativeStress.toFixed(0)} unit="%" history={[...history.oxidativeStress, cellular.damage.oxidativeStress]} color="var(--danger)" good={cellular.damage.oxidativeStress <= 40}/>
          <CompactTissueMetric label="Potencial de membrana" value={cell.membranePotentialMv.toFixed(0)} unit="mV" history={[...history.membranePotential, cell.membranePotentialMv]} good={cell.membranePotentialMv >= -80 && cell.membranePotentialMv <= -55}/>
        </div>
      </GlassPanel>
    </div>
  );
}

const repairMeta: Array<{ key: RepairTarget; label: string; damage: 'membrane' | 'proteins' | 'dna' | 'oxidativeStress' }> = [
  { key: 'membrane', label: 'Alocar ATP à membrana', damage: 'membrane' },
  { key: 'proteins', label: 'Alocar ATP à proteostase', damage: 'proteins' },
  { key: 'dna', label: 'Alocar ATP ao reparo genômico', damage: 'dna' },
  { key: 'antioxidants', label: 'Reconstituir defesa antioxidante', damage: 'oxidativeStress' },
];

type CellRegion = 'membrane' | 'cytosol' | 'nucleus' | 'proteostasis';

export function IntracellularView() {
  const cellular = useSimulationStore(state => state.cellular);
  const physiology = useSimulationStore(state => state.physiology);
  const allocate = useSimulationStore(state => state.allocateCellularAtp);
  const [feedback, setFeedback] = useState('Selecione uma região para relacionar sensor, efetor, custo energético e consequência sistêmica.');
  const [selectedRegion, setSelectedRegion] = useState<CellRegion>('membrane');
  const cell = cellular.cell;
  const damage = cellular.damage;
  const repair = (target: RepairTarget) => setFeedback(allocate(target)
    ? 'ATP alocado ao mecanismo selecionado; acompanhe a tendência e o custo sobre as demais funções.'
    : 'Alocação indisponível: falta ATP ou não há dano suficiente para justificar o custo.');
  const regions = {
    membrane: {
      label: 'Membrana', icon: Layers3, variable: `${cell.membranePotentialMv.toFixed(0)} mV`, sensor: 'gradiente Na⁺/K⁺, Ca²⁺ e volume', effector: 'Na⁺/K⁺-ATPase, SERCA e reparo lipídico', cost: `${cell.atpMmolL.toFixed(2)} mmol/L disponíveis`, consequence: `perfusão sistêmica ${physiology.cardiovascular.perfusionIndex.toFixed(0)}% do basal`, trend: damage.membrane > 10 ? 'integridade em risco' : 'barreira preservada',
    },
    cytosol: {
      label: 'Citosol', icon: CircleDot, variable: `pH ${cell.pH.toFixed(2)} · ATP ${cell.atpMmolL.toFixed(2)}`, sensor: 'AMPK e relação ATP/ADP', effector: 'glicólise, buffers e autofagia', cost: `AMPK ${physiology.cellularSignaling.ampkActivity.toFixed(0)}%`, consequence: `lactato sistêmico ${physiology.energy.lactateLevel.toFixed(1)} mmol/L`, trend: cell.atpMmolL < 1.5 ? 'déficit energético' : 'energia funcional',
    },
    nucleus: {
      label: 'Núcleo', icon: Dna, variable: `dano ao DNA ${damage.dna.toFixed(1)}%`, sensor: 'vigilância de dano e compromisso apoptótico', effector: 'reparo genômico ou interrupção do ciclo', cost: 'ATP alocado ao reparo estrutural', consequence: `viabilidade ${cell.viabilityPercent.toFixed(0)}%`, trend: damage.dna > 20 ? 'reparo prioritário' : 'genoma estável',
    },
    proteostasis: {
      label: 'Proteostase', icon: Shield, variable: `dano proteico ${damage.proteins.toFixed(1)}%`, sensor: `UPR ${physiology.cellularSignaling.unfoldedProteinResponse.toFixed(0)}%`, effector: 'chaperonas, proteassoma e autofagia', cost: `mTOR ${physiology.cellularSignaling.mTorActivity.toFixed(0)}% · autofagia ${physiology.cellularSignaling.autophagyActivity.toFixed(0)}%`, consequence: `síntese ${physiology.nutrients.proteinSynthesisRate.toFixed(0)} g/dia`, trend: damage.proteins > 20 ? 'carga proteica elevada' : 'dobramento controlado',
    },
  } satisfies Record<CellRegion, { label: string; icon: typeof Activity; variable: string; sensor: string; effector: string; cost: string; consequence: string; trend: string }>;
  const region = regions[selectedRegion];

  return <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-36 lg:px-6">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="rounded-xl border border-white/8 bg-black/10 p-4">
        <PanelLabel icon={<CircleDot className="size-4"/>}>Escala 3 · Célula</PanelLabel>
        <h1 className="mt-1.5 text-xl font-medium text-foreground">Integridade celular</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">Investigue homeostase, integridade e destino. mTOR aparece aqui como via PI3K–AKT–mTOR intracelular, integrada a nutrientes, energia e fatores de crescimento.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(420px,.9fr)_minmax(0,1.1fr)]">
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between gap-2"><PanelLabel icon={<CircleDot className="size-4"/>}>Mapa funcional da célula</PanelLabel><HelpTip title="Como investigar"><p>Selecione membrana, citosol, núcleo ou proteostase. A leitura conecta variável controlada, sensor, efetor, custo em ATP e consequência sistêmica.</p></HelpTip></div>
          <div className="gold-line my-3 h-px"/>
          <div className="relative mx-auto aspect-square max-w-[430px] rounded-full border border-primary/30 bg-[radial-gradient(circle_at_center,rgba(217,180,95,.12),rgba(26,44,56,.28)_45%,rgba(8,14,23,.75)_72%)] shadow-[inset_0_0_55px_rgba(77,188,176,.08)]">
            <button type="button" onClick={() => setSelectedRegion('membrane')} className={cn('absolute inset-3 rounded-full border-2 transition', selectedRegion === 'membrane' ? 'border-primary shadow-[0_0_22px_rgba(217,180,95,.22)]' : 'border-cyan/25 hover:border-cyan/55')} aria-label="Selecionar membrana"/>
            <button type="button" onClick={() => setSelectedRegion('cytosol')} className={cn('absolute inset-[20%] rounded-full border transition', selectedRegion === 'cytosol' ? 'border-cyan bg-cyan/10' : 'border-white/10 bg-black/15 hover:border-cyan/45')}><span className="text-xs">Citosol</span></button>
            <button type="button" onClick={() => setSelectedRegion('nucleus')} className={cn('absolute left-1/2 top-1/2 grid size-[28%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border transition', selectedRegion === 'nucleus' ? 'border-primary bg-primary/20 text-primary' : 'border-primary/25 bg-primary/5 text-muted-foreground hover:border-primary/60')}><Dna className="size-7"/><span className="sr-only">Núcleo</span></button>
            <button type="button" onClick={() => setSelectedRegion('proteostasis')} className={cn('absolute bottom-[16%] right-[10%] flex min-h-10 items-center gap-2 rounded-full border bg-background/80 px-3 text-xs transition', selectedRegion === 'proteostasis' ? 'border-good text-good' : 'border-white/15 text-muted-foreground hover:border-good/50')}><Shield className="size-4"/>Proteostase</button>
            <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/70 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan">Membrana</span>
          </div>
          <section className="mt-4 rounded-xl border border-primary/20 bg-black/20 p-3.5" aria-live="polite">
            <div className="flex items-center gap-2">{(() => { const Icon = region.icon; return <Icon className="size-4 text-primary"/>; })()}<strong className="text-sm">{region.label}</strong><span className="ml-auto text-[11px] text-primary">{region.trend}</span></div>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Variável controlada</dt><dd className="mt-1 text-foreground">{region.variable}</dd></div><div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Sensor</dt><dd className="mt-1 text-foreground">{region.sensor}</dd></div><div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Efetor</dt><dd className="mt-1 text-foreground">{region.effector}</dd></div><div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Custo / sinal</dt><dd className="mt-1 text-foreground">{region.cost}</dd></div><div className="sm:col-span-2"><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Consequência entre escalas</dt><dd className="mt-1 text-foreground">{region.consequence}</dd></div></dl>
          </section>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-4">
            <PanelLabel icon={<Activity className="size-4"/>}>Homeostase</PanelLabel><div className="gold-line my-3 h-px"/>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3"><MetricCard label="pH" value={cell.pH.toFixed(2)} good={cell.pH >= 6.9 && cell.pH <= 7.35}/><MetricCard label="Na⁺ / K⁺" value={`${cell.sodium.toFixed(0)} / ${cell.potassium.toFixed(0)}`} unit="mmol/L"/><MetricCard label="Ca²⁺" value={cell.calciumNm.toFixed(0)} unit="nM" good={cell.calciumNm <= 150}/><MetricCard label="Potencial" value={cell.membranePotentialMv.toFixed(0)} unit="mV" good={cell.membranePotentialMv >= -80 && cell.membranePotentialMv <= -55}/><MetricCard label="Volume" value={cell.volumePercent.toFixed(1)} unit="%" good={cell.volumePercent >= 92 && cell.volumePercent <= 108}/><MetricCard label="ATP / ADP" value={`${cell.atpMmolL.toFixed(2)} / ${cell.adpMmolL.toFixed(2)}`} good={cell.atpMmolL >= 1.5}/></div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelLabel icon={<Shield className="size-4"/>}>Integridade</PanelLabel><div className="gold-line my-3 h-px"/>
            <div className="space-y-3">{[['Membrana', damage.membrane], ['DNA', damage.dna], ['Proteínas', damage.proteins], ['ROS', damage.oxidativeStress], ['Antioxidantes usados', 100 - damage.antioxidantCapacity]].map(([label, value]) => <div key={String(label)}><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-mono text-foreground">{Number(value).toFixed(1)}%</span></div><ProgressBar value={Number(value)} color={Number(value) > 40 ? 'var(--danger)' : 'var(--primary)'}/></div>)}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{repairMeta.map(item => <ActionButton key={item.key} onClick={() => repair(item.key)} disabled={cell.atpMmolL < 1.15 || damage[item.damage] <= .1}>{item.label}</ActionButton>)}</div>
            <div className="mt-3 rounded-lg border border-primary/20 bg-black/25 p-3 text-xs leading-relaxed text-primary" role="status">{feedback}</div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelLabel icon={<Target className="size-4"/>}>Destino</PanelLabel><div className="gold-line my-3 h-px"/>
            <div className={cn('rounded-xl border p-3.5', cellular.fate.status === 'homeostasis' ? 'border-good/25 bg-good/5' : cellular.fate.status === 'stress' ? 'border-warning/30 bg-warning/5' : 'border-danger/40 bg-danger/10')}><strong className="text-base text-foreground">{cellular.fate.status === 'homeostasis' ? 'Homeostase' : cellular.fate.status === 'stress' ? 'Estresse reversível' : cellular.fate.status === 'apoptosis' ? 'Apoptose' : 'Necrose'}</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Viabilidade {cell.viabilityPercent.toFixed(0)}% · compromisso apoptótico {cellular.fate.apoptoticCommitment.toFixed(0)}% · suscetibilidade à infecção {cellular.fate.infectionSusceptibility.toFixed(0)}%. {cellular.fate.lastTransition}</p></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><MetricCard label="mTOR" value={physiology.cellularSignaling.mTorActivity.toFixed(0)} unit="%"/><MetricCard label="AMPK" value={physiology.cellularSignaling.ampkActivity.toFixed(0)} unit="%"/><MetricCard label="Autofagia" value={physiology.cellularSignaling.autophagyActivity.toFixed(0)} unit="%"/><MetricCard label="UPR" value={physiology.cellularSignaling.unfoldedProteinResponse.toFixed(0)} unit="%" good={physiology.cellularSignaling.unfoldedProteinResponse < 45}/></div>
            {cellular.routine && <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3"><PanelLabel icon={<AlertTriangle className="size-3.5"/>}>Evento celular</PanelLabel><strong className="mt-2 block text-sm">{cellular.routine.title}</strong><p className="mt-1 text-xs text-muted-foreground">{cellular.routine.description} · decisão obrigatória pendente</p></div>}
          </GlassPanel>
        </div>
      </div>
    </div>
  </div>;
}

const automationMeta: Record<AutomationKind, { label: string; mechanism: string; improves: string; unchanged: string; icon: typeof Zap; color: string }> = {
  transporters: {
    label: 'Transportadores',
    mechanism: 'Aumenta expressão e recrutamento constitutivo de GLUT4, CD36/FATP e LAT1–4F2hc.',
    improves: 'Captação automática de glicose, ácido graxo e aminoácido.',
    unchanged: 'O₂ não recebe bônus: continua dependente de PO₂, perfusão e difusão.',
    icon: RefreshCw,
    color: 'var(--cyan)',
  },
  mitochondrialShuttle: {
    label: 'Navette mitocondrial',
    mechanism: 'Acelera entrega de piruvato/ADP e aumenta a capacidade de utilizar o gradiente mitocondrial.',
    improves: 'Glicólise automática, capacidade oxidativa e beta-oxidação automática.',
    unchanged: 'Não cria O₂, ADP ou substrato e não reduz o custo estequiométrico dos botões manuais.',
    icon: Atom,
    color: 'var(--primary)',
  },
  repair: {
    label: 'Reparo automático',
    mechanism: 'Aloca ATP continuamente ao maior dano entre membrana, proteínas e DNA.',
    improves: 'Velocidade de manutenção estrutural sem comando manual.',
    unchanged: 'Não melhora captação de substrato nem produção de ATP; consome a reserva existente.',
    icon: Shield,
    color: 'var(--good)',
  },
};

interface AutomationImpactRow {
  label: string;
  current: string;
  next: string;
  detail: string;
  changes: boolean;
}

function automationImpactRows(automation: Record<AutomationKind, number>, kind: AutomationKind): AutomationImpactRow[] {
  const level = automation[kind];
  const nextAutomation = { ...automation, [kind]: Math.min(AUTOMATION_MAX_LEVEL, level + 1) };
  const current = getCellularAutomationPerformance(automation);
  const next = getCellularAutomationPerformance(nextAutomation);
  const rate = (value: number) => `${value.toFixed(3)} pac/s`;
  const row = (label: string, currentValue: number, nextValue: number, format: (value: number) => string, detail: string): AutomationImpactRow => ({
    label, current: format(currentValue), next: format(nextValue), detail, changes: Math.abs(nextValue - currentValue) > 1e-8,
  });
  if (kind === 'transporters') return [
    row('Glicose automática', current.autoCaptureCapacityPerSecond.glucose, next.autoCaptureCapacityPerSecond.glucose, rate, 'Capacidade-base × sinal de insulina/GLUT4 e contração.'),
    row('Ácido graxo automático', current.autoCaptureCapacityPerSecond.fattyAcid, next.autoCaptureCapacityPerSecond.fattyAcid, rate, 'Entrada por CD36/FATP, limitada pelo espaço no pool.'),
    row('Aminoácido automático', current.autoCaptureCapacityPerSecond.aminoAcid, next.autoCaptureCapacityPerSecond.aminoAcid, rate, 'Entrada por LAT1–4F2hc, limitada pela oferta tecidual.'),
    row('Oxigênio por difusão', current.autoCaptureCapacityPerSecond.oxygen, next.autoCaptureCapacityPerSecond.oxygen, rate, 'Não muda com este upgrade.'),
  ];
  if (kind === 'mitochondrialShuttle') return [
    row('Glicólise automática', current.automaticGlycolysisCapacityPerSecond, next.automaticGlycolysisCapacityPerSecond, rate, 'Limite-base antes do ajuste pela demanda metabólica.'),
    row('Capacidade oxidativa', current.oxidativeCapacityMultiplier, next.oxidativeCapacityMultiplier, value => `×${value.toFixed(2)}`, 'Multiplica o fluxo permitido por saúde mitocondrial e O₂.'),
    row('Beta-oxidação automática', current.automaticFattyAcidOxidationPerSecond, next.automaticFattyAcidOxidationPerSecond, rate, 'Ainda exige ácido graxo, seis partes de O₂ e ADP.'),
  ];
  return [
    row('ATP alocado automaticamente', current.automaticRepairAtpPerSecond, next.automaticRepairAtpPerSecond, rate, 'Só atua com ATP > 1,2 mmol/L e dano mensurável.'),
    row('Dano reparado', current.automaticDamageRepairPerSecond, next.automaticDamageRepairPerSecond, value => `${value.toFixed(3)} %/s`, 'Prioriza membrana, proteínas ou DNA com maior dano.'),
  ];
}

export function MachineryView({ decisionPanelExpanded }: DecisionAwareViewProps) {
  const cellular = useSimulationStore(state => state.cellular);
  const mastery = useSimulationStore(state => state.masteryProgress);
  const scenarioResponse = useSimulationStore(state => state.scenarioResponse);
  const glycolysis = useSimulationStore(state => state.runCellularGlycolysis);
  const oxidize = useSimulationStore(state => state.oxidizeCellularSubstrate);
  const purchase = useSimulationStore(state => state.purchaseCellularAutomation);
  const [feedback, setFeedback] = useState('Leia entrada → CTE → saída e escolha uma rota compatível com os substratos disponíveis.');
  const run = (action: () => boolean, ok: string, fail: string) => setFeedback(action() ? ok : fail);
  const usedBudget = Object.values(cellular.automation).reduce((sum, level) => sum + level, 0);
  const performance = getCellularAutomationPerformance(cellular.automation);
  const activeScenarioId = cellular.routine?.id ?? scenarioResponse?.scenarioId;
  const activeScenario = activeScenarioId ? getScenarioDefinition(activeScenarioId) : undefined;
  const decisionVisible = decisionPanelExpanded && Boolean(activeScenario);
  const canGlycolysis = cellular.pools.captured.glucose >= 1 && cellular.cell.atpMmolL <= 5.72;
  const canOxidize = (kind: OxidationSubstrate) => kind === 'pyruvate'
    ? cellular.pools.pyruvate >= 1 && cellular.pools.captured.oxygen >= 3 && cellular.cell.adpMmolL >= .45
    : cellular.pools.captured.fattyAcid >= 1 && cellular.pools.captured.oxygen >= 6 && cellular.cell.adpMmolL >= .85;
  const chainProps = {
    fluxPercent: cellular.mitochondria.etcFluxPercent,
    membranePotentialMv: cellular.mitochondria.membranePotentialMv,
    atpSynthaseFlux: cellular.mitochondria.atpSynthaseFlux,
    oxygenMmHg: cellular.tissue.oxygenMmHg,
    nadhPercent: cellular.cell.nadhPercent,
    healthPercent: cellular.mitochondria.healthPercent,
    oxidativeStress: cellular.damage.oxidativeStress,
    processing: cellular.mitochondria.processing,
  };

  return <div className={cn(
    'relative min-h-0 flex-1 overflow-hidden px-4 pb-20 transition-[padding] duration-300',
    decisionVisible
      ? cn('lg:pr-6', activeScenario?.difficulty === 'hard' ? 'lg:pl-[464px]' : 'lg:pl-[424px]')
      : 'lg:px-6',
  )}>
    <div className={cn(
      'scrollbar-thin mx-auto grid h-full max-w-[1600px] grid-cols-1 gap-3 overflow-y-auto',
      decisionVisible
        ? 'xl:grid-cols-[200px_minmax(0,1fr)] min-[1800px]:grid-cols-[210px_minmax(0,1fr)_300px] min-[1800px]:overflow-hidden'
        : 'xl:grid-cols-[230px_minmax(0,1fr)_330px] xl:overflow-hidden',
    )}>
      <aside className="scrollbar-thin space-y-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1" aria-label="Rotas e limites mitocondriais">
        <GlassPanel className="border-cyan/20 bg-black/55 p-3">
          <div className="flex items-start justify-between gap-2"><div><PanelLabel icon={<Atom className="size-4 text-cyan"/>}>Mapa funcional</PanelLabel><h2 className="mt-2 font-display text-lg">Do substrato ao ATP</h2></div><HelpTip title="Como interpretar"><p>O fluxo só aumenta quando substrato, ADP, O₂, potencial e saúde mitocondrial convergem.</p><ul className="mt-2 space-y-1"><li>ΔΨ esperado: −150 a −180 mV</li><li>NADH equilibrado: 40–60%</li><li>Saúde mitocondrial: ≥ 70%</li><li>ROS alto indica pressão redox.</li></ul></HelpTip></div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">A cadeia respiratória ocupa o centro sem painéis sobrepostos. Moléculas, reações e taxas aparecem diretamente sobre o complexo que as processa.</p>
        </GlassPanel>

        <section className="space-y-2" aria-label="Rotas metabólicas manuais">
          <GlassPanel className="flex flex-col bg-black/55 p-3"><span className="text-[11px] uppercase tracking-widest text-good">Rota 01 · preparo</span><h3 className="mt-1.5 font-display text-base">Glicólise</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Glicose gera piruvato e NADH. Automação atual: {performance.automaticGlycolysisCapacityPerSecond.toFixed(3)} pac/s.</p><ActionButton className="mt-3 w-full" disabled={!canGlycolysis} onClick={() => run(glycolysis, 'Glicólise concluída; piruvato e NADH disponíveis.', 'Colete glicose ou libere espaço no pool de ATP.')}>Processar glicose</ActionButton></GlassPanel>
          <GlassPanel className="flex flex-col border-cyan/15 bg-black/55 p-3"><span className="text-[11px] uppercase tracking-widest text-cyan">Rota 02 · CTE</span><h3 className="mt-1.5 font-display text-base">Oxidar piruvato</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Exige piruvato, 3 O₂ e ADP. Capacidade oxidativa: ×{performance.oxidativeCapacityMultiplier.toFixed(2)}.</p><ActionButton className="mt-3 w-full" disabled={!canOxidize('pyruvate')} onClick={() => run(() => oxidize('pyruvate'), 'Piruvato oxidado; CTE e ATP sintase responderam.', 'Faltam piruvato, O₂, ADP ou espaço energético.')}>Oxidar piruvato</ActionButton></GlassPanel>
          <GlassPanel className="flex flex-col border-warning/15 bg-black/55 p-3"><span className="text-[11px] uppercase tracking-widest text-warning">Rota 03 · alto rendimento</span><h3 className="mt-1.5 font-display text-base">Beta-oxidação</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Exige ácido graxo, 6 O₂ e ADP. Automação: {performance.automaticFattyAcidOxidationPerSecond.toFixed(3)} pac/s.</p><ActionButton className="mt-3 w-full" disabled={!canOxidize('fattyAcid')} onClick={() => run(() => oxidize('fattyAcid'), 'Beta-oxidação concluída; monitore O₂ e ROS.', 'Faltam ácido graxo, O₂, ADP ou espaço energético.')}>Oxidar ácido graxo</ActionButton></GlassPanel>
        </section>
        <div className="rounded-lg border border-primary/25 bg-black/60 px-3 py-2.5 text-[11px] leading-relaxed text-primary" role="status" aria-live="polite">{feedback}</div>
      </aside>

      <section className="flex min-h-[540px] min-w-0 items-center overflow-hidden rounded-xl xl:min-h-0" aria-label="Cadeia respiratória mitocondrial totalmente visível">
        <ElectronTransportChain {...chainProps} className="my-0 w-full bg-black/30"/>
      </section>

      <GlassPanel className={cn(
        'scrollbar-thin self-start border-primary/25 bg-black/55 p-4 xl:max-h-full xl:overflow-y-auto',
        decisionVisible && 'xl:col-span-2 min-[1800px]:col-span-1',
      )}>
          <div className="flex items-center justify-between gap-3"><div><PanelLabel icon={<Bot className="size-4"/>}>Automação celular</PanelLabel><h2 className="mt-2 font-display text-lg">O que muda no próximo nível</h2></div><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary">{usedBudget}/{CELLULAR_OPTIMIZATION_BUDGET}</span></div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Cada nível altera taxas contínuas do motor. Compare os valores antes de gastar ATP e substratos.</p>
          <div className="mt-3"><ProgressBar value={usedBudget / CELLULAR_OPTIMIZATION_BUDGET * 100}/></div>
          <div className="mt-4 space-y-3">{(Object.keys(automationMeta) as AutomationKind[]).map(kind => {
            const meta = automationMeta[kind];
            const Icon = meta.icon;
            const level = cellular.automation[kind];
            const recipe = getAutomationRecipe(kind, level);
            const maxed = level >= AUTOMATION_MAX_LEVEL;
            const enoughAtp = cellular.cell.atpMmolL - recipe.atp >= 1;
            const enoughSubstrates = (Object.entries(recipe.substrates) as Array<[SubstrateKind, number]>).every(([key, amount]) => cellular.pools.captured[key] >= amount);
            const requiredDomain = kind === 'repair' ? 'inflammation' : 'metabolism';
            const masteryUnlocked = mastery.unlockedAutomations.includes(`${requiredDomain}-manager`);
            const canBuy = masteryUnlocked && !maxed && usedBudget < CELLULAR_OPTIMIZATION_BUDGET && enoughAtp && enoughSubstrates;
            const impacts = automationImpactRows(cellular.automation, kind);
            return <section key={kind} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <div className="p-3"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-black/35" style={{ color: meta.color, borderColor: meta.color }}><Icon className="size-4"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] uppercase tracking-wider text-foreground">{meta.label}</strong><span className="font-mono text-[11px] text-primary">Nv.{level} {maxed ? '· máximo' : `→ Nv.${level + 1}`}</span></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{meta.mechanism}</p></div></div>
                <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 text-[11px] leading-relaxed"><strong className="text-primary">Melhora:</strong> <span className="text-foreground/75">{meta.improves}</span></div>
              </div>
              <div className="border-y border-white/8 bg-black/20 px-3 py-2"><span className="text-[11px] uppercase tracking-[.16em] text-muted-foreground">Impacto mensurável</span><div className="mt-2 space-y-2">{impacts.map(impact => <div key={impact.label}><div className="flex items-center gap-2 text-[11px]"><span className="min-w-0 flex-1 text-foreground/80">{impact.label}</span><span className="font-mono text-muted-foreground">{impact.current}</span><ArrowRight className="size-3 text-primary"/><span className={cn('font-mono', impact.changes ? 'text-primary' : 'text-muted-foreground')}>{impact.next}</span></div><p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{impact.detail}</p></div>)}</div></div>
              <div className="p-3"><p className="text-[11px] leading-relaxed text-warning"><strong>Não altera:</strong> {meta.unchanged}</p><p className="mt-2 text-[11px] text-muted-foreground"><strong className="text-foreground/70">Custo Nv.{Math.min(level + 1, AUTOMATION_MAX_LEVEL)}:</strong> {recipe.atp.toFixed(2)} ATP{Object.entries(recipe.substrates).map(([key, amount]) => ` · ${resourceMeta[key as SubstrateKind].label} ${Number(amount).toFixed(2)}`).join('')}</p>{!masteryUnlocked && <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground"><LockKeyhole className="size-3.5"/>Demonstre {requiredDomain === 'inflammation' ? 'inflamação' : 'metabolismo'} em dois casos e alcance Nv.2.</p>}<ActionButton className="mt-3 w-full" disabled={!canBuy} onClick={() => run(() => purchase(kind), `${meta.label} elevada para o nível ${level + 1}. Compare as novas taxas.`, masteryUnlocked ? 'Recursos insuficientes ou limite de especialização atingido.' : 'Automação ainda bloqueada pelo mapa de domínio.')}>{maxed ? 'Nível máximo atingido' : !masteryUnlocked ? 'Automação não demonstrada' : `Construir nível ${level + 1}`}</ActionButton></div>
            </section>;
          })}</div>
      </GlassPanel>
    </div>
  </div>;
}
