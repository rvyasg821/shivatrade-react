// PO Vendor (POV) listing page. POVs are created from PO detail page —
// no "Add" button here.

import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import {
  deletePoVendor,
  getPoVendorList,
  cleanPoVendorMessage,
  cancelPoVendor,
} from "./store";
import { getVendorDropdown } from "../vendors/store";
import { startLoading, stopLoading } from "../loadingstore";

import {
  Col,
  Row,
  Card,
  Input,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { formatDate } from "@src/utility/dateFormat";

import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { Eye, Trash2, X, ExternalLink } from "react-feather";

import { appsRoot, defaultPerPageRow, isAdminUser } from "@constant/defaultValues";
import {
  PO_VENDOR_STATUS_OPTIONS,
  PO_VENDOR_STATUS_COLOR_MAP,
} from "@constant/options";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const PoVendorView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((s) => s.poVendor);
  const vendorStore = useSelector((s) => s.vendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      vendorId = vendorFilter,
      status = statusFilter,
      from = dateFrom,
      to = dateTo
    ) => {
      const params = {
        orderBy: sortCol,
        orderDirection: sorting,
        page,
        perPage,
        search,
      };
      if (vendorId) params.vendor_id = vendorId;
      if (status) params.status = status;
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      dispatch(getPoVendorList(params));
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      vendorFilter,
      statusFilter,
      dateFrom,
      dateTo,
      dispatch,
    ]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleList(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleList(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useLayoutEffect(() => {
    dispatch(getVendorDropdown());
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleList(
          sort,
          sortColumn,
          1,
          rowsPerPage,
          searchInput,
          vendorFilter,
          statusFilter,
          dateFrom,
          dateTo
        );
      }, 500);
    } else {
      handleList(
        sort,
        sortColumn,
        1,
        rowsPerPage,
        searchInput,
        vendorFilter,
        statusFilter,
        dateFrom,
        dateTo
      );
    }
    return () => clearTimeout(handler);
  }, [searchInput, vendorFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanPoVendorMessage(null));
    }
    if (
      store?.actionFlag === "POV_DLT" ||
      store?.actionFlag === "POV_CANCELLED"
    ) {
      handleList();
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("Only draft POVs can be deleted. This cannot be undone."),
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
        if (result.isConfirmed) dispatch(deletePoVendor(id));
      });
  };

  const handleCancel = (row) => {
    mySwal
      .fire({
        title: t("Cancel this POV?"),
        text: t(
          "Its ordered quantities will be released back to PO pending and can be re-issued on a new POV."
        ),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, cancel POV"),
        cancelButtonText: t("Keep open"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(cancelPoVendor({ id: row?._id, reason: result.value }));
        }
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;
  const canDelete = isAdmin || perms?.can_all || perms?.can_delete;

  const vendorOptions = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).map((v) => {
        const name = v.company_name || v.name || "";
        return {
          value: v._id,
          label: v.vendor_code ? `${v.vendor_code} - ${name}` : name,
        };
      }),
    [vendorStore?.vendorDropdown]
  );

  const renderQtyProgress = (row) => {
    const lines = row?.lines || [];
    if (!lines.length) return "-";
    const ordered = lines.reduce((s, l) => s + num(l.ordered_qty), 0);
    const received = lines.reduce((s, l) => s + num(l.received_qty), 0);
    const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
    return (
      <div className="text-nowrap">
        <span className="fw-bold">{received.toLocaleString()}</span>
        <span className="text-muted"> / {ordered.toLocaleString()}</span>
        <div className="small text-muted">{pct}%</div>
      </div>
    );
  };

  const columns = [
    {
      name: t("POV #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "240px",
      grow: 1.8,
      selector: (row) => {
        const c = PO_VENDOR_STATUS_COLOR_MAP[row?.status] || "#6c757d";
        const label = (row?.status || "-").replace(/_/g, " ");
        return (
          <div className="py-1">
            <Link
              to={`${appsRoot}/po-vendors/view/${row?._id || ""}`}
              className="text-nowrap d-block"
            >
              {row?.voucher_no || "-"}
            </Link>
            {row?.purchase_order_voucher_no ? (
              <div className="mt-1">
                {row?.purchase_order_id ? (
                  <Link
                    to={`${appsRoot}/purchase-orders/view/${row.purchase_order_id}`}
                    className="small text-muted text-nowrap d-inline-flex align-items-center"
                  >
                    PO - {row.purchase_order_voucher_no}
                    <ExternalLink size={12} className="ms-1" />
                  </Link>
                ) : (
                  <span className="small text-muted text-nowrap">
                    PO - {row.purchase_order_voucher_no}
                  </span>
                )}
              </div>
            ) : null}
            <div>
              <span
                className="badge text-capitalize mt-1 d-inline-block"
                style={{
                  background: `${c}1a`,
                  color: c,
                  border: `1px solid ${c}33`,
                  fontWeight: 600,
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      name: t("Vendor"),
      sortable: false,
      grow: 2,
      selector: (row) => (
        <div className="py-1">
          {row?.vendor_id ? (
            <Link
              to={`${appsRoot}/vendors/view/${row.vendor_id}`}
              className="fw-bold text-capitalize"
            >
              {row?.vendor_name || "-"}
            </Link>
          ) : (
            <span className="fw-bold text-capitalize">
              {row?.vendor_name || "-"}
            </span>
          )}
          {row?.vendor_contact_name && (
            <div className="text-capitalize small">
              {row.vendor_contact_name}
            </div>
          )}
          {row?.vendor_contact_email && (
            <div className="small text-muted">{row.vendor_contact_email}</div>
          )}
          {row?.vendor_contact_phone && (
            <div className="small text-muted">{row.vendor_contact_phone}</div>
          )}
        </div>
      ),
    },
    {
      name: t("Date"),
      sortField: "dispatch_date",
      sortable: true,
      minWidth: "200px",
      selector: (row) => (
        <div className="py-1">
          <div className="text-nowrap">
            <span className="text-muted me-50">{t("Dispatch")} -</span>
            {row?.dispatch_date ? formatDate(row.dispatch_date) : "-"}
          </div>
          <div className="small text-nowrap mt-25">
            <span className="text-muted me-50">{t("Expected Arrival")} -</span>
            {row?.expected_arrival_date
              ? formatDate(row.expected_arrival_date)
              : ""}
          </div>
        </div>
      ),
    },
    {
      name: t("Qty (recv / ord)"),
      sortable: false,
      selector: renderQtyProgress,
    },
    {
      name: t("Action"),
      center: true,
      cell: (row) => {
        const status = (row?.status || "").toLowerCase();
        const canRowCancel =
          (status === "draft" || status === "dispatched") && canEdit;
        const canRowDelete = status === "draft" && canDelete;
        return (
          <div className="d-flex column-action align-items-center table-icon">
            <Link
              className="me-50"
              id={`pov-view-${row?._id || ""}`}
              to={`${appsRoot}/po-vendors/view/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`pov-view-${row?._id || ""}`}
              >
                {t("View")}
              </UncontrolledTooltip>
              <Eye size={20} />
            </Link>
            {canRowCancel && (
              <>
                <X
                  size={20}
                  className="cursor-pointer me-50 text-warning"
                  id={`pov-cancel-${row?._id || ""}`}
                  onClick={() => handleCancel(row)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`pov-cancel-${row?._id || ""}`}
                >
                  {t("Cancel")}
                </UncontrolledTooltip>
              </>
            )}
            {canRowDelete && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer text-danger"
                  id={`pov-delete-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`pov-delete-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content po-vendor">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Purchase Order Vendors")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="12" md="12">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-pov"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search voucher / LR / e-way")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Filter by Vendor")}
                      options={vendorOptions}
                      value={
                        vendorOptions.find((o) => o.value === vendorFilter) ||
                        null
                      }
                      onChange={(opt) =>
                        setVendorFilter(opt ? opt.value : "")
                      }
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Status")}
                      options={PO_VENDOR_STATUS_OPTIONS}
                      value={
                        PO_VENDOR_STATUS_OPTIONS.find(
                          (o) => o.value === statusFilter
                        ) || null
                      }
                      onChange={(opt) =>
                        setStatusFilter(opt ? opt.value : "")
                      }
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="pov-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("Dispatch From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="pov-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("Dispatch To")}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="pov-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.poVendorItems || []}
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

export default PoVendorView;
