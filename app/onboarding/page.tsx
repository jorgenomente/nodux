import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  result?: string;
  message?: string;
  job_id?: string;
  total_rows?: string;
  valid_rows?: string;
  invalid_rows?: string;
  applied_rows?: string;
  skipped_rows?: string;
  resolver?: string;
};

type TaskKey =
  | 'products_without_primary_supplier'
  | 'products_without_shelf_life'
  | 'products_without_identifier'
  | 'suppliers_without_payment_terms'
  | 'suppliers_without_preferred_payment_method';

type OnboardingTaskRow = {
  task_key: TaskKey;
  task_label: string;
  pending_count: number;
};

type ImportJobRow = {
  id: string;
  template_key: string;
  source_file_name: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  applied_rows: number;
  created_at: string;
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type PendingProductRow = {
  id: string;
  name: string | null;
  internal_code: string | null;
  barcode: string | null;
};

const TASK_META: Array<{
  key: TaskKey;
  label: string;
  href: string;
}> = [
  {
    key: 'products_without_primary_supplier',
    label: 'Productos sin proveedor primario',
    href: '/onboarding?resolver=products_without_primary_supplier#resolver-products-without-primary-supplier',
  },
  {
    key: 'products_without_shelf_life',
    label: 'Productos sin vencimiento aproximado (dias)',
    href: '/products',
  },
  {
    key: 'products_without_identifier',
    label: 'Productos sin barcode ni codigo interno',
    href: '/products',
  },
  {
    key: 'suppliers_without_payment_terms',
    label: 'Proveedores sin plazo de pago',
    href: '/suppliers',
  },
  {
    key: 'suppliers_without_preferred_payment_method',
    label: 'Proveedores sin metodo de pago preferido',
    href: '/suppliers',
  },
];

const normalizeHeader = (header: string) =>
  header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parseCsvRows = (raw: string): string[][] => {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const nextChar = raw[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      currentRow.push(currentCell.trim());
      const hasContent = currentRow.some((cell) => cell !== '');
      if (hasContent) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }

  return rows;
};

const csvToObjects = (raw: string): Array<Record<string, string>> => {
  const rows = parseCsvRows(raw);
  if (rows.length < 2) return [];

  const rawHeaders = rows[0] ?? [];
  const used = new Set<string>();
  const headers = rawHeaders.map((header, index) => {
    const base = normalizeHeader(header) || `column_${index + 1}`;
    let unique = base;
    let counter = 2;
    while (used.has(unique)) {
      unique = `${base}_${counter}`;
      counter += 1;
    }
    used.add(unique);
    return unique;
  });

  const objects: Array<Record<string, string>> = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const obj: Record<string, string> = {};
    let nonEmptyCount = 0;
    headers.forEach((header, headerIndex) => {
      const value = (row[headerIndex] ?? '').trim();
      obj[header] = value;
      if (value !== '') nonEmptyCount += 1;
    });
    if (nonEmptyCount > 0) {
      objects.push(obj);
    }
  }

  return objects;
};

async function callUntypedRpc<T>(
  supabaseClient: unknown,
  fnName: string,
  params: Record<string, unknown>,
) {
  return (
    supabaseClient as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: T; error: { message: string } | null }>;
    }
  ).rpc(fnName, params);
}

