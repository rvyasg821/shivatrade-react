// Compact line-items + costing panel for the quotation detail page.
// Reuses fmt/num/computeDocTotals + SalesDocCostingCard from the shared kit.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";

import { num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import SalesDocLineItemsTable from "@src/views/_shared/sales-doc/SalesDocLineItemsTable";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { useQuotationCurrency } from "./CurrencyToggleContext";

const LineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const lines = q?.lines || [];

  // Currency view is driven by the detail-page toggle:
  //   • base (default) → show INR (line_total is already stored in INR)
  //   • doc            → multiply by the exchange rate (doc units per ₹1)
  const { sym, fromInr, view } = useQuotationCurrency();
  // line_total is stored in the base currency (INR); `fromInr` applies the
  // active currency view so the table matches the costing card and KPIs.
  const toDocCcy = (v) => fromInr(num(v));

  const totals = useMemo(
    () => computeDocTotals(lines, q?.exchange_rate, { excludeGst: true }),
    [lines, q?.exchange_rate]
  );

  const body = (
    <Fragment>
      <SalesDocLineItemsTable
        lines={lines}
        sym={sym}
        toDocCcy={toDocCcy}
      />

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={q?.currency_code}
            currencyView={view}
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

export default LineItemsPanel;
