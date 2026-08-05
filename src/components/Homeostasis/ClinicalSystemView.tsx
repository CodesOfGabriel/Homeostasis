import { type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Droplets,
  FlaskConical,
  Gauge,
  Heart,
  Minus,
  ScrollText,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { useSimulationStore } from '../../game/simulationStore';
import { getSimulationCalendar } from '../../game/simulationCalendar';
import { CardiacRhythmInline } from './CardiacMonitorCard';
import type { StepKey } from './navigation';
import { ActionButton, GlassPanel, HelpTip, PanelLabel, Sparkline, cn } from './ui';

type TrendDirection = 'up' | 'down' | 'stable';

function formatEventTime(seconds: number) {
  const calendar = getSimulationCalendar(seconds);
  return `Dia ${calendar.day} · ${calendar.clock}`;
}

function getTrend(history: number[], current: number, epsilon = .01): TrendDirection {
  const values = [...history, current];
  if (values.length < 2) return 'stable';
  const previous = values[Math.max(0, values.length - 6)];
  const delta = current - previous;
  if (Math.abs(delta) <= epsilon) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

function TrendBadge({ direction }: { direction: TrendDirection }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const label = direction === 'up' ? 'Aumentando' : direction === 'down' ? 'Diminuindo' : 'Estável';
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-medium uppercase tracking-wide',
      direction === 'up' && 'border-primary/25 bg-primary/5 text-primary',
      direction === 'down' && 'border-[#8aa5d5]/25 bg-[#8aa5d5]/5 text-[#9eb5df]',
      direction === 'stable' && 'border-white/10 bg-white/[.025] text-muted-foreground',
    )}>
      <Icon className="size-3"/>{label}
    </span>
  );
}

function ClinicalMetric({ label, value, unit, good = true, history, current, reference, color = 'var(--teal)', epsilon }: {
  label: string;
  value: string;
  unit?: string;
  good?: boolean;
  history: number[];
  current: number;
  reference: string;
  color?: string;
  epsilon?: number;
}) {
  const trend = getTrend(history, current, epsilon);
  const series = [...history, current].slice(-40);
  return (
    <article className="min-w-0 rounded-xl border border-white/8 bg-black/15 p-3.5">
      <div className="flex min-h-8 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', good ? 'bg-good shadow-[0_0_6px_var(--good)]' : 'bg-warning shadow-[0_0_6px_var(--warning)]')}/>
          <span className="text-[10px] font-medium leading-snug text-foreground/85">{label}</span>
        </div>
        <TrendBadge direction={trend}/>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <strong className="font-mono text-lg font-medium tabular-nums text-foreground">{value}</strong>
        {unit && <span className="text-[9px] text-muted-foreground">{unit}</span>}
      </div>
      <p className="mt-1 text-[8px] leading-relaxed text-muted-foreground">Referência: {reference}</p>
      <div className="mt-2 opacity-75"><Sparkline data={series} color={good ? color : 'var(--warning)'} height={18}/></div>
    </article>
  );
}

function ClinicalSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/8 bg-black/10 p-3.5">
      <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">{icon}<h3>{title}</h3></div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SummaryChip({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/15 px-3 py-2">
      <span className={cn('size-1.5 rounded-full', good ? 'bg-good' : 'bg-warning')}/>
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <strong className="font-mono text-[9px] font-medium text-foreground">{value}</strong>
    </div>
  );
}

