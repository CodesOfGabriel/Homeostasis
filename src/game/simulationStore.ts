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
import {
  evaluateActionForEvent,
  checkForCombo,
  EVENT_SOLUTIONS,
  ActionCombo,
} from './eventSolutions';
import { Quest, updateQuestProgress, checkQuestUnlocks, DAILY_QUESTS, STORY_QUESTS, resetDailyQuests } from './questSystem';

interface ActiveEvent {
  event: GameEvent;
  remainingTime: number;
}

interface RecentAction {
  actionId: string;
  timestamp: number;
}

interface SimulationState {
  // Core parameters
  parameters: Physiology;
  isRunning: boolean;
  timeSpeed: number; // Velocidade da timeline (0.5x, 1x, 2x, 5x, 10x)

  // Events
  activeEvents: ActiveEvent[];
  eventQueue: GameEvent[];

  // Actions
  actionCooldowns: ActionCooldown[];
  recentActions: RecentAction[]; // Track recent actions for combo detection

  // Notifications
  notifications: string[];

  // Combo tracking
  activeCombo: ActionCombo | null;
  comboScore: number;

  // Quests
  dailyQuests: Quest[];
  storyQuests: Quest[];
  lastDailyReset: number; // Timestamp of last daily reset

  // Methods
  tick: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setTimeSpeed: (speed: number) => void;
  applyAction: (action: PlayerAction) => void;
  addEvent: (event: GameEvent) => void;
  clearNotification: (index: number) => void;
  updateQuests: (gameState: any) => void;
  checkDailyReset: () => void;
}

const TICK_INTERVAL = 0.2; // 200ms in seconds

