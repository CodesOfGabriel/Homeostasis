import { describe, expect, it } from 'vitest';
import { applyScenarioCellularEffects, initializeCellularState } from './cellularSimulation';
import { initializePhysiologyState } from './physiology';
import { createScenarioMetricSnapshot } from './scenarioMetrics';
import {
  assessScenarioLearning,
  getObservedDirection,
  getScenarioLearning,
  SCENARIO_LEARNING,
} from './scenarioLearning';
import {
  applyScenarioPhysiologyEffects,
  getScenarioChoice,
  SCENARIO_DEFINITIONS,
} from './scenarios';

function assessChoice(scenarioId: string, choiceId: string) {
  const definition = SCENARIO_DEFINITIONS.find(item => item.id === scenarioId);
  const choice = getScenarioChoice(scenarioId, choiceId);
  if (!definition || !choice) throw new Error('Cenário de teste incompleto');
  const initialPhysiology = applyScenarioPhysiologyEffects(initializePhysiologyState(), definition.onStartPhysiology);
  const initialCellular = applyScenarioCellularEffects(initializeCellularState(), definition.onStart);
  const onset = createScenarioMetricSnapshot(initialPhysiology, initialCellular);
  const finalPhysiology = applyScenarioPhysiologyEffects(initialPhysiology, choice.physiologyEffects);
  const finalCellular = applyScenarioCellularEffects(initialCellular, choice.cellularEffects);
  return assessScenarioLearning(
    scenarioId,
    onset,
    createScenarioMetricSnapshot(finalPhysiology, finalCellular),
    'recoverable',
  );
}

describe('aprendizado causal dos cenários', () => {
  it('cobre todos os cenários com duas metas mensuráveis de recuperação', () => {
    expect(Object.keys(SCENARIO_LEARNING)).toHaveLength(SCENARIO_DEFINITIONS.length);
    SCENARIO_DEFINITIONS.forEach(definition => {
      const learning = getScenarioLearning(definition.id);
      expect(learning, definition.id).toBeDefined();
      expect(learning?.hypotheses.filter(option => option.correct), definition.id).toHaveLength(1);
      expect(learning?.predictions, definition.id).toHaveLength(2);
      expect(definition.choices.every(choice => !('outcome' in choice)), definition.id).toBe(true);
    });
  });

  it('classifica a trajetória pelas métricas e não por um rótulo na escolha', () => {
    expect(assessChoice('stair-climb', 'stair-aerobic').outcome).toBe('adaptive');
    expect(assessChoice('stair-climb', 'stair-glycolytic').outcome).toBe('harmful');
    expect(assessChoice('hyperosmolar-renal-conflict', 'hyperosmolar-volume-only').outcome).toBe('partial');
  });

  it('reconhece a trajetória restauradora configurada em todos os casos', () => {
    SCENARIO_DEFINITIONS.forEach(definition => {
      expect(
        assessChoice(definition.id, definition.choices[0].id).outcome,
        definition.id,
      ).toBe('adaptive');
    });
  });

  it('distingue uma oscilação pequena de uma mudança fisiologicamente relevante', () => {
    expect(getObservedDirection(40, 40.4, 1)).toBe('stable');
    expect(getObservedDirection(40, 42, 1)).toBe('increase');
    expect(getObservedDirection(40, 37, 1)).toBe('decrease');
  });
});
