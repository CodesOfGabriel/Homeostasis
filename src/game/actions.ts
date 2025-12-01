// Actions that the player (neuron commander) can take
// These are neurohormonal interventions to control the body

export interface PlayerAction {
  id: string;
  name: string;
  description: string;
  cooldown: number; // seconds
  effects: {
    adrenaline?: number;
    cortisol?: number;
    insulin?: number;
    stress?: number;
    energy?: number;
    heartRate?: number;
    respiratoryRate?: number;
  };
  cost?: number; // energy cost
}

export const ACTIONS: Record<string, PlayerAction> = {
  releaseAdrenaline: {
    id: 'releaseAdrenaline',
    name: '💉 Liberar Adrenalina',
    description: 'Descarga emergencial de epinefrina. Aumenta FC e alerta.',
    cooldown: 20,
    effects: {
      adrenaline: 30,
      heartRate: 20,
      energy: 10,
    },
    cost: 10,
  },

  reduceCortisol: {
    id: 'reduceCortisol',
    name: '🧘‍♂️ Reduzir Cortisol',
    description: 'Ativar resposta parassimpática. Baixar hormônios do stress.',
    cooldown: 25,
    effects: {
      cortisol: -25,
      stress: -20,
      heartRate: -10,
    },
    cost: 5,
  },

  increaseVentilation: {
    id: 'increaseVentilation',
    name: '💨 Aumentar Ventilação',
    description: 'Aumentar frequência respiratória. Melhorar oxigenação.',
    cooldown: 15,
    effects: {
      respiratoryRate: 8,
    },
    cost: 5,
  },

  releaseInsulin: {
    id: 'releaseInsulin',
    name: '🍬 Liberar Insulina',
    description: 'Secreção pancreática de insulina. Reduz glicose sanguínea.',
    cooldown: 30,
    effects: {
      insulin: 25,
    },
    cost: 5,
  },

  releaseGlucose: {
    id: 'releaseGlucose',
    name: '⚡ Liberar Glicose',
    description: 'Quebra de glicogênio hepático. Energia rápida.',
    cooldown: 20,
    effects: {
      energy: 20,
    },
    cost: 0,
  },

  vasodilation: {
    id: 'vasodilation',
    name: '🔄 Vasodilatação',
    description: 'Dilatar vasos sanguíneos. Melhorar perfusão muscular.',
    cooldown: 25,
    effects: {
      stress: -10,
      heartRate: -5,
    },
    cost: 8,
  },
};

export interface ActionCooldown {
  actionId: string;
  remainingTime: number;
}
