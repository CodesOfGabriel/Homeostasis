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
} from './types';
import { calculatePhysiologyTick } from './simulationLogic';
import { initializePhysiologyState } from './physiology';
import {
    advanceCellularSimulation,
    allocateAtp,
    captureSubstrate,
    initializeCellularState,
    oxidizeSubstrate,
    purchaseAutomation,
    runGlycolysis,
} from './cellularSimulation';
import type {
    AutomationKind,
    CellularActionResult,
    CellularEvent,
    CellularState,
    OxidationSubstrate,
    RepairTarget,
    SubstrateKind,
} from './cellularTypes';

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

interface SimulationStore {
    // Estado Fisiológico
    physiology: PhysiologyState;
    cellular: CellularState;

    // Controle de Simulação
    isRunning: boolean;
    timeSpeed: number;               // 0.5x, 1x, 2x, 5x
    lastTickTime: number;
    lastHistoryRecordTime: number;

    // Ações Hormonais
    activeHormonalActions: HormonalAction[];
    hormonalCooldowns: Map<string, number>; // hormone -> tempo restante

    // Fatores Externos (Controlados pelo Jogador)
    externalFactors: {
        exercise: number;              // 0-100
        nutrition: number;             // 0-100
        stress: number;                // 0-100
        sleep: number;                 // 0-100
        temperature: number;           // °C
    };

    // Intervenções fisiológicas (o marcador observado continua sendo resultado)
    interventions: SystemicInterventions;

    // Histórico (para gráficos)
    history: {
        time: number[];
        heartRate: number[];
        spo2: number[];
        glucose: number[];
        pH: number[];
        lactate: number[];
        cardiacOutput: number[];
        maxDataPoints: number;
    };

    // Eventos e Alertas
    recentEvents: PhysiologicalEvent[];
    activeWarnings: PhysiologicalWarning[];

    // UI State
    selectedOrgan: string | null;

    // Métodos
    tick: () => void;
    start: () => void;
    pause: () => void;
    reset: () => void;
    setTimeSpeed: (speed: number) => void;

    // Ações do Jogador
    releaseHormone: (hormone: keyof PhysiologyState['hormones'], amount: number) => void;
    setExerciseIntensity: (intensity: number) => void;
    setStressLevel: (stress: number) => void;
    setNutrition: (quality: number) => void;
    setSleep: (quality: number) => void;
    ingestWater: (amountMl: number) => void;
    setHeartRateTarget: (heartRate: number) => void;
    setVentilationDrive: (drive: number) => void;
    setRenalWaterReabsorption: (reabsorption: number) => void;
    captureCellularSubstrate: (kind: SubstrateKind) => boolean;
    runCellularGlycolysis: () => boolean;
    oxidizeCellularSubstrate: (substrate: OxidationSubstrate) => boolean;
    allocateCellularAtp: (target: RepairTarget) => boolean;
    purchaseCellularAutomation: (kind: AutomationKind) => boolean;

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
    spo2: [],
    glucose: [],
    pH: [],
    lactate: [],
    cardiacOutput: [],
    maxDataPoints: 200, // Últimos 200 pontos
});

const initialExternalFactors = {
    exercise: 0,
    nutrition: 80,
    stress: 20,
    sleep: 80,
    temperature: 22,
};

