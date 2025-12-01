# 🧪 Guia de Teste Rápido - Gameplay Otimizado

## ✅ Teste de Funcionalidade dos Botões

### 1. Teste Básico de Ação
```
1. Inicie a simulação (▶ Start)
2. Clique em "💉 Liberar Adrenalina"
3. Verifique:
   ✓ Botão fica desabilitado
   ✓ Cooldown aparece (⏱ 20s)
   ✓ Notificação aparece
   ✓ Heart Rate aumenta
   ✓ Energia aumenta
```

### 2. Teste de Todas as Ações Originais
```
✓ 💉 Liberar Adrenalina - Cooldown 20s
✓ 🧘‍♂️ Reduzir Cortisol - Cooldown 25s
✓ 💨 Aumentar Ventilação - Cooldown 15s
✓ 🍬 Liberar Insulina - Cooldown 30s
✓ ⚡ Liberar Glicose - Cooldown 20s
✓ 🔄 Vasodilatação - Cooldown 25s
```

### 3. Teste de Novas Ações
```
✓ 🛡️ Resposta Antioxidante - Cooldown 35s
✓ 🧊 Anti-Inflamatório - Cooldown 40s
✓ ⚡ Switch Metabólico - Cooldown 30s
✓ 💧 Retenção Hídrica - Cooldown 20s
✓ 🌡️ Termorregulação - Cooldown 25s
✓ 🫁 Boost de O2 - Cooldown 20s
✓ 🧹 Detoxificação - Cooldown 45s
✓ 🫘 Suporte Renal - Cooldown 35s
✓ 💪 Impulso Anabólico - Cooldown 50s
✓ 🧠 Equilíbrio Neural - Cooldown 30s
```

## 🎯 Cenários de Teste

### Cenário 1: Evento de Stress
```
QUANDO: Evento "⚠️ Deadline Approaching" aparecer
FAÇA:
1. Observe o painel "Active Events & Solutions"
2. Veja as ações recomendadas: reduceCortisol, vasodilation
3. Clique em "🧘‍♂️ Reduzir Cortisol"
4. Dentro de 8 segundos, clique em "🔄 Vasodilatação"

RESULTADO ESPERADO:
✓ Feedback "✅ Optimal action!"
✓ Score aumenta +50 (primeira ação)
✓ Notificação "🌟 COMBO! Perfect calm achieved!"
✓ Score aumenta +100 (combo)
✓ Bônus: +15 serotonina, +10 dopamina, -20 stress
✓ Stress diminui significativamente
```

### Cenário 2: Combo de Emergência
```
FAÇA:
1. Clique em "💉 Liberar Adrenalina"
2. Rapidamente (< 5s) clique em "💨 Aumentar Ventilação"

RESULTADO ESPERADO:
✓ Notificação "🌟 COMBO! ⚡ Emergency cardiovascular boost!"
✓ Score aumenta +100
✓ Heart Rate +10
✓ Blood Oxygen +5
✓ Brain Perfusion +15
✓ Painel de combo mostra "Emergency Response"
```

### Cenário 3: Combo Metabólico
```
FAÇA:
1. Clique em "⚡ Liberar Glicose"
2. Dentro de 10s, clique em "🍬 Liberar Insulina"

RESULTADO ESPERADO:
✓ Combo "💪 Enhanced anabolic state!"
✓ Score +100
✓ mTOR +20
✓ Energia +15
✓ Perfusão Muscular +10
```

### Cenário 4: Performance Atlética (Combo Avançado)
```
FAÇA:
1. Clique em "💉 Liberar Adrenalina"
2. Clique em "⚡ Liberar Glicose"
3. Clique em "💨 Aumentar Ventilação"
(Tudo dentro de 10 segundos)

RESULTADO ESPERADO:
✓ Combo "🏃‍♂️ Peak athletic performance!"
✓ Score +100
✓ VO2Max +5
✓ Energia +20
✓ Testosterona +10
✓ Perfusão Muscular +15
```

