import { describe, expect, it } from 'vitest';
import {
  advanceBrownianOffset,
  advanceFlowProgress,
  BROWNIAN_VISUAL_STEP_SECONDS,
  calculateDeliveryParticleCount,
  calculateDiffusionVisibility,
  calculateEtcParticleCount,
  calculateFlowParticleCount,
  calculateUptakeParticleCount,
  gaussianPair,
  interpolateBrownianOffset,
  MEMBRANE_MODEL_SCALE,
  MOLECULE_RENDER_SCALE,
  TRANSPORT_MECHANISMS,
} from './flowAnimation';

describe('fluxo molecular contínuo', () => {
  it('mantém moléculas e proteínas subordinadas à escala da célula', () => {
    expect(MOLECULE_RENDER_SCALE).toBeLessThanOrEqual(.25);
    expect(MEMBRANE_MODEL_SCALE).toBeLessThanOrEqual(.4);
  });

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

  it('aumenta a entrega visual quando a perfusão e o saldo intersticial sobem', () => {
    const lowDelivery = calculateDeliveryParticleCount(.5, 35);
    const restoredDelivery = calculateDeliveryParticleCount(4, 100);
    expect(restoredDelivery).toBeGreaterThan(lowDelivery);
  });

  it('dissolve a molécula de modo contínuo no fim da difusão', () => {
    expect(calculateDiffusionVisibility(.4, .55)).toBe(1);
    expect(calculateDiffusionVisibility(.75, .55)).toBeGreaterThan(0);
    expect(calculateDiffusionVisibility(.75, .55)).toBeLessThan(1);
    expect(calculateDiffusionVisibility(1, .55)).toBe(0);
  });

  it('integra movimento browniano por √(2DΔt) em vez de oscilação periódica', () => {
    const moved = advanceBrownianOffset({ y: 0, z: 0 }, .001, .25, 1, -1);
    const expectedSigma = Math.sqrt(2 * .001 * .25);
    expect(moved.y).toBeCloseTo(expectedSigma);
    expect(moved.z).toBeCloseTo(-expectedSigma);
    expect(advanceBrownianOffset(moved, .001, 0, 4, 4)).toEqual(moved);
  });

  it('gera ruído gaussiano e reflete trajetórias nos limites do LEC', () => {
    const gaussian = gaussianPair(.5, .25);
    expect(gaussian[0] ** 2 + gaussian[1] ** 2).toBeCloseTo(-2 * Math.log(.5));
    const reflected = advanceBrownianOffset({ y: .07, z: -.07 }, .02, 1, 1, -1, .075);
    expect(Math.abs(reflected.y)).toBeLessThanOrEqual(.075);
    expect(Math.abs(reflected.z)).toBeLessThanOrEqual(.075);
  });

  it('separa o passo browniano fixo da interpolação visual entre amostras', () => {
    const from = { y: -.04, z: .02 };
    const to = { y: .06, z: -.04 };

    expect(BROWNIAN_VISUAL_STEP_SECONDS).toBeGreaterThan(.1);
    expect(interpolateBrownianOffset(from, to, 0)).toEqual(from);
    expect(interpolateBrownianOffset(from, to, 1)).toEqual(to);
    expect(interpolateBrownianOffset(from, to, .1).y).toBeLessThan(-.03);
    const midpoint = interpolateBrownianOffset(from, to, .5);
    expect(midpoint.y).toBeCloseTo(.01);
    expect(midpoint.z).toBeCloseTo(-.01);
  });

  it('distingue difusão, carreador, transporte lipídico e antiporte', () => {
    expect(TRANSPORT_MECHANISMS).toEqual({
      glucose: 'facilitated-diffusion',
      oxygen: 'simple-diffusion',
      fattyAcid: 'fatty-acid-transport',
      aminoAcid: 'antiport',
    });
    expect(calculateUptakeParticleCount(2, 1, true)).toBeGreaterThan(calculateUptakeParticleCount(2, 1));
  });
});
