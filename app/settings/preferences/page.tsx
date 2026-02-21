import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  result?: string;
  employee_branch_id?: string;
  employee_result?: string;
};

type PreferencesRow = {
  org_id: string;
  critical_days: number;
  warning_days: number;
  allow_negative_stock: boolean;
  cash_discount_enabled: boolean;
  cash_discount_default_pct: number;
  employee_discount_enabled: boolean;
  employee_discount_default_pct: number;
  employee_discount_combinable_with_cash_discount: boolean;
  cash_denominations: number[] | null;
};

type BranchRow = {
  id: string;
  name: string;
};

type EmployeeAccountRow = {
  id: string;
  name: string;
  is_active: boolean;
};

const DEFAULT_CASH_DENOMINATIONS = [100, 200, 500, 1000, 2000, 10000, 20000];

const parseCashDenominationsInput = (raw: string): number[] | null => {
  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;

  const parsed = tokens
    .map((token) => Number(token))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value * 100) / 100);

  const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);

  if (unique.length === 0) return null;
  return unique;
};

const getOrgAdminContext = async () => {
  const session = await getOrgAdminSession();
  if (!session?.orgId) return null;
  return { supabase: session.supabase, orgId: session.orgId };
};

export default async function SettingsPreferencesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getOrgAdminContext();

  if (!context) {
    redirect('/no-access');
  }

  const savePreferences = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const criticalDays = Number(String(formData.get('critical_days') ?? '0'));
    const warningDays = Number(String(formData.get('warning_days') ?? '0'));
    const allowNegativeStock = formData.get('allow_negative_stock') === 'on';
    const cashDiscountEnabled = formData.get('cash_discount_enabled') === 'on';
    const cashDiscountDefaultPct = Number(
      String(formData.get('cash_discount_default_pct') ?? '0'),
    );
    const employeeDiscountEnabled =
      formData.get('employee_discount_enabled') === 'on';
    const employeeDiscountDefaultPct = Number(
      String(formData.get('employee_discount_default_pct') ?? '0'),
    );
    const employeeDiscountCombinableWithCashDiscount =
      formData.get('employee_discount_combinable_with_cash_discount') === 'on';
    const cashDenominationsRaw = String(
      formData.get('cash_denominations_input') ?? '',
    ).trim();
    const cashDenominations = parseCashDenominationsInput(cashDenominationsRaw);

    if (
      Number.isNaN(criticalDays) ||
      Number.isNaN(warningDays) ||
      Number.isNaN(cashDiscountDefaultPct) ||
      Number.isNaN(employeeDiscountDefaultPct) ||
      criticalDays < 0 ||
      warningDays < criticalDays ||
      cashDiscountDefaultPct < 0 ||
      cashDiscountDefaultPct > 100 ||
      employeeDiscountDefaultPct < 0 ||
      employeeDiscountDefaultPct > 100 ||
      !cashDenominations
    ) {
      redirect('/settings/preferences?result=invalid');
    }

    const { data: previousRow } = await auth.supabase
      .from('org_preferences')
      .select(
        'critical_days, warning_days, allow_negative_stock, cash_discount_enabled, cash_discount_default_pct, employee_discount_enabled, employee_discount_default_pct, employee_discount_combinable_with_cash_discount, cash_denominations',
      )
      .eq('org_id', auth.orgId)
      .maybeSingle();

    await auth.supabase.from('org_preferences').upsert({
      org_id: auth.orgId,
      critical_days: criticalDays,
      warning_days: warningDays,
      allow_negative_stock: allowNegativeStock,
      cash_discount_enabled: cashDiscountEnabled,
      cash_discount_default_pct: cashDiscountDefaultPct,
      employee_discount_enabled: employeeDiscountEnabled,
      employee_discount_default_pct: employeeDiscountDefaultPct,
      employee_discount_combinable_with_cash_discount:
        employeeDiscountCombinableWithCashDiscount,
      cash_denominations: cashDenominations,
    });

    await auth.supabase.rpc('rpc_log_audit_event', {
      p_org_id: auth.orgId,
      p_action_key: 'org_preferences_updated',
      p_entity_type: 'org_preferences',
      p_entity_id: auth.orgId,
      p_branch_id: null as unknown as string,
      p_metadata: {
        before: previousRow ?? null,
        after: {
          critical_days: criticalDays,
          warning_days: warningDays,
          allow_negative_stock: allowNegativeStock,
          cash_discount_enabled: cashDiscountEnabled,
          cash_discount_default_pct: cashDiscountDefaultPct,
          employee_discount_enabled: employeeDiscountEnabled,
          employee_discount_default_pct: employeeDiscountDefaultPct,
          employee_discount_combinable_with_cash_discount:
            employeeDiscountCombinableWithCashDiscount,
          cash_denominations: cashDenominations,
        },
      },
      p_actor_user_id: null as unknown as string,
    });

    revalidatePath('/settings/preferences');
    revalidatePath('/dashboard');
    revalidatePath('/expirations');
    revalidatePath('/pos');
    revalidatePath('/cashbox');
    redirect('/settings/preferences?result=saved');
  };

  const { data: branchesData } = await context.supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', context.orgId)
    .eq('is_active', true)
    .order('name');
  const branches = (branchesData ?? []) as BranchRow[];
  const requestedEmployeeBranchId =
    typeof searchParams.employee_branch_id === 'string'
      ? searchParams.employee_branch_id
      : '';
  const selectedEmployeeBranchId = branches.some(
    (branch) => branch.id === requestedEmployeeBranchId,
  )
    ? requestedEmployeeBranchId
    : (branches[0]?.id ?? '');

  const addEmployeeAccount = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('employee_branch_id') ?? '').trim();
    const name = String(formData.get('employee_name') ?? '').trim();
    if (!branchId || !name) {
      redirect(
        `/settings/preferences?employee_branch_id=${encodeURIComponent(branchId)}&employee_result=invalid`,
      );
    }

    const { data: existing } = await auth.supabase
      .from('employee_accounts' as never)
      .select('id, is_active')
      .eq('org_id', auth.orgId)
      .eq('branch_id', branchId)
      .eq('name', name)
      .maybeSingle();
    const existingAccount = (existing ?? null) as {
      id: string;
      is_active: boolean;
    } | null;

    if (existingAccount) {
      await auth.supabase
        .from('employee_accounts' as never)
        .update({ is_active: true } as never)
        .eq('id', existingAccount.id);
    } else {
      await auth.supabase.from('employee_accounts' as never).insert(
        {
          org_id: auth.orgId,
          branch_id: branchId,
          name,
          is_active: true,
        } as never,
      );
    }

    await auth.supabase.rpc('rpc_log_audit_event', {
      p_org_id: auth.orgId,
      p_action_key: 'employee_account_upserted',
      p_entity_type: 'employee_account',
      p_entity_id: existingAccount?.id ?? (null as unknown as string),
      p_branch_id: branchId,
      p_metadata: {
        name,
        is_active: true,
      },
      p_actor_user_id: null as unknown as string,
    });

    revalidatePath('/settings/preferences');
    revalidatePath('/pos');
    redirect(
      `/settings/preferences?employee_branch_id=${encodeURIComponent(branchId)}&employee_result=saved`,
    );
  };

  const toggleEmployeeAccount = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('employee_branch_id') ?? '').trim();
    const accountId = String(formData.get('employee_account_id') ?? '').trim();
    const nextActive =
      String(formData.get('next_active') ?? 'false').trim() === 'true';

    if (!branchId || !accountId) {
      redirect(
        `/settings/preferences?employee_branch_id=${encodeURIComponent(branchId)}&employee_result=invalid`,
      );
    }

    const { data: updated } = await auth.supabase
      .from('employee_accounts' as never)
      .update({ is_active: nextActive } as never)
      .eq('id', accountId)
      .eq('org_id', auth.orgId)
      .select('id, name')
      .maybeSingle();
    const updatedAccount = (updated ?? null) as { id: string; name: string } | null;

    await auth.supabase.rpc('rpc_log_audit_event', {
      p_org_id: auth.orgId,
      p_action_key: 'employee_account_status_updated',
      p_entity_type: 'employee_account',
      p_entity_id: accountId,
      p_branch_id: branchId,
      p_metadata: {
        name: updatedAccount?.name ?? null,
        is_active: nextActive,
      },
      p_actor_user_id: null as unknown as string,
    });

    revalidatePath('/settings/preferences');
    revalidatePath('/pos');
    redirect(
      `/settings/preferences?employee_branch_id=${encodeURIComponent(branchId)}&employee_result=saved`,
    );
  };

  const { data: preferencesRow } = await context.supabase
    .from('org_preferences')
    .select(
      'org_id, critical_days, warning_days, allow_negative_stock, cash_discount_enabled, cash_discount_default_pct, employee_discount_enabled, employee_discount_default_pct, employee_discount_combinable_with_cash_discount, cash_denominations',
    )
    .eq('org_id', context.orgId)
    .maybeSingle();

  const { data: employeeAccountsData } = selectedEmployeeBranchId
    ? await context.supabase
        .from('employee_accounts' as never)
        .select('id, name, is_active')
        .eq('org_id', context.orgId)
        .eq('branch_id', selectedEmployeeBranchId)
        .order('name')
    : { data: [] };

  const preferences = (preferencesRow as PreferencesRow | null) ?? {
    org_id: context.orgId,
    critical_days: 3,
    warning_days: 7,
    allow_negative_stock: true,
    cash_discount_enabled: true,
    cash_discount_default_pct: 10,
    employee_discount_enabled: true,
    employee_discount_default_pct: 10,
    employee_discount_combinable_with_cash_discount: false,
    cash_denominations: DEFAULT_CASH_DENOMINATIONS,
  };
  const employeeAccounts =
    (employeeAccountsData ?? []) as EmployeeAccountRow[];

  const cashDenominationsInput = Array.isArray(preferences.cash_denominations)
    ? preferences.cash_denominations.join(', ')
    : DEFAULT_CASH_DENOMINATIONS.join(', ');

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Preferencias</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Configura umbrales de alertas de vencimiento y reglas operativas.
          </p>
          {searchParams.result === 'saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Preferencias actualizadas.
            </p>
          ) : null}
          {searchParams.result === 'invalid' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Revisa los valores: warning debe ser mayor o igual a critical y el
              descuento en efectivo/empleado debe estar entre 0 y 100. Las
              denominaciones deben ser números positivos separados por coma.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <form action={savePreferences} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="critical_days"
                  className="text-xs font-semibold text-zinc-600"
                >
                  Dias criticos
                </label>
                <input
                  id="critical_days"
                  name="critical_days"
                  type="number"
                  min={0}
                  defaultValue={preferences.critical_days}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="warning_days"
                  className="text-xs font-semibold text-zinc-600"
                >
                  Dias warning
                </label>
                <input
                  id="warning_days"
                  name="warning_days"
                  type="number"
                  min={0}
                  defaultValue={preferences.warning_days}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="allow_negative_stock"
                defaultChecked={preferences.allow_negative_stock}
              />
              Permitir stock negativo (modo operativo)
            </label>

            <div className="grid gap-4 rounded-xl border border-zinc-200 p-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="cash_discount_enabled"
                  defaultChecked={preferences.cash_discount_enabled}
                />
                Habilitar descuento por pago en efectivo
              </label>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="cash_discount_default_pct"
                  className="text-xs font-semibold text-zinc-600"
                >
                  Descuento efectivo por defecto (%)
                </label>
                <input
                  id="cash_discount_default_pct"
                  name="cash_discount_default_pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  defaultValue={preferences.cash_discount_default_pct}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 rounded-xl border border-zinc-200 p-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="employee_discount_enabled"
                  defaultChecked={preferences.employee_discount_enabled}
                />
                Habilitar descuento empleado
              </label>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="employee_discount_default_pct"
                  className="text-xs font-semibold text-zinc-600"
                >
                  Descuento empleado por defecto (%)
                </label>
                <input
                  id="employee_discount_default_pct"
                  name="employee_discount_default_pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  defaultValue={preferences.employee_discount_default_pct}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <label className="md:col-span-2 flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="employee_discount_combinable_with_cash_discount"
                  defaultChecked={
                    preferences.employee_discount_combinable_with_cash_discount
                  }
                />
                Permitir combinar descuento empleado con descuento efectivo
              </label>
            </div>

            <div className="grid gap-1 rounded-xl border border-zinc-200 p-4">
              <label
                htmlFor="cash_denominations_input"
                className="text-xs font-semibold text-zinc-600"
              >
                Denominaciones de efectivo (billetes/monedas)
              </label>
              <input
                id="cash_denominations_input"
                name="cash_denominations_input"
                defaultValue={cashDenominationsInput}
                placeholder="100, 200, 500, 1000, 2000, 10000, 20000"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
                required
              />
              <p className="text-xs text-zinc-500">
                Se usan en apertura/cierre de caja. Puedes agregar o quitar
                valores según país/contexto.
              </p>
            </div>

            <button
              type="submit"
              className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar preferencias
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Cuentas de empleado (por sucursal)
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Se usan en POS para identificar compras con descuento empleado.
              </p>
            </div>
            {searchParams.employee_result === 'saved' ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Cuenta de empleado actualizada.
              </p>
            ) : null}
            {searchParams.employee_result === 'invalid' ? (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Completa sucursal y nombre para guardar.
              </p>
            ) : null}
          </div>

          <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
              Sucursal
              <select
                name="employee_branch_id"
                defaultValue={selectedEmployeeBranchId}
                className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
            >
              Ver cuentas
            </button>
          </form>

          <form action={addEmployeeAccount} className="mt-4 flex flex-wrap gap-3">
            <input
              type="hidden"
              name="employee_branch_id"
              value={selectedEmployeeBranchId}
            />
            <input
              name="employee_name"
              placeholder="Nombre de empleado"
              className="min-w-[260px] rounded border border-zinc-200 px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar empleado
            </button>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {employeeAccounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-sm text-zinc-500"
                    >
                      No hay cuentas de empleado para esta sucursal.
                    </td>
                  </tr>
                ) : (
                  employeeAccounts.map((account) => (
                    <tr key={account.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">{account.name}</td>
                      <td className="px-3 py-2">
                        {account.is_active ? 'Activa' : 'Inactiva'}
                      </td>
                      <td className="px-3 py-2">
                        <form action={toggleEmployeeAccount}>
                          <input
                            type="hidden"
                            name="employee_branch_id"
                            value={selectedEmployeeBranchId}
                          />
                          <input
                            type="hidden"
                            name="employee_account_id"
                            value={account.id}
                          />
                          <input
                            type="hidden"
                            name="next_active"
                            value={account.is_active ? 'false' : 'true'}
                          />
                          <button
                            type="submit"
                            className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
                          >
                            {account.is_active ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </form>
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
