import type { CardiovascularState } from './types';

export interface CardiacRhythmContext {
    previousRhythm: CardiovascularState['rhythm'];
    heartRate: number;
    potassium: number;
    spo2: number;
    pH: number;
    perfusionRelative: number;
    myocardialDamage: number;
    adrenergicDrive: number;
    thyroidExcess: number;
    timeSeconds: number;
}

export interface CardiacRhythmAssessment {
    rhythm: CardiovascularState['rhythm'];
    risk: number;
    effectiveOutputFraction: number;
}

/**
 * Ritmo deriva do substrato elétrico e de uma janela pseudoaleatória
 * determinística. Frequência alta isolada produz taquicardia, nunca FV.
 */
export function assessCardiacRhythm(context: CardiacRhythmContext): CardiacRhythmAssessment {
    const potassiumRisk = context.potassium < 3.5
        ? clamp((3.5 - context.potassium) / 1.4, 0, 1)
        : clamp((context.potassium - 5) / 1.6, 0, 1);
    const hypoxiaRisk = clamp((92 - context.spo2) / 28, 0, 1);
    const acidRisk = clamp((7.28 - context.pH) / .38, 0, 1);
    const ischemiaRisk = clamp((70 - context.perfusionRelative) / 50, 0, 1);
    const damageRisk = clamp(context.myocardialDamage / 70, 0, 1);
    const adrenergicRisk = clamp((context.adrenergicDrive - .8) / 2.2, 0, 1);
    const tachycardiaLoad = clamp((context.heartRate - 150) / 90, 0, 1);
    const ventricularSubstrate = clamp(
        potassiumRisk * .28
        + hypoxiaRisk * .18
        + acidRisk * .17
        + ischemiaRisk * .17
        + damageRisk * .12
        + adrenergicRisk * .08,
        0,
        1,
    );
    const atrialSubstrate = clamp(
        adrenergicRisk * .32
        + potassiumRisk * .2
        + clamp(context.thyroidExcess, 0, 1) * .22
        + tachycardiaLoad * .26,
        0,
        1,
    );
    const risk = clamp((ventricularSubstrate * .72 + atrialSubstrate * .28) * 100, 0, 100);
    const gate = deterministicGate(context.timeSeconds, context.potassium, context.pH);

    const wasVentricularTachycardia = context.previousRhythm === 'ventricular-tachycardia';
    const wasVentricularFibrillation = context.previousRhythm === 'ventricular-fibrillation';
    if (wasVentricularFibrillation) {
        return { rhythm: 'ventricular-fibrillation', risk: Math.max(95, risk), effectiveOutputFraction: .02 };
    }
    if (ventricularSubstrate >= .86 && (gate < .2 + ventricularSubstrate * .35 || wasVentricularTachycardia)) {
        return { rhythm: 'ventricular-fibrillation', risk, effectiveOutputFraction: .02 };
    }
    if (ventricularSubstrate >= .62 && (context.heartRate >= 145 || gate < .24)) {
        return { rhythm: 'ventricular-tachycardia', risk, effectiveOutputFraction: .38 };
    }
    if (atrialSubstrate >= .58 && context.heartRate >= 105 && gate < .48) {
        return { rhythm: 'atrial-fibrillation', risk, effectiveOutputFraction: .78 };
    }
    if (context.heartRate >= 150) {
        return { rhythm: 'supraventricular-tachycardia', risk, effectiveOutputFraction: .88 };
    }
    if (context.heartRate < 50) {
        return { rhythm: 'bradycardia', risk, effectiveOutputFraction: 1 };
    }
    return { rhythm: 'sinus', risk, effectiveOutputFraction: 1 };
}

function deterministicGate(timeSeconds: number, potassium: number, pH: number): number {
    const window = Math.floor(Math.max(0, timeSeconds) / 4);
    const raw = Math.sin(window * 12.9898 + potassium * 37.719 + pH * 19.17) * 43758.5453;
    return raw - Math.floor(raw);
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
