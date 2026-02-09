import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  product_id: string | null;
  product_name: string | null;
  product_is_active: boolean | null;
  barcode: string | null;
  internal_code: string | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  relation_type: 'primary' | 'secondary' | null;
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.org_id || membership.role !== 'org_admin') {
    redirect('/no-access');
  }

  const supplierId = resolvedParams.supplierId;
  const { data: detailRows } = await supabase
    .from('v_supplier_detail_admin')
    .select('*')
    .eq('org_id', membership.org_id)
    .eq('supplier_id', supplierId);

  if (!detailRows || detailRows.length === 0) {
    redirect('/suppliers');
  }

  const supplier = detailRows[0] as SupplierDetailRow;
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
  const secondaryProducts = products.filter(
    (product) => product.relation_type === 'secondary',
  );

  const { data: productOptions } = await supabase
    .from('v_products_typeahead_admin')
    .select('product_id, name, is_active')
    .eq('org_id', membership.org_id)
    .eq('is_active', true)
    .order('name');

  const updateSupplier = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const name = String(formData.get('name') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const isActive = String(formData.get('is_active') ?? 'true') === 'true';
    const orderFrequency = String(formData.get('order_frequency') ?? '').trim();
    const orderDay = String(formData.get('order_day') ?? '').trim();
    const receiveDay = String(formData.get('receive_day') ?? '').trim();

    await supabaseServer.rpc('rpc_upsert_supplier', {
      p_supplier_id: supplierId,
      p_org_id: membership.org_id,
      p_name: name,
      p_contact_name: contactName,
      p_phone: phone,
      p_email: email,
      p_notes: notes,
      p_is_active: isActive,
      p_order_frequency: orderFrequency || null,
      p_order_day: orderDay || null,
      p_receive_day: receiveDay || null,
    });

    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath('/suppliers');
  };

  const addSupplierProduct = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const supplierSku = String(formData.get('supplier_sku') ?? '').trim();
    const supplierProductName = String(
      formData.get('supplier_product_name') ?? '',
    ).trim();
    const relationType = String(
      formData.get('relation_type') ?? 'primary',
    ).trim();
    const normalizedRelationType =
      relationType === 'secondary' ? 'secondary' : 'primary';

    if (!productId) return;

    await supabaseServer.rpc('rpc_upsert_supplier_product', {
      p_org_id: membership.org_id,
      p_supplier_id: supplierId,
      p_product_id: productId,
      p_supplier_sku: supplierSku,
      p_supplier_product_name: supplierProductName,
      p_relation_type: normalizedRelationType,
    });

    revalidatePath(`/suppliers/${supplierId}`);
  };

  const updateSupplierProduct = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const supplierSku = String(formData.get('supplier_sku') ?? '').trim();
    const supplierProductName = String(
      formData.get('supplier_product_name') ?? '',
    ).trim();
    const relationType = String(
      formData.get('relation_type') ?? 'primary',
    ).trim();
    const currentRelationType = String(
      formData.get('current_relation_type') ?? 'primary',
    ).trim();
    const normalizedRelationType =
      relationType === 'secondary' ? 'secondary' : 'primary';
    const normalizedCurrentRelationType =
      currentRelationType === 'secondary' ? 'secondary' : 'primary';

    if (!productId) return;

    if (normalizedRelationType !== normalizedCurrentRelationType) {
      await supabaseServer.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: membership.org_id,
        p_product_id: productId,
        p_relation_type: normalizedCurrentRelationType,
      });
    }

    await supabaseServer.rpc('rpc_upsert_supplier_product', {
      p_org_id: membership.org_id,
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

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    if (!productId) return;

    await supabaseServer.rpc('rpc_remove_supplier_product', {
      p_org_id: membership.org_id,
      p_supplier_id: supplierId,
      p_product_id: productId,
    });

    revalidatePath(`/suppliers/${supplierId}`);
  };

  const createProductFromSupplier = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const name = String(formData.get('product_name') ?? '').trim();
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const sellUnitType = String(formData.get('sell_unit_type') ?? 'unit') as
      | 'unit'
      | 'weight'
      | 'bulk';
    const uom = String(formData.get('uom') ?? '').trim();
    const unitPriceRaw = String(formData.get('unit_price') ?? '0').trim();

    if (!name) return;

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;

    const productId = randomUUID();

    await supabaseServer.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: membership.org_id,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: true,
    });

    await supabaseServer.rpc('rpc_upsert_supplier_product', {
      p_org_id: membership.org_id,
      p_supplier_id: supplierId,
      p_product_id: productId,
      p_supplier_sku: '',
      p_supplier_product_name: '',
      p_relation_type: 'primary',
    });

    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath('/products');
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
            Crear producto nuevo
          </h2>
          <form
            action={createProductFromSupplier}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm text-zinc-600">
              Nombre
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
              Barcode
              <input
                name="barcode"
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
            Productos asociados
          </h2>
          <form
            action={addSupplierProduct}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            <label className="text-sm text-zinc-600 md:col-span-2">
              Producto
              <select
                name="product_id"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar</option>
                {productOptions
                  ?.filter((product) => Boolean(product.product_id))
                  .map((product) => (
                    <option
                      key={String(product.product_id)}
                      value={String(product.product_id)}
                    >
                      {product.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm text-zinc-600">
              SKU proveedor
              <input
                name="supplier_sku"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Nombre proveedor
              <input
                name="supplier_product_name"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Tipo
              <select
                name="relation_type"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="primary"
              >
                <option value="primary">Principal</option>
                <option value="secondary">Secundario</option>
              </select>
            </label>
            <div className="md:col-span-4">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Asociar producto
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-3">
            {products.length === 0 ? (
              <div className="text-sm text-zinc-500">
                Este proveedor no tiene productos asociados.
              </div>
            ) : (
              <>
                {primaryProducts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase">
                      Productos principales
                    </p>
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
                            SKU proveedor
                            <input
                              name="supplier_sku"
                              defaultValue={product.supplier_sku ?? ''}
                              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            />
                          </label>
                          <label className="text-xs text-zinc-600">
                            Nombre proveedor
                            <input
                              name="supplier_product_name"
                              defaultValue={product.supplier_product_name ?? ''}
                              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            />
                          </label>
                          <label className="text-xs text-zinc-600">
                            Tipo
                            <select
                              name="relation_type"
                              defaultValue={product.relation_type}
                              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            >
                              <option value="primary">Principal</option>
                              <option value="secondary">Secundario</option>
                            </select>
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
                ) : null}

                {secondaryProducts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase">
                      Productos secundarios
                    </p>
                    {secondaryProducts.map((product) => (
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
                            SKU proveedor
                            <input
                              name="supplier_sku"
                              defaultValue={product.supplier_sku ?? ''}
                              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            />
                          </label>
                          <label className="text-xs text-zinc-600">
                            Nombre proveedor
                            <input
                              name="supplier_product_name"
                              defaultValue={product.supplier_product_name ?? ''}
                              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            />
                          </label>
                          <label className="text-xs text-zinc-600">
                            Tipo
                            <select
                              name="relation_type"
                              defaultValue={product.relation_type}
                              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                            >
                              <option value="primary">Principal</option>
                              <option value="secondary">Secundario</option>
                            </select>
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
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
