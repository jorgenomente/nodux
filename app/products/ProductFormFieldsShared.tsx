'use client';

import { useEffect, useId, useMemo, useState } from 'react';

import AmountInputAR from '@/app/components/AmountInputAR';
import { formatProductCategoryTags } from '@/app/products/product-category-tags';
import ProductImageField from '@/app/products/ProductImageField';
import { PRODUCT_FORM_LABELS } from '@/app/products/product-form-contract';

const sellUnitOptions = ['unit', 'weight', 'bulk'] as const;

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type ProductNameSuggestion = {
  product_id: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  internal_code?: string | null;
  is_active?: boolean;
};

type FieldNameMap = {
  name: string;
  brand: string;
  categoryTags: string;
  internalCode: string;
  barcode: string;
  purchaseByPack: string;
  unitsPerPack: string;
  sellUnitType: string;
  uom: string;
  primarySupplierId: string;
  supplierPrice: string;
  unitPrice: string;
  shelfLifeDays: string;
  primarySupplierProductName: string;
  primarySupplierSku: string;
  secondarySupplierId: string;
  safetyStock: string;
  imageDataUrl?: string;
  removeImage?: string;
};

type DefaultValueMap = {
  name?: string;
  brand?: string;
  categoryTags?: string[] | string | null;
  internalCode?: string;
  barcode?: string;
  purchaseByPack?: boolean;
  unitsPerPack?: number | string;
  sellUnitType?: 'unit' | 'weight' | 'bulk';
  uom?: string;
  primarySupplierId?: string;
  supplierPrice?: number | string;
  unitPrice?: number | string;
  shelfLifeDays?: number | string;
  primarySupplierProductName?: string;
  primarySupplierSku?: string;
  secondarySupplierId?: string;
  safetyStock?: number | string;
  imageUrl?: string | null;
};

