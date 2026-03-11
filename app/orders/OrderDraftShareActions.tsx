'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

type ColumnKey =
  | 'product'
  | 'supplierProductName'
  | 'qty'
  | 'stock'
  | 'safety'
  | 'avg'
  | 'suggested'
  | 'unitPrice'
  | 'unitCost'
  | 'subtotal';

type DraftItem = {
  productId: string;
  productName: string;
  supplierProductName: string;
  qty: number;
  stockOnHand: number;
  safetyStock: number;
  averageSales: number;
  suggestedQty: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
};

type Props = {
  supplierName: string;
  branchName: string;
  averageColumnLabel: string;
  items: DraftItem[];
  onSupplierProductNameChange: (productId: string, value: string) => void;
  submitActions?: ReactNode;
};

const defaultColumns: Record<ColumnKey, boolean> = {
  product: true,
  supplierProductName: false,
  qty: true,
  stock: false,
  safety: false,
  avg: false,
  suggested: false,
  unitPrice: false,
  unitCost: false,
  subtotal: false,
};

const columnLabels: Record<ColumnKey, string> = {
  product: 'Producto',
  supplierProductName: 'Nombre en proveedor',
  qty: 'Cantidad a pedir',
  stock: 'Stock actual',
  safety: 'Stock de resguardo',
  avg: 'Promedio de ventas',
  suggested: 'Pedido sugerido',
  unitPrice: 'Precio venta',
  unitCost: 'Costo estimado',
  subtotal: 'Subtotal estimado',
};

const formatNumber = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '') : '0';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

