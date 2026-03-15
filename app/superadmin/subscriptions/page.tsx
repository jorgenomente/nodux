import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import CommercialConfigFormFields from '@/app/superadmin/subscriptions/CommercialConfigFormFields';
import PageShell from '@/app/components/PageShell';
import QrImageField from '@/app/superadmin/subscriptions/QrImageField';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  q?: string;
  org?: string;
  result?: string;
  service?: string;
  payment?: string;
  pricing?: string;
};

type SuperadminSubscriptionRow = {
  subscription_id: string;
  org_id: string;
  org_name: string;
  org_is_active: boolean;
  timezone: string;
  plan_id: string | null;
  plan_name: string;
  pricing_mode: 'standard' | 'custom';
  currency_code: string;
  base_price_monthly: number;
  included_branches: number;
  additional_branch_price_monthly: number;
  discount_mode: 'none' | 'percent' | 'fixed_amount';
  discount_percent: number | null;
  discount_amount: number | null;
  discount_label: string | null;
  active_branch_count: number;
  billable_additional_branch_count: number;
  calculated_monthly_price: number;
  list_price_monthly: number;
  discount_amount_applied: number;
  custom_monthly_price: number | null;
  effective_monthly_price: number;
  started_on: string;
  renews_on: string;
  service_status: 'active' | 'grace' | 'suspended' | 'cancelled';
  grace_until: string | null;
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
};

type SuperadminOrgRow = {
  org_id: string;
  org_name: string;
  timezone: string;
  is_active: boolean;
  branches_count: number;
  users_count: number;
  created_at: string;
};

type SubscriptionDetailRow = SuperadminSubscriptionRow & {
  branch_id: string | null;
  branch_name: string | null;
  branch_is_active: boolean | null;
  payment_id: string | null;
  payment_method: 'bank_transfer' | 'mercadopago_qr' | 'cash' | 'other' | null;
  amount_reported: number | null;
  reference_text: string | null;
  proof_storage_path: string | null;
  proof_uploaded_by: string | null;
  proof_uploaded_at: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_cbu: string | null;
  bank_alias: string | null;
  bank_cuit: string | null;
  mercadopago_qr_image_path: string | null;
  payment_instructions: string | null;
  billing_settings_is_active: boolean | null;
};

type PlatformBillingSettingsRow = {
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_cbu: string | null;
  bank_alias: string | null;
  bank_cuit: string | null;
  mercadopago_qr_image_path: string | null;
  payment_instructions: string | null;
  is_active: boolean;
};

type PricingMode = 'standard' | 'custom';
type DiscountMode = 'none' | 'percent' | 'fixed_amount';
type ServiceStatus = 'active' | 'grace' | 'suspended' | 'cancelled';
type CyclePaymentStatus =
  | 'pending'
  | 'proof_submitted'
  | 'paid'
  | 'rejected'
  | 'waived';

type SuperadminContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  isPlatformAdmin: boolean;
};

type SuperadminContextResult =
  | { status: 'ok'; context: SuperadminContext }
  | { status: 'no_user' }
  | { status: 'no_superadmin' };

const getSuperadminContext = async (): Promise<SuperadminContextResult> => {
  const cookieStore = await cookies();
  cookieStore.getAll();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'no_user' };
  }

  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');
  if (!isPlatformAdmin) {
    return { status: 'no_superadmin' };
  }

  return {
    status: 'ok',
    context: { supabase, userId: user.id, isPlatformAdmin: true },
  };
};

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

