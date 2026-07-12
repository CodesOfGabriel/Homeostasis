import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Atom, CheckCircle2, CircleDotDashed, Clock3, Crosshair, Droplets, Flame, Heart, HeartPulse, ScrollText, Shield, Target, Wind, Zap } from 'lucide-react';
import { HORMONAL_ACTIONS, isActionSafe } from '../../game/actions';
import { AUTOMATION_MAX_LEVEL, CELLULAR_OPTIMIZATION_BUDGET, getAutomationRecipe } from '../../game/cellularSimulation';
import type { AutomationKind, CellularRoutineEvent, OxidationSubstrate, RepairTarget, SubstrateKind } from '../../game/cellularTypes';
import { useSimulationStore } from '../../game/simulationStore';
import type { PhysiologyState } from '../../game/types';
import { CardiacMonitorCard } from './CardiacMonitorCard';
import { CellularFlowScene, type FlowChipDatum, type FlowSubstrateStatus } from './CellularFlowScene';
import { CellularMachineryScene } from './CellularMachineryScene';
import { ElectronTransportChain } from './ElectronTransportChain';
import { ActionButton, GlassPanel, HelpTip, MetricCard, PanelLabel, ProgressBar, RangeControl, Sparkline, cn } from './ui';

function formatEventTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

const resourceMeta: Record<SubstrateKind, { label: string; receptor: string; unit: string; icon: typeof Zap; color: string; cost: string; effect: string; risk: string }> = {
  glucose: { label: 'Glicose', receptor: 'GLUT4', unit: '1 pacote', icon: Zap, color: 'var(--good)', cost: 'transportador · sem ATP direto', effect: 'Glicólise, piruvato e glicogênio', risk: 'Com pouco O₂: lactato, H⁺ e ROS' },
  oxygen: { label: 'Oxigênio', receptor: 'difusão de O₂', unit: '3 pacotes', icon: Wind, color: 'var(--cyan)', cost: 'difusão conforme gradiente', effect: 'CTE e fosforilação oxidativa', risk: 'Excesso redox: ROS de reperfusão' },
  fattyAcid: { label: 'Ácido graxo', receptor: 'CD36 / FATP', unit: '0,5 pacote', icon: Flame, color: 'var(--warning)', cost: 'transporte + CPT-1', effect: 'Beta-oxidação de alto rendimento', risk: 'Exige O₂ e eleva pressão redox' },
  aminoAcid: { label: 'Aminoácido', receptor: 'LAT1', unit: '0,5 pacote', icon: Atom, color: 'var(--primary)', cost: 'cotransporte e gradiente iônico', effect: 'Reparo e síntese proteica', risk: 'Excesso aumenta carga nitrogenada' },
};

const scenarioCategoryMeta = {
  organ: { label: 'Órgão', icon: HeartPulse, color: 'var(--danger)' },
  cell: { label: 'Célula', icon: CircleDotDashed, color: 'var(--cyan)' },
  molecule: { label: 'Molécula', icon: Atom, color: 'var(--primary)' },
};

function ScenarioDecisionCard({ routine, onChoose }: { routine: CellularRoutineEvent; onChoose: (choiceId: string) => void }) {
  const meta = scenarioCategoryMeta[routine.category];
  const Icon = meta.icon;
  const urgency = routine.remainingSeconds <= 8;
  return (
    <GlassPanel className={cn('overflow-visible border-warning/30 p-3', urgency && 'ring-1 ring-danger/60')}>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className="grid size-8 flex-none place-items-center rounded-lg border border-white/10 bg-black/25"><Icon className="size-4" style={{ color: meta.color }}/></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><PanelLabel>Cenário - {meta.label}</PanelLabel><HelpTip title="Por que isso altera a célula?">{routine.explanation}</HelpTip></div>
            <h2 className="mt-1 font-display text-sm text-foreground">{routine.title}</h2>
          </div>
        </div>
        <div className="flex items-start justify-between gap-2"><p className="text-[9px] leading-relaxed text-muted-foreground">{routine.description}</p><span className={cn('flex flex-none items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px]', urgency ? 'border-danger/50 bg-danger/10 text-danger' : 'border-warning/30 bg-warning/5 text-warning')}><Clock3 className="size-3"/>{Math.max(0, routine.remainingSeconds).toFixed(0)}s</span></div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {routine.choices.map(choice => <button type="button" key={choice.id} onClick={() => onChoose(choice.id)} className="group rounded-lg border border-white/10 bg-black/20 p-2.5 text-left transition-all hover:border-primary/50 hover:bg-primary/5">
          <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-foreground"><CheckCircle2 className="size-3 text-primary"/>{choice.label}</span>
          <span className="mt-1 block text-[8px] leading-relaxed text-muted-foreground">{choice.description} · <span className="text-primary/80">{choice.tradeoff}</span></span>
        </button>)}
      </div>
    </GlassPanel>
  );
}

