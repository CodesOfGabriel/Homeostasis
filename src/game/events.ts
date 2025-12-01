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
    insulin?: number;
    lactate?: number;
    respiratoryRate?: number;
    temperature?: number;
    bloodOxygen?: number;
  };
  icon?: string;
}

export const EVENTS: Record<string, GameEvent> = {
  stressWork: {
    id: 'stressWork',
    title: '⚠️ Prazo se Aproximando',
    description: 'Deadline de trabalho urgente detectado. Cortisol elevando.',
    duration: 30,
    effects: {
      stress: 25,
      cortisol: 20,
      adrenaline: 10,
    },
  },

  cigarette: {
    id: 'cigarette',
    title: '🚬 Cigarro Consumido',
    description: 'Ingestão de nicotina. Vasoconstrição e aumento de FC.',
    duration: 20,
    effects: {
      heartRate: 15,
      adrenaline: 15,
      stress: -5,
    },
  },

  exercise: {
    id: 'exercise',
    title: '🏃 Exercício Físico',
    description: 'Atividade aeróbica detectada. Demanda metabólica aumentada.',
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
    title: '☕ Ingestão de Cafeína',
    description: 'Receptores de adenosina bloqueados. Alerta aumentado.',
    duration: 25,
    effects: {
      heartRate: 10,
      adrenaline: 12,
      energy: 15,
    },
  },

  meditation: {
    id: 'meditation',
    title: '🧘 Sessão de Meditação',
    description: 'Ativação parassimpática. Níveis de estresse diminuindo.',
    duration: 35,
    effects: {
      stress: -30,
      cortisol: -15,
      heartRate: -10,
    },
  },

  hunger: {
    id: 'hunger',
    title: '🍽️ Glicemia Baixa',
    description: 'Níveis de glicose caindo. Modo de conservação de energia.',
    duration: 20,
    effects: {
      glucose: -20,
      energy: -15,
      cortisol: 10,
    },
  },

  sleep: {
    id: 'sleep',
    title: '😴 Privação de Sono',
    description: 'Descanso inadequado. Função cognitiva prejudicada.',
    duration: 40,
    effects: {
      energy: -25,
      stress: 15,
      cortisol: 15,
    },
  },

  // New metabolic events
  hyperglycemia: {
    id: 'hyperglycemia',
    title: '🍬 Hiperglicemia',
    description: 'Pico de açúcar no sangue detectado. Resistência à insulina aumentando.',
    duration: 30,
    effects: {
      glucose: 40,
      insulin: -10,
      stress: 10,
    },
  },

  acidosis: {
    id: 'acidosis',
    title: '🧪 Acidose Metabólica',
    description: 'pH caindo. Acúmulo de lactato detectado.',
    duration: 35,
    effects: {
      stress: 20,
      lactate: 2,
      heartRate: 12,
    },
  },

  hypoxia: {
    id: 'hypoxia',
    title: '😮‍💨 Hipóxia Tecidual',
    description: 'Entrega de oxigênio insuficiente. Mecanismos compensatórios ativos.',
    duration: 25,
    effects: {
      heartRate: 25,
      adrenaline: 20,
      stress: 15,
    },
  },

  inflammation: {
    id: 'inflammation',
    title: '🔥 Inflamação Aguda',
    description: 'Resposta inflamatória detectada. Citocinas elevadas.',
    duration: 45,
    effects: {
      stress: 25,
      cortisol: 20,
      energy: -15,
    },
  },

  dehydration: {
    id: 'dehydration',
    title: '💧 Desidratação',
    description: 'Perda de fluidos detectada. Viscosidade sanguínea aumentando.',
    duration: 30,
    effects: {
      heartRate: 15,
      stress: 10,
      energy: -10,
    },
  },

  coldExposure: {
    id: 'coldExposure',
    title: '🥶 Exposição ao Frio',
    description: 'Queda de temperatura. Termogênese ativada.',
    duration: 20,
    effects: {
      heartRate: 10,
      energy: -15,
      adrenaline: 15,
    },
  },

  heatStress: {
    id: 'heatStress',
    title: '🥵 Estresse Térmico',
    description: 'Temperatura corporal subindo. Vasodilatação necessária.',
    duration: 25,
    effects: {
      heartRate: 20,
      stress: 15,
      energy: -10,
    },
  },

  anaemiaEpisode: {
    id: 'anaemiaEpisode',
    title: '🩸 Hemoglobina Baixa',
    description: 'Capacidade de transporte de oxigênio reduzida. Fadiga aumentando.',
    duration: 60,
    effects: {
      heartRate: 15,
      energy: -20,
      stress: 10,
    },
  },

  kidneyStrain: {
    id: 'kidneyStrain',
    title: '🫘 Sobrecarga Renal',
    description: 'Taxa de filtração diminuindo. Acúmulo de toxinas.',
    duration: 50,
    effects: {
      stress: 20,
      energy: -15,
    },
  },

  liverOverload: {
    id: 'liverOverload',
    title: '🏥 Sobrecarga Hepática',
    description: 'Capacidade de processamento metabólico excedida.',
    duration: 40,
    effects: {
      stress: 15,
      energy: -20,
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
