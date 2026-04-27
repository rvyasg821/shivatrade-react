/**
 * Centralised dropdown / option lists used across module forms.
 *
 * Naming:
 *   - No prefix → option set is universal across modules (e.g. STATUS_OPTIONS).
 *   - `{MODULE}_{FIELD}_OPTIONS` → option set belongs to a specific module
 *     (e.g. VENDOR_INCOTERMS_OPTIONS, PRODUCT_UOM_OPTIONS).
 *
 * Each option is `{ value, label }` so it can be passed straight to
 * react-select / mapped for native <select> / used in radios.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Common (cross-module)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Vendor module
// ─────────────────────────────────────────────────────────────────────────────

const VENDOR_PAYMENT_TERMS_OPTIONS = [
  "Advance",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "LC",
  "TT",
  "CAD",
  "DA",
  "DP",
].map((v) => ({ value: v, label: v }));

const VENDOR_INCOTERMS_OPTIONS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
].map((v) => ({ value: v, label: v }));

// ─────────────────────────────────────────────────────────────────────────────
// Product module
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_UOM_OPTIONS = [
  "KG",
  "MT",
  "Tonne",
  "Piece",
  "Pack",
  "Box",
  "Litre",
  "ML",
  "Meter",
  "CM",
  "Bag",
  "Pallet",
  "Container",
].map((u) => ({ value: u, label: u }));

export {
  STATUS_OPTIONS,
  VENDOR_PAYMENT_TERMS_OPTIONS,
  VENDOR_INCOTERMS_OPTIONS,
  PRODUCT_UOM_OPTIONS,
};
