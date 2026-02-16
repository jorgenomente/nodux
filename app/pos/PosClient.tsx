'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type BranchOption = {
  id: string;
  name: string;
};

type ProductCatalogItem = {
  product_id: string;
  name: string;
  internal_code: string | null;
  barcode: string | null;
  sell_unit_type: 'unit' | 'weight' | 'bulk';
  uom: string;
  unit_price: number;
  stock_on_hand: number;
  is_active: boolean;
};

type CartItem = ProductCatalogItem & {
  quantity: number;
  quantityInput: string;
};

type SplitPaymentEntry = {
  payment_method: PaymentMethod;
  amountInput: string;
};

type Props = {
  orgId: string;
  role: 'org_admin' | 'staff';
  branches: BranchOption[];
  defaultBranchId: string | null;
  initialProducts: ProductCatalogItem[];
  specialOrder?: {
    specialOrderId: string | null;
    clientName: string | null;
    items: Array<{
      product_id: string;
      name: string;
      sell_unit_type: 'unit' | 'weight' | 'bulk';
      uom: string;
      unit_price: number;
      quantity: number;
    }>;
  };
  cashDiscount: {
    cash_discount_enabled: boolean;
    cash_discount_default_pct: number;
  };
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    value,
  );

const parseQuantity = (value: string) => {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatSellUnitType = (value: ProductCatalogItem['sell_unit_type']) => {
  if (value === 'unit') return 'Unidad';
  if (value === 'weight') return 'Peso';
  return 'Granel';
};

export default function PosClient({
  orgId,
  role,
  branches,
  defaultBranchId,
  initialProducts,
  specialOrder,
  cashDiscount,
}: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [activeBranchId, setActiveBranchId] = useState<string | ''>(
    defaultBranchId ?? '',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeTerm, setBarcodeTerm] = useState('');
  const [results, setResults] = useState<ProductCatalogItem[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!specialOrder?.specialOrderId) return [];
    return specialOrder.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        product_id: item.product_id,
        name: item.name,
        internal_code: null,
        barcode: null,
        sell_unit_type: item.sell_unit_type,
        uom: item.uom,
        unit_price: item.unit_price,
        stock_on_hand: 0,
        is_active: true,
        quantity: item.quantity,
        quantityInput: String(item.quantity),
      }));
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([
    { payment_method: 'cash', amountInput: '' },
    { payment_method: 'debit', amountInput: '' },
  ]);
  const [applyCashDiscount, setApplyCashDiscount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [specialOrderId, setSpecialOrderId] = useState<string | null>(
    specialOrder?.specialOrderId ?? null,
  );
  const [specialOrderClientName, setSpecialOrderClientName] = useState<
    string | null
  >(specialOrder?.clientName ?? null);
  const [closeSpecialOrder, setCloseSpecialOrder] = useState(true);
  const showSearchHint =
    searchTerm.trim().length > 0 && searchTerm.trim().length < 3;

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [cart],
  );
  const cashDiscountPct = Number(cashDiscount.cash_discount_default_pct ?? 0);
  const cashDiscountAmount = useMemo(() => {
    if (
      !cashDiscount.cash_discount_enabled ||
      paymentMethod !== 'cash' ||
      !applyCashDiscount
    ) {
      return 0;
    }
    return Math.round(((subtotal * cashDiscountPct) / 100) * 100) / 100;
  }, [
    applyCashDiscount,
    cashDiscount.cash_discount_enabled,
    cashDiscountPct,
    paymentMethod,
    subtotal,
  ]);
  const total = useMemo(
    () => Math.max(subtotal - cashDiscountAmount, 0),
    [cashDiscountAmount, subtotal],
  );
  const splitPaymentRows = useMemo(
    () =>
      splitPayments.map((payment) => ({
        payment_method: payment.payment_method,
        amount: Number(payment.amountInput),
        isValid:
          payment.amountInput.trim() !== '' &&
          Number.isFinite(Number(payment.amountInput)) &&
          Number(payment.amountInput) > 0,
      })),
    [splitPayments],
  );
  const splitPaymentsTotal = useMemo(
    () =>
      splitPaymentRows
        .filter((payment) => payment.isValid)
        .reduce((sum, payment) => sum + payment.amount, 0),
    [splitPaymentRows],
  );
  const splitRemaining = useMemo(
    () => Math.round((total - splitPaymentsTotal) * 100) / 100,
    [splitPaymentsTotal, total],
  );

  const hasInvalidQty = useMemo(
    () => cart.some((item) => item.quantity <= 0),
    [cart],
  );

  const hasInvalidSplit =
    isSplitPayment &&
    (splitPaymentRows.length === 0 ||
      splitPaymentRows.some((payment) => !payment.isValid) ||
      Math.abs(splitRemaining) > 0.009);

  const isCheckoutDisabled =
    cart.length === 0 || hasInvalidQty || hasInvalidSplit;
  const checkoutReason =
    cart.length === 0
      ? 'Agrega productos para cobrar.'
      : hasInvalidQty
        ? 'Corrige las cantidades para cobrar.'
        : hasInvalidSplit
          ? 'Completa pagos divididos y valida que sumen el total.'
          : '';

  const normalizeText = useCallback((value: string) => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }, []);

  const tokenize = useCallback(
    (value: string) =>
      normalizeText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    [normalizeText],
  );

  const loadProducts = useCallback(
    async (branchId: string, term?: string) => {
      if (!branchId) return;
      setLoading(true);
      setErrorMessage(null);

      let query = supabase
        .from('v_pos_product_catalog')
        .select(
          'product_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, stock_on_hand, is_active',
        )
        .eq('org_id', orgId)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name')
        .limit(20);

      const trimmed = term?.trim() ?? '';
      if (trimmed.length > 0 && trimmed.length < 3) {
        setResults([]);
        setLoading(false);
        return;
      }

      if (trimmed.length >= 3) {
        const tokens = tokenize(trimmed);
        tokens.forEach((token) => {
          query = query.or(
            `name.ilike.%${token}%,internal_code.ilike.%${token}%,barcode.ilike.%${token}%`,
          );
        });
      }

      const { data, error } = await query;
      if (error) {
        setErrorMessage('No pudimos cargar el catálogo.');
      } else {
        const tokens = trimmed.length >= 3 ? tokenize(trimmed) : [];
        const filtered = (data ?? []).filter((row) => {
          if (tokens.length === 0) return true;
          const haystack = normalizeText(
            `${row.name ?? ''} ${row.internal_code ?? ''} ${row.barcode ?? ''}`.trim(),
          );
          return tokens.every((token) => haystack.includes(token));
        });
        setResults(filtered as ProductCatalogItem[]);
      }
      setLoading(false);
    },
    [normalizeText, orgId, supabase, tokenize],
  );

  const addToCart = useCallback((product: ProductCatalogItem) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product_id === product.product_id,
      );
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.product_id
            ? {
                ...item,
                quantity: item.quantity + 1,
                quantityInput: String(item.quantity + 1),
              }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1, quantityInput: '1' }];
    });
  }, []);

  const scanBarcode = useCallback(async () => {
    if (!activeBranchId || !barcodeTerm.trim()) return;
    setLoading(true);
    setErrorMessage(null);

    const term = barcodeTerm.trim();
    const { data, error } = await supabase
      .from('v_pos_product_catalog')
      .select(
        'product_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, stock_on_hand, is_active',
      )
      .eq('org_id', orgId)
      .eq('branch_id', activeBranchId)
      .eq('is_active', true)
      .eq('barcode', term)
      .limit(1);

    if (error) {
      setErrorMessage('No pudimos buscar el producto.');
    } else if (!data || data.length === 0) {
      setErrorMessage('Producto no encontrado por código de barras.');
    } else {
      addToCart(data[0] as ProductCatalogItem);
      setBarcodeTerm('');
    }

    setLoading(false);
  }, [activeBranchId, addToCart, barcodeTerm, orgId, supabase]);

  const handleBranchChange = async (nextBranchId: string) => {
    setActiveBranchId(nextBranchId);
    if (nextBranchId) {
      await loadProducts(nextBranchId, searchTerm);
    } else {
      setResults([]);
    }
  };

  const updateQuantityInput = (productId: string, input: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const parsed = parseQuantity(input);
        return {
          ...item,
          quantityInput: input,
          quantity: parsed,
        };
      }),
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setIsSplitPayment(false);
    setSplitPayments([
      { payment_method: 'cash', amountInput: '' },
      { payment_method: 'debit', amountInput: '' },
    ]);
    setApplyCashDiscount(false);
    setSuccessMessage(null);
    setErrorMessage(null);
    setDebugMessage(null);
  };

  useEffect(() => {
    if (!activeBranchId) return;
    const handle = setTimeout(() => {
      loadProducts(activeBranchId, searchTerm);
    }, 300);
    return () => clearTimeout(handle);
  }, [activeBranchId, loadProducts, searchTerm]);

  const handleCheckout = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugMessage(null);

    if (!activeBranchId) {
      setErrorMessage('Selecciona una sucursal antes de cobrar.');
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('El carrito está vacío.');
      return;
    }

    if (hasInvalidQty) {
      setErrorMessage('La cantidad debe ser mayor que 0 para cobrar.');
      return;
    }

    if (isSplitPayment && hasInvalidSplit) {
      setErrorMessage(
        'Completa los pagos divididos con montos válidos y asegúrate de que la suma sea exacta.',
      );
      return;
    }

    const items = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    const paymentsPayload = isSplitPayment
      ? splitPaymentRows.map((payment) => ({
          payment_method: payment.payment_method,
          amount: payment.amount,
        }))
      : undefined;
    const summaryPaymentMethod = isSplitPayment
      ? paymentsPayload && paymentsPayload.length > 1
        ? 'mixed'
        : (paymentsPayload?.[0]?.payment_method ?? paymentMethod)
      : paymentMethod;

    const { data, error } = await supabase.rpc('rpc_create_sale', {
      p_org_id: orgId,
      p_branch_id: activeBranchId,
      p_payment_method: summaryPaymentMethod as unknown as PaymentMethod,
      p_items: items,
      p_special_order_id: specialOrderId ?? undefined,
      p_close_special_order: closeSpecialOrder,
      p_apply_cash_discount: !isSplitPayment && applyCashDiscount,
      p_cash_discount_pct:
        !isSplitPayment && applyCashDiscount ? cashDiscountPct : undefined,
      p_payments: paymentsPayload,
    });

    if (error) {
      const message = error.message.includes('insufficient stock')
        ? 'Stock insuficiente para completar la venta.'
        : error.message.includes('pos module disabled')
          ? 'El módulo POS está deshabilitado.'
          : error.message.includes('payments total must equal sale total')
            ? 'La suma de pagos debe coincidir con el total.'
            : error.message.includes('payments must be an array')
              ? 'Formato de pagos inválido.'
              : 'No pudimos registrar la venta.';
      setErrorMessage(message);
      setDebugMessage(
        process.env.NODE_ENV !== 'production'
          ? JSON.stringify(
              {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
              },
              null,
              2,
            )
          : null,
      );
      return;
    }

    const sale = Array.isArray(data) ? data[0] : data;
    const totalAmount = Number(sale?.total ?? total);

    setSuccessMessage(
      `Venta registrada. Total: ${formatCurrency(totalAmount)} (${isSplitPayment ? 'pago dividido' : paymentMethod}${!isSplitPayment && applyCashDiscount ? `, descuento ${cashDiscountPct}%` : ''}).`,
    );
    setCart([]);
    setIsSplitPayment(false);
    setSplitPayments([
      { payment_method: 'cash', amountInput: '' },
      { payment_method: 'debit', amountInput: '' },
    ]);
    setApplyCashDiscount(false);
    setSpecialOrderId(null);
    setSpecialOrderClientName(null);
    if (activeBranchId) {
      loadProducts(activeBranchId, searchTerm);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">POS</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {role === 'staff'
                ? 'Ventas rápidas para la sucursal activa.'
                : 'Operación y auditoría básica de ventas.'}
            </p>
          </div>
          <div className="min-w-[220px]">
            <label
              className="text-xs font-semibold text-zinc-600"
              htmlFor="branch"
            >
              Sucursal activa
            </label>
            <select
              id="branch"
              name="branch"
              value={activeBranchId}
              onChange={(event) => handleBranchChange(event.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {branches.length === 0 ? (
                <option value="">Sin sucursales</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        {specialOrderId ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div>
              Pedido especial en POS
              {specialOrderClientName
                ? ` · Cliente: ${specialOrderClientName}`
                : ''}
            </div>
            <label className="flex items-center gap-2 text-xs text-amber-800">
              <input
                type="checkbox"
                checked={closeSpecialOrder}
                onChange={(event) => setCloseSpecialOrder(event.target.checked)}
              />
              Cerrar pedido especial al cobrar
            </label>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="barcode"
              >
                Escanear código de barras
              </label>
              <div className="flex gap-2">
                <input
                  id="barcode"
                  value={barcodeTerm}
                  onChange={(event) => setBarcodeTerm(event.target.value)}
                  placeholder="Código de barras"
                  className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={scanBarcode}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="search"
              >
                Buscar producto
              </label>
              <div className="flex gap-2">
                <input
                  id="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nombre, SKU o barcode"
                  className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {loading && (
                <div className="text-sm text-zinc-500">Cargando...</div>
              )}
              {!loading && results.length === 0 && (
                <div className="text-sm text-zinc-500">
                  {showSearchHint
                    ? 'Escribi al menos 3 letras para buscar.'
                    : 'No hay productos para mostrar.'}
                </div>
              )}
              <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
                {results.map((product) => (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm transition hover:border-zinc-400"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900">
                        {product.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {product.internal_code ||
                          product.barcode ||
                          'Sin código'}{' '}
                        · {formatSellUnitType(product.sell_unit_type)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <div>{formatCurrency(product.unit_price)}</div>
                      <div>Stock: {product.stock_on_hand}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Carrito</h2>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Limpiar
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {cart.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  Escaneá o buscá un producto para empezar.
                </div>
              ) : (
                cart.map((item) => {
                  const isInvalidQty = item.quantity <= 0;
                  return (
                    <div
                      key={item.product_id}
                      className={`rounded-lg border p-3 ${
                        isInvalidQty
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-zinc-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-zinc-900">
                            {item.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatCurrency(item.unit_price)} · Stock{' '}
                            {item.stock_on_hand}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          className="text-xs text-red-500"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          min={item.sell_unit_type === 'unit' ? 1 : 0.01}
                          step={item.sell_unit_type === 'unit' ? 1 : 0.01}
                          value={item.quantityInput}
                          onChange={(event) =>
                            updateQuantityInput(
                              item.product_id,
                              event.target.value,
                            )
                          }
                          className={`w-24 rounded border px-2 py-1 text-sm ${
                            isInvalidQty
                              ? 'border-amber-300 bg-amber-100'
                              : 'border-zinc-200'
                          }`}
                          placeholder="0"
                        />
                        <span className="text-xs text-zinc-500">
                          {item.uom}
                        </span>
                        <span className="ml-auto text-sm font-semibold text-zinc-900">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                      {isInvalidQty && (
                        <div className="mt-2 text-xs text-amber-700">
                          Cantidad inválida. Debe ser mayor que 0.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="text-lg font-semibold text-zinc-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="mt-4">
                <label
                  className="text-xs font-semibold text-zinc-600"
                  htmlFor="paymentMethod"
                >
                  Método de pago
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isSplitPayment}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setIsSplitPayment(next);
                      if (next) {
                        setApplyCashDiscount(false);
                      }
                    }}
                  />
                  Pago dividido
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  disabled={isSplitPayment}
                  onChange={(event) => {
                    const nextMethod = event.target.value as PaymentMethod;
                    setPaymentMethod(nextMethod);
                    if (nextMethod !== 'cash') {
                      setApplyCashDiscount(false);
                    }
                  }}
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {isSplitPayment ? (
                <div className="mt-3 rounded-lg border border-zinc-200 p-3">
                  <div className="mb-2 text-xs font-semibold text-zinc-600">
                    Pagos
                  </div>
                  <div className="flex flex-col gap-2">
                    {splitPayments.map((payment, index) => (
                      <div
                        key={`${index}-${payment.payment_method}`}
                        className="flex gap-2"
                      >
                        <select
                          value={payment.payment_method}
                          onChange={(event) => {
                            const nextMethod = event.target
                              .value as PaymentMethod;
                            setSplitPayments((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, payment_method: nextMethod }
                                  : row,
                              ),
                            );
                          }}
                          className="w-40 rounded border border-zinc-200 px-2 py-2 text-sm"
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={payment.amountInput}
                          onChange={(event) =>
                            setSplitPayments((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, amountInput: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="Monto"
                          className="w-full rounded border border-zinc-200 px-2 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSplitPayments((prev) =>
                              prev.length <= 1
                                ? prev
                                : prev.filter(
                                    (_, rowIndex) => rowIndex !== index,
                                  ),
                            )
                          }
                          className="rounded border border-zinc-200 px-2 py-2 text-xs text-zinc-600"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSplitPayments((prev) => [
                        ...prev,
                        { payment_method: 'other', amountInput: '' },
                      ])
                    }
                    className="mt-2 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
                  >
                    Agregar pago
                  </button>
                  <div className="mt-2 text-xs text-zinc-600">
                    Pagado: {formatCurrency(splitPaymentsTotal)} · Restante:{' '}
                    {formatCurrency(splitRemaining)}
                  </div>
                </div>
              ) : null}

              {cashDiscount.cash_discount_enabled &&
              paymentMethod === 'cash' &&
              !isSplitPayment ? (
                <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={applyCashDiscount}
                    onChange={(event) =>
                      setApplyCashDiscount(event.target.checked)
                    }
                  />
                  Aplicar descuento efectivo ({cashDiscountPct}%)
                </label>
              ) : null}

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Descuento</span>
                <span className="font-semibold text-zinc-900">
                  {formatCurrency(cashDiscountAmount)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Total a cobrar</span>
                <span className="text-lg font-semibold text-zinc-900">
                  {formatCurrency(total)}
                </span>
              </div>

              {errorMessage && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}
              {debugMessage && (
                <pre className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs whitespace-pre-wrap text-red-700">
                  {debugMessage}
                </pre>
              )}
              {successMessage && (
                <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={isCheckoutDisabled}
                title={isCheckoutDisabled ? checkoutReason : ''}
                className={`mt-4 w-full rounded px-4 py-3 text-sm font-semibold text-white ${
                  isCheckoutDisabled
                    ? 'cursor-not-allowed bg-zinc-300'
                    : 'bg-zinc-900'
                }`}
              >
                Cobrar
              </button>
              {isCheckoutDisabled && checkoutReason && (
                <p className="mt-2 text-xs text-zinc-500">{checkoutReason}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
