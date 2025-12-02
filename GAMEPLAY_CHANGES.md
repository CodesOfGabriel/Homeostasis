# 🎮 GAMEPLAY CHANGES - Phase 2 Implementation

## 🆕 O que mudou na jogabilidade?

### ANTES (Sistema Antigo)
```
- ATP era uma moeda que acumulava infinitamente
- Não havia consequências fisiológicas
- Jogo era puramente clicker/idle (comprar e esperar)
- Sem mecânica de gestão ou risco
```

### AGORA (Sistema Novo) ✨
```
- ATP é um FLUXO (produção vs consumo)
- Homeostase gera a MOEDA PRINCIPAL do jogo
- Precisa equilibrar parâmetros fisiológicos
- Decisões têm consequências (stress, reservas, etc)
```

---

## 🎯 Nova Mecânica Principal: **Manter Homeostase**

### Como Funciona:

1. **Mantenha parâmetros vitais no range ideal:**
   - Frequência Cardíaca: ~70 bpm
   - Glicose: ~90 mg/dL
   - Oxigênio: ~98%
   - Temperatura: ~36.8°C
   - pH: ~7.4
   - Respiração: ~14 rpm

2. **Score de Homeostase sobe quando tudo está equilibrado**
   - 80-100 = Excelente (cor verde)
   - 60-79 = Moderado (cor amarela)
   - 0-59 = Crítico (cor vermelha)

3. **Quando Homeostase > 70 E Carga Alostática < 30:**
   - ✅ Você gera **Pontos de Homeostase** automaticamente!
   - Taxa: `(homeostasisScore / 100)` HP por segundo
   - Exemplo: Score de 80 = 0.8 HP/s

4. **Carga Alostática aumenta com estresse crônico:**
   - Cortisol alto
   - Glicose desregulada
   - Baixo oxigênio
   - Temperatura alta
   - Déficit de ATP

---

## 📊 Novo Painel de Status Fisiológico

### Localização
Na aba **"Overview"** do dashboard, no topo.

### O que mostra:

#### 1. **Fluxo de ATP** (esquerda)
```
🟢 Produção ATP:  50.0 mmol/s
🟠 Consumo ATP:   45.0 mmol/s
⚖️  Balanço:      +5.0 mmol/s  📈
```

**Como interpretar:**
- **Positivo (+)**: Corpo acumula energia → glicogênio/gordura
- **Negativo (-)**: Corpo queima reservas
- **Muito negativo**: Aumenta carga alostática (dano!)

#### 2. **Reservas de Biomassa** (direita)
```
Glicogênio: 500g / 600g  [========== 83%]
Gordura:    14.0kg / 50kg [===        28%]
```

**Como funciona:**
- Excesso de ATP → converte em glicogênio (rápido, limite 600g)
- Se glicogênio cheio → vira gordura (lento, limite 50kg)
- Déficit de ATP → queima glicogênio primeiro, depois gordura
- Sem reservas → **CRISE ENERGÉTICA** (dano aos órgãos)

#### 3. **Medidores de Saúde** (embaixo)
```
[Homeostase: 85]  [========== 85%] ✅ Gerando HP!
[C. Alostática: 15] [===        15%]
```

---

## 💰 Nova Moeda Principal: **Pontos de Homeostase**

### No Header (topo da tela)
```
[⚖️ Homeostase]
   1,234 HP
   ✅ +0.85/s
```

**Visual:**
- Quando gerando HP: card pisca em verde, badge animado
- Quando NÃO gerando: card normal, taxa 0/s

### Como Usar HP (futuramente):
- Comprar upgrades especiais
- Desbloquear habilidades
- Acelerar recuperação
- Resistir a eventos negativos

---

## 🎓 Tutorial Atualizado

### Nova Página no Tutorial:
**"Sistema de Homeostase ⚖️"**

Explica:
- O que é Score de Homeostase
- Como funciona Carga Alostática
- Balanço de ATP e reservas
- Como gerar Pontos de Homeostase

**Como acessar:** Clique no botão **? (Help)** no header

---

## 🎮 Estratégias de Gameplay

### 1. **Modo Passivo (Idle Estável)**
- Mantenha tudo equilibrado
- Não use ações extremas
- Gere HP constantemente (0.7-0.9 HP/s)
- Acumule HP para upgrades futuros

### 2. **Modo Ativo (Risk/Reward)**
- Use ações fortes (Adrenalina, Cortisol)
- Aumenta ATP production temporariamente
- **MAS** desequilibra homeostase
- Para de gerar HP, acumula carga alostática
- **Trade-off:** ganho imediato vs saúde a longo prazo

### 3. **Modo Recovery (Recuperação)**
- Foque em reduzir Carga Alostática
- Mantenha stress baixo (<30)
- Use ações de relaxamento
- Homeostase volta ao normal
- HP generation retorna

---

## 📈 Progressão Visual

### Curto Prazo (agora visível):
1. Veja ATP como fluxo dinâmico
2. Observe reservas aumentando/diminuindo
3. Monitore homeostase em tempo real
4. Ganhe HP passivamente

### Médio Prazo (Phase 3-4):
1. Hormônios afetarão comportamento
2. NPC tomará decisões automáticas
3. Políticas ambientais (dieta, sono, exercício)
4. Efeitos visuais na tela (blur, vinheta, etc)

### Longo Prazo (Phase 5):
1. Upgrades de órgãos com HP
2. Hipertrofia muscular custando biomassa
3. Eficiência energética melhorada
4. Sistema completo de sobrevivência

---

## 🐛 Bugs Corrigidos

1. ✅ **Infinite loop** no IdleGameContext
2. ✅ **WebGL context loss** nos componentes 3D
3. ✅ **Texture upload warnings** do WebGL

---

## ✨ Melhorias de UX

1. **Visual claro**: Verde = bom, Amarelo = atenção, Vermelho = perigo
2. **Feedback imediato**: Animações quando gerando HP
3. **Tutorial atualizado**: Explica novo sistema
4. **Backward compatible**: Saves antigos funcionam
5. **Performance**: Sem lag adicional

---

## 🎯 Próximos Passos (Fase 3)

### Hormônios e NPC Behavior
- Ações se tornam **hormonais** (não diretas)
- Ex: "Liberar Ghrelin" → NPC decide comer
- Drives comportamentais (fome, sede, sono)
- Políticas ambientais (dieta, atividade, descanso)

**Impacto:**
O jogo fica mais **estratégico** - você controla hormônios,
mas o corpo (NPC) decide o que fazer baseado em drives e ambiente.

---

## 💡 Dicas para Testar

1. **Deixe o jogo rodar** sem fazer nada
   - Homeostase deve estabilizar em ~75-85
   - HP deve gerar constantemente

2. **Use uma ação forte** (ex: Adrenalina)
   - Veja Heart Rate subir
   - Consumo ATP aumenta
   - Homeostase cai
   - HP para de gerar

3. **Observe a recuperação**
   - Após ~30s, parâmetros voltam ao normal
   - Homeostase sobe de volta
   - HP volta a gerar

4. **Monitore as reservas**
   - Se ATP positivo: glicogênio sobe
   - Se ATP negativo: glicogênio desce
   - Extremos: gordura muda

---

**Status**: ✅ **SISTEMA FUNCIONAL E VISÍVEL!**

Agora o jogador pode VER e SENTIR a diferença na jogabilidade!
