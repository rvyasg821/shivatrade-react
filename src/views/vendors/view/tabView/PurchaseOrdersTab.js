// Vendor's purchase orders tab. Reuses /admin/purchase-order/list with
// vendor_id filter — server-side pagination + sort identical to the
// PO listing page.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Badge, UncontrolledTooltip } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import DatatablePagination from "@components/datatable/DatatablePagination";
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

const PurchaseOrdersTab = () => {
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
          vendor_id: id,
        })
      );
    },
    [id, sort, sortColumn, currentPage, rowsPerPage, dispatch]
  );

  useEffect(() => {
    handleList();
    return () => {
      dispatch(cleanPurchaseOrderMessage(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rows = store?.purchaseOrderItems || [];

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleList(sortDirection, column.sortField, 1, rowsPerPage);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      minWidth: "160px",
      selector: (row) => (
        <Link
          to={`${appsRoot}/purchase-orders/view/${row?._id}`}
          className="text-nowrap"
        >
          {row?.voucher_no || "-"}
        </Link>
      ),
    },
    {
      name: t("Created"),
      sortField: "po_date",
      sortable: true,
      selector: (row) => (row?.po_date ? formatDate(row.po_date) : "-"),
    },
    {
      name: t("Expected"),
      sortField: "expected_delivery_date",
      sortable: true,
      selector: (row) =>
        row?.expected_delivery_date
          ? formatDate(row.expected_delivery_date)
          : "-",
    },
    {
      name: t("Total"),
      sortField: "grand_total",
      sortable: true,
      right: true,
      selector: (row) => {
        const sym = row?.currency_symbol || row?.currency_code || "₹";
        return row?.grand_total !== null && row?.grand_total !== undefined
          ? `${sym} ${fmt(row.grand_total)}`
          : "-";
      },
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: true,
      selector: (row) => {
        const status = (row?.status || "").toLowerCase();
        const color =
          PURCHASE_ORDER_STATUS_BADGE_COLOR[status] || "secondary";
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
      center: true,
      sortable: false,
      selector: (row) => (
        <Fragment>
          <Link
            to={`${appsRoot}/purchase-orders/view/${row?._id}`}
            id={`vendor-po-view-${row?._id}`}
          >
            <Eye size={18} />
          </Link>
          <UncontrolledTooltip
            placement="top"
            target={`vendor-po-view-${row?._id}`}
          >
            {t("View")}
          </UncontrolledTooltip>
        </Fragment>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">{t("Purchase Orders")}</h4>
      </div>

      <DatatablePagination
        columns={columns}
        data={rows}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        pagination={store?.pagination}
        handleSort={handleSort}
        handleRowPerPage={handlePerPage}
        handlePagination={handlePagination}
      />
    </Fragment>
  );
};

export default PurchaseOrdersTab;
