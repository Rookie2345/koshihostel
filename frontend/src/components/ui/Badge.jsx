import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}) {
  const getVariantStyles = (v) => {
    const key = String(v).toUpperCase();
    switch (key) {
      case 'ACTIVE':
      case 'SUCCESS':
      case 'PAID':
      case 'SETTLED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

      case 'INACTIVE':
      case 'DEFAULT':
      case 'SLATE':
        return 'bg-slate-700/40 text-slate-300 border-slate-600';

      case 'PAYMENT':
      case 'CREDIT':
      case 'COLLECTED':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';

      case 'MONTHLY_FEE':
      case 'FEE':
      case 'CHARGE':
      case 'DUE':
      case 'PENDING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';

      case 'DANGER':
      case 'OVERDUE':
      case 'FAILED':
      case 'DEACTIVATED':
        return 'bg-red-500/15 text-red-400 border-red-500/30';

      case 'ADJUSTMENT':
      case 'INFO':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';

      default:
        return 'bg-navy-700 text-slate-300 border-navy-600';
    }
  };

  const getDotStyles = (v) => {
    const key = String(v).toUpperCase();
    switch (key) {
      case 'ACTIVE':
      case 'SUCCESS':
      case 'PAID':
      case 'SETTLED':
        return 'bg-emerald-400';
      case 'INACTIVE':
      case 'DEFAULT':
      case 'SLATE':
        return 'bg-slate-400';
      case 'PAYMENT':
      case 'CREDIT':
        return 'bg-cyan-400';
      case 'MONTHLY_FEE':
      case 'PENDING':
        return 'bg-amber-400';
      case 'DANGER':
      case 'OVERDUE':
      case 'FAILED':
        return 'bg-red-400';
      default:
        return 'bg-slate-400';
    }
  };

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${getVariantStyles(
        variant
      )} ${sizeStyles[size] || sizeStyles.sm} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${getDotStyles(variant)}`} />}
      {children}
    </span>
  );
}
