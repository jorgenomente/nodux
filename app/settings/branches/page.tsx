import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type BranchRow = {
  branch_id: string;
  org_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  members_count: number | null;
};

type PosPaymentDeviceRow = {
  id: string;
  org_id: string;
  branch_id: string;
  device_name: string;
  provider: 'posnet' | 'mercadopago' | 'other';
  is_active: boolean;
};

type SearchParams = {
  result?: string;
};

const getOrgAdminContext = async () => {
  const session = await getOrgAdminSession();
  if (!session?.orgId) return null;
  return {
    supabase: session.supabase,
    orgId: session.orgId,
    userId: session.userId,
  };
};

export default async function SettingsBranchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getOrgAdminContext();

  if (!context) {
    redirect('/no-access');
  }

  const saveBranch = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const branchIdRaw = String(formData.get('branch_id') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const addressRaw = String(formData.get('address') ?? '').trim();
    const isActive = formData.get('is_active') === 'on';

    if (!name) {
      redirect('/settings/branches?result=invalid');
    }

    await auth.supabase.rpc('rpc_upsert_branch', {
      p_branch_id: branchIdRaw || randomUUID(),
      p_org_id: auth.orgId,
      p_name: name,
      p_address: addressRaw,
      p_is_active: isActive,
    });

    revalidatePath('/settings/branches');
    revalidatePath('/products');
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    redirect('/settings/branches?result=saved');
  };

  const savePaymentDevice = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const deviceIdRaw = String(formData.get('device_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const deviceName = String(formData.get('device_name') ?? '').trim();
    const provider = String(formData.get('provider') ?? '').trim();
    const isActive = formData.get('is_active') === 'on';

    if (!branchId || !deviceName) {
      redirect('/settings/branches?result=device-invalid');
    }

    if (!['posnet', 'mercadopago', 'other'].includes(provider)) {
      redirect('/settings/branches?result=device-invalid');
    }

    if (deviceIdRaw) {
      const { error } = await auth.supabase
        .from('pos_payment_devices' as never)
        .update({
          branch_id: branchId,
          device_name: deviceName,
          provider,
          is_active: isActive,
          updated_by: auth.userId,
        } as never)
        .eq('id', deviceIdRaw)
        .eq('org_id', auth.orgId);

      if (error) {
        redirect('/settings/branches?result=device-error');
      }
    } else {
      const { error } = await auth.supabase
        .from('pos_payment_devices' as never)
        .insert({
          id: randomUUID(),
          org_id: auth.orgId,
          branch_id: branchId,
          device_name: deviceName,
          provider,
          is_active: isActive,
          created_by: auth.userId,
          updated_by: auth.userId,
        } as never);

      if (error) {
        redirect('/settings/branches?result=device-error');
      }
    }

    revalidatePath('/settings/branches');
    revalidatePath('/pos');
    revalidatePath('/cashbox');
    redirect('/settings/branches?result=device-saved');
  };

  const { data } = await context.supabase
    .from('v_branches_admin')
    .select('*')
    .eq('org_id', context.orgId)
    .order('name');

  const branches = (data ?? []) as BranchRow[];
  const { data: devicesData } = await context.supabase
    .from('pos_payment_devices' as never)
    .select('id, org_id, branch_id, device_name, provider, is_active')
    .eq('org_id', context.orgId)
    .order('branch_id')
    .order('device_name');
  const paymentDevices = (devicesData ?? []) as PosPaymentDeviceRow[];

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sucursales</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Crea y actualiza sucursales. Las sucursales inactivas dejan de estar
            disponibles para operacion.
          </p>
          {searchParams.result === 'saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Cambios guardados.
            </p>
          ) : null}
          {searchParams.result === 'invalid' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              El nombre es obligatorio.
            </p>
          ) : null}
          {searchParams.result === 'device-saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Dispositivo de cobro guardado.
            </p>
          ) : null}
          {searchParams.result === 'device-invalid' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Completa sucursal, nombre y proveedor del dispositivo.
            </p>
          ) : null}
          {searchParams.result === 'device-error' ? (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              No se pudo guardar el dispositivo. Revisa nombre duplicado en la
              sucursal.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nueva sucursal
          </h2>
          <form action={saveBranch} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="new-name"
              >
                Nombre
              </label>
              <input
                id="new-name"
                name="name"
                required
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Sucursal Centro"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="new-address"
              >
                Direccion
              </label>
              <input
                id="new-address"
                name="address"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Calle 123"
              />
            </div>
            <div className="flex items-end gap-3 md:col-span-1">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="is_active" defaultChecked />
                Activa
              </label>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Crear
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Sucursales existentes
          </h2>
          <div className="mt-4 grid gap-4">
            {branches.length === 0 ? (
              <p className="rounded border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                Todavia no hay sucursales cargadas.
              </p>
            ) : (
              branches.map((branch) => {
                const branchDevices = paymentDevices.filter(
                  (device) => device.branch_id === branch.branch_id,
                );

                return (
                  <div
                    key={branch.branch_id}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <form
                      action={saveBranch}
                      className="grid gap-3 md:grid-cols-5"
                    >
                      <input
                        type="hidden"
                        name="branch_id"
                        value={branch.branch_id}
                      />
                      <div className="flex flex-col gap-1 md:col-span-1">
                        <label className="text-xs font-semibold text-zinc-600">
                          Nombre
                        </label>
                        <input
                          name="name"
                          defaultValue={branch.name}
                          className="rounded border border-zinc-200 px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-semibold text-zinc-600">
                          Direccion
                        </label>
                        <input
                          name="address"
                          defaultValue={branch.address ?? ''}
                          className="rounded border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex items-end md:col-span-1">
                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={branch.is_active}
                          />
                          Activa
                        </label>
                      </div>
                      <div className="flex items-end justify-between gap-2 md:col-span-1">
                        <span className="text-xs text-zinc-500">
                          {Number(branch.members_count ?? 0)} usuarios
                        </span>
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>

                    <div className="mt-5 border-t border-zinc-200 pt-4">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Dispositivos de cobro ({branchDevices.length})
                      </h3>
                      <p className="mt-1 text-xs text-zinc-600">
                        Configura dispositivos para POS: tarjeta, MercadoPago
                        QR/posnet y opciones futuras.
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Convención sugerida: <strong>MP QR</strong>,{' '}
                        <strong>MP Posnet 1</strong>,{' '}
                        <strong>MP Posnet 2</strong>, <strong>MP Alias</strong>,{' '}
                        <strong>Posnet principal</strong>.
                      </p>

                      <div className="mt-3 grid gap-2">
                        {branchDevices.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            Sin dispositivos cargados.
                          </p>
                        ) : (
                          branchDevices.map((device) => (
                            <form
                              key={device.id}
                              action={savePaymentDevice}
                              className="grid gap-2 rounded-lg border border-zinc-200 p-3 md:grid-cols-5"
                            >
                              <input
                                type="hidden"
                                name="device_id"
                                value={device.id}
                              />
                              <input
                                type="hidden"
                                name="branch_id"
                                value={branch.branch_id}
                              />
                              <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-semibold text-zinc-600">
                                  Nombre visible
                                </label>
                                <input
                                  name="device_name"
                                  defaultValue={device.device_name}
                                  list={`device-name-suggestions-${branch.branch_id}`}
                                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                                  required
                                />
                              </div>
                              <div className="flex flex-col gap-1 md:col-span-1">
                                <label className="text-xs font-semibold text-zinc-600">
                                  Proveedor
                                </label>
                                <select
                                  name="provider"
                                  defaultValue={device.provider}
                                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                                >
                                  <option value="posnet">
                                    Posnet / tarjeta
                                  </option>
                                  <option value="mercadopago">
                                    MercadoPago
                                  </option>
                                  <option value="other">Otro</option>
                                </select>
                              </div>
                              <div className="flex items-end md:col-span-1">
                                <label className="flex items-center gap-2 text-sm text-zinc-700">
                                  <input
                                    type="checkbox"
                                    name="is_active"
                                    defaultChecked={device.is_active}
                                  />
                                  Activo
                                </label>
                              </div>
                              <div className="flex items-end justify-end md:col-span-1">
                                <button
                                  type="submit"
                                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                                >
                                  Guardar dispositivo
                                </button>
                              </div>
                            </form>
                          ))
                        )}
                      </div>

                      <datalist
                        id={`device-name-suggestions-${branch.branch_id}`}
                      >
                        <option value="MP QR" />
                        <option value="MP Posnet 1" />
                        <option value="MP Posnet 2" />
                        <option value="MP Alias" />
                        <option value="Posnet principal" />
                      </datalist>

                      <form
                        action={savePaymentDevice}
                        className="mt-3 grid gap-2 rounded-lg border border-dashed border-zinc-300 p-3 md:grid-cols-5"
                      >
                        <input
                          type="hidden"
                          name="branch_id"
                          value={branch.branch_id}
                        />
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-xs font-semibold text-zinc-600">
                            Nuevo dispositivo
                          </label>
                          <input
                            name="device_name"
                            list={`device-name-suggestions-${branch.branch_id}`}
                            className="rounded border border-zinc-200 px-3 py-2 text-sm"
                            placeholder="Posnet MP 2"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-1">
                          <label className="text-xs font-semibold text-zinc-600">
                            Proveedor
                          </label>
                          <select
                            name="provider"
                            defaultValue="mercadopago"
                            className="rounded border border-zinc-200 px-3 py-2 text-sm"
                          >
                            <option value="posnet">Posnet / tarjeta</option>
                            <option value="mercadopago">MercadoPago</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                        <div className="flex items-end md:col-span-1">
                          <label className="flex items-center gap-2 text-sm text-zinc-700">
                            <input
                              type="checkbox"
                              name="is_active"
                              defaultChecked
                            />
                            Activo
                          </label>
                        </div>
                        <div className="flex items-end justify-end md:col-span-1">
                          <button
                            type="submit"
                            className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Agregar dispositivo
                          </button>
                        </div>
                      </form>
                      <p className="mt-2 text-xs text-zinc-500">
                        Tip: al escribir en “Nuevo dispositivo”, el navegador
                        sugiere nombres estándar para mantener consistencia
                        operativa.
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
