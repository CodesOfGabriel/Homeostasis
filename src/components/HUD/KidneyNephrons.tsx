// KidneyNephrons: Detailed kidney visualization with nephron structures

import { motion } from 'framer-motion';

interface KidneyNephronsProps {
    perfusion: number;
    osmolarity: number;
    filtrationRate: number;
}

export function KidneyNephrons({
    perfusion,
    osmolarity,
    filtrationRate,
}: KidneyNephronsProps) {
    return (
        <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
            <h3 className="text-purple-400 font-bold mb-2 text-sm">KIDNEY NEPHRONS</h3>

            <svg width="200" height="150" viewBox="0 0 200 150">
                {/* Kidney outline */}
                <path
                    d="M60 20 Q40 20 30 40 L30 110 Q40 130 60 130 Q70 120 70 110 L70 40 Q70 20 60 20 Z"
                    fill="#8B0000"
                    stroke="#9932CC"
                    strokeWidth="2"
                    opacity="0.5"
                />

                {/* Nephrons (kidney functional units) */}
                {[...Array(3)].map((_, i) => {
                    const y = 40 + i * 30;

                    return (
                        <g key={i}>
                            {/* Glomerulus (filter) */}
                            <motion.circle
                                cx="50"
                                cy={y}
                                r="8"
                                fill="#DC143C"
                                stroke="#FFD700"
                                strokeWidth="2"
                                animate={{
                                    scale: [1, 1.15, 1],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                }}
                            />

                            {/* Tubule (curved path) */}
                            <motion.path
                                d={`M58 ${y} Q80 ${y + 10} 90 ${y + 5} Q100 ${y} 110 ${y + 8}`}
                                stroke="#4169E1"
                                strokeWidth="3"
                                fill="none"
                                animate={{
                                    strokeWidth: [2, 4, 2],
                                    opacity: [0.5, 0.9, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />

                            {/* Collecting duct */}
                            <line
                                x1="110"
                                y1={y + 8}
                                x2="130"
                                y2={y + 15}
                                stroke="#1E90FF"
                                strokeWidth="2"
                            />
                        </g>
                    );
                })}

                {/* Blood vessels */}
                <motion.path
                    d="M20 30 Q50 35 80 30 M20 70 Q50 75 80 70 M20 110 Q50 115 80 110"
                    stroke="#FF0000"
                    strokeWidth="2"
                    fill="none"
                    opacity={perfusion / 100}
                    animate={{
                        opacity: [perfusion / 120, perfusion / 80, perfusion / 120],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                    }}
                />

                {/* Urine flow indicator */}
                <motion.circle
                    r="3"
                    fill="#FFD700"
                    animate={{
                        offsetDistance: ['0%', '100%'],
                    }}
                    transition={{
                        duration: 2 / (filtrationRate / 50),
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    style={{
                        offsetPath: 'path("M130 50 L180 80")',
                    }}
                />
            </svg>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                    <div className="text-gray-400">Perfusion</div>
                    <div className="text-purple-400 font-bold">{perfusion.toFixed(0)}%</div>
                </div>
                <div>
                    <div className="text-gray-400">Osmolarity</div>
                    <div className="text-cyan-400 font-bold">{osmolarity.toFixed(0)}</div>
                </div>
                <div>
                    <div className="text-gray-400">GFR</div>
                    <div className="text-green-400 font-bold">{filtrationRate.toFixed(0)}</div>
                </div>
            </div>
        </div>
    );
}
