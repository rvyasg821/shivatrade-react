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
  fmtRate,
  currencySymbol,
  computeLineCosting,
} from "./_helpers";
import {
  usePagination,
  TablePaginationBar,
  TotalRowsHint,
} from "@src/views/_shared/table/TablePagination";

const CustomerCostingTable = ({
  lines = [],
  productOptions = [],
  exchangeRate = 1,
  docCurrencyCode = "INR",
  baseCurrencyCode = "INR",
  // Opt-in dedicated HSN column. When off, HSN still shows as a sub-line
  // under the product name (keeps existing callers unchanged).
  showHsn = false,
  // Invoice-only: use each line's stored `line_total` (frozen at Issue,
  // already authoritative — the Costing panel/PDFs/Excel all sum it) instead
  // of recomputing from scratch. Recomputing independently re-runs the
  // discount/expense/rebate/margin chain with its own per-step rounding,
  // which can drift a cent or two from the frozen total and disagree with
  // the Costing panel shown right below this table. Quotation/SO keep
  // recomputing live (default) since nothing is frozen for them yet.
  useStoredTotal = false,
}) => {
  const { t } = useTranslation();
  const prodById = new Map(
    (productOptions || []).map((o) => [o.value, o.raw || {}])
  );

  // Multi-currency: computeLineCosting converts each line to the DOCUMENT
  // currency (unit_price × cost_exchange_rate), so its lineTotal is ALREADY in
  // the doc currency — the customer rate/amount are that value, with NO extra
  // header × rate (that was the retired convert-at-end model). Symbol is the
  // doc currency's (₹ when the doc is INR).
  const sym = currencySymbol(docCurrencyCode) || "₹";
  const money = (v) => `${sym}${fmt(v)}`;
  // The Rate column needs more precision than 2dp — a per-unit price under a
  // cent (e.g. $0.00031) rounds to "$0.00" otherwise, hiding the real rate
  // even though qty × rate still reproduces the correct Amount.
  const moneyRate = (v) => `${sym}${fmtRate(v)}`;

  const rows = (lines || [])
    .filter((l) => l && l.product_id)
    .map((l) => {
      const amt =
        useStoredTotal && l.line_total != null
          ? num(l.line_total)
          : computeLineCosting(l, { excludeGst: true }).lineTotal;
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

  // Client-side pagination. Totals above stay computed across ALL rows.
  const pg = usePagination(rows.length);
  const totalRows = rows.length;
  const pageRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  return (
    <Fragment>
      <div className="border rounded table-responsive">
        <Table size="sm" bordered className="mb-0 ws-customer-table line-items-grid">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: showHsn ? "13%" : "15%" }} />
            {showHsn && <col style={{ width: "12%" }} />}
            <col style={{ width: showHsn ? "27%" : "37%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead className="table-light">
            <tr className="ws-head">
              <th className="text-center">#</th>
              <th>{t("Part No")}</th>
              {showHsn && <th>{t("HSN")}</th>}
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
                <td
                  colSpan={showHsn ? 7 : 6}
                  className="text-center text-muted py-3"
                >
                  {t("No products.")}
                </td>
              </tr>
            ) : (
              pageRows.map((r, i) => (
                <tr key={r.l._id || pg.pageStart + i}>
                  <td className="text-center text-muted">
                    {pg.pageStart + i + 1}
                  </td>
                  <td className="text-nowrap">{r.part || "-"}</td>
                  {showHsn && (
                    <td className="text-nowrap">{r.hsn || "-"}</td>
                  )}
                  <td style={{ whiteSpace: "normal" }}>
                    <div className="fw-semibold text-capitalize text-wrap">
                      {r.name}
                    </div>
                    {!showHsn && r.hsn ? (
                      <div className="small text-muted">
                        {`${t("HSN")}: ${r.hsn}`}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-end ws-num text-nowrap">
                    {fmt(r.qty)}
                    {r.unit ? (
                      <span className="text-muted"> {r.unit}</span>
                    ) : null}
                  </td>
                  <td className="text-end ws-num">{moneyRate(r.rate)}</td>
                  <td className="text-end ws-num fw-bold">{money(r.amt)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="table-light fw-bold">
              <tr>
                <td />
                <td />
                {showHsn && <td />}
                <td>
                  {t("Grand Total")}{" "}
                  <TotalRowsHint totalRows={totalRows} pageSize={pg.pageSize} />
                </td>
                <td className="text-end">{fmt(totalQty)}</td>
                <td />
                <td className="text-end">{money(totalAmt)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </div>

      <TablePaginationBar {...pg} totalRows={totalRows} />
    </Fragment>
  );
};

export default CustomerCostingTable;
