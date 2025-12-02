# 🔬 PLANO DE REFATORAÇÃO FISIOLÓGICA - Homeostasis v2.0

## 📋 Visão Geral

Transformar o sistema de "acumular moeda" em "gestão de fluxo e sobrevivência" mantendo as mecânicas de idle game, mas com base fisiológica real.

---

## 🎯 FASE 1: Novos Tipos e Interfaces (SEM QUEBRAR O CÓDIGO ATUAL)

### 1.1 Adicionar novos campos à interface Physiology

```typescript
// ADICIONAR ao physiology.ts (não remover campos antigos ainda)

export interface Physiology {
  // ... campos existentes ...
  
  // ========== NOVOS CAMPOS FISIOLÓGICOS ==========
  
  // Homeostase e Carga Alostática
  homeostasisScore: number;        // 0-100 (quão bem o corpo está)
  allostaticLoad: number;          // 0-100 (carga de estresse crônico)
  
  // Fluxo Energético Real (não é moeda de jogo)
  atpProduction: number;           // mmol/s (produção celular real)
  atpConsumption: number;          // mmol/s (consumo celular real)
  atpBalance: number;              // mmol/s (produção - consumo)
  
  // Estoques Metabólicos (biomassa)
  glycogen: number;                // g (glicogênio hepático/muscular)
  adiposeTissue: number;           // kg (gordura armazenada)
  proteinReserve: number;          // g (proteína estrutural disponível)
  
  // Drives Comportamentais (NPC)
  hungerDrive: number;             // 0-100
  thirstDrive: number;             // 0-100
  sleepDrive: number;              // 0-100
  exerciseDrive: number;           // 0-100
  
  // Micronutrientes (para upgrades de eficiência)
  vitamins: number;                // 0-100 (vitaminas gerais)
  minerals: number;                // 0-100 (minerais gerais)
  aminoAcids: number;              // 0-100 (proteínas disponíveis)
}

export const DEFAULT_PHYSIOLOGY: Physiology = {
  // ... valores existentes ...
  
  // NOVOS VALORES PADRÃO
  homeostasisScore: 80,
  allostaticLoad: 10,
  
  atpProduction: 50,     // mmol/s base
  atpConsumption: 45,    // mmol/s base
  atpBalance: 5,         // excesso convertido em biomassa
  
  glycogen: 500,         // 500g (máximo ~600g)
  adiposeTissue: 14,     // 14kg (20% de 70kg)
  proteinReserve: 200,   // 200g disponíveis
  
  hungerDrive: 30,
  thirstDrive: 20,
  sleepDrive: 25,
  exerciseDrive: 40,
  
  vitamins: 80,
  minerals: 80,
  aminoAcids: 70,
};
```

### 1.2 Nova Interface de Órgão (Fisiológico)

```typescript
// CRIAR NOVO ARQUIVO: src/game/physiologyOrgans.ts

export interface PhysiologicalOrgan {
  id: string;
  name: string;
  icon: string;
  
  // Capacidade Funcional
  capacity: number;           // 0-100 (DC máximo, GFR máximo, etc.)
  efficiency: number;         // 0-100 (quanto ATP gasta por unidade de trabalho)
  robustness: number;         // 0-100 (resistência a estresse)
  
  // Custos e Outputs
  baseAtpConsumption: number; // mmol/s (custo basal)
  maxAtpConsumption: number;  // mmol/s (custo sob estresse)
  currentOutput: number;      // unidade específica do órgão
  
  // Adaptações Disponíveis
  hypertrophyLevel: number;   // 0-10 (aumenta capacity, aumenta custo)
  efficiencyLevel: number;    // 0-10 (reduz custo basal)
  
  // Estado de Saúde
  health: number;             // 0-100 (dano por falta de ATP)
  damage: number;             // 0-100 (dano acumulado)
  inflammation: number;       // 0-100 (inflamação local)
  
  // Requisitos para Upgrade
  hypertrophyRequirements: {
    biomass: number;          // custo em biomassa
    hormones: string[];       // hormônios necessários (ex: GH, testosterona)
    chronicUse: number;       // horas de uso contínuo necessárias
  };
  
  efficiencyRequirements: {
    micronutrients: number;   // vitaminas/minerais
    time: number;             // tempo de adaptação (horas)
    restTime: number;         // tempo de descanso necessário
  };
}

export const PHYSIOLOGICAL_ORGANS: Record<string, PhysiologicalOrgan> = {
  heart: {
    id: 'heart',
    name: 'Coração',
    icon: '🫀',
    capacity: 70,           // DC = 5L/min base
    efficiency: 50,
    robustness: 60,
    baseAtpConsumption: 10,  // mmol/s
    maxAtpConsumption: 30,   // sob esforço
    currentOutput: 5.0,      // L/min (DC)
    hypertrophyLevel: 0,
    efficiencyLevel: 0,
    health: 100,
    damage: 0,
    inflammation: 5,
    hypertrophyRequirements: {
      biomass: 100,          // 100g de proteína
      hormones: ['growthHormone', 'testosterone'],
      chronicUse: 20         // 20h de exercício contínuo
    },
    efficiencyRequirements: {
      micronutrients: 50,
      time: 72,              // 3 dias de adaptação
      restTime: 8            // 8h de sono
    }
  },
  
  // ... outros órgãos (lungs, liver, kidneys, brain, muscles)
};
```

