// Compact line-items panel for the PO detail page.
// Mirrors quotations/view/LineItemsPanel.js and pfi/view/PfiLineItemsPanel.js
// (same table, same paginator) so all three detail pages match. The costing
// breakdown now lives in the right-hand column of the detail page.

import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { num } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocLineItemsTable from "@src/views/_shared/sales-doc/SalesDocLineItemsTable";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { getCurrencySymbol } from "@src/utility/currency";

const PoLineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};
  const lines = p?.lines || [];
  const sym =
    getCurrencySymbol(p?.currency_code) ||
    p?.currency_symbol ||
    p?.currency_code ||
    "";
  // line_total is stored in INR base; convert to doc currency for display.
  const rate = num(p?.exchange_rate) || 1;
  const toDocCcy = (v) => num(v) * rate;

  const body = (
    <SalesDocLineItemsTable lines={lines} sym={sym} toDocCcy={toDocCcy} />
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PoLineItemsPanel;
