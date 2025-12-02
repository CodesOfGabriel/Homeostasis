# 🫀 Homeostasis - Simulador Fisiológico com Idle Game

## 📋 Visão Geral

**Homeostasis** é uma aplicação web que combina um simulador fisiológico detalhado com mecânicas de idle game. O jogador assume o controle hipotalâmico de um corpo humano, gerenciando parâmetros vitais através de ações neurais enquanto constrói um "império" de produção de ATP através dos órgãos.

### 🎯 Conceito Central
- **Simulação Fisiológica em Tempo Real**: Parâmetros vitais (FC, FR, pH, glicose, etc.) que respondem a ações do jogador
- **Idle Game Incremental**: Órgãos geram ATP passivamente, upgrades exponenciais, sistema de prestige
- **Educação Científica**: Conteúdo baseado em fisiologia real (eixo HPA, neurotransmissores, homeostase)

---

## 🏗️ Arquitetura do Projeto

### 📁 Estrutura de Pastas

```
Cell_App/
├── src/
│   ├── game/                       # Lógica do jogo
│   │   ├── simulationStore.ts      # Estado global da simulação (Zustand)
│   │   ├── physiology.ts           # Parâmetros fisiológicos e limites
│   │   ├── actions.ts              # 40+ ações hipotalâmicas categorizadas
│   │   ├── events.ts               # Sistema de eventos aleatórios
│   │   ├── eventSolutions.ts       # Soluções e combos de eventos
│   │   ├── idleSystem.ts           # Sistema idle (órgãos, upgrades, prestige)
│   │   ├── achievements.ts         # 23 conquistas em 5 categorias
│   │   ├── useIdleGame.ts          # Hook React com game loop
│   │   ├── IdleGameContext.tsx     # Context API para estado compartilhado
│   │   ├── useInterval.ts          # Hook de intervalo customizado
│   │   └── equations/              # Equações fisiológicas
│   │       ├── cardiac.ts          # Cálculos cardiovasculares
│   │       ├── respiratory.ts      # Cálculos respiratórios
│   │       └── perfusion.ts        # Cálculos de perfusão e metabolismo
│   │
│   ├── components/HUD/             # Interface do usuário
│   │   ├── IdleGameHeader.tsx      # Header com métricas globais
│   │   ├── IdleGamePanel.tsx       # Painel principal do idle game
│   │   ├── EventTimeline.tsx       # Timeline de eventos do dia
│   │   ├── AnatomicalBody3DImproved.tsx  # Visualização 3D do corpo
│   │   ├── OrganModal.tsx          # Modal de upgrade de órgãos
│   │   ├── ManagerModal.tsx        # Modal de contratação de gerentes
│   │   ├── UpgradeModal.tsx        # Modal de upgrades globais
│   │   ├── PrestigeModal.tsx       # Modal de prestige/reencarnação
│   │   ├── AchievementsModal.tsx   # Modal de conquistas
│   │   ├── TutorialModal.tsx       # Tutorial interativo
│   │   ├── SubstancePanel.tsx      # Painel de substâncias
│   │   └── [outros componentes HUD]
│   │
│   ├── pages/                      # Páginas principais
│   │   ├── GameDashboard.tsx       # Dashboard principal do jogo
│   │   └── GameDashboard/          # Subcomponentes do dashboard
│   │       ├── Header.tsx          # Cabeçalho com controles
│   │       ├── OrgansTab.tsx       # Aba de órgãos
│   │       ├── MolecularTab.tsx    # Aba de vias moleculares
│   │       ├── ChartsTab.tsx       # Aba de gráficos
│   │       ├── LabMarkersPanel.tsx # Painel de marcadores laboratoriais
│   │       ├── ActionsPanel.tsx    # Painel de ações (12 categorias)
│   │       ├── SubstancesTab.tsx   # Aba de substâncias (5 categorias)
│   │       ├── Notifications.tsx   # Sistema de notificações
│   │       └── [outros subcomponentes]
│   │
│   ├── App.tsx                     # Componente raiz com IdleGameProvider
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Estilos globais + Tailwind
│
├── public/                         # Arquivos estáticos
├── index.html                      # HTML principal
├── package.json                    # Dependências
├── vite.config.ts                  # Configuração Vite
├── tailwind.config.js              # Configuração Tailwind CSS
└── tsconfig.json                   # Configuração TypeScript
```