### 1.3 Nova Moeda de Jogo (HomeostasisPoints)

```typescript
// ADICIONAR ao idleSystem.ts

export interface GameResources {
  // Moeda de Jogo (substitui ATP como moeda acumulativa)
  homeostasisPoints: number;     // moeda principal do jogo
  adaptationTokens: number;      // tokens especiais para upgrades raros
  
  // Recursos Fisiológicos (não são moeda, são estoques)
  biomass: number;               // g (glicogênio + gordura convertida)
  micronutrients: number;        // 0-100
  neurotransmitters: number;     // 0-100 (para liberar hormônios)
  
  // Métricas de Performance
  totalHomeostasisEarned: number;
  currentHomeostasisRate: number; // pontos/segundo
  longestHomeostasisStreak: number; // segundos em equilíbrio
}

export interface GameState {
  // ... campos existentes do idle game ...
  
  resources: GameResources;
  physiology: Physiology;  // link com physiology.ts
  physiologicalOrgans: Record<string, PhysiologicalOrgan>;
  
  // Políticas Ambientais (substituem ações diretas)
  policies: {
    dietPolicy: 'healthy' | 'ultraprocessed' | 'fasting';
    activityPolicy: 'sedentary' | 'moderate' | 'intense';
    sleepPolicy: 'deprived' | 'normal' | 'optimized';
  };
  
  // Comportamento NPC (avatar)
  npcBehavior: {
    lastMealTime: number;      // timestamp
    lastExerciseTime: number;
    lastSleepTime: number;
    stress: number;            // 0-100
  };
}
```

---

## 🎯 FASE 2: Lógica de Tick (Gestão de Fluxo)

### 2.1 Novo Tick Principal (calculatePhysiologyTick)

