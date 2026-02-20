'use client';

import { useMemo, useState } from 'react';

import {
  detectMercadoPagoChannel,
  MERCADOPAGO_CHANNEL_OPTIONS,
  POS_PAYMENT_METHOD_OPTIONS,
  type MercadoPagoChannel,
  type PosPaymentMethod,
} from '@/lib/payments/catalog';

type PaymentDevice = {
  id: string;
  device_name: string;
  provider: 'posnet' | 'mercadopago' | 'other';
  is_active: boolean;
};

type SalePayment = {
  sale_payment_id: string;
  payment_method: string;
  amount: number;
  payment_device_id: string | null;
  payment_device_name: string | null;
  created_at: string;
};

type Props = {
  payment: SalePayment;
  paymentDevices: PaymentDevice[];
  onSubmit: (formData: FormData) => void | Promise<void>;
};

type UiMethod = PosPaymentMethod;

const resolveInitialMethod = (method: string): UiMethod => {
  if (method === 'cash') return 'cash';
  if (method === 'debit') return 'card';
  if (method === 'credit') return 'card';
  if (method === 'card') return 'card';
  if (method === 'mercadopago') return 'mercadopago';
  return 'cash';
};

const resolveInitialChannel = (
  payment: SalePayment,
  devices: PaymentDevice[],
): MercadoPagoChannel => {
  if (payment.payment_method !== 'mercadopago') return 'posnet';
  if (!payment.payment_device_id) return 'qr';
  const device = devices.find((item) => item.id === payment.payment_device_id);
  if (!device) return 'qr';
  return detectMercadoPagoChannel(device) ?? 'posnet';
};

const buttonClass = (isActive: boolean) =>
  `rounded border px-3 py-2 text-xs font-semibold transition ${
    isActive
      ? 'border-zinc-900 bg-zinc-900 text-white'
      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
  }`;

export default function SalePaymentCorrectionForm({
  payment,
  paymentDevices,
  onSubmit,
}: Props) {
  const [method, setMethod] = useState<UiMethod>(
    resolveInitialMethod(payment.payment_method),
  );
  const [mercadoPagoChannel, setMercadoPagoChannel] =
    useState<MercadoPagoChannel>(() =>
      resolveInitialChannel(payment, paymentDevices),
    );

  const debitCreditDevices = useMemo(
    () =>
      paymentDevices.filter(
        (device) =>
          device.provider !== 'mercadopago' ||
          detectMercadoPagoChannel(device) === 'posnet',
      ),
    [paymentDevices],
  );

  const mercadopagoPosnetDevices = useMemo(
    () =>
      paymentDevices.filter(
        (device) =>
          device.provider === 'mercadopago' &&
          detectMercadoPagoChannel(device) === 'posnet',
      ),
    [paymentDevices],
  );

  const initialDeviceId =
    payment.payment_device_id &&
    paymentDevices.some((device) => device.id === payment.payment_device_id)
      ? payment.payment_device_id
      : '';

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    if (method === 'mercadopago' && mercadoPagoChannel !== 'posnet') {
      return '';
    }
    return initialDeviceId;
  });

  const requiresDevice =
    method === 'card' ||
    (method === 'mercadopago' && mercadoPagoChannel === 'posnet');

  const visibleDevices =
    method === 'card'
      ? debitCreditDevices
      : method === 'mercadopago' && mercadoPagoChannel === 'posnet'
        ? mercadopagoPosnetDevices
        : [];

  const hasRequiredDevice = !requiresDevice || selectedDeviceId !== '';

  return (
    <form action={onSubmit} className="mt-3 grid gap-3">
      <input
        type="hidden"
        name="sale_payment_id"
        value={payment.sale_payment_id}
      />
      <input type="hidden" name="payment_method" value={method} />
      <input
        type="hidden"
        name="mercadopago_channel"
        value={method === 'mercadopago' ? mercadoPagoChannel : ''}
      />
      <input
        type="hidden"
        name="payment_device_id"
        value={hasRequiredDevice ? selectedDeviceId : ''}
      />

      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Método corregido
        </p>
        <div className="flex flex-wrap gap-2">
          {POS_PAYMENT_METHOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={buttonClass(method === option.value)}
              onClick={() => {
                setMethod(option.value);
                if (option.value !== 'mercadopago') {
                  setMercadoPagoChannel('posnet');
                }
                if (option.value === 'cash') {
                  setSelectedDeviceId('');
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {method === 'mercadopago' ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Canal MercadoPago
          </p>
          <div className="flex flex-wrap gap-2">
            {MERCADOPAGO_CHANNEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={buttonClass(mercadoPagoChannel === option.value)}
                onClick={() => {
                  setMercadoPagoChannel(option.value);
                  if (option.value !== 'posnet') {
                    setSelectedDeviceId('');
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {visibleDevices.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Dispositivo de cobro
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleDevices.map((device) => (
              <button
                key={device.id}
                type="button"
                className={buttonClass(selectedDeviceId === device.id)}
                onClick={() => setSelectedDeviceId(device.id)}
              >
                {device.device_name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!hasRequiredDevice ? (
        <p className="text-xs text-amber-700">
          Selecciona un dispositivo para guardar la corrección.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Motivo de corrección
        <input
          name="reason"
          placeholder="Ej: Cobro fue por Posnet 2 y se registró como efectivo"
          className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
          required
        />
      </label>

      <div>
        <button
          type="submit"
          disabled={!hasRequiredDevice}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Guardar corrección
        </button>
      </div>
    </form>
  );
}