---

## 🎮 Sistema de Jogo

### 1️⃣ Simulação Fisiológica

#### Parâmetros Monitorados (40+)
```typescript
interface Physiology {
  // Cardiovascular
  heartRate: number;              // 40-200 bpm
  strokeVolume: number;           // 40-120 mL
  cardiacOutput: number;          // L/min
  bloodPressureSystolic: number;  // mmHg
  bloodPressureDiastolic: number; // mmHg
  
  // Respiratório
  respiratoryRate: number;        // 10-40 rpm
  bloodOxygen: number;            // 70-100%
  tidalVolume: number;            // mL
  
  // Metabólico
  glucose: number;                // 70-180 mg/dL
  lactate: number;                // mmol/L
  temperature: number;            // 32-40°C
  pH: number;                     // 7.18-7.52
  bmi: number;                    // 13-45
  energy: number;                 // kJ
  
  // Hormonal
  adrenaline: number;
  cortisol: number;
  insulin: number;
  glucagon: number;
  testosterone: number;
  growthHormone: number;
  thyroid: number;
  melatonin: number;
  dopamine: number;
  serotonin: number;
  
  // Perfusão de Órgãos
  brainPerfusion: number;         // 0-100%
  heartPerfusion: number;
  musclePerfusion: number;
  organsPerfusion: number;
  kidneyPerfusion: number;
  liverPerfusion: number;
}
```

#### Sistema de Morte (8 condições fatais)
- **Alcalose**: pH > 7.52
- **Acidose**: pH < 7.18
- **Taquicardia extrema**: FC > 190 bpm por >5s
- **Bradicardia extrema**: FC < 35 bpm
- **Hipoxemia severa**: SpO₂ < 70%
- **Hipertermia fatal**: Temp > 40°C
- **Hipotermia fatal**: Temp < 32°C
- **IMC crítico**: BMI < 13 ou > 45

#### Tick System
- **Intervalo**: 200ms (5 ticks/segundo)
- **Cálculos por tick**: Equações cardiovasculares, respiratórias, metabólicas
- **Time Speed**: 0.5x, 1x, 2x, 5x, 10x (acelera simulação)

### 2️⃣ Sistema de Ações (40+ Ações Hipotalâmicas)

#### Organização por Categorias (12 grupos)

1. **🧠 Controle Hormonal & Estresse** (6 ações)
   - CRH → ACTH → Catecolaminas
   - Somatostatina
   - Ocitocina
   - α-MSH (Melanocortina)
   - Via Colinérgica Anti-inflamatória
   - Dopamina/Serotonina

2. **🫁 Respiratório & Oxigenação** (2 ações)
   - Centros Respiratórios
   - Quimiorreceptores

3. **⚡ Metabolismo & Energia** (6 ações)
   - Inibir Glucagon
   - Orexina → Glicogenólise
   - Grelina → AMPK
   - TRH → Tireoide
   - GHRH → GH → IGF-1
   - TRH Intenso

4. **💧 Hidratação & Desintoxicação** (4 ações)
   - AVP (Vasopressina)
   - GLP-1 Hepático
   - ANP/BNP Balance
   - Osmorreceptores → Sede

5. **😴 Sono & Ritmo Circadiano** (4 ações)
   - VLPO → Sono
   - Orexina/Hipocretina
   - NSQ → Ritmo Circadiano
   - Melatonina Pineal

6. **🍽️ Apetite & Saciedade** (3 ações)
   - NPY/AgRP → Fome
   - POMC/CART → Saciedade
   - Via Leptina

7. **⚖️ Balanço Autonômico** (2 ações)
   - Simpático Máximo
   - Parassimpático Máximo

