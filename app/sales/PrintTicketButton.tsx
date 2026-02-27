'use client';

export default function PrintTicketButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
    >
      Imprimir ticket
    </button>
  );
}
