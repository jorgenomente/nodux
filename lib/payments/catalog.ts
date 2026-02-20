export type PosPaymentMethod = 'cash' | 'card' | 'mercadopago';

export type MercadoPagoChannel = 'posnet' | 'qr' | 'alias_mp';

export const POS_PAYMENT_METHOD_OPTIONS: Array<{
  value: PosPaymentMethod;
  label: string;
}> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta (debito/credito)' },
  { value: 'mercadopago', label: 'MercadoPago' },
];

export const MERCADOPAGO_CHANNEL_OPTIONS: Array<{
  value: MercadoPagoChannel;
  label: string;
}> = [
  { value: 'posnet', label: 'Posnet MP' },
  { value: 'qr', label: 'QR' },
  { value: 'alias_mp', label: 'Transferencia a alias MP' },
];

const normalizeForMatch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const detectMercadoPagoChannel = (device: {
  provider: string;
  device_name: string;
}): MercadoPagoChannel | null => {
  if (device.provider !== 'mercadopago') return null;
  const deviceName = normalizeForMatch(device.device_name);
  if (deviceName.includes('alias') || deviceName.includes('transfer')) {
    return 'alias_mp';
  }
  if (deviceName.includes('qr')) {
    return 'qr';
  }
  return 'posnet';
};

export const methodRequiresDevice = (method: PosPaymentMethod) =>
  method === 'card' || method === 'mercadopago';

export const formatOperationalPaymentMethod = (value: string) => {
  if (value === 'debit' || value === 'credit' || value === 'card') {
    return 'Tarjeta (debito/credito)';
  }
  if (value === 'cash') return 'Efectivo';
  if (value === 'mercadopago') return 'MercadoPago';
  if (value === 'mixed') return 'Mixto';
  if (value === 'transfer') return 'Transferencia';
  if (value === 'other') return 'Otro';
  return value;
};
