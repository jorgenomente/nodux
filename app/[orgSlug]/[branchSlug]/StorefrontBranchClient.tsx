'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import {
  formatProductCategoryTags,
  productMatchesCategory,
} from '@/app/products/product-category-tags';

const normalizePhoneForWhatsApp = (value: string) =>
  value.replace(/[^\d]/g, '');

type StorefrontProduct = {
  product_id: string;
  product_name: string;
  unit_price: number;
  stock_on_hand: number;
  image_url: string | null;
  category_tags: string[];
  is_available: boolean;
};

type CheckoutState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  orderCode?: string;
  trackingToken?: string;
  whatsappMessage?: string;
};

type StorefrontBranchClientProps = {
  orgSlug: string;
  branchSlug: string;
  orgName: string;
  branchName: string;
  whatsappPhone: string | null;
  pickupInstructions: string | null;
  products: StorefrontProduct[];
};

export default function StorefrontBranchClient({
  orgSlug,
  branchSlug,
  orgName,
  branchName,
  whatsappPhone,
  pickupInstructions,
  products,
}: StorefrontBranchClientProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    status: 'idle',
    message: '',
  });

  const availableCategories = useMemo(() => {
    const tags = new Set<string>();
    products.forEach((product) => {
      product.category_tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        product.category_tags.some((tag) => tag.toLowerCase().includes(query));
      return (
        matchesQuery &&
        productMatchesCategory(product.category_tags, selectedCategory)
      );
    });
  }, [products, search, selectedCategory]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((item) => item.product_id === productId);
        if (!product || quantity <= 0) return null;
        return {
          ...product,
          quantity,
          lineTotal: Number(product.unit_price) * quantity,
        };
      })
      .filter(Boolean) as Array<
      StorefrontProduct & { quantity: number; lineTotal: number }
    >;
  }, [cart, products]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems],
  );

  const incrementItem = (product: StorefrontProduct) => {
    if (!product.is_available) return;
    setCart((previous) => {
      const current = previous[product.product_id] ?? 0;
      const maxStock = Math.max(0, Math.floor(Number(product.stock_on_hand)));
      const next = maxStock > 0 ? Math.min(current + 1, maxStock) : current + 1;
      return { ...previous, [product.product_id]: next };
    });
  };

  const decrementItem = (productId: string) => {
    setCart((previous) => {
      const current = previous[productId] ?? 0;
      if (current <= 1) {
        const next = { ...previous };
        delete next[productId];
        return next;
      }
      return { ...previous, [productId]: current - 1 };
    });
  };

  const whatsappHref = useMemo(() => {
    if (
      !checkoutState.trackingToken ||
      !whatsappPhone ||
      !checkoutState.whatsappMessage
    ) {
      return null;
    }
    const normalizedPhone = normalizePhoneForWhatsApp(whatsappPhone);
    if (!normalizedPhone) return null;

    const text = encodeURIComponent(checkoutState.whatsappMessage);

    return `https://wa.me/${normalizedPhone}?text=${text}`;
  }, [
    checkoutState.trackingToken,
    checkoutState.whatsappMessage,
    whatsappPhone,
  ]);

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (cartItems.length === 0) {
      setCheckoutState({
        status: 'error',
        message: 'Agrega al menos un producto antes de confirmar el pedido.',
      });
      return;
    }

    setCheckoutState({ status: 'loading', message: '' });

    const payload = {
      orgSlug,
      branchSlug,
      customerName,
      customerPhone,
      customerAddress,
      customerNotes,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    };

    const response = await fetch('/api/storefront/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as {
      error?: string;
      orderCode?: string;
      trackingToken?: string;
    };

    if (!response.ok || !body.orderCode || !body.trackingToken) {
      setCheckoutState({
        status: 'error',
        message:
          body.error ??
          'No pudimos crear tu pedido. Intenta nuevamente en unos minutos.',
      });
      return;
    }

    const trackingUrl = `${window.location.origin}/o/${body.trackingToken}`;
    const itemsSummary = cartItems
      .map(
        (item) =>
          `- ${item.product_name} x${item.quantity} ($${Number(item.lineTotal).toFixed(2)})`,
      )
      .join('\n');
    const whatsappMessage = [
      `Hola, te envio mi pedido ${body.orderCode}.`,
      `Tienda: ${orgName} - ${branchName}`,
      `Cliente: ${customerName}`,
      `WhatsApp: ${customerPhone}`,
      `Direccion: ${customerAddress}`,
      `Pago: Pago al retirar`,
      'Detalle:',
      itemsSummary,
      `Total: $${cartTotal.toFixed(2)}`,
      `Seguimiento: ${trackingUrl}`,
      customerNotes ? `Notas: ${customerNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    setCart({});
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerNotes('');
    setCheckoutState({
      status: 'success',
      message: 'Pedido creado correctamente.',
      orderCode: body.orderCode,
      trackingToken: body.trackingToken,
      whatsappMessage,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-50 text-slate-900">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 pt-8 pb-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm md:p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-orange-700 uppercase">
              {orgName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
              {branchName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Consulta precio y stock actualizado para pedir online con retiro
              en tienda.
            </p>
            {pickupInstructions ? (
              <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-slate-700">
                {pickupInstructions}
              </p>
            ) : null}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto"
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm ring-orange-200 transition outline-none focus:ring"
            />
            {availableCategories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    selectedCategory === ''
                      ? 'border-orange-600 bg-orange-600 text-white'
                      : 'border-orange-200 bg-orange-50 text-orange-700'
                  }`}
                >
                  Todas
                </button>
                {availableCategories.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedCategory(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      selectedCategory === tag
                        ? 'border-orange-600 bg-orange-600 text-white'
                        : 'border-orange-200 bg-orange-50 text-orange-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const quantityInCart = cart[product.product_id] ?? 0;
              const stockValue = Number(product.stock_on_hand);
              const stockLabel = Number.isFinite(stockValue)
                ? Math.max(0, Math.floor(stockValue)).toString()
                : '0';

              return (
                <article
                  key={product.product_id}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm"
                >
                  <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.product_name}
                        width={640}
                        height={480}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <h2 className="line-clamp-2 text-xs font-semibold text-slate-900">
                    {product.product_name}
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold text-orange-700">
                    ${Number(product.unit_price).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-600">Stock: {stockLabel}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatProductCategoryTags(product.category_tags) ||
                      'Sin categoria'}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => decrementItem(product.product_id)}
                      className="h-8 w-8 rounded-md border border-slate-300 text-base font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={quantityInCart === 0}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-semibold">
                      {quantityInCart}
                    </span>
                    <button
                      type="button"
                      onClick={() => incrementItem(product)}
                      className="h-8 w-8 rounded-md border border-orange-300 bg-orange-50 text-base font-semibold text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!product.is_available}
                    >
                      +
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold">Tu pedido</h2>
          {cartItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Aún no agregaste productos.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item.product_id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-slate-600">
                    {item.quantity} x ${Number(item.unit_price).toFixed(2)} = $
                    {item.lineTotal.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-sm font-semibold text-slate-800">
            Total: ${cartTotal.toFixed(2)}
          </p>

          <form onSubmit={handleCheckout} className="mt-4 space-y-3">
            <input
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm ring-orange-200 transition outline-none focus:ring"
            />
            <input
              required
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Tu teléfono"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm ring-orange-200 transition outline-none focus:ring"
            />
            <input
              required
              value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
              placeholder="Dirección"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm ring-orange-200 transition outline-none focus:ring"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Método de pago:{' '}
              <span className="font-semibold">Pagar al retirar</span>
            </div>
            <textarea
              value={customerNotes}
              onChange={(event) => setCustomerNotes(event.target.value)}
              placeholder="Notas para la tienda (opcional)"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm ring-orange-200 transition outline-none focus:ring"
            />
            <button
              type="submit"
              disabled={
                checkoutState.status === 'loading' || cartItems.length === 0
              }
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutState.status === 'loading'
                ? 'Enviando pedido...'
                : 'Confirmar pedido'}
            </button>
          </form>

          {checkoutState.status === 'error' ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {checkoutState.message}
            </p>
          ) : null}

          {checkoutState.status === 'success' && checkoutState.trackingToken ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
              <p className="font-semibold">
                Pedido {checkoutState.orderCode} creado.
              </p>
              <a
                href={`/o/${checkoutState.trackingToken}`}
                className="mt-1 inline-block font-semibold text-emerald-900 underline"
              >
                Ver seguimiento
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-3 inline-block font-semibold text-emerald-900 underline"
                >
                  Notificar a la tienda por WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
