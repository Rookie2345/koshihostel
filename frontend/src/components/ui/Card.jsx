import React from 'react';

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = true,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-navy-800 rounded-xl border border-navy-600/70 shadow-lg shadow-black/20 ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div
          className={`flex items-center justify-between px-5 py-4 ${
            headerBorder ? 'border-b border-navy-700/80' : ''
          }`}
        >
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
