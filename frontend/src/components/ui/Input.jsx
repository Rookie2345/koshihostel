import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    endIcon,
    type = 'text',
    required = false,
    className = '',
    id,
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative rounded-lg">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-slate-400" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg bg-navy-900 border text-slate-100 text-sm placeholder-slate-500 focus:outline-none transition-colors duration-150 ${
            Icon ? 'pl-9' : 'pl-3.5'
          } ${endIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-navy-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 hover:border-navy-500'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-navy-950' : ''} ${className}`}
          {...props}
        />

        {endIcon && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{endIcon}</div>}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
