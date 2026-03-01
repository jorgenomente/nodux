import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';
import TicketTemplateEditors from '@/app/settings/tickets/TicketTemplateEditors';

type SearchParams = {
  branch_id?: string;
  result?: string;
};

type BranchRow = {
  id: string;
  name: string;
  ticket_header_text: string | null;
  ticket_footer_text: string | null;
  fiscal_ticket_note_text: string | null;
};

const MAX_PRINTABLE_CHARS_PER_LINE = 32;

const getContext = async () => {
  const session = await getOrgAdminSession();
  if (!session?.orgId) return null;
  return {
    supabase: session.supabase,
    orgId: session.orgId,
  };
};

export default async function SettingsTicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getContext();
  if (!context) {
    redirect('/no-access');
  }

  const { data: branchesData } = await context.supabase
    .from('branches' as never)
    .select(
      'id, name, ticket_header_text, ticket_footer_text, fiscal_ticket_note_text',
    )
    .eq('org_id', context.orgId)
    .eq('is_active', true)
    .order('name');

  const branches = (branchesData ?? []) as BranchRow[];
  const selectedBranchIdRaw =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedBranchId = branches.some((branch) => branch.id === selectedBranchIdRaw)
    ? selectedBranchIdRaw
    : (branches[0]?.id ?? '');
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? null;

  const saveTicketTemplate = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getContext();
    if (!auth) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('branch_id') ?? '').trim();
    const ticketHeaderText = String(
      formData.get('ticket_header_text') ?? '',
    ).trim();
    const ticketFooterText = String(
      formData.get('ticket_footer_text') ?? '',
    ).trim();
    const fiscalTicketNoteText = String(
      formData.get('fiscal_ticket_note_text') ?? '',
    ).trim();

    if (!branchId) {
      redirect('/settings/tickets?result=invalid');
    }

    const { error } = await auth.supabase
      .from('branches' as never)
      .update({
        ticket_header_text: ticketHeaderText || null,
        ticket_footer_text: ticketFooterText || null,
        fiscal_ticket_note_text: fiscalTicketNoteText || null,
      } as never)
      .eq('org_id', auth.orgId)
      .eq('id', branchId);

    if (error) {
      redirect(
        `/settings/tickets?branch_id=${encodeURIComponent(branchId)}&result=error`,
      );
    }

    revalidatePath('/settings/tickets');
    revalidatePath('/settings/branches');
    revalidatePath('/pos');
    revalidatePath('/sales');
    revalidatePath('/sales/[saleId]/ticket');

    redirect(
      `/settings/tickets?branch_id=${encodeURIComponent(branchId)}&result=saved`,
    );
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Tickets e impresion
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Configura por sucursal lo que se imprime en el ticket no fiscal y en
            la leyenda del comprobante fiscal de prueba.
          </p>
        </header>

        {resolvedSearchParams.result === 'saved' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Plantilla guardada.
          </p>
        ) : null}
        {resolvedSearchParams.result === 'invalid' ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Selecciona una sucursal valida.
          </p>
        ) : null}
        {resolvedSearchParams.result === 'error' ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            No se pudo guardar la plantilla. Intenta nuevamente.
          </p>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            <div>
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="branch_id"
              >
                Sucursal
              </label>
              <form action="/settings/tickets" className="mt-1">
                <div className="flex gap-2">
                  <select
                    id="branch_id"
                    name="branch_id"
                    defaultValue={selectedBranchId}
                    className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  >
                    {branches.length === 0 ? (
                      <option value="">Sin sucursales activas</option>
                    ) : (
                      branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Ver
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Si cambias de sucursal, presiona <strong>Ver</strong> para cargar
                  su plantilla antes de editar o guardar.
                </p>
              </form>

              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                <p className="font-semibold text-zinc-900">Guia de formato 80mm</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    Escribe texto plano, una idea por linea (sin HTML ni markdown).
                  </li>
                  <li>
                    Recomendado: maximo {MAX_PRINTABLE_CHARS_PER_LINE} caracteres por linea para evitar cortes.
                  </li>
                  <li>Usa saltos de linea manuales para controlar el layout final.</li>
                  <li>
                    Si necesitas separadores, usa lineas tipo: ================================
                  </li>
                </ul>
              </div>
            </div>

            <div>
              {selectedBranch ? (
                <form action={saveTicketTemplate} className="grid gap-4">
                  <input type="hidden" name="branch_id" value={selectedBranch.id} />

                  <p className="text-xs font-semibold text-zinc-700">
                    Editando plantilla de: {selectedBranch.name}
                  </p>
                  <TicketTemplateEditors
                    headerInitial={selectedBranch.ticket_header_text ?? ''}
                    footerInitial={selectedBranch.ticket_footer_text ?? ''}
                    fiscalInitial={selectedBranch.fiscal_ticket_note_text ?? ''}
                  />

                  <button
                    type="submit"
                    className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Guardar plantilla de {selectedBranch.name}
                  </button>
                </form>
              ) : (
                <p className="rounded border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500">
                  No hay sucursales activas para configurar tickets.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
