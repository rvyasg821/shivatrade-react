// Shared line-items table for sales-doc detail pages (Quotation, Sales Order)
// and the Lead requirement items. Renders the table + paginator only — callers
// own any costing card. Product shows "CODE - NAME" with the vendor below.
//
//   lines      : line objects ({ product_code, product_name, vendor_name,
//                vendor_code, qty, unit, unit_price, line_total? })
//   sym        : currency symbol to prefix money with
//   toDocCcy   : (baseInr) => displayAmount  (e.g. × exchange rate)
//   showTotal  : include the Total column (default true)

import { Fragment } from "react";
import { Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { fmt, num } from "@src/views/_shared/sales-doc/_helpers";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

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
  const pg = usePagination(lines.length);
  const totalRows = lines.length;
  const pageLines = lines.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  const showMoney = !requirementMode;
  // requirementMode (Lead) shows: #, Product, Part No, HSN, Qty, UOM.
  const colCount = requirementMode ? 6 : showTotal ? 5 : 4;

  return (
    <Fragment>
      <Table responsive bordered size="sm" className="mb-0 align-top line-items-grid">
        <thead className="table-light">
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th>{t("Product")}</th>
            {requirementMode && <th className="text-nowrap">{t("Part No")}</th>}
            {requirementMode && <th className="text-nowrap">{t("HSN")}</th>}
            <th className="text-end">{t("Qty")}</th>
            {requirementMode && (
              <th className="text-nowrap">{t("UOM")}</th>
            )}
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
              const rowNum = pg.pageStart + i + 1;
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
                    </div>
                  </td>
                  {requirementMode && (
                    <td className="text-nowrap">{l.part_no || "-"}</td>
                  )}
                  {requirementMode && (
                    <td className="text-nowrap">
                      {l.hsn_code || l.hs_code || "-"}
                    </td>
                  )}
                  <td className="text-end">
                    {l.qty
                      ? `${num(l.qty).toFixed(2)}${
                          // UOM has its own column in requirementMode, so don't
                          // also suffix it onto the quantity there.
                          !requirementMode && l.unit ? ` ${l.unit}` : ""
                        }`
                      : "-"}
                  </td>
                  {requirementMode && (
                    <td className="text-nowrap">{l.unit || "-"}</td>
                  )}
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

      <TablePaginationBar {...pg} totalRows={totalRows} />
    </Fragment>
  );
};

export default SalesDocLineItemsTable;
