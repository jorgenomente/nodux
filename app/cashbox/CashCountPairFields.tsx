'use client';

import { useEffect, useMemo, useState } from 'react';

type CashCountPairFieldsProps = {
  denominations: number[];
  drawerPrefix: string;
  reservePrefix: string;
  drawerTitle: string;
  reserveTitle: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const parseCount = (value: string | undefined) => {
  if (!value || value.trim() === '') return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

export default function CashCountPairFields({
  denominations,
  drawerPrefix,
  reservePrefix,
  drawerTitle,
  reserveTitle,
}: CashCountPairFieldsProps) {
  const [drawerCounts, setDrawerCounts] = useState<string[]>(
    denominations.map(() => '0'),
  );
  const [reserveCounts, setReserveCounts] = useState<string[]>(
    denominations.map(() => '0'),
  );

  const drawerAmount = useMemo(
    () =>
      denominations.reduce(
        (acc, denominationValue, index) =>
          acc + denominationValue * parseCount(drawerCounts[index]),
        0,
      ),
    [denominations, drawerCounts],
  );

  const reserveAmount = useMemo(
    () =>
      denominations.reduce(
        (acc, denominationValue, index) =>
          acc + denominationValue * parseCount(reserveCounts[index]),
        0,
      ),
    [denominations, reserveCounts],
  );

  const totalAmount = drawerAmount + reserveAmount;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('cashbox-count-pair-change', {
        detail: {
          drawerPrefix,
          reservePrefix,
          drawerAmount,
          reserveAmount,
          totalAmount,
        },
      }),
    );
  }, [drawerAmount, drawerPrefix, reserveAmount, reservePrefix, totalAmount]);

  return (
    <div className="grid gap-4 rounded border border-zinc-200 p-3">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">
            {drawerTitle}
          </p>
          <div className="mt-2 grid gap-2">
            {denominations.map((denominationValue, index) => (
              <label
                key={`${drawerPrefix}-${denominationValue}`}
                className="flex items-center justify-between gap-3 text-sm text-zinc-700"
              >
                <span>{formatCurrency(denominationValue)}</span>
                <input
                  name={`${drawerPrefix}_qty_${index}`}
                  type="number"
                  min={0}
                  step={1}
                  value={drawerCounts[index] ?? '0'}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    if (rawValue === '') {
                      setDrawerCounts((prev) => {
                        const cloned = [...prev];
                        cloned[index] = '';
                        return cloned;
                      });
                      return;
                    }
                    const raw = Number.parseInt(rawValue, 10);
                    const next =
                      Number.isNaN(raw) || raw < 0 ? '0' : String(raw);
                    setDrawerCounts((prev) => {
                      const cloned = [...prev];
                      cloned[index] = next;
                      return cloned;
                    });
                  }}
                  className="w-24 rounded border border-zinc-200 px-2 py-1 text-right text-sm"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">
            {reserveTitle}
          </p>
          <div className="mt-2 grid gap-2">
            {denominations.map((denominationValue, index) => (
              <label
                key={`${reservePrefix}-${denominationValue}`}
                className="flex items-center justify-between gap-3 text-sm text-zinc-700"
              >
                <span>{formatCurrency(denominationValue)}</span>
                <input
                  name={`${reservePrefix}_qty_${index}`}
                  type="number"
                  min={0}
                  step={1}
                  value={reserveCounts[index] ?? '0'}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    if (rawValue === '') {
                      setReserveCounts((prev) => {
                        const cloned = [...prev];
                        cloned[index] = '';
                        return cloned;
                      });
                      return;
                    }
                    const raw = Number.parseInt(rawValue, 10);
                    const next =
                      Number.isNaN(raw) || raw < 0 ? '0' : String(raw);
                    setReserveCounts((prev) => {
                      const cloned = [...prev];
                      cloned[index] = next;
                      return cloned;
                    });
                  }}
                  className="w-24 rounded border border-zinc-200 px-2 py-1 text-right text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-1 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 sm:grid-cols-3">
        <p>
          Monto en caja: <strong>{formatCurrency(drawerAmount)}</strong>
        </p>
        <p>
          Monto en reserva: <strong>{formatCurrency(reserveAmount)}</strong>
        </p>
        <p>
          Total contado: <strong>{formatCurrency(totalAmount)}</strong>
        </p>
      </div>
    </div>
  );
}
