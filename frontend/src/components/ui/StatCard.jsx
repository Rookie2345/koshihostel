import React from 'react';
import Card from './Card';
import Skeleton from './Skeleton';

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendType = 'up', // 'up' | 'down' | 'neutral'
  color = 'cyan', // 'cyan' | 'slate' | 'amber' | 'red' | 'blue' | 'green'
  loading = false,
  className = '',
}) {
  const colorMap = {
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      icon: 'text-cyan-400',
      glow: 'group-hover:border-cyan-500/40',
    },
    slate: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
      icon: 'text-slate-400',
      glow: 'group-hover:border-slate-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: 'text-amber-400',
      glow: 'group-hover:border-amber-500/40',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: 'text-red-400',
      glow: 'group-hover:border-red-500/40',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-400',
      glow: 'group-hover:border-blue-500/40',
    },
    green: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400',
      glow: 'group-hover:border-emerald-500/40',
    },
  };

  const scheme = colorMap[color] || colorMap.cyan;

  if (loading) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 h-4" />
          <Skeleton variant="circle" className="w-10 h-10" />
        </div>
        <Skeleton className="w-32 h-8 mt-3" />
        <Skeleton className="w-20 h-3 mt-2" />
      </Card>
    );
  }

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-cyan-500/5 ${scheme.glow} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl border ${scheme.bg} ${scheme.border} ${scheme.icon}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`font-semibold ${
                trendType === 'up'
                  ? 'text-emerald-400'
                  : trendType === 'down'
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
