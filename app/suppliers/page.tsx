import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import SupplierActions from '@/app/suppliers/SupplierActions';
import SuppliersSearchInput from '@/app/suppliers/SuppliersSearchInput';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  q?: string;
};

const orderFrequencyOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Cada 2 semanas' },
  { value: 'every_3_weeks', label: 'Cada 3 semanas' },
  { value: 'monthly', label: 'Mensual (30 días)' },
] as const;

const weekdayOptions = [
  { value: 'mon', label: 'Lunes' },
  { value: 'tue', label: 'Martes' },
  { value: 'wed', label: 'Miércoles' },
  { value: 'thu', label: 'Jueves' },
  { value: 'fri', label: 'Viernes' },
  { value: 'sat', label: 'Sábado' },
  { value: 'sun', label: 'Domingo' },
] as const;

type SupplierRow = {
  supplier_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  order_frequency: string | null;
  order_day: string | null;
  receive_day: string | null;
  payment_terms_days: number | null;
  preferred_payment_method: 'cash' | 'transfer' | null;
  payment_note: string | null;
  default_markup_pct: number | null;
  payment_accounts_count?: number | null;
  products_count?: number | null;
};

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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

  const query =
    typeof resolvedSearchParams.q === 'string'
      ? resolvedSearchParams.q.trim()
      : '';

  let supplierQuery = supabase
    .from('v_suppliers_admin')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  if (query.length >= 3) {
    supplierQuery = supplierQuery.or(
      `name.ilike.%${query}%,contact_name.ilike.%${query}%`,
    );
  }

  const { data: suppliers } = await supplierQuery;
  const supplierRows = (suppliers ?? []) as unknown as SupplierRow[];
  const shouldOpenNewSupplier = !suppliers || suppliers.length === 0;

  const createSupplier = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const name = String(formData.get('name') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const orderFrequency = String(formData.get('order_frequency') ?? '').trim();
    const orderDay = String(formData.get('order_day') ?? '').trim();
    const receiveDay = String(formData.get('receive_day') ?? '').trim();
    const paymentTermsDaysRaw = String(
      formData.get('payment_terms_days') ?? '',
    ).trim();
    const preferredPaymentMethod = String(
      formData.get('preferred_payment_method') ?? '',
    ).trim();
    const paymentNote = String(formData.get('payment_note') ?? '').trim();
    const defaultMarkupPctRaw = String(
      formData.get('default_markup_pct') ?? '40',
    ).trim();
    const acceptsCash = preferredPaymentMethod !== 'transfer';
    const acceptsTransfer = preferredPaymentMethod !== 'cash';
    const paymentTermsDays =
      paymentTermsDaysRaw === ''
        ? null
        : Number.parseInt(paymentTermsDaysRaw, 10);
    const defaultMarkupPct = Number(defaultMarkupPctRaw);

    if (!name) return;
    if (
      paymentTermsDays !== null &&
      (Number.isNaN(paymentTermsDays) || paymentTermsDays < 0)
    ) {
      return;
    }
    if (
      Number.isNaN(defaultMarkupPct) ||
      defaultMarkupPct < 0 ||
      defaultMarkupPct > 1000
    ) {
      return;
    }

    await (
      supabaseServer as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
      }
    ).rpc('rpc_upsert_supplier', {
      p_supplier_id: randomUUID(),
      p_org_id: orgId,
      p_name: name,
      p_contact_name: contactName,
      p_phone: phone,
      p_email: email,
      p_notes: notes,
      p_is_active: true,
      p_order_frequency: orderFrequency || null,
      p_order_day: orderDay || null,
      p_receive_day: receiveDay || null,
      p_payment_terms_days: paymentTermsDays ?? undefined,
      p_preferred_payment_method:
        preferredPaymentMethod === 'cash' ||
        preferredPaymentMethod === 'transfer'
          ? preferredPaymentMethod
          : undefined,
      p_accepts_cash: acceptsCash,
      p_accepts_transfer: acceptsTransfer,
      p_payment_note: paymentNote || undefined,
      p_default_markup_pct: defaultMarkupPct,
    });

    revalidatePath('/suppliers');
  };

  const updateSupplier = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const isActive = String(formData.get('is_active') ?? 'true') === 'true';
    const orderFrequency = String(formData.get('order_frequency') ?? '').trim();
    const orderDay = String(formData.get('order_day') ?? '').trim();
    const receiveDay = String(formData.get('receive_day') ?? '').trim();
    const paymentTermsDaysRaw = String(
      formData.get('payment_terms_days') ?? '',
    ).trim();
    const preferredPaymentMethod = String(
      formData.get('preferred_payment_method') ?? '',
    ).trim();
    const paymentNote = String(formData.get('payment_note') ?? '').trim();
    const defaultMarkupPctRaw = String(
      formData.get('default_markup_pct') ?? '40',
    ).trim();
    const acceptsCash = preferredPaymentMethod !== 'transfer';
    const acceptsTransfer = preferredPaymentMethod !== 'cash';
    const paymentTermsDays =
      paymentTermsDaysRaw === ''
        ? null
        : Number.parseInt(paymentTermsDaysRaw, 10);
    const defaultMarkupPct = Number(defaultMarkupPctRaw);

    if (!supplierId || !name) return;
    if (
      paymentTermsDays !== null &&
      (Number.isNaN(paymentTermsDays) || paymentTermsDays < 0)
    ) {
      return;
    }
    if (
      Number.isNaN(defaultMarkupPct) ||
      defaultMarkupPct < 0 ||
      defaultMarkupPct > 1000
    ) {
      return;
    }

    await (
      supabaseServer as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
      }
    ).rpc('rpc_upsert_supplier', {
      p_supplier_id: supplierId,
      p_org_id: orgId,
      p_name: name,
      p_contact_name: contactName,
      p_phone: phone,
      p_email: email,
      p_notes: notes,
      p_is_active: isActive,
      p_order_frequency: orderFrequency || null,
      p_order_day: orderDay || null,
      p_receive_day: receiveDay || null,
      p_payment_terms_days: paymentTermsDays ?? undefined,
      p_preferred_payment_method:
        preferredPaymentMethod === 'cash' ||
        preferredPaymentMethod === 'transfer'
          ? preferredPaymentMethod
          : undefined,
      p_accepts_cash: acceptsCash,
      p_accepts_transfer: acceptsTransfer,
      p_payment_note: paymentNote || undefined,
      p_default_markup_pct: defaultMarkupPct,
    });

    revalidatePath('/suppliers');
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Proveedores
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Gestiona proveedores y sus productos asociados.
            </p>
          </div>
        </div>

        <details
          className="group rounded-2xl bg-white p-6 shadow-sm"
          open={shouldOpenNewSupplier}
        >
          <summary className="cursor-pointer list-none text-lg font-semibold text-zinc-900">
            Nuevo proveedor
            <span className="ml-2 text-sm font-medium text-zinc-500 group-open:hidden">
              (abrir)
            </span>
            <span className="ml-2 hidden text-sm font-medium text-zinc-500 group-open:inline">
              (cerrar)
            </span>
          </summary>
          <form
            action={createSupplier}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm text-zinc-600">
              Nombre
              <input
                name="name"
                required
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Contacto
              <input
                name="contact_name"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Teléfono
              <input
                name="phone"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Email
              <input
                name="email"
                type="email"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600 md:col-span-2">
              Notas
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Frecuencia
              <select
                name="order_frequency"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar</option>
                {orderFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-600">
              Día de pedido
              <select
                name="order_day"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar</option>
                {weekdayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-600">
              Día de recepción
              <select
                name="receive_day"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar</option>
                {weekdayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-600">
              Plazo de pago (días)
              <input
                name="payment_terms_days"
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              % ganancia sugerida
              <input
                name="default_markup_pct"
                type="number"
                min={0}
                step="0.01"
                defaultValue="40"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Método de pago preferido
              <select
                name="preferred_payment_method"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Sin preferencia</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </label>
            <input type="hidden" name="accepts_cash" value="on" />
            <input type="hidden" name="accepts_transfer" value="on" />
            <label className="text-sm text-zinc-600 md:col-span-2">
              Datos de pago y notas del proveedor
              <textarea
                name="payment_note"
                rows={2}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar proveedor
              </button>
            </div>
          </form>
        </details>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
            <div className="mt-3">
              <SuppliersSearchInput initialQuery={query} />
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {supplierRows.length > 0 ? (
              supplierRows.map((supplier) => (
                <div
                  key={supplier.supplier_id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {supplier.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            supplier.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {supplier.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {supplier.contact_name || 'Sin contacto'} ·{' '}
                        {supplier.phone || 'Sin teléfono'} ·{' '}
                        {supplier.email || 'Sin email'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Productos asociados: {supplier.products_count ?? 0}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Frecuencia:{' '}
                        {supplier.order_frequency
                          ? (orderFrequencyOptions.find(
                              (option) =>
                                option.value === supplier.order_frequency,
                            )?.label ?? supplier.order_frequency)
                          : 'Sin definir'}{' '}
                        · Pedido:{' '}
                        {supplier.order_day
                          ? (weekdayOptions.find(
                              (option) => option.value === supplier.order_day,
                            )?.label ?? supplier.order_day)
                          : 'Sin definir'}{' '}
                        · Recepción:{' '}
                        {supplier.receive_day
                          ? (weekdayOptions.find(
                              (option) => option.value === supplier.receive_day,
                            )?.label ?? supplier.receive_day)
                          : 'Sin definir'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Método de pago preferido:{' '}
                        {supplier.preferred_payment_method === 'cash'
                          ? 'Efectivo'
                          : supplier.preferred_payment_method === 'transfer'
                            ? 'Transferencia'
                            : 'Sin preferencia'}
                        {' · '}Plazo:{' '}
                        {supplier.payment_terms_days == null
                          ? 'Sin plazo'
                          : `${supplier.payment_terms_days} días`}
                        {' · '}Ganancia sugerida:{' '}
                        {Number(supplier.default_markup_pct ?? 40)}%{' · '}
                        Cuentas: {supplier.payment_accounts_count ?? 0}
                      </p>
                      {supplier.payment_note ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          Datos de pago y notas del proveedor:{' '}
                          {supplier.payment_note}
                        </p>
                      ) : null}
                      {supplier.notes ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          {supplier.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/suppliers/${supplier.supplier_id}`}
                        className="text-xs font-semibold text-zinc-700"
                      >
                        Ver detalle
                      </Link>
                      <SupplierActions
                        supplierId={supplier.supplier_id}
                        name={supplier.name}
                        contactName={supplier.contact_name}
                        phone={supplier.phone}
                        email={supplier.email}
                        notes={supplier.notes}
                        isActive={supplier.is_active}
                        orderFrequency={supplier.order_frequency}
                        orderDay={supplier.order_day}
                        receiveDay={supplier.receive_day}
                        paymentTermsDays={supplier.payment_terms_days}
                        preferredPaymentMethod={
                          supplier.preferred_payment_method
                        }
                        paymentNote={supplier.payment_note}
                        defaultMarkupPct={supplier.default_markup_pct}
                        orderFrequencyOptions={orderFrequencyOptions}
                        weekdayOptions={weekdayOptions}
                        onSubmit={updateSupplier}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">
                Aún no tenés proveedores.
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
