import { getActionDefinition } from './actions';
import { getCellularDamageBurden } from './cellularDamage';
import type { CellularState, DecisionSignalId } from './cellularTypes';
import { getHypothalamicSignal } from './hypothalamus';
import type { PhysiologicalEvent, PhysiologyState } from './types';

export type IatrogenicSeverity = 'moderate' | 'severe' | 'critical';
export type IatrogenicMechanism =
    | 'hypoglycemia'
    | 'hyperglycemia'
    | 'adrenergic-overload'
    | 'immunosuppression'
    | 'anabolic-overload'
    | 'thermogenic-overload'
    | 'hypoperfusion'
    | 'hyperventilation'
    | 'hypoventilation'
    | 'water-retention'
    | 'water-loss'
    | 'decision-error';

export type IatrogenicSourceId = DecisionSignalId | `decision:${string}:${string}`;

export interface IatrogenicEpisode {
    id: string;
    signalId: IatrogenicSourceId;
    label: string;
    mechanism: IatrogenicMechanism;
    severity: IatrogenicSeverity;
    intensity: number;
    elapsedSeconds: number;
    remainingSeconds: number;
    totalSeconds: number;
    recurrenceCount: number;
    reason: string;
    startedAt: number;
}

interface MismatchRule {
    score: number;
    mechanism: IatrogenicMechanism;
    reason: string;
}

