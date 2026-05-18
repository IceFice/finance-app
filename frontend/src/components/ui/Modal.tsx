import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useOverlay } from '@/lib/useOverlay';
import { Button } from './Button';

interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string; }

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cn('relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto focus:outline-none', className)}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5">&#x2715;</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
