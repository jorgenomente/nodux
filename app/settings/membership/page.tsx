import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

type SearchParams = {
  result?: string;
};

type MembershipRow = {
  subscription_id: string;
  org_id: string;
  org_name: string;
  plan_name: string;
  pricing_mode: 'standard' | 'custom';
  currency_code: string;
  service_status: 'active' | 'grace' | 'suspended' | 'cancelled';
  started_on: string;
  renews_on: string;
  base_price_monthly: number;
  included_branches: number;
  active_branch_count: number;
  billable_additional_branch_count: number;
  additional_branch_price_monthly: number;
  discount_mode: 'none' | 'percent' | 'fixed_amount';
  discount_percent: number | null;
  discount_amount: number | null;
  discount_label: string | null;
  list_price_monthly: number;
  discount_amount_applied: number;
  effective_monthly_price: number;
  current_cycle_id: string | null;
  current_cycle_start_on: string | null;
  current_cycle_end_on: string | null;
  current_cycle_due_on: string | null;
  current_cycle_list_price_amount: number | null;
  current_cycle_discount_amount_applied: number | null;
  current_cycle_expected_amount: number | null;
  current_cycle_payment_status:
    | 'pending'
    | 'proof_submitted'
    | 'paid'
    | 'rejected'
    | 'waived'
    | null;
  current_cycle_review_note: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_cbu: string | null;
  bank_alias: string | null;
  bank_cuit: string | null;
  mercadopago_qr_image_path: string | null;
  payment_instructions: string | null;
};

type MembershipPaymentRow = {
  payment_id: string;
  cycle_id: string;
  cycle_start_on: string;
  cycle_end_on: string;
  due_on: string;
  payment_method: 'bank_transfer' | 'mercadopago_qr' | 'cash' | 'other';
  amount_reported: number;
  reference_text: string | null;
  proof_storage_path: string | null;
  submitted_at: string;
  review_status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  reviewed_at: string | null;
};

type MembershipPaymentMethod =
  | 'bank_transfer'
  | 'mercadopago_qr'
  | 'cash'
  | 'other';

const formatCurrency = (value: number | null | undefined, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin definir';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const paymentMethodLabel = (value: MembershipPaymentRow['payment_method']) => {
  switch (value) {
    case 'bank_transfer':
      return 'Transferencia';
    case 'mercadopago_qr':
      return 'QR Mercado Pago';
    case 'cash':
      return 'Efectivo';
    default:
      return 'Otro';
  }
};

