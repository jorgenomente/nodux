'use client';

import { useFormStatus } from 'react-dom';

export default function OnboardingFormPendingState() {
  const { pending } = useFormStatus();

  if (!pending) return null;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent"
        />
        <span>Procesando documento... Esto puede tardar unos segundos...</span>
      </div>
    </div>
  );
}