const SCENARIO_MISMATCHES: Record<string, Partial<Record<DecisionSignalId, MismatchRule>>> = {
    'stair-climb': {
        'hormone:release-adrenaline': { score: .62, mechanism: 'adrenergic-overload', reason: 'aumenta demanda sem corrigir a entrega de O₂' },
    },
    'meal-surge': {
        'hormone:release-glucagon': { score: .74, mechanism: 'hyperglycemia', reason: 'soma produção hepática à absorção pós-prandial' },
    },
    'morning-fast': {
        'hormone:release-insulin': { score: .86, mechanism: 'hypoglycemia', reason: 'remove glicose durante baixa oferta alimentar' },
    },
    'micro-injury': {
        'hormone:release-cortisol': { score: .58, mechanism: 'immunosuppression', reason: 'prolonga catabolismo e atrasa a fase de reparo' },
    },
    'immune-challenge': {
        'hormone:release-cortisol': { score: .9, mechanism: 'immunosuppression', reason: 'suprime contenção imune antes do controle do agente' },
    },
    'heat-dehydration': {
        'hormone:release-adrenaline': { score: .88, mechanism: 'thermogenic-overload', reason: 'eleva produção de calor e perda hídrica' },
    },
    'orthostatic-transition': {
        'central:parasympathetic-recovery': { score: .95, mechanism: 'hypoperfusion', reason: 'reduz suporte cardiovascular durante hipotensão' },
    },
    'hypercapnic-challenge': {
        'hormone:release-adrenaline': { score: .78, mechanism: 'adrenergic-overload', reason: 'eleva demanda miocárdica sem remover CO₂' },
    },
    'acute-water-load': {
        'central:adh-retention': { score: .87, mechanism: 'water-retention', reason: 'retém água em estado já hipo-osmolar' },
    },
    'nocturnal-hypoglycemia': {
        'hormone:release-insulin': { score: .98, mechanism: 'hypoglycemia', reason: 'aprofunda uma queda crítica da glicose' },
    },
    'mitochondrial-uncoupling': {
        'hormone:release-adrenaline': { score: .88, mechanism: 'thermogenic-overload', reason: 'aumenta fluxo, consumo de O₂ e calor em uma cadeia desacoplada' },
        'hormone:increase-t3': { score: .96, mechanism: 'thermogenic-overload', reason: 'amplia termogênese quando o gradiente mitocondrial já dissipa energia' },
        'hormone:boost-mtor': { score: .76, mechanism: 'anabolic-overload', reason: 'desvia ATP para síntese antes de estabilizar gradiente e controle iônico' },
    },
    'mixed-ketoacidotic-fatigue': {
        'hormone:release-cortisol': { score: .82, mechanism: 'hyperglycemia', reason: 'sustenta produção hepática de substrato durante cetogênese ativa' },
        'central:parasympathetic-recovery': { score: .58, mechanism: 'hypoperfusion', reason: 'reduz suporte sistêmico durante acidemia e desidratação' },
    },
    'distributive-dysoxia': {
        'hormone:release-cortisol': { score: .94, mechanism: 'immunosuppression', reason: 'suprime contenção imune antes do controle do foco infeccioso' },
        'central:chemoreflex-ventilation': { score: .54, mechanism: 'hyperventilation', reason: 'trata oxigenação arterial preservada sem corrigir a falha microcirculatória' },
    },
    'reperfusion-paradox': {
        'hormone:release-adrenaline': { score: .9, mechanism: 'adrenergic-overload', reason: 'acelera uma cadeia hiper-reduzida durante o pico de reperfusão' },
        'hormone:boost-mtor': { score: .86, mechanism: 'anabolic-overload', reason: 'consome ATP necessário às bombas de Ca²⁺ e à defesa redox' },
    },
    'hyperosmolar-renal-conflict': {
        'central:suppress-adh': { score: .96, mechanism: 'water-loss', reason: 'aumenta perda de água durante hipovolemia e diurese osmótica' },
        'hormone:release-glucagon': { score: .9, mechanism: 'hyperglycemia', reason: 'mantém o gradiente glicêmico que sustenta a diurese osmótica' },
    },
    'whisky-party-hepatic-overload': {
        'hormone:release-insulin': { score: .98, mechanism: 'hypoglycemia', reason: 'remove a glicose que o fígado intoxicado já não consegue repor normalmente' },
        'hormone:release-adrenaline': { score: .86, mechanism: 'adrenergic-overload', reason: 'mascara depressão metabólica elevando demanda, lactato e estresse redox' },
        'central:chemoreflex-ventilation': { score: .55, mechanism: 'hyperventilation', reason: 'aumenta trabalho respiratório sem corrigir o bloqueio redox hepático' },
    },
    'alcohol-nocturnal-hypoglycemia': {
        'hormone:release-insulin': { score: 1, mechanism: 'hypoglycemia', reason: 'aprofunda neuroglicopenia durante baixa produção hepática de glicose' },
        'hormone:release-adrenaline': { score: .88, mechanism: 'adrenergic-overload', reason: 'força despertar consumindo a glicose e o ATP ainda disponíveis' },
        'central:sympathetic-arousal': { score: .8, mechanism: 'adrenergic-overload', reason: 'aumenta demanda sem resolver simultaneamente glicose e retenção de CO₂' },
        'central:parasympathetic-recovery': { score: .52, mechanism: 'hypoperfusion', reason: 'reduz suporte circulatório enquanto cérebro e ventilação já estão deprimidos' },
    },
    'fasted-workout-free-fatty-acids': {
        'hormone:release-insulin': { score: .97, mechanism: 'hypoglycemia', reason: 'desvia glicose ao músculo quando a oferta cerebral já está ameaçada' },
        'hormone:release-adrenaline': { score: .9, mechanism: 'adrenergic-overload', reason: 'eleva lipólise e demanda acima da capacidade de oxidar AGL e O₂' },
        'central:sympathetic-arousal': { score: .84, mechanism: 'adrenergic-overload', reason: 'mantém intensidade do esforço apesar da divergência entre substrato e ATP' },
    },
    'chronic-anxiety-sedentary': {
        'hormone:release-adrenaline': { score: .96, mechanism: 'adrenergic-overload', reason: 'reforça exposição catecolaminérgica já cronicamente elevada em repouso' },
        'central:sympathetic-arousal': { score: .98, mechanism: 'adrenergic-overload', reason: 'prolonga o falso estado de emergência e a queda de HRV' },
        'hormone:release-cortisol': { score: .9, mechanism: 'immunosuppression', reason: 'amplia catabolismo e exposição HPA em um eixo que já não desliga' },
        'hormone:increase-t3': { score: .84, mechanism: 'thermogenic-overload', reason: 'eleva gasto basal e sensibilidade adrenérgica sem demanda física correspondente' },
    },
    'panic-hyperventilation': {
        'central:chemoreflex-ventilation': { score: 1, mechanism: 'hyperventilation', reason: 'derruba ainda mais PaCO₂ apesar de PaO₂ e SpO₂ preservadas' },
        'hormone:release-adrenaline': { score: .94, mechanism: 'adrenergic-overload', reason: 'reforça o circuito de alerta sem corrigir vasoconstrição por hipocapnia' },
        'central:sympathetic-arousal': { score: .92, mechanism: 'adrenergic-overload', reason: 'sustenta taquicardia e demanda em uma crise sem hipotensão primária' },
    },
    'major-hemorrhage': {
        'central:parasympathetic-recovery': { score: 1, mechanism: 'hypoperfusion', reason: 'retira a taquicardia compensatória quando volume sistólico e PAM já caíram' },
        'hormone:release-adrenaline': { score: .82, mechanism: 'adrenergic-overload', reason: 'eleva consumo miocárdico sem repor volume ou capacidade de transporte de O₂' },
        'central:chemoreflex-ventilation': { score: .62, mechanism: 'hyperventilation', reason: 'melhora PaO₂ sem restaurar débito, hemoglobina ou perfusão tecidual' },
    },
};

