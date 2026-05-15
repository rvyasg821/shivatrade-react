// Internal read-only overview - full-width line-items table (with HS code
// + per-line weights + packages) then the same costing breakdown shown on
// the wizard's final step (SalesDocCostingCard) below it. Full costing
// visible (margin, expenses, rebates) - this is the admin view.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import { fmt, num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";

const OverviewTab = () => {
  const { t } = useTranslation();
  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const lines = p?.lines || [];

  const totals = useMemo(
    () => computeDocTotals(lines, p?.exchange_rate),
    [lines, p?.exchange_rate]
  );

  return (
    <Fragment>
      {/* ── Shipping & Packing summary ─────────────────────────────── */}
      {(p?.port_of_loading ||
        p?.port_of_discharge ||
        p?.mode_of_shipment ||
        p?.total_packages > 0) && (
        <div className="mb-3 p-2 border rounded bg-light">
          <h6 className="text-uppercase text-muted small mb-2">
            {t("Shipping & Packing")}
          </h6>
          <Row>
            {p?.port_of_loading && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Port of Loading")}
                </small>
                <span>{p.port_of_loading}</span>
              </Col>
            )}
            {p?.port_of_discharge && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Port of Discharge")}
                </small>
                <span>{p.port_of_discharge}</span>
              </Col>
            )}
            {p?.mode_of_shipment && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Mode of Shipment")}
                </small>
                <span className="text-capitalize">{p.mode_of_shipment}</span>
              </Col>
            )}
            {p?.country_of_final_destination && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Country of Destination")}
                </small>
                <span>{p.country_of_final_destination}</span>
              </Col>
            )}
            {(p?.est_shipment_date || p?.est_delivery_date) && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Est. Ship / Deliver")}
                </small>
                <span>
                  {(p?.est_shipment_date || "-").slice(0, 10)}
                  {" / "}
                  {(p?.est_delivery_date || "-").slice(0, 10)}
                </span>
              </Col>
            )}
            {p?.container_details && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Container")}
                </small>
                <span>{p.container_details}</span>
              </Col>
            )}
            <Col md="4" className="mb-1">
              <small className="text-muted d-block">
                {t("Total Packages")}
              </small>
              <span>
                {p?.total_packages ?? 0}
                {p?.packing_type ? ` × ${p.packing_type}` : ""}
              </span>
            </Col>
            <Col md="4" className="mb-1">
              <small className="text-muted d-block">
                {t("Net / Gross (kg)")}
              </small>
              <span>
                {fmt(p?.net_weight_kg || 0)} / {fmt(p?.gross_weight_kg || 0)}
              </span>
            </Col>
            {p?.packing_marks && (
              <Col md="4" className="mb-1">
                <small className="text-muted d-block">
                  {t("Packing Marks")}
                </small>
                <span>{p.packing_marks}</span>
              </Col>
            )}
          </Row>
        </div>
      )}

      {/* Full-width line items */}
      <h4 className="mb-2">{t("Line Items")}</h4>
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>{t("Product")}</th>
            <th>{t("HS Code")}</th>
            <th className="text-end">{t("Qty")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Net Wt")}</th>
            <th className="text-end">{t("Gross Wt")}</th>
            <th className="text-end">{t("Pkgs")}</th>
            <th className="text-end">{t("Line Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center text-muted py-3">
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
                <td>{l.hs_code || "-"}</td>
                <td className="text-end">{l.qty || "-"}</td>
                <td className="text-end">{fmt(l.unit_price)}</td>
                <td className="text-end">{fmt(l.net_weight_kg || 0)}</td>
                <td className="text-end">{fmt(l.gross_weight_kg || 0)}</td>
                <td className="text-end">{num(l.package_count) || 0}</td>
                <td className="text-end fw-bold">{fmt(l.line_total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {p?.internal_notes && (
        <div className="border-top pt-2 mt-3">
          <div className="text-muted small">{t("Internal Notes")}</div>
          <div style={{ whiteSpace: "pre-line" }}>{p.internal_notes}</div>
        </div>
      )}

      {/* Costing breakdown - invoice-footer style: right-aligned below the
          line items, same vertical flow as the wizard's final step. */}
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
};

export default OverviewTab;
