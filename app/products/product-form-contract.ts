export const PRODUCT_FORM_LABELS = {
  productName: 'Nombre de articulo en la tienda',
  brand: 'Marca',
  internalCode: 'Codigo interno',
  barcode: 'Codigo de barras',
  sellUnitType: 'Unidad de venta',
  uom: 'Unidad de medida',
  primarySupplier: 'Proveedor primario',
  supplierPrice: 'Precio proveedor',
  unitPrice: 'Precio unitario',
  shelfLifeDays: 'Vencimiento aproximado (dias)',
  supplierProductName: 'Nombre de articulo en proveedor (opcional)',
  supplierSku: 'SKU en proveedor (opcional)',
  secondarySupplier: 'Proveedor secundario',
  safetyStock: 'Stock minimo',
} as const;

export const PRODUCT_FORM_HELPER_TEXT =
  'Sugerencia: completa "Precio proveedor" para calcular el precio unitario recomendado (40% de ganancia).';