export function assessSignalMisuse(
    signalId: DecisionSignalId,
    physiology: PhysiologyState,
    scenarioId?: string,
): IatrogenicEpisode | null {
    const scenarioRule = scenarioId ? SCENARIO_MISMATCHES[scenarioId]?.[signalId] : undefined;
    let score = scenarioRule?.score ?? 0;
    let mechanism = scenarioRule?.mechanism;
    let reason = scenarioRule?.reason;

    const glucose = physiology.nutrients.bloodGlucose;
    const heartRate = physiology.cardiovascular.heartRate;
    const map = physiology.cardiovascular.meanArterialPressure;
    const temperature = physiology.bodyTemperature;
    const paCo2 = physiology.respiratory.paco2;
    const pH = physiology.acidBase.pH;
    const hydration = physiology.nutrients.hydration;
    const sodium = physiology.nutrients.sodium;

    const consider = (candidate: number, candidateMechanism: IatrogenicMechanism, candidateReason: string) => {
        if (candidate > score) {
            score = candidate;
            mechanism = candidateMechanism;
            reason = candidateReason;
        }
    };

    if (signalId === 'hormone:release-insulin') {
        consider(clamp((92 - glucose) / 42, 0, 1), 'hypoglycemia', 'insulina excede a oferta de glicose disponível');
    } else if (signalId === 'hormone:release-glucagon') {
        consider(clamp((glucose - 118) / 105, 0, 1), 'hyperglycemia', 'glucagon amplia produção hepática com glicose já elevada');
    } else if (signalId === 'hormone:release-adrenaline') {
        consider(Math.max(
            clamp((heartRate - 92) / 70, 0, 1),
            clamp((map - 105) / 65, 0, 1),
            clamp((temperature - 37.4) / 3, 0, 1),
        ), 'adrenergic-overload', 'a descarga catecolaminérgica excede a necessidade cardiovascular');
    } else if (signalId === 'hormone:release-cortisol') {
        consider(Math.max(
            physiology.pathophysiology.infectionSeverity / 100 * .82,
            clamp((glucose - 135) / 170, 0, 1),
        ), 'immunosuppression', 'o sinal glucocorticoide amplia catabolismo ou reduz defesa imune');
    } else if (signalId === 'hormone:release-gh'
        || signalId === 'hormone:release-testosterone'
        || signalId === 'hormone:boost-mtor') {
        consider(Math.max(
            physiology.energy.energyDeficit / 100,
            physiology.pathophysiology.infectionSeverity / 100 * .75,
        ), 'anabolic-overload', 'anabolismo foi ativado sem reserva energética ou estabilidade sistêmica');
    } else if (signalId === 'hormone:increase-t3') {
        consider(Math.max(
            clamp((temperature - 37.2) / 2.5, 0, 1),
            clamp((heartRate - 88) / 65, 0, 1),
        ), 'thermogenic-overload', 'T3 amplia termogênese e sensibilidade adrenérgica em contexto inadequado');
    } else if (signalId === 'central:sympathetic-arousal') {
        consider(Math.max(
            clamp((heartRate - 90) / 65, 0, 1),
            clamp((map - 102) / 60, 0, 1),
        ), 'adrenergic-overload', 'o tônus simpático excede a necessidade hemodinâmica');
    } else if (signalId === 'central:parasympathetic-recovery') {
        consider(Math.max(
            clamp((70 - map) / 35, 0, 1),
            clamp((60 - heartRate) / 25, 0, 1),
        ), 'hypoperfusion', 'a influência vagal reduz suporte cardiovascular em baixa perfusão');
    } else if (signalId === 'central:chemoreflex-ventilation') {
        consider(Math.max(
            clamp((35 - paCo2) / 15, 0, 1),
            clamp((pH - 7.45) / .18, 0, 1),
        ), 'hyperventilation', 'o drive ventilatório excede a necessidade gasométrica');
    } else if (signalId === 'central:reduce-respiratory-drive') {
        consider(Math.max(
            clamp((paCo2 - 44) / 24, 0, 1),
            clamp((7.36 - pH) / .18, 0, 1),
        ), 'hypoventilation', 'a redução do drive retém CO₂ quando ainda há demanda ventilatória');
    } else if (signalId === 'central:adh-retention') {
        consider(Math.max(
            clamp((hydration - 42) / 7, 0, 1),
            clamp((138 - sodium) / 14, 0, 1),
        ), 'water-retention', 'ADH retém água com volume alto ou sódio em diluição');
    } else if (signalId === 'central:suppress-adh') {
        consider(Math.max(
            clamp((40 - hydration) / 8, 0, 1),
            clamp((sodium - 144) / 14, 0, 1),
        ), 'water-loss', 'suprimir ADH aumenta perda de água durante déficit hídrico');
    }

    if (!mechanism || !reason || score < .25) return null;
    const intensity = clamp(score, .25, 1);
    const totalSeconds = misuseDuration(signalId, intensity);
    const label = signalId.startsWith('hormone:')
        ? getActionDefinition(signalId.slice('hormone:'.length))?.shortName ?? signalId
        : getHypothalamicSignal(signalId.slice('central:'.length))?.shortLabel ?? signalId;
    return {
        id: `${Math.round(physiology.timeElapsed * 1000)}-${signalId}`,
        signalId,
        label,
        mechanism,
        severity: severityFromIntensity(intensity),
        intensity,
        elapsedSeconds: 0,
        remainingSeconds: totalSeconds,
        totalSeconds,
        recurrenceCount: 1,
        reason,
        startedAt: physiology.timeElapsed,
    };
}

