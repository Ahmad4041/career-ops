'use client';

import { useEffect, useRef } from 'react';

/** Calls `onClose` when `enabled` and user presses Escape (modal/dialog pattern). */
export function useEscapeClose(enabled: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
