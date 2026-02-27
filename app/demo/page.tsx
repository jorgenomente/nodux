import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Demo NODUX | Recorrido publico',
  description:
    'Recorrido publico de NODUX con ejemplos de dashboards, ventas, stock y compras usando datos ficticios.',
  openGraph: {
    title: 'Demo NODUX | Recorrido publico',
    description:
      'Conoce el flujo operativo de NODUX en un entorno de demostracion seguro y sin datos reales.',
    url: '/demo',
    type: 'website',
  },
};

const demoStats = [
  { label: 'Ventas hoy', value: '$ 1.248.400' },
  { label: 'Items vendidos', value: '386' },
  { label: 'Quiebres evitados', value: '12' },
  { label: 'Pedidos pendientes', value: '4' },
];

const demoModules = [
  {
    title: 'POS y Caja',
    description:
      'Cobro rapido, descuentos operativos y conciliacion de turno en el mismo flujo.',
  },
  {
    title: 'Stock y Vencimientos',
    description:
      'Control por sucursal con alertas accionables para faltantes y desperdicio.',
  },
  {
    title: 'Proveedores y Compras',
    description:
      'Pedidos, recepcion y pagos trazables sin depender de hojas externas.',
  },
];

type DemoPageProps = {
  searchParams: Promise<{ error?: string; readonly?: string }>;
};

const resolveNotice = (error: string | undefined, readonly: string | undefined) => {
  if (readonly === '1') {
    return 'Esta cuenta demo es solo lectura. Podes navegar todo, pero no guardar cambios.';
  }
  if (error === 'config_missing') {
    return 'Demo no disponible temporalmente. Falta configurar DEMO_LOGIN_EMAIL o DEMO_LOGIN_PASSWORD.';
  }
  if (error === 'login_failed') {
    return 'No pudimos iniciar la sesion demo en este momento. Intenta nuevamente.';
  }
  return null;
};

export default async function PublicDemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams;
  const appLoginHref = 'https://app.nodux.app/login';
  const appDemoEnterHref = 'https://app.nodux.app/demo/enter';
  const notice = resolveNotice(params.error, params.readonly);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/landing"
            className="text-xs font-semibold tracking-[0.2em] text-amber-300"
          >
            NODUX DEMO
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/landing"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Volver a landing
            </Link>
            <Link
              href={appLoginHref}
              className="rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Ingresar a la app
            </Link>
          </div>
        </header>

        <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7">
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Recorrido publico de NODUX
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
              Esta demo muestra el tipo de operacion que resuelve NODUX usando
              datos completamente ficticios. No requiere credenciales, no
              permite escribir datos y no comparte infraestructura productiva.
            </p>
            <div className="mt-5 rounded-2xl border border-emerald-700/50 bg-emerald-950/40 p-4 text-sm text-emerald-200">
              Entorno de demostracion seguro: solo lectura, datos anonimos y
              reinicio periodico.
            </div>
            {notice ? (
              <div className="mt-4 rounded-2xl border border-amber-500/60 bg-amber-100 p-4 text-sm text-amber-900">
                {notice}
              </div>
            ) : null}
            <form action={appDemoEnterHref} method="post" className="mt-5">
              <button
                type="submit"
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Probar demo interactiva
              </button>
            </form>
          </div>

          <div className="grid gap-3">
            {demoStats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-200">
                  {stat.value}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/60">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
          {demoModules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
            >
              <h2 className="text-lg font-semibold text-amber-100">
                {module.title}
              </h2>
              <p className="mt-2 text-sm text-slate-300">{module.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
