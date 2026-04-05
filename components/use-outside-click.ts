'use client';

import { useEffect } from 'react';

export function useOutsideClick<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutsideClick: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const element = ref.current;

      if (!element || element.contains(event.target as Node)) {
        return;
      }

      onOutsideClick();
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [enabled, onOutsideClick, ref]);
}
