// This file manages physiology state for the Body Ops simulation.
// The system simulates heart rate, oxygenation and perfusion.
// Each tick updates the parameters and UI animations react accordingly.

import { create } from 'zustand';
import { Physiology, DEFAULT_PHYSIOLOGY } from './physiology';
import { GameEvent, getRandomEvent } from './events';
import { PlayerAction, ActionCooldown } from './actions';
import {
  updateHeartRate,
  updateStrokeVolume,
  updateCardiacOutput,
  updateBloodPressure,
} from './equations/cardiac';
import {
  updateRespiratoryRate,
  updateBloodOxygen,
  updateTidalVolume,
} from './equations/respiratory';
import {
  updatePerfusion,
  updateMetabolicParameters,
} from './equations/perfusion';

interface ActiveEvent {
  event: GameEvent;
  remainingTime: number;
}

interface SimulationState {
  // Core parameters
  parameters: Physiology;
  isRunning: boolean;

  // Events
  activeEvents: ActiveEvent[];
  eventQueue: GameEvent[];

  // Actions
  actionCooldowns: ActionCooldown[];

  // Notifications
  notifications: string[];

  // Methods
  tick: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  applyAction: (action: PlayerAction) => void;
  addEvent: (event: GameEvent) => void;
  clearNotification: (index: number) => void;
}

const TICK_INTERVAL = 0.2; // 200ms in seconds

