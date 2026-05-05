/**
 * Centralised dropdown / option lists used across module forms.
 *
 * Naming:
 *   - No prefix → option set is universal across modules (e.g. STATUS_OPTIONS,
 *     INCOTERMS_OPTIONS).
 *   - `{MODULE}_{FIELD}_OPTIONS` → option set belongs to a specific module
 *     (e.g. PRODUCT_UOM_OPTIONS, QUOTATION_STATUS_OPTIONS).
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

// International Commercial Terms (Incoterms 2020) — published by the ICC.
// Each 3-letter code defines who pays freight/insurance and where risk transfers
// from seller to buyer. Used on Vendor master, Quotation, PFI, PO, etc.
const INCOTERMS_OPTIONS = [
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

// Backwards-compat alias — keep until vendor module is migrated to the
// universal `INCOTERMS_OPTIONS` symbol.
const VENDOR_INCOTERMS_OPTIONS = INCOTERMS_OPTIONS;

// ─────────────────────────────────────────────────────────────────────────────
// Customer module
// ─────────────────────────────────────────────────────────────────────────────

// Address-type enum for customer_addresses.type. Use these constants instead
// of raw string literals in form code (e.g. for filtering bill-to addresses).
const CUSTOMER_ADDRESS_TYPES = {
  BILL_TO: "bill_to",
  SHIP_TO: "ship_to",
  NOTIFY: "notify",
  OTHER: "other",
};

const CUSTOMER_ADDRESS_TYPE_OPTIONS = [
  { value: CUSTOMER_ADDRESS_TYPES.BILL_TO, label: "Bill To" },
  { value: CUSTOMER_ADDRESS_TYPES.SHIP_TO, label: "Ship To" },
  { value: CUSTOMER_ADDRESS_TYPES.NOTIFY, label: "Notify Party" },
  { value: CUSTOMER_ADDRESS_TYPES.OTHER, label: "Other" },
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

// ─────────────────────────────────────────────────────────────────────────────
// Lead module
// ─────────────────────────────────────────────────────────────────────────────

const LEAD_SOURCE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "referral", label: "Referral" },
  { value: "trade_show", label: "Trade Show" },
  { value: "cold_call", label: "Cold Call" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "other", label: "Other" },
];

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const LEAD_STATUS_BADGE_COLOR = {
  new: "light-info",
  contacted: "light-primary",
  qualified: "light-warning",
  proposal_sent: "light-warning",
  won: "light-success",
  lost: "light-danger",
};

// ─────────────────────────────────────────────────────────────────────────────
// Quotation module
// ─────────────────────────────────────────────────────────────────────────────

const QUOTATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const QUOTATION_STATUS_BADGE_COLOR = {
  draft: "light-secondary",
  sent: "light-info",
  approved: "light-success",
  rejected: "light-danger",
};

export {
  STATUS_OPTIONS,
  INCOTERMS_OPTIONS,
  VENDOR_PAYMENT_TERMS_OPTIONS,
  VENDOR_INCOTERMS_OPTIONS,
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_ADDRESS_TYPE_OPTIONS,
  PRODUCT_UOM_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_BADGE_COLOR,
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
};
