/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('node:http');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const AGENT_VERSION = '0.1.0';
const CONFIG_DIR = path.join(os.homedir(), '.nodux-print-agent');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  listenHost: '127.0.0.1',
  listenPort: 4891,
  printers: [
    {
      id: 'cashier-front',
      name: 'Caja principal Ethernet',
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

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const encoder = new TextEncoder();

const divider = (paperWidthMm) => '-'.repeat(paperWidthMm >= 76 ? 42 : 32);

const formatMoney = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const truncate = (value, max) =>
  value.length <= max ? value : `${value.slice(0, Math.max(max - 1, 1))}…`;

const padLine = (left, right, width) => {
  const safeLeft = truncate(left, width);
  const safeRight = truncate(right, width);
  const spaces = Math.max(width - safeLeft.length - safeRight.length, 1);
  return `${safeLeft}${' '.repeat(spaces)}${safeRight}`;
};

const command = (...bytes) => bytes;
const align = (mode) =>
  command(ESC, 0x61, mode === 'left' ? 0 : mode === 'center' ? 1 : 2);
const emphasis = (enabled) => command(ESC, 0x45, enabled ? 1 : 0);
const cut = () => command(GS, 0x56, 0x00);
const openCashDrawer = () => command(ESC, 0x70, 0x00, 0x19, 0xfa);
const encodeText = (value) =>
  encoder.encode(String(value).replace(/\s+/g, ' ').trim());
const line = (value = '') => [...Array.from(encodeText(value)), LF];

const buildEscPosBuffer = (payload) => {
  const bytes = [];
  const width = payload.paperWidthMm >= 76 ? 42 : 32;
  const hr = divider(payload.paperWidthMm);

  bytes.push(...command(ESC, 0x40));
  bytes.push(...align('center'));
  bytes.push(...emphasis(true));
  bytes.push(...line('NODUX'));
  bytes.push(...emphasis(false));

  for (const value of payload.headerLines || []) {
    if (String(value).trim()) bytes.push(...line(value));
  }

  bytes.push(...line(hr));
  bytes.push(...align('left'));

  for (const value of payload.metaLines || []) {
    if (String(value).trim()) bytes.push(...line(value));
  }

  bytes.push(...line(hr));

  for (const item of payload.items || []) {
    bytes.push(...line(truncate(String(item.name || ''), width)));
    bytes.push(
      ...line(
        padLine(
          `${item.qty} x ${formatMoney(Number(item.unitPrice || 0))}`,
          formatMoney(Number(item.lineTotal || 0)),
          width,
        ),
      ),
    );
  }

  bytes.push(...line(hr));
  bytes.push(
    ...line(
      padLine(
        'Subtotal',
        formatMoney(Number(payload.totals?.subtotal || 0)),
        width,
      ),
    ),
  );
  bytes.push(
    ...line(
      padLine(
        'Descuento',
        formatMoney(Number(payload.totals?.discount || 0)),
        width,
      ),
    ),
  );
  bytes.push(...emphasis(true));
  bytes.push(
    ...line(
      padLine('TOTAL', formatMoney(Number(payload.totals?.total || 0)), width),
    ),
  );
  bytes.push(...emphasis(false));

  if (Array.isArray(payload.footerLines) && payload.footerLines.length > 0) {
    bytes.push(...line(hr));
    bytes.push(...align('center'));
    for (const value of payload.footerLines) {
      if (String(value).trim()) bytes.push(...line(value));
    }
    bytes.push(...align('left'));
  }

  bytes.push(...command(LF, LF, LF));

  if (payload.cashDrawer) bytes.push(...openCashDrawer());
  if (payload.cut) bytes.push(...cut());

  return Buffer.from(bytes);
};

const isRecord = (value) => typeof value === 'object' && value !== null;

const parsePrinter = (value) => {
  if (!isRecord(value)) return null;
  const transport =
    value.transport === 'tcp'
      ? 'tcp'
      : value.transport === 'windows_printer'
        ? 'windows_printer'
        : null;
  const paperWidthMm = Number(value.paperWidthMm) === 72 ? 72 : 80;

  if (
    !transport ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string'
  ) {
    return null;
  }

  if (transport === 'tcp') {
    const port = Number(value.port);
    if (typeof value.host !== 'string' || !Number.isFinite(port)) return null;
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

  if (typeof value.printerName !== 'string' || !value.printerName.trim())
    return null;
  return {
    id: value.id,
    name: value.name,
    transport,
    printerName: value.printerName.trim(),
    paperWidthMm,
    supportsCut: value.supportsCut !== false,
  };
};

const ensureConfig = async () => {
  await fsp.mkdir(CONFIG_DIR, { recursive: true });
  try {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
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
      printers: printers.length > 0 ? printers : DEFAULT_CONFIG.printers,
    };
  } catch {
    await fsp.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const respondJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
};

const resolvePayload = (body) => {
  try {
    const parsed = JSON.parse(body);
    if (!isRecord(parsed) || !isRecord(parsed.payload)) return null;
    const payload = parsed.payload;
    if (
      typeof payload.jobId !== 'string' ||
      typeof payload.printerTarget !== 'string' ||
      payload.documentType !== 'sale_ticket'
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const writeTcp = (printer, bytes) =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: printer.host, port: printer.port },
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

const writeWindowsPrinter = (printer, bytes) =>
  new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('windows_printer_transport_requires_windows'));
      return;
    }

    const base64Payload = bytes.toString('base64');
    const script = `
$printerName = ${JSON.stringify(printer.printerName || '')}
$bytes = [Convert]::FromBase64String(${JSON.stringify(base64Payload)})
$signature = @"
using System;
using System.Runtime.InteropServices;
public static class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
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
      { stdio: ['ignore', 'pipe', 'pipe'] },
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
        new Error(stderr.trim() || `powershell_exit_${code || 'unknown'}`),
      );
    });
  });

const printPayload = async (config, payload) => {
  const printer = config.printers.find(
    (entry) => entry.id === payload.printerTarget,
  );
  if (!printer)
    throw new Error(`unknown_printer_target:${payload.printerTarget}`);

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
  const config = await ensureConfig();

  const server = http.createServer(async (request, response) => {
    if (!request.url || !request.method) {
      respondJson(response, 400, { ok: false, error: 'invalid_request' });
      return;
    }

    if (request.method === 'OPTIONS') {
      respondJson(response, 204, {});
      return;
    }

    if (request.method === 'GET' && request.url === '/health') {
      respondJson(response, 200, { ok: true, agentVersion: AGENT_VERSION });
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
          printerName: printer.printerName || null,
          host: printer.host || null,
          port: printer.port || null,
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
  console.log('Usage: node local-print-agent.js');
  console.log(`Config file: ${CONFIG_PATH}`);
  process.exit(0);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
