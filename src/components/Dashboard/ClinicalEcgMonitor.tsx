import React from 'react';
import type { CardiovascularState } from '../../game/types';

const SAMPLE_RATE_HZ = 360;
const SAMPLE_PERIOD_SECONDS = 1 / SAMPLE_RATE_HZ;
const WINDOW_SECONDS = 6;
const MAX_SAMPLES = SAMPLE_RATE_HZ * WINDOW_SECONDS;

type Rhythm = CardiovascularState['rhythm'];

interface ClinicalEcgMonitorProps {
    bpm: number;
    rhythm: Rhythm;
    heartRateVariabilityMs: number;
}

interface BeatMorphology {
    hasPWave: boolean;
    qrsDurationSeconds: number;
    rAmplitudeMv: number;
    tPolarity: 1 | -1;
}

interface EcgEngine {
    samples: Float32Array;
    writeIndex: number;
    sampleCount: number;
    elapsedSeconds: number;
    beatElapsedSeconds: number;
    rrSeconds: number;
    beatIndex: number;
    morphology: BeatMorphology;
}

export interface EcgIntervals {
    rrSeconds: number;
    pDurationMs: number;
    prIntervalMs: number;
    qrsDurationMs: number;
    qtIntervalMs: number;
    qtcFridericiaMs: number;
}

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

export function calculateEcgIntervals(bpm: number, wideQrs = false): EcgIntervals {
    const safeBpm = clamp(bpm, 25, 220);
    const rrSeconds = 60 / safeBpm;
    const rateScale = clamp(Math.cbrt(rrSeconds / 0.86), 0.72, 1.18);
    const pDurationSeconds = clamp(0.09 * rateScale, 0.065, 0.11);
    const prIntervalSeconds = clamp(0.16 * rateScale, 0.12, 0.20);
    const qrsDurationSeconds = wideQrs
        ? clamp(0.14 * rateScale, 0.12, 0.18)
        : clamp(0.085 * rateScale, 0.065, 0.10);
    const qtcFridericiaSeconds = 0.41;
    const qtUpperLimit = Math.min(0.52, Math.max(0.22, rrSeconds * 0.78));
    const qtLowerLimit = Math.min(0.26, qtUpperLimit);
    const qtIntervalSeconds = clamp(
        qtcFridericiaSeconds * Math.cbrt(rrSeconds),
        qtLowerLimit,
        qtUpperLimit,
    );

    return {
        rrSeconds,
        pDurationMs: pDurationSeconds * 1000,
        prIntervalMs: prIntervalSeconds * 1000,
        qrsDurationMs: qrsDurationSeconds * 1000,
        qtIntervalMs: qtIntervalSeconds * 1000,
        qtcFridericiaMs: qtIntervalSeconds / Math.cbrt(rrSeconds) * 1000,
    };
}

function deterministicNoise(seed: number): number {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
}

function createMorphology(rhythm: Rhythm, beatIndex: number, rrSeconds: number): BeatMorphology {
    const ectopic = rhythm === 'arrhythmia' && beatIndex % 5 === 3;
    const intervals = calculateEcgIntervals(60 / rrSeconds, ectopic);
    return {
        hasPWave: rhythm !== 'fibrillation' && !ectopic,
        qrsDurationSeconds: intervals.qrsDurationMs / 1000,
        rAmplitudeMv: ectopic
            ? 0.72 + deterministicNoise(beatIndex) * 0.08
            : 1.02 + deterministicNoise(beatIndex) * 0.035,
        tPolarity: ectopic ? -1 : 1,
    };
}

function nextRrSeconds(
    bpm: number,
    rhythm: Rhythm,
    heartRateVariabilityMs: number,
    beatIndex: number,
): number {
    const baseRr = 60 / clamp(bpm, 25, 220);
    const hrvSeconds = clamp(heartRateVariabilityMs / 1000, 0.005, 0.16);
    const respiratoryVariation = Math.sin(beatIndex * 1.73) * hrvSeconds * 0.34;
    const slowVariation = Math.sin(beatIndex * 0.41 + 0.8) * hrvSeconds * 0.16;

    if (rhythm === 'arrhythmia') {
        const ectopicFactor = beatIndex % 5 === 3 ? 0.58 : beatIndex % 5 === 4 ? 1.38 : 1;
        const irregularity = 1 + deterministicNoise(beatIndex + 17) * 0.18;
        return clamp(baseRr * ectopicFactor * irregularity, 0.26, 2.4);
    }
    if (rhythm === 'fibrillation') {
        return clamp(baseRr * (1 + deterministicNoise(beatIndex + 31) * 0.28), 0.24, 2.4);
    }
    return clamp(baseRr + respiratoryVariation + slowVariation, 0.27, 2.4);
}

