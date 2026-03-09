'use client';

import Link from 'next/link';
import { useState } from 'react';

type NavLink = {
  href: string;
  label: string;
};

type NavGroup = {
  label: string;
  links: NavLink[];
};

type TopBarNavProps = {
  groupedNav: NavGroup[];
};

export default function TopBarNav({ groupedNav }: TopBarNavProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
      {groupedNav.map((group) =>
        group.links.length === 1 ? (
          <Link
            key={group.label}
            href={group.links[0].href}
            className="rounded border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => setOpenGroup(null)}
          >
            {group.label}
          </Link>
        ) : (
          <div key={group.label} className="relative">
            <button
              type="button"
              className="cursor-pointer rounded border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={() =>
                setOpenGroup((current) =>
                  current === group.label ? null : group.label,
                )
              }
            >
              {group.label}
            </button>
            {openGroup === group.label ? (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                    onClick={() => setOpenGroup(null)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ),
      )}
    </nav>
  );
}
