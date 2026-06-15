import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="w-full flex flex-col gap-1.5 relative">
      {label && <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full py-2.5 px-3 glass-input text-sm text-text-primary text-left"
        >
          <span>{selectedOption ? selectedOption.label : 'Select option...'}</span>
          <ChevronDown size={16} className="text-text-secondary" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-60 overflow-y-auto glass-panel bg-bg-card shadow-2xl border border-white/10">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors duration-150 ${value === opt.value ? 'bg-accent-primary/20 text-text-primary' : 'text-text-secondary'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
