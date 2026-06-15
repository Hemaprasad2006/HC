import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  children,
  className = '',
  ...props
}) => {
  const baseStyle = variant === 'glass' ? 'glass-card' : 'bg-bg-card border border-white/10 rounded-card p-5';
  
  return (
    <div className={`${baseStyle} p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};
