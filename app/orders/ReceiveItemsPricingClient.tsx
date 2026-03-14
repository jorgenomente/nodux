'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';

import { formatProductCategoryTags } from '@/app/products/product-category-tags';

type ReceiveItem = {
  order_item_id: string;
  product_id: string;
  product_name: string | null;
  category_tags: string[];
  default_brand: string;
  default_shelf_life_days: string;
  purchase_by_pack: boolean;
  units_per_pack: number | null;
  ordered_qty: number;
  default_received_qty: number;
  default_unit_cost: number;
  suggested_unit_cost: number;
  default_unit_price: number;
  markup_pct: number;
};

type Props = {
  items: ReceiveItem[];
  brandSuggestions?: string[];
  categoryTagSuggestions?: string[];
  disableQtyEditing?: boolean;
  defaultApplyTax?: boolean;
  defaultTaxPct?: number;
  defaultApplyDiscount?: boolean;
  defaultDiscountAmount?: number;
  helperSlot?: ReactNode;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatPackageHint = ({
  qty,
  purchaseByPack,
  unitsPerPack,
}: {
  qty: number;
  purchaseByPack: boolean;
  unitsPerPack: number | null;
}) => {
  if (!purchaseByPack || !unitsPerPack || unitsPerPack <= 1) return null;
  const safeQty = Number.isFinite(qty) ? Math.max(0, qty) : 0;
  const packages = Math.ceil(safeQty / unitsPerPack);
  return `${packages} paquete${packages === 1 ? '' : 's'} (x${unitsPerPack})`;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDateInputValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';
  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10);
};

const computeShelfLifeDays = (receivedAt: string, expiryDate: string) => {
  const receivedDateValue = toDateInputValue(receivedAt);
  if (!receivedDateValue || !expiryDate) return '';
  const receivedDate = new Date(`${receivedDateValue}T00:00:00`);
  const exactExpiryDate = new Date(`${expiryDate}T00:00:00`);
  if (
    Number.isNaN(receivedDate.getTime()) ||
    Number.isNaN(exactExpiryDate.getTime())
  ) {
    return '';
  }
  const diffDays = Math.round(
    (exactExpiryDate.getTime() - receivedDate.getTime()) / DAY_IN_MS,
  );
  return String(Math.max(diffDays, 0));
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);

