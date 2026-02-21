'use client';

import { useEffect, useState } from 'react';

const formatDateTime = (date: Date) =>
  date.toLocaleString('es-AR', {
    hour12: false,
  });

export default function SystemDateTimeBadge() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="text-xs text-zinc-500">
      Fecha/hora del sistema: <strong>{formatDateTime(now)}</strong>
    </span>
  );
}
