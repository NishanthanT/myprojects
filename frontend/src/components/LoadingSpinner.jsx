import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = 'brand' }) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-12 w-12 border-4',
  };

  const colorClasses = {
    brand: 'border-brand-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-slate-300 dark:border-slate-600 border-t-transparent',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

export default LoadingSpinner;
