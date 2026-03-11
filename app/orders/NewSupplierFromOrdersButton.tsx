'use client';

import { createPortal } from 'react-dom';
import { useState } from 'react';

import SupplierCreateFormFields from '@/app/suppliers/SupplierCreateFormFields';
import {
  orderFrequencyOptions,
  weekdayOptions,
} from '@/app/suppliers/supplier-form-options';

type Props = {
  action: (formData: FormData) => Promise<void>;
  draftBranchId: string;
  draftMarginPct?: string;
  draftAvgMode?: string;
};

export default function NewSupplierFromOrdersButton({
  action,
  draftBranchId,
  draftMarginPct,
  draftAvgMode,
}: Props) {
  const [open, setOpen] = useState(false);

  const modalContent = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900">
            Nuevo proveedor
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-600">
          Este formulario reutiliza el mismo alta operativa de `/suppliers`.
        </p>

        <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="draft_branch_id" value={draftBranchId} />
          <input
            type="hidden"
            name="draft_margin_pct"
            value={draftMarginPct ?? ''}
          />
          <input
            type="hidden"
            name="draft_avg_mode"
            value={draftAvgMode ?? ''}
          />
          <SupplierCreateFormFields
            orderFrequencyOptions={orderFrequencyOptions}
            weekdayOptions={weekdayOptions}
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Crear proveedor
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
      >
        Nuevo proveedor
      </button>
      {modalContent && typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