```typescript
// ADICIONAR ao simulationStore.ts (não substituir o tick antigo ainda)

function calculatePhysiologyTick(state: PhysiologyState): PhysiologyState {
  const dt = 0.2; // 200ms
  
  // 1. CALCULAR PRODUÇÃO E CONSUMO DE ATP
  const atpProduction = calculateATPProduction(state.physiology, state.physiologicalOrgans);
  const atpConsumption = calculateATPConsumption(state.physiologicalOrgans);
  const atpBalance = atpProduction - atpConsumption;
  
  // 2. GERENCIAR BALANÇO ENERGÉTICO
  let newGlycogen = state.physiology.glycogen;
  let newAdipose = state.physiology.adiposeTissue;
  let organDamage = 0;
  
  if (atpBalance > 0) {
    // EXCESSO: Converter em Biomassa (prioriza glicogênio, depois gordura)
    const excessATP = atpBalance * dt;
    
    if (newGlycogen < 600) {
      const glycogenIncrease = Math.min(excessATP * 0.1, 600 - newGlycogen);
      newGlycogen += glycogenIncrease;
    } else {
      const fatIncrease = excessATP * 0.05; // menos eficiente
      newAdipose += fatIncrease / 1000; // converter g para kg
    }
  } else if (atpBalance < 0) {
    // DÉFICIT: Quebrar reservas (prioriza glicogênio, depois gordura, depois dano)
    const deficit = Math.abs(atpBalance) * dt;
    
    if (newGlycogen > 0) {
      const glycogenDecrease = Math.min(deficit * 0.1, newGlycogen);
      newGlycogen -= glycogenDecrease;
    } else if (newAdipose > 5) {
      const fatDecrease = deficit * 0.03;
      newAdipose -= fatDecrease / 1000;
    } else {
      // CRÍTICO: Sem reservas, órgãos sofrem dano
      organDamage = Math.abs(deficit) * 0.5;
    }
  }
  
  // 3. APLICAR DANO A ÓRGÃOS (se houver déficit crítico)
  const newOrgans = { ...state.physiologicalOrgans };
  if (organDamage > 0) {
    Object.keys(newOrgans).forEach(organId => {
      newOrgans[organId] = {
        ...newOrgans[organId],
        health: Math.max(0, newOrgans[organId].health - organDamage),
        damage: Math.min(100, newOrgans[organId].damage + organDamage)
      };
    });
  }
  
  // 4. CALCULAR HOMEOSTASIS SCORE
  const homeostasisScore = calculateHomeostasisScore(state.physiology);
  
  // 5. CALCULAR CARGA ALOSTÁTICA
  const allostaticLoad = calculateAllostaticLoad(state.physiology);
  
  // 6. GERAR HOMEOSTASIS POINTS (recompensa por manter equilíbrio)
  let homeostasisPointsGain = 0;
  if (homeostasisScore > 70 && allostaticLoad < 30) {
    homeostasisPointsGain = (homeostasisScore / 100) * dt;
  }
  
  return {
    ...state,
    physiology: {
      ...state.physiology,
      atpProduction,
      atpConsumption,
      atpBalance,
      glycogen: newGlycogen,
      adiposeTissue: newAdipose,
      homeostasisScore,
      allostaticLoad
    },
    physiologicalOrgans: newOrgans,
    resources: {
      ...state.resources,
      homeostasisPoints: state.resources.homeostasisPoints + homeostasisPointsGain,
      currentHomeostasisRate: homeostasisPointsGain / dt
    }
  };
}

// Helper: Calcular produção de ATP (baseado em órgãos e metabolismo)
function calculateATPProduction(physiology: Physiology, organs: Record<string, PhysiologicalOrgan>): number {
  const baseProduction = 50; // mmol/s base
  
  // Modificadores
  const glucoseModifier = physiology.glucose / 90; // glicose normal = 1.0
  const oxygenModifier = physiology.bloodOxygen / 98; // O2 normal = 1.0
  const thyroidModifier = physiology.thyroid / 60; // tireoide normal = 1.0
  
  // Eficiência dos órgãos (fígado, músculos)
  const liverEfficiency = organs.liver ? organs.liver.efficiency / 100 : 1.0;
  const muscleEfficiency = organs.muscles ? organs.muscles.efficiency / 100 : 1.0;
  
  return baseProduction * glucoseModifier * oxygenModifier * thyroidModifier * liverEfficiency;
}

// Helper: Calcular consumo de ATP (soma de todos os órgãos)
function calculateATPConsumption(organs: Record<string, PhysiologicalOrgan>): number {
  let totalConsumption = 0;
  
  Object.values(organs).forEach(organ => {
    // Consumo base + consumo adicional baseado no uso
    const basalCost = organ.baseAtpConsumption;
    
    // Hipertrofia aumenta custo (mais músculo = mais ATP)
    const hypertrophyPenalty = 1 + (organ.hypertrophyLevel * 0.15); // +15% por nível
    
    // Eficiência reduz custo
    const efficiencyBonus = 1 - (organ.efficiencyLevel * 0.05); // -5% por nível
    
    const organCost = basalCost * hypertrophyPenalty * efficiencyBonus;
    totalConsumption += organCost;
  });
  
  return totalConsumption;
}

// Helper: Calcular Score de Homeostase (0-100)
function calculateHomeostasisScore(physiology: Physiology): number {
  let score = 100;
  
  // Penalizar desvios dos ranges ideais
  const deviations = [
    Math.abs(physiology.heartRate - 70) / 130,        // ideal 70
    Math.abs(physiology.respiratoryRate - 14) / 26,   // ideal 14
    Math.abs(physiology.glucose - 90) / 90,           // ideal 90
    Math.abs(physiology.temperature - 36.8) / 5.2,    // ideal 36.8
    Math.abs(physiology.pH - 7.4) / 0.4,              // ideal 7.4
    Math.abs(physiology.bloodOxygen - 98) / 28,       // ideal 98
  ];
  
  deviations.forEach(deviation => {
    score -= deviation * 20; // cada desvio pode tirar até 20 pontos
  });
  
  return Math.max(0, Math.min(100, score));
}

// Helper: Calcular Carga Alostática (0-100)
function calculateAllostaticLoad(physiology: Physiology): number {
  let load = 0;
  
  // Fatores que aumentam carga alostática
  if (physiology.cortisol > 60) load += (physiology.cortisol - 60) * 0.5;
  if (physiology.glucose > 140) load += (physiology.glucose - 140) * 0.1;
  if (physiology.crp > 3) load += (physiology.crp - 3) * 5;
  if (physiology.bloodOxygen < 90) load += (90 - physiology.bloodOxygen) * 2;
  if (physiology.temperature > 37.5) load += (physiology.temperature - 37.5) * 10;
  
  // Estresse crônico
  if (physiology.stress > 50) load += (physiology.stress - 50) * 0.3;
  
  return Math.min(100, load);
}
```

