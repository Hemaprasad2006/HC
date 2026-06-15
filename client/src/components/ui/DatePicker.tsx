import React from 'react';
import { format } from 'date-fns';

interface DatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onChange,
  label,
  error,
}) => {
  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      onChange(null);
    } else {
      // Create date object correctly without local timezone shifts
      const [year, month, day] = value.split('-').map(Number);
      onChange(new Date(year, month - 1, day));
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</label>}
      <input
        type="date"
        value={dateString}
        onChange={handleDateChange}
        className={`w-full py-2.5 px-3 glass-input text-sm text-text-primary ${error ? 'border-accent-warm' : ''}`}
      />
      {error && <span className="text-xs text-accent-warm font-medium mt-0.5">{error}</span>}
    </div>
  );
};
