// Enhanced AMPK/mTOR pathway visualization based on scientific diagram
// Shows the detailed molecular cascade with proper interactions

import { motion } from 'framer-motion';

interface AMPKmTORPathwayProps {
    ampk: number; // 0-100 activation level
    mtor: number; // 0-100 activation level
    glucose: number;
    energy: number;
}

export function AMPKmTORPathway({
    ampk,
    mtor,
    glucose,
    energy,
}: AMPKmTORPathwayProps) {
    // Calculate upstream activators
    const lowEnergy = energy < 40;
    const highGlucose = glucose > 120;

    // AMPK upstream: activated by low energy, inhibits mTOR
    const ampkActive = ampk > 50;

    // mTOR upstream: activated by nutrients + growth signals, inhibited by AMPK
    const mtorActive = mtor > 50;

    return (
        <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-purple-500/50 rounded-xl p-6">
            <h3 className="text-purple-400 font-bold mb-4 text-center text-lg">
                AMPK ⇄ mTOR Signaling
            </h3>

            <svg width="100%" height="400" viewBox="0 0 600 400" className="overflow-visible">
                <defs>
                    {/* Arrow marker */}
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3, 0 6"
                            fill="#00FF88"
                        />
                    </marker>

                    {/* Inhibition marker */}
                    <marker
                        id="inhibition"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="5"
                        orient="auto"
                    >
                        <line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="10"
                            stroke="#FF4444"
                            strokeWidth="3"
                        />
                    </marker>

                    {/* Glow filter for active pathways */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* ============ TOP: ENERGY STRESS SENSORS ============ */}

                {/* Energy Stress Signal */}
                <g>
                    <rect
                        x="50"
                        y="20"
                        width="120"
                        height="40"
                        rx="8"
                        fill={lowEnergy ? '#FF6B6B' : '#4A5568'}
                        stroke={lowEnergy ? '#FF4444' : '#718096'}
                        strokeWidth="2"
                    />
                    <text x="110" y="35" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                        Energy Stress
                    </text>
                    <text x="110" y="50" textAnchor="middle" fill="white" fontSize="10">
                        {lowEnergy ? '🔴 LOW' : '🟢 OK'}
                    </text>
                </g>

                {/* Glucose Signal */}
                <g>
                    <rect
                        x="430"
                        y="20"
                        width="120"
                        height="40"
                        rx="8"
                        fill={highGlucose ? '#4ECDC4' : '#4A5568'}
                        stroke={highGlucose ? '#00FF88' : '#718096'}
                        strokeWidth="2"
                    />
                    <text x="490" y="35" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                        Glucose
                    </text>
                    <text x="490" y="50" textAnchor="middle" fill="white" fontSize="10">
                        {glucose.toFixed(0)} mg/dL
                    </text>
                </g>

                {/* ============ MIDDLE: AMPK & mTOR CORES ============ */}

                {/* AMPK Central Node */}
                <g>
                    <motion.ellipse
                        cx="150"
                        cy="180"
                        rx="70"
                        ry="50"
                        fill={ampkActive ? '#FF6B6B' : '#8B5A8B'}
                        stroke={ampkActive ? '#FF4444' : '#A78BA7'}
                        strokeWidth="3"
                        filter={ampkActive ? 'url(#glow)' : ''}
                        animate={{
                            opacity: ampkActive ? [1, 0.7, 1] : 1,
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                        }}
                    />
                    <text x="150" y="175" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                        AMPK
                    </text>
                    <text x="150" y="195" textAnchor="middle" fill="white" fontSize="12">
                        {ampk.toFixed(0)}% active
                    </text>

                    {/* Phosphorylation indicator */}
                    {ampkActive && (
                        <g>
                            <circle cx="190" cy="160" r="8" fill="#FFD700" />
                            <text x="190" y="163" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">
                                P
                            </text>
                        </g>
                    )}
                </g>

                {/* mTOR Central Node */}
                <g>
                    <motion.ellipse
                        cx="450"
                        cy="180"
                        rx="70"
                        ry="50"
                        fill={mtorActive ? '#4ECDC4' : '#4A6FA5'}
                        stroke={mtorActive ? '#00FF88' : '#6B93C0'}
                        strokeWidth="3"
                        filter={mtorActive ? 'url(#glow)' : ''}
                        animate={{
                            opacity: mtorActive ? [1, 0.7, 1] : 1,
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                        }}
                    />
                    <text x="450" y="175" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                        mTOR
                    </text>
                    <text x="450" y="195" textAnchor="middle" fill="white" fontSize="12">
                        {mtor.toFixed(0)}% active
                    </text>

                    {/* Raptor complex indicator */}
                    {mtorActive && (
                        <text x="450" y="210" textAnchor="middle" fill="#FFD700" fontSize="9">
                            + Raptor
                        </text>
                    )}
                </g>

                {/* ============ CONNECTIONS ============ */}

                {/* Energy Stress → AMPK (activation) */}
                <motion.line
                    x1="110"
                    y1="60"
                    x2="130"
                    y2="140"
                    stroke={lowEnergy ? '#FF4444' : '#718096'}
                    strokeWidth={lowEnergy ? '3' : '2'}
                    markerEnd="url(#arrowhead)"
                    animate={{
                        strokeDasharray: lowEnergy ? ['5,5', '0,10'] : '0',
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                    }}
                />

                {/* Glucose → mTOR (activation) */}
                <motion.line
                    x1="490"
                    y1="60"
                    x2="470"
                    y2="140"
                    stroke={highGlucose ? '#00FF88' : '#718096'}
                    strokeWidth={highGlucose ? '3' : '2'}
                    markerEnd="url(#arrowhead)"
                    animate={{
                        strokeDasharray: highGlucose ? ['5,5', '0,10'] : '0',
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                    }}
                />

                {/* AMPK ⊣ mTOR (inhibition) */}
                <motion.line
                    x1="220"
                    y1="180"
                    x2="380"
                    y2="180"
                    stroke={ampkActive ? '#FF4444' : '#718096'}
                    strokeWidth={ampkActive ? '4' : '2'}
                    markerEnd="url(#inhibition)"
                    animate={{
                        strokeDasharray: ampkActive ? ['10,5', '0,15'] : '0',
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                    }}
                />
                <text x="300" y="170" textAnchor="middle" fill="#FF4444" fontSize="12" fontWeight="bold">
                    ⊣ inhibits
                </text>

                {/* ============ DOWNSTREAM EFFECTS ============ */}

                {/* AMPK Downstream */}
                <g>
                    {/* Autophagy */}
                    <rect x="30" y="280" width="100" height="35" rx="6"
                        fill={ampkActive ? '#FF6B6B' : '#4A5568'}
                        stroke={ampkActive ? '#FF4444' : '#718096'} strokeWidth="2" />
                    <text x="80" y="300" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                        Autophagy
                    </text>
                    <text x="80" y="312" textAnchor="middle" fill="white" fontSize="9">
                        {ampkActive ? '↑↑ Active' : 'Basal'}
                    </text>

                    {/* Lipid Oxidation */}
                    <rect x="160" y="280" width="110" height="35" rx="6"
                        fill={ampkActive ? '#FF6B6B' : '#4A5568'}
                        stroke={ampkActive ? '#FF4444' : '#718096'} strokeWidth="2" />
                    <text x="215" y="300" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                        Lipid Oxidation
                    </text>
                    <text x="215" y="312" textAnchor="middle" fill="white" fontSize="9">
                        {ampkActive ? '↑↑ Active' : 'Basal'}
                    </text>

                    {/* Arrows from AMPK */}
                    <line x1="120" y1="230" x2="80" y2="280" stroke="#FF6B6B" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    <line x1="150" y1="230" x2="215" y2="280" stroke="#FF6B6B" strokeWidth="2" markerEnd="url(#arrowhead)" />
                </g>

                {/* mTOR Downstream */}
                <g>
                    {/* Protein Synthesis */}
                    <rect x="400" y="280" width="120" height="35" rx="6"
                        fill={mtorActive ? '#4ECDC4' : '#4A5568'}
                        stroke={mtorActive ? '#00FF88' : '#718096'} strokeWidth="2" />
                    <text x="460" y="295" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                        Protein Synthesis
                    </text>
                    <text x="460" y="307" textAnchor="middle" fill="white" fontSize="9">
                        {mtorActive ? '↑↑ Active' : 'Basal'}
                    </text>
                    <text x="460" y="317" textAnchor="middle" fill="#FFD700" fontSize="8">
                        via S6K/4E-BP1
                    </text>

                    {/* Arrow from mTOR */}
                    <line x1="450" y1="230" x2="460" y2="280" stroke="#4ECDC4" strokeWidth="2" markerEnd="url(#arrowhead)" />
                </g>

                {/* ============ STATUS INDICATORS ============ */}

                {/* AMPK Status */}
                <g>
                    <rect x="10" y="350" width="260" height="40" rx="8"
                        fill={ampkActive ? '#2D1B1B' : '#1A202C'}
                        stroke={ampkActive ? '#FF4444' : '#4A5568'} strokeWidth="2" />
                    <text x="140" y="367" textAnchor="middle" fill={ampkActive ? '#FF6B6B' : '#718096'}
                        fontSize="11" fontWeight="bold">
                        AMPK State: {ampkActive ? 'CATABOLIC ⚡' : 'Resting'}
                    </text>
                    <text x="140" y="382" textAnchor="middle" fill="#A0AEC0" fontSize="9">
                        {ampkActive ? 'Energy deficit → breakdown mode' : 'Energy balanced'}
                    </text>
                </g>

                {/* mTOR Status */}
                <g>
                    <rect x="330" y="350" width="260" height="40" rx="8"
                        fill={mtorActive ? '#1B2D2D' : '#1A202C'}
                        stroke={mtorActive ? '#00FF88' : '#4A5568'} strokeWidth="2" />
                    <text x="460" y="367" textAnchor="middle" fill={mtorActive ? '#4ECDC4' : '#718096'}
                        fontSize="11" fontWeight="bold">
                        mTOR State: {mtorActive ? 'ANABOLIC 💪' : 'Resting'}
                    </text>
                    <text x="460" y="382" textAnchor="middle" fill="#A0AEC0" fontSize="9">
                        {mtorActive ? 'Nutrients available → growth mode' : 'Growth inhibited'}
                    </text>
                </g>
            </svg>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-purple-500/30">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-gray-400">AMPK: Energy sensor (catabolic)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-cyan-400 rounded"></div>
                        <span className="text-gray-400">mTOR: Growth sensor (anabolic)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">⊣</span>
                        <span className="text-gray-400">Inhibition</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold">→</span>
                        <span className="text-gray-400">Activation</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
