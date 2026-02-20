import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import SalePaymentCorrectionForm from '@/app/sales/SalePaymentCorrectionForm';
import { formatOperationalPaymentMethod } from '@/lib/payments/catalog';
import { getOrgAdminSession } from '@/lib/auth/org-session';

export const dynamic = 'force-dynamic';

type SaleDetailRow = {
  sale_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  created_by: string;
  created_by_name: string;
  payment_method_summary: string;
  subtotal_amount: number;
  discount_amount: number;
  discount_pct: number;
  total_amount: number;
  items: unknown;
  payments: unknown;
};

type PaymentDevice = {
  id: string;
  device_name: string;
  provider: 'posnet' | 'mercadopago' | 'other';
  is_active: boolean;
};

type SaleItem = {
  sale_item_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type SalePayment = {
  sale_payment_id: string;
  payment_method: string;
  amount: number;
  payment_device_id: string | null;
  payment_device_name: string | null;
  payment_device_provider: string | null;
  created_at: string;
};

const parseItems = (value: unknown): SaleItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const typed = row as Record<string, unknown>;
      return {
        sale_item_id: String(typed.sale_item_id ?? ''),
        product_id: String(typed.product_id ?? ''),
        product_name: String(typed.product_name ?? ''),
        unit_price: Number(typed.unit_price ?? 0),
        quantity: Number(typed.quantity ?? 0),
        line_total: Number(typed.line_total ?? 0),
      };
    })
    .filter((row): row is SaleItem => Boolean(row?.sale_item_id));
};

const parsePayments = (value: unknown): SalePayment[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const typed = row as Record<string, unknown>;
      return {
        sale_payment_id: String(typed.sale_payment_id ?? ''),
        payment_method: String(typed.payment_method ?? ''),
        amount: Number(typed.amount ?? 0),
        payment_device_id:
          typed.payment_device_id == null
            ? null
            : String(typed.payment_device_id),
        payment_device_name:
          typed.payment_device_name == null
            ? null
            : String(typed.payment_device_name),
        payment_device_provider:
          typed.payment_device_provider == null
            ? null
            : String(typed.payment_device_provider),
        created_at: String(typed.created_at ?? ''),
      };
    })
    .filter((row): row is SalePayment => Boolean(row?.sale_payment_id));
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

const formatPaymentMethod = (value: string) =>
  formatOperationalPaymentMethod(value);

export default async function SaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams?: Promise<{ notice?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }

  const supabase = session.supabase;
  const orgId = session.orgId;

  const saleId = resolvedParams.saleId;
  const { data: detailData } = await supabase
    .from('v_sale_detail_admin' as never)
    .select('*')
    .eq('org_id', orgId)
    .eq('sale_id', saleId)
    .maybeSingle();

  if (!detailData) {
    redirect('/sales');
  }

  const sale = detailData as SaleDetailRow;
  const items = parseItems(sale.items);
  const payments = parsePayments(sale.payments);

  const { data: paymentDevicesData } = await supabase
    .from('pos_payment_devices' as never)
    .select('id, device_name, provider, is_active')
    .eq('org_id', orgId)
    .eq('branch_id', sale.branch_id)
    .order('device_name');
  const paymentDevices = (paymentDevicesData ?? []) as PaymentDevice[];

  const correctPaymentMethod = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const salePaymentId = String(formData.get('sale_payment_id') ?? '').trim();
    const paymentMethod = String(formData.get('payment_method') ?? '').trim();
    const mercadopagoChannel = String(
      formData.get('mercadopago_channel') ?? '',
    ).trim();
    const paymentDeviceIdRaw = String(
      formData.get('payment_device_id') ?? '',
    ).trim();
    const reason = String(formData.get('reason') ?? '').trim();

    if (!salePaymentId || !paymentMethod || !reason) {
      redirect(`/sales/${saleId}?notice=missing_fields`);
    }

    const channelLabel =
      paymentMethod === 'mercadopago'
        ? mercadopagoChannel === 'alias_mp'
          ? 'alias_mp'
          : mercadopagoChannel === 'qr'
            ? 'qr'
            : 'posnet'
        : '';
    const reasonWithChannel =
      paymentMethod === 'mercadopago' && channelLabel
        ? `${reason} (canal: ${channelLabel})`
        : reason;

    const paymentDeviceId =
      paymentMethod === 'mercadopago' && mercadopagoChannel !== 'posnet'
        ? null
        : paymentDeviceIdRaw || null;

    const { error } = await actionSession.supabase.rpc(
      'rpc_correct_sale_payment_method' as never,
      {
        p_org_id: actionSession.orgId,
        p_sale_payment_id: salePaymentId,
        p_payment_method: paymentMethod,
        p_payment_device_id: paymentDeviceId,
        p_reason: reasonWithChannel,
      } as never,
    );

    revalidatePath(`/sales/${saleId}`);
    revalidatePath('/sales');
    revalidatePath('/cashbox');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(
        `/sales/${saleId}?notice=error:${encodeURIComponent(error.message)}`,
      );
    }

    redirect(`/sales/${saleId}?notice=payment_corrected`);
  };

  const notice =
    typeof resolvedSearchParams?.notice === 'string'
      ? resolvedSearchParams.notice
      : '';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500">
              <Link href="/sales" className="hover:underline">
                Ventas
              </Link>{' '}
              / {sale.sale_id.slice(0, 8)}
            </div>
            <h1 className="text-3xl font-semibold text-zinc-900">
              Detalle de venta
            </h1>
            <p className="text-sm text-zinc-500">
              {sale.branch_name ?? '—'} · {formatDateTime(sale.created_at)}
            </p>
          </div>
          <Link
            href="/cashbox"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Ver caja
          </Link>
        </header>

        {notice === 'payment_corrected' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Método de pago corregido y auditado.
          </p>
        ) : null}
        {notice === 'missing_fields' ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Completa método y motivo para aplicar la corrección.
          </p>
        ) : null}
        {notice.startsWith('error:') ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Error: {decodeURIComponent(notice.replace('error:', ''))}
          </p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Subtotal
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(Number(sale.subtotal_amount ?? 0))}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Descuento
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(Number(sale.discount_amount ?? 0))}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {Number(sale.discount_pct ?? 0)}%
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(Number(sale.total_amount ?? 0))}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Método resumen
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatPaymentMethod(sale.payment_method_summary)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{sale.created_by_name}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Ítems</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No hay ítems.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.sale_item_id}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">
                        {formatCurrency(Number(item.unit_price ?? 0))}
                      </td>
                      <td className="px-3 py-2 font-medium text-zinc-900">
                        {formatCurrency(Number(item.line_total ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            Pagos y corrección de método
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa esta acción solo para corregir errores operativos de caja. Cada
            cambio queda auditado.
          </p>

          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No hay pagos registrados.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {payments.map((payment) => (
                <article
                  key={payment.sale_payment_id}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatPaymentMethod(payment.payment_method)} ·{' '}
                        {formatCurrency(Number(payment.amount ?? 0))}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {payment.payment_device_name ?? 'Sin dispositivo'} ·{' '}
                        {formatDateTime(payment.created_at)}
                      </p>
                    </div>
                  </div>

                  <SalePaymentCorrectionForm
                    payment={payment}
                    paymentDevices={paymentDevices}
                    onSubmit={correctPaymentMethod}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
