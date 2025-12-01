// Heart component: animated SVG showing heart beat based on HR.
// Beat speed = 60 / heartRate

import { motion } from 'framer-motion';

interface HeartProps {
  heartRate: number;
  perfusion: number;
}

export function Heart({ heartRate, perfusion }: HeartProps) {
  // Calculate beat duration from heart rate
  const beatDuration = 60 / heartRate; // seconds per beat

  // Color based on perfusion
  const heartColor =
    perfusion > 80
      ? '#ef4444'
      : perfusion > 60
      ? '#f97316'
      : '#991b1b';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.g
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: beatDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ originX: '50%', originY: '50%' }}
        >
          {/* Heart path */}
          <path
            d="M50,85 C50,85 20,60 20,40 C20,25 30,20 40,25 C45,27.5 50,35 50,35 C50,35 55,27.5 60,25 C70,20 80,25 80,40 C80,60 50,85 50,85 Z"
            fill={heartColor}
            stroke="#7c3aed"
            strokeWidth="2"
          />
          {/* Glow effect */}
          <motion.path
            d="M50,85 C50,85 20,60 20,40 C20,25 30,20 40,25 C45,27.5 50,35 50,35 C50,35 55,27.5 60,25 C70,20 80,25 80,40 C80,60 50,85 50,85 Z"
            fill="none"
            stroke={heartColor}
            strokeWidth="1"
            opacity={0.6}
            animate={{
              strokeWidth: [1, 3, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: beatDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.g>
      </svg>

      {/* HR display */}
      <div className="absolute bottom-0 text-center">
        <div className="text-2xl font-bold text-red-500">
          {Math.round(heartRate)}
        </div>
        <div className="text-xs text-gray-400">BPM</div>
      </div>
    </div>
  );
}
