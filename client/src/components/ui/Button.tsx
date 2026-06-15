import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium transition-all duration-300 rounded-input focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-accent-primary text-text-primary hover:bg-accent-primary/90 hover:shadow-[0_0_15px_rgba(108,99,255,0.4)]',
    secondary: 'bg-bg-card border border-white/10 text-text-primary hover:bg-white/5 dark:border-white/10 light:border-black/10',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
    danger: 'bg-accent-warm text-text-primary hover:bg-accent-warm/90',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
