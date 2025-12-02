import { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface AnatomicalBody3DProps {
    heartRate: number;
    respiratoryRate: number;
    arterialPerfusion: number;
    venousPerfusion: number;
}

// Heart Component with better geometry
function ImprovedHeart({ heartRate }: { heartRate: number }) {
    const meshRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const beat = Math.sin(state.clock.elapsedTime * (heartRate / 60) * Math.PI * 2);
            const scale = 1 + beat * 0.08;
            meshRef.current.scale.setScalar(scale);
        }
    });

    // Create heart-like shape using two spheres and a cone
    return (
        <group ref={meshRef} position={[0, 0.3, 0]}>
            {/* Left ventricle */}
            <mesh position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI * 0.2]}>
                <sphereGeometry args={[0.12, 32, 32]} />
                <meshStandardMaterial
                    color="#cc0000"
                    roughness={0.2}
                    metalness={0.3}
                    emissive="#aa0000"
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Right ventricle */}
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, -Math.PI * 0.2]}>
                <sphereGeometry args={[0.11, 32, 32]} />
                <meshStandardMaterial
                    color="#dd0000"
                    roughness={0.2}
                    metalness={0.3}
                    emissive="#aa0000"
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Apex */}
            <mesh position={[0, -0.12, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.12, 0.15, 32]} />
                <meshStandardMaterial
                    color="#bb0000"
                    roughness={0.2}
                    metalness={0.3}
                    emissive="#aa0000"
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Aorta */}
            <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.04, 0.05, 0.15, 16]} />
                <meshStandardMaterial
                    color="#ee0000"
                    roughness={0.2}
                    metalness={0.3}
                />
            </mesh>
        </group>
    );
}

