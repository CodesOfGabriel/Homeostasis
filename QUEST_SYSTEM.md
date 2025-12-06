# Quest System Implementation

## 📜 Visão Geral

O sistema de quests foi implementado para adicionar objetivos de curto e longo prazo ao jogo, aumentando a gamificação e fornecendo recompensas que incentivam o jogador a manter a homeostase.

## 🎯 Tipos de Quests

### 1. **Daily Quests (Diárias)**
Renovam a cada 24 horas e fornecem objetivos diários:

#### Quest: "⚖️ Equilíbrio Perfeito"
- **Objetivo**: Manter homeostase > 80 por 5 minutos
- **Dificuldade**: Fácil
- **Recompensas**: 100 HP + 50 XP

#### Quest: "⚡ Produtor Eficiente"
- **Objetivo**: Gerar 10.000 ATP
- **Dificuldade**: Fácil
- **Recompensas**: 75 HP + 10 Hormônios

#### Quest: "📈 Evolução Constante"
- **Objetivo**: Melhorar qualquer órgão 3 vezes
- **Dificuldade**: Médio
- **Recompensas**: 150 HP + 100 XP

#### Quest: "💪 Sobrevivente"
- **Objetivo**: Manter carga alostática < 30 por 10 minutos
- **Dificuldade**: Médio
- **Recompensas**: 200 HP + 5.000 ATP

### 2. **Story Quests (Principais)**
Quests de progressão que desbloqueiam conforme o jogador avança:

#### Quest: "🌟 Primeiro Equilíbrio"
- **Objetivo**: Ganhar o primeiro Ponto de Homeostase
- **Dificuldade**: Fácil
- **Recompensas**: 50 HP + 25 XP
- **Desbloqueia**: Sempre disponível

#### Quest: "💎 Mestre do Equilíbrio"
- **Objetivo**: Acumular 100 Pontos de Homeostase
- **Dificuldade**: Médio
- **Recompensas**: 500 HP + 200 XP + 50 Hormônios
- **Desbloqueia**: Após completar "Primeiro Equilíbrio"

#### Quest: "🫀 Sistema Completo"
- **Objetivo**: Desbloquear todos os 8 órgãos
- **Dificuldade**: Difícil
- **Recompensas**: 1.000 HP + 500 XP + 50.000 ATP
- **Desbloqueia**: Após completar "Primeiro Equilíbrio"

#### Quest: "🔄 Renascimento"
- **Objetivo**: Completar o primeiro Prestige
- **Dificuldade**: Difícil
- **Recompensas**: 2.000 HP + 1.000 XP + 100 Hormônios
- **Desbloqueia**: Após progresso significativo

## 🛠️ Arquitetura Técnica

### Arquivos Criados/Modificados

#### 1. `src/game/questSystem.ts`
Sistema core de quests:
- **Interfaces**: Quest, QuestObjective, QuestReward, QuestDifficulty, QuestType
- **Funções**:
  - `updateQuestProgress()`: Atualiza progresso baseado em gameState e physiology
  - `claimQuestRewards()`: Aplica recompensas ao gameState
  - `checkQuestUnlocks()`: Verifica quests que devem desbloquear
  - `resetDailyQuests()`: Reseta quests diárias (a cada 24h)

#### 2. `src/game/simulationStore.ts`
Integração com o store:
- **Novos campos**:
  - `dailyQuests: Quest[]`
  - `storyQuests: Quest[]`
  - `lastDailyReset: number`
- **Novos métodos**:
  - `updateQuests(gameState)`: Atualiza progresso de todas as quests
  - `checkDailyReset()`: Verifica se é hora de resetar diárias

#### 3. `src/game/useIdleGame.ts`
Conexão com o game loop:
- Chama `updateQuests()` a cada tick do game loop
- Chama `checkDailyReset()` automaticamente
- Progresso atualiza em tempo real

#### 4. `src/components/HUD/QuestPanel.tsx`
Interface visual (~300 linhas):
- **Tabs**: Diárias vs Principais
- **Quest Card**: Mostra título, descrição, objetivos, progresso, recompensas
- **Botão Resgatar**: Aparece quando quest completa
- **Progress Bar**: Visual do progresso geral
- **Badges**: Indicador de quests completadas não resgatadas
- **Notificações**: Toast quando resgata recompensas (react-hot-toast)

#### 5. `src/pages/GameDashboard.tsx`
Integração no dashboard:
- Botão "📜 Quests" no header (roxo/rosa)
- Modal do QuestPanel
- Estado `questPanelOpen`

#### 6. `src/App.tsx`
Toaster global para notificações

## 🎨 Design e UX

