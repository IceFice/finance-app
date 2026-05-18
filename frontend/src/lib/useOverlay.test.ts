import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOverlay } from './useOverlay';

beforeEach(() => {
  document.body.style.overflow = '';
});

describe('useOverlay', () => {
  it('locks body scroll while open and restores on close', () => {
    const { rerender, unmount } = renderHook(
      ({ open }) => useOverlay(open, () => {}),
      { initialProps: { open: true } }
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender({ open: false });
    expect(document.body.style.overflow).toBe('');
    unmount();
  });

  it('ref-counts so the lock survives until the LAST overlay closes', () => {
    const a = renderHook(({ open }) => useOverlay(open, () => {}), {
      initialProps: { open: true },
    });
    const b = renderHook(({ open }) => useOverlay(open, () => {}), {
      initialProps: { open: true },
    });
    expect(document.body.style.overflow).toBe('hidden');
    a.rerender({ open: false }); // one still open
    expect(document.body.style.overflow).toBe('hidden');
    b.rerender({ open: false }); // last one closed
    expect(document.body.style.overflow).toBe('');
    a.unmount();
    b.unmount();
  });

  it('Escape triggers onClose only while open', () => {
    const onClose = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ open }) => useOverlay(open, onClose),
      { initialProps: { open: true } }
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender({ open: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1); // no extra call when closed
    unmount();
  });
});
