'use client';

import { useEffect, useMemo, useState } from 'react';

import AmountInputAR from '@/app/components/AmountInputAR';

type ReconciliationRow = {
  row_key: string;
  row_group: 'cash_expected_total' | 'device' | 'mercadopago_total';
  payment_method:
    | 'cash'
    | 'card'
    | 'mercadopago'
    | 'debit'
    | 'credit'
    | 'transfer'
    | 'other';
  payment_device_id: string | null;
  payment_device_name: string | null;
  payment_device_provider: string | null;
  system_amount: number;
  payments_count: number;
  reported_amount: number | null;
  difference_amount: number | null;
};

type Props = {
  branchId: string;
  sessionId: string;
  rows: ReconciliationRow[];
  onSave: (formData: FormData) => void | Promise<void>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatPaymentMethod = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'card':
      return 'Tarjeta';
    case 'mercadopago':
      return 'MercadoPago';
    case 'debit':
      return 'Débito';
    case 'credit':
      return 'Crédito';
    case 'transfer':
      return 'Transferencia';
    case 'other':
      return 'Otro';
    default:
      return method;
  }
};

export default function CashboxReconciliationSection({
  branchId,
  sessionId,
  rows,
  onSave,
}: Props) {
  const [liveCloseCountedTotal, setLiveCloseCountedTotal] = useState<
    number | null
  >(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        drawerPrefix?: string;
        reservePrefix?: string;
        totalAmount?: number;
      }>;
      const detail = custom.detail;
      if (
        detail?.drawerPrefix === 'close_drawer' &&
        detail?.reservePrefix === 'close_reserve' &&
        Number.isFinite(detail.totalAmount)
      ) {
        setLiveCloseCountedTotal(Number(detail.totalAmount));
      }
    };

    window.addEventListener(
      'cashbox-count-pair-change',
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        'cashbox-count-pair-change',
        handler as EventListener,
      );
  }, []);

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => {
        if (row.row_group !== 'cash_expected_total') {
          return {
            ...row,
            displaySystemAmount: Number(row.system_amount ?? 0),
            displayReportedAmount: row.reported_amount,
            displayDifferenceAmount: row.difference_amount,
          };
        }

        const systemAmount = Number(row.system_amount ?? 0);
        if (liveCloseCountedTotal == null) {
          return {
            ...row,
            displaySystemAmount: systemAmount,
            displayReportedAmount: row.reported_amount,
            displayDifferenceAmount: row.difference_amount,
          };
        }

        const normalizedCounted = Math.round(liveCloseCountedTotal * 100) / 100;
        return {
          ...row,
          displaySystemAmount: systemAmount,
          displayReportedAmount: normalizedCounted,
          displayDifferenceAmount:
            Math.round((normalizedCounted - systemAmount) * 100) / 100,
        };
      }),
    [liveCloseCountedTotal, rows],
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-zinc-900">
        Conciliación por medio y dispositivo
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Compara los totales del sistema por método y por posnet contra tus
        comprobantes del turno.
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Incluye `Efectivo esperado total (caja + reserva)`, filas por
        dispositivo y una fila agregada `MercadoPago (total)`.
      </p>
      {normalizedRows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Sin cobros no-efectivo registrados en la sesión.
        </p>
      ) : (
        <form action={onSave} className="mt-4 grid gap-3">
          <input type="hidden" name="branch_id" value={branchId} />
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="row_count" value={normalizedRows.length} />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Método</th>
                  <th className="px-3 py-2">Dispositivo</th>
                  <th className="px-3 py-2">Operaciones</th>
                  <th className="px-3 py-2">Monto sistema</th>
                  <th className="px-3 py-2">Monto comprobante</th>
                  <th className="px-3 py-2">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {normalizedRows.map((row, index) => (
                  <tr key={row.row_key} className="border-t border-zinc-100">
                    <td className="px-3 py-2">
                      {formatPaymentMethod(row.payment_method)}
                    </td>
                    <td className="px-3 py-2">
                      {row.payment_device_name ?? 'Sin dispositivo'}
                      <input
                        type="hidden"
                        name={`row_key_${index}`}
                        value={row.row_key}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {row.row_group === 'cash_expected_total'
                        ? '—'
                        : Number(row.payments_count ?? 0)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-zinc-900">
                      {formatCurrency(Number(row.displaySystemAmount ?? 0))}
                    </td>
                    <td className="px-3 py-2">
                      {row.row_group === 'cash_expected_total' ? (
                        <div className="text-sm font-semibold text-zinc-700">
                          {row.displayReportedAmount == null
                            ? 'Completa conteo de cierre arriba'
                            : formatCurrency(Number(row.displayReportedAmount))}
                        </div>
                      ) : (
                        <AmountInputAR
                          name={`reported_amount_${index}`}
                          defaultValue={
                            row.reported_amount == null
                              ? ''
                              : Number(row.reported_amount)
                          }
                          placeholder="0.00"
                          className="w-36 rounded border border-zinc-200 px-2 py-1 text-sm"
                        />
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        row.displayDifferenceAmount == null
                          ? 'text-zinc-500'
                          : Number(row.displayDifferenceAmount) === 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {row.displayDifferenceAmount == null
                        ? '—'
                        : formatCurrency(Number(row.displayDifferenceAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar conciliación
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
