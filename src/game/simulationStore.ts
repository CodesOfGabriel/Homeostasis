/**
 * Homeostasis v3.0 - Simulation Store (Zustand)
 * Gerenciamento de estado da simulação fisiológica realista
 */

import { create } from 'zustand';
import {
    PhysiologyState,
    SimulationInput,
    SimulationOutput,
    HormonalAction,
    PhysiologicalEvent,
    PhysiologicalWarning,
    OrganState,
    CausalTrace,
    DiseasePreset,
    PhysiologicalContextFactors,
} from './types';
import { calculatePhysiologyTick } from './simulationLogic';
import { initializePhysiologyState } from './physiology';
import {
    advanceCellularSimulation,
    allocateAtp,
    applyScenarioCellularEffects,
    captureSubstrate,
    initializeCellularState,
    oxidizeSubstrate,
    purchaseAutomation,
    resolveRoutineDecision,
    runGlycolysis,
} from './cellularSimulation';
import type {
    AutomationKind,
    CellularActionResult,
    CellularEvent,
    CellularState,
    DecisionSignalId,
    OxidationSubstrate,
    RepairTarget,
    RoutineDecisionOutcome,
    SimulationDifficulty,
    SubstrateKind,
} from './cellularTypes';
import { getActionDefinition, isActionSafe } from './actions';
import { HORMONE_DEFINITIONS } from './config/hormones';
import { applyDiseasePreset } from './pathology';
import {
    applyScenarioPhysiologyEffects,
    getScenarioChoice,
    getScenarioContext,
    getScenarioDefinition,
} from './scenarios';
import {
    advanceCentralRegulation,
    applyCentralRegulatorySignal,
    createInitialCentralRegulationState,
    deriveRegulatoryCommands,
    getCentralRegulatorySignal,
    isCentralRegulatorySignalSafe,
    type CentralRegulationState,
    type CentralRegulatorySignalId,
} from './centralRegulation';
import { evaluateScenarioResolution } from './scenarioResolution';
import {
    advanceIatrogenicConsequences,
    assessSignalMisuse,
    createDecisionErrorEpisode,
    iatrogenicEpisodeEvent,
    mergeIatrogenicEpisodes,
    type IatrogenicEpisode,
} from './iatrogenic';
import { deriveCellularDamageEvents } from './cellularDamage';
import { createScenarioMetricSnapshot, type ScenarioMetricSnapshot } from './scenarioMetrics';
import {
    assessScenarioLearning,
    type ScenarioLearningAssessment,
} from './scenarioLearning';
import {
    advanceAdaptationWindow,
    createInitialAdaptationProgress,
    resolveAdaptationWindow,
    type AdaptationOpportunityState,
    type AdaptationProgressState,
} from './adaptationWindow';
import {
    awardScenarioMastery,
    loadMasteryProgress,
    prestigeMastery,
    type MasteryProgressState,
    type PhenotypeId,
} from './mastery';

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface SystemicInterventions {
    heartRateTarget: number;
    ventilationDrive: number;
    renalWaterReabsorption: number;
    pendingWaterMl: number;
    cumulativeWaterMl: number;
}

export interface CommandResult {
    ok: boolean;
    reason?: string;
}

export type SimulationCommand =
    | { id: string; type: 'release-hormone'; actionId: string }
    | { id: string; type: 'hypothalamic-signal'; signalId: CentralRegulatorySignalId }
    | { id: string; type: 'ingest-water'; amountMl: number }
    | { id: string; type: 'set-disease'; preset: DiseasePreset };

export interface DecisionFeedback {
    scenarioId: string;
    choiceId: string;
    title: string;
    message: string;
    outcome: RoutineDecisionOutcome;
    assessment: ScenarioLearningAssessment;
    timestamp: number;
}

export interface ScenarioResponseState {
    scenarioId: string;
    choiceId: string;
    effectMultiplier: number;
    risk: 'recoverable' | 'unstable' | 'catastrophic';
    totalSeconds: number;
    remainingSeconds: number;
    onset: ScenarioMetricSnapshot;
    preparedSignalCount: number;
    decisionTimeSeconds: number;
}

interface SimulationStore {
    schemaVersion: 1;
    // Estado Fisiológico
    physiology: PhysiologyState;
    cellular: CellularState;

    // Controle de Simulação
    isRunning: boolean;
    timeSpeed: number;               // 0.5x, 1x, 2x, 5x
    simulationDifficulty: SimulationDifficulty;
    resumeAfterDecision: boolean;
    lastTickTime: number;
    lastHistoryRecordTime: number;

    // Ações Hormonais
    activeHormonalActions: HormonalAction[];
    hormonalCooldowns: Record<string, number>; // actionId -> segundos restantes
    hypothalamus: CentralRegulationState;
    hypothalamicCooldowns: Record<string, number>;
    pendingCommands: SimulationCommand[];

    // Intervenções fisiológicas (o marcador observado continua sendo resultado)
    interventions: SystemicInterventions;

    // Histórico (para gráficos)
    history: {
        time: number[];
        heartRate: number[];
        systolicBP: number[];
        diastolicBP: number[];
        meanArterialPressure: number[];
        spo2: number[];
        respiratoryRate: number[];
        perfusionIndex: number[];
        glucose: number[];
        pH: number[];
        pao2: number[];
        paco2: number[];
        bicarbonate: number[];
        baseExcess: number[];
        lactate: number[];
        cardiacOutput: number[];
        sodium: number[];
        potassium: number[];
        hydration: number[];
        anionGap: number[];
        energyDeficit: number[];
        tissueOxygen: number[];
        cellularAtp: number[];
        oxidativeStress: number[];
        membranePotential: number[];
        maxDataPoints: number;
    };

    // Eventos e Alertas
    recentEvents: PhysiologicalEvent[];
    activeWarnings: PhysiologicalWarning[];
    lastCausalTrace: CausalTrace | null;
    lastReinforcementAt: number;
    lastDecision: DecisionFeedback | null;
    activeScenarioId: string | null;
    activeScenarioStartedAt: number | null;
    scenarioOnset: ScenarioMetricSnapshot | null;
    scenarioResponse: ScenarioResponseState | null;
    iatrogenicEpisodes: IatrogenicEpisode[];
    adaptationOpportunity: AdaptationOpportunityState | null;
    adaptationProgress: AdaptationProgressState;
    masteryProgress: MasteryProgressState;

    // UI State
    selectedOrgan: string | null;

    // Métodos
    tick: () => void;
    start: () => void;
    pause: () => void;
    reset: () => void;
    setTimeSpeed: (speed: number) => void;
    setSimulationDifficulty: (difficulty: SimulationDifficulty) => void;

    // Ações do Jogador
    releaseHormone: (actionId: string) => CommandResult;
    sendHypothalamicSignal: (signalId: CentralRegulatorySignalId) => CommandResult;
    setDiseasePreset: (preset: DiseasePreset) => CommandResult;
    ingestWater: (amountMl: number) => void;
    captureCellularSubstrate: (kind: SubstrateKind) => boolean;
    runCellularGlycolysis: () => boolean;
    oxidizeCellularSubstrate: (substrate: OxidationSubstrate) => boolean;
    allocateCellularAtp: (target: RepairTarget) => boolean;
    purchaseCellularAutomation: (kind: AutomationKind) => boolean;
    resolveCellularRoutine: (choiceId: string) => boolean;
    resolveAdaptationOpportunity: (choiceId: string) => boolean;
    prestigeToPhenotype: (phenotype: PhenotypeId) => CommandResult;