export function ClinicalSystemView({ focus, onNavigate }: { focus?: 'vitals'; onNavigate?: (target: StepKey) => void }) {
  const physiology = useSimulationStore(state => state.physiology);
  const history = useSimulationStore(state => state.history);
  const interventions = useSimulationStore(state => state.interventions);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const events = useSimulationStore(state => state.recentEvents);
  const ingestWater = useSimulationStore(state => state.ingestWater);

  const primaryStable = physiology.cardiovascular.meanArterialPressure >= 70
    && physiology.cardiovascular.meanArterialPressure <= 105
    && physiology.respiratory.spo2 >= 95
    && physiology.respiratory.respiratoryRate >= 12
    && physiology.respiratory.respiratoryRate <= 20;

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-32 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <PanelLabel icon={<Activity className="size-4"/>}>Central de monitorização</PanelLabel>
            <h1 className="mt-1.5 text-base font-medium text-foreground">Sinais vitais e resposta sistêmica</h1>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">Leitura clínica organizada por prioridade: estabilidade cardiorrespiratória, intervenções, marcadores complementares e contexto regulatório.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SummaryChip label="Estado primário" value={primaryStable ? 'Estável' : 'Requer atenção'} good={primaryStable}/>
            <SummaryChip label="Oxigenação" value={`${physiology.respiratory.spo2.toFixed(1)}%`} good={physiology.respiratory.spo2 >= 95}/>
            <SummaryChip label="Alertas ativos" value={String(warnings.length)} good={warnings.length === 0}/>
            <SummaryChip label="Contexto" value={physiology.pathophysiology.preset === 'healthy' ? 'Saudável' : physiology.pathophysiology.preset} good={physiology.pathophysiology.preset === 'healthy'}/>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(330px,.72fr)]">
          <GlassPanel className={cn('overflow-visible p-4', focus === 'vitals' && 'ring-1 ring-primary/40')}>
            <div className="flex items-start justify-between gap-3">
              <div><PanelLabel icon={<Heart className="size-4"/>}>Avaliação primária</PanelLabel><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Ritmo, pressão, oxigenação e perfusão — os primeiros parâmetros para decidir se é necessário intervir.</p></div>
              <HelpTip title="Ordem de leitura" align="right"><p>Comece por ritmo e frequência cardíaca, pressão arterial média, saturação de oxigênio, frequência respiratória e perfusão. Depois investigue a causa no painel complementar.</p></HelpTip>
            </div>
            <div className="gold-line my-3 h-px"/>
            <CardiacRhythmInline bpm={physiology.cardiovascular.heartRate} bpmHistory={history.heartRate} rhythm={physiology.cardiovascular.rhythm} variabilityMs={physiology.cardiovascular.heartRateVariability}/>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              <ClinicalMetric label="Pressão arterial sistólica e diastólica" value={`${physiology.cardiovascular.systolicBP.toFixed(0)} / ${physiology.cardiovascular.diastolicBP.toFixed(0)}`} unit="mmHg" current={physiology.cardiovascular.meanArterialPressure} history={history.meanArterialPressure} reference="sistólica 90–120; diastólica 60–80 mmHg" good={physiology.cardiovascular.systolicBP >= 90 && physiology.cardiovascular.systolicBP <= 120 && physiology.cardiovascular.diastolicBP >= 60 && physiology.cardiovascular.diastolicBP <= 80} epsilon={.3}/>
              <ClinicalMetric label="Pressão arterial média" value={physiology.cardiovascular.meanArterialPressure.toFixed(0)} unit="mmHg" current={physiology.cardiovascular.meanArterialPressure} history={history.meanArterialPressure} reference="70–105 mmHg" good={physiology.cardiovascular.meanArterialPressure >= 70 && physiology.cardiovascular.meanArterialPressure <= 105} epsilon={.3}/>
              <ClinicalMetric label="Saturação periférica de oxigênio" value={physiology.respiratory.spo2.toFixed(1)} unit="%" current={physiology.respiratory.spo2} history={history.spo2} reference="95–100%" good={physiology.respiratory.spo2 >= 95} epsilon={.05}/>
              <ClinicalMetric label="Frequência respiratória" value={physiology.respiratory.respiratoryRate.toFixed(1)} unit="respirações/min" current={physiology.respiratory.respiratoryRate} history={history.respiratoryRate} reference="12–20 respirações/min" good={physiology.respiratory.respiratoryRate >= 12 && physiology.respiratory.respiratoryRate <= 20} epsilon={.08}/>
              <ClinicalMetric label="Índice de perfusão periférica" value={physiology.cardiovascular.perfusionIndex.toFixed(0)} unit="%" current={physiology.cardiovascular.perfusionIndex} history={history.perfusionIndex} reference="70% ou mais" good={physiology.cardiovascular.perfusionIndex >= 70} epsilon={.2}/>
              <ClinicalMetric label="Débito cardíaco" value={physiology.cardiovascular.cardiacOutput.toFixed(1)} unit="L/min" current={physiology.cardiovascular.cardiacOutput} history={history.cardiacOutput} reference="4–8 L/min" good={physiology.cardiovascular.cardiacOutput >= 4 && physiology.cardiovascular.cardiacOutput <= 8} epsilon={.03}/>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <div className="flex items-start justify-between gap-3"><div><PanelLabel icon={<AlertTriangle className="size-4"/>}>Prioridades clínicas</PanelLabel><p className="mt-1 text-[9px] text-muted-foreground">Alterações que exigem atenção primeiro.</p></div><span className={cn('rounded-full border px-2 py-1 font-mono text-[9px]', warnings.length ? 'border-warning/30 bg-warning/5 text-warning' : 'border-good/30 bg-good/5 text-good')}>{warnings.length}</span></div>
            <div className="gold-line my-3 h-px"/>
            <div className="space-y-2">
              {warnings.length === 0 ? <div className="rounded-lg border border-good/30 bg-good/5 p-3 text-[11px] leading-relaxed text-good">Nenhum alerta crítico. Os parâmetros prioritários permanecem em faixa segura.</div> : warnings.slice(0, 7).map(warning => (
                <button
                  type="button"
                  key={warning.parameter}
                  onClick={() => warning.navigationTarget && onNavigate?.(warning.navigationTarget)}
                  className="w-full rounded-lg border border-warning/30 bg-warning/5 p-3 text-left transition hover:border-warning/60 disabled:cursor-default"
                  disabled={!warning.navigationTarget || !onNavigate}
                >
                  <div className="flex items-center justify-between gap-2"><strong className="text-[11px] font-medium text-warning">{warning.parameter}</strong><span className="font-mono text-[11px] text-foreground">{warning.currentValue.toFixed(2)}</span></div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{warning.recommendation}</p>
                  {warning.navigationTarget && <span className="mt-2 block text-[9px] uppercase tracking-wider text-primary">Ir para a escala relacionada →</span>}
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="p-4">
          <div><PanelLabel icon={<BrainCircuit className="size-4"/>}>Regulação central e suporte</PanelLabel><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Frequência cardíaca, ventilação e retenção renal são resultados. Modifique sua regulação por sinais hormonais, autonômicos, bulbares e osmóticos.</p></div>
          <div className="gold-line my-3 h-px"/>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/15 bg-primary/[.035] p-3.5">
              <div className="flex items-start justify-between gap-3"><div><span className="text-[11px] font-medium text-foreground">Reposição hídrica oral</span><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Volume ainda em absorção gastrointestinal.</p></div><Droplets className="size-4 text-primary"/></div>
              <strong className="mt-3 block font-mono text-lg font-medium text-primary">{interventions.pendingWaterMl.toFixed(0)} <small className="text-[9px] font-normal text-muted-foreground">mL pendentes</small></strong>
              <div className="mt-3 grid grid-cols-2 gap-2"><ActionButton onClick={() => ingestWater(250)} disabled={interventions.pendingWaterMl >= 2000}>Adicionar 250 mL</ActionButton><ActionButton onClick={() => ingestWater(500)} disabled={interventions.pendingWaterMl >= 2000}>Adicionar 500 mL</ActionButton></div>
            </div>
            <div className="flex flex-col rounded-xl border border-white/10 bg-black/15 p-3.5">
              <div className="flex items-start gap-2"><BrainCircuit className="mt-0.5 size-4 shrink-0 text-primary"/><div><strong className="text-[11px] text-foreground">Integração central</strong><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Use sinais autonômicos e osmóticos integrados ao hipotálamo; quimiorreflexos respiratórios são processados principalmente no tronco encefálico.</p></div></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px]"><span className="rounded-lg border border-white/8 bg-black/15 px-2 py-2">FC<br/><strong className="font-mono text-foreground">{physiology.cardiovascular.heartRate.toFixed(0)}</strong></span><span className="rounded-lg border border-white/8 bg-black/15 px-2 py-2">FR<br/><strong className="font-mono text-foreground">{physiology.respiratory.respiratoryRate.toFixed(1)}</strong></span><span className="rounded-lg border border-white/8 bg-black/15 px-2 py-2">ADH<br/><strong className="font-mono text-foreground">{physiology.renal.adhActivity.toFixed(0)}%</strong></span></div>
              <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-[9px] leading-relaxed text-primary">Abra o botão flutuante de sinalização e selecione “Regulação central”.</div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-start justify-between gap-3"><div><PanelLabel icon={<FlaskConical className="size-4"/>}>Investigação complementar</PanelLabel><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Gasometria, equilíbrio ácido-base, metabolismo e eletrólitos explicam alterações encontradas na avaliação primária.</p></div><HelpTip title="Como interpretar" align="right"><p>Use estes resultados para diferenciar causas respiratórias, metabólicas, perfusionais e hidroeletrolíticas antes de ajustar o tratamento.</p></HelpTip></div>
          <div className="gold-line my-3 h-px"/>
          <div className="grid gap-3 xl:grid-cols-2">
            <ClinicalSection title="Gasometria e equilíbrio ácido-base" icon={<Wind className="size-4 text-primary"/>}>
              <ClinicalMetric label="Acidez arterial (pH)" value={physiology.acidBase.pH.toFixed(2)} current={physiology.acidBase.pH} history={history.pH} reference="7,35–7,45" good={physiology.acidBase.pH >= 7.35 && physiology.acidBase.pH <= 7.45} epsilon={.002}/>
              <ClinicalMetric label="Pressão arterial de oxigênio (PaO₂)" value={physiology.respiratory.pao2.toFixed(0)} unit="mmHg" current={physiology.respiratory.pao2} history={history.pao2} reference="80–100 mmHg" good={physiology.respiratory.pao2 >= 80 && physiology.respiratory.pao2 <= 100} epsilon={.3}/>
              <ClinicalMetric label="Pressão arterial de dióxido de carbono (PaCO₂)" value={physiology.respiratory.paco2.toFixed(0)} unit="mmHg" current={physiology.respiratory.paco2} history={history.paco2} reference="35–45 mmHg" good={physiology.respiratory.paco2 >= 35 && physiology.respiratory.paco2 <= 45} epsilon={.2}/>
              <ClinicalMetric label="Bicarbonato arterial" value={physiology.acidBase.bicarbonate.toFixed(1)} unit="mmol/L" current={physiology.acidBase.bicarbonate} history={history.bicarbonate} reference="22–26 mmol/L" good={physiology.acidBase.bicarbonate >= 22 && physiology.acidBase.bicarbonate <= 26} epsilon={.05}/>
              <ClinicalMetric label="Excesso ou déficit de base" value={physiology.acidBase.baseExcess.toFixed(1)} unit="mmol/L" current={physiology.acidBase.baseExcess} history={history.baseExcess} reference="−2 a +2 mmol/L" good={physiology.acidBase.baseExcess >= -2 && physiology.acidBase.baseExcess <= 2} epsilon={.05}/>
              <ClinicalMetric label="Lactato sanguíneo" value={physiology.energy.lactateLevel.toFixed(1)} unit="mmol/L" current={physiology.energy.lactateLevel} history={history.lactate} reference="até 2 mmol/L" color="var(--danger)" good={physiology.energy.lactateLevel <= 2} epsilon={.03}/>
            </ClinicalSection>
            <ClinicalSection title="Metabolismo, hidratação e eletrólitos" icon={<Gauge className="size-4 text-primary"/>}>
              <ClinicalMetric label="Glicose sanguínea" value={physiology.nutrients.bloodGlucose.toFixed(0)} unit="mg/dL" current={physiology.nutrients.bloodGlucose} history={history.glucose} reference="70–100 mg/dL em jejum" good={physiology.nutrients.bloodGlucose >= 70 && physiology.nutrients.bloodGlucose <= 100} epsilon={.3}/>
              <ClinicalMetric label="Concentração de sódio" value={physiology.nutrients.sodium.toFixed(0)} unit="mmol/L" current={physiology.nutrients.sodium} history={history.sodium} reference="135–145 mmol/L" good={physiology.nutrients.sodium >= 135 && physiology.nutrients.sodium <= 145} epsilon={.08}/>
              <ClinicalMetric label="Concentração de potássio" value={physiology.nutrients.potassium.toFixed(1)} unit="mmol/L" current={physiology.nutrients.potassium} history={history.potassium} reference="3,5–5,0 mmol/L" good={physiology.nutrients.potassium >= 3.5 && physiology.nutrients.potassium <= 5} epsilon={.015}/>
              <ClinicalMetric label="Água corporal total" value={physiology.nutrients.hydration.toFixed(1)} unit="L" current={physiology.nutrients.hydration} history={history.hydration} reference="38–46 L neste modelo" good={physiology.nutrients.hydration >= 38 && physiology.nutrients.hydration <= 46} epsilon={.02}/>
              <ClinicalMetric label="Diferença de ânions não mensurados" value={physiology.acidBase.anionGap.toFixed(0)} unit="mmol/L" current={physiology.acidBase.anionGap} history={history.anionGap} reference="8–16 mmol/L" good={physiology.acidBase.anionGap >= 8 && physiology.acidBase.anionGap <= 16} epsilon={.08}/>
              <ClinicalMetric label="Déficit energético acumulado" value={physiology.energy.energyDeficit.toFixed(1)} unit="mmol" current={physiology.energy.energyDeficit} history={history.energyDeficit} reference="ideal abaixo de 10 mmol" color="var(--warning)" good={physiology.energy.energyDeficit <= 10} epsilon={.04}/>
              <ClinicalMetric label="Corpos cetônicos" value={physiology.nutrients.ketones.toFixed(1)} unit="mmol/L" current={physiology.nutrients.ketones} history={[]} reference="0,1–0,6 mmol/L" color="var(--danger)" good={physiology.nutrients.ketones <= .6} epsilon={.02}/>
              <ClinicalMetric label="Filtração glomerular estimada" value={physiology.renal.gfr.toFixed(0)} unit="mL/min" current={physiology.renal.gfr} history={[]} reference="90–140 mL/min neste modelo" good={physiology.renal.gfr >= 90} epsilon={.2}/>
              <ClinicalMetric label="Temperatura corporal central" value={physiology.bodyTemperature.toFixed(1)} unit="°C" current={physiology.bodyTemperature} history={[]} reference="36,1–37,2 °C" good={physiology.bodyTemperature >= 36.1 && physiology.bodyTemperature <= 37.2} epsilon={.02}/>
            </ClinicalSection>
          </div>
        </GlassPanel>

        <div>
          <GlassPanel className="p-4">
            <PanelLabel icon={<ScrollText className="size-4"/>}>Linha do tempo clínica</PanelLabel>
            <div className="gold-line my-3 h-px"/>
            <ol className="space-y-3">{events.slice(0, 8).map((event, index) => <li key={`${event.timestamp}-${index}`} className="border-l border-primary/30 pl-3"><div className="flex justify-between gap-3"><strong className={cn('text-[10px] font-medium', event.severity === 'critical' ? 'text-danger' : event.severity === 'warning' ? 'text-warning' : 'text-primary')}>{event.type}</strong><span className="font-mono text-[10px] text-muted-foreground">{formatEventTime(event.timestamp)}</span></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{event.message}</p></li>)}</ol>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
