// Shared client-side pagination — the "Show N ▾ / of X rows" dropdown + page
// arrows used by every in-page line-item / report / ledger grid (Costing
// Worksheet, Customer Costing Table, import-review modals, ledger statement,
// turnover reports, price list, stock movement history…). Previously each of
// these hand-rolled its own copy of this exact state + markup — this is the
// single place to fix/extend it.
//
// Usage:
//   const pg = usePagination(rows.length);
//   const pageRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);
//   ...
//   <TablePaginationBar {...pg} totalRows={rows.length} />
//
// The Total/TOTAL footer of a grid (when there is one) should stay bound to a
// full-range aggregate (backend totals, or a sum computed over ALL rows, not
// just `pageRows`) — pagination only changes which rows are rendered.
import { useEffect, useState } from "react";
import { Input } from "reactstrap";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";

export const usePagination = (totalRows, defaultPageSize = 10) => {
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  const setPageSize = (n) => {
    setPageSizeRaw(Number(n) || defaultPageSize);
    setPage(0);
  };
  const resetPage = () => setPage(0);
  // Call BEFORE appending a row, passing the row count as it is right now —
  // jumps to the page that will hold the new row once it's appended (Add
  // Product / Add Vendor), so it doesn't silently land off-screen.
  const jumpToEnd = (lengthBeforeAppend) =>
    setPage(Math.floor(lengthBeforeAppend / pageSize));

  return {
    page: safePage,
    pageSize,
    pageCount,
    pageStart,
    setPage,
    setPageSize,
    resetPage,
    jumpToEnd,
  };
};

export const TablePaginationBar = ({
  totalRows,
  pageSize,
  pageCount,
  page,
  setPage,
  setPageSize,
  pageSizeOptions = [10, 25, 50, 100],
  className = "d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1",
}) => {
  const { t } = useTranslation();
  if (!(totalRows > pageSize)) return null;
  return (
    <div className={className}>
      <div className="d-flex align-items-center small text-muted">
        <span className="me-50">{t("Show")}</span>
        <Input
          type="select"
          bsSize="sm"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          style={{ width: 80 }}
        >
          {pageSizeOptions.map((n) => (
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
        forcePage={page}
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
  );
};

// Small helper for a "Total (all N)" footer label that stays readable
// regardless of which page is showing — used in a <td> next to a TOTAL/Total
// label. Renders nothing (just the count) when everything fits on one page.
export const TotalRowsHint = ({ totalRows, pageSize }) => {
  const { t } = useTranslation();
  if (!(totalRows > pageSize)) return null;
  return (
    <span className="fw-normal text-muted">
      ({t("all")} {totalRows})
    </span>
  );
};
