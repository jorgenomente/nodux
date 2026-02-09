import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

type CookieOptions = {
  path?: string;
  maxAge?: number;
  domain?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
};

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

const parseCookie = (name: string) => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[-.$?*|{}()\[\]\\/\+^]/g, '\\$&')}=([^;]*)`,
    ),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
};

const setCookie = (name: string, value: string, options?: CookieOptions) => {
  if (typeof document === 'undefined') return;
  const opts = options ?? {};
  let cookie = `${name}=${encodeURIComponent(value)}`;
  cookie += `; path=${opts.path ?? '/'}`;
  if (opts.maxAge) cookie += `; max-age=${opts.maxAge}`;
  if (opts.domain) cookie += `; domain=${opts.domain}`;
  if (opts.sameSite) {
    const sameSiteValue = opts.sameSite === true ? 'lax' : opts.sameSite;
    if (sameSiteValue) cookie += `; samesite=${sameSiteValue}`;
  }
  if (opts.secure) cookie += '; secure';
  document.cookie = cookie;
};

export const createBrowserSupabaseClient = () => {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  browserClient = createBrowserClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return parseCookie(name);
      },
      set(name, value, options) {
        setCookie(name, value, options);
      },
      remove(name, options) {
        setCookie(name, '', { ...options, maxAge: 0 });
      },
    },
  });

  return browserClient;
};
