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

import { Country } from "country-state-city";

// ─────────────────────────────────────────────────────────────────────────────
// Common (cross-module)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// All ISO countries from `country-state-city`, alphabetised, with India
// pinned to the top so the export-business default is the first option.
// Stored value is the full country name (back-compat with free-text data).
const COUNTRY_OPTIONS = (() => {
  const all = Country.getAllCountries()
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const india = all.find((o) => o.value === "India");
  return india ? [india, ...all.filter((o) => o.value !== "India")] : all;
})();

// International Commercial Terms (Incoterms 2020) - published by the ICC.
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

// Trade-finance payment terms used across Vendor, Quotation, PFI, PO, etc.
// `value` is the short code that's stored in the DB; `label` includes the
// full form so users picking from the dropdown understand the abbreviation.
const PAYMENT_TERMS_OPTIONS = [
  { value: "Advance", label: "Advance - 100% advance before shipment" },
  { value: "Net 30", label: "Net 30 - Payment 30 days from invoice date" },
  { value: "Net 45", label: "Net 45 - Payment 45 days from invoice date" },
  { value: "Net 60", label: "Net 60 - Payment 60 days from invoice date" },
  { value: "Net 90", label: "Net 90 - Payment 90 days from invoice date" },
  { value: "LC", label: "LC - Letter of Credit" },
  { value: "TT", label: "TT - Telegraphic Transfer (Wire)" },
  { value: "CAD", label: "CAD - Cash Against Documents" },
  { value: "DA", label: "DA - Documents Against Acceptance" },
  { value: "DP", label: "DP - Documents Against Payment" },
];

// Backwards-compat alias - vendor module still imports the old name.
const VENDOR_PAYMENT_TERMS_OPTIONS = PAYMENT_TERMS_OPTIONS;

// Backwards-compat alias - keep until vendor module is migrated to the
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

// `integer: true` means quantities sold in this UOM must be whole numbers
// (you can't have half a bearing). Weight/volume/length UOMs allow decimals.
const PRODUCT_UOM_OPTIONS = [
  { value: "KG", label: "KG", integer: false },
  { value: "MT", label: "MT", integer: false },
  { value: "Tonne", label: "Tonne", integer: false },
  { value: "Nos", label: "Nos", integer: true },
  { value: "Piece", label: "Piece", integer: true },
  { value: "Pack", label: "Pack", integer: true },
  { value: "Box", label: "Box", integer: true },
  { value: "Litre", label: "Litre", integer: false },
  { value: "ML", label: "ML", integer: false },
  { value: "Meter", label: "Meter", integer: false },
  { value: "CM", label: "CM", integer: false },
  { value: "Bag", label: "Bag", integer: true },
  { value: "Pallet", label: "Pallet", integer: true },
  { value: "Container", label: "Container", integer: true },
];

// Helper for forms - UOMs that disallow decimals.
const UOM_INTEGER_ONLY = new Set(
  PRODUCT_UOM_OPTIONS.filter((u) => u.integer).map((u) => u.value),
);

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

// Solid Bootstrap colors - Reactstrap handles text contrast via .badge defaults
// (white text on dark backgrounds, dark text on warning).
const LEAD_STATUS_BADGE_COLOR = {
  new: "secondary",
  contacted: "info",
  qualified: "warning",
  proposal_sent: "primary",
  won: "success",
  lost: "danger",
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
  draft: "secondary",
  sent: "info",
  approved: "success",
  rejected: "danger",
  // PFI-only terminal state - set when a Commercial Invoice is generated.
  closed: "dark",
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Order module
// ─────────────────────────────────────────────────────────────────────────────

const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_process", label: "In Process" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PURCHASE_ORDER_STATUS_BADGE_COLOR = {
  draft: "secondary",
  confirmed: "primary",
  in_process: "warning",
  completed: "success",
  cancelled: "danger",
};

const PURCHASE_ORDER_STATUS_COLOR_MAP = {
  draft: "#6c757d",
  confirmed: "#0dcaf0",
  in_process: "#fd7e14",
  completed: "#198754",
  cancelled: "#dc3545",
};

const PO_VENDOR_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "dispatched", label: "Dispatched" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const PO_VENDOR_STATUS_BADGE_COLOR = {
  draft: "secondary",
  dispatched: "info",
  closed: "success",
  cancelled: "danger",
};

const PO_VENDOR_STATUS_COLOR_MAP = {
  draft: "#6c757d",
  dispatched: "#0dcaf0",
  closed: "#198754",
  cancelled: "#dc3545",
};

/**
 * Tracking event types - append-only event log on POVs (Tracking plan §5).
 * Stored on the BE as `varchar(40)`; this is the source of truth for the
 * dropdown order + display labels. `other` reveals a free-text field.
 * Keep in sync with `ENUM_TRACKING_EVENT_TYPE` on the backend.
 */
