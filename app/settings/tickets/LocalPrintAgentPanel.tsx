'use client';

import { useState, useTransition } from 'react';

import {
  checkLocalPrintAgent,
  printViaLocalAgent,
  readLocalPrintSettings,
  writeLocalPrintSettings,
  type LocalPrintSettings,
} from '@/lib/printing/local-agent';
import type { PrintableTicketSnapshot } from '@/lib/printing/contracts';

const SAMPLE_TICKET: PrintableTicketSnapshot = {
  branchName: 'Sucursal demo',
  ticketHeaderText: 'Prueba de impresion directa',
  ticketFooterText: 'Si esto sale bien, el agente local responde.',
  fiscalTicketNoteText: 'Ticket no fiscal de prueba',
  printConfig: {
    paperWidthMm: 80,
  },
  createdAtIso: new Date('2026-03-10T14:30:00.000Z').toISOString(),
  items: [
    {
      name: 'Producto de prueba',
      quantity: 1,
      unit_price: 1000,
      line_total: 1000,
    },
  ],
  subtotal: 1000,
  discount: 0,
  total: 1000,
  isPaid: false,
  isInvoiced: false,
};

type AgentStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'checking'; message: string }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export default function LocalPrintAgentPanel() {
  const [settings, setSettings] = useState<LocalPrintSettings>(() =>
    readLocalPrintSettings(),
  );
  const [status, setStatus] = useState<AgentStatus>({
    kind: 'idle',
    message: 'La configuracion se guarda solo en esta caja/navegador.',
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateSettings = <K extends keyof LocalPrintSettings>(
    key: K,
    value: LocalPrintSettings[K],
  ) => {
    setSaveMessage(null);
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    writeLocalPrintSettings(settings);
    setSaveMessage('Configuracion local guardada en este navegador.');
  };

  const handleCheck = () => {
    setStatus({
      kind: 'checking',
      message: 'Verificando agente local...',
    });

    startTransition(async () => {
      try {
        const health = await checkLocalPrintAgent(settings.agentUrl);
        if (!health.ok) {
          setStatus({
            kind: 'error',
            message: 'El agente respondio, pero no reporto estado OK.',
          });
          return;
        }
        setStatus({
          kind: 'ok',
          message: `Agente disponible${health.agentVersion ? ` (v${health.agentVersion})` : ''}.`,
        });
      } catch {
        setStatus({
          kind: 'error',
          message:
            'No se pudo conectar al agente local. Si no esta instalado, NODUX seguira usando impresion por navegador.',
        });
      }
    });
  };

  const handleTestPrint = () => {
    setStatus({
      kind: 'checking',
      message: 'Enviando ticket de prueba al agente local...',
    });

    startTransition(async () => {
      try {
        await printViaLocalAgent(SAMPLE_TICKET, settings);
        setStatus({
          kind: 'ok',
          message:
            'Ticket de prueba enviado. Si no salio papel, revisa la configuracion del agente o la impresora.',
        });
      } catch {
        setStatus({
          kind: 'error',
          message:
            'No se pudo enviar la prueba al agente local. Revisa URL, disponibilidad del agente y la impresora configurada.',
        });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Bridge local ESC/POS
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">
          Impresion directa sin dialogo del navegador
        </h2>
        <p className="text-sm text-zinc-600">
          Este bloque configura la caja actual. No se guarda en la base de
          datos: queda solo en este navegador/equipo para el MVP. En esta
          version el agente nativo soporta Ethernet/TCP y cola Windows USB por
          nombre de impresora.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs font-semibold text-zinc-600">
            Modo de impresion
          </label>
          <select
            value={settings.mode}
            onChange={(event) =>
              updateSettings(
                'mode',
                event.target.value === 'local_agent'
                  ? 'local_agent'
                  : 'browser',
              )
            }
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="browser">Navegador (fallback)</option>
            <option value="local_agent">Directo por agente local</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-xs font-semibold text-zinc-600">
            URL del agente
          </label>
          <input
            type="text"
            value={settings.agentUrl}
            onChange={(event) => updateSettings('agentUrl', event.target.value)}
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
            placeholder="http://127.0.0.1:4891"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs font-semibold text-zinc-600">
            Printer target
          </label>
          <input
            type="text"
            value={settings.printerTarget}
            onChange={(event) =>
              updateSettings('printerTarget', event.target.value)
            }
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
            placeholder="cashier-front"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs font-semibold text-zinc-600">Copias</label>
          <input
            type="number"
            min={1}
            max={3}
            value={settings.copies}
            onChange={(event) =>
              updateSettings(
                'copies',
                Math.min(Math.max(Number(event.target.value) || 1, 1), 3),
              )
            }
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={settings.cut}
            onChange={(event) => updateSettings('cut', event.target.checked)}
          />
          Cortar ticket
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={settings.cashDrawer}
            onChange={(event) =>
              updateSettings('cashDrawer', event.target.checked)
            }
          />
          Abrir cajon
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="/downloads/nodux-print-agent-windows.zip"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Descargar kit Windows
        </a>
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Guardar config local
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isPending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Probar conexion
        </button>
        <button
          type="button"
          onClick={handleTestPrint}
          disabled={isPending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Imprimir ticket de prueba
        </button>
      </div>

      {saveMessage ? (
        <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {saveMessage}
        </p>
      ) : null}

      <p
        className={`mt-4 rounded border px-3 py-2 text-sm ${
          status.kind === 'ok'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : status.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-zinc-200 bg-zinc-50 text-zinc-700'
        }`}
      >
        {status.message}
      </p>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        El kit descargable actual requiere <strong>Node.js 20+</strong> en la PC
        Windows. Incluye `local-print-agent.js`, `start-agent.cmd` y una
        plantilla de configuracion para impresoras Ethernet o USB Windows por
        nombre de cola.
      </p>
    </section>
  );
}
