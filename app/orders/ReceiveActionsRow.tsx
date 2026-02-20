'use client';

import { useState } from 'react';

import AmountInputAR from '@/app/components/AmountInputAR';

type Props = {
  isCashSupplier: boolean;
  isPayableAlreadyPaid: boolean;
  currentPaidAmount: number;
  submitLabel: string;
  initialMarkCashPayment?: boolean;
  initialCashPaidAmount?: string;
  initialIsPartialPayment?: boolean;
  initialPartialTotalAmount?: string;
};

export default function ReceiveActionsRow({
  isCashSupplier,
  isPayableAlreadyPaid,
  currentPaidAmount,
  submitLabel,
  initialMarkCashPayment = false,
  initialCashPaidAmount = '',
  initialIsPartialPayment = false,
  initialPartialTotalAmount = '',
}: Props) {
  const [markCashPayment, setMarkCashPayment] = useState(
    initialMarkCashPayment,
  );
  const [cashPaidAmount, setCashPaidAmount] = useState<number | null>(() => {
    const parsed = Number(initialCashPaidAmount || '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });
  const [cashAmountInputSeed, setCashAmountInputSeed] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(
    initialIsPartialPayment,
  );
  const [partialTotalAmount, setPartialTotalAmount] = useState<number | null>(
    () => {
      const parsed = Number(initialPartialTotalAmount || '');
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    },
  );
  const [partialAmountInputSeed, setPartialAmountInputSeed] = useState(0);
  const paidAmountValue = cashPaidAmount ?? 0;
  const totalAmountValue = partialTotalAmount ?? 0;
  const remainingAfterPayment =
    totalAmountValue > 0
      ? Number(
          Math.max(
            totalAmountValue - currentPaidAmount - paidAmountValue,
            0,
          ).toFixed(2),
        )
      : null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {isCashSupplier && !isPayableAlreadyPaid ? (
        <>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={markCashPayment}
              onChange={(event) => {
                const nextChecked = event.target.checked;
                setMarkCashPayment(nextChecked);
                if (!nextChecked) {
                  setCashPaidAmount(null);
                  setIsPartialPayment(false);
                  setPartialTotalAmount(null);
                  setCashAmountInputSeed((prev) => prev + 1);
                  setPartialAmountInputSeed((prev) => prev + 1);
                }
              }}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Pago en efectivo realizado
          </label>
          <input
            type="hidden"
            name="mark_cash_payment"
            value={markCashPayment ? '1' : ''}
          />
          <label className="text-sm text-zinc-600">
            Monto exacto pagado
            <AmountInputAR
              key={cashAmountInputSeed}
              name="cash_paid_amount"
              defaultValue={cashPaidAmount ?? ''}
              placeholder={markCashPayment ? 'Ej: 185000' : ''}
              disabled={!markCashPayment}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-400 md:w-56"
              onValueChange={setCashPaidAmount}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isPartialPayment}
              disabled={!markCashPayment}
              onChange={(event) => {
                const nextChecked = event.target.checked;
                setIsPartialPayment(nextChecked);
                if (!nextChecked) {
                  setPartialTotalAmount(null);
                  setPartialAmountInputSeed((prev) => prev + 1);
                }
              }}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Pago parcial
          </label>
          <input
            type="hidden"
            name="cash_partial_payment"
            value={isPartialPayment ? '1' : ''}
          />
          {isPartialPayment ? (
            <label className="text-sm text-zinc-600">
              Monto total del remito/factura
              <AmountInputAR
                key={partialAmountInputSeed}
                name="cash_partial_total_amount"
                defaultValue={partialTotalAmount ?? ''}
                placeholder="Ej: 250000"
                disabled={!markCashPayment}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-400 md:w-56"
                required={markCashPayment && isPartialPayment}
                onValueChange={setPartialTotalAmount}
              />
              {remainingAfterPayment != null ? (
                <span className="mt-1 block text-xs text-zinc-500">
                  Restante luego de este pago:{' '}
                  {new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    maximumFractionDigits: 2,
                  }).format(remainingAfterPayment)}
                </span>
              ) : null}
            </label>
          ) : null}
        </>
      ) : isCashSupplier ? (
        <p className="text-xs text-zinc-500">
          El pago en efectivo de este pedido ya está registrado.
        </p>
      ) : null}
      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </div>
  );
}