const addDays = (date: string, days: number) => {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

const isPricingMode = (value: string): value is PricingMode =>
  value === 'standard' || value === 'custom';

const isDiscountMode = (value: string): value is DiscountMode =>
  value === 'none' || value === 'percent' || value === 'fixed_amount';

const isServiceStatus = (value: string): value is ServiceStatus =>
  ['active', 'grace', 'suspended', 'cancelled'].includes(value);

const isCyclePaymentStatus = (value: string): value is CyclePaymentStatus =>
  ['pending', 'proof_submitted', 'paid', 'rejected', 'waived'].includes(value);

const serviceStatusLabel = (value: ServiceStatus) => {
  switch (value) {
    case 'active':
      return 'Activa';
    case 'grace':
      return 'En gracia';
    case 'suspended':
      return 'Suspendida';
    case 'cancelled':
      return 'Cancelada';
  }
};

const paymentStatusLabel = (value: CyclePaymentStatus | null | undefined) => {
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

const pricingModeLabel = (value: PricingMode) =>
  value === 'custom' ? 'Custom' : 'Standard';

const discountModeLabel = (
  value: DiscountMode,
  discountPercent: number | null,
  discountAmount: number | null,
  currencyCode = 'ARS',
) => {
  switch (value) {
    case 'percent':
      return `${Number(discountPercent ?? 0)}%`;
    case 'fixed_amount':
      return formatCurrency(discountAmount, currencyCode);
    default:
      return 'Sin bonificacion';
  }
};

export default async function SuperadminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const contextResult = await getSuperadminContext();

  if (contextResult.status === 'no_user') {
    redirect('/login?result=session_missing');
  }
  if (contextResult.status !== 'ok') {
    redirect('/no-access');
  }

  const { supabase } = contextResult.context;
  const currentDate = new Date().toISOString().slice(0, 10);

  const saveBillingSettings = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const admin = createAdminSupabaseClient();
    const qrDataUrl = String(
      formData.get('mercadopago_qr_data_url') ?? '',
    ).trim();
    const existingQrPath = String(
      formData.get('existing_qr_path') ?? '',
    ).trim();
    let uploadedQrPath = existingQrPath || undefined;

    if (qrDataUrl) {
      const matches = /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/.exec(
        qrDataUrl,
      );
      if (!matches) {
        redirect('/superadmin/subscriptions?result=billing_error');
      }

      const contentType = matches[1] || 'image/jpeg';
      const buffer = Buffer.from(matches[2] || '', 'base64');
      const imagePath = `billing/mercadopago-qr-${Date.now()}.jpg`;
      const { error: uploadError } = await admin.storage
        .from('platform-billing-assets')
        .upload(imagePath, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        redirect('/superadmin/subscriptions?result=billing_error');
      }

      uploadedQrPath = imagePath;
    }

    const { error } = await auth.context.supabase.rpc(
      'rpc_upsert_platform_billing_settings',
      {
        p_bank_account_holder:
          String(formData.get('bank_account_holder') ?? '').trim() || undefined,
        p_bank_name:
          String(formData.get('bank_name') ?? '').trim() || undefined,
        p_bank_account_type:
          String(formData.get('bank_account_type') ?? '').trim() || undefined,
        p_bank_cbu: String(formData.get('bank_cbu') ?? '').trim() || undefined,
        p_bank_alias:
          String(formData.get('bank_alias') ?? '').trim() || undefined,
        p_bank_cuit:
          String(formData.get('bank_cuit') ?? '').trim() || undefined,
        p_mercadopago_qr_image_path:
          uploadedQrPath ||
          String(formData.get('mercadopago_qr_image_path') ?? '').trim() ||
          undefined,
        p_payment_instructions:
          String(formData.get('payment_instructions') ?? '').trim() ||
          undefined,
        p_is_active: formData.get('billing_is_active') === 'on',
      },
    );

    if (error) {
      redirect('/superadmin/subscriptions?result=billing_error');
    }

    revalidatePath('/superadmin/subscriptions');
    redirect('/superadmin/subscriptions?result=billing_saved');
  };

  const saveSubscription = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const orgId = String(formData.get('org_id') ?? '').trim();
    const pricingMode = String(
      formData.get('pricing_mode') ?? 'standard',
    ).trim();
    const basePrice = Number(String(formData.get('base_price_monthly') ?? '0'));
    const includedBranches = Number(
      String(formData.get('included_branches') ?? '1'),
    );
    const additionalBranchPrice = Number(
      String(formData.get('additional_branch_price_monthly') ?? '0'),
    );
    const customMonthlyPriceRaw = String(
      formData.get('custom_monthly_price') ?? '',
    ).trim();
    const discountMode = String(formData.get('discount_mode') ?? 'none').trim();
    const discountPercentRaw = String(
      formData.get('discount_percent') ?? '',
    ).trim();
    const discountAmountRaw = String(
      formData.get('discount_amount') ?? '',
    ).trim();
    const discountLabel = String(formData.get('discount_label') ?? '').trim();
    const startedOn =
      String(formData.get('started_on') ?? '').trim() || currentDate;
    const renewsOn =
      String(formData.get('renews_on') ?? '').trim() ||
      addDays(currentDate, 30);
    const cycleStartOn =
      String(formData.get('cycle_start_on') ?? '').trim() || startedOn;
    const cycleEndOn =
      String(formData.get('cycle_end_on') ?? '').trim() ||
      addDays(cycleStartOn, 29);
    const cycleDueOn =
      String(formData.get('cycle_due_on') ?? '').trim() || renewsOn;
    const customerNoteVisible = String(
      formData.get('customer_note_visible') ?? '',
    ).trim();
    const billingNotesInternal = String(
      formData.get('billing_notes_internal') ?? '',
    ).trim();

    const serviceStatus = String(
      formData.get('service_status') ?? 'active',
    ).trim();

    if (
      !orgId ||
      !isPricingMode(pricingMode) ||
      !isDiscountMode(discountMode) ||
      !isServiceStatus(serviceStatus) ||
      Number.isNaN(basePrice) ||
      Number.isNaN(includedBranches) ||
      Number.isNaN(additionalBranchPrice)
    ) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=invalid`);
    }

    const customMonthlyPrice =
      customMonthlyPriceRaw === '' ? null : Number(customMonthlyPriceRaw);
    if (
      pricingMode === 'custom' &&
      (customMonthlyPrice === null || Number.isNaN(customMonthlyPrice))
    ) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=invalid`);
    }

    const discountPercent =
      discountPercentRaw === '' ? null : Number(discountPercentRaw);
    const discountAmount =
      discountAmountRaw === '' ? null : Number(discountAmountRaw);

    if (
      (discountMode === 'percent' &&
        (discountPercent === null ||
          Number.isNaN(discountPercent) ||
          discountPercent < 0 ||
          discountPercent > 100)) ||
      (discountMode === 'fixed_amount' &&
        (discountAmount === null ||
          Number.isNaN(discountAmount) ||
          discountAmount < 0))
    ) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=invalid`);
    }

    const { error } = await auth.context.supabase.rpc(
      'rpc_upsert_org_subscription',
      {
        p_org_id: orgId,
        p_pricing_mode: pricingMode,
        p_plan_name_snapshot: 'Plan Base',
        p_currency_code: 'ARS',
        p_base_price_monthly_snapshot: basePrice,
        p_included_branches_snapshot: includedBranches,
        p_additional_branch_price_monthly_snapshot: additionalBranchPrice,
        p_custom_monthly_price: customMonthlyPrice ?? undefined,
        p_discount_mode: discountMode,
        p_discount_percent: discountPercent ?? undefined,
        p_discount_amount: discountAmount ?? undefined,
        p_discount_label: discountLabel || undefined,
        p_started_on: startedOn,
        p_renews_on: renewsOn,
        p_service_status: serviceStatus,
        p_grace_until:
          String(formData.get('grace_until') ?? '').trim() || undefined,
        p_billing_notes_internal: billingNotesInternal || undefined,
        p_customer_note_visible: customerNoteVisible || undefined,
        p_is_auto_branch_pricing_enabled:
          formData.get('auto_branch_pricing') === 'on',
        p_cycle_start_on: cycleStartOn,
        p_cycle_end_on: cycleEndOn,
        p_cycle_due_on: cycleDueOn,
      },
    );

    if (error) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=save_error`);
    }

    revalidatePath('/superadmin/subscriptions');
    redirect(`/superadmin/subscriptions?org=${orgId}&result=saved`);
  };

  const setServiceStatus = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const orgId = String(formData.get('org_id') ?? '').trim();
    const serviceStatus = String(formData.get('service_status') ?? '').trim();
    const graceUntil = String(formData.get('grace_until') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();

    if (!isServiceStatus(serviceStatus)) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=service_error`);
    }

    const { error } = await auth.context.supabase.rpc(
      'rpc_set_org_subscription_service_status',
      {
        p_org_id: orgId,
        p_service_status: serviceStatus,
        p_grace_until: graceUntil || undefined,
        p_reason: reason || undefined,
      },
    );

    if (error) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=service_error`);
    }

    revalidatePath('/superadmin/subscriptions');
    redirect(`/superadmin/subscriptions?org=${orgId}&result=service_saved`);
  };

  const setPaymentStatus = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const orgId = String(formData.get('org_id') ?? '').trim();
    const cycleId = String(formData.get('cycle_id') ?? '').trim();
    const paymentId = String(formData.get('payment_id') ?? '').trim();
    const paymentStatus = String(formData.get('payment_status') ?? '').trim();
    const reviewNote = String(formData.get('review_note') ?? '').trim();

    if (!isCyclePaymentStatus(paymentStatus)) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=payment_error`);
    }

    const { error } = await auth.context.supabase.rpc(
      'rpc_set_org_subscription_cycle_payment_status',
      {
        p_cycle_id: cycleId,
        p_payment_status: paymentStatus,
        p_review_note: reviewNote || undefined,
        p_payment_id: paymentId || undefined,
      },
    );

    if (error) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=payment_error`);
    }

    revalidatePath('/superadmin/subscriptions');
    redirect(`/superadmin/subscriptions?org=${orgId}&result=payment_saved`);
  };

  const setOrgActiveStatus = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const orgId = String(formData.get('org_id') ?? '').trim();
    const nextActive =
      String(formData.get('next_active') ?? '').trim() === 'true';

    const { error } = await auth.context.supabase.rpc(
      'rpc_set_org_active_status',
      {
        p_org_id: orgId,
        p_is_active: nextActive,
        p_reason: 'Cambiado desde /superadmin/subscriptions',
      },
    );

    if (error) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=org_error`);
    }

    revalidatePath('/superadmin/subscriptions');
    redirect(`/superadmin/subscriptions?org=${orgId}&result=org_saved`);
  };

  const setActiveOrgAndOpen = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const orgId = String(formData.get('org_id') ?? '').trim();
    if (!orgId) {
      redirect('/superadmin/subscriptions?result=active_org_error');
    }

    const { error } = await auth.context.supabase.rpc(
      'rpc_superadmin_set_active_org',
      {
        p_org_id: orgId,
      },
    );

    if (error) {
      redirect(
        `/superadmin/subscriptions?org=${orgId}&result=active_org_error`,
      );
    }

    redirect('/dashboard');
  };

  const setBranchActiveStatus = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getSuperadminContext();
    if (auth.status === 'no_user') {
      redirect('/login?result=session_missing');
    }
    if (auth.status !== 'ok') {
      redirect('/no-access');
    }

    const orgId = String(formData.get('org_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const nextActive =
      String(formData.get('next_active') ?? '').trim() === 'true';

    const { error } = await auth.context.supabase.rpc(
      'rpc_set_branch_active_status',
      {
        p_branch_id: branchId,
        p_is_active: nextActive,
        p_reason: 'Cambiado desde /superadmin/subscriptions',
      },
    );

    if (error) {
      redirect(`/superadmin/subscriptions?org=${orgId}&result=branch_error`);
    }

    revalidatePath('/superadmin/subscriptions');
    redirect(`/superadmin/subscriptions?org=${orgId}&result=branch_saved`);
  };

  const q = params.q?.trim().toLowerCase() ?? '';
  const serviceFilter = params.service?.trim() ?? 'all';
  const paymentFilter = params.payment?.trim() ?? 'all';
  const pricingFilter = params.pricing?.trim() ?? 'all';
  const [{ data: orgsRaw }, { data: subscriptionsRaw }, { data: billingRaw }] =
    await Promise.all([
      supabase.from('v_superadmin_orgs').select('*').order('org_name'),
      supabase.from('v_superadmin_subscriptions').select('*').order('org_name'),
      supabase.from('platform_billing_settings').select('*').maybeSingle(),
    ]);

  const orgs = (orgsRaw ?? []) as SuperadminOrgRow[];
  const subscriptions = (subscriptionsRaw ?? []) as SuperadminSubscriptionRow[];
  const billingSettings =
    (billingRaw as PlatformBillingSettingsRow | null) ?? null;

  const subscriptionByOrgId = new Map(
    subscriptions.map((subscription) => [subscription.org_id, subscription]),
  );

  const rows = orgs
    .map((org) => ({
      org,
      subscription: subscriptionByOrgId.get(org.org_id) ?? null,
    }))
    .filter(({ org, subscription }) => {
      const matchesQuery =
        !q ||
        org.org_name.toLowerCase().includes(q) ||
        subscription?.plan_name?.toLowerCase().includes(q);
      const matchesService =
        serviceFilter === 'all' ||
        (subscription?.service_status ??
          (org.is_active ? 'active' : 'suspended')) === serviceFilter;
      const matchesPayment =
        paymentFilter === 'all' ||
        (subscription?.current_cycle_payment_status ?? 'none') ===
          paymentFilter;
      const matchesPricing =
        pricingFilter === 'all' ||
        (subscription?.pricing_mode ?? 'standard') === pricingFilter;

      return matchesQuery && matchesService && matchesPayment && matchesPricing;
    });

  const summary = rows.reduce(
    (acc, row) => {
      const serviceStatus =
        row.subscription?.service_status ??
        (row.org.is_active ? 'active' : 'suspended');
      acc.total += 1;
      if (serviceStatus === 'active') acc.active += 1;
      if (serviceStatus === 'grace') acc.grace += 1;
      if (serviceStatus === 'suspended') acc.suspended += 1;
      acc.mrr += row.subscription?.effective_monthly_price ?? 0;
      return acc;
    },
    { total: 0, active: 0, grace: 0, suspended: 0, mrr: 0 },
  );

  const selectedOrgId =
    rows.find((row) => row.org.org_id === params.org)?.org.org_id ??
    rows[0]?.org.org_id ??
    '';

  const selectedRow =
    rows.find((row) => row.org.org_id === selectedOrgId) ?? null;

  const admin = createAdminSupabaseClient();
  const [detailData, signedProofPairs, qrSignedUrl] = selectedOrgId
    ? await (async () => {
        const { data } = await supabase
          .from('v_superadmin_subscription_detail')
          .select('*')
          .eq('org_id', selectedOrgId);
        const detailRows = (data ?? []) as SubscriptionDetailRow[];
        const signedProofs = await Promise.all(
          detailRows.map(async (row) => {
            if (!row.payment_id || !row.proof_storage_path) {
              return [row.payment_id ?? '', null] as const;
            }
            const { data: signed } = await supabase.storage
              .from('subscription-payment-proofs')
              .createSignedUrl(row.proof_storage_path, 60 * 30);
            return [row.payment_id, signed?.signedUrl ?? null] as const;
          }),
        );
        const qrPath = detailRows[0]?.mercadopago_qr_image_path;
        let signedQrUrl: string | null = null;
        if (qrPath) {
          const { data: signedQr } = await admin.storage
            .from('platform-billing-assets')
            .createSignedUrl(qrPath, 60 * 30);
          signedQrUrl = signedQr?.signedUrl ?? null;
        }
        return [detailRows, signedProofs, signedQrUrl] as const;
      })()
    : [[], [] as ReadonlyArray<readonly [string, string | null]>, null];

  const detailRows = detailData as SubscriptionDetailRow[];
  const proofUrlByPaymentId = new Map(signedProofPairs);
  const detailHead = detailRows[0] ?? null;
  const branchRows = Array.from(
    new Map(
      detailRows
        .filter((row) => row.branch_id)
        .map((row) => [
          row.branch_id!,
          {
            branch_id: row.branch_id!,
            branch_name: row.branch_name ?? 'Sucursal',
            branch_is_active: Boolean(row.branch_is_active),
          },
        ]),
    ).values(),
  );
  const paymentRows = Array.from(
    new Map(
      detailRows
        .filter((row) => row.payment_id)
        .map((row) => [
          row.payment_id!,
          {
            payment_id: row.payment_id!,
            payment_method: row.payment_method,
            amount_reported: row.amount_reported,
            reference_text: row.reference_text,
            proof_uploaded_at: row.proof_uploaded_at,
            review_status: row.review_status,
            review_note: row.review_note,
            reviewed_at: row.reviewed_at,
            proof_storage_path: row.proof_storage_path,
          },
        ]),
    ).values(),
  );

  const result = params.result?.trim() ?? '';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Suscripciones
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Consola comercial SaaS para pricing, cobros manuales y estado del
              servicio por organizacion.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/superadmin"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
            >
              Volver a superadmin
            </Link>
            {selectedOrgId ? (
              <form action={setActiveOrgAndOpen}>
                <input type="hidden" name="org_id" value={selectedOrgId} />
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Activar org e ir a dashboard
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {result ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
            Resultado: {result}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Orgs filtradas
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {summary.total}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Sobre la cartera visible con los filtros actuales.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Servicio sano
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {summary.active}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Orgs activas comercialmente.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              En riesgo
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {summary.grace + summary.suspended}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              {summary.grace} en gracia · {summary.suspended} suspendidas.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              MRR estimado
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(summary.mrr)}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Suma mensual esperada de las orgs visibles.
            </p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-5">
            <form
              action="/superadmin/subscriptions"
              className="mb-4 grid gap-3"
            >
              <input type="hidden" name="org" value={selectedOrgId} />
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Buscar org o plan"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Servicio
                  <select
                    name="service"
                    defaultValue={serviceFilter}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-700 normal-case"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activa</option>
                    <option value="grace">En gracia</option>
                    <option value="suspended">Suspendida</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Pago
                  <select
                    name="payment"
                    defaultValue={paymentFilter}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-700 normal-case"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="proof_submitted">Comprobante enviado</option>
                    <option value="paid">Pagado</option>
                    <option value="rejected">Rechazado</option>
                    <option value="waived">Condonado</option>
                    <option value="none">Sin ciclo</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Pricing
                  <select
                    name="pricing"
                    defaultValue={pricingFilter}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-700 normal-case"
                  >
                    <option value="all">Todos</option>
                    <option value="standard">Standard</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Aplicar filtros
                </button>
                <Link
                  href="/superadmin/subscriptions"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
                >
                  Limpiar
                </Link>
              </div>
            </form>
            <div className="grid gap-3">
              {rows.map(({ org, subscription }) => (
                <Link
                  key={org.org_id}
                  href={`/superadmin/subscriptions?org=${org.org_id}${
                    q ? `&q=${encodeURIComponent(q)}` : ''
                  }`}
                  className={`rounded-xl border p-4 transition ${
                    org.org_id === selectedOrgId
                      ? 'border-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {org.org_name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {org.branches_count} sucursales · {org.users_count}{' '}
                        usuarios
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {subscription
                          ? `${pricingModeLabel(subscription.pricing_mode)} · ${paymentStatusLabel(
                              subscription.current_cycle_payment_status,
                            )}`
                          : 'Pendiente de alta comercial'}
                      </p>
                      {subscription && subscription.discount_mode !== 'none' ? (
                        <p className="mt-1 text-xs text-emerald-700">
                          {subscription.discount_label || 'Bonificacion'} ·{' '}
                          {discountModeLabel(
                            subscription.discount_mode,
                            subscription.discount_percent,
                            subscription.discount_amount,
                            subscription.currency_code,
                          )}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                        subscription?.service_status ??
                          (org.is_active ? 'active' : 'suspended'),
                      )}`}
                    >
                      {subscription
                        ? serviceStatusLabel(subscription.service_status)
                        : 'Sin suscripcion'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">
                    {subscription
                      ? `${subscription.plan_name} · ${formatCurrency(
                          subscription.effective_monthly_price,
                          subscription.currency_code,
                        )}`
                      : 'Sin configuracion comercial'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pago actual:{' '}
                    {paymentStatusLabel(
                      subscription?.current_cycle_payment_status,
                    )}
                  </p>
                </Link>
              ))}
            </div>
          </aside>

          <div className="grid gap-6">
            {!selectedRow ? (
              <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
                No hay organizaciones para mostrar.
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Org
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                      {selectedRow.org.org_name}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600">
                      Timezone: {selectedRow.org.timezone}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Sucursales activas
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-900">
                      {selectedRow.subscription?.active_branch_count ??
                        selectedRow.org.branches_count}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600">
                      Incluidas:{' '}
                      {selectedRow.subscription?.included_branches ?? 1}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Monto mensual
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-900">
                      {selectedRow.subscription
                        ? formatCurrency(
                            selectedRow.subscription.effective_monthly_price,
                            selectedRow.subscription.currency_code,
                          )
                        : 'Sin definir'}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600">
                      Pago actual:{' '}
                      {paymentStatusLabel(
                        selectedRow.subscription?.current_cycle_payment_status,
                      )}
                    </p>
                    {selectedRow.subscription &&
                    selectedRow.subscription.discount_mode !== 'none' ? (
                      <p className="mt-2 text-sm text-emerald-700">
                        Lista{' '}
                        {formatCurrency(
                          selectedRow.subscription.list_price_monthly,
                          selectedRow.subscription.currency_code,
                        )}{' '}
                        · ahorro{' '}
                        {formatCurrency(
                          selectedRow.subscription.discount_amount_applied,
                          selectedRow.subscription.currency_code,
                        )}
                      </p>
                    ) : null}
                  </article>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Servicio
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                        selectedRow.subscription?.service_status ??
                          (selectedRow.org.is_active ? 'active' : 'suspended'),
                      )}`}
                    >
                      {serviceStatusLabel(
                        selectedRow.subscription?.service_status ??
                          (selectedRow.org.is_active ? 'active' : 'suspended'),
                      )}
                    </span>
                    <p className="mt-2 text-sm text-zinc-600">
                      Renovacion:{' '}
                      {formatDate(selectedRow.subscription?.renews_on)}
                    </p>
                  </article>
                </section>

                {selectedRow.subscription?.service_status === 'grace' ? (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Esta org está en gracia hasta{' '}
                    <span className="font-semibold">
                      {formatDate(selectedRow.subscription.grace_until)}
                    </span>
                    . Si no se regulariza el pago, conviene suspender el
                    servicio o extender la gracia explícitamente.
                  </section>
                ) : null}
                {selectedRow.subscription?.service_status === 'suspended' ? (
                  <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    Servicio suspendido. La org no debería operar sin decisión
                    explícita de superadmin.
                  </section>
                ) : null}
                {selectedRow.subscription?.current_cycle_payment_status ===
                'rejected' ? (
                  <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    El último comprobante del ciclo fue rechazado. Revisá la
                    nota de revisión y, si corresponde, devolvé el ciclo a
                    pendiente para esperar un nuevo envío.
                  </section>
                ) : null}
                {selectedRow.subscription?.current_cycle_payment_status ===
                'proof_submitted' ? (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Hay un comprobante enviado pendiente de decisión. Este es el
                    punto de control principal para no demorar activaciones ni
                    renovaciones.
                  </section>
                ) : null}

                <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900">
                        Configuracion comercial
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        Editá el acuerdo comercial en bloques separados para que
                        sea más fácil entender cálculo, beneficio y vigencia.
                      </p>
                    </div>
                  </div>

                  <form action={saveSubscription} className="mt-4 grid gap-4">
                    <input
                      type="hidden"
                      name="org_id"
                      value={selectedRow.org.org_id}
                    />
                    <CommercialConfigFormFields
                      values={{
                        pricingMode:
                          selectedRow.subscription?.pricing_mode ?? 'standard',
                        serviceStatus:
                          selectedRow.subscription?.service_status ?? 'active',
                        basePriceMonthly:
                          selectedRow.subscription?.base_price_monthly ??
                          100000,
                        includedBranches:
                          selectedRow.subscription?.included_branches ?? 1,
                        additionalBranchPriceMonthly:
                          selectedRow.subscription
                            ?.additional_branch_price_monthly ?? 80000,
                        customMonthlyPrice:
                          selectedRow.subscription?.custom_monthly_price ??
                          null,
                        discountMode:
                          selectedRow.subscription?.discount_mode ?? 'none',
                        discountPercent:
                          selectedRow.subscription?.discount_percent ?? null,
                        discountAmount:
                          selectedRow.subscription?.discount_amount ?? null,
                        discountLabel:
                          selectedRow.subscription?.discount_label ?? '',
                        startedOn:
                          selectedRow.subscription?.started_on ?? currentDate,
                        renewsOn:
                          selectedRow.subscription?.renews_on ??
                          addDays(currentDate, 30),
                        cycleStartOn:
                          selectedRow.subscription?.current_cycle_start_on ??
                          currentDate,
                        cycleEndOn:
                          selectedRow.subscription?.current_cycle_end_on ??
                          addDays(currentDate, 29),
                        cycleDueOn:
                          selectedRow.subscription?.current_cycle_due_on ??
                          addDays(currentDate, 30),
                        graceUntil: selectedRow.subscription?.grace_until ?? '',
                        customerNoteVisible: '',
                        billingNotesInternal: '',
                        autoBranchPricing: true,
                        activeBranchCount:
                          selectedRow.subscription?.active_branch_count ??
                          selectedRow.org.branches_count,
                        currencyCode:
                          selectedRow.subscription?.currency_code ?? 'ARS',
                      }}
                    />
                    <div className="lg:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Guardar configuracion comercial
                      </button>
                    </div>
                  </form>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Estado del servicio
                    </h2>
                    <form action={setServiceStatus} className="mt-4 grid gap-4">
                      <input
                        type="hidden"
                        name="org_id"
                        value={selectedRow.org.org_id}
                      />
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Nuevo estado
                        <select
                          name="service_status"
                          defaultValue={
                            selectedRow.subscription?.service_status ?? 'active'
                          }
                          className="rounded-lg border border-zinc-300 px-3 py-2"
                        >
                          <option value="active">active</option>
                          <option value="grace">grace</option>
                          <option value="suspended">suspended</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Gracia hasta
                        <input
                          type="date"
                          name="grace_until"
                          defaultValue={
                            selectedRow.subscription?.grace_until ?? ''
                          }
                          className="rounded-lg border border-zinc-300 px-3 py-2"
                        />
                      </label>
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Motivo interno
                        <textarea
                          name="reason"
                          rows={3}
                          className="rounded-lg border border-zinc-300 px-3 py-2"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Actualizar servicio
                      </button>
                    </form>
                  </article>

                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Activacion de org
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600">
                      Estado operativo actual:{' '}
                      {selectedRow.org.is_active ? 'Activa' : 'Inactiva'}
                    </p>
                    <form action={setOrgActiveStatus} className="mt-4">
                      <input
                        type="hidden"
                        name="org_id"
                        value={selectedRow.org.org_id}
                      />
                      <input
                        type="hidden"
                        name="next_active"
                        value={selectedRow.org.is_active ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                          selectedRow.org.is_active
                            ? 'bg-rose-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {selectedRow.org.is_active
                          ? 'Desactivar org'
                          : 'Activar org'}
                      </button>
                    </form>
                  </article>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Sucursales
                    </h2>
                    {branchRows.length === 0 ? (
                      <p className="mt-4 text-sm text-zinc-600">
                        Todavia no hay sucursales cargadas para esta org.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {branchRows.map((branch) => (
                          <form
                            key={branch.branch_id}
                            action={setBranchActiveStatus}
                            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3"
                          >
                            <input
                              type="hidden"
                              name="org_id"
                              value={selectedRow.org.org_id}
                            />
                            <input
                              type="hidden"
                              name="branch_id"
                              value={branch.branch_id}
                            />
                            <input
                              type="hidden"
                              name="next_active"
                              value={branch.branch_is_active ? 'false' : 'true'}
                            />
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">
                                {branch.branch_name}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {branch.branch_is_active
                                  ? 'Activa'
                                  : 'Inactiva'}
                              </p>
                            </div>
                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                                branch.branch_is_active
                                  ? 'bg-rose-600'
                                  : 'bg-emerald-600'
                              }`}
                            >
                              {branch.branch_is_active
                                ? 'Desactivar'
                                : 'Activar'}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Pagos y comprobantes
                    </h2>
                    {!detailHead?.current_cycle_id ? (
                      <p className="mt-4 text-sm text-zinc-600">
                        Todavia no hay ciclo configurado para revisar pagos.
                      </p>
                    ) : paymentRows.length === 0 ? (
                      <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
                        Sin submissions todavía. El ciclo actual está en{' '}
                        <span className="font-semibold">
                          {detailHead.current_cycle_payment_status ??
                            'sin estado'}
                        </span>
                        .
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {paymentRows.map((payment) => (
                          <article
                            key={payment.payment_id}
                            className="rounded-xl border border-zinc-200 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">
                                  {payment.payment_method ?? 'Metodo'} ·{' '}
                                  {formatCurrency(
                                    payment.amount_reported,
                                    detailHead.currency_code,
                                  )}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  Enviado{' '}
                                  {formatDateTime(payment.proof_uploaded_at)}
                                </p>
                              </div>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(
                                  payment.review_status,
                                )}`}
                              >
                                {payment.review_status ?? 'pending'}
                              </span>
                            </div>
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
                                href={
                                  proofUrlByPaymentId.get(payment.payment_id)!
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex text-sm font-medium text-blue-700 underline"
                              >
                                Ver comprobante
                              </a>
                            ) : null}
                            <form
                              action={setPaymentStatus}
                              className="mt-4 grid gap-3"
                            >
                              <input
                                type="hidden"
                                name="org_id"
                                value={selectedRow.org.org_id}
                              />
                              <input
                                type="hidden"
                                name="cycle_id"
                                value={detailHead.current_cycle_id ?? ''}
                              />
                              <input
                                type="hidden"
                                name="payment_id"
                                value={payment.payment_id}
                              />
                              <select
                                name="payment_status"
                                defaultValue="paid"
                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                              >
                                <option value="paid">Aprobar pago</option>
                                <option value="rejected">
                                  Rechazar comprobante
                                </option>
                                <option value="waived">Condonar ciclo</option>
                                <option value="pending">
                                  Volver a pendiente
                                </option>
                              </select>
                              <textarea
                                name="review_note"
                                rows={2}
                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                                placeholder="Nota interna de revision"
                              />
                              <button
                                type="submit"
                                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Guardar decision
                              </button>
                            </form>
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                </section>
              </>
            )}
          </div>
        </section>

        <details className="rounded-2xl border border-zinc-200 bg-white p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Datos de cobro plataforma
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Información visible en la pantalla de membresía de cada org.
                </p>
              </div>
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Desplegar
              </span>
            </div>
          </summary>
          <form
            action={saveBillingSettings}
            className="mt-4 grid gap-4 lg:grid-cols-2"
          >
            <label className="grid gap-1 text-sm text-zinc-700">
              Titular
              <input
                type="text"
                name="bank_account_holder"
                defaultValue={billingSettings?.bank_account_holder ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              Banco
              <input
                type="text"
                name="bank_name"
                defaultValue={billingSettings?.bank_name ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              Tipo de cuenta
              <input
                type="text"
                name="bank_account_type"
                defaultValue={billingSettings?.bank_account_type ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              CBU / CVU
              <input
                type="text"
                name="bank_cbu"
                defaultValue={billingSettings?.bank_cbu ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              Alias
              <input
                type="text"
                name="bank_alias"
                defaultValue={billingSettings?.bank_alias ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              CUIT
              <input
                type="text"
                name="bank_cuit"
                defaultValue={billingSettings?.bank_cuit ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <div className="lg:col-span-2">
              <QrImageField
                inputName="mercadopago_qr_data_url"
                existingImageUrl={qrSignedUrl}
                existingPath={
                  billingSettings?.mercadopago_qr_image_path ?? null
                }
              />
              <label className="mt-3 grid gap-1 text-sm text-zinc-700">
                Path QR actual
                <input
                  type="text"
                  name="mercadopago_qr_image_path"
                  defaultValue={
                    billingSettings?.mercadopago_qr_image_path ?? ''
                  }
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm text-zinc-700 lg:col-span-2">
              Instrucciones de pago
              <textarea
                name="payment_instructions"
                rows={3}
                defaultValue={billingSettings?.payment_instructions ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 lg:col-span-2">
              <input
                type="checkbox"
                name="billing_is_active"
                defaultChecked={billingSettings?.is_active ?? true}
              />
              Datos de cobro visibles
            </label>
            <div className="lg:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar datos de cobro
              </button>
            </div>
          </form>
        </details>
      </div>
    </PageShell>
  );
}