export default function OrderDraftShareActions({
  supplierName,
  branchName,
  averageColumnLabel,
  items,
  onSupplierProductNameChange,
  submitActions,
}: Props) {
  const [open, setOpen] = useState(false);
  const [preferredAction, setPreferredAction] = useState<'print' | 'whatsapp'>(
    'print',
  );
  const [selectedColumns, setSelectedColumns] = useState(defaultColumns);

  const selectedItems = useMemo(
    () => items.filter((item) => Number.isFinite(item.qty) && item.qty > 0),
    [items],
  );
  const activeColumns = useMemo(
    () =>
      (Object.entries(selectedColumns) as Array<[ColumnKey, boolean]>).filter(
        ([, isSelected]) => isSelected,
      ),
    [selectedColumns],
  );
  const hasSelectedColumns = activeColumns.length > 0;

  const openModal = (action: 'print' | 'whatsapp') => {
    setPreferredAction(action);
    setOpen(true);
  };

  const renderCell = (item: DraftItem, column: ColumnKey) => {
    switch (column) {
      case 'product':
        return item.productName;
      case 'supplierProductName':
        return item.supplierProductName || '—';
      case 'qty':
        return formatNumber(item.qty);
      case 'stock':
        return formatNumber(item.stockOnHand);
      case 'safety':
        return formatNumber(item.safetyStock);
      case 'avg':
        return formatNumber(item.averageSales);
      case 'suggested':
        return formatNumber(item.suggestedQty);
      case 'unitPrice':
        return formatCurrency(item.unitPrice);
      case 'unitCost':
        return formatCurrency(item.unitCost);
      case 'subtotal':
        return formatCurrency(item.subtotal);
      default:
        return '';
    }
  };

  const buildPrintHtml = () => {
    const generatedAt = new Date().toLocaleString('es-AR');
    const tableHeaders = activeColumns
      .map(([column]) => {
        const label =
          column === 'avg' ? averageColumnLabel : columnLabels[column];
        return `<th>${label}</th>`;
      })
      .join('');
    const tableRows = selectedItems
      .map(
        (item) =>
          `<tr>${activeColumns
            .map(([column]) => `<td>${renderCell(item, column)}</td>`)
            .join('')}</tr>`,
      )
      .join('');

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Pedido a proveedor</title>
    <style>
      body {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #18181b;
        margin: 32px;
        background: #fafaf9;
      }
      .sheet {
        background: #ffffff;
        border: 1px solid #e4e4e7;
        border-radius: 20px;
        padding: 28px;
      }
      .eyebrow {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #71717a;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 28px;
        line-height: 1.1;
      }
      .meta {
        margin: 0 0 24px;
        color: #52525b;
        font-size: 13px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 16px;
      }
      thead th {
        text-align: left;
        background: #f4f4f5;
        color: #3f3f46;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 12px 14px;
      }
      tbody td {
        border-top: 1px solid #e4e4e7;
        padding: 12px 14px;
        font-size: 14px;
        vertical-align: top;
      }
      .footer {
        margin-top: 24px;
        font-size: 12px;
        color: #71717a;
      }
      @media print {
        body {
          margin: 0;
          background: #ffffff;
        }
        .sheet {
          border: 0;
          border-radius: 0;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="eyebrow">Pedido a proveedor</div>
      <h1>${supplierName}</h1>
      <p class="meta">Sucursal: ${branchName} · Generado: ${generatedAt}</p>
      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <p class="footer">Documento operativo generado desde NODUX.</p>
    </div>
  </body>
</html>`;
  };

  const handlePrint = () => {
    if (selectedItems.length === 0 || !hasSelectedColumns) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 300);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      frameWindow.focus();
      frameWindow.print();
      if ('onafterprint' in frameWindow) {
        frameWindow.onafterprint = cleanup;
      } else {
        cleanup();
      }
    };

    iframe.srcdoc = buildPrintHtml();
    document.body.appendChild(iframe);
  };

  const handleWhatsApp = () => {
    if (selectedItems.length === 0 || !hasSelectedColumns) return;
    const lines = selectedItems.map((item) => {
      const resolvedName = item.supplierProductName.trim() || item.productName;
      return `${formatNumber(item.qty)} | ${resolvedName}`;
    });
    const message = [
      `Pedido para ${supplierName}`,
      `Sucursal: ${branchName}`,
      '',
      'Cantidad | Articulo',
      ...lines,
    ].join('\n');
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const executePreferredAction = () => {
    if (preferredAction === 'print') {
      handlePrint();
      return;
    }
    handleWhatsApp();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="text-xs text-zinc-500">
          Imprime o comparte el pedido usando solo las columnas necesarias.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openModal('print')}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => openModal('whatsapp')}
            className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
          >
            Enviar por WhatsApp
          </button>
          {submitActions}
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                  Preparar pedido
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
                  {supplierName}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Define qué columnas quieres incluir y revisa cómo entiende el
                  proveedor cada artículo antes de imprimir o compartir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[280px,1fr]">
              <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">
                  Columnas del documento
                </p>
                <div className="mt-4 space-y-3">
                  {(Object.keys(columnLabels) as ColumnKey[]).map((column) => {
                    const checked = selectedColumns[column];
                    return (
                      <label
                        key={column}
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                      >
                        <span>
                          {column === 'avg'
                            ? averageColumnLabel
                            : columnLabels[column]}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSelectedColumns((prev) => ({
                              ...prev,
                              [column]: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-zinc-500">
                  `Cantidad a pedir` viene preseleccionada por defecto. Debes
                  dejar al menos una columna marcada para imprimir o compartir.
                </p>
                {!hasSelectedColumns ? (
                  <p className="mt-2 text-xs font-medium text-rose-700">
                    Selecciona al menos una columna para continuar.
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">
                      Artículos del pedido
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Aquí puedes ajustar el nombre por el que el proveedor
                      identifica cada artículo. Si lo completas, se usará para
                      WhatsApp y también quedará listo para el guardado del
                      pedido.
                    </p>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {selectedItems.length} artículo
                    {selectedItems.length === 1 ? '' : 's'}
                  </div>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Debes cargar al menos una `Cantidad a pedir` mayor a 0 para
                    imprimir o compartir el pedido.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {selectedItems.map((item) => (
                      <div
                        key={item.productId}
                        className="grid gap-3 rounded-2xl border border-zinc-200 p-4 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),120px]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Cantidad a pedir: {formatNumber(item.qty)}
                          </p>
                        </div>
                        <label className="text-sm text-zinc-600">
                          Nombre de articulo en el proveedor
                          <input
                            type="text"
                            value={item.supplierProductName}
                            onChange={(event) =>
                              onSupplierProductNameChange(
                                item.productId,
                                event.target.value,
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            placeholder="Ej: Cafe torrado 500g"
                          />
                        </label>
                        <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                          WhatsApp usará este nombre si está completo; si no,
                          toma el nombre interno del producto.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={
                  preferredAction === 'print' ? handleWhatsApp : handlePrint
                }
                disabled={selectedItems.length === 0 || !hasSelectedColumns}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preferredAction === 'print' ? 'Abrir WhatsApp' : 'Guardar PDF'}
              </button>
              <button
                type="button"
                onClick={executePreferredAction}
                disabled={selectedItems.length === 0 || !hasSelectedColumns}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preferredAction === 'print' ? 'Guardar PDF' : 'Abrir WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
