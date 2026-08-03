import { useEffect, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  CatmullRomCurve3,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from 'three';
import type { SubstrateKind } from '../../game/cellularTypes';
import {
  advanceBrownianOffset,
  advanceFlowProgress,
  BROWNIAN_VISUAL_STEP_SECONDS,
  calculateDiffusionVisibility,
  gaussianPair,
  interpolateBrownianOffset,
  MEMBRANE_MODEL_SCALE,
  MOLECULE_RENDER_SCALE,
} from './flowAnimation';

export type VisualMoleculeKind = SubstrateKind | 'carbonDioxide' | 'lactate' | 'waste';

interface AtomDefinition {
  position: [number, number, number];
  color: string;
  radius: number;
}

const carbon = '#718f96';
const hydrogen = '#d8edf0';
const oxygen = '#ef756a';
const nitrogen = '#668cff';

const atomModels: Record<VisualMoleculeKind, AtomDefinition[]> = {
  glucose: [
    ...Array.from({ length: 6 }, (_, index) => {
      const angle = index * Math.PI / 3;
      return { position: [Math.cos(angle) * .045, Math.sin(angle) * .045, 0] as [number, number, number], color: index === 0 ? oxygen : '#55be83', radius: .016 };
    }),
    { position: [.078, .042, .008], color: oxygen, radius: .013 },
    { position: [-.078, -.035, -.006], color: oxygen, radius: .013 },
    { position: [0, .085, .004], color: hydrogen, radius: .009 },
  ],
  oxygen: [
    { position: [-.021, 0, 0], color: '#72d9ed', radius: .022 },
    { position: [.021, 0, 0], color: '#58bdd0', radius: .022 },
  ],
  fattyAcid: [
    ...Array.from({ length: 7 }, (_, index) => ({
      position: [index * .022 - .066, (index % 2 ? .012 : -.012), 0] as [number, number, number],
      color: index < 2 ? oxygen : '#e2a54f',
      radius: index < 2 ? .013 : .015,
    })),
    { position: [-.082, .018, 0], color: hydrogen, radius: .009 },
  ],
  aminoAcid: [
    { position: [0, 0, 0], color: '#d9b45f', radius: .019 },
    { position: [-.042, .015, 0], color: nitrogen, radius: .018 },
    { position: [.044, .025, 0], color: oxygen, radius: .017 },
    { position: [.05, -.022, 0], color: oxygen, radius: .015 },
    { position: [-.006, -.045, .008], color: hydrogen, radius: .012 },
  ],
  carbonDioxide: [
    { position: [0, 0, 0], color: carbon, radius: .016 },
    { position: [-.034, 0, 0], color: oxygen, radius: .019 },
    { position: [.034, 0, 0], color: oxygen, radius: .019 },
  ],
  lactate: [
    { position: [-.035, 0, 0], color: carbon, radius: .016 },
    { position: [0, .012, 0], color: '#b16ed1', radius: .018 },
    { position: [.038, .025, 0], color: oxygen, radius: .016 },
    { position: [.04, -.02, 0], color: oxygen, radius: .014 },
  ],
  waste: [
    { position: [0, 0, 0], color: '#dc6658', radius: .024 },
    { position: [.028, .018, 0], color: '#b16ed1', radius: .014 },
    { position: [-.026, -.018, 0], color: '#9e504a', radius: .013 },
  ],
};

// Stokes-Einstein em leitura qualitativa: moléculas menores exploram o LEC
// mais depressa; as maiores preservam deslocamentos mais curtos.
const visualDiffusionCoefficients: Record<VisualMoleculeKind, number> = {
  oxygen: .00095,
  carbonDioxide: .00086,
  glucose: .00046,
  aminoAcid: .00039,
  lactate: .00052,
  fattyAcid: .00028,
  waste: .00024,
};

interface BrownianVisualState {
  from: { y: number; z: number };
  to: { y: number; z: number };
  elapsed: number;
  initialized: boolean;
}

function restingBrownianState(): BrownianVisualState {
  return {
    from: { y: 0, z: 0 },
    to: { y: 0, z: 0 },
    elapsed: 0,
    initialized: false,
  };
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

interface MolecularFlowProps {
  kind: VisualMoleculeKind;
  curve: CatmullRomCurve3;
  count: number;
  maxParticles: number;
  speed: number;
  running: boolean;
  reducedMotion: boolean;
  fadeStart?: number;
  brownian?: boolean;
  emphasized?: boolean;
  burstKey?: number;
  pathColor: string;
  pathOpacity?: number;
  moleculeScale?: number;
}

/**
 * Um conjunto instanciado por átomo: preserva o desenho molecular detalhado
 * sem multiplicar centenas de draw calls quando vários fluxos estão ativos.
 */
export function MolecularFlow({
  kind,
  curve,
  count,
  maxParticles,
  speed,
  running,
  reducedMotion,
  fadeStart = .72,
  brownian = false,
  emphasized = false,
  burstKey = 0,
  pathColor,
  pathOpacity = .08,
  moleculeScale = 1,
}: MolecularFlowProps) {
  const atoms = atomModels[kind];
  const initialCount = Math.min(count, maxParticles);
  const meshes = useRef<Array<InstancedMesh | null>>([]);
  const activeCount = useRef(initialCount);
  const spawnAccumulator = useRef(0);
  const lastBurst = useRef(burstKey);
  const burstRemaining = useRef(0);
  const brownianStates = useRef(Array.from({ length: maxParticles }, restingBrownianState));
  const brownianRandom = useMemo(() => {
    const kindSeed = [...kind].reduce((seed, character) => seed * 31 + character.charCodeAt(0), 17);
    return Array.from({ length: maxParticles }, (_, index) => createSeededRandom(kindSeed + index * 7919));
  }, [kind, maxParticles]);
  const progress = useRef(Array.from(
    { length: maxParticles },
    (_, index) => index < initialCount ? index / Math.max(1, initialCount) : 0,
  ));
  const root = useMemo(() => new Object3D(), []);
  const atom = useMemo(() => new Object3D(), []);
  const composed = useMemo(() => new Matrix4(), []);
  const geometry = useMemo(() => new SphereGeometry(1, 9, 7), []);
  const materials = useMemo(() => atoms.map(definition => new MeshBasicMaterial({
    color: new Color(definition.color),
    transparent: true,
    opacity: kind === 'waste' ? .78 : .96,
    depthWrite: false,
  })), [atoms, kind]);
  const points = useMemo(() => curve.getPoints(42), [curve]);

  useEffect(() => () => {
    geometry.dispose();
    materials.forEach(material => material.dispose());
  }, [geometry, materials]);

  useEffect(() => {
    if (lastBurst.current === burstKey) return;
    lastBurst.current = burstKey;
    // Zerar a chave apenas desativa a rota anterior quando outro substrato é
    // captado; não deve produzir um falso pulso nessa rota.
    if (burstKey <= 0) return;
    burstRemaining.current = 1.45;
    const burstTarget = Math.min(maxParticles, Math.max(activeCount.current, count + 3));
    for (let index = activeCount.current; index < burstTarget; index += 1) progress.current[index] = index * .035;
    activeCount.current = burstTarget;
  }, [burstKey, count, maxParticles]);

  useFrame((_, delta) => {
    const burstActive = burstRemaining.current > 0;
    if (burstActive) burstRemaining.current = Math.max(0, burstRemaining.current - delta);
    const target = Math.min(maxParticles, count + (burstActive ? 3 : 0));
    if (target < activeCount.current && !burstActive) activeCount.current = target;
    if (target > activeCount.current) {
      spawnAccumulator.current += delta;
      while (spawnAccumulator.current >= .1 && activeCount.current < target) {
        progress.current[activeCount.current] = 0;
        activeCount.current += 1;
        spawnAccumulator.current -= .1;
      }
    }

    const effectiveDelta = reducedMotion ? 0 : (running || burstActive ? delta : 0);
    const activeSpeed = speed * (burstActive ? 2.35 : 1);
    const visibleCount = activeCount.current;
    meshes.current.forEach(mesh => { if (mesh) mesh.count = visibleCount; });

    for (let particleIndex = 0; particleIndex < visibleCount; particleIndex += 1) {
      const previousProgress = progress.current[particleIndex];
      progress.current[particleIndex] = advanceFlowProgress(progress.current[particleIndex], activeSpeed, effectiveDelta);
      const t = progress.current[particleIndex];
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      if (brownian) {
        if (t < previousProgress) brownianStates.current[particleIndex] = restingBrownianState();
        const diffusionRamp = Math.max(0, Math.min(1, (t - .28) / .3));
        const state = brownianStates.current[particleIndex];
        if (diffusionRamp > 0 && effectiveDelta > 0) {
          const random = brownianRandom[particleIndex];
          if (!state.initialized) {
            const [gaussianY, gaussianZ] = gaussianPair(random(), random());
            state.to = advanceBrownianOffset(
              state.from,
              visualDiffusionCoefficients[kind] * diffusionRamp,
              BROWNIAN_VISUAL_STEP_SECONDS,
              gaussianY,
              gaussianZ,
              .055,
            );
            state.initialized = true;
          }
          state.elapsed += effectiveDelta;
          while (state.elapsed >= BROWNIAN_VISUAL_STEP_SECONDS) {
            state.elapsed -= BROWNIAN_VISUAL_STEP_SECONDS;
            state.from = state.to;
            const [gaussianY, gaussianZ] = gaussianPair(random(), random());
            state.to = advanceBrownianOffset(
              state.to,
              visualDiffusionCoefficients[kind] * diffusionRamp,
              BROWNIAN_VISUAL_STEP_SECONDS,
              gaussianY,
              gaussianZ,
              .055,
            );
          }
        }
        if (diffusionRamp > 0 && state.initialized) {
          const offset = interpolateBrownianOffset(
            state.from,
            state.to,
            state.elapsed / BROWNIAN_VISUAL_STEP_SECONDS,
          );
          point.y += offset.y * diffusionRamp;
          point.z += offset.z * diffusionRamp;
        }
      }

      const visibility = calculateDiffusionVisibility(t, fadeStart);
      root.position.copy(point);
      root.rotation.set(tangent.y * .35, tangent.x * .3, Math.atan2(tangent.y, tangent.x) + particleIndex * .18);
      root.scale.setScalar(Math.max(.025, visibility) * moleculeScale * MOLECULE_RENDER_SCALE);
      root.updateMatrix();

      atoms.forEach((definition, atomIndex) => {
        const mesh = meshes.current[atomIndex];
        if (!mesh) return;
        atom.position.set(...definition.position);
        atom.scale.setScalar(definition.radius);
        atom.updateMatrix();
        composed.multiplyMatrices(root.matrix, atom.matrix);
        mesh.setMatrixAt(particleIndex, composed);
      });
    }
    meshes.current.forEach(mesh => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return <group>
    {pathOpacity > 0 && <Line points={points} color={pathColor} transparent opacity={emphasized ? pathOpacity * 2.2 : pathOpacity} lineWidth={emphasized ? 1.1 : .55} dashed dashScale={8} dashSize={.1} gapSize={.24}/>} 
    {atoms.map((_, index) => <instancedMesh
      key={`${kind}-${index}`}
      ref={node => { meshes.current[index] = node; }}
      args={[geometry, materials[index], maxParticles]}
      frustumCulled={false}
    />)}
  </group>;
}

interface TransporterProps {
  kind: SubstrateKind;
  position: [number, number, number];
  rotation?: number;
  active: boolean;
}

export function DetailedMembraneTransporter({ kind, position, rotation = 0, active }: TransporterProps) {
  return <group position={position} rotation={[0, 0, rotation]} scale={MEMBRANE_MODEL_SCALE}>
    <BilayerPatch excludeCore={kind !== 'oxygen'}/>
    <group scale={[1, .78, .78]}>
      {kind === 'glucose' && <Glut4Carrier active={active}/>} 
      {kind === 'oxygen' && <SimpleDiffusionWindow active={active}/>} 
      {kind === 'fattyAcid' && <Cd36FatpCarrier active={active}/>} 
      {kind === 'aminoAcid' && <Lat1Antiporter active={active}/>} 
    </group>
  </group>;
}

function BilayerPatch({ excludeCore = false }: { excludeCore?: boolean }) {
  const rows = Array.from({ length: 7 }, (_, index) => (index - 3) * .03);
  return <group>
    {([-1, 1] as const).map(leaflet => rows.map((y, index) => {
      if (excludeCore && Math.abs(y) < .052) return null;
      const headX = leaflet * .09;
      const inward = -leaflet;
      const headColor = leaflet < 0 ? '#79bfd0' : index % 3 === 0 ? '#d48882' : '#d9b45f';
      return <group key={`${leaflet}-${index}`} position={[0, y, 0]}>
        <mesh position={[headX, 0, 0]}><sphereGeometry args={[.0085, 10, 8]}/><meshBasicMaterial color={headColor}/></mesh>
        <mesh position={[headX + inward * .018, 0, 0]}><sphereGeometry args={[.0048, 8, 6]}/><meshBasicMaterial color="#9fb7a6"/></mesh>
        <mesh position={[headX + inward * .052, -.004, .006]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.0021, .0021, .067, 6]}/><meshBasicMaterial color="#536d66"/></mesh>
        <group position={[headX + inward * .044, .005, -.006]} rotation={[0, 0, inward * .12]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.0021, .0021, .045, 6]}/><meshBasicMaterial color="#60796e"/></mesh>
          <mesh position={[inward * .032, inward * .006, 0]} rotation={[0, 0, Math.PI / 2 + inward * .34]}><cylinderGeometry args={[.0021, .0021, .031, 6]}/><meshBasicMaterial color="#60796e"/></mesh>
        </group>
      </group>;
    }))}
    {[-.03, .025].map((x, index) => <group key={`cholesterol-${x}`} position={[x, index === 0 ? -.072 : .072, .012]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[.0045, .044, 4, 6]}/><meshBasicMaterial color="#bc8a4d"/></mesh>
      <mesh position={[x < 0 ? -.027 : .027, 0, 0]}><sphereGeometry args={[.0055, 7, 5]}/><meshBasicMaterial color="#e4c878"/></mesh>
    </group>)}
  </group>;
}

function Glut4Carrier({ active }: { active: boolean }) {
  const helices = Array.from({ length: 12 }, (_, index) => {
    const bundle = index < 6 ? -1 : 1;
    const angle = index % 6 * Math.PI / 3;
    return {
      position: [0, bundle * .024 + Math.cos(angle) * .044, Math.sin(angle) * .04] as [number, number, number],
      tilt: (index % 3 - 1) * .09,
      color: bundle < 0 ? '#55be83' : '#72d09b',
    };
  });
  return <group>
    {helices.map((helix, index) => <mesh key={index} position={helix.position} rotation={[0, 0, Math.PI / 2 + helix.tilt]}>
      <capsuleGeometry args={[.0064, .166, 5, 8]}/><meshBasicMaterial color={active ? '#64d493' : helix.color}/>
    </mesh>)}
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.014, .02, .18, 12, 1, true]}/><meshBasicMaterial color="#cbffe0" transparent opacity={active ? .28 : .12} side={2}/></mesh>
    <mesh position={[.118, 0, 0]} rotation={[0, 0, .08]}><capsuleGeometry args={[.006, .086, 5, 8]}/><meshBasicMaterial color="#439b72"/></mesh>
    <GlycanBranch position={[-.112, .047, .018]} color="#a9e4c0"/>
    <group position={[active ? .008 : -.018, 0, 0]}>
      {Array.from({ length: 6 }, (_, index) => <mesh key={index} position={[0, Math.cos(index * Math.PI / 3) * .018, Math.sin(index * Math.PI / 3) * .018]}><sphereGeometry args={[.0055, 7, 5]}/><meshBasicMaterial color="#d9fff0" transparent opacity={active ? .9 : .45}/></mesh>)}
    </group>
  </group>;
}

function SimpleDiffusionWindow({ active }: { active: boolean }) {
  return <group>
    {[-.125, -.045, .035, .115].map((x, index) => <group key={x} position={[x, index % 2 ? .004 : -.005, .012 * Math.sin(index)]}>
      <mesh position={[-.008, 0, 0]}><sphereGeometry args={[.0085, 9, 7]}/><meshBasicMaterial color={active ? '#8de8f6' : '#72d9ed'}/></mesh>
      <mesh position={[.008, 0, 0]}><sphereGeometry args={[.0085, 9, 7]}/><meshBasicMaterial color={active ? '#70d5e6' : '#58bdd0'}/></mesh>
    </group>)}
  </group>;
}

function Cd36FatpCarrier({ active }: { active: boolean }) {
  return <group>
    {[-.06, .06].map(y => <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[.0075, .168, 5, 8]}/><meshBasicMaterial color={active ? '#edb154' : '#d99c43'}/></mesh>)}
    <mesh position={[-.14, 0, 0]} scale={[.04, .09, .045]}><sphereGeometry args={[1, 18, 14]}/><meshBasicMaterial color={active ? '#d08b42' : '#b97838'}/></mesh>
    <mesh position={[-.145, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.009, .014, .17, 10, 1, true]}/><meshBasicMaterial color="#ffe0a0" transparent opacity={active ? .38 : .18} side={2}/></mesh>
    {[-.075, -.05, -.025, 0, .03, .055, .078].map((y, index) => <GlycanBranch key={y} position={[-.205 - Math.abs(y) * .2, y, (index % 2 ? 1 : -1) * .024]} color="#efc477"/>)}
    {Array.from({ length: 6 }, (_, index) => <mesh key={index} position={[-.18 + index * .022, index % 2 ? .004 : -.004, 0]}><sphereGeometry args={[.0055, 7, 5]}/><meshBasicMaterial color="#ffe29a" transparent opacity={active ? .9 : .58}/></mesh>)}
  </group>;
}