const statusTone = (value: string | null | undefined) => {
  switch (value) {
    case 'active':
    case 'paid':
    case 'approved':
      return 'bg-emerald-100 text-emerald-800';
    case 'grace':
    case 'proof_submitted':
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'suspended':
    case 'rejected':
    case 'cancelled':
      return 'bg-rose-100 text-rose-800';
    case 'waived':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
};

const serviceStatusLabel = (value: MembershipRow['service_status']) => {
  switch (value) {
    case 'active':
      return 'Activo';
    case 'grace':
      return 'En gracia';
    case 'suspended':
      return 'Suspendido';
    case 'cancelled':
      return 'Cancelado';
  }
};

const cycleStatusLabel = (
  value: MembershipRow['current_cycle_payment_status'],
) => {
  switch (value) {
    case 'pending':
      return 'Pendiente';
    case 'proof_submitted':
      return 'Comprobante enviado';
    case 'paid':
      return 'Pagado';
    case 'rejected':
      return 'Rechazado';
    case 'waived':
      return 'Condonado';
    default:
      return 'Sin ciclo';
  }
};

const discountLabel = (
  mode: MembershipRow['discount_mode'],
  discountPercent: number | null,
  discountAmount: number | null,
  currencyCode = 'ARS',
) => {
  switch (mode) {
    case 'percent':
      return `${Number(discountPercent ?? 0)}%`;
    case 'fixed_amount':
      return formatCurrency(discountAmount, currencyCode);
    default:
      return 'Sin bonificacion';
  }
};

export default async function SettingsMembershipPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await getOrgAdminSession();

  if (!session?.orgId) {
    redirect('/no-access');
  }

  const submitPayment = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminSession();
    if (!auth?.orgId) {
      redirect('/no-access');
    }

    const cycleId = String(formData.get('cycle_id') ?? '').trim();
    const paymentMethod = String(formData.get('payment_method') ?? '').trim();
    const amountRaw = String(formData.get('amount_reported') ?? '').trim();
    const referenceText = String(formData.get('reference_text') ?? '').trim();
    const proofFile = formData.get('proof_file');

    const amount = Number(amountRaw);
    const isValidPaymentMethod = (
      value: string,
    ): value is MembershipPaymentMethod =>
      ['bank_transfer', 'mercadopago_qr', 'cash', 'other'].includes(value);

    if (
      !cycleId ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      !isValidPaymentMethod(paymentMethod)
    ) {
      redirect('/settings/membership?result=invalid');
    }

    let uploadedProofPath: string | undefined;
    if (proofFile instanceof File && proofFile.size > 0) {
      if (proofFile.size > 5 * 1024 * 1024) {
        redirect('/settings/membership?result=file_too_large');
      }

      const extension =
        proofFile.name.split('.').pop()?.trim().toLowerCase() || 'bin';
      const proofPath = `${auth.orgId}/${cycleId}/${Date.now()}-${proofFile.name
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .toLowerCase()}`;
      const buffer = Buffer.from(await proofFile.arrayBuffer());
      const { error: uploadError } = await auth.supabase.storage
        .from('subscription-payment-proofs')
        .upload(proofPath, buffer, {
          contentType: proofFile.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        redirect('/settings/membership?result=upload_error');
      }

      uploadedProofPath = proofPath.endsWith(`.${extension}`)
        ? proofPath
        : `${proofPath}.${extension}`;
    }

    const { error } = await auth.supabase.rpc(
      'rpc_create_org_subscription_payment_submission',
      {
        p_cycle_id: cycleId,
        p_payment_method: paymentMethod,
        p_amount_reported: amount,
        p_reference_text: referenceText || undefined,
        p_proof_storage_path: uploadedProofPath,
      },
    );

    if (error) {
      redirect('/settings/membership?result=submit_error');
    }

    revalidatePath('/settings/membership');
    redirect('/settings/membership?result=submitted');
  };

  const admin = createAdminSupabaseClient();
  const [{ data: membershipRaw }, { data: paymentsRaw }] = await Promise.all([
    session.supabase.from('v_org_membership').select('*').maybeSingle(),
    session.supabase
      .from('v_org_membership_payments')
      .select('*')
      .eq('org_id', session.orgId)
      .order('submitted_at', { ascending: false })
      .limit(10),
  ]);

  const membership = (membershipRaw ?? null) as MembershipRow | null;
  const payments = (paymentsRaw ?? []) as MembershipPaymentRow[];
  const qrSignedUrl = membership?.mercadopago_qr_image_path
    ? ((
        await admin.storage
          .from('platform-billing-assets')
          .createSignedUrl(membership.mercadopago_qr_image_path, 60 * 30)
      ).data?.signedUrl ?? null)
    : null;

  const signedProofs = await Promise.all(
    payments.map(async (payment) => {
      if (!payment.proof_storage_path) {
        return [payment.payment_id, null] as const;
      }
      const { data } = await session.supabase.storage
        .from('subscription-payment-proofs')
        .createSignedUrl(payment.proof_storage_path, 60 * 30);
      return [payment.payment_id, data?.signedUrl ?? null] as const;
    }),
  );

  const proofUrlByPaymentId = new Map(signedProofs);
  const result = params.result?.trim() ?? '';
  const currentDate = new Date().toISOString().slice(0, 10);
  const dueDate =
    membership?.current_cycle_due_on &&
    membership.current_cycle_due_on <= currentDate
      ? membership.current_cycle_due_on
      : null;
  const showPaymentReminder =
    membership?.current_cycle_payment_status === 'pending' && Boolean(dueDate);

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Membresia</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Estado de tu plan, monto mensual y seguimiento de comprobantes.
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
          >
            Volver a configuracion
          </Link>
        </div>

        {result === 'submitted' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Comprobante enviado. Queda pendiente de revision por superadmin.
          </div>
        ) : null}
        {result && result !== 'submitted' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            No se pudo registrar el comprobante. Revisá los datos e intentá de
            nuevo.
          </div>
        ) : null}

        {!membership ? (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
            La organizacion todavia no tiene una suscripcion configurada. Cuando
            superadmin complete el alta comercial, esta pantalla va a mostrar el
            plan, el monto y el flujo de pago.
          </section>
        ) : (
          <>
            {membership.service_status === 'grace' ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Tu servicio está en gracia. Regularizá el pago para evitar
                suspensión operativa.
              </section>
            ) : null}
            {membership.service_status === 'suspended' ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                Tu servicio está suspendido. Contactá a superadmin y adjuntá el
                comprobante del ciclo para normalizar la cuenta.
              </section>
            ) : null}
            {showPaymentReminder ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Tenés un pago pendiente con vencimiento el{' '}
                <span className="font-semibold">{formatDate(dueDate)}</span>.
                Informá el pago apenas realices la transferencia o el escaneo
                del QR.
              </section>
            ) : null}
            {membership.current_cycle_payment_status === 'proof_submitted' ? (
              <section className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                Ya recibimos tu comprobante. Está pendiente de revisión por
                superadmin.
              </section>
            ) : null}
            {membership.current_cycle_payment_status === 'rejected' ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                El último comprobante fue rechazado.
                {membership.current_cycle_review_note
                  ? ` Motivo: ${membership.current_cycle_review_note}`
                  : ' Revisá los datos y volvé a enviarlo.'}
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Plan actual
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                  {membership.plan_name}
                </h2>
                <span
                  className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                    membership.service_status,
                  )}`}
                >
                  Servicio: {serviceStatusLabel(membership.service_status)}
                </span>
                <p className="mt-3 text-sm text-zinc-600">
                  Inicio: {formatDate(membership.started_on)}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Renovacion: {formatDate(membership.renews_on)}
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Precio mensual
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(
                    membership.effective_monthly_price,
                    membership.currency_code,
                  )}
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  {membership.pricing_mode === 'custom'
                    ? 'Precio mensual acordado manualmente.'
                    : `Base ${formatCurrency(
                        membership.base_price_monthly,
                        membership.currency_code,
                      )} + ${formatCurrency(
                        membership.additional_branch_price_monthly,
                        membership.currency_code,
                      )} por sucursal adicional.`}
                </p>
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p>
                    <span className="font-semibold">Precio lista:</span>{' '}
                    {formatCurrency(
                      membership.list_price_monthly,
                      membership.currency_code,
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Bonificacion:</span>{' '}
                    {membership.discount_mode === 'none'
                      ? 'Sin bonificacion'
                      : `${membership.discount_label || 'Beneficio activo'} · ${discountLabel(
                          membership.discount_mode,
                          membership.discount_percent,
                          membership.discount_amount,
                          membership.currency_code,
                        )}`}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Ahorro mensual:</span>{' '}
                    {formatCurrency(
                      membership.discount_amount_applied,
                      membership.currency_code,
                    )}
                  </p>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Sucursales
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {membership.active_branch_count}
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Incluidas: {membership.included_branches}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Adicionales cobradas:{' '}
                  {membership.billable_additional_branch_count}
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Ciclo actual
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                    membership.current_cycle_payment_status,
                  )}`}
                >
                  Pago:{' '}
                  {cycleStatusLabel(membership.current_cycle_payment_status)}
                </span>
                <p className="mt-3 text-sm text-zinc-600">
                  Vence: {formatDate(membership.current_cycle_due_on)}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Monto esperado:{' '}
                  {formatCurrency(
                    membership.current_cycle_expected_amount,
                    membership.currency_code,
                  )}
                </p>
                {membership.current_cycle_discount_amount_applied ? (
                  <p className="mt-1 text-sm text-emerald-700">
                    Ahorras{' '}
                    {formatCurrency(
                      membership.current_cycle_discount_amount_applied,
                      membership.currency_code,
                    )}{' '}
                    sobre una lista de{' '}
                    {formatCurrency(
                      membership.current_cycle_list_price_amount,
                      membership.currency_code,
                    )}
                    .
                  </p>
                ) : null}
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-base font-semibold text-zinc-900">
                  Medios de pago
                </h2>
                <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold">Titular:</span>{' '}
                    {membership.bank_account_holder || 'Sin definir'}
                  </p>
                  <p>
                    <span className="font-semibold">Banco:</span>{' '}
                    {membership.bank_name || 'Sin definir'}
                  </p>
                  <p>
                    <span className="font-semibold">Tipo:</span>{' '}
                    {membership.bank_account_type || 'Sin definir'}
                  </p>
                  <p>
                    <span className="font-semibold">CUIT:</span>{' '}
                    {membership.bank_cuit || 'Sin definir'}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-semibold">CBU/CVU:</span>{' '}
                    {membership.bank_cbu || 'Sin definir'}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-semibold">Alias:</span>{' '}
                    {membership.bank_alias || 'Sin definir'}
                  </p>
                </div>
                {membership.payment_instructions ? (
                  <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                    {membership.payment_instructions}
                  </div>
                ) : null}
                {qrSignedUrl ? (
                  <div className="mt-4">
                    <Image
                      src={qrSignedUrl}
                      alt="QR Mercado Pago"
                      width={320}
                      height={320}
                      unoptimized
                      className="max-h-64 rounded-xl border border-zinc-200"
                    />
                  </div>
                ) : null}
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-base font-semibold text-zinc-900">
                  Informar pago
                </h2>
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p>
                    <span className="font-semibold">Precio lista:</span>{' '}
                    {formatCurrency(
                      membership.current_cycle_list_price_amount,
                      membership.currency_code,
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Bonificacion:</span>{' '}
                    {formatCurrency(
                      membership.current_cycle_discount_amount_applied,
                      membership.currency_code,
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Monto esperado:</span>{' '}
                    {formatCurrency(
                      membership.current_cycle_expected_amount,
                      membership.currency_code,
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Vencimiento:</span>{' '}
                    {formatDate(membership.current_cycle_due_on)}
                  </p>
                </div>
                {!membership.current_cycle_id ? (
                  <p className="mt-4 text-sm text-zinc-600">
                    Todavia no hay un ciclo de cobro vigente para esta
                    organizacion.
                  </p>
                ) : (
                  <form action={submitPayment} className="mt-4 grid gap-4">
                    <input
                      type="hidden"
                      name="cycle_id"
                      value={membership.current_cycle_id ?? ''}
                    />
                    <label className="grid gap-1 text-sm text-zinc-700">
                      Metodo de pago
                      <select
                        name="payment_method"
                        defaultValue="bank_transfer"
                        className="rounded-lg border border-zinc-300 px-3 py-2"
                      >
                        <option value="bank_transfer">Transferencia</option>
                        <option value="mercadopago_qr">QR Mercado Pago</option>
                        <option value="cash">Efectivo</option>
                        <option value="other">Otro</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm text-zinc-700">
                      Monto informado
                      <input
                        type="number"
                        name="amount_reported"
                        min="0"
                        step="0.01"
                        defaultValue={
                          membership.current_cycle_expected_amount ?? 0
                        }
                        className="rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <label className="grid gap-1 text-sm text-zinc-700">
                      Referencia u observacion
                      <textarea
                        name="reference_text"
                        rows={3}
                        className="rounded-lg border border-zinc-300 px-3 py-2"
                        placeholder="Ej: Transferencia desde cuenta terminada en 1234"
                      />
                    </label>

                    <label className="grid gap-1 text-sm text-zinc-700">
                      Comprobante
                      <input
                        type="file"
                        name="proof_file"
                        accept="image/*,application/pdf"
                        className="rounded-lg border border-zinc-300 px-3 py-2"
                      />
                    </label>

                    <button
                      type="submit"
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Enviar comprobante
                    </button>
                  </form>
                )}
              </article>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-base font-semibold text-zinc-900">
                Ultimos pagos
              </h2>
              {payments.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">
                  Todavia no hay comprobantes enviados.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {payments.map((payment) => (
                    <article
                      key={payment.payment_id}
                      className="rounded-xl border border-zinc-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {paymentMethodLabel(payment.payment_method)} ·{' '}
                            {formatCurrency(
                              payment.amount_reported,
                              membership.currency_code,
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Enviado {formatDateTime(payment.submitted_at)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                            payment.review_status,
                          )}`}
                        >
                          {payment.review_status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-zinc-600">
                        Ciclo {formatDate(payment.cycle_start_on)} a{' '}
                        {formatDate(payment.cycle_end_on)} · vence{' '}
                        {formatDate(payment.due_on)}
                      </p>
                      {payment.reference_text ? (
                        <p className="mt-2 text-sm text-zinc-700">
                          {payment.reference_text}
                        </p>
                      ) : null}
                      {payment.review_note ? (
                        <p className="mt-2 text-sm text-zinc-700">
                          Revision: {payment.review_note}
                        </p>
                      ) : null}
                      {proofUrlByPaymentId.get(payment.payment_id) ? (
                        <a
                          href={proofUrlByPaymentId.get(payment.payment_id)!}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-medium text-blue-700 underline"
                        >
                          Ver comprobante
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
