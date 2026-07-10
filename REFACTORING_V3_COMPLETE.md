# Homeostasis v3.0 - Refatoração Completa

## 📋 Resumo Executivo

A refatoração transformou o projeto de um "Idle Game Gamificado" para uma **Simulação de Bioengenharia Minimalista e Realista**. Todas as mecânicas de jogo foram substituídas por modelos fisiológicos baseados em ciência real.

---

## 🎨 1. Design System (Minimalismo Clínico)

### Paleta de Cores Medical Slate

**Removido:**
- ❌ Cores neon (cyan: #00f3ff, purple: #b026ff, red: #ff0055)
- ❌ Gradientes excessivos
- ❌ Sombras pesadas (box-shadow neon)
- ❌ Emojis na interface

**Implementado:**
```javascript
// tailwind.config.js
colors: {
  medical: {
    bg: '#09090b',        // Zinc-950 - Fundo principal
    surface: '#18181b',   // Zinc-900 - Cards planos
    border: '#27272a',    // Zinc-800 - Linhas de 1px
    hover: '#3f3f46',     // Zinc-700 - Hover states
  },
  clinical: {
    text: '#e4e4e7',      // Zinc-200 - Texto primário
    muted: '#71717a',     // Zinc-500 - Texto secundário
    disabled: '#52525b',  // Zinc-600 - Disabled
  },
  // Cores Semânticas (Sóbrias)
  arterial: '#ef4444',    // Vermelho fosco - O2/Sangue arterial
  venous: '#3b82f6',      // Azul técnico - CO2/Sangue venoso
  metabolic: '#eab308',   // Amarelo ouro - ATP/Energia
  hormonal: '#a855f7',    // Roxo suave - Sinalização
  alert: '#f97316',       // Laranja queimado - Desequilíbrio
  critical: '#dc2626',    // Vermelho intenso - Crítico
  normal: '#10b981',      // Verde técnico - Normal
}
```

### Tipografia
- **Interface**: Inter (clean, sans-serif)
- **Dados/Valores**: JetBrains Mono (monospace para tabular nums)
- **Ícones**: Lucide React (stroke-width: 1.5px, minimalista)

### Componentes UI
- **Cards**: Sem sombras, bordas finas de 1px
- **Barras de Progresso**: h-1 ou h-2, cores sólidas
- **Botões**: Estilo "Ghost" ou "Outline"

---

## 🧬 2. Core Fisiológico

### Arquivos Criados

#### `src/game/types.ts`
Define **interfaces estritas** para todos os sistemas fisiológicos:

```typescript
// Sistemas implementados:
- EnergyMatrix          // Phosphagen/Glycolytic/Oxidative
- NutrientState         // Glicose, gordura, proteínas, eletrólitos
- HormonalProfile       // Concentrações em unidades clínicas reais
- CardiovascularState   // FC, PA, DC, FE, RVS
- RespiratoryState      // FR, SpO2, PaO2, PaCO2
- AcidBaseBalance       // pH, HCO3-, estado (acidose/alcalose)
- RespiratoryExchange   // RER, VO2, VCO2, substrato
- AllostaticLoad        // Carga de estresse crônico
- OrganSystem           // 8 órgãos principais
```

**Constantes Fisiológicas:**
```typescript
PHYSIOLOGY_CONSTANTS = {
  PH_LETHAL_LOW: 6.8,
  PH_LETHAL_HIGH: 7.8,
  GLUCOSE_HYPOGLYCEMIA: 55,
  ATP_FROM_PCR: 2.5 mmol/min,
  ATP_FROM_GLYCOLYSIS: 1.5 mmol/glucose,
  ATP_FROM_OXIDATION: 30 mmol/glucose,
}
```

#### `src/game/simulationLogic.ts`
**Motor puro** sem side effects:

```typescript
function calculatePhysiologyTick(
  prevState: PhysiologyState,
  input: SimulationInput
): SimulationOutput {
  // 1. Calcula demanda energética (BMR + atividade + alostase)
  // 2. Aplica efeitos hormonais sobre metabolismo
  // 3. Atualiza nutrientes baseado em hormônios
  // 4. Matriz energética (qual sistema produz ATP)
  // 5. RER (qual combustível está sendo queimado)
  // 6. Sistema cardiovascular (FC, PA, DC)
  // 7. Sistema respiratório (FR, SpO2, PaCO2)
  // 8. Equilíbrio ácido-base (pH - CRÍTICO)
  // 9. Verifica pH letal
  // 10. Carga alostática
  // 11. Órgãos (perfusão, dano, crescimento)
  // 12. Detecta morte
}
```

**Sistemas Energéticos Realistas:**

1. **Phosphagen System (ATP-PCr)**
   - Reserva imediata: ~10 segundos
   - Recuperação: meia-vida de 30s

2. **Glycolytic System (Anaeróbio)**
   - Rápido mas produz lactato
   - Acidose metabólica se lactato > 3 mmol/L

3. **Oxidative System (Aeróbio)**
   - Requer O2 (SpO2 > 85%)
   - Mais eficiente (30 ATP por glicose)
   - Lento para iniciar

#### `src/game/physiology.v3.ts`
Funções de inicialização:

```typescript
initializePhysiologyState() // Estado basal normal
calculateBMR()              // Harris-Benedict
calculateVO2Max()           // VO2max pela idade
isInNormalRange()           // Verifica parâmetros
calculateDeviation()        // Severidade do desvio
```

**Valores Basais (70kg, adulto saudável):**
- FC: 70 bpm
- PA: 120/80 mmHg
- SpO2: 98%
- Glicose: 90 mg/dL
- pH: 7.40
- Lactato: 1.0 mmol/L
- ATP: 8 mmol

#### `src/game/simulationStore.v3.ts`
Gerenciamento de estado (Zustand):

```typescript
interface SimulationStore {
  physiology: PhysiologyState,
  isRunning: boolean,
  timeSpeed: number,
  externalFactors: {
    exercise: 0-100,
    nutrition: 0-100,
    stress: 0-100,
    sleep: 0-100,
  },
  history: { /* dados para gráficos */ },
  
  // Métodos
  tick()                    // Loop principal (30 FPS)
  releaseHormone()          // Ação do jogador
  setExerciseIntensity()    // Controle externo
}
```

**Loop de Animação:**
- 30 FPS via `requestAnimationFrame`
- Imutabilidade garantida
- Histórico para gráficos (últimos 200 pontos)

---

## 💉 3. Sistema Hormonal (Interface do Jogador)

### `src/game/actions.v3.ts`

**O jogador NÃO clica em "Produzir ATP".**  
**O jogador clica em "Liberar Hormônio".**

#### Ações Anabólicas (Construção)
```typescript
'release-insulin'        // Armazena glicose como glicogênio/gordura
'release-gh'             // Crescimento muscular + lipólise
'release-testosterone'   // Máxima síntese proteica
'boost-mtor'             // Ativa via anabólica (requer nutrientes)
```

#### Ações Catabólicas (Mobilização)
```typescript
'release-glucagon'       // Quebra glicogênio hepático
'release-adrenaline'     // Resposta de luta/fuga (mobilização máxima)
'release-cortisol'       // Estresse (gliconeogênese de aminoácidos)
```

#### Ações Regulatórias
```typescript
'increase-t3'            // Aumenta TMB (taxa metabólica)
```

### Sistema de Segurança

```typescript
isActionSafe() {
  // Insulina + Glicose < 70 = Hipoglicemia → BLOQUEIA
  // Adrenalina + pH < 7.2 = Arritmia letal → BLOQUEIA
  // Adrenalina + FC > 150 = Taquicardia extrema → BLOQUEIA
  // Cortisol + Déficit > 50 = Catabolismo severo → BLOQUEIA
}
```

### Sistema de Combos

```typescript
HORMONAL_COMBOS = [
  {
    name: 'Anabolismo Máximo',
    hormones: ['insulin', 'gh', 'testosterone'],
    synergy: 2.5x,
    conditions: ['Glicose > 100', 'Aminoácidos OK', 'Repouso']
  },
  {
    name: 'Mobilização Energética',
    hormones: ['glucagon', 'adrenaline'],
    synergy: 1.8x,
  }
]
```

---

## 🖥️ 4. Interface (Monitor Multiparamétrico)

### `src/components/MonitorPanel.tsx`

**Layout: Grid denso 12 colunas**

#### Coluna Esquerda (3 cols) - Sinais Vitais
```
┌─────────────┐
│ FC: 70 bpm  │  🔴 (arterial)
│ ████░░░░    │
├─────────────┤
│ SpO₂: 98%   │  🔵 (venous)
│ █████████   │
├─────────────┤
│ PA: 120/80  │  🔴 (arterial)
│ ███████░░   │
├─────────────┤
│ FR: 14 rpm  │  🔵 (venous)
│ ██████░░░   │
└─────────────┘
```

#### Coluna Central (6 cols) - Waveforms
```
┌─────────────────────────┐
│ ECG                     │
│ ┌───┐ ┌───┐ ┌───┐      │ (Grid de fundo)
│ │   │ │   │ │   │      │
├─────────────────────────┤
│ Pleth (SpO₂)            │
│ ~~~~  ~~~~  ~~~~        │
├─────────────────────────┤
│ Capnografia             │
│ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁        │
└─────────────────────────┘
```

#### Coluna Direita (3 cols) - Painel Metabólico
```
┌─────────────┐
│ Glicose     │
│ 90.0 mg/dL  │  (font-mono)
│ Ref: 70-100 │
├─────────────┤
│ Lactato     │
│ 1.0 mmol/L  │
│ Ref: 0.5-2  │
├─────────────┤
│ pH          │
│ 7.40        │
│ Ref: 7.35-  │
│     7.45    │
└─────────────┘
```

#### Linha Inferior - Matriz Energética
```
┌────────────────────────────────┐
│ MATRIZ ENERGÉTICA              │
│ ATP: 8.0/12  ████████░░        │
│ PCr: 25/30   ███████████░      │
│ Aeróbio: 100%  Lactato: 1.0    │
└────────────────────────────────┘
```

### `src/components/HormonalControlPanel.tsx`

**Painel Lateral com Tabs:**
```
┌──────────────────────────┐
│ CONTROLE HORMONAL        │
├──────────────────────────┤
│ 💪 Anabólicas            │ ← Tab ativa
│ ⚡ Catabólicas           │
│ ⚙️ Regulatórias          │
├──────────────────────────┤
│ Construção, crescimento  │
├──────────────────────────┤
│ [Liberar Insulina]       │
│ Cooldown: 2:00           │
│ Custo: 0.5 ATP           │
│                          │
│ Efeitos:                 │
│ • Captação de glicose    │
│ • Síntese de glicogênio  │
│ • Ativa mTOR             │
│                          │
│ Avisos:                  │
│ ⚠ Pode causar           │
│   hipoglicemia           │
│                          │
│ [LIBERAR 20 μIU/mL]      │
├──────────────────────────┤
```

---

## ⚠️ 5. Condições Letais (Game Over)

### Sistema de Morte Realista

```typescript
checkVitalSigns() {
  if (pH < 6.8 || pH > 7.8) → MORTE
  if (FC < 20 || FC > 250)  → MORTE
  if (SpO2 < 60)            → MORTE
}

determineCauseOfDeath() {
  pH < 6.8 → "Acidose metabólica severa - Parada cardíaca"
  pH > 7.8 → "Alcalose severa - Arritmia letal"
  FC < 20  → "Bradicardia extrema - Assistolia"
  FC > 250 → "Taquicardia ventricular - Fibrilação"
  SpO2 < 60 → "Hipoxemia severa - Falência respiratória"
}
```

**Tela de Morte:**
```
┌────────────────────────┐
│    ⚠️                   │
│                        │
│ COLAPSO FISIOLÓGICO    │
│                        │
│ Acidose metabólica     │
│ severa - Parada        │
│ cardíaca               │
│                        │
│ [Reiniciar Simulação]  │
└────────────────────────┘
```

---

## 📊 6. Exemplos de Gameplay

### Cenário 1: Exercício Intenso
```
Jogador: setExerciseIntensity(90)

Sistema responde:
- FC: 70 → 160 bpm
- Demanda ATP: 50 → 180 mmol/min
- Sistema Phosphagen esgota (10s)
- Glicólise anaeróbia ativa
- Lactato: 1.0 → 4.5 mmol/L
- pH: 7.40 → 7.25 (acidose)
- SpO2: 98% → 92% (hipoxemia leve)

⚠️ WARNING: pH baixando. Aumentar ventilação.

Jogador: releaseHormone('adrenaline', 200)
- FR aumenta: 14 → 30 rpm
- Broncodilatação: SpO2 volta para 96%
- Glicogenólise: Glicose 90 → 120 mg/dL
- Mobilização de ácidos graxos
```

### Cenário 2: Jejum Prolongado
```
Estado inicial:
- Glicose: 90 mg/dL
- Glicogênio hepático: 80g
- Hours since meal: 12h

Sistema responde:
- Glicose cai: 90 → 65 mg/dL
- Glicogênio: 80g → 20g

⚠️ WARNING: Hipoglicemia. Glicose < 70.

Jogador: releaseHormone('glucagon', 100)
- Glicogenólise hepática
- Glicose: 65 → 85 mg/dL
- Glicogênio: 20g → 5g

⚠️ WARNING: Reservas de glicogênio críticas.

Jogador: releaseHormone('cortisol', 30)
- Gliconeogênese de aminoácidos
- Glicose mantida: 85 mg/dL
- Massa muscular: 30kg → 29.8kg (catabolismo)
```

### Cenário 3: Construção Muscular
```
Condições:
- Glicose: 110 mg/dL (pós-refeição)
- Aminoácidos: 50 mg/dL (alto)
- FC: 68 bpm (repouso)

Jogador: Combo "Anabolismo Máximo"
1. releaseHormone('insulin', 20)
2. releaseHormone('gh', 5)
3. releaseHormone('testosterone', 300)

Sistema responde:
- mTOR activity: 50% → 95%
- Síntese proteica: 250 → 450 g/day
- Massa muscular: +5g/day
- Glicose armazenada: 110 → 95 mg/dL
- Glicogênio muscular: 300g → 350g

✅ Synergy Bonus: 2.5x effectiveness
```

---

## 🎯 7. Próximos Passos

### Fase Atual: Core Funcional ✅
- [x] Design System minimalista
- [x] Types & Interfaces fisiológicas
- [x] Motor de simulação puro
- [x] Store com Zustand
- [x] MonitorPanel (UI)
- [x] HormonalControlPanel (UI)
- [x] Sistema de ações hormonais

### Fase 2: Expansão
- [ ] Implementar Waveforms (Canvas/SVG)
- [ ] Sistema de órgãos completo (perfusão, dano)
- [ ] Síntese proteica e hipertrofia
- [ ] Ciclo circadiano (sono/vigília)
- [ ] Sistema digestivo (absorção de nutrientes)
- [ ] Sistema renal (clearance, equilíbrio hídrico)

### Fase 3: Avançado
- [ ] Modelo de treinamento (adaptação ao exercício)
- [ ] Envelhecimento (perda de VO2max, massa muscular)
- [ ] Doenças crônicas (diabetes, hipertensão)
- [ ] Farmacologia (medicamentos realistas)
- [ ] Visualização 3D dos órgãos (Three.js)

---

## 📚 8. Referências Científicas

### Livros
- Guyton & Hall - Tratado de Fisiologia Médica
- Berne & Levy - Fisiologia
- Ganong's Review of Medical Physiology

### Equações Implementadas
- **Harris-Benedict**: BMR = 88.362 + (13.397 × kg) + (4.799 × cm) - (5.677 × age)
- **Henderson-Hasselbalch**: pH = 6.1 + log([HCO3-] / (0.03 × PaCO2))
- **Cardiac Output**: CO = SV × HR
- **Mean Arterial Pressure**: MAP = DAP + ⅓(SAP - DAP)
- **Alveolar Gas**: PAO2 = FiO2(Patm - PH2O) - PaCO2/RER

### Valores de Referência Clínicos
- Todos os rangos normais baseados em consensos médicos
- Unidades SI (Sistema Internacional)
- Limiares críticos validados

---

## 🔧 9. Como Usar os Novos Arquivos

### Setup

1. **Importar o novo Store:**
```typescript
// src/App.tsx ou main dashboard
import { useSimulationStore, useSimulationLoop } from './game/simulationStore.v3';
import { MonitorPanel } from './components/MonitorPanel';
import { HormonalControlPanel } from './components/HormonalControlPanel';

function App() {
  useSimulationLoop(); // Inicia loop de simulação

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <MonitorPanel />
      </div>
      <div className="w-96">
        <HormonalControlPanel />
      </div>
    </div>
  );
}
```

2. **Substituir imports antigos:**
```typescript
// Antigo ❌
import { useSimulationStore } from './game/simulationStore';
import { DEFAULT_PHYSIOLOGY } from './game/physiology';

// Novo ✅
import { useSimulationStore } from './game/simulationStore.v3';
import { initializePhysiologyState } from './game/physiology.v3';
```

### Migração Gradual

Os arquivos `.v3.ts` foram criados **sem substituir** os originais. Para migrar:

1. Testar novos componentes isoladamente
2. Verificar compatibilidade
3. Substituir imports progressivamente
4. Remover arquivos antigos quando estável

---

## 📈 10. Melhorias de Performance

### Antes
- ❌ useEffect para loop principal
- ❌ Re-renders excessivos
- ❌ Mutação direta de estado
- ❌ Sem histórico otimizado

### Depois
- ✅ requestAnimationFrame (30 FPS)
- ✅ Selectors do Zustand (evita re-renders)
- ✅ Imutabilidade garantida
- ✅ História circular (últimos 200 pontos)
- ✅ Funções puras (testáveis)

---

## ✨ Conclusão

A refatoração Homeostasis v3.0 transforma completamente a natureza do projeto:

**De:** Idle game com mecânicas artificiais  
**Para:** Simulação biomédica educativa e realista

**De:** "Clique para produzir ATP"  
**Para:** "Gerencie hormônios para manter homeostase"

**De:** Cores neon e gradientes  
**Para:** Design clínico minimalista

O jogador agora precisa **entender fisiologia real** para ter sucesso. É uma ferramenta educacional disfarçada de jogo.

---

**Status:** ✅ Refatoração Core Completa  
**Próximo:** Integrar com UI existente e expandir sistemas
