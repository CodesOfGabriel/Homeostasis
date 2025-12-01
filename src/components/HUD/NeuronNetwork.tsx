// NeuronNetwork: Detailed neuron visualization with synaptic activity

import { motion } from 'framer-motion';

interface NeuronNetworkProps {
    brainPerfusion: number;
    glucose: number;
    neurotransmitters: number;
}

export function NeuronNetwork({
    brainPerfusion,
    glucose,
    neurotransmitters,
}: NeuronNetworkProps) {
    return (
        <div className="bg-gray-900 border-2 border-blue-500 rounded-lg p-4">
            <h3 className="text-blue-400 font-bold mb-2 text-sm">NEURONS</h3>

            <svg width="200" height="150" viewBox="0 0 200 150">
                {/* Three interconnected neurons */}
                {[
                    { x: 50, y: 50, id: 0 },
                    { x: 100, y: 80, id: 1 },
                    { x: 150, y: 50, id: 2 },
                ].map((neuron) => (
                    <g key={neuron.id}>
                        {/* Cell body (soma) */}
                        <motion.circle
                            cx={neuron.x}
                            cy={neuron.y}
                            r="12"
                            fill="#1E90FF"
                            stroke="#00BFFF"
                            strokeWidth="2"
                            animate={{
                                scale: [1, 1.1, 1],
                                strokeWidth: [2, 3, 2],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: neuron.id * 0.3,
                            }}
                        />

                        {/* Nucleus */}
                        <circle
                            cx={neuron.x}
                            cy={neuron.y}
                            r="5"
                            fill="#000080"
                            opacity="0.7"
                        />

                        {/* Dendrites (inputs) */}
                        {[...Array(4)].map((_, i) => {
                            const angle = (i * Math.PI * 2) / 4;
                            const dx = Math.cos(angle) * 20;
                            const dy = Math.sin(angle) * 20;

                            return (
                                <motion.path
                                    key={i}
                                    d={`M${neuron.x} ${neuron.y} Q${neuron.x + dx / 2} ${neuron.y + dy / 2} ${neuron.x + dx} ${neuron.y + dy}`}
                                    stroke="#4169E1"
                                    strokeWidth="2"
                                    fill="none"
                                    animate={{
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        delay: i * 0.2 + neuron.id * 0.3,
                                    }}
                                />
                            );
                        })}

                        {/* Axon (output) */}
                        <motion.path
                            d={`M${neuron.x} ${neuron.y + 12} L${neuron.x} ${neuron.y + 40}`}
                            stroke="#00CED1"
                            strokeWidth="3"
                            fill="none"
                        />

                        {/* Axon terminals */}
                        {[-8, 0, 8].map((offset, i) => (
                            <circle
                                key={i}
                                cx={neuron.x + offset}
                                cy={neuron.y + 42}
                                r="3"
                                fill="#FFD700"
                            />
                        ))}
                    </g>
                ))}

                {/* Synaptic connections */}
                <motion.line
                    x1="62"
                    y1="50"
                    x2="88"
                    y2="80"
                    stroke="#00FF00"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    animate={{
                        strokeDashoffset: [0, -8],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />

                <motion.line
                    x1="112"
                    y1="80"
                    x2="138"
                    y2="50"
                    stroke="#00FF00"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    animate={{
                        strokeDashoffset: [0, -8],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: 0.4,
                    }}
                />

                {/* Neurotransmitter particles */}
                {[...Array(5)].map((_, i) => (
                    <motion.circle
                        key={i}
                        r="2"
                        fill="#FFD700"
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: 'linear',
                        }}
                    >
                        <animateMotion
                            dur="1.5s"
                            repeatCount="indefinite"
                            begin={`${i * 0.3}s`}
                            path="M62 50 L88 80"
                        />
                    </motion.circle>
                ))}

                {/* Myelin sheath indicator */}
                {[0, 1, 2].map((i) => (
                    <rect
                        key={i}
                        x="48"
                        y={62 + i * 8}
                        width="4"
                        height="4"
                        fill="#FFE4B5"
                        opacity="0.6"
                    />
                ))}
            </svg>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                    <div className="text-gray-400">Perfusion</div>
                    <div className="text-blue-400 font-bold">{brainPerfusion.toFixed(0)}%</div>
                </div>
                <div>
                    <div className="text-gray-400">Glucose</div>
                    <div className="text-yellow-400 font-bold">{glucose.toFixed(0)}</div>
                </div>
                <div>
                    <div className="text-gray-400">NT Level</div>
                    <div className="text-green-400 font-bold">{neurotransmitters.toFixed(0)}%</div>
                </div>
            </div>
        </div>
    );
}
