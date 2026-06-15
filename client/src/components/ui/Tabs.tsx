import React from 'react';
import { motion } from 'framer-motion';

interface TabOption {
  id: string;
  label: string;
}

interface TabsProps {
  options: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  options,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex border-b border-white/10 ${className}`}>
      {options.map((opt) => {
        const isActive = opt.id === activeTab;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="relative px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus:outline-none"
            style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {opt.label}
            {isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-primary"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
