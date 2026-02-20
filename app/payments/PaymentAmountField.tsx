'use client';

import { useMemo, useState } from 'react';

import AmountInputAR from '@/app/components/AmountInputAR';

type PaymentAmountFieldProps = {
  remainingAmount: number;
  paidAmount: number;
};

export default function PaymentAmountField({
  remainingAmount,
  paidAmount,
}: PaymentAmountFieldProps) {
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [amountInputSeed, setAmountInputSeed] = useState(0);
  const [isPartial, setIsPartial] = useState(false);
  const [partialTotalValue, setPartialTotalValue] = useState<number | null>(
    null,
  );
  const currentPayment = amountValue ?? 0;
  const partialTotal = partialTotalValue ?? 0;

  const partialRemaining = useMemo(() => {
    if (!isPartial || partialTotalValue == null) return null;
    return Number((partialTotal - (paidAmount + currentPayment)).toFixed(2));
  }, [currentPayment, isPartial, paidAmount, partialTotal, partialTotalValue]);

  return (
    <div className="grid gap-2">
      <label className="text-xs text-zinc-600">
        Monto
        <div className="mt-1 flex items-center gap-2">
          <AmountInputAR
            key={amountInputSeed}
            name="amount"
            defaultValue={amountValue ?? ''}
            className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            placeholder="0"
            required
            onValueChange={setAmountValue}
          />
          <button
            type="button"
            className="rounded border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700"
            onClick={() => {
              setAmountValue(Number(remainingAmount.toFixed(2)));
              setAmountInputSeed((prev) => prev + 1);
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
          <AmountInputAR
            name="partial_total_amount"
            defaultValue={partialTotalValue ?? ''}
            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            placeholder="0"
            required
            onValueChange={setPartialTotalValue}
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
