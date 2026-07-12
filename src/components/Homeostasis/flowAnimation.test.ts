import { describe, expect, it } from 'vitest';
import { advanceFlowProgress, calculateEtcParticleCount, calculateFlowParticleCount } from './flowAnimation';

describe('fluxo molecular contínuo', () => {
  it.each([
    ['glicose', 4, 1, 1],
    ['oxigênio', 10, 3, 3],
    ['ácido graxo', 2, .5, .5],
    ['aminoácido', 2, .5, .5],
  ])('acrescenta partículas depois de captar %s', (_, initialAvailable, capturedAmount, captureAmount) => {
    const before = calculateFlowParticleCount(initialAvailable, 0);
    const after = calculateFlowParticleCount(initialAvailable - captureAmount, capturedAmount);

    expect(after).toBeGreaterThan(before);
  });

  it('preserva a fase existente quando a velocidade muda', () => {
    const beforeSpeedChange = advanceFlowProgress(.42, .07, 1);
    const afterSpeedChange = advanceFlowProgress(beforeSpeedChange, .11, .5);

    expect(beforeSpeedChange).toBeCloseTo(.49);
    expect(afterSpeedChange).toBeCloseTo(.545);
  });

  it('continua pelo início da curva ao completar uma volta', () => {
    expect(advanceFlowProgress(.98, .08, .5)).toBeCloseTo(.02);
  });

  it('aumenta elétrons visíveis sem substituir as partículas existentes', () => {
    const basal = calculateEtcParticleCount(24);
    const pyruvate = calculateEtcParticleCount(65);
    const fattyAcid = calculateEtcParticleCount(82);
    expect(pyruvate).toBeGreaterThan(basal);
    expect(fattyAcid).toBeGreaterThanOrEqual(pyruvate);
  });
});
