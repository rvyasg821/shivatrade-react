// Compact line-items panel for the PO detail page.
// Mirrors quotations/view/LineItemsPanel.js and pfi/view/PfiLineItemsPanel.js
// (same table, same paginator) so all three detail pages match. The costing
// breakdown now lives in the right-hand column of the detail page.

import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import CustomerCostingTable from "@src/views/_shared/sales-doc/CustomerCostingTable";
import { DetailPanel } from "@src/views/_shared/detail-page";

const PoLineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};
  const lines = p?.lines || [];

  // Same customer-facing table as the quotation detail page — product name
  // with Part No / HSN below, qty, unit rate and amount in the PO currency.
  const body = (
    <CustomerCostingTable
      lines={lines}
      exchangeRate={p?.exchange_rate}
      docCurrencyCode={p?.currency_code || "INR"}
      baseCurrencyCode="INR"
      showHsn
    />
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PoLineItemsPanel;
