import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrthographicCamera } from '@react-three/drei';
import {
  CatmullRomCurve3,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  Vector3,
} from 'three';
import type { SubstrateKind, SubstratePool } from '../../game/cellularTypes';
import { advanceFlowProgress, calculateFlowParticleCount, MAX_FLOW_PARTICLES } from './flowAnimation';

export type FlowSubstrateStatus = 'available' | 'capturable' | 'cooldown' | 'limited' | 'excess' | 'toxic' | 'blocked' | 'selected';

export interface FlowChipDatum {
  label: string;
  value: string;
  unit: string;
  status: FlowSubstrateStatus;
  statusLabel: string;
  direction: 'in' | 'out';
}

interface CellularFlowSceneProps {
  available: SubstratePool;
  captured: SubstratePool;
  wasteLoad: number;
  oxidativeStress: number;
  membranePotentialMv: number;
  lastCaptured: SubstrateKind | null;
  captureChain: number;
  chips: Record<SubstrateKind, FlowChipDatum>;
  selectedKind: SubstrateKind;
  onSelect: (kind: SubstrateKind) => void;
}

const flowMeta: Record<SubstrateKind, { color: string }> = {
  glucose: { color: '#55be83' },
  oxygen: { color: '#58bdd0' },
  fattyAcid: { color: '#e2a54f' },
  aminoAcid: { color: '#d9b45f' },
};

const BACKGROUND_WIDTH = 1672;
const BACKGROUND_HEIGHT = 941;
const BACKGROUND_ASPECT = BACKGROUND_WIDTH / BACKGROUND_HEIGHT;

type ImagePoint = [x: number, y: number];

function imagePoint([x, y]: ImagePoint, z = .1) {
  return new Vector3(
    (x / BACKGROUND_WIDTH - .5) * BACKGROUND_ASPECT * 2,
    (.5 - y / BACKGROUND_HEIGHT) * 2,
    z,
  );
}

// Âncoras medidas diretamente em cell-background.png (1672 × 941):
// lúmen vascular → parede endotelial direita → LEC → membrana celular → LIC.
const flowPathPixels: Record<SubstrateKind, ImagePoint[]> = {
  glucose: [[342, 270], [445, 302], [560, 330], [635, 350], [748, 390]],
  oxygen: [[310, 420], [418, 435], [525, 450], [578, 465], [700, 482]],
  fattyAcid: [[270, 565], [400, 550], [520, 560], [600, 580], [718, 605]],
  aminoAcid: [[260, 720], [440, 690], [550, 675], [660, 680], [785, 680]],
};

const flowCurves = Object.fromEntries((Object.keys(flowPathPixels) as SubstrateKind[]).map(kind => [
  kind,
  new CatmullRomCurve3(flowPathPixels[kind].map(point => imagePoint(point))),
])) as Record<SubstrateKind, CatmullRomCurve3>;

const flowChipPixels: Record<SubstrateKind, ImagePoint> = {
  glucose: [560, 330],
  oxygen: [525, 450],
  fattyAcid: [520, 560],
  aminoAcid: [550, 675],
};

const receptorMeta: Record<SubstrateKind, { label: string; position: ImagePoint }> = {
  glucose: { label: 'GLUT4', position: [635, 350] },
  oxygen: { label: 'Difusão de O₂', position: [578, 465] },
  fattyAcid: { label: 'CD36 / FATP', position: [600, 580] },
  aminoAcid: { label: 'LAT1', position: [660, 680] },
};

