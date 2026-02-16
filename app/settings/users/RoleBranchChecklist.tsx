'use client';

import { useState } from 'react';

type BranchOption = {
  branch_id: string;
  name: string;
};

type Props = {
  branches: BranchOption[];
  defaultRole?: 'staff' | 'org_admin';
  defaultSelectedBranchIds?: string[];
  roleName?: string;
  branchName?: string;
  roleLabel?: string;
  branchLabel?: string;
  wrapperClassName?: string;
};

export default function RoleBranchChecklist({
  branches,
  defaultRole = 'staff',
  defaultSelectedBranchIds = [],
  roleName = 'role',
  branchName = 'branch_ids',
  roleLabel = 'Rol',
  branchLabel = 'Sucursales para Staff (si aplica)',
  wrapperClassName = '',
}: Props) {
  const [role, setRole] = useState<'staff' | 'org_admin'>(defaultRole);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    defaultSelectedBranchIds,
  );

  const isStaff = role === 'staff';

  return (
    <div className={wrapperClassName}>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-600">
          {roleLabel}
        </label>
        <select
          name={roleName}
          value={role}
          onChange={(event) =>
            setRole(event.target.value as 'staff' | 'org_admin')
          }
          className="rounded border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="staff">Staff</option>
          <option value="org_admin">Org Admin</option>
        </select>
      </div>

      <div className={isStaff ? 'mt-3' : 'mt-3 hidden'}>
        <label className="text-xs font-semibold text-zinc-600">
          {branchLabel}
        </label>
        <div className="mt-1 grid gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-3">
          {branches.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No hay sucursales activas disponibles.
            </p>
          ) : (
            branches.map((branch) => {
              const checked = selectedBranches.includes(branch.branch_id);
              return (
                <label
                  key={`${roleName}-${branch.branch_id}`}
                  className="flex items-center gap-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    name={branchName}
                    value={branch.branch_id}
                    checked={checked}
                    onChange={(event) => {
                      setSelectedBranches((previous) => {
                        if (event.target.checked) {
                          if (previous.includes(branch.branch_id))
                            return previous;
                          return [...previous, branch.branch_id];
                        }
                        return previous.filter(
                          (value) => value !== branch.branch_id,
                        );
                      });
                    }}
                  />
                  {branch.name}
                </label>
              );
            })
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Check marcado = acceso habilitado a esa sucursal.
        </p>
      </div>

      {!isStaff ? (
        <p className="mt-3 text-xs text-zinc-500">
          Org Admin tiene acceso a todas las sucursales activas de la
          organización.
        </p>
      ) : null}
    </div>
  );
}
