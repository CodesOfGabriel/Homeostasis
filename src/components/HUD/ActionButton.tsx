// ActionButton: button to execute neurohormonal actions

import { motion } from 'framer-motion';

interface ActionButtonProps {
  label: string;
  description: string;
  onClick: () => void;
  cooldown?: number;
  maxCooldown?: number;
  disabled?: boolean;
  cost?: number;
}

export function ActionButton({
  label,
  description,
  onClick,
  cooldown = 0,
  maxCooldown = 20,
  disabled = false,
  cost,
}: ActionButtonProps) {
  const isOnCooldown = cooldown > 0;
  const cooldownPercent = (cooldown / maxCooldown) * 100;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isOnCooldown}
      className={`relative px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
        disabled || isOnCooldown
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-neuro-purple to-neuro-blue text-white hover:shadow-lg hover:scale-105'
      }`}
      whileHover={!disabled && !isOnCooldown ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isOnCooldown ? { scale: 0.95 } : {}}
      title={description}
    >
      {/* Cooldown overlay */}
      {isOnCooldown && (
        <div
          className="absolute inset-0 bg-gray-900 rounded-lg transition-all"
          style={{
            width: `${cooldownPercent}%`,
            opacity: 0.7,
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-2">
        <span>{label}</span>
        {cost !== undefined && cost > 0 && (
          <span className="text-xs text-yellow-400">⚡{cost}</span>
        )}
        {isOnCooldown && (
          <span className="text-xs">({Math.ceil(cooldown)}s)</span>
        )}
      </div>
    </motion.button>
  );
}
