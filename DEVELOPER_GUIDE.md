# 📖 GUIA DO DESENVOLVEDOR - Body Ops

## Como Adicionar Novos Recursos

### ➕ Adicionar Novo Evento

Edite `src/game/events.ts`:

```typescript
export const EVENTS: Record<string, GameEvent> = {
  // ... eventos existentes
  
  novoEvento: {
    id: 'novoEvento',
    title: '🎯 Título do Evento',
    description: 'Descrição que aparece no popup',
    duration: 30, // segundos
    effects: {
      stress: 15,        // aumenta stress em 15
      adrenaline: 10,    // aumenta adrenalina em 10
      heartRate: 5,      // aumenta FC em 5
      energy: -10,       // diminui energia em 10
    },
  },
};
```

**Propriedades disponíveis para `effects`:**
- `stress`, `adrenaline`, `cortisol`, `insulin`
- `heartRate`, `respiratoryRate`
- `glucose`, `energy`

---

### 🎮 Adicionar Nova Ação do Jogador

Edite `src/game/actions.ts`:

```typescript
export const ACTIONS: Record<string, PlayerAction> = {
  // ... ações existentes
  
  novaAcao: {
    id: 'novaAcao',
    name: '⭐ Nome da Ação',
    description: 'Descrição do que a ação faz',
    cooldown: 20, // segundos antes de poder usar novamente
    effects: {
      adrenaline: 20,
      heartRate: 10,
    },
    cost: 5, // custo em energia (0 = grátis)
  },
};
```

Depois, adicione o botão em `src/pages/Dashboard.tsx`:

```typescript
<ActionButton
  label={ACTIONS.novaAcao.name}
  description={ACTIONS.novaAcao.description}
  onClick={() => applyAction(ACTIONS.novaAcao)}
  cooldown={getCooldownTime(ACTIONS.novaAcao.id)}
  maxCooldown={ACTIONS.novaAcao.cooldown}
  cost={ACTIONS.novaAcao.cost}
/>
```

---

### 📊 Adicionar Novo Parâmetro Fisiológico

1. **Adicione ao tipo** em `src/game/physiology.ts`:

```typescript
export interface Physiology {
  // ... parâmetros existentes
  novoParametro: number; // descrição
}

export const DEFAULT_PHYSIOLOGY: Physiology = {
  // ... valores existentes
  novoParametro: 100, // valor inicial
};

export const LIMITS = {
  // ... limites existentes
  novoParametro: { min: 0, max: 200 },
};
```

2. **Adicione lógica de atualização** em uma das equations (cardiac/respiratory/perfusion):

```typescript
export function updateNovoParametro(params: Physiology): number {
  let valor = params.novoParametro;
  
  // Lógica de atualização
  valor += (params.adrenaline - 10) * 0.05;
  
  // Homeostase (retorna ao baseline)
  const baseline = 100;
  valor += (baseline - valor) * 0.01;
  
  return clampParameter('novoParametro', valor);
}
```

3. **Chame no tick()** em `src/game/simulationStore.ts`:

```typescript
tick: () => {
  // ... código existente
  params.novoParametro = updateNovoParametro(params);
  // ...
}
```

4. **Exiba no Dashboard** com `ParameterCard`:

```typescript
<ParameterCard
  title="Novo Parâmetro"
  value={parameters.novoParametro}
  unit="unidade"
  color="text-blue-500"
  icon="🎯"
  warning={parameters.novoParametro > 150}
/>
```

---

### 🎨 Criar Novo Componente Animado

Exemplo em `src/components/HUD/NovoOrgao.tsx`:

```typescript
import { motion } from 'framer-motion';

interface NovoOrgaoProps {
  parametro: number;
}

export function NovoOrgao({ parametro }: NovoOrgaoProps) {
  const animationDuration = 60 / parametro; // baseado no parâmetro
  
  return (
    <div className="relative w-full h-full">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <motion.circle
          cx="50"
          cy="50"
          r="30"
          fill="#3b82f6"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </svg>
    </div>
  );
}
```

---

### 🧮 Equações Fisiológicas - Padrões

**Influência de hormônios:**
```typescript
hr += (params.adrenaline - baseline) * sensitivity;
```

**Compensação (feedback negativo):**
```typescript
if (params.oxygen < 95) {
  hr += (95 - params.oxygen) * 0.5; // aumenta HR quando O2 baixo
}
```

**Homeostase (drift ao baseline):**
```typescript
const baseline = 70;
const drift = (baseline - currentValue) * 0.01; // 1% por tick
currentValue += drift;
```

**Clamp (limitar valores):**
```typescript
return clampParameter('heartRate', hr);
```

---

### 🎯 Boas Práticas

1. **Comentários para Copilot:**
   - Sempre adicione comentários descritivos
   - Use padrões como "// This updates X based on Y"

2. **Valores realistas:**
   - Pesquise fisiologia real
   - Use escalas apropriadas (0-100 para %, valores absolutos para outros)

3. **Balanceamento:**
   - Eventos devem ter impacto perceptível mas não catastrófico
   - Ações devem ter cooldowns apropriados
   - Custos de energia devem fazer sentido

4. **Animações:**
   - Use `duration` baseado em parâmetros fisiológicos
   - `repeat: Infinity` para loops contínuos
   - `ease: 'easeInOut'` para movimentos naturais

5. **UI/UX:**
   - Cores consistentes (vermelho = crítico, amarelo = alerta, verde = ok)
   - Warnings para valores anormais
   - Ícones emoji para clareza visual

---

### 🔄 Workflow de Desenvolvimento

1. **Planejar**: Decidir o que adicionar
2. **Implementar lógica**: Adicionar no sistema de simulação
3. **Criar UI**: Componente visual ou card
4. **Testar**: Verificar comportamento
5. **Ajustar valores**: Balancear para gameplay divertido
6. **Documentar**: Adicionar ao README se relevante

---

### 🐛 Debugging

**Ver estado atual da simulação:**
```typescript
// No Dashboard.tsx
console.log('Current params:', parameters);
```

**Forçar um evento:**
```typescript
// No Dashboard.tsx
useEffect(() => {
  addEvent(EVENTS.exercise);
}, []);
```

**Desabilitar eventos aleatórios:**
```typescript
// No simulationStore.ts, comente:
// const randomEvent = getRandomEvent();
```

**Acelerar/desacelerar tempo:**
```typescript
// No Dashboard.tsx, altere o intervalo:
useInterval(() => { tick(); }, 100); // 100ms = 2x mais rápido
```

---

### 📚 Recursos

- **Framer Motion docs:** https://www.framer.com/motion/
- **Zustand docs:** https://docs.pmnd.rs/zustand/
- **Tailwind docs:** https://tailwindcss.com/docs
- **SVG paths:** https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths

---

### 🎓 Conceitos Fisiológicos Úteis

- **Frank-Starling**: ↑ Preload → ↑ Stroke Volume
- **Barorreceptores**: ↑ BP → ↓ HR
- **Quimiorreceptores**: ↓ O2 ou ↑ CO2 → ↑ RR, ↑ HR
- **Resposta ao stress**: ↑ Cortisol, ↑ Adrenalina → Fight or Flight
- **Glicemia**: Insulina ↓ glicose, Adrenalina/Cortisol ↑ glicose

---

**Happy coding! 🧠⚡**
