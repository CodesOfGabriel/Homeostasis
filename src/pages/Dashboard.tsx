// Dashboard - Main game screen for Body Ops

import { useSimulationStore } from '../game/simulationStore';
import { useInterval } from '../game/useInterval';
import { ACTIONS } from '../game/actions';
import { Heart } from '../components/HUD/Heart';
import { Circulation } from '../components/HUD/Circulation';
import { Lungs } from '../components/HUD/Lungs';
import { BodySilhouette } from '../components/HUD/BodySilhouette';
import { ParameterCard } from '../components/HUD/ParameterCard';
import { EventPopup } from '../components/HUD/EventPopup';
import { ActionButton } from '../components/HUD/ActionButton';

export function Dashboard() {
  const {
    parameters,
    isRunning,
    activeEvents,
    notifications,
    actionCooldowns,
    tick,
    start,
    pause,
    applyAction,
    clearNotification,
  } = useSimulationStore();

  // Simulation loop
  useInterval(() => {
    if (isRunning) {
      tick();
    }
  }, 200);

  const getCooldownTime = (actionId: string): number => {
    const cooldown = actionCooldowns.find((cd) => cd.actionId === actionId);
    return cooldown?.remainingTime || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neuro-dark via-gray-900 to-neuro-dark text-white">
      {/* Header */}
      <header className="border-b border-neuro-blue p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neuro-cyan to-neuro-purple">
              BODY OPS
            </h1>
            <p className="text-sm text-gray-400">
              NeuroHormonal Control Simulator
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">
                {Math.floor(parameters.time)}s
              </div>
              <div className="text-xs text-gray-400">Mission Time</div>
            </div>
            <button
              onClick={isRunning ? pause : start}
              className="px-4 py-2 bg-neuro-purple rounded-lg hover:bg-opacity-80 transition-all"
            >
              {isRunning ? '⏸️ Pause' : '▶️ Resume'}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Parameters */}
          <div className="col-span-3 space-y-4">
            <ParameterCard
              title="Heart Rate"
              value={parameters.heartRate}
              unit="BPM"
              color="text-red-500"
              icon="❤️"
              warning={parameters.heartRate > 120 || parameters.heartRate < 50}
            />
            <ParameterCard
              title="Blood Pressure"
              value={`${parameters.bloodPressureSystolic}/${parameters.bloodPressureDiastolic}`}
              unit="mmHg"
              color="text-pink-500"
              warning={parameters.bloodPressureSystolic > 140}
            />
            <ParameterCard
              title="SpO₂"
              value={parameters.bloodOxygen}
              unit="%"
              color="text-cyan-500"
              icon="🫁"
              warning={parameters.bloodOxygen < 90}
            />
            <ParameterCard
              title="Temperature"
              value={parameters.temperature.toFixed(1)}
              unit="°C"
              color="text-orange-400"
              icon="🌡️"
              warning={parameters.temperature > 38}
            />
          </div>

          {/* Center column - Body visualization */}
          <div className="col-span-6">
            <div className="bg-neuro-dark border border-neuro-blue rounded-xl p-6 shadow-2xl">
              <div className="grid grid-cols-3 gap-4 h-[600px]">
                {/* Heart */}
                <div className="flex items-center justify-center">
                  <Heart
                    heartRate={parameters.heartRate}
                    perfusion={parameters.heartPerfusion}
                  />
                </div>

                {/* Body silhouette */}
                <div className="flex items-center justify-center">
                  <BodySilhouette
                    brainPerfusion={parameters.brainPerfusion}
                    heartPerfusion={parameters.heartPerfusion}
                    musclePerfusion={parameters.musclePerfusion}
                    organsPerfusion={parameters.organsPerfusion}
                  />
                </div>

                {/* Lungs */}
                <div className="flex items-center justify-center">
                  <Lungs
                    respiratoryRate={parameters.respiratoryRate}
                    bloodOxygen={parameters.bloodOxygen}
                    tidalVolume={parameters.tidalVolume}
                  />
                </div>
              </div>

              {/* Circulation overlay */}
              <div className="mt-6">
                <Circulation
                  cardiacOutput={parameters.cardiacOutput}
                  bloodOxygen={parameters.bloodOxygen}
                />
              </div>
            </div>
          </div>

          {/* Right column - More parameters */}
          <div className="col-span-3 space-y-4">
            <ParameterCard
              title="Glucose"
              value={parameters.glucose}
              unit="mg/dL"
              color="text-yellow-400"
              icon="🍬"
              warning={parameters.glucose < 70 || parameters.glucose > 180}
            />
            <ParameterCard
              title="Cortisol"
              value={parameters.cortisol.toFixed(0)}
              unit="units"
              color="text-purple-400"
              icon="😰"
              warning={parameters.cortisol > 60}
            />
            <ParameterCard
              title="Adrenaline"
              value={parameters.adrenaline.toFixed(0)}
              unit="units"
              color="text-red-400"
              icon="⚡"
            />
            <ParameterCard
              title="Energy"
              value={parameters.energy.toFixed(0)}
              unit="%"
              color="text-green-400"
              icon="🔋"
              warning={parameters.energy < 30}
            />
            <ParameterCard
              title="Stress"
              value={parameters.stress.toFixed(0)}
              unit="%"
              color="text-orange-500"
              icon="💢"
              warning={parameters.stress > 70}
            />
          </div>
        </div>

        {/* Actions panel */}
        <div className="mt-8 bg-neuro-dark border border-neuro-purple rounded-xl p-6">
          <h2 className="text-xl font-bold text-purple-400 mb-4">
            🧠 Neural Command Center
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <ActionButton
              label={ACTIONS.releaseAdrenaline.name}
              description={ACTIONS.releaseAdrenaline.description}
              onClick={() => applyAction(ACTIONS.releaseAdrenaline)}
              cooldown={getCooldownTime(ACTIONS.releaseAdrenaline.id)}
              maxCooldown={ACTIONS.releaseAdrenaline.cooldown}
              cost={ACTIONS.releaseAdrenaline.cost}
            />
            <ActionButton
              label={ACTIONS.reduceCortisol.name}
              description={ACTIONS.reduceCortisol.description}
              onClick={() => applyAction(ACTIONS.reduceCortisol)}
              cooldown={getCooldownTime(ACTIONS.reduceCortisol.id)}
              maxCooldown={ACTIONS.reduceCortisol.cooldown}
              cost={ACTIONS.reduceCortisol.cost}
            />
            <ActionButton
              label={ACTIONS.increaseVentilation.name}
              description={ACTIONS.increaseVentilation.description}
              onClick={() => applyAction(ACTIONS.increaseVentilation)}
              cooldown={getCooldownTime(ACTIONS.increaseVentilation.id)}
              maxCooldown={ACTIONS.increaseVentilation.cooldown}
              cost={ACTIONS.increaseVentilation.cost}
            />
            <ActionButton
              label={ACTIONS.releaseInsulin.name}
              description={ACTIONS.releaseInsulin.description}
              onClick={() => applyAction(ACTIONS.releaseInsulin)}
              cooldown={getCooldownTime(ACTIONS.releaseInsulin.id)}
              maxCooldown={ACTIONS.releaseInsulin.cooldown}
              cost={ACTIONS.releaseInsulin.cost}
            />
            <ActionButton
              label={ACTIONS.releaseGlucose.name}
              description={ACTIONS.releaseGlucose.description}
              onClick={() => applyAction(ACTIONS.releaseGlucose)}
              cooldown={getCooldownTime(ACTIONS.releaseGlucose.id)}
              maxCooldown={ACTIONS.releaseGlucose.cooldown}
              cost={ACTIONS.releaseGlucose.cost}
            />
            <ActionButton
              label={ACTIONS.vasodilation.name}
              description={ACTIONS.vasodilation.description}
              onClick={() => applyAction(ACTIONS.vasodilation)}
              cooldown={getCooldownTime(ACTIONS.vasodilation.id)}
              maxCooldown={ACTIONS.vasodilation.cooldown}
              cost={ACTIONS.vasodilation.cost}
            />
          </div>
        </div>

        {/* Active events display */}
        {activeEvents.length > 0 && (
          <div className="mt-6 bg-neuro-dark border border-yellow-500 rounded-xl p-4">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">
              ⚠️ Active Events
            </h3>
            <div className="space-y-2">
              {activeEvents.map((ae, i) => (
                <div
                  key={i}
                  className="text-sm text-gray-300 flex justify-between"
                >
                  <span>
                    {ae.event.title} - {ae.event.description}
                  </span>
                  <span className="text-yellow-400">
                    {Math.ceil(ae.remainingTime)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Notifications */}
      <div className="fixed top-20 right-6 space-y-3 z-50">
        {notifications.slice(-3).map((notification, index) => (
          <EventPopup
            key={index}
            title="📢 System Alert"
            description={notification}
            onClose={() => clearNotification(index)}
          />
        ))}
      </div>
    </div>
  );
}