export default async function OnboardingPage({
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

  const orgId = session.orgId;
  const supabase = session.supabase;

  const importCsv = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const actionOrgId = actionSession.orgId;
    const actionSupabase = actionSession.supabase;
    const templateKey = String(formData.get('template_key') ?? '').trim();
    const applyNow = formData.get('apply_now') === 'on';
    const csvFile = formData.get('csv_file');

    if (
      !['products', 'suppliers', 'products_suppliers'].includes(templateKey)
    ) {
      redirect('/onboarding?result=invalid&message=template');
    }

    if (!(csvFile instanceof File) || csvFile.size === 0) {
      redirect('/onboarding?result=invalid&message=file');
    }

    if (csvFile.size > 8 * 1024 * 1024) {
      redirect('/onboarding?result=invalid&message=file_too_large');
    }

    const content = await csvFile.text();
    const records = csvToObjects(content);

    if (records.length === 0) {
      redirect('/onboarding?result=invalid&message=empty');
    }

    if (records.length > 5000) {
      redirect('/onboarding?result=invalid&message=too_many_rows');
    }

    const { data: jobData, error: createJobError } = await callUntypedRpc<
      Array<{ job_id: string }>
    >(actionSupabase, 'rpc_create_data_import_job', {
      p_org_id: actionOrgId,
      p_template_key: templateKey,
      p_source_file_name: csvFile.name,
      p_source_file_path: null as unknown as string,
    });

    if (createJobError || !jobData?.[0]?.job_id) {
      redirect('/onboarding?result=error&message=create_job');
    }

    const jobId = String(jobData[0].job_id);

    for (let index = 0; index < records.length; index += 1) {
      const row = records[index];
      const { error: rowError } = await callUntypedRpc<
        Array<{ row_id: string }>
      >(actionSupabase, 'rpc_upsert_data_import_row', {
        p_org_id: actionOrgId,
        p_job_id: jobId,
        p_row_number: index + 1,
        p_raw_payload: row,
        p_normalized_payload: null as unknown as Record<string, string>,
      });

      if (rowError) {
        redirect(`/onboarding?result=error&message=row_${index + 1}`);
      }
    }

    const { data: validateData, error: validateError } = await callUntypedRpc<
      Array<{ total_rows: number; valid_rows: number; invalid_rows: number }>
    >(actionSupabase, 'rpc_validate_data_import_job', {
      p_org_id: actionOrgId,
      p_job_id: jobId,
    });

    if (validateError || !validateData?.[0]) {
      redirect('/onboarding?result=error&message=validate');
    }

    const validation = validateData[0];
    let appliedRows = 0;
    let skippedRows = Number(validation.invalid_rows ?? 0);

    if (applyNow && Number(validation.valid_rows ?? 0) > 0) {
      const { data: applyData, error: applyError } = await callUntypedRpc<
        Array<{ applied_rows: number; skipped_rows: number }>
      >(actionSupabase, 'rpc_apply_data_import_job', {
        p_org_id: actionOrgId,
        p_job_id: jobId,
        p_apply_mode: 'valid_only',
      });

      if (applyError || !applyData?.[0]) {
        redirect('/onboarding?result=error&message=apply');
      }

      appliedRows = Number(applyData[0].applied_rows ?? 0);
      skippedRows = Number(applyData[0].skipped_rows ?? 0);
    }

    revalidatePath('/onboarding');
    revalidatePath('/products');
    revalidatePath('/suppliers');
    revalidatePath('/orders');
    revalidatePath('/payments');

    const params = new URLSearchParams({
      result: 'imported',
      job_id: jobId,
      total_rows: String(validation.total_rows ?? 0),
      valid_rows: String(validation.valid_rows ?? 0),
      invalid_rows: String(validation.invalid_rows ?? 0),
      applied_rows: String(appliedRows),
      skipped_rows: String(skippedRows),
    });

    redirect(`/onboarding?${params.toString()}`);
  };

  const [tasksResult, jobsResult] = await Promise.all([
    supabase
      .from('v_data_onboarding_tasks' as never)
      .select('task_key, task_label, pending_count')
      .eq('org_id', orgId),
    supabase
      .from('data_import_jobs' as never)
      .select(
        'id, template_key, source_file_name, status, total_rows, valid_rows, invalid_rows, applied_rows, created_at',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);
  const [suppliersResult, activeProductsResult, primaryRelationsResult] =
    await Promise.all([
      supabase
        .from('suppliers')
        .select('id, name, is_active')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('products')
        .select('id, name, internal_code, barcode')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('supplier_products')
        .select('product_id')
        .eq('org_id', orgId)
        .eq('relation_type', 'primary'),
    ]);

  const tasks = (tasksResult.data ?? []) as OnboardingTaskRow[];
  const jobs = (jobsResult.data ?? []) as ImportJobRow[];
  const suppliers = (suppliersResult.data ?? []).filter(
    (supplier) => supplier.id && supplier.name,
  ) as SupplierOption[];
  const activeProducts = (activeProductsResult.data ??
    []) as PendingProductRow[];
  const primaryProducts = new Set(
    (primaryRelationsResult.data ?? [])
      .map((row) => String((row as { product_id?: string | null }).product_id))
      .filter((value) => value && value !== 'undefined' && value !== 'null'),
  );
  const pendingPrimarySupplierProducts = activeProducts.filter(
    (product) => !primaryProducts.has(product.id),
  );
  const quickResolverProducts = pendingPrimarySupplierProducts.slice(0, 25);
  const isPrimarySupplierResolverOpen =
    resolvedSearchParams.resolver === 'products_without_primary_supplier';
  const taskMap = new Map<TaskKey, number>(
    tasks.map((task) => [task.task_key, Number(task.pending_count ?? 0)]),
  );
  const totalPending = TASK_META.reduce(
    (sum, task) => sum + Number(taskMap.get(task.key) ?? 0),
    0,
  );

  const importSummary =
    resolvedSearchParams.result === 'imported'
      ? {
          jobId: resolvedSearchParams.job_id ?? '-',
          totalRows: Number(resolvedSearchParams.total_rows ?? 0),
          validRows: Number(resolvedSearchParams.valid_rows ?? 0),
          invalidRows: Number(resolvedSearchParams.invalid_rows ?? 0),
          appliedRows: Number(resolvedSearchParams.applied_rows ?? 0),
          skippedRows: Number(resolvedSearchParams.skipped_rows ?? 0),
        }
      : null;

  const showError = resolvedSearchParams.result === 'error';
  const showInvalid = resolvedSearchParams.result === 'invalid';
  const showPrimarySupplierResolved =
    resolvedSearchParams.result === 'resolved_primary_supplier';

  const resolvePrimarySupplier = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const actionOrgId = actionSession.orgId;
    const actionSupabase = actionSession.supabase;
    const productId = String(formData.get('product_id') ?? '').trim();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const supplierSku = String(formData.get('supplier_sku') ?? '').trim();
    const supplierProductName = String(
      formData.get('supplier_product_name') ?? '',
    ).trim();

    if (!productId || !supplierId) {
      redirect(
        '/onboarding?resolver=products_without_primary_supplier&result=invalid&message=resolver_required',
      );
    }

    const { error } = await actionSupabase.rpc('rpc_upsert_supplier_product', {
      p_org_id: actionOrgId,
      p_supplier_id: supplierId,
      p_product_id: productId,
      p_supplier_sku: supplierSku,
      p_supplier_product_name: supplierProductName,
      p_relation_type: 'primary',
    });

    if (error) {
      redirect(
        '/onboarding?resolver=products_without_primary_supplier&result=error&message=resolve_primary_supplier',
      );
    }

    revalidatePath('/onboarding');
    revalidatePath('/products');
    revalidatePath('/suppliers');

    redirect(
      '/onboarding?resolver=products_without_primary_supplier&result=resolved_primary_supplier',
    );
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Onboarding de datos
          </h1>
          <p className="text-sm text-zinc-600">
            Importa catalogos por CSV y completa datos maestros para una
            operacion consistente.
          </p>
        </header>

        {importSummary ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              Importacion finalizada (job {importSummary.jobId})
            </p>
            <p className="mt-1">
              Filas: {importSummary.totalRows} total · {importSummary.validRows}{' '}
              validas · {importSummary.invalidRows} invalidas ·{' '}
              {importSummary.appliedRows} aplicadas ·{' '}
              {importSummary.skippedRows} omitidas
            </p>
          </section>
        ) : null}

        {showError ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            No pudimos completar la importacion. Paso fallido:{' '}
            <span className="font-semibold">
              {resolvedSearchParams.message ?? '-'}
            </span>
          </section>
        ) : null}

        {showInvalid ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Datos invalidos para importar. Detalle:{' '}
            <span className="font-semibold">
              {resolvedSearchParams.message ?? '-'}
            </span>
          </section>
        ) : null}

        {showPrimarySupplierResolved ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Proveedor primario asignado correctamente.
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              Importar CSV
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Formatos soportados en esta fase: CSV (hasta 5000 filas).
            </p>
            <form action={importCsv} className="mt-4 flex flex-col gap-4">
              <label className="text-sm text-zinc-700">
                Plantilla
                <select
                  name="template_key"
                  defaultValue="products_suppliers"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="products_suppliers">
                    Productos + proveedores
                  </option>
                  <option value="products">Solo productos</option>
                  <option value="suppliers">Solo proveedores</option>
                </select>
              </label>

              <label className="text-sm text-zinc-700">
                Archivo CSV
                <input
                  type="file"
                  name="csv_file"
                  accept=".csv,text/csv"
                  required
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="apply_now" defaultChecked />
                Aplicar filas validas automaticamente
              </label>

              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Validar e importar
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              Exportes maestros
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Descarga snapshots actuales para respaldo o migracion a otra
              sucursal.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link
                href="/onboarding/export?type=products"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                Descargar productos_master.csv
              </Link>
              <Link
                href="/onboarding/export?type=suppliers"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                Descargar proveedores_master.csv
              </Link>
              <Link
                href="/onboarding/export?type=product_supplier"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                Descargar producto_proveedor_master.csv
              </Link>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-zinc-900">
              Pendientes de completitud
            </h2>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Total pendientes: {totalPending}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {TASK_META.map((task) => {
              const count = Number(taskMap.get(task.key) ?? 0);
              return (
                <article
                  key={task.key}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {task.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {count}
                  </p>
                  <Link
                    href={task.href}
                    className="mt-3 inline-block text-xs font-medium text-zinc-700 underline"
                  >
                    {task.key === 'products_without_primary_supplier'
                      ? 'Resolver ahora (rapido)'
                      : 'Resolver ahora'}
                  </Link>
                </article>
              );
            })}
          </div>

          {isPrimarySupplierResolverOpen ? (
            <div
              id="resolver-products-without-primary-supplier"
              className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Resolucion rapida: productos sin proveedor primario
                </h3>
                <span className="text-xs text-zinc-600">
                  Mostrando {quickResolverProducts.length} de{' '}
                  {pendingPrimarySupplierProducts.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                Completa proveedor y confirma con OK sin salir de esta pantalla.
              </p>

              {suppliers.length === 0 ? (
                <p className="mt-3 text-sm text-amber-700">
                  No hay proveedores activos para asignar. Crea uno en{' '}
                  <Link href="/suppliers" className="underline">
                    /suppliers
                  </Link>
                  .
                </p>
              ) : quickResolverProducts.length === 0 ? (
                <p className="mt-3 text-sm text-emerald-700">
                  No quedan productos sin proveedor primario.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {quickResolverProducts.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-lg border border-zinc-200 bg-white p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-zinc-900">
                          {product.name ?? 'Producto'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {product.internal_code
                            ? `Cod: ${product.internal_code}`
                            : product.barcode
                              ? `Barcode: ${product.barcode}`
                              : 'Sin identificador'}
                        </span>
                      </div>
                      <form
                        action={resolvePrimarySupplier}
                        className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_auto]"
                      >
                        <input
                          type="hidden"
                          name="product_id"
                          value={product.id}
                        />
                        <select
                          name="supplier_id"
                          defaultValue=""
                          required
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Proveedor primario</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                        <input
                          name="supplier_sku"
                          placeholder="SKU proveedor (opcional)"
                          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <input
                          name="supplier_product_name"
                          defaultValue={product.name ?? ''}
                          placeholder="Nombre en proveedor (opcional)"
                          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                        >
                          OK
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            Importaciones recientes
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Archivo</th>
                  <th className="px-2 py-2">Plantilla</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Filas</th>
                  <th className="px-2 py-2 text-right">Validas</th>
                  <th className="px-2 py-2 text-right">Invalidas</th>
                  <th className="px-2 py-2 text-right">Aplicadas</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-zinc-500" colSpan={8}>
                      Aun no hay importaciones registradas.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-t border-zinc-100">
                      <td className="px-2 py-2 text-zinc-700">
                        {new Date(job.created_at).toLocaleString('es-AR')}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {job.source_file_name}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {job.template_key}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">{job.status}</td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.total_rows}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.valid_rows}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.invalid_rows}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.applied_rows}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
