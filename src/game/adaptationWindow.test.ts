import { describe, expect, it } from 'vitest';
import {
  advanceAdaptationWindow,
  computeOpportunityQuality,
  createInitialAdaptationProgress,
  getAdaptationOpportunityDefinitions,
  resolveAdaptationWindow,
  selectAdaptationRewardType,
  type AdaptationOpportunityState,
} from './adaptationWindow';
import { initializeCellularState } from './cellularSimulation';
import { initializePhysiologyState } from './physiology';

function preparedCellular(time = 180) {
  const cellular = initializeCellularState();
  cellular.simulationTime = time;
  cellular.nextRoutineAt = 9999;
  cellular.rewards.homeostasisSeconds = 60;
  cellular.rewards.rosControlSeconds = 60;
  cellular.rewards.phStableSeconds = 60;
  cellular.rewards.balancedFuelSeconds = 60;
  return cellular;
}

function glucoseOpportunity(): AdaptationOpportunityState {
  const definition = getAdaptationOpportunityDefinitions().find(item => item.kind === 'glucose-wave');
  if (!definition) throw new Error('Definição glucose-wave ausente');
  return {
    id: 'glucose-test',
    kind: definition.kind,
    title: definition.title,
    clue: definition.clue,
    mechanismQuestion: definition.mechanismQuestion,
    indicators: [],
    choices: definition.choices,
    quality: .92,
    startedAt: 180,
    totalSeconds: definition.duration,
    remainingSeconds: definition.duration,
  };
}

describe('janela de adaptação fisiológica', () => {
  it('reduz a qualidade diante de estresse redox e carga iatrogênica', () => {
    const physiology = initializePhysiologyState();
    const stable = preparedCellular();
    const stressed = preparedCellular();
    stressed.damage.oxidativeStress = 78;
    stressed.damage.antioxidantCapacity = 28;
    stressed.tissue.oxygenMmHg = 18;

    const stableQuality = computeOpportunityQuality(physiology, stable, 0);
    const stressedQuality = computeOpportunityQuality(physiology, stressed, .9);
    expect(stableQuality).toBeGreaterThan(.7);
    expect(stressedQuality).toBeLessThan(stableQuality - .25);

    const saturated = preparedCellular();
    saturated.transportSaturation.glucose = 100;
    saturated.pools.captured.glucose = 6;
    expect(computeOpportunityQuality(physiology, saturated, 0)).toBeLessThan(stableQuality);
  });

  it('respeita a distribuição 55/25/12/6/2 e protege raridades', () => {
    expect(selectAdaptationRewardType(.54, .9, 'optimal')).toBe('knowledge');
    expect(selectAdaptationRewardType(.55, .9, 'optimal')).toBe('adaptation');
    expect(selectAdaptationRewardType(.8, .9, 'optimal')).toBe('multiplier');
    expect(selectAdaptationRewardType(.92, .9, 'optimal')).toBe('case-variant');
    expect(selectAdaptationRewardType(.98, .9, 'optimal')).toBe('visual-effect');
    expect(selectAdaptationRewardType(.99, .72, 'optimal')).toBe('knowledge');
    expect(selectAdaptationRewardType(.7, .9, 'harmful')).toBe('none');
  });

  it('garante uma oportunidade aos 180 s sem sobrepor cenário clínico', () => {
    const physiology = initializePhysiologyState();
    const cellular = preparedCellular();
    const progress = createInitialAdaptationProgress();
    const offered = advanceAdaptationWindow({
      physiology,
      cellular,
      opportunity: null,
      progress,
      iatrogenicBurden: 0,
      blocked: false,
      deltaTime: .25,
    });
    expect(offered.opportunity).not.toBeNull();
    expect(offered.opportunity?.totalSeconds).toBeGreaterThanOrEqual(18);
    expect(offered.opportunity?.totalSeconds).toBeLessThanOrEqual(25);
    expect(offered.progress.nextOpportunityAt - cellular.simulationTime).toBeGreaterThanOrEqual(45);
    expect(offered.progress.nextOpportunityAt - cellular.simulationTime).toBeLessThanOrEqual(120);

    const blocked = advanceAdaptationWindow({
      physiology,
      cellular,
      opportunity: null,
      progress,
      iatrogenicBurden: 0,
      blocked: true,
      deltaTime: .25,
    });
    expect(blocked.opportunity).toBeNull();
  });

  it('avalia a escolha pelo estado fisiológico, não por velocidade de clique', () => {
    const physiology = initializePhysiologyState();
    const opportunity = glucoseOpportunity();
    const highEnergy = preparedCellular();
    highEnergy.transportSaturation.glucose = 70;
    const progress = createInitialAdaptationProgress();
    const stored = resolveAdaptationWindow(physiology, highEnergy, opportunity, progress, 'store');
    const repeated = resolveAdaptationWindow(physiology, highEnergy, opportunity, progress, 'store');
    expect(stored?.result.outcome).toBe('optimal');
    expect(repeated?.result).toEqual(stored?.result);

    const lowEnergy = preparedCellular();
    lowEnergy.cell.atpMmolL = 2;
    lowEnergy.cell.adpMmolL = 4;
    lowEnergy.pools.captured.oxygen = 3;
    lowEnergy.transportSaturation.glucose = 20;
    const processed = resolveAdaptationWindow(physiology, lowEnergy, opportunity, progress, 'process');
    expect(processed?.result.outcome).toBe('optimal');

    const overloaded = resolveAdaptationWindow(physiology, highEnergy, opportunity, progress, 'glucagon');
    expect(overloaded?.result.outcome).toBe('harmful');
    expect(overloaded?.result.type).toBe('none');
  });

  it('encerra a janela sem recompensa quando o tempo real termina', () => {
    const opportunity = { ...glucoseOpportunity(), remainingSeconds: .2 };
    const result = advanceAdaptationWindow({
      physiology: initializePhysiologyState(),
      cellular: preparedCellular(),
      opportunity,
      progress: createInitialAdaptationProgress(),
      iatrogenicBurden: 0,
      blocked: false,
      deltaTime: .25,
    });
    expect(result.opportunity).toBeNull();
    expect(result.progress.missed).toBe(1);
    expect(result.progress.lastReward?.outcome).toBe('missed');
  });

  it('mantém o prazo de interação independente da velocidade fisiológica', () => {
    const opportunity = { ...glucoseOpportunity(), remainingSeconds: 20 };
    const progress = createInitialAdaptationProgress();
    progress.knowledgeMultiplier = 1.5;
    progress.multiplierRemainingSeconds = 10;
    const result = advanceAdaptationWindow({
      physiology: initializePhysiologyState(),
      cellular: preparedCellular(),
      opportunity,
      progress,
      iatrogenicBurden: 0,
      blocked: false,
      deltaTime: 4,
      interactionDeltaTime: 1,
    });
    expect(result.opportunity?.remainingSeconds).toBe(19);
    expect(result.progress.multiplierRemainingSeconds).toBe(6);
  });
});
