// Internal read-only overview - full-width line-items table, then the
// same costing breakdown shown on the wizard's final step
// (SalesDocCostingCard) below it. Full costing visible (margin, expenses,
// rebates) - this is the admin view.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import { fmt, num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";

const OverviewTab = () => {
  const { t } = useTranslation();
  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const lines = q?.lines || [];

  // Same roll-up the wizard's final step uses - built from the saved lines.
  const totals = useMemo(
    () => computeDocTotals(lines, q?.exchange_rate, { excludeGst: true }),
    [lines, q?.exchange_rate]
  );

  return (
    <Fragment>
      {/* Full-width line items */}
      <h4 className="mb-2">{t("Line Items")}</h4>
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>{t("Product")}</th>
            <th className="text-end">{t("Qty")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Disc%")}</th>
            <th className="text-end">{t("Margin%")}</th>
            <th className="text-end">{t("Line Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            lines.map((l, i) => (
              <tr key={l._id || i}>
                <td>{i + 1}</td>
                <td className="text-wrap">
                  {l.product_name || l.product_code || "-"}
                </td>
                <td className="text-end">{l.qty || "-"}</td>
                <td className="text-end">{fmt(l.unit_price)}</td>
                <td className="text-end">{num(l.discount_pct)}</td>
                <td className="text-end">{num(l.margin_pct)}</td>
                <td className="text-end fw-bold">{fmt(l.line_total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {q?.internal_notes && (
        <div className="border-top pt-2 mt-3">
          <div className="text-muted small">{t("Internal Notes")}</div>
          <div style={{ whiteSpace: "pre-line" }}>{q.internal_notes}</div>
        </div>
      )}

      {/* Costing breakdown - invoice-footer style: right-aligned below the
          line items, same vertical flow as the wizard's final step. */}
      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={q?.currency_code}
            sticky={false}
            hideGst
          />
        </Col>
      </Row>
    </Fragment>
  );
};

export default OverviewTab;
