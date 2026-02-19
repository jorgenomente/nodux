'use client';

import { useEffect } from 'react';

export default function NumberInputScrollGuard() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement)) return;
      if (active.type !== 'number') return;
      event.preventDefault();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  return null;
}
