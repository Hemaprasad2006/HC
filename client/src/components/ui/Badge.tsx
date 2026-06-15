import React from 'react';

interface BadgeProps {
  color?: 'violet' | 'mint' | 'coral' | 'gold' | 'gray';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  color = 'violet',
  children,
  className = '',
}) => {
  const colors = {
    violet: 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20',
    mint: 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20',
    coral: 'bg-accent-warm/10 text-accent-warm border border-accent-warm/20',
    gold: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
    gray: 'bg-white/5 text-text-secondary border border-white/10 dark:border-white/10 light:border-black/10',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};
