// Event system for the Body Ops simulation
// Defines narrative events that can occur during gameplay

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  effects: {
    stress?: number;
    adrenaline?: number;
    cortisol?: number;
    energy?: number;
    heartRate?: number;
    glucose?: number;
  };
  icon?: string;
}

export const EVENTS: Record<string, GameEvent> = {
  stressWork: {
    id: 'stressWork',
    title: '⚠️ Deadline Approaching',
    description: 'High-priority work deadline detected. Cortisol rising.',
    duration: 30,
    effects: {
      stress: 25,
      cortisol: 20,
      adrenaline: 10,
    },
  },

  cigarette: {
    id: 'cigarette',
    title: '🚬 Cigarette Consumed',
    description: 'Nicotine intake. Vasoconstriction and HR increase.',
    duration: 20,
    effects: {
      heartRate: 15,
      adrenaline: 15,
      stress: -5,
    },
  },

  exercise: {
    id: 'exercise',
    title: '🏃 Physical Exercise',
    description: 'Aerobic activity detected. Metabolic demand increased.',
    duration: 45,
    effects: {
      heartRate: 40,
      adrenaline: 30,
      energy: -20,
      glucose: -15,
    },
  },

  coffee: {
    id: 'coffee',
    title: '☕ Caffeine Intake',
    description: 'Adenosine receptor blocked. Alertness increased.',
    duration: 25,
    effects: {
      heartRate: 10,
      adrenaline: 12,
      energy: 15,
    },
  },

  meditation: {
    id: 'meditation',
    title: '🧘 Meditation Session',
    description: 'Parasympathetic activation. Stress levels decreasing.',
    duration: 35,
    effects: {
      stress: -30,
      cortisol: -15,
      heartRate: -10,
    },
  },

  hunger: {
    id: 'hunger',
    title: '🍽️ Low Blood Sugar',
    description: 'Glucose levels dropping. Energy conservation mode.',
    duration: 20,
    effects: {
      glucose: -20,
      energy: -15,
      cortisol: 10,
    },
  },

  sleep: {
    id: 'sleep',
    title: '😴 Sleep Deprivation',
    description: 'Inadequate rest. Cognitive function impaired.',
    duration: 40,
    effects: {
      energy: -25,
      stress: 15,
      cortisol: 15,
    },
  },
};

export function getRandomEvent(): GameEvent | null {
  const events = Object.values(EVENTS);
  const random = Math.random();

  // 5% chance per tick (at 200ms = ~25% per second)
  if (random < 0.01) {
    return events[Math.floor(Math.random() * events.length)];
  }

  return null;
}
