// RealTimeChart: Time-series graph for physiological parameters

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface DataPoint {
    time: number;
    value: number;
}

interface RealTimeChartProps {
    title: string;
    currentValue: number;
    unit: string;
    color: string;
    min: number;
    max: number;
}

export function RealTimeChart({
    title,
    currentValue,
    unit,
    color,
    min,
    max,
}: RealTimeChartProps) {
    const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
    const maxPoints = 50; // Show last 50 data points

    useEffect(() => {
        setDataPoints((prev) => {
            const newPoint = { time: Date.now(), value: currentValue };
            const updated = [...prev, newPoint];

            // Keep only last maxPoints
            if (updated.length > maxPoints) {
                updated.shift();
            }

            return updated;
        });
    }, [currentValue]);

    // Convert data points to SVG path
    const getPath = () => {
        if (dataPoints.length < 2) return '';

        const width = 280;
        const height = 80;
        const padding = 10;

        const xScale = (width - padding * 2) / (maxPoints - 1);
        const yScale = (height - padding * 2) / (max - min);

        const points = dataPoints.map((point, i) => {
            const x = padding + i * xScale;
            const y = height - padding - (point.value - min) * yScale;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    return (
        <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-cyan-400 font-bold text-sm">{title}</h4>
                <div className="text-right">
                    <span className={`text-xl font-bold ${color}`}>
                        {currentValue.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{unit}</span>
                </div>
            </div>

            <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                    <line
                        key={y}
                        x1="10"
                        y1={y}
                        x2="290"
                        y2={y}
                        stroke="#2D3748"
                        strokeWidth="1"
                    />
                ))}

                {/* Min/Max labels */}
                <text x="5" y="15" fill="#718096" fontSize="10">{max}</text>
                <text x="5" y="95" fill="#718096" fontSize="10">{min}</text>

                {/* Chart path */}
                {dataPoints.length > 1 && (
                    <motion.path
                        d={getPath()}
                        stroke={color}
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                    />
                )}

                {/* Current value indicator */}
                {dataPoints.length > 0 && (
                    <motion.circle
                        cx={290 - 10}
                        cy={
                            100 -
                            10 -
                            ((currentValue - min) / (max - min)) * 80
                        }
                        r="4"
                        fill={color}
                        animate={{
                            scale: [1, 1.5, 1],
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                        }}
                    />
                )}
            </svg>
        </div>
    );
}
