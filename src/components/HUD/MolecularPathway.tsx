// MolecularPathway: Visualização de vias moleculares com animações GSAP

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Activity, Zap, TrendingUp, Flame } from 'lucide-react';

interface MolecularPathwayProps {
    pathwayName: string;
    activity: number; // 0-100
    nodes: PathwayNode[];
    color?: string;
}

interface PathwayNode {
    id: string;
    label: string;
    active: boolean;
    position: { x: number; y: number };
}

export function MolecularPathway({
    pathwayName,
    activity,
    nodes,
    color = 'cyan'
}: MolecularPathwayProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        if (!svgRef.current || !pathRef.current) return;

        // Animação de fluxo molecular usando GSAP
        const path = pathRef.current;
        const pathLength = path.getTotalLength();

        gsap.set(path, {
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength,
        });

        gsap.to(path, {
            strokeDashoffset: 0,
            duration: 2,
            ease: 'power2.inOut',
            repeat: -1,
            repeatDelay: 1,
        });

        // Animar nós baseado em atividade
        const activeNodes = svgRef.current.querySelectorAll('.pathway-node');
        activeNodes.forEach((node, index) => {
            gsap.to(node, {
                scale: 1.2,
                opacity: 0.8,
                duration: 0.5,
                delay: index * 0.3,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut',
            });
        });
    }, [activity]);

    const getIcon = () => {
        switch (pathwayName.toLowerCase()) {
            case 'ampk': return <Zap className="w-6 h-6" />;
            case 'mtor': return <TrendingUp className="w-6 h-6" />;
            case 'nrf2': return <Flame className="w-6 h-6" />;
            default: return <Activity className="w-6 h-6" />;
        }
    };

    return (
        <div className={`bg-gradient-to-br from-${color}-900/20 to-black border-2 border-${color}-500/50 rounded-2xl p-6 shadow-xl`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`text-${color}-400`}>
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className={`text-${color}-400 font-bold text-lg tracking-wider`}>
                            VIA {pathwayName.toUpperCase()}
                        </h3>
                        <div className="text-xs text-gray-500 font-mono">
                            Atividade: {activity.toFixed(0)}%
                        </div>
                    </div>
                </div>
                <div className={`text-2xl font-bold ${activity > 70 ? 'text-green-400' : activity > 40 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {activity.toFixed(0)}%
                </div>
            </div>

            {/* SVG Pathway visualization */}
            <svg
                ref={svgRef}
                className="w-full h-48"
                viewBox="0 0 400 200"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id={`pathway-gradient-${pathwayName}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={`var(--${color}-500)`} stopOpacity="0.3" />
                        <stop offset="50%" stopColor={`var(--${color}-400)`} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={`var(--${color}-500)`} stopOpacity="0.3" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Connection path */}
                <path
                    ref={pathRef}
                    d="M 20 100 Q 100 50, 180 100 T 380 100"
                    fill="none"
                    stroke={`url(#pathway-gradient-${pathwayName})`}
                    strokeWidth="3"
                    filter="url(#glow)"
                />

                {/* Nodes */}
                {nodes.map((node) => (
                    <g key={node.id} className="pathway-node" transform={`translate(${node.position.x}, ${node.position.y})`}>
                        <circle
                            r="15"
                            fill={node.active ? `var(--${color}-500)` : 'rgba(0,0,0,0.5)'}
                            stroke={`var(--${color}-400)`}
                            strokeWidth="2"
                            filter="url(#glow)"
                        />
                        <text
                            y="40"
                            textAnchor="middle"
                            className={`text-xs fill-${color}-400 font-mono`}
                            style={{ fontSize: '10px' }}
                        >
                            {node.label}
                        </text>
                    </g>
                ))}

                {/* Flowing particles */}
                {[...Array(5)].map((_, i) => (
                    <motion.circle
                        key={i}
                        r="3"
                        fill={`var(--${color}-400)`}
                        filter="url(#glow)"
                        initial={{ offsetDistance: '0%' }}
                        animate={{ offsetDistance: '100%' }}
                        transition={{
                            duration: 3,
                            delay: i * 0.6,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    >
                        <animateMotion
                            dur="3s"
                            repeatCount="indefinite"
                            begin={`${i * 0.6}s`}
                            path="M 20 100 Q 100 50, 180 100 T 380 100"
                        />
                    </motion.circle>
                ))}
            </svg>

            {/* Activity bar */}
            <div className="mt-4">
                <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-gray-800">
                    <motion.div
                        className={`h-full bg-gradient-to-r from-${color}-600 to-${color}-400`}
                        initial={{ width: 0 }}
                        animate={{ width: `${activity}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
            </div>
        </div>
    );
}
