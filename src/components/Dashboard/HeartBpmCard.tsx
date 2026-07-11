import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, OrbitControls, useGLTF } from '@react-three/drei';
import { AlertTriangle, Heart } from 'lucide-react';
import * as THREE from 'three';

type HeartSeverity = 'normal' | 'warning' | 'critical';

const HEART_REFERENCE = {
    min: 60,
    max: 100,
    warningLow: 55,
    warningHigh: 110,
};

const HEART_TONES: Record<HeartSeverity, {
    shell: string;
    badge: string;
    value: string;
    bar: string;
    label: string;
    subtitle: string;
}> = {
    normal: {
        shell: 'border-status-normal/25 bg-gradient-to-br from-app-panel via-app-surface to-app-bg',
        badge: 'bg-status-normal/15 text-status-normal',
        value: 'text-status-normal',
        bar: 'bg-status-normal',
        label: 'SINCRONIZADO',
        subtitle: 'ritmo estável e sincronizado',
    },
    warning: {
        shell: 'border-status-warning/50 bg-gradient-to-br from-status-warning/10 via-app-panel to-app-bg',
        badge: 'bg-status-warning/15 text-status-warning',
        value: 'text-status-warning',
        bar: 'bg-status-warning',
        label: 'ESTRESSADO',
        subtitle: 'carga aumentada, atenção imediata',
    },
    critical: {
        shell: 'border-status-critical/70 bg-gradient-to-br from-status-critical/20 via-app-panel to-app-bg',
        badge: 'bg-status-critical/15 text-status-critical',
        value: 'text-status-critical',
        bar: 'bg-status-critical',
        label: 'CRÍTICO',
        subtitle: 'falha hemodinâmica iminente',
    },
};

function getHeartSeverity(bpm: number): HeartSeverity {
    if (bpm < HEART_REFERENCE.warningLow || bpm > HEART_REFERENCE.warningHigh) {
        return 'critical';
    }

    if (bpm < HEART_REFERENCE.min || bpm > HEART_REFERENCE.max) {
        return 'warning';
    }

    return 'normal';
}

useGLTF.preload('/human_heart.glb');

