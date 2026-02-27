import Link from 'next/link';
import { redirect } from 'next/navigation';

import PrintTicketButton from '@/app/sales/PrintTicketButton';
import { getOrgAdminSession } from '@/lib/auth/org-session';

export const dynamic = 'force-dynamic';

type SaleDetailRow = {
  sale_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  created_by_name: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  is_invoiced: boolean;
  items: unknown;
};

type SaleItem = {
  sale_item_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

const parseItems = (value: unknown): SaleItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const typed = row as Record<string, unknown>;
      return {
        sale_item_id: String(typed.sale_item_id ?? ''),
        product_name: String(typed.product_name ?? ''),
        unit_price: Number(typed.unit_price ?? 0),
        quantity: Number(typed.quantity ?? 0),
        line_total: Number(typed.line_total ?? 0),
      };
    })
    .filter((row): row is SaleItem => Boolean(row?.sale_item_id));
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR', { hour12: false });
};

export default async function SaleTicketPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const resolvedParams = await params;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }

  const { data: detailData } = await session.supabase
    .from('v_sale_detail_admin' as never)
    .select('*')
    .eq('org_id', session.orgId)
    .eq('sale_id', resolvedParams.saleId)
    .maybeSingle();

  if (!detailData) {
    redirect('/sales');
  }

  const sale = detailData as SaleDetailRow;
  const items = parseItems(sale.items);

  return (
    <div className="mx-auto w-full max-w-2xl p-4 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/sales/${sale.sale_id}`}
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Volver al detalle
          </Link>
          <Link
            href="/sales"
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Ir a ventas
          </Link>
        </div>
        <PrintTicketButton />
      </div>

      <div className="rounded border border-zinc-300 bg-white p-4 text-sm text-zinc-900 print:border-none print:p-0">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Ticket de venta (copia no fiscal)
        </p>
        <h1 className="mt-1 text-xl font-semibold">NODUX</h1>
        <p className="text-xs text-zinc-500">Sucursal: {sale.branch_name ?? '—'}</p>
        <p className="text-xs text-zinc-500">Fecha: {formatDateTime(sale.created_at)}</p>
        <p className="text-xs text-zinc-500">Vendedor: {sale.created_by_name}</p>
        <p className="text-xs text-zinc-500">
          Estado fiscal: {sale.is_invoiced ? 'Facturada' : 'No facturada'}
        </p>

        <div className="mt-3 border-t border-b border-zinc-200 py-2">
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">Sin ítems.</p>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div key={item.sale_item_id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.line_total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Subtotal</span>
            <span>{formatCurrency(Number(sale.subtotal_amount ?? 0))}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Descuento</span>
            <span>{formatCurrency(Number(sale.discount_amount ?? 0))}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(sale.total_amount ?? 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
