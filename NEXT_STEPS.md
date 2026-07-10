# 🚀 Próximos Passos - Homeostasis v3.0

## ✅ O que foi feito

1. ✅ Design System minimalista (Medical Slate)
2. ✅ Sistema de tipos fisiológicos completo
3. ✅ Motor de simulação puro (função determinística)
4. ✅ Store Zustand refatorado
5. ✅ Interface MonitorPanel (UTI style)
6. ✅ Sistema de ações hormonais
7. ✅ Documentação completa

## 🔧 Como testar agora

### Opção 1: Criar página de teste isolada

Crie `src/pages/TestV3.tsx`:

```typescript
import React from 'react';
import { useSimulationLoop } from '../game/simulationStore.v3';
import { MonitorPanel } from '../components/MonitorPanel';
import { HormonalControlPanel } from '../components/HormonalControlPanel';

export const TestV3: React.FC = () => {
  useSimulationLoop();

  return (
    <div className="flex h-screen bg-medical-bg">
      <div className="flex-1">
        <MonitorPanel />
      </div>
      <div className="w-96 border-l border-medical-border">
        <HormonalControlPanel />
      </div>
    </div>
  );
};
```

Adicione rota em `App.tsx`:
```typescript
import { TestV3 } from './pages/TestV3';

// ... dentro do router
<Route path="/test-v3" element={<TestV3 />} />
```

Acesse: `http://localhost:5173/test-v3`

### Opção 2: Substituir dashboard principal

Em `src/App.tsx`, substitua o conteúdo:

```typescript
import { useSimulationLoop } from './game/simulationStore.v3';
import { MonitorPanel } from './components/MonitorPanel';
import { HormonalControlPanel } from './components/HormonalControlPanel';

function App() {
  useSimulationLoop(); // Loop 30 FPS

  return (
    <div className="flex h-screen">
      <MonitorPanel />
      <HormonalControlPanel />
    </div>
  );
}
```

## 🐛 Possíveis Problemas

### 1. Erro: "Cannot find module lucide-react"

**Solução:**
```powershell
npm install lucide-react
```

### 2. Erro: "useSimulationLoop is not a function"

**Verifique:** O hook está exportado em `simulationStore.v3.ts`

**Alternativa:** Use useEffect:
```typescript
const tick = useSimulationStore(state => state.tick);
const isRunning = useSimulationStore(state => state.isRunning);

React.useEffect(() => {
  if (!isRunning) return;
  
  const interval = setInterval(() => {
    tick();
  }, 33); // ~30 FPS
  
  return () => clearInterval(interval);
}, [isRunning, tick]);
```

### 3. Cores não funcionam

**Verifique:** Se o Tailwind está lendo o novo config

**Solução:**
```powershell
# Limpar cache e rebuildar
Remove-Item -Recurse -Force node_modules/.vite
npm run dev
```

### 4. Valores não atualizam

**Verifique:** Se o loop está rodando:
```typescript
console.log('Loop running:', useSimulationStore.getState().isRunning);
```

**Debug:**
```typescript
useSimulationStore.subscribe((state) => {
  console.log('HR:', state.physiology.cardiovascular.heartRate);
});
```

## 📝 Tarefas Imediatas

### Tarefa 1: Implementar Waveforms (2-3 horas)

Criar `src/components/Waveform.tsx`:

```typescript
import React, { useRef, useEffect } from 'react';

interface WaveformProps {
  data: number[];
  color: string;
  height: number;
}

export const Waveform: React.FC<WaveformProps> = ({ data, color, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    // Desenhar waveform
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, i) => {
      const x = (i / data.length) * canvas.width;
      const y = canvas.height - (value / 100) * canvas.height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full"
    />
  );
};
```

Integrar no MonitorPanel:
```typescript
import { Waveform } from './Waveform';

// Dentro do componente
const hrHistory = useSimulationStore(state => state.history.heartRate);

<Waveform data={hrHistory} color="#ef4444" height={120} />
```

### Tarefa 2: Adicionar Controles de Fatores Externos (1 hora)

Criar `src/components/ExternalFactorsPanel.tsx`:

