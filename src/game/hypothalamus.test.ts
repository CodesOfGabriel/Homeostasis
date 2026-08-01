import { describe, expect, it } from 'vitest';
import {
  advanceHypothalamicRegulation,
  applyHypothalamicSignal,
  createInitialHypothalamicState,
  deriveRegulatoryCommands,
  getHypothalamicSignal,
  isHypothalamicSignalSafe,
} from './hypothalamus';
import { initializePhysiologyState } from './physiology';

describe('regulação hipotalâmica', () => {
  it('converte circuitos em comandos internos sem expor metas ao usuário', () => {
    const sympathetic = getHypothalamicSignal('sympathetic-arousal');
    const adh = getHypothalamicSignal('adh-retention');
    if (!sympathetic || !adh) throw new Error('Configuração hipotalâmica ausente');
    let state = applyHypothalamicSignal(createInitialHypothalamicState(), sympathetic);
    state = applyHypothalamicSignal(state, adh);
    const commands = deriveRegulatoryCommands(state);
    expect(commands.heartRateTarget).toBeGreaterThan(70);
    expect(commands.ventilationDrive).toBeGreaterThan(100);
    expect(commands.renalWaterReabsorption).toBeGreaterThan(99.2);
  });

  it('faz o sinal transitório retornar gradualmente ao basal', () => {
    const signal = getHypothalamicSignal('chemoreflex-ventilation');
    if (!signal) throw new Error('Configuração hipotalâmica ausente');
    const activated = applyHypothalamicSignal(createInitialHypothalamicState(), signal);
    const recovered = advanceHypothalamicRegulation(activated, 75);
    expect(Math.abs(recovered.respiratoryDrive)).toBeLessThan(Math.abs(activated.respiratoryDrive));
    expect(recovered.respiratoryDrive).toBeGreaterThan(0);
  });

  it('bloqueia redução ventilatória diante de hipercapnia', () => {
    const physiology = initializePhysiologyState();
    physiology.respiratory.paco2 = 55;
    const safety = isHypothalamicSignalSafe('reduce-respiratory-drive', physiology);
    expect(safety.safe).toBe(false);
    expect(safety.reason).toContain('CO₂');
  });
});
