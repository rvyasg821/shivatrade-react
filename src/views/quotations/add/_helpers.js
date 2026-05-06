/**
 * Shared pure helpers for the Quotation form.
 *
 * No React, no JSX — easy to unit-test and reuse across PFI / PO when
 * those modules land. The derive* helpers mirror the backend recompute()
 * exactly so the costing card preview matches what the server will store.
 */

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) =>
  Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;

export const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Effective amount for an expense row given the current subtotal.
 *   master-linked & !is_overridden  → derive from rule (flat or % of subtotal)
 *   else                            → trust stored amount (override or ad-hoc)
 */
export const deriveExpenseAmount = (row, subtotal, expenseMasterMap) => {
  if (row?.expense_id && !row?.is_overridden) {
    const m = expenseMasterMap.get(row.expense_id);
    if (m) {
      return m.type === "percent"
        ? (subtotal * num(m.value)) / 100
        : num(m.value);
    }
  }
  return num(row?.amount);
};

/**
 * Effective amount for a rebate row. Rebates are always percent-based.
 */
export const deriveRebateAmount = (row, subtotal, rebateMasterMap) => {
  if (row?.rebate_id && !row?.is_overridden) {
    const m = rebateMasterMap.get(row.rebate_id);
    if (m) return (subtotal * num(m.pct)) / 100;
  }
  return num(row?.amount);
};

/**
 * Build the option label for a vendor row coming from price-list/by-product.
 *   "Vinay Traders [VND-001] — INR 95 ★ (MOQ 100, 7d)"
 *   ★ marks the primary vendor for that product.
 */
export const formatVendorOption = (r) =>
  `${r.vendor_name || "Vendor"}${
    r.vendor_code ? ` [${r.vendor_code}]` : ""
  } — ${r.currency_code || ""} ${Number(r.unit_price || 0).toLocaleString()}${
    r.is_primary ? " ★" : ""
  }${r.moq ? ` (MOQ ${r.moq})` : ""}${
    r.lead_time_days ? `, ${r.lead_time_days}d` : ""
  }`;
