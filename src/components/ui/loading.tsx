
import React from 'react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingIndicator = ({ size = 'md', message }: LoadingIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} rounded-full border-b-transparent border-primary animate-spin`}></div>
      {message && (
        <p className="mt-2 text-muted-foreground">{message}</p>
      )}
    </div>
  );
};
