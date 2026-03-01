'use client';

import { useMemo, useState } from 'react';

type Props = {
  headerInitial: string;
  footerInitial: string;
  fiscalInitial: string;
};

const IDEAL_MAX_LINE_CHARS = 32;

const getLineCounts = (value: string) => {
  const lines = value.split('\n');
  return lines.map((line) => line.length);
};

const LineCounter = ({ value }: { value: string }) => {
  const lineCounts = useMemo(() => getLineCounts(value), [value]);
  const longest = lineCounts.reduce((max, count) => Math.max(max, count), 0);

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs text-zinc-700">
      <p>
        Lineas: {lineCounts.length} · Mas larga: {longest} chars · Recomendado
        por linea: {IDEAL_MAX_LINE_CHARS}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {lineCounts.slice(0, 12).map((count, index) => (
          <span
            key={`${index}-${count}`}
            className={`rounded px-1.5 py-0.5 ${
              count > IDEAL_MAX_LINE_CHARS
                ? 'bg-amber-100 text-amber-800'
                : 'bg-zinc-200 text-zinc-700'
            }`}
          >
            L{index + 1}: {count}
          </span>
        ))}
        {lineCounts.length > 12 ? (
          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-zinc-700">
            +{lineCounts.length - 12} lineas
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default function TicketTemplateEditors({
  headerInitial,
  footerInitial,
  fiscalInitial,
}: Props) {
  const [headerText, setHeaderText] = useState(headerInitial);
  const [footerText, setFooterText] = useState(footerInitial);
  const [fiscalText, setFiscalText] = useState(fiscalInitial);

  return (
    <>
      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Ticket no fiscal</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Se usa en POS y en ventas al hacer clic en Imprimir ticket.
        </p>
        <div className="mt-3 grid gap-3">
          <p className="text-xs font-semibold text-zinc-700">
            Contador de caracteres por linea incluido en cada editor.
          </p>
          <div className="grid gap-1">
            <label className="text-xs font-semibold text-zinc-600">
              Encabezado (arriba del ticket)
            </label>
            <textarea
              name="ticket_header_text"
              value={headerText}
              onChange={(event) => setHeaderText(event.target.value)}
              rows={4}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Gracias por tu compra\nWhatsApp: +54 9 ..."
            />
            <LineCounter value={headerText} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-semibold text-zinc-600">
              Pie (abajo del total)
            </label>
            <textarea
              name="ticket_footer_text"
              value={footerText}
              onChange={(event) => setFooterText(event.target.value)}
              rows={4}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Cambios dentro de 7 dias\nIG: @tu_tienda"
            />
            <LineCounter value={footerText} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Comprobante fiscal de prueba
        </h2>
        <p className="mt-1 text-xs text-zinc-600">
          Texto de referencia para el flujo de Cobrar y facturar mientras no
          este integrada la facturacion fiscal real.
        </p>
        <div className="mt-3 grid gap-1">
          <label className="text-xs font-semibold text-zinc-600">
            Leyenda fiscal de prueba
          </label>
          <textarea
            name="fiscal_ticket_note_text"
            value={fiscalText}
            onChange={(event) => setFiscalText(event.target.value)}
            rows={4}
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Comprobante fiscal de prueba.\nNo valido ante ARCA."
          />
          <LineCounter value={fiscalText} />
        </div>
      </div>
    </>
  );
}