export default function ReceiveItemsPricingClient({
  items,
  brandSuggestions = [],
  categoryTagSuggestions = [],
  disableQtyEditing = false,
  defaultApplyTax = false,
  defaultTaxPct = 21,
  defaultApplyDiscount = false,
  defaultDiscountAmount = 0,
  helperSlot,
}: Props) {
  const brandSuggestionsListId = useId();
  const categorySuggestionsListId = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'rows' | 'cards'>('cards');
  const [receivedAtValue, setReceivedAtValue] = useState('');
  const [receivedQtyByItem, setReceivedQtyByItem] = useState<
    Record<string, string>
  >(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = String(item.default_received_qty);
    });
    return next;
  });
  const [unitCostByItem, setUnitCostByItem] = useState<Record<string, string>>(
    () => {
      const next: Record<string, string> = {};
      items.forEach((item) => {
        next[item.order_item_id] = Number(item.default_unit_cost).toFixed(2);
      });
      return next;
    },
  );
  const [applyTax, setApplyTax] = useState(defaultApplyTax);
  const [taxPct, setTaxPct] = useState(String(defaultTaxPct));
  const [applyDiscount, setApplyDiscount] = useState(defaultApplyDiscount);
  const [discountAmount, setDiscountAmount] = useState(
    Number(defaultDiscountAmount).toFixed(2),
  );
  const [unitPriceByItem, setUnitPriceByItem] = useState<
    Record<string, string>
  >(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = Number(item.default_unit_price).toFixed(2);
    });
    return next;
  });
  const [categoryTagsByItem, setCategoryTagsByItem] = useState<
    Record<string, string>
  >(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = formatProductCategoryTags(item.category_tags);
    });
    return next;
  });
  const [brandByItem, setBrandByItem] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = item.default_brand ?? '';
    });
    return next;
  });
  const [shelfLifeDaysByItem, setShelfLifeDaysByItem] = useState<
    Record<string, string>
  >(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = item.default_shelf_life_days ?? '';
    });
    return next;
  });
  const [exactExpiryDateByItem, setExactExpiryDateByItem] = useState<
    Record<string, string>
  >(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = '';
    });
    return next;
  });
  const normalizedBrandCatalog = brandSuggestions
    .map((brand) => ({
      raw: brand,
      normalized: normalizeText(brand),
      tokens: tokenize(brand),
    }))
    .filter((brand) => brand.normalized);
  const normalizedCategoryCatalog = categoryTagSuggestions
    .map((tag) => {
      const normalized = normalizeText(tag.replace(/^#/, '')).replace(
        /\s+/g,
        '',
      );
      return {
        raw: normalized ? `#${normalized}` : '',
        normalized: normalized ? `#${normalized}` : '',
      };
    })
    .filter((tag) => tag.normalized);

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[name="received_at"]',
    );
    if (!input) return;

    const syncReceivedAt = () => {
      const nextReceivedAtValue = input.value;
      setReceivedAtValue(nextReceivedAtValue);
      setShelfLifeDaysByItem((prev) => {
        const next = { ...prev };
        let changed = false;
        items.forEach((item) => {
          const exactDate = exactExpiryDateByItem[item.order_item_id] ?? '';
          if (!exactDate) return;
          const computed = computeShelfLifeDays(nextReceivedAtValue, exactDate);
          if (next[item.order_item_id] !== computed) {
            next[item.order_item_id] = computed;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    syncReceivedAt();
    input.addEventListener('input', syncReceivedAt);
    input.addEventListener('change', syncReceivedAt);

    return () => {
      input.removeEventListener('input', syncReceivedAt);
      input.removeEventListener('change', syncReceivedAt);
    };
  }, [exactExpiryDateByItem, items]);

  const totals = (() => {
    const subtotalWithoutTax = items.reduce((total, item) => {
      const qtyRaw = receivedQtyByItem[item.order_item_id] ?? '0';
      const unitCostRaw = unitCostByItem[item.order_item_id] ?? '0';
      const qty = qtyRaw === '' ? 0 : Number(qtyRaw);
      const unitCost = unitCostRaw === '' ? 0 : Number(unitCostRaw);
      if (!Number.isFinite(qty) || !Number.isFinite(unitCost)) return total;
      return total + qty * unitCost;
    }, 0);
    const taxPctValue = taxPct === '' ? 0 : Number(taxPct);
    const taxAmount =
      applyTax && Number.isFinite(taxPctValue) && taxPctValue > 0
        ? (subtotalWithoutTax * taxPctValue) / 100
        : 0;
    const subtotalWithTax = subtotalWithoutTax + taxAmount;
    const discountValue = discountAmount === '' ? 0 : Number(discountAmount);
    const safeDiscount =
      applyDiscount && Number.isFinite(discountValue) && discountValue > 0
        ? discountValue
        : 0;
    const totalInvoice = Math.max(subtotalWithTax - safeDiscount, 0);
    return {
      subtotalWithoutTax,
      taxAmount,
      subtotalWithTax,
      discountAmount: safeDiscount,
      totalInvoice,
    };
  })();

  const filteredItems = (() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    const tokens = query.split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const name = (item.product_name ?? '').toLowerCase();
      return tokens.every((token) => name.includes(token));
    });
  })();

  const getBrandSuggestionsLabel = (value: string) => {
    const normalizedBrandValue = normalizeText(value);
    const brandTokens = tokenize(value);
    if (!normalizedBrandValue || brandTokens.length === 0) return null;

    const exactBrandMatch =
      normalizedBrandCatalog.find(
        (brand) => brand.normalized === normalizedBrandValue,
      ) ?? null;
    if (exactBrandMatch) {
      return (
        <span className="mt-1 block text-[11px] text-amber-700">
          Marca ya existente: <strong>{exactBrandMatch.raw}</strong>.
        </span>
      );
    }

    const similarBrands = normalizedBrandCatalog
      .map((brand) => {
        const intersection = brandTokens.filter((token) =>
          brand.tokens.includes(token),
        ).length;
        const union = new Set([...brandTokens, ...brand.tokens]).size;
        const jaccard = union === 0 ? 0 : intersection / union;
        const contains =
          brand.normalized.includes(normalizedBrandValue) ||
          normalizedBrandValue.includes(brand.normalized);
        const score = jaccard + (contains ? 0.6 : 0);
        return { raw: brand.raw, score };
      })
      .filter(
        (brand) =>
          brand.score >= 0.65 &&
          normalizeText(brand.raw) !== normalizedBrandValue,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((brand) => brand.raw);

    if (similarBrands.length === 0) return null;

    return (
      <span className="mt-1 block text-[11px] text-amber-700">
        Marcas parecidas: {similarBrands.join(' · ')}
      </span>
    );
  };

  const getCategorySuggestionsLabel = (value: string) => {
    const tokens = value
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const lastToken = tokens.at(-1) ?? '';
    const activeCategoryToken = lastToken
      ? `#${normalizeText(lastToken.replace(/^#/, '')).replace(/\s+/g, '')}`
      : '';
    if (!activeCategoryToken) return null;

    const exactCategoryMatch =
      normalizedCategoryCatalog.find(
        (tag) => tag.normalized === activeCategoryToken,
      ) ?? null;
    if (exactCategoryMatch) {
      return (
        <span className="mt-1 block text-[11px] text-amber-700">
          Categoria ya existente: <strong>{exactCategoryMatch.raw}</strong>.
        </span>
      );
    }

    const similarCategories = normalizedCategoryCatalog
      .filter(
        (tag) =>
          tag.normalized !== activeCategoryToken &&
          (tag.normalized.includes(activeCategoryToken) ||
            activeCategoryToken.includes(tag.normalized)),
      )
      .slice(0, 6)
      .map((tag) => tag.raw);

    if (similarCategories.length === 0) return null;

    return (
      <span className="mt-1 block text-[11px] text-amber-700">
        Categorias parecidas: {similarCategories.join(' · ')}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm text-zinc-600">
        Buscar artículo
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Ej: leche descremada"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm md:max-w-sm"
        />
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Vista</span>
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={`rounded border px-2 py-1 text-xs ${
            viewMode === 'cards'
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 text-zinc-700'
          }`}
        >
          Tarjetas
        </button>
        <button
          type="button"
          onClick={() => setViewMode('rows')}
          className={`rounded border px-2 py-1 text-xs ${
            viewMode === 'rows'
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 text-zinc-700'
          }`}
        >
          Filas
        </button>
      </div>
      <div className="space-y-2">
        {viewMode === 'rows'
          ? filteredItems.map((item) => (
              <div
                key={item.order_item_id}
                className="rounded border border-zinc-200 p-3"
              >
                <div className="grid gap-2 md:grid-cols-8">
                  <div className="text-sm text-zinc-700">
                    {item.product_name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Ordenado: {item.ordered_qty}
                  </div>
                  <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
                    <label className="text-xs text-zinc-600">
                      Cantidad recibida
                      <input
                        name={`received_${item.order_item_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={receivedQtyByItem[item.order_item_id] ?? '0'}
                        onChange={(event) =>
                          setReceivedQtyByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        readOnly={disableQtyEditing}
                        aria-disabled={disableQtyEditing}
                        className={`mt-1 w-full rounded border px-2 py-1 text-sm ${
                          disableQtyEditing
                            ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                            : 'border-zinc-200'
                        }`}
                      />
                      {formatPackageHint({
                        qty: Number(
                          receivedQtyByItem[item.order_item_id] ??
                            item.default_received_qty,
                        ),
                        purchaseByPack: item.purchase_by_pack,
                        unitsPerPack: item.units_per_pack,
                      }) ? (
                        <span className="mt-1 block text-[11px] text-zinc-500">
                          Equivale a{' '}
                          {formatPackageHint({
                            qty: Number(
                              receivedQtyByItem[item.order_item_id] ??
                                item.default_received_qty,
                            ),
                            purchaseByPack: item.purchase_by_pack,
                            unitsPerPack: item.units_per_pack,
                          })}
                        </span>
                      ) : null}
                    </label>
                    <label className="text-xs text-zinc-600">
                      Precio proveedor (unitario)
                      <input
                        name={`unit_cost_${item.order_item_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitCostByItem[item.order_item_id] ?? '0'}
                        onChange={(event) =>
                          setUnitCostByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <label className="rounded bg-zinc-100 p-2 text-xs text-zinc-700">
                    Precio venta (unitario)
                    <input
                      name={`unit_price_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitPriceByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setUnitPriceByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-zinc-500">
                      Sugerido:{' '}
                      {(
                        (Number(unitCostByItem[item.order_item_id] ?? 0) || 0) *
                        (1 + item.markup_pct / 100)
                      ).toFixed(2)}{' '}
                      ({item.markup_pct.toFixed(2)}%)
                    </span>
                  </label>
                  <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
                    <label className="text-xs text-zinc-600">
                      Marca
                      <input
                        name={`brand_${item.order_item_id}`}
                        type="text"
                        value={brandByItem[item.order_item_id] ?? ''}
                        onChange={(event) =>
                          setBrandByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        placeholder="Ej: La Virginia"
                        list={brandSuggestionsListId}
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      {getBrandSuggestionsLabel(
                        brandByItem[item.order_item_id] ?? '',
                      )}
                    </label>
                    <label className="text-xs text-zinc-600">
                      Categoria
                      <input
                        name={`category_tags_${item.order_item_id}`}
                        type="text"
                        value={categoryTagsByItem[item.order_item_id] ?? ''}
                        onChange={(event) =>
                          setCategoryTagsByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        placeholder="#keto #fitness"
                        list={categorySuggestionsListId}
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      {getCategorySuggestionsLabel(
                        categoryTagsByItem[item.order_item_id] ?? '',
                      )}
                    </label>
                  </div>
                  <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
                    <label className="text-xs text-zinc-600">
                      Vencimiento aproximado (dias)
                      <input
                        name={`shelf_life_days_${item.order_item_id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={shelfLifeDaysByItem[item.order_item_id] ?? ''}
                        onChange={(event) =>
                          setShelfLifeDaysByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        placeholder="Ej: 30"
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-zinc-600">
                      Fecha exacta de vencimiento
                      <input
                        name={`exact_expiry_date_${item.order_item_id}`}
                        type="date"
                        value={exactExpiryDateByItem[item.order_item_id] ?? ''}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setExactExpiryDateByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: nextDate,
                          }));
                          setShelfLifeDaysByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: computeShelfLifeDays(
                              receivedAtValue,
                              nextDate,
                            ),
                          }));
                        }}
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      <span className="mt-1 block text-[11px] text-zinc-500">
                        Opcional. Si la completas, calcula el vencimiento
                        aproximado con más precisión desde la recepción.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ))
          : filteredItems.map((item) => (
              <div
                key={item.order_item_id}
                className="rounded-lg border border-zinc-200 p-3"
              >
                <p className="text-sm font-semibold text-zinc-800">
                  {item.product_name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ordenado: {item.ordered_qty}
                </p>
                <div className="mt-3 grid gap-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-xs text-zinc-600">
                      Cantidad recibida
                      <input
                        name={`received_${item.order_item_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={receivedQtyByItem[item.order_item_id] ?? '0'}
                        onChange={(event) =>
                          setReceivedQtyByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        readOnly={disableQtyEditing}
                        aria-disabled={disableQtyEditing}
                        className={`mt-1 w-full rounded border px-2 py-1 text-sm ${
                          disableQtyEditing
                            ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                            : 'border-zinc-200'
                        }`}
                      />
                      {formatPackageHint({
                        qty: Number(
                          receivedQtyByItem[item.order_item_id] ??
                            item.default_received_qty,
                        ),
                        purchaseByPack: item.purchase_by_pack,
                        unitsPerPack: item.units_per_pack,
                      }) ? (
                        <span className="mt-1 block text-[11px] text-zinc-500">
                          Equivale a{' '}
                          {formatPackageHint({
                            qty: Number(
                              receivedQtyByItem[item.order_item_id] ??
                                item.default_received_qty,
                            ),
                            purchaseByPack: item.purchase_by_pack,
                            unitsPerPack: item.units_per_pack,
                          })}
                        </span>
                      ) : null}
                    </label>
                    <label className="text-xs text-zinc-600">
                      Precio proveedor (unitario)
                      <input
                        name={`unit_cost_${item.order_item_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitCostByItem[item.order_item_id] ?? '0'}
                        onChange={(event) =>
                          setUnitCostByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <label className="rounded bg-zinc-100 p-2 text-xs text-zinc-700">
                    Precio venta (unitario)
                    <input
                      name={`unit_price_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitPriceByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setUnitPriceByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-zinc-500">
                      Sugerido:{' '}
                      {(
                        (Number(unitCostByItem[item.order_item_id] ?? 0) || 0) *
                        (1 + item.markup_pct / 100)
                      ).toFixed(2)}{' '}
                      ({item.markup_pct.toFixed(2)}%)
                    </span>
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-xs text-zinc-600">
                      Marca
                      <input
                        name={`brand_${item.order_item_id}`}
                        type="text"
                        value={brandByItem[item.order_item_id] ?? ''}
                        onChange={(event) =>
                          setBrandByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        placeholder="Ej: La Virginia"
                        list={brandSuggestionsListId}
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      {getBrandSuggestionsLabel(
                        brandByItem[item.order_item_id] ?? '',
                      )}
                    </label>
                    <label className="text-xs text-zinc-600">
                      Categoria
                      <input
                        name={`category_tags_${item.order_item_id}`}
                        type="text"
                        value={categoryTagsByItem[item.order_item_id] ?? ''}
                        onChange={(event) =>
                          setCategoryTagsByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        placeholder="#keto #fitness"
                        list={categorySuggestionsListId}
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      {getCategorySuggestionsLabel(
                        categoryTagsByItem[item.order_item_id] ?? '',
                      )}
                    </label>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-xs text-zinc-600">
                      Vencimiento aproximado (dias)
                      <input
                        name={`shelf_life_days_${item.order_item_id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={shelfLifeDaysByItem[item.order_item_id] ?? ''}
                        onChange={(event) =>
                          setShelfLifeDaysByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: event.target.value,
                          }))
                        }
                        placeholder="Ej: 30"
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-zinc-600">
                      Fecha exacta de vencimiento
                      <input
                        name={`exact_expiry_date_${item.order_item_id}`}
                        type="date"
                        value={exactExpiryDateByItem[item.order_item_id] ?? ''}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setExactExpiryDateByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: nextDate,
                          }));
                          setShelfLifeDaysByItem((prev) => ({
                            ...prev,
                            [item.order_item_id]: computeShelfLifeDays(
                              receivedAtValue,
                              nextDate,
                            ),
                          }));
                        }}
                        className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      <span className="mt-1 block text-[11px] text-zinc-500">
                        Opcional. Si la completas, calcula el vencimiento
                        aproximado con más precisión desde la recepción.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
        {filteredItems.length === 0 ? (
          <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
            No se encontraron artículos con ese filtro.
          </div>
        ) : null}
      </div>
      {brandSuggestions.length > 0 ? (
        <datalist id={brandSuggestionsListId}>
          {brandSuggestions.map((brand) => (
            <option key={brand} value={brand} />
          ))}
        </datalist>
      ) : null}
      {categoryTagSuggestions.length > 0 ? (
        <datalist id={categorySuggestionsListId}>
          {categoryTagSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      ) : null}
      <p className="text-xs text-zinc-500">
        *PRECIO VENTA (UNITARIO): Este sera el precio de venta en el sistema.
      </p>
      {helperSlot}

      <div className="rounded border border-zinc-200 p-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="apply_tax"
                checked={applyTax}
                onChange={(event) => setApplyTax(event.target.checked)}
                value="1"
                className="h-4 w-4 rounded border-zinc-300"
              />
              Aplicar IVA
            </label>
            <label className="flex items-center gap-2 text-zinc-600">
              <span>% IVA</span>
              <input
                type="number"
                name="tax_pct"
                min="0"
                step="0.01"
                value={taxPct}
                onChange={(event) => setTaxPct(event.target.value)}
                disabled={!applyTax}
                className="w-24 rounded border border-zinc-200 px-2 py-1 text-xs disabled:bg-zinc-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="apply_discount"
                checked={applyDiscount}
                onChange={(event) => setApplyDiscount(event.target.checked)}
                value="1"
                className="h-4 w-4 rounded border-zinc-300"
              />
              Aplicar descuento
            </label>
            <label className="flex items-center gap-2 text-zinc-600">
              <span>Monto descuento (ARS)</span>
              <input
                type="number"
                name="discount_amount"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                disabled={!applyDiscount}
                className="w-28 rounded border border-zinc-200 px-2 py-1 text-xs disabled:bg-zinc-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:max-w-lg">
          <div className="flex items-center justify-between">
            <span>Subtotal sin IVA</span>
            <span>{formatCurrency(totals.subtotalWithoutTax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>IVA</span>
            <span>{formatCurrency(totals.taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal con IVA</span>
            <span>{formatCurrency(totals.subtotalWithTax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Descuento</span>
            <span>-{formatCurrency(totals.discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
            <span>Total remito/factura</span>
            <span>{formatCurrency(totals.totalInvoice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