type Props = {
  suppliers: SupplierOption[];
  brandSuggestions?: string[];
  productNameSuggestions?: ProductNameSuggestion[];
  categoryTagSuggestions?: string[];
  fields: FieldNameMap;
  defaults?: DefaultValueMap;
  compact?: boolean;
  includeHelper?: boolean;
  lockPrimarySupplier?: boolean;
  includeImageField?: boolean;
  onNameDuplicateStateChange?: (isDuplicate: boolean) => void;
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

const normalizeBarcode = (value: string) => value.replace(/[^\d]/g, '').trim();
const productNamingGuide =
  'Sugerencia: usa tipo + marca + variante + tamano/presentacion. Ej: Alfajor Jorgito chocolate blanco 55 g.';
const toCodeToken = (value: string, fallback: string) => {
  const tokens = tokenize(value);
  if (tokens.length === 0) return fallback;
  if (tokens.length === 1) return tokens[0].slice(0, 3).toUpperCase();
  const initials = tokens
    .slice(0, 3)
    .map((token) => token.charAt(0))
    .join('')
    .toUpperCase();
  return initials.padEnd(3, tokens[0].slice(0, 3).toUpperCase()).slice(0, 3);
};

export default function ProductFormFieldsShared({
  suppliers,
  brandSuggestions = [],
  productNameSuggestions = [],
  categoryTagSuggestions = [],
  fields,
  defaults,
  compact = false,
  includeHelper = true,
  lockPrimarySupplier = false,
  includeImageField = true,
  onNameDuplicateStateChange,
}: Props) {
  const brandSuggestionsListId = useId();
  const productSuggestionsListId = useId();
  const categorySuggestionsListId = useId();
  const [primarySupplierId, setPrimarySupplierId] = useState(
    defaults?.primarySupplierId ?? '',
  );
  const [nameValue, setNameValue] = useState(defaults?.name ?? '');
  const [brandValue, setBrandValue] = useState(defaults?.brand ?? '');
  const initialCategoryTags = Array.isArray(defaults?.categoryTags)
    ? formatProductCategoryTags(defaults.categoryTags)
    : (defaults?.categoryTags ?? '');
  const [categoryTagsValue, setCategoryTagsValue] =
    useState(initialCategoryTags);
  const [barcodeValue, setBarcodeValue] = useState(defaults?.barcode ?? '');
  const [internalCodeValue, setInternalCodeValue] = useState(
    defaults?.internalCode ?? '',
  );
  const [purchaseByPack, setPurchaseByPack] = useState(
    Boolean(defaults?.purchaseByPack),
  );
  const [unitsPerPackValue, setUnitsPerPackValue] = useState(
    String(defaults?.unitsPerPack ?? '').trim(),
  );
  const [internalCodeNotice, setInternalCodeNotice] = useState<string | null>(
    null,
  );
  const [supplierPrice, setSupplierPrice] = useState<number | null>(null);
  const initialShelfLife = String(defaults?.shelfLifeDays ?? '').trim();
  const [shelfLifeNoApplies, setShelfLifeNoApplies] = useState(
    initialShelfLife === '0',
  );
  const [shelfLifeValue, setShelfLifeValue] = useState(
    initialShelfLife === '0' ? '' : initialShelfLife,
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === primarySupplierId),
    [primarySupplierId, suppliers],
  );
  const markupPct = Number(selectedSupplier?.default_markup_pct ?? 40);
  const suggestedUnitPrice =
    supplierPrice != null && !Number.isNaN(supplierPrice) && supplierPrice > 0
      ? supplierPrice * (1 + markupPct / 100)
      : null;
  const helperText =
    suggestedUnitPrice == null
      ? `Sugerencia: completa "Precio proveedor" para calcular el precio unitario recomendado (${markupPct}% de ganancia).`
      : `Sugerido para precio unitario: $${currencyFormatter.format(
          suggestedUnitPrice,
        )} (${markupPct}% sobre precio proveedor).`;
  const normalizedTypedName = normalizeText(nameValue);
  const typedTokens = tokenize(nameValue);
  const normalizedBrandValue = normalizeText(brandValue);
  const brandTokens = tokenize(brandValue);
  const normalizedBarcodeValue = normalizeBarcode(barcodeValue);
  const normalizedInternalCodeValue = normalizeText(internalCodeValue);
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
  const normalizedBrandCatalog = useMemo(
    () =>
      brandSuggestions
        .map((brand) => ({
          raw: brand,
          normalized: normalizeText(brand),
          tokens: tokenize(brand),
        }))
        .filter((brand) => brand.normalized),
    [brandSuggestions],
  );
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
  const suggestedProducts = useMemo(() => {
    if (typedTokens.length === 0) return [] as ProductNameSuggestion[];
    const scored = productNameSuggestions
      .map((product) => {
        const productTokens = tokenize(product.name);
        if (productTokens.length === 0) {
          return { product, score: 0 };
        }
        const intersection = typedTokens.filter((token) =>
          productTokens.includes(token),
        ).length;
        const union = new Set([...typedTokens, ...productTokens]).size;
        const jaccard = union === 0 ? 0 : intersection / union;
        const includesAllTypedTokens = typedTokens.every((token) =>
          productTokens.includes(token),
        );
        const includesTypedAsString = normalizeText(product.name).includes(
          normalizedTypedName,
        );
        const startsWithTyped = normalizeText(product.name).startsWith(
          normalizedTypedName,
        );
        const score =
          (includesAllTypedTokens ? 3 : 0) +
          (startsWithTyped ? 2 : 0) +
          (includesTypedAsString ? 1 : 0) +
          jaccard;
        return { product, score };
      })
      .filter(({ score }) => score >= 1.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return scored.map(({ product }) => product);
  }, [normalizedTypedName, productNameSuggestions, typedTokens]);
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
  const barcodeDuplicate = useMemo(() => {
    if (!normalizedBarcodeValue) return null;
    return (
      productNameSuggestions.find(
        (product) =>
          normalizeBarcode(String(product.barcode ?? '')) ===
          normalizedBarcodeValue,
      ) ?? null
    );
  }, [normalizedBarcodeValue, productNameSuggestions]);
  const internalCodeDuplicate = useMemo(() => {
    if (!normalizedInternalCodeValue) return null;
    return (
      productNameSuggestions.find(
        (product) =>
          normalizeText(String(product.internal_code ?? '')) ===
          normalizedInternalCodeValue,
      ) ?? null
    );
  }, [normalizedInternalCodeValue, productNameSuggestions]);
  const exactBrandMatch = useMemo(() => {
    if (!normalizedBrandValue) return null;
    return (
      normalizedBrandCatalog.find(
        (brand) => brand.normalized === normalizedBrandValue,
      ) ?? null
    );
  }, [normalizedBrandCatalog, normalizedBrandValue]);
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
  }, [brandTokens, normalizedBrandCatalog, normalizedBrandValue]);
  const exactCategoryMatch = useMemo(() => {
    if (!activeCategoryToken) return null;
    return (
      normalizedCategoryCatalog.find(
        (tag) => tag.normalized === activeCategoryToken,
      ) ?? null
    );
  }, [activeCategoryToken, normalizedCategoryCatalog]);
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
  useEffect(() => {
    onNameDuplicateStateChange?.(
      exactNameDuplicate ||
        Boolean(barcodeDuplicate) ||
        Boolean(internalCodeDuplicate),
    );
  }, [
    barcodeDuplicate,
    exactNameDuplicate,
    internalCodeDuplicate,
    onNameDuplicateStateChange,
  ]);

  const labelClass = compact
    ? 'text-xs text-zinc-600'
    : 'text-sm font-medium text-zinc-700';
  const inputClass = compact
    ? 'mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm'
    : 'mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm';
  const generateInternalCode = () => {
    if (!normalizedBrandValue) {
      setInternalCodeNotice(
        'Completa la marca para generar un código interno consistente.',
      );
      return;
    }
    const brandPrefix = toCodeToken(brandValue, 'BRD');
    const productPrefix = toCodeToken(nameValue, 'PRD');
    const basePrefix = `${brandPrefix}-${productPrefix}`;
    const existingCodes = new Set(
      productNameSuggestions
        .map((product) =>
          String(product.internal_code ?? '')
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    );
    let sequence = 1;
    let candidate = `${basePrefix}-${String(sequence).padStart(3, '0')}`;
    while (existingCodes.has(candidate)) {
      sequence += 1;
      candidate = `${basePrefix}-${String(sequence).padStart(3, '0')}`;
    }
    setInternalCodeValue(candidate);
    setInternalCodeNotice(`Código sugerido generado: ${candidate}`);
  };

  return (
    <>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.productName}
        <input
          name={fields.name}
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
          required
          className={inputClass}
          list={productSuggestionsListId}
          placeholder="Ej: Alfajor Jorgito chocolate blanco 55 g"
        />
        {productNameSuggestions.length > 0 ? (
          <datalist id={productSuggestionsListId}>
            {productNameSuggestions.slice(0, 500).map((product) => (
              <option key={product.product_id} value={product.name} />
            ))}
          </datalist>
        ) : null}
        <span className="mt-2 block text-xs text-zinc-500">
          {productNamingGuide}
        </span>
        {exactNameDuplicate ? (
          <span className="mt-2 block text-xs font-medium text-red-700">
            Ya existe un producto con este nombre (normalizado). Revisa antes de
            guardar para evitar duplicados.
          </span>
        ) : null}
        {!exactNameDuplicate && suggestedProducts.length > 0 ? (
          <span className="mt-2 block text-xs text-amber-700">
            Posibles coincidencias:{' '}
            {suggestedProducts.map((product) => product.name).join(' · ')}
          </span>
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.brand}
        <input
          name={fields.brand}
          value={brandValue}
          onChange={(event) => setBrandValue(event.target.value)}
          className={inputClass}
          placeholder="Ej: Arcor"
          list={brandSuggestionsListId}
        />
        {brandSuggestions.length > 0 ? (
          <datalist id={brandSuggestionsListId}>
            {brandSuggestions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        ) : null}
        {exactBrandMatch ? (
          <span className="mt-2 block text-xs text-amber-700">
            Marca ya existente: <strong>{exactBrandMatch.raw}</strong>. Usa este
            mismo nombre para mantener catálogo limpio.
          </span>
        ) : null}
        {!exactBrandMatch && similarBrands.length > 0 ? (
          <span className="mt-2 block text-xs text-amber-700">
            Marcas parecidas: {similarBrands.join(' · ')}
          </span>
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.categoryTags}
        <input
          name={fields.categoryTags}
          value={categoryTagsValue}
          onChange={(event) => setCategoryTagsValue(event.target.value)}
          className={inputClass}
          placeholder="#keto #fitness #sintacc"
          list={categorySuggestionsListId}
        />
        <span className="mt-2 block text-xs text-zinc-500">
          Usa hashtags separados por espacio. Ej: #keto #sinazucar.
        </span>
        {categoryTagSuggestions.length > 0 ? (
          <datalist id={categorySuggestionsListId}>
            {categoryTagSuggestions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        ) : null}
        {exactCategoryMatch ? (
          <span className="mt-2 block text-xs text-amber-700">
            Categoria ya existente: <strong>{exactCategoryMatch.raw}</strong>.
          </span>
        ) : null}
        {!exactCategoryMatch && similarCategories.length > 0 ? (
          <span className="mt-2 block text-xs text-amber-700">
            Categorias parecidas: {similarCategories.join(' · ')}
          </span>
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.internalCode}
        <div className="mt-2 flex items-center gap-2">
          <input
            name={fields.internalCode}
            value={internalCodeValue}
            onChange={(event) => setInternalCodeValue(event.target.value)}
            className={
              compact
                ? 'w-full rounded border border-zinc-300 px-2 py-1 text-sm'
                : 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm'
            }
          />
          <button
            type="button"
            onClick={generateInternalCode}
            className={
              compact
                ? 'rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50'
                : 'rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50'
            }
          >
            Generar
          </button>
        </div>
        {internalCodeDuplicate ? (
          <span className="mt-2 block text-xs font-medium text-red-700">
            Código interno ya registrado en: {internalCodeDuplicate.name}.
          </span>
        ) : null}
        {internalCodeNotice ? (
          <span className="mt-2 block text-xs text-zinc-500">
            {internalCodeNotice}
          </span>
        ) : null}
      </label>
      <div className={labelClass}>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name={fields.purchaseByPack}
            checked={purchaseByPack}
            onChange={(event) => {
              const checked = event.target.checked;
              setPurchaseByPack(checked);
              if (!checked) {
                setUnitsPerPackValue('');
              }
            }}
          />
          {PRODUCT_FORM_LABELS.purchaseByPack}
        </label>
        <div className="mt-2">
          <input
            name={purchaseByPack ? fields.unitsPerPack : undefined}
            type="number"
            min="2"
            step="1"
            value={purchaseByPack ? unitsPerPackValue : ''}
            onChange={(event) => setUnitsPerPackValue(event.target.value)}
            disabled={!purchaseByPack}
            className={inputClass}
            placeholder="Ej: 12"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Si está activo, pedidos/recepción muestran equivalencia en paquetes.
          </span>
        </div>
      </div>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.barcode}
        <input
          name={fields.barcode}
          value={barcodeValue}
          onChange={(event) => setBarcodeValue(event.target.value)}
          className={inputClass}
        />
        {barcodeDuplicate ? (
          <span className="mt-2 block text-xs font-medium text-red-700">
            Código de barras ya registrado en: {barcodeDuplicate.name}.
          </span>
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.sellUnitType}
        <select
          name={fields.sellUnitType}
          defaultValue={defaults?.sellUnitType ?? 'unit'}
          className={inputClass}
        >
          {sellUnitOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'unit'
                ? 'Unidad'
                : option === 'weight'
                  ? 'Peso'
                  : 'Granel'}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.uom}
        <input
          name={fields.uom}
          defaultValue={defaults?.uom ?? 'unit'}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.primarySupplier}
        <select
          name={fields.primarySupplierId}
          value={primarySupplierId}
          onChange={(event) => setPrimarySupplierId(event.target.value)}
          className={inputClass}
          disabled={lockPrimarySupplier}
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option
              key={supplier.id}
              value={supplier.id}
              disabled={!supplier.is_active}
            >
              {supplier.name}
              {supplier.is_active ? '' : ' (Inactivo)'}
            </option>
          ))}
        </select>
        {lockPrimarySupplier ? (
          <input
            type="hidden"
            name={fields.primarySupplierId}
            value={primarySupplierId}
          />
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.supplierPrice}
        <AmountInputAR
          name={fields.supplierPrice}
          className={inputClass}
          onValueChange={setSupplierPrice}
          defaultValue={defaults?.supplierPrice ?? ''}
          placeholder="0"
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.unitPrice}
        <AmountInputAR
          name={fields.unitPrice}
          className={inputClass}
          defaultValue={defaults?.unitPrice ?? 0}
        />
        {includeHelper ? (
          <span className="mt-2 block text-xs text-zinc-500" title={helperText}>
            {helperText}
          </span>
        ) : null}
      </label>
      <div className={labelClass}>
        <span>{PRODUCT_FORM_LABELS.shelfLifeDays}</span>
        <input
          name={shelfLifeNoApplies ? undefined : fields.shelfLifeDays}
          type="number"
          step="1"
          min="0"
          value={shelfLifeNoApplies ? '' : shelfLifeValue}
          onChange={(event) => setShelfLifeValue(event.target.value)}
          disabled={shelfLifeNoApplies}
          className={inputClass}
          placeholder="Ej: 30"
        />
        {shelfLifeNoApplies ? (
          <input type="hidden" name={fields.shelfLifeDays} value="0" />
        ) : null}
        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={shelfLifeNoApplies}
            onChange={(event) => {
              const checked = event.target.checked;
              setShelfLifeNoApplies(checked);
              if (checked) {
                setShelfLifeValue('');
              }
            }}
          />
          No aplica vencimiento (guarda 0; en blanco o 0 no genera lotes
          automáticos)
        </label>
      </div>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.supplierProductName}
        <input
          name={fields.primarySupplierProductName}
          defaultValue={defaults?.primarySupplierProductName ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.supplierSku}
        <input
          name={fields.primarySupplierSku}
          defaultValue={defaults?.primarySupplierSku ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.secondarySupplier}
        <select
          name={fields.secondarySupplierId}
          defaultValue={defaults?.secondarySupplierId ?? ''}
          className={inputClass}
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option
              key={supplier.id}
              value={supplier.id}
              disabled={!supplier.is_active}
            >
              {supplier.name}
              {supplier.is_active ? '' : ' (Inactivo)'}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.safetyStock}
        <input
          name={fields.safetyStock}
          type="number"
          step="0.001"
          min="0"
          defaultValue={defaults?.safetyStock ?? ''}
          className={inputClass}
          placeholder="0"
        />
        {!compact ? (
          <span className="mt-2 block text-xs text-zinc-400">
            Cantidad de resguardo sugerida para evitar quiebres. Se aplica a
            todas las sucursales y se usa en sugerencias de compra.
          </span>
        ) : null}
      </label>
      {includeImageField ? (
        <ProductImageField
          inputName={fields.imageDataUrl ?? 'image_data_url'}
          removeFlagName={fields.removeImage ?? 'remove_image'}
          existingImageUrl={defaults?.imageUrl ?? null}
          compact={compact}
        />
      ) : null}
    </>
  );
}