// Lungs Component with cut-away left lung showing alveoli
function ImprovedLungs({ respiratoryRate }: { respiratoryRate: number }) {
    const leftLungRef = useRef<THREE.Group>(null);
    const rightLungRef = useRef<THREE.Mesh>(null);
    const alveoliRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (leftLungRef.current && rightLungRef.current) {
            const breath = Math.sin(state.clock.elapsedTime * (respiratoryRate / 60) * Math.PI * 2);
            const scale = 1 + breath * 0.1;
            leftLungRef.current.scale.set(1, scale, scale);
            rightLungRef.current.scale.set(1, scale, scale);
        }

        // Animate alveoli pulsing with breathing
        if (alveoliRef.current) {
            const breath = Math.sin(state.clock.elapsedTime * (respiratoryRate / 60) * Math.PI * 2);
            const alveoliScale = 1 + breath * 0.15;
            alveoliRef.current.children.forEach((child, i) => {
                const phase = (i / alveoliRef.current!.children.length) * Math.PI * 2;
                const individualScale = 1 + Math.sin(state.clock.elapsedTime * 2 + phase) * 0.1;
                child.scale.setScalar(alveoliScale * individualScale);
            });
        }
    });

    const lungGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(0.15, 24, 24);
        geometry.scale(0.7, 1.2, 0.9);
        return geometry;
    }, []);

    // Create half-lung geometry (cut longitudinally)
    const halfLungGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(0.15, 24, 24, 0, Math.PI);
        geometry.scale(0.7, 1.2, 0.9);
        return geometry;
    }, []);

    // Generate alveoli positions inside the lung
    const alveoli = useMemo(() => {
        const positions: THREE.Vector3[] = [];
        const count = 40; // Number of alveoli clusters

        for (let i = 0; i < count; i++) {
            // Generate points inside a half-ellipsoid
            const theta = Math.random() * Math.PI; // 0 to PI for half sphere
            const phi = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.12 + 0.02; // Random radius from center

            const x = r * Math.sin(theta) * Math.cos(phi) * 0.6;
            const y = r * Math.cos(theta) * 1.0;
            const z = r * Math.sin(theta) * Math.sin(phi) * 0.8;

            positions.push(new THREE.Vector3(x, y, z));
        }

        return positions;
    }, []);

    return (
        <group position={[0, 0.25, -0.05]}>
            {/* Left Lung - Cut in half with alveoli visible */}
            <group ref={leftLungRef} position={[-0.18, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                {/* Outer lung tissue (half) */}
                <mesh geometry={halfLungGeometry}>
                    <meshStandardMaterial
                        color="#ff9999"
                        roughness={0.6}
                        metalness={0.1}
                        emissive="#ff6666"
                        emissiveIntensity={0.2}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* Internal cross-section surface */}
                <mesh rotation={[0, 0, 0]}>
                    <planeGeometry args={[0.21, 0.36]} />
                    <meshStandardMaterial
                        color="#dd7777"
                        roughness={0.7}
                        metalness={0.05}
                        emissive="#cc5555"
                        emissiveIntensity={0.15}
                    />
                </mesh>

                {/* Alveoli - tiny spheres inside */}
                <group ref={alveoliRef}>
                    {alveoli.map((pos, i) => (
                        <mesh key={i} position={pos}>
                            <sphereGeometry args={[0.008, 6, 6]} />
                            <meshStandardMaterial
                                color="#ffcccc"
                                roughness={0.3}
                                metalness={0.2}
                                emissive="#ff8888"
                                emissiveIntensity={0.4}
                            />
                        </mesh>
                    ))}
                </group>

                {/* Bronchioles network inside */}
                {[...Array(8)].map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const length = 0.08;
                    return (
                        <mesh
                            key={i}
                            position={[
                                Math.cos(angle) * length * 0.3,
                                Math.sin(angle) * length * 0.5,
                                0
                            ]}
                            rotation={[0, 0, angle]}
                        >
                            <cylinderGeometry args={[0.002, 0.004, length, 6]} />
                            <meshStandardMaterial
                                color="#cc6666"
                                roughness={0.5}
                                emissive="#aa4444"
                                emissiveIntensity={0.2}
                            />
                        </mesh>
                    );
                })}
            </group>

            {/* Right Lung - Complete */}
            <mesh ref={rightLungRef} position={[0.18, 0, 0]} geometry={lungGeometry}>
                <meshStandardMaterial
                    color="#ff9999"
                    roughness={0.6}
                    metalness={0.1}
                    emissive="#ff6666"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Bronchi */}
            <mesh position={[-0.08, 0.1, 0.05]} rotation={[0, 0, -Math.PI * 0.15]}>
                <cylinderGeometry args={[0.015, 0.02, 0.12, 8]} />
                <meshStandardMaterial color="#cc6666" roughness={0.4} />
            </mesh>
            <mesh position={[0.08, 0.1, 0.05]} rotation={[0, 0, Math.PI * 0.15]}>
                <cylinderGeometry args={[0.015, 0.02, 0.12, 8]} />
                <meshStandardMaterial color="#cc6666" roughness={0.4} />
            </mesh>
        </group>
    );
}

// Liver Component with realistic shape
function ImprovedLiver() {
    const liverGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(0.18, 24, 24);
        geometry.scale(1.3, 0.6, 0.8);
        return geometry;
    }, []);

    return (
        <mesh position={[0.12, -0.05, 0]} geometry={liverGeometry}>
            <meshStandardMaterial
                color="#8b3a3a"
                roughness={0.4}
                metalness={0.2}
                emissive="#5a1a1a"
                emissiveIntensity={0.3}
            />
        </mesh>
    );
}

