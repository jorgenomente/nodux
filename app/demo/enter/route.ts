import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

const toDemoUrl = (request: NextRequest, reason: string) => {
  const url = new URL('/demo', request.url);
  url.searchParams.set('error', reason);
  return url;
};

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demoEmail = process.env.DEMO_LOGIN_EMAIL;
  const demoPassword = process.env.DEMO_LOGIN_PASSWORD;

  if (!url || !anonKey || !demoEmail || !demoPassword) {
    return NextResponse.redirect(toDemoUrl(request, 'config_missing'), 303);
  }

  const appUrl = new URL(request.url);
  appUrl.hostname = 'app.nodux.app';
  appUrl.pathname = '/';
  appUrl.search = '';
  appUrl.protocol = 'https:';
  appUrl.port = '';

  const response = NextResponse.redirect(appUrl, 303);

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  if (error) {
    return NextResponse.redirect(toDemoUrl(request, 'login_failed'), 303);
  }

  return response;
}
