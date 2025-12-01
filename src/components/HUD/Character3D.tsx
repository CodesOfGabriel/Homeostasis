// Character3D: Personagem humanóide com aspecto 3D e perfusão detalhada

import { motion } from 'framer-motion';

interface Character3DProps {
    brainPerfusion: number;
    heartPerfusion: number;
    musclePerfusion: number;
    organsPerfusion: number;
    respiratoryRate: number;
}

export function Character3D({
    brainPerfusion,
    heartPerfusion,
    musclePerfusion,
    organsPerfusion,
    respiratoryRate,
}: Character3DProps) {
    const getPerfusionColor = (perfusion: number) => {
        if (perfusion > 85) return '#10b981'; // Verde brilhante
        if (perfusion > 70) return '#22c55e'; // Verde
        if (perfusion > 55) return '#eab308'; // Amarelo
        if (perfusion > 40) return '#f97316'; // Laranja
        return '#ef4444'; // Vermelho
    };

    const getPerfusionOpacity = (perfusion: number) => {
        return 0.4 + (perfusion / 100) * 0.6;
    };

    const breathDuration = 60 / respiratoryRate;

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                width="280"
                height="500"
                viewBox="0 0 280 500"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Sombras e profundidade */}
                    <filter id="shadow3d">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                        <feOffset dx="2" dy="2" result="offsetblur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.5" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Gradientes para profundidade */}
                    <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
                    </linearGradient>
                </defs>

                {/* Sombra do corpo */}
                <ellipse
                    cx="140"
                    cy="480"
                    rx="80"
                    ry="15"
                    fill="#000"
                    opacity="0.3"
                />

                {/* CORPO PRINCIPAL */}
                <g filter="url(#shadow3d)">
                    {/* Tronco com profundidade 3D */}
                    <motion.path
                        d="M140 120 
               L100 130 Q95 140 95 160 L95 280 
               Q95 300 100 310 L110 360 
               Q112 370 115 380 L115 450 
               L165 450 L165 380 
               Q168 370 170 360 L180 310 
               Q185 300 185 280 L185 160 
               Q185 140 180 130 L140 120 Z"
                        fill="url(#skinGradient)"
                        stroke="#d97706"
                        strokeWidth="2"
                        animate={{
                            d: [
                                "M140 120 L100 130 Q95 140 95 160 L95 280 Q95 300 100 310 L110 360 Q112 370 115 380 L115 450 L165 450 L165 380 Q168 370 170 360 L180 310 Q185 300 185 280 L185 160 Q185 140 180 130 L140 120 Z",
                                "M140 120 L100 130 Q95 138 95 156 L95 278 Q95 298 100 308 L110 358 Q112 368 115 378 L115 450 L165 450 L165 378 Q168 368 170 358 L180 308 Q185 298 185 278 L185 156 Q185 138 180 130 L140 120 Z",
                                "M140 120 L100 130 Q95 140 95 160 L95 280 Q95 300 100 310 L110 360 Q112 370 115 380 L115 450 L165 450 L165 380 Q168 370 170 360 L180 310 Q185 300 185 280 L185 160 Q185 140 180 130 L140 120 Z"
                            ]
                        }}
                        transition={{
                            duration: breathDuration,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />

                    {/* Cabeça com sombreamento 3D */}
                    <ellipse
                        cx="140"
                        cy="70"
                        rx="35"
                        ry="40"
                        fill="url(#skinGradient)"
                        stroke="#d97706"
                        strokeWidth="2"
                    />

                    {/* Pescoço */}
                    <rect
                        x="125"
                        y="105"
                        width="30"
                        height="20"
                        fill="#f59e0b"
                        stroke="#d97706"
                        strokeWidth="1"
                        rx="5"
                    />

                    {/* Braço Esquerdo com sombreamento */}
                    <motion.path
                        d="M100 140 Q70 160 60 200 L55 280 Q54 290 56 300 L60 350"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="16"
                        strokeLinecap="round"
                        opacity={getPerfusionOpacity(musclePerfusion)}
                        animate={{
                            stroke: getPerfusionColor(musclePerfusion)
                        }}
                    />

                    {/* Braço Direito com sombreamento */}
                    <motion.path
                        d="M180 140 Q210 160 220 200 L225 280 Q226 290 224 300 L220 350"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="16"
                        strokeLinecap="round"
                        opacity={getPerfusionOpacity(musclePerfusion)}
                        animate={{
                            stroke: getPerfusionColor(musclePerfusion)
                        }}
                    />

                    {/* Perna Esquerda */}
                    <motion.path
                        d="M115 450 L110 480 Q108 490 110 495"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="18"
                        strokeLinecap="round"
                        opacity={getPerfusionOpacity(musclePerfusion)}
                        animate={{
                            stroke: getPerfusionColor(musclePerfusion)
                        }}
                    />

                    {/* Perna Direita */}
                    <motion.path
                        d="M165 450 L170 480 Q172 490 170 495"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="18"
                        strokeLinecap="round"
                        opacity={getPerfusionOpacity(musclePerfusion)}
                        animate={{
                            stroke: getPerfusionColor(musclePerfusion)
                        }}
                    />
                </g>

                {/* ÓRGÃOS INTERNOS COM PERFUSÃO */}

                {/* Cérebro (dentro da cabeça) */}
                <motion.ellipse
                    cx="140"
                    cy="60"
                    rx="28"
                    ry="32"
                    fill={getPerfusionColor(brainPerfusion)}
                    opacity={getPerfusionOpacity(brainPerfusion)}
                    animate={{
                        opacity: [
                            getPerfusionOpacity(brainPerfusion) * 0.7,
                            getPerfusionOpacity(brainPerfusion),
                            getPerfusionOpacity(brainPerfusion) * 0.7,
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                />

                {/* Coração (lado esquerdo do tórax) */}
                <motion.path
                    d="M130 160 Q120 155 115 160 Q110 165 115 175 L130 195 L145 175 Q150 165 145 160 Q140 155 130 160 Z"
                    fill={getPerfusionColor(heartPerfusion)}
                    opacity={getPerfusionOpacity(heartPerfusion)}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [
                            getPerfusionOpacity(heartPerfusion) * 0.8,
                            getPerfusionOpacity(heartPerfusion),
                            getPerfusionOpacity(heartPerfusion) * 0.8,
                        ],
                    }}
                    transition={{
                        duration: 60 / 70, // ~70 BPM baseline
                        repeat: Infinity,
                    }}
                    style={{ originX: '130px', originY: '175px' }}
                />

                {/* Pulmões (ambos os lados) */}
                <motion.g
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: breathDuration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{ originX: '140px', originY: '180px' }}
                >
                    {/* Pulmão Direito */}
                    <ellipse
                        cx="160"
                        cy="180"
                        rx="18"
                        ry="35"
                        fill="#3b82f6"
                        opacity="0.5"
                    />
                    {/* Pulmão Esquerdo */}
                    <ellipse
                        cx="120"
                        cy="180"
                        rx="15"
                        ry="32"
                        fill="#3b82f6"
                        opacity="0.5"
                    />
                </motion.g>

                {/* Fígado */}
                <motion.ellipse
                    cx="150"
                    cy="240"
                    rx="25"
                    ry="20"
                    fill={getPerfusionColor(organsPerfusion)}
                    opacity={getPerfusionOpacity(organsPerfusion) * 0.7}
                    animate={{
                        opacity: [
                            getPerfusionOpacity(organsPerfusion) * 0.5,
                            getPerfusionOpacity(organsPerfusion) * 0.7,
                            getPerfusionOpacity(organsPerfusion) * 0.5,
                        ],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                    }}
                />

                {/* Estômago */}
                <ellipse
                    cx="125"
                    cy="245"
                    rx="18"
                    ry="22"
                    fill={getPerfusionColor(organsPerfusion)}
                    opacity={getPerfusionOpacity(organsPerfusion) * 0.6}
                />

                {/* Rins (ambos os lados) */}
                <ellipse
                    cx="110"
                    cy="270"
                    rx="8"
                    ry="15"
                    fill={getPerfusionColor(organsPerfusion)}
                    opacity={getPerfusionOpacity(organsPerfusion) * 0.7}
                />
                <ellipse
                    cx="170"
                    cy="270"
                    rx="8"
                    ry="15"
                    fill={getPerfusionColor(organsPerfusion)}
                    opacity={getPerfusionOpacity(organsPerfusion) * 0.7}
                />

                {/* Sistema nervoso central (coluna) */}
                <motion.line
                    x1="140"
                    y1="110"
                    x2="140"
                    y2="360"
                    stroke={getPerfusionColor(brainPerfusion)}
                    strokeWidth="3"
                    opacity="0.4"
                    animate={{
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity
                    }}
                />

                {/* Músculos dos braços (bíceps) */}
                <motion.ellipse
                    cx="70"
                    cy="200"
                    rx="12"
                    ry="25"
                    fill={getPerfusionColor(musclePerfusion)}
                    opacity={getPerfusionOpacity(musclePerfusion) * 0.6}
                />
                <motion.ellipse
                    cx="210"
                    cy="200"
                    rx="12"
                    ry="25"
                    fill={getPerfusionColor(musclePerfusion)}
                    opacity={getPerfusionOpacity(musclePerfusion) * 0.6}
                />

                {/* Músculos das pernas (quadríceps) */}
                <motion.ellipse
                    cx="115"
                    cy="400"
                    rx="15"
                    ry="35"
                    fill={getPerfusionColor(musclePerfusion)}
                    opacity={getPerfusionOpacity(musclePerfusion) * 0.6}
                />
                <motion.ellipse
                    cx="165"
                    cy="400"
                    rx="15"
                    ry="35"
                    fill={getPerfusionColor(musclePerfusion)}
                    opacity={getPerfusionOpacity(musclePerfusion) * 0.6}
                />

                {/* Efeito de pulso circulatório */}
                <motion.circle
                    cx="140"
                    cy="250"
                    r="50"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    opacity="0"
                    animate={{
                        r: [50, 100],
                        opacity: [0.6, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut'
                    }}
                />
            </svg>

            {/* Legenda de perfusão */}
            <div className="absolute bottom-2 left-0 right-0">
                <div className="grid grid-cols-2 gap-2 text-xs px-4">
                    <div className="bg-black/60 rounded p-1 flex justify-between">
                        <span className="text-gray-400">🧠 Cérebro:</span>
                        <span className={`font-bold ${brainPerfusion > 80 ? 'text-green-400' : brainPerfusion > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Math.round(brainPerfusion)}%
                        </span>
                    </div>
                    <div className="bg-black/60 rounded p-1 flex justify-between">
                        <span className="text-gray-400">❤️ Coração:</span>
                        <span className={`font-bold ${heartPerfusion > 80 ? 'text-green-400' : heartPerfusion > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Math.round(heartPerfusion)}%
                        </span>
                    </div>
                    <div className="bg-black/60 rounded p-1 flex justify-between">
                        <span className="text-gray-400">💪 Músculos:</span>
                        <span className={`font-bold ${musclePerfusion > 80 ? 'text-green-400' : musclePerfusion > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Math.round(musclePerfusion)}%
                        </span>
                    </div>
                    <div className="bg-black/60 rounded p-1 flex justify-between">
                        <span className="text-gray-400">🫀 Órgãos:</span>
                        <span className={`font-bold ${organsPerfusion > 80 ? 'text-green-400' : organsPerfusion > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Math.round(organsPerfusion)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
