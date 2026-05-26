// Customer detail page — Quotations list using the shared
// DatatablePagination wrapper, matching the main Quotation listing page.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { UncontrolledTooltip, Badge } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import DatatablePagination from "@components/datatable/DatatablePagination";

import {
  getQuotationList,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { QUOTATION_STATUS_BADGE_COLOR } from "@constant/options";

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

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("quotation_date");
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
        getQuotationList({
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
      dispatch(cleanQuotationMessage(null));
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
      name: t("Quote #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "200px",
      grow: 1.4,
      selector: (row) => (
        <Link
          to={`${appsRoot}/quotations/view/${row?._id || ""}`}
          className="text-nowrap"
        >
          {row?.voucher_no || "-"}
        </Link>
      ),
    },
    {
      name: t("Date"),
      sortField: "quotation_date",
      sortable: true,
      minWidth: "130px",
      selector: (row) =>
        row?.quotation_date ? formatDate(row.quotation_date) : "-",
    },
    {
      name: t("Valid Until"),
      sortField: "valid_until",
      sortable: true,
      minWidth: "140px",
      selector: (row) =>
        row?.valid_until ? formatDate(row.valid_until) : "-",
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
        const color = QUOTATION_STATUS_BADGE_COLOR[status] || "secondary";
        return (
          <Badge
            color={`light-${color}`}
            className={`badge-light-${color} text-capitalize`}
          >
            {row?.status || "-"}
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
        </Fragment>
      ),
    },
  ];

  return (
    <DatatablePagination
      columns={columns}
      data={store?.quotationItems || []}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      pagination={store?.pagination}
      handleSort={handleSort}
      handleRowPerPage={handlePerPage}
      handlePagination={handlePagination}
    />
  );
};

export default CustomerQuotationsPanel;
