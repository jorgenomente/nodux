import PageShell from '@/app/components/PageShell';

export default function ClientsPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Clientes</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Placeholder MVP. Contrato: rpc_list_clients.
        </p>
      </div>
    </PageShell>
  );
}