8. **🌡️ Regulação Térmica** (3 ações)
   - Termogênese (BAT)
   - Dissipação de Calor
   - Resposta Febril

9. **😌 Dor & Prazer** (2 ações)
   - Endorfinas/Encefalinas
   - Modulação Nociceptiva

10. **⚔️ Defesa & Reprodução** (4 ações)
    - Resposta de Congelamento
    - Drive Agressivo
    - GnRH Pulsátil
    - Dopamina Tuberoinfundibular

11. **🛡️ Sistema Imune** (1 ação)
    - Imunomodulação

12. **🚨 EMERGÊNCIA** (1 ação)
    - Overdrive Total (cooldown 180s)

#### Características das Ações
- **Cooldown individual**: 15-180 segundos
- **Custo de energia**: 0-30 ATP
- **Efeitos múltiplos**: Cada ação afeta 2-5 parâmetros simultaneamente
- **Feedback visual**: Notificações em tempo real

### 3️⃣ Sistema de Substâncias (20+ Substâncias)

#### Categorias (5 grupos)

1. **⚡ Estimulantes & Energia**
   - Cafeína, Glicose, Energético, Açúcar

2. **💧 Hidratação & Eletrólitos**
   - Água, Eletrólitos, Isotônico, Sal

3. **💊 Medicamentos**
   - Analgésico, Anti-histamínico, Betabloqueador, Aspirina

4. **🧬 Hormônios de Fome & Sede**
   - Grelina, Leptina, ADH, Angiotensina

5. **🧘 Estresse & Relaxamento**
   - Melatonina, Magnésio, Bloqueador de Cortisol, CBD

#### Mecânica
- **Cooldown global**: 300 segundos (5 minutos)
- **Efeitos instantâneos**: Modificam parâmetros imediatamente
- **Cores distintas**: Cada categoria tem gradiente próprio

### 4️⃣ Sistema de Eventos

#### Eventos Aleatórios (20+ tipos)
- **Fisiológicos**: Hipoglicemia, Desidratação, Febre, etc.
- **Metabólicos**: Lactato alto, Cetose, etc.
- **Cardiovasculares**: Taquicardia, Hipertensão, etc.
- **Respiratórios**: Hiperventilação, Apneia, etc.

#### Event Solutions & Combos
- **Soluções específicas**: Cada evento tem 1-3 ações ideais
- **Sistema de Combo**: Ações em sequência correta = bônus
- **Scoring**: Pontuação baseada em velocidade e precisão
- **Timeline visual**: Eventos aparecem na timeline do dia

---

## 🎯 Sistema Idle Game

### 💰 Sistema de Moedas (3 Camadas)

#### 1. ATP (Adenosina Trifosfato) ⚡
- **Função**: Moeda principal
- **Geração**: Passiva por órgãos (0.1-1000 ATP/s)
- **Uso**: Upgrades de órgãos, upgrades globais
- **Offline**: 100% eficiência com gerentes, 50% sem

#### 2. Hormônios 🧬
- **Função**: Moeda premium (não paga)
- **Geração**: Apenas pelo Cérebro (0.5 Hormônios/s base)
- **Uso**: Contratar gerentes, upgrades hormonais
- **Raridade**: ~100x mais raro que ATP

#### 3. Células-Tronco 🔬
- **Função**: Moeda de prestige
- **Geração**: Reset voluntário após 1M ATP total
- **Uso**: Multiplicadores permanentes (+10% por célula)
- **Cálculo**: `floor(totalATP / 1,000,000)`

### 🏥 Órgãos Geradores (6 órgãos)

```typescript
const ORGANS = {
  heart: {
    name: 'Coração',
    baseProduction: 10 ATP/s,
    baseCost: 50 ATP,
    costMultiplier: 1.15,
    productionMultiplier: 1.05
  },
  lungs: {
    name: 'Pulmões',
    baseProduction: 15 ATP/s,
    baseCost: 100 ATP,
    // ...
  },
  stomach: {
    name: 'Estômago',
    baseProduction: 25 ATP/s,
    baseCost: 500 ATP,
  },
  liver: {
    name: 'Fígado',
    baseProduction: 50 ATP/s,
    baseCost: 2000 ATP,
  },
  kidneys: {
    name: 'Rins',
    baseProduction: 100 ATP/s,
    baseCost: 10000 ATP,
  },
  brain: {
    name: 'Cérebro',
    baseProduction: 0.5 Hormônios/s,
    baseCost: 50000 ATP,
    produces: 'hormones'
  }
};
```

