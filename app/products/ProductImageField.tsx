'use client';

import { useState } from 'react';
import Image from 'next/image';

type ProductImageFieldProps = {
  inputName: string;
  existingImageUrl?: string | null;
  removeFlagName?: string;
  compact?: boolean;
};

type DecodedImage = {
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    drawWidth: number,
    drawHeight: number,
  ) => void;
  release: () => void;
};

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const TARGET_BYTES = 160 * 1024;
const MAX_BYTES = 240 * 1024;

const isHeicLikeFile = (file: File) => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
};

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

const decodeImage = async (file: File): Promise<DecodedImage> => {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(context, drawWidth, drawHeight) {
          context.drawImage(bitmap, 0, 0, drawWidth, drawHeight);
        },
        release() {
          bitmap.close();
        },
      };
    } catch {
      // Fallback to HTMLImageElement path below.
    }
  }

  const image = await loadImageElement(file);
  return {
    width: image.width,
    height: image.height,
    draw(context, drawWidth, drawHeight) {
      context.drawImage(image, 0, 0, drawWidth, drawHeight);
    },
    release() {
      // No-op for HTMLImageElement.
    },
  };
};

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
  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    if (isHeicLikeFile(file)) {
      throw new Error(
        'Este navegador no puede leer HEIC. Intenta seleccionar una foto JPG/PNG o exportar desde iPhone en formato compatible.',
      );
    }
    throw new Error('No se pudo leer la imagen');
  }

  let { width, height } = getConstrainedSize(decoded.width, decoded.height);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo inicializar canvas');
  }

  const draw = (drawWidth: number, drawHeight: number) => {
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    context.clearRect(0, 0, drawWidth, drawHeight);
    decoded.draw(context, drawWidth, drawHeight);
  };

  try {
    draw(width, height);

    let quality = 0.76;
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > TARGET_BYTES && quality > 0.42) {
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
  } finally {
    decoded.release();
  }
};

export default function ProductImageField({
  inputName,
  existingImageUrl,
  removeFlagName = 'remove_image',
  compact = false,
}: ProductImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState(existingImageUrl ?? '');
  const [compressedDataUrl, setCompressedDataUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [removeImage, setRemoveImage] = useState(false);

  return (
    <div
      className={
        compact ? 'space-y-1 md:col-span-3' : 'space-y-2 md:col-span-2'
      }
    >
      <input type="hidden" name={inputName} value={compressedDataUrl} />
      <input
        type="hidden"
        name={removeFlagName}
        value={removeImage ? 'true' : 'false'}
      />

      <label
        className={
          compact
            ? 'text-xs text-zinc-600'
            : 'text-sm font-medium text-zinc-700'
        }
      >
        Imagen producto
        <input
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          className={
            compact
              ? 'mt-1 block w-full text-xs text-zinc-600 file:mr-2 file:rounded file:border file:border-zinc-200 file:bg-white file:px-2 file:py-1'
              : 'mt-2 block w-full text-xs text-zinc-600 file:mr-3 file:rounded file:border file:border-zinc-200 file:bg-white file:px-2 file:py-1'
          }
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setProcessing(true);
            setError('');
            try {
              const dataUrl = await compressImageToDataUrl(file);
              setCompressedDataUrl(dataUrl);
              setPreviewUrl(dataUrl);
              setRemoveImage(false);
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

      {previewUrl && !removeImage ? (
        <div className="rounded border border-zinc-200 p-2">
          <Image
            src={previewUrl}
            alt="Imagen de producto"
            width={640}
            height={480}
            unoptimized
            className={
              compact
                ? 'max-h-28 w-auto rounded object-contain'
                : 'max-h-40 w-auto rounded object-contain'
            }
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Sin imagen cargada.</p>
      )}

      {existingImageUrl ? (
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={removeImage}
            onChange={(event) => {
              const checked = event.target.checked;
              setRemoveImage(checked);
              if (checked) {
                setCompressedDataUrl('');
              }
            }}
          />
          Quitar imagen actual
        </label>
      ) : null}

      <p className="text-[11px] text-zinc-500">
        Se convierte a JPG comprimido para usar menos almacenamiento y carga más
        rápida.
      </p>
    </div>
  );
}
