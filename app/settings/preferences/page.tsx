import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  result?: string;
};

type PreferencesRow = {
  org_id: string;
  critical_days: number;
  warning_days: number;
  allow_negative_stock: boolean;
  cash_discount_enabled: boolean;
  cash_discount_default_pct: number;
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

    if (
      Number.isNaN(criticalDays) ||
      Number.isNaN(warningDays) ||
      Number.isNaN(cashDiscountDefaultPct) ||
      criticalDays < 0 ||
      warningDays < criticalDays ||
      cashDiscountDefaultPct < 0 ||
      cashDiscountDefaultPct > 100
    ) {
      redirect('/settings/preferences?result=invalid');
    }

    const { data: previousRow } = await auth.supabase
      .from('org_preferences')
      .select(
        'critical_days, warning_days, allow_negative_stock, cash_discount_enabled, cash_discount_default_pct',
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
        },
      },
      p_actor_user_id: null as unknown as string,
    });

    revalidatePath('/settings/preferences');
    revalidatePath('/dashboard');
    revalidatePath('/expirations');
    revalidatePath('/pos');
    redirect('/settings/preferences?result=saved');
  };

  const { data: preferencesRow } = await context.supabase
    .from('org_preferences')
    .select(
      'org_id, critical_days, warning_days, allow_negative_stock, cash_discount_enabled, cash_discount_default_pct',
    )
    .eq('org_id', context.orgId)
    .maybeSingle();

  const preferences = (preferencesRow as PreferencesRow | null) ?? {
    org_id: context.orgId,
    critical_days: 3,
    warning_days: 7,
    allow_negative_stock: true,
    cash_discount_enabled: true,
    cash_discount_default_pct: 10,
  };

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
              descuento en efectivo debe estar entre 0 y 100.
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

            <button
              type="submit"
              className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar preferencias
            </button>
          </form>
        </section>
      </div>
    </PageShell>
  );
}