function Lat1Antiporter({ active }: { active: boolean }) {
  const helices = Array.from({ length: 12 }, (_, index) => {
    const angle = index * Math.PI * 2 / 12;
    return { y: Math.cos(angle) * .052, z: Math.sin(angle) * .04, tilt: (index % 4 - 1.5) * .045 };
  });
  return <group>
    {helices.map((helix, index) => <mesh key={index} position={[0, helix.y, helix.z]} rotation={[0, 0, Math.PI / 2 + helix.tilt]}><capsuleGeometry args={[.0062, .168, 5, 8]}/><meshBasicMaterial color={active ? (index % 2 ? '#efd075' : '#d9b45f') : (index % 2 ? '#d9b45f' : '#c39d4f')}/></mesh>)}
    <mesh position={[0, .094, .008]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[.0078, .17, 5, 8]}/><meshBasicMaterial color="#668cff"/></mesh>
    <mesh position={[-.14, .108, .008]} scale={[.045, .06, .04]}><sphereGeometry args={[1, 16, 12]}/><meshBasicMaterial color="#607dd0"/></mesh>
    <mesh position={[-.095, .077, .006]} rotation={[0, 0, -.72]}><cylinderGeometry args={[.003, .003, .065, 6]}/><meshBasicMaterial color="#f1dc82"/></mesh>
    <GlycanBranch position={[-.19, .135, .012]} color="#9db8ff"/>
    <mesh position={[-.055, -.012, 0]}><tetrahedronGeometry args={[.014, 0]}/><meshBasicMaterial color="#ffe198"/></mesh>
    <mesh position={[.055, .012, 0]} rotation={[0, 0, Math.PI]}><tetrahedronGeometry args={[.014, 0]}/><meshBasicMaterial color="#b591ef" transparent opacity={.82}/></mesh>
  </group>;
}

