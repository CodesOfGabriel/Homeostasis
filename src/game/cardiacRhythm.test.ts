import { describe, expect, it } from 'vitest';
import { assessCardiacRhythm } from './cardiacRhythm';

const baseline = {
    previousRhythm: 'sinus' as const,
    potassium: 4,
    spo2: 98,
    pH: 7.4,
    perfusionRelative: 90,
    myocardialDamage: 0,
    adrenergicDrive: 0,
    thyroidExcess: 0,
    timeSeconds: 40,
};

describe('classificação de ritmo cardíaco', () => {
    it('não transforma frequência alta isolada em fibrilação ventricular', () => {
        const result = assessCardiacRhythm({ ...baseline, heartRate: 215 });
        expect(result.rhythm).toBe('supraventricular-tachycardia');
        expect(result.effectiveOutputFraction).toBeGreaterThan(.8);
    });

    it('distingue bradicardia de ritmo sinusal', () => {
        expect(assessCardiacRhythm({ ...baseline, heartRate: 42 }).rhythm).toBe('bradycardia');
    });

    it('exige substrato grave para fibrilação ventricular', () => {
        const result = assessCardiacRhythm({
            ...baseline,
            previousRhythm: 'ventricular-tachycardia',
            heartRate: 190,
            potassium: 7,
            spo2: 62,
            pH: 6.9,
            perfusionRelative: 20,
            myocardialDamage: 80,
            adrenergicDrive: 3,
        });
        expect(result.rhythm).toBe('ventricular-fibrillation');
        expect(result.effectiveOutputFraction).toBeLessThan(.1);
    });
});
