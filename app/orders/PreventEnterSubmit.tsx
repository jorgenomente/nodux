'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function PreventEnterSubmit({ children }: Props) {
  return (
    <div
      onKeyDownCapture={(event) => {
        if (event.key !== 'Enter') return;
        const target = event.target as HTMLElement | null;
        if (!target) return;
        if (target.tagName === 'TEXTAREA') return;
        event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
