import type { AcidBaseBalance } from './types';

export interface AcidBaseAnalysisInput {
    pH: number;
    bicarbonate: number;
    pco2: number;
    sodium: number;
    chloride: number;
    albumin: number;
}

export type AcidBaseAnalysis = Pick<
    AcidBaseBalance,
    | 'baseExcess'
    | 'anionGap'
    | 'correctedAnionGap'
    | 'deltaRatio'
    | 'expectedCompensation'
    | 'expectedCompensationLabel'
    | 'interpretation'
    | 'mixedDisorder'
    | 'state'
>;

const NORMAL_AG = 12;

/**
 * Interpretação educacional sistemática. Ela reconhece processos compensados
 * e mistos; um pH entre 7,35 e 7,45 não encerra a investigação.
 */
export function interpretAcidBase(input: AcidBaseAnalysisInput): AcidBaseAnalysis {
    const pH = finite(input.pH, 7.4);
    const bicarbonate = clamp(finite(input.bicarbonate, 24), 5, 50);
    const pco2 = clamp(finite(input.pco2, 40), 8, 180);
    const sodium = clamp(finite(input.sodium, 140), 100, 190);
    const chloride = clamp(finite(input.chloride, 104), 70, 150);
    const albumin = clamp(finite(input.albumin, 4), 1, 6);
    const anionGap = clamp(sodium - chloride - bicarbonate, 0, 45);
    const correctedAnionGap = clamp(anionGap + 2.5 * (4 - albumin), 0, 50);
    const baseExcess = clamp(
        .9287 * (bicarbonate - 24.4 + 14.83 * (pH - 7.4)),
        -30,
        30,
    );

    const acidemia = pH < 7.35;
    const alkalemia = pH > 7.45;
    const metabolicAcidosis = bicarbonate < 22;
    const metabolicAlkalosis = bicarbonate > 26;
    const respiratoryAcidosis = pco2 > 45;
    const respiratoryAlkalosis = pco2 < 35;

    let state: AcidBaseBalance['state'] = 'normal';
    if (acidemia) {
        state = metabolicAcidosis && respiratoryAcidosis
            ? 'mixed'
            : metabolicAcidosis ? 'acidosis-metabolic' : 'acidosis-respiratory';
    } else if (alkalemia) {
        state = metabolicAlkalosis && respiratoryAlkalosis
            ? 'mixed'
            : metabolicAlkalosis ? 'alkalosis-metabolic' : 'alkalosis-respiratory';
    } else if (metabolicAcidosis && respiratoryAcidosis) {
        state = 'mixed';
    } else if (metabolicAlkalosis && respiratoryAlkalosis) {
        state = 'mixed';
    } else if (metabolicAcidosis) {
        state = 'acidosis-metabolic';
    } else if (metabolicAlkalosis) {
        state = 'alkalosis-metabolic';
    } else if (respiratoryAcidosis) {
        state = 'acidosis-respiratory';
    } else if (respiratoryAlkalosis) {
        state = 'alkalosis-respiratory';
    }

    let expectedCompensation: [number, number] | null = null;
    let expectedCompensationLabel = 'Sem compensação esperada fora do basal';
    let compensationMismatch = false;
    const compensationProcess = state === 'mixed'
        ? acidemia && metabolicAcidosis ? 'acidosis-metabolic'
            : alkalemia && metabolicAlkalosis ? 'alkalosis-metabolic'
                : acidemia && respiratoryAcidosis ? 'acidosis-respiratory'
                    : alkalemia && respiratoryAlkalosis ? 'alkalosis-respiratory'
                        : metabolicAcidosis ? 'acidosis-metabolic'
                            : metabolicAlkalosis ? 'alkalosis-metabolic'
                                : respiratoryAcidosis ? 'acidosis-respiratory'
                                    : respiratoryAlkalosis ? 'alkalosis-respiratory'
                                        : 'normal'
        : state;

    if (compensationProcess === 'acidosis-metabolic') {
        const winter = 1.5 * bicarbonate + 8;
        expectedCompensation = [winter - 2, winter + 2];
        expectedCompensationLabel = 'PaCO₂ esperada pela fórmula de Winter';
        compensationMismatch = outside(pco2, expectedCompensation);
    } else if (compensationProcess === 'alkalosis-metabolic') {
        const expected = 40 + .7 * (bicarbonate - 24);
        expectedCompensation = [expected - 5, expected + 5];
        expectedCompensationLabel = 'PaCO₂ esperada na alcalose metabólica';
        compensationMismatch = outside(pco2, expectedCompensation);
    } else if (compensationProcess === 'acidosis-respiratory') {
        const delta = Math.max(0, (pco2 - 40) / 10);
        const acuteHco3 = 24 + delta;
        const chronicHco3 = 24 + delta * 3.5;
        expectedCompensation = [acuteHco3 - 1, chronicHco3 + 2];
        expectedCompensationLabel = 'HCO₃⁻ esperado entre compensação respiratória aguda e crônica';
        compensationMismatch = outside(bicarbonate, expectedCompensation);
    } else if (compensationProcess === 'alkalosis-respiratory') {
        const delta = Math.max(0, (40 - pco2) / 10);
        const chronicHco3 = 24 - delta * 4;
        const acuteHco3 = 24 - delta * 2;
        expectedCompensation = [chronicHco3 - 2, acuteHco3 + 1];
        expectedCompensationLabel = 'HCO₃⁻ esperado entre compensação respiratória crônica e aguda';
        compensationMismatch = outside(bicarbonate, expectedCompensation);
    }

    const deltaRatio = bicarbonate < 24 && correctedAnionGap > NORMAL_AG
        ? clamp((correctedAnionGap - NORMAL_AG) / Math.max(.5, 24 - bicarbonate), 0, 6)
        : null;
    const deltaMixed = deltaRatio !== null && (deltaRatio < .4 || deltaRatio > 2);
    const opposingProcesses = (metabolicAcidosis && respiratoryAcidosis)
        || (metabolicAlkalosis && respiratoryAlkalosis)
        || (!acidemia && !alkalemia && (
            (metabolicAcidosis && respiratoryAlkalosis)
            || (metabolicAlkalosis && respiratoryAcidosis)
        ));
    const mixedDisorder = state === 'mixed' || compensationMismatch || deltaMixed || opposingProcesses;
    if (mixedDisorder) state = 'mixed';

    const primary = primaryLabel(state, correctedAnionGap);
    const details: string[] = [primary];
    if (correctedAnionGap > 16) details.push('ânion gap corrigido elevado');
    if (compensationMismatch) details.push('compensação fora da faixa esperada');
    if (deltaMixed && deltaRatio !== null) details.push(`delta ratio ${deltaRatio.toFixed(2)} sugere processo metabólico adicional`);
    if (!acidemia && !alkalemia && mixedDisorder) details.push('pH quase normal não exclui processos simultâneos');

    return {
        baseExcess,
        anionGap,
        correctedAnionGap,
        deltaRatio,
        expectedCompensation,
        expectedCompensationLabel,
        interpretation: details.join('; '),
        mixedDisorder,
        state,
    };
}

function primaryLabel(state: AcidBaseBalance['state'], correctedAnionGap: number): string {
    if (state === 'normal') return 'Sem distúrbio ácido-base primário detectável';
    if (state === 'mixed') return 'Distúrbio ácido-base misto ou compensação inadequada';
    if (state === 'acidosis-metabolic') return correctedAnionGap > 16
        ? 'Acidose metabólica com ânion gap elevado'
        : 'Acidose metabólica sem elevação importante do ânion gap';
    if (state === 'acidosis-respiratory') return 'Acidose respiratória';
    if (state === 'alkalosis-metabolic') return 'Alcalose metabólica';
    return 'Alcalose respiratória';
}

function outside(value: number, range: [number, number]) {
    return value < range[0] || value > range[1];
}

function finite(value: number, fallback: number) {
    return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