// Kidneys Component with bean shape
function ImprovedKidneys() {
    const kidneyGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(0.08, 20, 20);
        geometry.scale(0.7, 1.2, 1);
        return geometry;
    }, []);

    return (
        <group>
            {/* Left Kidney */}
            <mesh position={[-0.22, -0.18, -0.08]} rotation={[0, -0.3, 0]} geometry={kidneyGeometry}>
                <meshStandardMaterial
                    color="#8b4513"
                    roughness={0.5}
                    metalness={0.2}
                    emissive="#5a2a0a"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Right Kidney */}
            <mesh position={[0.22, -0.20, -0.08]} rotation={[0, 0.3, 0]} geometry={kidneyGeometry}>
                <meshStandardMaterial
                    color="#8b4513"
                    roughness={0.5}
                    metalness={0.2}
                    emissive="#5a2a0a"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Ureters */}
            <mesh position={[-0.22, -0.26, -0.08]}>
                <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
                <meshStandardMaterial color="#994422" roughness={0.6} />
            </mesh>
            <mesh position={[0.22, -0.28, -0.08]}>
                <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
                <meshStandardMaterial color="#994422" roughness={0.6} />
            </mesh>
        </group>
    );
}

// Stomach Component
function ImprovedStomach() {
    const stomachGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(0.12, 20, 20);
        geometry.scale(0.8, 1.1, 1);
        return geometry;
    }, []);

    return (
        <mesh position={[-0.08, -0.12, 0.05]} rotation={[0, 0.3, 0.2]} geometry={stomachGeometry}>
            <meshStandardMaterial
                color="#dd8888"
                roughness={0.6}
                metalness={0.1}
                emissive="#aa5555"
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

// Improved Arterial System
function ImprovedArteries({ perfusion }: { perfusion: number }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            time: { value: 0 },
            flowSpeed: { value: 2.0 },
            perfusionLevel: { value: perfusion / 100 },
            baseColor: { value: new THREE.Color('#ff0000') },
            flowColor: { value: new THREE.Color('#ff8888') }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float flowSpeed;
            uniform float perfusionLevel;
            uniform vec3 baseColor;
            uniform vec3 flowColor;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Animated flow pattern with multiple waves
                float flow1 = sin(vUv.y * 15.0 - time * flowSpeed) * 0.5 + 0.5;
                float flow2 = sin(vUv.y * 8.0 - time * flowSpeed * 0.7 + 1.0) * 0.3 + 0.5;
                float flow = (flow1 + flow2) * 0.5 * perfusionLevel;
                
                // Pulsing effect
                float pulse = sin(time * 3.0) * 0.2 + 0.8;
                flow *= pulse;
                
                vec3 color = mix(baseColor * 0.8, flowColor, flow);
                
                // Fresnel effect for depth
                vec3 viewDir = normalize(cameraPosition - vPosition);
                float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
                color += fresnel * 0.3 * flowColor;
                
                gl_FragColor = vec4(color, 0.95);
            }
        `
    }), [perfusion]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
            materialRef.current.uniforms.perfusionLevel.value = perfusion / 100;
        }
    });

    // Main arteries
    const arteries = useMemo(() => {
        const paths = [
            // Aorta descendente
            {
                points: [
                    new THREE.Vector3(0, 0.2, 0),
                    new THREE.Vector3(0.02, 0.1, 0),
                    new THREE.Vector3(0, -0.15, 0),
                    new THREE.Vector3(0, -0.35, 0)
                ], radius: 0.022
            },
            // Carótida esquerda
            {
                points: [
                    new THREE.Vector3(0, 0.2, 0),
                    new THREE.Vector3(-0.05, 0.3, 0),
                    new THREE.Vector3(-0.08, 0.45, 0.02)
                ], radius: 0.015
            },
            // Carótida direita
            {
                points: [
                    new THREE.Vector3(0, 0.2, 0),
                    new THREE.Vector3(0.05, 0.3, 0),
                    new THREE.Vector3(0.08, 0.45, 0.02)
                ], radius: 0.015
            },
            // Artéria renal esquerda
            {
                points: [
                    new THREE.Vector3(0, -0.15, 0),
                    new THREE.Vector3(-0.15, -0.18, -0.05),
                    new THREE.Vector3(-0.22, -0.18, -0.08)
                ], radius: 0.012
            },
            // Artéria renal direita
            {
                points: [
                    new THREE.Vector3(0, -0.15, 0),
                    new THREE.Vector3(0.15, -0.18, -0.05),
                    new THREE.Vector3(0.22, -0.20, -0.08)
                ], radius: 0.012
            }
        ];

        return paths.map((path, i) => {
            const curve = new THREE.CatmullRomCurve3(path.points);
            const geometry = new THREE.TubeGeometry(curve, 32, path.radius, 12, false);
            return <mesh key={i} geometry={geometry}>
                <shaderMaterial ref={i === 0 ? materialRef : null} {...shaderArgs} transparent />
            </mesh>;
        });
    }, [shaderArgs]);

    return <group>{arteries}</group>;
}

// Improved Venous System
function ImprovedVeins({ perfusion }: { perfusion: number }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            time: { value: 0 },
            flowSpeed: { value: 1.2 },
            perfusionLevel: { value: perfusion / 100 },
            baseColor: { value: new THREE.Color('#0044cc') },
            flowColor: { value: new THREE.Color('#6688ff') }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float flowSpeed;
            uniform float perfusionLevel;
            uniform vec3 baseColor;
            uniform vec3 flowColor;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Reverse flow direction
                float flow1 = sin(vUv.y * 12.0 + time * flowSpeed) * 0.5 + 0.5;
                float flow2 = sin(vUv.y * 6.0 + time * flowSpeed * 0.8) * 0.3 + 0.5;
                float flow = (flow1 + flow2) * 0.5 * perfusionLevel;
                
                vec3 color = mix(baseColor * 0.7, flowColor, flow);
                
                // Fresnel
                vec3 viewDir = normalize(cameraPosition - vPosition);
                float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.5);
                color += fresnel * 0.2 * flowColor;
                
                gl_FragColor = vec4(color, 0.85);
            }
        `
    }), [perfusion]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
            materialRef.current.uniforms.perfusionLevel.value = perfusion / 100;
        }
    });

    const veins = useMemo(() => {
        const paths = [
            // Veia cava superior
            {
                points: [
                    new THREE.Vector3(-0.06, 0.45, 0.02),
                    new THREE.Vector3(-0.03, 0.35, 0),
                    new THREE.Vector3(0, 0.25, -0.02)
                ], radius: 0.018
            },
            {
                points: [
                    new THREE.Vector3(0.06, 0.45, 0.02),
                    new THREE.Vector3(0.03, 0.35, 0),
                    new THREE.Vector3(0, 0.25, -0.02)
                ], radius: 0.018
            },
            // Veia cava inferior
            {
                points: [
                    new THREE.Vector3(0, 0.18, -0.02),
                    new THREE.Vector3(0.02, -0.12, -0.03),
                    new THREE.Vector3(0, -0.35, -0.02)
                ], radius: 0.02
            },
            // Veias renais
            {
                points: [
                    new THREE.Vector3(-0.22, -0.18, -0.08),
                    new THREE.Vector3(-0.12, -0.15, -0.05),
                    new THREE.Vector3(0, -0.12, -0.03)
                ], radius: 0.01
            },
            {
                points: [
                    new THREE.Vector3(0.22, -0.20, -0.08),
                    new THREE.Vector3(0.12, -0.17, -0.05),
                    new THREE.Vector3(0, -0.12, -0.03)
                ], radius: 0.01
            }
        ];

        return paths.map((path, i) => {
            const curve = new THREE.CatmullRomCurve3(path.points);
            const geometry = new THREE.TubeGeometry(curve, 32, path.radius, 12, false);
            return <mesh key={i} geometry={geometry}>
                <shaderMaterial ref={i === 0 ? materialRef : null} {...shaderArgs} transparent />
            </mesh>;
        });
    }, [shaderArgs]);

    return <group>{veins}</group>;
}

