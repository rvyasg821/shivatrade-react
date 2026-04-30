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

// International Commercial Terms (Incoterms 2020) - published by the ICC.
// Each 3-letter code defines who pays freight/insurance and where risk transfers
// from the vendor to the buyer. Full names shown so users can pick the right one.
const VENDOR_INCOTERMS_OPTIONS = [
  { value: "EXW", label: "EXW - Ex Works" },
  { value: "FCA", label: "FCA - Free Carrier" },
  { value: "FAS", label: "FAS - Free Alongside Ship (sea only)" },
  { value: "FOB", label: "FOB - Free On Board (sea only)" },
  { value: "CFR", label: "CFR - Cost and Freight (sea only)" },
  { value: "CIF", label: "CIF - Cost, Insurance and Freight (sea only)" },
  { value: "CPT", label: "CPT - Carriage Paid To" },
  { value: "CIP", label: "CIP - Carriage and Insurance Paid To" },
  { value: "DAP", label: "DAP - Delivered at Place" },
  { value: "DPU", label: "DPU - Delivered at Place Unloaded" },
  { value: "DDP", label: "DDP - Delivered Duty Paid" },
];

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
