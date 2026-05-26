// Customer detail page — Purchase Orders list using the shared
// DatatablePagination wrapper, matching the PO/PFI/Quotation listing pages.
//
// Server-paginated, sortable. Vendor column intentionally omitted; the
// PO # cell shows the source PFI (or Quotation) link beneath it, mirroring
// the main PO listing layout.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { UncontrolledTooltip, Badge } from "reactstrap";
import { Eye, ExternalLink } from "react-feather";
import { useTranslation } from "react-i18next";

import DatatablePagination from "@components/datatable/DatatablePagination";

import {
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { PURCHASE_ORDER_STATUS_BADGE_COLOR } from "@constant/options";

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

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("po_date");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage
    ) => {
      if (!id) return;
      dispatch(
        getPurchaseOrderList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search: "",
          customer_id: id,
        })
      );
    },
    [id, dispatch, sort, sortColumn, currentPage, rowsPerPage]
  );

  useEffect(() => {
    handleList();
    return () => {
      dispatch(cleanPurchaseOrderMessage(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleList(sortDirection, column.sortField, 1, rowsPerPage);
  };
  const handlePagination = (page) => {
    setCurrentPage(page + 1);
    handleList(sort, sortColumn, page + 1, rowsPerPage);
  };
  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, value);
  };

  const columns = [
    {
      name: t("PO #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "220px",
      grow: 1.6,
      selector: (row) => {
        const refVoucher = row?.pfi_voucher_no || row?.quotation_voucher_no;
        const refTo = row?.pfi_id
          ? `${appsRoot}/pfi/view/${row.pfi_id}`
          : row?.quotation_id
          ? `${appsRoot}/quotations/view/${row.quotation_id}`
          : null;
        const refLabel = row?.pfi_id ? "PFI" : "Quote";
        return (
          <div className="py-1">
            <Link
              to={`${appsRoot}/purchase-orders/view/${row?._id || ""}`}
              className="text-nowrap d-block"
            >
              {row?.voucher_no || "-"}
            </Link>
            {refVoucher ? (
              <div className="mt-50">
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
          </div>
        );
      },
    },
    {
      name: t("Date"),
      sortField: "po_date",
      sortable: true,
      minWidth: "130px",
      selector: (row) => (row?.po_date ? formatDate(row.po_date) : "-"),
    },
    {
      name: t("Expected"),
      sortField: "expected_delivery_date",
      sortable: true,
      minWidth: "150px",
      selector: (row) =>
        row?.expected_delivery_date
          ? formatDate(row.expected_delivery_date)
          : "-",
    },
    {
      name: t("Total"),
      sortable: false,
      right: true,
      minWidth: "130px",
      selector: (row) => {
        const sym = row?.currency_symbol || row?.currency_code || "";
        return row?.grand_total !== null && row?.grand_total !== undefined
          ? `${sym}${fmt(row.grand_total)}`
          : "-";
      },
    },
    {
      name: t("Status"),
      sortable: false,
      minWidth: "120px",
      selector: (row) => {
        const status = (row?.status || "").toLowerCase();
        const color =
          PURCHASE_ORDER_STATUS_BADGE_COLOR[status] || "secondary";
        // "confirmed" gets the project primary blue with white text — the
        // Vuexy `light-primary` token was rendering as near-black in this
        // table cell.
        if (status === "confirmed") {
          return (
            <Badge
              className="text-capitalize text-white"
              style={{
                background: "#09418b",
                border: "1px solid #09418b",
                fontWeight: 600,
              }}
            >
              {(row?.status || "-").replace(/_/g, " ")}
            </Badge>
          );
        }
        return (
          <Badge
            color={`light-${color}`}
            className={`badge-light-${color} text-capitalize`}
          >
            {(row?.status || "-").replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      name: t("Action"),
      sortable: false,
      center: true,
      minWidth: "80px",
      selector: (row) => (
        <Fragment>
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
        </Fragment>
      ),
    },
  ];

  return (
    <DatatablePagination
      columns={columns}
      data={store?.purchaseOrderItems || []}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      pagination={store?.pagination}
      handleSort={handleSort}
      handleRowPerPage={handlePerPage}
      handlePagination={handlePagination}
    />
  );
};

export default CustomerPosPanel;