// Torso Shell with ribcage outline
function ImprovedBodyShell() {
    return (
        <group>
            {/* Main torso */}
            <mesh position={[0, 0, 0]}>
                <capsuleGeometry args={[0.25, 0.7, 16, 24]} />
                <meshStandardMaterial
                    color="#f5d5c5"
                    transparent
                    opacity={0.15}
                    side={THREE.DoubleSide}
                    roughness={0.8}
                />
            </mesh>

            {/* Ribcage outline */}
            {[...Array(8)].map((_, i) => {
                const y = 0.35 - i * 0.08;
                const scale = 1 - Math.abs(i - 3.5) * 0.12;
                return (
                    <mesh key={i} position={[0, y, 0]} scale={[scale, 1, scale]}>
                        <torusGeometry args={[0.18, 0.008, 8, 24, Math.PI]} />
                        <meshStandardMaterial
                            color="#e8d8c8"
                            transparent
                            opacity={0.3}
                            roughness={0.6}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}

// Main Scene
function AnatomyScene({ heartRate, respiratoryRate, arterialPerfusion, venousPerfusion }: AnatomicalBody3DProps) {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0.8, 0.3, 1.5]} fov={45} />
            <OrbitControls
                enablePan={false}
                minDistance={1}
                maxDistance={2.5}
                maxPolarAngle={Math.PI / 1.8}
                target={[0, 0, 0]}
            />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <directionalLight position={[-3, 3, -3]} intensity={0.5} />
            <pointLight position={[0, 0, 2]} intensity={0.5} color="#ffffff" />
            <spotLight position={[0, 3, 0]} angle={0.5} intensity={0.3} castShadow />

            {/* Environment for reflections */}
            <Environment preset="studio" />

            {/* Anatomical Components */}
            <group rotation={[0, Math.PI * 0.05, 0]}>
                <ImprovedBodyShell />
                <ImprovedHeart heartRate={heartRate} />
                <ImprovedLungs respiratoryRate={respiratoryRate} />
                <ImprovedLiver />
                <ImprovedKidneys />
                <ImprovedStomach />
                <ImprovedArteries perfusion={arterialPerfusion} />
                <ImprovedVeins perfusion={venousPerfusion} />
            </group>

            {/* Ground shadow */}
            <ContactShadows
                position={[0, -0.6, 0]}
                opacity={0.3}
                scale={2}
                blur={2}
                far={1}
            />
        </>
    );
}

// Main Export
export function AnatomicalBody3DImproved(props: AnatomicalBody3DProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!isReady) {
        return (
            <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-cyan-400 text-sm">Carregando anatomia 3D...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/20 relative">
            <Canvas
                key="anatomy-canvas-3d"
                shadows
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    preserveDrawingBuffer: false,
                    failIfMajorPerformanceCaveat: false,
                }}
                dpr={[1, 2]}
                onCreated={({ gl }) => {
                    const handleContextLost = (e: Event) => {
                        e.preventDefault();
                    };
                    const handleContextRestored = () => {
                        // Auto restore
                    };

                    gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
                    gl.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

                    return () => {
                        gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
                        gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
                    };
                }}
            >
                <Suspense fallback={null}>
                    <AnatomyScene {...props} />
                </Suspense>
            </Canvas>

            {/* Enhanced Legend */}
            <div className="absolute bottom-3 left-3 right-3 bg-gray-900/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-xl">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/50"></div>
                        <span className="text-red-300 font-medium">Artérias {props.arterialPerfusion.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/50"></div>
                        <span className="text-blue-300 font-medium">Veias {props.venousPerfusion.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-600 to-red-900 shadow-lg shadow-red-600/50 animate-pulse"></div>
                        <span className="text-red-200 font-medium">Coração {props.heartRate} bpm</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-400/50"></div>
                        <span className="text-pink-200 font-medium">Pulmões {props.respiratoryRate} rpm</span>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-700/50 text-[10px] text-gray-400 text-center">
                    🖱️ Arraste para rotacionar • 🔍 Scroll para zoom
                </div>
            </div >
        </div >
    );
}
