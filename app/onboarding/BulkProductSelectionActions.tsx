'use client';

const CHECKBOX_SELECTOR = 'input[data-bulk-product-checkbox="true"]';

const setAllVisible = (checked: boolean) => {
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll<HTMLInputElement>(CHECKBOX_SELECTOR);
  nodes.forEach((node) => {
    node.checked = checked;
  });
};

export default function BulkProductSelectionActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setAllVisible(true)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Seleccionar visibles
      </button>
      <button
        type="button"
        onClick={() => setAllVisible(false)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Limpiar visibles
      </button>
    </div>
  );
}
