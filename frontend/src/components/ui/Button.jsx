import React from 'react';
import Spinner from './Spinner';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold focus:ring-cyan-400 shadow-lg shadow-cyan-500/20 active:scale-[0.98]',
    secondary: 'bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-600 focus:ring-cyan-500 hover:border-navy-500 active:scale-[0.98]',
    danger: 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 focus:ring-red-400 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-navy-800 text-slate-300 hover:text-white focus:ring-cyan-500',
    outline: 'bg-transparent border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 focus:ring-cyan-400',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-semibold focus:ring-emerald-400',
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs font-medium gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" color={variant === 'primary' ? 'text-navy-950' : 'text-cyan-400'} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className={size === 'sm' || size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          {children}
        </>
      )}
    </button>
  );
}