export function mergeIatrogenicEpisodes(
    current: readonly IatrogenicEpisode[],
    additions: readonly IatrogenicEpisode[],
): IatrogenicEpisode[] {
    const merged = current.map(episode => ({ ...episode }));
    additions.forEach(addition => {
        const existing = merged.find(episode => episode.signalId === addition.signalId && episode.mechanism === addition.mechanism);
        if (!existing) {
            merged.push({ ...addition });
            return;
        }
        existing.recurrenceCount = (existing.recurrenceCount ?? 1) + (addition.recurrenceCount ?? 1);
        const repeatedExposure = addition.intensity * (.3 + Math.min(.25, existing.recurrenceCount * .025));
        existing.intensity = clamp(
            1 - (1 - Math.max(existing.intensity, addition.intensity)) * (1 - repeatedExposure),
            .25,
            1,
        );
        existing.severity = severityFromIntensity(existing.intensity);
        existing.remainingSeconds = Math.min(
            1200,
            existing.remainingSeconds + addition.totalSeconds * Math.min(.9, .62 + existing.recurrenceCount * .04),
        );
        existing.totalSeconds = existing.elapsedSeconds + existing.remainingSeconds;
        existing.reason = addition.reason;
    });
    return merged;
}

export function createDecisionErrorEpisode(args: {
    scenarioId: string;
    choiceId: string;
    choiceLabel: string;
    physiology: PhysiologyState;
    cellular: CellularState;
    risk: 'recoverable' | 'unstable' | 'catastrophic';
}): IatrogenicEpisode {
    const molecularBurden = getCellularDamageBurden(args.cellular.damage) / 100;
    const riskPressure = args.risk === 'catastrophic' ? .22 : args.risk === 'unstable' ? .1 : 0;
    const intensity = clamp(.48 + molecularBurden * .35 + riskPressure, .48, 1);
    const totalSeconds = Math.round(55 + intensity * 75);

    return {
        id: `${Math.round(args.physiology.timeElapsed * 1000)}-decision-${args.scenarioId}-${args.choiceId}`,
        signalId: `decision:${args.scenarioId}:${args.choiceId}`,
        label: args.choiceLabel,
        mechanism: 'decision-error',
        severity: severityFromIntensity(intensity),
        intensity,
        elapsedSeconds: 0,
        remainingSeconds: totalSeconds,
        totalSeconds,
        recurrenceCount: 1,
        reason: 'a decisão inadequada prolonga falha de reparo e torna o dano molecular acumulado mais vulnerável a novas agressões',
        startedAt: args.physiology.timeElapsed,
    };
}

