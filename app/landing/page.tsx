import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NODUX | El sistema operativo de tu tienda',
  description:
    'NODUX conecta ventas, inventario, caja y compras para que tu tienda opere con control real.',
  openGraph: {
    title: 'NODUX | El sistema operativo de tu tienda',
    description:
      'Retail Operating System para duenos de tiendas que quieren control operativo real.',
    url: '/landing',
    type: 'website',
  },
};

const problemBlocks = [
  {
    title: 'Inventario que no coincide',
    description: 'Se vende una cosa y el stock muestra otra.',
  },
  {
    title: 'Vencimientos detectados tarde',
    description: 'El producto ya vencio cuando alguien lo revisa.',
  },
  {
    title: 'Pedidos improvisados',
    description: 'Se compra por intuicion y no por datos reales.',
  },
  {
    title: 'Cierres de caja confusos',
    description: 'Encontrar diferencias toma tiempo y energia.',
  },
  {
    title: 'Canal online desconectado',
    description: 'Se venden productos que ya no estan disponibles.',
  },
  {
    title: 'Falta de visibilidad multi-sucursal',
    description: 'No esta claro que pasa en cada tienda hoy.',
  },
];

const platformModules = [
  {
    title: 'Ventas + POS',
    description: 'Cobro rapido y trazable dentro del flujo operativo.',
  },
  {
    title: 'Inventario y vencimientos',
    description: 'Stock real por sucursal y alertas que se pueden actuar.',
  },
  {
    title: 'Caja auditable',
    description: 'Apertura, movimientos y cierre con control diario.',
  },
  {
    title: 'Compras y proveedores',
    description: 'Pedidos, recepcion y pagos en una sola operacion.',
  },
  {
    title: 'Control multi-sucursal',
    description: 'Visibilidad unificada para decidir sin adivinar.',
  },
  {
    title: 'Tienda online conectada',
    description: 'Catalogo por sucursal sincronizado con stock real.',
  },
];

const operatingBenefits = [
  'Menos productos vencidos.',
  'Menos quiebres y menos sobrestock.',
  'Compras basadas en datos.',
  'Caja con trazabilidad diaria.',
  'Mas control para el dueno del negocio.',
];

const systemFlow = [
  'Mercancia',
  'Inventario',
  'Ventas',
  'Caja',
  'Compras',
  'Pagos',
  'Reposicion',
];

const trustSignals = [
  'NODUX nacio desde operacion real de tiendas retail.',
  'Disenado para procesos diarios, no para reportes de fin de mes.',
  'Enfoque DB-first + RLS-first para control real de datos y accesos.',
];

const appLoginHref = 'https://app.nodux.app/login';
const demoMailHref =
  'mailto:hola@nodux.app?subject=Quiero%20una%20demo%20de%20NODUX';
const founderMailHref =
  'mailto:hola@nodux.app?subject=Quiero%20hablar%20con%20el%20fundador%20de%20NODUX';

