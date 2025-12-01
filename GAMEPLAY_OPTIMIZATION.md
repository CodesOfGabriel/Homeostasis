# Otimizações de Gameplay - Sistema de Eventos e Ações

## 📋 Resumo das Melhorias

Este documento descreve as otimizações implementadas no sistema de gameplay, focando na resolução estratégica de eventos metabólicos através de combinações de ações.

## 🎮 Novos Sistemas Implementados

### 1. Sistema de Soluções de Eventos (`eventSolutions.ts`)

**Funcionalidade:** Mapeia cada evento para ações ótimas e requisitos de substâncias.

**Características:**
- ✅ Define ações ideais para cada evento
- ✅ Estabelece níveis de substâncias necessários para resolução ótima
- ✅ Sistema de bônus para ações corretas
- ✅ Sistema de penalidades para ações erradas
- ✅ Avaliação de efetividade das ações (0-1)

**Exemplo:**
```typescript
stressWork: {
  optimalActions: ['reduceCortisol', 'vasodilation'],
  requiredSubstances: {
    cortisol: { max: 40 },
    stress: { max: 50 }
  },
  bonus: { dopamine: 10, energy: 5 },
  penalty: { stress: 10 }
}
```

### 2. Sistema de Combos

**Funcionalidade:** Detecta combinações de ações realizadas em sequência e aplica bônus especiais.

**Combos Disponíveis:**

1. **Emergency Response** ⚡
   - Ações: `releaseAdrenaline` + `increaseVentilation`
   - Janela: 5 segundos
   - Bônus: +10 HR, +5 O2, +15 perfusão cerebral

2. **Metabolic Optimization** 💪
   - Ações: `releaseGlucose` + `releaseInsulin`
   - Janela: 10 segundos
   - Bônus: +20 mTOR, +15 energia, +10 perfusão muscular

3. **Stress Mastery** 🧘
   - Ações: `reduceCortisol` + `vasodilation`
   - Janela: 8 segundos
   - Bônus: +15 serotonina, +10 dopamina, -20 stress

4. **Athletic Performance** 🏃‍♂️
   - Ações: `releaseAdrenaline` + `releaseGlucose` + `increaseVentilation`
   - Janela: 10 segundos
   - Bônus: +5 VO2Max, +20 energia, +10 testosterona

5. **Recovery Protocol** 💤
   - Ações: `reduceCortisol` + `releaseGlucose` + `vasodilation`
   - Janela: 15 segundos
   - Bônus: +25 energia, +15 GH, +10 serotonina

### 3. Eventos Metabólicos Expandidos

**Novos Eventos Adicionados:**

| Evento | ID | Efeitos | Soluções Ótimas |
|--------|------|---------|-----------------|
| 🍬 Hyperglycemia | `hyperglycemia` | ↑ Glicose, ↓ Insulina | `releaseInsulin`, `exercise` |
| 🧪 Metabolic Acidosis | `acidosis` | ↑ Lactato, ↓ pH | `increaseVentilation` |
| 😮‍💨 Tissue Hypoxia | `hypoxia` | ↑ HR, ↑ Adrenalina | `oxygenationBoost`, `increaseVentilation` |
| 🔥 Acute Inflammation | `inflammation` | ↑ Stress, ↑ Cortisol | `antiInflammatory`, `reduceCortisol` |
| 💧 Dehydration | `dehydration` | ↑ HR, ↓ Energia | `hydrationBoost`, `vasodilation` |
| 🥶 Cold Exposure | `coldExposure` | ↑ Adrenalina, ↓ Energia | `thermoregulation`, `releaseGlucose` |
| 🥵 Heat Stress | `heatStress` | ↑ HR, ↑ Stress | `thermoregulation`, `vasodilation` |
| 🩸 Low Hemoglobin | `anaemiaEpisode` | ↑ HR, ↓ Energia | `oxygenationBoost`, `increaseVentilation` |
| 🫘 Renal Strain | `kidneyStrain` | ↑ Stress | `renalSupport`, `hydrationBoost` |
| 🏥 Hepatic Overload | `liverOverload` | ↑ Stress, ↓ Energia | `detoxification`, `metabolicSwitch` |

