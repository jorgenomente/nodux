import PageShell from '@/app/components/PageShell';

export default function DashboardPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Placeholder MVP. Contrato: v_dashboard_admin.
        </p>
      </div>
    </PageShell>
  );
}
