import { describe, expect, it } from 'vitest';
import { deriveCellularDamageEvents } from './cellularDamage';
import { initializeCellularState } from './cellularSimulation';
import { createRoutineEvent, getScenarioDefinition } from './scenarios';

describe('eventos de dano celular acumulado', () => {
  it('emite um evento específico para cada eixo que cruza uma faixa de agravamento', () => {
    const previous = initializeCellularState().damage;
    const current = {
      ...previous,
      oxidativeStress: 36,
      membrane: 26,
      proteins: 26,
      dna: 26,
    };

    const events = deriveCellularDamageEvents(previous, current);

    expect(events).toHaveLength(4);
    expect(events.every(event => event.affectedSystems.includes('worsening'))).toBe(true);
    expect(events.some(event => event.message.includes('Estresse oxidativo aumentou para 36.0%'))).toBe(true);
    expect(events.some(event => event.message.includes('Dano ao DNA aumentou para 26.0%'))).toBe(true);
    expect(events.every(event => event.message.includes('Carga molecular acumulada'))).toBe(true);
  });

  it('registra recuperação com dano residual quando reparo reduz a faixa', () => {
    const current = initializeCellularState().damage;
    current.oxidativeStress = 32;
    current.membrane = 20;
    current.proteins = 18;
    current.dna = 12;
    const previous = {
      ...current,
      oxidativeStress: 62,
      membrane: 52,
      proteins: 51,
      dna: 27,
    };

    const events = deriveCellularDamageEvents(previous, current);

    expect(events).toHaveLength(4);
    expect(events.every(event => event.severity === 'info')).toBe(true);
    expect(events.every(event => event.affectedSystems.includes('recovery'))).toBe(true);
    expect(events.some(event => event.message.includes('dano residual'))).toBe(true);
  });

  it('não polui a timeline com oscilações pequenas dentro da mesma faixa', () => {
    const previous = initializeCellularState().damage;
    const current = { ...previous, oxidativeStress: previous.oxidativeStress + .2 };

    expect(deriveCellularDamageEvents(previous, current)).toHaveLength(0);
  });

  it('agrava o próximo evento conforme o dano que permaneceu acumulado', () => {
    const definition = getScenarioDefinition('stair-climb');
    expect(definition).toBeDefined();
    if (!definition) return;
    const cellular = initializeCellularState();
    cellular.damage.oxidativeStress = 72;
    cellular.damage.membrane = 54;
    cellular.damage.proteins = 48;
    cellular.damage.dna = 32;

    const event = createRoutineEvent(definition, 'demanda súbita', cellular);

    expect(event.severity).toBe('critical');
    expect(event.triggerReason).toContain('carga molecular');
    expect(event.triggerReason).toContain('estresse oxidativo em 72.0%');
  });
});
