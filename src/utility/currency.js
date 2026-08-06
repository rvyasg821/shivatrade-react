// Global currency helpers — single source of truth for currency-code →
// symbol lookups and amount formatting across modules (leads, customers,
// quotations, PFI, PO, etc.).
//
// Resolution order for `getCurrencySymbol`:
//   1. Built-in INR (the system's base currency, kept here because it isn't
//      part of `EXCHANGE_TO_CURRENCY_OPTIONS`).
//   2. The `symbol` declared on `EXCHANGE_TO_CURRENCY_OPTIONS` — the same
//      list backing the currency picker on every sales doc. Add a currency
//      there and it is automatically available everywhere.
//   3. Optional `overrides` map argument — for callers that want to honor
//      live currency data from the API (`s.currency.exchangeOptions`).
//      Pass `{ USD: "US$" }` etc. for runtime overrides.
//
// Usage:
//   import { getCurrencySymbol, formatMoney } from "@src/utility/currency";
//   const sym = getCurrencySymbol(lead.currency);            // → "₹"
//   formatMoney(1234.5, lead.currency);                       // → "₹1,234.50"

import { EXCHANGE_TO_CURRENCY_OPTIONS } from "@constant/options";

// Common ISO 4217 symbols — a broad fallback so a currency that ISN'T in
// EXCHANGE_TO_CURRENCY_OPTIONS (or is looked up without the live `overrides`
// arg) still renders a SYMBOL instead of its bare code (e.g. CNY → ¥, not
// "CNY"). EXCHANGE_TO_CURRENCY_OPTIONS / overrides win over these.
const ISO_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  CHF: "CHF",
  HKD: "HK$",
  NZD: "NZ$",
  AED: "د.إ",
  SAR: "﷼",
  QAR: "﷼",
  KWD: "د.ك",
  BHD: "ب.د",
  OMR: "ر.ع.",
  ZAR: "R",
  THB: "฿",
  MYR: "RM",
  IDR: "Rp",
  PHP: "₱",
  VND: "₫",
  KRW: "₩",
  RUB: "₽",
  BRL: "R$",
  TRY: "₺",
  PKR: "₨",
  BDT: "৳",
  LKR: "₨",
  NPR: "₨",
  EGP: "£",
  NGN: "₦",
  KES: "KSh",
  MXN: "$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  ILS: "₪",
};

// Build the static map once at import time so the lookup is O(1). Layered:
// ISO fallbacks first, then EXCHANGE_TO_CURRENCY_OPTIONS (configured symbols
// win), and the optional `overrides` arg wins over everything at call time.
const STATIC_SYMBOLS = (() => {
  const out = { ...ISO_SYMBOLS };
  (EXCHANGE_TO_CURRENCY_OPTIONS || []).forEach((c) => {
    if (c?.value && c?.symbol) out[String(c.value).toUpperCase()] = c.symbol;
  });
  return out;
})();

/**
 * Returns the currency symbol for an ISO 4217 code (e.g. "USD" → "$").
 * Returns "" when the code is unknown so callers can safely interpolate.
 *
 * @param {string|null|undefined} code
 * @param {Record<string,string>} [overrides] - optional live overrides keyed
 *   by upper-case code (e.g. from a Redux currency store).
 */
export const getCurrencySymbol = (code, overrides) => {
  if (!code) return "";
  const key = String(code).toUpperCase();
  if (overrides && overrides[key]) return overrides[key];
  return STATIC_SYMBOLS[key] || "";
};

/**
 * Formats a number with the right currency symbol prefix. Returns "-" for
 * null/undefined/empty inputs so it can drop straight into table cells.
 *
 * @param {number|string|null|undefined} amount
 * @param {string|null|undefined} code
 * @param {{ minimumFractionDigits?: number, maximumFractionDigits?: number, overrides?: Record<string,string> }} [opts]
 */
export const formatMoney = (amount, code, opts = {}) => {
  if (amount === null || amount === undefined || amount === "") return "-";
  const n = Number(amount);
  if (Number.isNaN(n)) return "-";
  const sym = getCurrencySymbol(code, opts.overrides);
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: opts.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts.maximumFractionDigits ?? 2,
  });
  return `${sym}${formatted}`;
};

/** Convenience for places that already know the amount is a money value
 *  with 2 fraction digits (invoices, costing breakdowns, etc.). */
export const formatMoney2 = (amount, code, opts = {}) =>
  formatMoney(amount, code, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  });

/**
 * Convert a base-INR amount into `code` using live exchange options. Each
 * option is `{ code, rate }` where the doc amount = INR × rate (the base
 * currency itself has rate 1). Returns the raw amount when no rate is found
 * (best-effort) or when the code is the base/INR.
 *
 * @param {number|string} amount  - amount stored in base (INR)
 * @param {string} code           - target currency code (e.g. "USD")
 * @param {Array<{code:string, rate:number|string}>} [exchangeOptions]
 */
export const convertFromInr = (amount, code, exchangeOptions = []) => {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  if (!code || String(code).toUpperCase() === "INR") return n;
  const opt = (exchangeOptions || []).find(
    (c) => String(c?.code).toUpperCase() === String(code).toUpperCase()
  );
  const rate = Number(opt?.rate);
  return rate > 0 ? n * rate : n;
};

/** Read-only access to the resolved static map — useful for debugging /
 *  tests. Do not mutate the returned object. */
export const CURRENCY_SYMBOLS = { ...STATIC_SYMBOLS };
