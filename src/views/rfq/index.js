// RFQ (Vendor Sourcing) — list page.
// Mirrors the leads/quotation listing: KPI tile strip + server-side
// DataTable pagination + search/status filters + row delete.
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { getRfqList, deleteRfq, cleanRfqMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap
import { Col, Row, Card, Input, Badge, CardBody, UncontrolledTooltip } from "reactstrap";
import Select from "react-select";

// ** Custom
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import VoucherStatsTiles from "@src/views/_shared/voucher-stats/VoucherStatsTiles";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Eye, Trash2 } from "react-feather";
import { formatDate } from "@src/utility/dateFormat";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const RFQ_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "quoting", label: "Quoting" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  quoting: "warning",
  completed: "success",
  cancelled: "danger",
};

// Hex per status — used to force the pill colors via ref so the global
// table-cell color rule can't wash them out (same pattern as the lead list).
const STATUS_HEX = {
  draft: "#6c757d",
  sent: "#0dcaf0",
  quoting: "#d39e00",
  completed: "#198754",
  cancelled: "#dc3545",
};

const RfqList = () => {
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.rfq);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statsRefresh, setStatsRefresh] = useState(0);

  const handleRfqLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getRfqList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, dispatch]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleRfqLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleRfqLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleRfqLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleRfqLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleRfqLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag === "RFQ_DLTD") {
      handleRfqLists();
      setStatsRefresh((n) => n + 1); // re-fetch the KPI tiles after a delete
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanRfqMessage(null));
    }
  }, [store.actionFlag, store.success, store.error]);

  // Drive the global overlay from the slice's (normal-convention) loading
  // flag: ON while a list request is in flight, OFF once it settles. NB:
  // the lead list inverts this because its slice inverts `loading`; ours
  // does not — copying that here would leave the overlay stuck on and
  // leak it into the detail page.
  useEffect(() => {
    if (store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) dispatch(deleteRfq(id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.leads;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const columns = [
    {
      name: t("RFQ No"),
      sortField: "voucher_no",
      sortable: true,
      grow: 2,
      selector: (row) => (
        <div className="py-1">
          <Link
            to={`${appsRoot}/rfq/view/${row?._id || ""}`}
            style={{ textDecoration: "none" }}
          >
            <span
              className="fw-bold"
              ref={(el) => {
                if (el) el.style.setProperty("color", "#09418B", "important");
              }}
            >
              {row?.voucher_no || "-"}
            </span>
          </Link>
          {row?.lead_voucher_no && (
            <div className="d-flex align-items-center flex-wrap mt-25 gap-50">
              <span
                className="badge rounded-pill text-capitalize text-nowrap"
                ref={(el) => {
                  if (el) {
                    el.style.setProperty("background-color", "#09418B", "important");
                    el.style.setProperty("color", "#fff", "important");
                  }
                }}
              >
                {t("Lead")} - {row.lead_voucher_no}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      name: t("Date"),
      hide: "md",
      sortField: "rfq_date",
      sortable: true,
      selector: (row) => {
        if (!row?.rfq_date) return <span className="text-muted">-</span>;
        return formatDate(row.rfq_date);
      },
    },
    {
      name: t("Items"),
      hide: "md",
      center: true,
      selector: (row) => row?.line_count ?? 0,
    },
    {
      name: t("Vendors"),
      center: true,
      selector: (row) => row?.vendor_count ?? 0,
    },
    {
      name: t("Status"),
      sortable: false,
      center: true,
      width: "130px",
      selector: (row) => (
        (() => {
          const c = STATUS_HEX[row?.status] || "#6c757d";
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
              {row?.status || "-"}
            </span>
          );
        })()
      ),
    },
    {
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          <Link
            className="me-50"
            id={`rfq-view-tooltip-${row?._id || ""}`}
            to={`${appsRoot}/rfq/view/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`rfq-view-tooltip-${row?._id || ""}`}
            >
              {t("View")}
            </UncontrolledTooltip>
            <Eye size={20} />
          </Link>
          {canDelete && (
            <>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`rfq-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`rfq-delete-tooltip-${row?._id || ""}`}
              >
                {t("Delete")}
              </UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="main-content rfq">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("RFQ — Vendor Sourcing")}</h3>
        </div>

        <VoucherStatsTiles
          module="rfq"
          refreshKey={statsRefresh}
          filters={{
            status: statusFilter || undefined,
            search: searchInput || undefined,
          }}
          activeStatuses={statusFilter || ""}
          onStatusClick={(csv) => {
            setStatusFilter((prev) => (prev === csv ? "" : csv));
            setCurrentPage(1);
          }}
        />

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-rfq"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search RFQ / Lead No")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={
                        statusFilter && !statusFilter.includes(",")
                          ? RFQ_STATUS_OPTIONS.find(
                              (s) => s.value === statusFilter
                            )
                          : null
                      }
                      onChange={(selected) =>
                        setStatusFilter(selected ? selected.value : "")
                      }
                      options={RFQ_STATUS_OPTIONS}
                      isClearable
                      placeholder={
                        statusFilter && statusFilter.includes(",")
                          ? t("Multiple statuses (tile filter)")
                          : t("Filter by Status")
                      }
                      classNamePrefix="select"
                    />
                  </Col>
                </Row>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="rfq-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.rfqItems || []}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={store?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default RfqList;
