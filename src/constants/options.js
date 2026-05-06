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

// Backwards-compat alias — vendor module still imports the old name.
const VENDOR_PAYMENT_TERMS_OPTIONS = PAYMENT_TERMS_OPTIONS;

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
  "Nos",
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
  COUNTRY_OPTIONS,
  INCOTERMS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
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
