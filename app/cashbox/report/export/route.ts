import { NextResponse } from 'next/server';

import { getOrgMemberSession } from '@/lib/auth/org-session';
import { getCashboxReportData } from '@/lib/cashbox/report';

const toNumber = (value: unknown) => Number(value ?? 0);

const formatDate = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', { hour12: false });
};

const csvCell = (value: string | number | null | undefined) => {
  const raw = value == null ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
};

const csvRow = (values: Array<string | number | null | undefined>) =>
  `${values.map(csvCell).join(',')}\n`;

export async function GET(request: Request) {
  const session = await getOrgMemberSession();
  if (!session?.orgId || !session.effectiveRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const branchIdRaw = url.searchParams.get('branch_id') ?? '';
  const sessionIdRaw = url.searchParams.get('session_id') ?? '';

  const report = await getCashboxReportData({
    orgSession: session,
    branchIdRaw,
    sessionIdRaw,
  });

  if (!report) {
    return NextResponse.json(
      { error: 'No se pudo generar el reporte de caja.' },
      { status: 400 },
    );
  }

  const generatedLabel = formatDate(report.generatedAt);
  const branchLabel = report.branchName;
  const sessionLabel = report.session
    ? `${report.session.period_type === 'day' ? 'Dia' : 'Turno'}${report.session.session_label ? ` · ${report.session.session_label}` : ''}`
    : 'Sin sesion';

  let csv = '';
  csv += csvRow(['Reporte de Caja']);
  csv += csvRow(['Sucursal', branchLabel]);
  csv += csvRow(['Sesion', sessionLabel]);
  csv += csvRow(['Generado', generatedLabel]);
  csv += csvRow([]);

  if (!report.session || !report.expectedBreakdown || !report.details) {
    csv += csvRow(['No hay sesion de caja disponible para esta sucursal.']);
  } else {
    csv += csvRow(['Resumen']);
    csv += csvRow([
      'Estado',
      report.session.status === 'open' ? 'Abierta' : 'Cerrada',
    ]);
    csv += csvRow(['Apertura', formatDate(report.session.opened_at)]);
    csv += csvRow(['Cierre', formatDate(report.session.closed_at)]);
    csv += csvRow(['Esperado', toNumber(report.session.expected_cash_amount)]);
    csv += csvRow(['Contado', toNumber(report.session.counted_cash_amount)]);
    csv += csvRow(['Diferencia', toNumber(report.session.difference_amount)]);
    csv += csvRow([]);

    csv += csvRow(['Desglose Efectivo']);
    csv += csvRow(['Apertura caja', report.expectedBreakdown.openingCash]);
    csv += csvRow([
      'Apertura reserva',
      report.expectedBreakdown.openingReserve,
    ]);
    csv += csvRow(['Ventas efectivo', report.expectedBreakdown.cashSales]);
    csv += csvRow(['Ingresos manuales', report.expectedBreakdown.manualIncome]);
    csv += csvRow([
      'Egresos proveedor efectivo',
      report.expectedBreakdown.supplierPaymentCashExpense,
    ]);
    csv += csvRow([
      'Otros egresos manuales',
      report.expectedBreakdown.otherManualExpense,
    ]);
    csv += csvRow([
      'Total egresos',
      report.expectedBreakdown.totalManualExpense,
    ]);
    csv += csvRow([
      'Compuesto esperado',
      report.expectedBreakdown.composedExpected,
    ]);
    csv += csvRow([]);

    csv += csvRow(['Conciliacion por medio/dispositivo']);
    csv += csvRow([
      'Metodo',
      'Dispositivo',
      'Operaciones',
      'Sistema',
      'Comprobante',
      'Diferencia',
    ]);
    report.reconciliationRows.forEach((row) => {
      csv += csvRow([
        report.helpers.formatPaymentMethod(row.payment_method),
        row.payment_device_name ?? 'Sin dispositivo',
        toNumber(row.payments_count),
        toNumber(row.system_amount),
        toNumber(row.reported_amount),
        toNumber(row.difference_amount),
      ]);
    });
    csv += csvRow([]);

    csv += csvRow(['Movimientos de sesion']);
    csv += csvRow(['Fecha', 'Tipo', 'Categoria', 'Monto', 'Usuario', 'Nota']);
    report.movements.forEach((movement) => {
      csv += csvRow([
        formatDate(movement.movement_at),
        movement.movement_type === 'income' ? 'Ingreso' : 'Gasto',
        report.helpers.formatMovementCategory(movement.category_key),
        toNumber(movement.amount),
        movement.created_by,
        movement.note ?? '',
      ]);
    });
  }

  const safeBranch = branchLabel.replace(/[^\w-]+/g, '_');
  const fileName = `cashbox_report_${safeBranch}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
