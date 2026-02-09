import type { ReactNode } from 'react';

import TopBar from '@/app/components/TopBar';

type Props = {
  children: ReactNode;
};

export default function PageShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <TopBar />
      <div className="px-6 py-10">{children}</div>
    </div>
  );
}
