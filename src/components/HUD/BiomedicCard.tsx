// BiomedicCard: Card estilo científico com animações biomédicas

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface BiomedicCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: ReactNode;
    color: string;
    warning?: boolean;
    subtitle?: string;
    gradient?: string;
    pulseRate?: number; // BPM ou taxa fisiológica para sincronizar animação
}

export function BiomedicCard({
    title,
    value,
    unit,
    icon,
    color,
    warning = false,
    subtitle,
    gradient,
    pulseRate,
}: BiomedicCardProps) {
    const colorClass = color.replace('text-', '');
    const [colorName] = colorClass.split('-');

    const bgGradient = gradient || `from-${colorName}-900/20 to-black`;
    const borderColor = warning ? 'border-red-500' : `border-${colorClass}/50`;
    const glowColor = warning ? 'red' : colorName;

    return (
        <motion.div
            className={`relative bg-gradient-to-br ${bgGradient} border-2 ${borderColor} rounded-xl p-4 shadow-lg overflow-hidden`}
            initial={{ opacity: 0, y: 20 }}
            animate={{
                opacity: 1,
                y: 0,
                boxShadow: warning
                    ? ['0 0 20px rgba(239, 68, 68, 0.3)', '0 0 40px rgba(239, 68, 68, 0.6)', '0 0 20px rgba(239, 68, 68, 0.3)']
                    : undefined
            }}
            transition={{
                duration: 0.5,
                boxShadow: { duration: 2, repeat: Infinity }
            }}
            whileHover={{ scale: 1.02 }}
        >
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id={`grid-${title}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1" fill={`var(--${glowColor}-500)`} />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#grid-${title})`} />
                </svg>
            </div>

            {/* Pulse indicator */}
            {pulseRate && (
                <motion.div
                    className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${colorClass}`}
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [1, 0.5, 1],
                    }}
                    transition={{
                        duration: 60 / pulseRate,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}

            {/* Icon with glow */}
            <div className="flex items-center gap-3 mb-3">
                <motion.div
                    className={`text-3xl ${color} relative`}
                    animate={pulseRate ? {
                        scale: [1, 1.1, 1],
                    } : {}}
                    transition={pulseRate ? {
                        duration: 60 / pulseRate,
                        repeat: Infinity,
                        ease: "easeInOut"
                    } : {}}
                >
                    {icon}
                    <div className={`absolute inset-0 blur-xl bg-${colorClass} opacity-50`} />
                </motion.div>
                <div className="flex-1">
                    <div className={`text-xs ${color} font-semibold tracking-wider uppercase opacity-80`}>
                        {title}
                    </div>
                    {subtitle && (
                        <div className="text-[10px] text-gray-500 font-mono">
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>

            {/* Value display */}
            <div className="flex items-baseline gap-2">
                <motion.div
                    className={`text-3xl font-bold ${color} font-mono tracking-tight`}
                    animate={warning ? {
                        color: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(239, 68, 68)'],
                    } : {}}
                    transition={warning ? {
                        duration: 1,
                        repeat: Infinity,
                    } : {}}
                >
                    {typeof value === 'number' ? value.toFixed(0) : value}
                </motion.div>
                {unit && (
                    <div className={`text-sm ${color} opacity-70 font-medium`}>
                        {unit}
                    </div>
                )}
            </div>

            {/* Warning indicator */}
            {warning && (
                <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
                    animate={{
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                    }}
                />
            )}

            {/* Scientific grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="0.5" className={color} />
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeWidth="0.5" className={color} />
                </svg>
            </div>
        </motion.div>
    );
}
