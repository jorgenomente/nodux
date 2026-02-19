import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import OrderSuggestionsClient from '@/app/orders/OrderSuggestionsClient';
import ReceiveActionsRow from '@/app/orders/ReceiveActionsRow';
import InvoiceImageField from '@/app/payments/InvoiceImageField';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type OrderDetailRow = {
  order_id: string;
  status: string;
  notes: string | null;
  supplier_id: string;
  supplier_name: string | null;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  reconciled_at: string | null;
  expected_receive_on: string | null;
  controlled_by_user_id: string | null;
  controlled_by_name: string | null;
  controlled_by_user_name: string | null;
  order_item_id: string | null;
  product_id: string | null;
  product_name: string | null;
  ordered_qty: number | null;
  received_qty: number | null;
  unit_cost: number | null;
  diff_qty: number | null;
};

type SupplierPaymentProfileRow = {
  id: string;
  preferred_payment_method: 'cash' | 'transfer' | null;
};

type PayableStatusRow = {
  id: string;
  branch_id: string;
  status: 'pending' | 'partial' | 'paid';
  invoice_amount: number | null;
  estimated_amount: number | null;
  outstanding_amount: number | null;
  paid_amount: number | null;
  paid_at: string | null;
  due_on: string | null;
  invoice_reference: string | null;
  invoice_photo_url: string | null;
  invoice_note: string | null;
  selected_payment_method: 'cash' | 'transfer' | null;
};

type SuggestionRow = {
  product_id: string;
  relation_type: 'primary' | 'secondary';
  product_name: string | null;
  stock_on_hand: number | null;
  safety_stock: number | null;
  avg_daily_sales_30d: number | null;
  cycle_days?: number | null;
  suggested_qty: number | null;
};

type ProductPriceRow = {
  id: string;
  unit_price: number | null;
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Pendiente por realizar';
    case 'sent':
      return 'Pendiente por recibir';
    case 'received':
      return 'Pendiente por recibir';
    case 'reconciled':
      return 'Recibido y controlado';
    default:
      return status;
  }
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-AR') : '—';
const formatDateInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);
const ESTIMATE_NOTE =
  'Aproximado. El monto real se confirma con remito/factura.';
const normalizeNotice = (value: string) => value.replaceAll(' ', '_');

