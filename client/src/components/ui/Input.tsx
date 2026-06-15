import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</label>}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-text-muted flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          className={`w-full py-2.5 px-3 ${icon ? 'pl-10' : 'pl-3'} glass-input text-sm ${error ? 'border-accent-warm focus:border-accent-warm' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-accent-warm font-medium mt-0.5">{error}</span>}
    </div>
  );
};