### 4. Novas Ações Terapêuticas

**10 Novas Ações Adicionadas:**

1. **🛡️ Resposta Antioxidante** (`antioxidantBoost`)
   - Ativa via Nrf2, combate estresse oxidativo
   - Cooldown: 35s, Custo: 10 energia

2. **🧊 Anti-Inflamatório** (`antiInflammatory`)
   - Suprime NF-κB, reduz inflamação
   - Cooldown: 40s, Custo: 12 energia

3. **⚡ Switch Metabólico** (`metabolicSwitch`)
   - Ativa AMPK, melhora eficiência energética
   - Cooldown: 30s, Custo: 8 energia

4. **💧 Retenção Hídrica** (`hydrationBoost`)
   - Otimiza balanço de fluidos
   - Cooldown: 20s, Custo: 5 energia

5. **🌡️ Termorregulação** (`thermoregulation`)
   - Ajusta temperatura corporal
   - Cooldown: 25s, Custo: 6 energia

6. **🫁 Boost de O2** (`oxygenationBoost`)
   - Maximiza captação de oxigênio
   - Cooldown: 20s, Custo: 7 energia

7. **🧹 Detoxificação** (`detoxification`)
   - Ativa metabolismo hepático
   - Cooldown: 45s, Custo: 10 energia

8. **🫘 Suporte Renal** (`renalSupport`)
   - Otimiza filtração glomerular
   - Cooldown: 35s, Custo: 8 energia

9. **💪 Impulso Anabólico** (`anabolicPush`)
   - Ativa mTOR, promove crescimento
   - Cooldown: 50s, Custo: 15 energia

10. **🧠 Equilíbrio Neural** (`neurotransmitterBalance`)
    - Otimiza dopamina e serotonina
    - Cooldown: 30s, Custo: 10 energia

### 5. Sistema de Feedback Visual

**Componentes de Interface Novos:**

#### ComboDisplay
- Mostra score de performance atual
- Indica combo ativo com animação
- Exibe dicas para ganhar pontos

#### ActiveEventHelp
- Lista eventos ativos
- Mostra ações ótimas para cada evento
- Indica parâmetros-alvo
- Fornece dicas estratégicas

## 🎯 Como Funciona o Sistema de Pontuação

### Ganhar Pontos:

1. **Ação Ótima para Evento** (+50 pontos)
   - Use uma ação que está na lista de "optimal actions" para um evento ativo
   - Recebe bônus adicional nos parâmetros

2. **Combo Ativado** (+100 pontos)
   - Execute uma sequência de ações dentro da janela de tempo
   - Recebe bônus especial do combo

3. **Resolução Perfeita**
   - Use ação ótima + parâmetros nos níveis corretos
   - Maximiza efetividade e recebe todos os bônus

### Perder Efetividade:

1. **Ação Subótima**
   - Use ação não listada como ótima
   - Pode receber penalidades no parâmetro
   - Efetividade reduzida

2. **Parâmetros Fora do Range**
   - Ação ótima mas substâncias não estão nos níveis necessários
   - Efetividade reduzida em 20%

## 🧪 Como Testar

### Teste 1: Resolução Ótima de Evento

1. Inicie a simulação
2. Aguarde um evento aparecer (ex: "Deadline Approaching")
3. Consulte o painel "Active Events & Solutions"
4. Use uma das ações recomendadas
5. Observe:
   - ✅ Feedback positivo na notificação
   - ✅ Score aumenta em +50
   - ✅ Bônus aplicados aos parâmetros

### Teste 2: Combo de Ações

1. Escolha um combo para testar (ex: "Emergency Response")
2. Execute `releaseAdrenaline`
3. Dentro de 5 segundos, execute `increaseVentilation`
4. Observe:
   - 🌟 Notificação "COMBO!"
   - ✅ Score aumenta em +100
   - ✅ Bônus especial aplicado
   - ✅ Animação no painel de combo

