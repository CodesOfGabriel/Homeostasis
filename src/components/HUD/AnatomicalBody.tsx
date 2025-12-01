// AnatomicalBody: Corpo humano com sistema venoso realista estilo atlas médico

import { motion } from 'framer-motion';

interface AnatomicalBodyProps {
    venousPerfusion: number; // 0-100
    arterialPerfusion: number; // 0-100
    heartRate: number;
    respiratoryRate: number;
}

export function AnatomicalBody({
    venousPerfusion,
    arterialPerfusion,
    heartRate,
    respiratoryRate,
}: AnatomicalBodyProps) {
    // Cores dinâmicas baseadas na perfusão (incluindo cianose/isquemia)
    const getVeinColor = (perfusion: number) => {
        if (perfusion > 80) return '#3b82f6'; // Azul vibrante (saudável)
        if (perfusion > 60) return '#60a5fa';
        if (perfusion > 40) return '#93c5fd';
        return '#1e3a8a'; // Azul escuro/roxo (cianose/baixa perfusão)
    };

    const getArteryColor = (perfusion: number) => {
        if (perfusion > 80) return '#ef4444'; // Vermelho vivo
        if (perfusion > 60) return '#f87171';
        if (perfusion > 40) return '#fca5a5';
        return '#7f1d1d'; // Vermelho escuro (isquemia)
    };

    // Efeitos de brilho dinâmicos
    const veinGlow = (perfusion: number) =>
        `drop-shadow(0 0 ${perfusion > 50 ? 6 : 2}px rgba(59, 130, 246, ${0.4 + perfusion / 200}))`;

    const arteryGlow = (perfusion: number) =>
        `drop-shadow(0 0 ${perfusion > 50 ? 8 : 3}px rgba(239, 68, 68, ${0.4 + perfusion / 200}))`;

    // Cálculos de tempo para animação (evita divisão por zero)
    const beatDuration = 60 / Math.max(heartRate, 30);
    const breathDuration = 60 / Math.max(respiratoryRate, 8);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-900/50 rounded-xl overflow-hidden p-4">
            <svg
                viewBox="0 0 300 700"
                className="w-full h-full max-h-[90vh]"
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Gradientes para profundidade */}
                    <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
                    </linearGradient>

                    <radialGradient id="heartGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#b91c1c" />
                    </radialGradient>

                    <linearGradient id="brainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#be185d" />
                    </linearGradient>

                    {/* Filtros */}
                    <filter id="organGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* CONTORNO DO CORPO (pele/esqueleto anatômico) */}
                <g id="BodyOutline" opacity="0.22">
                    {/* Cabeça */}
                    <path
                        d="M150 10 C135 10, 125 25, 125 40 C125 55, 135 68, 150 68 C165 68, 175 55, 175 40 C175 25, 165 10, 150 10 Z"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* Tronco (lado esquerdo) */}
                    <path
                        d="M132 70 L128 115 C125 145, 110 170, 110 200 C110 240, 120 280, 125 305 L130 360 C132 390, 125 420, 125 450 C125 490, 130 525, 135 560"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* Tronco (lado direito) */}
                    <path
                        d="M168 70 L172 115 C175 145, 190 170, 190 200 C190 240, 180 280, 175 305 L170 360 C168 390, 175 420, 175 450 C175 490, 170 525, 165 560"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* Braços */}
                    <ellipse cx="92" cy="170" rx="12" ry="40" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1" />
                    <ellipse cx="208" cy="170" rx="12" ry="40" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1" />
                    <ellipse cx="82" cy="245" rx="10" ry="38" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1" />
                    <ellipse cx="218" cy="245" rx="10" ry="38" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1" />

                    {/* Pernas */}
                    <ellipse cx="132" cy="455" rx="18" ry="70" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1.5" />
                    <ellipse cx="168" cy="455" rx="18" ry="70" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1.5" />

                    {/* Pés */}
                    <ellipse cx="128" cy="565" rx="16" ry="18" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1.2" />
                    <ellipse cx="172" cy="565" rx="16" ry="18" fill="url(#skinGradient)" stroke="#94a3b8" strokeWidth="1.2" />
                </g>                {/* ÓRGÃOS PRINCIPAIS */}
                {/* Cérebro */}
                <motion.g
                    id="Brain"
                    animate={{
                        opacity: [0.7, 0.9, 0.7],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <ellipse cx="150" cy="38" rx="28" ry="32" fill="url(#brainGradient)" opacity="0.8" filter="url(#organGlow)" />
                    {/* Sulcos cerebrais */}
                    <path d="M 135 30 Q 145 28, 150 30 T 165 30" stroke="#ec4899" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M 135 42 Q 145 40, 150 42 T 165 42" stroke="#ec4899" strokeWidth="1.5" fill="none" opacity="0.6" />
                </motion.g>

                {/* Pulmões (camada traseira, movimento de respiração) */}
                <motion.g
                    id="Lungs"
                    animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: breathDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {/* Pulmão esquerdo */}
                    <path
                        d="M 145 130 Q 120 130, 110 160 Q 100 210, 145 220 Z"
                        fill="#38bdf8"
                        opacity="0.2"
                        filter="url(#organGlow)"
                    />
                    {/* Pulmão direito */}
                    <path
                        d="M 155 130 Q 180 130, 190 160 Q 200 210, 155 220 Z"
                        fill="#38bdf8"
                        opacity="0.2"
                        filter="url(#organGlow)"
                    />
                </motion.g>

                {/* Coração (camada frontal, pulsação sincronizada) */}
                <motion.g
                    id="Heart"
                    transform="translate(132, 175)"
                    animate={{
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: beatDuration,
                        repeat: Infinity,
                        ease: 'circOut',
                    }}
                >
                    <path
                        d="M 15,10 C 15,0 0,-5 -10,5 C -20,15 -5,35 15,45 C 35,35 50,15 40,5 C 30,-5 15,0 15,10 Z"
                        fill="url(#heartGradient)"
                        stroke="#7f1d1d"
                        strokeWidth="1"
                        filter="url(#organGlow)"
                    />
                </motion.g>

                {/* Fígado */}
                <ellipse cx="160" cy="250" rx="35" ry="25" fill="#92400e" opacity="0.4" filter="url(#organGlow)" />

                {/* Estômago */}
                <ellipse cx="130" cy="265" rx="20" ry="28" fill="#65a30d" opacity="0.3" filter="url(#organGlow)" />

                {/* Rins */}
                <ellipse cx="125" cy="290" rx="12" ry="20" fill="#7c2d12" opacity="0.4" filter="url(#organGlow)" />
                <ellipse cx="175" cy="290" rx="12" ry="20" fill="#7c2d12" opacity="0.4" filter="url(#organGlow)" />

                {/* SISTEMA ARTERIAL (vermelho) com pulsação */}
                <motion.g
                    id="ArterialSystem"
                    stroke={getArteryColor(arterialPerfusion)}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    style={{ filter: arteryGlow(arterialPerfusion) }}
                    animate={{
                        strokeWidth: [2.5, 3, 2.5]
                    }}
                    transition={{
                        duration: beatDuration,
                        repeat: Infinity
                    }}
                >
                    {/* Aorta ascendente */}
                    <path d="M 150 180 L 150 155" strokeWidth="4" />

                    {/* Arco aórtico */}
                    <path d="M 150 155 Q 130 145, 130 125" strokeWidth="3.5" />

                    {/* Carótidas */}
                    <path d="M 140 125 L 135 85" strokeWidth="2.5" />
                    <path d="M 140 125 L 145 85" strokeWidth="2.5" />
                    <path d="M 135 85 Q 135 70, 140 55" strokeWidth="2" />
                    <path d="M 145 85 Q 145 70, 150 55" strokeWidth="2" />

                    {/* Subclávias para braços */}
                    <path d="M 135 130 L 100 145" strokeWidth="2.5" />
                    <path d="M 135 130 L 165 130 L 200 145" strokeWidth="2.5" />
                    <path d="M 100 145 L 85 200" strokeWidth="2" />
                    <path d="M 200 145 L 215 200" strokeWidth="2" />

                    {/* Aorta descendente torácica */}
                    <path d="M 130 155 L 135 250" strokeWidth="4" />

                    {/* Aorta abdominal */}
                    <path d="M 135 250 L 140 350" strokeWidth="3.5" />

                    {/* Artérias ilíacas */}
                    <path d="M 140 350 Q 130 370, 125 390" strokeWidth="3" />
                    <path d="M 140 350 Q 150 370, 175 390" strokeWidth="3" />

                    {/* Artérias femorais */}
                    <path d="M 125 390 L 125 520" strokeWidth="2.5" />
                    <path d="M 175 390 L 175 520" strokeWidth="2.5" />

                    {/* Artérias tibiais */}
                    <path d="M 125 520 L 120 580" strokeWidth="1.5" />
                    <path d="M 175 520 L 180 580" strokeWidth="1.5" />
                </motion.g>

                {/* SISTEMA VENOSO PROFUNDO (azul escuro) */}
                <motion.g
                    id="VeinsDeep"
                    stroke={getVeinColor(venousPerfusion)}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    style={{ filter: veinGlow(venousPerfusion) }}
                    animate={{
                        opacity: [0.6, 0.9, 0.6],
                    }}
                    transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {/* Veia cava superior */}
                    <path d="M 155 155 L 155 110" strokeWidth="5" />

                    {/* Veias jugulares */}
                    <path d="M 145 110 L 140 80 L 138 60" strokeWidth="3" />
                    <path d="M 155 110 L 160 80 L 162 60" strokeWidth="3" />

                    {/* Veias subclávias */}
                    <path d="M 150 120 L 105 140" strokeWidth="3" />
                    <path d="M 155 120 L 195 140" strokeWidth="3" />

                    {/* Veias braquiais */}
                    <path d="M 105 140 L 90 200" strokeWidth="2.5" />
                    <path d="M 195 140 L 210 200" strokeWidth="2.5" />

                    {/* Veia cava inferior */}
                    <path d="M 155 180 L 158 250 L 160 350" strokeWidth="5" />

                    {/* Veias renais */}
                    <path d="M 157 290 L 130 295" strokeWidth="2" />
                    <path d="M 157 290 L 180 295" strokeWidth="2" />

                    {/* Veias ilíacas */}
                    <path d="M 160 350 Q 135 370, 130 390" strokeWidth="3.5" />
                    <path d="M 160 350 Q 165 370, 170 390" strokeWidth="3.5" />

                    {/* Veias femorais */}
                    <path d="M 130 390 L 128 520" strokeWidth="3" />
                    <path d="M 170 390 L 172 520" strokeWidth="3" />

                    {/* Veias poplíteas */}
                    <path d="M 128 520 L 125 555" strokeWidth="2.5" />
                    <path d="M 172 520 L 175 555" strokeWidth="2.5" />

                    {/* Veias tibiais */}
                    <path d="M 125 555 L 122 585" strokeWidth="2" />
                    <path d="M 175 555 L 178 585" strokeWidth="2" />
                </motion.g>

                {/* SISTEMA VENOSO SUPERFICIAL (azul claro com dash) */}
                <motion.g
                    id="VeinsSuperficial"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.7"
                    strokeDasharray="4 6"
                    animate={{
                        strokeDashoffset: [0, -20],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                >
                    {/* Veia jugular externa */}
                    <path d="M 132 90 L 128 65" strokeWidth="1.8" />
                    <path d="M 168 90 L 172 65" strokeWidth="1.8" />

                    {/* Veias cefálicas (braços) */}
                    <path d="M 98 150 L 82 210" strokeWidth="1.8" />
                    <path d="M 202 150 L 218 210" strokeWidth="1.8" />

                    {/* Veias basílicas */}
                    <path d="M 92 155 L 78 215" strokeWidth="1.5" />
                    <path d="M 208 155 L 222 215" strokeWidth="1.5" />

                    {/* Veias do antebraço → radial/ulnar superficiais */}
                    <path d="M 82 210 L 76 245" strokeWidth="1.4" />
                    <path d="M 90 210 L 96 245" strokeWidth="1.4" />
                    <path d="M 218 210 L 224 245" strokeWidth="1.4" />
                    <path d="M 210 210 L 204 245" strokeWidth="1.4" />

                    {/* Arco venoso palmar + veias digitais (mão esquerda) */}
                    <path d="M 72 265 Q 66 273 70 281" strokeWidth="1.3" />
                    <path d="M 80 265 Q 84 273 82 281" strokeWidth="1.3" />
                    <path d="M 68 281 L 66 289" strokeWidth="1.1" />
                    <path d="M 74 281 L 74 289" strokeWidth="1.1" />
                    <path d="M 80 281 L 82 289" strokeWidth="1.1" />

                    {/* Arco venoso palmar + veias digitais (mão direita) */}
                    <path d="M 228 265 Q 234 273 230 281" strokeWidth="1.3" />
                    <path d="M 220 265 Q 216 273 218 281" strokeWidth="1.3" />
                    <path d="M 224 281 L 226 289" strokeWidth="1.1" />
                    <path d="M 218 281 L 218 289" strokeWidth="1.1" />
                    <path d="M 212 281 L 210 289" strokeWidth="1.1" />

                    {/* Veia safena magna (pernas) */}
                    <path d="M 122 395 Q 118 450, 115 520 L 112 570" strokeWidth="2" />
                    <path d="M 178 395 Q 182 450, 185 520 L 188 570" strokeWidth="2" />

                    {/* Veia safena parva */}
                    <path d="M 135 525 L 130 565" strokeWidth="1.5" />
                    <path d="M 165 525 L 170 565" strokeWidth="1.5" />

                    {/* Arco venoso dorsal do pé (esquerdo) */}
                    <path d="M 114 574 Q 120 580 128 574" strokeWidth="1.3" />
                    <path d="M 116 580 L 114 586" strokeWidth="1.1" />
                    <path d="M 122 581 L 122 587" strokeWidth="1.1" />
                    <path d="M 128 580 L 130 586" strokeWidth="1.1" />

                    {/* Arco venoso dorsal do pé (direito) */}
                    <path d="M 172 574 Q 178 580 186 574" strokeWidth="1.3" />
                    <path d="M 174 580 L 172 586" strokeWidth="1.1" />
                    <path d="M 180 581 L 180 587" strokeWidth="1.1" />
                    <path d="M 186 580 L 188 586" strokeWidth="1.1" />
                </motion.g>

                {/* HUD LABELS (estilo blueprint médico) */}
                <g className="text-[8px] font-mono fill-slate-400 select-none" style={{ textTransform: 'uppercase' }}>
                    <text x="180" y="60" className="fill-blue-400 opacity-70">Jugular V.</text>
                    <text x="200" y="190" className="fill-blue-400 opacity-70">Subclavian</text>
                    <text x="85" y="167" className="fill-blue-400 opacity-60" fontSize="8">Axillary</text>
                    <text x="175" y="320" className="fill-blue-400 opacity-70">Vena Cava</text>
                    <text x="205" y="285" className="fill-blue-400 opacity-60" fontSize="8">Renal V.</text>
                    <text x="70" y="360" className="fill-blue-400 opacity-60" fontSize="8">Iliac V.</text>
                    <text x="80" y="450" className="fill-red-400 opacity-70">Femoral A.</text>
                    <text x="195" y="480" className="fill-blue-400 opacity-60" fontSize="8">Popliteal</text>
                    <text x="105" y="595" className="fill-blue-400 opacity-60" fontSize="8">Dorsal arch</text>
                    <text x="50" y="270" className="fill-blue-400 opacity-60" fontSize="8">Palmar arch</text>
                </g>

                {/* ANIMAÇÃO DE FLUXO SANGUÍNEO (Partículas com física real) */}
                <g id="BloodFlowParticles" opacity="0.8">
                    {/* Partícula: Retorno Venoso (Perna → Coração) */}
                    <motion.circle r="2" fill="#60a5fa">
                        <animateMotion
                            dur={`${4 * (60 / heartRate)}s`}
                            repeatCount="indefinite"
                            path="M 115 650 L 115 550 L 115 400 L 140 350 L 140 180"
                            rotate="auto"
                        />
                    </motion.circle>

                    <motion.circle r="2" fill="#60a5fa">
                        <animateMotion
                            dur={`${3.5 * (60 / heartRate)}s`}
                            begin="1s"
                            repeatCount="indefinite"
                            path="M 175 650 L 175 550 L 175 400 L 140 350 L 140 180"
                            rotate="auto"
                        />
                    </motion.circle>

                    {/* Partícula: Saída Arterial (Coração → Cabeça) */}
                    <motion.circle r="2" fill="#fca5a5">
                        <animateMotion
                            dur={`${1.5 * (60 / heartRate)}s`}
                            repeatCount="indefinite"
                            path="M 145 180 L 160 140 L 155 135 L 150 50"
                            rotate="auto"
                        />
                    </motion.circle>

                    {/* Partícula: Saída Arterial (Coração → Pés) */}
                    <motion.circle r="2" fill="#fca5a5">
                        <animateMotion
                            dur={`${3 * (60 / heartRate)}s`}
                            repeatCount="indefinite"
                            path="M 150 180 L 145 280 L 145 350 L 125 400 L 130 650"
                            rotate="auto"
                        />
                    </motion.circle>
                </g>
            </svg>
        </div>
    );
}