### Cores por Dificuldade
- **Easy**: Verde (`text-green-400`, `bg-green-500/20`)
- **Medium**: Amarelo (`text-yellow-400`, `bg-yellow-500/20`)
- **Hard**: Vermelho (`text-red-400`, `bg-red-500/20`)

### Estados Visuais
1. **Em Progresso**: Borda com cor da dificuldade
2. **Completa**: Borda verde pulsante + badge "✓ Completa!"
3. **Resgatada**: Opacidade 60% + texto "✓ Recompensas resgatadas"

### Animações
- Framer Motion para entrada/saída do modal
- Progress bar animada
- Badge de "Completa" com scale animation
- Hover effects nos botões

## 📊 Sistema de Progresso

### Tracking Automático
As quests são atualizadas automaticamente a cada tick (~200ms):

```typescript
// Exemplo: Quest de homeostase
if (physiology.homeostasisScore > 80 && physiology.allostaticLoad < 30) {
    objective.current += deltaTime; // Acumula tempo em segundos
}
```

### Tipos de Tracking
1. **Tempo**: Acumula segundos quando condição satisfeita
2. **Contador**: Baseado em valores do gameState (totalATPEarned, homeostasisPoints)
3. **Threshold**: Órgãos desbloqueados, upgrades comprados

### Reset Diário
```typescript
const hoursSinceReset = (now - lastDailyReset) / (1000 * 60 * 60);
if (hoursSinceReset >= 24) {
    // Reset todas as daily quests
}
```

## 🎁 Sistema de Recompensas

### Aplicação de Recompensas
Quando o jogador clica em "Resgatar Recompensas":

1. Atualiza localStorage com novos valores
2. Marca quest como `claimed: true`
3. Mostra toast com resumo das recompensas
4. Recarrega página para aplicar mudanças

### Tipos de Recompensas
- **HomeostasisPoints**: Moeda premium gerada passivamente
- **ATP**: Moeda básica de energia
- **Hormones**: Moeda para ações especiais
- **Experience**: Para progressão de nível (futuro)

## 🔮 Expansões Futuras

### Novas Quests
1. **Weekly Quests**: Objetivos semanais com recompensas maiores
2. **Event Quests**: Missões especiais durante eventos
3. **Chain Quests**: Séries de quests que desbloqueiam sequencialmente
4. **Challenge Quests**: Objetivos extremamente difíceis

### Novos Recursos
1. **Quest Board**: Hub visual de quests com filtros
2. **Quest Notifications**: Pop-ups quando quest completa
3. **Quest Streaks**: Bônus por completar X dias seguidos
4. **Quest Achievements**: Conquistas meta (completar 100 quests)

### Integrações
1. **Leaderboards**: Ranking de quests completadas
2. **Social**: Compartilhar progresso de quests
3. **Seasons**: Quests exclusivas por temporada

## 📝 Notas de Implementação

### Performance
- Quests são atualizadas no mesmo loop do jogo (sem overhead extra)
- Apenas quests `unlocked` são processadas
- Quests `completed` param de atualizar

### Persistência
- Quests salvas no `simulationStore` (Zustand)
- Daily reset timestamp em localStorage
- Compatível com sistema de save existente

### Debugging
```typescript
// Ver estado das quests no console
console.log(useSimulationStore.getState().dailyQuests);
console.log(useSimulationStore.getState().storyQuests);
```

## ✅ Checklist de Implementação

- [x] Sistema core de quests (`questSystem.ts`)
- [x] Integração com simulationStore
- [x] Conexão com game loop (useIdleGame)
- [x] UI do QuestPanel
- [x] Botão de acesso no dashboard
- [x] Sistema de notificações (toast)
- [x] Daily reset automático
- [x] Quest unlock progression
- [x] Tracking de progresso em tempo real
- [x] Sistema de recompensas
- [x] Animações e feedback visual
- [x] Correção da métrica respiratória (rpm → FR)

## 🐛 Issues Conhecidos

1. **Reload necessário**: Resgatar recompensas recarrega a página (poderia ser melhorado com state management melhor)
2. **Daily reset**: Acontece na próxima sessão após 24h, não exatamente às 00:00
3. **Quest progress persistence**: Progresso de tempo (segundos) não é salvo entre sessões

## 🎮 Como Usar

1. **Abrir Quests**: Clique no botão "📜 Quests" no topo da tela
2. **Ver Progresso**: Tabs para alternar entre Diárias e Principais
3. **Completar**: Progresso atualiza automaticamente enquanto joga
4. **Resgatar**: Botão verde "🎁 Resgatar Recompensas" quando completa
5. **Notificação**: Toast mostra resumo das recompensas recebidas

---

**Implementado em**: Quest System Implementation Session
**Documentação atualizada**: Dezembro 2024
