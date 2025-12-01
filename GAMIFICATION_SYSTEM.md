# 🎮 SISTEMA DE GAMIFICAÇÃO FISIOLÓGICA
## Inspirado em Adventure Capitalist + Fisiologia Realista

---

## 🎯 **CONCEITO CORE: "HOMEOSTASIS IDLE TYCOON"**

O jogador é o **Sistema Nervoso Central** gerenciando uma "corporação biológica". Cada órgão é um "departamento" que gera recursos e requer upgrades.

---

## 💰 **SISTEMA DE MOEDAS (3 TIPOS)**

### 1. **ATP (Adenosina Trifosfato)** 💎
- **Moeda principal** - Energia celular
- Gerada por: Metabolismo, respiração, digestão
- Usada para: Ações rápidas, upgrades básicos, combos

### 2. **Hormônios** 🧬
- **Moeda premium** - Sinalizadores biológicos
- Gerada por: Eventos bem-sucedidos, streaks, combos
- Usada para: Upgrades permanentes, desbloquear órgãos, multipliers

### 3. **Experiência Celular** ⭐
- **Progressão longa** - Adaptação evolutiva
- Gerada por: Tempo de jogo, desafios completados
- Usada para: Prestige system, traits permanentes

---

## 🏭 **ÓRGÃOS COMO "DEPARTAMENTOS" (Idle Generators)**

### **Estrutura de cada órgão:**

```typescript
interface OrganDepartment {
    name: string;
    level: number;
    atpPerSecond: number; // Geração passiva
    cost: number; // Custo de upgrade
    multiplier: number; // Aumenta com level
    managers: Manager[]; // Automação
    upgrades: Upgrade[]; // Melhorias permanentes
}
```

### **🫀 Coração - "Departamento de Distribuição"**
- **Gera**: ATP por batimento
- **Produção base**: 10 ATP/segundo
- **Multiplier**: +5% por nível
- **Upgrades**:
  - "Cardiomiócitos Reforçados" → +50% produção
  - "Válvulas Eficientes" → -20% custo de upgrade
  - "Marcapasso Natural+" → Batimentos automáticos (idle)

### **🫁 Pulmões - "Departamento de Oxigenação"**
- **Gera**: ATP + Bonus de O₂
- **Produção base**: 15 ATP/segundo
- **Multiplier**: +7% por nível
- **Upgrades**:
  - "Alvéolos Expandidos" → +100 alvéolos visíveis no 3D
  - "Ventilação Profunda" → 2x produção por 30s (habilidade ativa)
  - "Difusão Otimizada" → Combo com Coração (+20% ambos)

### **🟤 Fígado - "Departamento de Processamento"**
- **Gera**: ATP + Remove toxinas (multiplier geral)
- **Produção base**: 20 ATP/segundo
- **Multiplier**: +10% por nível
- **Upgrades**:
  - "Hepatócitos Premium" → +3% multiplier global
  - "Gliconeogênese Ativa" → Converte recursos em ATP
  - "Detox Master" → Eventos negativos geram ATP

### **🧠 Cérebro - "Sede Corporativa"**
- **Gera**: Hormônios (moeda premium)
- **Produção base**: 2 Hormônios/minuto
- **Multiplier**: +15% por nível
- **Upgrades**:
  - "Neuroplasticidade" → Aprende combos automaticamente
  - "Córtex Pré-frontal+" → Decisões melhores = +bonus
  - "Sistema Límbico Otimizado" → Stress vira motivação

### **🫘 Rins - "Departamento de Limpeza"**
- **Gera**: ATP + Purificação (reduce debuffs)
- **Produção base**: 12 ATP/segundo
- **Multiplier**: +6% por nível
- **Upgrades**:
  - "Néfrons Multiplicados" → +50% eficiência
  - "Filtração Glomerular+" → Remove debuffs 2x mais rápido
  - "Equilíbrio Eletrolítico" → +5% produção todos órgãos

---

## 🚀 **MANAGERS (AUTOMAÇÃO) - Sistemas Fisiológicos**

Desbloqueados com Hormônios, automatizam órgãos (idle gameplay)

### **Sistema Nervoso Autônomo** (100 Hormônios)
- Automatiza: Coração + Pulmões
- Efeito: Geram ATP mesmo offline
- Bonus: +10% velocidade de ambos

