import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function SlideOver({ open, onClose, title, children, className }: SlideOverProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-black/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-hidden={open ? undefined : 'true'}
        aria-label={title}
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <div className='flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h2>
          <Button variant='ghost' size='sm' onClick={onClose} className='p-1.5'>&#x2715;</Button>
        </div>
        <div className='flex-1 overflow-y-auto p-5'>{children}</div>
      </div>
    </div>
  );
}