#### Progressão Exponencial
- **Custo**: `baseCost * (costMultiplier ^ level)`
- **Produção**: `baseProduction * (productionMultiplier ^ level) * globalMultiplier`
- **Level cap**: Ilimitado

### 👨‍💼 Sistema de Gerentes (4 gerentes)

```typescript
const MANAGERS = {
  heart_manager: {
    name: 'Dr. Cardio',
    organId: 'heart',
    cost: 50 Hormônios,
    bonus: 50%, // +50% produção
    effect: 'Automação completa'
  },
  lungs_manager: {
    name: 'Dra. Pulmo',
    organId: 'lungs',
    cost: 100 Hormônios,
    bonus: 50%
  },
  metabolic_manager: {
    name: 'Nutricionista',
    organId: 'stomach/liver',
    cost: 200 Hormônios,
    bonus: 75%
  },
  excretory_manager: {
    name: 'Nefrologista',
    organId: 'kidneys',
    cost: 500 Hormônios,
    bonus: 100%
  }
};
```

### 🔬 Upgrades Globais (6 upgrades)

#### Metabólicos (ATP)
- **Mitocôndrias Eficientes** (5K ATP): +25% ATP global
- **Ciclo de Krebs Otimizado** (25K ATP): +50% produção aeróbica
- **ATP Sintase Turbo** (100K ATP): 2x velocidade de geração

#### Hormonais (Hormônios)
- **Eixo HPA Calibrado** (50 Hormônios): +30% produção
- **Tiroxina Boost** (100 Hormônios): +100% metabolismo basal

#### Evolutivos (Experiência)
- **Adaptação Celular** (1000 XP): +50% evolução automática

### 🔄 Sistema de Prestige (Reencarnação Celular)

#### Mecânica
1. **Requisito**: 1.000.000 ATP total acumulado
2. **Recompensa**: `floor(totalATP / 1M)` células-tronco
3. **Multiplicador**: Cada célula = +10% produção permanente
4. **Reset**: Perde ATP, órgãos, upgrades (mantém células-tronco)

#### Progressão Típica
```
1º Prestige: 2-3 horas → 1 célula-tronco → 1.1x multiplier
2º Prestige: 30 minutos → 2 células-tronco → 1.33x multiplier
3º Prestige: 15 minutos → 4 células-tronco → 1.77x multiplier
10º Prestige: 5 minutos → 50+ células-tronco → 6x+ multiplier
```

### 🏆 Sistema de Conquistas (23 achievements)

#### Categorias (5 tipos)

1. **Production** (Produção)
   - First ATP, 1K ATP, 10K ATP, 100K ATP, 1M ATP, 10M ATP, 100M ATP
   
2. **Organs** (Órgãos)
   - First Organ, All Organs, Level 10, Level 50, Level 100
   
3. **Mastery** (Maestria)
   - First Manager, All Managers, First Upgrade, All Upgrades
   
4. **Prestige** (Prestígio)
   - First Prestige, Prestige Level 5, Prestige Level 10
   
5. **Speed** (Velocidade)
   - 100 ATP/s, 1K ATP/s, 10K ATP/s

#### Recompensas
- **Experiência**: 100-1000 XP
- **Hormônios**: 10-100
- **Multiplicadores**: 1.1x-2x permanentes

---

## 🎨 Interface e UX

