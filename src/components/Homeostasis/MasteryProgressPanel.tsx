import { Award, Bot, BrainCircuit, CheckCircle2, LockKeyhole, RefreshCcw } from 'lucide-react';
import { useState } from 'react';
import {
  averageClinicalScores,
  canPrestige,
  DOMAIN_LABELS,
  getDomainMilestoneMultiplier,
  PHENOTYPE_LABELS,
  type MasteryDomain,
  type PhenotypeId,
} from '../../game/mastery';
import { useSimulationStore } from '../../game/simulationStore';
import { PanelLabel, ProgressBar, cn } from './ui';

const levelThresholds = [0, 60, 160, 320, 560];
const domains = Object.keys(DOMAIN_LABELS) as MasteryDomain[];
const phenotypes = Object.keys(PHENOTYPE_LABELS) as PhenotypeId[];

const scoreLabels: Record<keyof ReturnType<typeof averageClinicalScores>, string> = {
  hypothesis: 'Coerência fisiológica',
  prediction: 'Trajetória favorável',
  stability: 'Estabilidade',
  responseTime: 'Tempo clínico',
  parsimony: 'Intervenções essenciais',
  iatrogenicSafety: 'Segurança iatrogênica',
};

export function MasteryProgressPanel({ onPrestige }: { onPrestige?: () => void }) {
  const progress = useSimulationStore(state => state.masteryProgress);
  const prestige = useSimulationStore(state => state.prestigeToPhenotype);
  const [feedback, setFeedback] = useState<string | null>(null);
  const scores = averageClinicalScores(progress);
  const eligibleForPrestige = canPrestige(progress);

  const startPhenotype = (phenotype: PhenotypeId) => {
    const result = prestige(phenotype);
    if (!result.ok) {
      setFeedback(result.reason ?? 'Este fenótipo ainda não está disponível.');
      return;
    }
    setFeedback(`Novo organismo: ${PHENOTYPE_LABELS[phenotype]}.`);
    onPrestige?.();
  };

  return <section className="mt-5 space-y-4" aria-labelledby="mastery-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <PanelLabel icon={<BrainCircuit className="size-4"/>}>Progressão persistente</PanelLabel>
        <h3 id="mastery-title" className="mt-1.5 font-display text-lg text-foreground">Mapa de domínio fisiológico</h3>
      </div>
      <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] text-primary">
        {progress.clinicalScores.cases} casos · {progress.completedOrganisms} organismos completos
      </span>
    </div>

    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {domains.map(domain => {
        const mastery = progress.domains[domain];
        const currentThreshold = levelThresholds[Math.min(mastery.level, levelThresholds.length - 1)];
        const nextThreshold = levelThresholds[Math.min(mastery.level + 1, levelThresholds.length - 1)];
        const levelProgress = mastery.level >= levelThresholds.length - 1
          ? 100
          : (mastery.xp - currentThreshold) / Math.max(1, nextThreshold - currentThreshold) * 100;
        const managerUnlocked = progress.unlockedAutomations.includes(`${domain}-manager`);
        return <article key={domain} className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-xs text-foreground">{DOMAIN_LABELS[domain]}</strong>
            <span className="font-mono text-[11px] text-primary">Nv.{mastery.level}</span>
          </div>
          <div className="mt-2"><ProgressBar value={levelProgress}/></div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{mastery.xp} XP · {mastery.demonstratedScenarios.length} casos · ×{getDomainMilestoneMultiplier(progress, domain).toFixed(2)}</span>
            <span className={cn('inline-flex items-center gap-1', managerUnlocked ? 'text-good' : '')}>
              {managerUnlocked ? <Bot className="size-3"/> : <LockKeyhole className="size-3"/>}
              {managerUnlocked ? 'automatizado' : '2 casos + Nv.2'}
            </span>
          </div>
        </article>;
      })}
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-xl border border-white/10 bg-black/25 p-3">
        <PanelLabel icon={<Award className="size-4"/>}>Pontuação clínica média</PanelLabel>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(scores) as Array<[keyof typeof scores, number]>).map(([key, score]) => <div key={key} className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-2">
            <span className="block text-[11px] leading-tight text-muted-foreground">{scoreLabels[key]}</span>
            <strong className={cn('mt-1 block font-mono text-base', score >= 75 ? 'text-good' : score >= 50 ? 'text-warning' : 'text-danger')}>{Math.round(score)}</strong>
          </div>)}
        </div>
      </article>

      <article className="rounded-xl border border-white/10 bg-black/25 p-3">
        <PanelLabel>Mecanismos demonstrados</PanelLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {progress.mechanismCards.length
            ? progress.mechanismCards.map(card => <span key={card} className="rounded-full border border-good/25 bg-good/[.08] px-2.5 py-1.5 text-[11px] text-good"><CheckCircle2 className="mr-1 inline size-3"/>{card}</span>)
            : <p className="text-xs leading-relaxed text-muted-foreground">Conduza uma recuperação estável para adicionar o mecanismo à coleção.</p>}
        </div>
      </article>
    </div>

    <article className="rounded-xl border border-primary/20 bg-primary/[.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><PanelLabel icon={<RefreshCcw className="size-4"/>}>Prestígio fisiológico</PanelLabel><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Comece outro fenótipo preservando domínio e mecanismos, sem transportar reservas biológicas irreais.</p></div>
        <span className={cn('rounded-full border px-2.5 py-1 text-[11px]', eligibleForPrestige ? 'border-good/30 bg-good/10 text-good' : 'border-white/10 text-muted-foreground')}>{eligibleForPrestige ? 'Novo organismo disponível' : 'Exige 12 casos e Nv.2 em todos os domínios'}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {phenotypes.map(phenotype => {
          const unlocked = progress.unlockedPhenotypes.includes(phenotype);
          const active = progress.activePhenotype === phenotype;
          const canStart = eligibleForPrestige && unlocked && !active;
          return <button key={phenotype} type="button" disabled={!canStart} onClick={() => startPhenotype(phenotype)} className={cn('min-h-14 rounded-lg border px-2 py-2 text-left text-[11px] transition', active ? 'border-primary/45 bg-primary/15 text-primary' : canStart ? 'border-good/30 bg-good/[.06] text-foreground hover:bg-good/10' : 'cursor-not-allowed border-white/8 bg-black/20 text-muted-foreground opacity-65')}>
            <span className="block font-medium">{PHENOTYPE_LABELS[phenotype]}</span>
            <span className="mt-1 block text-[11px]">{active ? 'ativo' : unlocked ? eligibleForPrestige ? 'iniciar' : 'aguarda conclusão' : 'bloqueado'}</span>
          </button>;
        })}
      </div>
      {feedback && <p className="mt-3 text-xs text-warning" role="status">{feedback}</p>}
    </article>
  </section>;
}
