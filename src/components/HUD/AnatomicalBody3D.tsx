import { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface AnatomicalBody3DProps {
    heartRate: number;
    respiratoryRate: number;
    arterialPerfusion: number; // 0-100
    venousPerfusion: number; // 0-100
    organHealth?: {
        heart?: number;
        lungs?: number;
        liver?: number;
        kidneys?: number;
    };
}

// Anatomical Body Shell Component
function BodyShell() {
    return (
        <mesh position={[0, 0, 0]}>
            {/* Torso */}
            <boxGeometry args={[0.4, 0.8, 0.25]} />
            <meshStandardMaterial
                color="#f5d5c5"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// Heart Organ Component
function Heart({ heartRate }: { heartRate: number }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Pulsating animation based on heart rate
            const beat = Math.sin(state.clock.elapsedTime * (heartRate / 60) * Math.PI * 2);
            const scale = 1 + beat * 0.05;
            meshRef.current.scale.setScalar(scale);
        }
    });

    return (
        <mesh ref={meshRef} position={[-0.05, 0.15, 0]}>
            {/* Simplified heart shape */}
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
                color="#cc0000"
                roughness={0.3}
                metalness={0.1}
                emissive="#660000"
                emissiveIntensity={0.3}
            />
        </mesh>
    );
}

// Lungs Organ Component
function Lungs({ respiratoryRate }: { respiratoryRate: number }) {
    const leftLungRef = useRef<THREE.Mesh>(null);
    const rightLungRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (leftLungRef.current && rightLungRef.current) {
            // Breathing animation
            const breath = Math.sin(state.clock.elapsedTime * (respiratoryRate / 60) * Math.PI * 2);
            const scale = 1 + breath * 0.08;
            leftLungRef.current.scale.set(1, scale, 1);
            rightLungRef.current.scale.set(1, scale, 1);
        }
    });

    return (
        <group>
            {/* Left Lung */}
            <mesh ref={leftLungRef} position={[0.12, 0.12, 0]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                <meshStandardMaterial
                    color="#ff69b4"
                    roughness={0.4}
                    metalness={0}
                    emissive="#cc4488"
                    emissiveIntensity={0.2}
                />
            </mesh>
            {/* Right Lung */}
            <mesh ref={rightLungRef} position={[-0.12, 0.12, 0]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                <meshStandardMaterial
                    color="#ff69b4"
                    roughness={0.4}
                    metalness={0}
                    emissive="#cc4488"
                    emissiveIntensity={0.2}
                />
            </mesh>
        </group>
    );
}

// Liver Organ Component
function Liver() {
    return (
        <mesh position={[0.08, -0.05, 0.02]}>
            <boxGeometry args={[0.2, 0.15, 0.12]} />
            <meshStandardMaterial
                color="#8b4513"
                roughness={0.3}
                metalness={0}
                emissive="#663311"
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

// Kidneys Organ Component
function Kidneys() {
    return (
        <group>
            {/* Left Kidney */}
            <mesh position={[0.15, -0.15, -0.05]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial
                    color="#991111"
                    roughness={0.3}
                    metalness={0}
                    emissive="#550000"
                    emissiveIntensity={0.2}
                />
            </mesh>
            {/* Right Kidney */}
            <mesh position={[-0.15, -0.15, -0.05]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial
                    color="#991111"
                    roughness={0.3}
                    metalness={0}
                    emissive="#550000"
                    emissiveIntensity={0.2}
                />
            </mesh>
        </group>
    );
}

// Stomach Organ Component
function Stomach() {
    return (
        <mesh position={[0.02, -0.1, 0.05]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
                color="#cc6666"
                roughness={0.4}
                metalness={0}
                emissive="#884444"
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

// Arterial System Component with flow animation
function Arteries({ perfusion }: { perfusion: number }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Custom shader for blood flow animation
    const shaderArgs = useMemo(() => ({
        uniforms: {
            time: { value: 0 },
            flowSpeed: { value: 1.0 },
            perfusionLevel: { value: perfusion / 100 },
            baseColor: { value: new THREE.Color('#ff0000') },
            flowColor: { value: new THREE.Color('#ff6666') }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
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
            
            void main() {
                // Animated flow pattern
                float flow = sin(vUv.y * 10.0 - time * flowSpeed) * 0.5 + 0.5;
                flow *= perfusionLevel;
                
                // Mix colors based on flow
                vec3 color = mix(baseColor, flowColor, flow);
                
                // Add rim lighting
                vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
                float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
                rim = pow(rim, 3.0);
                color += rim * 0.3;
                
                gl_FragColor = vec4(color, 0.9);
            }
        `
    }), [perfusion]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
            materialRef.current.uniforms.perfusionLevel.value = perfusion / 100;
        }
    });

    // Create arterial system geometry
    const arteriesGeometry = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.15, 0), // From heart
            new THREE.Vector3(0, 0.05, 0),
            new THREE.Vector3(0.1, -0.1, 0),
            new THREE.Vector3(0.15, -0.2, 0),
        ]);
        return new THREE.TubeGeometry(curve, 20, 0.015, 8, false);
    }, []);

    const arteriesGeometry2 = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.15, 0), // From heart
            new THREE.Vector3(0, 0.05, 0),
            new THREE.Vector3(-0.1, -0.1, 0),
            new THREE.Vector3(-0.15, -0.2, 0),
        ]);
        return new THREE.TubeGeometry(curve, 20, 0.015, 8, false);
    }, []);

    return (
        <group>
            <mesh geometry={arteriesGeometry}>
                <shaderMaterial ref={materialRef} {...shaderArgs} transparent />
            </mesh>
            <mesh geometry={arteriesGeometry2}>
                <shaderMaterial {...shaderArgs} transparent />
            </mesh>
        </group>
    );
}

// Venous System Component
function Veins({ perfusion }: { perfusion: number }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            time: { value: 0 },
            flowSpeed: { value: 0.5 },
            perfusionLevel: { value: perfusion / 100 },
            baseColor: { value: new THREE.Color('#0000cc') },
            flowColor: { value: new THREE.Color('#3333ff') }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
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
            
            void main() {
                // Animated flow pattern (reverse direction)
                float flow = sin(vUv.y * 10.0 + time * flowSpeed) * 0.5 + 0.5;
                flow *= perfusionLevel;
                
                vec3 color = mix(baseColor, flowColor, flow);
                
                // Add rim lighting
                vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
                float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
                rim = pow(rim, 3.0);
                color += rim * 0.2;
                
                gl_FragColor = vec4(color, 0.8);
            }
        `
    }), [perfusion]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
            materialRef.current.uniforms.perfusionLevel.value = perfusion / 100;
        }
    });

    const veinsGeometry = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.18, -0.25, -0.02),
            new THREE.Vector3(0.12, -0.12, -0.02),
            new THREE.Vector3(0.05, 0.05, -0.02),
            new THREE.Vector3(0.02, 0.15, -0.02), // Back to heart
        ]);
        return new THREE.TubeGeometry(curve, 20, 0.012, 8, false);
    }, []);

    const veinsGeometry2 = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.18, -0.25, -0.02),
            new THREE.Vector3(-0.12, -0.12, -0.02),
            new THREE.Vector3(-0.05, 0.05, -0.02),
            new THREE.Vector3(-0.02, 0.15, -0.02), // Back to heart
        ]);
        return new THREE.TubeGeometry(curve, 20, 0.012, 8, false);
    }, []);

    return (
        <group>
            <mesh geometry={veinsGeometry}>
                <shaderMaterial ref={materialRef} {...shaderArgs} transparent />
            </mesh>
            <mesh geometry={veinsGeometry2}>
                <shaderMaterial {...shaderArgs} transparent />
            </mesh>
        </group>
    );
}

