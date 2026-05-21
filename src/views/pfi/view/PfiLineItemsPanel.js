// Compact line-items + costing panel for the PFI detail page.
// Mirrors quotations/view/LineItemsPanel.js — supports `bare` mode so it can
// live inside a tab without a wrapper card.

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

const PfiLineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const lines = p?.lines || [];

  const totals = useMemo(
    () => computeDocTotals(lines, p?.exchange_rate),
    [lines, p?.exchange_rate]
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
            <th className="text-end">{t("Net Wt")}</th>
            <th className="text-end">{t("Gross Wt")}</th>
            <th className="text-end">{t("Pkgs")}</th>
            <th className="text-end">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            lines.map((l, i) => (
              <tr key={l._id || i}>
                <td>{i + 1}</td>
                <td className="text-wrap" style={{ minWidth: 180 }}>
                  <div className="fw-semibold">
                    {l.product_name || l.product_code || "-"}
                  </div>
                  {l.description && (
                    <small className="text-muted d-block">{l.description}</small>
                  )}
                </td>
                <td className="text-end">
                  {l.qty ? `${l.qty}${l.unit ? ` ${l.unit}` : ""}` : "-"}
                </td>
                <td className="text-end">{fmt(l.unit_price)}</td>
                <td className="text-end text-muted">
                  {fmt(l.net_weight_kg || 0)}
                </td>
                <td className="text-end text-muted">
                  {fmt(l.gross_weight_kg || 0)}
                </td>
                <td className="text-end">{num(l.package_count) || 0}</td>
                <td className="text-end fw-bold">{fmt(l.line_total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={p?.currency_code}
            sticky={false}
          />
        </Col>
      </Row>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PfiLineItemsPanel;
