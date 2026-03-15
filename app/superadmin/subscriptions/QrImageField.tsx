'use client';

import { useState } from 'react';
import Image from 'next/image';

import { compressImageToDataUrl } from '@/app/products/ProductImageField';

type QrImageFieldProps = {
  inputName: string;
  existingImageUrl?: string | null;
  existingPath?: string | null;
};

export default function QrImageField({
  inputName,
  existingImageUrl,
  existingPath,
}: QrImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState(existingImageUrl ?? '');
  const [compressedDataUrl, setCompressedDataUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="grid gap-2">
      <input type="hidden" name={inputName} value={compressedDataUrl} />
      <input type="hidden" name="existing_qr_path" value={existingPath ?? ''} />

      <label className="grid gap-1 text-sm text-zinc-700">
        QR Mercado Pago
        <input
          type="file"
          accept="image/*,.heic,.heif"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setProcessing(true);
            setError('');
            try {
              const dataUrl = await compressImageToDataUrl(file);
              setCompressedDataUrl(dataUrl);
              setPreviewUrl(dataUrl);
            } catch (processingError) {
              setError(
                processingError instanceof Error
                  ? processingError.message
                  : 'No se pudo procesar la imagen',
              );
            } finally {
              setProcessing(false);
            }
          }}
        />
      </label>

      {processing ? (
        <p className="text-xs text-zinc-500">Procesando imagen...</p>
      ) : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {previewUrl ? (
        <div className="rounded-xl border border-zinc-200 p-3">
          <Image
            src={previewUrl}
            alt="QR Mercado Pago"
            width={320}
            height={320}
            unoptimized
            className="h-auto max-h-56 w-auto rounded object-contain"
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Sin QR cargado.</p>
      )}

      <p className="text-[11px] text-zinc-500">
        Se comprime antes de subir para reducir peso.
      </p>
    </div>
  );
}
