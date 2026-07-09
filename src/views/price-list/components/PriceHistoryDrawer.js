// Price history for one (vendor, product) pair, shown in a right-side drawer
// (Offcanvas) — mirrors the Vendor Pricing drawer on the product listing.
// Lists every version newest first, reusing GET /price-list/list with both
// filters (all versions, not current-only).

import { useEffect, useMemo, useState } from "react";
import {
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Spinner,
  Table,
  Badge,
  Input,
} from "reactstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { formatDate } from "@src/utility/dateFormat";

const money = (v, sym) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? "-"
    : `${sym || "₹"}${Number(v).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const sourceLabel = (r, t) =>
  r?.source_type === "rfq"
    ? r?.source_rfq_voucher_no || t("RFQ")
    : r?.source_type || "manual";

const PriceHistoryDrawer = ({
  open,
  toggle,
  vendorId,
  productId,
  title,
  vendorName,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open || !vendorId || !productId) return;
    let alive = true;
    setLoading(true);
    instance
      .get(API_ENDPOINTS.priceList.list, {
        params: {
          vendor_id: vendorId,
          product_id: productId,
          perPage: 200,
          page: 1,
          orderBy: "effective_date",
          orderDirection: "desc",
        },
      })
      .then((res) => {
        if (!alive) return;
        setRows(res?.data?.data || []);
        setPage(0);
      })
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, vendorId, productId]);

  const today = new Date().toISOString().slice(0, 10);

  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageRows = useMemo(
    () => rows.slice(pageStart, pageStart + pageSize),
    [rows, pageStart, pageSize],
  );

  return (
    <Offcanvas
      direction="end"
      isOpen={open}
      toggle={toggle}
      style={{ width: 640 }}
    >
      <OffcanvasHeader toggle={toggle}>
        <div className="fw-bold">{t("Price History")}</div>
        {title ? (
          <div className="small text-muted text-capitalize">{title}</div>
        ) : null}
        {vendorName ? (
          <div className="small text-muted text-capitalize">{vendorName}</div>
        ) : null}
      </OffcanvasHeader>
      <OffcanvasBody>
        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <Spinner color="primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No price history.")}
          </div>
        ) : (
          <>
            <Table size="sm" className="mb-0" style={{ width: "100%" }}>
              <thead className="table-light">
                <tr>
                  <th>{t("Price")}</th>
                  <th className="text-nowrap">{t("Effective From")}</th>
                  <th className="text-end">{t("Lead")}</th>
                  <th>{t("Source")}</th>
                  <th className="text-center">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, idx) => {
                  const globalIdx = pageStart + idx;
                  const sym = r?.currency_symbol || r?.currency_code || "";
                  const end = r?.effective_until
                    ? String(r.effective_until).slice(0, 10)
                    : null;
                  // The newest non-expired row is the current one.
                  const isCurrent = globalIdx === 0 && (!end || end >= today);
                  return (
                    <tr key={r._id}>
                      <td className="fw-semibold">
                        {money(r.unit_price, sym)}
                      </td>
                      <td>{formatDate(r.effective_date)}</td>
                      <td className="text-end">
                        {r.lead_time_days != null ? r.lead_time_days : "-"}
                      </td>
                      <td className="text-capitalize text-nowrap">
                        {sourceLabel(r, t)}
                      </td>
                      <td className="text-center">
                        {isCurrent ? (
                          <Badge color="light-success" pill>
                            {t("Current")}
                          </Badge>
                        ) : (
                          <Badge color="light-secondary" pill>
                            {t("Past")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
          </>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default PriceHistoryDrawer;
