export const SIMULATION_START_HOUR = 8;
export const REAL_SECONDS_PER_SIMULATED_DAY = 4.5 * 60;
export const SIMULATED_MINUTES_PER_PHYSIOLOGICAL_SECOND = 24 * 60 / REAL_SECONDS_PER_SIMULATED_DAY;

export interface SimulationCalendarTime {
    day: number;
    hour: number;
    minute: number;
    minuteOfDay: number;
    hourDecimal: number;
    clock: string;
}

export interface SimulationTimeWindow {
    startHour: number;
    endHour: number;
    label: string;
}

/**
 * O motor agudo continua em segundos fisiológicos. Este calendário comprime
 * apenas a escala narrativa/circadiana: em 1×, um dia dura 4 min 30 s reais.
 */
export function getSimulationCalendar(physiologicalSeconds: number): SimulationCalendarTime {
    const elapsedMinutes = Math.max(0, physiologicalSeconds) * SIMULATED_MINUTES_PER_PHYSIOLOGICAL_SECOND;
    const totalMinutes = SIMULATION_START_HOUR * 60 + elapsedMinutes;
    const day = Math.floor(totalMinutes / (24 * 60)) + 1;
    const minuteOfDay = ((Math.floor(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    return {
        day,
        hour,
        minute,
        minuteOfDay,
        hourDecimal: minuteOfDay / 60,
        clock: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
}

export function isCalendarTimeWithinWindow(
    calendar: SimulationCalendarTime,
    window: SimulationTimeWindow,
): boolean {
    const startMinute = window.startHour * 60;
    const endMinute = window.endHour * 60;
    if (startMinute === endMinute) return true;
    if (endMinute > startMinute) {
        return calendar.minuteOfDay >= startMinute && calendar.minuteOfDay < endMinute;
    }
    return calendar.minuteOfDay >= startMinute || calendar.minuteOfDay < endMinute;
}

export function isSimulationTimeWithinWindows(
    physiologicalSeconds: number,
    windows: readonly SimulationTimeWindow[],
): boolean {
    const calendar = getSimulationCalendar(physiologicalSeconds);
    return windows.some(window => isCalendarTimeWithinWindow(calendar, window));
}

/** Utilitário determinístico para testes e saltos narrativos. */
export function physiologicalSecondsAt(day: number, hour: number, minute = 0): number {
    const targetMinutes = (Math.max(1, day) - 1) * 24 * 60 + hour * 60 + minute;
    const elapsedMinutes = targetMinutes - SIMULATION_START_HOUR * 60;
    return Math.max(0, elapsedMinutes / SIMULATED_MINUTES_PER_PHYSIOLOGICAL_SECOND);
}
