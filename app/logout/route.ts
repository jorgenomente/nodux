import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

const buildSupabaseFromRequest = async () => {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  return supabase;
};

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: Request) {
  const supabase = await buildSupabaseFromRequest();
  if (!supabase) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', request.url));
}
