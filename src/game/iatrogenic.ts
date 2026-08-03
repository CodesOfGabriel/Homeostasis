import { getActionDefinition } from './actions';
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
    | 'water-loss';

export interface IatrogenicEpisode {
    id: string;
    signalId: DecisionSignalId;
    label: string;
    mechanism: IatrogenicMechanism;
    severity: IatrogenicSeverity;
    intensity: number;
    elapsedSeconds: number;
    remainingSeconds: number;
    totalSeconds: number;
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
        existing.intensity = Math.max(existing.intensity, addition.intensity);
        existing.severity = severityFromIntensity(existing.intensity);
        existing.remainingSeconds = Math.min(1200, existing.remainingSeconds + addition.totalSeconds * .65);
        existing.totalSeconds = existing.elapsedSeconds + existing.remainingSeconds;
        existing.reason = addition.reason;
    });
    return merged;
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
            nextCellular.damage.oxidativeStress += .055 * exposure;
        } else if (episode.mechanism === 'adrenergic-overload') {
            nextPhysiology.allostaticLoad.currentLoad += .15 * exposure;
            nextPhysiology.energy.energyDeficit += .09 * exposure;
            nextPhysiology.bodyTemperature += .006 * exposure;
            nextCellular.damage.oxidativeStress += .045 * exposure;
            nextCellular.tissue.lactateMmolL += .022 * exposure;
        } else if (episode.mechanism === 'immunosuppression') {
            nextPhysiology.pathophysiology.infectionSeverity += .06 * exposure;
            nextPhysiology.nutrients.bloodGlucose += .08 * exposure;
            nextPhysiology.allostaticLoad.currentLoad += .09 * exposure;
            nextCellular.damage.proteins += .028 * exposure;
        } else if (episode.mechanism === 'anabolic-overload') {
            nextPhysiology.energy.atpPool -= .035 * exposure;
            nextPhysiology.energy.energyDeficit += .1 * exposure;
            nextCellular.cell.atpMmolL -= .015 * exposure;
            nextCellular.damage.oxidativeStress += .028 * exposure;
        } else if (episode.mechanism === 'thermogenic-overload') {
            nextPhysiology.bodyTemperature += .004 * exposure;
            nextPhysiology.energy.energyDeficit += .1 * exposure;
            nextPhysiology.nutrients.hydration -= .006 * exposure;
            nextCellular.damage.oxidativeStress += .04 * exposure;
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
            nextCellular.damage.membrane += .018 * exposure;
        } else if (episode.mechanism === 'water-loss') {
            nextPhysiology.nutrients.hydration -= .014 * exposure;
            nextPhysiology.nutrients.sodium += .025 * exposure;
            nextPhysiology.energy.energyDeficit += .07 * exposure;
            nextCellular.cell.volumePercent -= .035 * exposure;
        }

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
    return {
        type: 'system',
        severity: episode.severity === 'moderate' ? 'warning' : 'critical',
        message: `Iatrogenia ${severityLabel}: ${episode.label} — ${episode.reason}. Penalidade persistente por até ${episode.totalSeconds.toFixed(0)} s fisiológicos.`,
        timestamp,
        affectedSystems: ['iatrogenic', episode.mechanism, episode.severity],
    };
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
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