### Cenário 5: Ação Subótima
```
QUANDO: Evento de Hypoglycemia ("🍽️ Low Blood Sugar")
FAÇA:
1. Clique em "💉 Liberar Adrenalina" (ação ERRADA)

RESULTADO ESPERADO:
✓ Notificação "❌ This action may not be optimal"
✓ Penalidade: +10 cortisol, -15 energia
✓ SEM ganho de score
✓ Evento continua ativo
```

## 📊 Verificação Visual

### Painel "Performance Score"
```
LOCALIZAÇÃO: Sidebar esquerdo, acima dos eventos
ELEMENTOS:
✓ Número grande mostrando score atual
✓ Indicador de combo ativo (quando aplicável)
✓ 3 ícones na parte inferior (Actions, Combos, Optimal)
✓ Animação de pulse quando combo ativo
```

### Painel "Active Events & Solutions"
```
LOCALIZAÇÃO: Sidebar esquerdo, abaixo do score
ELEMENTOS:
✓ Lista de eventos ativos
✓ Timer para cada evento
✓ Seção "Optimal Actions" (verde)
✓ Seção "Target Parameters" (azul)
✓ Dica de estratégia no final
```

## 🔍 Checklist de Funcionalidades

### Sistema de Ações
- [ ] Todos os 16 botões de ação são clicáveis
- [ ] Cooldowns visuais funcionam
- [ ] Notificações aparecem ao clicar
- [ ] Parâmetros mudam conforme esperado
- [ ] Energia é consumida corretamente

### Sistema de Eventos
- [ ] Eventos aparecem aleatoriamente
- [ ] Timer de evento diminui
- [ ] Eventos afetam parâmetros
- [ ] Eventos desaparecem após término

### Sistema de Soluções
- [ ] Painel mostra ações ótimas
- [ ] Feedback indica se ação é ótima
- [ ] Bônus são aplicados em ações corretas
- [ ] Penalidades aplicadas em ações erradas

### Sistema de Combos
- [ ] Combos são detectados
- [ ] Notificação de combo aparece
- [ ] Bônus de combo aplicado
- [ ] Painel de combo atualiza
- [ ] Score aumenta em +100

### Sistema de Score
- [ ] Score inicia em 0
- [ ] +50 por ação ótima
- [ ] +100 por combo
- [ ] Score visível no painel

## 🎮 Teste de Integração Completo

### Execução de 5 Minutos
```
OBJETIVO: Ganhar 500 pontos em 5 minutos

ESTRATÉGIA:
1. Aguarde eventos aparecerem
2. Consulte sempre o painel de ajuda
3. Use ações ótimas para cada evento
4. Tente executar combos quando possível
5. Monitore energia para não ficar sem

RESULTADO ESPERADO:
✓ Múltiplas notificações de sucesso
✓ Score crescente
✓ Parâmetros relativamente estáveis
✓ Experiência de gameplay estratégica
```

## 🐛 Debugging

### Se um botão não funcionar:
1. Verifique se está em cooldown (timer visível)
2. Verifique se tem energia suficiente
3. Observe notificação de erro
4. Aguarde cooldown terminar

### Se combo não ativar:
1. Verifique se executou todas as ações necessárias
2. Confirme se foi dentro da janela de tempo
3. Observe notificações de cada ação
4. Tente novamente com timing melhor

### Se score não aumentar:
1. Verifique se há eventos ativos
2. Confirme se usou ação ótima
3. Observe feedback na notificação
4. Tente ação diferente se necessário

## ✨ Comportamentos Esperados

### Feedback Positivo
- ✅ "Optimal action! Event being resolved efficiently."
- 🌟 "COMBO! [nome do combo]"
- Score aumenta
- Parâmetros melhoram
- Painel de combo mostra animação

### Feedback Neutro
- ⚠️ "Good action, but parameters not ideal."
- Score pode aumentar parcialmente
- Efeito reduzido

### Feedback Negativo
- ❌ "This action may not be optimal for this event."
- Possível penalidade
- Sem ganho de score
- Evento pode piorar

## 📝 Notas Finais

- Todos os botões devem responder ao clique
- Cooldowns são visuais e funcionais
- Score é persistente durante a sessão
- Reset da simulação reseta o score
- Interface atualiza em tempo real

---

**Status:** ✅ Todos os sistemas implementados e testáveis
**Última Atualização:** 2025-12-01
