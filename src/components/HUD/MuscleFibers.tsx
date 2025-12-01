// MuscleFibers: Detailed skeletal muscle visualization with fiber types

import { motion } from 'framer-motion';

interface MuscleFibersProps {
    perfusion: number;
    vo2Max: number;
    lactate: number;
    contractionRate: number;
}

export function MuscleFibers({
    perfusion,
    vo2Max,
    lactate,
    contractionRate,
}: MuscleFibersProps) {
    const fiberColor = lactate > 3 ? '#DC143C' : lactate > 2 ? '#FF6347' : '#FF69B4';

    return (
        <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-4">
            <h3 className="text-red-400 font-bold mb-2 text-sm">SKELETAL MUSCLE FIBERS</h3>

            <svg width="200" height="150" viewBox="0 0 200 150">
                {/* Muscle fiber bundles */}
                {[...Array(6)].map((_, i) => {
                    const x = 30 + i * 28;

                    return (
                        <g key={i}>
                            {/* Type I fiber (slow twitch - red) */}
                            <motion.rect
                                x={x}
                                y="30"
                                width="10"
                                height="90"
                                fill="#DC143C"
                                stroke="#FFD700"
                                strokeWidth="1"
                                rx="2"
                                animate={{
                                    height: [90, 85, 90],
                                    y: [30, 32.5, 30],
                                }}
                                transition={{
                                    duration: 1 / contractionRate,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                }}
                            />

                            {/* Type II fiber (fast twitch - pink) */}
                            <motion.rect
                                x={x + 12}
                                y="30"
                                width="10"
                                height="90"
                                fill={fiberColor}
                                stroke="#FFD700"
                                strokeWidth="1"
                                rx="2"
                                animate={{
                                    height: [90, 80, 90],
                                    y: [30, 35, 30],
                                }}
                                transition={{
                                    duration: 0.8 / contractionRate,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                }}
                            />

                            {/* Striations (muscle bands) */}
                            {[0, 1, 2, 3, 4].map((band) => (
                                <line
                                    key={band}
                                    x1={x}
                                    y1={40 + band * 18}
                                    x2={x + 22}
                                    y2={40 + band * 18}
                                    stroke="#000"
                                    strokeWidth="1"
                                    opacity="0.3"
                                />
                            ))}
                        </g>
                    );
                })}

                {/* Capillaries (blood supply) */}
                <motion.path
                    d="M20 50 Q100 45 180 50 M20 80 Q100 75 180 80 M20 110 Q100 105 180 110"
                    stroke="#FF0000"
                    strokeWidth="2"
                    fill="none"
                    opacity={perfusion / 100}
                    animate={{
                        strokeWidth: [1.5, 2.5, 1.5],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                    }}
                />

                {/* Mitochondria indicator */}
                {[...Array(8)].map((_, i) => (
                    <motion.circle
                        key={i}
                        cx={40 + i * 20}
                        cy={25}
                        r="3"
                        fill="#32CD32"
                        animate={{
                            opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.1,
                        }}
                    />
                ))}
            </svg>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                <div>
                    <div className="text-gray-400">Perfusion</div>
                    <div className="text-red-400 font-bold">{perfusion.toFixed(0)}%</div>
                </div>
                <div>
                    <div className="text-gray-400">VO₂ Max</div>
                    <div className="text-cyan-400 font-bold">{vo2Max.toFixed(0)}</div>
                </div>
                <div>
                    <div className="text-gray-400">Lactate</div>
                    <div className="text-yellow-400 font-bold">{lactate.toFixed(1)}</div>
                </div>
                <div>
                    <div className="text-gray-400">Contract</div>
                    <div className="text-green-400 font-bold">{contractionRate.toFixed(1)}Hz</div>
                </div>
            </div>
        </div>
    );
}