---

## 🎯 FASE 3: Sistema de Hormônios e Drives (NPC)

### 3.1 Ações Hormonais (Substituem Ações Diretas)

```typescript
// MODIFICAR actions.ts

export interface HormonalAction {
  id: string;
  name: string;
  description: string;
  cost: number; // neurotransmitters
  cooldown: number;
  
  // Efeitos hormonais
  hormoneChanges: {
    [key: string]: number; // ex: { ghrelin: +30, leptin: -20 }
  };
  
  // Drives afetados
  driveChanges: {
    hungerDrive?: number;
    thirstDrive?: number;
    sleepDrive?: number;
    exerciseDrive?: number;
  };
}

export const HORMONAL_ACTIONS: Record<string, HormonalAction> = {
  triggerHunger: {
    id: 'triggerHunger',
    name: '🍽️ NPY/AgRP → Fome',
    description: 'Libera neuropeptídeos orexigênicos. Aumenta drive de fome.',
    cost: 10,
    cooldown: 60,
    hormoneChanges: {
      npy: 40,
      agrp: 35
    },
    driveChanges: {
      hungerDrive: 30
    }
  },
  
  triggerSatiety: {
    id: 'triggerSatiety',
    name: '🥗 POMC/CART → Saciedade',
    description: 'Libera α-MSH via POMC. Reduz drive de fome.',
    cost: 10,
    cooldown: 60,
    hormoneChanges: {
      pomc: 40,
      leptin: 20
    },
    driveChanges: {
      hungerDrive: -30
    }
  },
  
  // ... outras ações hormonais
};
```

### 3.2 Comportamento NPC (Avatar)

```typescript
// CRIAR NOVO ARQUIVO: src/game/npcBehavior.ts

export function decideMealBasedOnHormonesAndEnvironment(
  hormones: Physiology,
  drives: { hungerDrive: number },
  policies: { dietPolicy: string },
  resources: { biomass: number }
): boolean {
  // 1. CHECK HUNGER DRIVE
  if (drives.hungerDrive < 50) return false; // não está com fome suficiente
  
  // 2. CHECK DISPONIBILIDADE (simulada)
  const foodAvailable = resources.biomass > 100; // se tem estoque
  
  if (!foodAvailable) {
    // Aumentar cortisol (estresse por fome não satisfeita)
    return false;
  }
  
  // 3. DECISÃO BASEADA NA POLÍTICA
  const mealType = policies.dietPolicy;
  let glucoseGain = 0;
  let biomassConsumption = 0;
  
  if (mealType === 'healthy') {
    glucoseGain = 30;
    biomassConsumption = 50;
  } else if (mealType === 'ultraprocessed') {
    glucoseGain = 60; // pico maior
    biomassConsumption = 40; // menos custoso
  } else if (mealType === 'fasting') {
    return false; // jejum = não come
  }
  
  return true;
}

export function applyMealEffect(
  physiology: Physiology,
  mealType: string
): Physiology {
  let newPhysiology = { ...physiology };
  
  if (mealType === 'healthy') {
    newPhysiology.glucose += 30;
    newPhysiology.insulin += 20;
    newPhysiology.hungerDrive = 10;
    // Sem pico de inflamação
  } else if (mealType === 'ultraprocessed') {
    newPhysiology.glucose += 60;
    newPhysiology.insulin += 50; // resistência futura
    newPhysiology.hungerDrive = 5;
    newPhysiology.nfkb += 10; // inflamação
    newPhysiology.crp += 0.5; // marcador inflamatório
  }
  
  return newPhysiology;
}
```

---

## 🎯 FASE 4: Feedback Visual (Efeitos CSS)

### 4.1 Camada de Pós-Processamento

