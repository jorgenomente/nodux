'use client';

import { createPortal } from 'react-dom';
import { type FormEvent, useId, useMemo, useState } from 'react';

import AmountInputAR from '@/app/components/AmountInputAR';

type ExistingProductOption = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  internalCode: string | null;
  supplierProductName: string | null;
  currentRelationType: 'primary' | 'secondary' | null;
};

type Props = {
  supplierName: string;
  products: ExistingProductOption[];
  productNameSuggestions?: Array<{
    product_id: string;
    name: string;
    brand?: string | null;
    barcode?: string | null;
    internal_code?: string | null;
    is_active?: boolean;
  }>;
  brandSuggestions?: string[];
  categoryTagSuggestions?: string[];
  currentOrderProductIds: string[];
  onAddExistingProducts: (formData: FormData) => Promise<void>;
  onCreateProduct: (formData: FormData) => Promise<void>;
};

type SelectedProductState = {
  supplierRelation: 'none' | 'primary' | 'secondary';
  supplierProductName: string;
  supplierSku: string;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const relationOptions = [
  { value: 'none', label: 'No asignar proveedor' },
  { value: 'primary', label: 'Asignar como proveedor primario' },
  { value: 'secondary', label: 'Asignar como proveedor secundario' },
] as const;

export default function ReceiveOrderAddProductsButton({
  supplierName,
  products,
  productNameSuggestions = [],
  brandSuggestions = [],
  categoryTagSuggestions = [],
  currentOrderProductIds,
  onAddExistingProducts,
  onCreateProduct,
}: Props) {
  const productSuggestionsListId = useId();
  const brandSuggestionsListId = useId();
  const categorySuggestionsListId = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [brandValue, setBrandValue] = useState('');
  const [categoryTagsValue, setCategoryTagsValue] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<
    Record<string, SelectedProductState>
  >({});
  const [isAddingExisting, setIsAddingExisting] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [purchaseByPack, setPurchaseByPack] = useState(false);
  const [shelfLifeNoApplies, setShelfLifeNoApplies] = useState(false);

  const availableProducts = useMemo(() => {
    const excluded = new Set(currentOrderProductIds);
    const queryTokens = normalizeText(searchQuery)
      .split(' ')
      .map((token) => token.trim())
      .filter(Boolean);
    return products.filter((product) => {
      if (excluded.has(product.id)) return false;
      if (queryTokens.length === 0) return true;
      const haystack = normalizeText(
        [
          product.name,
          product.brand ?? '',
          product.barcode ?? '',
          product.internalCode ?? '',
          product.supplierProductName ?? '',
        ].join(' '),
      );
      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [currentOrderProductIds, products, searchQuery]);

  const typedNameTokens = normalizeText(nameValue)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
  const normalizedTypedName = normalizeText(nameValue);
  const exactNameDuplicate = useMemo(
    () =>
      Boolean(
        normalizedTypedName &&
        productNameSuggestions.some(
          (product) => normalizeText(product.name) === normalizedTypedName,
        ),
      ),
    [normalizedTypedName, productNameSuggestions],
  );
  const suggestedProducts = useMemo(() => {
    if (typedNameTokens.length === 0) return [] as string[];
    return productNameSuggestions
      .map((product) => {
        const productTokens = normalizeText(product.name)
          .split(' ')
          .filter(Boolean);
        const intersection = typedNameTokens.filter((token) =>
          productTokens.includes(token),
        ).length;
        const union = new Set([...typedNameTokens, ...productTokens]).size;
        const jaccard = union === 0 ? 0 : intersection / union;
        const contains = normalizeText(product.name).includes(
          normalizedTypedName,
        );
        const startsWith = normalizeText(product.name).startsWith(
          normalizedTypedName,
        );
        const score = (startsWith ? 2 : 0) + (contains ? 1 : 0) + jaccard;
        return { name: product.name, score };
      })
      .filter((item) => item.score >= 1.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.name);
  }, [normalizedTypedName, productNameSuggestions, typedNameTokens]);
  const normalizedBrandCatalog = useMemo(
    () =>
      brandSuggestions
        .map((brand) => ({
          raw: brand,
          normalized: normalizeText(brand),
          tokens: normalizeText(brand).split(' ').filter(Boolean),
        }))
        .filter((brand) => brand.normalized),
    [brandSuggestions],
  );
  const normalizedBrandValue = normalizeText(brandValue);
  const brandTokens = normalizedBrandValue.split(' ').filter(Boolean);
  const exactBrandMatch = useMemo(
    () =>
      normalizedBrandCatalog.find(
        (brand) => brand.normalized === normalizedBrandValue,
      ) ?? null,
    [normalizedBrandCatalog, normalizedBrandValue],
  );
  const similarBrands = useMemo(() => {
    if (brandTokens.length === 0) return [] as string[];
    return normalizedBrandCatalog
      .map((brand) => {
        const intersection = brandTokens.filter((token) =>
          brand.tokens.includes(token),
        ).length;
        const union = new Set([...brandTokens, ...brand.tokens]).size;
        const jaccard = union === 0 ? 0 : intersection / union;
        const contains =
          brand.normalized.includes(normalizedBrandValue) ||
          normalizedBrandValue.includes(brand.normalized);
        return { raw: brand.raw, score: jaccard + (contains ? 0.6 : 0) };
      })
      .filter(
        (brand) =>
          brand.score >= 0.65 &&
          normalizeText(brand.raw) !== normalizedBrandValue,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((brand) => brand.raw);
  }, [brandTokens, normalizedBrandCatalog, normalizedBrandValue]);
  const normalizedCategoryCatalog = useMemo(
    () =>
      categoryTagSuggestions
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
        .filter((tag) => tag.normalized),
    [categoryTagSuggestions],
  );
  const activeCategoryToken = (() => {
    const tokens = categoryTagsValue
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const lastToken = tokens.at(-1) ?? '';
    return lastToken
      ? `#${normalizeText(lastToken.replace(/^#/, '')).replace(/\s+/g, '')}`
      : '';
  })();
  const exactCategoryMatch = useMemo(
    () =>
      normalizedCategoryCatalog.find(
        (tag) => tag.normalized === activeCategoryToken,
      ) ?? null,
    [activeCategoryToken, normalizedCategoryCatalog],
  );
  const similarCategories = useMemo(() => {
    if (!activeCategoryToken) return [] as string[];
    return normalizedCategoryCatalog
      .filter(
        (tag) =>
          tag.normalized !== activeCategoryToken &&
          (tag.normalized.includes(activeCategoryToken) ||
            activeCategoryToken.includes(tag.normalized)),
      )
      .slice(0, 6)
      .map((tag) => tag.raw);
  }, [activeCategoryToken, normalizedCategoryCatalog]);

  const selectedCount = Object.keys(selectedProducts).length;

  const closeModal = () => {
    setOpen(false);
    setTab('existing');
    setSearchQuery('');
    setSelectedProducts({});
    setCreateError(null);
    setNameValue('');
    setBrandValue('');
    setCategoryTagsValue('');
    setPurchaseByPack(false);
    setShelfLifeNoApplies(false);
  };

  const toggleProduct = (product: ExistingProductOption, checked: boolean) => {
    setSelectedProducts((prev) => {
      if (!checked) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return {
        ...prev,
        [product.id]: {
          supplierRelation: product.currentRelationType ?? 'none',
          supplierProductName: product.supplierProductName ?? '',
          supplierSku: '',
        },
      };
    });
  };

  const handleExistingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedCount === 0 || isAddingExisting) return;
    setIsAddingExisting(true);
    try {
      const formData = new FormData();
      formData.append(
        'items_json',
        JSON.stringify(
          Object.entries(selectedProducts).map(([productId, payload]) => ({
            productId,
            supplierRelation: payload.supplierRelation,
            supplierProductName: payload.supplierProductName,
            supplierSku: payload.supplierSku,
          })),
        ),
      );
      await onAddExistingProducts(formData);
    } finally {
      setIsAddingExisting(false);
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingProduct) return;
    setCreateError(null);
    setIsCreatingProduct(true);
    try {
      const formData = new FormData(event.currentTarget);
      await onCreateProduct(formData);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : 'No se pudo crear el producto.',
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const modalContent = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
              Recepcion de mercaderia
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
              Agregar productos al remito
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Suma artículos que llegaron en el remito aunque no hayan estado en
              el pedido original. Si corresponde, puedes asignar este proveedor
              a los articulos que selecciones.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('existing')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === 'existing'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 text-zinc-700'
            }`}
          >
            Productos existentes
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === 'new'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 text-zinc-700'
            }`}
          >
            Nuevo producto
          </button>
        </div>

        {tab === 'existing' ? (
          <form onSubmit={handleExistingSubmit} className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="block text-sm text-zinc-600">
                Buscar articulo
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Ej: cafe 500g, codigo, barcode"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm md:max-w-md"
                />
              </label>
              <p className="mt-2 text-xs text-zinc-500">
                Los productos seleccionados se agregan al pedido con cantidad
                ordenada `0`, así luego puedes cargar la cantidad real recibida
                en la grilla principal.
              </p>
            </div>

            {availableProducts.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No hay productos disponibles para agregar con ese filtro.
              </div>
            ) : (
              <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="space-y-3">
                  {availableProducts.map((product) => {
                    const selected = selectedProducts[product.id];
                    return (
                      <div
                        key={product.id}
                        className="rounded-2xl border border-zinc-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selected)}
                              onChange={(event) =>
                                toggleProduct(product, event.target.checked)
                              }
                              className="mt-1 h-4 w-4 rounded border-zinc-300"
                            />
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {product.brand ? `${product.brand} · ` : ''}
                                {product.internalCode
                                  ? `Cod. ${product.internalCode} · `
                                  : ''}
                                {product.barcode
                                  ? `Barcode ${product.barcode}`
                                  : 'Sin barcode'}
                              </p>
                            </div>
                          </label>
                          <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                            Relación actual:{' '}
                            {product.currentRelationType === 'primary'
                              ? 'Primario'
                              : product.currentRelationType === 'secondary'
                                ? 'Secundario'
                                : 'Sin asignar'}
                          </div>
                        </div>

                        {selected ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <label className="text-sm text-zinc-600">
                              Asignar este articulo a {supplierName}
                              <select
                                value={selected.supplierRelation}
                                onChange={(event) =>
                                  setSelectedProducts((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      supplierRelation: event.target.value as
                                        | 'none'
                                        | 'primary'
                                        | 'secondary',
                                    },
                                  }))
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                              >
                                {relationOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm text-zinc-600">
                              Nombre de articulo en el proveedor
                              <input
                                type="text"
                                value={selected.supplierProductName}
                                onChange={(event) =>
                                  setSelectedProducts((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      supplierProductName: event.target.value,
                                    },
                                  }))
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                                placeholder="Ej: Cafe molido 500g"
                              />
                            </label>
                            <label className="text-sm text-zinc-600">
                              SKU en proveedor (opcional)
                              <input
                                type="text"
                                value={selected.supplierSku}
                                onChange={(event) =>
                                  setSelectedProducts((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      supplierSku: event.target.value,
                                    },
                                  }))
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                                placeholder="Ej: CAF-500"
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm text-zinc-600">
                {selectedCount} producto{selectedCount === 1 ? '' : 's'} listo
                {selectedCount === 1 ? '' : 's'} para agregar al pedido.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={selectedCount === 0 || isAddingExisting}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAddingExisting ? 'Agregando...' : 'Agregar al pedido'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-zinc-600">
                Nombre de articulo en la tienda
                <input
                  name="name"
                  required
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  list={productSuggestionsListId}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
                {exactNameDuplicate ? (
                  <span className="mt-1 block text-xs text-red-700">
                    Ya existe un producto con este nombre.
                  </span>
                ) : suggestedProducts.length > 0 ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    Posibles coincidencias: {suggestedProducts.join(' · ')}
                  </span>
                ) : null}
              </label>
              <label className="text-sm text-zinc-600">
                Marca
                <input
                  name="brand"
                  value={brandValue}
                  onChange={(event) => setBrandValue(event.target.value)}
                  list={brandSuggestionsListId}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
                {exactBrandMatch ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    Marca ya existente: <strong>{exactBrandMatch.raw}</strong>.
                  </span>
                ) : similarBrands.length > 0 ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    Marcas parecidas: {similarBrands.join(' · ')}
                  </span>
                ) : null}
              </label>
              <label className="text-sm text-zinc-600">
                Categoria
                <input
                  name="category_tags"
                  value={categoryTagsValue}
                  onChange={(event) => setCategoryTagsValue(event.target.value)}
                  list={categorySuggestionsListId}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="#cafe #molido"
                />
                {exactCategoryMatch ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    Categoria ya existente:{' '}
                    <strong>{exactCategoryMatch.raw}</strong>.
                  </span>
                ) : similarCategories.length > 0 ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    Categorias parecidas: {similarCategories.join(' · ')}
                  </span>
                ) : null}
              </label>
              <label className="text-sm text-zinc-600">
                Codigo interno
                <input
                  name="internal_code"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Codigo de barras
                <input
                  name="barcode"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Asignar este articulo a {supplierName}
                <select
                  name="supplier_relation"
                  defaultValue="primary"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                >
                  {relationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-zinc-600">
                Nombre de articulo en el proveedor
                <input
                  name="supplier_product_name"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                SKU en proveedor (opcional)
                <input
                  name="supplier_sku"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Precio proveedor
                <AmountInputAR
                  name="supplier_price"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="0"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Precio unitario
                <AmountInputAR
                  name="unit_price"
                  defaultValue={0}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Unidad de venta
                <select
                  name="sell_unit_type"
                  defaultValue="unit"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="unit">Unidad</option>
                  <option value="weight">Peso</option>
                  <option value="bulk">Granel</option>
                </select>
              </label>
              <label className="text-sm text-zinc-600">
                Unidad de medida
                <input
                  name="uom"
                  defaultValue="unit"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="purchase_by_pack"
                    checked={purchaseByPack}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setPurchaseByPack(checked);
                    }}
                  />
                  Se compra por paquete
                </label>
                {purchaseByPack ? (
                  <label className="mt-3 block text-sm text-zinc-600">
                    Unidades por paquete
                    <input
                      name="units_per_pack"
                      type="number"
                      min="2"
                      step="1"
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </label>
                ) : null}
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={shelfLifeNoApplies}
                    onChange={(event) =>
                      setShelfLifeNoApplies(event.target.checked)
                    }
                  />
                  No aplica vencimiento
                </label>
                {!shelfLifeNoApplies ? (
                  <label className="mt-3 block text-sm text-zinc-600">
                    Vencimiento aproximado (dias)
                    <input
                      name="shelf_life_days"
                      type="number"
                      min="0"
                      step="1"
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </label>
                ) : (
                  <input type="hidden" name="shelf_life_days" value="0" />
                )}
              </div>
              <label className="text-sm text-zinc-600">
                Cantidad de resguardo
                <input
                  name="safety_stock"
                  type="number"
                  min="0"
                  step="0.001"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            {createError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {createError}
              </div>
            ) : null}
            {productNameSuggestions.length > 0 ? (
              <datalist id={productSuggestionsListId}>
                {productNameSuggestions.slice(0, 500).map((product) => (
                  <option key={product.product_id} value={product.name} />
                ))}
              </datalist>
            ) : null}
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

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm text-zinc-600">
                El producto nuevo se agrega al pedido actual y luego aparece en
                la grilla normal de recepción para cargar cantidad, costo y
                precio de venta.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingProduct
                    ? 'Creando...'
                    : 'Crear producto y agregar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
        <p className="text-sm text-zinc-700">
          ¿Hay productos en el remito que no están en esta lista?{' '}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-4"
          >
            Agrega productos aquí
          </button>
          .
        </p>
      </div>
      {modalContent && typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
