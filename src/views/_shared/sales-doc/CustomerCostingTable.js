// Customer-facing line summary (presentational) — what the customer sees:
// product, qty, unit rate and amount in the quote currency, with a totals
// footer. Internal cost build-up (vendor, expenses, rebates, margin, INR) is
// hidden. Used by the quotation Step-3 review and the quotation detail page.

import { Fragment } from "react";
import { Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import {
  num,
  fmt,
  currencySymbol,
  computeLineCosting,
} from "./_helpers";

const CustomerCostingTable = ({
  lines = [],
  productOptions = [],
  exchangeRate = 1,
  docCurrencyCode = "INR",
  baseCurrencyCode = "INR",
}) => {
  const { t } = useTranslation();
  const prodById = new Map(
    (productOptions || []).map((o) => [o.value, o.raw || {}])
  );

  const isForeign =
    docCurrencyCode &&
    baseCurrencyCode &&
    docCurrencyCode.toUpperCase() !== baseCurrencyCode.toUpperCase();
  const rate = num(exchangeRate) || 1;
  const sym = isForeign ? currencySymbol(docCurrencyCode) : "₹";
  const money = (v) => `${sym}${fmt(v)}`;

  const rows = (lines || [])
    .filter((l) => l && l.product_id)
    .map((l) => {
      const grandInr = computeLineCosting(l, { excludeGst: true }).lineTotal;
      const amt = isForeign ? grandInr * rate : grandInr;
      const qty = num(l.qty);
      const m = prodById.get(l.product_id) || {};
      return {
        l,
        name: l.product_name || m.name || m.product_name || "-",
        part: l.part_no || m.part_no || "",
        hsn: l.hsn_code || l.hs_code || m.hsn_code || "",
        qty,
        unit: l.unit || m.unit_of_measure || "",
        rate: qty ? amt / qty : 0,
        amt,
      };
    });

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalAmt = rows.reduce((s, r) => s + r.amt, 0);

  return (
    <Fragment>
      <div className="border rounded">
        <Table size="sm" bordered className="mb-0 ws-customer-table">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "52%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead className="table-light">
            <tr className="ws-head">
              <th className="text-center">#</th>
              <th>{t("Product")}</th>
              <th className="text-end">{t("Qty")}</th>
              <th className="text-end">
                {t("Rate")} ({sym})
              </th>
              <th className="text-end">
                {t("Amount")} ({sym})
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  {t("No products.")}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.l._id || i}>
                  <td className="text-center text-muted">{i + 1}</td>
                  <td style={{ whiteSpace: "normal" }}>
                    <div className="fw-semibold text-capitalize text-wrap">
                      {r.name}
                    </div>
                    {r.part || r.hsn ? (
                      <div className="small text-muted">
                        {r.part ? `${t("Part")}: ${r.part}` : ""}
                        {r.part && r.hsn ? " · " : ""}
                        {r.hsn ? `${t("HSN")}: ${r.hsn}` : ""}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-end ws-num text-nowrap">
                    {fmt(r.qty)}
                    {r.unit ? (
                      <span className="text-muted"> {r.unit}</span>
                    ) : null}
                  </td>
                  <td className="text-end ws-num">{money(r.rate)}</td>
                  <td className="text-end ws-num fw-bold">{money(r.amt)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="table-light fw-bold">
              <tr>
                <td />
                <td>{t("Total")}</td>
                <td className="text-end">{fmt(totalQty)}</td>
                <td />
                <td className="text-end">{money(totalAmt)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </div>
    </Fragment>
  );
};

export default CustomerCostingTable;
