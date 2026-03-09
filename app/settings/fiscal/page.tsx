import { X509Certificate } from 'node:crypto';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { encryptPrivateKeyPem } from '@/lib/fiscal/auth/encrypt-private-key';
import { getOrgAdminSession } from '@/lib/auth/org-session';
import { runFiscalConnectionTest } from '@/lib/fiscal/testing/test-fiscal-connection';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

type SearchParams = {
  result?: string;
  env?: string;
  pos_env?: string;
  gate_result?: string;
  pto_vta?: string;
  branch_name?: string;
  test_env?: string;
  test_pto_vta?: string;
  test_app?: string;
  test_db?: string;
  test_auth?: string;
  test_cuit?: string;
  test_expires_at?: string;
  test_error?: string;
};

type FiscalEnvironment = 'homo' | 'prod';

type FiscalCredentialRow = {
  id: string;
  environment: FiscalEnvironment;
  taxpayer_cuit: string;
  alias: string | null;
  status: 'pending' | 'active' | 'inactive' | 'revoked';
  wsaa_service_name: string;
  wsfe_service_name: string;
  last_ta_obtained_at: string | null;
  ta_expires_at: string | null;
  updated_at: string;
  certificate_pem: string;
  encrypted_private_key: string;
  encryption_key_reference: string;
};

type PointOfSaleRow = {
  id: string;
  environment: FiscalEnvironment;
  location_id: string | null;
  pto_vta: number;
  description: string | null;
  invoice_mode: 'sync' | 'async';
  status: 'active' | 'inactive';
};

type BranchRow = {
  id: string;
  name: string;
};

type OrgRow = {
  id: string;
  name: string;
};

type FiscalOrgPreferencesRow = {
  fiscal_prod_enqueue_enabled: boolean;
  fiscal_prod_live_enabled: boolean;
};

const ENVIRONMENTS: FiscalEnvironment[] = ['homo', 'prod'];

const ENVIRONMENT_LABELS: Record<FiscalEnvironment, string> = {
  homo: 'Homologacion',
  prod: 'Produccion',
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR', { hour12: false });
};

const parseCertificateSummary = (certificatePem: string) => {
  try {
    const certificate = new X509Certificate(certificatePem);
    return {
      subject: certificate.subject,
      issuer: certificate.issuer,
      validFrom: certificate.validFrom,
      validTo: certificate.validTo,
      fingerprint256: certificate.fingerprint256,
    };
  } catch {
    return null;
  }
};

const readUploadedTextFile = async (entry: FormDataEntryValue | null) => {
  if (!(entry instanceof File)) return null;
  if (entry.size === 0) return null;
  return entry.text();
};

const sanitizeCuit = (value: string) => value.replace(/\D/g, '');

const isNextRedirectError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const digest =
    'digest' in error && typeof error.digest === 'string' ? error.digest : '';
  return digest.startsWith('NEXT_REDIRECT');
};

const getContext = async () => {
  const session = await getOrgAdminSession();
  if (!session?.orgId) return null;
  return {
    orgId: session.orgId,
    admin: createAdminSupabaseClient(),
  };
};