function gaussian(
    timeSeconds: number,
    centerSeconds: number,
    sigmaSeconds: number,
    amplitudeMv: number,
): number {
    const normalized = (timeSeconds - centerSeconds) / Math.max(0.001, sigmaSeconds);
    return amplitudeMv * Math.exp(-0.5 * normalized * normalized);
}

export function synthesizePqrstSample(
    beatElapsedSeconds: number,
    rrSeconds: number,
    morphology: BeatMorphology,
    absoluteTimeSeconds: number,
): number {
    const intervals = calculateEcgIntervals(60 / rrSeconds, morphology.qrsDurationSeconds >= 0.12);
    const pDuration = intervals.pDurationMs / 1000;
    const prInterval = intervals.prIntervalMs / 1000;
    const qrsDuration = morphology.qrsDurationSeconds;
    const qtInterval = intervals.qtIntervalMs / 1000;

    const qrsOnset = clamp(rrSeconds * 0.30, 0.10, 0.34);
    const pOnset = Math.max(0.012, qrsOnset - prInterval);
    const pCenter = pOnset + pDuration * 0.5;
    const qCenter = qrsOnset + qrsDuration * 0.18;
    const rCenter = qrsOnset + qrsDuration * 0.42;
    const sCenter = qrsOnset + qrsDuration * 0.70;
    const qrsEnd = qrsOnset + qrsDuration;
    const tEnd = Math.min(rrSeconds - 0.025, qrsOnset + qtInterval);
    const tCenter = qrsEnd + Math.max(0.035, (tEnd - qrsEnd) * 0.58);
    const tSigma = Math.max(0.035, (tEnd - qrsEnd) * 0.16);

    const pWave = morphology.hasPWave
        ? gaussian(beatElapsedSeconds, pCenter, pDuration * 0.22, 0.13)
        : 0;
    const qWave = gaussian(beatElapsedSeconds, qCenter, qrsDuration * 0.075, -0.14);
    const rWave = gaussian(
        beatElapsedSeconds,
        rCenter,
        qrsDuration * 0.055,
        morphology.rAmplitudeMv,
    );
    const sWave = gaussian(beatElapsedSeconds, sCenter, qrsDuration * 0.09, -0.30);
    const tWave = gaussian(
        beatElapsedSeconds,
        tCenter,
        tSigma,
        0.29 * morphology.tPolarity,
    );
    const stPlateau = beatElapsedSeconds > qrsEnd && beatElapsedSeconds < tCenter
        ? 0.012 * Math.sin(Math.PI * (beatElapsedSeconds - qrsEnd) / Math.max(0.02, tCenter - qrsEnd))
        : 0;
    const respiratoryBaseline = 0.018 * Math.sin(absoluteTimeSeconds * Math.PI * 0.52);
    const acquisitionNoise = 0.003 * deterministicNoise(Math.floor(absoluteTimeSeconds * SAMPLE_RATE_HZ));

    return pWave + qWave + rWave + sWave + tWave + stPlateau + respiratoryBaseline + acquisitionNoise;
}

function fibrillationSample(timeSeconds: number): number {
    return 0.11 * Math.sin(timeSeconds * 31.7)
        + 0.075 * Math.sin(timeSeconds * 47.1 + 0.8)
        + 0.045 * Math.sin(timeSeconds * 71.3 + 1.7)
        + 0.018 * deterministicNoise(Math.floor(timeSeconds * SAMPLE_RATE_HZ));
}

function createEngine(bpm: number, rhythm: Rhythm): EcgEngine {
    const rrSeconds = nextRrSeconds(bpm, rhythm, 50, 0);
    return {
        samples: new Float32Array(MAX_SAMPLES),
        writeIndex: 0,
        sampleCount: 0,
        elapsedSeconds: 0,
        beatElapsedSeconds: 0,
        rrSeconds,
        beatIndex: 0,
        morphology: createMorphology(rhythm, 0, rrSeconds),
    };
}

