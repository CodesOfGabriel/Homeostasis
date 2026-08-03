import { lazy, Suspense, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useSimulationLoop, useSimulationStore } from '../../game/simulationStore';
import { Playback, Stepper, TopNav, type SimulatorTab, type StepKey } from './navigation';
import { ActionButton, GlassPanel, PanelLabel, cn } from './ui';
import { GlobalPhysiologyDock } from './GlobalPhysiologyDock';
import { GlobalReserveStrip } from './GlobalReserveStrip';
import { PhysiologicalDecisionLayer } from './PhysiologicalDecisionLayer';

const TissueView = lazy(() => import('./views').then(module => ({ default: module.TissueView })));
const IntracellularView = lazy(() => import('./views').then(module => ({ default: module.IntracellularView })));
const MachineryView = lazy(() => import('./views').then(module => ({ default: module.MachineryView })));
const ClinicalSystemView = lazy(() => import('./ClinicalSystemView').then(module => ({ default: module.ClinicalSystemView })));

const speedOptions = [1, 2, 4];

const stepTabs: Record<StepKey, SimulatorTab> = {
  tissue: 'tissue',
  mitochondria: 'machinery',
  defense: 'intracellular',
  vitals: 'system',
};

function simulationClock(seconds: number) {
  const totalMinutes = 8 * 60 + Math.floor(seconds / 60);
  const day = Math.floor(totalMinutes / 1440) + 1;
  const minuteOfDay = totalMinutes % 1440;
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return { day, clock: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` };
}

export function Simulator() {
  useSimulationLoop();
  const [activeTab, setActiveTab] = useState<SimulatorTab>('tissue');
  const [activeStep, setActiveStep] = useState<StepKey>('tissue');
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const physiology = useSimulationStore(state => state.physiology);
  const cellular = useSimulationStore(state => state.cellular);
  const scenarioResponse = useSimulationStore(state => state.scenarioResponse);
  const iatrogenicEpisodes = useSimulationStore(state => state.iatrogenicEpisodes);
  const warnings = useSimulationStore(state => state.activeWarnings);
  const events = useSimulationStore(state => state.recentEvents);
  const running = useSimulationStore(state => state.isRunning);
  const speed = useSimulationStore(state => state.timeSpeed);
  const start = useSimulationStore(state => state.start);
  const pause = useSimulationStore(state => state.pause);
  const reset = useSimulationStore(state => state.reset);
  const setSpeed = useSimulationStore(state => state.setTimeSpeed);
  const time = simulationClock(physiology.timeElapsed);
  const decisionVisible = Boolean(cellular.routine || scenarioResponse);

  const condition = useMemo(() => {
    if (!physiology.isAlive) return 'Falência';
    if (cellular.cell.viabilityPercent < 35 || warnings.some(warning => warning.severity === 'severe') || iatrogenicEpisodes.some(episode => episode.severity === 'critical')) return 'Crítica';
    if (cellular.cell.viabilityPercent < 70 || warnings.length > 0 || iatrogenicEpisodes.length > 0) return 'Atenção';
    return 'Estável';
  }, [cellular.cell.viabilityPercent, iatrogenicEpisodes, physiology.isAlive, warnings]);

  const chooseStep = (step: StepKey) => {
    setActiveStep(step);
    setActiveTab(stepTabs[step]);
  };

  const startSimulation = () => {
    setStarted(true);
    start();
  };

  const restartSimulation = () => {
    reset();
    setStarted(true);
    setSettingsOpen(false);
  };

  const cycleSpeed = () => {
    const current = speedOptions.indexOf(speed);
    setSpeed(speedOptions[(current + 1) % speedOptions.length]);
  };

  return (
    <main className="relative flex h-dvh min-h-[640px] w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-cover bg-center opacity-95" style={{ backgroundImage: "url('/images/cell-background.png')", backgroundPosition: 'center 48%' }} />
      <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-background/5 to-background/28" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/45" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <TopNav day={time.day} clock={time.clock} condition={condition} healthy={condition === 'Estável'} events={events} routine={cellular.routine} onSettings={() => setSettingsOpen(true)} />
        {started && <GlobalReserveStrip shifted={decisionVisible} />}
        <div className={cn('flex min-h-0 flex-1 flex-col transition-[padding] duration-300', decisionVisible && activeTab !== 'tissue' && 'lg:pl-[412px]')}>
          {started && <Suspense fallback={<div className="grid min-h-0 flex-1 place-items-center text-xs uppercase tracking-widest text-muted-foreground">Preparando escala fisiológica…</div>}>
            {activeTab === 'tissue' && <TissueView />}
            {activeTab === 'intracellular' && <IntracellularView />}
            {activeTab === 'machinery' && <MachineryView />}
            {activeTab === 'system' && <ClinicalSystemView focus="vitals" onNavigate={chooseStep} />}
          </Suspense>}
        </div>
        {started && <GlobalPhysiologyDock />}
        {started && <PhysiologicalDecisionLayer onNavigate={chooseStep} />}
        <footer className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-center gap-3 bg-gradient-to-t from-background/85 via-background/30 to-transparent px-4 pb-2 pt-10 transition-[padding] lg:px-6', decisionVisible && 'lg:pl-[424px]')}>
          <Stepper active={activeStep} onChange={chooseStep} />
          <div className="pointer-events-auto hidden flex-none sm:block xl:absolute xl:bottom-2 xl:right-6"><Playback running={running} speed={speed} onToggle={() => running ? pause() : start()} onSpeed={cycleSpeed} /></div>
        </footer>
        <div className="absolute bottom-3 right-4 z-40 sm:hidden"><Playback running={running} speed={speed} onToggle={() => running ? pause() : start()} onSpeed={cycleSpeed} /></div>
      </div>

      {!started && <Overlay title="Iniciar simulação" onClose={undefined}>
        <p className="text-sm leading-relaxed text-muted-foreground">Mantenha a homeostase aplicando intervenções sistêmicas e administrando o metabolismo celular. O organismo responde continuamente às suas decisões.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"><Info label="Objetivo" text="Preservar a viabilidade"/><Info label="Feedback" text="Eventos e alertas reais"/><Info label="Mecânica" text="Tecido, célula e sistema"/></div>
        <ActionButton className="mt-5 w-full border-primary/60 bg-primary/10" onClick={startSimulation}>Iniciar simulação</ActionButton>
      </Overlay>}

      {settingsOpen && <Overlay title="Configurações da simulação" onClose={() => setSettingsOpen(false)}>
        <p className="text-sm leading-relaxed text-muted-foreground">Este é um modelo educacional simplificado e não deve orientar diagnóstico ou tratamento.</p>
        <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">Exercício, estresse, nutrição, sono, temperatura e desafios fisiopatológicos pertencem aos eventos e não podem ser configurados pelo jogador. Quando uma situação surgir, a simulação pausará e exigirá uma decisão antes de continuar.</div>
        <div className="mt-5 grid grid-cols-2 gap-2"><ActionButton onClick={() => setSettingsOpen(false)}>Continuar</ActionButton><ActionButton onClick={restartSimulation}><RotateCcw className="mr-2 inline size-3.5"/>Reiniciar</ActionButton></div>
      </Overlay>}

      {!physiology.isAlive && <Overlay title="Falência homeostática" onClose={undefined} danger>
        <p className="text-sm leading-relaxed text-muted-foreground">{physiology.causeOfDeath ?? 'O organismo ultrapassou seus limites fisiológicos.'}</p>
        <ActionButton className="mt-5 w-full border-danger/60 bg-danger/10" onClick={restartSimulation}><RotateCcw className="mr-2 inline size-3.5"/>Reiniciar simulação</ActionButton>
      </Overlay>}
    </main>
  );
}

function Info({ label, text }: { label: string; text: string }) {
  return <GlassPanel soft className="p-3"><PanelLabel>{label}</PanelLabel><p className="mt-2 text-xs text-foreground">{text}</p></GlassPanel>;
}

function Overlay({ title, children, onClose, danger }: { title: string; children: React.ReactNode; onClose?: () => void; danger?: boolean }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-md"><GlassPanel className={`relative w-full max-w-xl p-6 ${danger ? 'border-danger/40' : ''}`}>{onClose && <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="size-5"/></button>}<PanelLabel>{danger ? 'Estado terminal' : 'Homeostasis'}</PanelLabel><div className="gold-line my-4 h-px"/><h2 className={`font-display text-2xl ${danger ? 'text-danger' : 'text-foreground'}`}>{title}</h2><div className="mt-3">{children}</div></GlassPanel></div>;
}
