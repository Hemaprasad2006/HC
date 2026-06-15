import React from 'react';

interface ProgressProps {
  value: number;
  type?: 'linear' | 'circle';
  size?: number;
  strokeWidth?: number;
  color?: string; // Tailwind stroke color e.g. stroke-accent-primary
  children?: React.ReactNode;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  type = 'linear',
  size = 100,
  strokeWidth = 8,
  color = 'stroke-accent-primary',
  children,
}) => {
  const pct = Math.max(0, Math.min(100, value));

  if (type === 'circle') {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            className="stroke-white/10 dark:stroke-white/5 light:stroke-black/5"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`${color} transition-all duration-500 ease-out`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          {children || <span className="font-mono text-lg font-bold">{Math.round(pct)}%</span>}
        </div>
      </div>
    );
  }

  // Linear progress bar
  return (
    <div className="w-full bg-white/10 dark:bg-white/5 light:bg-black/5 rounded-full overflow-hidden h-2.5">
      <div
        className="bg-accent-primary h-full transition-all duration-500 ease-out rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
