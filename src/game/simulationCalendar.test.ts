import { describe, expect, it } from 'vitest';
import { initializeCellularState } from './cellularSimulation';
import { initializePhysiologyState } from './physiology';
import { getScenarioTimeWindows, SCENARIO_DEFINITIONS, SCENARIO_TIME_WINDOWS, selectEligibleScenario } from './scenarios';
import {
    getSimulationCalendar,
    isSimulationTimeWithinWindows,
    physiologicalSecondsAt,
    REAL_SECONDS_PER_SIMULATED_DAY,
} from './simulationCalendar';

function forceOnlyScenario(id: string, elapsedSeconds: number) {
    const state = initializeCellularState();
    state.simulationTime = elapsedSeconds;
    state.nextRoutineAt = elapsedSeconds;
    state.scenarioCooldowns = Object.fromEntries(
        SCENARIO_DEFINITIONS.map(definition => [definition.id, definition.id === id ? 0 : 9999]),
    );
    const physiology = initializePhysiologyState();
    physiology.timeElapsed = elapsedSeconds;
    return { state, physiology };
}

describe('calendário comprimido e agenda dos eventos', () => {
    it('faz um dia durar quatro minutos e meio em 1× sem alterar o segundo fisiológico', () => {
        expect(REAL_SECONDS_PER_SIMULATED_DAY).toBe(270);
        expect(getSimulationCalendar(0)).toMatchObject({ day: 1, hour: 8, minute: 0, clock: '08:00' });
        expect(getSimulationCalendar(REAL_SECONDS_PER_SIMULATED_DAY)).toMatchObject({ day: 2, hour: 8, minute: 0, clock: '08:00' });
        expect(getSimulationCalendar(REAL_SECONDS_PER_SIMULATED_DAY / 2)).toMatchObject({ day: 1, hour: 20, minute: 0, clock: '20:00' });
    });

    it('registra ao menos uma janela temporal para todo evento', () => {
        SCENARIO_DEFINITIONS.forEach(definition => {
            const windows = SCENARIO_TIME_WINDOWS[definition.id];
            expect(windows, definition.id).toBeDefined();
            expect(windows.length, definition.id).toBeGreaterThan(0);
            windows.forEach(window => {
                expect(window.startHour, definition.id).toBeGreaterThanOrEqual(0);
                expect(window.endHour, definition.id).toBeLessThanOrEqual(24);
                expect(window.label.length, definition.id).toBeGreaterThan(4);
            });
        });
    });

    it('reserva whisky para a noite e treino em jejum para a manhã', () => {
        const party = getScenarioTimeWindows('whisky-party-hepatic-overload');
        const workout = getScenarioTimeWindows('fasted-workout-free-fatty-acids');
        expect(isSimulationTimeWithinWindows(physiologicalSecondsAt(1, 22), party)).toBe(true);
        expect(isSimulationTimeWithinWindows(physiologicalSecondsAt(2, 9), party)).toBe(false);
        expect(isSimulationTimeWithinWindows(physiologicalSecondsAt(2, 7), workout)).toBe(true);
        expect(isSimulationTimeWithinWindows(physiologicalSecondsAt(1, 22), workout)).toBe(false);
    });

    it('impede o motor de disparar o mesmo evento fora da sua janela', () => {
        const night = forceOnlyScenario('whisky-party-hepatic-overload', physiologicalSecondsAt(1, 22));
        const morning = forceOnlyScenario('whisky-party-hepatic-overload', physiologicalSecondsAt(2, 9));
        expect(selectEligibleScenario(night.state, night.physiology, 'hard')?.definition.id).toBe('whisky-party-hepatic-overload');
        expect(selectEligibleScenario(morning.state, morning.physiology, 'hard')).toBeNull();
    });
});
