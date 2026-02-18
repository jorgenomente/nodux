import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SupplierDetailRow = {
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
  accepts_cash: boolean;
  accepts_transfer: boolean;
  payment_note: string | null;
  product_id: string | null;
  product_name: string | null;
  product_is_active: boolean | null;
  barcode: string | null;
  internal_code: string | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  relation_type: 'primary' | 'secondary' | null;
};

type SupplierPaymentAccountRow = {
  id: string;
  account_label: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_identifier: string | null;
  is_active: boolean;
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

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const resolvedParams = await params;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }
  const supabase = session.supabase;
  const orgId = session.orgId;

  const supplierId = resolvedParams.supplierId;
  const { data: detailRows } = await supabase
    .from('v_supplier_detail_admin')
    .select('*')
    .eq('org_id', orgId)
    .eq('supplier_id', supplierId);

  if (!detailRows || detailRows.length === 0) {
    redirect('/suppliers');
  }

  const supplier = detailRows[0] as SupplierDetailRow;
  const { data: paymentAccountsData } = await supabase
    .from('supplier_payment_accounts')
    .select(
      'id, account_label, bank_name, account_holder_name, account_identifier, is_active',
    )
    .eq('org_id', orgId)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  const paymentAccounts =
    (paymentAccountsData as SupplierPaymentAccountRow[] | null) ?? [];
  const products = (detailRows as SupplierDetailRow[])
    .filter((row) => row.product_id)
    .map((row) => ({
      product_id: row.product_id as string,
      product_name: row.product_name,
      product_is_active: row.product_is_active,
      barcode: row.barcode,
      internal_code: row.internal_code,
      supplier_sku: row.supplier_sku,
      supplier_product_name: row.supplier_product_name,
      relation_type: row.relation_type ?? 'primary',
    }));

  const primaryProducts = products.filter(
    (product) => product.relation_type === 'primary',
  );

  const updateSupplier = async (formData: FormData) => {
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
    const acceptsCash = formData.get('accepts_cash') === 'on';
    const acceptsTransfer = formData.get('accepts_transfer') === 'on';
    const paymentNote = String(formData.get('payment_note') ?? '').trim();
    const paymentTermsDays =
      paymentTermsDaysRaw === ''
        ? null
        : Number.parseInt(paymentTermsDaysRaw, 10);

    if (
      paymentTermsDays !== null &&
      (Number.isNaN(paymentTermsDays) || paymentTermsDays < 0)
    ) {
      return;
    }

    await supabaseServer.rpc('rpc_upsert_supplier', {
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
    });

    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath('/suppliers');
  };

  const updateSupplierProduct = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const productId = String(formData.get('product_id') ?? '').trim();
    const supplierSku = String(formData.get('supplier_sku') ?? '').trim();
    const supplierProductName = String(
      formData.get('supplier_product_name') ?? '',
    ).trim();
    const currentRelationType = String(
      formData.get('current_relation_type') ?? 'primary',
    ).trim();
    const normalizedRelationType = 'primary';
    const normalizedCurrentRelationType =
      currentRelationType === 'secondary' ? 'secondary' : 'primary';

    if (!productId) return;

    if (normalizedRelationType !== normalizedCurrentRelationType) {
      await supabaseServer.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: orgId,
        p_product_id: productId,
        p_relation_type: normalizedCurrentRelationType,
      });
    }

    await supabaseServer.rpc('rpc_upsert_supplier_product', {
      p_org_id: orgId,
      p_supplier_id: supplierId,
      p_product_id: productId,
      p_supplier_sku: supplierSku,
      p_supplier_product_name: supplierProductName,
      p_relation_type: normalizedRelationType,
    });

    revalidatePath(`/suppliers/${supplierId}`);
  };

  const removeSupplierProduct = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const productId = String(formData.get('product_id') ?? '').trim();
    if (!productId) return;

    await supabaseServer.rpc('rpc_remove_supplier_product', {
      p_org_id: orgId,
      p_supplier_id: supplierId,
      p_product_id: productId,
    });

    revalidatePath(`/suppliers/${supplierId}`);
  };

  const createProductFromSupplier = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const name = String(formData.get('product_name') ?? '').trim();
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const sellUnitType = String(formData.get('sell_unit_type') ?? 'unit') as
      | 'unit'
      | 'weight'
      | 'bulk';
    const uom = String(formData.get('uom') ?? '').trim();
    const unitPriceRaw = String(formData.get('unit_price') ?? '0').trim();
    const shelfLifeRaw = String(formData.get('shelf_life_days') ?? '').trim();
    const safetyStockAllRaw = String(
      formData.get('safety_stock_all') ?? '',
    ).trim();
    const supplierSku = String(formData.get('supplier_sku') ?? '').trim();
    const supplierProductName = String(
      formData.get('supplier_product_name') ?? '',
    ).trim();

    if (!name) return;

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      return;
    }

    const productId = randomUUID();

    await supabaseServer.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: orgId,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: true,
      p_shelf_life_days: shelfLifeDays,
    });

    if (safetyStockAllRaw !== '') {
      const safetyStock = Number(safetyStockAllRaw);
      if (!Number.isNaN(safetyStock) && safetyStock >= 0) {
        const { data: activeBranches } = await supabaseServer
          .from('branches')
          .select('id')
          .eq('org_id', orgId)
          .eq('is_active', true);

        await Promise.all(
          (activeBranches ?? []).map((branch) =>
            supabaseServer.rpc('rpc_set_safety_stock', {
              p_org_id: orgId,
              p_branch_id: branch.id,
              p_product_id: productId,
              p_safety_stock: safetyStock,
            }),
          ),
        );
      }
    }

    await supabaseServer.rpc('rpc_upsert_supplier_product', {
      p_org_id: orgId,
      p_supplier_id: supplierId,
      p_product_id: productId,
      p_supplier_sku: supplierSku,
      p_supplier_product_name: supplierProductName,
      p_relation_type: 'primary',
    });

    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath('/products');
  };

  const upsertPaymentAccount = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const accountId = String(formData.get('account_id') ?? '').trim();
    const accountLabel = String(formData.get('account_label') ?? '').trim();
    const bankName = String(formData.get('bank_name') ?? '').trim();
    const accountHolderName = String(
      formData.get('account_holder_name') ?? '',
    ).trim();
    const accountIdentifier = String(
      formData.get('account_identifier') ?? '',
    ).trim();
    const isActive = formData.get('is_active') === 'on';

    await supabaseServer.rpc('rpc_upsert_supplier_payment_account', {
      p_org_id: orgId,
      p_supplier_id: supplierId,
      p_account_id: accountId || undefined,
      p_account_label: accountLabel || undefined,
      p_bank_name: bankName || undefined,
      p_account_holder_name: accountHolderName || undefined,
      p_account_identifier: accountIdentifier || undefined,
      p_is_active: isActive,
    });

    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath('/payments');
  };

  const setPaymentAccountActive = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const accountId = String(formData.get('account_id') ?? '').trim();
    const isActive = String(formData.get('is_active') ?? 'false') === 'true';

    if (!accountId) return;

    await supabaseServer.rpc('rpc_set_supplier_payment_account_active', {
      p_org_id: orgId,
      p_account_id: accountId,
      p_is_active: isActive,
    });

    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath('/payments');
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">
              <Link href="/suppliers" className="hover:underline">
                Proveedores
              </Link>{' '}
              / {supplier.name}
            </p>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {supplier.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {supplier.is_active ? 'Activo' : 'Inactivo'}
            </p>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Datos del proveedor
          </h2>
          <form
            action={updateSupplier}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm text-zinc-600">
              Nombre
              <input
                name="name"
                defaultValue={supplier.name}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Contacto
              <input
                name="contact_name"
                defaultValue={supplier.contact_name ?? ''}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Teléfono
              <input
                name="phone"
                defaultValue={supplier.phone ?? ''}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Email
              <input
                name="email"
                type="email"
                defaultValue={supplier.email ?? ''}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600 md:col-span-2">
              Notas
              <textarea
                name="notes"
                defaultValue={supplier.notes ?? ''}
                rows={2}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Estado
              <select
                name="is_active"
                defaultValue={String(supplier.is_active)}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
            <label className="text-sm text-zinc-600">
              Frecuencia
              <select
                name="order_frequency"
                defaultValue={supplier.order_frequency ?? ''}
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
                defaultValue={supplier.order_day ?? ''}
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
                defaultValue={supplier.receive_day ?? ''}
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
                defaultValue={supplier.payment_terms_days ?? ''}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Método preferido
              <select
                name="preferred_payment_method"
                defaultValue={supplier.preferred_payment_method ?? ''}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Sin preferencia</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                name="accepts_cash"
                type="checkbox"
                defaultChecked={supplier.accepts_cash}
              />
              Acepta efectivo
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                name="accepts_transfer"
                type="checkbox"
                defaultChecked={supplier.accepts_transfer}
              />
              Acepta transferencia
            </label>
            <label className="text-sm text-zinc-600 md:col-span-2">
              Nota de pago
              <textarea
                name="payment_note"
                defaultValue={supplier.payment_note ?? ''}
                rows={2}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Cuentas de transferencia
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Puedes registrar cuentas para pagar por transferencia cuando
            corresponda.
          </p>
          <form
            action={upsertPaymentAccount}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm text-zinc-600">
              Alias / etiqueta
              <input
                name="account_label"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Banco
              <input
                name="bank_name"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Titular
              <input
                name="account_holder_name"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              CBU/CVU/Alias
              <input
                name="account_identifier"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input name="is_active" type="checkbox" defaultChecked />
              Activa
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar cuenta
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-2">
            {paymentAccounts.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aún no hay cuentas registradas.
              </p>
            ) : (
              paymentAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded border border-zinc-200 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {account.account_label || 'Cuenta sin etiqueta'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {account.bank_name || 'Sin banco'} ·{' '}
                        {account.account_holder_name || 'Sin titular'} ·{' '}
                        {account.account_identifier || 'Sin identificador'}
                      </p>
                    </div>
                    <form action={setPaymentAccountActive}>
                      <input
                        type="hidden"
                        name="account_id"
                        value={account.id}
                      />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(!account.is_active)}
                      />
                      <button
                        type="submit"
                        className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                      >
                        {account.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Crear producto nuevo
          </h2>
          <form
            action={createProductFromSupplier}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm text-zinc-600">
              Nombre de articulo en la tienda
              <input
                name="product_name"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="text-sm text-zinc-600">
              Código interno
              <input
                name="internal_code"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Codigo de barras
              <input
                name="barcode"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Nombre de articulo en proveedor (opcional)
              <input
                name="supplier_product_name"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              SKU en proveedor (opcional)
              <input
                name="supplier_sku"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Unidad de venta
              <select
                name="sell_unit_type"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="unit"
              >
                <option value="unit">Unidad</option>
                <option value="weight">Peso</option>
                <option value="bulk">Granel</option>
              </select>
            </label>
            <label className="text-sm text-zinc-600">
              Unidad de medida
              <input
                name="uom"
                defaultValue="unit"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Precio unitario
              <input
                name="unit_price"
                type="number"
                step="0.01"
                defaultValue="0"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Vencimiento aproximado (días)
              <input
                name="shelf_life_days"
                type="number"
                step="1"
                min="0"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Ej: 30"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Stock minimo (todas las sucursales)
              <input
                name="safety_stock_all"
                type="number"
                step="0.001"
                min="0"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="0"
              />
              <span
                className="mt-1 block text-xs text-zinc-400"
                title="Cantidad minima sugerida para evitar quiebres. Se usa en sugerencias de compra."
              >
                ⓘ Se aplica a todas las sucursales activas
              </span>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Crear y asociar como primario
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Productos principales
          </h2>
          <div className="mt-4 space-y-3">
            {primaryProducts.length === 0 ? (
              <div className="text-sm text-zinc-500">
                Este proveedor no tiene productos principales asociados.
              </div>
            ) : (
              <div className="space-y-3">
                {primaryProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="rounded border border-zinc-200 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {product.product_name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {product.internal_code || 'Sin SKU'} ·{' '}
                          {product.barcode || 'Sin barcode'}
                        </p>
                      </div>
                      <form action={removeSupplierProduct}>
                        <input
                          type="hidden"
                          name="product_id"
                          value={product.product_id}
                        />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-red-600"
                        >
                          Remover
                        </button>
                      </form>
                    </div>
                    <form
                      action={updateSupplierProduct}
                      className="mt-3 grid gap-2 md:grid-cols-4"
                    >
                      <input
                        type="hidden"
                        name="product_id"
                        value={product.product_id}
                      />
                      <input
                        type="hidden"
                        name="current_relation_type"
                        value={product.relation_type}
                      />
                      <label className="text-xs text-zinc-600">
                        SKU en proveedor
                        <input
                          name="supplier_sku"
                          defaultValue={product.supplier_sku ?? ''}
                          className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="text-xs text-zinc-600">
                        Nombre del producto en proveedor
                        <input
                          name="supplier_product_name"
                          defaultValue={product.supplier_product_name ?? ''}
                          className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