function SectionTitle({
  eyebrow,
  title,
  description,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  inverse?: boolean;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6">
      <p
        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
          inverse ? 'text-cyan-300' : 'text-cyan-700'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`text-2xl font-semibold leading-tight md:text-3xl ${
          inverse ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`max-w-3xl text-sm md:text-base ${
            inverse ? 'text-slate-200' : 'text-slate-600'
          }`}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-900">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 md:pt-16">
        <header className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-[0.2em] text-slate-800">
            NODUX
          </p>
          <Link
            href={appLoginHref}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:border-slate-900"
          >
            Iniciar sesion
          </Link>
        </header>

        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
              Retail Operating System
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
              El sistema operativo de tu tienda.
            </h1>
            <p className="max-w-xl text-base text-slate-700 md:text-lg">
              Controla inventario, ventas, caja y compras desde un solo sistema
              disenado para la operacion real del retail.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={demoMailHref}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Solicitar demo
              </a>
              <Link
                href="/demo"
                className="rounded-full border border-cyan-300 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
              >
                Ver como funciona
              </Link>
              <Link
                href={appLoginHref}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-900"
              >
                Empezar ahora
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">
              Flujo operativo conectado
            </p>
            <ol className="mt-4 grid gap-2 text-sm text-slate-700">
              {systemFlow.map((item, index) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <SectionTitle
          eyebrow="Problema retail"
          title="Por que las tiendas pierden control cuando crecen"
          description="Cuando POS, Excel, WhatsApp y procesos manuales viven separados, la operacion se vuelve impredecible."
        />
        <div className="mx-auto mt-8 grid w-full max-w-5xl gap-4 px-6 md:grid-cols-3">
          {problemBlocks.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <SectionTitle
          eyebrow="Cambio de perspectiva"
          title="Las tiendas no necesitan otro POS. Necesitan un sistema operativo."
          description="NODUX conecta toda la operacion diaria para que la tienda funcione como un sistema, no como una coleccion de tareas sueltas."
          inverse
        />
        <div className="mx-auto mt-8 grid w-full max-w-5xl gap-4 px-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Antes
            </h3>
            <p className="mt-2 text-sm text-slate-200">
              Procesos manuales, datos fragmentados y decisiones por intuicion.
            </p>
          </article>
          <article className="rounded-2xl border border-cyan-700 bg-cyan-950/40 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Con NODUX
            </h3>
            <p className="mt-2 text-sm text-cyan-50">
              Operacion conectada, trazable y visible en tiempo real.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Resultado
            </h3>
            <p className="mt-2 text-sm text-slate-200">
              Menos perdidas invisibles y mas control para crecer.
            </p>
          </article>
        </div>
      </section>

      <section className="py-16">
        <SectionTitle
          eyebrow="Que hace NODUX"
          title="NODUX conecta toda la operacion de tu tienda"
          description="Ventas, inventario, caja, compras y canal online coordinados desde una sola plataforma operativa."
        />
        <div className="mx-auto mt-8 grid w-full max-w-5xl gap-4 px-6 md:grid-cols-2 lg:grid-cols-3">
          {platformModules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {module.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-cyan-50 py-16">
        <SectionTitle
          eyebrow="Comercio unificado"
          title="Tu tienda fisica tambien puede vender online"
          description="Cada sucursal puede tener su tienda online conectada al stock real para resolver un modelo BOPIS sin sumar complejidad operativa."
        />
        <div className="mx-auto mt-8 grid w-full max-w-5xl gap-3 px-6 text-sm text-slate-700 md:grid-cols-5">
          {['Cliente', 'Tienda online', 'Sucursal', 'Pedido listo', 'Retiro'].map(
            (step) => (
              <div
                key={step}
                className="rounded-xl border border-cyan-200 bg-white px-4 py-3 text-center font-medium"
              >
                {step}
              </div>
            ),
          )}
        </div>
      </section>

      <section className="py-16">
        <SectionTitle
          eyebrow="Beneficios operativos"
          title="La operacion deja de ser caotica y vuelve a ser visible"
        />
        <div className="mx-auto mt-6 w-full max-w-5xl px-6">
          <ul className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            {operatingBenefits.map((benefit) => (
              <li
                key={benefit}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-8">
        <SectionTitle
          eyebrow="Credibilidad"
          title="Producto construido desde problemas reales de tienda"
        />
        <div className="mx-auto mt-6 grid w-full max-w-5xl gap-3 px-6 md:grid-cols-3">
          {trustSignals.map((item) => (
            <p
              key={item}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-slate-950 p-8 text-white md:p-10">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Recupera el control de tu tienda.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
            Descubre como NODUX puede organizar la operacion completa de tu
            negocio y convertir datos operativos en decisiones claras.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={demoMailHref}
              className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Solicitar demo
            </a>
            <a
              href={founderMailHref}
              className="rounded-full border border-slate-500 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
            >
              Hablar con el fundador
            </a>
            <Link
              href="/demo"
              className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100"
            >
              Ver demo publica
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