const createInitialInterventions = (): SystemicInterventions => ({
    heartRateTarget: 70,
    ventilationDrive: 100,
    renalWaterReabsorption: 99.2,
    pendingWaterMl: 0,
    cumulativeWaterMl: 0,
});

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useSimulationStore = create<SimulationStore>((set, get) => ({
    // Estado inicial
    physiology: initializePhysiologyState(),
    cellular: initializeCellularState(),
    isRunning: false,
    timeSpeed: 1,
    lastTickTime: Date.now(),
    lastHistoryRecordTime: 0,
    activeHormonalActions: [],
    hormonalCooldowns: new Map(),
    externalFactors: { ...initialExternalFactors },
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
    selectedOrgan: null,

    // ============================================================================
    // SIMULATION CONTROL
    // ============================================================================

    start: () => {
        set({ isRunning: true, lastTickTime: Date.now() });
    },

    pause: () => {
        set({ isRunning: false });
    },

    reset: () => {
        // Criar evento de inicialização
        const initEvent: PhysiologicalEvent = {
            type: 'system',
            severity: 'info',
            message: 'Sistema fisiológico inicializado - Estado basal normal',
            timestamp: 0,
            affectedSystems: ['all'],
        };

        set({
            physiology: initializePhysiologyState(),
            cellular: initializeCellularState(),
            isRunning: true,
            timeSpeed: 1,
            lastTickTime: Date.now(),
            lastHistoryRecordTime: 0,
            activeHormonalActions: [],
            hormonalCooldowns: new Map(),
            externalFactors: { ...initialExternalFactors },
            interventions: createInitialInterventions(),
            history: createInitialHistory(),
            recentEvents: [initEvent],
            activeWarnings: [],
            selectedOrgan: null,
        });
    },

    setTimeSpeed: (speed: number) => {
        set({ timeSpeed: speed });
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

        // A água ingerida primeiro ocupa o trato gastrointestinal e é absorvida
        // gradualmente. A escala de jogo comprime a fase gastrointestinal para
        // que a intervenção gere feedback mensurável em dezenas de segundos.
        const waterAbsorptionRate = Math.min(300, state.interventions.pendingWaterMl * 0.9);
        const absorbedWaterMl = waterAbsorptionRate * (adjustedDeltaTime / 60);
        const nextInterventions: SystemicInterventions = {
            ...state.interventions,
            pendingWaterMl: Math.max(0, state.interventions.pendingWaterMl - absorbedWaterMl),
        };

        // Preparar input da simulação
        const input: SimulationInput = {
            deltaTime: adjustedDeltaTime,
            hormonalActions: state.activeHormonalActions,
            externalFactors: state.externalFactors,
            interventions: {
                heartRateTarget: state.interventions.heartRateTarget,
                ventilationDrive: state.interventions.ventilationDrive,
                renalWaterReabsorption: state.interventions.renalWaterReabsorption,
                waterAbsorptionRate,
            },
        };

        // Calcular próximo estado fisiológico
        const output: SimulationOutput = calculatePhysiologyTick(
            state.physiology,
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
            },
            adjustedDeltaTime,
        );

        // Atualizar cooldowns hormonais
        const newCooldowns = new Map(state.hormonalCooldowns);
        newCooldowns.forEach((time, hormone) => {
            const newTime = time - adjustedDeltaTime;
            if (newTime <= 0) {
                newCooldowns.delete(hormone);
            } else {
                newCooldowns.set(hormone, newTime);
            }
        });

        // Remover ações hormonais expiradas
        const updatedHormonalActions = state.activeHormonalActions
            .map(action => ({
                ...action,
                duration: action.duration - adjustedDeltaTime * 1000,
            }))
            .filter(action => action.duration > 0);

        // Atualizar histórico para gráficos
        const shouldRecord = output.newState.timeElapsed - state.lastHistoryRecordTime >= 1;
        let newHistory = state.history;

        if (shouldRecord) {
            newHistory = {
                ...state.history,
                time: [...state.history.time],
                heartRate: [...state.history.heartRate],
                spo2: [...state.history.spo2],
                glucose: [...state.history.glucose],
                pH: [...state.history.pH],
                lactate: [...state.history.lactate],
                cardiacOutput: [...state.history.cardiacOutput],
            };
            newHistory.time.push(output.newState.timeElapsed);
            newHistory.heartRate.push(output.newState.cardiovascular.heartRate);
            newHistory.spo2.push(output.newState.respiratory.spo2);
            newHistory.glucose.push(output.newState.nutrients.bloodGlucose);
            newHistory.pH.push(output.newState.acidBase.pH);
            newHistory.lactate.push(output.newState.energy.lactateLevel);
            newHistory.cardiacOutput.push(output.newState.cardiovascular.cardiacOutput);

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
        const updatedEvents = [
            ...[...cellularEvents, ...output.events].reverse(),
            ...state.recentEvents,
        ].slice(0, 50);

        // Atualizar warnings (substituir)
        const updatedWarnings = output.warnings;

        const reinforcementEvent = createPositiveReinforcementEvent(state.physiology, output.newState);
        const reinforcementEvents = reinforcementEvent ? [reinforcementEvent] : [];

        set({
            physiology: output.newState,
            cellular: cellularOutput.state,
            interventions: nextInterventions,
            lastTickTime: now,
            lastHistoryRecordTime: shouldRecord
                ? output.newState.timeElapsed
                : state.lastHistoryRecordTime,
            activeHormonalActions: updatedHormonalActions,
            hormonalCooldowns: newCooldowns,
            history: newHistory,
            recentEvents: [...reinforcementEvents, ...updatedEvents].slice(0, 50),
            activeWarnings: updatedWarnings,
        });
    },

    // ============================================================================
    // HORMONAL ACTIONS (INTERFACE DO JOGADOR)
    // ============================================================================

    releaseHormone: (hormone, amount) => {
        const state = get();

        // Verificar cooldown
        if (state.hormonalCooldowns.has(hormone)) {
            const remainingTime = state.hormonalCooldowns.get(hormone)!;
            const event: PhysiologicalEvent = {
                type: 'hormonal',
                severity: 'info',
                message: `${hormone} em cooldown (${remainingTime.toFixed(1)}s restantes)`,
                timestamp: state.physiology.timeElapsed,
                affectedSystems: ['hormonal'],
            };
            set({
                recentEvents: [event, ...state.recentEvents].slice(0, 50),
            });
            return;
        }

        // A concentração liberada não é uma medida de energia. Usar custos
        // específicos evita bloquear glucagon/adrenalina por um falso custo.
        const metabolicCost = getHormoneMetabolicCost(hormone);
        if (state.physiology.energy.atpPool < metabolicCost) {
            const event: PhysiologicalEvent = {
                type: 'metabolic',
                severity: 'warning',
                message: `ATP insuficiente para sintetizar ${hormone}`,
                timestamp: state.physiology.timeElapsed,
                affectedSystems: ['energy', 'hormonal'],
            };
            set({
                recentEvents: [event, ...state.recentEvents].slice(0, 50),
            });
            return;
        }

        // Criar ação hormonal
        const cooldownTime = getHormoneCooldown(hormone);
        const totalDuration = 18000;
        const bolusFraction = hormone === 'adrenaline' ? 0.65 : 0.45;
        const bolusAmount = amount * bolusFraction;
        const sustainedAmount = amount - bolusAmount;
        const action: HormonalAction = {
            hormone,
            amount: sustainedAmount,
            duration: totalDuration,
            totalDuration,
            cooldown: cooldownTime,
            metabolicCost,
        };

        // Adicionar cooldown
        const newCooldowns = new Map(state.hormonalCooldowns);
        newCooldowns.set(hormone, cooldownTime);

        // Adicionar ação
        const newActions = [...state.activeHormonalActions, action];

        // Evento de feedback
        const event: PhysiologicalEvent = {
            type: 'hormonal',
            severity: 'info',
            message: `${getHormoneDisplayName(hormone)} liberado: resposta imediata e efeito sustentado por 18 segundos`,
            timestamp: state.physiology.timeElapsed,
            affectedSystems: ['hormonal'],
        };

        set({
            physiology: {
                ...state.physiology,
                energy: {
                    ...state.physiology.energy,
                    atpPool: Math.max(0, state.physiology.energy.atpPool - metabolicCost),
                },
                hormones: {
                    ...state.physiology.hormones,
                    [hormone]: Math.min(
                        getHormoneUpperLimit(hormone),
                        state.physiology.hormones[hormone] + bolusAmount,
                    ),
                },
            },
            activeHormonalActions: newActions,
            hormonalCooldowns: newCooldowns,
            recentEvents: [event, ...state.recentEvents].slice(0, 50),
        });
    },

    // ============================================================================
    // EXTERNAL FACTORS CONTROL
    // ============================================================================

    setExerciseIntensity: (intensity: number) => {
        const state = get();
        const clampedIntensity = Math.max(0, Math.min(100, intensity));

        // Adicionar evento se mudança significativa (>10%)
        if (Math.abs(clampedIntensity - state.externalFactors.exercise) > 10) {
            const event: PhysiologicalEvent = {
                type: 'environmental',
                severity: clampedIntensity > 50 ? 'warning' : 'info',
                message: `Intensidade de exercício alterada para ${clampedIntensity}%`,
                timestamp: state.physiology.timeElapsed,
                affectedSystems: ['cardiovascular', 'respiratory', 'energy'],
            };
            set({
                recentEvents: [event, ...state.recentEvents].slice(0, 50),
            });
        }

        set({
            externalFactors: {
                ...state.externalFactors,
                exercise: clampedIntensity,
            },
        });
    },

    setStressLevel: (stress: number) => {
        const state = get();
        set({
            externalFactors: {
                ...state.externalFactors,
                stress: Math.max(0, Math.min(100, stress)),
            },
        });
    },

    setNutrition: (quality: number) => {
        const state = get();
        set({
            externalFactors: {
                ...state.externalFactors,
                nutrition: Math.max(0, Math.min(100, quality)),
            },
        });
    },

    setSleep: (quality: number) => {
        const state = get();
        set({
            externalFactors: {
                ...state.externalFactors,
                sleep: Math.max(0, Math.min(100, quality)),
            },
        });
    },

    ingestWater: (amountMl: number) => {
        const state = get();
        const dose = Math.max(50, Math.min(1000, amountMl));
        const accepted = Math.min(dose, Math.max(0, 2000 - state.interventions.pendingWaterMl));
        if (accepted <= 0) return;

        const rapidlyAbsorbedMl = accepted * 0.2;
        const gastricVolumeMl = accepted - rapidlyAbsorbedMl;
        const previousHydration = state.physiology.nutrients.hydration;
        const nextHydration = Math.min(55, previousHydration + rapidlyAbsorbedMl / 1000);
        const dilutedSodium = state.physiology.nutrients.sodium * previousHydration / nextHydration;

        const event: PhysiologicalEvent = {
            type: 'environmental',
            severity: 'info',
            message: `Ingestão de ${accepted.toFixed(0)} mL de água: ${rapidlyAbsorbedMl.toFixed(0)} mL absorvidos rapidamente e ${gastricVolumeMl.toFixed(0)} mL no estômago`,
            timestamp: state.physiology.timeElapsed,
            affectedSystems: ['gut', 'renal', 'tissue'],
        };

        set({
            interventions: {
                ...state.interventions,
                pendingWaterMl: state.interventions.pendingWaterMl + gastricVolumeMl,
                cumulativeWaterMl: state.interventions.cumulativeWaterMl + accepted,
            },
            physiology: {
                ...state.physiology,
                nutrients: {
                    ...state.physiology.nutrients,
                    hydration: nextHydration,
                    sodium: Math.max(115, Math.min(170, dilutedSodium)),
                },
            },
            recentEvents: [event, ...state.recentEvents].slice(0, 50),
        });
    },

    setHeartRateTarget: (heartRate: number) => {
        const state = get();
        set({
            interventions: {
                ...state.interventions,
                heartRateTarget: Math.max(45, Math.min(180, heartRate)),
            },
        });
    },

    setVentilationDrive: (drive: number) => {
        const state = get();
        const clampedDrive = Math.max(50, Math.min(180, drive));
        const currentRespiratory = state.physiology.respiratory;
        const commandedRate = Math.max(5, Math.min(55, 14 * clampedDrive / 100));
        const respiratoryRate = currentRespiratory.respiratoryRate
            + (commandedRate - currentRespiratory.respiratoryRate) * 0.28;
        const commandedTidalVolume = Math.max(280, Math.min(2200, 500 * Math.pow(clampedDrive / 100, 0.3)));
        const tidalVolume = currentRespiratory.tidalVolume
            + (commandedTidalVolume - currentRespiratory.tidalVolume) * 0.2;
        set({
            interventions: {
                ...state.interventions,
                ventilationDrive: clampedDrive,
            },
            physiology: {
                ...state.physiology,
                respiratory: {
                    ...currentRespiratory,
                    respiratoryRate,
                    tidalVolume,
                    minuteVentilation: respiratoryRate * tidalVolume / 1000,
                },
            },
        });
    },

    setRenalWaterReabsorption: (reabsorption: number) => {
        const state = get();
        set({
            interventions: {
                ...state.interventions,
                renalWaterReabsorption: Math.max(98.5, Math.min(99.8, reabsorption)),
            },
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
        const result = purchaseAutomation(state.cellular, kind);
        set(cellularActionUpdate(state, result));
        return result.ok;
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
    return {
        cellular: result.ok
            ? result.state
            : { ...result.state, lastEvent: event.message },
        recentEvents: [
            cellularEventToPhysiological(event, state.physiology.timeElapsed),
            ...state.recentEvents,
        ].slice(0, 50),
    };
}

/**
 * Retorna o tempo de cooldown para cada hormônio (em segundos)
 */
function getHormoneCooldown(hormone: string): number {
    const cooldowns: Record<string, number> = {
        insulin: 30,
        glucagon: 35,
        adrenaline: 45,
        cortisol: 60,
        gh: 75,
        testosterone: 90,
        t3: 120,
        t4: 120,
    };
    return cooldowns[hormone] || 60;
}

function getHormoneMetabolicCost(hormone: keyof PhysiologyState['hormones']): number {
    const costs: Record<keyof PhysiologyState['hormones'], number> = {
        insulin: 0.5,
        gh: 0.8,
        testosterone: 1,
        igf1: 0.8,
        cortisol: 0.7,
        glucagon: 0.35,
        adrenaline: 0.65,
        noradrenaline: 0.65,
        t3: 0.9,
        t4: 0.9,
        tsh: 0.6,
        mTORActivity: 0.6,
    };
    return costs[hormone];
}

function getHormoneDisplayName(hormone: keyof PhysiologyState['hormones']): string {
    const names: Record<keyof PhysiologyState['hormones'], string> = {
        insulin: 'Insulina',
        gh: 'Hormônio do crescimento',
        testosterone: 'Testosterona',
        igf1: 'Fator de crescimento semelhante à insulina 1',
        cortisol: 'Cortisol',
        glucagon: 'Glucagon',
        adrenaline: 'Adrenalina',
        noradrenaline: 'Noradrenalina',
        t3: 'Triiodotironina',
        t4: 'Tiroxina',
        tsh: 'Hormônio estimulante da tireoide',
        mTORActivity: 'Atividade da via mTOR',
    };
    return names[hormone];
}

function getHormoneUpperLimit(hormone: keyof PhysiologyState['hormones']): number {
    const limits: Record<keyof PhysiologyState['hormones'], number> = {
        insulin: 300,
        gh: 100,
        testosterone: 3000,
        igf1: 1000,
        cortisol: 150,
        glucagon: 1000,
        adrenaline: 3000,
        noradrenaline: 5000,
        t3: 800,
        t4: 60,
        tsh: 100,
        mTORActivity: 100,
    };
    return limits[hormone];
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
