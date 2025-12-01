// ParameterCard: displays a vital parameter with title, value and unit

interface ParameterCardProps {
  title: string;
  value: number | string;
  unit: string;
  color?: string;
  icon?: string;
  warning?: boolean;
}

export function ParameterCard({
  title,
  value,
  unit,
  color = 'text-cyan-400',
  icon,
  warning = false,
}: ParameterCardProps) {
  const displayValue =
    typeof value === 'number' ? Math.round(value * 10) / 10 : value;

  return (
    <div
      className={`relative bg-gradient-to-br from-gray-900/80 to-black border-2 ${warning ? 'border-red-500/70 shadow-neon-red' : 'border-cyan-500/30'
        } rounded-xl p-4 backdrop-blur-sm transition-all hover:border-cyan-500/60`}
    >
      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${warning ? 'border-red-500' : 'border-cyan-500/50'
        } rounded-tr-xl`}></div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
          {icon && <span className="mr-1 text-sm">{icon}</span>}
          {title}
        </h3>
        {warning && <span className="text-red-500 text-xl animate-pulse">⚠️</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${color} font-mono`}>{displayValue}</span>
        <span className="text-xs text-gray-600 font-mono">{unit}</span>
      </div>

      {/* Bottom line accent */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${warning ? 'bg-red-500' : 'bg-cyan-500/50'
        } w-1/3`}></div>
    </div>
  );
}
