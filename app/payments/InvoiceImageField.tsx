'use client';

import { useState } from 'react';
import NextImage from 'next/image';

type InvoiceImageFieldProps = {
  inputName: string;
  defaultPreviewUrl?: string | null;
  existingPath?: string | null;
};

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const TARGET_BYTES = 220 * 1024;
const MAX_BYTES = 320 * 1024;

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };
    image.src = objectUrl;
  });

const getConstrainedSize = (width: number, height: number) => {
  const widthRatio = MAX_WIDTH / width;
  const heightRatio = MAX_HEIGHT / height;
  const ratio = Math.min(1, widthRatio, heightRatio);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo convertir la imagen'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo procesar la imagen'));
    reader.readAsDataURL(blob);
  });

const compressImageToDataUrl = async (file: File): Promise<string> => {
  const image = await loadImageElement(file);
  let { width, height } = getConstrainedSize(image.width, image.height);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo inicializar canvas');
  }

  const draw = (drawWidth: number, drawHeight: number) => {
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    context.clearRect(0, 0, drawWidth, drawHeight);
    context.drawImage(image, 0, 0, drawWidth, drawHeight);
  };

  draw(width, height);

  let quality = 0.78;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > TARGET_BYTES && quality > 0.45) {
    quality -= 0.07;
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > MAX_BYTES) {
    const ratio = Math.sqrt(MAX_BYTES / blob.size) * 0.95;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
    draw(width, height);
    blob = await canvasToBlob(canvas, quality);
  }

  return blobToDataUrl(blob);
};

export default function InvoiceImageField({
  inputName,
  defaultPreviewUrl,
  existingPath,
}: InvoiceImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(defaultPreviewUrl ?? '');
  const [compressedDataUrl, setCompressedDataUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  return (
    <div className="grid gap-2">
      <input type="hidden" name={inputName} value={compressedDataUrl} />
      <input
        type="hidden"
        name="invoice_photo_path"
        value={existingPath ?? ''}
      />
      <label className="text-xs text-zinc-600">
        Foto factura/remito
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="mt-1 block w-full text-xs text-zinc-600 file:mr-3 file:rounded file:border file:border-zinc-200 file:bg-white file:px-2 file:py-1"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setProcessing(true);
            setError('');
            try {
              const dataUrl = await compressImageToDataUrl(file);
              setCompressedDataUrl(dataUrl);
              setPreviewUrl(dataUrl);
            } catch (uploadError) {
              setError(
                uploadError instanceof Error
                  ? uploadError.message
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
        <div className="rounded border border-zinc-200 p-2">
          <NextImage
            src={previewUrl}
            alt="Factura adjunta"
            width={640}
            height={480}
            unoptimized
            className="max-h-48 w-auto rounded object-contain"
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Sin imagen adjunta.</p>
      )}
      <p className="text-[11px] text-zinc-500">
        Se convierte a JPG comprimido para reducir peso y mantener legibilidad.
      </p>
    </div>
  );
}