export function CellularFlowScene(props: CellularFlowSceneProps) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[48%] z-0 overflow-hidden"
      style={{ width: 'max(100vw, 177.683vh)', height: 'max(100vh, 56.280vw)', transform: 'translate(-50%, -48%)' }}
      aria-label="Fluxos moleculares integrados ao fundo anatômico"
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Visualização 3D indisponível</div>}
      >
        <OrthographicCamera makeDefault manual position={[0, 0, 10]} left={-BACKGROUND_ASPECT} right={BACKGROUND_ASPECT} top={1} bottom={-1} near={.1} far={100}/>
        <ambientLight intensity={1.8}/>
        <FlowWorld {...props}/>
      </Canvas>
      <div className="absolute inset-0 z-10" aria-label="Substratos nos fluxos">
        {(Object.keys(props.chips) as SubstrateKind[]).map(kind => {
          const chip = props.chips[kind];
          const [x, y] = flowChipPixels[kind];
          const selected = props.selectedKind === kind;
          return <button
            type="button"
            key={kind}
            className="flow-chip pointer-events-auto"
            data-state={selected ? 'selected' : chip.status}
            aria-pressed={selected}
            aria-label={`${chip.label}: ${chip.value} ${chip.unit}. Estado: ${chip.statusLabel}`}
            title={`${chip.label} · ${chip.value} ${chip.unit} · ${chip.statusLabel}`}
            onClick={() => props.onSelect(kind)}
            style={{ left: `${x / BACKGROUND_WIDTH * 100}%`, top: `${y / BACKGROUND_HEIGHT * 100}%`, '--flow-color': flowMeta[kind].color } as React.CSSProperties}
          >
            <span className="flow-chip-orb" aria-hidden="true"/>
            <span className="min-w-0"><strong>{chip.label}</strong><small>{chip.value} {chip.unit}</small></span>
            <span className="flow-chip-direction" aria-hidden="true">{chip.direction === 'in' ? '→' : '←'}</span>
          </button>;
        })}
        {(Object.keys(receptorMeta) as SubstrateKind[]).map(kind => {
          const receptor = receptorMeta[kind];
          const [x, y] = receptor.position;
          return <span
            key={`receptor-${kind}`}
            className="flow-receptor pointer-events-auto"
            tabIndex={0}
            aria-label={`Receptor do fluxo de ${props.chips[kind].label}: ${receptor.label}`}
            style={{ left: `${x / BACKGROUND_WIDTH * 100}%`, top: `${y / BACKGROUND_HEIGHT * 100}%`, '--flow-color': flowMeta[kind].color } as React.CSSProperties}
          >
            <span className="flow-receptor-label">{receptor.label}</span>
          </span>;
        })}
      </div>
    </div>
  );
}

function FlowWorld({ available, captured, wasteLoad, oxidativeStress, membranePotentialMv, lastCaptured, captureChain }: CellularFlowSceneProps) {
  return (
    <group>
      {(Object.keys(flowMeta) as SubstrateKind[]).map((kind, index) => {
        const meta = flowMeta[kind];
        // O pool capturado representa moléculas efetivamente colocadas no fluxo.
        // A oferta extracelular só mantém uma pequena densidade basal na entrada.
        const count = calculateFlowParticleCount(available[kind], captured[kind]);
        return <FlowChannel key={kind} kind={kind} curve={flowCurves[kind]} color={meta.color} count={count} speed={.07 + index * .008 + Math.min(4, captureChain) * .006} emphasized={lastCaptured === kind}/>;
      })}
      <ToxinFlow wasteLoad={wasteLoad} oxidativeStress={oxidativeStress}/>
      <MembraneGate position={imagePoint([635, 350], .2).toArray()} color="#55be83" active={lastCaptured === 'glucose'} membranePotentialMv={membranePotentialMv}/>
      <MembraneGate position={imagePoint([578, 465], .2).toArray()} color="#58bdd0" active={lastCaptured === 'oxygen'} membranePotentialMv={membranePotentialMv}/>
      <MembraneGate position={imagePoint([600, 580], .2).toArray()} color="#e2a54f" active={lastCaptured === 'fattyAcid'} membranePotentialMv={membranePotentialMv}/>
      <MembraneGate position={imagePoint([660, 680], .2).toArray()} color="#d9b45f" active={lastCaptured === 'aminoAcid'} membranePotentialMv={membranePotentialMv}/>
    </group>
  );
}

