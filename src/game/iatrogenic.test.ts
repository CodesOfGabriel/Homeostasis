import { describe, expect, it } from 'vitest';
import { initializeCellularState } from './cellularSimulation';
import {
  advanceIatrogenicConsequences,
  assessSignalMisuse,
  mergeIatrogenicEpisodes,
} from './iatrogenic';
import { initializePhysiologyState } from './physiology';

describe('carga iatrogênica persistente', () => {
  it('classifica erro contextual extremo como crítico e prolongado', () => {
    const physiology = initializePhysiologyState();
    physiology.nutrients.bloodGlucose = 68;
    const episode = assessSignalMisuse(
      'hormone:release-insulin',
      physiology,
      'nocturnal-hypoglycemia',
    );

    expect(episode?.severity).toBe('critical');
    expect(episode?.intensity).toBeGreaterThanOrEqual(.95);
    expect(episode?.totalSeconds).toBeGreaterThan(80);
    expect(episode?.mechanism).toBe('hypoglycemia');
  });

  it('aumenta a penalidade por segundo conforme a exposição persiste', () => {
    const physiology = initializePhysiologyState();
    const cellular = initializeCellularState();
    const episode = assessSignalMisuse(
      'central:parasympathetic-recovery',
      physiology,
      'orthostatic-transition',
    );
    expect(episode).not.toBeNull();
    if (!episode) return;

    const early = advanceIatrogenicConsequences(physiology, cellular, [episode], 1);
    const late = advanceIatrogenicConsequences(
      physiology,
      cellular,
      [{ ...episode, elapsedSeconds: 35, remainingSeconds: episode.remainingSeconds - 35 }],
      1,
    );
    const earlyMapLoss = physiology.cardiovascular.meanArterialPressure
      - early.physiology.cardiovascular.meanArterialPressure;
    const lateMapLoss = physiology.cardiovascular.meanArterialPressure
      - late.physiology.cardiovascular.meanArterialPressure;

    expect(lateMapLoss).toBeGreaterThan(earlyMapLoss);
    expect(late.episodes[0].remainingSeconds).toBeLessThan(episode.remainingSeconds - 35);
  });

  it('uma nova exposição soma duração à carga ainda ativa', () => {
    const physiology = initializePhysiologyState();
    physiology.nutrients.bloodGlucose = 75;
    const first = assessSignalMisuse('hormone:release-insulin', physiology, 'morning-fast');
    const second = assessSignalMisuse('hormone:release-insulin', physiology, 'morning-fast');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) return;

    const merged = mergeIatrogenicEpisodes(
      [{ ...first, elapsedSeconds: 10, remainingSeconds: first.remainingSeconds - 10 }],
      [second],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].remainingSeconds).toBeGreaterThan(first.remainingSeconds - 10);
  });
});
