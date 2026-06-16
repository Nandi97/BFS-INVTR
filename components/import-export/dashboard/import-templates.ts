import type { TemplateCol } from "./import-panel";

export const PRODUCT_TEMPLATE: TemplateCol[] = [
  { header: "name",     example: "Troiareuke Acidic pH Balancing Toner", required: true  },
  { header: "brand",    example: "Troiareuke",   required: false },
  { header: "barcode",  example: "8809123456789", required: false },
  { header: "sku",      example: "TRO-001",       required: false },
  { header: "size",     example: "130ml",         required: false, note: "appended to name" },
  { header: "type",     example: "R",             required: false, note: "P, R, or BOTH" },
  { header: "category", example: "Toner",         required: false },
  { header: "supplier", example: "Troiareuke CA", required: false },
  { header: "cost",     example: "24.50",         required: false },
];

export const SUPPLIER_TEMPLATE: TemplateCol[] = [
  { header: "name",         example: "Troiareuke CA",    required: true  },
  { header: "contactName",  example: "Jamie Park",       required: false },
  { header: "email",        example: "orders@troi.ca",   required: false },
  { header: "phone",        example: "+1-416-555-0100",  required: false },
  { header: "leadTimeDays", example: "7",                required: false },
  { header: "address",      example: "123 Beauty St",    required: false },
  { header: "notes",        example: "Min order $500",   required: false },
];

export const STOCK_TEMPLATE: TemplateCol[] = [
  { header: "identifier",   example: "8809123456789",    required: true,  note: "name, barcode, or SKU" },
  { header: "location",     example: "BF Warehouse",     required: true,  note: "location name or code" },
  { header: "quantity",     example: "48",               required: true  },
  { header: "reorderPoint", example: "12",               required: false },
  { header: "reorderQty",   example: "24",               required: false },
];