function GlycanBranch({ position, color }: { position: [number, number, number]; color: string }) {
  return <group position={position}>
    <mesh><sphereGeometry args={[.006, 7, 5]}/><meshBasicMaterial color={color}/></mesh>
    <mesh position={[-.012, .008, 0]}><sphereGeometry args={[.005, 7, 5]}/><meshBasicMaterial color={color}/></mesh>
    <mesh position={[-.012, -.008, 0]}><sphereGeometry args={[.005, 7, 5]}/><meshBasicMaterial color={color}/></mesh>
  </group>;
}

export function IonChannelModel({ position, membranePotentialMv, running }: { position: [number, number, number]; membranePotentialMv: number; running: boolean }) {
  const ions = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ions.current || !running) return;
    ions.current.children.forEach((child, index) => {
      const phase = (clock.elapsedTime * (.35 + Math.abs(membranePotentialMv) * .004) + index * .34) % 1;
      child.position.x = -.12 + phase * .24;
      child.position.y = (index % 2 ? 1 : -1) * .004;
      child.position.z = (index - 1) * .007;
    });
  });
  return <group position={position} scale={MEMBRANE_MODEL_SCALE}>
    <BilayerPatch excludeCore/>
    <group scale={[1, .82, .82]}>
      {Array.from({ length: 4 }, (_, index) => {
        const angle = index * Math.PI / 2;
        return <group key={index}>
          <mesh position={[0, Math.cos(angle) * .034, Math.sin(angle) * .034]} rotation={[0, 0, Math.PI / 2 + (index % 2 ? .05 : -.05)]}><capsuleGeometry args={[.0075, .17, 5, 8]}/><meshBasicMaterial color={index % 2 ? '#63b9c8' : '#78d1dc'}/></mesh>
          <mesh position={[0, Math.cos(angle) * .078, Math.sin(angle) * .078]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[.0065, .165, 5, 8]}/><meshBasicMaterial color="#477f9b"/></mesh>
          <mesh position={[.125, Math.cos(angle) * .042, Math.sin(angle) * .042]}><sphereGeometry args={[.018, 10, 8]}/><meshBasicMaterial color="#416d83"/></mesh>
        </group>;
      })}
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.012, .019, .19, 12, 1, true]}/><meshBasicMaterial color="#d6fbff" transparent opacity={.38} side={2}/></mesh>
      {[-.055, -.038, -.021, -.004].map(x => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.012, .0025, 6, 16]}/><meshBasicMaterial color="#e5fbff"/></mesh>)}
      <group ref={ions}>{['#b896ff', '#b896ff', '#b896ff'].map((color, index) => <mesh key={index}><sphereGeometry args={[.009, 9, 7]}/><meshBasicMaterial color={color}/></mesh>)}</group>
    </group>
  </group>;
}