```typescript
// CRIAR NOVO ARQUIVO: src/components/HUD/PhysiologicalVisualEffects.tsx

import { useMemo } from 'react';
import { Physiology } from '../../game/physiology';

interface VisualEffectsProps {
  physiology: Physiology;
  homeostasisScore: number;
  allostaticLoad: number;
}

export function PhysiologicalVisualEffects({ 
  physiology, 
  homeostasisScore, 
  allostaticLoad 
}: VisualEffectsProps) {
  
  const effects = useMemo(() => {
    const fx = {
      vignette: 0,      // 0-1 (hipóxia)
      blur: 0,          // 0-10px (hipoglicemia)
      pulse: false,     // true/false (taquicardia)
      pulseSpeed: 1000, // ms
      grayscale: 0,     // 0-1 (carga alostática)
      glow: 0,          // 0-1 (homeostase alta)
    };
    
    // HIPÓXIA → Vinheta escura
    if (physiology.bloodOxygen < 90) {
      fx.vignette = Math.min(1, (90 - physiology.bloodOxygen) / 20);
    }
    
    // HIPOGLICEMIA → Blur
    if (physiology.glucose < 70) {
      fx.blur = Math.min(10, (70 - physiology.glucose) / 3);
    }
    
    // TAQUICARDIA → Pulso vermelho
    if (physiology.heartRate > 120) {
      fx.pulse = true;
      fx.pulseSpeed = 60000 / physiology.heartRate; // bpm → ms
    }
    
    // CARGA ALOSTÁTICA → Grayscale
    fx.grayscale = allostaticLoad / 100;
    
    // HOMEOSTASE ALTA → Glow
    if (homeostasisScore > 80) {
      fx.glow = (homeostasisScore - 80) / 20;
    }
    
    return fx;
  }, [physiology, homeostasisScore, allostaticLoad]);
  
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: effects.vignette > 0
          ? `radial-gradient(circle, transparent 30%, rgba(0,0,0,${effects.vignette}) 100%)`
          : 'none',
        filter: `blur(${effects.blur}px) grayscale(${effects.grayscale})`,
        boxShadow: effects.glow > 0
          ? `inset 0 0 100px rgba(34, 211, 238, ${effects.glow})`
          : 'none',
      }}
    >
      {/* Pulso de taquicardia */}
      {effects.pulse && (
        <div 
          className="absolute inset-0 border-8 border-red-500 opacity-0 animate-pulse-border"
          style={{
            animationDuration: `${effects.pulseSpeed}ms`
          }}
        />
      )}
    </div>
  );
}
```

```css
/* ADICIONAR ao index.css */

@keyframes pulse-border {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.7;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
  }
}

.animate-pulse-border {
  animation: pulse-border 1s ease-in-out infinite;
}
```

---

## 📅 CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Fundação
- ✅ Criar novos tipos (physiology.ts + physiologyOrgans.ts)
- ✅ Manter código antigo funcionando
- ✅ Adicionar campos novos com valores padrão

### Semana 2: Lógica de Tick
- Implementar calculatePhysiologyTick
- Testar balanço energético
- Validar conversão biomassa

### Semana 3: Hormônios e NPC
- Criar ações hormonais
- Implementar comportamento NPC
- Conectar drives com políticas

### Semana 4: Feedback Visual
- Criar camada de efeitos visuais
- Testar performance CSS
- Ajustar animações

### Semana 5: Integração e Balanceamento
- Conectar sistema novo com UI existente
- Remover código antigo progressivamente
- Balancear valores

---

## ⚠️ PONTOS DE ATENÇÃO

1. **NÃO QUEBRAR LAYOUT**: Manter todos os componentes visuais funcionando
2. **BACKWARD COMPATIBILITY**: Sistema antigo deve funcionar enquanto migra
3. **PERFORMANCE**: Novos cálculos não podem aumentar lag
4. **SAVEDATA**: Migração de saves antigos para novos campos
5. **TESTES**: Validar cada fase antes de avançar

---

## 🎮 EXEMPLO DE GAMEPLAY FINAL

**Cenário**: Jogador acorda às 07:00

1. `sleepDrive` está baixo (dormiu bem)
2. `hungerDrive` está subindo (8h de jejum)
3. Jogador libera `NPY/AgRP` (ação hormonal) → `hungerDrive` aumenta
4. NPC decide comer baseado na política `dietPolicy: 'healthy'`
5. Glicose sobe, insulina sobe, `hungerDrive` cai
6. ATP está positivo (glicose suficiente)
7. Excesso de ATP vira glicogênio (estoque)
8. `homeostasisScore` está alto (tudo no range)
9. Jogador ganha **HomeostasisPoints** passivamente
10. Usa pontos para fazer upgrade de **eficiência cardíaca** (reduz custo ATP)

**Resultado**: Loop viciante de gestão fisiológica + progressão de idle game!

---

**Status**: 🟡 PLANO APROVADO - AGUARDANDO IMPLEMENTAÇÃO POR FASES
