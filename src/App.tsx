/**
 * Homeostasis v3.0 - Simulação Fisiológica Realista
 * Interface Frostpunk-inspired: Densa, clínica, sombria
 */

import './index.css';
import { useSimulationLoop } from './game/simulationStore';
import { useSimulationStore } from './game/simulationStore';
import { FrostpunkDashboard } from './components/Dashboard/FrostpunkDashboard';
import React from 'react';

function App() {
  // Inicia o loop fisiológico (10 Hz, independente da taxa de pintura)
  useSimulationLoop();
  const start = useSimulationStore(state => state.start);
  const [hasStarted, setHasStarted] = React.useState(false);

  const handleStart = () => {
    setHasStarted(true);
    start();
  };

  return (
    <>
      <FrostpunkDashboard />
      {!hasStarted && <StartModal onStart={handleStart} />}
    </>
  );
}

export default App;

function StartModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="panel-elevated relative w-full max-w-lg overflow-hidden border border-app-border p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative space-y-4 text-left">
          <div className="metric-label">SIMULAÇÃO FISIOLÓGICA</div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Deseja iniciar?</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            A simulação vai começar em tempo real. Decisões rápidas, sinais vitais e respostas fisiológicas serão monitorados continuamente.
          </p>

          <div className="grid grid-cols-1 gap-2 rounded-none border border-app-border bg-app-bg/70 p-3 text-sm text-text-secondary sm:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-dim">Objetivo</div>
              <div>Manter a homeostase com o menor custo alostático.</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-dim">Feedback</div>
              <div>Erros geram alertas visuais e eventos de correção.</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-dim">Reforço</div>
              <div>Boas decisões podem gerar reforços variáveis.</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-wire px-4 py-2" onClick={onStart}>
              Iniciar simulação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
