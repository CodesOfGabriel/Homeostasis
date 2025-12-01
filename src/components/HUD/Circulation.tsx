// Circulation component: SVG with paths representing blood flow.
// Animated particles flow through blood vessels using Framer Motion.

import { motion } from 'framer-motion';

interface CirculationProps {
  cardiacOutput: number;
  bloodOxygen: number;
}

export function Circulation({
  cardiacOutput,
  bloodOxygen,
}: CirculationProps) {
  // Flow speed based on cardiac output - MELHORADO
  const baseSpeed = 5; // segundos baseline
  const speedMultiplier = Math.max(0.5, cardiacOutput / 5); // mínimo 0.5x
  const flowDuration = baseSpeed / speedMultiplier; // CO alto = fluxo rápido

  // Color based on oxygenation
  const bloodColor =
    bloodOxygen > 95
      ? '#ef4444' // bright red (oxygenated)
      : bloodOxygen > 90
        ? '#f97316' // orange
        : '#3b82f6'; // blue (deoxygenated)

  const particles = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="relative w-full h-full">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 400"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        {/* Main vessels */}
        <defs>
          <linearGradient id="vesselGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={bloodColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={bloodColor} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Arterial system (left side) */}
        <path
          id="artery"
          d="M150 50 Q100 150 120 250 L120 380"
          stroke="url(#vesselGradient)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />

        {/* Venous system (right side) */}
        <path
          id="vein"
          d="M150 380 Q200 250 180 150 L180 50"
          stroke="#3b82f6"
          strokeWidth="12"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
        />

        {/* Capillary network (middle) */}
        <path
          d="M120 200 Q150 210 180 200"
          stroke={bloodColor}
          strokeWidth="3"
          fill="none"
          opacity="0.5"
        />

        {/* Blood particles flowing through arteries */}
        {particles.map((i) => (
          <motion.circle
            key={`artery-${i}`}
            r="4"
            fill={bloodColor}
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: '100%' }}
            transition={{
              duration: flowDuration,
              repeat: Infinity,
              delay: i * (flowDuration / particles.length),
              ease: 'linear',
            }}
            style={{
              offsetPath: 'path("M150 50 Q100 150 120 250 L120 380")',
            }}
          />
        ))}

        {/* Blood particles flowing through veins */}
        {particles.map((i) => (
          <motion.circle
            key={`vein-${i}`}
            r="4"
            fill="#3b82f6"
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: '100%' }}
            transition={{
              duration: flowDuration * 1.2,
              repeat: Infinity,
              delay: i * (flowDuration / particles.length),
              ease: 'linear',
            }}
            style={{
              offsetPath: 'path("M150 380 Q200 250 180 150 L180 50")',
            }}
          />
        ))}
      </svg>

      {/* CO display */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-lg font-bold text-cyan-400">
          {cardiacOutput.toFixed(1)} L/min
        </div>
        <div className="text-xs text-gray-400">Cardiac Output</div>
      </div>
    </div>
  );
}