### Layout Principal (3 Colunas)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: ATP | Hormônios | Células-Tronco | Conquistas      │
├─────────────┬──────────────────────────────┬────────────────┤
│             │                              │                │
│  MEU CORPO  │   CONDIÇÃO CARDÍACA         │   AÇÕES        │
│             │   - Tabs: Órgãos            │   - 12 categ.  │
│  - Body 3D  │   - Tabs: Molecular         │                │
│  - Órgãos   │   - Tabs: Gráficos          │   SUBSTÂNCIAS  │
│  - Eventos  │   - Tabs: Laboratório       │   - 5 categ.   │
│  - Balanço  │   - Tabs: Idle Game         │                │
│             │                              │                │
├─────────────┴──────────────────────────────┴────────────────┤
│  TIMELINE: Eventos do dia (07:00 → 22:00) | ▶️ Pausar | 1x  │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Visuais

#### 1. Timeline Interativa
- **Período**: 24 horas (07:00 - 22:00)
- **Eventos**: Ícones coloridos em timestamps específicos
- **Controles**: Play/Pause, Speed (0.5x-10x)
- **Formato**: HH:MM (sem decimais)

#### 2. Body Visualization (Three.js)
- **Anatomical Body 3D**: Corpo humano com perfusão arterial/venosa
- **Heart Animation**: Batimento sincronizado com FC
- **Respiratory Animation**: Expansão pulmonar sincronizada com FR
- **Color Coding**: Vermelho (arterial), Azul (venoso)

#### 3. Modais Especializados
- **OrganModal**: Detalhes de upgrade, custo, produção
- **ManagerModal**: Contratação de gerentes, bônus
- **UpgradeModal**: Upgrades globais, multiplicadores
- **PrestigeModal**: Cálculo de células-tronco, confirmação
- **AchievementsModal**: Grid de conquistas, progresso

#### 4. Sistema de Notificações
- **Positioning**: z-50 (sempre no topo)
- **Tipos**: Info, Warning, Critical, Achievement
- **Auto-dismiss**: 5 segundos
- **Empilhamento**: Máximo 2 visíveis

### 🎨 Design System

#### Cores por Contexto
```css
/* Moedas */
--atp-color: #fbbf24 (amarelo)
--hormones-color: #a855f7 (roxo)
--stemcells-color: #06b6d4 (ciano)

/* Status */
--normal: #22c55e (verde)
--warning: #f59e0b (laranja)
--critical: #ef4444 (vermelho)

/* Ações (por categoria) */
--hormonal: #3b82f6 (azul)
--respiratory: #06b6d4 (ciano)
--metabolic: #eab308 (amarelo)
--hydration: #0284c7 (azul escuro)
--sleep: #8b5cf6 (roxo)
--appetite: #f97316 (laranja)
--autonomic: #dc2626 (vermelho)
--thermal: #f59e0b (âmbar)
--pain: #ec4899 (rosa)
--defense: #7c3aed (violeta)
--immune: #16a34a (verde)
--emergency: #b91c1c (vermelho intenso)
```

#### Tipografia
- **Font**: System fonts (sans-serif)
- **Tamanhos**: xs (10px), sm (12px), base (14px), lg (16px), xl (18px), 2xl (24px)
- **Peso**: normal (400), medium (500), semibold (600), bold (700)

#### Espaçamento
- **Gap**: 2 (8px), 3 (12px), 4 (16px), 6 (24px)
- **Padding**: p-2, p-3, p-4, p-6
- **Margin**: mb-2, mb-3, mb-4, mb-6

---

## 🔧 Tecnologias e Bibliotecas

### Core Stack
```json
{
  "react": "^18.2.0",
  "typescript": "^5.2.2",
  "vite": "^5.0.8"
}
```

### State Management
```json
{
  "zustand": "^4.4.7"  // Global state (simulationStore)
}
```

### 3D/Animation
```json
{
  "three": "^0.160.0",
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.92.0",
  "framer-motion": "^10.16.16"
}
```

### UI/Styling
```json
{
  "tailwindcss": "^3.4.0",
  "lucide-react": "^0.555.0",  // Ícones
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32"
}
```

### Build Tools
```json
{
  "@vitejs/plugin-react": "^4.2.1",
  "@types/react": "^18.2.43",
  "@types/three": "^0.160.0"
}
```

---

## 💾 Persistência e Save System

