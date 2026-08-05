import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles, useGLTF } from '@react-three/drei';
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3, type Group } from 'three';
import type { AutomationKind } from '../../game/cellularTypes';

interface CellularMachinerySceneProps {
  automation: Record<AutomationKind, number>;
  etcFlux: number;
  atp: number;
}

const machineMeta: Array<{ kind: AutomationKind; label: string; color: string }> = [
  { kind: 'transporters', label: 'Transportadores', color: '#58bdd0' },
  { kind: 'mitochondrialShuttle', label: 'Navette mitocondrial', color: '#d9b45f' },
  { kind: 'repair', label: 'Complexo de reparo', color: '#55be83' },
];

const MAX_ENERGY_MOLECULES = 9;

export function CellularMachineryScene({ automation, etcFlux, atp }: CellularMachinerySceneProps) {
  return (
    <div className="relative mt-4 h-[300px] overflow-hidden rounded-xl border border-primary/15 bg-[radial-gradient(circle_at_50%_45%,rgba(85,183,189,.09),rgba(0,0,0,.18)_60%)]">
      <Canvas camera={{ position: [0, 2.1, 8.8], fov: 38 }} dpr={[1, 1.45]} shadows gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Visualização 3D indisponível</div>}>
        <ambientLight intensity={1.1}/>
        <directionalLight position={[4, 6, 6]} intensity={2.4} color="#e5f8ff" castShadow/>
        <pointLight position={[0, -1, 4]} intensity={16} color="#d9b45f" distance={10}/>
        <Suspense fallback={null}><AssemblyWorld automation={automation} etcFlux={etcFlux} atp={atp}/></Suspense>
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3.4} maxPolarAngle={Math.PI / 2.1} minAzimuthAngle={-.4} maxAzimuthAngle={.4}/>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/75 to-transparent px-3 pb-8 pt-3">
        <div><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-foreground">Bancada de montagem celular</span><span className="mt-1 block text-[11px] text-muted-foreground">Cada compra adiciona uma peça funcional ao complexo</span></div>
        <span className="rounded-full border border-primary/20 bg-black/35 px-2 py-1 font-mono text-[11px] text-primary">ATP {atp.toFixed(2)}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-white/5 bg-black/60">
        {machineMeta.map(machine => <div key={machine.kind} className="border-r border-white/5 px-2 py-2 text-center last:border-r-0"><span className="block truncate text-[11px] uppercase tracking-wider text-muted-foreground">{machine.label}</span><strong className="mt-0.5 block font-mono text-[11px]" style={{ color: machine.color }}>NÍVEL {automation[machine.kind]}/4</strong></div>)}
      </div>
    </div>
  );
}

function AssemblyWorld({ automation, etcFlux, atp }: CellularMachinerySceneProps) {
  return (
    <group position={[0, -.2, 0]}>
      <gridHelper args={[10, 20, '#27434a', '#17242b']} position={[0, -1.65, 0]} />
      <MachineAssembly kind="transporters" level={automation.transporters} position={[-2.8, 0, 0]} color="#58bdd0"/>
      <MachineAssembly kind="mitochondrialShuttle" level={automation.mitochondrialShuttle} position={[0, 0, 0]} color="#d9b45f"/>
      <MachineAssembly kind="repair" level={automation.repair} position={[2.8, 0, 0]} color="#55be83"/>
      <EnergyMolecules flux={etcFlux} atp={atp}/>
      <Sparkles count={28} scale={[8, 3.5, 3]} size={1.5} speed={.35} opacity={.3} color="#75cbd3"/>
    </group>
  );
}

function MachineAssembly({ kind, level, position, color }: { kind: AutomationKind; level: number; position: [number, number, number]; color: string }) {
  if (kind === 'transporters') {
    return (
      <group position={position}>
        <mesh position={[0, -1.32, 0]} receiveShadow>
          <cylinderGeometry args={[1, 1.15, .18, 32]}/>
          <meshStandardMaterial color="#142129" metalness={.65} roughness={.32}/>
        </mesh>
        <AdrenergicReceptor level={level}/>
      </group>
    );
  }

  return (
    <group position={position}>
      <mesh position={[0, -1.32, 0]} receiveShadow><cylinderGeometry args={[1, 1.15, .18, 32]}/><meshStandardMaterial color="#142129" metalness={.65} roughness={.32}/></mesh>
      <mesh position={[0, -1.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.72, .035, 8, 40]}/><meshBasicMaterial color={color} transparent opacity={.48}/></mesh>
      {Array.from({ length: 4 }, (_, index) => index < level
        ? <AnimatedMachinePart key={`${kind}-${index}`} kind={kind} index={index} color={color}/>
        : <GhostPart key={`${kind}-ghost-${index}`} kind={kind} index={index} color={color}/>)}
      {level < 4 && <ConstructionOrbit color={color} height={partHeight(level)}/>} 
    </group>
  );
}