export function advanceIatrogenicConsequences(
    physiology: PhysiologyState,
    cellular: CellularState,
    episodes: readonly IatrogenicEpisode[],
    deltaTime: number,
): { physiology: PhysiologyState; cellular: CellularState; episodes: IatrogenicEpisode[]; events: PhysiologicalEvent[] } {
    const nextPhysiology: PhysiologyState = {
        ...physiology,
        nutrients: { ...physiology.nutrients },
        energy: { ...physiology.energy },
        allostaticLoad: { ...physiology.allostaticLoad },
        pathophysiology: { ...physiology.pathophysiology },
        cardiovascular: { ...physiology.cardiovascular },
        respiratory: { ...physiology.respiratory },
        acidBase: { ...physiology.acidBase },
    };
    const nextCellular: CellularState = {
        ...cellular,
        cell: { ...cellular.cell },
        tissue: { ...cellular.tissue },
        damage: { ...cellular.damage },
    };
    const nextEpisodes: IatrogenicEpisode[] = [];
    const events: PhysiologicalEvent[] = [];

    episodes.forEach(episode => {
        const activeSeconds = Math.min(Math.max(0, deltaTime), episode.remainingSeconds);
        if (activeSeconds <= 0) return;
        const exposureScale = .65 + Math.min(.85, (episode.elapsedSeconds + activeSeconds / 2) / 30);
        const exposure = episode.intensity * exposureScale * activeSeconds;

        if (episode.mechanism === 'hypoglycemia') {
            nextPhysiology.nutrients.bloodGlucose -= .42 * exposure;
            nextPhysiology.energy.energyDeficit += .16 * exposure;
            nextCellular.cell.atpMmolL -= .012 * exposure;
            nextCellular.tissue.lactateMmolL += .025 * exposure;
        } else if (episode.mechanism === 'hyperglycemia') {
            nextPhysiology.nutrients.bloodGlucose += .42 * exposure;
            nextPhysiology.allostaticLoad.currentLoad += .1 * exposure;
        } else if (episode.mechanism === 'adrenergic-overload') {
            nextPhysiology.allostaticLoad.currentLoad += .15 * exposure;
            nextPhysiology.energy.energyDeficit += .09 * exposure;
            nextPhysiology.bodyTemperature += .006 * exposure;
            nextCellular.tissue.lactateMmolL += .022 * exposure;
        } else if (episode.mechanism === 'immunosuppression') {
            nextPhysiology.pathophysiology.infectionSeverity += .06 * exposure;
            nextPhysiology.nutrients.bloodGlucose += .08 * exposure;
            nextPhysiology.allostaticLoad.currentLoad += .09 * exposure;
        } else if (episode.mechanism === 'anabolic-overload') {
            nextPhysiology.energy.atpPool -= .035 * exposure;
            nextPhysiology.energy.energyDeficit += .1 * exposure;
            nextCellular.cell.atpMmolL -= .015 * exposure;
        } else if (episode.mechanism === 'thermogenic-overload') {
            nextPhysiology.bodyTemperature += .004 * exposure;
            nextPhysiology.energy.energyDeficit += .1 * exposure;
            nextPhysiology.nutrients.hydration -= .006 * exposure;
        } else if (episode.mechanism === 'hypoperfusion') {
            nextPhysiology.cardiovascular.meanArterialPressure -= .18 * exposure;
            nextPhysiology.cardiovascular.perfusionIndex -= .32 * exposure;
            nextPhysiology.energy.energyDeficit += .14 * exposure;
            nextPhysiology.energy.lactateLevel += .03 * exposure;
            nextCellular.cell.atpMmolL -= .015 * exposure;
        } else if (episode.mechanism === 'hyperventilation') {
            nextPhysiology.respiratory.paco2 -= .16 * exposure;
            nextPhysiology.acidBase.pH += .00075 * exposure;
            nextPhysiology.energy.energyDeficit += .06 * exposure;
        } else if (episode.mechanism === 'hypoventilation') {
            nextPhysiology.respiratory.paco2 += .18 * exposure;
            nextPhysiology.respiratory.spo2 -= .025 * exposure;
            nextPhysiology.acidBase.pH -= .0008 * exposure;
            nextPhysiology.energy.energyDeficit += .08 * exposure;
        } else if (episode.mechanism === 'water-retention') {
            nextPhysiology.nutrients.hydration += .014 * exposure;
            nextPhysiology.nutrients.sodium -= .025 * exposure;
            nextCellular.cell.volumePercent += .035 * exposure;
        } else if (episode.mechanism === 'water-loss') {
            nextPhysiology.nutrients.hydration -= .014 * exposure;
            nextPhysiology.nutrients.sodium += .025 * exposure;
            nextPhysiology.energy.energyDeficit += .07 * exposure;
            nextCellular.cell.volumePercent -= .035 * exposure;
        }

        applyIatrogenicCellularDamage(nextCellular, episode, exposure);

        const remainingSeconds = Math.max(0, episode.remainingSeconds - activeSeconds);
        if (remainingSeconds > .001) {
            nextEpisodes.push({
                ...episode,
                elapsedSeconds: episode.elapsedSeconds + activeSeconds,
                remainingSeconds,
            });
        } else {
            events.push({
                type: 'system',
                severity: 'info',
                message: `Carga iatrogênica resolvida: ${episode.label}. A exposição inadequada deixou de atuar.`,
                timestamp: physiology.timeElapsed,
                affectedSystems: ['iatrogenic', episode.mechanism, 'resolved'],
            });
        }
    });

    clampConsequences(nextPhysiology, nextCellular);
    return { physiology: nextPhysiology, cellular: nextCellular, episodes: nextEpisodes, events };
}

