import { useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Beaker,
  BrainCircuit,
  ChevronDown,
  Droplets,
  FlaskConical,
  GitCompareArrows,
  Heart,
  ScrollText,
  Wind,
} from 'lucide-react';
import { useSimulationStore } from '../../game/simulationStore';
import { getSimulationCalendar } from '../../game/simulationCalendar';
import { CardiacRhythmInline } from './CardiacMonitorCard';
import type { StepKey } from './navigation';
import { ActionButton, GlassPanel, HelpTip, PanelLabel, Sparkline, cn } from './ui';

function formatEventTime(seconds: number) {
  const calendar = getSimulationCalendar(seconds);
  return `Dia ${calendar.day} · ${calendar.clock}`;
}

function PrimaryMetric({ label, value, unit, secondary, good = true }: {
  label: string;
  value: string;
  unit?: string;
  secondary: string;
  good?: boolean;
}) {
  return <article className="rounded-xl border border-white/10 bg-black/20 p-3.5">
    <div className="flex items-center gap-2 text-xs font-medium text-foreground/85">
      <span className={cn('size-2 rounded-full', good ? 'bg-good shadow-[0_0_7px_var(--good)]' : 'bg-warning shadow-[0_0_7px_var(--warning)]')}/>
      {label}
    </div>
    <div className="mt-2 flex items-baseline gap-1.5">
      <strong className="font-mono text-xl font-medium tabular-nums text-foreground">{value}</strong>
      {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
    </div>
    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{secondary}</p>
  </article>;
}

function ClinicalMetric({ label, value, unit, good = true, history, current, reference }: {
  label: string;
  value: string;
  unit?: string;
  good?: boolean;
  history?: number[];
  current: number;
  reference: string;
}) {
  return <article className="min-w-0 rounded-xl border border-white/8 bg-black/15 p-3.5">
    <div className="flex items-start gap-2">
      <span className={cn('mt-1 size-2 shrink-0 rounded-full', good ? 'bg-good' : 'bg-warning')}/>
      <span className="text-xs font-medium leading-snug text-foreground/85">{label}</span>
    </div>
    <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
      <strong className="font-mono text-lg font-medium tabular-nums text-foreground">{value}</strong>
      {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
    </div>
    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Referência: {reference}</p>
    {history && <div className="mt-2 opacity-75"><Sparkline data={[...history, current].slice(-40)} color={good ? 'var(--teal)' : 'var(--warning)'} height={18}/></div>}
  </article>;
}

function ClinicalSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-white/8 bg-black/10 p-3.5">
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">{icon}<h3>{title}</h3></div>
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
  </section>;
}

function SummaryChip({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/15 px-3 py-2">
    <span className={cn('size-2 rounded-full', good ? 'bg-good' : 'bg-warning')}/>
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <strong className="font-mono text-[11px] font-medium text-foreground">{value}</strong>
  </div>;
}

type ComparisonId = 'oxygen' | 'perfusion' | 'glucose';

export function ClinicalSystemView({ focus, onNavigate }: { focus?: 'vitals'; onNavigate?: (target: StepKey) => void }) {
  const physiology = useSimulationStore(state => state.physiology);
  const cellular = useSimulationStore(state => state.cellular);
  const history = useSimulationStore(state => state.history);
  const interventions = useSimulationStore(state => state.interventions);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const events = useSimulationStore(state => state.recentEvents);
  const ingestWater = useSimulationStore(state => state.ingestWater);
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [investigationRequests, setInvestigationRequests] = useState(0);
  const [comparison, setComparison] = useState<ComparisonId>('oxygen');

  const primaryStable = physiology.cardiovascular.meanArterialPressure >= 70
    && physiology.cardiovascular.meanArterialPressure <= 105
    && physiology.respiratory.spo2 >= 95
    && physiology.respiratory.respiratoryRate >= 12
    && physiology.respiratory.respiratoryRate <= 20
    && physiology.cardiovascular.rhythm !== 'ventricular-fibrillation';
  const primaryWarnings = warnings.slice(0, 3);
  const expected = physiology.acidBase.expectedCompensation;

  const comparisons = {
    oxygen: {
      label: 'Oxigênio → ATP',
      values: [
        { scale: 'Organismo', label: 'PaO₂ arterial', value: `${physiology.respiratory.pao2.toFixed(0)} mmHg`, step: 'vitals' as StepKey },
        { scale: 'Tecido', label: 'PO₂ tecidual', value: `${cellular.tissue.oxygenMmHg.toFixed(0)} mmHg`, step: 'tissue' as StepKey },
        { scale: 'Célula', label: 'ATP disponível', value: `${cellular.cell.atpMmolL.toFixed(2)} mmol/L`, step: 'defense' as StepKey },
      ],
    },
    perfusion: {
      label: 'Pressão → membrana',
      values: [
        { scale: 'Organismo', label: 'PAM', value: `${physiology.cardiovascular.meanArterialPressure.toFixed(0)} mmHg`, step: 'vitals' as StepKey },
        { scale: 'Tecido', label: 'Perfusão relativa', value: `${cellular.tissue.perfusionPercent.toFixed(0)}%`, step: 'tissue' as StepKey },
        { scale: 'Célula', label: 'Potencial de membrana', value: `${cellular.cell.membranePotentialMv.toFixed(0)} mV`, step: 'defense' as StepKey },
      ],
    },
    glucose: {
      label: 'Glicose → redox',
      values: [
        { scale: 'Organismo', label: 'Glicemia', value: `${physiology.nutrients.bloodGlucose.toFixed(0)} mg/dL`, step: 'vitals' as StepKey },
        { scale: 'Tecido', label: 'Glicose intersticial', value: `${cellular.tissue.glucoseMmolL.toFixed(1)} mmol/L`, step: 'tissue' as StepKey },
        { scale: 'Célula', label: 'NADH', value: `${cellular.cell.nadhPercent.toFixed(0)}%`, step: 'defense' as StepKey },
      ],
    },
  } satisfies Record<ComparisonId, { label: string; values: Array<{ scale: string; label: string; value: string; step: StepKey }> }>;

  const requestInvestigation = () => {
    setInvestigationOpen(value => !value);
    if (!investigationOpen) setInvestigationRequests(value => value + 1);
  };

  return <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-36 lg:px-6">
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <PanelLabel icon={<Activity className="size-4"/>}>Escala 1 · Organismo</PanelLabel>
          <h1 className="mt-1.5 text-xl font-medium text-foreground">Monitor clínico do organismo</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Comece pelo risco imediato e solicite exames somente quando eles ajudarem a explicar o mecanismo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SummaryChip label="Estado primário" value={primaryStable ? 'Estável' : 'Requer atenção'} good={primaryStable}/>
          <SummaryChip label="Risco arrítmico" value={`${physiology.cardiovascular.arrhythmiaRisk.toFixed(0)}%`} good={physiology.cardiovascular.arrhythmiaRisk < 35}/>
          <SummaryChip label="Alertas" value={String(warnings.length)} good={warnings.length === 0}/>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,.72fr)]">
        <GlassPanel className={cn('overflow-visible p-4', focus === 'vitals' && 'ring-1 ring-primary/40')}>
          <div className="flex items-start justify-between gap-3">
            <div><PanelLabel icon={<Heart className="size-4"/>}>Avaliação primária</PanelLabel><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Ritmo, pressão, oxigenação, temperatura e perfusão — antes de qualquer exame complementar.</p></div>
            <HelpTip title="Ordem de leitura" align="right"><p>Ritmo/FC → pressão/PAM → SpO₂/FR → temperatura → perfusão relativa. O traçado abaixo é sintético e educacional.</p></HelpTip>
          </div>
          <div className="gold-line my-3 h-px"/>
          <CardiacRhythmInline bpm={physiology.cardiovascular.heartRate} bpmHistory={history.heartRate} rhythm={physiology.cardiovascular.rhythm} variabilityMs={physiology.cardiovascular.heartRateVariability}/>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4">
            <PrimaryMetric label="Pressão arterial" value={`${physiology.cardiovascular.systolicBP.toFixed(0)}/${physiology.cardiovascular.diastolicBP.toFixed(0)}`} unit="mmHg" secondary={`PAM ${physiology.cardiovascular.meanArterialPressure.toFixed(0)} mmHg`} good={physiology.cardiovascular.meanArterialPressure >= 70 && physiology.cardiovascular.meanArterialPressure <= 105}/>
            <PrimaryMetric label="Oxigenação e ventilação" value={physiology.respiratory.spo2.toFixed(1)} unit="%" secondary={`FR ${physiology.respiratory.respiratoryRate.toFixed(1)} resp/min`} good={physiology.respiratory.spo2 >= 95 && physiology.respiratory.respiratoryRate >= 12 && physiology.respiratory.respiratoryRate <= 20}/>
            <PrimaryMetric label="Temperatura central" value={physiology.bodyTemperature.toFixed(1)} unit="°C" secondary="Faixa 36,1–37,2 °C" good={physiology.bodyTemperature >= 36.1 && physiology.bodyTemperature <= 37.2}/>
            <PrimaryMetric label="Perfusão sistêmica relativa" value={physiology.cardiovascular.perfusionIndex.toFixed(0)} unit="% basal" secondary={`Débito ${physiology.cardiovascular.cardiacOutput.toFixed(1)} L/min`} good={physiology.cardiovascular.perfusionIndex >= 70}/>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-start justify-between gap-3"><div><PanelLabel icon={<AlertTriangle className="size-4"/>}>Até 3 prioridades</PanelLabel><p className="mt-1 text-[11px] text-muted-foreground">O restante permanece acessível sem competir com o risco imediato.</p></div><span className={cn('rounded-full border px-2 py-1 font-mono text-[11px]', warnings.length ? 'border-warning/30 bg-warning/5 text-warning' : 'border-good/30 bg-good/5 text-good')}>{warnings.length}</span></div>
          <div className="gold-line my-3 h-px"/>
          <div className="space-y-2">
            {primaryWarnings.length === 0 ? <div className="rounded-lg border border-good/30 bg-good/5 p-3 text-xs leading-relaxed text-good">Nenhum alerta prioritário. Os parâmetros imediatos permanecem em faixa segura.</div> : primaryWarnings.map(warning => <button type="button" key={warning.parameter} onClick={() => warning.navigationTarget && onNavigate?.(warning.navigationTarget)} className="w-full rounded-lg border border-warning/30 bg-warning/5 p-3 text-left transition hover:border-warning/60 disabled:cursor-default" disabled={!warning.navigationTarget || !onNavigate}>
              <div className="flex items-center justify-between gap-2"><strong className="text-xs font-medium text-warning">{warning.parameter}</strong><span className="font-mono text-xs text-foreground">{warning.currentValue.toFixed(2)}</span></div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{warning.recommendation}</p>
            </button>)}
            {warnings.length > 3 && <p className="text-[11px] text-muted-foreground">+ {warnings.length - 3} alteração(ões) disponível(is) na investigação.</p>}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><PanelLabel icon={<GitCompareArrows className="size-4"/>}>Comparar escalas</PanelLabel><p className="mt-1 text-xs text-muted-foreground">Fixe uma cadeia causal e navegue do sinal sistêmico até a consequência celular.</p></div>
          <div className="flex flex-wrap gap-2">{(Object.keys(comparisons) as ComparisonId[]).map(id => <button key={id} type="button" onClick={() => setComparison(id)} className={cn('min-h-10 rounded-lg border px-3 text-xs transition', comparison === id ? 'border-primary/60 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground hover:text-foreground')}>{comparisons[id].label}</button>)}</div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{comparisons[comparison].values.map((item, index) => <button key={item.scale} type="button" onClick={() => onNavigate?.(item.step)} className="relative rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-primary/50">
          <span className="text-[11px] uppercase tracking-wider text-primary">{index + 1}. {item.scale}</span><strong className="mt-1 block text-sm text-foreground">{item.label}</strong><span className="mt-2 block font-mono text-lg text-foreground">{item.value}</span>
        </button>)}</div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><PanelLabel icon={<FlaskConical className="size-4"/>}>Investigar</PanelLabel><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Gasometria, eletrólitos, metabolismo e rim exigem uma solicitação explícita; não surgem como números mágicos.</p></div>
          <button type="button" aria-expanded={investigationOpen} onClick={requestInvestigation} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/35 bg-primary/5 px-4 text-xs font-medium text-primary transition hover:border-primary/70">
            {investigationOpen ? 'Recolher resultados' : 'Solicitar painel complementar'}<ChevronDown className={cn('size-4 transition', investigationOpen && 'rotate-180')}/>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Solicitações nesta sessão: {investigationRequests}</p>

        {investigationOpen && <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
          <section className={cn('rounded-xl border p-3.5', physiology.acidBase.mixedDisorder ? 'border-warning/35 bg-warning/5' : 'border-primary/20 bg-primary/[.035]')}>
            <PanelLabel icon={<Beaker className="size-4"/>}>Interpretação ácido–base</PanelLabel>
            <strong className="mt-2 block text-sm text-foreground">{physiology.acidBase.interpretation}</strong>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{physiology.acidBase.expectedCompensationLabel}{expected ? `: ${expected[0].toFixed(1)}–${expected[1].toFixed(1)}` : ''}. Excesso de base estimado: {physiology.acidBase.baseExcess.toFixed(1)} mmol/L.</p>
          </section>
          <div className="grid gap-3 xl:grid-cols-2">
            <ClinicalSection title="Gasometria e equilíbrio ácido–base" icon={<Wind className="size-4 text-primary"/>}>
              <ClinicalMetric label="pH arterial" value={physiology.acidBase.pH.toFixed(2)} current={physiology.acidBase.pH} history={history.pH} reference="7,35–7,45" good={physiology.acidBase.pH >= 7.35 && physiology.acidBase.pH <= 7.45}/>
              <ClinicalMetric label="PaO₂" value={physiology.respiratory.pao2.toFixed(0)} unit="mmHg" current={physiology.respiratory.pao2} history={history.pao2} reference="80–100 mmHg" good={physiology.respiratory.pao2 >= 80}/>
              <ClinicalMetric label="PaCO₂" value={physiology.respiratory.paco2.toFixed(0)} unit="mmHg" current={physiology.respiratory.paco2} history={history.paco2} reference="35–45 mmHg" good={physiology.respiratory.paco2 >= 35 && physiology.respiratory.paco2 <= 45}/>
              <ClinicalMetric label="Bicarbonato" value={physiology.acidBase.bicarbonate.toFixed(1)} unit="mmol/L" current={physiology.acidBase.bicarbonate} history={history.bicarbonate} reference="22–26 mmol/L" good={physiology.acidBase.bicarbonate >= 22 && physiology.acidBase.bicarbonate <= 26}/>
              <ClinicalMetric label="Ânion gap corrigido" value={physiology.acidBase.correctedAnionGap.toFixed(1)} unit="mmol/L" current={physiology.acidBase.correctedAnionGap} reference="8–16 mmol/L" good={physiology.acidBase.correctedAnionGap >= 8 && physiology.acidBase.correctedAnionGap <= 16}/>
              <ClinicalMetric label="Delta ratio" value={physiology.acidBase.deltaRatio?.toFixed(2) ?? '—'} current={physiology.acidBase.deltaRatio ?? 1} reference="aplicável na acidose com AG alto" good={!physiology.acidBase.mixedDisorder}/>
            </ClinicalSection>

            <ClinicalSection title="Eletrólitos, transporte e metabolismo" icon={<Beaker className="size-4 text-primary"/>}>
              <ClinicalMetric label="Cloreto" value={physiology.nutrients.chloride.toFixed(0)} unit="mmol/L" current={physiology.nutrients.chloride} reference="98–106 mmol/L" good={physiology.nutrients.chloride >= 98 && physiology.nutrients.chloride <= 106}/>
              <ClinicalMetric label="Albumina" value={physiology.nutrients.albumin.toFixed(1)} unit="g/dL" current={physiology.nutrients.albumin} reference="3,5–5,0 g/dL" good={physiology.nutrients.albumin >= 3.5}/>
              <ClinicalMetric label="Sódio / potássio" value={`${physiology.nutrients.sodium.toFixed(0)} / ${physiology.nutrients.potassium.toFixed(1)}`} unit="mmol/L" current={physiology.nutrients.sodium} reference="Na 135–145; K 3,5–5,0" good={physiology.nutrients.sodium >= 135 && physiology.nutrients.sodium <= 145 && physiology.nutrients.potassium >= 3.5 && physiology.nutrients.potassium <= 5}/>
              <ClinicalMetric label="Ca / P / Mg" value={`${physiology.nutrients.calcium.toFixed(1)} / ${physiology.nutrients.phosphate.toFixed(1)} / ${physiology.nutrients.magnesium.toFixed(1)}`} unit="mg/dL" current={physiology.nutrients.calcium} reference="Ca 8,5–10,5; P 2,5–4,5; Mg 1,7–2,2" good={physiology.nutrients.calcium >= 8.5 && physiology.nutrients.calcium <= 10.5}/>
              <ClinicalMetric label="Hemoglobina / hematócrito" value={`${physiology.nutrients.hemoglobin.toFixed(1)} / ${physiology.nutrients.hematocrit.toFixed(0)}`} unit="g/dL · %" current={physiology.nutrients.hemoglobin} reference="modelo basal 14 g/dL · 42%" good={physiology.nutrients.hemoglobin >= 12}/>
              <ClinicalMetric label="Glicose / lactato" value={`${physiology.nutrients.bloodGlucose.toFixed(0)} / ${physiology.energy.lactateLevel.toFixed(1)}`} unit="mg/dL · mmol/L" current={physiology.nutrients.bloodGlucose} reference="glicose 70–100; lactato ≤2" good={physiology.nutrients.bloodGlucose >= 70 && physiology.nutrients.bloodGlucose <= 100 && physiology.energy.lactateLevel <= 2}/>
            </ClinicalSection>

            <ClinicalSection title="Néfron e controle de volume" icon={<Droplets className="size-4 text-primary"/>}>
              <ClinicalMetric label="TFG / fluxo renal" value={`${physiology.renal.gfr.toFixed(0)} / ${physiology.renal.renalBloodFlow.toFixed(0)}`} unit="mL/min" current={physiology.renal.gfr} reference="TFG 90–140; fluxo ~1100" good={physiology.renal.gfr >= 90}/>
              <ClinicalMetric label="Reabsorção proximal obrigatória" value={physiology.renal.proximalReabsorption.toFixed(1)} unit="% filtrado" current={physiology.renal.proximalReabsorption} reference="aprox. 65%"/>
              <ClinicalMetric label="Na⁺ distal por aldosterona" value={physiology.renal.distalSodiumReabsorption.toFixed(1)} unit="% filtrado" current={physiology.renal.distalSodiumReabsorption} reference="componente regulável"/>
              <ClinicalMetric label="Água livre por ADH" value={physiology.renal.freeWaterReabsorption.toFixed(0)} unit="% do máximo distal" current={physiology.renal.freeWaterReabsorption} reference="ducto coletor/AQP2"/>
              <ClinicalMetric label="Urina" value={`${physiology.renal.urineFlow.toFixed(2)} · ${physiology.renal.urineOsmolality.toFixed(0)}`} unit="mL/min · mOsm/kg" current={physiology.renal.urineFlow} reference="fluxo e concentração variam com ADH"/>
              <ClinicalMetric label="Renina → Ang II → aldosterona" value={`${physiology.renal.reninActivity.toFixed(0)} → ${physiology.renal.angiotensinIIActivity.toFixed(0)} → ${physiology.renal.aldosteroneActivity.toFixed(0)}`} unit="%" current={physiology.renal.raasActivity} reference={`ANP ${physiology.renal.anpActivity.toFixed(0)}% contrarregula`} />
            </ClinicalSection>

            <ClinicalSection title="Eixos endógenos" icon={<BrainCircuit className="size-4 text-primary"/>}>
              <ClinicalMetric label="CRH → ACTH → cortisol" value={`${(physiology.endocrine.crhDrive * 100).toFixed(0)} → ${(physiology.endocrine.acthDrive * 100).toFixed(0)} → ${physiology.hormones.cortisol.toFixed(1)}`} unit="% · % · μg/dL" current={physiology.hormones.cortisol} reference="eixo HPA com feedback"/>
              <ClinicalMetric label="TSH → T4 → T3" value={`${physiology.hormones.tsh.toFixed(1)} → ${physiology.hormones.t4.toFixed(1)} → ${physiology.hormones.t3.toFixed(0)}`} unit="μIU/mL · μg/dL · ng/dL" current={physiology.hormones.t3} reference="eixo tireoidiano com feedback"/>
              <ClinicalMetric label="Grelina / leptina / adiponectina" value={`${physiology.hormones.ghrelin.toFixed(0)} / ${physiology.hormones.leptin.toFixed(1)} / ${physiology.hormones.adiponectin.toFixed(1)}`} unit="pg/mL · ng/mL · μg/mL" current={physiology.hormones.leptin} reference="fome, reserva adiposa e sensibilidade metabólica"/>
              <ClinicalMetric label="NPY/AgRP / POMC/CART" value={`${(physiology.endocrine.orexigenicDrive * 100).toFixed(0)} / ${(physiology.endocrine.anorexigenicDrive * 100).toFixed(0)}`} unit="%" current={physiology.endocrine.orexigenicDrive * 100} reference="drive orexígeno / anorexígeno"/>
              <ClinicalMetric label="PTH / calcitriol" value={`${physiology.renal.pthActivity.toFixed(0)} / ${physiology.renal.calcitriolActivity.toFixed(0)}`} unit="%" current={physiology.renal.pthActivity} reference="cálcio, fosfato e função renal"/>
              <ClinicalMetric label="EPO renal" value={physiology.renal.epoActivity.toFixed(0)} unit="%" current={physiology.renal.epoActivity} reference="resposta lenta à capacidade de transporte"/>
              <ClinicalMetric label="Barorreflexo" value={physiology.cardiovascular.baroreflexActivity.toFixed(0)} unit="%" current={physiology.cardiovascular.baroreflexActivity} reference="negativo vagal; positivo simpático" good={Math.abs(physiology.cardiovascular.baroreflexActivity) < 50}/>
            </ClinicalSection>
          </div>
        </div>}
      </GlassPanel>

      <GlassPanel className="p-4">
        <div><PanelLabel icon={<BrainCircuit className="size-4"/>}>Respostas endógenas e intervenções</PanelLabel><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Os reflexos são estados observáveis; água e sinalização permanecem separadas na escala correspondente.</p></div>
        <div className="gold-line my-3 h-px"/>
        <div className="grid gap-3 lg:grid-cols-3">
          <section className="rounded-xl border border-primary/20 bg-primary/[.035] p-3.5"><span className="text-[11px] uppercase tracking-wider text-primary">Resposta endógena</span><strong className="mt-2 block text-sm">Barorreflexo e controle autonômico</strong><p className="mt-1 text-xs text-muted-foreground">Barorreflexo {physiology.cardiovascular.baroreflexActivity.toFixed(0)}% · risco arrítmico {physiology.cardiovascular.arrhythmiaRisk.toFixed(0)}%.</p></section>
          <section className="rounded-xl border border-primary/20 bg-primary/[.035] p-3.5"><span className="text-[11px] uppercase tracking-wider text-primary">Resposta endógena</span><strong className="mt-2 block text-sm">Controle renal de água</strong><p className="mt-1 text-xs text-muted-foreground">ADH {physiology.renal.adhActivity.toFixed(0)}% · ANP {physiology.renal.anpActivity.toFixed(0)}% · urina {physiology.renal.urineFlow.toFixed(2)} mL/min.</p></section>
          <section className="rounded-xl border border-warning/25 bg-warning/[.035] p-3.5"><span className="text-[11px] uppercase tracking-wider text-warning">Intervenção clínica</span><strong className="mt-2 block text-sm">Reposição hídrica oral</strong><p className="mt-1 text-xs text-muted-foreground">{interventions.pendingWaterMl.toFixed(0)} mL ainda em absorção gastrointestinal.</p><div className="mt-3 grid grid-cols-2 gap-2"><ActionButton onClick={() => ingestWater(250)} disabled={interventions.pendingWaterMl >= 2000}>+250 mL</ActionButton><ActionButton onClick={() => ingestWater(500)} disabled={interventions.pendingWaterMl >= 2000}>+500 mL</ActionButton></div></section>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <PanelLabel icon={<ScrollText className="size-4"/>}>Linha do tempo clínica</PanelLabel>
        <div className="gold-line my-3 h-px"/>
        <ol className="space-y-3">{events.slice(0, 8).map((event, index) => <li key={`${event.timestamp}-${index}`} className="border-l border-primary/30 pl-3"><div className="flex justify-between gap-3"><strong className={cn('text-xs font-medium', event.severity === 'critical' ? 'text-danger' : event.severity === 'warning' ? 'text-warning' : 'text-primary')}>{event.type}</strong><span className="font-mono text-[11px] text-muted-foreground">{formatEventTime(event.timestamp)}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.message}</p></li>)}</ol>
      </GlassPanel>
    </div>
  </div>;
}
