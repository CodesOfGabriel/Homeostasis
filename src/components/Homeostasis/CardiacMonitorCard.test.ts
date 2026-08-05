import { describe, expect, it } from 'vitest';
import { createEcgPath, getEcgPixelsPerSecond, getHeartBeatMotion } from './CardiacMonitorCard';

describe('animação do coração e ECG da avaliação primária', () => {
  it('mantém o pulso anatômico dependente da frequência', () => {
    const relaxed = getHeartBeatMotion(0, 70);
    const contracted = getHeartBeatMotion(60 / 70 / 4, 70);
    expect(contracted.scale).toBeGreaterThan(relaxed.scale);
  });

  it('mantém a varredura contínua do ECG proporcional ao BPM', () => {
    expect(getEcgPixelsPerSecond(140)).toBeGreaterThan(getEcgPixelsPerSecond(70));
    expect(getEcgPixelsPerSecond(20)).toBe(70);
  });

  it('gera morfologias distintas sem remover o traçado P-QRS-T sinusal', () => {
    const sinus = createEcgPath('sinus', 50);
    const atrial = createEcgPath('atrial-fibrillation', 50);
    const ventricular = createEcgPath('ventricular-tachycardia', 50);
    const fibrillation = createEcgPath('ventricular-fibrillation', 50);
    expect(sinus).toContain('C');
    expect(new Set([sinus, atrial, ventricular, fibrillation]).size).toBe(4);
  });
});
