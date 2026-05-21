// Line items + totals for the PO detail page. Bare-capable for tabs.

import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import { DetailPanel } from "@src/views/_shared/detail-page";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const PoLineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};
  const lines = p?.lines || [];
  const sym = p?.currency_symbol || "₹";

  const intraState =
    num(p?.cgst_total) + num(p?.sgst_total) > 0 && num(p?.igst_total) === 0;

  const body = (
    <Fragment>
      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Product")}</th>
              <th className="text-end" style={{ width: 100 }}>
                {t("Qty")}
              </th>
              <th className="text-end" style={{ width: 100 }}>
                {t("Rate")}
              </th>
              <th className="text-end" style={{ width: 70 }}>
                {t("Disc%")}
              </th>
              <th className="text-end" style={{ width: 70 }}>
                {t("GST%")}
              </th>
              {intraState ? (
                <Fragment>
                  <th className="text-end" style={{ width: 90 }}>
                    {t("CGST")}
                  </th>
                  <th className="text-end" style={{ width: 90 }}>
                    {t("SGST")}
                  </th>
                </Fragment>
              ) : (
                <th className="text-end" style={{ width: 90 }}>
                  {t("IGST")}
                </th>
              )}
              <th className="text-end" style={{ width: 110 }}>
                {t("Total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td
                  colSpan={intraState ? 9 : 8}
                  className="text-center text-muted py-3"
                >
                  {t("No line items.")}
                </td>
              </tr>
            )}
            {lines.map((l, i) => (
              <tr key={l._id || i}>
                <td>{l.seq || i + 1}</td>
                <td className="text-wrap" style={{ minWidth: 180 }}>
                  <div className="fw-semibold">
                    {l.product_name || l.product_code || "-"}
                  </div>
                  {l.product_code && l.product_name && (
                    <small className="text-muted">{l.product_code}</small>
                  )}
                </td>
                <td className="text-end">
                  {l.qty ? `${l.qty}${l.unit ? ` ${l.unit}` : ""}` : "-"}
                </td>
                <td className="text-end">
                  {sym} {fmt(l.unit_price)}
                </td>
                <td className="text-end">{num(l.discount_pct) || 0}</td>
                <td className="text-end">{num(l.tax_pct) || 0}</td>
                {intraState ? (
                  <Fragment>
                    <td className="text-end">
                      {sym} {fmt(l.cgst)}
                    </td>
                    <td className="text-end">
                      {sym} {fmt(l.sgst)}
                    </td>
                  </Fragment>
                ) : (
                  <td className="text-end">
                    {sym} {fmt(l.igst)}
                  </td>
                )}
                <td className="text-end fw-bold">
                  {sym} {fmt(l.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="6" xl="5">
          <Table borderless size="sm" className="mb-0">
            <tbody>
              <tr>
                <td className="text-muted">{t("Subtotal")}</td>
                <td className="text-end">
                  {sym} {fmt(p?.subtotal)}
                </td>
              </tr>
              {intraState ? (
                <Fragment>
                  <tr>
                    <td className="text-muted">{t("CGST")}</td>
                    <td className="text-end">
                      {sym} {fmt(p?.cgst_total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">{t("SGST")}</td>
                    <td className="text-end">
                      {sym} {fmt(p?.sgst_total)}
                    </td>
                  </tr>
                </Fragment>
              ) : (
                <tr>
                  <td className="text-muted">{t("IGST")}</td>
                  <td className="text-end">
                    {sym} {fmt(p?.igst_total)}
                  </td>
                </tr>
              )}
              {num(p?.round_off) !== 0 && (
                <tr>
                  <td className="text-muted">{t("Round-off")}</td>
                  <td className="text-end">
                    {sym} {fmt(p?.round_off)}
                  </td>
                </tr>
              )}
              <tr className="border-top">
                <td className="fw-bold">{t("Grand Total")}</td>
                <td className="text-end fw-bold">
                  {sym} {fmt(p?.grand_total)}
                </td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PoLineItemsPanel;