function appendSample(
    engine: EcgEngine,
    bpm: number,
    rhythm: Rhythm,
    heartRateVariabilityMs: number,
): void {
    engine.elapsedSeconds += SAMPLE_PERIOD_SECONDS;
    engine.beatElapsedSeconds += SAMPLE_PERIOD_SECONDS;

    if (engine.beatElapsedSeconds >= engine.rrSeconds) {
        engine.beatElapsedSeconds -= engine.rrSeconds;
        engine.beatIndex += 1;
        engine.rrSeconds = nextRrSeconds(
            bpm,
            rhythm,
            heartRateVariabilityMs,
            engine.beatIndex,
        );
        engine.morphology = createMorphology(rhythm, engine.beatIndex, engine.rrSeconds);
    }

    const value = rhythm === 'fibrillation'
        ? fibrillationSample(engine.elapsedSeconds)
        : synthesizePqrstSample(
            engine.beatElapsedSeconds,
            engine.rrSeconds,
            engine.morphology,
            engine.elapsedSeconds,
        );
    engine.samples[engine.writeIndex] = value;
    engine.writeIndex = (engine.writeIndex + 1) % MAX_SAMPLES;
    engine.sampleCount = Math.min(MAX_SAMPLES, engine.sampleCount + 1);
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = '#07080a';
    context.fillRect(0, 0, width, height);

    const smallBoxX = Math.max(3, width * 0.04 / WINDOW_SECONDS);
    const millivoltPixels = height * 0.34;
    const smallBoxY = Math.max(3, millivoltPixels * 0.1);

    for (let index = 0, x = 0; x <= width; index += 1, x += smallBoxX) {
        context.beginPath();
        context.strokeStyle = index % 5 === 0
            ? 'rgba(239, 68, 68, 0.16)'
            : 'rgba(239, 68, 68, 0.055)';
        context.lineWidth = index % 5 === 0 ? 0.8 : 0.45;
        context.moveTo(Math.round(x) + 0.5, 0);
        context.lineTo(Math.round(x) + 0.5, height);
        context.stroke();
    }

    for (let index = 0, y = 0; y <= height; index += 1, y += smallBoxY) {
        context.beginPath();
        context.strokeStyle = index % 5 === 0
            ? 'rgba(239, 68, 68, 0.16)'
            : 'rgba(239, 68, 68, 0.055)';
        context.lineWidth = index % 5 === 0 ? 0.8 : 0.45;
        context.moveTo(0, Math.round(y) + 0.5);
        context.lineTo(width, Math.round(y) + 0.5);
        context.stroke();
    }
}

function tracePath(
    context: CanvasRenderingContext2D,
    engine: EcgEngine,
    width: number,
    height: number,
): void {
    if (engine.sampleCount < 2) return;
    const baselineY = height * 0.58;
    const millivoltPixels = height * 0.34;
    const oldestIndex = (engine.writeIndex - engine.sampleCount + MAX_SAMPLES) % MAX_SAMPLES;
    const stride = Math.max(1, Math.floor(engine.sampleCount / Math.max(1, width * 1.25)));

    const makePath = () => {
        context.beginPath();
        let drawnIndex = 0;
        for (let index = 0; index < engine.sampleCount; index += stride) {
            const bufferIndex = (oldestIndex + index) % MAX_SAMPLES;
            const x = index / Math.max(1, engine.sampleCount - 1) * width;
            const y = clamp(
                baselineY - engine.samples[bufferIndex] * millivoltPixels,
                5,
                height - 5,
            );
            if (drawnIndex === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
            drawnIndex += 1;
        }
    };

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    makePath();
    context.strokeStyle = 'rgba(239, 68, 68, 0.20)';
    context.lineWidth = 5;
    context.stroke();
    makePath();
    context.strokeStyle = '#ff3b3b';
    context.lineWidth = 1.55;
    context.stroke();

    const fade = context.createLinearGradient(width - 28, 0, width, 0);
    fade.addColorStop(0, 'rgba(239, 68, 68, 0)');
    fade.addColorStop(1, 'rgba(239, 68, 68, 0.30)');
    context.fillStyle = fade;
    context.fillRect(width - 28, 0, 28, height);
    context.restore();
}

function drawCalibrationPulse(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
): void {
    const pulseWidth = width * 0.2 / WINDOW_SECONDS;
    const pulseHeight = height * 0.34;
    const x = 12;
    const baseline = height - 14;
    context.save();
    context.beginPath();
    context.moveTo(x, baseline);
    context.lineTo(x + pulseWidth * 0.25, baseline);
    context.lineTo(x + pulseWidth * 0.25, baseline - pulseHeight);
    context.lineTo(x + pulseWidth * 1.25, baseline - pulseHeight);
    context.lineTo(x + pulseWidth * 1.25, baseline);
    context.lineTo(x + pulseWidth * 1.5, baseline);
    context.strokeStyle = 'rgba(228, 228, 231, 0.42)';
    context.lineWidth = 1;
    context.stroke();
    context.restore();
}

function drawMonitor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    engine: EcgEngine,
): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    drawGrid(context, width, height);
    tracePath(context, engine, width, height);
    drawCalibrationPulse(context, width, height);
}

