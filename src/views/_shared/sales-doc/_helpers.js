/**
 * Shared pure helpers for the Quotation form.
 *
 * No React, no JSX - easy to unit-test and reuse across PFI / PO when
 * those modules land. The derive* helpers mirror the backend recompute()
 * exactly so the costing card preview matches what the server will store.
 */

import { EXCHANGE_TO_CURRENCY_OPTIONS } from "@constant/options";

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Currency code → symbol. INR is the home currency; foreign symbols come
// from the shared exchange-target list. Falls back to the code itself.
const CURRENCY_SYMBOLS = { INR: "₹" };
EXCHANGE_TO_CURRENCY_OPTIONS.forEach((o) => {
  CURRENCY_SYMBOLS[o.value] = o.symbol;
});
export const currencySymbol = (code) => CURRENCY_SYMBOLS[code] || code || "";

export const round2 = (n) =>
  Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;

export const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Single source of truth for per-line costing - mirrors the backend
 * recompute() exactly. Used by the line-item modal breakdown, the Step 2
 * table, and the Step 3 review table so all three always agree.
 *
 * Flow (sequential — each step feeds the next):
 *   Gross (qty × price)
 *   → − Discount      = Taxable
 *   → − Rebates       (% on Taxable, fixed amounts as-is)
 *   → + Expenses      (% on the post-rebate balance, fixed amounts as-is)
 *   → + Margin        (% on the post-expense balance)
 *   → + GST           (% on the post-margin balance)
 *   → Line Total
 * Every component is round2()'d; lineTotal sums the rounded parts.
 */
export const computeLineCosting = (line) => {
  const l = line || {};
  const qty = num(l.qty);
  const price = num(l.unit_price);
  const disc = num(l.discount_pct);
  const gross = round2(qty * price);
  const discountAmt = round2((gross * disc) / 100);
  const taxable = round2(gross - discountAmt);

  // Rebates apply directly to Taxable (% of Taxable).
  let rebatesPctAmt = 0;
  let rebatesFixedAmt = 0;
  let rebatesPctRate = 0;
  for (const r of l.product_rebates_snapshot || []) {
    if (r.type === "fixed") rebatesFixedAmt += num(r.pct);
    else {
      rebatesPctRate += num(r.pct);
      rebatesPctAmt += (taxable * num(r.pct)) / 100;
    }
  }
  rebatesPctAmt = round2(rebatesPctAmt);
  rebatesFixedAmt = round2(rebatesFixedAmt);
  const rebates = round2(rebatesPctAmt + rebatesFixedAmt);
  const afterRebates = round2(taxable - rebates);

  // Expenses % apply on the post-rebate balance — not on Taxable.
  let expensesPctAmt = 0;
  let expensesFixedAmt = 0;
  let expensesPctRate = 0;
  for (const e of l.product_expenses_snapshot || []) {
    if (e.type === "percent") {
      expensesPctRate += num(e.value);
      expensesPctAmt += (afterRebates * num(e.value)) / 100;
    } else expensesFixedAmt += num(e.value);
  }
  expensesPctAmt = round2(expensesPctAmt);
  expensesFixedAmt = round2(expensesFixedAmt);
  const expenses = round2(expensesPctAmt + expensesFixedAmt);
  const afterExpenses = round2(afterRebates + expenses);

  // Margin % applies on the post-expense balance.
  const marginPct = num(l.margin_pct);
  const margin = round2((afterExpenses * marginPct) / 100);
  const netTotal = round2(afterExpenses + margin);
  // GST is applied on the post-margin balance.
  const gst = round2((netTotal * num(l.tax_pct)) / 100);
  const lineTotal = round2(netTotal + gst);

  return {
    gross,
    discountPct: disc,
    discountAmt,
    taxable,
    rebates,
    rebatesPctAmt,
    rebatesFixedAmt,
    rebatesPctRate: round2(rebatesPctRate),
    expenses,
    expensesPctAmt,
    expensesFixedAmt,
    expensesPctRate: round2(expensesPctRate),
    margin,
    gst,
    lineTotal,
  };
};

/**
 * Document-level costing roll-up - the `totals` shape consumed by
 * SalesDocCostingCard. Single source of truth for both the Quotation /
 * PFI wizards (live form lines) and their detail pages (saved lines).
 * Works on any line array with qty / unit_price / discount_pct / tax_pct /
 * margin_pct / product_rebates_snapshot / product_expenses_snapshot.
 */
