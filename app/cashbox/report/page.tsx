import Link from 'next/link';
import { redirect } from 'next/navigation';

import PrintReportButton from '@/app/cashbox/report/PrintReportButton';
import { getOrgMemberSession } from '@/lib/auth/org-session';
import { getCashboxReportData } from '@/lib/cashbox/report';

export const dynamic = 'force-dynamic';

type SearchParams = {
  branch_id?: string;
  session_id?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', { hour12: false });
};

export default async function CashboxReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgMemberSession();
  if (!session?.orgId || !session.effectiveRole) {
    redirect('/login');
  }

  const report = await getCashboxReportData({
    orgSession: session,
    branchIdRaw:
      typeof resolvedSearchParams.branch_id === 'string'
        ? resolvedSearchParams.branch_id
        : '',
    sessionIdRaw:
      typeof resolvedSearchParams.session_id === 'string'
        ? resolvedSearchParams.session_id
        : '',
  });

  if (!report) {
    redirect('/cashbox?result=error:No se pudo generar el reporte');
  }

  const csvHref = `/cashbox/report/export?branch_id=${encodeURIComponent(report.branchId)}${report.session ? `&session_id=${encodeURIComponent(report.session.session_id)}` : ''}`;

  return (
    <main className="mx-auto w-full max-w-5xl bg-white px-6 py-8 text-zinc-900 print:max-w-none print:px-2 print:py-2">
      <header className="mb-6 border-b border-zinc-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/cashbox"
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
            >
              Volver a caja
            </Link>
            <a
              href={csvHref}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
            >
              Descargar CSV
            </a>
          </div>
          <PrintReportButton />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Reporte de Caja</h1>
        <p className="text-sm text-zinc-600">
          Sucursal: <strong>{report.branchName}</strong>
        </p>
        <p className="text-sm text-zinc-600">
          Generado: <strong>{formatDateTime(report.generatedAt)}</strong>
        </p>
      </header>

      {!report.session || !report.expectedBreakdown || !report.details ? (
        <section className="rounded border border-zinc-200 p-4 text-sm text-zinc-600">
          No hay sesión de caja disponible para esta sucursal.
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded border border-zinc-200 p-4">
            <h2 className="text-lg font-semibold">Resumen de sesión</h2>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <p>
                Estado:{' '}
                <strong>
                  {report.session.status === 'open' ? 'Abierta' : 'Cerrada'}
                </strong>
              </p>
              <p>
                Tipo:{' '}
                <strong>
                  {report.session.period_type === 'day' ? 'Dia' : 'Turno'}
                  {report.session.session_label
                    ? ` · ${report.session.session_label}`
                    : ''}
                </strong>
              </p>
              <p>
                Apertura:{' '}
                <strong>{formatDateTime(report.session.opened_at)}</strong>
              </p>
              <p>
                Responsable apertura:{' '}
                <strong>
                  {report.session.opened_controlled_by_name?.trim() || '—'}
                </strong>
              </p>
              <p>
                Cierre:{' '}
                <strong>{formatDateTime(report.session.closed_at)}</strong>
              </p>
              <p>
                Efectivo esperado:{' '}
                <strong>
                  {formatCurrency(report.session.expected_cash_amount)}
                </strong>
              </p>
              <p>
                Efectivo contado:{' '}
                <strong>
                  {formatCurrency(report.session.counted_cash_amount ?? 0)}
                </strong>
              </p>
              <p>
                Diferencia:{' '}
                <strong>
                  {formatCurrency(report.session.difference_amount ?? 0)}
                </strong>
              </p>
            </div>
          </section>

          <section className="rounded border border-zinc-200 p-4">
            <h2 className="text-lg font-semibold">
              Desglose del efectivo en sistema
            </h2>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                Apertura caja:{' '}
                <strong>
                  {formatCurrency(report.expectedBreakdown.openingCash)}
                </strong>
              </p>
              <p>
                + Apertura reserva:{' '}
                <strong>
                  {formatCurrency(report.expectedBreakdown.openingReserve)}
                </strong>
              </p>
              <p>
                + Ventas en efectivo:{' '}
                <strong>
                  {formatCurrency(report.expectedBreakdown.cashSales)}
                </strong>
              </p>
              <p>
                + Ingresos manuales:{' '}
                <strong>
                  {formatCurrency(report.expectedBreakdown.manualIncome)}
                </strong>
              </p>
              <p>
                - Egresos por proveedor en efectivo:{' '}
                <strong>
                  {formatCurrency(
                    report.expectedBreakdown.supplierPaymentCashExpense,
                  )}
                </strong>
              </p>
              <p>
                - Otros egresos manuales:{' '}
                <strong>
                  {formatCurrency(report.expectedBreakdown.otherManualExpense)}
                </strong>
              </p>
              <p className="border-t border-zinc-200 pt-2">
                = Efectivo compuesto:{' '}
                <strong>
                  {formatCurrency(report.expectedBreakdown.composedExpected)}
                </strong>
              </p>
            </div>
          </section>

          <section className="rounded border border-zinc-200 p-4">
            <h2 className="text-lg font-semibold">
              Conciliación por medio y dispositivo
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-2 py-2">Metodo</th>
                    <th className="px-2 py-2">Dispositivo</th>
                    <th className="px-2 py-2">Operaciones</th>
                    <th className="px-2 py-2">Sistema</th>
                    <th className="px-2 py-2">Comprobante</th>
                    <th className="px-2 py-2">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {report.reconciliationRows.map((row) => (
                    <tr key={row.row_key} className="border-t border-zinc-100">
                      <td className="px-2 py-2">
                        {report.helpers.formatPaymentMethod(row.payment_method)}
                      </td>
                      <td className="px-2 py-2">
                        {row.payment_device_name ?? 'Sin dispositivo'}
                      </td>
                      <td className="px-2 py-2">{row.payments_count ?? 0}</td>
                      <td className="px-2 py-2">
                        {formatCurrency(Number(row.system_amount ?? 0))}
                      </td>
                      <td className="px-2 py-2">
                        {row.reported_amount == null
                          ? '—'
                          : formatCurrency(Number(row.reported_amount))}
                      </td>
                      <td className="px-2 py-2">
                        {row.difference_amount == null
                          ? '—'
                          : formatCurrency(Number(row.difference_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded border border-zinc-200 p-4">
            <h2 className="text-lg font-semibold">Movimientos de sesión</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Monto</th>
                    <th className="px-2 py-2">Usuario</th>
                    <th className="px-2 py-2">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {report.movements.map((movement) => (
                    <tr key={movement.id} className="border-t border-zinc-100">
                      <td className="px-2 py-2">
                        {formatDateTime(movement.movement_at)}
                      </td>
                      <td className="px-2 py-2">
                        {movement.movement_type === 'income'
                          ? 'Ingreso'
                          : 'Gasto'}
                      </td>
                      <td className="px-2 py-2">
                        {report.helpers.formatMovementCategory(
                          movement.category_key,
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {formatCurrency(Number(movement.amount ?? 0))}
                      </td>
                      <td className="px-2 py-2">{movement.created_by}</td>
                      <td className="px-2 py-2">{movement.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
