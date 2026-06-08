// Shared line-items table for sales-doc detail pages (Quotation, Sales Order)
// and the Lead requirement items. Renders the table + paginator only — callers
// own any costing card. Product shows "CODE - NAME" with the vendor below.
//
//   lines      : line objects ({ product_code, product_name, vendor_name,
//                vendor_code, qty, unit, unit_price, line_total? })
//   sym        : currency symbol to prefix money with
//   toDocCcy   : (baseInr) => displayAmount  (e.g. × exchange rate)
//   showTotal  : include the Total column (default true)

import { Fragment, useEffect, useState } from "react";
import { Table, Input } from "reactstrap";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";
import { fmt, num } from "@src/views/_shared/sales-doc/_helpers";

const SalesDocLineItemsTable = ({
  lines = [],
  sym = "₹",
  toDocCcy = (v) => num(v),
  showTotal = true,
  // Lead lines have no real line_total (pricing isn't finalised yet), so the
  // caller asks for Total = qty × unit_price instead of the stored line_total.
  totalFromQtyPrice = false,
  // Lead requirement lines carry no vendor/price — vendor & pricing are
  // decided later at the quotation. In this mode the table drops the Vendor
  // badge + Price + Total columns and shows HSN instead.
  requirementMode = false,
}) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const totalRows = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageLines = lines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  const showMoney = !requirementMode;
  const colCount = requirementMode ? 4 : showTotal ? 5 : 4;

  return (
    <Fragment>
      <Table responsive bordered size="sm" className="mb-0 align-top">
        <thead className="table-light">
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th>{t("Product")}</th>
            {requirementMode && <th>{t("HSN")}</th>}
            <th className="text-end">{t("Qty")}</th>
            {showMoney && <th className="text-end">{t("Price")}</th>}
            {showMoney && showTotal && (
              <th className="text-end">{t("Total")}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            pageLines.map((l, i) => {
              const rowNum = pageStart + i + 1;
              const product =
                [l.product_code, l.product_name].filter(Boolean).join(" - ") ||
                "-";
              const vendor = l.vendor_code
                ? `${l.vendor_name || ""} [${l.vendor_code}]`.trim()
                : l.vendor_name || "";
              const lineTotal =
                !totalFromQtyPrice && l.line_total != null
                  ? num(l.line_total)
                  : num(l.qty) * num(l.unit_price);
              return (
                <tr key={l._id || rowNum}>
                  <td>{rowNum}</td>
                  <td className="text-wrap" style={{ minWidth: 240 }}>
                    <div className="fw-semibold">{product}</div>
                    <div className="d-flex flex-wrap gap-25 mt-25">
                      {showMoney && vendor ? (
                        <span
                          className="badge d-inline-block"
                          // Forced via ref because the global `.table td` rule
                          // sets text/background with !important, which a
                          // class/inline style can't override.
                          ref={(el) => {
                            if (el) {
                              el.style.setProperty(
                                "background-color",
                                "rgba(9, 65, 139, 0.12)",
                                "important"
                              );
                              el.style.setProperty("color", "#09418B", "important");
                            }
                          }}
                        >
                          {vendor}
                        </span>
                      ) : null}
                      {showMoney && l.source_rfq_voucher_no ? (
                        <span
                          className="badge d-inline-block"
                          title={t("Price sourced from this RFQ")}
                          ref={(el) => {
                            if (el) {
                              el.style.setProperty(
                                "background-color",
                                "rgba(11, 94, 215, 0.12)",
                                "important"
                              );
                              el.style.setProperty("color", "#0b5ed7", "important");
                            }
                          }}
                        >
                          {t("from RFQ")} {l.source_rfq_voucher_no}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  {requirementMode && (
                    <td className="text-nowrap">{l.hs_code || "-"}</td>
                  )}
                  <td className="text-end">
                    {l.qty
                      ? `${num(l.qty).toFixed(2)}${l.unit ? ` ${l.unit}` : ""}`
                      : "-"}
                  </td>
                  {showMoney && (
                    <td className="text-end">
                      {sym}
                      {fmt(toDocCcy(l.unit_price))}
                    </td>
                  )}
                  {showMoney && showTotal && (
                    <td className="text-end fw-bold">
                      {sym}
                      {fmt(toDocCcy(lineTotal))}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

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
    </Fragment>
  );
};

export default SalesDocLineItemsTable;
