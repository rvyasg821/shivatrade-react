// Customer-facing line summary (presentational) — what the customer sees:
// product, qty, unit rate and amount in the quote currency, with a totals
// footer. Internal cost build-up (vendor, expenses, rebates, margin, INR) is
// hidden. Used by the quotation Step-3 review and the quotation detail page.

import { Fragment, useEffect, useState } from "react";
import { Table, Input } from "reactstrap";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";

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
  // Opt-in dedicated HSN column. When off, HSN still shows as a sub-line
  // under the product name (keeps existing callers unchanged).
  showHsn = false,
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

  // Client-side pagination. Totals above stay computed across ALL rows.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

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
                <tr key={r.l._id || pageStart + i}>
                  <td className="text-center text-muted">
                    {pageStart + i + 1}
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
                <td />
                {showHsn && <td />}
                <td>
                  {t("Grand Total")}
                  {totalRows > pageSize ? (
                    <span className="text-muted fw-normal ms-50">
                      ({t("all")} {totalRows} {t("rows")})
                    </span>
                  ) : null}
                </td>
                <td className="text-end">{fmt(totalQty)}</td>
                <td />
                <td className="text-end">{money(totalAmt)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </div>

      {totalRows > 0 && (
        <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1">
          <div className="d-flex align-items-center small text-muted">
            <span className="me-50">{t("Show")}</span>
            <Input
              type="select"
              bsSize="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setPage(0);
              }}
              style={{ width: 80 }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Input>
            <span className="ms-50">
              {t("of")} {totalRows} {t("rows")}
            </span>
          </div>
          <ReactPaginate
            previousLabel=""
            nextLabel=""
            pageCount={pageCount}
            activeClassName="active"
            forcePage={safePage}
            onPageChange={({ selected }) => setPage(selected)}
            pageClassName="page-item"
            nextLinkClassName="page-link"
            nextClassName="page-item next"
            previousClassName="page-item prev"
            previousLinkClassName="page-link"
            pageLinkClassName="page-link"
            containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
          />
        </div>
      )}
    </Fragment>
  );
};

export default CustomerCostingTable;
