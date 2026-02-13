'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type BranchOption = {
  id: string;
  name: string;
};

type Props = {
  branches: BranchOption[];
  selectedBranchId: string;
  selectedStatus: string;
  selectedPeriod: string;
  selectedFrom: string;
  selectedTo: string;
};

export default function CalendarFiltersClient({
  branches,
  selectedBranchId,
  selectedStatus,
  selectedPeriod,
  selectedFrom,
  selectedTo,
}: Props) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(selectedBranchId);
  const [status, setStatus] = useState(selectedStatus);
  const [period, setPeriod] = useState(selectedPeriod);
  const [from, setFrom] = useState(selectedFrom);
  const [to, setTo] = useState(selectedTo);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (branchId) params.set('branch_id', branchId);
    if (status && status !== 'all') params.set('status', status);
    if (period) params.set('period', period);
    if (period === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    router.push(
      `/orders/calendar${params.toString() ? `?${params.toString()}` : ''}`,
    );
  };

  return (
    <form className="rounded-2xl bg-white p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-zinc-600">
          Sucursal
          <select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-zinc-600">
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="all">Todos</option>
            <option value="pending_send">Pendientes por enviar</option>
            <option value="pending_receive">Pendientes por recibir</option>
            <option value="controlled">Recibidos y controlados</option>
          </select>
        </label>

        <label className="text-sm text-zinc-600">
          Periodo
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="custom">Rango personalizado</option>
          </select>
        </label>

        {period === 'custom' ? (
          <>
            <label className="text-sm text-zinc-600">
              Desde
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              />
            </label>

            <label className="text-sm text-zinc-600">
              Hasta
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              />
            </label>
          </>
        ) : null}

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </div>
      </div>
    </form>
  );
}
