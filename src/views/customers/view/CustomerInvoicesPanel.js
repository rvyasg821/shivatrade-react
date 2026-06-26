// Customer detail page — Invoices list using the custom ReactPaginate
// pagination (matching the Sales Orders / Quotations panels). Server returns
// the customer's invoices in one page (perPage 200); pagination is client-side.

import { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Input, UncontrolledTooltip, Spinner } from "reactstrap";
import ReactPaginate from "react-paginate";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getInvoiceList,
  cleanInvoiceMessage,
} from "@src/views/invoices/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { INVOICE_STATUS_COLOR_MAP } from "@constant/options";

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const CustomerInvoicesPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.invoice);

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (id) {
      dispatch(
        getInvoiceList({
          orderBy: "invoice_date",
          orderDirection: "desc",
          page: 1,
          perPage: 200,
          search: "",
          customer_id: id,
        })
      );
    }
    return () => {
      dispatch(cleanInvoiceMessage());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Filter to THIS customer's invoices: the invoice store is shared, so a
  // previously-viewed customer/page can leave stale rows in it. Without this,
  // an empty customer would briefly show another customer's invoices instead
  // of the "no invoices" message.
  const rows = (store?.invoiceItems || []).filter(
    (r) => String(r?.customer_id || "") === String(id)
  );
  // Inverted-flag convention in the invoice slice: `loading === false` means a
  // fetch is in flight; `loading === true` means idle/done. So only show the
  // spinner while actually fetching — otherwise (idle + no rows) fall through
  // to the empty message.
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
        {t("No invoices for this customer yet.")}
      </div>
    );
  }

  return (
    <Fragment>
      <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: 200 }}>{t("Invoice #")}</th>
              <th style={{ width: 130 }}>{t("Date")}</th>
              <th style={{ width: 130 }} className="text-end">
                {t("Total")}
              </th>
              <th style={{ width: 130 }} className="text-end">
                {t("Balance")}
              </th>
              <th style={{ width: 130 }}>{t("Status")}</th>
              <th style={{ width: 80 }} className="text-center">
                {t("Action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const sym = row?.currency_symbol || row?.currency_code || "";
              const c =
                INVOICE_STATUS_COLOR_MAP[
                  (row?.status || "").toLowerCase()
                ] || "#6c757d";
              const refVoucher =
                row?.purchase_order_voucher_no || row?.pfi_voucher_no;
              const refTo = row?.purchase_order_id
                ? `${appsRoot}/purchase-orders/view/${row.purchase_order_id}`
                : null;
              return (
                <tr key={row?._id}>
                  <td>
                    <Link
                      to={`${appsRoot}/invoices/view/${row?._id || ""}`}
                      className="text-nowrap d-block fw-semibold"
                    >
                      {row?.voucher_no || (
                        <span className="text-muted fst-italic">
                          {t("(draft)")}
                        </span>
                      )}
                    </Link>
                    {refVoucher ? (
                      <div className="mt-25">
                        {refTo ? (
                          <Link
                            to={refTo}
                            className="small text-muted text-nowrap"
                          >
                            SO - {refVoucher}
                          </Link>
                        ) : (
                          <span className="small text-muted text-nowrap">
                            SO - {refVoucher}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {row?.invoice_date ? formatDate(row.invoice_date) : "-"}
                  </td>
                  <td className="text-end">
                    {row?.grand_total !== null &&
                    row?.grand_total !== undefined
                      ? `${sym}${fmt(row.grand_total)}`
                      : "-"}
                  </td>
                  <td className="text-end">
                    {row?.balance_receivable !== null &&
                    row?.balance_receivable !== undefined
                      ? `${sym}${fmt(row.balance_receivable)}`
                      : "-"}
                  </td>
                  <td>
                    <span
                      className="badge rounded-pill text-capitalize text-nowrap"
                      ref={(el) => {
                        if (el) {
                          el.style.setProperty(
                            "background-color",
                            `${c}1f`,
                            "important"
                          );
                          el.style.setProperty("color", c, "important");
                        }
                      }}
                    >
                      {(row?.status || "-").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="text-center">
                    <Link
                      to={`${appsRoot}/invoices/view/${row?._id}`}
                      id={`cust-inv-view-${row?._id}`}
                    >
                      <Eye size={18} />
                    </Link>
                    <UncontrolledTooltip
                      placement="top"
                      target={`cust-inv-view-${row?._id}`}
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

export default CustomerInvoicesPanel;
