'use client';

import { useMemo, useState } from 'react';

export default function OpenCashSessionMetaFields() {
  const [periodType, setPeriodType] = useState<'shift' | 'day'>('shift');
  const [shiftLabel, setShiftLabel] = useState<'AM' | 'PM'>('AM');

  const sessionLabel = useMemo(
    () => (periodType === 'shift' ? shiftLabel : ''),
    [periodType, shiftLabel],
  );

  return (
    <div className="grid gap-4">
      <label className="text-sm text-zinc-700 md:max-w-sm">
        Tipo
        <select
          name="period_type"
          value={periodType}
          onChange={(event) =>
            setPeriodType(event.target.value === 'day' ? 'day' : 'shift')
          }
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="shift">Turno</option>
          <option value="day">Dia</option>
        </select>
      </label>

      {periodType === 'shift' ? (
        <label className="text-sm text-zinc-700 md:max-w-sm">
          Turno
          <select
            name="shift_label"
            value={shiftLabel}
            onChange={(event) =>
              setShiftLabel(event.target.value === 'PM' ? 'PM' : 'AM')
            }
            className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
      ) : null}

      <input type="hidden" name="session_label" value={sessionLabel} />

      <label className="text-sm text-zinc-700 md:max-w-sm">
        Responsable de apertura
        <input
          name="opened_controlled_by_name"
          placeholder="Nombre y apellido"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
          required
        />
      </label>
    </div>
  );
}
