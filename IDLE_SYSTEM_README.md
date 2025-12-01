# 🎮 Sistema Idle Game - Homeostasis Tycoon

## 📋 Visão Geral

Sistema de gamificação incremental/idle implementado sobre a simulação fisiológica. Inspirado em **Adventure Capitalist**, transforma o corpo humano em um império de geração de recursos onde órgãos são departamentos produtivos que geram **ATP** passivamente.

## ⚡ Mecânicas Principais

### 💰 Sistema de Moedas (3 Níveis)

1. **ATP (Adenosina Trifosfato)** ⚡
   - Moeda principal do jogo
   - Gerada passivamente por órgãos
   - Usada para melhorar órgãos e comprar upgrades globais
   - Acumula mesmo offline (50% eficiência sem gerentes, 100% com gerentes)

2. **Hormônios** 🧬
   - Moeda premium (não monetizável)
   - Gerada pelo Cérebro
   - Usada para contratar Gerentes e upgrades hormonais
   - Mais rara e estratégica

3. **Células-Tronco** 🔬
   - Moeda de prestígio
   - Obtida através de "Reencarnação Celular"
   - Fornece multiplicadores permanentes
   - Permite evoluções de longo prazo

### 🫀 Órgãos Geradores

Cada órgão funciona como um departamento idle:

| Órgão | Produção Base | Custo Inicial | Moeda | Função |
|-------|---------------|---------------|-------|---------|
| 🫀 Coração | 10 ATP/s | 50 ATP | ATP | Primeiro órgão, sempre disponível |
| 🫁 Pulmões | 15 ATP/s | 100 ATP | ATP | Respiração aeróbica |
| 🟤 Fígado | 20 ATP/s | 500 ATP | ATP | Metabolismo avançado |
| 🧠 Cérebro | 2 Hormônios/min | 1000 ATP | Hormônios | Gera moeda premium |
| 🫘 Rins | 12 ATP/s | 2500 ATP | ATP | Filtragem eficiente |
| 🟡 Estômago | 8 ATP/s | 150 ATP | ATP | Conversão de nutrientes |

#### Progressão de Níveis
- **Custo**: `baseCost × 1.15^level` (crescimento exponencial)
- **Produção**: `baseProduction × 1.05^(level-1)` (multiplicador por nível)
- **Automação**: Requer gerente para produção passiva contínua

### 👨‍💼 Sistema de Gerentes

Gerentes automatizam órgãos e fornecem bônus:

1. **Sistema Nervoso Autônomo** (100 Hormônios)
   - Automatiza: Coração + Pulmões
   - Bônus: +10% produção

2. **Sistema Endócrino** (250 Hormônios)
   - Automatiza: Fígado
   - Bônus: +15% produção global

3. **Sistema Renal** (180 Hormônios)
   - Automatiza: Rins
   - Bônus: +20% eficiência

4. **Homeostase Master** (500 Hormônios)
   - Automatiza: TODOS os órgãos
   - Bônus: +50% produção offline

### 🔬 Upgrades Globais

#### Metabólicos (ATP)
- **Mitocôndrias Eficientes** (5K ATP): +25% ATP global
- **Ciclo de Krebs Otimizado** (25K ATP): +50% produção aeróbica
- **ATP Sintase Turbo** (100K ATP): 2x velocidade de geração

#### Hormonais (Hormônios)
- **Eixo HPA Calibrado** (50 Hormônios): Stress vira produtividade (+30%)
- **Tiroxina Boost** (100 Hormônios): +100% metabolismo basal

#### Evolutivos (Experiência)
- **Adaptação Celular** (1000 XP): Órgãos evoluem automaticamente (+50%)

### 🧬 Sistema de Prestígio

**Reencarnação Celular** - Reset completo com recompensas permanentes:

- **Requisito**: 1M ATP (escala exponencialmente: 1M → 10M → 100M...)
- **Recompensa**: Células-Tronco calculadas por `log10(excesso) × 10`
- **Benefício**: Cada Célula-Tronco = +10% multiplicador permanente
- **Mantém**: Multiplicador permanente, conhecimento do jogador
- **Reseta**: ATP, Hormônios, níveis de órgãos, upgrades

## 📊 Loops de Vício

### 1. Loop Imediato (< 10s)
Click → Ver ATP subir → Dopamina → Querer clicar novamente

### 2. Loop de Curto Prazo (1-5min)
Upgrade órgão → Produção +50% → Sensação de poder → Buscar próximo upgrade

### 3. Loop de Médio Prazo (15-30min)
Comprar gerente → Produção passiva → Coletar ATP acumulado → Euforia → Investir em mais upgrades

### 4. Loop de Longo Prazo (2-3h)
Atingir milestone → Fazer prestige → Multiplicador permanente → Recomeçar com poder exponencial

## 🎯 Implementação Atual

### ✅ Completo

1. **Core System** (`src/game/idleSystem.ts`)
   - Interfaces TypeScript completas
   - Cálculos de produção e custos
   - Sistema de prestige
   - Formatação de números
   - Processamento de ganhos offline

