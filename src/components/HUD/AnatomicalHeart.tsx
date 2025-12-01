// AnatomicalHeart: Coração anatômico detalhado com átrios, ventrículos e válvulas

import { motion } from 'framer-motion';

interface AnatomicalHeartProps {
    heartRate: number;
    perfusion: number;
    bloodOxygen: number;
}

export function AnatomicalHeart({ heartRate, perfusion, bloodOxygen }: AnatomicalHeartProps) {
    const beatDuration = 60 / heartRate;

    // Cores baseadas em perfusão e oxigenação
    const arterialColor = bloodOxygen > 95 ? '#ef4444' : bloodOxygen > 90 ? '#f97316' : '#dc2626';
    const venousColor = '#3b82f6';
    const muscleColor = perfusion > 80 ? '#991b1b' : perfusion > 60 ? '#7f1d1d' : '#450a0a';

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                width="200"
                height="220"
                viewBox="0 0 200 220"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Gradientes para vasos */}
                    <linearGradient id="arterialGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={arterialColor} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={arterialColor} stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="venousGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={venousColor} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={venousColor} stopOpacity="0.6" />
                    </linearGradient>
                    <radialGradient id="muscleGradient">
                        <stop offset="0%" stopColor={muscleColor} stopOpacity="1" />
                        <stop offset="100%" stopColor={muscleColor} stopOpacity="0.7" />
                    </radialGradient>
                </defs>

                {/* Grupo principal com animação de batimento */}
                <motion.g
                    animate={{
                        scale: [1, 1.08, 1],
                    }}
                    transition={{
                        duration: beatDuration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{ originX: '50%', originY: '50%' }}
                >
                    {/* ÁTRIO DIREITO (sangue venoso - azul) */}
                    <motion.path
                        d="M100 40 Q130 35 145 50 Q150 60 145 70 L135 85 Q130 90 120 88 L100 85 Z"
                        fill="url(#venousGradient)"
                        stroke="#1e3a8a"
                        strokeWidth="2"
                        animate={{
                            d: [
                                "M100 40 Q130 35 145 50 Q150 60 145 70 L135 85 Q130 90 120 88 L100 85 Z",
                                "M100 40 Q132 37 147 52 Q152 62 147 72 L137 87 Q132 92 122 90 L100 87 Z",
                                "M100 40 Q130 35 145 50 Q150 60 145 70 L135 85 Q130 90 120 88 L100 85 Z"
                            ]
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            times: [0, 0.3, 1]
                        }}
                    />

                    {/* ÁTRIO ESQUERDO (sangue arterial - vermelho) */}
                    <motion.path
                        d="M100 40 Q70 35 55 50 Q50 60 55 70 L65 85 Q70 90 80 88 L100 85 Z"
                        fill="url(#arterialGradient)"
                        stroke="#7f1d1d"
                        strokeWidth="2"
                        animate={{
                            d: [
                                "M100 40 Q70 35 55 50 Q50 60 55 70 L65 85 Q70 90 80 88 L100 85 Z",
                                "M100 40 Q68 37 53 52 Q48 62 53 72 L63 87 Q68 92 78 90 L100 87 Z",
                                "M100 40 Q70 35 55 50 Q50 60 55 70 L65 85 Q70 90 80 88 L100 85 Z"
                            ]
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            times: [0, 0.3, 1]
                        }}
                    />

                    {/* VENTRÍCULO DIREITO (mais musculoso - azul escuro) */}
                    <motion.path
                        d="M100 85 L120 88 Q130 95 135 110 Q140 135 130 160 Q120 180 100 190 L100 85 Z"
                        fill="url(#muscleGradient)"
                        stroke="#1e3a8a"
                        strokeWidth="2.5"
                        animate={{
                            d: [
                                "M100 85 L120 88 Q130 95 135 110 Q140 135 130 160 Q120 180 100 190 L100 85 Z",
                                "M100 87 L122 90 Q133 98 138 115 Q143 140 133 165 Q123 185 100 195 L100 87 Z",
                                "M100 85 L120 88 Q130 95 135 110 Q140 135 130 160 Q120 180 100 190 L100 85 Z"
                            ]
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            times: [0, 0.4, 1]
                        }}
                    />

                    {/* VENTRÍCULO ESQUERDO (mais musculoso e espesso - vermelho escuro) */}
                    <motion.path
                        d="M100 85 L80 88 Q70 95 65 110 Q60 135 70 160 Q80 180 100 190 L100 85 Z"
                        fill="url(#muscleGradient)"
                        stroke="#7f1d1d"
                        strokeWidth="3"
                        animate={{
                            d: [
                                "M100 85 L80 88 Q70 95 65 110 Q60 135 70 160 Q80 180 100 190 L100 85 Z",
                                "M100 87 L78 90 Q67 98 62 115 Q57 140 67 165 Q77 185 100 195 L100 87 Z",
                                "M100 85 L80 88 Q70 95 65 110 Q60 135 70 160 Q80 180 100 190 L100 85 Z"
                            ]
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            times: [0, 0.4, 1]
                        }}
                    />

                    {/* SEPTO INTERVENTRICULAR */}
                    <path
                        d="M100 85 L100 190"
                        stroke="#450a0a"
                        strokeWidth="2"
                        opacity="0.8"
                    />

                    {/* AORTA (saída do VE - sangue oxigenado) */}
                    <motion.path
                        d="M85 75 Q80 60 75 50 Q70 40 65 30 Q62 25 60 20"
                        fill="none"
                        stroke={arterialColor}
                        strokeWidth="8"
                        opacity="0.9"
                        animate={{
                            strokeWidth: [8, 10, 8],
                            opacity: [0.9, 1, 0.9]
                        }}
                        transition={{
                            duration: beatDuration * 0.3,
                            repeat: Infinity,
                            ease: 'easeOut'
                        }}
                    />

                    {/* ARTÉRIA PULMONAR (saída do VD - sangue venoso) */}
                    <motion.path
                        d="M115 75 Q120 60 125 50 Q130 40 135 30 Q138 25 140 20"
                        fill="none"
                        stroke={venousColor}
                        strokeWidth="7"
                        opacity="0.8"
                        animate={{
                            strokeWidth: [7, 9, 7],
                            opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                            duration: beatDuration * 0.3,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: beatDuration * 0.1
                        }}
                    />

                    {/* VEIA CAVA SUPERIOR */}
                    <path
                        d="M140 35 Q145 40 145 50"
                        fill="none"
                        stroke={venousColor}
                        strokeWidth="6"
                        opacity="0.7"
                    />

                    {/* VEIAS PULMONARES (retorno ao AE) */}
                    <path
                        d="M60 35 Q55 40 55 50"
                        fill="none"
                        stroke={arterialColor}
                        strokeWidth="5"
                        opacity="0.7"
                    />

                    {/* VÁLVULA TRICÚSPIDE (VD) */}
                    <motion.ellipse
                        cx="110"
                        cy="87"
                        rx="8"
                        ry="3"
                        fill="#1e40af"
                        opacity="0.6"
                        animate={{
                            ry: [3, 1, 3]
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            times: [0, 0.3, 1]
                        }}
                    />

                    {/* VÁLVULA MITRAL (VE) */}
                    <motion.ellipse
                        cx="90"
                        cy="87"
                        rx="8"
                        ry="3"
                        fill="#991b1b"
                        opacity="0.6"
                        animate={{
                            ry: [3, 1, 3]
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            times: [0, 0.3, 1]
                        }}
                    />

                    {/* Pulso visual no batimento */}
                    <motion.circle
                        cx="100"
                        cy="120"
                        r="60"
                        fill="none"
                        stroke={arterialColor}
                        strokeWidth="2"
                        opacity="0"
                        animate={{
                            r: [60, 80],
                            opacity: [0.8, 0],
                        }}
                        transition={{
                            duration: beatDuration,
                            repeat: Infinity,
                            ease: 'easeOut'
                        }}
                    />
                </motion.g>

                {/* Labels anatômicos */}
                <text x="145" y="60" fontSize="8" fill="#60a5fa" fontWeight="bold">AD</text>
                <text x="45" y="60" fontSize="8" fill="#f87171" fontWeight="bold">AE</text>
                <text x="125" y="140" fontSize="8" fill="#3b82f6" fontWeight="bold">VD</text>
                <text x="65" y="140" fontSize="8" fill="#dc2626" fontWeight="bold">VE</text>
            </svg>

            {/* Informações detalhadas */}
            <div className="absolute bottom-0 left-0 right-0 text-center space-y-1">
                <div className="flex justify-center gap-4 text-xs">
                    <div>
                        <div className="text-red-400 font-bold">{Math.round(heartRate)}</div>
                        <div className="text-gray-500 text-[10px]">BPM</div>
                    </div>
                    <div>
                        <div className="text-purple-400 font-bold">{Math.round(perfusion)}%</div>
                        <div className="text-gray-500 text-[10px]">Perfusão</div>
                    </div>
                    <div>
                        <div className="text-cyan-400 font-bold">{Math.round(bloodOxygen)}%</div>
                        <div className="text-gray-500 text-[10px]">SpO₂</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
