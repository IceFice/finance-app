import { useEffect, useRef } from 'react';

// Module-level ref count so stacked overlays don't fight over body scroll:
// the lock is released only when the LAST open overlay closes.
let lockCount = 0;

function lockScroll() {
  if (lockCount === 0) document.body.style.overflow = 'hidden';
  lockCount += 1;
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = '';
}

/**
 * Shared overlay behaviour for Modal/SlideOver:
 *  - ref-counted body scroll lock (safe when overlays stack)
 *  - Escape closes the topmost overlay
 *  - moves focus into the dialog on open
 * Returns a ref to attach to the dialog container.
 */
export function useOverlay(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Defer focus until after the open transition has mounted the node.
    const t = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      unlockScroll();
    };
  }, [open, onClose]);

  return dialogRef;
}