function rhythmDescription(bpm: number, rhythm: Rhythm): string {
    if (rhythm === 'fibrillation') return 'Fibrilação ventricular';
    if (rhythm === 'arrhythmia') return 'Ritmo irregular com ectopias';
    if (bpm > 100) return 'Taquicardia sinusal';
    if (bpm < 60) return 'Bradicardia sinusal';
    return 'Ritmo sinusal normal';
}

export const ClinicalEcgMonitor: React.FC<ClinicalEcgMonitorProps> = ({
    bpm,
    rhythm,
    heartRateVariabilityMs,
}) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const engineRef = React.useRef<EcgEngine>(createEngine(bpm, rhythm));
    const bpmRef = React.useRef(bpm);
    const rhythmRef = React.useRef(rhythm);
    const hrvRef = React.useRef(heartRateVariabilityMs);
    bpmRef.current = bpm;
    rhythmRef.current = rhythm;
    hrvRef.current = heartRateVariabilityMs;

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const engine = engineRef.current;

        while (engine.sampleCount < MAX_SAMPLES) {
            appendSample(engine, bpmRef.current, rhythmRef.current, hrvRef.current);
        }

        const resize = () => {
            const bounds = canvas.getBoundingClientRect();
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
            canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            drawMonitor(canvas, context, engine);
        };

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        let animationFrame = 0;
        let lastFrameMs = performance.now();
        let sampleAccumulator = 0;
        const animate = (nowMs: number) => {
            const deltaSeconds = clamp((nowMs - lastFrameMs) / 1000, 0, 0.1);
            lastFrameMs = nowMs;
            sampleAccumulator += deltaSeconds;
            while (sampleAccumulator >= SAMPLE_PERIOD_SECONDS) {
                appendSample(engine, bpmRef.current, rhythmRef.current, hrvRef.current);
                sampleAccumulator -= SAMPLE_PERIOD_SECONDS;
            }
            drawMonitor(canvas, context, engine);
            animationFrame = window.requestAnimationFrame(animate);
        };
        animationFrame = window.requestAnimationFrame(animate);

        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(animationFrame);
        };
    }, []);

    const intervals = calculateEcgIntervals(bpm, rhythm === 'arrhythmia');
    const description = rhythmDescription(bpm, rhythm);

    return (
        <section
            className="relative min-h-[210px] flex-1 overflow-hidden border border-app-border bg-black/30"
            aria-label={`Eletrocardiograma em derivação dois. ${description}. ${Math.round(bpm)} batimentos por minuto.`}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="Traçado contínuo com ondas P, Q, R, S e T"
            />

            <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-black/90 via-black/55 to-transparent px-3 pb-8 pt-3">
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-primary">
                        Eletrocardiograma contínuo
                    </div>
                    <div className="mt-0.5 text-[9px] text-text-secondary">
                        Derivação II sintética · morfologia P–QRS–T
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono text-2xl leading-none text-data-o2 tabular-nums">
                        {Math.round(bpm)}
                        <span className="ml-1 text-[9px] font-normal text-text-secondary">batimentos/min</span>
                    </div>
                    <div className={rhythm === 'sinus' ? 'mt-1 text-[9px] uppercase tracking-wider text-status-normal' : 'mt-1 text-[9px] uppercase tracking-wider text-status-warning'}>
                        {description}
                    </div>
                </div>
            </header>

            <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-app-border bg-black/80 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[9px] text-text-secondary">
                    <span>Velocidade 25 mm/s</span>
                    <span>Ganho 10 mm/mV</span>
                    <span>Amostragem {SAMPLE_RATE_HZ} Hz</span>
                    <span>PR {intervals.prIntervalMs.toFixed(0)} ms</span>
                    <span>QRS {intervals.qrsDurationMs.toFixed(0)} ms</span>
                    <span>QT {intervals.qtIntervalMs.toFixed(0)} ms</span>
                    <span>QTc {intervals.qtcFridericiaMs.toFixed(0)} ms</span>
                </div>
            </footer>
        </section>
    );
};
