// Compact line-items + costing panel for the PO detail page.
// Mirrors quotations/view/LineItemsPanel.js and pfi/view/PfiLineItemsPanel.js
// (same table, same paginator) so all three detail pages match.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Table, Input } from "reactstrap";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";

import {
  fmt,
  num,
  computeDocTotals,
} from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { getCurrencySymbol } from "@src/utility/currency";

const PoLineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};
  const lines = p?.lines || [];
  const sym =
    getCurrencySymbol(p?.currency_code) ||
    p?.currency_symbol ||
    p?.currency_code ||
    "";
  // line_total is stored in INR base; convert to doc currency for display.
  const rate = num(p?.exchange_rate) || 1;
  const toDocCcy = (v) => num(v) * rate;

  const totals = useMemo(
    () => computeDocTotals(lines, p?.exchange_rate, { excludeGst: true }),
    [lines, p?.exchange_rate]
  );

  // Client-side pagination — same defaults as the quotation / PFI panels.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const totalRows = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = pageStart + pageSize;
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);
  const pageLines = lines.slice(pageStart, pageEnd);

  const body = (
    <Fragment>
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>{t("Product")}</th>
            <th className="text-end">{t("Qty")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            pageLines.map((l, i) => {
              const rowNum = pageStart + i + 1;
              return (
                <tr key={l._id || rowNum}>
                  <td>{rowNum}</td>
                  <td className="text-wrap" style={{ minWidth: 220 }}>
                    <div>{l.product_name || l.product_code || "-"}</div>
                    {l.product_name && l.product_code ? (
                      <div className="text-muted small">{l.product_code}</div>
                    ) : null}
                  </td>
                  <td className="text-end">
                    {l.qty
                      ? `${num(l.qty).toFixed(2)}${
                          l.unit ? ` ${l.unit}` : ""
                        }`
                      : "-"}
                  </td>
                  <td className="text-end">
                    {num(l.qty) > 0
                      ? `${sym}${fmt(toDocCcy(l.line_total) / num(l.qty))}`
                      : `${sym}${fmt(toDocCcy(l.unit_price))}`}
                  </td>
                  <td className="text-end fw-bold">
                    {sym}
                    {fmt(toDocCcy(l.line_total))}
                  </td>
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

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={p?.currency_code}
            sticky={false}
            hideGst
          />
        </Col>
      </Row>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default PoLineItemsPanel;
