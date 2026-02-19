'use client';

import { useMemo, useRef, useState } from 'react';

type PaymentAmountFieldProps = {
  remainingAmount: number;
  paidAmount: number;
};

const toInputAmount = (value: number) => Number(value.toFixed(2)).toString();
const parseDecimal = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function PaymentAmountField({
  remainingAmount,
  paidAmount,
}: PaymentAmountFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [amountValue, setAmountValue] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  const [partialTotalValue, setPartialTotalValue] = useState('');

  const partialRemaining = useMemo(() => {
    if (!isPartial || partialTotalValue.trim() === '') return null;
    const total = parseDecimal(partialTotalValue);
    const currentPayment = parseDecimal(amountValue);
    return Number((total - (paidAmount + currentPayment)).toFixed(2));
  }, [amountValue, isPartial, paidAmount, partialTotalValue]);

  return (
    <div className="grid gap-2">
      <label className="text-xs text-zinc-600">
        Monto
        <div className="mt-1 flex items-center gap-2">
          <input
            ref={inputRef}
            name="amount"
            type="number"
            min={0.01}
            step="0.01"
            value={amountValue}
            onChange={(event) => setAmountValue(event.target.value)}
            className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            required
          />
          <button
            type="button"
            className="rounded border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700"
            onClick={() => {
              if (!inputRef.current) return;
              const value = toInputAmount(remainingAmount);
              inputRef.current.value = value;
              setAmountValue(value);
              inputRef.current.focus();
            }}
          >
            Restante
          </button>
        </div>
      </label>

      <label className="flex items-center gap-2 text-xs text-zinc-700">
        <input
          name="is_partial_payment"
          type="checkbox"
          checked={isPartial}
          onChange={(event) => setIsPartial(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Es pago parcial
      </label>

      {isPartial ? (
        <label className="text-xs text-zinc-600">
          Monto total de la factura/remito
          <input
            name="partial_total_amount"
            type="number"
            min={0.01}
            step="0.01"
            value={partialTotalValue}
            onChange={(event) => setPartialTotalValue(event.target.value)}
            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            required
          />
        </label>
      ) : null}

      {isPartial && partialRemaining != null ? (
        <p
          className={`text-xs ${
            partialRemaining < 0 ? 'text-rose-700' : 'text-zinc-600'
          }`}
        >
          Restante luego de este pago:{' '}
          {new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 2,
          }).format(Math.max(partialRemaining, 0))}
          {partialRemaining < 0
            ? ' (el pago actual supera el total indicado)'
            : ''}
        </p>
      ) : null}
    </div>
  );
}
