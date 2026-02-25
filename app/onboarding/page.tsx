import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { inflateRawSync } from 'node:zlib';

import BulkCreateSupplierModal from '@/app/onboarding/BulkCreateSupplierModal';
import BulkPricingSuggestion from '@/app/onboarding/BulkPricingSuggestion';
import BulkProductSelectionActions from '@/app/onboarding/BulkProductSelectionActions';
import PageShell from '@/app/components/PageShell';
import OnboardingFormPendingState from '@/app/onboarding/OnboardingFormPendingState';
import { PRODUCT_FORM_LABELS } from '@/app/products/product-form-contract';
import ProductFormFieldsShared from '@/app/products/ProductFormFieldsShared';
import { getOrgAdminSession } from '@/lib/auth/org-session';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';

type SearchParams = {
  result?: string;
  message?: string;
  job_id?: string;
  total_rows?: string;
  valid_rows?: string;
  invalid_rows?: string;
  applied_rows?: string;
  skipped_rows?: string;
  resolver?: string;
  mapping_template?: string;
  detected_cols?: string;
  proposed_map?: string;
  deduped_rows?: string;
  staged_job_id?: string;
  staged_file_name?: string;
  resolver_page?: string;
  resolver_q?: string;
  bulk_q?: string;
  bulk_page?: string;
  bulk_page_size?: string;
  bulk_updated?: string;
  bulk_scope?: string;
  bulk_skipped?: string;
  bulk_supplier_created?: string;
  bulk_state?: string;
};

type SupplierTaskKey =
  | 'suppliers_without_payment_terms'
  | 'suppliers_without_preferred_payment_method';

type TaskCardKey = 'products_incomplete_info' | SupplierTaskKey;

type OnboardingTaskRow = {
  task_key: string;
  task_label: string;
  pending_count: number;
};

type ImportJobRow = {
  id: string;
  template_key: string;
  source_file_name: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  applied_rows: number;
  created_at: string;
};

type StagedJobRow = {
  id: string;
  template_key: string;
  source_file_name: string;
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type ProductRow = {
  id: string;
  name: string | null;
  brand: string | null;
  internal_code: string | null;
  barcode: string | null;
  sell_unit_type: 'unit' | 'weight' | 'bulk' | null;
  uom: string | null;
  unit_price: number | null;
  shelf_life_days: number | null;
};

type IncompleteProductRow = ProductRow & {
  has_primary_supplier: boolean;
  missing_primary_supplier: boolean;
  missing_shelf_life: boolean;
  missing_identifier: boolean;
};

type SupplierProductRelationRow = {
  product_id: string | null;
  supplier_id: string | null;
  relation_type: 'primary' | 'secondary';
  supplier_price: number | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  suppliers?: {
    name: string | null;
  } | null;
};

type StockSafetyRow = {
  product_id: string | null;
  safety_stock: number | null;
};

type ProductRelationByType = {
  primary?: {
    supplier_id: string;
    supplier_price: number | null;
    supplier_sku: string | null;
    supplier_product_name: string | null;
  };
  secondary?: {
    supplier_id: string;
  };
};

type TemplateKey = 'products' | 'suppliers';

type BulkProductRow = {
  id: string;
  name: string | null;
  brand: string | null;
  internal_code: string | null;
  barcode: string | null;
  unit_price: number | null;
  shelf_life_days: number | null;
  is_active: boolean | null;
};

type BulkDraftState = {
  selectedProductIds?: string[];
  applyBrand?: boolean;
  bulkBrand?: string;
  applyPrimarySupplier?: boolean;
  bulkPrimarySupplierId?: string;
  applySecondarySupplier?: boolean;
  bulkSecondarySupplierId?: string;
  applySupplierPrice?: boolean;
  bulkSupplierPrice?: string;
  applyShelfLifeDays?: boolean;
  bulkShelfLifeDays?: string;
  bulkShelfLifeNoApplies?: boolean;
  applyUnitPrice?: boolean;
  bulkUnitPrice?: string;
};

const TASK_META: Array<{
  key: TaskCardKey;
  label: string;
  href: string;
}> = [
  {
    key: 'products_incomplete_info',
    label: 'Productos con informacion incompleta',
    href: '/onboarding?resolver=products_incomplete_info#resolver-products-incomplete-info',
  },
  {
    key: 'suppliers_without_payment_terms',
    label: 'Proveedores sin plazo de pago',
    href: '/suppliers',
  },
  {
    key: 'suppliers_without_preferred_payment_method',
    label: 'Proveedores sin metodo de pago preferido',
    href: '/suppliers',
  },
];

const IMPORT_MAX_ROWS = 80000;
const BULK_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const TEMPLATE_FIELDS: Record<
  TemplateKey,
  Array<{ target: string; label: string; required?: boolean }>
> = {
  products: [
    {
      target: 'product_name',
      label: PRODUCT_FORM_LABELS.productName,
      required: true,
    },
    { target: 'brand', label: PRODUCT_FORM_LABELS.brand },
    { target: 'internal_code', label: PRODUCT_FORM_LABELS.internalCode },
    { target: 'barcode', label: PRODUCT_FORM_LABELS.barcode },
    { target: 'sell_unit_type', label: PRODUCT_FORM_LABELS.sellUnitType },
    { target: 'uom', label: PRODUCT_FORM_LABELS.uom },
    {
      target: 'primary_supplier_name',
      label: PRODUCT_FORM_LABELS.primarySupplier,
    },
    { target: 'supplier_price', label: PRODUCT_FORM_LABELS.supplierPrice },
    {
      target: 'unit_price',
      label: `${PRODUCT_FORM_LABELS.unitPrice} de venta`,
    },
    { target: 'source_quantity', label: 'Cantidad (para calcular unitario)' },
    {
      target: 'source_subtotal',
      label: 'Subtotal/total linea (para calcular unitario)',
    },
    { target: 'source_date', label: 'Fecha de referencia (venta/precio)' },
    { target: 'shelf_life_days', label: PRODUCT_FORM_LABELS.shelfLifeDays },
    {
      target: 'primary_supplier_product_name',
      label: PRODUCT_FORM_LABELS.supplierProductName,
    },
    { target: 'primary_supplier_sku', label: PRODUCT_FORM_LABELS.supplierSku },
    {
      target: 'secondary_supplier_name',
      label: PRODUCT_FORM_LABELS.secondarySupplier,
    },
    { target: 'safety_stock', label: PRODUCT_FORM_LABELS.safetyStock },
    { target: 'is_active', label: 'Activo (true/false)' },
  ],
  suppliers: [
    { target: 'supplier_name', label: 'Nombre proveedor', required: true },
    { target: 'contact_name', label: 'Contacto' },
    { target: 'phone', label: 'Telefono' },
    { target: 'email', label: 'Email' },
    { target: 'notes', label: 'Notas' },
    { target: 'payment_terms_days', label: 'Plazo de pago (dias)' },
    {
      target: 'preferred_payment_method',
      label: 'Metodo pago preferido (cash/transfer)',
    },
    { target: 'accepts_cash', label: 'Acepta efectivo (true/false)' },
    {
      target: 'accepts_transfer',
      label: 'Acepta transferencia (true/false)',
    },
    {
      target: 'order_frequency',
      label: 'Frecuencia pedido (weekly/biweekly/every_3_weeks/monthly)',
    },
    { target: 'order_day', label: 'Dia pedido (mon..sun)' },
    { target: 'receive_day', label: 'Dia recepcion (mon..sun)' },
    { target: 'payment_note', label: 'Nota de pago' },
  ],
};

const COLUMN_ALIASES: Record<string, string[]> = {
  product_name: [
    'product_name',
    'name',
    'nombre',
    'nombre_articulo',
    'articulo',
  ],
  internal_code: ['internal_code', 'codigo_interno', 'sku_interno', 'codigo'],
  barcode: ['barcode', 'ean', 'codigo_barras', 'codigo_de_barras'],
  sell_unit_type: ['sell_unit_type', 'tipo_venta', 'tipo_unidad'],
  uom: ['uom', 'unidad', 'unidad_base'],
  unit_price: ['unit_price', 'price', 'precio', 'precio_venta'],
  brand: ['brand', 'marca'],
  primary_supplier_name: [
    'primary_supplier_name',
    'proveedor_primario',
    'supplier_name',
    'supplier',
    'proveedor',
  ],
  supplier_price: ['supplier_price', 'precio_proveedor', 'costo', 'cost'],
  source_quantity: [
    'source_quantity',
    'quantity',
    'qty',
    'cantidad',
    'unidades',
  ],
  source_subtotal: [
    'source_subtotal',
    'subtotal',
    'line_total',
    'total_linea',
    'importe',
    'amount',
    'total',
    'precio_total',
  ],
  source_date: [
    'source_date',
    'hora',
    'date',
    'fecha',
    'fecha_venta',
    'sale_date',
    'transaction_date',
    'last_sale_date',
    'last_update',
    'updated_at',
  ],
  shelf_life_days: [
    'shelf_life_days',
    'vencimiento_aproximado_dias',
    'dias_vencimiento',
  ],
  is_active: ['is_active', 'activo'],
  primary_supplier_product_name: [
    'primary_supplier_product_name',
    'supplier_product_name',
    'nombre_articulo_proveedor',
    'nombre_producto_proveedor',
  ],
  primary_supplier_sku: [
    'primary_supplier_sku',
    'supplier_sku',
    'sku_proveedor',
  ],
  secondary_supplier_name: [
    'secondary_supplier_name',
    'proveedor_secundario',
    'supplier_secondary',
  ],
  safety_stock: ['safety_stock', 'stock_minimo', 'min_stock'],
  supplier_name: ['supplier_name', 'supplier', 'proveedor', 'nombre_proveedor'],
  contact_name: ['contact_name', 'contacto'],
  phone: ['phone', 'telefono'],
  email: ['email', 'correo'],
  notes: ['notes', 'nota', 'observaciones'],
  payment_terms_days: ['payment_terms_days', 'dias_pago', 'plazo_pago_dias'],
  preferred_payment_method: [
    'preferred_payment_method',
    'metodo_pago_preferido',
  ],
  accepts_cash: ['accepts_cash', 'acepta_efectivo'],
  accepts_transfer: ['accepts_transfer', 'acepta_transferencia'],
  order_frequency: ['order_frequency', 'frecuencia_pedido'],
  order_day: ['order_day', 'dia_pedido'],
  receive_day: ['receive_day', 'dia_recepcion'],
  payment_note: ['payment_note', 'nota_pago'],
  relation_type: ['relation_type', 'tipo_relacion'],
  supplier_sku: ['supplier_sku', 'sku_proveedor'],
  supplier_product_name: ['supplier_product_name', 'nombre_producto_proveedor'],
};

const parseTemplateKey = (value: string): TemplateKey | null =>
  ['products', 'suppliers'].includes(value) ? (value as TemplateKey) : null;

const encodeJsonBase64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const decodeJsonBase64 = <T,>(value: string | undefined): T | null => {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, 'base64url').toString('utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const normalizeHeader = (header: string) =>
  header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeForKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '');

const parseCsvRows = (raw: string): string[][] => {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const nextChar = raw[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      currentRow.push(currentCell.trim());
      const hasContent = currentRow.some((cell) => cell !== '');
      if (hasContent) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }

  return rows;
};

const rowsToObjects = (rows: string[][]): Array<Record<string, string>> => {
  if (rows.length < 2) return [];

  const rawHeaders = rows[0] ?? [];
  const used = new Set<string>();
  const headers = rawHeaders.map((header, index) => {
    const base = normalizeHeader(header) || `column_${index + 1}`;
    let unique = base;
    let counter = 2;
    while (used.has(unique)) {
      unique = `${base}_${counter}`;
      counter += 1;
    }
    used.add(unique);
    return unique;
  });

  const objects: Array<Record<string, string>> = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const obj: Record<string, string> = {};
    let nonEmptyCount = 0;
    headers.forEach((header, headerIndex) => {
      const value = (row[headerIndex] ?? '').trim();
      obj[header] = value;
      if (value !== '') nonEmptyCount += 1;
    });
    if (nonEmptyCount > 0) {
      objects.push(obj);
    }
  }

  return objects;
};