### LocalStorage Keys
```typescript
const SAVE_KEYS = {
  idleGame: 'homeostasis_idle_save',
  achievements: 'homeostasis_achievements_save'
};
```

### Auto-Save
- **Intervalo**: 5 segundos
- **Dados salvos**: GameState completo, Achievements
- **Formato**: JSON stringified

### Offline Earnings
```typescript
// Ao reabrir o jogo
const offlineTime = (Date.now() - lastUpdate) / 1000; // segundos
const offlineATP = calculateOfflineEarnings(gameState, offlineTime);

// Com gerentes: 100% eficiência
// Sem gerentes: 50% eficiência
```

### Reset Options
- **Soft Reset**: Limpar save (mantém achievements)
- **Hard Reset**: Limpar tudo (localStorage.clear())

---

## 🚀 Como Rodar o Projeto

### Instalação
```bash
# Clone o repositório
git clone https://github.com/CodesOfGabriel/Homeostasis.git

# Entre na pasta
cd Cell_App

# Instale dependências
npm install
```

### Desenvolvimento
```bash
# Rodar servidor local (http://localhost:5173)
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

### Scripts Disponíveis
```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

---

## 📊 Métricas de Sucesso Esperadas

### Engajamento
- **D1 Retention**: 60% (tutorial + achievements)
- **D7 Retention**: 30% (prestige loop)
- **Session Length**: 5-15 minutos (idle-friendly)
- **Daily Sessions**: 3-5 (check offline earnings)

### Progressão
- **Time to First Prestige**: 2-3 horas (balanced)
- **Time to Level 10 Prestige**: 20-30 horas
- **Average Session ATP**: 100K-1M

### Educacional
- **Learning Value**: ★★★★★ (conteúdo científico real)
- **Actions Discovered**: 40+ ações hipotalâmicas
- **Physiological Parameters**: 40+ parâmetros aprendidos

---

## 🎓 Conceitos Fisiológicos Abordados

### Sistemas Corporais
1. **Cardiovascular**: FC, DC, PA, perfusão
2. **Respiratório**: FR, SpO₂, volume corrente
3. **Metabólico**: Glicose, lactato, pH, temperatura
4. **Endócrino**: 10 hormônios principais
5. **Nervoso**: Simpático vs Parassimpático
6. **Renal**: Osmolaridade, diurese
7. **Hepático**: Glicogenólise, desintoxicação
8. **Imunológico**: Resposta inflamatória

### Conceitos Chave
- **Eixo HPA**: Hipotálamo-Pituitária-Adrenal
- **Homeostase**: Equilíbrio dinâmico
- **Alostase**: Custo de adaptação
- **Ritmo Circadiano**: Relógio biológico
- **Termorregulação**: Controle térmico
- **Balanço Energético**: ATP, glicose, lipídios

---

## 🔮 Roadmap Futuro (Possíveis Expansões)

### Phase 2: Eventos Dinâmicos
- Converter eventos em mini-games
- Recompensas por resolução rápida
- Eventos como "impostos" na produção

### Phase 3: Sistema Social
- Leaderboards globais
- Clãs fisiológicos (Cardiovascular, Respiratório, etc.)
- Eventos sazonais competitivos

### Phase 4: Conteúdo Educacional
- Encyclopedia in-game com artigos científicos
- Desafios médicos baseados em casos reais
- Modo "Medical School" (dificuldade aumentada)

### Phase 5: Multiplayer Assíncrono
- Comparar progressão com amigos
- Compartilhar saves/estratégias
- Desafios semanais globais

---

## 📝 Licença

Este projeto está sob a licença especificada no arquivo `LICENSE`.

---

## 👨‍💻 Desenvolvimento

**Autor**: Gabriel (CodesOfGabriel)  
**Repositório**: https://github.com/CodesOfGabriel/Homeostasis  
**Branch**: main  

### Contato
Para dúvidas, sugestões ou contribuições, abra uma issue no GitHub.

---

**Última atualização**: Dezembro 2025  
**Versão da Documentação**: 1.0.0
