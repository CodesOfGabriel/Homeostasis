import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Atom, Bot, Crosshair, Flame, RefreshCw, Shield, Target, Wind, Zap } from 'lucide-react';
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
    <div className="flex items-center gap-2"><span className={cn('size-1.5 rounded-full', good ? 'bg-good' : 'bg-warning')}/><span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span><strong className="ml-auto font-mono text-sm font-medium text-foreground">{value}<small className="ml-1 text-[8px] font-normal text-muted-foreground">{unit}</small></strong></div>
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

export function TissueView() {
  const cellular = useSimulationStore(state => state.cellular);
  const physiology = useSimulationStore(state => state.physiology);
  const scenarioResponse = useSimulationStore(state => state.scenarioResponse);
  const scenarioOnset = useSimulationStore(state => state.scenarioOnset);
  const history = useSimulationStore(state => state.history);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const capture = useSimulationStore(state => state.captureCellularSubstrate);
  const running = useSimulationStore(state => state.isRunning);
  const timeSpeed = useSimulationStore(state => state.timeSpeed);
  const [feedback, setFeedback] = useState('Observe a entrega capilar ao LEC e selecione a proteína de transporte para captar o substrato.');
  const [selectedKind, setSelectedKind] = useState<SubstrateKind>('oxygen');
  const [investigationScope, setInvestigationScope] = useState<InvestigationMetricScope>('priority');
  const scenarioId = cellular.routine?.id ?? scenarioResponse?.scenarioId;
  const scenarioDefinition = scenarioId ? getScenarioDefinition(scenarioId) : undefined;
  const tissue = cellular.tissue;
  const decisionVisible = Boolean(cellular.routine || scenarioResponse);
  const cell = cellular.cell;
  const selectedMeta = resourceMeta[selectedKind];
  const selectedAvailable = cellular.pools.available[selectedKind];
  const selectedCaptured = cellular.pools.captured[selectedKind];
  const selectedSaturation = cellular.transportSaturation[selectedKind];
  const selectedStatus = substrateStatus(selectedKind, selectedAvailable, selectedCaptured, tissue);
  const selectedStatusExplanation = substrateStatusExplanation(selectedKind, selectedStatus);
  const SelectedIcon = selectedMeta.icon;
  const leadingAdaptation = (Object.entries(cellular.adaptations) as Array<[keyof typeof adaptationLabels, number]>).sort((a, b) => b[1] - a[1])[0];
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
    <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-20 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-6 xl:grid-cols-[230px_minmax(0,1fr)_270px]">
      {!decisionVisible && <GlassPanel className="relative z-20 hidden min-h-0 max-h-full self-stretch overflow-visible bg-black/25 p-3 lg:flex lg:flex-col">
        <div className="flex items-center gap-2"><PanelLabel icon={<Crosshair className="size-3.5"/>}>Objetivo</PanelLabel><HelpTip title="Como vencer este ciclo?">Mantenha ATP, oxigênio, pH e integridade celular. Prepare reservas sem saturá-las; decisões podem exigir esses recursos.</HelpTip></div><div className="gold-line my-3 h-px"/>
        <h2 className="text-[13px] font-medium">Manter a homeostase tecidual</h2><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Equilibre perfusão, gases, energia e pH sem criar outro desequilíbrio.</p>
        <div className="mt-4 flex items-center gap-2"><PanelLabel icon={<Target className="size-3.5"/>}>Foco atual</PanelLabel><HelpTip title="Prioridade atual">O foco muda com alertas e cenários. Prepare os substratos indicados antes de escolher uma resposta.</HelpTip></div><div className="gold-line my-2 h-px"/>
        <h3 className="text-xs font-medium">{cellular.routine?.title ?? (warnings[0]?.parameter ? `Corrigir ${warnings[0].parameter}` : 'Sustentar metabolismo aeróbio')}</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{cellular.routine?.description ?? warnings[0]?.recommendation ?? 'Garanta O₂ e substratos sem saturar os pools celulares.'}</p>
        <div className="mt-auto rounded-lg border border-white/8 bg-black/15 p-2.5 text-[9px] leading-relaxed text-muted-foreground"><span className="mb-1 block uppercase tracking-wider text-primary">Leitura ativa</span>{feedback}</div>
      </GlassPanel>}

      <section className="min-h-0 overflow-visible rounded-xl p-1 lg:col-start-2 lg:row-start-1" aria-label="Microambiente tecidual">
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
                <div className="min-w-0"><div className="flex items-center gap-2"><strong className="font-display text-sm">{selectedMeta.label}</strong><span className="substrate-state" data-state={selectedStatus}>{substrateStatusLabel(selectedKind, selectedStatus)}</span></div><p className="mt-1 font-mono text-[9px] text-muted-foreground">{selectedKind === 'oxygen' ? `PO₂ ${tissue.oxygenMmHg.toFixed(0)} mmHg · fluxo CTE ${cellular.mitochondria.oxygenConsumption.toFixed(1)}/min` : `Tecido ${selectedAvailable.toFixed(1)} · Célula ${selectedCaptured.toFixed(1)} · ocupação ${selectedSaturation.toFixed(0)}%`}</p><p className="mt-1 truncate text-[8px] text-muted-foreground" title={selectedStatusExplanation}>{selectedStatusExplanation}</p></div>
              </div>
              <div className="grid gap-2 text-[8px] leading-relaxed text-muted-foreground sm:col-span-2 sm:row-start-2 sm:grid-cols-3"><p><span className="block uppercase tracking-wider text-foreground/55">Custo</span>{selectedMeta.cost}</p><p><span className="block uppercase tracking-wider text-foreground/55">Efeito</span>{selectedMeta.effect}</p><p><span className="block uppercase tracking-wider text-foreground/55">Risco</span>{selectedMeta.risk}</p></div>
              <ActionButton onClick={() => doCapture(selectedKind)} disabled={selectedKind === 'oxygen' || selectedStatus === 'limited' || selectedStatus === 'blocked'} className="min-w-24 border-primary/50 bg-primary/10 sm:col-start-2 sm:row-start-1">{selectedKind === 'oxygen' ? 'Automático' : 'Captar'} <span className="block text-[8px] normal-case text-muted-foreground">{selectedMeta.unit}</span></ActionButton>
            </div>
            <div className={cn('mt-2 rounded-md border px-2.5 py-2 text-[9px] leading-relaxed', selectedKind !== 'oxygen' && selectedSaturation >= 75 ? 'border-warning/35 bg-warning/5 text-warning' : 'border-white/5 bg-black/15 text-muted-foreground')}><strong>{selectedKind === 'oxygen' ? 'Fisiologia do fluxo:' : 'Economia do pool:'}</strong> {selectedKind === 'oxygen' ? saturationConsequences.oxygen : selectedSaturation >= 75 ? saturationConsequences[selectedKind] : `capte quando uma rota ou decisão exigir ${selectedMeta.label.toLowerCase()}; acima de 75% começam custos de saturação.`}</div>
            <div className="mt-2 flex items-center gap-3 border-t border-white/8 pt-2"><span className="flex-none text-[8px] uppercase tracking-wider text-primary">Console</span><p className="min-w-0 truncate text-[9px] text-muted-foreground" role="status" aria-live="polite">{feedback}</p><span className="ml-auto hidden flex-none font-mono text-[9px] text-foreground/70 sm:inline">ATP {cell.atpMmolL.toFixed(2)} · pH {tissue.pH.toFixed(2)} · {adaptationLabels[leadingAdaptation[0]]} Nv.{leadingAdaptation[1]}</span></div>
          </GlassPanel>
        </div>
      </section>

      <GlassPanel className="scrollbar-thin relative z-20 hidden max-h-full self-start overflow-y-auto bg-black/25 p-3 xl:col-start-3 xl:row-start-1 xl:block">
        <div className="flex items-center justify-between gap-2"><PanelLabel>Status do tecido</PanelLabel><HelpTip title="Faixas de referência" align="right"><p>Faixas funcionais adotadas pelo simulador:</p><ul className="mt-2 space-y-1"><li>pH tecidual: 7,30–7,45</li><li>Tensão de O₂: ≥ 35 mmHg</li><li>ATP celular: ≥ 1,50 mmol/L</li><li>Estresse oxidativo: ≤ 40%</li><li>Potencial de membrana: −80 a −55 mV</li></ul></HelpTip></div><div className="gold-line my-3 h-px"/>
        {scenarioDefinition && <section aria-labelledby="tissue-investigation-title">
          <div className="flex items-center justify-between gap-2"><div id="tissue-investigation-title"><PanelLabel icon={<Activity className="size-3.5"/>}>Métricas para investigar</PanelLabel></div><span className="flex-none text-[8px] uppercase tracking-wider text-primary">Δ detecção</span></div>
          <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{scenarioDefinition.difficulty === 'hard' ? `${scenarioDefinition.metricKeys.length} marcadores integrados. Selecione uma escala e compare a trajetória antes de decidir.` : 'Marcadores prioritários deste evento e sua variação desde o instante de detecção.'}</p>
          {scenarioDefinition.difficulty === 'hard' && <div className="mt-2 grid grid-cols-2 gap-1" role="tablist" aria-label="Escala das métricas do evento">
            {investigationMetricScopes.map(scope => <button type="button" role="tab" aria-selected={investigationScope === scope.id} key={scope.id} onClick={() => setInvestigationScope(scope.id)} className={cn('min-h-8 rounded-md border px-1.5 text-[8px] uppercase tracking-wider transition', investigationScope === scope.id ? 'border-primary/45 bg-primary/10 text-primary' : 'border-white/8 bg-black/15 text-muted-foreground hover:border-primary/25 hover:text-foreground')}>{scope.label}</button>)}
          </div>}
          <div className="mt-2 space-y-1.5">
            {investigationMetrics.map(item => <div key={item.label} className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-2"><span className="block truncate text-[8px] uppercase tracking-wider text-muted-foreground" title={item.label}>{item.label}</span><div className="mt-1 flex items-baseline justify-between gap-2"><strong className="font-mono text-[12px] text-foreground">{item.value} <small className="text-[8px] font-normal text-muted-foreground">{item.unit}</small></strong><span className={cn('font-mono text-[9px]', item.delta === '—' ? 'text-muted-foreground' : 'text-primary')}>{item.delta}</span></div></div>)}
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
  { key: 'membrane', label: 'Reparar membrana', damage: 'membrane' },
  { key: 'proteins', label: 'Reparar proteínas', damage: 'proteins' },
  { key: 'dna', label: 'Reparar DNA', damage: 'dna' },
  { key: 'antioxidants', label: 'Restaurar antioxidantes', damage: 'oxidativeStress' },
];

export function IntracellularView() {
  const cellular = useSimulationStore(state => state.cellular);
  const allocate = useSimulationStore(state => state.allocateCellularAtp);
  const [feedback, setFeedback] = useState('Alocação manual disponível para estruturas danificadas.');
  const cell = cellular.cell;
  const damage = cellular.damage;
  const repair = (target: RepairTarget) => setFeedback(allocate(target) ? 'ATP alocado; reparo celular executado.' : 'Reparo indisponível: falta ATP ou não há dano suficiente.');
  return <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-28 lg:px-6"><div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 xl:grid-cols-[1.1fr_.9fr]">
    <GlassPanel className="p-4"><div className="flex items-center justify-between gap-2"><PanelLabel icon={<Activity className="size-4"/>}>Ambiente intracelular</PanelLabel><HelpTip title="Faixas de referência"><p>Valores de equilíbrio usados nesta simulação:</p><ul className="mt-2 space-y-1"><li>Viabilidade: ≥ 70% · pH: 6,90–7,35</li><li>Volume: 92–108% · membrana: −80 a −55 mV</li><li>ATP: ≥ 1,50 mmol/L · ADP basal: ~1,00 mmol/L</li><li>Na⁺: 10–15 · K⁺: 135–145 mmol/L</li><li>Ca²⁺: 50–150 nM · osmolaridade: 285–295 mOsm/kg</li><li>NADH: 40–60% · antioxidantes: ≥ 50%</li></ul></HelpTip></div><div className="gold-line my-3 h-px"/><div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricCard label="Viabilidade" value={cell.viabilityPercent.toFixed(0)} unit="%" good={cell.viabilityPercent >= 70}/><MetricCard label="pH intracelular" value={cell.pH.toFixed(2)} good={cell.pH >= 6.9 && cell.pH <= 7.35}/><MetricCard label="Volume celular" value={cell.volumePercent.toFixed(1)} unit="%" good={cell.volumePercent >= 92 && cell.volumePercent <= 108}/><MetricCard label="Membrana" value={cell.membranePotentialMv.toFixed(0)} unit="mV" good={cell.membranePotentialMv >= -80 && cell.membranePotentialMv <= -55}/>
      <MetricCard label="ATP" value={cell.atpMmolL.toFixed(2)} unit="mmol/L" good={cell.atpMmolL >= 1.5}/><MetricCard label="ADP" value={cell.adpMmolL.toFixed(2)} unit="mmol/L"/><MetricCard label="Na⁺" value={cell.sodium.toFixed(1)} unit="mmol/L"/><MetricCard label="K⁺" value={cell.potassium.toFixed(1)} unit="mmol/L"/>
      <MetricCard label="Ca²⁺" value={cell.calciumNm.toFixed(0)} unit="nM"/><MetricCard label="Osmolaridade" value={cell.osmolarity.toFixed(0)} unit="mOsm/kg"/><MetricCard label="NADH" value={cell.nadhPercent.toFixed(0)} unit="%"/><MetricCard label="Antioxidantes" value={damage.antioxidantCapacity.toFixed(0)} unit="%" good={damage.antioxidantCapacity >= 50}/>
    </div><div className={cn('mt-3 rounded-lg border px-3 py-2 text-[10px] leading-relaxed', cellular.fate.status === 'homeostasis' ? 'border-good/20 bg-good/5 text-good' : cellular.fate.status === 'stress' ? 'border-warning/30 bg-warning/5 text-warning' : 'border-danger/40 bg-danger/10 text-danger')}><strong>Destino celular: {cellular.fate.status === 'homeostasis' ? 'homeostase reversível' : cellular.fate.status === 'stress' ? 'resposta de estresse' : cellular.fate.status === 'apoptosis' ? 'apoptose em execução' : 'necrose'}</strong><span className="mt-1 block text-muted-foreground">Compromisso apoptótico {cellular.fate.apoptoticCommitment.toFixed(0)}% · suscetibilidade à infecção {cellular.fate.infectionSusceptibility.toFixed(0)}%. {cellular.fate.lastTransition}</span></div></GlassPanel>
    <GlassPanel className="p-4"><PanelLabel icon={<Shield className="size-4"/>}>Defesa, genoma e manutenção</PanelLabel><div className="gold-line my-3 h-px"/><div className="space-y-4">{[
      ['Membrana', damage.membrane], ['Proteínas', damage.proteins], ['DNA', damage.dna], ['Estresse oxidativo', damage.oxidativeStress]
    ].map(([label, value]) => <div key={String(label)}><div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>{label}</span><span className="font-mono text-foreground">{Number(value).toFixed(1)}%</span></div><ProgressBar value={Number(value)} color={Number(value) > 40 ? 'var(--danger)' : 'var(--primary)'}/></div>)}</div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">{repairMeta.map(item => <ActionButton key={item.key} onClick={() => repair(item.key)} disabled={cell.atpMmolL < 1.15 || damage[item.damage] <= 0.1}>{item.label}</ActionButton>)}</div>
      <div className="mt-4 rounded-lg border border-primary/20 bg-black/25 p-3 text-[10px] text-primary" role="status">{feedback}</div>
      {cellular.routine && <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3"><PanelLabel icon={<AlertTriangle className="size-3.5"/>}>Evento celular</PanelLabel><strong className="mt-2 block text-sm">{cellular.routine.title}</strong><p className="mt-1 text-[10px] text-muted-foreground">{cellular.routine.description} · decisão obrigatória pendente</p></div>}
    </GlassPanel>
  </div></div>;
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

export function MachineryView() {
  const cellular = useSimulationStore(state => state.cellular);
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
  const decisionVisible = Boolean(activeScenario);
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
          <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">A cadeia respiratória ocupa o centro sem painéis sobrepostos. Moléculas, reações e taxas aparecem diretamente sobre o complexo que as processa.</p>
        </GlassPanel>

        <section className="space-y-2" aria-label="Rotas metabólicas manuais">
          <GlassPanel className="flex flex-col bg-black/55 p-3"><span className="text-[8px] uppercase tracking-widest text-good">Rota 01 · preparo</span><h3 className="mt-1.5 font-display text-base">Glicólise</h3><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Glicose gera piruvato e NADH. Automação atual: {performance.automaticGlycolysisCapacityPerSecond.toFixed(3)} pac/s.</p><ActionButton className="mt-3 w-full" disabled={!canGlycolysis} onClick={() => run(glycolysis, 'Glicólise concluída; piruvato e NADH disponíveis.', 'Colete glicose ou libere espaço no pool de ATP.')}>Processar glicose</ActionButton></GlassPanel>
          <GlassPanel className="flex flex-col border-cyan/15 bg-black/55 p-3"><span className="text-[8px] uppercase tracking-widest text-cyan">Rota 02 · CTE</span><h3 className="mt-1.5 font-display text-base">Oxidar piruvato</h3><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Exige piruvato, 3 O₂ e ADP. Capacidade oxidativa: ×{performance.oxidativeCapacityMultiplier.toFixed(2)}.</p><ActionButton className="mt-3 w-full" disabled={!canOxidize('pyruvate')} onClick={() => run(() => oxidize('pyruvate'), 'Piruvato oxidado; CTE e ATP sintase responderam.', 'Faltam piruvato, O₂, ADP ou espaço energético.')}>Oxidar piruvato</ActionButton></GlassPanel>
          <GlassPanel className="flex flex-col border-warning/15 bg-black/55 p-3"><span className="text-[8px] uppercase tracking-widest text-warning">Rota 03 · alto rendimento</span><h3 className="mt-1.5 font-display text-base">Beta-oxidação</h3><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Exige ácido graxo, 6 O₂ e ADP. Automação: {performance.automaticFattyAcidOxidationPerSecond.toFixed(3)} pac/s.</p><ActionButton className="mt-3 w-full" disabled={!canOxidize('fattyAcid')} onClick={() => run(() => oxidize('fattyAcid'), 'Beta-oxidação concluída; monitore O₂ e ROS.', 'Faltam ácido graxo, O₂, ADP ou espaço energético.')}>Oxidar ácido graxo</ActionButton></GlassPanel>
        </section>
        <div className="rounded-lg border border-primary/25 bg-black/60 px-3 py-2.5 text-[9px] leading-relaxed text-primary" role="status" aria-live="polite">{feedback}</div>
      </aside>

      <section className="flex min-h-[540px] min-w-0 items-center overflow-hidden rounded-xl xl:min-h-0" aria-label="Cadeia respiratória mitocondrial totalmente visível">
        <ElectronTransportChain {...chainProps} className="my-0 w-full bg-black/30"/>
      </section>

      <GlassPanel className={cn(
        'scrollbar-thin self-start border-primary/25 bg-black/55 p-4 xl:max-h-full xl:overflow-y-auto',
        decisionVisible && 'xl:col-span-2 min-[1800px]:col-span-1',
      )}>
          <div className="flex items-center justify-between gap-3"><div><PanelLabel icon={<Bot className="size-4"/>}>Automação celular</PanelLabel><h2 className="mt-2 font-display text-lg">O que muda no próximo nível</h2></div><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[9px] text-primary">{usedBudget}/{CELLULAR_OPTIMIZATION_BUDGET}</span></div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Cada nível altera taxas contínuas do motor. Compare os valores antes de gastar ATP e substratos.</p>
          <div className="mt-3"><ProgressBar value={usedBudget / CELLULAR_OPTIMIZATION_BUDGET * 100}/></div>
          <div className="mt-4 space-y-3">{(Object.keys(automationMeta) as AutomationKind[]).map(kind => {
            const meta = automationMeta[kind];
            const Icon = meta.icon;
            const level = cellular.automation[kind];
            const recipe = getAutomationRecipe(kind, level);
            const maxed = level >= AUTOMATION_MAX_LEVEL;
            const enoughAtp = cellular.cell.atpMmolL - recipe.atp >= 1;
            const enoughSubstrates = (Object.entries(recipe.substrates) as Array<[SubstrateKind, number]>).every(([key, amount]) => cellular.pools.captured[key] >= amount);
            const canBuy = !maxed && usedBudget < CELLULAR_OPTIMIZATION_BUDGET && enoughAtp && enoughSubstrates;
            const impacts = automationImpactRows(cellular.automation, kind);
            return <section key={kind} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <div className="p-3"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-black/35" style={{ color: meta.color, borderColor: meta.color }}><Icon className="size-4"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] uppercase tracking-wider text-foreground">{meta.label}</strong><span className="font-mono text-[9px] text-primary">Nv.{level} {maxed ? '· máximo' : `→ Nv.${level + 1}`}</span></div><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{meta.mechanism}</p></div></div>
                <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 text-[9px] leading-relaxed"><strong className="text-primary">Melhora:</strong> <span className="text-foreground/75">{meta.improves}</span></div>
              </div>
              <div className="border-y border-white/8 bg-black/20 px-3 py-2"><span className="text-[8px] uppercase tracking-[.16em] text-muted-foreground">Impacto mensurável</span><div className="mt-2 space-y-2">{impacts.map(impact => <div key={impact.label}><div className="flex items-center gap-2 text-[9px]"><span className="min-w-0 flex-1 text-foreground/80">{impact.label}</span><span className="font-mono text-muted-foreground">{impact.current}</span><ArrowRight className="size-3 text-primary"/><span className={cn('font-mono', impact.changes ? 'text-primary' : 'text-muted-foreground')}>{impact.next}</span></div><p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">{impact.detail}</p></div>)}</div></div>
              <div className="p-3"><p className="text-[8px] leading-relaxed text-warning"><strong>Não altera:</strong> {meta.unchanged}</p><p className="mt-2 text-[9px] text-muted-foreground"><strong className="text-foreground/70">Custo Nv.{Math.min(level + 1, AUTOMATION_MAX_LEVEL)}:</strong> {recipe.atp.toFixed(2)} ATP{Object.entries(recipe.substrates).map(([key, amount]) => ` · ${resourceMeta[key as SubstrateKind].label} ${Number(amount).toFixed(2)}`).join('')}</p><ActionButton className="mt-3 w-full" disabled={!canBuy} onClick={() => run(() => purchase(kind), `${meta.label} elevada para o nível ${level + 1}. Compare as novas taxas.`, 'Recursos insuficientes ou limite de especialização atingido.')}>{maxed ? 'Nível máximo atingido' : `Construir nível ${level + 1}`}</ActionButton></div>
            </section>;
          })}</div>
      </GlassPanel>
    </div>
  </div>;
}