2. **React Hook** (`src/game/useIdleGame.ts`)
   - Game loop com requestAnimationFrame
   - Auto-save a cada 5 segundos em localStorage
   - Ganhos offline (50%-100% eficiência)
   - Funções de compra/upgrade
   - Sistema de prestígio

3. **UI Component** (`src/components/HUD/IdleGamePanel.tsx`)
   - Display de 3 moedas
   - Grid de 6 órgãos clicáveis
   - Painel de 4 gerentes
   - 6 upgrades globais
   - Botão de prestígio com cálculo de recompensa
   - Popup de ganhos offline
   - Números flutuantes animados
   - Estatísticas (total ganho/gasto, tempo de jogo)

4. **Integration** (`src/pages/GameDashboard.tsx`)
   - Nova aba "Idle Game" ⚡
   - Totalmente funcional ao lado das outras abas

## 🎨 Features Visuais

- **Números flutuantes**: Animação CSS `@keyframes float-up` para feedback visual
- **Cores por moeda**: Amarelo (ATP), Roxo (Hormônios), Ciano (Células-Tronco)
- **Status visual**: Órgãos owned vs locked, gerentes unlocked, upgrades purchased
- **Affordability**: Botões ficam opacos quando não há recursos
- **Popup offline**: Exibe ganhos acumulados durante ausência (>1min)

## 🚀 Como Usar

1. **Abra a aba "Idle Game"** no GameDashboard
2. **Coração já está ativo**, gerando 10 ATP/s
3. **Clique em "Melhorar"** para aumentar o nível do Coração
4. **Desbloqueie Pulmões** (100 ATP) para mais produção
5. **Compre o Cérebro** (1000 ATP) para começar a gerar Hormônios
6. **Contrate gerentes** para automação completa
7. **Compre upgrades globais** para multiplicadores
8. **Faça prestige** ao atingir 1M ATP para ganho permanente

## 📈 Progressão Típica

| Tempo | Milestone | Ação |
|-------|-----------|------|
| 0-2min | 100 ATP | Desbloquear Pulmões |
| 3-5min | 500 ATP | Desbloquear Estômago/Fígado |
| 10-15min | 1K ATP | Desbloquear Cérebro (hormônios) |
| 20-30min | 5K ATP | Primeiro upgrade global |
| 1h | 100 Hormônios | Primeiro gerente (automação) |
| 2-3h | 1M ATP | **Primeiro Prestige** 🧬 |
| 30min pós-prestige | 10M ATP | Segundo prestige (mais rápido) |

## 🎓 Valor Educacional

- **Mitocôndrias**: Geradoras reais de ATP
- **Ciclo de Krebs**: Processo aeróbico de energia
- **Eixo HPA**: Sistema de resposta ao stress
- **Homeostase**: Equilíbrio fisiológico
- **Sistema Nervoso Autônomo**: Controle involuntário
- **Tiroxina**: Hormônio tireoidiano do metabolismo

## 🔄 Próximas Fases (Futuro)

### Phase 2: Eventos Dinâmicos
- Converter eventos da simulação em mini-games
- Recompensas em Hormônios por resolução rápida
- Eventos negativos como "impostos" na produção

### Phase 3: Achievement System
- 30+ conquistas categorizadas
- Recompensas de XP e multiplicadores
- Sistema de badges/troféus

### Phase 4: Social
- Leaderboards globais
- Clãs fisiológicos (Sistema Cardiovascular, Respiratório...)
- Eventos sazonais competitivos

## 🐛 Debug Commands

Adicione no DevTools console:

```javascript
// Ver estado completo
JSON.parse(localStorage.getItem('homeostasis_idle_save'))

// Adicionar ATP
const state = JSON.parse(localStorage.getItem('homeostasis_idle_save'));
state.atp = 1000000;
localStorage.setItem('homeostasis_idle_save', JSON.stringify(state));

// Reset completo
localStorage.removeItem('homeostasis_idle_save');
```

## 📦 Arquivos Criados

```
src/
├── game/
│   ├── idleSystem.ts          # Core logic, interfaces, cálculos
│   └── useIdleGame.ts         # React hook com game loop
├── components/HUD/
│   └── IdleGamePanel.tsx      # UI completa do idle game
└── index.css                   # Animação float-up
```

## 🎮 Filosofia de Design

1. **Respeito ao tempo**: Produção offline garante que jogadores casuais não sejam punidos
2. **Progressão clara**: Sempre há um próximo objetivo visível
3. **Escolhas significativas**: Gerentes vs upgrades = estratégia
4. **Recompensa frequente**: Números sempre subindo = satisfação constante
5. **Prestige opcional**: Jogadores decidem quando estão prontos para resetar
6. **Educação sutil**: Aprende fisiologia real através da mecânica de jogo

---

**Status**: ✅ MVP Completo e funcional
**Última atualização**: 2024
