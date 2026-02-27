'use client';

import { useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus('Intentando iniciar sesion...');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Email o contraseña incorrectos.');
        setStatus('Error de credenciales.');
        return;
      }

      await supabase.auth.getSession();
      setStatus('Login OK. Redirigiendo...');
      window.location.href = '/';
    } catch (err) {
      setError('No pudimos iniciar sesion.');
      setStatus(`Error: ${err instanceof Error ? err.message : 'desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Accedé a tu organización para continuar.
        </p>
        <form action="/demo/enter" method="post" className="mt-3">
          <button
            type="submit"
            className="inline-flex text-xs font-semibold text-zinc-700 underline"
          >
            Probar demo interactiva
          </button>
        </form>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              {status}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-xs text-zinc-500 underline"
          disabled
        >
          Olvidé mi contraseña (opcional MVP)
        </button>
      </div>
    </div>
  );
}
