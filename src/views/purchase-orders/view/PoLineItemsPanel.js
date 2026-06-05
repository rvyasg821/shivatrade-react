// Compact line-items + costing panel for the PO detail page.
// Mirrors quotations/view/LineItemsPanel.js and pfi/view/PfiLineItemsPanel.js
// (same table, same paginator) so all three detail pages match.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";

import { num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
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

  const totals = useMemo(
    () => computeDocTotals(lines, p?.exchange_rate, { excludeGst: true }),
    [lines, p?.exchange_rate]
  );

  // Client-side pagination — same defaults as the quotation / PFI panels.
  const body = (
    <Fragment>
      <SalesDocLineItemsTable lines={lines} sym={sym} toDocCcy={toDocCcy} />

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={p?.currency_code}
            sticky={false}
            hideGst
          />
        </Col>
      </Row>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PoLineItemsPanel;
