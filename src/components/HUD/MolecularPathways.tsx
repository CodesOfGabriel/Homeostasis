// MolecularPathways: Visualization of cellular signaling pathways

import { motion } from 'framer-motion';

interface MolecularPathwaysProps {
    nrf2: number;
    mtor: number;
    ampk: number;
    nfkb: number;
}

export function MolecularPathways({
    nrf2,
    mtor,
    ampk,
    nfkb,
}: MolecularPathwaysProps) {
    const getPathwayColor = (activation: number) => {
        if (activation > 70) return '#00FF00';
        if (activation > 40) return '#FFD700';
        return '#FF4500';
    };

    const pathways = [
        { name: 'Nrf2', value: nrf2, description: 'Antioxidant Response', y: 20 },
        { name: 'mTOR', value: mtor, description: 'Growth & Metabolism', y: 60 },
        { name: 'AMPK', value: ampk, description: 'Energy Sensor', y: 100 },
        { name: 'NF-κB', value: nfkb, description: 'Inflammation', y: 140 },
    ];

    return (
        <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
            <h3 className="text-purple-400 font-bold mb-2">MOLECULAR PATHWAYS</h3>

            <svg width="100%" height="180" viewBox="0 0 300 180">
                {pathways.map((pathway, i) => (
                    <g key={i}>
                        {/* Pathway name */}
                        <text
                            x="10"
                            y={pathway.y}
                            fill="#A0AEC0"
                            fontSize="12"
                            fontWeight="bold"
                        >
                            {pathway.name}
                        </text>

                        {/* Background bar */}
                        <rect
                            x="70"
                            y={pathway.y - 10}
                            width="200"
                            height="8"
                            fill="#2D3748"
                            rx="4"
                        />

                        {/* Activation level bar */}
                        <motion.rect
                            x="70"
                            y={pathway.y - 10}
                            width={(pathway.value / 100) * 200}
                            height="8"
                            fill={getPathwayColor(pathway.value)}
                            rx="4"
                            animate={{
                                width: [(pathway.value / 100) * 200, (pathway.value / 100) * 200],
                            }}
                            transition={{
                                duration: 0.5,
                            }}
                        />

                        {/* Value text */}
                        <text
                            x="280"
                            y={pathway.y}
                            fill={getPathwayColor(pathway.value)}
                            fontSize="11"
                            fontWeight="bold"
                        >
                            {pathway.value.toFixed(0)}%
                        </text>

                        {/* Description */}
                        <text
                            x="70"
                            y={pathway.y + 12}
                            fill="#718096"
                            fontSize="9"
                        >
                            {pathway.description}
                        </text>

                        {/* Activation indicator */}
                        {pathway.value > 60 && (
                            <motion.circle
                                cx="65"
                                cy={pathway.y - 6}
                                r="4"
                                fill={getPathwayColor(pathway.value)}
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                }}
                            />
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}
