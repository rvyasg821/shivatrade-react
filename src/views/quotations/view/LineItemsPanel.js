// Compact line-items + costing panel for the quotation detail page.
// Reuses fmt/num/computeDocTotals + SalesDocCostingCard from the shared kit.

import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import CustomerCostingTable from "@src/views/_shared/sales-doc/CustomerCostingTable";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { useQuotationCurrency } from "./CurrencyToggleContext";

const LineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const lines = q?.lines || [];

  // Customer-facing view — always shown in the quotation's own currency
  // (the figure the customer sees), independent of the page's INR toggle.
  const { baseCurrency } = useQuotationCurrency();

  const body = (
    <CustomerCostingTable
      lines={lines}
      exchangeRate={q?.exchange_rate}
      docCurrencyCode={q?.currency_code || baseCurrency?.code || "INR"}
      baseCurrencyCode={baseCurrency?.code || "INR"}
      showHsn
    />
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default LineItemsPanel;