### **Sistema Endócrino** (250 Hormônios)
- Automatiza: Fígado + Pâncreas
- Efeito: Balanceia glicose automaticamente
- Bonus: +15% multiplier global

### **Sistema Renal-Urinário** (180 Hormônios)
- Automatiza: Rins + Bexiga
- Efeito: Limpa debuffs automaticamente
- Bonus: +20% eficiência de purificação

### **Homeostase Master** (500 Hormônios)
- Automatiza: TODOS os órgãos
- Efeito: Sistema aprende e otimiza sozinho
- Bonus: +50% produção offline

---

## 🎁 **SISTEMA DE UPGRADES GLOBAIS**

### **Tier 1 - Upgrades Metabólicos** (ATP)
- "Mitocôndrias Eficientes" → +25% ATP global
- "Ciclo de Krebs Otimizado" → +50% produção aeróbica
- "ATP Sintase Turbo" → 2x velocidade de geração

### **Tier 2 - Upgrades Hormonais** (Hormônios)
- "Eixo HPA Calibrado" → Stress vira produtividade
- "Tiroxina Boost" → +100% metabolismo basal
- "Insulina Responsiva" → Converte glicose em ATP 3x

### **Tier 3 - Upgrades Evolutivos** (Experiência)
- "Adaptação Celular" → Órgãos evoluem sozinhos
- "Memória Imunológica" → Resiste a eventos negativos
- "Regeneração Acelerada" → Recupera de morte 2x rápido

---

## 🏆 **PRESTIGE SYSTEM: "REENCARNAÇÃO CELULAR"**

### **Mecânica:**
- Ao atingir um marco (ex: 1 milhão ATP total gerado)
- Opção de "reiniciar" e ganhar **Células-Tronco** (moeda prestige)
- Células-Tronco dão multipliers permanentes

### **Benefícios de Prestige:**
- **1ª Prestige**: +50% ATP forever, desbloqueia Sistema Imune
- **2ª Prestige**: +100% ATP, desbloqueia Sistema Reprodutor
- **3ª Prestige**: +200% ATP, desbloqueia Telômeros (imortalidade)

### **Células-Tronco usadas em:**
- Pesquisas avançadas (árvore de tecnologia)
- Desbloqueio de sistemas novos
- Traits permanentes (ex: "Metabolismo Rápido", "Resistência ao Stress")

---

## 🎲 **EVENTOS DINÂMICOS (MINI-GAMES)**

### **Eventos Positivos** (Oportunidades)
1. **"Fluxo de Adrenalina"** (30s)
   - Clique rápido em substâncias → Ganha 10x ATP
   - Simulação: Resposta fight-or-flight

2. **"Sono REM Profundo"** (2min idle)
   - Não faça nada → Gera 50x ATP offline
   - Simulação: Recuperação durante sono

3. **"Refeição Balanceada"** (Choice)
   - Escolha nutrientes certos → +200% produção 5min
   - Simulação: Digestão otimizada

### **Eventos Negativos** (Desafios)
1. **"Infecção Bacteriana"** (Mini-boss)
   - Sistema Imune vs Patógeno
   - Vença para ganhar Hormônios premium
   - Perca = -50% produção 2min

2. **"Desidratação Crítica"** (Quick Time)
   - Tome água rápido (timed clicks)
   - Falha = Órgãos param temporariamente

3. **"Estresse Crônico"** (Management)
   - Balance cortisol vs produtividade
   - Requer decisões estratégicas

---

## 🎯 **ACHIEVEMENTS & MILESTONES**

### **Categoria: Produção**
- ⭐ "Primeira Célula" → Gere 1K ATP
- ⭐ "Organismo Funcional" → Gere 1M ATP
- ⭐ "Ser Humano Otimizado" → Gere 1B ATP

### **Categoria: Órgãos**
- 💪 "Cardiologista" → Coração nível 50
- 🫁 "Pneumologista" → Pulmões nível 50
- 🧠 "Neurologista" → Todos órgãos nível 100

### **Categoria: Maestria**
- 🔥 "Homeostase Perfeita" → 1 hora sem eventos negativos
- 🌟 "Corpo Imortal" → 5 prestiges completados
- 👑 "Deus da Fisiologia" → Todos achievements

---

## 📊 **LOOPS DE REFORÇO (ADDICTION MECHANICS)**

