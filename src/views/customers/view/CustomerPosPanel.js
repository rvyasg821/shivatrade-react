// Customer detail page — Sales Orders list using the custom ReactPaginate
// pagination (matching the Sales Order detail's vendor-PO/coverage panel).
//
// Server returns the customer's sales orders in one page (perPage 200) and we
// paginate client-side. The SO # cell shows the source PFI (or Quotation) link
// beneath it, mirroring the main listing layout.

import { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Input, UncontrolledTooltip, Spinner } from "reactstrap";
import ReactPaginate from "react-paginate";
import { Eye, ExternalLink } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { PURCHASE_ORDER_STATUS_COLOR_MAP } from "@constant/options";

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const CustomerPosPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.purchaseOrder);

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (id) {
      dispatch(
        getPurchaseOrderList({
          orderBy: "po_date",
          orderDirection: "desc",
          page: 1,
          perPage: 200,
          search: "",
          customer_id: id,
        })
      );
    }
    return () => {
      dispatch(cleanPurchaseOrderMessage(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Filter to THIS customer (the store is shared across customers/pages).
  const rows = (store?.purchaseOrderItems || []).filter(
    (r) => String(r?.customer_id || "") === String(id)
  );
  // Inverted-flag convention: `loading === false` means a fetch is in flight.
  const fetching = store?.loading === false;
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + pageSize);

  if (fetching && total === 0) {
    return (
      <div className="text-center py-3">
        <Spinner />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No sales orders for this customer yet.")}
      </div>
    );
  }

  const statusBadge = (row) => {
    const c =
      PURCHASE_ORDER_STATUS_COLOR_MAP[(row?.status || "").toLowerCase()] ||
      "#6c757d";
    return (
      <span
        className="badge rounded-pill text-capitalize text-nowrap"
        ref={(el) => {
          if (el) {
            el.style.setProperty("background-color", `${c}1f`, "important");
            el.style.setProperty("color", c, "important");
          }
        }}
      >
        {(row?.status || "-").replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <Fragment>
      <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: 220 }}>{t("SO #")}</th>
              <th style={{ width: 130 }}>{t("Date")}</th>
              <th style={{ width: 150 }}>{t("Expected")}</th>
              <th style={{ width: 130 }} className="text-end">
                {t("Total")}
              </th>
              <th style={{ width: 120 }}>{t("Status")}</th>
              <th style={{ width: 80 }} className="text-center">
                {t("Action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const refVoucher =
                row?.pfi_voucher_no || row?.quotation_voucher_no;
              const refTo = row?.pfi_id
                ? `${appsRoot}/pfi/view/${row.pfi_id}`
                : row?.quotation_id
                ? `${appsRoot}/quotations/view/${row.quotation_id}`
                : null;
              const refLabel = row?.pfi_id ? "PFI" : "Quote";
              const sym = row?.currency_symbol || row?.currency_code || "";
              return (
                <tr key={row?._id}>
                  <td>
                    <Link
                      to={`${appsRoot}/purchase-orders/view/${row?._id || ""}`}
                      className="text-nowrap d-block fw-semibold"
                    >
                      {row?.voucher_no || "-"}
                    </Link>
                    {refVoucher ? (
                      <div className="mt-25">
                        {refTo ? (
                          <Link
                            to={refTo}
                            className="small text-muted text-nowrap d-inline-flex align-items-center"
                          >
                            {refLabel} - {refVoucher}
                            <ExternalLink size={12} className="ms-1" />
                          </Link>
                        ) : (
                          <span className="small text-muted text-nowrap">
                            {refLabel} - {refVoucher}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </td>
                  <td>{row?.po_date ? formatDate(row.po_date) : "-"}</td>
                  <td>
                    {row?.expected_delivery_date
                      ? formatDate(row.expected_delivery_date)
                      : "-"}
                  </td>
                  <td className="text-end">
                    {row?.grand_total !== null &&
                    row?.grand_total !== undefined
                      ? `${sym}${fmt(row.grand_total)}`
                      : "-"}
                  </td>
                  <td>{statusBadge(row)}</td>
                  <td className="text-center">
                    <Link
                      to={`${appsRoot}/purchase-orders/view/${row?._id}`}
                      id={`cust-po-view-${row?._id}`}
                    >
                      <Eye size={18} />
                    </Link>
                    <UncontrolledTooltip
                      placement="top"
                      target={`cust-po-view-${row?._id}`}
                    >
                      {t("View")}
                    </UncontrolledTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1">
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
            {t("of")} {total} {t("rows")}
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

export default CustomerPosPanel;
