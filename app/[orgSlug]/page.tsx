import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

type StorefrontBranchRow = {
  org_name: string;
  org_slug: string;
  branch_name: string;
  branch_slug: string;
  is_active: boolean;
  is_enabled: boolean;
  whatsapp_phone: string | null;
  pickup_instructions: string | null;
};

type OrgStorefrontPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function OrgStorefrontPage({
  params,
}: OrgStorefrontPageProps) {
  const { orgSlug } = await params;
  const supabase = await createServerSupabaseClient();
  const supabaseRpc = supabase as unknown as {
    rpc: (
      fnName: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await supabaseRpc.rpc(
    'rpc_get_public_storefront_branches',
    {
      p_org_slug: orgSlug,
    },
  );

  if (error) {
    notFound();
  }

  const branches = ((data ?? []) as StorefrontBranchRow[]).filter(
    (row) => row.branch_slug,
  );

  if (branches.length === 0) {
    notFound();
  }

  const orgName = branches[0].org_name;

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-50 text-slate-900">
      <section className="mx-auto w-full max-w-4xl px-6 pb-14 pt-10">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
            Tienda online
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{orgName}</h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            Selecciona una sucursal para ver catálogo, stock y generar tu
            pedido.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {branches.map((branch) => (
            <Link
              key={branch.branch_slug}
              href={`/${orgSlug}/${branch.branch_slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Sucursal
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {branch.branch_name}
              </h2>
              <p className="mt-3 text-sm font-medium text-orange-700">
                Ver catálogo
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
