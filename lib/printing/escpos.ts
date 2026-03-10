import type { LocalAgentPrintPayload } from '@/lib/printing/contracts';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const encoder = new TextEncoder();

const encodeText = (value: string) =>
  encoder.encode(value.replace(/\s+/g, ' ').trim());

const line = (value = '') => {
  const bytes = Array.from(encodeText(value));
  bytes.push(LF);
  return bytes;
};

const command = (...bytes: number[]) => bytes;

const align = (mode: 'left' | 'center' | 'right') =>
  command(ESC, 0x61, mode === 'left' ? 0 : mode === 'center' ? 1 : 2);

const emphasis = (enabled: boolean) => command(ESC, 0x45, enabled ? 1 : 0);

const cut = () => command(GS, 0x56, 0x00);

const openCashDrawer = () => command(ESC, 0x70, 0x00, 0x19, 0xfa);

const divider = (paperWidthMm: number) =>
  '-'.repeat(paperWidthMm >= 76 ? 42 : 32);

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const truncate = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, Math.max(max - 1, 1))}…`;

const padLine = (left: string, right: string, width: number) => {
  const safeLeft = truncate(left, width);
  const safeRight = truncate(right, width);
  const spaces = Math.max(width - safeLeft.length - safeRight.length, 1);
  return `${safeLeft}${' '.repeat(spaces)}${safeRight}`;
};

export const buildEscPosBuffer = (payload: LocalAgentPrintPayload) => {
  const bytes: number[] = [];
  const width = payload.paperWidthMm >= 76 ? 42 : 32;
  const hr = divider(payload.paperWidthMm);

  bytes.push(...command(ESC, 0x40));
  bytes.push(...align('center'));
  bytes.push(...emphasis(true));
  bytes.push(...line('NODUX'));
  bytes.push(...emphasis(false));

  for (const value of payload.headerLines) {
    if (value.trim()) bytes.push(...line(value));
  }

  bytes.push(...line(hr));
  bytes.push(...align('left'));

  for (const value of payload.metaLines) {
    if (value.trim()) bytes.push(...line(value));
  }

  bytes.push(...line(hr));

  for (const item of payload.items) {
    bytes.push(...line(truncate(item.name, width)));
    bytes.push(
      ...line(
        padLine(
          `${item.qty} x ${formatMoney(item.unitPrice)}`,
          formatMoney(item.lineTotal),
          width,
        ),
      ),
    );
  }

  bytes.push(...line(hr));
  bytes.push(
    ...line(padLine('Subtotal', formatMoney(payload.totals.subtotal), width)),
  );
  bytes.push(
    ...line(padLine('Descuento', formatMoney(payload.totals.discount), width)),
  );
  bytes.push(...emphasis(true));
  bytes.push(
    ...line(padLine('TOTAL', formatMoney(payload.totals.total), width)),
  );
  bytes.push(...emphasis(false));

  if (payload.footerLines.length > 0) {
    bytes.push(...line(hr));
    bytes.push(...align('center'));
    for (const value of payload.footerLines) {
      if (value.trim()) bytes.push(...line(value));
    }
    bytes.push(...align('left'));
  }

  bytes.push(...command(LF, LF, LF));

  if (payload.cashDrawer) {
    bytes.push(...openCashDrawer());
  }

  if (payload.cut) {
    bytes.push(...cut());
  }

  return Buffer.from(bytes);
};