const TRACKING_EVENT_TYPE_OPTIONS = [
  { value: "vehicle_loaded", label: "Vehicle Loaded" },
  { value: "left_vendor", label: "Left Vendor" },
  { value: "in_transit_update", label: "In-transit Update" },
  { value: "reached_checkpoint", label: "Reached Checkpoint" },
  { value: "customs_clearance", label: "Customs / Border Cleared" },
  { value: "near_destination", label: "Near Destination" },
  { value: "arrived_destination", label: "Arrived at Destination" },
  { value: "unloading_started", label: "Unloading Started" },
  { value: "unloading_complete", label: "Unloading Complete" },
  { value: "delay_reported", label: "Delay Reported" },
  { value: "damage_reported", label: "Damage Reported" },
  { value: "other", label: "Other (free text)" },
];

// System-emitted lifecycle event types (BE: SYSTEM_TRACKING_EVENT_TYPES).
// Excluded from the Add Event dropdown but still need labels in the timeline.
const SYSTEM_TRACKING_EVENT_LABELS = {
  pov_created: "POV Created",
  pov_dispatched: "POV Dispatched",
  pov_received: "POV Received",
  pov_cancelled: "POV Cancelled",
  pov_updated: "POV Updated",
};

const TRACKING_EVENT_TYPE_LABEL = {
  ...TRACKING_EVENT_TYPE_OPTIONS.reduce(
    (acc, o) => ((acc[o.value] = o.label), acc),
    {}
  ),
  ...SYSTEM_TRACKING_EVENT_LABELS,
};

/**
 * ISO 4217 codes available as exchange-rate targets on the Currency module.
 * Kept static (not from the DB) - INR is the only currency stored as a real
 * row; everything else is a code that exists purely as a rate target.
 * Edit this list to support more / fewer currencies.
 */
const EXCHANGE_TO_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Pound Sterling", symbol: "£" },
  { value: "AED", label: "AED - UAE Dirham", symbol: "د.إ" },
  // { value: "JPY", label: "JPY - Japanese Yen", symbol: "¥" },
  // { value: "CNY", label: "CNY - Chinese Yuan", symbol: "¥" },
  // { value: "AUD", label: "AUD - Australian Dollar", symbol: "A$" },
  // { value: "CAD", label: "CAD - Canadian Dollar", symbol: "C$" },
  // { value: "SGD", label: "SGD - Singapore Dollar", symbol: "S$" },
  // { value: "CHF", label: "CHF - Swiss Franc", symbol: "CHF" },
  // { value: "HKD", label: "HKD - Hong Kong Dollar", symbol: "HK$" },
  // { value: "SAR", label: "SAR - Saudi Riyal", symbol: "﷼" },
  // { value: "KWD", label: "KWD - Kuwaiti Dinar", symbol: "د.ك" },
  // { value: "QAR", label: "QAR - Qatari Riyal", symbol: "﷼" },
];

/**
 * Rebate / Expense `type` - how the value is interpreted: a percentage of the
 * line, or a flat amount. Mirrors ENUM_REBATE_TYPE / ENUM_EXPENSE_TYPE on the
 * backend. Shared by the Rebate & Expense management forms and the sales-doc
 * line-item modal.
 */
const REBATE_EXPENSE_TYPE_OPTIONS = [
  { value: "percent", label: "Percent (%)" },
  { value: "fixed", label: "Fixed Amount" },
];

/** PFI / shipping documents - mode of shipment. Sea + Air only (locked
 *  2026-05-26 - ShivaTrade ships by sea and air only; road/rail/multimodal
 *  out of scope. See docs/SHIPPING_MODULE_PLAN.md §3.) */
const MODE_OF_SHIPMENT_OPTIONS = [
  { value: "sea", label: "Sea" },
  { value: "air", label: "Air" },
];

/** PFI / shipping documents - packing type. Free text on the API; this is the
 *  pick-list shown in the UI. */
const PACKING_TYPE_OPTIONS = [
  { value: "Cartons", label: "Cartons" },
  { value: "Pallets", label: "Pallets" },
  { value: "Drums", label: "Drums" },
  { value: "Bags", label: "Bags" },
  { value: "Bundles", label: "Bundles" },
  { value: "Crates", label: "Crates" },
  { value: "Loose", label: "Loose" },
];

export {
  STATUS_OPTIONS,
  REBATE_EXPENSE_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  INCOTERMS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  VENDOR_PAYMENT_TERMS_OPTIONS,
  VENDOR_INCOTERMS_OPTIONS,
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_ADDRESS_TYPE_OPTIONS,
  PRODUCT_UOM_OPTIONS,
  UOM_INTEGER_ONLY,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_BADGE_COLOR,
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
  PURCHASE_ORDER_STATUS_OPTIONS,
  PURCHASE_ORDER_STATUS_BADGE_COLOR,
  PURCHASE_ORDER_STATUS_COLOR_MAP,
  PO_VENDOR_STATUS_OPTIONS,
  PO_VENDOR_STATUS_BADGE_COLOR,
  PO_VENDOR_STATUS_COLOR_MAP,
  TRACKING_EVENT_TYPE_OPTIONS,
  TRACKING_EVENT_TYPE_LABEL,
  EXCHANGE_TO_CURRENCY_OPTIONS,
  MODE_OF_SHIPMENT_OPTIONS,
  PACKING_TYPE_OPTIONS,
};
