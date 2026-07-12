export const MAX_FLOW_PARTICLES = 18;
export const MAX_ETC_PARTICLES = 10;

export function calculateFlowParticleCount(available: number, captured: number) {
  return Math.max(
    3,
    Math.min(MAX_FLOW_PARTICLES, Math.round(3 + Math.min(4, available) * .35 + captured * 2)),
  );
}

export function advanceFlowProgress(progress: number, speed: number, delta: number) {
  return (progress + Math.max(0, delta) * Math.max(0, speed)) % 1;
}

export function calculateEtcParticleCount(fluxPercent: number) {
  return Math.max(3, Math.min(MAX_ETC_PARTICLES, Math.round(3 + Math.max(0, fluxPercent) / 13)));
}