const captureAmounts: Record<SubstrateKind, number> = { glucose: 1, oxygen: 3, fattyAcid: .5, aminoAcid: .5 };
const capturedCaps: Record<SubstrateKind, number> = { glucose: 6, oxygen: 20, fattyAcid: 4, aminoAcid: 4 };
const statusLabels: Record<FlowSubstrateStatus, string> = {
  available: 'em equilíbrio', capturable: 'gradiente favorável', cooldown: 'recuperação de transporte', limited: 'oferta intersticial baixa', excess: 'oferta acima da demanda', toxic: 'sobrecarga metabólica', blocked: 'capacidade de transporte saturada', selected: 'em análise',
};
const adaptationLabels = {
  enzymaticEfficiency: 'Enzimas', antioxidantDefense: 'Antioxidantes', metabolicFlexibility: 'Flexibilidade', bufferCapacity: 'Buffer', hypoxiaTolerance: 'Hipóxia',
};

function substrateStatus(kind: SubstrateKind, available: number, captured: number, tissue: { glucoseMmolL: number; oxygenMmHg: number }): FlowSubstrateStatus {
  if (captured + captureAmounts[kind] > capturedCaps[kind]) return 'blocked';
  if (available < captureAmounts[kind]) return 'limited';
  if (kind === 'glucose' && tissue.glucoseMmolL > 11) return 'toxic';
  if (kind === 'fattyAcid' && available > 3.2 && tissue.oxygenMmHg < 25) return 'toxic';
  if ((kind === 'glucose' && tissue.glucoseMmolL > 7) || (kind === 'fattyAcid' && available > 3.2) || (kind === 'aminoAcid' && available > 3.4)) return 'excess';
  return captured < captureAmounts[kind] ? 'capturable' : 'available';
}

