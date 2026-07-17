// Vendor's procurement tab. PO is multi-vendor at line level (2026-05-21)
// so a "POs for this vendor" view is really a list of POVs whose
// `vendor_id` matches. The parent PO is shown as a reference link.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Badge, UncontrolledTooltip } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPoVendorList,
  cleanPoVendorMessage,
} from "@src/views/po-vendors/store";
import DatatablePagination from "@components/datatable/DatatablePagination";
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const summarizeQty = (lines = []) => {
  let ordered = 0;
  let dispatched = 0;
  let received = 0;
  for (const l of lines) {
    ordered += num(l.ordered_qty);
    dispatched += num(l.dispatched_qty);
    received += num(l.received_qty);
  }
  return { ordered, dispatched, received };
};

const PurchaseOrdersTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.poVendor);

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
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
        getPoVendorList({
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
      dispatch(cleanPoVendorMessage(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rows = store?.poVendorItems || [];

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
      name: t("POV #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "180px",
      selector: (row) => (
        <Link
          to={`${appsRoot}/po-vendors/view/${row?._id}`}
          className="text-nowrap fw-semibold"
        >
          {row?.voucher_no || "-"}
        </Link>
      ),
    },
    {
      name: t("SO #"),
      sortable: false,
      minWidth: "160px",
      selector: (row) =>
        row?.purchase_order_id ? (
          <Link
            to={`${appsRoot}/purchase-orders/view/${row.purchase_order_id}`}
            className="text-nowrap"
          >
            {row?.purchase_order_voucher_no || "-"}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      name: t("Dispatch"),
      sortField: "dispatch_date",
      sortable: true,
      selector: (row) =>
        row?.dispatch_date ? formatDate(row.dispatch_date) : "-",
    },
    {
      name: t("Arrival"),
      sortable: false,
      selector: (row) => {
        const arrived = row?.actual_arrival_date;
        const expected = row?.expected_arrival_date;
        return arrived
          ? formatDate(arrived)
          : expected
          ? formatDate(expected)
          : "-";
      },
    },
    {
      name: t("Qty Summary"),
      sortable: false,
      minWidth: "200px",
      selector: (row) => {
        const { ordered, dispatched, received } = summarizeQty(row?.lines);
        return (
          <div className="small">
            <div>
              {t("Ordered")}: <b>{ordered.toLocaleString()}</b>
            </div>
            <div>
              {t("Dispatched")}: {dispatched.toLocaleString()}
            </div>
            <div>
              {t("Received")}: {received.toLocaleString()}
            </div>
          </div>
        );
      },
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: true,
      selector: (row) => {
        const status = (row?.status || "").toLowerCase();
        const color = PO_VENDOR_STATUS_BADGE_COLOR[status] || "secondary";
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
            to={`${appsRoot}/po-vendors/view/${row?._id}`}
            id={`vendor-pov-view-${row?._id}`}
          >
            <Eye size={18} />
          </Link>
          <UncontrolledTooltip
            placement="top"
            target={`vendor-pov-view-${row?._id}`}
          >
            {t("Open POV")}
          </UncontrolledTooltip>
        </Fragment>
      ),
    },
  ];

  return (
    <Fragment>
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
