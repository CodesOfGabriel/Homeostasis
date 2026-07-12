import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, OrbitControls, useGLTF } from '@react-three/drei';
import { Activity, HeartPulse, Minus, RotateCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { Group } from 'three';
import type { CardiovascularState } from '../../game/types';
import { GlassPanel, PanelLabel, cn } from './ui';

interface CardiacMonitorCardProps {
  bpm: number;
  rhythm: CardiovascularState['rhythm'];
  variabilityMs: number;
  bpmHistory?: number[];
}

const rhythmLabels: Record<CardiovascularState['rhythm'], string> = {
  sinus: 'Ritmo sinusal',
  arrhythmia: 'Ritmo irregular',
  fibrillation: 'Fibrilação ventricular',
};

export function CardiacMonitorCard({ bpm, rhythm, variabilityMs }: CardiacMonitorCardProps) {
  const stable = rhythm === 'sinus' && bpm >= 60 && bpm <= 100;
  return (
    <GlassPanel className="overflow-hidden p-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <PanelLabel icon={<HeartPulse className="size-4"/>}>Cardioscópio</PanelLabel>
          <p className="mt-1 text-[9px] text-muted-foreground">Modelo anatômico e derivação II sintética</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('size-1.5 rounded-full', stable ? 'bg-good shadow-[0_0_7px_var(--good)]' : 'bg-warning shadow-[0_0_7px_var(--warning)]')}/>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{rhythmLabels[rhythm]}</span>
          <strong className="font-mono text-lg font-medium tabular-nums text-foreground">{bpm.toFixed(0)}<small className="ml-1 text-[8px] font-normal text-muted-foreground">bpm</small></strong>
        </div>
      </header>

      <div className="grid min-h-[230px] grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative min-h-[190px] border-b border-white/5 bg-[radial-gradient(circle_at_50%_45%,rgba(220,102,88,.10),transparent_58%)] md:border-b-0 md:border-r">
          <Canvas camera={{ position: [0, .15, 4.7], fov: 32 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={1.1}/>
            <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff2ec"/>
            <pointLight position={[-3, 1, 3]} intensity={2.2} color="#dc6658"/>
            <Suspense fallback={<HeartFallback/>}>
              <Center>
                <HeartModel bpm={bpm}/>
              </Center>
            </Suspense>
            <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={.45}/>
          </Canvas>
          <span className="pointer-events-none absolute bottom-2 left-3 text-[8px] uppercase tracking-widest text-muted-foreground/60">human_heart.glb</span>
        </div>
        <EcgTrace bpm={bpm} rhythm={rhythm} variabilityMs={variabilityMs}/>
      </div>
    </GlassPanel>
  );
}

export function CardiacRhythmInline({ bpm, rhythm, variabilityMs, bpmHistory }: CardiacMonitorCardProps) {
  const stable = rhythm === 'sinus' && bpm >= 60 && bpm <= 100;
  return <div className="relative flex min-h-[132px] min-w-0 items-end border-b border-white/8 py-3 pr-32 sm:pr-44">
    <div className="absolute -right-4 -top-14 z-20 h-44 w-44 cursor-grab touch-none drop-shadow-[0_16px_18px_rgba(220,102,88,.38)] active:cursor-grabbing sm:-right-7 sm:-top-20 sm:h-52 sm:w-52">
      <Canvas camera={{ position: [0, .12, 4.7], fov: 32 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true }} style={{ touchAction: 'none' }}>
        <ambientLight intensity={1.1}/><directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff2ec"/><pointLight position={[-3, 1, 3]} intensity={2.2} color="#dc6658"/>
        <Suspense fallback={<HeartFallback/>}><Center><HeartModel bpm={bpm}/></Center></Suspense>
        <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={.08} rotateSpeed={.65}/>
      </Canvas>
      <span className="pointer-events-none absolute bottom-1 right-2 flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[8px] text-muted-foreground backdrop-blur-sm"><RotateCw className="size-2.5"/>Arraste para rotacionar</span>
    </div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className={cn('size-1.5 rounded-full', stable ? 'bg-good shadow-[0_0_7px_var(--good)]' : 'bg-warning shadow-[0_0_7px_var(--warning)]')}/><strong className="font-mono text-2xl font-medium tabular-nums text-foreground">{bpm.toFixed(0)}<small className="ml-1 text-[9px] font-normal text-muted-foreground">bpm</small></strong><span className="text-[9px] uppercase tracking-wider text-muted-foreground">{rhythmLabels[rhythm]}</span></div><div className="mt-1 flex items-center justify-between gap-3 text-[9px] text-muted-foreground"><span>Variabilidade da frequência cardíaca: {variabilityMs.toFixed(0)} ms</span><HeartRateTrend history={bpmHistory} current={bpm}/></div><div className="relative mt-2 h-10 overflow-hidden rounded-md border border-white/8 bg-background/10"><EcgWave bpm={bpm} rhythm={rhythm} variabilityMs={variabilityMs} compact/></div></div>
  </div>;
}

function HeartRateTrend({ history = [], current }: { history?: number[]; current: number }) {
  const previous = history[Math.max(0, history.length - 5)] ?? history[0] ?? current;
  const delta = current - previous;
  const direction = Math.abs(delta) < .4 ? 'stable' : delta > 0 ? 'up' : 'down';
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const label = direction === 'up' ? 'Aumentando' : direction === 'down' ? 'Diminuindo' : 'Estável';
  return <span className={cn('inline-flex shrink-0 items-center gap-1 font-medium', direction === 'stable' ? 'text-muted-foreground' : direction === 'up' ? 'text-warning' : 'text-primary')}><Icon className="size-3"/>{label}</span>;
}

function HeartModel({ bpm }: { bpm: number }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF('/human_heart.glb') as { scene: Group };
  useFrame(({ clock }) => {
    if (!group.current) return;
    const elapsed = clock.getElapsedTime();
    const beat = Math.pow(Math.max(0, Math.sin(elapsed * Math.PI * 2 * Math.max(.7, bpm / 60))), 7);
    group.current.scale.setScalar(1.18 + beat * .075);
    group.current.position.y = Math.sin(elapsed * .8) * .015;
  });
  return <group ref={group} rotation={[-.12, Math.PI, 0]} scale={1.18}><primitive object={scene}/></group>;
}

function HeartFallback() {
  return <mesh scale={.72}><sphereGeometry args={[1, 28, 28]}/><meshStandardMaterial color="#7a282d" roughness={.55}/></mesh>;
}

function EcgTrace({ bpm, rhythm, variabilityMs }: CardiacMonitorCardProps) {
  return (
    <section className="relative min-h-[190px] overflow-hidden bg-gradient-to-br from-background/15 via-transparent to-danger/5" aria-label={`Eletrocardiograma: ${rhythmLabels[rhythm]}, ${bpm.toFixed(0)} batimentos por minuto`}>
      <div className="ecg-grid absolute inset-0 opacity-55"/>
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-background/65 to-transparent px-4 pb-8 pt-3">
        <div><PanelLabel icon={<Activity className="size-3.5 text-danger"/>}>Eletrocardiograma</PanelLabel><p className="mt-1 text-[8px] text-muted-foreground">Derivação II · 25 mm/s · 10 mm/mV</p></div>
        <span className="font-mono text-[9px] text-muted-foreground">Variabilidade {variabilityMs.toFixed(0)} ms</span>
      </div>
      <EcgWave bpm={bpm} rhythm={rhythm} variabilityMs={variabilityMs}/>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/5 bg-background/25 px-4 py-2 text-[8px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm"><span>Ondas P–QRS–T</span><span>{rhythmLabels[rhythm]}</span></div>
    </section>
  );
}

function EcgWave({ bpm, rhythm, variabilityMs, compact = false }: CardiacMonitorCardProps & { compact?: boolean }) {
  const path = useMemo(() => createEcgPath(rhythm, variabilityMs), [rhythm, variabilityMs]);
  const strip = useRef<SVGGElement>(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let phase = 0;
    const animate = (now: number) => {
      const delta = Math.min(.08, Math.max(0, (now - last) / 1000));
      last = now;
      // Cinco ciclos por faixa: a velocidade acompanha a FC sem reposicionar o traçado.
      const pixelsPerSecond = Math.max(70, bpmRef.current * 800 / (5 * 60));
      phase -= pixelsPerSecond * delta;
      if (phase <= -800) phase += 800;
      strip.current?.setAttribute('transform', `translate(${phase.toFixed(2)} 0)`);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <svg viewBox="0 0 800 210" preserveAspectRatio="none" className={cn('absolute inset-0 h-full w-full', compact && 'opacity-90')} role="img" aria-label="Traçado P QRS T contínuo">
    <path d="M0 126 H800" fill="none" stroke="#dc6658" strokeOpacity={compact ? '.14' : '.1'}/>
    <g ref={strip}>
      <path d={path} fill="none" stroke="#dc6658" strokeOpacity={compact ? '.12' : '.18'} strokeWidth={compact ? '5' : '7'} vectorEffect="non-scaling-stroke"/>
      <path d={path} fill="none" stroke="#ff6b61" strokeWidth={compact ? '1.3' : '1.7'} vectorEffect="non-scaling-stroke"/>
      <path d={path} transform="translate(800 0)" fill="none" stroke="#dc6658" strokeOpacity={compact ? '.12' : '.18'} strokeWidth={compact ? '5' : '7'} vectorEffect="non-scaling-stroke"/>
      <path d={path} transform="translate(800 0)" fill="none" stroke="#ff6b61" strokeWidth={compact ? '1.3' : '1.7'} vectorEffect="non-scaling-stroke"/>
    </g>
  </svg>;
}

function createEcgPath(rhythm: CardiovascularState['rhythm'], variabilityMs: number) {
  const baseline = 126;
  if (rhythm === 'fibrillation') {
    const points = Array.from({ length: 161 }, (_, index) => {
      const x = index * 5;
      const y = baseline + Math.sin(index * .76) * 10 + Math.sin(index * 1.93) * 6 + Math.sin(index * .19) * 4;
      return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return points.join(' ');
  }
  const beats = 5;
  const width = 800 / beats;
  const irregularity = rhythm === 'arrhythmia' ? Math.min(18, variabilityMs * .12) : 0;
  const segments: string[] = [`M0 ${baseline}`];
  for (let beat = 0; beat < beats; beat += 1) {
    const start = beat * width + (beat % 2 ? irregularity : -irregularity) * .3;
    const scale = rhythm === 'arrhythmia' && beat === 2 ? 1.22 : 1;
    segments.push(
      `L${start + 18} ${baseline}`,
      `C${start + 25} ${baseline} ${start + 29} ${baseline - 11} ${start + 36} ${baseline - 11}`,
      `C${start + 43} ${baseline - 11} ${start + 47} ${baseline} ${start + 55} ${baseline}`,
      `L${start + 68} ${baseline}`,
      `L${start + 74} ${baseline + 8 * scale}`,
      `L${start + 82} ${baseline - 72 * scale}`,
      `L${start + 91} ${baseline + 25 * scale}`,
      `L${start + 101} ${baseline}`,
      `C${start + 112} ${baseline} ${start + 117} ${baseline - 21} ${start + 129} ${baseline - 21}`,
      `C${start + 141} ${baseline - 21} ${start + 146} ${baseline} ${start + 158} ${baseline}`,
    );
  }
  return segments.join(' ');
}
