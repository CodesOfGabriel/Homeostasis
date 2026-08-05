import { describe, expect, it } from 'vitest';
import type { ScenarioLearningAssessment } from './scenarioLearning';
import { awardScenarioMastery, createInitialMasteryProgress } from './mastery';

const assessment: ScenarioLearningAssessment = {
    outcome: 'adaptive', adaptiveTargetsMatched: 2, summary: 'ok', predictions: [
        { id: 'a', metricKey: 'heartRate', label: 'FC', unit: 'bpm', digits: 0, initialValue: 70, finalValue: 80, observedDirection: 'increase', adaptiveDirection: 'increase', adaptiveTargetMatched: true },
        { id: 'b', metricKey: 'meanArterialPressure', label: 'PAM', unit: 'mmHg', digits: 0, initialValue: 70, finalValue: 90, observedDirection: 'increase', adaptiveDirection: 'increase', adaptiveTargetMatched: true },
    ],
};

describe('domínio persistente por mecanismo', () => {
    it('premia raciocínio multidimensional e coleciona o mecanismo demonstrado', () => {
        const result = awardScenarioMastery(createInitialMasteryProgress(), 'orthostatic-transition', assessment, 1, 0);
        expect(result.domain).toBe('perfusion');
        expect(result.xp).toBeGreaterThan(0);
        expect(result.progress.mechanismCards).toContain('Barorreflexo');
        expect(result.score.parsimony).toBe(100);
        expect(result.score.iatrogenicSafety).toBe(100);
    });

    it('reduz pontuação por sinais desnecessários e carga iatrogênica', () => {
        const result = awardScenarioMastery(createInitialMasteryProgress(), 'orthostatic-transition', assessment, 4, .7);
        expect(result.score.parsimony).toBeLessThan(100);
        expect(result.score.iatrogenicSafety).toBe(30);
    });

    it('só libera automação após domínio e casos distintos', () => {
        let progress = createInitialMasteryProgress();
        for (let attempt = 0; attempt < 12; attempt += 1) {
            progress = awardScenarioMastery(progress, 'meal-surge', assessment, 1, 0, 30).progress;
        }
        expect(progress.unlockedAutomations).not.toContain('metabolism-manager');
        progress = awardScenarioMastery(progress, 'morning-fast', assessment, 1, 0, 30).progress;
        expect(progress.domains.metabolism.level).toBeGreaterThanOrEqual(2);
        expect(progress.unlockedAutomations).toContain('metabolism-manager');
    });
});
