// LiverTissue: Detailed liver visualization with cellular structure

import { motion } from 'framer-motion';

interface LiverTissueProps {
    perfusion: number;
    glucose: number;
    detoxification: number;
}

export function LiverTissue({
    perfusion,
    glucose,
    detoxification,
}: LiverTissueProps) {
    const liverColor = perfusion > 80 ? '#8B4513' : perfusion > 60 ? '#A0522D' : '#654321';

    return (
        <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-4">
            <h3 className="text-cyan-400 font-bold mb-2 text-sm">LIVER TISSUE</h3>

            <svg width="200" height="150" viewBox="0 0 200 150">
                {/* Liver outline */}
                <motion.path
                    d="M30 40 Q50 20 100 30 Q150 35 170 50 L170 110 Q150 130 100 120 Q50 125 30 110 Z"
                    fill={liverColor}
                    stroke="#06b6d4"
                    strokeWidth="2"
                    opacity={0.6}
                    animate={{
                        opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                />

                {/* Hepatocytes (liver cells) */}
                {[...Array(12)].map((_, i) => {
                    const row = Math.floor(i / 4);
                    const col = i % 4;
                    const x = 50 + col * 30;
                    const y = 50 + row * 25;

                    return (
                        <motion.g key={i}>
                            <motion.circle
                                cx={x}
                                cy={y}
                                r="8"
                                fill="#CD853F"
                                stroke="#FFD700"
                                strokeWidth="1"
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.7, 1, 0.7],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                }}
                            />
                            {/* Nucleus */}
                            <circle cx={x} cy={y} r="3" fill="#8B4513" opacity="0.8" />
                        </motion.g>
                    );
                })}

                {/* Blood vessels */}
                <motion.path
                    d="M20 50 Q100 45 180 50"
                    stroke="#DC143C"
                    strokeWidth="3"
                    fill="none"
                    opacity={perfusion / 100}
                    animate={{
                        strokeWidth: [2, 4, 2],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                    }}
                />

                {/* Bile ducts */}
                <path
                    d="M50 80 L150 80"
                    stroke="#9ACD32"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.5"
                />
            </svg>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                    <div className="text-gray-400">Perfusion</div>
                    <div className="text-cyan-400 font-bold">{perfusion.toFixed(0)}%</div>
                </div>
                <div>
                    <div className="text-gray-400">Glucose</div>
                    <div className="text-yellow-400 font-bold">{glucose.toFixed(0)}</div>
                </div>
                <div>
                    <div className="text-gray-400">Detox</div>
                    <div className="text-green-400 font-bold">{detoxification.toFixed(0)}%</div>
                </div>
            </div>
        </div>
    );
}