function substrateStatusExplanation(kind: SubstrateKind, status: FlowSubstrateStatus) {
  const meta = resourceMeta[kind];
  if (status === 'blocked') return `${meta.receptor}: pool intracelular saturado; processe o substrato antes de aumentar a captação.`;
  if (status === 'limited') return kind === 'oxygen' ? 'PO₂ tecidual baixa: a difusão oferece menos O₂ à mitocôndria.' : `Entrega capilar reduzida: há pouco ${meta.label.toLowerCase()} disponível no interstício.`;
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
  const history = useSimulationStore(state => state.history);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const capture = useSimulationStore(state => state.captureCellularSubstrate);
  const resolveRoutine = useSimulationStore(state => state.resolveCellularRoutine);
  const [feedback, setFeedback] = useState('Selecione um substrato para transferi-lo ao meio intracelular.');
  const [selectedKind, setSelectedKind] = useState<SubstrateKind>('oxygen');
  const tissue = cellular.tissue;
  const cell = cellular.cell;
  const selectedMeta = resourceMeta[selectedKind];
  const selectedAvailable = cellular.pools.available[selectedKind];
  const selectedCaptured = cellular.pools.captured[selectedKind];
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
    const status = substrateStatus(kind, cellular.pools.available[kind], cellular.pools.captured[kind], tissue);
    const ok = capture(kind);
    setFeedback(ok ? `${resourceMeta[kind].label} captado com sucesso.` : `Captação indisponível: ${substrateStatusExplanation(kind, status)}`);
  };

  const chooseRoutineResponse = (choiceId: string) => {
    const ok = resolveRoutine(choiceId);
    setFeedback(ok ? 'Decisão aplicada. Observe a resposta nos indicadores celulares.' : 'Recursos insuficientes para essa resposta. Confira o custo e capte os substratos necessários.');
  };

  return (
    <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-20 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-6 xl:grid-cols-[230px_minmax(0,1fr)_270px]">
      <GlassPanel className="relative z-20 hidden min-h-0 max-h-full self-stretch overflow-visible bg-black/25 p-3 lg:flex lg:flex-col">
        <div className="flex items-center gap-2"><PanelLabel icon={<Crosshair className="size-3.5"/>}>Objetivo</PanelLabel><HelpTip title="Como vencer este ciclo?">Mantenha ATP, oxigênio, pH e integridade celular enquanto responde aos cenários antes do cronômetro terminar.</HelpTip></div><div className="gold-line my-3 h-px"/>
        <h2 className="text-[13px] font-medium">Manter a homeostase tecidual</h2><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Equilibre perfusão, gases, energia e pH sem criar outro desequilíbrio.</p>
        {cellular.routine && <div className="mt-3"><ScenarioDecisionCard routine={cellular.routine} onChoose={chooseRoutineResponse}/></div>}
        <div className="mt-4 flex items-center gap-2"><PanelLabel icon={<Target className="size-3.5"/>}>Foco atual</PanelLabel><HelpTip title="Prioridade atual">O foco muda com alertas e cenários. Prepare os substratos indicados antes de escolher uma resposta.</HelpTip></div><div className="gold-line my-2 h-px"/>
        <h3 className="text-xs font-medium">{cellular.routine?.title ?? (warnings[0]?.parameter ? `Corrigir ${warnings[0].parameter}` : 'Sustentar metabolismo aeróbio')}</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{cellular.routine?.description ?? warnings[0]?.recommendation ?? 'Garanta O₂ e substratos sem saturar os pools celulares.'}</p>
        <div className="mt-auto rounded-lg border border-white/8 bg-black/15 p-2.5 text-[9px] leading-relaxed text-muted-foreground"><span className="mb-1 block uppercase tracking-wider text-primary">Leitura ativa</span>{feedback}</div>
      </GlassPanel>

      <section className="min-h-0 overflow-visible rounded-xl p-1" aria-label="Microambiente tecidual">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-end">
          <CellularFlowScene
            available={cellular.pools.available}
            captured={cellular.pools.captured}
            wasteLoad={cellular.tissue.wasteLoad}
            oxidativeStress={cellular.damage.oxidativeStress}
            membranePotentialMv={cellular.cell.membranePotentialMv}
            lastCaptured={cellular.collection.lastKind}
            captureChain={cellular.collection.chain}
            chips={flowChips}
            selectedKind={selectedKind}
            onSelect={setSelectedKind}
          />
          <GlassPanel className="relative z-20 ml-auto mt-auto w-full max-w-[440px] overflow-hidden bg-black/35 p-2.5" aria-label={`Detalhes de ${selectedMeta.label}`}>
            <div className="grid items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-9 flex-none place-items-center rounded-full border bg-black/30" style={{ color: selectedMeta.color, borderColor: selectedMeta.color }}><SelectedIcon className="size-4"/></span>
                <div className="min-w-0"><div className="flex items-center gap-2"><strong className="font-display text-sm">{selectedMeta.label}</strong><span className="substrate-state" data-state={selectedStatus}>{substrateStatusLabel(selectedKind, selectedStatus)}</span></div><p className="mt-1 font-mono text-[9px] text-muted-foreground">Tecido {selectedAvailable.toFixed(1)} · Célula {selectedCaptured.toFixed(1)} pacote(s)</p><p className="mt-1 truncate text-[8px] text-muted-foreground" title={selectedStatusExplanation}>{selectedStatusExplanation}</p></div>
              </div>
              <div className="grid gap-2 text-[8px] leading-relaxed text-muted-foreground sm:col-span-2 sm:row-start-2 sm:grid-cols-3"><p><span className="block uppercase tracking-wider text-foreground/55">Custo</span>{selectedMeta.cost}</p><p><span className="block uppercase tracking-wider text-foreground/55">Efeito</span>{selectedMeta.effect}</p><p><span className="block uppercase tracking-wider text-foreground/55">Risco</span>{selectedMeta.risk}</p></div>
              <ActionButton onClick={() => doCapture(selectedKind)} disabled={selectedStatus === 'limited' || selectedStatus === 'blocked'} className="min-w-24 border-primary/50 bg-primary/10 sm:col-start-2 sm:row-start-1">Captar <span className="block text-[8px] normal-case text-muted-foreground">{selectedMeta.unit}</span></ActionButton>
            </div>
            <div className="mt-2 flex items-center gap-3 border-t border-white/8 pt-2"><span className="flex-none text-[8px] uppercase tracking-wider text-primary">Console</span><p className="min-w-0 truncate text-[9px] text-muted-foreground" role="status" aria-live="polite">{feedback}</p><span className="ml-auto hidden flex-none font-mono text-[9px] text-foreground/70 sm:inline">ATP {cell.atpMmolL.toFixed(2)} · pH {tissue.pH.toFixed(2)} · {adaptationLabels[leadingAdaptation[0]]} Nv.{leadingAdaptation[1]}</span></div>
          </GlassPanel>
        </div>
      </section>

      <GlassPanel className="scrollbar-thin relative z-20 hidden max-h-full self-start overflow-y-auto bg-black/25 p-3 xl:block">
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

export function IntracellularView({ focus }: { focus?: 'defense' | 'genome' }) {
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
    </div></GlassPanel>
    <GlassPanel className={cn('p-4', focus && 'ring-1 ring-primary/40')}><PanelLabel icon={<Shield className="size-4"/>}>Dano e manutenção</PanelLabel><div className="gold-line my-3 h-px"/><div className="space-y-4">{[
      ['Membrana', damage.membrane], ['Proteínas', damage.proteins], ['DNA', damage.dna], ['Estresse oxidativo', damage.oxidativeStress]
    ].map(([label, value]) => <div key={String(label)}><div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>{label}</span><span className="font-mono text-foreground">{Number(value).toFixed(1)}%</span></div><ProgressBar value={Number(value)} color={Number(value) > 40 ? 'var(--danger)' : 'var(--primary)'}/></div>)}</div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">{repairMeta.map(item => <ActionButton key={item.key} onClick={() => repair(item.key)} className={focus === 'genome' && item.key === 'dna' ? 'border-primary/70 bg-primary/10' : undefined} disabled={cell.atpMmolL < 1.15 || damage[item.damage] <= 0.1}>{item.label}</ActionButton>)}</div>
      <div className="mt-4 rounded-lg border border-primary/20 bg-black/25 p-3 text-[10px] text-primary" role="status">{feedback}</div>
      {cellular.routine && <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3"><PanelLabel icon={<AlertTriangle className="size-3.5"/>}>Evento celular</PanelLabel><strong className="mt-2 block text-sm">{cellular.routine.title}</strong><p className="mt-1 text-[10px] text-muted-foreground">{cellular.routine.description} · {cellular.routine.remainingSeconds.toFixed(0)}s</p></div>}
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
      ['Glicose', cellular.pools.captured.glucose], ['Oxigênio', cellular.pools.captured.oxygen], ['Ácido graxo', cellular.pools.captured.fattyAcid], ['Aminoácido', cellular.pools.captured.aminoAcid], ['Piruvato', cellular.pools.pyruvate]
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

export function SystemView({ focus }: { focus?: 'overview' | 'signaling' | 'vitals' }) {
  const physiology = useSimulationStore(state => state.physiology);
  const history = useSimulationStore(state => state.history);
  const interventions = useSimulationStore(state => state.interventions);
  const external = useSimulationStore(state => state.externalFactors);
  const cooldowns = useSimulationStore(state => state.hormonalCooldowns);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const events = useSimulationStore(state => state.recentEvents);
  const release = useSimulationStore(state => state.releaseHormone);
  const ingestWater = useSimulationStore(state => state.ingestWater);
  const setHeartRateTarget = useSimulationStore(state => state.setHeartRateTarget);
  const setVentilationDrive = useSimulationStore(state => state.setVentilationDrive);
  const setRenalWaterReabsorption = useSimulationStore(state => state.setRenalWaterReabsorption);
  const setExerciseIntensity = useSimulationStore(state => state.setExerciseIntensity);
  const setStressLevel = useSimulationStore(state => state.setStressLevel);
  const setNutrition = useSimulationStore(state => state.setNutrition);
  const setSleep = useSimulationStore(state => state.setSleep);
  const safetyState = useMemo(() => ({ glucose: physiology.nutrients.bloodGlucose, pH: physiology.acidBase.pH, heartRate: physiology.cardiovascular.heartRate, energyDeficit: physiology.energy.energyDeficit }), [physiology]);
  return <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-28 lg:px-6"><div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_360px]">
    <div className="space-y-4">
      <GlassPanel className={cn('p-4', (focus === 'overview' || focus === 'vitals') && 'ring-1 ring-primary/40')}><div className="flex items-center justify-between gap-2"><PanelLabel icon={<Heart className="size-4"/>}>Sinais vitais</PanelLabel><HelpTip title="Faixas de referência"><p>Referências para um adulto em repouso, usadas pelo simulador:</p><ul className="mt-2 space-y-1"><li>Frequência cardíaca: 60–100 bpm</li><li>Pressão arterial: 90–120 / 60–80 mmHg</li><li>SpO₂: 95–100%</li><li>Frequência respiratória: 12–20 rpm</li><li>pH arterial: 7,35–7,45</li><li>Glicemia em jejum: 70–100 mg/dL</li></ul></HelpTip></div><div className="gold-line my-3 h-px"/><div className="grid grid-cols-2 gap-3 md:grid-cols-3"><MetricCard label="Frequência cardíaca" value={physiology.cardiovascular.heartRate.toFixed(0)} unit="bpm" history={[...history.heartRate, physiology.cardiovascular.heartRate]} good={physiology.cardiovascular.heartRate >= 60 && physiology.cardiovascular.heartRate <= 100}/><MetricCard label="Pressão arterial" value={`${physiology.cardiovascular.systolicBP.toFixed(0)}/${physiology.cardiovascular.diastolicBP.toFixed(0)}`} unit="mmHg"/><MetricCard label="SpO₂" value={physiology.respiratory.spo2.toFixed(1)} unit="%" history={[...history.spo2, physiology.respiratory.spo2]} good={physiology.respiratory.spo2 >= 95}/><MetricCard label="Frequência respiratória" value={physiology.respiratory.respiratoryRate.toFixed(1)} unit="rpm"/><MetricCard label="pH arterial" value={physiology.acidBase.pH.toFixed(2)} history={[...history.pH, physiology.acidBase.pH]} good={physiology.acidBase.pH >= 7.35 && physiology.acidBase.pH <= 7.45}/><MetricCard label="Glicemia" value={physiology.nutrients.bloodGlucose.toFixed(0)} unit="mg/dL" history={[...history.glucose, physiology.nutrients.bloodGlucose]} good={physiology.nutrients.bloodGlucose >= 70 && physiology.nutrients.bloodGlucose <= 100}/></div></GlassPanel>
      <CardiacMonitorCard bpm={physiology.cardiovascular.heartRate} rhythm={physiology.cardiovascular.rhythm} variabilityMs={physiology.cardiovascular.heartRateVariability}/>
      <GlassPanel className="p-4"><PanelLabel icon={<Droplets className="size-4"/>}>Intervenções sistêmicas</PanelLabel><div className="gold-line my-3 h-px"/><div className="mb-3 rounded-lg border border-white/10 bg-black/15 p-3"><div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground"><span>Água no estômago</span><strong className="font-mono text-foreground">{interventions.pendingWaterMl.toFixed(0)} mL</strong></div><div className="mt-3 grid grid-cols-2 gap-2"><ActionButton onClick={() => ingestWater(250)} disabled={interventions.pendingWaterMl >= 2000}>Ingerir 250 mL</ActionButton><ActionButton onClick={() => ingestWater(500)} disabled={interventions.pendingWaterMl >= 2000}>Ingerir 500 mL</ActionButton></div></div><div className="space-y-2"><RangeControl label="Alvo cardíaco" value={interventions.heartRateTarget} min={45} max={180} unit="bpm" measured={`${physiology.cardiovascular.heartRate.toFixed(0)} bpm`} onChange={setHeartRateTarget}/><RangeControl label="Drive ventilatório" value={interventions.ventilationDrive} min={50} max={180} unit="%" measured={`${physiology.respiratory.respiratoryRate.toFixed(1)} rpm`} onChange={setVentilationDrive}/><RangeControl label="Reabsorção renal" value={interventions.renalWaterReabsorption} min={98.5} max={99.8} step={.1} unit="%" measured={`${physiology.nutrients.hydration.toFixed(2)} L`} onChange={setRenalWaterReabsorption}/></div></GlassPanel>
    </div>
    <div className="space-y-4">
      <GlassPanel className={cn('p-4', focus === 'signaling' && 'ring-1 ring-primary/40')}><PanelLabel icon={<Zap className="size-4"/>}>Sinalização hormonal</PanelLabel><div className="gold-line my-3 h-px"/><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{HORMONAL_ACTIONS.map(action => { const safety = isActionSafe(action.id, safetyState); const cooldown = cooldowns.get(action.hormone) ?? 0; const disabled = !safety.safe || cooldown > 0; return <GlassPanel soft key={action.id} className="p-3"><div className="flex items-start justify-between gap-3"><strong className="text-[11px] uppercase tracking-wider">{action.name.replace('Liberar ', '').replace('Aumentar ', '')}</strong><span className="font-mono text-[9px] text-primary">{physiology.hormones[action.hormone as keyof PhysiologyState['hormones']].toFixed(1)}</span></div><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{disabled ? (cooldown > 0 ? `Recarga: ${cooldown.toFixed(0)}s` : safety.reason) : action.description}</p><ActionButton className="mt-3 w-full" disabled={disabled} onClick={() => release(action.hormone as keyof PhysiologyState['hormones'], action.baseAmount)}>{cooldown > 0 ? 'Em recarga' : 'Liberar sinal'}</ActionButton></GlassPanel>; })}</div></GlassPanel>
      <GlassPanel className="p-4"><PanelLabel icon={<Activity className="size-4"/>}>Contexto fisiológico</PanelLabel><div className="gold-line my-3 h-px"/><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><RangeControl label="Exercício" value={external.exercise} min={0} max={100} unit="%" onChange={setExerciseIntensity}/><RangeControl label="Estresse" value={external.stress} min={0} max={100} unit="%" onChange={setStressLevel}/><RangeControl label="Nutrição" value={external.nutrition} min={0} max={100} unit="%" onChange={setNutrition}/><RangeControl label="Sono" value={external.sleep} min={0} max={100} unit="%" onChange={setSleep}/></div></GlassPanel>
    </div>
    <div className="space-y-4">
      <GlassPanel className="p-4"><PanelLabel icon={<AlertTriangle className="size-4"/>}>Alertas</PanelLabel><div className="gold-line my-3 h-px"/><div className="space-y-2">{warnings.length === 0 ? <div className="rounded-lg border border-good/30 bg-good/5 p-3 text-[10px] text-good">Todos os parâmetros monitorados estão estáveis.</div> : warnings.slice(0, 6).map(warning => <div key={warning.parameter} className="rounded-lg border border-warning/30 bg-warning/5 p-3"><strong className="text-[10px] uppercase tracking-wider text-warning">{warning.parameter}</strong><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{warning.currentValue.toFixed(2)} · {warning.recommendation}</p></div>)}</div></GlassPanel>
      <GlassPanel className="p-4"><PanelLabel icon={<ScrollText className="size-4"/>}>Timeline</PanelLabel><div className="gold-line my-3 h-px"/><ol className="space-y-3">{events.slice(0, 10).map((event, index) => <li key={`${event.timestamp}-${index}`} className="border-l border-primary/30 pl-3"><div className="flex justify-between gap-3"><strong className={cn('text-[9px] uppercase', event.severity === 'critical' ? 'text-danger' : event.severity === 'warning' ? 'text-warning' : 'text-primary')}>{event.type}</strong><span className="font-mono text-[9px] text-muted-foreground">{formatEventTime(event.timestamp)}</span></div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{event.message}</p></li>)}</ol></GlassPanel>
    </div>
  </div></div>;
}
