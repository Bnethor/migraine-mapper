import type { ReactNode } from 'react';

interface ButtonGroupOption {
  value: number;
  label: string | ReactNode;
  description?: string;
}

interface ButtonGroupProps {
  value: number | undefined;
  onChange: (value: number) => void;
  options: ButtonGroupOption[];
  label: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const ButtonGroup = ({
  value,
  onChange,
  options,
  label,
  error,
  disabled = false,
  required = false,
}: ButtonGroupProps) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-lg border-2 transition-all
              ${
                value === option.value
                  ? 'border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

interface ToggleButtonProps {
  value: number | undefined;
  onChange: (value: 0 | 1) => void;
  label: string;
  error?: string;
  disabled?: boolean;
  helperText?: string;
}

export const ToggleButton = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
  helperText,
}: ToggleButtonProps) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <button
          type="button"
          onClick={() => onChange(value === 1 ? 0 : 1)}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${value === 1 ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${value === 1 ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      {helperText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