// Main Scene Component
function AnatomyScene({ heartRate, respiratoryRate, arterialPerfusion, venousPerfusion }: AnatomicalBody3DProps) {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 2]} fov={50} />
            <OrbitControls
                enablePan={false}
                minDistance={1.5}
                maxDistance={3}
                maxPolarAngle={Math.PI / 2}
            />

            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} />
            <pointLight position={[0, 2, 1]} intensity={0.3} color="#ffffff" />

            {/* Anatomical Components */}
            <group rotation={[0, Math.PI * 0.1, 0]}>
                <BodyShell />
                <Heart heartRate={heartRate} />
                <Lungs respiratoryRate={respiratoryRate} />
                <Liver />
                <Kidneys />
                <Stomach />
                <Arteries perfusion={arterialPerfusion} />
                <Veins perfusion={venousPerfusion} />
            </group>
        </>
    );
}

// Main Export Component
export function AnatomicalBody3D(props: AnatomicalBody3DProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Delay mounting to ensure React is fully initialized
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!isReady) {
        return (
            <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-cyan-400 text-sm">Carregando modelo 3D...</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
            <Canvas
                key="anatomy-canvas-simple"
                shadows
                gl={{
                    antialias: true,
                    alpha: true,
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

            {/* Legend Overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 text-xs">
                <div className="grid grid-cols-2 gap-1">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-red-300">Artérias ({props.arterialPerfusion.toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-blue-300">Veias ({props.venousPerfusion.toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-700"></div>
                        <span className="text-red-300">Coração ({props.heartRate} bpm)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                        <span className="text-pink-300">Pulmões ({props.respiratoryRate} rpm)</span>
                    </div>
                </div>
            </div >
        </div >
    );
}