```typescript
import React from 'react';
import { Activity, Coffee, Moon, Thermometer } from 'lucide-react';
import { useSimulationStore } from '../game/simulationStore.v3';

export const ExternalFactorsPanel: React.FC = () => {
  const setExercise = useSimulationStore(state => state.setExerciseIntensity);
  const setStress = useSimulationStore(state => state.setStressLevel);
  const setNutrition = useSimulationStore(state => state.setNutrition);
  const setSleep = useSimulationStore(state => state.setSleep);
  
  const factors = useSimulationStore(state => state.externalFactors);

  return (
    <div className="bg-medical-surface p-4 border-t border-medical-border">
      <h3 className="text-sm font-medium text-clinical-text mb-3">
        FATORES EXTERNOS
      </h3>
      
      <div className="space-y-3">
        <FactorSlider
          label="Exercício"
          value={factors.exercise}
          onChange={setExercise}
          icon={<Activity className="w-4 h-4" />}
          color="arterial"
        />
        
        <FactorSlider
          label="Estresse"
          value={factors.stress}
          onChange={setStress}
          icon={<Coffee className="w-4 h-4" />}
          color="alert"
        />
        
        <FactorSlider
          label="Nutrição"
          value={factors.nutrition}
          onChange={setNutrition}
          icon={<Coffee className="w-4 h-4" />}
          color="normal"
        />
        
        <FactorSlider
          label="Sono"
          value={factors.sleep}
          onChange={setSleep}
          icon={<Moon className="w-4 h-4" />}
          color="hormonal"
        />
      </div>
    </div>
  );
};

const FactorSlider = ({ label, value, onChange, icon, color }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <div className={`text-${color}`}>{icon}</div>
        <span className="text-xs text-clinical-muted">{label}</span>
      </div>
      <span className="text-xs font-mono text-clinical-text">{value}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-medical-border rounded-none appearance-none cursor-pointer"
    />
  </div>
);
```

### Tarefa 3: Painel de Warnings (30 min)

Criar `src/components/WarningsPanel.tsx`:

