import Link from 'next/link';

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
};

export default async function OnlineOrderTrackingPage({ params }: TrackingPageProps) {
  const { trackingToken } = await params;
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