export const HeartBpmCard: React.FC<{ bpm: number }> = ({ bpm }) => {
    const severity = getHeartSeverity(bpm);
    const tone = HEART_TONES[severity];
    const pulseFill = Math.max(0, Math.min(100, ((bpm - 40) / 160) * 100));

    return (
        <div className={`panel relative overflow-hidden p-3 flex flex-col gap-3 min-h-[290px] ${tone.shell}`}>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_42%)]" />
            <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center border ${tone.badge} ${severity === 'critical' ? 'animate-heartbeat' : ''}`}>
                        <Heart className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                    </div>
                    <div>
                        <div className="metric-label">FREQUÊNCIA CARDÍACA GLOBAL</div>
                        <div className="text-[10px] text-text-dim uppercase tracking-wider">sincronizada com a simulação</div>
                    </div>
                </div>
                <div className={`px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${tone.badge}`}>
                    {tone.label}
                </div>
            </div>

            <div className="relative flex-1 min-h-[190px] overflow-hidden border border-white/5 bg-black/20">
                <Canvas
                    camera={{ position: [0, 0.3, 4.6], fov: 32 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, alpha: true }}
                >
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[3, 4, 5]} intensity={1.8} color="#fff4f0" />
                    <pointLight position={[-3, 1, 3]} intensity={severity === 'critical' ? 3.5 : 2.2} color={severity === 'normal' ? '#fb7185' : '#fb923c'} />
                    <pointLight position={[0, -2, 2]} intensity={1.4} color="#7f1d1d" />
                    <React.Suspense fallback={<HeartFallback3D severity={severity} />}>
                        <Center top bottom>
                            <HeartModel bpm={bpm} severity={severity} />
                        </Center>
                    </React.Suspense>
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate
                        autoRotateSpeed={severity === 'critical' ? 1.1 : 0.7}
                        minPolarAngle={Math.PI / 3}
                        maxPolarAngle={Math.PI / 1.7}
                    />
                </Canvas>

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/5 bg-black/50 px-3 py-2 text-[10px] text-text-dim">
                    <span>Modelo cardíaco tridimensional</span>
                    <span className={severity === 'critical' ? 'text-status-critical' : tone.value}>
                        {tone.subtitle}
                    </span>
                </div>
            </div>

            <div className="relative grid grid-cols-[auto,1fr] gap-3 rounded-none border border-white/5 bg-black/20 p-3">
                <div>
                    <div className="text-[10px] text-text-dim uppercase tracking-wider">BATIMENTOS POR MINUTO</div>
                    <div className={`font-mono text-5xl leading-none tabular-nums ${tone.value} ${severity !== 'normal' ? 'animate-heartbeat' : ''}`}>
                        {Math.round(bpm)}
                    </div>
                </div>

                <div className="flex flex-col justify-end gap-2">
                    <div>
                        <div className="h-1.5 bg-app-border overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${tone.bar}`}
                                style={{ width: `${pulseFill}%` }}
                            />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-text-dim">
                            <span>40</span>
                            <span>200</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-text-dim">
                        {severity === 'critical' ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-status-critical animate-pulse-glow" aria-hidden="true" />
                        ) : null}
                        <span>
                            {bpm < HEART_REFERENCE.min
                                ? 'Bradicardia detectada'
                                : bpm > HEART_REFERENCE.max
                                    ? 'Taquicardia detectada'
                                    : 'Zona fisiológica de repouso'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

function HeartFallback3D({ severity }: { severity: HeartSeverity }) {
    const tone = severity === 'critical' ? '#7f1d1d' : severity === 'warning' ? '#b45309' : '#be185d';

    return (
        <group>
            <ambientLight intensity={0.8} />
            <pointLight position={[2, 2, 3]} intensity={2} color={tone} />
            <mesh scale={0.9} rotation={[0.2, 0.6, 0]}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.35} roughness={0.35} metalness={0.08} />
            </mesh>
            <mesh position={[0, 0.35, 0.25]} scale={0.45} rotation={[0.4, 0.1, 0.2]}>
                <sphereGeometry args={[0.35, 24, 24]} />
                <meshStandardMaterial color="#fee2e2" emissive={tone} emissiveIntensity={0.18} roughness={0.25} metalness={0.05} />
            </mesh>
            <mesh position={[-0.25, -0.45, 0.1]} scale={[0.35, 0.6, 0.35]} rotation={[0.2, 0.2, 0.5]}>
                <cylinderGeometry args={[0.35, 0.18, 1.2, 18]} />
                <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.28} roughness={0.4} metalness={0.1} />
            </mesh>
        </group>
    );
}

function HeartModel({ bpm, severity }: { bpm: number; severity: HeartSeverity }) {
    const groupRef = React.useRef<THREE.Group>(null);
    const { scene } = useGLTF('/human_heart.glb') as { scene: THREE.Group };

    React.useEffect(() => {
        scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) {
                return;
            }

            object.castShadow = true;
            object.receiveShadow = true;

            const materials = Array.isArray(object.material) ? object.material : [object.material];

            materials.forEach((material) => {
                if (!material || !('emissive' in material)) {
                    return;
                }

                const meshMaterial = material as THREE.MeshStandardMaterial;
                meshMaterial.emissive = new THREE.Color(severity === 'critical' ? '#7f1d1d' : '#7f1d69');
                meshMaterial.emissiveIntensity = severity === 'critical' ? 0.45 : 0.22;
                meshMaterial.roughness = 0.42;
                meshMaterial.metalness = 0.08;
            });
        });
    }, [scene, severity]);

    useFrame((state) => {
        if (!groupRef.current) {
            return;
        }

        const pulseSpeed = Math.max(0.7, Math.min(3.2, bpm / 60));
        const elapsed = state.clock.getElapsedTime();
        const beat = Math.pow(Math.max(0, Math.sin(elapsed * pulseSpeed * Math.PI * 2)), 4);
        const floating = Math.sin(elapsed * 1.2) * 0.02;
        const severityBoost = severity === 'critical' ? 0.16 : severity === 'warning' ? 0.11 : 0.08;

        groupRef.current.scale.setScalar(1 + beat * severityBoost);
        groupRef.current.rotation.y = Math.sin(elapsed * 0.5) * 0.25;
        groupRef.current.rotation.x = -0.15 + Math.sin(elapsed * 0.35) * 0.03;
        groupRef.current.position.y = floating + beat * 0.02;
    });

    return (
        <group ref={groupRef} rotation={[-0.15, Math.PI, 0]} scale={1.35}>
            <primitive object={scene} />
        </group>
    );
}