    // Utilitários
    selectOrgan: (organName: string | null) => void;
    clearEvent: (timestamp: number) => void;
    dismissWarning: (parameter: string) => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const createInitialHistory = () => ({
    time: [],
    heartRate: [],
    systolicBP: [],
    diastolicBP: [],
    meanArterialPressure: [],
    spo2: [],
    respiratoryRate: [],
    perfusionIndex: [],
    glucose: [],
    pH: [],
    pao2: [],
    paco2: [],
    bicarbonate: [],
    baseExcess: [],
    lactate: [],
    cardiacOutput: [],
    sodium: [],
    potassium: [],
    hydration: [],
    anionGap: [],
    energyDeficit: [],
    tissueOxygen: [],
    cellularAtp: [],
    oxidativeStress: [],
    membranePotential: [],
    maxDataPoints: 200, // Últimos 200 pontos
});

const createInitialInterventions = (): SystemicInterventions => ({
    heartRateTarget: 70,
    ventilationDrive: 100,
    renalWaterReabsorption: 99.2,
    pendingWaterMl: 0,
    cumulativeWaterMl: 0,
});

export function collectPreparedDecisionSignals(
    pendingCommands: readonly SimulationCommand[],
    activeActions: readonly HormonalAction[],
    hypothalamus: CentralRegulationState,
): DecisionSignalId[] {
    const signals = new Set<DecisionSignalId>();
    activeActions.forEach(action => signals.add(`hormone:${action.actionId}` as DecisionSignalId));
    pendingCommands.forEach(command => {
        if (command.type === 'release-hormone') signals.add(`hormone:${command.actionId}` as DecisionSignalId);
        if (command.type === 'hypothalamic-signal') signals.add(`central:${command.signalId}`);
    });

    const lastSignal = hypothalamus.lastSignal;
    const centralSignalActive = lastSignal === 'sympathetic-arousal'
        ? hypothalamus.autonomicTone > .08
        : lastSignal === 'parasympathetic-recovery'
            ? hypothalamus.autonomicTone < -.08
            : lastSignal === 'chemoreflex-ventilation'
                ? hypothalamus.respiratoryDrive > .08
                : lastSignal === 'reduce-respiratory-drive'
                    ? hypothalamus.respiratoryDrive < -.08
                    : lastSignal === 'adh-retention'
                    ? hypothalamus.osmoticDrive > .08
                    : lastSignal === 'suppress-adh'
                        ? hypothalamus.osmoticDrive < -.08
                        : lastSignal === 'activate-pomc-cart'
                            ? hypothalamus.feedingDrive < -.08
                            : lastSignal === 'activate-npy-agrp'
                                ? hypothalamus.feedingDrive > .08
                            : false;
    if (lastSignal && centralSignalActive) signals.add(`central:${lastSignal}`);
    return [...signals];
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

const initialMasteryProgress = loadMasteryProgress();

export const useSimulationStore = create<SimulationStore>((set, get) => ({
    // Estado inicial
    schemaVersion: 1,
    physiology: initializePhysiologyForPhenotype(initialMasteryProgress.activePhenotype),
    cellular: initializeCellularState(),
    isRunning: false,
    timeSpeed: 1,
    simulationDifficulty: 'easy',
    resumeAfterDecision: false,
    lastTickTime: Date.now(),
    lastHistoryRecordTime: 0,
    activeHormonalActions: [],
    hormonalCooldowns: {},
    hypothalamus: createInitialCentralRegulationState(),
    hypothalamicCooldowns: {},
    pendingCommands: [],
    interventions: createInitialInterventions(),
    history: createInitialHistory(),
    recentEvents: [{
        type: 'metabolic',
        severity: 'info',
        message: 'Sistema fisiológico inicializado - Estado basal normal',
        timestamp: 0,
        affectedSystems: ['all'],
    }],
    activeWarnings: [],
    lastCausalTrace: null,
    lastReinforcementAt: -45,
    lastDecision: null,
    activeScenarioId: null,
    activeScenarioStartedAt: null,
    scenarioOnset: null,
    scenarioResponse: null,
    iatrogenicEpisodes: [],
    adaptationOpportunity: null,
    adaptationProgress: createInitialAdaptationProgress(),
    masteryProgress: initialMasteryProgress,
    selectedOrgan: null,

    // ============================================================================
    // SIMULATION CONTROL
    // ============================================================================

    start: () => {
        if (get().cellular.routine) return;
        set({ isRunning: true, lastTickTime: Date.now() });
    },

    pause: () => {
        set({ isRunning: false });
    },

    reset: () => {
        const previous = get();
        const difficulty = previous.simulationDifficulty;
        // Criar evento de inicialização
        const initEvent: PhysiologicalEvent = {
            type: 'system',
            severity: 'info',
            message: 'Sistema fisiológico inicializado - Estado basal normal',
            timestamp: 0,
            affectedSystems: ['all'],
        };

        set({
            physiology: initializePhysiologyForPhenotype(previous.masteryProgress.activePhenotype),
            cellular: initializeCellularState(),
            isRunning: true,
            timeSpeed: 1,
            simulationDifficulty: difficulty,
            resumeAfterDecision: false,
            lastTickTime: Date.now(),
            lastHistoryRecordTime: 0,
            activeHormonalActions: [],
            hormonalCooldowns: {},
            hypothalamus: createInitialCentralRegulationState(),
            hypothalamicCooldowns: {},
            pendingCommands: [],
            interventions: createInitialInterventions(),
            history: createInitialHistory(),
            recentEvents: [initEvent],
            activeWarnings: [],
            lastCausalTrace: null,
            lastReinforcementAt: -45,
            lastDecision: null,
            activeScenarioId: null,
            activeScenarioStartedAt: null,
            scenarioOnset: null,
            scenarioResponse: null,
            iatrogenicEpisodes: [],
            adaptationOpportunity: null,
            adaptationProgress: createInitialAdaptationProgress({
                physiologicalKnowledge: previous.adaptationProgress.physiologicalKnowledge,
                unlockedCaseVariants: previous.adaptationProgress.unlockedCaseVariants,
                unlockedVisualEffects: previous.adaptationProgress.unlockedVisualEffects,
                offered: previous.adaptationProgress.offered,
                resolved: previous.adaptationProgress.resolved,
                successful: previous.adaptationProgress.successful,
                missed: previous.adaptationProgress.missed,
            }),
            selectedOrgan: null,
        });
    },

    setTimeSpeed: (speed: number) => {
        set({ timeSpeed: speed });
    },

    setSimulationDifficulty: (difficulty) => {
        set({ simulationDifficulty: difficulty });
    },

    // ============================================================================
    // MAIN SIMULATION TICK
    // ============================================================================

    tick: () => {
        const state = get();
        if (!state.isRunning) return;
        if (!state.physiology.isAlive) {
            set({ isRunning: false });
            return;
        }

        const now = Date.now();
        const realDeltaTime = (now - state.lastTickTime) / 1000; // em segundos
        // Evita saltos numéricos quando a aba volta do background.
        const adjustedDeltaTime = Math.min(2, realDeltaTime * state.timeSpeed);
        const physiologicalContext = getScenarioContext(state.activeScenarioId ?? state.cellular.routine?.id);
        const currentScenarioId = state.activeScenarioId ?? state.cellular.routine?.id;

        const commandOutput = applySimulationCommands(
            state.physiology,
            state.interventions,
            state.activeHormonalActions,
            state.hormonalCooldowns,
            state.hypothalamus,
            state.hypothalamicCooldowns,
            state.pendingCommands,
            physiologicalContext,
            currentScenarioId,
        );
        const preparedPhysiology = commandOutput.physiology;
        const preparedInterventions = commandOutput.interventions;
        const nextHypothalamus = advanceCentralRegulation(commandOutput.hypothalamus, adjustedDeltaTime);
        const regulatoryCommands = deriveRegulatoryCommands(nextHypothalamus);

        // A água ingerida primeiro ocupa o trato gastrointestinal e é absorvida
        // gradualmente. A escala de jogo comprime a fase gastrointestinal para
        // que a intervenção gere feedback mensurável em dezenas de segundos.
        const waterAbsorptionRate = Math.min(300, preparedInterventions.pendingWaterMl * 0.9);
        const absorbedWaterMl = waterAbsorptionRate * (adjustedDeltaTime / 60);
        const nextInterventions: SystemicInterventions = {
            ...preparedInterventions,
            ...regulatoryCommands,
            pendingWaterMl: Math.max(0, preparedInterventions.pendingWaterMl - absorbedWaterMl),
        };

        // Preparar input da simulação
        const input: SimulationInput = {
            deltaTime: adjustedDeltaTime,
            hormonalActions: commandOutput.actions,
            externalFactors: physiologicalContext,
            interventions: {
                heartRateTarget: nextInterventions.heartRateTarget,
                ventilationDrive: nextInterventions.ventilationDrive,
                renalWaterReabsorption: nextInterventions.renalWaterReabsorption,
                waterAbsorptionRate,
            },
            cellularFeedback: deriveCellularFeedback(state.cellular),
        };

        // Calcular próximo estado fisiológico
        const output: SimulationOutput = calculatePhysiologyTick(
            preparedPhysiology,
            input
        );

        // O microambiente usa o estado macroscópico já atualizado deste tick.
        const cellularOutput = advanceCellularSimulation(
            state.cellular,
            output.newState,
            {
                heartRateTarget: nextInterventions.heartRateTarget,
                ventilationDrive: nextInterventions.ventilationDrive,
                renalWaterReabsorption: nextInterventions.renalWaterReabsorption,
                pendingWaterMl: nextInterventions.pendingWaterMl,
                difficulty: state.simulationDifficulty,
                adaptationOpportunityActive: Boolean(state.adaptationOpportunity),
            },
            adjustedDeltaTime,
        );

        const startedScenario = !state.cellular.routine && cellularOutput.state.routine
            ? getScenarioDefinition(cellularOutput.state.routine.id)
            : undefined;
        let resultingPhysiology = output.newState;
        let resultingCellular = cellularOutput.state;
        let nextScenarioResponse = state.scenarioResponse;
        let completedDecision: DecisionFeedback | null = null;
        let responseEvent: PhysiologicalEvent | null = null;
        const decisionErrorEpisodes: IatrogenicEpisode[] = [];
        if (startedScenario) {
            resultingPhysiology = applyScenarioPhysiologyEffects(resultingPhysiology, startedScenario.onStartPhysiology);
        }

        // Depois da escolha, o evento não desaparece: contexto e consequência
        // percorrem uma trajetória observável. Cada tick aplica apenas a fração
        // correspondente do efeito configurado.
        if (state.scenarioResponse) {
            const response = state.scenarioResponse;
            const choice = getScenarioChoice(response.scenarioId, response.choiceId);
            const effectSeconds = Math.min(adjustedDeltaTime, response.remainingSeconds);
            const effectFraction = effectSeconds / Math.max(.001, response.totalSeconds);
            if (choice && effectFraction > 0) {
                resultingPhysiology = applyScenarioPhysiologyEffects(
                    resultingPhysiology,
                    choice.physiologyEffects,
                    response.effectMultiplier * effectFraction,
                );
                resultingCellular = applyScenarioCellularEffects(
                    resultingCellular,
                    choice.cellularEffects,
                    response.effectMultiplier * effectFraction,
                );
            }
            const remainingSeconds = Math.max(0, response.remainingSeconds - effectSeconds);
            nextScenarioResponse = remainingSeconds > .001 ? { ...response, remainingSeconds } : null;
            if (!nextScenarioResponse) {
                const finalSnapshot = createScenarioMetricSnapshot(resultingPhysiology, resultingCellular);
                const assessment = assessScenarioLearning(
                    response.scenarioId,
                    response.onset,
                    finalSnapshot,
                    response.risk,
                );
                const title = response.risk === 'catastrophic'
                    ? 'Cascata fisiológica crítica'
                    : assessment.outcome === 'adaptive'
                        ? 'Recuperação homeostática observada'
                        : assessment.outcome === 'partial'
                            ? 'Resposta fisiológica parcial'
                            : 'Descompensação após a intervenção';
                completedDecision = {
                    scenarioId: response.scenarioId,
                    choiceId: response.choiceId,
                    title,
                    message: assessment.summary,
                    outcome: assessment.outcome,
                    assessment,
                    timestamp: resultingPhysiology.timeElapsed,
                };
                responseEvent = {
                    type: 'cellular',
                    severity: assessment.outcome === 'adaptive' ? 'info' : assessment.outcome === 'partial' ? 'warning' : 'critical',
                    message: assessment.summary,
                    timestamp: resultingPhysiology.timeElapsed,
                    affectedSystems: ['cellular', 'decision', assessment.outcome],
                };
                if (assessment.outcome === 'harmful' && choice) {
                    decisionErrorEpisodes.push(createDecisionErrorEpisode({
                        scenarioId: response.scenarioId,
                        choiceId: response.choiceId,
                        choiceLabel: choice.label,
                        physiology: resultingPhysiology,
                        cellular: resultingCellular,
                        risk: response.risk,
                    }));
                }
            }
        }

        const activeIatrogenicEpisodes = mergeIatrogenicEpisodes(
            state.iatrogenicEpisodes,
            [...commandOutput.iatrogenicEpisodes, ...decisionErrorEpisodes],
        );
        const newIatrogenicEvents = [...commandOutput.iatrogenicEpisodes, ...decisionErrorEpisodes]
            .map(addition => activeIatrogenicEpisodes.find(episode => (
                episode.signalId === addition.signalId && episode.mechanism === addition.mechanism
            )))
            .filter((episode): episode is IatrogenicEpisode => Boolean(episode))
            .map(episode => iatrogenicEpisodeEvent(episode, resultingPhysiology.timeElapsed));
        const iatrogenicOutput = advanceIatrogenicConsequences(
            resultingPhysiology,
            resultingCellular,
            activeIatrogenicEpisodes,
            adjustedDeltaTime,
        );
        resultingPhysiology = iatrogenicOutput.physiology;
        resultingCellular = iatrogenicOutput.cellular;

        const iatrogenicBurden = Math.min(1, iatrogenicOutput.episodes.reduce((sum, episode) => {
            const severityWeight = episode.severity === 'critical' ? 1 : episode.severity === 'severe' ? .72 : .45;
            return sum + episode.intensity * severityWeight;
        }, 0));
        const masteryAward = completedDecision && state.scenarioResponse
            ? awardScenarioMastery(
                state.masteryProgress,
                completedDecision.scenarioId,
                completedDecision.assessment,
                state.scenarioResponse.preparedSignalCount,
                iatrogenicBurden,
                state.scenarioResponse.decisionTimeSeconds,
            )
            : null;
        const adaptationOutput = advanceAdaptationWindow({
            physiology: resultingPhysiology,
            cellular: resultingCellular,
            opportunity: state.adaptationOpportunity,
            progress: state.adaptationProgress,
            iatrogenicBurden,
            blocked: Boolean(
                startedScenario
                || state.cellular.routine
                || state.scenarioResponse
                || state.activeScenarioId
                || nextScenarioResponse,
            ),
            deltaTime: adjustedDeltaTime,
            interactionDeltaTime: Math.min(2, realDeltaTime),
        });
        resultingPhysiology = adaptationOutput.physiology;
        resultingCellular = adaptationOutput.cellular;
        const damageEvents = deriveCellularDamageEvents(state.cellular.damage, resultingCellular.damage)
            .map(event => cellularEventToPhysiological(event, resultingPhysiology.timeElapsed));

        // Atualizar cooldowns hormonais
        const newCooldowns = Object.fromEntries(
            Object.entries(commandOutput.cooldowns)
                .map(([actionId, time]) => [actionId, time - adjustedDeltaTime] as const)
                .filter(([, time]) => time > 0),
        );
        const newHypothalamicCooldowns = Object.fromEntries(
            Object.entries(commandOutput.hypothalamicCooldowns)
                .map(([signalId, time]) => [signalId, time - adjustedDeltaTime] as const)
                .filter(([, time]) => time > 0),
        );

        // Remover ações hormonais expiradas
        const updatedHormonalActions = commandOutput.actions
            .map(action => ({
                ...action,
                duration: action.duration - adjustedDeltaTime * 1000,
            }))
            .filter(action => action.duration > 0);

        // Atualizar histórico para gráficos
        const shouldRecord = resultingPhysiology.timeElapsed - state.lastHistoryRecordTime >= 1;
        let newHistory = state.history;

        if (shouldRecord) {
            newHistory = {
                ...state.history,
                time: [...state.history.time],
                heartRate: [...state.history.heartRate],
                systolicBP: [...state.history.systolicBP],
                diastolicBP: [...state.history.diastolicBP],
                meanArterialPressure: [...state.history.meanArterialPressure],
                spo2: [...state.history.spo2],
                respiratoryRate: [...state.history.respiratoryRate],
                perfusionIndex: [...state.history.perfusionIndex],
                glucose: [...state.history.glucose],
                pH: [...state.history.pH],
                pao2: [...state.history.pao2],
                paco2: [...state.history.paco2],
                bicarbonate: [...state.history.bicarbonate],
                baseExcess: [...state.history.baseExcess],
                lactate: [...state.history.lactate],
                cardiacOutput: [...state.history.cardiacOutput],
                sodium: [...state.history.sodium],
                potassium: [...state.history.potassium],
                hydration: [...state.history.hydration],
                anionGap: [...state.history.anionGap],
                energyDeficit: [...state.history.energyDeficit],
                tissueOxygen: [...state.history.tissueOxygen],
                cellularAtp: [...state.history.cellularAtp],
                oxidativeStress: [...state.history.oxidativeStress],
                membranePotential: [...state.history.membranePotential],
            };
            newHistory.time.push(resultingPhysiology.timeElapsed);
            newHistory.heartRate.push(resultingPhysiology.cardiovascular.heartRate);
            newHistory.systolicBP.push(resultingPhysiology.cardiovascular.systolicBP);
            newHistory.diastolicBP.push(resultingPhysiology.cardiovascular.diastolicBP);
            newHistory.meanArterialPressure.push(resultingPhysiology.cardiovascular.meanArterialPressure);
            newHistory.spo2.push(resultingPhysiology.respiratory.spo2);
            newHistory.respiratoryRate.push(resultingPhysiology.respiratory.respiratoryRate);
            newHistory.perfusionIndex.push(resultingPhysiology.cardiovascular.perfusionIndex);
            newHistory.glucose.push(resultingPhysiology.nutrients.bloodGlucose);
            newHistory.pH.push(resultingPhysiology.acidBase.pH);
            newHistory.pao2.push(resultingPhysiology.respiratory.pao2);
            newHistory.paco2.push(resultingPhysiology.respiratory.paco2);
            newHistory.bicarbonate.push(resultingPhysiology.acidBase.bicarbonate);
            newHistory.baseExcess.push(resultingPhysiology.acidBase.baseExcess);
            newHistory.lactate.push(resultingPhysiology.energy.lactateLevel);
            newHistory.cardiacOutput.push(resultingPhysiology.cardiovascular.cardiacOutput);
            newHistory.sodium.push(resultingPhysiology.nutrients.sodium);
            newHistory.potassium.push(resultingPhysiology.nutrients.potassium);
            newHistory.hydration.push(resultingPhysiology.nutrients.hydration);
            newHistory.anionGap.push(resultingPhysiology.acidBase.anionGap);
            newHistory.energyDeficit.push(resultingPhysiology.energy.energyDeficit);
            newHistory.tissueOxygen.push(resultingCellular.tissue.oxygenMmHg);
            newHistory.cellularAtp.push(resultingCellular.cell.atpMmolL);
            newHistory.oxidativeStress.push(resultingCellular.damage.oxidativeStress);
            newHistory.membranePotential.push(resultingCellular.cell.membranePotentialMv);

            // Manter apenas maxDataPoints
            Object.keys(newHistory).forEach(key => {
                if (Array.isArray(newHistory[key as keyof typeof newHistory])) {
                    const array = newHistory[key as keyof typeof newHistory] as number[];
                    if (array.length > newHistory.maxDataPoints) {
                        (newHistory[key as keyof typeof newHistory] as number[]) = array.slice(-newHistory.maxDataPoints);
                    }
                }
            });
        }

        // Adicionar novos eventos NO INÍCIO (manter últimos 50)
        const cellularEvents = cellularOutput.events.map(event =>
            cellularEventToPhysiological(event, output.newState.timeElapsed));
        const adaptationEvents = adaptationOutput.events.map(event =>
            cellularEventToPhysiological(event, resultingPhysiology.timeElapsed));
        const updatedEvents = [
            ...[
                ...commandOutput.events.filter(event => !event.affectedSystems.includes('iatrogenic')),
                ...newIatrogenicEvents,
                ...iatrogenicOutput.events,
                ...cellularEvents,
                ...adaptationEvents,
                ...damageEvents,
                ...output.events,
                ...(responseEvent ? [responseEvent] : []),
                ...(masteryAward ? [{
                    type: 'system' as const,
                    severity: 'info' as const,
                    message: `Domínio ${masteryAward.domain}: +${masteryAward.xp} XP · marco ×${masteryAward.milestoneMultiplier.toFixed(2)}${masteryAward.unlocked.length ? ` · ${masteryAward.unlocked.join(' · ')}` : ''}.`,
                    timestamp: resultingPhysiology.timeElapsed,
                    affectedSystems: ['mastery', masteryAward.domain],
                }] : []),
            ].reverse(),
            ...state.recentEvents,
        ].slice(0, 50);

        // Atualizar warnings (substituir)
        const updatedWarnings = output.warnings;

        const reinforcementEvent = iatrogenicOutput.episodes.length === 0 && resultingPhysiology.timeElapsed - state.lastReinforcementAt >= 45
            ? createPositiveReinforcementEvent(preparedPhysiology, resultingPhysiology)
            : null;
        const reinforcementEvents = reinforcementEvent ? [reinforcementEvent] : [];

        set({
            physiology: resultingPhysiology,
            cellular: resultingCellular,
            interventions: nextInterventions,
            lastTickTime: now,
            lastHistoryRecordTime: shouldRecord
                ? output.newState.timeElapsed
                : state.lastHistoryRecordTime,
            activeHormonalActions: updatedHormonalActions,
            hormonalCooldowns: newCooldowns,
            hypothalamus: nextHypothalamus,
            hypothalamicCooldowns: newHypothalamicCooldowns,
            pendingCommands: [],
            history: newHistory,
            recentEvents: [...reinforcementEvents, ...updatedEvents].slice(0, 50),
            activeWarnings: updatedWarnings,
            lastCausalTrace: commandOutput.causalTrace ?? state.lastCausalTrace,
            lastReinforcementAt: reinforcementEvent ? output.newState.timeElapsed : state.lastReinforcementAt,
            activeScenarioId: startedScenario
                ? startedScenario.id
                : completedDecision
                    ? null
                    : state.activeScenarioId,
            activeScenarioStartedAt: startedScenario
                ? Date.now()
                : completedDecision
                    ? null
                    : state.activeScenarioStartedAt,
            scenarioOnset: startedScenario
                ? createScenarioMetricSnapshot(resultingPhysiology, resultingCellular)
                : completedDecision
                    ? null
                    : state.scenarioOnset,
            scenarioResponse: nextScenarioResponse,
            iatrogenicEpisodes: iatrogenicOutput.episodes,
            adaptationOpportunity: adaptationOutput.opportunity,
            adaptationProgress: adaptationOutput.progress,
            masteryProgress: masteryAward?.progress ?? state.masteryProgress,
            lastDecision: completedDecision ?? state.lastDecision,
            // Toda situação exige uma decisão. A simulação congela no instante
            // do evento e só retoma depois que um caminho é escolhido.
            isRunning: startedScenario ? false : state.isRunning,
            resumeAfterDecision: startedScenario ? state.isRunning : state.resumeAfterDecision,
        });
    },

    // ============================================================================
    // HORMONAL ACTIONS (INTERFACE DO JOGADOR)
    // ============================================================================

    releaseHormone: (actionId) => {
        const state = get();
        const definition = getActionDefinition(actionId);
        if (!definition) return { ok: false, reason: 'Ação hormonal não encontrada.' };
        const remaining = state.hormonalCooldowns[actionId] ?? 0;
        if (remaining > 0) return { ok: false, reason: `Disponível novamente em ${remaining.toFixed(0)} s.` };
        if (state.pendingCommands.some(command => command.type === 'release-hormone' && command.actionId === actionId)) {
            return { ok: false, reason: 'Sinal já está na fila do próximo passo fisiológico.' };
        }
        const safety = isActionSafe(actionId, createHormoneSafetyState(state.physiology));
        if (!safety.safe) return { ok: false, reason: safety.reason };
        if (state.physiology.energy.atpPool < definition.metabolicCost) {
            return { ok: false, reason: `ATP insuficiente: são necessários ${definition.metabolicCost.toFixed(2)} mmol.` };
        }

        const command: SimulationCommand = {
            id: createCommandId(state.physiology.timeElapsed, actionId),
            type: 'release-hormone',
            actionId,
        };
        set({ pendingCommands: [...state.pendingCommands, command] });
        return { ok: true };
    },

    sendHypothalamicSignal: (signalId) => {
        const state = get();
        const definition = getCentralRegulatorySignal(signalId);
        if (!definition) return { ok: false, reason: 'Sinal de regulação central não encontrado.' };
        const remaining = state.hypothalamicCooldowns[signalId] ?? 0;
        if (remaining > 0) return { ok: false, reason: `Circuito disponível novamente em ${remaining.toFixed(0)} s.` };
        if (state.pendingCommands.some(command => command.type === 'hypothalamic-signal' && command.signalId === signalId)) {
            return { ok: false, reason: 'Este circuito já está na fila do próximo passo fisiológico.' };
        }
        const safety = isCentralRegulatorySignalSafe(signalId, state.physiology);
        if (!safety.safe) return { ok: false, reason: safety.reason };
        if (state.physiology.energy.atpPool < definition.cost) {
            return { ok: false, reason: `ATP insuficiente: são necessários ${definition.cost.toFixed(2)} mmol.` };
        }
        set({
            pendingCommands: [...state.pendingCommands, {
                id: createCommandId(state.physiology.timeElapsed, signalId),
                type: 'hypothalamic-signal',
                signalId,
            }],
        });
        return { ok: true };
    },

    setDiseasePreset: (preset) => {
        const state = get();
        set({
            pendingCommands: [
                ...state.pendingCommands.filter(command => command.type !== 'set-disease'),
                { id: createCommandId(state.physiology.timeElapsed, preset), type: 'set-disease', preset },
            ],
        });
        return { ok: true };
    },

    ingestWater: (amountMl: number) => {
        const state = get();
        const dose = Math.max(50, Math.min(1000, amountMl));
        const queuedWater = state.pendingCommands
            .filter((command): command is Extract<SimulationCommand, { type: 'ingest-water' }> => command.type === 'ingest-water')
            .reduce((sum, command) => sum + command.amountMl, 0);
        const accepted = Math.min(dose, Math.max(0, 2000 - state.interventions.pendingWaterMl - queuedWater));
        if (accepted <= 0) return;
        set({
            pendingCommands: [...state.pendingCommands, {
                id: createCommandId(state.physiology.timeElapsed, `water-${accepted}`),
                type: 'ingest-water',
                amountMl: accepted,
            }],
        });
    },

    captureCellularSubstrate: (kind: SubstrateKind) => {
        const state = get();
        const result = captureSubstrate(state.cellular, kind);
        set(cellularActionUpdate(state, result));
        return result.ok;
    },

    runCellularGlycolysis: () => {
        const state = get();
        const result = runGlycolysis(state.cellular);
        set(cellularActionUpdate(state, result));
        return result.ok;
    },

    oxidizeCellularSubstrate: (substrate: OxidationSubstrate) => {
        const state = get();
        const result = oxidizeSubstrate(state.cellular, substrate);
        set(cellularActionUpdate(state, result));
        return result.ok;
    },

    allocateCellularAtp: (target: RepairTarget) => {
        const state = get();
        const result = allocateAtp(state.cellular, target);
        set(cellularActionUpdate(state, result));
        return result.ok;
    },

    purchaseCellularAutomation: (kind: AutomationKind) => {
        const state = get();
        const requiredManager = kind === 'repair' ? 'inflammation-manager' : 'metabolism-manager';
        if (!state.masteryProgress.unlockedAutomations.includes(requiredManager)) {
            const result: CellularActionResult = {
                state: state.cellular,
                ok: false,
                reason: kind === 'repair'
                    ? 'Automação bloqueada: demonstre domínio de inflamação em dois casos distintos.'
                    : 'Automação bloqueada: demonstre domínio metabólico em dois casos distintos.',
            };
            set(cellularActionUpdate(state, result));
            return false;
        }
        const result = purchaseAutomation(state.cellular, kind);
        set(cellularActionUpdate(state, result));
        return result.ok;
    },

    resolveCellularRoutine: (choiceId: string) => {
        const state = get();
        const scenarioId = state.cellular.routine?.id;
        const pendingChoice = scenarioId ? getScenarioChoice(scenarioId, choiceId) : undefined;
        if (!scenarioId || !pendingChoice) return false;
        // Sinais escolhidos durante a análise entram no mesmo instante causal
        // da decisão. Assim, hormônios e circuitos centrais realmente alteram
        // a resposta do evento, embora o relógio permaneça congelado.
        const commandOutput = applySimulationCommands(
            state.physiology,
            state.interventions,
            state.activeHormonalActions,
            state.hormonalCooldowns,
            state.hypothalamus,
            state.hypothalamicCooldowns,
            state.pendingCommands,
            getScenarioContext(scenarioId),
            scenarioId,
        );
        const resolution = scenarioId && pendingChoice
            ? evaluateScenarioResolution(scenarioId, commandOutput.physiology, state.cellular, commandOutput.hypothalamus)
            : null;
        const result = resolveRoutineDecision(
            state.cellular,
            choiceId,
            1,
            false,
            commandOutput.preparedSignals,
        );
        if (!result.ok || !result.scenarioId) {
            set(cellularActionUpdate(state, result));
            return false;
        }

        const definition = getScenarioDefinition(result.scenarioId);
        const choice = getScenarioChoice(result.scenarioId, choiceId);
        if (!definition || !choice) {
            set(cellularActionUpdate(state, {
                ...result,
                ok: false,
                reason: 'A consequência sistêmica desta decisão não está configurada.',
            }));
            return false;
        }

        const responseDuration = Math.max(12, definition.durationSeconds);
        const onset = state.scenarioOnset
            ?? createScenarioMetricSnapshot(commandOutput.physiology, state.cellular);
        const response: ScenarioResponseState = {
            scenarioId: definition.id,
            choiceId,
            effectMultiplier: resolution?.effectMultiplier ?? 1,
            risk: resolution?.risk ?? 'recoverable',
            totalSeconds: responseDuration,
            remainingSeconds: responseDuration,
            onset,
            preparedSignalCount: commandOutput.preparedSignals.length,
            decisionTimeSeconds: Math.max(1, (Date.now() - (state.activeScenarioStartedAt ?? Date.now())) / 1000),
        };
        const responseStartedEvent: PhysiologicalEvent = {
            type: 'system',
            severity: 'info',
            message: `${choice.label}: intervenção iniciada. Observe a trajetória antes de concluir se a compensação foi suficiente.`,
            timestamp: commandOutput.physiology.timeElapsed,
            affectedSystems: ['decision', 'observation'],
        };
        const mergedIatrogenicEpisodes = mergeIatrogenicEpisodes(
            state.iatrogenicEpisodes,
            commandOutput.iatrogenicEpisodes,
        );
        const commandIatrogenicEvents = commandOutput.iatrogenicEpisodes
            .map(addition => mergedIatrogenicEpisodes.find(episode => (
                episode.signalId === addition.signalId && episode.mechanism === addition.mechanism
            )))
            .filter((episode): episode is IatrogenicEpisode => Boolean(episode))
            .map(episode => iatrogenicEpisodeEvent(episode, commandOutput.physiology.timeElapsed));
        set({
            physiology: commandOutput.physiology,
            cellular: result.state,
            interventions: commandOutput.interventions,
            activeHormonalActions: commandOutput.actions,
            hormonalCooldowns: commandOutput.cooldowns,
            hypothalamus: commandOutput.hypothalamus,
            hypothalamicCooldowns: commandOutput.hypothalamicCooldowns,
            pendingCommands: [],
            recentEvents: [
                responseStartedEvent,
                ...commandIatrogenicEvents.reverse(),
                ...commandOutput.events.filter(event => !event.affectedSystems.includes('iatrogenic')).reverse(),
                ...state.recentEvents,
            ].slice(0, 50),
            scenarioResponse: response,
            activeScenarioId: definition.id,
            iatrogenicEpisodes: mergedIatrogenicEpisodes,
            lastDecision: null,
            lastCausalTrace: commandOutput.causalTrace ?? state.lastCausalTrace,
            isRunning: state.resumeAfterDecision,
            resumeAfterDecision: false,
            lastTickTime: Date.now(),
        });
        return result.ok;
    },

    resolveAdaptationOpportunity: (choiceId: string) => {
        const state = get();
        if (!state.adaptationOpportunity) return false;
        const resolution = resolveAdaptationWindow(
            state.physiology,
            state.cellular,
            state.adaptationOpportunity,
            state.adaptationProgress,
            choiceId,
        );
        if (!resolution) return false;
        const severity = resolution.result.outcome === 'harmful' ? 'warning' : 'info';
        const event: PhysiologicalEvent = {
            type: 'cellular',
            severity,
            message: resolution.result.detail,
            timestamp: resolution.physiology.timeElapsed,
            affectedSystems: ['adaptation-window', resolution.result.type, resolution.result.outcome],
        };
        set({
            physiology: resolution.physiology,
            cellular: resolution.cellular,
            adaptationOpportunity: null,
            adaptationProgress: resolution.progress,
            recentEvents: [
                event,
                ...state.recentEvents,
            ].slice(0, 50),
        });
        return true;
    },

    prestigeToPhenotype: (phenotype) => {
        const state = get();
        const progress = prestigeMastery(state.masteryProgress, phenotype);
        if (!progress) return { ok: false, reason: 'Complete 12 casos e alcance nível 2 nos seis domínios antes de iniciar outro fenótipo.' };
        state.reset();
        set({
            masteryProgress: progress,
            physiology: initializePhysiologyForPhenotype(phenotype),
            recentEvents: [{
                type: 'system', severity: 'info',
                message: `Novo organismo iniciado com o fenótipo ${phenotype}; conhecimento e mecanismos foram preservados.`,
                timestamp: 0, affectedSystems: ['mastery', 'phenotype'],
            }],
        });
        return { ok: true };
    },

    // ============================================================================
    // UI UTILITIES
    // ============================================================================

    selectOrgan: (organName: string | null) => {
        set({ selectedOrgan: organName });
    },

    clearEvent: (timestamp: number) => {
        const state = get();
        set({
            recentEvents: state.recentEvents.filter(e => e.timestamp !== timestamp),
        });
    },

    dismissWarning: (parameter: string) => {
        const state = get();
        set({
            activeWarnings: state.activeWarnings.filter(w => w.parameter !== parameter),
        });
    },
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function initializePhysiologyForPhenotype(phenotype: PhenotypeId): PhysiologyState {
    const baseline = initializePhysiologyState();

    if (phenotype === 'type2-diabetes') {
        return applyDiseasePreset(baseline, 'type2-diabetes');
    }
    if (phenotype === 'chronic-kidney') {
        return applyDiseasePreset(baseline, 'renal-failure');
    }
    if (phenotype === 'athlete') {
        return {
            ...baseline,
            energy: {
                ...baseline.energy,
                vo2Max: 62,
                maxPCr: 36,
                pCrStore: 34,
                lactateClearance: .72,
            },
            capacities: {
                ...baseline.capacities,
                mitochondrialCapacity: 1.24,
                ventilatoryCapacity: 1.18,
                vascularToneResponsiveness: 1.12,
                insulinSensitivity: 1.12,
            },
            cardiovascular: {
                ...baseline.cardiovascular,
                heartRate: 54,
                heartRateVariability: 72,
                strokeVolume: 92,
                cardiacOutput: 4.97,
            },
        };
    }
    if (phenotype === 'older-adult') {
        return {
            ...baseline,
            capacities: {
                ...baseline.capacities,
                renalFunction: .72,
                mitochondrialCapacity: .82,
                vascularToneResponsiveness: .76,
                ventilatoryCapacity: .86,
                pancreaticBetaReserve: .78,
            },
            renal: {
                ...baseline.renal,
                gfr: 82,
                renalBloodFlow: 850,
            },
            cardiovascular: {
                ...baseline.cardiovascular,
                heartRateVariability: 30,
                systemicVascularResistance: 1120,
            },
            allostaticLoad: {
                ...baseline.allostaticLoad,
                recoveryRate: baseline.allostaticLoad.recoveryRate * .72,
                adaptationCapacity: 78,
            },
        };
    }
    return baseline;
}

function cellularEventToPhysiological(
    event: CellularEvent,
    timestamp: number,
): PhysiologicalEvent {
    return {
        type: 'cellular',
        severity: event.severity,
        message: event.message,
        timestamp,
        affectedSystems: event.affectedSystems,
    };
}

function cellularActionUpdate(
    state: SimulationStore,
    result: CellularActionResult,
): Pick<SimulationStore, 'cellular' | 'recentEvents'> {
    const event: CellularEvent = result.event ?? {
        message: result.reason ?? 'Ação celular indisponível',
        severity: 'warning',
        affectedSystems: ['cellular'],
    };
    const damageEvents = result.ok
        ? deriveCellularDamageEvents(state.cellular.damage, result.state.damage)
        : [];
    return {
        cellular: result.ok
            ? result.state
            : { ...result.state, lastEvent: event.message },
        // Preparação metabólica durante uma decisão altera somente os pools.
        // A timeline permanece congelada e nenhum "novo evento" é produzido.
        recentEvents: state.cellular.routine
            ? state.recentEvents
            : [
                ...damageEvents.map(damageEvent => cellularEventToPhysiological(damageEvent, state.physiology.timeElapsed)),
                cellularEventToPhysiological(event, state.physiology.timeElapsed),
                ...state.recentEvents,
            ].slice(0, 50),
    };
}

interface CommandApplicationResult {
    physiology: PhysiologyState;
    interventions: SystemicInterventions;
    actions: HormonalAction[];
    cooldowns: Record<string, number>;
    hypothalamus: CentralRegulationState;
    hypothalamicCooldowns: Record<string, number>;
    events: PhysiologicalEvent[];
    causalTrace: CausalTrace | null;
    preparedSignals: DecisionSignalId[];
    iatrogenicEpisodes: IatrogenicEpisode[];
}

function applySimulationCommands(
    initialPhysiology: PhysiologyState,
    initialInterventions: SystemicInterventions,
    initialActions: HormonalAction[],
    initialCooldowns: Record<string, number>,
    initialHypothalamus: CentralRegulationState,
    initialHypothalamicCooldowns: Record<string, number>,
    commands: SimulationCommand[],
    externalFactors: PhysiologicalContextFactors,
    scenarioId?: string,
): CommandApplicationResult {
    let physiology = initialPhysiology;
    const interventions = { ...initialInterventions };
    const actions = [...initialActions];
    const cooldowns = { ...initialCooldowns };
    let hypothalamus = { ...initialHypothalamus };
    const hypothalamicCooldowns = { ...initialHypothalamicCooldowns };
    const events: PhysiologicalEvent[] = [];
    let causalTrace: CausalTrace | null = null;
    const preparedSignals = new Set(collectPreparedDecisionSignals([], initialActions, initialHypothalamus));
    const iatrogenicEpisodes: IatrogenicEpisode[] = [];

    for (const command of commands) {
        if (command.type === 'hypothalamic-signal') {
            const definition = getCentralRegulatorySignal(command.signalId);
            if (!definition || (hypothalamicCooldowns[command.signalId] ?? 0) > 0) continue;
            const safety = isCentralRegulatorySignalSafe(command.signalId, physiology);
            if (!safety.safe || physiology.energy.atpPool < definition.cost) {
                events.push({
                    type: 'system', severity: 'warning',
                    message: safety.reason ?? `ATP insuficiente para ${definition.shortLabel}.`,
                    timestamp: physiology.timeElapsed, affectedSystems: ['central-regulation', definition.axis, 'safety'],
                });
                continue;
            }
            hypothalamus = applyCentralRegulatorySignal(hypothalamus, definition);
            preparedSignals.add(`central:${definition.id}`);
            hypothalamicCooldowns[definition.id] = definition.cooldownSeconds;
            physiology = {
                ...physiology,
                energy: { ...physiology.energy, atpPool: Math.max(0, physiology.energy.atpPool - definition.cost) },
            };
            events.push({
                type: 'system', severity: 'info',
                message: `${definition.shortLabel}: circuito regulatório recrutado. ${definition.mechanism}`,
                timestamp: physiology.timeElapsed, affectedSystems: ['central-regulation', definition.axis],
            });
            const iatrogenicEpisode = assessSignalMisuse(`central:${definition.id}`, physiology, scenarioId);
            if (iatrogenicEpisode) {
                iatrogenicEpisodes.push(iatrogenicEpisode);
                events.push(iatrogenicEpisodeEvent(iatrogenicEpisode, physiology.timeElapsed));
            }
            continue;
        }

        if (command.type === 'set-disease') {
            physiology = applyDiseasePreset(physiology, command.preset);
            events.push({
                type: 'system',
                severity: command.preset === 'healthy' ? 'info' : 'warning',
                message: command.preset === 'healthy'
                    ? 'Reservas fisiológicas restauradas para o perfil saudável.'
                    : `Contexto fisiopatológico ativado: ${command.preset}. A progressão agora depende das capacidades alteradas.`,
                timestamp: physiology.timeElapsed,
                affectedSystems: ['pathophysiology', 'all'],
            });
            continue;
        }

        if (command.type === 'ingest-water') {
            const accepted = Math.min(command.amountMl, Math.max(0, 2000 - interventions.pendingWaterMl));
            if (accepted <= 0) continue;
            interventions.pendingWaterMl += accepted;
            interventions.cumulativeWaterMl += accepted;
            events.push({
                type: 'environmental', severity: 'info',
                message: `${accepted.toFixed(0)} mL de água chegaram ao trato gastrointestinal; a absorção será gradual.`,
                timestamp: physiology.timeElapsed, affectedSystems: ['gut', 'renal', 'tissue'],
            });
            continue;
        }

        const definition = getActionDefinition(command.actionId);
        if (!definition || (cooldowns[command.actionId] ?? 0) > 0) continue;
        const safety = isActionSafe(command.actionId, createHormoneSafetyState(physiology));
        if (!safety.safe || physiology.energy.atpPool < definition.metabolicCost) {
            events.push({
                type: 'hormonal', severity: 'warning',
                message: safety.reason ?? `ATP insuficiente para ${definition.shortName}.`,
                timestamp: physiology.timeElapsed, affectedSystems: ['hormonal', 'safety'],
            });
            continue;
        }

        const direction = definition.effectDirection === 'decrease' ? -1 : 1;
        const bolus = definition.dose * definition.bolusFraction * direction;
        const sustained = (definition.dose - definition.dose * definition.bolusFraction) * direction;
        const totalDuration = definition.infusionSeconds * 1000;
        actions.push({
            actionId: definition.id,
            hormone: definition.hormone,
            amount: sustained,
            duration: totalDuration,
            totalDuration,
            cooldown: definition.cooldownSeconds,
            metabolicCost: definition.metabolicCost,
        });
        preparedSignals.add(`hormone:${definition.id}` as DecisionSignalId);
        cooldowns[definition.id] = definition.cooldownSeconds;
        physiology = {
            ...physiology,
            energy: { ...physiology.energy, atpPool: Math.max(0, physiology.energy.atpPool - definition.metabolicCost) },
            hormones: {
                ...physiology.hormones,
                [definition.hormone]: Math.min(
                    HORMONE_DEFINITIONS[definition.hormone].upperLimit,
                    physiology.hormones[definition.hormone] + bolus,
                ),
            },
        };
        causalTrace = createHormoneCausalTrace(definition, physiology, externalFactors);
        events.push({
            type: 'hormonal', severity: causalTrace.severity,
            message: `${definition.shortName}: bolus aplicado, infusão por ${definition.infusionSeconds} s e resposta dependente do contexto.`,
            timestamp: physiology.timeElapsed,
            affectedSystems: ['hormonal', definition.effectModel],
            causalTrace,
        });
        const iatrogenicEpisode = assessSignalMisuse(
            `hormone:${definition.id}` as DecisionSignalId,
            physiology,
            scenarioId,
        );
        if (iatrogenicEpisode) {
            iatrogenicEpisodes.push(iatrogenicEpisode);
            events.push(iatrogenicEpisodeEvent(iatrogenicEpisode, physiology.timeElapsed));
        }
    }

    return {
        physiology,
        interventions,
        actions,
        cooldowns,
        hypothalamus,
        hypothalamicCooldowns,
        events,
        causalTrace,
        preparedSignals: [...preparedSignals],
        iatrogenicEpisodes,
    };
}

function createHormoneSafetyState(physiology: PhysiologyState) {
    return {
        glucose: physiology.nutrients.bloodGlucose,
        pH: physiology.acidBase.pH,
        heartRate: physiology.cardiovascular.heartRate,
        energyDeficit: physiology.energy.energyDeficit,
        aminoAcids: physiology.nutrients.aminoAcids,
        atpPool: physiology.energy.atpPool,
        cortisol: physiology.hormones.cortisol,
        t3: physiology.hormones.t3,
    };
}

function createHormoneCausalTrace(
    definition: NonNullable<ReturnType<typeof getActionDefinition>>,
    physiology: PhysiologyState,
    external: PhysiologicalContextFactors,
): CausalTrace {
    const stressContext = external.stress >= 60 ? `estresse ${external.stress.toFixed(0)}%` : `estresse ${external.stress.toFixed(0)}%`;
    const context = `${stressContext} · exercício ${external.exercise.toFixed(0)}% · glicose ${physiology.nutrients.bloodGlucose.toFixed(0)} mg/dL`;
    const cardiacRisk = definition.hormone === 'adrenaline' && physiology.cardiovascular.heartRate > 120;
    const sensitivity = definition.effectModel === 'insulin'
        ? physiology.endocrine.insulinReceptorSensitivity
        : definition.effectModel === 'glucocorticoid'
            ? physiology.endocrine.glucocorticoidSensitivity
            : definition.effectModel === 'catecholamine' || definition.effectModel === 'thyroid'
                ? physiology.endocrine.adrenergicReceptorSensitivity
                : definition.effectModel === 'glucagon'
                    ? physiology.capacities.hepaticGlucoseResponsiveness
                    : physiology.endocrine.anabolicSensitivity;
    return {
        id: `${definition.id}-${Math.round(physiology.timeElapsed * 10)}`,
        title: `${definition.shortName} + contexto atual`,
        context,
        steps: [
            `receptor efetor: sensibilidade ${(sensitivity * 100).toFixed(0)}%`,
            ...definition.expectedDirections.slice(0, 3),
            `latência: ${definition.latency}`,
        ],
        timestamp: physiology.timeElapsed,
        severity: cardiacRisk ? 'warning' : 'info',
    };
}

function deriveCellularFeedback(cellular: CellularState): NonNullable<SimulationInput['cellularFeedback']> {
    const tissueWeight = .002;
    return {
        lactateFlux: Math.max(0, cellular.tissue.lactateMmolL - 1) * .012 * tissueWeight,
        carbonDioxideFlux: Math.max(0, cellular.tissue.carbonDioxideMmHg - 46) * .02 * tissueWeight,
        inflammationSignal: (cellular.damage.oxidativeStress + cellular.damage.proteins) / 200 * tissueWeight,
        oxygenDemand: cellular.mitochondria.oxygenConsumption / 10 * tissueWeight,
        viabilitySignal: cellular.cell.viabilityPercent / 100,
        barrierFailureSignal: cellular.fate.infectionSusceptibility / 100,
        apoptoticSignal: cellular.fate.apoptoticCommitment / 100,
    };
}

function createCommandId(time: number, label: string): string {
    return `${Math.round(time * 1000)}-${label}`;
}

function createPositiveReinforcementEvent(
    previousState: PhysiologyState,
    nextState: PhysiologyState,
): PhysiologicalEvent | null {
    if (!nextState.isAlive) return null;

    const stableHeartRate = nextState.cardiovascular.heartRate >= 60 && nextState.cardiovascular.heartRate <= 95;
    const stableOxygen = nextState.respiratory.spo2 >= 96;
    const stablePh = nextState.acidBase.pH >= 7.36 && nextState.acidBase.pH <= 7.44;
    const stableGlucose = nextState.nutrients.bloodGlucose >= 78 && nextState.nutrients.bloodGlucose <= 110;
    const lowLoad = nextState.allostaticLoad.currentLoad <= 24;

    if (!(stableHeartRate && stableOxygen && stablePh && stableGlucose && lowLoad)) {
        return null;
    }

    const loadBonus = Math.min(0.28, Math.max(0.08, 0.28 - nextState.allostaticLoad.currentLoad / 120));
    const heartbeatSeed = Math.sin(
        nextState.timeElapsed * 12.9898
        + nextState.cardiovascular.heartRate * 0.618
        + nextState.nutrients.bloodGlucose * 0.17
        + previousState.timeElapsed * 0.19,
    ) * 43758.5453;
    const noise = heartbeatSeed - Math.floor(heartbeatSeed);

    if (noise > loadBonus) {
        return null;
    }

    return {
        type: 'system',
        severity: 'info',
        message: 'Reforço positivo variável: a homeostase se manteve estável e o sistema respondeu com recuperação eficiente.',
        timestamp: nextState.timeElapsed,
        affectedSystems: ['all'],
    };
}

// ============================================================================
// HOOK PARA ANIMATION LOOP
// ============================================================================

/**
 * Hook para gerenciar o loop de animação da simulação
 * Uso: useSimulationLoop();
 */
export function useSimulationLoop() {
    const tick = useSimulationStore(state => state.tick);
    const isRunning = useSimulationStore(state => state.isRunning);

    React.useEffect(() => {
        if (!isRunning) return;

        let animationFrameId: number;
        let lastTime = Date.now();
        // Equações usam dt e não precisam acompanhar a taxa de pintura.
        // 10 Hz mantém controles responsivos e reduz reconciliação dos painéis SVG.
        const targetFPS = 10;
        const frameInterval = 1000 / targetFPS;

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - lastTime;

            if (elapsed >= frameInterval) {
                tick();
                lastTime = currentTime - (elapsed % frameInterval);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isRunning, tick]);
}

// Importar React no topo se não estiver
import React from 'react';

// ============================================================================
// SELECTORS (para performance)
// ============================================================================

/**
 * Seletores otimizados para evitar re-renders desnecessários
 */
export const selectors = {
    // Vital Signs
    vitalSigns: (state: SimulationStore) => ({
        hr: state.physiology.cardiovascular.heartRate,
        spo2: state.physiology.respiratory.spo2,
        bp: {
            systolic: state.physiology.cardiovascular.systolicBP,
            diastolic: state.physiology.cardiovascular.diastolicBP,
        },
        rr: state.physiology.respiratory.respiratoryRate,
        temp: 36.8, // Placeholder
    }),

    // Metabolic Panel
    metabolicPanel: (state: SimulationStore) => ({
        glucose: state.physiology.nutrients.bloodGlucose,
        lactate: state.physiology.energy.lactateLevel,
        pH: state.physiology.acidBase.pH,
        bicarbonate: state.physiology.acidBase.bicarbonate,
    }),

    // Energy Matrix
    energyMatrix: (state: SimulationStore) => state.physiology.energy,

    // Microambiente celular
    cellular: (state: SimulationStore) => state.cellular,

    // Hormones
    hormones: (state: SimulationStore) => state.physiology.hormones,

    // System Health
    systemHealth: (state: SimulationStore) => ({
        cardiovascular: calculateOrganHealth(state.physiology.organs.heart),
        respiratory: calculateOrganHealth(state.physiology.organs.lungs),
        metabolic: state.physiology.energy.energyDeficit < 10 ? 100 : 100 - state.physiology.energy.energyDeficit,
        acidBase: calculateAcidBaseHealth(state.physiology.acidBase.pH),
    }),

    // Is Alive
    isAlive: (state: SimulationStore) => state.physiology.isAlive,

    // Cause of Death (se morto)
    causeOfDeath: (state: SimulationStore) => state.physiology.causeOfDeath,
};

function calculateOrganHealth(organ: OrganState): number {
    return organ.functionality;
}

function calculateAcidBaseHealth(pH: number): number {
    const deviation = Math.abs(7.4 - pH);
    return Math.max(0, 100 - deviation * 200);
}
