import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

import { buildEscPosBuffer } from '../lib/printing/escpos';
import type {
  LocalAgentPrintPayload,
  LocalPrintPayloadDocumentType,
} from '../lib/printing/contracts';

type AgentPrinterConfig = {
  id: string;
  name: string;
  transport: 'tcp' | 'windows_printer';
  host?: string;
  port?: number;
  printerName?: string;
  paperWidthMm: 72 | 80;
  supportsCut: boolean;
};

type AgentConfig = {
  listenHost: string;
  listenPort: number;
  printers: AgentPrinterConfig[];
};

const AGENT_VERSION = '0.1.0';
const CONFIG_DIR = path.join(os.homedir(), '.nodux-print-agent');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: AgentConfig = {
  listenHost: '127.0.0.1',
  listenPort: 4891,
  printers: [
    {
      id: 'cashier-front',
      name: 'Caja principal',
      transport: 'tcp',
      host: '192.168.0.200',
      port: 9100,
      paperWidthMm: 80,
      supportsCut: true,
    },
    {
      id: 'cashier-usb',
      name: 'Caja USB Windows',
      transport: 'windows_printer',
      printerName: 'POS-80',
      paperWidthMm: 80,
      supportsCut: true,
    },
  ],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parsePrinter = (value: unknown): AgentPrinterConfig | null => {
  if (!isRecord(value)) return null;
  const transport =
    value.transport === 'tcp'
      ? 'tcp'
      : value.transport === 'windows_printer'
        ? 'windows_printer'
        : null;
  const port = Number(value.port);
  const paperWidthMm = Number(value.paperWidthMm) === 72 ? 72 : 80;
  if (
    !transport ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string'
  ) {
    return null;
  }

  if (transport === 'tcp') {
    if (typeof value.host !== 'string' || !Number.isFinite(port)) {
      return null;
    }

    return {
      id: value.id,
      name: value.name,
      transport,
      host: value.host,
      port,
      paperWidthMm,
      supportsCut: value.supportsCut !== false,
    };
  }

  if (typeof value.printerName !== 'string' || !value.printerName.trim()) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    transport,
    printerName: value.printerName.trim(),
    paperWidthMm,
    supportsCut: value.supportsCut !== false,
  };
};

const readConfig = async (): Promise<AgentConfig> => {
  await mkdir(CONFIG_DIR, { recursive: true });

  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) throw new Error('invalid_config');

    const printers = Array.isArray(parsed.printers)
      ? parsed.printers.map(parsePrinter).filter(Boolean)
      : [];

    return {
      listenHost:
        typeof parsed.listenHost === 'string'
          ? parsed.listenHost
          : DEFAULT_CONFIG.listenHost,
      listenPort: Number(parsed.listenPort) || DEFAULT_CONFIG.listenPort,
      printers:
        printers.length > 0
          ? (printers as AgentPrinterConfig[])
          : DEFAULT_CONFIG.printers,
    };
  } catch {
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
};

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const respondJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
};

const resolvePayload = (body: string): LocalAgentPrintPayload | null => {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.payload)) return null;

    const payload = parsed.payload as Record<string, unknown>;
    if (
      typeof payload.jobId !== 'string' ||
      typeof payload.printerTarget !== 'string' ||
      typeof payload.documentType !== 'string'
    ) {
      return null;
    }

    const documentType = payload.documentType as LocalPrintPayloadDocumentType;
    if (documentType !== 'sale_ticket') return null;

    return payload as unknown as LocalAgentPrintPayload;
  } catch {
    return null;
  }
};

const writeTcp = async (printer: AgentPrinterConfig, bytes: Buffer) =>
  new Promise<void>((resolve, reject) => {
    const socket = net.createConnection(
      {
        host: printer.host!,
        port: printer.port!,
      },
      () => {
        socket.write(bytes);
        socket.end();
      },
    );

    socket.setTimeout(5000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('tcp_timeout'));
    });
    socket.on('error', reject);
    socket.on('close', (hadError) => {
      if (!hadError) resolve();
    });
  });

