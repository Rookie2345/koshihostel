import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder = 'Select an option',
    required = false,
    className = '',
    id,
    disabled = false,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative rounded-lg">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          className={`block w-full appearance-none rounded-lg bg-navy-900 border text-slate-100 text-sm pl-3.5 pr-10 py-2.5 focus:outline-none transition-colors duration-150 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-navy-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 hover:border-navy-500'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-navy-950' : 'cursor-pointer'} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children ||
            options.map((opt) => (
              <option
                key={typeof opt === 'object' ? opt.value : opt}
                value={typeof opt === 'object' ? opt.value : opt}
                className="bg-navy-900 text-slate-100 py-1"
              >
                {typeof opt === 'object' ? opt.label : opt}
              </option>
            ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
