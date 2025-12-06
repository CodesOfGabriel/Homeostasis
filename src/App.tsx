import './index.css';
import { GameDashboard } from './pages/GameDashboard';
import { IdleGameProvider } from './game/IdleGameContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <IdleGameProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
      <GameDashboard />
    </IdleGameProvider>
  );
}

export default App;
