import { normalizeClientPhone } from '@/lib/clients/normalize';

export const normalizePhoneForWhatsApp = (value: string | null | undefined) =>
  normalizeClientPhone(value).replace(/\D/g, '');

export const buildWhatsAppHref = (params: {
  phone: string | null | undefined;
  text: string;
}) => {
  const normalizedPhone = normalizePhoneForWhatsApp(params.phone);
  const trimmedText = params.text.trim();

  if (!normalizedPhone || !trimmedText) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(trimmedText)}`;
};