export function iatrogenicEpisodeEvent(episode: IatrogenicEpisode, timestamp: number): PhysiologicalEvent {
    const severityLabel = episode.severity === 'critical' ? 'crítica' : episode.severity === 'severe' ? 'grave' : 'moderada';
    const recurrence = episode.recurrenceCount ?? 1;
    const recurrenceMessage = recurrence > 1
        ? ` Recorrência ${recurrence}: intensidade agravada para ${(episode.intensity * 100).toFixed(0)}%.`
        : '';
    const decisionError = episode.mechanism === 'decision-error';
    return {
        type: 'system',
        severity: episode.severity === 'moderate' ? 'warning' : 'critical',
        message: `${decisionError ? 'Erro de decisão' : `Iatrogenia ${severityLabel}`}: ${episode.label} — ${episode.reason}.${recurrenceMessage} Penalidade persistente por até ${episode.totalSeconds.toFixed(0)} s fisiológicos.`,
        timestamp,
        affectedSystems: [
            'iatrogenic',
            episode.mechanism,
            episode.severity,
            ...(decisionError ? ['decision', 'cellular-damage'] : []),
            `recurrence-${recurrence}`,
        ],
    };
}

const IATROGENIC_DAMAGE_RATES: Record<IatrogenicMechanism, {
    oxidativeStress: number;
    membrane: number;
    proteins: number;
    dna: number;
}> = {
    hypoglycemia: { oxidativeStress: .018, membrane: .012, proteins: .006, dna: .004 },
    hyperglycemia: { oxidativeStress: .055, membrane: .008, proteins: .012, dna: .006 },
    'adrenergic-overload': { oxidativeStress: .045, membrane: .01, proteins: .008, dna: .005 },
    immunosuppression: { oxidativeStress: .02, membrane: .01, proteins: .028, dna: .006 },
    'anabolic-overload': { oxidativeStress: .028, membrane: .008, proteins: .018, dna: .006 },
    'thermogenic-overload': { oxidativeStress: .04, membrane: .018, proteins: .025, dna: .008 },
    hypoperfusion: { oxidativeStress: .028, membrane: .025, proteins: .015, dna: .012 },
    hyperventilation: { oxidativeStress: .012, membrane: .008, proteins: .014, dna: .004 },
    hypoventilation: { oxidativeStress: .022, membrane: .016, proteins: .02, dna: .008 },
    'water-retention': { oxidativeStress: .008, membrane: .018, proteins: .006, dna: .003 },
    'water-loss': { oxidativeStress: .018, membrane: .022, proteins: .012, dna: .006 },
    'decision-error': { oxidativeStress: .035, membrane: .022, proteins: .02, dna: .01 },
};

