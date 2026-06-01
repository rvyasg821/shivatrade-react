// Currency-view context for the Quotation detail page.
//
// The detail page can be read in two currencies:
//   • OFF (default) → ShivaTrade's home/base currency (INR). All stored
//     line totals are already in INR, so this is a pass-through.
//   • ON            → the quotation's own currency. Stored INR values are
//     multiplied by the exchange rate (doc units per ₹1).
//
// The toggle state is persisted in localStorage so the operator's choice
// sticks across reloads. A safe default value is exported so any consumer
// rendered without a provider still behaves as base-currency / identity.

import { createContext, useContext } from "react";

export const QUOTATION_CURRENCY_LS_KEY = "quotation-detail-show-doc";

const DEFAULT_VALUE = {
  showDoc: false,
  baseCurrency: { code: "INR", symbol: "₹" },
  docCurrency: { code: "INR", symbol: "₹" },
  rate: 1,
  sym: "₹",
  code: "INR",
  // Convert a value stored in INR into the currently-displayed currency.
  fromInr: (v) => Number(v) || 0,
  // Descriptor handed to SalesDocCostingCard.
  view: { mode: "base", rate: 1, sym: "₹", code: "INR" },
};

const QuotationCurrencyContext = createContext(DEFAULT_VALUE);

export const QuotationCurrencyProvider = QuotationCurrencyContext.Provider;

export const useQuotationCurrency = () => useContext(QuotationCurrencyContext);

export default QuotationCurrencyContext;