function AdrenergicReceptor({ level }: { level: number }) {
  const { scene } = useGLTF('/adrenergic_receptor.glb') as { scene: Group };
  const model = useMemo(() => {
    const normalized = scene.clone(true);
    const bounds = new Box3().setFromObject(normalized);
    const size = bounds.getSize(new Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z, .001);
    normalized.scale.setScalar(1.35 / largestDimension);
    const scaledBounds = new Box3().setFromObject(normalized);
    const scaledCenter = scaledBounds.getCenter(new Vector3());
    normalized.position.x -= scaledCenter.x;
    normalized.position.y -= scaledBounds.min.y;
    normalized.position.z -= scaledCenter.z;
    normalized.traverse(object => {
      object.castShadow = true;
      object.receiveShadow = true;
      if (!(object instanceof Mesh)) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(material => material.clone())
        : object.material.clone();
    });
    return normalized;
  }, [scene]);

  useEffect(() => {
    const activation = Math.max(0, Math.min(1, level / 4));
    const receptorCyan = new Color('#58bdd0');
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (!(material instanceof MeshStandardMaterial)) return;
        const original = material.userData.originalColor as string | undefined;
        if (!original) material.userData.originalColor = `#${material.color.getHexString()}`;
        material.color.set(material.userData.originalColor as string).lerp(receptorCyan, activation * .82);
        material.emissive.copy(receptorCyan);
        material.emissiveIntensity = activation * .38;
        material.needsUpdate = true;
      });
    });
  }, [level, model]);

  return <group position={[0, -1.24, 0]} rotation={[0, -.35, 0]}><primitive object={model}/></group>;
}

function partHeight(index: number) {
  return -1 + index * .62;
}

function AnimatedMachinePart({ kind, index, color }: { kind: Exclude<AutomationKind, 'transporters'>; index: number; color: string }) {
  const ref = useRef<Group>(null);
  const progress = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
    progress.current = Math.min(1, progress.current + delta * 1.15);
    const eased = 1 - Math.pow(1 - progress.current, 3);
    ref.current.scale.setScalar(eased);
    ref.current.position.y = partHeight(index) + (1 - eased) * 1.1;
    ref.current.rotation.y += delta * (.35 + index * .08);
  });
  return <group ref={ref} position={[0, partHeight(index), 0]}>{kind === 'mitochondrialShuttle' ? <ShuttlePart index={index} color={color}/> : <RepairPart index={index} color={color}/>}</group>;
}

function GhostPart({ kind, index, color }: { kind: Exclude<AutomationKind, 'transporters'>; index: number; color: string }) {
  return <group position={[0, partHeight(index), 0]}>{kind === 'mitochondrialShuttle' ? <ShuttlePart index={index} color={color} ghost/> : <RepairPart index={index} color={color} ghost/>}</group>;
}

function ShuttlePart({ index, color, ghost }: { index: number; color: string; ghost?: boolean }) {
  return <group><mesh castShadow rotation={[index * .4, .2, 0]}><torusKnotGeometry args={[.34 - index * .015, .095, 64, 8, 2, 3]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={ghost ? .04 : .42} wireframe={ghost} transparent opacity={ghost ? .13 : 1} metalness={.5} roughness={.24}/></mesh><mesh><octahedronGeometry args={[.18, 0]}/><meshBasicMaterial color="#fff2b2" transparent opacity={ghost ? .08 : .8}/></mesh></group>;
}

function RepairPart({ index, color, ghost }: { index: number; color: string; ghost?: boolean }) {
  return <group><mesh castShadow><icosahedronGeometry args={[.34 + index * .015, 1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={ghost ? .04 : .38} wireframe={ghost} transparent opacity={ghost ? .13 : .94} metalness={.35} roughness={.3}/></mesh>{[0, 1, 2].map(point => <mesh key={point} position={[Math.cos(point * Math.PI * 2 / 3) * .55, Math.sin(point * Math.PI * 2 / 3) * .55, 0]}><sphereGeometry args={[.09, 12, 8]}/><meshBasicMaterial color="#d8fff0" transparent opacity={ghost ? .08 : .8}/></mesh>)}</group>;
}

function ConstructionOrbit({ color, height }: { color: string; height: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 1.7; });
  return <group ref={ref} position={[0, height, 0]}>{[0, 1, 2, 3].map(index => <mesh key={index} position={[Math.cos(index * Math.PI / 2) * .82, Math.sin(index * Math.PI / 2) * .3, Math.sin(index * Math.PI / 2) * .82]}><sphereGeometry args={[.055, 8, 6]}/><meshBasicMaterial color={color}/></mesh>)}</group>;
}

function EnergyMolecules({ flux, atp }: { flux: number; atp: number }) {
  const group = useRef<Group>(null);
  const count = Math.max(3, Math.min(9, Math.round(3 + flux / 18)));
  const phase = useRef(0);
  const phases = useMemo(() => Array.from({ length: MAX_ENERGY_MOLECULES }, (_, index) => index / MAX_ENERGY_MOLECULES * Math.PI * 2), []);
  useFrame((_, delta) => {
    if (!group.current) return;
    phase.current += delta * (.35 + flux * .004);
    group.current.children.forEach((child, index) => {
      child.visible = index < count;
      const moleculePhase = phases[index] + phase.current;
      child.position.set(Math.cos(moleculePhase) * 3.8, -.2 + Math.sin(moleculePhase * 2) * .65, Math.sin(moleculePhase) * .8);
      child.rotation.x += .01;
      child.rotation.y += .015;
    });
  });
  return <group ref={group}>{phases.map((_, index) => <Float key={index} speed={1.2} floatIntensity={.12}><group scale={.75 + atp * .025}><mesh><octahedronGeometry args={[.1, 0]}/><meshBasicMaterial color="#d9b45f"/></mesh><mesh position={[.16, 0, 0]}><sphereGeometry args={[.055, 8, 6]}/><meshBasicMaterial color="#58bdd0"/></mesh><mesh position={[-.16, 0, 0]}><sphereGeometry args={[.055, 8, 6]}/><meshBasicMaterial color="#55be83"/></mesh></group></Float>)}</group>;
}