export default async function SettingsFiscalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getContext();
  if (!context) {
    redirect('/no-access');
  }

  const { data: orgRaw } = await context.admin
    .from('orgs')
    .select('id, name')
    .eq('id', context.orgId)
    .maybeSingle();
  const org = orgRaw as OrgRow | null;

  const { data: credentialsRaw } = await context.admin
    .from('fiscal_credentials' as never)
    .select(
      'id, environment, taxpayer_cuit, alias, status, wsaa_service_name, wsfe_service_name, last_ta_obtained_at, ta_expires_at, updated_at, certificate_pem, encrypted_private_key, encryption_key_reference',
    )
    .eq('tenant_id', context.orgId)
    .order('environment');
  const credentials = (credentialsRaw ?? []) as FiscalCredentialRow[];

  const { data: branchesRaw } = await context.admin
    .from('branches' as never)
    .select('id, name')
    .eq('org_id', context.orgId)
    .eq('is_active', true)
    .order('name');
  const branches = (branchesRaw ?? []) as BranchRow[];

  const { data: pointsRaw } = await context.admin
    .from('points_of_sale' as never)
    .select(
      'id, environment, location_id, pto_vta, description, invoice_mode, status',
    )
    .eq('tenant_id', context.orgId)
    .order('environment')
    .order('pto_vta');
  const pointsOfSale = (pointsRaw ?? []) as PointOfSaleRow[];
  const { data: orgPreferencesRaw } = await context.admin
    .from('org_preferences' as never)
    .select('fiscal_prod_enqueue_enabled, fiscal_prod_live_enabled')
    .eq('org_id', context.orgId)
    .maybeSingle();
  const orgPreferences = (orgPreferencesRaw ??
    ({
      fiscal_prod_enqueue_enabled: false,
      fiscal_prod_live_enabled: false,
    } satisfies FiscalOrgPreferencesRow)) as FiscalOrgPreferencesRow;

  const saveCredentials = async (formData: FormData) => {
    'use server';

    const auth = await getContext();
    if (!auth) {
      redirect('/no-access');
    }

    const environment = String(
      formData.get('environment') ?? '',
    ).trim() as FiscalEnvironment;
    if (!ENVIRONMENTS.includes(environment)) {
      redirect('/settings/fiscal?result=invalid_env');
    }

    const taxpayerCuit = sanitizeCuit(
      String(formData.get('taxpayer_cuit') ?? ''),
    );
    if (!/^\d{11}$/.test(taxpayerCuit)) {
      redirect(`/settings/fiscal?result=invalid_cuit&env=${environment}`);
    }

    const alias = String(formData.get('alias') ?? '').trim();
    const status = String(formData.get('status') ?? 'active').trim();
    if (!['pending', 'active', 'inactive', 'revoked'].includes(status)) {
      redirect(`/settings/fiscal?result=invalid_status&env=${environment}`);
    }

    const existingRaw = await auth.admin
      .from('fiscal_credentials' as never)
      .select(
        'id, certificate_pem, encrypted_private_key, encryption_key_reference',
      )
      .eq('tenant_id', auth.orgId)
      .eq('environment', environment)
      .maybeSingle();
    const existing = (existingRaw.data ?? null) as {
      id: string;
      certificate_pem: string;
      encrypted_private_key: string;
      encryption_key_reference: string;
    } | null;

    const certificateUpload = (
      await readUploadedTextFile(formData.get('certificate_file'))
    )?.trim();
    const privateKeyUpload = (
      await readUploadedTextFile(formData.get('private_key_file'))
    )?.trim();

    const certificatePem = certificateUpload || existing?.certificate_pem || '';
    if (!certificatePem) {
      redirect(
        `/settings/fiscal?result=missing_certificate&env=${environment}`,
      );
    }

    try {
      new X509Certificate(certificatePem);
    } catch {
      redirect(
        `/settings/fiscal?result=invalid_certificate&env=${environment}`,
      );
    }

    let encryptedPrivateKey = existing?.encrypted_private_key ?? '';
    let encryptionKeyReference = existing?.encryption_key_reference ?? '';

    if (privateKeyUpload) {
      const encrypted = encryptPrivateKeyPem({
        privateKeyPem: privateKeyUpload,
      });
      encryptedPrivateKey = encrypted.encryptedPrivateKey;
      encryptionKeyReference = encrypted.encryptionKeyReference;
    }

    if (!encryptedPrivateKey || !encryptionKeyReference) {
      redirect(
        `/settings/fiscal?result=missing_private_key&env=${environment}`,
      );
    }

    if (existing?.id) {
      const { error } = await auth.admin
        .from('fiscal_credentials' as never)
        .update({
          taxpayer_cuit: taxpayerCuit,
          alias: alias || null,
          certificate_pem: certificatePem,
          encrypted_private_key: encryptedPrivateKey,
          encryption_key_reference: encryptionKeyReference,
          wsaa_service_name: 'wsfe',
          wsfe_service_name: 'wsfe',
          status,
        } as never)
        .eq('id', existing.id);
      if (error) {
        redirect(
          `/settings/fiscal?result=credentials_write_error&env=${environment}`,
        );
      }
    } else {
      const { error } = await auth.admin
        .from('fiscal_credentials' as never)
        .insert({
          tenant_id: auth.orgId,
          environment,
          taxpayer_cuit: taxpayerCuit,
          alias: alias || null,
          certificate_pem: certificatePem,
          encrypted_private_key: encryptedPrivateKey,
          encryption_key_reference: encryptionKeyReference,
          wsaa_service_name: 'wsfe',
          wsfe_service_name: 'wsfe',
          status,
        } as never);
      if (error) {
        redirect(
          `/settings/fiscal?result=credentials_write_error&env=${environment}`,
        );
      }
    }

    revalidatePath('/settings');
    revalidatePath('/settings/fiscal');
    redirect(`/settings/fiscal?result=credentials_saved&env=${environment}`);
  };

  const savePointOfSale = async (formData: FormData) => {
    'use server';

    const auth = await getContext();
    if (!auth) {
      redirect('/no-access');
    }

    const environment = String(
      formData.get('environment') ?? '',
    ).trim() as FiscalEnvironment;
    const locationId = String(formData.get('location_id') ?? '').trim();
    const ptoVta = Number(String(formData.get('pto_vta') ?? '').trim());
    const description = String(formData.get('description') ?? '').trim();
    const status = String(formData.get('status') ?? 'active').trim();

    if (!ENVIRONMENTS.includes(environment)) {
      redirect('/settings/fiscal?result=invalid_env');
    }
    if (!locationId || !Number.isInteger(ptoVta) || ptoVta <= 0) {
      redirect(`/settings/fiscal?result=invalid_pos&pos_env=${environment}`);
    }
    if (!['active', 'inactive'].includes(status)) {
      redirect(
        `/settings/fiscal?result=invalid_pos_status&pos_env=${environment}`,
      );
    }

    const existingRaw = await auth.admin
      .from('points_of_sale' as never)
      .select('id')
      .eq('tenant_id', auth.orgId)
      .eq('environment', environment)
      .eq('location_id', locationId)
      .maybeSingle();
    const existingId =
      ((existingRaw.data as { id: string } | null) ?? null)?.id ?? null;

    const conflictingRaw = await auth.admin
      .from('points_of_sale' as never)
      .select('id, location_id, pto_vta')
      .eq('tenant_id', auth.orgId)
      .eq('environment', environment)
      .eq('pto_vta', ptoVta)
      .maybeSingle();
    const conflicting =
      (conflictingRaw.data as {
        id: string;
        location_id: string | null;
        pto_vta: number;
      } | null) ?? null;

    if (
      conflicting &&
      conflicting.location_id &&
      conflicting.location_id !== locationId
    ) {
      const branchRaw = await auth.admin
        .from('branches' as never)
        .select('name')
        .eq('id', conflicting.location_id)
        .maybeSingle();
      const branchName =
        ((branchRaw.data as { name: string } | null) ?? null)?.name ??
        'otra sucursal';
      redirect(
        `/settings/fiscal?result=pos_conflict&pos_env=${environment}&pto_vta=${ptoVta}&branch_name=${encodeURIComponent(branchName)}`,
      );
    }

    if (existingId) {
      const { error } = await auth.admin
        .from('points_of_sale' as never)
        .update({
          pto_vta: ptoVta,
          description: description || null,
          invoice_mode: 'sync',
          status,
        } as never)
        .eq('id', existingId);
      if (error) {
        redirect(
          `/settings/fiscal?result=pos_write_error&pos_env=${environment}`,
        );
      }
    } else {
      const { error } = await auth.admin
        .from('points_of_sale' as never)
        .insert({
          tenant_id: auth.orgId,
          location_id: locationId,
          environment,
          pto_vta: ptoVta,
          description: description || null,
          invoice_mode: 'sync',
          status,
        } as never);
      if (error) {
        redirect(
          `/settings/fiscal?result=pos_write_error&pos_env=${environment}`,
        );
      }
    }

    revalidatePath('/settings/fiscal');
    redirect(`/settings/fiscal?result=pos_saved&pos_env=${environment}`);
  };

  const runConnectionTest = async (formData: FormData) => {
    'use server';

    const auth = await getContext();
    if (!auth) {
      redirect('/no-access');
    }

    const environment = String(
      formData.get('environment') ?? '',
    ).trim() as FiscalEnvironment;
    const ptoVta = Number(String(formData.get('pto_vta') ?? '').trim());

    if (!ENVIRONMENTS.includes(environment)) {
      redirect('/settings/fiscal?result=invalid_env');
    }

    if (!Number.isInteger(ptoVta) || ptoVta <= 0) {
      redirect(
        `/settings/fiscal?result=test_invalid_pos&test_env=${environment}`,
      );
    }

    try {
      const result = await runFiscalConnectionTest({
        tenantId: auth.orgId,
        environment,
        ptoVta,
      });

      revalidatePath('/settings/fiscal');
      redirect(
        `/settings/fiscal?result=test_ok&test_env=${result.environment}&test_pto_vta=${result.ptoVta}&test_cuit=${result.taxpayerCuit}&test_app=${encodeURIComponent(result.appServer ?? '—')}&test_db=${encodeURIComponent(result.dbServer ?? '—')}&test_auth=${encodeURIComponent(result.authServer ?? '—')}&test_expires_at=${encodeURIComponent(result.wsaaExpiresAt)}`,
      );
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Fiscal connection test failed';
      redirect(
        `/settings/fiscal?result=test_error&test_env=${environment}&test_pto_vta=${ptoVta}&test_error=${encodeURIComponent(message)}`,
      );
    }
  };

  const saveFiscalProdControls = async (formData: FormData) => {
    'use server';

    const auth = await getContext();
    if (!auth) {
      redirect('/no-access');
    }

    const fiscalProdEnqueueEnabled =
      formData.get('fiscal_prod_enqueue_enabled') === 'on';
    const fiscalProdLiveEnabled =
      formData.get('fiscal_prod_live_enabled') === 'on';

    const { error } = await auth.admin.from('org_preferences' as never).upsert({
      org_id: auth.orgId,
      fiscal_prod_enqueue_enabled: fiscalProdEnqueueEnabled,
      fiscal_prod_live_enabled: fiscalProdLiveEnabled,
    } as never);

    if (error) {
      redirect('/settings/fiscal?gate_result=invalid');
    }

    revalidatePath('/settings/fiscal');
    revalidatePath('/settings/preferences');
    revalidatePath('/dashboard');
    revalidatePath('/sales');
    revalidatePath('/pos');

    redirect('/settings/fiscal?gate_result=saved');
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Facturacion fiscal
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Asocia el certificado fiscal de la ORG activa y define puntos de
            venta por sucursal. La private key se cifra al guardar y nunca se
            expone en la UI.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            ORG activa:{' '}
            <span className="font-medium text-zinc-700">
              {org?.name ?? context.orgId}
            </span>
          </p>
        </header>

        {resolvedSearchParams.result === 'credentials_saved' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Credencial fiscal guardada para{' '}
            {
              ENVIRONMENT_LABELS[
                (resolvedSearchParams.env as FiscalEnvironment) ?? 'homo'
              ]
            }
            .
          </p>
        ) : null}
        {resolvedSearchParams.result === 'pos_saved' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Punto de venta fiscal guardado para{' '}
            {
              ENVIRONMENT_LABELS[
                (resolvedSearchParams.pos_env as FiscalEnvironment) ?? 'homo'
              ]
            }
            .
          </p>
        ) : null}
        {[
          'invalid_cuit',
          'invalid_certificate',
          'invalid_status',
          'missing_certificate',
          'missing_private_key',
          'credentials_write_error',
        ].includes(resolvedSearchParams.result ?? '') ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Revisa la credencial fiscal. Se requiere CUIT válido, certificado
            `.crt/.pem`, private key `.key/.pem` y estado permitido.
          </p>
        ) : null}
        {['invalid_pos', 'invalid_pos_status', 'pos_write_error'].includes(
          resolvedSearchParams.result ?? '',
        ) ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Revisa el punto de venta fiscal. Debes elegir una sucursal válida,
            cargar un `pto_vta` positivo y usar un estado permitido.
          </p>
        ) : null}
        {resolvedSearchParams.result === 'pos_conflict' ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            El punto de venta{' '}
            <span className="font-semibold">
              {String(resolvedSearchParams.pto_vta ?? '').padStart(4, '0')}
            </span>{' '}
            ya está asignado a{' '}
            <span className="font-semibold">
              {resolvedSearchParams.branch_name
                ? decodeURIComponent(resolvedSearchParams.branch_name)
                : 'otra sucursal'}
            </span>
            .
          </p>
        ) : null}
        {resolvedSearchParams.result === 'test_ok' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Prueba segura{' '}
            {
              ENVIRONMENT_LABELS[
                (resolvedSearchParams.test_env as FiscalEnvironment) ?? 'prod'
              ]
            }{' '}
            OK para PV{' '}
            <span className="font-semibold">
              {String(resolvedSearchParams.test_pto_vta ?? '').padStart(4, '0')}
            </span>
            . CUIT {resolvedSearchParams.test_cuit ?? '—'} · WSAA expira{' '}
            {resolvedSearchParams.test_expires_at
              ? decodeURIComponent(resolvedSearchParams.test_expires_at)
              : '—'}{' '}
            · FEDummy: App=
            {resolvedSearchParams.test_app
              ? decodeURIComponent(resolvedSearchParams.test_app)
              : '—'}
            , DB=
            {resolvedSearchParams.test_db
              ? decodeURIComponent(resolvedSearchParams.test_db)
              : '—'}
            , Auth=
            {resolvedSearchParams.test_auth
              ? decodeURIComponent(resolvedSearchParams.test_auth)
              : '—'}
            .
          </p>
        ) : null}
        {['test_invalid_pos', 'test_error'].includes(
          resolvedSearchParams.result ?? '',
        ) ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            La prueba segura no pudo completarse para{' '}
            {
              ENVIRONMENT_LABELS[
                (resolvedSearchParams.test_env as FiscalEnvironment) ?? 'prod'
              ]
            }
            {resolvedSearchParams.test_error
              ? `: ${decodeURIComponent(resolvedSearchParams.test_error)}`
              : '. Revisa que exista un PV activo y una credencial activa para ese ambiente.'}
          </p>
        ) : null}
        {resolvedSearchParams.gate_result === 'saved' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Controles de facturación productiva actualizados.
          </p>
        ) : null}
        {resolvedSearchParams.gate_result === 'invalid' ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No pudimos guardar los controles de facturación productiva.
          </p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          {ENVIRONMENTS.map((environment) => {
            const credential =
              credentials.find((item) => item.environment === environment) ??
              null;
            const certificateSummary = credential
              ? parseCertificateSummary(credential.certificate_pem)
              : null;
            const environmentPoints = pointsOfSale.filter(
              (item) => item.environment === environment,
            );
            const activeEnvironmentPoints = environmentPoints.filter(
              (item) => item.status === 'active',
            );

            return (
              <article
                key={environment}
                className="rounded-2xl border border-zinc-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Credencial {ENVIRONMENT_LABELS[environment]}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Un certificado por ORG y ambiente.
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                      credential?.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {credential?.status ?? 'sin configurar'}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p>
                    <span className="font-medium">CUIT:</span>{' '}
                    {credential?.taxpayer_cuit ?? '—'}
                  </p>
                  <p>
                    <span className="font-medium">Alias:</span>{' '}
                    {credential?.alias ?? '—'}
                  </p>
                  <p>
                    <span className="font-medium">Ultimo TA:</span>{' '}
                    {formatDateTime(credential?.last_ta_obtained_at ?? null)}
                  </p>
                  <p>
                    <span className="font-medium">Expira TA:</span>{' '}
                    {formatDateTime(credential?.ta_expires_at ?? null)}
                  </p>
                  <p>
                    <span className="font-medium">Actualizado:</span>{' '}
                    {formatDateTime(credential?.updated_at ?? null)}
                  </p>
                  {certificateSummary ? (
                    <>
                      <p>
                        <span className="font-medium">Subject:</span>{' '}
                        {certificateSummary.subject}
                      </p>
                      <p>
                        <span className="font-medium">Issuer:</span>{' '}
                        {certificateSummary.issuer}
                      </p>
                      <p>
                        <span className="font-medium">Vigencia:</span>{' '}
                        {certificateSummary.validFrom} →{' '}
                        {certificateSummary.validTo}
                      </p>
                      <p className="break-all">
                        <span className="font-medium">
                          Fingerprint SHA-256:
                        </span>{' '}
                        {certificateSummary.fingerprint256}
                      </p>
                    </>
                  ) : null}
                </div>

                <form action={saveCredentials} className="mt-4 grid gap-4">
                  <input type="hidden" name="environment" value={environment} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span className="text-xs font-semibold text-zinc-600">
                        CUIT
                      </span>
                      <input
                        name="taxpayer_cuit"
                        defaultValue={credential?.taxpayer_cuit ?? ''}
                        placeholder="20958851929"
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span className="text-xs font-semibold text-zinc-600">
                        Alias interno
                      </span>
                      <input
                        name="alias"
                        defaultValue={credential?.alias ?? ''}
                        placeholder="mi-org-prod"
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span className="text-xs font-semibold text-zinc-600">
                        Certificado `.crt` / `.pem`
                      </span>
                      <input
                        type="file"
                        name="certificate_file"
                        accept=".crt,.pem"
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span className="text-xs font-semibold text-zinc-600">
                        Private key `.key` / `.pem`
                      </span>
                      <input
                        type="file"
                        name="private_key_file"
                        accept=".key,.pem"
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-sm text-zinc-700 md:max-w-xs">
                    <span className="text-xs font-semibold text-zinc-600">
                      Estado
                    </span>
                    <select
                      name="status"
                      defaultValue={credential?.status ?? 'active'}
                      className="rounded border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                      <option value="pending">Pendiente</option>
                      <option value="revoked">Revocada</option>
                    </select>
                  </label>

                  <p className="text-xs text-zinc-500">
                    Si dejas los archivos vacíos y ya existe una credencial, se
                    conserva el material actual. La clave privada se cifra con
                    AES-256-GCM al guardar.
                  </p>

                  <button
                    type="submit"
                    className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Guardar credencial {ENVIRONMENT_LABELS[environment]}
                  </button>
                </form>

                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Prueba segura {ENVIRONMENT_LABELS[environment]}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Ejecuta `WSAA + FEDummy` con la credencial y un PV activo de
                    este ambiente. No emite comprobantes reales.
                  </p>

                  {credential?.status !== 'active' ? (
                    <p className="mt-3 text-sm text-zinc-500">
                      Activa la credencial para habilitar la prueba segura.
                    </p>
                  ) : activeEnvironmentPoints.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">
                      Necesitas al menos un punto de venta activo en{' '}
                      {ENVIRONMENT_LABELS[environment]} para probar.
                    </p>
                  ) : (
                    <form
                      action={runConnectionTest}
                      className="mt-4 grid gap-4"
                    >
                      <input
                        type="hidden"
                        name="environment"
                        value={environment}
                      />

                      <label className="grid gap-1 text-sm text-zinc-700">
                        <span className="text-xs font-semibold text-zinc-600">
                          Punto de venta para prueba
                        </span>
                        <select
                          name="pto_vta"
                          className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                          defaultValue={String(
                            activeEnvironmentPoints[0]?.pto_vta ?? '',
                          )}
                        >
                          {activeEnvironmentPoints.map((item) => {
                            const branchName =
                              branches.find(
                                (branch) => branch.id === item.location_id,
                              )?.name ?? 'Sucursal desconocida';
                            return (
                              <option key={item.id} value={item.pto_vta}>
                                {String(item.pto_vta).padStart(4, '0')} ·{' '}
                                {branchName}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <button
                        type="submit"
                        className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
                      >
                        Probar WSAA + FEDummy
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Puntos de venta fiscales
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Define el `pto_vta` que usará cada sucursal por ambiente. Esta
            sección no requiere volver a cargar certificado ni private key si la
            credencial ya fue guardada.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {ENVIRONMENTS.map((environment) => (
              <article
                key={environment}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <h3 className="text-sm font-semibold text-zinc-900">
                  {ENVIRONMENT_LABELS[environment]}
                </h3>

                <div className="mt-3 grid gap-2 text-sm text-zinc-700">
                  {pointsOfSale.filter(
                    (item) => item.environment === environment,
                  ).length === 0 ? (
                    <p className="text-zinc-500">Sin puntos configurados.</p>
                  ) : (
                    pointsOfSale
                      .filter((item) => item.environment === environment)
                      .map((item) => {
                        const branchName =
                          branches.find(
                            (branch) => branch.id === item.location_id,
                          )?.name ?? 'Sucursal desconocida';
                        return (
                          <div
                            key={item.id}
                            className="rounded border border-zinc-200 bg-white px-3 py-2"
                          >
                            <p className="font-medium text-zinc-900">
                              {branchName}
                            </p>
                            <p>
                              PV {String(item.pto_vta).padStart(4, '0')} ·{' '}
                              {item.status} · {item.invoice_mode}
                            </p>
                            <p className="text-zinc-500">
                              {item.description || 'Sin descripción'}
                            </p>
                          </div>
                        );
                      })
                  )}
                </div>

                <form action={savePointOfSale} className="mt-4 grid gap-4">
                  <input type="hidden" name="environment" value={environment} />

                  <label className="grid gap-1 text-sm text-zinc-700">
                    <span className="text-xs font-semibold text-zinc-600">
                      Sucursal
                    </span>
                    <select
                      name="location_id"
                      className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      defaultValue={branches[0]?.id ?? ''}
                    >
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span className="text-xs font-semibold text-zinc-600">
                        Punto de venta
                      </span>
                      <input
                        type="number"
                        min={1}
                        name="pto_vta"
                        placeholder="2"
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span className="text-xs font-semibold text-zinc-600">
                        Estado
                      </span>
                      <select
                        name="status"
                        defaultValue="active"
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-sm text-zinc-700">
                    <span className="text-xs font-semibold text-zinc-600">
                      Descripción
                    </span>
                    <input
                      name="description"
                      placeholder="PV web services"
                      className="rounded border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
                  >
                    Guardar PV {ENVIRONMENT_LABELS[environment]}
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Controles de producción
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Estos toggles controlan si la ORG puede encolar jobs fiscales `prod`
            y si el worker puede ejecutar `FECAESolicitar` real.
          </p>

          <form action={saveFiscalProdControls} className="mt-4 grid gap-4">
            <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <input
                  type="checkbox"
                  name="fiscal_prod_enqueue_enabled"
                  defaultChecked={orgPreferences.fiscal_prod_enqueue_enabled}
                />
                Permitir encolar facturación fiscal en producción
              </label>
              <p className="text-xs text-amber-800">
                Gate operativo para crear `invoice_jobs` en ambiente `prod`. No
                emite comprobantes por sí solo.
              </p>
            </div>

            <div className="grid gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-rose-900">
                <input
                  type="checkbox"
                  name="fiscal_prod_live_enabled"
                  defaultChecked={orgPreferences.fiscal_prod_live_enabled}
                />
                Permitir emisión fiscal real en producción
              </label>
              <p className="text-xs text-rose-800">
                Gate de alto impacto para permitir `FECAESolicitar` real desde
                el worker en ambiente `prod`. Requiere que el enqueue productivo
                también esté habilitado.
              </p>
            </div>

            <button
              type="submit"
              className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar controles de producción
            </button>
          </form>
        </section>
      </div>
    </PageShell>
  );
}