function applyIatrogenicCellularDamage(
    cellular: CellularState,
    episode: IatrogenicEpisode,
    exposure: number,
) {
    const rates = IATROGENIC_DAMAGE_RATES[episode.mechanism];
    const accumulatedBurden = getCellularDamageBurden(cellular.damage) / 100;
    const damageSusceptibility = Math.min(2.2, 1 + accumulatedBurden * .9);
    const recurrenceScale = Math.min(1.8, 1 + Math.max(0, (episode.recurrenceCount ?? 1) - 1) * .18);
    const aggravatedExposure = exposure * damageSusceptibility * recurrenceScale;

    cellular.damage.oxidativeStress += rates.oxidativeStress * aggravatedExposure;
    cellular.damage.membrane += rates.membrane * aggravatedExposure;
    cellular.damage.proteins += rates.proteins * aggravatedExposure;
    cellular.damage.dna += rates.dna * aggravatedExposure;
}

function misuseDuration(signalId: DecisionSignalId, intensity: number): number {
    const base = signalId === 'hormone:release-insulin' ? 70
        : signalId === 'hormone:release-glucagon' ? 65
            : signalId === 'hormone:release-adrenaline' ? 45
                : signalId === 'hormone:release-cortisol' ? 240
                    : signalId === 'hormone:release-gh' ? 300
                        : signalId === 'hormone:release-testosterone' ? 600
                            : signalId === 'hormone:increase-t3' ? 600
                                : signalId === 'hormone:boost-mtor' ? 240
                                    : signalId === 'central:adh-retention' || signalId === 'central:suppress-adh' ? 120
                                        : 60;
    return Math.round(base * (.7 + intensity * .6));
}

function severityFromIntensity(intensity: number): IatrogenicSeverity {
    if (intensity >= .75) return 'critical';
    if (intensity >= .45) return 'severe';
    return 'moderate';
}

function clampConsequences(physiology: PhysiologyState, cellular: CellularState) {
    physiology.nutrients.bloodGlucose = clamp(physiology.nutrients.bloodGlucose, 20, 400);
    physiology.nutrients.hydration = clamp(physiology.nutrients.hydration, 28, 55);
    physiology.nutrients.sodium = clamp(physiology.nutrients.sodium, 120, 165);
    physiology.energy.atpPool = clamp(physiology.energy.atpPool, 0, physiology.energy.maxATP);
    physiology.energy.energyDeficit = clamp(physiology.energy.energyDeficit, 0, 100);
    physiology.energy.lactateLevel = clamp(physiology.energy.lactateLevel, .4, 20);
    physiology.allostaticLoad.currentLoad = clamp(physiology.allostaticLoad.currentLoad, 0, 100);
    physiology.pathophysiology.infectionSeverity = clamp(physiology.pathophysiology.infectionSeverity, 0, 100);
    physiology.bodyTemperature = clamp(physiology.bodyTemperature, 34, 42.5);
    physiology.cardiovascular.meanArterialPressure = clamp(physiology.cardiovascular.meanArterialPressure, 30, 180);
    physiology.cardiovascular.perfusionIndex = clamp(physiology.cardiovascular.perfusionIndex, 5, 160);
    physiology.respiratory.paco2 = clamp(physiology.respiratory.paco2, 20, 100);
    physiology.respiratory.spo2 = clamp(physiology.respiratory.spo2, 50, 100);
    physiology.acidBase.pH = clamp(physiology.acidBase.pH, 6.7, 7.7);
    cellular.cell.atpMmolL = clamp(cellular.cell.atpMmolL, .2, 5.8);
    cellular.cell.adpMmolL = 6 - cellular.cell.atpMmolL;
    cellular.cell.volumePercent = clamp(cellular.cell.volumePercent, 70, 140);
    cellular.tissue.lactateMmolL = clamp(cellular.tissue.lactateMmolL, 0, 20);
    cellular.damage.oxidativeStress = clamp(cellular.damage.oxidativeStress, 0, 100);
    cellular.damage.proteins = clamp(cellular.damage.proteins, 0, 100);
    cellular.damage.membrane = clamp(cellular.damage.membrane, 0, 100);
    cellular.damage.dna = clamp(cellular.damage.dna, 0, 100);
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
