import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type TrackingRow = {
  order_code: string;
  store_name: string;
  branch_name: string;
  status: 'pending' | 'confirmed' | 'ready_for_pickup' | 'delivered' | 'cancelled';
  created_at: string;
  last_status_at: string;
  customer_name: string;
  timeline: Array<{
    old_status: string | null;
    new_status: string;
    changed_at: string;
    customer_note: string | null;
  }>;
  whatsapp_phone: string | null;
};

const statusLabel: Record<TrackingRow['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  ready_for_pickup: 'Guardado / listo para retirar',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

type TrackingPageProps = {
  params: Promise<{ trackingToken: string }>;
  searchParams: Promise<{ notice?: string }>;
};

const proofNoticeMessage: Record<string, string> = {
  proof_uploaded: 'Comprobante enviado. El equipo lo revisará pronto.',
  invalid_file: 'Archivo inválido. Usa JPG, PNG o WEBP.',
  file_too_large: 'El archivo supera 5MB.',
  tracking_not_found: 'No encontramos el pedido para este link.',
  upload_failed: 'No pudimos subir el comprobante. Reintenta.',
};

export default async function OnlineOrderTrackingPage({
  params,
  searchParams,
}: TrackingPageProps) {
  const { trackingToken } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createServerSupabaseClient();
  const supabaseRpc = supabase as unknown as {
    rpc: (
      fnName: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await supabaseRpc.rpc('rpc_get_online_order_tracking', {
    p_tracking_token: trackingToken,
  });

  if (error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          No pudimos consultar el seguimiento. Intenta nuevamente más tarde.
        </div>
      </main>
    );
  }

  const rows = Array.isArray(data) ? (data as TrackingRow[]) : [];
  const row = rows[0] ?? null;
  const notice = resolvedSearchParams.notice ?? '';

  const uploadProof = async (formData: FormData) => {
    'use server';

    const token = String(formData.get('tracking_token') ?? '').trim();
    const fileValue = formData.get('payment_proof');
    const file = fileValue instanceof File ? fileValue : null;
    const allowedContentTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]);

    if (!token || !file || !allowedContentTypes.has(file.type)) {
      redirect(`/o/${token || trackingToken}?notice=invalid_file`);
    }
    if (file.size > 5 * 1024 * 1024) {
      redirect(`/o/${token}?notice=file_too_large`);
    }

    const admin = createAdminSupabaseClient();
    const { data: tokenRaw } = await admin
      .from('online_order_tracking_tokens' as never)
      .select('org_id, online_order_id, expires_at')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();
    const tokenRow = tokenRaw as {
      org_id: string;
      online_order_id: string;
      expires_at: string | null;
    } | null;

    const isExpired =
      tokenRow?.expires_at != null &&
      new Date(tokenRow.expires_at).getTime() <= Date.now();

    if (!tokenRow || isExpired) {
      redirect(`/o/${token}?notice=tracking_not_found`);
    }

    const extension =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storagePath = `${tokenRow.org_id}/${tokenRow.online_order_id}/${Date.now()}-${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from('online-order-proofs')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      redirect(`/o/${token}?notice=upload_failed`);
    }

    const { error: insertError } = await admin
      .from('online_order_payment_proofs' as never)
      .insert(
        {
          org_id: tokenRow.org_id,
          online_order_id: tokenRow.online_order_id,
          storage_path: storagePath,
        } as never,
      );

    if (insertError) {
      redirect(`/o/${token}?notice=upload_failed`);
    }

    revalidatePath(`/o/${token}`);
    revalidatePath('/online-orders');
    redirect(`/o/${token}?notice=proof_uploaded`);
  };

  if (!row) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          Link inválido o vencido.
        </div>
      </main>
    );
  }

  const timeline = Array.isArray(row.timeline) ? row.timeline : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 text-slate-900">
      <section className="mx-auto w-full max-w-2xl px-6 pb-14 pt-10">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
            Seguimiento pedido
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{row.order_code}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {row.store_name} - {row.branch_name}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Estado actual: {statusLabel[row.status]}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
            Historial
          </h2>
          <div className="mt-3 space-y-2">
            {timeline.map((item, index) => (
              <div
                key={`${item.new_status}-${item.changed_at}-${index}`}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <p className="text-sm font-medium text-slate-800">
                  {statusLabel[item.new_status as TrackingRow['status']] ?? item.new_status}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.changed_at).toLocaleString('es-AR')}
                </p>
                {item.customer_note ? (
                  <p className="mt-1 text-xs text-slate-600">{item.customer_note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
            Comprobante de pago
          </h2>
          <p className="mt-2 text-xs text-slate-600">
            Si pagaste por transferencia o QR, sube aquí el comprobante para
            acelerar la preparación.
          </p>
          {notice && proofNoticeMessage[notice] ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {proofNoticeMessage[notice]}
            </p>
          ) : null}
          <form action={uploadProof} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="tracking_token" value={trackingToken} />
            <div className="min-w-64 flex-1">
              <input
                type="file"
                name="payment_proof"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-700"
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900"
            >
              Adjuntar comprobante
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/landing"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800"
          >
            Volver
          </Link>
          {row.whatsapp_phone ? (
            <a
              href={`https://wa.me/${row.whatsapp_phone.replace(/[^\\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800"
            >
              Contactar por WhatsApp
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
