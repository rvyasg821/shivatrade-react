// Line items + totals for the PO detail page. Bare-capable for tabs.

import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Table } from "reactstrap";
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
  const rate = Number(p?.exchange_rate) || 1;
  const toCcy = (v) =>
    v === null || v === undefined || v === "" ? v : Number(v) * rate;

  const body = (
    <Fragment>
      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Product")}</th>
              <th className="text-end" style={{ width: 120 }}>
                {t("Qty")}
              </th>
              <th className="text-end" style={{ width: 120 }}>
                {t("Rate")}
              </th>
              <th className="text-end" style={{ width: 130 }}>
                {t("Total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
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
                  {l.qty
                    ? `${fmt(l.qty)}${l.unit ? ` ${l.unit}` : ""}`
                    : "-"}
                </td>
                <td className="text-end">
                  {num(l.qty) > 0
                    ? `${sym} ${fmt(toCcy(l.line_total) / num(l.qty))}`
                    : `${sym} ${fmt(toCcy(l.unit_price))}`}
                </td>
                <td className="text-end fw-bold">
                  {sym} {fmt(toCcy(l.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PoLineItemsPanel;
