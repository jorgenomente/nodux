import PageShell from '@/app/components/PageShell';

export default function ProductsLookupPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Consulta de productos
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Placeholder MVP. Contrato: v_pos_product_catalog.
        </p>
      </div>
    </PageShell>
  );
}
