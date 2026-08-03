import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Atom, Crosshair, Flame, Shield, Target, Wind, Zap } from 'lucide-react';
import { AUTOMATION_MAX_LEVEL, CAPTURE_AMOUNTS, CAPTURED_POOL_CAPS, CELLULAR_OPTIMIZATION_BUDGET, getAutomationRecipe } from '../../game/cellularSimulation';
import type { AutomationKind, OxidationSubstrate, RepairTarget, SubstrateKind } from '../../game/cellularTypes';
import { useSimulationStore } from '../../game/simulationStore';
import { CellularFlowScene, type FlowChipDatum, type FlowSubstrateStatus } from './CellularFlowScene';
import { CellularMachineryScene } from './CellularMachineryScene';
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

export function TissueView() {
  const cellular = useSimulationStore(state => state.cellular);
  const scenarioResponse = useSimulationStore(state => state.scenarioResponse);
  const history = useSimulationStore(state => state.history);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const capture = useSimulationStore(state => state.captureCellularSubstrate);
  const running = useSimulationStore(state => state.isRunning);
  const timeSpeed = useSimulationStore(state => state.timeSpeed);
  const [feedback, setFeedback] = useState('Observe a entrega capilar ao LEC e selecione a proteína de transporte para captar o substrato.');
  const [selectedKind, setSelectedKind] = useState<SubstrateKind>('oxygen');
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
        <div className="space-y-1.5">
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

const automationLabels: Record<AutomationKind, string> = { transporters: 'Transportadores', mitochondrialShuttle: 'Navette mitocondrial', repair: 'Reparo automático' };

export function MachineryView() {
  const cellular = useSimulationStore(state => state.cellular);
  const glycolysis = useSimulationStore(state => state.runCellularGlycolysis);
  const oxidize = useSimulationStore(state => state.oxidizeCellularSubstrate);
  const purchase = useSimulationStore(state => state.purchaseCellularAutomation);
  const [feedback, setFeedback] = useState('A maquinaria está pronta. Escolha uma rota bioquímica.');
  const run = (action: () => boolean, ok: string, fail: string) => setFeedback(action() ? ok : fail);
  const usedBudget = Object.values(cellular.automation).reduce((sum, level) => sum + level, 0);
  const canGlycolysis = cellular.pools.captured.glucose >= 1 && cellular.cell.atpMmolL <= 5.72;
  const canOxidize = (kind: OxidationSubstrate) => kind === 'pyruvate' ? cellular.pools.pyruvate >= 1 && cellular.pools.captured.oxygen >= 3 && cellular.cell.adpMmolL >= .45 : cellular.pools.captured.fattyAcid >= 1 && cellular.pools.captured.oxygen >= 6 && cellular.cell.adpMmolL >= .85;
  return <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-28 lg:px-6"><div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
    <GlassPanel className="p-4"><div className="flex items-center justify-between gap-2"><PanelLabel icon={<Atom className="size-4"/>}>Rotas bioquímicas</PanelLabel><HelpTip title="Referências da rota"><p>Os substratos são exibidos em pacotes, não em unidades clínicas; não há uma faixa “normal” fixa para seus estoques.</p><ul className="mt-2 space-y-1"><li>O₂ tecidual: mantenha ≥ 35 mmHg</li><li>ATP celular: mantenha ≥ 1,50 mmol/L</li><li>ΔΨ mitocondrial: cerca de −150 a −180 mV</li><li>NADH: em equilíbrio, ~40–60%</li><li>Saúde mitocondrial: ≥ 70%</li></ul><p className="mt-2">Os botões ficam disponíveis quando há os pacotes necessários para cada reação.</p></HelpTip></div><div className="gold-line my-3 h-px"/><div className="grid grid-cols-2 gap-2 md:grid-cols-5">{[
      ['Glicose', cellular.pools.captured.glucose], ['O₂ disponível à CTE', cellular.pools.captured.oxygen], ['Ácido graxo', cellular.pools.captured.fattyAcid], ['Aminoácido', cellular.pools.captured.aminoAcid], ['Piruvato', cellular.pools.pyruvate]
    ].map(([label, value]) => <GlassPanel key={String(label)} soft className="p-3 text-center"><PanelLabel className="justify-center">{label}</PanelLabel><strong className="mt-2 block font-display text-xl">{Number(value).toFixed(1)}</strong></GlassPanel>)}</div>
      <CellularMachineryScene automation={cellular.automation} etcFlux={cellular.mitochondria.etcFluxPercent} atp={cellular.cell.atpMmolL}/>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <GlassPanel soft className="flex min-h-56 flex-col p-4"><span className="text-[9px] uppercase tracking-widest text-primary">Rota 01</span><h3 className="mt-3 font-display text-lg">Glicólise</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Converte glicose captada em dois piruvatos e ATP citosólico.</p><ActionButton className="mt-auto" disabled={!canGlycolysis} onClick={() => run(glycolysis, 'Glicólise concluída; piruvato disponível.', 'Colete glicose ou libere espaço no pool de ATP.')}>Processar glicose</ActionButton></GlassPanel>
        <GlassPanel soft className="flex min-h-56 flex-col p-4"><span className="text-[9px] uppercase tracking-widest text-primary">Rota 02</span><h3 className="mt-3 font-display text-lg">Oxidação de piruvato</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Usa um piruvato, três pacotes de O₂ e ADP para produzir ATP mitocondrial.</p><ActionButton className="mt-auto" disabled={!canOxidize('pyruvate')} onClick={() => run(() => oxidize('pyruvate'), 'Piruvato oxidado; ATP mitocondrial produzido.', 'Faltam piruvato, oxigênio, ADP ou espaço energético.')}>Oxidar piruvato</ActionButton></GlassPanel>
        <GlassPanel soft className="flex min-h-56 flex-col p-4"><span className="text-[9px] uppercase tracking-widest text-primary">Rota 03</span><h3 className="mt-3 font-display text-lg">Beta-oxidação</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Usa ácido graxo e seis pacotes de O₂ para alto rendimento energético.</p><ActionButton className="mt-auto" disabled={!canOxidize('fattyAcid')} onClick={() => run(() => oxidize('fattyAcid'), 'Beta-oxidação concluída.', 'Faltam ácido graxo, oxigênio, ADP ou espaço energético.')}>Oxidar ácido graxo</ActionButton></GlassPanel>
      </div>
      <ElectronTransportChain
        fluxPercent={cellular.mitochondria.etcFluxPercent}
        membranePotentialMv={cellular.mitochondria.membranePotentialMv}
        atpSynthaseFlux={cellular.mitochondria.atpSynthaseFlux}
        oxygenMmHg={cellular.tissue.oxygenMmHg}
        nadhPercent={cellular.cell.nadhPercent}
        healthPercent={cellular.mitochondria.healthPercent}
        oxidativeStress={cellular.damage.oxidativeStress}
        processing={cellular.mitochondria.processing}
      />
      <div className="mt-4 rounded-lg border border-primary/20 bg-black/25 p-3 text-[10px] text-primary" role="status">{feedback}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><MetricCard label="ATP celular" value={cellular.cell.atpMmolL.toFixed(2)} unit="mmol/L"/><MetricCard label="ΔΨ mitocondrial" value={cellular.mitochondria.membranePotentialMv.toFixed(0)} unit="mV"/><MetricCard label="Fluxo ETC" value={cellular.mitochondria.etcFluxPercent.toFixed(0)} unit="%"/><MetricCard label="Saúde mitocondrial" value={cellular.mitochondria.healthPercent.toFixed(0)} unit="%" good={cellular.mitochondria.healthPercent >= 70}/></div>
    </GlassPanel>
    <GlassPanel className="p-4"><PanelLabel icon={<Shield className="size-4"/>}>Automação celular</PanelLabel><div className="gold-line my-3 h-px"/><div className="mb-4"><div className="mb-1 flex justify-between text-[10px] uppercase text-muted-foreground"><span>Orçamento</span><span>{usedBudget}/{CELLULAR_OPTIMIZATION_BUDGET}</span></div><ProgressBar value={usedBudget / CELLULAR_OPTIMIZATION_BUDGET * 100}/></div><div className="space-y-3">{(Object.keys(automationLabels) as AutomationKind[]).map(kind => {
      const level = cellular.automation[kind]; const recipe = getAutomationRecipe(kind, level); const maxed = level >= AUTOMATION_MAX_LEVEL; const enoughAtp = cellular.cell.atpMmolL - recipe.atp >= 1; const enoughSubstrates = (Object.entries(recipe.substrates) as Array<[SubstrateKind, number]>).every(([key, amount]) => cellular.pools.captured[key] >= amount); const canBuy = !maxed && usedBudget < CELLULAR_OPTIMIZATION_BUDGET && enoughAtp && enoughSubstrates;
      return <GlassPanel soft key={kind} className="p-3"><div className="flex justify-between gap-3"><strong className="text-xs uppercase tracking-wider">{automationLabels[kind]}</strong><span className="font-mono text-[10px] text-primary">{level}/{AUTOMATION_MAX_LEVEL}</span></div><ProgressBar value={level / AUTOMATION_MAX_LEVEL * 100}/><p className="mt-2 text-[9px] text-muted-foreground">Custo: {recipe.atp.toFixed(2)} ATP{Object.entries(recipe.substrates).map(([key, amount]) => ` · ${resourceMeta[key as SubstrateKind].label} ${amount}`).join('')}</p><ActionButton className="mt-3 w-full" disabled={!canBuy} onClick={() => run(() => purchase(kind), 'Automação construída.', 'Recursos insuficientes ou limite atingido.')}>{maxed ? 'Nível máximo' : `Construir nível ${level + 1}`}</ActionButton></GlassPanel>;
    })}</div></GlassPanel>
  </div></div>;
}
