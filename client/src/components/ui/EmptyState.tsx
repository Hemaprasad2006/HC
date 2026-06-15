import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-card bg-white/[0.01] ${className}`}>
      {icon && <div className="text-text-muted mb-4 p-3 bg-white/5 rounded-full">{icon}</div>}
      <h3 className="font-display font-bold text-lg text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
