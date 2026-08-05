import { useMemo } from 'react';
import { BrainCircuit, CheckCircle2, Clock3, Sparkles, TriangleAlert, Zap } from 'lucide-react';
import { computeOpportunityQuality } from '../../game/adaptationWindow';
import { useSimulationStore } from '../../game/simulationStore';
import { GlassPanel, PanelLabel, ProgressBar, cn } from './ui';

const REWARD_LABELS = {
  knowledge: 'Conhecimento fisiológico',
  adaptation: 'Progresso adaptativo',
  multiplier: 'Multiplicador temporário',
  'case-variant': 'Variante clínica',
  'visual-effect': 'Efeito visual raro',
  none: 'Sem recompensa',
} as const;

export function AdaptationOpportunityLayer() {
  const physiology = useSimulationStore(state => state.physiology);
  const cellular = useSimulationStore(state => state.cellular);
  const opportunity = useSimulationStore(state => state.adaptationOpportunity);
  const progress = useSimulationStore(state => state.adaptationProgress);
  const episodes = useSimulationStore(state => state.iatrogenicEpisodes);
  const scenarioResponse = useSimulationStore(state => state.scenarioResponse);
  const resolve = useSimulationStore(state => state.resolveAdaptationOpportunity);

  const iatrogenicBurden = useMemo(() => Math.min(1, episodes.reduce((sum, episode) => {
    const weight = episode.severity === 'critical' ? 1 : episode.severity === 'severe' ? .72 : .45;
    return sum + episode.intensity * weight;
  }, 0)), [episodes]);
  const quality = computeOpportunityQuality(physiology, cellular, iatrogenicBurden);
  const scenarioActive = Boolean(cellular.routine || scenarioResponse);
  const freshReward = progress.lastReward
    && physiology.timeElapsed - progress.lastReward.timestamp <= 9
    && !scenarioActive
    ? progress.lastReward
    : null;
  const anticipation = !opportunity
    && !freshReward
    && !scenarioActive
    && quality >= .7
    && progress.nextOpportunityAt - cellular.simulationTime <= 18;

  return (
    <>
      {progress.activeVisualEffect && (
        <div
          className="pointer-events-none fixed inset-0 z-[31] overflow-hidden motion-reduce:hidden"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-[42%] h-[52vmin] w-[52vmin] -translate-x-1/2 -translate-y-1/2 animate-[pulse_2.8s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(217,180,95,.14),rgba(88,189,208,.055)_42%,transparent_72%)] blur-xl" />
          <div className="absolute inset-x-[18%] top-[22%] h-px animate-[pulse_3.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        </div>
      )}

      {opportunity && (
        <aside
          aria-label="Janela de adaptação fisiológica"
          aria-live="assertive"
          className="fixed inset-x-3 top-[68px] z-[46] mx-auto w-auto max-w-2xl sm:top-[72px]"
        >
          <GlassPanel className="overflow-hidden border-primary/45 bg-background/[.92] shadow-[0_18px_70px_rgba(0,0,0,.55),0_0_36px_rgba(217,180,95,.12)] backdrop-blur-xl">
            <header className="flex items-start gap-3 border-b border-primary/15 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_18px_rgba(217,180,95,.16)]">
                <Sparkles className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <PanelLabel icon={<Zap className="size-3.5" />}>Janela de adaptação</PanelLabel>
                  <span className="font-mono text-[10px] text-warning"><Clock3 className="mr-1 inline size-3" />{opportunity.remainingSeconds.toFixed(1)} s</span>
                </div>
                <h2 className="mt-1 font-display text-base text-foreground sm:text-lg">{opportunity.title}</h2>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{opportunity.clue}</p>
              </div>
            </header>

            <div className="p-3 sm:p-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[8px] uppercase tracking-[.15em] text-muted-foreground">
                  <span>Alteração transitória</span>
                  <span className="text-warning">o relógio continua</span>
                </div>
                <ProgressBar value={opportunity.remainingSeconds / opportunity.totalSeconds * 100} color="var(--warning)" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {opportunity.indicators.map(indicator => (
                  <div key={indicator.label} className="rounded-lg border border-white/8 bg-black/20 px-2 py-2 text-center">
                    <span className="block truncate text-[7px] uppercase tracking-wider text-muted-foreground">{indicator.label}</span>
                    <strong className={cn('mt-1 block truncate font-mono text-[10px]', indicator.tone === 'danger' ? 'text-danger' : indicator.tone === 'warning' ? 'text-warning' : 'text-primary')}>{indicator.value}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-cyan/20 bg-cyan/[.05] px-3 py-2">
                <PanelLabel icon={<BrainCircuit className="size-3.5" />}>Interprete o mecanismo</PanelLabel>
                <p className="mt-1.5 text-[10px] leading-relaxed text-foreground/80">{opportunity.mechanismQuestion}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {opportunity.choices.map(choice => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => resolve(choice.id)}
                    className="min-h-[68px] rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  >
                    <strong className="block text-[10px] text-foreground">{choice.label}</strong>
                    <span className="mt-1 block text-[8px] leading-relaxed text-muted-foreground">{choice.description}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2 text-[8px] uppercase tracking-wider text-muted-foreground">
                <span>Qualidade da janela: <strong className="text-primary">{Math.round(opportunity.quality * 100)}%</strong></span>
                <span>Conhecimento: <strong className="text-foreground">{progress.physiologicalKnowledge}</strong>{progress.knowledgeMultiplier > 1 ? ` · ×${progress.knowledgeMultiplier.toFixed(2)}` : ''}</span>
              </div>
            </div>
          </GlassPanel>
        </aside>
      )}

      {freshReward && !opportunity && (
        <aside aria-live="polite" className="pointer-events-none fixed inset-x-3 top-[72px] z-[44] mx-auto max-w-lg">
          <GlassPanel className={cn('border px-4 py-3 shadow-[0_14px_50px_rgba(0,0,0,.45)] backdrop-blur-xl', freshReward.outcome === 'harmful' || freshReward.outcome === 'missed' ? 'border-warning/35' : 'border-good/35')}>
            <div className="flex items-start gap-3">
              {freshReward.outcome === 'harmful' || freshReward.outcome === 'missed'
                ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />}
              <div>
                <PanelLabel>{freshReward.title}</PanelLabel>
                <p className="mt-1 text-[10px] leading-relaxed text-foreground/75">{freshReward.detail}</p>
                <span className="mt-1.5 block text-[8px] uppercase tracking-wider text-primary">{REWARD_LABELS[freshReward.type]}</span>
              </div>
            </div>
          </GlassPanel>
        </aside>
      )}

      {anticipation && (
        <div className="pointer-events-none fixed left-1/2 top-[72px] z-[42] -translate-x-1/2 rounded-full border border-primary/20 bg-background/75 px-3 py-1.5 text-[8px] uppercase tracking-[.14em] text-primary/80 shadow-lg backdrop-blur-md" aria-live="polite">
          <Sparkles className="mr-1.5 inline size-3" />A estabilidade favorece uma janela adaptativa
        </div>
      )}
    </>
  );
}