```typescript
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useSimulationStore } from '../game/simulationStore.v3';

export const WarningsPanel: React.FC = () => {
  const warnings = useSimulationStore(state => state.activeWarnings);
  const dismissWarning = useSimulationStore(state => state.dismissWarning);

  if (warnings.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 w-96 space-y-2">
      {warnings.map((warning, i) => (
        <div
          key={i}
          className={`bg-medical-surface border-l-4 p-3 ${
            warning.severity === 'severe'
              ? 'border-critical'
              : warning.severity === 'moderate'
              ? 'border-alert'
              : 'border-metabolic'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 ${
                  warning.severity === 'severe'
                    ? 'text-critical'
                    : warning.severity === 'moderate'
                    ? 'text-alert'
                    : 'text-metabolic'
                }`}
                strokeWidth={1.5}
              />
              <div>
                <h4 className="text-sm font-medium text-clinical-text mb-1">
                  {warning.parameter}
                </h4>
                <p className="text-xs text-clinical-muted mb-2">
                  Valor atual: <span className="font-mono">{warning.currentValue.toFixed(1)}</span>
                  {' | '}
                  Normal: <span className="font-mono">
                    {warning.normalRange[0].toFixed(1)}-{warning.normalRange[1].toFixed(1)}
                  </span>
                </p>
                <p className="text-xs text-clinical-text">
                  {warning.recommendation}
                </p>
              </div>
            </div>
            <button
              onClick={() => dismissWarning(warning.parameter)}
              className="text-clinical-muted hover:text-clinical-text"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Tarefa 4: Timeline de Eventos (1 hora)

Criar `src/components/EventTimeline.tsx`:

```typescript
import React from 'react';
import { useSimulationStore } from '../game/simulationStore.v3';

export const EventTimeline: React.FC = () => {
  const events = useSimulationStore(state => state.recentEvents);

  return (
    <div className="bg-medical-surface border-t border-medical-border p-3 h-32 overflow-y-auto">
      <h3 className="text-xs text-clinical-muted mb-2">EVENTOS RECENTES</h3>
      <div className="space-y-1">
        {events.slice(0, 10).map((event, i) => (
          <div
            key={i}
            className="text-xs flex items-start gap-2"
          >
            <span className="font-mono text-clinical-muted">
              {formatTimestamp(event.timestamp)}
            </span>
            <span
              className={
                event.severity === 'critical'
                  ? 'text-critical'
                  : event.severity === 'warning'
                  ? 'text-alert'
                  : 'text-clinical-text'
              }
            >
              {event.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

## 🎯 Layout Final Sugerido

```
┌────────────────────────────────────────────────────────┐
│ [Warnings Panel]                                        │
├────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┬──────────────────┬─────────────┐      │
│  │ Vital Signs │  Waveforms       │ Metabolic   │      │
│  │             │                  │             │      │
│  │ FC: 70 bpm  │  ECG ~~~∧~~~    │ Glucose     │      │
│  │ SpO2: 98%   │  Pleth ∿∿∿∿     │ Lactate     │      │
│  │ PA: 120/80  │  Capno ▁▂▃▄     │ pH          │      │
│  └─────────────┴──────────────────┴─────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ Energy Matrix | System Health | Status       │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ External Factors (Sliders)                   │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ Event Timeline                               │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
├────────────────────────────────────────────────────────┤
│ Hormonal Control Panel (Sidebar)                       │
└────────────────────────────────────────────────────────┘
```

## 📦 Dependências Necessárias

Verifique se estão instaladas:

```powershell
npm install zustand lucide-react
npm install -D @types/react @types/react-dom
```

## 🧪 Como Testar Cada Sistema

### 1. Testar Sistema Energético

```typescript
// Console do navegador
const store = window.__SIMULATION_STORE__;
store.getState().setExerciseIntensity(100); // Exercício máximo

// Observar:
// - ATP cai rapidamente
// - PCr esgota em 10s
// - Lactato aumenta
// - pH cai
```

### 2. Testar Sistema Hormonal

```typescript
// Liberar insulina
store.getState().releaseHormone('insulin', 20);

// Observar:
// - Glicose cai
// - Glicogênio aumenta (se glicose > 100)
// - mTOR activity aumenta
```

### 3. Testar Condição Letal

```typescript
// Forçar acidose
store.getState().setExerciseIntensity(100);
// Aguardar lactato subir
// pH vai cair até zona letal (< 6.8)
// Sistema deve disparar morte
```

## 🐛 Debug Mode

Adicione no `simulationStore.v3.ts`:

```typescript
// Após a definição do store
if (typeof window !== 'undefined') {
  (window as any).__SIMULATION_STORE__ = useSimulationStore;
  
  // Helper de debug
  (window as any).debug = {
    getState: () => useSimulationStore.getState().physiology,
    setExercise: (val: number) => useSimulationStore.getState().setExerciseIntensity(val),
    killPatient: () => {
      const state = useSimulationStore.getState();
      // Forçar pH letal
      state.physiology.acidBase.pH = 6.5;
    }
  };
}
```

Uso no console:
```javascript
window.debug.getState(); // Ver estado completo
window.debug.setExercise(90); // Testar exercício
window.debug.killPatient(); // Testar tela de morte
```

## ✅ Checklist de Integração

- [ ] Instalar dependências (lucide-react, zustand)
- [ ] Criar página de teste (`/test-v3`)
- [ ] Verificar que loop está rodando (30 FPS)
- [ ] Confirmar que valores atualizam
- [ ] Testar cada ação hormonal
- [ ] Testar condição de morte
- [ ] Verificar responsividade
- [ ] Testar em diferentes navegadores
- [ ] Otimizar performance (se necessário)
- [ ] Documentar bugs encontrados

## 📞 Próximos Passos Após Integração

1. **Feedback do usuário:** Coletar feedback sobre usabilidade
2. **Ajustes de balanceamento:** Afinar constantes fisiológicas
3. **Tutorial:** Criar onboarding para ensinar mecânicas
4. **Achievements:** Sistema de conquistas educacionais
5. **Modo Sandbox:** Permitir manipular parâmetros livremente
6. **Export Data:** Exportar sessão como JSON/CSV

---

**Boa sorte com a implementação! 🚀**
