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
    name: '💉 CRH → ACTH → Catecolaminas',
    description: 'Via eixo HPA: CRH hipotalâmico → ACTH pituitária → adrenalina/noradrenalina',
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
    name: '🧘‍♂️ Somatostatina',
    description: 'Liberar somatostatina hipotalâmica. Inibe CRH/ACTH → ↓ cortisol',
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
    name: '💨 Centros Respiratórios',
    description: 'Ativar núcleos bulbares via hipotálamo. ↑ frequência respiratória',
    cooldown: 15,
    effects: {
      respiratoryRate: 8,
    },
    cost: 5,
  },

  releaseInsulin: {
    id: 'releaseInsulin',
    name: '🍬 Inibir Glucagon',
    description: 'Via parassimpática: ↓ glucagon → ↑ insulina pancreática relativa',
    cooldown: 30,
    effects: {
      insulin: 25,
    },
    cost: 5,
  },

  releaseGlucose: {
    id: 'releaseGlucose',
    name: '⚡ Orexina → Glicogenólise',
    description: 'Orexina hipotalâmica → ativação simpática → quebra glicogênio hepático',
    cooldown: 20,
    effects: {
      energy: 20,
    },
    cost: 0,
  },

  vasodilation: {
    id: 'vasodilation',
    name: '🔄 Ocitocina',
    description: 'Liberar ocitocina hipotalâmica. Vasodilatação e ↓ pressão arterial',
    cooldown: 25,
    effects: {
      stress: -10,
      heartRate: -5,
    },
    cost: 8,
  },

  // New therapeutic actions - Hypothalamic Control
  antioxidantBoost: {
    id: 'antioxidantBoost',
    name: '🛡️ α-MSH (Melanocortina)',
    description: 'α-MSH hipotalâmico. Ativa Nrf2, ↓ estresse oxidativo via MC receptores',
    cooldown: 35,
    effects: {
      stress: -15,
    },
    cost: 10,
  },

  antiInflammatory: {
    id: 'antiInflammatory',
    name: '🧊 Via Colinérgica Anti-inflam',
    description: 'Nervo vago → liberação ACh → ↓ NF-κB em macrófagos (reflexo inflamatório)',
    cooldown: 40,
    effects: {
      cortisol: 15,
      stress: -20,
    },
    cost: 12,
  },

  metabolicSwitch: {
    id: 'metabolicSwitch',
    name: '⚡ Grelina → AMPK',
    description: 'Grelina hipotalâmica. Ativa AMPK periférico → ↑ oxidação lipídica',
    cooldown: 30,
    effects: {
      energy: 25,
      stress: -10,
    },
    cost: 8,
  },

  hydrationBoost: {
    id: 'hydrationBoost',
    name: '💧 AVP (Vasopressina)',
    description: 'AVP do núcleo supraóptico → receptores V2 renais → retenção hídrica',
    cooldown: 20,
    effects: {
      heartRate: -8,
      stress: -5,
    },
    cost: 5,
  },

  thermoregulation: {
    id: 'thermoregulation',
    name: '🌡️ TRH → Tireoide',
    description: 'TRH hipotalâmico → TSH → T3/T4 → termogênese e metabolismo basal',
    cooldown: 25,
    effects: {
      stress: -10,
      energy: 10,
    },
    cost: 6,
  },

  oxygenationBoost: {
    id: 'oxygenationBoost',
    name: '🫁 Quimiorreceptores',
    description: 'Via núcleo do trato solitário → ventilação reflexa → ↑ pO2',
    cooldown: 20,
    effects: {
      respiratoryRate: 5,
    },
    cost: 7,
  },

  detoxification: {
    id: 'detoxification',
    name: '🧹 GLP-1 Hepático',
    description: 'GLP-1 via nervo vago → ativação enzimas fase I/II hepáticas',
    cooldown: 45,
    effects: {
      stress: -15,
      energy: 10,
    },
    cost: 10,
  },

  renalSupport: {
    id: 'renalSupport',
    name: '🫘 ANP/BNP Balance',
    description: 'Modulação simpática renal. ↑ peptídeos natriuréticos → natriurese/diurese',
    cooldown: 35,
    effects: {
      stress: -10,
    },
    cost: 8,
  },

  anabolicPush: {
    id: 'anabolicPush',
    name: '💪 GHRH → GH → IGF-1',
    description: 'GHRH hipotalâmico → GH pituitária → IGF-1 hepático → ativa mTOR',
    cooldown: 50,
    effects: {
      energy: 20,
    },
    cost: 15,
  },

  neurotransmitterBalance: {
    id: 'neurotransmitterBalance',
    name: '🧠 Dopamina/Serotonina',
    description: 'Modular núcleos tuberomamilares. ↑ dopamina VTA, ↑ serotonina raphé',
    cooldown: 30,
    effects: {
      stress: -20,
      cortisol: -15,
    },
    cost: 10,
  },

  // ========== MISSING HYPOTHALAMIC ACTIONS ==========

  // Sleep-Wake Cycle Control
  sleepDrive: {
    id: 'sleepDrive',
    name: '😴 VLPO → Sono',
    description: 'Núcleo pré-óptico ventrolateral: ↑ GABA/galanina → inibe orexina → induz sono',
    cooldown: 60,
    effects: {
      stress: -25,
      cortisol: -20,
      energy: 15,
      heartRate: -15,
    },
    cost: 5,
  },

  wakefulnessBoost: {
    id: 'wakefulnessBoost',
    name: '⚡ Orexina/Hipocretina',
    description: 'Neurônios orexinérgicos laterais: promove vigília, ↑ alerta, inibe sono REM',
    cooldown: 25,
    effects: {
      energy: 25,
      adrenaline: 15,
      stress: 10,
    },
    cost: 12,
  },

  // Appetite and Satiety Control
  hungerSignal: {
    id: 'hungerSignal',
    name: '🍽️ NPY/AgRP → Fome',
    description: 'Núcleo arqueado: NPY/AgRP → ↑ apetite, ↓ gasto energético, ↑ grelina',
    cooldown: 40,
    effects: {
      energy: -15,
      stress: 10,
    },
    cost: 0,
  },

  satietySignal: {
    id: 'satietySignal',
    name: '🥗 POMC/CART → Saciedade',
    description: 'Núcleo arqueado: POMC/CART → ↑ saciedade via α-MSH, ↑ gasto energético',
    cooldown: 35,
    effects: {
      stress: -10,
      energy: 10,
    },
    cost: 5,
  },

  leptinResponse: {
    id: 'leptinResponse',
    name: '⚖️ Via Leptina',
    description: 'Sensibilizar receptores de leptina no arqueado: ↓ fome, ↑ metabolismo',
    cooldown: 50,
    effects: {
      energy: 15,
      stress: -10,
    },
    cost: 8,
  },

  // Sympathetic vs Parasympathetic Balance
  sympatheticDrive: {
    id: 'sympatheticDrive',
    name: '⚔️ Simpático Máximo',
    description: 'PVN → coluna intermediolateral: descarga simpática total (fight or flight)',
    cooldown: 30,
    effects: {
      adrenaline: 40,
      heartRate: 30,
      energy: 15,
      stress: 20,
    },
    cost: 15,
  },

  parasympatheticDrive: {
    id: 'parasympatheticDrive',
    name: '🕊️ Parassimpático Máximo',
    description: 'Via núcleo dorsal do vago: rest and digest, ↓ FC, ↑ digestão',
    cooldown: 35,
    effects: {
      heartRate: -20,
      stress: -25,
      cortisol: -20,
      respiratoryRate: -5,
    },
    cost: 5,
  },

  // Temperature Regulation
  heatProduction: {
    id: 'heatProduction',
    name: '🔥 Termogênese (BAT)',
    description: 'Área pré-óptica posterior → ativa gordura marrom → produção de calor',
    cooldown: 30,
    effects: {
      energy: -15,
      stress: 5,
    },
    cost: 10,
  },

  coolDown: {
    id: 'coolDown',
    name: '❄️ Dissipação de Calor',
    description: 'Área pré-óptica anterior → vasodilatação cutânea + sudorese',
    cooldown: 25,
    effects: {
      heartRate: -5,
      stress: -10,
    },
    cost: 8,
  },

  // Circadian Rhythm Control
  circadianReset: {
    id: 'circadianReset',
    name: '🌅 NSQ → Ritmo Circadiano',
    description: 'Núcleo supraquiasmático: reset do relógio biológico via melanopsina',
    cooldown: 120,
    effects: {
      stress: -15,
      energy: 10,
    },
    cost: 10,
  },

  melatoninRelease: {
    id: 'melatoninRelease',
    name: '🌙 Melatonina Pineal',
    description: 'NSQ → glândula pineal: ↑ melatonina → induz sono, antioxidante',
    cooldown: 45,
    effects: {
      stress: -20,
      cortisol: -15,
      energy: 10,
      heartRate: -10,
    },
    cost: 5,
  },

  // Reproductive Axis
  gnrhPulse: {
    id: 'gnrhPulse',
    name: '💑 GnRH Pulsátil',
    description: 'Pulsos de GnRH → LH/FSH pituitária → esteroides sexuais (testosterona/estradiol)',
    cooldown: 60,
    effects: {
      energy: 15,
      stress: -10,
    },
    cost: 10,
  },

  // Thirst and Osmolarity
  thirstDrive: {
    id: 'thirstDrive',
    name: '💦 Osmorreceptores → Sede',
    description: 'OVLT detecta osmolaridade: ↑ sede, ↑ AVP se desidratado',
    cooldown: 20,
    effects: {
      stress: 10,
    },
    cost: 0,
  },

  // Pain and Pleasure Modulation
  endorphinRelease: {
    id: 'endorphinRelease',
    name: '😌 Endorfinas/Encefalinas',
    description: 'Núcleo arqueado → β-endorfinas: analgesia, euforia, ↓ stress',
    cooldown: 40,
    effects: {
      stress: -30,
      cortisol: -20,
      energy: 10,
    },
    cost: 10,
  },

  painModulation: {
    id: 'painModulation',
    name: '🎛️ Modulação Nociceptiva',
    description: 'PAG + RVM: sistema descendente de controle da dor',
    cooldown: 30,
    effects: {
      stress: -15,
    },
    cost: 8,
  },

  // Defensive Behaviors
  freezeResponse: {
    id: 'freezeResponse',
    name: '🧊 Resposta de Congelamento',
    description: 'Hipotálamo dorsomedial → bradicardia, imobilidade (medo extremo)',
    cooldown: 45,
    effects: {
      heartRate: -25,
      respiratoryRate: -8,
      stress: 30,
      energy: -10,
    },
    cost: 5,
  },

  aggressionDrive: {
    id: 'aggressionDrive',
    name: '⚔️ Drive Agressivo',
    description: 'Hipotálamo ventromedial: comportamento agressivo/defensivo',
    cooldown: 35,
    effects: {
      adrenaline: 35,
      heartRate: 25,
      stress: 25,
      energy: -10,
    },
    cost: 12,
  },

  // Immune System Modulation
  immunoBoost: {
    id: 'immunoBoost',
    name: '🛡️ Imunomodulação',
    description: 'Via HPA: cortisol controlado + citocinas → balanço imune',
    cooldown: 50,
    effects: {
      stress: -15,
      cortisol: 10,
    },
    cost: 10,
  },

  feverResponse: {
    id: 'feverResponse',
    name: '🌡️ Resposta Febril',
    description: 'Área pré-óptica: PGE2 → ↑ set point térmico → febre (defesa)',
    cooldown: 60,
    effects: {
      energy: -20,
      stress: 15,
    },
    cost: 15,
  },

  // Metabolic Hormones
  thyroidBoost: {
    id: 'thyroidBoost',
    name: '⚡ TRH Intenso',
    description: 'Descarga de TRH → pico TSH → T3/T4 rápido → ↑↑ metabolismo',
    cooldown: 45,
    effects: {
      energy: 30,
      heartRate: 15,
      stress: 10,
    },
    cost: 12,
  },

  prolactinSuppress: {
    id: 'prolactinSuppress',
    name: '🔽 Dopamina Tuberoinfundibular',
    description: 'Dopamina do núcleo arqueado → inibe prolactina (lactotropos)',
    cooldown: 40,
    effects: {
      stress: -10,
      energy: 5,
    },
    cost: 5,
  },

  // Emergency Overrides
  lastResort: {
    id: 'lastResort',
    name: '🚨 Overdrive Total',
    description: 'EMERGÊNCIA: Todos os eixos em máximo. CRH+TRH+GnRH+GHRH simultâneos',
    cooldown: 180,
    effects: {
      adrenaline: 50,
      cortisol: 30,
      energy: 40,
      heartRate: 40,
      respiratoryRate: 15,
      stress: 40,
    },
    cost: 30,
  },
};

export interface ActionCooldown {
  actionId: string;
  remainingTime: number;
}