const statusOptions = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviado' },
];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{
    notice?: string;
    received_at?: string;
    controlled_by_name?: string;
    mark_cash_payment?: string;
    cash_paid_amount?: string;
    cash_partial_payment?: string;
    cash_partial_total_amount?: string;
  }>;
}) {
  const resolvedParams = await params;
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

  const orderId = resolvedParams.orderId;
  const { data: detailRows } = await supabase
    .from('v_order_detail_admin')
    .select('*')
    .eq('org_id', orgId)
    .eq('order_id', orderId);

  if (!detailRows || detailRows.length === 0) {
    redirect('/orders');
  }

  const order = detailRows[0] as OrderDetailRow;
  const items = (detailRows as OrderDetailRow[]).filter(
    (row) => row.product_id,
  );
  const { data: supplierPaymentProfile } = await supabase
    .from('suppliers')
    .select('id, preferred_payment_method')
    .eq('org_id', orgId)
    .eq('id', order.supplier_id)
    .maybeSingle();
  const preferredPaymentMethod = (
    supplierPaymentProfile as SupplierPaymentProfileRow | null
  )?.preferred_payment_method;
  const isCashSupplier = preferredPaymentMethod === 'cash';
  const { data: payableStatusRow } = await supabase
    .from('supplier_payables')
    .select(
      'id, branch_id, status, invoice_amount, estimated_amount, outstanding_amount, paid_amount, paid_at, due_on, invoice_reference, invoice_photo_url, invoice_note, selected_payment_method',
    )
    .eq('org_id', orgId)
    .eq('order_id', orderId)
    .maybeSingle();
  const payableStatus = payableStatusRow as PayableStatusRow | null;
  const isPayableAlreadyPaid =
    payableStatus?.status === 'paid' ||
    Number(payableStatus?.outstanding_amount ?? 0) <= 0;
  const isCashPaid =
    payableStatus?.selected_payment_method === 'cash' &&
    Number(payableStatus?.paid_amount ?? 0) > 0;
  const cashPaidAmount = Number(payableStatus?.paid_amount ?? 0);
  const { data: signedInvoiceData } = payableStatus?.invoice_photo_url
    ? await supabase.storage
        .from('supplier-invoices')
        .createSignedUrl(payableStatus.invoice_photo_url, 60 * 60)
    : { data: null };
  const signedInvoiceUrl = signedInvoiceData?.signedUrl;

  const { data: suggestions } = await supabase
    .from('v_supplier_product_suggestions')
    .select('*')
    .eq('org_id', orgId)
    .eq('supplier_id', order.supplier_id)
    .eq('branch_id', order.branch_id)
    .eq('relation_type', 'primary')
    .order('product_name');

  const mergedSuggestionsByProduct = new Map<string, SuggestionRow>();
  ((suggestions as SuggestionRow[] | null) ?? []).forEach((row) => {
    mergedSuggestionsByProduct.set(row.product_id, row);
  });
  items.forEach((item) => {
    if (!item.product_id) return;
    if (mergedSuggestionsByProduct.has(item.product_id)) return;
    mergedSuggestionsByProduct.set(item.product_id, {
      product_id: item.product_id,
      relation_type: 'primary',
      product_name: item.product_name,
      stock_on_hand: null,
      safety_stock: null,
      avg_daily_sales_30d: null,
      cycle_days: undefined,
      suggested_qty: item.ordered_qty ?? 0,
    });
  });
  const mergedSuggestions = Array.from(
    mergedSuggestionsByProduct.values(),
  ).sort((a, b) => (a.product_name ?? '').localeCompare(b.product_name ?? ''));

  const suggestionIds = mergedSuggestions
    ?.map((row) => row.product_id)
    .filter(Boolean);
  const { data: suggestionPrices } =
    suggestionIds && suggestionIds.length > 0
      ? await supabase
          .from('products')
          .select('id, unit_price')
          .eq('org_id', orgId)
          .in('id', suggestionIds)
      : { data: [] };
  const priceByProduct = new Map<string, number>();
  (suggestionPrices as ProductPriceRow[] | null)?.forEach((row) => {
    if (!row.id) return;
    priceByProduct.set(row.id, Number(row.unit_price ?? 0));
  });
  const priceByProductRecord: Record<string, number> = {};
  priceByProduct.forEach((value, key) => {
    priceByProductRecord[key] = value;
  });
  const existingItemQuantities: Record<string, number> = {};
  items.forEach((item) => {
    if (!item.product_id) return;
    existingItemQuantities[item.product_id] = Number(item.ordered_qty ?? 0);
  });

  const saveDraftItems = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const qtyEntries = Array.from(formData.entries())
      .filter(([key]) => key.startsWith('qty_'))
      .map(([key, value]) => ({
        productId: key.replace('qty_', ''),
        qty: Number(value),
        unitCost: Number(formData.get(`unit_cost_${key.replace('qty_', '')}`)),
      }))
      .filter(
        (entry) =>
          entry.productId &&
          Number.isFinite(entry.qty) &&
          Number.isFinite(entry.unitCost),
      );

    const nextByProduct = new Map<string, { qty: number; unitCost: number }>();
    qtyEntries.forEach((entry) => {
      const qty = Math.max(0, Math.round(entry.qty));
      if (qty <= 0) return;
      nextByProduct.set(entry.productId, {
        qty,
        unitCost: entry.unitCost > 0 ? entry.unitCost : 0,
      });
    });

    await Promise.all(
      Array.from(nextByProduct.entries()).map(([productId, payload]) =>
        supabaseServer.rpc('rpc_upsert_supplier_order_item', {
          p_org_id: orgId,
          p_order_id: orderId,
          p_product_id: productId,
          p_ordered_qty: payload.qty,
          p_unit_cost: payload.unitCost,
        }),
      ),
    );

    const { data: existingRows } = await supabaseServer
      .from('supplier_order_items')
      .select('product_id')
      .eq('org_id', orgId)
      .eq('order_id', orderId);
    const existingProductIds = (existingRows ?? [])
      .map((row) => String(row.product_id ?? ''))
      .filter(Boolean);

    const productIdsToRemove = existingProductIds.filter(
      (productId) => !nextByProduct.has(productId),
    );

    await Promise.all(
      productIdsToRemove.map((productId) =>
        supabaseServer.rpc('rpc_remove_supplier_order_item', {
          p_org_id: orgId,
          p_order_id: orderId,
          p_product_id: productId,
        }),
      ),
    );

    const draftAction = String(formData.get('draft_action') ?? 'draft').trim();
    if (draftAction === 'sent') {
      await supabaseServer.rpc('rpc_set_supplier_order_status', {
        p_org_id: orgId,
        p_order_id: orderId,
        p_status: 'sent',
      });
      revalidatePath(`/orders/${orderId}`);
      revalidatePath('/orders');
      redirect(`/orders/${orderId}?notice=sent`);
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    redirect(`/orders/${orderId}?notice=draft_items_saved`);
  };

  const sendOrder = async () => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();

    await supabaseServer.rpc('rpc_set_supplier_order_status', {
      p_org_id: orgId,
      p_order_id: orderId,
      p_status: 'sent',
    });

    revalidatePath('/orders');
    redirect(`/orders/${orderId}?notice=sent`);
  };

  const setOrderStatus = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const nextStatus = formData.get('next_status');

    if (nextStatus !== 'draft' && nextStatus !== 'sent') {
      return;
    }

    if (nextStatus === order.status) {
      return;
    }

    await supabaseServer.rpc('rpc_set_supplier_order_status', {
      p_org_id: orgId,
      p_order_id: orderId,
      p_status: nextStatus,
    });

    revalidatePath('/orders');
    redirect(`/orders/${orderId}?notice=status`);
  };

  const receiveOrder = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const receivedAtRaw = String(formData.get('received_at') ?? '').trim();
    const controlledByName = String(
      formData.get('controlled_by_name') ?? '',
    ).trim();
    const markCashPaymentAsDone =
      String(formData.get('mark_cash_payment') ?? '').trim() === '1';
    const markCashPaymentAsPartial =
      String(formData.get('cash_partial_payment') ?? '').trim() === '1';
    const cashPaidAmountRaw = String(
      formData.get('cash_paid_amount') ?? '',
    ).trim();
    const partialTotalAmountRaw = String(
      formData.get('cash_partial_total_amount') ?? '',
    ).trim();

    const buildReceiveNoticeUrl = (noticeValue: string) => {
      const params = new URLSearchParams();
      params.set('notice', noticeValue);
      if (receivedAtRaw) params.set('received_at', receivedAtRaw);
      if (controlledByName) params.set('controlled_by_name', controlledByName);
      if (markCashPaymentAsDone) params.set('mark_cash_payment', '1');
      if (cashPaidAmountRaw) params.set('cash_paid_amount', cashPaidAmountRaw);
      if (markCashPaymentAsPartial) params.set('cash_partial_payment', '1');
      if (partialTotalAmountRaw) {
        params.set('cash_partial_total_amount', partialTotalAmountRaw);
      }
      return `/orders/${orderId}?${params.toString()}`;
    };

    if (!controlledByName) {
      redirect(buildReceiveNoticeUrl('controlled_required'));
    }

    if (markCashPaymentAsDone && !isCashSupplier) {
      redirect(buildReceiveNoticeUrl('cash_payment_not_allowed'));
    }

    const cashPaidAmount = Number(cashPaidAmountRaw);
    if (
      markCashPaymentAsDone &&
      (!cashPaidAmountRaw ||
        Number.isNaN(cashPaidAmount) ||
        cashPaidAmount <= 0)
    ) {
      redirect(buildReceiveNoticeUrl('cash_amount_required'));
    }
    const partialTotalAmount = Number(partialTotalAmountRaw);
    if (
      markCashPaymentAsDone &&
      markCashPaymentAsPartial &&
      (!partialTotalAmountRaw ||
        Number.isNaN(partialTotalAmount) ||
        partialTotalAmount <= 0)
    ) {
      redirect(buildReceiveNoticeUrl('partial_total_required'));
    }

    const parsedReceivedAt = receivedAtRaw ? new Date(receivedAtRaw) : null;
    const receivedAt =
      parsedReceivedAt && !Number.isNaN(parsedReceivedAt.getTime())
        ? parsedReceivedAt.toISOString()
        : null;
    const { data: userData } = await supabaseServer.auth.getUser();
    const userId = userData.user?.id ?? null;
    const itemsPayload = items
      .map((item) => {
        const value = Number(
          formData.get(`received_${item.order_item_id}`) ?? 0,
        );
        if (!item.order_item_id) return null;
        return {
          order_item_id: item.order_item_id,
          received_qty: value,
        };
      })
      .filter(Boolean);

    if (order.status === 'sent') {
      await supabaseServer.rpc('rpc_receive_supplier_order', {
        p_org_id: orgId,
        p_order_id: orderId,
        p_items: itemsPayload,
        p_received_at: receivedAt,
        p_controlled_by_user_id: userId,
        p_controlled_by_name: controlledByName,
      });
    }

    if (order.status === 'received') {
      await supabaseServer
        .from('supplier_orders')
        .update({
          status: 'reconciled',
          received_at:
            receivedAt ?? order.received_at ?? new Date().toISOString(),
          reconciled_at: receivedAt ?? new Date().toISOString(),
          controlled_by_user_id: userId,
          controlled_by_name: controlledByName,
        })
        .eq('org_id', orgId)
        .eq('id', orderId)
        .eq('status', 'received');
    }

    if (markCashPaymentAsDone) {
      const { data: payableRow } = await supabaseServer
        .from('supplier_payables')
        .select('*')
        .eq('org_id', orgId)
        .eq('order_id', orderId)
        .maybeSingle();
      const payableRowAny = payableRow as Record<string, unknown> | null;

      const payableId = String(payableRowAny?.id ?? '');
      const outstandingAmount = Number(payableRowAny?.outstanding_amount ?? 0);
      const currentPaidAmount = Number(payableRowAny?.paid_amount ?? 0);
      const payableStatus = String(payableRowAny?.status ?? '');
      const baseAmount = Number(
        payableRowAny?.invoice_amount ?? payableRowAny?.estimated_amount ?? 0,
      );

      if (payableId && payableStatus !== 'paid' && outstandingAmount > 0) {
        const paidAt = receivedAt ?? new Date().toISOString();
        const totalPaidAfterPayment = Number(
          (currentPaidAmount + cashPaidAmount).toFixed(2),
        );
        let targetInvoiceAmount: number | null = null;
        if (markCashPaymentAsPartial) {
          if (partialTotalAmount < totalPaidAfterPayment) {
            redirect(`/orders/${orderId}?notice=partial_total_less_than_paid`);
          }
          targetInvoiceAmount = Number(partialTotalAmount.toFixed(2));
        } else if (cashPaidAmount > outstandingAmount) {
          targetInvoiceAmount = Number(
            Math.max(baseAmount, totalPaidAfterPayment).toFixed(2),
          );
        }

        if (targetInvoiceAmount !== null) {
          const { error: updatePayableError } = await supabaseServer.rpc(
            'rpc_update_supplier_payable',
            {
              p_org_id: orgId,
              p_payable_id: payableId,
              p_invoice_amount: targetInvoiceAmount,
              p_due_on: (payableRowAny?.due_on as string | null) ?? undefined,
              p_invoice_reference:
                (payableRowAny?.invoice_reference as string | null) ?? null,
              p_invoice_photo_url:
                (payableRowAny?.invoice_photo_url as string | null) ??
                undefined,
              p_invoice_note:
                (payableRowAny?.invoice_note as string | null) ?? undefined,
              p_selected_payment_method: 'cash',
            },
          );
          if (updatePayableError) {
            redirect(
              `/orders/${orderId}?notice=${normalizeNotice(updatePayableError.message)}`,
            );
          }
        }
        const { error: ensurePayableError } = await supabaseServer.rpc(
          'rpc_update_supplier_payable',
          {
            p_org_id: orgId,
            p_payable_id: payableId,
            p_invoice_amount:
              targetInvoiceAmount ??
              Number(
                payableRowAny?.invoice_amount ??
                  payableRowAny?.estimated_amount ??
                  0,
              ),
            p_due_on: (payableRowAny?.due_on as string | null) ?? undefined,
            p_invoice_reference:
              (payableRowAny?.invoice_reference as string | null) ?? null,
            p_invoice_photo_url:
              (payableRowAny?.invoice_photo_url as string | null) ?? undefined,
            p_invoice_note:
              (payableRowAny?.invoice_note as string | null) ?? undefined,
            p_selected_payment_method: 'cash',
          },
        );
        if (ensurePayableError) {
          redirect(
            `/orders/${orderId}?notice=${normalizeNotice(ensurePayableError.message)}`,
          );
        }
        const amountToPay = Number(cashPaidAmount ?? 0);
        if (amountToPay > 0 && Number.isFinite(amountToPay)) {
          const { error: registerPaymentError } = await supabaseServer.rpc(
            'rpc_register_supplier_payment',
            {
              p_org_id: orgId,
              p_payable_id: payableId,
              p_amount: amountToPay,
              p_payment_method: 'cash',
              p_paid_at: paidAt,
              p_note: markCashPaymentAsPartial
                ? `Pago parcial en efectivo al controlar pedido ${orderId}. Monto pagado: ${cashPaidAmount.toFixed(2)}. Total remito/factura: ${partialTotalAmount.toFixed(2)}.`
                : `Pago en efectivo al controlar pedido ${orderId}. Monto exacto: ${cashPaidAmount.toFixed(2)}.`,
            },
          );
          if (registerPaymentError) {
            redirect(
              `/orders/${orderId}?notice=${normalizeNotice(registerPaymentError.message)}`,
            );
          }
        }
      }
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath('/payments');
    revalidatePath('/settings/audit-log');

    if (markCashPaymentAsDone) {
      redirect(`/orders/${orderId}?notice=received_and_cash_paid`);
    }
    redirect(`/orders/${orderId}?notice=received`);
  };

  const updatePayableFromOrder = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const payableId = String(formData.get('payable_id') ?? '').trim();
    const invoiceAmountRaw = String(
      formData.get('invoice_amount') ?? '',
    ).trim();
    const dueOnRaw = String(formData.get('due_on') ?? '').trim();
    const invoiceReference = String(
      formData.get('invoice_reference') ?? '',
    ).trim();
    const invoicePhotoUrl = String(
      formData.get('invoice_photo_url') ?? '',
    ).trim();
    const invoicePhotoPath = String(
      formData.get('invoice_photo_path') ?? '',
    ).trim();
    const invoicePhotoDataUrl = String(
      formData.get('invoice_photo_data_url') ?? '',
    ).trim();
    const invoiceNote = String(formData.get('invoice_note') ?? '').trim();
    const selectedMethod = String(
      formData.get('selected_payment_method') ?? '',
    ).trim();
    const payableBranchId = String(
      formData.get('payable_branch_id') ?? '',
    ).trim();

    const invoiceAmount =
      invoiceAmountRaw === '' ? null : Number(invoiceAmountRaw);
    if (
      invoiceAmount !== null &&
      (Number.isNaN(invoiceAmount) || invoiceAmount < 0)
    ) {
      redirect(`/orders/${orderId}?notice=invalid_invoice_amount`);
    }

    let uploadedInvoicePhotoPath = invoicePhotoPath || undefined;
    if (invoicePhotoDataUrl) {
      const matches = /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/.exec(
        invoicePhotoDataUrl,
      );

      if (!matches) {
        redirect(`/orders/${orderId}?notice=invalid_image`);
      }

      const contentType = matches?.[1] || 'image/jpeg';
      const base64Payload = matches?.[2] || '';
      const buffer = Buffer.from(base64Payload, 'base64');

      if (buffer.length > 450 * 1024) {
        redirect(`/orders/${orderId}?notice=image_too_large`);
      }

      const imagePath = `${orgId}/${payableBranchId || order.branch_id}/${payableId}/invoice.jpg`;
      const { error: uploadError } = await supabaseServer.storage
        .from('supplier-invoices')
        .upload(imagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        redirect(
          `/orders/${orderId}?notice=${normalizeNotice(uploadError.message)}`,
        );
      }

      uploadedInvoicePhotoPath = imagePath;
    }

    const { error } = await supabaseServer.rpc('rpc_update_supplier_payable', {
      p_org_id: orgId,
      p_payable_id: payableId,
      p_invoice_amount: invoiceAmount ?? undefined,
      p_due_on: dueOnRaw || undefined,
      p_invoice_reference: invoiceReference || null,
      p_invoice_photo_url:
        uploadedInvoicePhotoPath || invoicePhotoUrl || undefined,
      p_invoice_note: invoiceNote || undefined,
      p_selected_payment_method:
        selectedMethod === 'cash' || selectedMethod === 'transfer'
          ? selectedMethod
          : undefined,
    });

    if (error) {
      redirect(`/orders/${orderId}?notice=${normalizeNotice(error.message)}`);
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath('/payments');
    revalidatePath('/settings/audit-log');
    redirect(`/orders/${orderId}?notice=invoice_saved`);
  };

  const setExpectedReceiveOn = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const expectedReceiveOnRaw = String(
      formData.get('expected_receive_on') ?? '',
    ).trim();
    const expectedReceiveOn = expectedReceiveOnRaw || null;

    await supabaseServer.rpc('rpc_set_supplier_order_expected_receive_on', {
      p_org_id: orgId,
      p_order_id: orderId,
      p_expected_receive_on: expectedReceiveOn as unknown as string,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders/calendar');
    redirect(`/orders/${orderId}?notice=expected_receive_updated`);
  };

  const canEdit = order.status === 'draft';
  const canReceive = order.status === 'sent' || order.status === 'received';
  const canSetManualStatus =
    order.status === 'draft' || order.status === 'sent';
  const canSetExpectedReceive =
    order.status === 'sent' || order.status === 'received';
  const totalEstimatedAmount = items.reduce((total, item) => {
    const qty = Number(item.ordered_qty ?? 0);
    const unitCost = Number(item.unit_cost ?? 0);
    const lineTotal = qty * unitCost;
    if (!Number.isFinite(lineTotal)) return total;
    return total + lineTotal;
  }, 0);
  const controlledByLabel =
    order.controlled_by_name || order.controlled_by_user_name;
  const receiveDefaultAt = new Date().toISOString().slice(0, 16);
  const receiveAtInitialValue =
    typeof resolvedSearchParams?.received_at === 'string' &&
    resolvedSearchParams.received_at
      ? resolvedSearchParams.received_at
      : receiveDefaultAt;
  const controlledByInitialValue =
    typeof resolvedSearchParams?.controlled_by_name === 'string'
      ? resolvedSearchParams.controlled_by_name
      : '';
  const initialMarkCashPayment =
    resolvedSearchParams?.mark_cash_payment === '1';
  const initialCashPaidAmount =
    typeof resolvedSearchParams?.cash_paid_amount === 'string'
      ? resolvedSearchParams.cash_paid_amount
      : '';
  const initialIsPartialPayment =
    resolvedSearchParams?.cash_partial_payment === '1';
  const initialPartialTotalAmount =
    typeof resolvedSearchParams?.cash_partial_total_amount === 'string'
      ? resolvedSearchParams.cash_partial_total_amount
      : '';
  const userLabel = session.userId;
  const isFinalized = order.status === 'reconciled';
  const isControlledByMissingNotice =
    resolvedSearchParams?.notice === 'controlled_required';
  const notice =
    resolvedSearchParams?.notice === 'sent'
      ? { tone: 'success', message: 'Pedido enviado.' }
      : resolvedSearchParams?.notice === 'status'
        ? { tone: 'success', message: 'Estado actualizado.' }
        : resolvedSearchParams?.notice === 'received'
          ? { tone: 'success', message: 'Recepción/control confirmado.' }
          : resolvedSearchParams?.notice === 'controlled_required'
            ? {
                tone: 'error',
                message: 'Falta completar “Controlado por (nombre)”.',
              }
            : resolvedSearchParams?.notice === 'cash_amount_required'
              ? {
                  tone: 'error',
                  message:
                    'Para registrar pago en efectivo debés ingresar el monto exacto pagado.',
                }
              : resolvedSearchParams?.notice === 'partial_total_required'
                ? {
                    tone: 'error',
                    message:
                      'Para pago parcial debés indicar el monto total del remito/factura.',
                  }
                : resolvedSearchParams?.notice ===
                    'partial_total_less_than_paid'
                  ? {
                      tone: 'error',
                      message:
                        'El monto total informado no puede ser menor que lo ya pagado más el pago actual.',
                    }
                  : resolvedSearchParams?.notice === 'cash_payment_not_allowed'
                    ? {
                        tone: 'error',
                        message:
                          'Este proveedor no está configurado para pago en efectivo.',
                      }
                    : resolvedSearchParams?.notice === 'invalid_invoice_amount'
                      ? {
                          tone: 'error',
                          message:
                            'El monto de factura/remito debe ser mayor o igual a 0.',
                        }
                      : resolvedSearchParams?.notice === 'invalid_image'
                        ? {
                            tone: 'error',
                            message:
                              'La imagen de factura/remito no es válida.',
                          }
                        : resolvedSearchParams?.notice === 'image_too_large'
                          ? {
                              tone: 'error',
                              message:
                                'La imagen comprimida supera el límite permitido (450KB).',
                            }
                          : resolvedSearchParams?.notice ===
                              'expected_receive_updated'
                            ? {
                                tone: 'success',
                                message: 'Fecha estimada actualizada.',
                              }
                            : resolvedSearchParams?.notice ===
                                'draft_items_saved'
                              ? {
                                  tone: 'success',
                                  message: 'Items del borrador guardados.',
                                }
                              : resolvedSearchParams?.notice ===
                                  'received_and_cash_paid'
                                ? {
                                    tone: 'success',
                                    message:
                                      'Recepción/control confirmado y pago en efectivo registrado.',
                                  }
                                : resolvedSearchParams?.notice ===
                                    'invoice_saved'
                                  ? {
                                      tone: 'success',
                                      message:
                                        'Datos de factura/remito guardados.',
                                    }
                                  : resolvedSearchParams?.notice
                                    ? {
                                        tone: 'error',
                                        message: `Error: ${resolvedSearchParams.notice.replaceAll('_', ' ')}`,
                                      }
                                    : null;

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <p className="text-xs text-zinc-500">
            <Link href="/orders" className="hover:underline">
              Pedidos
            </Link>{' '}
            / {order.order_id}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pedido {order.order_id}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {order.supplier_name} · {order.branch_name} · Estado:{' '}
            {formatStatusLabel(order.status)}
          </p>
        </div>

        {notice ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-zinc-600">
              Creado: {formatDateTime(order.created_at)}
              {' · '}
              Enviado: {formatDateTime(order.sent_at)}
              {' · '}
              Controlado: {formatDateTime(order.reconciled_at)}
              {' · '}Estimado total: {formatCurrency(totalEstimatedAmount)}
              {' · '}
              <span className="text-xs text-zinc-500" title={ESTIMATE_NOTE}>
                Aproximado (real en remito/factura)
              </span>
              {isCashPaid
                ? ` · Pagado en efectivo: ${formatCurrency(cashPaidAmount)}${payableStatus?.paid_at ? ` (${formatDateTime(payableStatus.paid_at)})` : ''}`
                : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {canSetManualStatus ? (
                <form action={setOrderStatus} className="flex flex-wrap gap-2">
                  <label className="text-xs font-semibold text-zinc-600">
                    Estado
                    <select
                      name="next_status"
                      defaultValue={order.status}
                      className="ml-2 rounded border border-zinc-200 px-2 py-1 text-xs"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                  >
                    Actualizar estado
                  </button>
                </form>
              ) : null}
              {canEdit && (
                <form action={sendOrder}>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Enviar pedido
                  </button>
                </form>
              )}
            </div>
          </div>
          {controlledByLabel ? (
            <div className="mt-2 text-sm text-zinc-500">
              Controlado por: {controlledByLabel}
              {order.controlled_by_user_name && order.controlled_by_name
                ? ` (Usuario: ${order.controlled_by_user_name})`
                : null}
            </div>
          ) : null}
          {!isFinalized ? (
            <div className="mt-2 text-xs text-zinc-500">
              La recepcion y el control se confirman desde “Recibir y controlar
              mercadería”.
            </div>
          ) : null}
          {canSetExpectedReceive ? (
            <form
              action={setExpectedReceiveOn}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <label className="text-xs font-semibold text-zinc-600">
                Fecha estimada de recepción
                <input
                  type="date"
                  name="expected_receive_on"
                  defaultValue={formatDateInput(order.expected_receive_on)}
                  className="ml-2 rounded border border-zinc-200 px-2 py-1 text-xs"
                />
              </label>
              <button
                type="submit"
                className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
              >
                Guardar fecha
              </button>
            </form>
          ) : null}
          {order.notes ? (
            <div className="mt-3 text-sm text-zinc-500">
              Notas: {order.notes}
            </div>
          ) : null}
        </section>

        {canEdit ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Armar pedido
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Ajusta cantidades sobre la lista completa de artículos sugeridos y
              guarda para reemplazar los ítems del borrador.
            </p>
            <form action={saveDraftItems} className="mt-4 grid gap-4">
              <OrderSuggestionsClient
                key={`${order.supplier_id}-${order.branch_id}`}
                suggestions={mergedSuggestions}
                priceByProduct={priceByProductRecord}
                avgMode="cycle"
                safeMarginPct={0}
                initialQuantities={existingItemQuantities}
                showingSummary={`${order.supplier_name ?? 'Proveedor'} · ${order.branch_name ?? 'Sucursal'}`}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  name="draft_action"
                  value="draft"
                  className="rounded border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                >
                  Guardar borrador
                </button>
                <button
                  type="submit"
                  name="draft_action"
                  value="sent"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Guardar y enviar
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Items</h2>
          {items.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">
              No hay items en este pedido.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.order_item_id}
                  className="rounded border border-zinc-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Ordenado: {item.ordered_qty ?? 0} · Recibido:{' '}
                        {item.received_qty ?? 0}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Costo estimado unitario:{' '}
                        {formatCurrency(Number(item.unit_cost ?? 0))}
                        {' · '}Subtotal estimado:{' '}
                        {formatCurrency(
                          Number(item.ordered_qty ?? 0) *
                            Number(item.unit_cost ?? 0),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {canReceive ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Recibir y controlar mercadería
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Monto estimado total del pedido:{' '}
              <span className="font-semibold text-zinc-700">
                {formatCurrency(totalEstimatedAmount)}
              </span>
              <span
                className="ml-2 text-xs text-zinc-500"
                title={ESTIMATE_NOTE}
              >
                (Aproximado. El real está en remito/factura)
              </span>
            </p>
            {payableStatus ? (
              <details className="mt-4 rounded border border-zinc-200 p-3">
                <summary className="cursor-pointer text-xs font-semibold tracking-wide text-zinc-700 uppercase">
                  Registrar factura/remito (opcional)
                </summary>
                <form
                  action={updatePayableFromOrder}
                  className="mt-3 grid gap-2"
                >
                  <input
                    type="hidden"
                    name="payable_id"
                    value={payableStatus.id}
                  />
                  <input
                    type="hidden"
                    name="payable_branch_id"
                    value={payableStatus.branch_id}
                  />
                  <label className="text-xs text-zinc-600">
                    Numero de factura/remito
                    <input
                      name="invoice_reference"
                      type="text"
                      defaultValue={payableStatus.invoice_reference ?? ''}
                      placeholder="Ej: A-0003-00124567 o REM-4589"
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Monto exacto factura
                    <input
                      name="invoice_amount"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={payableStatus.invoice_amount ?? ''}
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Fecha indicada del remito/factura
                    <input
                      name="due_on"
                      type="date"
                      defaultValue={payableStatus.due_on ?? ''}
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Metodo seleccionado
                    <select
                      name="selected_payment_method"
                      defaultValue={payableStatus.selected_payment_method ?? ''}
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    >
                      <option value="">Sin definir</option>
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600">
                    URL foto factura/remito (opcional)
                    <input
                      name="invoice_photo_url"
                      defaultValue={payableStatus.invoice_photo_url ?? ''}
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      placeholder="https://..."
                    />
                  </label>
                  <InvoiceImageField
                    inputName="invoice_photo_data_url"
                    existingPath={payableStatus.invoice_photo_url}
                    defaultPreviewUrl={signedInvoiceUrl}
                  />
                  <label className="text-xs text-zinc-600">
                    Observaciones
                    <textarea
                      name="invoice_note"
                      rows={2}
                      defaultValue={payableStatus.invoice_note ?? ''}
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Guardar datos de factura/remito
                  </button>
                </form>
              </details>
            ) : null}
            <form action={receiveOrder} className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Fecha y hora de recepción
                  <input
                    name="received_at"
                    type="datetime-local"
                    defaultValue={receiveAtInitialValue}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Controlado por (nombre)
                  <input
                    name="controlled_by_name"
                    defaultValue={controlledByInitialValue}
                    className={`mt-1 w-full rounded border px-3 py-2 text-sm ${
                      isControlledByMissingNotice
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-zinc-200'
                    }`}
                    placeholder="Ej: Juan Perez"
                  />
                  {isControlledByMissingNotice ? (
                    <span className="mt-1 block text-xs text-rose-600">
                      Este campo es obligatorio para confirmar control.
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-zinc-400">
                    Autofirma: {userLabel}
                  </span>
                </label>
              </div>
              {order.status === 'received' ? (
                <p className="text-xs text-zinc-500">
                  Pedido legado en estado <code>received</code>: esta acción
                  solo registra el control final (fecha/firma) y lo cierra como
                  recibido y controlado.
                </p>
              ) : null}
              {isCashSupplier ? (
                <p className="text-xs text-zinc-500">
                  Este proveedor opera en efectivo. Si ya pagaste al momento de
                  la entrega, usa el botón “Pago en efectivo realizado”.
                </p>
              ) : null}
              {items.map((item) => (
                <div
                  key={item.order_item_id}
                  className="grid gap-2 md:grid-cols-3"
                >
                  <div className="text-sm text-zinc-700">
                    {item.product_name}
                  </div>
                  <input
                    name={`received_${item.order_item_id}`}
                    type="number"
                    step="0.01"
                    defaultValue={
                      order.status === 'received'
                        ? (item.received_qty ?? item.ordered_qty ?? 0)
                        : (item.ordered_qty ?? 0)
                    }
                    disabled={order.status === 'received'}
                    className="rounded border border-zinc-200 px-2 py-1 text-sm"
                  />
                  <div className="text-xs text-zinc-500">
                    Ordenado: {item.ordered_qty ?? 0}
                  </div>
                </div>
              ))}
              <ReceiveActionsRow
                isCashSupplier={isCashSupplier}
                isPayableAlreadyPaid={isPayableAlreadyPaid}
                currentPaidAmount={Number(payableStatus?.paid_amount ?? 0)}
                initialMarkCashPayment={initialMarkCashPayment}
                initialCashPaidAmount={initialCashPaidAmount}
                initialIsPartialPayment={initialIsPartialPayment}
                initialPartialTotalAmount={initialPartialTotalAmount}
                submitLabel={
                  order.status === 'received'
                    ? 'Confirmar control'
                    : 'Confirmar recepción'
                }
              />
            </form>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
