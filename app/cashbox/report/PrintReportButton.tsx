'use client';

export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
