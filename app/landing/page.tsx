import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NODUX | Operacion retail clara y controlada',
  description:
    'NODUX ayuda a tiendas retail a operar ventas, stock, vencimientos, compras y caja en una sola app.',
  openGraph: {
    title: 'NODUX | Operacion retail clara y controlada',
    description:
      'Ventas, stock, vencimientos, compras y caja para operar sin friccion.',
    url: '/landing',
    type: 'website',
  },
};

const coreModules = [
  {
    title: 'Ventas y Caja',
    description:
      'POS tactil, cierre operativo y conciliacion diaria por sucursal.',
  },
  {
    title: 'Stock y Vencimientos',
    description:
      'Control por sucursal con alertas para evitar quiebres y desperdicio.',
  },
  {
    title: 'Compras y Proveedores',
    description:
      'Pedidos, recepcion y pagos por proveedor con trazabilidad real.',
  },
];

export default function LandingPage() {
  const appLoginHref = 'https://app.nodux.app/login';

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 text-slate-900">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-14 md:pt-20">
        <header className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-[0.18em] text-orange-700">
            NODUX
          </p>
          <Link
            href={appLoginHref}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-slate-900 hover:text-slate-950"
          >
            Iniciar sesion
          </Link>
        </header>

        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
              Software operativo para retail
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              NODUX centraliza la operacion diaria de tu tienda en una sola
              app.
            </h1>
            <p className="max-w-xl text-base text-slate-700 md:text-lg">
              Vende rapido, controla stock real, evita quiebres y organiza
              compras sin hojas sueltas ni decisiones a ciegas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={appLoginHref}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Empezar ahora
              </Link>
              <Link
                href="/demo"
                className="rounded-full border border-amber-400 bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-200"
              >
                Ver demo publica
              </Link>
              <a
                href="mailto:hola@nodux.app?subject=Quiero%20una%20demo%20de%20NODUX"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-900"
              >
                Solicitar demo
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.16em] text-orange-700">
              PROBLEMA QUE RESUELVE
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>Stock desactualizado entre sucursales y venta.</li>
              <li>Pedidos y pagos a proveedores sin seguimiento claro.</li>
              <li>Caja diaria sin trazabilidad completa por metodo de cobro.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/80">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
          {coreModules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h2 className="text-lg font-semibold">{module.title}</h2>
              <p className="mt-2 text-sm text-slate-700">{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Hecho para operacion real, no para demo bonita.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
            NODUX prioriza procesos que mueven el negocio: ventas, caja, stock,
            vencimientos, compras y pagos. DB-first + RLS-first para control
            real de permisos y datos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={appLoginHref}
              className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              Ingresar a NODUX
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-orange-300 px-5 py-3 text-sm font-semibold text-orange-100 transition hover:border-orange-100"
            >
              Explorar demo
            </Link>
            <a
              href="mailto:hola@nodux.app?subject=Demo%20NODUX%20retail"
              className="rounded-full border border-slate-500 px-5 py-3 text-sm font-semibold transition hover:border-slate-300"
            >
              Hablar con ventas
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