const writeWindowsPrinter = async (
  printer: AgentPrinterConfig,
  bytes: Buffer,
) => {
  if (process.platform !== 'win32') {
    throw new Error('windows_printer_transport_requires_windows');
  }

  const base64Payload = bytes.toString('base64');
  const script = `
$printerName = ${JSON.stringify(printer.printerName ?? '')}
$bytes = [Convert]::FromBase64String(${JSON.stringify(base64Payload)})
$signature = @"
using System;
using System.Runtime.InteropServices;
public static class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", EntryPoint="ClosePrinter", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);
  [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] data, int buf, out int written);
}
"@
Add-Type -TypeDefinition $signature
$docInfo = New-Object RawPrinterHelper+DOCINFOA
$docInfo.pDocName = "NODUX ticket"
$docInfo.pDataType = "RAW"
$handle = [IntPtr]::Zero
if (-not [RawPrinterHelper]::OpenPrinter($printerName, [ref]$handle, [IntPtr]::Zero)) { throw "open_printer_failed" }
try {
  if (-not [RawPrinterHelper]::StartDocPrinter($handle, 1, $docInfo)) { throw "start_doc_failed" }
  try {
    if (-not [RawPrinterHelper]::StartPagePrinter($handle)) { throw "start_page_failed" }
    try {
      $written = 0
      if (-not [RawPrinterHelper]::WritePrinter($handle, $bytes, $bytes.Length, [ref]$written)) { throw "write_printer_failed" }
      if ($written -ne $bytes.Length) { throw "partial_write" }
    } finally {
      [void][RawPrinterHelper]::EndPagePrinter($handle)
    }
  } finally {
    [void][RawPrinterHelper]::EndDocPrinter($handle)
  }
} finally {
  [void][RawPrinterHelper]::ClosePrinter($handle)
}
Write-Output "OK"
`;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(stderr.trim() || `powershell_exit_${code ?? 'unknown'}`),
      );
    });
  });
};

const printPayload = async (
  config: AgentConfig,
  payload: LocalAgentPrintPayload,
) => {
  const printer = config.printers.find(
    (entry) => entry.id === payload.printerTarget,
  );
  if (!printer) {
    throw new Error(`unknown_printer_target:${payload.printerTarget}`);
  }

  const bytes = buildEscPosBuffer({
    ...payload,
    paperWidthMm: printer.paperWidthMm,
    cut: printer.supportsCut ? payload.cut : false,
  });

  if (printer.transport === 'tcp') {
    await writeTcp(printer, bytes);
    return;
  }

  if (printer.transport === 'windows_printer') {
    await writeWindowsPrinter(printer, bytes);
    return;
  }

  throw new Error(`unsupported_transport:${String(printer.transport)}`);
};

const start = async () => {
  const config = await readConfig();

  const server = createServer(async (request, response) => {
    if (!request.url || !request.method) {
      respondJson(response, 400, { ok: false, error: 'invalid_request' });
      return;
    }

    if (request.method === 'OPTIONS') {
      respondJson(response, 204, {});
      return;
    }

    if (request.method === 'GET' && request.url === '/health') {
      respondJson(response, 200, {
        ok: true,
        agentVersion: AGENT_VERSION,
      });
      return;
    }

    if (request.method === 'GET' && request.url === '/printers') {
      respondJson(response, 200, {
        printers: config.printers.map((printer) => ({
          id: printer.id,
          name: printer.name,
          connection: printer.transport,
          paperWidthMm: printer.paperWidthMm,
          supportsCut: printer.supportsCut,
          printerName: printer.printerName ?? null,
          host: printer.host ?? null,
          port: printer.port ?? null,
        })),
      });
      return;
    }

    if (request.method === 'POST' && request.url === '/print') {
      const body = await readBody(request);
      const payload = resolvePayload(body);

      if (!payload) {
        respondJson(response, 400, {
          accepted: false,
          error: 'invalid_payload',
        });
        return;
      }

      try {
        await printPayload(config, payload);
        respondJson(response, 202, {
          accepted: true,
          jobId: payload.jobId,
          status: 'dispatched',
        });
      } catch (error) {
        respondJson(response, 500, {
          accepted: false,
          jobId: payload.jobId,
          error: error instanceof Error ? error.message : 'print_failed',
        });
      }
      return;
    }

    respondJson(response, 404, { ok: false, error: 'not_found' });
  });

  server.listen(config.listenPort, config.listenHost, () => {
    console.log(
      `NODUX local print agent listening on http://${config.listenHost}:${config.listenPort}`,
    );
    console.log(`Config: ${CONFIG_PATH}`);
  });
};

if (process.argv.includes('--help')) {
  console.log('Usage: npm run print:agent');
  console.log(`Config file: ${CONFIG_PATH}`);
  process.exit(0);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