### Teste 3: Evento Específico

**Exemplo: Hyperglycemia**

1. Force hyperglycemia aumentando glicose
2. Evento "🍬 Hyperglycemia" aparece
3. Use `releaseInsulin` (ação ótima)
4. Observe glicose normalizar com bônus
5. Score aumenta

**Exemplo: Stress no Trabalho**

1. Aguarde evento "Deadline Approaching"
2. Use combo "Stress Mastery":
   - `reduceCortisol`
   - `vasodilation`
3. Recebe bônus do evento + bônus do combo
4. Score aumenta significativamente

### Teste 4: Ação Subótima

1. Aguarde evento aparecer
2. Use uma ação NÃO recomendada
3. Observe:
   - ❌ Feedback negativo
   - ⚠️ Possível penalidade
   - ➖ Sem ganho de score

## 📊 Integração com Interface

### Localização dos Novos Componentes:

**Sidebar Esquerdo (My Body):**
1. Visualização anatômica
2. **ComboDisplay** - Score e combo ativo
3. **ActiveEventHelp** - Eventos e soluções
4. Ícones de órgãos

**Botões de Ações:**
- Todos os botões continuam funcionando normalmente
- Agora com feedback inteligente baseado em eventos
- Cooldowns visuais mantidos

## 🔄 Fluxo de Gameplay Otimizado

```
Evento Aparece
    ↓
Consulta Painel de Ajuda
    ↓
Identifica Ações Ótimas
    ↓
Verifica Parâmetros Necessários
    ↓
Executa Ação Ótima
    ↓
Feedback Instantâneo
    ↓
Score Aumenta + Bônus Aplicados
    ↓
(Opcional) Tenta Combo
    ↓
Evento Resolvido com Sucesso
```

## 💡 Dicas Estratégicas

1. **Priorize Eventos Ativos**
   - Sempre consulte o painel de ajuda
   - Ações certas no momento certo valem mais

2. **Planeje Combos**
   - Memorize sequências de combo
   - Observe janelas de tempo

3. **Gerencie Energia**
   - Ações ótimas são investimento
   - Energia bem gasta retorna como bônus

4. **Monitore Parâmetros**
   - Mantenha substâncias nos ranges ideais
   - Maximiza efetividade das ações

5. **Aprenda Padrões**
   - Certos eventos aparecem mais frequentemente
   - Desenvolva estratégias específicas

## 🎓 Resumo para Jogadores

### Básico:
- Eventos aparecem aleatoriamente
- Use ações para resolver eventos
- Botões ficam em cooldown após uso

### Avançado:
- Cada evento tem ações ótimas específicas
- Combos de ações dão bônus especiais
- Score reflete sua performance estratégica
- Parâmetros corretos aumentam efetividade

### Mestre:
- Antecipe eventos baseado em padrões
- Prepare combos antes de eventos críticos
- Mantenha parâmetros nos ranges ótimos
- Maximize score com timing perfeito

## ✅ Verificação de Funcionalidade

### Sistemas Verificados:
- ✅ EventSolutions implementado
- ✅ Combo detection funcionando
- ✅ Feedback em tempo real
- ✅ Score tracking ativo
- ✅ Bônus/penalidades aplicados
- ✅ Interface atualizada
- ✅ Botões de ação funcionais
- ✅ Cooldowns visuais
- ✅ Notificações inteligentes
- ✅ Componentes visuais integrados

### Para Verificar Manualmente:
1. Clique em qualquer botão de ação
2. Observe cooldown visual
3. Veja notificação de feedback
4. Verifique mudança no score
5. Observe bônus nos parâmetros

## 🚀 Próximos Passos Sugeridos

1. Balanceamento de valores de bônus/penalidades
2. Mais combos avançados (4-5 ações)
3. Tutorial interativo para novos jogadores
4. Sistema de achievements baseado em score
5. Leaderboard de melhores pontuações
6. Desafios diários com eventos específicos
