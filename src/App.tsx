import './index.css';
import { GameDashboard } from './pages/GameDashboard';
import { IdleGameProvider } from './game/IdleGameContext';

function App() {
  return (
    <IdleGameProvider>
      <GameDashboard />
    </IdleGameProvider>
  );
}

export default App;
