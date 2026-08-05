import { describe, expect, it } from 'vitest';
import { interpretAcidBase } from './acidBase';

describe('interpretação ácido-base', () => {
    it('usa cloreto real e corrige o ânion gap pela albumina', () => {
        const result = interpretAcidBase({ pH: 7.28, bicarbonate: 16, pco2: 32, sodium: 140, chloride: 104, albumin: 2 });
        expect(result.anionGap).toBe(20);
        expect(result.correctedAnionGap).toBe(25);
        expect(result.interpretation).toContain('ânion gap corrigido elevado');
    });

    it('aplica Winter e identifica acidose respiratória agregada', () => {
        const result = interpretAcidBase({ pH: 7.14, bicarbonate: 12, pco2: 40, sodium: 138, chloride: 102, albumin: 4 });
        expect(result.expectedCompensation).toEqual([24, 28]);
        expect(result.mixedDisorder).toBe(true);
        expect(result.interpretation).toContain('compensação fora da faixa esperada');
    });

    it('não considera pH normal como prova de ausência de distúrbio misto', () => {
        const result = interpretAcidBase({ pH: 7.4, bicarbonate: 18, pco2: 30, sodium: 140, chloride: 108, albumin: 4 });
        expect(result.state).toBe('mixed');
        expect(result.mixedDisorder).toBe(true);
        expect(result.interpretation).toContain('pH quase normal');
    });

    it('calcula compensação da alcalose metabólica', () => {
        const result = interpretAcidBase({ pH: 7.5, bicarbonate: 34, pco2: 47, sodium: 140, chloride: 96, albumin: 4 });
        expect(result.state).toBe('alkalosis-metabolic');
        expect(result.expectedCompensation).toEqual([42, 52]);
        expect(result.mixedDisorder).toBe(false);
    });

    it('prioriza as compensações respiratórias mesmo quando o bicarbonato já mudou', () => {
        const respiratoryAcidosis = interpretAcidBase({ pH: 7.28, bicarbonate: 29, pco2: 60, sodium: 140, chloride: 103, albumin: 4 });
        const respiratoryAlkalosis = interpretAcidBase({ pH: 7.53, bicarbonate: 20, pco2: 25, sodium: 140, chloride: 106, albumin: 4 });
        expect(respiratoryAcidosis.expectedCompensationLabel).toContain('respiratória aguda e crônica');
        expect(respiratoryAlkalosis.expectedCompensationLabel).toContain('respiratória crônica e aguda');
    });
});
