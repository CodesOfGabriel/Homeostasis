// Lungs component: animated lungs with oxygenation visualization
// Blood color changes from blue to red based on bloodOxygen

import { motion } from 'framer-motion';

interface LungsProps {
  respiratoryRate: number;
  bloodOxygen: number;
  tidalVolume: number;
}

export function Lungs({
  respiratoryRate,
  bloodOxygen,
  tidalVolume,
}: LungsProps) {
  // Breathing cycle duration
  const breathDuration = 60 / respiratoryRate; // seconds per breath

  // Lung color based on oxygenation
  const oxygenColor =
    bloodOxygen > 95
      ? '#ef4444' // red (well oxygenated)
      : bloodOxygen > 90
      ? '#f97316' // orange
      : '#3b82f6'; // blue (hypoxic)

  // Expansion factor based on tidal volume
  const expansionScale = 1 + (tidalVolume - 500) / 2000;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        width="160"
        height="140"
        viewBox="0 0 160 140"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.g
          animate={{
            scale: [1, expansionScale, 1],
          }}
          transition={{
            duration: breathDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ originX: '50%', originY: '50%' }}
        >
          {/* Left lung */}
          <motion.ellipse
            cx="60"
            cy="70"
            rx="35"
            ry="50"
            fill={oxygenColor}
            opacity={0.7}
            stroke="#7c3aed"
            strokeWidth="2"
            animate={{
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: breathDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Right lung */}
          <motion.ellipse
            cx="100"
            cy="70"
            rx="35"
            ry="50"
            fill={oxygenColor}
            opacity={0.7}
            stroke="#7c3aed"
            strokeWidth="2"
            animate={{
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: breathDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Trachea */}
          <rect
            x="75"
            y="10"
            width="10"
            height="30"
            fill="#94a3b8"
            stroke="#7c3aed"
            strokeWidth="2"
            rx="2"
          />

          {/* Bronchi */}
          <path
            d="M80 40 L60 60"
            stroke="#94a3b8"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M80 40 L100 60"
            stroke="#94a3b8"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Alveoli detail (small circles) */}
          {[...Array(4)].map((_, i) => (
            <motion.circle
              key={`left-${i}`}
              cx={45 + i * 10}
              cy={60 + (i % 2) * 20}
              r="3"
              fill={oxygenColor}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: breathDuration,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
          {[...Array(4)].map((_, i) => (
            <motion.circle
              key={`right-${i}`}
              cx={105 + i * 10}
              cy={60 + (i % 2) * 20}
              r="3"
              fill={oxygenColor}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: breathDuration,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.g>
      </svg>

      {/* RR and SpO2 display */}
      <div className="absolute bottom-0 text-center">
        <div className="flex gap-4 text-sm">
          <div>
            <div className="text-lg font-bold text-cyan-400">
              {Math.round(respiratoryRate)}
            </div>
            <div className="text-xs text-gray-400">RR</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-500">
              {Math.round(bloodOxygen)}%
            </div>
            <div className="text-xs text-gray-400">SpO₂</div>
          </div>
        </div>
      </div>
    </div>
  );
}
