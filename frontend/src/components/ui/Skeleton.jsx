import React from 'react';

export default function Skeleton({ className = '', variant = 'text', count = 1 }) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'rect':
        return 'rounded-lg';
      case 'card':
        return 'h-32 rounded-xl';
      default:
        return 'h-4 rounded';
    }
  };

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className={`animate-pulse bg-navy-700/60 ${getVariantStyles()} ${className}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`animate-pulse bg-navy-700/60 ${getVariantStyles()} ${className}`} />
  );
}
