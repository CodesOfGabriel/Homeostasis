# 💀 Sistema de Morte e Condições Críticas

## 📋 Visão Geral

Sistema completo de monitoramento fisiológico que detecta condições críticas e desencadeia a "morte" do personagem quando parâmetros vitais ultrapassam limites fatais.

## 🎯 Condições de Morte

### 1. **Alcalose Metabólica** (pH > 7.55)
- **Causa**: pH sanguíneo muito alto
- **Limite Fatal**: > 7.55
- **Sintomas Críticos**: pH > 7.50 (aviso)
- **Efeito**: Sistema nervoso comprometido, arritmias cardíacas

### 2. **Acidose Metabólica** (pH < 7.15)
- **Causa**: pH sanguíneo muito baixo
- **Limite Fatal**: < 7.15
- **Sintomas Críticos**: pH < 7.20 (aviso)
- **Efeito**: Falência múltipla de órgãos, choque metabólico

### 3. **Taquicardia Extrema** (FC > 200 bpm por 10s)
- **Causa**: Frequência cardíaca acima de 200 bpm
- **Limite Fatal**: > 200 bpm mantido por 10 segundos
- **Sintomas Críticos**: > 180 bpm (aviso)
- **Efeito**: Fibrilação ventricular, parada cardíaca

### 4. **Bradicardia Extrema** (FC < 30 bpm)
- **Causa**: Frequência cardíaca muito baixa
- **Limite Fatal**: < 30 bpm
- **Sintomas Críticos**: < 40 bpm (aviso)
- **Efeito**: Perfusão insuficiente, choque cardiogênico

### 5. **Hipoxemia Severa** (SpO₂ < 60%)
- **Causa**: Saturação de oxigênio muito baixa
- **Limite Fatal**: < 60%
- **Sintomas Críticos**: < 85% (aviso)
- **Efeito**: Dano cerebral irreversível, falência respiratória

### 6. **Hipertermia Fatal** (Temp > 42°C)
- **Causa**: Temperatura corporal extremamente alta
- **Limite Fatal**: > 42°C
- **Sintomas Críticos**: > 39°C (aviso)
- **Efeito**: Desnaturação de proteínas, dano cerebral

### 7. **Hipotermia Fatal** (Temp < 30°C)
- **Causa**: Temperatura corporal extremamente baixa
- **Limite Fatal**: < 30°C
- **Sintomas Críticos**: < 35°C (aviso)
- **Efeito**: Parada cardíaca, falência metabólica

### 8. **Infarto do Miocárdio**
- **Causa**: Evento de infarto detectado nas notificações
- **Limite Fatal**: Detecção de evento cardíaco
- **Efeito**: Necrose do músculo cardíaco, falência cardíaca

## 🚨 Sistema de Alertas

### **Alertas Visuais em Zona Crítica**

Quando o personagem entra em zona crítica (mas antes da morte), o sistema exibe:

1. **Banner de Alerta Superior**
   - Cor: Gradient vermelho-laranja
   - Animação: Pulse
   - Informação: Tipo de alerta + valor atual + risco

2. **Indicador na Timeline**
   - Badge vermelho com "⚠️ ESTADO CRÍTICO"
   - Animação: Pulse
   - Posição: Ao lado do botão Start/Pause

3. **Borda Pulsante**
   - Cards ficam com borda vermelha
   - Grid principal tem ring vermelho pulsante
   - Transição suave de cores

### **Tipos de Alertas por Condição**

```tsx
pH Alto/Baixo: ⚠️ "ALERTA CRÍTICO: pH [ALTO/BAIXO]"
Taquicardia: 💓 "ALERTA CRÍTICO: Taquicardia Extrema"
Hipoxemia: 😵 "ALERTA CRÍTICO: Hipoxemia"
Temperatura: 🔥/🥶 "ALERTA CRÍTICO: [Hipertermia/Hipotermia]"
```

## 💀 Modal de Morte

### **Aparência**
- Overlay escuro com blur (backdrop-blur-md)
- Card branco central com borda vermelha
- Emoji: 💀
- Animação: Pulse na borda

### **Conteúdo**
1. **Título**: "Sistema Falhou"
2. **Causa da Morte**: Destacada em vermelho
3. **Estatísticas Finais**:
   - pH Final (com cor condicional)
   - Frequência Cardíaca (com cor condicional)
   - Saturação O₂ (com cor condicional)
   - Temperatura (com cor condicional)
4. **Pergunta**: "Deseja nascer novamente?"
5. **Botão de Respawn**: "🔄 Reiniciar Simulação"

### **Efeitos no Background**
- Todos os painéis ficam borrados (blur-sm)
- Interações desabilitadas (pointer-events-none)
- Simulação pausada automaticamente

## 🔄 Sistema de Respawn

### **Funcionalidade**
```typescript
const handleRespawn = () => {
    setIsDead(false);
    setDeathReason('');
    setCriticalHRTimer(0);
    window.location.reload(); // Reset completo
};
```

### **Processo**
1. Limpa estado de morte
2. Remove causa da morte
3. Reseta timer de condição crítica
4. Recarrega página (reset completo de estado)

## 🔧 Implementação Técnica

### **Estados Adicionados**
```typescript
const [isDead, setIsDead] = useState(false);
const [deathReason, setDeathReason] = useState('');
const [criticalHRTimer, setCriticalHRTimer] = useState(0);
```

### **Monitoramento Contínuo**
- Executa a cada 200ms no `useInterval`
- Checa todas as condições vitais
- Acumula tempo em zona crítica para HR
- Pausa simulação ao detectar morte

### **Detecção de Eventos**
```typescript
const hasHeartAttack = notifications.some(n => {
    const message = typeof n === 'string' ? n : (n as any).message || '';
    return message.toLowerCase().includes('infarto') || 
           message.toLowerCase().includes('heart attack');
});
```

## 📊 Faixas de Valores

| Parâmetro | Zona Segura | Zona Crítica | Morte |
|-----------|-------------|--------------|-------|
| **pH** | 7.35 - 7.45 | 7.20-7.35 / 7.45-7.50 | <7.15 / >7.55 |
| **FC** | 60 - 100 bpm | 40-60 / 100-180 bpm | <30 / >200 (10s) |
| **SpO₂** | 95 - 100% | 85 - 95% | <60% |
| **Temp** | 36 - 37.5°C | 35-36 / 37.5-39°C | <30 / >42°C |

## 🎮 Experiência do Usuário

### **Progressão de Alerta**
1. **Normal**: Interface limpa, sem alertas
2. **Crítico**: Banners vermelhos, bordas pulsantes, avisos
3. **Morte**: Modal central, blur em tudo, opção de respawn

### **Feedback Visual**
- Cores condicionais em valores críticos
- Animações pulse em alertas
- Transições suaves de estado
- Informações claras e diretas

## 🚀 Próximas Melhorias Possíveis

1. **Sons**: Adicionar alarme sonoro em estado crítico
2. **Histórico**: Salvar estatísticas de mortes
3. **Achievements**: Sobreviver X tempo em zona crítica
4. **Gradualidade**: Efeitos visuais progressivos (tela escurecendo)
5. **Tutorial**: Explicar limites fisiológicos ao usuário
6. **Gráfico de Morte**: Mostrar linha do tempo que levou à morte
7. **Autópsia**: Relatório detalhado post-mortem

## 📝 Notas de Desenvolvimento

- Sistema totalmente integrado com `useSimulationStore`
- Sem dependências externas além do React
- Tailwind CSS para todos os estilos
- Performance otimizada (checks apenas quando isRunning)
- TypeScript com tipagem completa
