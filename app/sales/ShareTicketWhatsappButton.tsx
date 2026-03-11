'use client';

import { useState } from 'react';

type Props = {
  saleId: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  endpointPath?: 'ticket-share' | 'invoice-share';
};

const openWhatsappUrl = (url: string) => {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) {
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
};

export default function ShareTicketWhatsappButton({
  saleId,
  label = 'Compartir ticket por WhatsApp',
  className,
  disabled = false,
  endpointPath = 'ticket-share',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShare = async () => {
    if (disabled || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/sales/${saleId}/${endpointPath}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        whatsappUrl?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok || !payload.whatsappUrl) {
        throw new Error(
          payload?.error ?? 'No pudimos preparar el link de WhatsApp.',
        );
      }

      openWhatsappUrl(payload.whatsappUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos preparar el link de WhatsApp.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled || loading}
        className={
          className ??
          `rounded border px-3 py-2 text-sm ${
            disabled || loading
              ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400'
              : 'border-emerald-300 bg-white text-emerald-700'
          }`
        }
      >
        {loading ? 'Preparando WhatsApp...' : label}
      </button>
      {errorMessage ? (
        <p className="text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
