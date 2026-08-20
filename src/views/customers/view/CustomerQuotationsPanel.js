// Customer detail page — Quotations list using the custom ReactPaginate
// pagination (matching the Sales Order detail's vendor-PO/coverage panel).
// Server returns one page (perPage 200); pagination is client-side.

import { Fragment, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, UncontrolledTooltip, Spinner } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getQuotationList,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

// Hex status colors — mirrors the main Quotation listing. Rendered as a
// tinted pill (bg = color@12%, text = color) for reliable contrast.
const QUOTATION_STATUS_HEX = {
  draft: "#6c757d",
  sent: "#0dcaf0",
  approved: "#198754",
  rejected: "#dc3545",
  closed: "#283046",
};

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const CustomerQuotationsPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.quotation);

  useEffect(() => {
    if (id) {
      dispatch(
        getQuotationList({
          orderBy: "quotation_date",
          orderDirection: "desc",
          page: 1,
          perPage: 200,
          search: "",
          customer_id: id,
        })
      );
    }
    return () => {
      dispatch(cleanQuotationMessage(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Filter to THIS customer (the store is shared across customers/pages).
  const rows = (store?.quotationItems || []).filter(
    (r) => String(r?.customer_id || "") === String(id)
  );
  // Inverted-flag convention: `loading === false` means a fetch is in flight.
  const fetching = store?.loading === false;
  const total = rows.length;
  const pg = usePagination(total);
  const pagedRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

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
        {t("No quotations for this customer yet.")}
      </div>
    );
  }

  return (
    <Fragment>
      <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: 200 }}>{t("Quote #")}</th>
              <th style={{ width: 130 }}>{t("Date")}</th>
              <th style={{ width: 140 }}>{t("Valid Until")}</th>
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
              const sym = row?.currency_symbol || row?.currency_code || "";
              const c =
                QUOTATION_STATUS_HEX[(row?.status || "").toLowerCase()] ||
                "#6c757d";
              return (
                <tr key={row?._id}>
                  <td>
                    <Link
                      to={`${appsRoot}/quotations/view/${row?._id || ""}`}
                      className="text-nowrap fw-semibold"
                    >
                      {row?.voucher_no || "-"}
                    </Link>
                  </td>
                  <td>
                    {row?.quotation_date
                      ? formatDate(row.quotation_date)
                      : "-"}
                  </td>
                  <td>
                    {row?.valid_until ? formatDate(row.valid_until) : "-"}
                  </td>
                  <td className="text-end">
                    {row?.grand_total !== null &&
                    row?.grand_total !== undefined
                      ? `${sym}${fmt(row.grand_total)}`
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
                      {row?.status || "-"}
                    </span>
                  </td>
                  <td className="text-center">
                    <Link
                      to={`${appsRoot}/quotations/view/${row?._id}`}
                      id={`cust-qt-view-${row?._id}`}
                    >
                      <Eye size={18} />
                    </Link>
                    <UncontrolledTooltip
                      placement="top"
                      target={`cust-qt-view-${row?._id}`}
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

      <TablePaginationBar
        {...pg}
        totalRows={total}
        className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1"
      />
    </Fragment>
  );
};

export default CustomerQuotationsPanel;