function MembraneGate({ position, color, active, membranePotentialMv }: { position: [number, number, number]; color: string; active: boolean; membranePotentialMv: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const voltageGlow = Math.max(0, Math.min(1, (Math.abs(membranePotentialMv) - 45) / 45));
    const scale = active ? 1.08 + Math.sin(clock.elapsedTime * 8) * .08 : .9 + voltageGlow * .1;
    ref.current.scale.setScalar(scale);
    ref.current.rotation.z = Math.sin(clock.elapsedTime * .8) * .08;
  });
  return <group ref={ref} position={position}><mesh><torusGeometry args={[.045, .012, 10, 24]}/><meshBasicMaterial color={color} transparent opacity={active ? 1 : .62}/></mesh><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.013, .013, .075, 12]}/><meshBasicMaterial color="#e9fbff" transparent opacity={active ? .9 : .5}/></mesh></group>;
}

function FlowChannel({ kind, curve, color, count, speed, emphasized }: { kind: SubstrateKind; curve: CatmullRomCurve3; color: string; count: number; speed: number; emphasized: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const initialCount = Math.min(count, MAX_FLOW_PARTICLES);
  const activeCount = useRef(initialCount);
  const spawnAccumulator = useRef(0);
  const particleProgress = useRef(Array.from(
    { length: MAX_FLOW_PARTICLES },
    (_, index) => index < initialCount ? index / initialCount : 0,
  ));
  const geometry = useMemo(() => {
    if (kind === 'glucose') return new IcosahedronGeometry(.04, 0);
    if (kind === 'oxygen') return new SphereGeometry(.032, 10, 8);
    if (kind === 'fattyAcid') return new OctahedronGeometry(.045, 0);
    return new TetrahedronGeometry(.045, 0);
  }, [kind]);
  const material = useMemo(() => new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: .94 }), [color]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  const points = useMemo(() => curve.getPoints(48), [curve]);

  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;

    const targetCount = Math.min(count, MAX_FLOW_PARTICLES);
    if (targetCount < activeCount.current) {
      activeCount.current = targetCount;
      spawnAccumulator.current = 0;
    } else if (targetCount > activeCount.current) {
      spawnAccumulator.current += delta;
      while (spawnAccumulator.current >= .11 && activeCount.current < targetCount) {
        particleProgress.current[activeCount.current] = 0;
        activeCount.current += 1;
        spawnAccumulator.current -= .11;
      }
    }

    mesh.current.count = activeCount.current;
    for (let index = 0; index < activeCount.current; index += 1) {
      // Integra o deslocamento frame a frame. Alterar a velocidade não muda a
      // fase das partículas que já estavam viajando.
      particleProgress.current[index] = advanceFlowProgress(particleProgress.current[index], speed, delta);
      const t = particleProgress.current[index];
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      dummy.position.copy(point);
      dummy.position.z += Math.sin(index * 2.13 + clock.elapsedTime * 2) * .07;
      dummy.rotation.set(tangent.y * .4, tangent.x * .4, clock.elapsedTime * .8 + index);
      const pulse = (emphasized ? 1.28 : 1) * (.86 + Math.sin(clock.elapsedTime * 3 + index) * .12);
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <group><Line points={points} color={color} transparent opacity={emphasized ? .42 : .18} lineWidth={emphasized ? 1.4 : .65} dashed dashScale={6} dashSize={.18} gapSize={.28}/><instancedMesh ref={mesh} args={[geometry, material, MAX_FLOW_PARTICLES]}/></group>;
}

function ToxinFlow({ wasteLoad, oxidativeStress }: { wasteLoad: number; oxidativeStress: number }) {
  const curve = useMemo(() => new CatmullRomCurve3([
    imagePoint([725, 620], .16),
    imagePoint([640, 645], .14),
    imagePoint([545, 650], .12),
    imagePoint([445, 640], .1),
    imagePoint([330, 615], .08),
  ]), []);
  const count = Math.max(2, Math.min(12, Math.round(2 + wasteLoad * .06 + oxidativeStress * .05)));
  return <FlowChannel kind="fattyAcid" curve={curve} color="#dc6658" count={count} speed={.045 + oxidativeStress * .0007} emphasized={oxidativeStress > 35}/>;
}
