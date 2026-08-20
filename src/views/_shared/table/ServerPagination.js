// Shared SERVER-side pagination — the "Show N ▾ / X-Y of Total" + ReactPaginate
// footer used by every report/list page that fetches its rows a page at a time
// from the backend (as opposed to usePagination/TablePaginationBar in
// TablePagination.js, which paginate an already-fetched array in memory).
//
// Every one of these pages had its own copy of this exact state + JSX — one
// place to fix/extend it now.
//
// Usage:
//   const load = useCallback(async (page, perPage) => {
//     setLoading(true);
//     try {
//       const resp = await instance.get(endpoint, { params: { ...filters, page, perPage } });
//       setData(resp?.data?.data || {});
//     } finally { setLoading(false); }
//   }, [filters]);   // no page/perPage in deps — always called with explicit args
//
//   const sp = useServerPagination(load);
//
//   useEffect(() => {                       // on filter change
//     sp.setPage(1);
//     load(1, sp.perPage);
//   }, [filters]);
//
//   <ServerPaginationBar
//     idPrefix="avi"
//     page={sp.page}
//     perPage={data.pagination?.perPage || sp.perPage}
//     total={data.pagination?.total || 0}
//     onPageChange={sp.handlePageChange}
//     onPerPageChange={sp.handlePerPageChange}
//   />
import { useCallback, useState } from "react";
import { Row, Col, Label } from "reactstrap";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";
import { defaultPerPageRow, perPageRowItems } from "@constant/defaultValues";

export const useServerPagination = (load, defaultPage = 1) => {
  const [page, setPage] = useState(defaultPage);
  const [perPage, setPerPage] = useState(defaultPerPageRow);

  const handlePageChange = useCallback(
    (zeroBasedPage) => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const next = zeroBasedPage + 1;
      setPage(next);
      load(next, perPage);
    },
    [load, perPage]
  );

  const handlePerPageChange = useCallback(
    (value) => {
      const pp = Number(value) || defaultPerPageRow;
      setPerPage(pp);
      setPage(1);
      load(1, pp);
    },
    [load]
  );

  return { page, perPage, setPage, setPerPage, handlePageChange, handlePerPageChange };
};

export const ServerPaginationBar = ({
  idPrefix,
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}) => {
  const { t } = useTranslation();
  const pageCount = Math.ceil((total || 1) / (perPage || 1));
  const startIndex = total ? (page - 1) * perPage + 1 : 0;
  const endIndex = Math.min(startIndex - 1 + perPage, total);
  return (
    <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
      <Col sm={6} xl={6}>
        <div className="d-block d-md-flex align-items-center justify-content-start gap-2">
          <div className="label-select d-flex align-items-center gap-1">
            <Label className="pr-2 mb-0">{t("Show")}</Label>
            <select
              id={`${idPrefix}SelectPage`}
              value={perPage}
              className="form-select form-select-page"
              onChange={(e) => onPerPageChange(e?.target?.value)}
            >
              {perPageRowItems?.map((item) => (
                <option key={item?.value} value={item?.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-muted text-center text-sm-start total-pagination">
            {startIndex}-{endIndex} of {total}
          </div>
        </div>
      </Col>
      <Col sm={6} xl={6}>
        <ReactPaginate
          nextLabel={<i className="tim-icons icon-minimal-right" />}
          breakLabel="..."
          previousLabel={<i className="tim-icons icon-minimal-left" />}
          pageCount={pageCount}
          activeClassName="active"
          breakClassName="page-item"
          pageClassName={"page-item"}
          breakLinkClassName="page-link"
          nextLinkClassName={"page-link"}
          pageLinkClassName={"page-link"}
          nextClassName={"page-item next next-btn"}
          previousLinkClassName={"page-link"}
          previousClassName={"page-item prev prev-btn"}
          onPageChange={(p) => onPageChange(p?.selected)}
          forcePage={page - 1}
          containerClassName={`pagination react-paginate align-items-center justify-content-xl-end mb-0 mt-xl-0`}
        />
      </Col>
    </Row>
  );
};