export function EndocyticVesicle({ position, running, active }: { position: [number, number, number]; running: boolean; active: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = running ? (clock.elapsedTime * .16) % 1 : .62;
    const inward = phase < .32 ? 0 : Math.sin(Math.min(1, (phase - .32) / .68) * Math.PI / 2);
    ref.current.position.x = position[0] + inward * .16;
    ref.current.position.y = position[1] + Math.sin(phase * Math.PI * 2) * .018;
    ref.current.scale.setScalar((.72 + Math.sin(phase * Math.PI) * .28) * (active ? 1.08 : .84));
  });
  return <group>
    <group ref={ref} position={position}>
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.046, .008, 9, 28]}/><meshBasicMaterial color="#e2a54f" transparent opacity={active ? .82 : .4}/></mesh>
      <mesh><icosahedronGeometry args={[.026, 1]}/><meshBasicMaterial color="#ffd98a" transparent opacity={.9}/></mesh>
      {Array.from({ length: 6 }, (_, index) => <mesh key={index} position={[0, Math.cos(index * Math.PI / 3) * .062, Math.sin(index * Math.PI / 3) * .062]}><coneGeometry args={[.007, .019, 5]}/><meshBasicMaterial color="#9d7b3c" transparent opacity={.58}/></mesh>)}
    </group>
  </group>;
}

export function ExocyticVesicle({ position, running, activity }: { position: [number, number, number]; running: boolean; activity: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = running ? (clock.elapsedTime * (.1 + Math.min(1, activity / 100) * .12)) % 1 : .48;
    ref.current.position.x = position[0] - phase * .2;
    ref.current.position.y = position[1] + Math.sin(phase * Math.PI) * .04;
    const fusion = phase > .75 ? Math.max(.06, (1 - phase) / .25) : .78 + Math.sin(phase * Math.PI) * .22;
    ref.current.scale.setScalar(fusion);
  });
  return <group ref={ref} position={position}>
    <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.045, .008, 9, 26]}/><meshBasicMaterial color="#dc6658" transparent opacity={.72}/></mesh>
    <mesh><dodecahedronGeometry args={[.023, 0]}/><meshBasicMaterial color="#b16ed1" transparent opacity={.82}/></mesh>
  </group>;
}
