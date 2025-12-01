// Body silhouette with organ perfusion visualization
// Organs glow based on their perfusion levels

import { motion } from 'framer-motion';

interface BodySilhouetteProps {
  brainPerfusion: number;
  heartPerfusion: number;
  musclePerfusion: number;
  organsPerfusion: number;
}

export function BodySilhouette({
  brainPerfusion,
  heartPerfusion,
  musclePerfusion,
  organsPerfusion,
}: BodySilhouetteProps) {
  const getPerfusionColor = (perfusion: number) => {
    if (perfusion > 80) return '#10b981'; // green
    if (perfusion > 60) return '#f59e0b'; // yellow
    if (perfusion > 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getPerfusionOpacity = (perfusion: number) => {
    return 0.3 + (perfusion / 100) * 0.7;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        width="200"
        height="400"
        viewBox="0 0 200 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body outline */}
        <path
          d="M100 40 C90 40 85 50 85 60 L85 120 L70 120 L70 200 L75 280 L75 360 L85 395 L115 395 L125 360 L125 280 L130 200 L130 120 L115 120 L115 60 C115 50 110 40 100 40 Z"
          fill="none"
          stroke="#475569"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Brain */}
        <motion.ellipse
          cx="100"
          cy="50"
          rx="18"
          ry="20"
          fill={getPerfusionColor(brainPerfusion)}
          opacity={getPerfusionOpacity(brainPerfusion)}
          animate={{
            opacity: [
              getPerfusionOpacity(brainPerfusion) * 0.8,
              getPerfusionOpacity(brainPerfusion),
              getPerfusionOpacity(brainPerfusion) * 0.8,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
        <text
          x="100"
          y="52"
          textAnchor="middle"
          fontSize="10"
          fill="white"
          fontWeight="bold"
        >
          🧠
        </text>

        {/* Heart */}
        <motion.ellipse
          cx="95"
          cy="110"
          rx="12"
          ry="15"
          fill={getPerfusionColor(heartPerfusion)}
          opacity={getPerfusionOpacity(heartPerfusion)}
          animate={{
            opacity: [
              getPerfusionOpacity(heartPerfusion) * 0.7,
              getPerfusionOpacity(heartPerfusion),
              getPerfusionOpacity(heartPerfusion) * 0.7,
            ],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
          }}
        />
        <text
          x="95"
          y="113"
          textAnchor="middle"
          fontSize="10"
          fill="white"
        >
          ❤️
        </text>

        {/* Organs (digestive, liver, kidneys) */}
        <motion.rect
          x="80"
          y="140"
          width="40"
          height="60"
          rx="8"
          fill={getPerfusionColor(organsPerfusion)}
          opacity={getPerfusionOpacity(organsPerfusion)}
          animate={{
            opacity: [
              getPerfusionOpacity(organsPerfusion) * 0.8,
              getPerfusionOpacity(organsPerfusion),
              getPerfusionOpacity(organsPerfusion) * 0.8,
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />

        {/* Muscles (arms and legs) */}
        <motion.g
          opacity={getPerfusionOpacity(musclePerfusion)}
          animate={{
            opacity: [
              getPerfusionOpacity(musclePerfusion) * 0.8,
              getPerfusionOpacity(musclePerfusion),
              getPerfusionOpacity(musclePerfusion) * 0.8,
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
          }}
        >
          {/* Left arm */}
          <path
            d="M70 120 L50 180"
            stroke={getPerfusionColor(musclePerfusion)}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Right arm */}
          <path
            d="M130 120 L150 180"
            stroke={getPerfusionColor(musclePerfusion)}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Left leg */}
          <path
            d="M85 280 L85 390"
            stroke={getPerfusionColor(musclePerfusion)}
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Right leg */}
          <path
            d="M115 280 L115 390"
            stroke={getPerfusionColor(musclePerfusion)}
            strokeWidth="12"
            strokeLinecap="round"
          />
        </motion.g>
      </svg>

      {/* Perfusion legend */}
      <div className="absolute bottom-4 text-xs text-gray-400 space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getPerfusionColor(brainPerfusion) }}
          />
          <span>Brain: {Math.round(brainPerfusion)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getPerfusionColor(musclePerfusion) }}
          />
          <span>Muscles: {Math.round(musclePerfusion)}%</span>
        </div>
      </div>
    </div>
  );
}
