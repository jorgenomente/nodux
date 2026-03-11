'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { compressImageToDataUrl } from '@/app/products/ProductImageField';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  productId: string;
  productName: string;
  brand: string;
  categoryTags: string[];
  internalCode: string;
  barcode: string;
  purchaseByPack: boolean;
  unitsPerPack: number | null;
  sellUnitType: 'unit' | 'weight' | 'bulk';
  uom: string;
  unitPrice: number;
  supplierPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  shelfLifeDays: number | null;
  safetyStock: number | null;
  primarySupplierId: string;
  secondarySupplierId: string;
  primarySupplierSku: string;
  primarySupplierProductName: string;
  canEdit: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
};

type Notice = {
  tone: 'success' | 'error';
  message: string;
} | null;

export default function ProductImageQuickActions({
  productId,
  productName,
  brand,
  categoryTags,
  internalCode,
  barcode,
  purchaseByPack,
  unitsPerPack,
  sellUnitType,
  uom,
  unitPrice,
  supplierPrice,
  imageUrl,
  isActive,
  shelfLifeDays,
  safetyStock,
  primarySupplierId,
  secondarySupplierId,
  primarySupplierSku,
  primarySupplierProductName,
  canEdit,
  onSubmit,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageUrl ?? '');
  const [pendingDataUrl, setPendingDataUrl] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const resetState = () => {
    setPreviewUrl(imageUrl ?? '');
    setPendingDataUrl('');
    setRemoveImage(false);
    setProcessing(false);
    setSaving(false);
    setError('');
    setNotice(null);
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('edit_name', productName);
    formData.append('edit_brand', brand);
    formData.append('edit_category_tags', categoryTags.join(' '));
    formData.append('edit_internal_code', internalCode);
    formData.append('edit_barcode', barcode);
    if (purchaseByPack) {
      formData.append('edit_purchase_by_pack', 'on');
    }
    formData.append(
      'edit_units_per_pack',
      unitsPerPack == null ? '' : String(unitsPerPack),
    );
    formData.append('edit_sell_unit_type', sellUnitType);
    formData.append('edit_uom', uom);
    formData.append('edit_unit_price', String(unitPrice));
    formData.append(
      'edit_supplier_price',
      supplierPrice == null ? '' : String(supplierPrice),
    );
    formData.append('is_active', String(isActive));
    formData.append('primary_supplier_id', primarySupplierId);
    formData.append('secondary_supplier_id', secondarySupplierId);
    formData.append('primary_supplier_sku', primarySupplierSku);
    formData.append(
      'primary_supplier_product_name',
      primarySupplierProductName,
    );
    formData.append(
      'edit_shelf_life_days',
      shelfLifeDays == null ? '' : String(shelfLifeDays),
    );
    formData.append(
      'edit_safety_stock',
      safetyStock == null ? '' : String(safetyStock),
    );
    formData.append('remove_image', removeImage ? 'true' : 'false');
    formData.append('edit_image_data_url', pendingDataUrl);
    return formData;
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setNotice(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPendingDataUrl(dataUrl);
      setPreviewUrl(dataUrl);
      setRemoveImage(false);
      setNotice({
        tone: 'success',
        message: 'Foto lista para guardar. Se comprimirá como JPG liviano.',
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : 'No se pudo procesar la imagen.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if ((!pendingDataUrl && !removeImage) || saving) return;
    setSaving(true);
    setError('');
    setNotice({
      tone: 'success',
      message: removeImage ? 'Quitando foto...' : 'Guardando foto...',
    });
    try {
      await onSubmit(buildFormData());
      router.refresh();
      setOpen(false);
      resetState();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la foto.';
      setError(message);
      setNotice({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const showPlaceholder = !previewUrl || removeImage;
  const hasPendingChanges = Boolean(pendingDataUrl) || removeImage;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
        className="w-fit rounded border border-zinc-200 p-1 transition hover:border-zinc-300 hover:bg-zinc-50"
        aria-label={
          imageUrl
            ? `Ver o editar foto de ${productName}`
            : `Agregar foto a ${productName}`
        }
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={productName}
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 rounded object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-zinc-100 text-[10px] font-semibold text-zinc-500 uppercase">
            Sin foto
          </div>
        )}
      </button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetState();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0 sm:max-w-lg">
          <div className="space-y-4 p-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle>Foto de artículo</DialogTitle>
              <DialogDescription>
                {productName}
                {canEdit
                  ? '. Puedes verla más grande, elegir una foto o tomar una nueva.'
                  : '. Vista ampliada de la foto actual.'}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {showPlaceholder ? (
                <div className="flex aspect-square items-center justify-center px-6 text-center text-sm text-zinc-500">
                  Sin foto cargada.
                </div>
              ) : (
                <div className="flex items-center justify-center p-3">
                  <Image
                    src={previewUrl}
                    alt={productName}
                    width={960}
                    height={960}
                    unoptimized
                    className="max-h-[60vh] w-auto rounded-xl object-contain"
                  />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={async (event) => {
                await handleFile(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              capture="environment"
              className="hidden"
              onChange={async (event) => {
                await handleFile(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />

            {canEdit ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing || saving}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                  >
                    Seleccionar foto
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={processing || saving}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                  >
                    Tomar foto
                  </button>
                  {imageUrl || pendingDataUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveImage(true);
                        setPendingDataUrl('');
                        setPreviewUrl('');
                        setError('');
                        setNotice(null);
                      }}
                      disabled={processing || saving}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700"
                    >
                      Quitar foto
                    </button>
                  ) : null}
                </div>

                <p className="text-xs text-zinc-500">
                  La imagen se reduce y convierte a JPG comprimido para bajar el
                  impacto en almacenamiento y carga.
                </p>
              </div>
            ) : null}

            {processing ? (
              <p className="text-xs text-zinc-500">Procesando imagen...</p>
            ) : null}
            {error ? <p className="text-xs text-rose-700">{error}</p> : null}
            {notice ? (
              <p
                className={
                  notice.tone === 'error'
                    ? 'text-xs text-rose-700'
                    : 'text-xs text-emerald-700'
                }
              >
                {notice.message}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
              >
                Cerrar
              </button>
              {canEdit ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasPendingChanges || processing || saving}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {saving
                    ? 'Guardando...'
                    : removeImage
                      ? 'Guardar cambio'
                      : 'Guardar foto'}
                </button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
