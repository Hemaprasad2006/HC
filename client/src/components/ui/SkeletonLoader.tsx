import React from 'react';

interface SkeletonProps {
  type?: 'card' | 'list' | 'circle' | 'line';
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  type = 'line',
  className = '',
}) => {
  const baseClass = 'animate-pulse bg-white/10 dark:bg-white/5 light:bg-black/5 rounded';

  if (type === 'card') {
    return (
      <div className={`p-5 glass-panel flex flex-col gap-3 w-full ${className}`}>
        <div className={`${baseClass} h-6 w-1/3`} />
        <div className={`${baseClass} h-20 w-full`} />
        <div className="flex gap-2 justify-between mt-2">
          <div className={`${baseClass} h-8 w-20 rounded-full`} />
          <div className={`${baseClass} h-8 w-20 rounded-full`} />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`flex flex-col gap-2.5 w-full ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center p-3 border border-white/5 rounded-input">
            <div className={`${baseClass} h-8 w-8 rounded-full`} />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className={`${baseClass} h-4 w-1/2`} />
              <div className={`${baseClass} h-3 w-1/4`} />
            </div>
            <div className={`${baseClass} h-6 w-12 rounded-full`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'circle') {
    return <div className={`${baseClass} rounded-full ${className}`} />;
  }

  return <div className={`${baseClass} h-4 w-full ${className}`} />;
};
