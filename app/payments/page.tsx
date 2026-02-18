import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  branch_id?: string;
  supplier_id?: string;
  state?: string;
  result?: string;
};

type BranchRow = {
  id: string;
  name: string;
};

type SupplierRow = {
  id: string;
  name: string;
};

type PayableRow = {
  payable_id: string;
  order_id: string;
  branch_id: string;
  branch_name: string | null;
  supplier_id: string;
  supplier_name: string | null;
  payable_status: 'pending' | 'partial' | 'paid';
  payment_state: 'pending' | 'partial' | 'paid' | 'overdue' | 'not_created';
  estimated_amount: number;
  invoice_amount: number | null;
  paid_amount: number;
  outstanding_amount: number;
  due_on: string | null;
  due_in_days: number | null;
  is_overdue: boolean;
  preferred_payment_method: 'cash' | 'transfer' | null;
  selected_payment_method: 'cash' | 'transfer' | null;
  invoice_photo_url: string | null;
  invoice_note: string | null;
  created_at: string;
};

type PaymentAccountRow = {
  id: string;
  supplier_id: string;
  account_label: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_identifier: string | null;
  is_active: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-AR') : '—';

const formatStatus = (value: string) => {
  switch (value) {
    case 'pending':
      return 'Pendiente';
    case 'partial':
      return 'Parcial';
    case 'paid':
      return 'Pagado';
    case 'overdue':
      return 'Vencido';
    default:
      return value;
  }
};

const buildResultUrl = (
  branchId: string,
  supplierId: string,
  state: string,
  result: string,
) => {
  const params = new URLSearchParams();
  if (branchId) params.set('branch_id', branchId);
  if (supplierId) params.set('supplier_id', supplierId);
  if (state) params.set('state', state);
  if (result) params.set('result', result);
  return `/payments${params.toString() ? `?${params.toString()}` : ''}`;
};

export default async function PaymentsPage({
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

  const { data: branchesData } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');
  const branches = (branchesData as BranchRow[] | null) ?? [];

  const { data: suppliersData } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name');
  const suppliers = (suppliersData as SupplierRow[] | null) ?? [];

  const selectedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedSupplierId =
    typeof resolvedSearchParams.supplier_id === 'string'
      ? resolvedSearchParams.supplier_id
      : '';
  const selectedState =
    typeof resolvedSearchParams.state === 'string'
      ? resolvedSearchParams.state
      : '';

  let query = supabase
    .from('v_supplier_payables_admin')
    .select('*')
    .eq('org_id', orgId)
    .order('due_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (selectedBranchId) {
    query = query.eq('branch_id', selectedBranchId);
  }

  if (selectedSupplierId) {
    query = query.eq('supplier_id', selectedSupplierId);
  }

  if (selectedState && ['pending', 'partial', 'paid'].includes(selectedState)) {
    query = query.eq('payable_status', selectedState);
  }

  const { data: payablesData } = await query;
  const rawPayables = (payablesData as PayableRow[] | null) ?? [];

  const payables =
    selectedState === 'overdue'
      ? rawPayables.filter((row) => row.is_overdue)
      : selectedState === 'due_soon'
        ? rawPayables.filter(
            (row) =>
              row.payable_status !== 'paid' &&
              row.due_in_days != null &&
              row.due_in_days >= 0 &&
              row.due_in_days <= 7,
          )
        : rawPayables;

  const payableSupplierIds = Array.from(
    new Set(payables.map((row) => row.supplier_id).filter(Boolean)),
  );

  const { data: accountsData } =
    payableSupplierIds.length > 0
      ? await supabase
          .from('supplier_payment_accounts')
          .select(
            'id, supplier_id, account_label, bank_name, account_holder_name, account_identifier, is_active',
          )
          .eq('org_id', orgId)
          .eq('is_active', true)
          .in('supplier_id', payableSupplierIds)
          .order('created_at', { ascending: false })
      : { data: [] };

  const accountsBySupplier = new Map<string, PaymentAccountRow[]>();
  ((accountsData as PaymentAccountRow[] | null) ?? []).forEach((account) => {
    const list = accountsBySupplier.get(account.supplier_id) ?? [];
    list.push(account);
    accountsBySupplier.set(account.supplier_id, list);
  });

  const updatePayable = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const payableId = String(formData.get('payable_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const state = String(formData.get('state') ?? '').trim();
    const invoiceAmountRaw = String(
      formData.get('invoice_amount') ?? '',
    ).trim();
    const dueOnRaw = String(formData.get('due_on') ?? '').trim();
    const selectedMethod = String(
      formData.get('selected_payment_method') ?? '',
    ).trim();
    const invoicePhotoUrl = String(
      formData.get('invoice_photo_url') ?? '',
    ).trim();
    const invoiceNote = String(formData.get('invoice_note') ?? '').trim();

    const invoiceAmount =
      invoiceAmountRaw === '' ? null : Number(invoiceAmountRaw);
    if (
      invoiceAmount !== null &&
      (Number.isNaN(invoiceAmount) || invoiceAmount < 0)
    ) {
      redirect(
        buildResultUrl(branchId, supplierId, state, 'error:invalid_amount'),
      );
    }

    const { error } = await actionSession.supabase.rpc(
      'rpc_update_supplier_payable',
      {
        p_org_id: actionSession.orgId,
        p_payable_id: payableId,
        p_invoice_amount: invoiceAmount ?? undefined,
        p_due_on: dueOnRaw || undefined,
        p_invoice_photo_url: invoicePhotoUrl || undefined,
        p_invoice_note: invoiceNote || undefined,
        p_selected_payment_method:
          selectedMethod === 'cash' || selectedMethod === 'transfer'
            ? selectedMethod
            : undefined,
      },
    );

    revalidatePath('/payments');
    revalidatePath('/orders');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(
        buildResultUrl(branchId, supplierId, state, `error:${error.message}`),
      );
    }

    redirect(buildResultUrl(branchId, supplierId, state, 'payable_updated'));
  };

  const registerPayment = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const payableId = String(formData.get('payable_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const state = String(formData.get('state') ?? '').trim();
    const amount = Number(String(formData.get('amount') ?? '0'));
    const paymentMethod = String(formData.get('payment_method') ?? '').trim();
    const transferAccountId = String(
      formData.get('transfer_account_id') ?? '',
    ).trim();
    const reference = String(formData.get('reference') ?? '').trim();
    const note = String(formData.get('note') ?? '').trim();

    if (
      Number.isNaN(amount) ||
      amount <= 0 ||
      (paymentMethod !== 'cash' && paymentMethod !== 'transfer')
    ) {
      redirect(
        buildResultUrl(branchId, supplierId, state, 'error:invalid_payment'),
      );
    }

    const { error } = await actionSession.supabase.rpc(
      'rpc_register_supplier_payment',
      {
        p_org_id: actionSession.orgId,
        p_payable_id: payableId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_transfer_account_id: transferAccountId || undefined,
        p_reference: reference || undefined,
        p_note: note || undefined,
      },
    );

    revalidatePath('/payments');
    revalidatePath('/orders');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(
        buildResultUrl(branchId, supplierId, state, `error:${error.message}`),
      );
    }

    redirect(buildResultUrl(branchId, supplierId, state, 'payment_registered'));
  };

  const result =
    typeof resolvedSearchParams.result === 'string'
      ? resolvedSearchParams.result
      : '';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Pagos a proveedores
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Gestiona pendientes por sucursal y registra pagos parciales o
              totales.
            </p>
          </div>
          <Link
            href="/settings/audit-log"
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Ver auditoría
          </Link>
        </header>

        {result === 'payable_updated' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Cuenta por pagar actualizada.
          </p>
        ) : null}
        {result === 'payment_registered' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Pago registrado.
          </p>
        ) : null}
        {result.startsWith('error:') ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Error: {result.replace('error:', '')}
          </p>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <form className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-zinc-700">
              Sucursal
              <select
                name="branch_id"
                defaultValue={selectedBranchId}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-700">
              Proveedor
              <select
                name="supplier_id"
                defaultValue={selectedSupplierId}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-700">
              Estado
              <select
                name="state"
                defaultValue={selectedState}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pagado</option>
                <option value="overdue">Vencido</option>
                <option value="due_soon">Vence pronto (7 días)</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
              >
                Filtrar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            Pendientes y pagos
          </h2>
          {payables.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No hay cuentas por pagar para estos filtros.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {payables.map((payable) => {
                const accounts =
                  accountsBySupplier.get(payable.supplier_id) ?? [];
                return (
                  <article
                    key={payable.payable_id}
                    className="rounded-lg border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {payable.supplier_name || 'Proveedor'} ·{' '}
                          {payable.branch_name || 'Sucursal'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Pedido:{' '}
                          <Link
                            href={`/orders/${payable.order_id}`}
                            className="font-semibold hover:underline"
                          >
                            {payable.order_id}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Estado pago:{' '}
                          <span
                            className={`font-semibold ${
                              payable.payment_state === 'paid'
                                ? 'text-emerald-700'
                                : payable.payment_state === 'overdue'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {formatStatus(payable.payment_state)}
                          </span>
                          {' · '}Vencimiento: {formatDate(payable.due_on)}
                          {' · '}Saldo:{' '}
                          {formatCurrency(
                            Number(payable.outstanding_amount ?? 0),
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        <p>
                          Estimado:{' '}
                          {formatCurrency(
                            Number(payable.estimated_amount ?? 0),
                          )}
                        </p>
                        <p>
                          Factura:{' '}
                          {formatCurrency(Number(payable.invoice_amount ?? 0))}
                        </p>
                        <p>
                          Pagado:{' '}
                          {formatCurrency(Number(payable.paid_amount ?? 0))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <form
                        action={updatePayable}
                        className="grid gap-2 rounded border border-zinc-200 p-3"
                      >
                        <input
                          type="hidden"
                          name="payable_id"
                          value={payable.payable_id}
                        />
                        <input
                          type="hidden"
                          name="branch_id"
                          value={selectedBranchId}
                        />
                        <input
                          type="hidden"
                          name="supplier_id"
                          value={selectedSupplierId}
                        />
                        <input
                          type="hidden"
                          name="state"
                          value={selectedState}
                        />
                        <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">
                          Datos de factura
                        </p>
                        <label className="text-xs text-zinc-600">
                          Monto exacto factura
                          <input
                            name="invoice_amount"
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={payable.invoice_amount ?? ''}
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-zinc-600">
                          Vence el
                          <input
                            name="due_on"
                            type="date"
                            defaultValue={
                              payable.due_on
                                ? new Date(payable.due_on)
                                    .toISOString()
                                    .slice(0, 10)
                                : ''
                            }
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-zinc-600">
                          Método seleccionado
                          <select
                            name="selected_payment_method"
                            defaultValue={payable.selected_payment_method ?? ''}
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          >
                            <option value="">Sin definir</option>
                            <option value="cash">Efectivo</option>
                            <option value="transfer">Transferencia</option>
                          </select>
                        </label>
                        <label className="text-xs text-zinc-600">
                          URL foto factura/remito
                          <input
                            name="invoice_photo_url"
                            defaultValue={payable.invoice_photo_url ?? ''}
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            placeholder="https://..."
                          />
                        </label>
                        <label className="text-xs text-zinc-600">
                          Observaciones
                          <textarea
                            name="invoice_note"
                            rows={2}
                            defaultValue={payable.invoice_note ?? ''}
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Guardar datos
                        </button>
                      </form>

                      <form
                        action={registerPayment}
                        className="grid gap-2 rounded border border-zinc-200 p-3"
                      >
                        <input
                          type="hidden"
                          name="payable_id"
                          value={payable.payable_id}
                        />
                        <input
                          type="hidden"
                          name="branch_id"
                          value={selectedBranchId}
                        />
                        <input
                          type="hidden"
                          name="supplier_id"
                          value={selectedSupplierId}
                        />
                        <input
                          type="hidden"
                          name="state"
                          value={selectedState}
                        />
                        <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">
                          Registrar pago
                        </p>
                        <label className="text-xs text-zinc-600">
                          Monto
                          <input
                            name="amount"
                            type="number"
                            min={0.01}
                            step="0.01"
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            required
                          />
                        </label>
                        <label className="text-xs text-zinc-600">
                          Método
                          <select
                            name="payment_method"
                            defaultValue={
                              payable.selected_payment_method ?? 'cash'
                            }
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          >
                            <option value="cash">Efectivo</option>
                            <option value="transfer">Transferencia</option>
                          </select>
                        </label>
                        <label className="text-xs text-zinc-600">
                          Cuenta transferencia (opcional)
                          <select
                            name="transfer_account_id"
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          >
                            <option value="">Sin cuenta</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.account_label ||
                                  account.account_identifier ||
                                  account.bank_name ||
                                  'Cuenta'}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-zinc-600">
                          Referencia (opcional)
                          <input
                            name="reference"
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-zinc-600">
                          Nota (opcional)
                          <input
                            name="note"
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Registrar pago
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