export const computeDocTotals = (lines, exchangeRate) => {
  let subtotal = 0;
  let tax_total = 0;
  let product_rebates_total = 0;
  let product_expenses_total = 0;
  let rebates_pct_total = 0;
  let rebates_fixed_total = 0;
  let expenses_pct_total = 0;
  let expenses_fixed_total = 0;
  let line_margin_total = 0;
  let gross_total = 0;
  let discount_total = 0;
  const gstRates = new Set();
  const marginRates = new Set();
  const gstByRate = {};
  const marginByRate = {};

  (lines || []).forEach((l) => {
    const qty = num(l?.qty);
    const price = num(l?.unit_price);
    const disc = num(l?.discount_pct);
    const taxPct = num(l?.tax_pct);
    const lineGross = qty * price;
    const lineNet = lineGross * (1 - disc / 100);
    gross_total += lineGross;
    discount_total += lineGross - lineNet;
    subtotal += lineNet;

    // Rebates: % on Taxable, fixed as-is.
    let lineProdReb = 0;
    let lineProdExp = 0;
    for (const r of l?.product_rebates_snapshot || []) {
      if (r.type === "fixed") {
        rebates_fixed_total += num(r.pct);
        lineProdReb += num(r.pct);
      } else {
        const amt = (lineNet * num(r.pct)) / 100;
        rebates_pct_total += amt;
        lineProdReb += amt;
      }
    }
    const lineAfterRebates = lineNet - lineProdReb;
    // Expenses: % on post-rebate balance, fixed as-is.
    for (const e of l?.product_expenses_snapshot || []) {
      if (e.type === "percent") {
        const amt = (lineAfterRebates * num(e.value)) / 100;
        expenses_pct_total += amt;
        lineProdExp += amt;
      } else {
        expenses_fixed_total += num(e.value);
        lineProdExp += num(e.value);
      }
    }
    product_rebates_total += lineProdReb;
    product_expenses_total += lineProdExp;

    // Margin: % on post-expense balance.
    const lineAfterExpenses = lineAfterRebates + lineProdExp;
    const lineMarginPct = num(l?.margin_pct);
    const lineMargin = lineAfterExpenses * (lineMarginPct / 100);
    line_margin_total += lineMargin;
    if (lineNet > 0) {
      marginByRate[lineMarginPct] =
        (marginByRate[lineMarginPct] || 0) + lineMargin;
    }

    // GST on post-margin balance.
    const lineNetTotal = lineAfterExpenses + lineMargin;
    const lineTax = lineNetTotal * (taxPct / 100);
    tax_total += lineTax;
    if (lineNet > 0) {
      gstRates.add(taxPct);
      marginRates.add(lineMarginPct);
      gstByRate[taxPct] = (gstByRate[taxPct] || 0) + lineTax;
    }
  });

  const net = subtotal + product_expenses_total - product_rebates_total;
  const margin_amount = line_margin_total;
  const gst_uniform = gstRates.size <= 1;
  const gst_pct = gst_uniform
    ? [...gstRates][0] || 0
    : subtotal > 0
    ? (tax_total / subtotal) * 100
    : 0;
  const margin_uniform = marginRates.size <= 1;
  const margin_pct = margin_uniform
    ? [...marginRates][0] || 0
    : net > 0
    ? (margin_amount / net) * 100
    : 0;
  const grand_inr_raw = net + margin_amount + tax_total;
  const grand_inr = Math.round(grand_inr_raw);
  const round_off = round2(grand_inr - grand_inr_raw);
  const rate = num(exchangeRate) || 1;

  return {
    gross_total,
    discount_total,
    subtotal,
    product_expenses_total,
    product_rebates_total,
    expenses_pct_total,
    expenses_fixed_total,
    rebates_pct_total,
    rebates_fixed_total,
    net,
    margin_amount,
    margin_pct,
    margin_uniform,
    tax_total,
    margin_by_rate: marginByRate,
    gst_pct,
    gst_uniform,
    gst_by_rate: gstByRate,
    grand_inr_raw,
    round_off,
    grand_inr,
    // Convert from the ROUNDED INR so the costing card's Grand Total
    // matches the header KPI / stored grand_total, which the backend
    // also derives from Math.round(grand_inr_raw) × rate.
    grand_currency: grand_inr * rate,
    rate,
  };
};

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
 *   "Vinay Traders [VND-001] - INR 95 (MOQ 100, 7d)"
 */
export const formatVendorOption = (r) =>
  `${r.vendor_name || "Vendor"}${
    r.vendor_code ? ` [${r.vendor_code}]` : ""
  } - ${r.currency_code || ""} ${Number(r.unit_price || 0).toLocaleString()}${
    r.moq ? ` (MOQ ${r.moq})` : ""
  }${r.lead_time_days ? `, ${r.lead_time_days}d` : ""}`;
