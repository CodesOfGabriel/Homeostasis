import type { SubstrateKind } from '../../game/cellularTypes';

export const MAX_FLOW_PARTICLES = 18;
export const MAX_DELIVERY_PARTICLES = 12;
export const MAX_UPTAKE_PARTICLES = 10;
export const MAX_ETC_PARTICLES = 10;

// Escala mesoscalar: moléculas e proteínas precisam permanecer subordinadas
// à anatomia da célula, sem virar os maiores elementos da cena.
export const MOLECULE_RENDER_SCALE = .24;
export const MEMBRANE_MODEL_SCALE = .38;

export type TransportMechanism = 'facilitated-diffusion' | 'simple-diffusion' | 'fatty-acid-transport' | 'antiport';

export const TRANSPORT_MECHANISMS: Record<SubstrateKind, TransportMechanism> = {
  glucose: 'facilitated-diffusion',
  oxygen: 'simple-diffusion',
  fattyAcid: 'fatty-acid-transport',
  aminoAcid: 'antiport',
};

/** Densidade visual da entrega capilar ao LEC; não altera o pool fisiológico. */
export function calculateDeliveryParticleCount(available: number, perfusionPercent: number) {
  const perfusion = Math.max(.15, Math.min(1.6, perfusionPercent / 100));
  return Math.max(2, Math.min(MAX_DELIVERY_PARTICLES, Math.round(2 + available * .55 + perfusion * 3)));
}

/** Densidade visual do transporte LEC → LIC; a ação continua pertencendo ao motor. */
export function calculateUptakeParticleCount(available: number, captured: number, emphasized = false) {
  return Math.max(
    2,
    Math.min(MAX_UPTAKE_PARTICLES, Math.round(2 + Math.min(4, available) * .28 + captured * .65 + (emphasized ? 2 : 0))),
  );
}

/** Compatibilidade com a densidade usada pela primeira versão do fluxo. */
export function calculateFlowParticleCount(available: number, captured: number) {
  return Math.max(
    3,
    Math.min(MAX_FLOW_PARTICLES, Math.round(3 + Math.min(4, available) * .35 + captured * 2)),
  );
}

export function advanceFlowProgress(progress: number, speed: number, delta: number) {
  return (progress + Math.max(0, delta) * Math.max(0, speed)) % 1;
}

/**
 * Dissolve a molécula suavemente no fim do trajeto. A curva smoothstep evita
 * que a partícula simplesmente "desligue" ao alcançar o interstício/citosol.
 */
export function calculateDiffusionVisibility(progress: number, fadeStart = .62) {
  if (progress <= fadeStart) return 1;
  if (progress >= 1) return 0;
  const normalized = (progress - fadeStart) / Math.max(.001, 1 - fadeStart);
  const smooth = normalized * normalized * (3 - 2 * normalized);
  return 1 - smooth;
}

export interface BrownianOffset {
  y: number;
  z: number;
}

export const BROWNIAN_VISUAL_STEP_SECONDS = .14;

/** Box–Muller: transforma duas amostras uniformes em ruído gaussiano N(0,1). */
export function gaussianPair(uniformA: number, uniformB: number): [number, number] {
  const u1 = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, uniformA));
  const u2 = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, uniformB));
  const radius = Math.sqrt(-2 * Math.log(u1));
  const angle = Math.PI * 2 * u2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function reflect(value: number, boundary: number) {
  const limit = Math.max(.001, boundary);
  let reflected = value;
  while (Math.abs(reflected) > limit) {
    reflected = reflected > limit ? 2 * limit - reflected : -2 * limit - reflected;
  }
  return reflected;
}

/**
 * Um passo de Wiener confinado: Δx = √(2DΔt)·N(0,1). As fronteiras
 * reflexivas representam a matriz extracelular sem introduzir uma senoide.
 */
export function advanceBrownianOffset(
  current: BrownianOffset,
  diffusionCoefficient: number,
  delta: number,
  gaussianY: number,
  gaussianZ: number,
  boundary = .075,
): BrownianOffset {
  if (delta <= 0 || diffusionCoefficient <= 0) return current;
  const sigma = Math.sqrt(2 * diffusionCoefficient * delta);
  return {
    y: reflect(current.y + sigma * gaussianY, boundary),
    z: reflect(current.z + sigma * gaussianZ, boundary),
  };
}

/**
 * Interpola apenas a apresentação entre duas amostras brownianas válidas.
 * Os pontos amostrados continuam obedecendo √(2DΔt); o smootherstep remove o
 * flicker de alta frequência causado por atrelar uma nova amostra a cada frame.
 */
export function interpolateBrownianOffset(
  from: BrownianOffset,
  to: BrownianOffset,
  progress: number,
): BrownianOffset {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return from;
  if (t === 1) return to;
  const smooth = t * t * t * (t * (t * 6 - 15) + 10);
  return {
    y: from.y + (to.y - from.y) * smooth,
    z: from.z + (to.z - from.z) * smooth,
  };
}

export function calculateEtcParticleCount(fluxPercent: number) {
  return Math.max(3, Math.min(MAX_ETC_PARTICLES, Math.round(3 + Math.max(0, fluxPercent) / 13)));
}
