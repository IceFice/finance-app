import { cn } from '@/lib/utils';

interface ProgressBarProps { value: number; className?: string; showLabel?: boolean; }

export function ProgressBar({ value, className, showLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 100 ? 'bg-red-500' : clamped >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{clamped.toFixed(0)}%</span>}
    </div>
  );
}
