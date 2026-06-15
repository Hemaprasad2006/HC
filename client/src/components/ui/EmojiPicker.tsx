import React, { useState } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

const EMOJIS = [
  '🧘', '💧', '📚', '🏋️', '✍️', '🏃', '🚴', '🏊', '🥗', '🍎',
  '😴', '🛌', '💡', '⏰', '📅', '📝', '💼', '🎨', '🎵', '🌿',
  '☕', '🍵', '🚿', '🧹', '🚶', '🔋', '🎯', '🔥', '☀️', '🌌'
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  value,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full flex flex-col gap-1.5 relative">
      {label && <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</label>}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 w-full py-2.5 px-3 glass-input text-left text-sm text-text-primary"
        >
          <span className="text-xl">{value || <Smile size={18} />}</span>
          <span className="text-text-secondary text-xs">Choose icon...</span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 z-50 mt-2 p-3 w-64 glass-panel bg-bg-card shadow-2xl border border-white/10">
              <div className="grid grid-cols-6 gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onChange(emoji);
                      setIsOpen(false);
                    }}
                    className={`text-xl p-1.5 hover:bg-white/10 rounded transition-colors duration-150 ${value === emoji ? 'bg-accent-primary/20' : ''}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