### **Loop 1: Short-Term (Segundos)**
```
Clique substância → ATP +10 → Feedback visual + Som
→ Dopamina real → Quer clicar de novo
```

### **Loop 2: Medium-Term (Minutos)**
```
Upgrade órgão → Produção +50% → Números sobem visivelmente
→ Satisfação → Quer próximo upgrade
```

### **Loop 3: Long-Term (Horas)**
```
Desbloqueia Manager → Automação → Jogo roda sozinho
→ Volta depois → Montanha de ATP → Euforia
→ "Só mais um upgrade..."
```

### **Loop 4: Meta (Dias)**
```
Prestige → Recomeça mais forte → Progresso exponencial
→ Sensação de poder → Vício de "mais um prestige"
```

---

## 🎨 **ELEMENTOS VISUAIS DE REFORÇO**

1. **Números flutuantes** (+10 ATP) ao clicar
2. **Barras de progresso** animadas
3. **Glow/Pulse** quando órgão produz ATP
4. **Particle effects** em upgrades
5. **Screen shake** em eventos grandes
6. **Combo meter** visual crescendo
7. **Achievement popups** com som satisfatório
8. **Ranking leaderboard** semanal

---

## 🔊 **ÁUDIO DESIGN (Crucial para dopamina)**

- **Clique**: Som de "pop" satisfatório
- **ATP coletado**: "Ching" de moeda
- **Level up**: Fanfarra curta
- **Prestige**: Som épico de transformação
- **Evento**: Alerta sonoro distintivo
- **Música ambiente**: Batimentos cardíacos rítmicos (aumenta com progresso)

---

## 📱 **NOTIFICAÇÕES & RETENTION**

### **Push Notifications:**
- "Seu corpo está gerando ATP offline! Volte e colete."
- "Evento especial: Surto de Adrenalina disponível!"
- "Você pode fazer Prestige agora. Quer evoluir?"

### **Daily Rewards:**
- Dia 1: 100 ATP
- Dia 3: 1 Manager grátis
- Dia 7: 50 Hormônios
- Dia 30: 1 Célula-Tronco (prestige currency)

---

## 🎓 **ELEMENTO EDUCACIONAL (Diferencial)**

Enquanto jogam, aprendem fisiologia real:
- Tooltips explicam funções reais dos órgãos
- Eventos ensinam sobre doenças
- Upgrades baseados em conceitos médicos reais
- Quiz opcional dá bônus (gamificação educativa)

---

## 🚀 **IMPLEMENTAÇÃO PRIORIZADA**

### **MVP (Mínimo Viável):**
1. ✅ Coração, Pulmões, Fígado como geradores de ATP
2. ✅ Sistema de upgrade simples (cost → multiplier)
3. ✅ Eventos básicos (3 positivos, 2 negativos)
4. ✅ Visual 3D mostrando produção em tempo real
5. ✅ Save/Load automático (localStorage)

### **Fase 2:**
- Managers (automação)
- Sistema de Hormônios (2ª moeda)
- Upgrades globais
- Achievements

### **Fase 3:**
- Prestige system
- Mini-games em eventos
- Leaderboards
- Daily quests

### **Fase 4:**
- Multiplayer co-op (ajude corpo de amigo)
- PvP (competição de produção)
- Seasonal events (ex: "Gripe de Inverno")

---

## 💡 **POR QUE ISSO FUNCIONA?**

1. **Variável reward schedule** → Dopamina constante
2. **Progressão exponencial** → Sensação de poder
3. **Idle gameplay** → Recompensa sem esforço
4. **Prestige loop** → "Só mais uma vez..."
5. **Collection mechanics** → Completacionismo
6. **Social comparison** → Competição
7. **Narrative progression** → História do corpo evoluindo
8. **Tema único** → Diferente de outros idle games

---

## 🎯 **MÉTRICAS DE SUCESSO**

- **Retenção D1**: >60% (típico idle: 40%)
- **Retenção D7**: >30% (típico idle: 15%)
- **Session length**: 5-15 min (idle ideal)
- **Daily sessions**: 3-5x (check-ins)
- **Time to 1st prestige**: 2-3 horas (hook)

---

**RESUMO**: Um idle game onde você gerencia um corpo humano como uma empresa, cada órgão gera recursos passivamente, você faz upgrades estratégicos, eventos criam urgência, e o sistema de prestige garante replayability infinita - tudo com temática fisiológica educativa! 🎮💉
