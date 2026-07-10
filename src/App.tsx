/**
 * Homeostasis v3.0 - Simulação Fisiológica Realista
 * Interface Frostpunk-inspired: Densa, clínica, sombria
 */

import './index.css';
import { useSimulationLoop } from './game/simulationStore';
import { FrostpunkDashboard } from './components/Dashboard/FrostpunkDashboard';

function App() {
  // Inicia o loop fisiológico (10 Hz, independente da taxa de pintura)
  useSimulationLoop();

  return <FrostpunkDashboard />;
}

export default App;
