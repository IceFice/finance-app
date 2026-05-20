import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300': variant === 'default',
          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400': variant === 'success',
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400': variant === 'warning',
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400': variant === 'error',
          'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400': variant === 'info',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
