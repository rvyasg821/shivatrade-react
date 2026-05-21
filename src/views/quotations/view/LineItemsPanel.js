// Compact line-items + costing panel for the quotation detail page.
// Reuses fmt/num/computeDocTotals + SalesDocCostingCard from the shared kit.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import {
  fmt,
  num,
  computeDocTotals,
} from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { getCurrencySymbol } from "@src/utility/currency";

const LineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const lines = q?.lines || [];
  const sym =
    getCurrencySymbol(q?.currency_code) ||
    q?.currency_symbol ||
    q?.currency_code ||
    "";
  // line_total is stored in the base currency (INR). The doc Grand Total is
  // grand_inr × exchange_rate — apply the same conversion per line so the
  // table reads in the doc's currency to match the costing card.
  const rate = num(q?.exchange_rate) || 1;
  const toDocCcy = (v) => num(v) * rate;

  const totals = useMemo(
    () => computeDocTotals(lines, q?.exchange_rate),
    [lines, q?.exchange_rate]
  );

  const body = (
    <Fragment>
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>{t("Product")}</th>
            <th className="text-end">{t("Qty")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            lines.map((l, i) => {
              return (
                <tr key={l._id || i}>
                  <td>{i + 1}</td>
                  <td className="text-wrap" style={{ minWidth: 220 }}>
                    {l.product_name || l.product_code || "-"}
                  </td>
                  <td className="text-end">
                    {l.qty
                      ? `${l.qty}${l.unit ? ` ${l.unit}` : ""}`
                      : "-"}
                  </td>
                  <td className="text-end">
                    {num(l.qty) > 0
                      ? `${sym}${fmt(toDocCcy(l.line_total) / num(l.qty))}`
                      : `${sym}${fmt(toDocCcy(l.unit_price))}`}
                  </td>
                  <td className="text-end fw-bold">
                    {sym}
                    {fmt(toDocCcy(l.line_total))}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={q?.currency_code}
            sticky={false}
          />
        </Col>
      </Row>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default LineItemsPanel;