const csvToObjects = (raw: string): Array<Record<string, string>> =>
  rowsToObjects(parseCsvRows(raw));

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

const extractXmlTagText = (input: string, tag: string) => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const chunks: string[] = [];
  let match = regex.exec(input);
  while (match) {
    chunks.push(decodeXmlEntities(match[1] ?? ''));
    match = regex.exec(input);
  }
  return chunks.join('');
};

const columnRefToIndex = (cellRef: string) => {
  const letters = (cellRef.match(/[A-Z]+/)?.[0] ?? '').toUpperCase();
  if (!letters) return -1;
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
};

const readZipEntries = (archive: Buffer) => {
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  let eocdOffset = -1;

  for (let i = archive.length - 22; i >= 0; i -= 1) {
    if (archive.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error('zip_eocd_not_found');
  }

  const centralDirectorySize = archive.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = archive.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, Buffer>();
  let cursor = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (cursor < end) {
    if (archive.readUInt32LE(cursor) !== centralSignature) {
      throw new Error('zip_central_header_invalid');
    }

    const compressionMethod = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const fileNameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    const fileName = archive
      .toString('utf8', fileNameStart, fileNameEnd)
      .replace(/\\/g, '/');

    if (archive.readUInt32LE(localHeaderOffset) !== localSignature) {
      throw new Error('zip_local_header_invalid');
    }

    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    const compressedData = archive.subarray(dataStart, dataEnd);

    let content: Buffer;
    if (compressionMethod === 0) {
      content = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      content = inflateRawSync(compressedData);
    } else {
      throw new Error('zip_compression_unsupported');
    }

    entries.set(fileName, content);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

const parseSharedStringsXml = (xml: string) => {
  const values: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match = siRegex.exec(xml);
  while (match) {
    values.push(extractXmlTagText(match[1] ?? '', 't'));
    match = siRegex.exec(xml);
  }
  return values;
};

const parseSheetRowsXml = (xml: string, sharedStrings: string[]) => {
  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch = rowRegex.exec(xml);

  while (rowMatch) {
    const rowContent = rowMatch[1] ?? '';
    const currentRow: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch = cellRegex.exec(rowContent);
    let sequentialColumn = 0;

    while (cellMatch) {
      const attrs = cellMatch[1] ?? '';
      const cellBody = cellMatch[2] ?? '';
      const reference = attrs.match(/\br="([^"]+)"/)?.[1] ?? '';
      const columnIndexFromRef = reference ? columnRefToIndex(reference) : -1;
      const columnIndex =
        columnIndexFromRef >= 0 ? columnIndexFromRef : sequentialColumn;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? '';

      let value = '';
      if (type === 's') {
        const idx = Number.parseInt(extractXmlTagText(cellBody, 'v'), 10);
        if (!Number.isNaN(idx)) {
          value = sharedStrings[idx] ?? '';
        }
      } else if (type === 'inlineStr') {
        value = extractXmlTagText(cellBody, 't');
      } else {
        value = extractXmlTagText(cellBody, 'v');
      }

      while (currentRow.length < columnIndex) {
        currentRow.push('');
      }
      currentRow[columnIndex] = value.trim();
      sequentialColumn = columnIndex + 1;
      cellMatch = cellRegex.exec(rowContent);
    }

    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
    rowMatch = rowRegex.exec(xml);
  }

  return rows;
};

const xlsxToObjects = (input: ArrayBuffer): Array<Record<string, string>> => {
  const entries = readZipEntries(Buffer.from(input));
  const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8');
  const workbookRelsXml = entries
    .get('xl/_rels/workbook.xml.rels')
    ?.toString('utf8');

  if (!workbookXml || !workbookRelsXml) {
    throw new Error('xlsx_workbook_missing');
  }

  const firstSheetRelId = workbookXml.match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1];
  if (!firstSheetRelId) {
    throw new Error('xlsx_sheet_missing');
  }

  const relPattern = new RegExp(
    `<Relationship[^>]*Id="${firstSheetRelId}"[^>]*Target="([^"]+)"`,
  );
  const target = workbookRelsXml.match(relPattern)?.[1];
  if (!target) {
    throw new Error('xlsx_sheet_target_missing');
  }

  const normalizedTarget = target.replace(/\\/g, '/').replace(/^\/+/, '');
  const sheetPath = normalizedTarget.startsWith('xl/')
    ? normalizedTarget
    : `xl/${normalizedTarget.replace(/^\.\/+/, '')}`;
  const sheetXml = entries.get(sheetPath)?.toString('utf8');
  if (!sheetXml) {
    throw new Error('xlsx_sheet_xml_missing');
  }

  const sharedStringsXml = entries
    .get('xl/sharedStrings.xml')
    ?.toString('utf8');
  const sharedStrings = sharedStringsXml
    ? parseSharedStringsXml(sharedStringsXml)
    : [];
  const rows = parseSheetRowsXml(sheetXml, sharedStrings);

  return rowsToObjects(rows);
};

const readImportRecords = async (importFile: File) => {
  const lowerName = importFile.name.toLowerCase();
  const isCsv = lowerName.endsWith('.csv');
  const isXlsx = lowerName.endsWith('.xlsx');
  if (!isCsv && !isXlsx) {
    throw new Error('file_format');
  }

  if (isCsv) {
    const content = await importFile.text();
    return csvToObjects(content);
  }

  return xlsxToObjects(await importFile.arrayBuffer());
};

const buildAutoMapping = (
  detectedColumns: string[],
  templateKey: TemplateKey,
) => {
  const available = new Set(
    detectedColumns.map((column) => column.toLowerCase()),
  );
  const detectedByLower = new Map(
    detectedColumns.map((column) => [column.toLowerCase(), column]),
  );
  const result: Record<string, string> = {};

  for (const field of TEMPLATE_FIELDS[templateKey]) {
    const candidates = [
      field.target,
      ...(COLUMN_ALIASES[field.target] ?? []),
    ].map((candidate) => candidate.toLowerCase());

    const match = candidates.find((candidate) => available.has(candidate));
    if (!match) continue;

    const source = detectedByLower.get(match);
    if (source) {
      result[field.target] = source;
    }
  }

  return result;
};

const extractFormMapping = (formData: FormData, templateKey: TemplateKey) => {
  const mapping: Record<string, string> = {};
  for (const field of TEMPLATE_FIELDS[templateKey]) {
    const selected = String(formData.get(`map__${field.target}`) ?? '').trim();
    if (selected) {
      mapping[field.target] = selected;
    }
  }
  return mapping;
};

const applyMappingToRow = (
  row: Record<string, string>,
  mapping: Record<string, string>,
) => {
  const normalized: Record<string, string> = {};
  Object.entries(mapping).forEach(([target, source]) => {
    const value = row[source];
    if (typeof value === 'string') {
      normalized[target] = value.trim();
    }
  });
  return normalized;
};

const pickPreferred = (current: string, incoming: string) => {
  const currentTrimmed = current.trim();
  const incomingTrimmed = incoming.trim();
  if (incomingTrimmed === '') return currentTrimmed;
  if (currentTrimmed === '') return incomingTrimmed;
  return incomingTrimmed;
};

const parseNumericValue = (value: string | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d,.\-]/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = cleaned.split(thousandsSeparator).join('');
    if (decimalSeparator === ',') {
      normalized = normalized.replace(',', '.');
    }
  } else if (hasComma) {
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      normalized = parts.join('');
    } else {
      const decimalCandidate = parts[1] ?? '';
      const isDecimal =
        decimalCandidate.length > 0 && decimalCandidate.length <= 2;
      normalized = isDecimal ? cleaned.replace(',', '.') : parts.join('');
    }
  } else if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      normalized = parts.join('');
    } else {
      const decimalCandidate = parts[1] ?? '';
      const isDecimal =
        decimalCandidate.length > 0 && decimalCandidate.length <= 2;
      normalized = isDecimal ? cleaned : parts.join('');
    }
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDateValue = (value: string | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoLike = /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/;
  if (isoLike.test(trimmed)) {
    const isoTimestamp = Date.parse(trimmed.replace(' ', 'T'));
    if (!Number.isNaN(isoTimestamp)) return isoTimestamp;
  }

  const dmySlash = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dmyDash = /^(\d{2})-(\d{2})-(\d{4})$/;
  const dmyHm = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const slashMatch = trimmed.match(dmySlash);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    const parsed = Date.parse(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const dashMatch = trimmed.match(dmyDash);
  if (dashMatch) {
    const [, dd, mm, yyyy] = dashMatch;
    const parsed = Date.parse(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const dmyHmMatch = trimmed.match(dmyHm);
  if (dmyHmMatch) {
    const now = new Date();
    const [, dRaw, mRaw, hRaw, minRaw, secRaw] = dmyHmMatch;
    const day = Number.parseInt(dRaw, 10);
    const month = Number.parseInt(mRaw, 10);
    const hours = Number.parseInt(hRaw, 10);
    const minutes = Number.parseInt(minRaw, 10);
    const seconds = Number.parseInt(secRaw ?? '0', 10);

    const candidate = new Date(
      now.getFullYear(),
      month - 1,
      day,
      hours,
      minutes,
      seconds,
      0,
    );
    if (!Number.isNaN(candidate.getTime())) {
      return candidate.getTime();
    }
  }

  const fallback = Date.parse(trimmed);
  if (!Number.isNaN(fallback)) return fallback;
  return null;
};

const getRowTimestamp = (row: Record<string, string>) => {
  const candidates = [
    row.source_date,
    row.hora,
    row.sale_date,
    row.fecha_venta,
    row.transaction_date,
    row.last_sale_date,
    row.updated_at,
    row.last_update,
    row.fecha,
    row.date,
  ];
  for (const candidate of candidates) {
    const parsed = parseDateValue(candidate);
    if (parsed != null) return parsed;
  }
  return null;
};

const normalizeComputedUnitPrice = (
  row: Record<string, string>,
  templateKey: TemplateKey,
  mapping: Record<string, string>,
) => {
  if (templateKey !== 'products') {
    return row;
  }

  const currentUnitPrice = parseNumericValue(row.unit_price);
  const mappedUnitPriceSource = normalizeForKey(mapping.unit_price ?? '');
  const unitPriceLooksLikeSubtotalSource =
    mappedUnitPriceSource.includes('subtotal') ||
    mappedUnitPriceSource.includes('line_total') ||
    mappedUnitPriceSource.includes('total_linea') ||
    mappedUnitPriceSource.includes('importe') ||
    (mappedUnitPriceSource.includes('total') &&
      !mappedUnitPriceSource.includes('unit'));

  const quantity = parseNumericValue(
    row.source_quantity ??
      row.quantity ??
      row.qty ??
      row.cantidad ??
      row.unidades,
  );
  const subtotal = parseNumericValue(
    row.source_subtotal ??
      row.subtotal ??
      row.line_total ??
      row.total_linea ??
      row.importe ??
      row.amount ??
      row.total,
  );

  if (
    currentUnitPrice != null &&
    currentUnitPrice >= 0 &&
    !(unitPriceLooksLikeSubtotalSource && quantity != null && quantity > 0)
  ) {
    return row;
  }

  if (quantity == null || subtotal == null || quantity <= 0) {
    return row;
  }

  const computed = subtotal / quantity;
  if (!Number.isFinite(computed) || computed < 0) {
    return row;
  }

  const rounded = Math.round(computed * 100) / 100;
  return {
    ...row,
    unit_price: String(rounded),
  };
};

const mergeRecords = (
  base: Record<string, string>,
  incoming: Record<string, string>,
) => {
  const merged: Record<string, string> = { ...base };
  Object.keys(incoming).forEach((key) => {
    merged[key] = pickPreferred(merged[key] ?? '', incoming[key] ?? '');
  });
  return merged;
};

const mergeProductLikeRecords = (
  base: Record<string, string>,
  incoming: Record<string, string>,
) => {
  const merged = mergeRecords(base, incoming);
  const basePrice = parseNumericValue(base.unit_price);
  const incomingPrice = parseNumericValue(incoming.unit_price);
  const baseTimestamp = getRowTimestamp(base);
  const incomingTimestamp = getRowTimestamp(incoming);

  if (
    basePrice != null &&
    incomingPrice != null &&
    baseTimestamp != null &&
    incomingTimestamp != null
  ) {
    if (incomingTimestamp > baseTimestamp) {
      merged.unit_price = incoming.unit_price;
      if (incoming.source_date?.trim()) {
        merged.source_date = incoming.source_date;
      }
    } else if (baseTimestamp > incomingTimestamp) {
      merged.unit_price = base.unit_price;
      if (base.source_date?.trim()) {
        merged.source_date = base.source_date;
      }
    }
  }

  return merged;
};

const buildProductKey = (row: Record<string, string>) => {
  const barcode = normalizeForKey(row.barcode ?? '');
  if (barcode) return `barcode:${barcode}`;
  const internalCode = normalizeForKey(row.internal_code ?? '');
  if (internalCode) return `internal_code:${internalCode}`;
  return null;
};

const buildSupplierKey = (row: Record<string, string>) => {
  const supplierName = normalizeForKey(
    row.supplier_name ?? row.supplier ?? row.proveedor ?? '',
  );
  if (supplierName) return `supplier:${supplierName}`;
  return null;
};

const deduplicateRecords = (
  records: Array<Record<string, string>>,
  templateKey: TemplateKey,
) => {
  const dedupMap = new Map<string, Record<string, string>>();

  const buildKey = (row: Record<string, string>) => {
    if (templateKey === 'products') {
      return buildProductKey(row);
    }
    if (templateKey === 'suppliers') {
      return buildSupplierKey(row);
    }

    return null;
  };

  records.forEach((row, index) => {
    const businessKey = buildKey(row);
    const fallbackKey = businessKey ?? `__row_${index}`;
    const existing = dedupMap.get(fallbackKey);
    if (!existing) {
      dedupMap.set(fallbackKey, row);
      return;
    }
    if (templateKey === 'products') {
      dedupMap.set(fallbackKey, mergeProductLikeRecords(existing, row));
      return;
    }
    dedupMap.set(fallbackKey, mergeRecords(existing, row));
  });

  const dedupedRecords = Array.from(dedupMap.values());
  return {
    dedupedRecords,
    dedupedCount: Math.max(records.length - dedupedRecords.length, 0),
  };
};

const chunkList = <T,>(values: T[], chunkSize: number) => {
  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

async function callUntypedRpc<T>(
  supabaseClient: unknown,
  fnName: string,
  params: Record<string, unknown>,
) {
  return (
    supabaseClient as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: T; error: { message: string } | null }>;
    }
  ).rpc(fnName, params);
}

async function insertImportRowsInBatches(
  supabaseClient: unknown,
  rows: Array<{
    org_id: string;
    job_id: string;
    row_number: number;
    raw_payload: Record<string, string>;
    normalized_payload: Record<string, string> | null;
  }>,
  batchSize = 500,
) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const chunk = rows.slice(start, start + batchSize);
    const { error } = await (
      supabaseClient as {
        from: (table: string) => {
          insert: (
            values: unknown[],
          ) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .from('data_import_rows')
      .insert(chunk);

    if (error) {
      return { error };
    }
  }

  return { error: null };
}

const loadStagedRecords = async (
  actionSupabase: unknown,
  actionOrgId: string,
  stagedJobId: string,
  expectedTemplate: TemplateKey,
) => {
  const { data: stagedJobData } = await (
    actionSupabase as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string,
          ) => {
            eq: (
              column2: string,
              value2: string,
            ) => {
              maybeSingle: () => Promise<{ data: unknown }>;
            };
          };
        };
      };
    }
  )
    .from('data_import_jobs')
    .select('id, template_key, source_file_name')
    .eq('org_id', actionOrgId)
    .eq('id', stagedJobId)
    .maybeSingle();

  const stagedJob = (stagedJobData as StagedJobRow | null) ?? null;
  if (!stagedJob || stagedJob.template_key !== expectedTemplate) {
    return null;
  }

  const stagedRows: Array<{
    row_number: number;
    raw_payload: Record<string, string> | null;
  }> = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data: stagedRowsData } = await (
      actionSupabase as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (
              column: string,
              value: string,
            ) => {
              eq: (
                column2: string,
                value2: string,
              ) => {
                order: (column3: string) => {
                  range: (
                    fromRow: number,
                    toRow: number,
                  ) => Promise<{ data: unknown }>;
                };
              };
            };
          };
        };
      }
    )
      .from('data_import_rows')
      .select('row_number, raw_payload')
      .eq('org_id', actionOrgId)
      .eq('job_id', stagedJobId)
      .order('row_number')
      .range(from, from + pageSize - 1);

    const chunk =
      (stagedRowsData as Array<{
        row_number: number;
        raw_payload: Record<string, string> | null;
      }> | null) ?? [];
    stagedRows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  const records = stagedRows
    .map((row) =>
      row.raw_payload &&
      typeof row.raw_payload === 'object' &&
      !Array.isArray(row.raw_payload)
        ? row.raw_payload
        : null,
    )
    .filter((row): row is Record<string, string> => row !== null);

  if (records.length === 0) {
    return null;
  }

  return {
    records,
    sourceFileName: stagedJob.source_file_name,
  };
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }

  const orgId = session.orgId;
  const supabase = session.supabase;

  const importCsv = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }
    const actionOrgId = actionSession.orgId;
    const actionSupabase = actionSession.supabase;
    const templateKeyRaw = String(formData.get('template_key') ?? '').trim();
    const templateKey = parseTemplateKey(templateKeyRaw);
    const applyNow = formData.get('apply_now') === 'on';
    const importFile = formData.get('import_file');
    const stagedJobId = String(formData.get('staged_job_id') ?? '').trim();

    if (!templateKey) {
      redirect('/onboarding?result=invalid&message=template');
    }

    let records: Array<Record<string, string>> = [];
    let sourceFileName = '';

    if (stagedJobId) {
      const staged = await loadStagedRecords(
        actionSupabase,
        actionOrgId,
        stagedJobId,
        templateKey,
      );
      if (!staged) {
        redirect('/onboarding?result=invalid&message=staged_job_missing');
      }
      records = staged.records;
      sourceFileName = staged.sourceFileName;
    } else {
      if (!(importFile instanceof File) || importFile.size === 0) {
        redirect('/onboarding?result=invalid&message=file');
      }

      if (importFile.size > 8 * 1024 * 1024) {
        redirect('/onboarding?result=invalid&message=file_too_large');
      }

      try {
        records = await readImportRecords(importFile);
      } catch {
        redirect('/onboarding?result=invalid&message=file_format_or_parse');
      }
      sourceFileName = importFile.name;
    }

    if (records.length === 0) {
      redirect('/onboarding?result=invalid&message=empty');
    }

    if (records.length > IMPORT_MAX_ROWS) {
      redirect('/onboarding?result=invalid&message=too_many_rows');
    }

    const detectedColumns = Object.keys(records[0] ?? {});
    const autoMapping = buildAutoMapping(detectedColumns, templateKey);
    const selectedMapping = extractFormMapping(formData, templateKey);
    const finalMapping = { ...autoMapping, ...selectedMapping };
    const preparedRecords = records.map((row) =>
      normalizeComputedUnitPrice(
        mergeRecords(row, applyMappingToRow(row, finalMapping)),
        templateKey,
        finalMapping,
      ),
    );
    const { dedupedRecords, dedupedCount } = deduplicateRecords(
      preparedRecords,
      templateKey,
    );

    const { data: jobData, error: createJobError } = await callUntypedRpc<
      Array<{ job_id: string }>
    >(actionSupabase, 'rpc_create_data_import_job', {
      p_org_id: actionOrgId,
      p_template_key: templateKey,
      p_source_file_name: sourceFileName || 'staged-import.csv',
      p_source_file_path: null as unknown as string,
    });

    if (createJobError || !jobData?.[0]?.job_id) {
      redirect('/onboarding?result=error&message=create_job');
    }

    const jobId = String(jobData[0].job_id);

    const rowsToInsert = dedupedRecords.map((row, index) => {
      const normalized = applyMappingToRow(row, finalMapping);
      if (templateKey === 'products' && !normalized.unit_price) {
        const fallbackUnitPrice = String(row.unit_price ?? '').trim();
        if (fallbackUnitPrice) {
          normalized.unit_price = fallbackUnitPrice;
        }
      }
      return {
        org_id: actionOrgId,
        job_id: jobId,
        row_number: index + 1,
        raw_payload: row,
        normalized_payload:
          Object.keys(normalized).length > 0 ? normalized : null,
      };
    });

    const { error: batchInsertError } = await insertImportRowsInBatches(
      actionSupabase,
      rowsToInsert,
    );
    if (batchInsertError) {
      redirect('/onboarding?result=error&message=rows_batch_insert');
    }

    const { data: validateData, error: validateError } = await callUntypedRpc<
      Array<{ total_rows: number; valid_rows: number; invalid_rows: number }>
    >(actionSupabase, 'rpc_validate_data_import_job', {
      p_org_id: actionOrgId,
      p_job_id: jobId,
    });

    if (validateError || !validateData?.[0]) {
      redirect('/onboarding?result=error&message=validate');
    }

    const validation = validateData[0];
    let appliedRows = 0;
    let skippedRows = Number(validation.invalid_rows ?? 0);

    if (applyNow && Number(validation.valid_rows ?? 0) > 0) {
      const { data: applyData, error: applyError } = await callUntypedRpc<
        Array<{ applied_rows: number; skipped_rows: number }>
      >(actionSupabase, 'rpc_apply_data_import_job', {
        p_org_id: actionOrgId,
        p_job_id: jobId,
        p_apply_mode: 'valid_only',
      });

      if (applyError || !applyData?.[0]) {
        redirect('/onboarding?result=error&message=apply');
      }

      appliedRows = Number(applyData[0].applied_rows ?? 0);
      skippedRows = Number(applyData[0].skipped_rows ?? 0);
    }

    revalidatePath('/onboarding');
    revalidatePath('/products');
    revalidatePath('/suppliers');
    revalidatePath('/orders');
    revalidatePath('/payments');

    const params = new URLSearchParams({
      result: 'imported',
      job_id: jobId,
      total_rows: String(validation.total_rows ?? 0),
      valid_rows: String(validation.valid_rows ?? 0),
      invalid_rows: String(validation.invalid_rows ?? 0),
      applied_rows: String(appliedRows),
      skipped_rows: String(skippedRows),
      deduped_rows: String(dedupedCount),
    });

    redirect(`/onboarding?${params.toString()}`);
  };

  const detectImportColumns = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }
    const actionOrgId = actionSession.orgId;

    const templateKeyRaw = String(formData.get('template_key') ?? '').trim();
    const templateKey = parseTemplateKey(templateKeyRaw);
    const importFile = formData.get('import_file');

    if (!templateKey) {
      redirect('/onboarding?result=invalid&message=template');
    }

    if (!(importFile instanceof File) || importFile.size === 0) {
      redirect('/onboarding?result=invalid&message=file');
    }

    if (importFile.size > 8 * 1024 * 1024) {
      redirect('/onboarding?result=invalid&message=file_too_large');
    }

    let records: Array<Record<string, string>> = [];
    try {
      records = await readImportRecords(importFile);
    } catch {
      redirect('/onboarding?result=invalid&message=file_format_or_parse');
    }

    if (records.length === 0) {
      redirect('/onboarding?result=invalid&message=empty');
    }

    if (records.length > IMPORT_MAX_ROWS) {
      redirect('/onboarding?result=invalid&message=too_many_rows');
    }

    const { data: stagedJobData, error: stagedJobError } = await callUntypedRpc<
      Array<{ job_id: string }>
    >(actionSession.supabase, 'rpc_create_data_import_job', {
      p_org_id: actionOrgId,
      p_template_key: templateKey,
      p_source_file_name: importFile.name,
      p_source_file_path: null as unknown as string,
    });

    if (stagedJobError || !stagedJobData?.[0]?.job_id) {
      redirect('/onboarding?result=error&message=stage_create_job');
    }

    const stagedJobId = String(stagedJobData[0].job_id);
    const stagedRows = records.map((row, index) => ({
      org_id: actionOrgId,
      job_id: stagedJobId,
      row_number: index + 1,
      raw_payload: row,
      normalized_payload: null,
    }));
    const { error: stageRowsError } = await insertImportRowsInBatches(
      actionSession.supabase,
      stagedRows,
    );
    if (stageRowsError) {
      redirect('/onboarding?result=error&message=stage_rows');
    }

    const detectedColumns = Object.keys(records[0] ?? {});
    const proposedMap = buildAutoMapping(detectedColumns, templateKey);
    const params = new URLSearchParams({
      result: 'mapping_ready',
      mapping_template: templateKey,
      detected_cols: encodeJsonBase64(detectedColumns),
      proposed_map: encodeJsonBase64(proposedMap),
      staged_job_id: stagedJobId,
      staged_file_name: importFile.name,
    });

    redirect(`/onboarding?${params.toString()}`);
  };

  const resolveIncompleteProduct = async (
    formData: FormData,
  ): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const actionOrgId = actionSession.orgId;
    const actionSupabase = actionSession.supabase;
    const productId = String(formData.get('product_id') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const brand = String(formData.get('brand') ?? '').trim();
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const sellUnitType = String(formData.get('sell_unit_type') ?? 'unit') as
      | 'unit'
      | 'weight'
      | 'bulk';
    const uom = String(formData.get('uom') ?? '').trim();
    const supplierPriceRaw = String(
      formData.get('supplier_price') ?? '',
    ).trim();
    const unitPriceRaw = String(formData.get('unit_price') ?? '0').trim();
    const shelfLifeRaw = String(formData.get('shelf_life_days') ?? '').trim();
    const primarySupplierId = String(
      formData.get('primary_supplier_id') ?? '',
    ).trim();
    const secondarySupplierIdRaw = String(
      formData.get('secondary_supplier_id') ?? '',
    ).trim();
    const primarySupplierSku = String(
      formData.get('primary_supplier_sku') ?? '',
    ).trim();
    const primarySupplierProductName = String(
      formData.get('primary_supplier_product_name') ?? '',
    ).trim();
    const safetyStockRaw = String(formData.get('safety_stock') ?? '').trim();

    if (!productId || !name) {
      redirect(
        '/onboarding?resolver=products_incomplete_info&result=invalid&message=resolver_required',
      );
    }

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      redirect(
        '/onboarding?resolver=products_incomplete_info&result=invalid&message=resolver_unit_price',
      );
    }
    if (supplierPriceRaw !== '') {
      const supplierPrice = Number(supplierPriceRaw);
      if (Number.isNaN(supplierPrice) || supplierPrice < 0) {
        redirect(
          '/onboarding?resolver=products_incomplete_info&result=invalid&message=resolver_supplier_price',
        );
      }
    }

    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      redirect(
        '/onboarding?resolver=products_incomplete_info&result=invalid&message=resolver_shelf_life',
      );
    }

    await actionSupabase.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: actionOrgId,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: true,
      p_shelf_life_days: shelfLifeDays,
    });
    await actionSupabase
      .from('products' as never)
      .update({ brand: brand || null } as never)
      .eq('org_id', actionOrgId)
      .eq('id', productId);

    if (primarySupplierId) {
      await actionSupabase.rpc('rpc_upsert_supplier_product', {
        p_org_id: actionOrgId,
        p_supplier_id: primarySupplierId,
        p_product_id: productId,
        p_supplier_sku: primarySupplierSku,
        p_supplier_product_name: primarySupplierProductName,
        p_relation_type: 'primary',
        p_supplier_price:
          supplierPriceRaw === '' ? null : Number(supplierPriceRaw),
      });
    } else {
      await actionSupabase.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: actionOrgId,
        p_product_id: productId,
        p_relation_type: 'primary',
      });
    }

    const secondarySupplierId =
      secondarySupplierIdRaw && secondarySupplierIdRaw !== primarySupplierId
        ? secondarySupplierIdRaw
        : '';

    if (secondarySupplierId) {
      await actionSupabase.rpc('rpc_upsert_supplier_product', {
        p_org_id: actionOrgId,
        p_supplier_id: secondarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'secondary',
        p_supplier_price: null,
      });
    } else {
      await actionSupabase.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: actionOrgId,
        p_product_id: productId,
        p_relation_type: 'secondary',
      });
    }

    if (safetyStockRaw !== '') {
      const safetyStock = Number(safetyStockRaw);
      if (!Number.isNaN(safetyStock) && safetyStock >= 0) {
        const { data: activeBranches } = await actionSupabase
          .from('branches')
          .select('id')
          .eq('org_id', actionOrgId)
          .eq('is_active', true);

        await Promise.all(
          (activeBranches ?? []).map((branch) =>
            actionSupabase.rpc('rpc_set_safety_stock', {
              p_org_id: actionOrgId,
              p_branch_id: branch.id,
              p_product_id: productId,
              p_safety_stock: safetyStock,
            }),
          ),
        );
      }
    }

    revalidatePath('/onboarding');
    revalidatePath('/products');
    revalidatePath('/suppliers');

    redirect(
      '/onboarding?resolver=products_incomplete_info&result=resolved_product_incomplete',
    );
  };

  const applyBulkProductPatch = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const actionOrgId = actionSession.orgId;
    const actionSupabase = actionSession.supabase;
    const applyTarget = String(
      formData.get('apply_target') ?? 'selected',
    ).trim();
    const bulkQuery = String(formData.get('bulk_q') ?? '').trim();
    const bulkTokens = bulkQuery
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 5);

    const selectedProductIds = formData
      .getAll('product_ids')
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    const targetIds =
      applyTarget === 'filtered'
        ? (
            await fetchAllPages<{ id: string }>(
              (from, to) => {
                let query = actionSupabase
                  .from('products' as never)
                  .select('id')
                  .eq('org_id', actionOrgId)
                  .order('name')
                  .range(from, to);
                bulkTokens.forEach((token) => {
                  query = query.ilike('name', `%${token}%`);
                });
                return query;
              },
              { label: 'onboarding_bulk_target_ids', pageSize: 1000 },
            )
          ).map((row) => row.id)
        : selectedProductIds;

    const uniqueTargetIds = Array.from(new Set(targetIds));
    if (uniqueTargetIds.length === 0) {
      redirect(
        '/onboarding?result=invalid&message=bulk_products_required#bulk-products',
      );
    }

    const applyBrand = formData.get('apply_brand') === 'on';
    const applyPrimarySupplier =
      formData.get('apply_primary_supplier') === 'on';
    const applySecondarySupplier =
      formData.get('apply_secondary_supplier') === 'on';
    const applyShelfLifeDays = formData.get('apply_shelf_life_days') === 'on';
    const applySupplierPrice = formData.get('apply_supplier_price') === 'on';
    const applyUnitPrice = formData.get('apply_unit_price') === 'on';

    if (
      !applyBrand &&
      !applyPrimarySupplier &&
      !applySecondarySupplier &&
      !applyShelfLifeDays &&
      !applySupplierPrice &&
      !applyUnitPrice
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_fields_required#bulk-products',
      );
    }

    const brand = String(formData.get('bulk_brand') ?? '').trim();
    if (applyBrand && !brand) {
      redirect(
        '/onboarding?result=invalid&message=bulk_brand_required#bulk-products',
      );
    }

    const primarySupplierId = String(
      formData.get('bulk_primary_supplier_id') ?? '',
    ).trim();
    if (applyPrimarySupplier && !primarySupplierId) {
      redirect(
        '/onboarding?result=invalid&message=bulk_primary_supplier_required#bulk-products',
      );
    }

    const secondarySupplierId = String(
      formData.get('bulk_secondary_supplier_id') ?? '',
    ).trim();
    if (applySecondarySupplier && !secondarySupplierId) {
      redirect(
        '/onboarding?result=invalid&message=bulk_secondary_supplier_required#bulk-products',
      );
    }
    if (
      applyPrimarySupplier &&
      applySecondarySupplier &&
      primarySupplierId &&
      secondarySupplierId &&
      primarySupplierId === secondarySupplierId
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_suppliers_must_differ#bulk-products',
      );
    }

    const shelfLifeDaysRaw = String(
      formData.get('bulk_shelf_life_days') ?? '',
    ).trim();
    const shelfLifeNoApplies =
      formData.get('bulk_shelf_life_no_applies') === 'on';
    const shelfLifeDaysParsed = shelfLifeNoApplies
      ? 0
      : Number.parseInt(shelfLifeDaysRaw, 10);
    const shelfLifeDays = applyShelfLifeDays ? shelfLifeDaysParsed : null;
    if (
      applyShelfLifeDays &&
      ((!shelfLifeNoApplies && shelfLifeDaysRaw === '') ||
        Number.isNaN(shelfLifeDaysParsed) ||
        shelfLifeDaysParsed < 0)
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_shelf_life_invalid#bulk-products',
      );
    }

    const supplierPriceRaw = String(
      formData.get('bulk_supplier_price') ?? '',
    ).trim();
    const supplierPriceParsed = Number(supplierPriceRaw);
    const supplierPrice = applySupplierPrice ? supplierPriceParsed : null;
    if (
      applySupplierPrice &&
      (supplierPriceRaw === '' ||
        Number.isNaN(supplierPriceParsed) ||
        supplierPriceParsed < 0)
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_supplier_price_invalid#bulk-products',
      );
    }

    const unitPriceRaw = String(formData.get('bulk_unit_price') ?? '').trim();
    const unitPriceParsed = Number(unitPriceRaw);
    const unitPrice = applyUnitPrice ? unitPriceParsed : null;
    if (
      applyUnitPrice &&
      (unitPriceRaw === '' ||
        Number.isNaN(unitPriceParsed) ||
        unitPriceParsed < 0)
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_unit_price_invalid#bulk-products',
      );
    }

    const productPatch: Record<string, unknown> = {};
    if (applyBrand) {
      productPatch.brand = brand;
    }
    if (applyShelfLifeDays) {
      productPatch.shelf_life_days = shelfLifeDays;
    }
    if (applyUnitPrice) {
      productPatch.unit_price = unitPrice;
    }

    const updatedProducts = new Set<string>();
    if (Object.keys(productPatch).length > 0) {
      for (const idsChunk of chunkList(uniqueTargetIds, 200)) {
        const { error } = await actionSupabase
          .from('products' as never)
          .update(productPatch as never)
          .eq('org_id', actionOrgId)
          .in('id', idsChunk);
        if (error) {
          redirect(
            '/onboarding?result=error&message=bulk_update_products#bulk-products',
          );
        }
        idsChunk.forEach((id) => updatedProducts.add(id));
      }
    }

    const relationByProduct = new Map<string, ProductRelationByType>();
    if (applyPrimarySupplier || applySecondarySupplier || applySupplierPrice) {
      for (const idsChunk of chunkList(uniqueTargetIds, 500)) {
        const { data, error } = await actionSupabase
          .from('supplier_products' as never)
          .select(
            'product_id, supplier_id, relation_type, supplier_price, supplier_sku, supplier_product_name',
          )
          .eq('org_id', actionOrgId)
          .in('relation_type', ['primary', 'secondary'])
          .in('product_id', idsChunk);

        if (error) {
          redirect(
            '/onboarding?result=error&message=bulk_load_relations#bulk-products',
          );
        }

        ((data ?? []) as SupplierProductRelationRow[]).forEach((relation) => {
          if (!relation.product_id || !relation.supplier_id) return;
          const current = relationByProduct.get(relation.product_id) ?? {};
          if (relation.relation_type === 'primary') {
            current.primary = {
              supplier_id: relation.supplier_id,
              supplier_price: relation.supplier_price,
              supplier_sku: relation.supplier_sku,
              supplier_product_name: relation.supplier_product_name,
            };
          } else {
            current.secondary = { supplier_id: relation.supplier_id };
          }
          relationByProduct.set(relation.product_id, current);
        });
      }
    }

    let skippedNoPrimary = 0;
    for (const idsChunk of chunkList(uniqueTargetIds, 50)) {
      await Promise.all(
        idsChunk.map(async (productId) => {
          const relation = relationByProduct.get(productId);

          if (applyPrimarySupplier && primarySupplierId) {
            const preservePrimary =
              relation?.primary?.supplier_id === primarySupplierId
                ? relation.primary
                : undefined;
            const { error } = await actionSupabase.rpc(
              'rpc_upsert_supplier_product',
              {
                p_org_id: actionOrgId,
                p_supplier_id: primarySupplierId,
                p_product_id: productId,
                p_supplier_sku: preservePrimary?.supplier_sku ?? '',
                p_supplier_product_name:
                  preservePrimary?.supplier_product_name ?? '',
                p_relation_type: 'primary',
                p_supplier_price: applySupplierPrice
                  ? supplierPrice
                  : (preservePrimary?.supplier_price ?? null),
              },
            );
            if (error) {
              throw new Error(error.message);
            }
            updatedProducts.add(productId);
          } else if (applySupplierPrice) {
            const currentPrimary = relation?.primary;
            if (!currentPrimary?.supplier_id) {
              skippedNoPrimary += 1;
              return;
            }
            const { error } = await actionSupabase.rpc(
              'rpc_upsert_supplier_product',
              {
                p_org_id: actionOrgId,
                p_supplier_id: currentPrimary.supplier_id,
                p_product_id: productId,
                p_supplier_sku: currentPrimary.supplier_sku ?? '',
                p_supplier_product_name:
                  currentPrimary.supplier_product_name ?? '',
                p_relation_type: 'primary',
                p_supplier_price: supplierPrice,
              },
            );
            if (error) {
              throw new Error(error.message);
            }
            updatedProducts.add(productId);
          }

          if (applySecondarySupplier && secondarySupplierId) {
            const { error } = await actionSupabase.rpc(
              'rpc_upsert_supplier_product',
              {
                p_org_id: actionOrgId,
                p_supplier_id: secondarySupplierId,
                p_product_id: productId,
                p_supplier_sku: '',
                p_supplier_product_name: '',
                p_relation_type: 'secondary',
                p_supplier_price: null,
              },
            );
            if (error) {
              throw new Error(error.message);
            }
            updatedProducts.add(productId);
          }
        }),
      ).catch(() => {
        redirect(
          '/onboarding?result=error&message=bulk_apply_relations#bulk-products',
        );
      });
    }

    revalidatePath('/onboarding');
    revalidatePath('/products');
    revalidatePath('/suppliers');

    const params = new URLSearchParams({
      result: 'bulk_applied',
      bulk_scope: applyTarget === 'filtered' ? 'filtered' : 'selected',
      bulk_updated: String(updatedProducts.size),
      bulk_skipped: String(skippedNoPrimary),
      bulk_q: bulkQuery,
    });
    redirect(`/onboarding?${params.toString()}#bulk-products`);
  };

  const createBulkSupplier = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const actionOrgId = actionSession.orgId;
    const actionSupabase = actionSession.supabase;
    const bulkQueryValue = String(formData.get('bulk_q') ?? '').trim();
    const bulkPageValue = Number.parseInt(
      String(formData.get('bulk_page') ?? '1'),
      10,
    );
    const bulkPageSizeValue = Number.parseInt(
      String(formData.get('bulk_page_size') ?? '50'),
      10,
    );
    const bulkStateValue = String(formData.get('bulk_state') ?? '').trim();

    const name = String(formData.get('name') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const orderFrequency = String(formData.get('order_frequency') ?? '').trim();
    const orderDay = String(formData.get('order_day') ?? '').trim();
    const receiveDay = String(formData.get('receive_day') ?? '').trim();
    const paymentTermsDaysRaw = String(
      formData.get('payment_terms_days') ?? '',
    ).trim();
    const preferredPaymentMethod = String(
      formData.get('preferred_payment_method') ?? '',
    ).trim();
    const paymentNote = String(formData.get('payment_note') ?? '').trim();
    const defaultMarkupPctRaw = String(
      formData.get('default_markup_pct') ?? '40',
    ).trim();
    const paymentTermsDays =
      paymentTermsDaysRaw === ''
        ? null
        : Number.parseInt(paymentTermsDaysRaw, 10);
    const defaultMarkupPct = Number(defaultMarkupPctRaw);
    const acceptsCash = preferredPaymentMethod !== 'transfer';
    const acceptsTransfer = preferredPaymentMethod !== 'cash';

    if (!name) {
      redirect(
        '/onboarding?result=invalid&message=bulk_supplier_name_required#bulk-products',
      );
    }
    if (
      paymentTermsDays !== null &&
      (Number.isNaN(paymentTermsDays) || paymentTermsDays < 0)
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_supplier_payment_terms_invalid#bulk-products',
      );
    }
    if (
      Number.isNaN(defaultMarkupPct) ||
      defaultMarkupPct < 0 ||
      defaultMarkupPct > 1000
    ) {
      redirect(
        '/onboarding?result=invalid&message=bulk_supplier_markup_invalid#bulk-products',
      );
    }

    const supplierId = randomUUID();
    const { error: supplierError } = await actionSupabase.rpc(
      'rpc_upsert_supplier',
      {
        p_supplier_id: supplierId,
        p_org_id: actionOrgId,
        p_name: name,
        p_contact_name: contactName,
        p_phone: phone,
        p_email: email,
        p_notes: notes,
        p_is_active: true,
        p_order_frequency: orderFrequency || null,
        p_order_day: orderDay || null,
        p_receive_day: receiveDay || null,
        p_payment_terms_days: paymentTermsDays,
        p_preferred_payment_method:
          preferredPaymentMethod === 'cash' ||
          preferredPaymentMethod === 'transfer'
            ? preferredPaymentMethod
            : null,
        p_accepts_cash: acceptsCash,
        p_accepts_transfer: acceptsTransfer,
        p_payment_note: paymentNote,
        p_default_markup_pct: defaultMarkupPct,
      },
    );

    if (supplierError) {
      redirect(
        '/onboarding?result=error&message=bulk_create_supplier#bulk-products',
      );
    }

    const accountLabel = String(formData.get('account_label') ?? '').trim();
    const bankName = String(formData.get('bank_name') ?? '').trim();
    const accountHolderName = String(
      formData.get('account_holder_name') ?? '',
    ).trim();
    const accountIdentifier = String(
      formData.get('account_identifier') ?? '',
    ).trim();
    const accountIsActive = formData.get('account_is_active') === 'on';
    const hasAccountPayload =
      accountLabel || bankName || accountHolderName || accountIdentifier;

    if (hasAccountPayload) {
      const { error: accountError } = await actionSupabase.rpc(
        'rpc_upsert_supplier_payment_account',
        {
          p_org_id: actionOrgId,
          p_supplier_id: supplierId,
          p_account_id: undefined,
          p_account_label: accountLabel || undefined,
          p_bank_name: bankName || undefined,
          p_account_holder_name: accountHolderName || undefined,
          p_account_identifier: accountIdentifier || undefined,
          p_is_active: accountIsActive,
        },
      );
      if (accountError) {
        redirect(
          '/onboarding?result=error&message=bulk_create_supplier_account#bulk-products',
        );
      }
    }

    revalidatePath('/onboarding');
    revalidatePath('/suppliers');
    revalidatePath('/payments');

    const params = new URLSearchParams({
      result: 'bulk_supplier_created',
      bulk_supplier_created: name,
      bulk_q: bulkQueryValue,
      bulk_page: String(Number.isFinite(bulkPageValue) ? bulkPageValue : 1),
      bulk_page_size: String(
        Number.isFinite(bulkPageSizeValue) ? bulkPageSizeValue : 50,
      ),
    });
    if (bulkStateValue) {
      params.set('bulk_state', bulkStateValue);
    }
    redirect(`/onboarding?${params.toString()}#bulk-products`);
  };

  const resolverPageRaw = Number.parseInt(
    String(resolvedSearchParams.resolver_page ?? '1'),
    10,
  );
  const resolverPage = Number.isFinite(resolverPageRaw)
    ? Math.max(1, resolverPageRaw)
    : 1;
  const resolverQuery = String(resolvedSearchParams.resolver_q ?? '').trim();
  const resolverTokens = resolverQuery
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);
  const resolverPageSize = 25;
  const bulkQuery = String(resolvedSearchParams.bulk_q ?? '').trim();
  const bulkTokens = bulkQuery
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);
  const bulkPageRaw = Number.parseInt(
    String(resolvedSearchParams.bulk_page ?? '1'),
    10,
  );
  const bulkPage = Number.isFinite(bulkPageRaw) ? Math.max(1, bulkPageRaw) : 1;
  const bulkPageSizeRaw = Number.parseInt(
    String(resolvedSearchParams.bulk_page_size ?? '50'),
    10,
  );
  const bulkPageSize = BULK_PAGE_SIZE_OPTIONS.includes(
    bulkPageSizeRaw as (typeof BULK_PAGE_SIZE_OPTIONS)[number],
  )
    ? bulkPageSizeRaw
    : 50;

  let resolverCountQuery = supabase
    .from('v_products_incomplete_admin' as never)
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  let resolverRowsQuery = supabase
    .from('v_products_incomplete_admin' as never)
    .select(
      'id, name, brand, internal_code, barcode, sell_unit_type, uom, unit_price, shelf_life_days, has_primary_supplier, missing_primary_supplier, missing_shelf_life, missing_identifier',
    )
    .eq('org_id', orgId)
    .order('name')
    .range(
      (resolverPage - 1) * resolverPageSize,
      resolverPage * resolverPageSize - 1,
    );

  resolverTokens.forEach((token) => {
    resolverCountQuery = resolverCountQuery.ilike('name', `%${token}%`);
    resolverRowsQuery = resolverRowsQuery.ilike('name', `%${token}%`);
  });

  let bulkCountQuery = supabase
    .from('products' as never)
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  let bulkRowsQuery = supabase
    .from('products' as never)
    .select(
      'id, name, brand, internal_code, barcode, unit_price, shelf_life_days, is_active',
    )
    .eq('org_id', orgId)
    .order('name')
    .range((bulkPage - 1) * bulkPageSize, bulkPage * bulkPageSize - 1);

  bulkTokens.forEach((token) => {
    bulkCountQuery = bulkCountQuery.ilike('name', `%${token}%`);
    bulkRowsQuery = bulkRowsQuery.ilike('name', `%${token}%`);
  });

  const [
    tasksResult,
    jobsResult,
    suppliersResult,
    resolverCountResult,
    resolverRowsResult,
    bulkCountResult,
    bulkRowsResult,
    brandsResult,
  ] = await Promise.all([
    supabase
      .from('v_data_onboarding_tasks' as never)
      .select('task_key, task_label, pending_count')
      .eq('org_id', orgId),
    supabase
      .from('data_import_jobs' as never)
      .select(
        'id, template_key, source_file_name, status, total_rows, valid_rows, invalid_rows, applied_rows, created_at',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('suppliers' as never)
      .select('id, name, is_active, default_markup_pct')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name'),
    resolverCountQuery,
    resolverRowsQuery,
    bulkCountQuery,
    bulkRowsQuery,
    supabase
      .from('products' as never)
      .select('brand')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .not('brand', 'is', null)
      .order('brand')
      .limit(5000),
  ]);

  const tasks = (tasksResult.data ?? []) as OnboardingTaskRow[];
  const jobs = (jobsResult.data ?? []) as ImportJobRow[];
  const suppliers = (
    (suppliersResult.data ?? []) as unknown as SupplierOption[]
  ).filter((supplier) => supplier.id && supplier.name);
  const productsIncompleteCount = Number(resolverCountResult.count ?? 0);
  const quickResolverProducts =
    (resolverRowsResult.data as unknown as IncompleteProductRow[]) ?? [];
  const resolverProductIds = quickResolverProducts.map((product) => product.id);
  const bulkProducts = (bulkRowsResult.data as BulkProductRow[] | null) ?? [];
  const bulkProductsCount = Number(bulkCountResult.count ?? 0);
  const bulkProductIds = bulkProducts.map((product) => product.id);

  const [supplierRelationsResult, safetyStockResult, bulkRelationsResult] =
    await Promise.all([
      resolverProductIds.length === 0
        ? Promise.resolve({ data: [] as SupplierProductRelationRow[] })
        : supabase
            .from('supplier_products' as never)
            .select(
              'product_id, supplier_id, relation_type, supplier_price, supplier_sku, supplier_product_name',
            )
            .eq('org_id', orgId)
            .in('relation_type', ['primary', 'secondary'])
            .in('product_id', resolverProductIds),
      resolverProductIds.length === 0
        ? Promise.resolve({ data: [] as StockSafetyRow[] })
        : supabase
            .from('stock_items')
            .select('product_id, safety_stock')
            .eq('org_id', orgId)
            .in('product_id', resolverProductIds),
      bulkProductIds.length === 0
        ? Promise.resolve({ data: [] as SupplierProductRelationRow[] })
        : supabase
            .from('supplier_products' as never)
            .select(
              'product_id, supplier_id, relation_type, supplier_price, supplier_sku, supplier_product_name, suppliers(name)',
            )
            .eq('org_id', orgId)
            .in('relation_type', ['primary', 'secondary'])
            .in('product_id', bulkProductIds),
    ]);

  const supplierRelationsTyped =
    (supplierRelationsResult.data as SupplierProductRelationRow[] | null) ?? [];
  const safetyStockRows =
    (safetyStockResult.data as StockSafetyRow[] | null) ?? [];
  const brandSuggestions = Array.from(
    new Set(
      ((brandsResult.data ?? []) as Array<{ brand?: string | null }>)
        .map((product) => String(product.brand ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const bulkRelations =
    (bulkRelationsResult.data as SupplierProductRelationRow[] | null) ?? [];
  const bulkPrimarySupplierByProduct = new Map<
    string,
    {
      supplier_id: string;
      supplier_name: string;
      supplier_price: number | null;
    }
  >();
  const bulkSecondarySupplierByProduct = new Map<
    string,
    { supplier_id: string; supplier_name: string }
  >();
  bulkRelations.forEach((relation) => {
    if (!relation.product_id || !relation.supplier_id) return;
    const supplierName = String(relation.suppliers?.name ?? 'Proveedor').trim();
    if (relation.relation_type === 'primary') {
      bulkPrimarySupplierByProduct.set(relation.product_id, {
        supplier_id: relation.supplier_id,
        supplier_name: supplierName,
        supplier_price: relation.supplier_price,
      });
      return;
    }
    bulkSecondarySupplierByProduct.set(relation.product_id, {
      supplier_id: relation.supplier_id,
      supplier_name: supplierName,
    });
  });

  const relationByProduct = new Map<string, ProductRelationByType>();
  supplierRelationsTyped.forEach((relation) => {
    if (!relation.product_id || !relation.supplier_id) return;
    const current = relationByProduct.get(relation.product_id) ?? {};
    if (relation.relation_type === 'primary') {
      current.primary = {
        supplier_id: relation.supplier_id,
        supplier_price: relation.supplier_price,
        supplier_sku: relation.supplier_sku,
        supplier_product_name: relation.supplier_product_name,
      };
    } else {
      current.secondary = { supplier_id: relation.supplier_id };
    }
    relationByProduct.set(relation.product_id, current);
  });

  const safetyStockByProduct = new Map<string, number | null>();
  safetyStockRows.forEach((row) => {
    if (!row.product_id) return;
    const value = Number(row.safety_stock ?? 0);
    if (Number.isNaN(value)) return;

    const current = safetyStockByProduct.get(row.product_id);
    if (current === undefined) {
      safetyStockByProduct.set(row.product_id, value);
      return;
    }
    if (current === null) return;

    if (Math.abs(current - value) > 0.0001) {
      safetyStockByProduct.set(row.product_id, null);
    }
  });

  const isProductsIncompleteResolverOpen =
    resolvedSearchParams.resolver === 'products_incomplete_info';
  const resolverTotalPages = Math.max(
    1,
    Math.ceil(productsIncompleteCount / resolverPageSize),
  );
  const resolverCurrentPage = Math.min(resolverPage, resolverTotalPages);
  const resolverStartIndex =
    productsIncompleteCount === 0
      ? 0
      : (resolverCurrentPage - 1) * resolverPageSize + 1;
  const resolverEndIndex = Math.min(
    resolverCurrentPage * resolverPageSize,
    productsIncompleteCount,
  );
  const buildResolverHref = (page: number) => {
    const params = new URLSearchParams();
    params.set('resolver', 'products_incomplete_info');
    params.set('resolver_page', String(page));
    if (resolverQuery) {
      params.set('resolver_q', resolverQuery);
    }
    return `/onboarding?${params.toString()}#resolver-products-incomplete-info`;
  };
  const bulkTotalPages = Math.max(
    1,
    Math.ceil(bulkProductsCount / bulkPageSize),
  );
  const bulkCurrentPage = Math.min(bulkPage, bulkTotalPages);
  const bulkStartIndex =
    bulkProductsCount === 0 ? 0 : (bulkCurrentPage - 1) * bulkPageSize + 1;
  const bulkEndIndex = Math.min(
    bulkCurrentPage * bulkPageSize,
    bulkProductsCount,
  );
  const buildBulkHref = (page: number, pageSize?: number) => {
    const params = new URLSearchParams();
    params.set('bulk_page', String(Math.max(1, page)));
    params.set('bulk_page_size', String(pageSize ?? bulkPageSize));
    if (bulkQuery) {
      params.set('bulk_q', bulkQuery);
    }
    return `/onboarding?${params.toString()}#bulk-products`;
  };

  const taskMap = new Map<SupplierTaskKey, number>();
  tasks.forEach((task) => {
    if (
      task.task_key === 'suppliers_without_payment_terms' ||
      task.task_key === 'suppliers_without_preferred_payment_method'
    ) {
      taskMap.set(task.task_key, Number(task.pending_count ?? 0));
    }
  });

  const totalPending = TASK_META.reduce((sum, task) => {
    if (task.key === 'products_incomplete_info') {
      return sum + productsIncompleteCount;
    }
    return sum + Number(taskMap.get(task.key) ?? 0);
  }, 0);

  const importSummary =
    resolvedSearchParams.result === 'imported'
      ? {
          jobId: resolvedSearchParams.job_id ?? '-',
          totalRows: Number(resolvedSearchParams.total_rows ?? 0),
          validRows: Number(resolvedSearchParams.valid_rows ?? 0),
          invalidRows: Number(resolvedSearchParams.invalid_rows ?? 0),
          appliedRows: Number(resolvedSearchParams.applied_rows ?? 0),
          skippedRows: Number(resolvedSearchParams.skipped_rows ?? 0),
          dedupedRows: Number(resolvedSearchParams.deduped_rows ?? 0),
        }
      : null;
  const bulkSummary =
    resolvedSearchParams.result === 'bulk_applied'
      ? {
          scope:
            resolvedSearchParams.bulk_scope === 'filtered'
              ? 'todos los resultados filtrados'
              : 'seleccionados',
          updatedRows: Number(resolvedSearchParams.bulk_updated ?? 0),
          skippedRows: Number(resolvedSearchParams.bulk_skipped ?? 0),
          query: String(resolvedSearchParams.bulk_q ?? '').trim(),
        }
      : null;
  const bulkSupplierCreated =
    resolvedSearchParams.result === 'bulk_supplier_created'
      ? String(resolvedSearchParams.bulk_supplier_created ?? '').trim()
      : '';

  const mappingTemplate = parseTemplateKey(
    String(resolvedSearchParams.mapping_template ?? ''),
  );
  const detectedColumns =
    decodeJsonBase64<string[]>(resolvedSearchParams.detected_cols) ?? [];
  const proposedMap =
    decodeJsonBase64<Record<string, string>>(
      resolvedSearchParams.proposed_map,
    ) ?? {};
  const mappingFields = mappingTemplate ? TEMPLATE_FIELDS[mappingTemplate] : [];
  const showMappingConfigurator =
    Boolean(mappingTemplate) && detectedColumns.length > 0;
  const defaultTemplate = mappingTemplate ?? 'products';
  const stagedJobId = String(resolvedSearchParams.staged_job_id ?? '').trim();
  const stagedFileName = String(
    resolvedSearchParams.staged_file_name ?? '',
  ).trim();
  const bulkDraftState =
    decodeJsonBase64<BulkDraftState>(resolvedSearchParams.bulk_state) ?? null;
  const selectedBulkProductIds = new Set(
    bulkDraftState?.selectedProductIds ?? [],
  );

  const invalidMessageMap: Record<string, string> = {
    template: 'Plantilla inválida.',
    file: 'Debes seleccionar un archivo.',
    file_too_large: 'Archivo demasiado grande (máximo 8 MB).',
    file_format_or_parse:
      'Formato no soportado o no se pudo leer el archivo (usar CSV o XLSX).',
    empty: 'El archivo no contiene filas con datos.',
    too_many_rows: `El archivo supera el máximo permitido (${IMPORT_MAX_ROWS} filas).`,
    staged_job_missing:
      'El archivo detectado ya no está disponible. Cárgalo de nuevo y detecta columnas.',
    bulk_products_required:
      'Debes seleccionar productos o usar "todos los resultados filtrados".',
    bulk_fields_required: 'Selecciona al menos un campo para aplicar en masa.',
    bulk_brand_required: 'Marca requerida para aplicar actualización de marca.',
    bulk_primary_supplier_required:
      'Selecciona un proveedor primario para aplicar ese cambio.',
    bulk_secondary_supplier_required:
      'Selecciona un proveedor secundario para aplicar ese cambio.',
    bulk_suppliers_must_differ:
      'Proveedor primario y secundario no pueden ser el mismo.',
    bulk_shelf_life_invalid:
      'Vencimiento aproximado inválido. Debe ser entero >= 0 o marcar "No aplica vencimiento".',
    bulk_supplier_price_invalid:
      'Precio proveedor inválido. Debe ser numérico y >= 0.',
    bulk_unit_price_invalid:
      'Precio unitario inválido. Debe ser numérico y >= 0.',
    bulk_supplier_name_required: 'Nombre de proveedor requerido.',
    bulk_supplier_payment_terms_invalid:
      'Plazo de pago inválido. Debe ser entero >= 0.',
    bulk_supplier_markup_invalid:
      '% ganancia sugerida inválido. Debe estar entre 0 y 1000.',
  };
  const invalidDetail =
    invalidMessageMap[resolvedSearchParams.message ?? ''] ??
    resolvedSearchParams.message ??
    '-';

  const showError = resolvedSearchParams.result === 'error';
  const showInvalid = resolvedSearchParams.result === 'invalid';
  const showProductCompleted =
    resolvedSearchParams.result === 'resolved_product_incomplete';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Onboarding de datos
          </h1>
          <p className="text-sm text-zinc-600">
            Importa catalogos por CSV/XLSX y completa datos maestros para una
            operacion consistente.
          </p>
        </header>

        {importSummary ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              Importacion finalizada (job {importSummary.jobId})
            </p>
            <p className="mt-1">
              Filas: {importSummary.totalRows} total · {importSummary.validRows}{' '}
              validas · {importSummary.invalidRows} invalidas ·{' '}
              {importSummary.appliedRows} aplicadas ·{' '}
              {importSummary.skippedRows} omitidas · {importSummary.dedupedRows}{' '}
              consolidadas por duplicado
            </p>
          </section>
        ) : null}
        {bulkSummary ? (
          <section
            id="bulk-products"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            <p className="font-semibold">Actualización masiva completada</p>
            <p className="mt-1">
              Alcance: {bulkSummary.scope}. Productos tocados:{' '}
              {bulkSummary.updatedRows}. Omitidos sin proveedor primario:{' '}
              {bulkSummary.skippedRows}.
              {bulkSummary.query
                ? ` Filtro aplicado: "${bulkSummary.query}".`
                : ''}
            </p>
          </section>
        ) : null}
        {bulkSupplierCreated ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              Proveedor creado: {bulkSupplierCreated}
            </p>
            <p className="mt-1">
              Ya puedes seleccionarlo como proveedor primario o secundario en la
              edición masiva.
            </p>
          </section>
        ) : null}

        {showError ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            No pudimos completar la importacion. Paso fallido:{' '}
            <span className="font-semibold">
              {resolvedSearchParams.message ?? '-'}
            </span>
          </section>
        ) : null}

        {showInvalid ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Datos invalidos para importar. Detalle:{' '}
            <span className="font-semibold">{invalidDetail}</span>
          </section>
        ) : null}

        {showProductCompleted ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Producto actualizado correctamente.
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              Importar archivo
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Formatos soportados: CSV o XLSX (hasta {IMPORT_MAX_ROWS} filas).
            </p>
            <form action={importCsv} className="mt-4 flex flex-col gap-4">
              <label className="text-sm text-zinc-700">
                Plantilla
                <select
                  name="template_key"
                  defaultValue={defaultTemplate}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="products">Solo productos</option>
                  <option value="suppliers">Solo proveedores</option>
                </select>
              </label>

              <label className="text-sm text-zinc-700">
                Archivo
                <input
                  type="file"
                  name="import_file"
                  accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  required={!showMappingConfigurator || !stagedJobId}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              {stagedJobId ? (
                <>
                  <input
                    type="hidden"
                    name="staged_job_id"
                    value={stagedJobId}
                  />
                  <p className="text-xs text-emerald-700">
                    Archivo listo para importar sin recargar:
                    {` ${stagedFileName || 'staged file'}`}
                  </p>
                </>
              ) : null}

              {showMappingConfigurator ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">
                    Mapeo de columnas detectadas
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Elegí qué columna del archivo corresponde a cada campo de
                    NODUX. Dejá vacía una opción para no importarla.
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {mappingFields.map((field) => (
                      <label
                        key={field.target}
                        className="text-xs font-medium text-zinc-700"
                      >
                        {field.label}
                        {field.required ? ' *' : ''}
                        <select
                          name={`map__${field.target}`}
                          defaultValue={proposedMap[field.target] ?? ''}
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs"
                        >
                          <option value="">No importar</option>
                          {detectedColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="apply_now" defaultChecked />
                Aplicar filas validas automaticamente
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  formAction={detectImportColumns}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Detectar columnas
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Validar e importar
                </button>
              </div>
              <OnboardingFormPendingState />
            </form>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              Exportes maestros
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Descarga snapshots actuales para respaldo o migracion a otra
              sucursal.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link
                href="/onboarding/export?type=products"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                Descargar productos_master.csv
              </Link>
              <Link
                href="/onboarding/export?type=suppliers"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                Descargar proveedores_master.csv
              </Link>
              <Link
                href="/onboarding/export?type=product_supplier"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                Descargar producto_proveedor_master.csv
              </Link>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-zinc-900">
              Pendientes de completitud
            </h2>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Total pendientes: {totalPending}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {TASK_META.map((task) => {
              const count =
                task.key === 'products_incomplete_info'
                  ? productsIncompleteCount
                  : Number(taskMap.get(task.key) ?? 0);
              return (
                <article
                  key={task.key}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {task.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {count}
                  </p>
                  <Link
                    href={task.href}
                    className="mt-3 inline-block text-xs font-medium text-zinc-700 underline"
                  >
                    {task.key === 'products_incomplete_info'
                      ? 'Resolver ahora (rapido)'
                      : 'Resolver ahora'}
                  </Link>
                </article>
              );
            })}
          </div>

          {isProductsIncompleteResolverOpen ? (
            <div
              id="resolver-products-incomplete-info"
              className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Resolucion rapida: productos con informacion incompleta
                </h3>
                <span className="text-xs text-zinc-600">
                  Mostrando {resolverStartIndex}-{resolverEndIndex} de{' '}
                  {productsIncompleteCount}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                Completa los campos del producto y guarda por fila para seguir
                rapido.
              </p>
              <form className="mt-3 flex flex-wrap gap-2" method="get">
                <input
                  type="hidden"
                  name="resolver"
                  value="products_incomplete_info"
                />
                <input
                  type="text"
                  name="resolver_q"
                  defaultValue={resolverQuery}
                  placeholder="Buscar por nombre de articulo"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm md:w-80"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
                >
                  Buscar
                </button>
              </form>

              {quickResolverProducts.length === 0 ? (
                <p className="mt-3 text-sm text-emerald-700">
                  No hay resultados para esta pagina o filtro.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {quickResolverProducts.map((product) => {
                    const relation = relationByProduct.get(product.id);
                    const hasPrimary = product.has_primary_supplier;
                    const hasShelfLife = !product.missing_shelf_life;
                    const hasIdentifier = !product.missing_identifier;

                    return (
                      <article
                        key={product.id}
                        className="rounded-lg border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-zinc-900">
                            {product.name ?? 'Producto'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              hasPrimary
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {hasPrimary
                              ? 'Proveedor OK'
                              : 'Falta proveedor primario'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              hasShelfLife
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {hasShelfLife
                              ? 'Vencimiento OK'
                              : 'Falta vencimiento aprox'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              hasIdentifier
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {hasIdentifier
                              ? 'Identificador OK'
                              : 'Falta barcode/codigo'}
                          </span>
                        </div>

                        <form
                          action={resolveIncompleteProduct}
                          className="mt-3 grid gap-2 md:grid-cols-4"
                        >
                          <input
                            type="hidden"
                            name="product_id"
                            value={product.id}
                          />

                          <ProductFormFieldsShared
                            suppliers={suppliers}
                            brandSuggestions={brandSuggestions}
                            compact
                            fields={{
                              name: 'name',
                              brand: 'brand',
                              internalCode: 'internal_code',
                              barcode: 'barcode',
                              sellUnitType: 'sell_unit_type',
                              uom: 'uom',
                              primarySupplierId: 'primary_supplier_id',
                              supplierPrice: 'supplier_price',
                              unitPrice: 'unit_price',
                              shelfLifeDays: 'shelf_life_days',
                              primarySupplierProductName:
                                'primary_supplier_product_name',
                              primarySupplierSku: 'primary_supplier_sku',
                              secondarySupplierId: 'secondary_supplier_id',
                              safetyStock: 'safety_stock',
                            }}
                            defaults={{
                              name: product.name ?? '',
                              brand: product.brand ?? '',
                              internalCode: product.internal_code ?? '',
                              barcode: product.barcode ?? '',
                              sellUnitType: product.sell_unit_type ?? 'unit',
                              uom: product.uom ?? 'unit',
                              primarySupplierId:
                                relation?.primary?.supplier_id ?? '',
                              supplierPrice:
                                relation?.primary?.supplier_price ?? '',
                              unitPrice: product.unit_price ?? 0,
                              shelfLifeDays: product.shelf_life_days ?? '',
                              primarySupplierProductName:
                                relation?.primary?.supplier_product_name ??
                                product.name ??
                                '',
                              primarySupplierSku:
                                relation?.primary?.supplier_sku ?? '',
                              secondarySupplierId:
                                relation?.secondary?.supplier_id ?? '',
                              safetyStock:
                                safetyStockByProduct.get(product.id) ?? '',
                            }}
                          />

                          <div className="md:col-span-4">
                            <button
                              type="submit"
                              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                            >
                              Guardar y seguir
                            </button>
                          </div>
                        </form>
                      </article>
                    );
                  })}
                </div>
              )}
              {productsIncompleteCount > 0 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
                  <span>
                    Pagina {resolverCurrentPage} de {resolverTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={buildResolverHref(
                        Math.max(1, resolverCurrentPage - 1),
                      )}
                      className={`rounded border px-2 py-1 ${
                        resolverCurrentPage <= 1
                          ? 'pointer-events-none border-zinc-200 text-zinc-400'
                          : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      Anterior
                    </Link>
                    <Link
                      href={buildResolverHref(
                        Math.min(resolverTotalPages, resolverCurrentPage + 1),
                      )}
                      className={`rounded border px-2 py-1 ${
                        resolverCurrentPage >= resolverTotalPages
                          ? 'pointer-events-none border-zinc-200 text-zinc-400'
                          : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      Siguiente
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section
          id="bulk-products"
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900">
              Edición masiva de productos
            </h2>
            <span className="text-xs text-zinc-600">
              Mostrando {bulkStartIndex}-{bulkEndIndex} de {bulkProductsCount}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Buscá artículos, seleccioná en lote y aplicá solo los campos que
            querés completar (marca, proveedores, vencimiento y precios).
          </p>

          <form method="get" className="mt-3 grid gap-2 md:grid-cols-4">
            <input
              type="text"
              name="bulk_q"
              defaultValue={bulkQuery}
              placeholder="Buscar por nombre"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
            />
            <select
              name="bulk_page_size"
              defaultValue={String(bulkPageSize)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {BULK_PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
            >
              Buscar
            </button>
          </form>

          <form
            action={applyBulkProductPatch}
            className="mt-4 flex flex-col gap-4"
            data-bulk-products-form="true"
          >
            <input type="hidden" name="bulk_q" value={bulkQuery} />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-600">
                Seleccioná los artículos en la lista y luego aplicá acciones al
                final.
              </p>
              <BulkProductSelectionActions />
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs tracking-wide text-zinc-500 uppercase">
                  <tr>
                    <th className="px-2 py-2">Sel</th>
                    <th className="px-2 py-2">Artículo</th>
                    <th className="px-2 py-2">Marca</th>
                    <th className="px-2 py-2">Código</th>
                    <th className="px-2 py-2">Barcode</th>
                    <th className="px-2 py-2 text-right">P. venta</th>
                    <th className="px-2 py-2 text-right">Venc. días</th>
                    <th className="px-2 py-2">Proveedor primario</th>
                    <th className="px-2 py-2">Proveedor secundario</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkProducts.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-zinc-500" colSpan={9}>
                        No hay productos para este filtro.
                      </td>
                    </tr>
                  ) : (
                    bulkProducts.map((product) => (
                      <tr key={product.id} className="border-t border-zinc-100">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            name="product_ids"
                            value={product.id}
                            defaultChecked={selectedBulkProductIds.has(
                              product.id,
                            )}
                            data-bulk-product-checkbox="true"
                          />
                        </td>
                        <td className="px-2 py-2 text-zinc-700">
                          {product.name ?? '-'}
                        </td>
                        <td className="px-2 py-2 text-zinc-700">
                          {product.brand ?? '-'}
                        </td>
                        <td className="px-2 py-2 text-zinc-700">
                          {product.internal_code ?? '-'}
                        </td>
                        <td className="px-2 py-2 text-zinc-700">
                          {product.barcode ?? '-'}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-700">
                          {product.unit_price ?? 0}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-700">
                          {product.shelf_life_days ?? '-'}
                        </td>
                        <td className="px-2 py-2 text-zinc-700">
                          {bulkPrimarySupplierByProduct.get(product.id)
                            ?.supplier_name ?? '-'}
                        </td>
                        <td className="px-2 py-2 text-zinc-700">
                          {bulkSecondarySupplierByProduct.get(product.id)
                            ?.supplier_name ?? '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {bulkProductsCount > 0 ? (
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                <span>
                  Página {bulkCurrentPage} de {bulkTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={buildBulkHref(Math.max(1, bulkCurrentPage - 1))}
                    className={`rounded border px-2 py-1 ${
                      bulkCurrentPage <= 1
                        ? 'pointer-events-none border-zinc-200 text-zinc-400'
                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    Anterior
                  </Link>
                  <Link
                    href={buildBulkHref(
                      Math.min(bulkTotalPages, bulkCurrentPage + 1),
                    )}
                    className={`rounded border px-2 py-1 ${
                      bulkCurrentPage >= bulkTotalPages
                        ? 'pointer-events-none border-zinc-200 text-zinc-400'
                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    Siguiente
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[260px_1fr] md:items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    name="apply_brand"
                    defaultChecked={Boolean(bulkDraftState?.applyBrand)}
                  />
                  Aplicar marca
                </label>
                <input
                  type="text"
                  name="bulk_brand"
                  list="bulk-brand-suggestions"
                  placeholder="Ej: Arcor"
                  defaultValue={bulkDraftState?.bulkBrand ?? ''}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                />
              </div>
              <datalist id="bulk-brand-suggestions">
                {brandSuggestions.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>

              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[260px_1fr_auto] md:items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    name="apply_primary_supplier"
                    defaultChecked={Boolean(
                      bulkDraftState?.applyPrimarySupplier,
                    )}
                  />
                  Aplicar proveedor primario
                </label>
                <select
                  name="bulk_primary_supplier_id"
                  defaultValue={bulkDraftState?.bulkPrimarySupplierId ?? ''}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                >
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <BulkCreateSupplierModal
                  action={createBulkSupplier}
                  bulkQuery={bulkQuery}
                  bulkPage={bulkCurrentPage}
                  bulkPageSize={bulkPageSize}
                />
              </div>

              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[260px_1fr_auto] md:items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    name="apply_secondary_supplier"
                    defaultChecked={Boolean(
                      bulkDraftState?.applySecondarySupplier,
                    )}
                  />
                  Aplicar proveedor secundario
                </label>
                <select
                  name="bulk_secondary_supplier_id"
                  defaultValue={bulkDraftState?.bulkSecondarySupplierId ?? ''}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                >
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <BulkCreateSupplierModal
                  action={createBulkSupplier}
                  bulkQuery={bulkQuery}
                  bulkPage={bulkCurrentPage}
                  bulkPageSize={bulkPageSize}
                />
              </div>

              <BulkPricingSuggestion
                suppliers={suppliers.map((supplier) => ({
                  id: supplier.id,
                  name: supplier.name,
                  default_markup_pct: supplier.default_markup_pct,
                }))}
                defaultApplySupplierPrice={Boolean(
                  bulkDraftState?.applySupplierPrice,
                )}
                defaultSupplierPrice={bulkDraftState?.bulkSupplierPrice ?? ''}
                defaultApplyUnitPrice={Boolean(bulkDraftState?.applyUnitPrice)}
                defaultUnitPrice={bulkDraftState?.bulkUnitPrice ?? ''}
              />

              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[260px_1fr] md:items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    name="apply_shelf_life_days"
                    defaultChecked={Boolean(bulkDraftState?.applyShelfLifeDays)}
                  />
                  Aplicar vencimiento aprox (días)
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    name="bulk_shelf_life_days"
                    min="0"
                    step="1"
                    placeholder="30"
                    defaultValue={bulkDraftState?.bulkShelfLifeDays ?? ''}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      name="bulk_shelf_life_no_applies"
                      defaultChecked={Boolean(
                        bulkDraftState?.bulkShelfLifeNoApplies,
                      )}
                    />
                    No aplica vencimiento (usar 0)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="submit"
                name="apply_target"
                value="selected"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white"
              >
                Aplicar a seleccionados
              </button>
              <button
                type="submit"
                name="apply_target"
                value="filtered"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700"
              >
                Aplicar a todos los filtrados ({bulkProductsCount})
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            Importaciones recientes
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Archivo</th>
                  <th className="px-2 py-2">Plantilla</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Filas</th>
                  <th className="px-2 py-2 text-right">Validas</th>
                  <th className="px-2 py-2 text-right">Invalidas</th>
                  <th className="px-2 py-2 text-right">Aplicadas</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-zinc-500" colSpan={8}>
                      Aun no hay importaciones registradas.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-t border-zinc-100">
                      <td className="px-2 py-2 text-zinc-700">
                        {new Date(job.created_at).toLocaleString('es-AR')}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {job.source_file_name}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {job.template_key}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">{job.status}</td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.total_rows}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.valid_rows}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.invalid_rows}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-700">
                        {job.applied_rows}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