export const useSimulationStore = create<SimulationState>((set, get) => ({
  parameters: { ...DEFAULT_PHYSIOLOGY },
  isRunning: true,
  activeEvents: [],
  eventQueue: [],
  actionCooldowns: [],
  notifications: [],

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () =>
    set({
      parameters: { ...DEFAULT_PHYSIOLOGY },
      activeEvents: [],
      eventQueue: [],
      actionCooldowns: [],
      notifications: [],
      isRunning: true,
    }),

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    let params = { ...state.parameters };

    // Update time
    params.time += TICK_INTERVAL;

    // Apply active event effects
    const updatedEvents: ActiveEvent[] = [];
    state.activeEvents.forEach((ae) => {
      const newTime = ae.remainingTime - TICK_INTERVAL;
      if (newTime > 0) {
        // Apply ongoing effects (scaled per tick)
        Object.entries(ae.event.effects).forEach(([key, value]) => {
          if (value && key in params) {
            const scaledEffect = (value / ae.event.duration) * TICK_INTERVAL;
            (params as any)[key] += scaledEffect;
          }
        });
        updatedEvents.push({ ...ae, remainingTime: newTime });
      }
    });

    // Update cooldowns
    const updatedCooldowns = state.actionCooldowns
      .map((cd) => ({
        ...cd,
        remainingTime: cd.remainingTime - TICK_INTERVAL,
      }))
      .filter((cd) => cd.remainingTime > 0);

    // Random event generation
    const randomEvent = getRandomEvent();
    if (randomEvent && updatedEvents.length < 3) {
      updatedEvents.push({
        event: randomEvent,
        remainingTime: randomEvent.duration,
      });
      set({
        notifications: [
          ...state.notifications,
          `${randomEvent.title}: ${randomEvent.description}`,
        ],
      });
    }

    // === PHYSIOLOGY UPDATES ===

    // Cardiac
    params.heartRate = updateHeartRate(params, TICK_INTERVAL);
    params.strokeVolume = updateStrokeVolume(params);
    params.cardiacOutput = updateCardiacOutput(params);
    const bp = updateBloodPressure(params);
    params.bloodPressureSystolic = bp.systolic;
    params.bloodPressureDiastolic = bp.diastolic;

    // Respiratory
    params.respiratoryRate = updateRespiratoryRate(params);
    params.bloodOxygen = updateBloodOxygen(params);
    params.tidalVolume = updateTidalVolume(params);

    // Perfusion
    const perfusion = updatePerfusion(params);
    params.brainPerfusion = perfusion.brain;
    params.heartPerfusion = perfusion.heart;
    params.musclePerfusion = perfusion.muscle;
    params.organsPerfusion = perfusion.organs;

    // Metabolic
    const metabolic = updateMetabolicParameters(params);
    params.glucose = metabolic.glucose;
    params.lactate = metabolic.lactate;
    params.temperature = metabolic.temperature;

    // Hormonal decay (natural homeostasis) - REDUZIDO para ações durarem mais
    params.adrenaline += (10 - params.adrenaline) * 0.003;
    params.cortisol += (20 - params.cortisol) * 0.002;
    params.insulin += (30 - params.insulin) * 0.003;
    params.glucagon += (25 - params.glucagon) * 0.003;
    params.testosterone += (50 - params.testosterone) * 0.001; // Mais lento (hormônio lento)
    params.growthHormone += (40 - params.growthHormone) * 0.002;
    params.thyroid += (60 - params.thyroid) * 0.001; // Muito lento (tireoide)
    params.melatonin += (20 - params.melatonin) * 0.005; // Rápido (ciclo circadiano)
    params.dopamine += (70 - params.dopamine) * 0.004;
    params.serotonin += (75 - params.serotonin) * 0.003;

    // Stress decay - REDUZIDO
    params.stress += (10 - params.stress) * 0.002;

    // Energy regeneration
    if (params.stress < 30 && params.glucose > 70) {
      params.energy += 0.05;
    } else {
      params.energy -= 0.02;
    }

    // === ADVANCED PARAMETERS ===

    // Osmolarity (affected by hydration and kidney function)
    params.osmolarity += (290 - params.osmolarity) * 0.01;
    if (params.glucose > 150) params.osmolarity += 0.1;

    // VO2 Max (affected by exercise and conditioning)
    if (params.heartRate > 100 && params.respiratoryRate > 20) {
      params.vo2Max += 0.02; // Training effect
    }
    params.vo2Max += (45 - params.vo2Max) * 0.001;

    // pH (affected by respiration and metabolism)
    const pHBaseline = 7.4;
    params.pH += (pHBaseline - params.pH) * 0.02;
    if (params.lactate > 2) params.pH -= 0.001; // Acidosis
    if (params.respiratoryRate > 20) params.pH += 0.002; // Respiratory compensation

    // Electrolytes
    params.sodium += (140 - params.sodium) * 0.01;
    params.potassium += (4.0 - params.potassium) * 0.01;
    params.calcium += (2.4 - params.calcium) * 0.01;

    // === MOLECULAR PATHWAYS ===

    // Nrf2 (antioxidant response - activated by stress)
    if (params.stress > 50) {
      params.nrf2 += 0.5;
    } else {
      params.nrf2 += (30 - params.nrf2) * 0.02;
    }

    // mTOR (growth/anabolism - activated by nutrients and insulin)
    if (params.glucose > 100 && params.insulin > 40) {
      params.mtor += 0.3;
    } else {
      params.mtor += (50 - params.mtor) * 0.02;
    }

    // AMPK (energy sensor - activated by low energy)
    if (params.energy < 40 || params.glucose < 70) {
      params.ampk += 0.5;
    } else {
      params.ampk += (40 - params.ampk) * 0.02;
    }

    // NF-κB (inflammation - activated by stress and damage)
    if (params.stress > 60 || params.lactate > 3) {
      params.nfkb += 0.4;
    } else {
      params.nfkb += (20 - params.nfkb) * 0.03;
    }

    // Clamp all new parameters
    params.osmolarity = Math.max(270, Math.min(310, params.osmolarity));
    params.vo2Max = Math.max(20, Math.min(80, params.vo2Max));
    params.pH = Math.max(7.0, Math.min(7.8, params.pH));
    params.sodium = Math.max(125, Math.min(155, params.sodium));
    params.potassium = Math.max(3.0, Math.min(6.0, params.potassium));
    params.calcium = Math.max(2.0, Math.min(2.8, params.calcium));
    params.nrf2 = Math.max(0, Math.min(100, params.nrf2));
    params.mtor = Math.max(0, Math.min(100, params.mtor));
    params.ampk = Math.max(0, Math.min(100, params.ampk));
    params.nfkb = Math.max(0, Math.min(100, params.nfkb));

    set({
      parameters: params,
      activeEvents: updatedEvents,
      actionCooldowns: updatedCooldowns,
    });
  },

  applyAction: (action: PlayerAction) => {
    const state = get();

    // Check cooldown
    const onCooldown = state.actionCooldowns.some(
      (cd) => cd.actionId === action.id
    );
    if (onCooldown) {
      set({
        notifications: [
          ...state.notifications,
          `⏳ ${action.name} is on cooldown`,
        ],
      });
      return;
    }

    // Check energy cost
    if (action.cost && state.parameters.energy < action.cost) {
      set({
        notifications: [
          ...state.notifications,
          `⚠️ Not enough energy for ${action.name}`,
        ],
      });
      return;
    }

    // Apply effects immediately
    const params = { ...state.parameters };
    Object.entries(action.effects).forEach(([key, value]) => {
      if (value && key in params) {
        (params as any)[key] += value;
      }
    });

    if (action.cost) {
      params.energy -= action.cost;
    }

    // Add cooldown
    const newCooldowns = [
      ...state.actionCooldowns,
      { actionId: action.id, remainingTime: action.cooldown },
    ];

    set({
      parameters: params,
      actionCooldowns: newCooldowns,
      notifications: [
        ...state.notifications,
        `✅ ${action.name}: ${action.description}`,
      ],
    });
  },

  addEvent: (event: GameEvent) => {
    const state = get();
    set({
      activeEvents: [
        ...state.activeEvents,
        { event, remainingTime: event.duration },
      ],
      notifications: [
        ...state.notifications,
        `${event.title}: ${event.description}`,
      ],
    });
  },

  clearNotification: (index: number) => {
    const state = get();
    const newNotifications = [...state.notifications];
    newNotifications.splice(index, 1);
    set({ notifications: newNotifications });
  },
}));
