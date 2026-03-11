'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  children: ReactNode;
  enabled: boolean;
};

export default function OrderDraftCreateFormClient({
  children,
  enabled,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDirty, setIsDirty] = useState(enabled);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    setIsDirty(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, isDirty]);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) return;
      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      setPendingHref(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      setShowLeaveModal(true);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [enabled, isDirty]);

  const closeModal = () => {
    setShowLeaveModal(false);
    setPendingHref(null);
  };

  const leaveWithoutSaving = () => {
    const nextHref = pendingHref;
    setIsDirty(false);
    closeModal();
    if (nextHref) {
      router.push(nextHref);
    }
  };

  const saveDraftAndLeave = () => {
    const form = containerRef.current?.querySelector<HTMLFormElement>(
      'form[data-order-draft-create-form="true"]',
    );
    if (!form) {
      leaveWithoutSaving();
      return;
    }

    const fallbackOrderAction = form.querySelector<HTMLInputElement>(
      'input[name="fallback_order_action"]',
    );
    if (fallbackOrderAction) {
      fallbackOrderAction.value = 'draft';
    }

    const redirectAfterSave = form.querySelector<HTMLInputElement>(
      'input[name="redirect_after_save"]',
    );
    if (redirectAfterSave && pendingHref) {
      redirectAfterSave.value = pendingHref;
    }

    setIsDirty(false);
    setShowLeaveModal(false);
    form.requestSubmit();
  };

  return (
    <div ref={containerRef}>
      {children}
      {showLeaveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-900">
              Se perderan los datos del pedido
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              ¿Te gustaria guardarlo como borrador antes de salir?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={leaveWithoutSaving}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                onClick={saveDraftAndLeave}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar borrador
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