export const useSimulationStore = create<SimulationState>((set, get) => ({
  parameters: { ...DEFAULT_PHYSIOLOGY },
  isRunning: true,
  timeSpeed: 1,
  activeEvents: [],
  eventQueue: [],
  actionCooldowns: [],
  recentActions: [],
  notifications: [],
  activeCombo: null,
  comboScore: 0,
  dailyQuests: [...DAILY_QUESTS],
  storyQuests: [...STORY_QUESTS],
  lastDailyReset: Date.now(),

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  setTimeSpeed: (speed: number) => set({ timeSpeed: speed }),
  reset: () =>
    set({
      parameters: { ...DEFAULT_PHYSIOLOGY },
      activeEvents: [],
      eventQueue: [],
      actionCooldowns: [],
      recentActions: [],
      notifications: [],
      activeCombo: null,
      comboScore: 0,
      dailyQuests: resetDailyQuests(),
      storyQuests: [...STORY_QUESTS],
      lastDailyReset: Date.now(),
      isRunning: true,
      timeSpeed: 1,
    }),

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    let params = { ...state.parameters };

    // Update time with speed multiplier
    const adjustedTickInterval = TICK_INTERVAL * state.timeSpeed;
    params.time += adjustedTickInterval;

    // Apply active event effects (scaled by time speed)
    const updatedEvents: ActiveEvent[] = [];
    state.activeEvents.forEach((ae) => {
      const newTime = ae.remainingTime - adjustedTickInterval;
      if (newTime > 0) {
        // Apply ongoing effects (scaled per tick and time speed)
        Object.entries(ae.event.effects).forEach(([key, value]) => {
          if (value && key in params) {
            const scaledEffect = (value / ae.event.duration) * adjustedTickInterval;
            (params as any)[key] += scaledEffect;
          }
        });
        updatedEvents.push({ ...ae, remainingTime: newTime });
      }
    });

    // Update cooldowns (scaled by time speed)
    const updatedCooldowns = state.actionCooldowns
      .map((cd) => ({
        ...cd,
        remainingTime: cd.remainingTime - adjustedTickInterval,
      }))
      .filter((cd) => cd.remainingTime > 0);

    // Random event generation
    const randomEvent = getRandomEvent();
    if (randomEvent && updatedEvents.length < 3) {
      updatedEvents.push({
        event: randomEvent,
        remainingTime: randomEvent.duration,
      });
      // Limit notifications to last 20 to prevent memory issues
      const newNotifications = [
        ...state.notifications,
        `${randomEvent.title}: ${randomEvent.description}`,
      ];
      set({
        notifications: newNotifications.slice(-20), // Keep only last 20
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

    // === BODY COMPOSITION & ENERGY BALANCE ===

    // Metabolic rate affected by thyroid and lean mass
    const baseMetabolicRate = 1800;
    params.metabolicRate = baseMetabolicRate * (params.thyroid / 60) * (params.leanMass / 56);

    // Energy balance affects body mass
    const energyDelta = params.energy - 50; // Positive = surplus, negative = deficit

    // mTOR promotes anabolism (muscle growth)
    if (params.mtor > 60 && params.energy > 60) {
      params.leanMass += 0.001; // Slow muscle gain
      params.bodyMass += 0.001;
    }

    // AMPK promotes catabolism (fat burning)
    if (params.ampk > 60 && energyDelta < 0) {
      params.fatMass -= 0.002; // Fat loss when in deficit
      params.bodyMass -= 0.002;
    }

    // Chronic energy deficit = muscle catabolism + fat loss
    if (params.energy < 30) {
      params.leanMass -= 0.003; // Muscle loss in starvation
      params.fatMass -= 0.005; // Fat loss
      params.bodyMass -= 0.008;
    }

    // Chronic energy surplus = fat accumulation
    if (params.energy > 80 && params.glucose > 120) {
      params.fatMass += 0.004; // Fat gain
      params.bodyMass += 0.004;
    }

    // Maintain minimum viable mass (starvation limit)
    params.leanMass = Math.max(40, params.leanMass); // Min lean mass
    params.fatMass = Math.max(5, params.fatMass); // Min essential fat
    params.bodyMass = params.leanMass + params.fatMass;

    // Maximum mass (obesity limit)
    params.bodyMass = Math.min(150, params.bodyMass);

    // Calculate BMI (assuming height = 1.75m)
    const height = 1.75; // meters
    params.bmi = params.bodyMass / (height * height);

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

    // === PHASE 2: NEW ATP BALANCE SYSTEM ===
    // Calculate ATP production and consumption with new physiology model

    // 1. CALCULATE ATP PRODUCTION (mmol/s)
    const baseProduction = 50; // mmol/s base
    const glucoseModifier = params.glucose / 90; // glicose normal = 1.0
    const oxygenModifier = params.bloodOxygen / 98; // O2 normal = 1.0
    const thyroidModifier = params.thyroid / 60; // tireoide normal = 1.0

    params.atpProduction = baseProduction * glucoseModifier * oxygenModifier * thyroidModifier;
    params.atpProduction = Math.max(5, Math.min(200, params.atpProduction));

    // 2. CALCULATE ATP CONSUMPTION (mmol/s)
    // Base consumption from basal metabolic rate
    const basalConsumption = 45; // mmol/s at rest
    const activityMultiplier = 1 + (params.heartRate - 70) / 130; // mais atividade = mais consumo

    params.atpConsumption = basalConsumption * activityMultiplier;
    params.atpConsumption = Math.max(30, Math.min(150, params.atpConsumption));

    // 3. CALCULATE ATP BALANCE
    params.atpBalance = params.atpProduction - params.atpConsumption;

    // 4. MANAGE ENERGY STORES (BIOMASS CONVERSION)
    const atpDelta = params.atpBalance * adjustedTickInterval;

    if (atpDelta > 0) {
      // SURPLUS: Convert excess ATP to biomass
      const excessATP = atpDelta;

      // Prioritize glycogen (up to 600g max)
      if (params.glycogen < 600) {
        const glycogenIncrease = Math.min(excessATP * 0.1, 600 - params.glycogen);
        params.glycogen += glycogenIncrease;
      } else {
        // Glycogen full -> store as fat (less efficient)
        const fatIncrease = excessATP * 0.05;
        params.adiposeTissue += fatIncrease / 1000; // g to kg
      }
    } else if (atpDelta < 0) {
      // DEFICIT: Break down reserves to compensate
      const deficit = Math.abs(atpDelta);

      // Prioritize glycogen first
      if (params.glycogen > 0) {
        const glycogenDecrease = Math.min(deficit * 0.1, params.glycogen);
        params.glycogen -= glycogenDecrease;
      } else if (params.adiposeTissue > 5) {
        // Then fat (slower mobilization)
        const fatDecrease = deficit * 0.03;
        params.adiposeTissue -= fatDecrease / 1000;
      } else {
        // CRITICAL: No reserves left -> track organ damage
        // This will be expanded in Phase 2.3
        params.allostaticLoad += deficit * 0.5;
      }
    }

    // Clamp biomass reserves
    params.glycogen = Math.max(0, Math.min(600, params.glycogen));
    params.adiposeTissue = Math.max(5, Math.min(50, params.adiposeTissue));

    // 5. CALCULATE HOMEOSTASIS SCORE (0-100)
    let homeostasisScore = 100;

    // Penalize deviations from ideal ranges
    const deviations = [
      Math.abs(params.heartRate - 70) / 130,
      Math.abs(params.respiratoryRate - 14) / 26,
      Math.abs(params.glucose - 90) / 90,
      Math.abs(params.temperature - 36.8) / 5.2,
      Math.abs(params.pH - 7.4) / 0.4,
      Math.abs(params.bloodOxygen - 98) / 28,
    ];

    deviations.forEach(deviation => {
      homeostasisScore -= deviation * 20;
    });

    params.homeostasisScore = Math.max(0, Math.min(100, homeostasisScore));

    // 6. UPDATE ALLOSTATIC LOAD (chronic stress accumulation)
    let allostaticLoadIncrease = 0;

    if (params.cortisol > 60) allostaticLoadIncrease += (params.cortisol - 60) * 0.01;
    if (params.glucose > 140) allostaticLoadIncrease += (params.glucose - 140) * 0.002;
    if (params.bloodOxygen < 90) allostaticLoadIncrease += (90 - params.bloodOxygen) * 0.05;
    if (params.temperature > 37.5) allostaticLoadIncrease += (params.temperature - 37.5) * 0.2;
    if (params.stress > 50) allostaticLoadIncrease += (params.stress - 50) * 0.01;

    params.allostaticLoad += allostaticLoadIncrease * adjustedTickInterval;

    // Natural recovery (sleep, rest reduces load)
    if (params.stress < 30 && params.homeostasisScore > 70) {
      params.allostaticLoad -= 0.1 * adjustedTickInterval;
    }

    params.allostaticLoad = Math.max(0, Math.min(100, params.allostaticLoad));

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
          `⏳ ${action.name} está em cooldown`,
        ].slice(-20),
      });
      return;
    }

    // Check energy cost
    if (action.cost && state.parameters.energy < action.cost) {
      set({
        notifications: [
          ...state.notifications,
          `⚠️ Energia insuficiente para ${action.name}`,
        ].slice(-20),
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

    // Add to recent actions for combo tracking
    const newRecentActions: RecentAction[] = [
      ...state.recentActions,
      { actionId: action.id, timestamp: params.time },
    ];

    // Clean up old actions (older than 30 seconds)
    const cleanedRecentActions = newRecentActions.filter(
      (a) => params.time - a.timestamp <= 30
    );

    // Check for combos
    const detectedCombo = checkForCombo(cleanedRecentActions, params.time);
    let comboNotification = '';
    let newComboScore = state.comboScore;

    if (detectedCombo && detectedCombo !== state.activeCombo) {
      // Apply combo bonus
      Object.entries(detectedCombo.bonus).forEach(([key, value]) => {
        if (value && key in params) {
          (params as any)[key] += value;
        }
      });
      comboNotification = `🌟 COMBO! ${detectedCombo.description}`;
      newComboScore += 100;
    }

    // Evaluate action effectiveness for active events
    let eventFeedback = '';
    state.activeEvents.forEach((ae) => {
      const evaluation = evaluateActionForEvent(
        action.id,
        ae.event.id,
        params
      );

      if (evaluation.isOptimal) {
        // Apply bonus from optimal solution
        const solution = EVENT_SOLUTIONS[ae.event.id];
        if (solution?.bonus) {
          Object.entries(solution.bonus).forEach(([key, value]) => {
            if (value && key in params) {
              (params as any)[key] += value;
            }
          });
        }
        eventFeedback = evaluation.feedback;
        newComboScore += 50;
      } else if (evaluation.effectiveness < 0.5) {
        // Apply penalty for suboptimal action
        const solution = EVENT_SOLUTIONS[ae.event.id];
        if (solution?.penalty) {
          Object.entries(solution.penalty).forEach(([key, value]) => {
            if (value && key in params) {
              (params as any)[key] += value;
            }
          });
        }
        eventFeedback = evaluation.feedback;
      }
    });

    // Add cooldown
    const newCooldowns = [
      ...state.actionCooldowns,
      { actionId: action.id, remainingTime: action.cooldown },
    ];

    // Collect all notifications (limit to last 20)
    const newNotifications = [
      ...state.notifications,
      `✅ ${action.name}`,
    ];

    if (comboNotification) {
      newNotifications.push(comboNotification);
    }

    if (eventFeedback) {
      newNotifications.push(eventFeedback);
    }

    set({
      parameters: params,
      actionCooldowns: newCooldowns,
      recentActions: cleanedRecentActions.slice(-10), // Keep only last 10 actions
      activeCombo: detectedCombo,
      comboScore: newComboScore,
      notifications: newNotifications.slice(-20), // Keep only last 20 notifications
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

  updateQuests: (gameState: any) => {
    const state = get();
    const deltaTime = TICK_INTERVAL * state.timeSpeed;

    // Update daily quests
    const updatedDaily = updateQuestProgress(
      state.dailyQuests,
      gameState,
      state.parameters,
      deltaTime
    );

    // Update story quests
    let updatedStory = updateQuestProgress(
      state.storyQuests,
      gameState,
      state.parameters,
      deltaTime
    );

    // Check for unlocks
    updatedStory = checkQuestUnlocks(updatedStory);

    set({
      dailyQuests: updatedDaily,
      storyQuests: updatedStory,
    });
  },

  checkDailyReset: () => {
    const state = get();
    const now = Date.now();
    const hoursSinceReset = (now - state.lastDailyReset) / (1000 * 60 * 60);

    // Reset after 24 hours
    if (hoursSinceReset >= 24) {
      set({
        dailyQuests: resetDailyQuests(),
        lastDailyReset: now,
      });
    }
  },
}));
