import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  Col,
  Row,
  Card,
  CardBody,
  Input,
  Button,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit, Eye, Trash2, Anchor, Wind } from "react-feather";

import {
  getShippingList,
  deleteShipping,
  cleanShippingMessage,
} from "./store";
import { startLoading, stopLoading } from "../loadingstore";
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  SHIPPING_STATUS_COLOR_MAP as STATUS_COLOR_MAP,
  SHIPPING_STATUS_OPTIONS as STATUS_OPTIONS,
  SHIPPING_MODE_OPTIONS as MODE_OPTIONS,
  SHIPPING_AIR_MODES,
} from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";

const MODE_ICON = (mode) => (SHIPPING_AIR_MODES.includes(mode) ? Wind : Anchor);

const ShippingList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const dispatch = useDispatch();

  const store = useSelector((s) => s.shipping);
  const authUserItem = useSelector((s) => s.auth?.authUserItem);

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter,
      mode = modeFilter,
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
      if (status) params.status = status;
      if (mode) params.mode = mode;
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      dispatch(getShippingList(params));
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      statusFilter,
      modeFilter,
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

  useLayoutEffect(() => {
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
          statusFilter,
          modeFilter,
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
        statusFilter,
        modeFilter,
        dateFrom,
        dateTo
      );
    }
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, statusFilter, modeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanShippingMessage());
    if (store?.actionFlag === "SHP_DLT_SCS") handleList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error, store?.actionFlag]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("Only draft shipments can be deleted."),
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
        if (result.isConfirmed) dispatch(deleteShipping(id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.shipping;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const columns = useMemo(() => {
    return [
      {
        name: t("Shipping #"),
        sortField: "voucher_no",
        sortable: false,
        minWidth: "240px",
        grow: 1.8,
        selector: (row) => {
          const c = STATUS_COLOR_MAP[row?.status] || "#6c757d";
          const label = (row?.status || "-").replace(/_/g, " ");
          const Icon = MODE_ICON(row?.mode);
          return (
            <div className="py-1">
              <Link
                to={`${appsRoot}/shipping/view/${row?._id || ""}`}
                className="text-nowrap d-block"
              >
                {row?.voucher_no || (
                  <span className="text-muted fst-italic">{t("(draft)")}</span>
                )}
              </Link>
              <div className="mt-1 small text-muted text-nowrap d-inline-flex align-items-center">
                <Icon size={12} className="me-25" />
                {(row?.mode || "").replace(/_/g, " ").toUpperCase()}
                {row?.bl_awb_no && <span className="ms-2">· {row.bl_awb_no}</span>}
              </div>
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
        name: t("Consignee / Destination"),
        sortable: false,
        grow: 2,
        selector: (row) => {
          const cs = row?.consignee_snapshot || {};
          return (
            <div className="py-1">
              <span className="fw-bold text-capitalize">
                {cs.company_name || cs.name || row?.consignee_id || "-"}
              </span>
              <div className="small text-muted">
                {row?.country_of_destination || "-"}
              </div>
              <div className="small text-muted">
                {row?.port_of_loading_snapshot?.code || ""}
                {row?.port_of_loading_snapshot?.code && " → "}
                {row?.port_of_discharge_snapshot?.name || "-"}
              </div>
            </div>
          );
        },
      },
      {
        name: t("Dispatch"),
        sortField: "actual_dispatch_date",
        sortable: true,
        minWidth: "130px",
        selector: (row) =>
          row?.actual_dispatch_date
            ? formatDate(row.actual_dispatch_date)
            : row?.etd
            ? `~ ${formatDate(row.etd)}`
            : "-",
      },
      {
        name: t("Arrival"),
        sortField: "actual_arrival_date",
        sortable: true,
        minWidth: "130px",
        selector: (row) =>
          row?.actual_arrival_date
            ? formatDate(row.actual_arrival_date)
            : row?.eta
            ? `~ ${formatDate(row.eta)}`
            : "-",
      },
      {
        name: t("Cost (INR)"),
        sortable: false,
        selector: (row) =>
          row?.total_cost_inr
            ? `₹${Number(row.total_cost_inr).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`
            : "-",
      },
      {
        name: t("Action"),
        center: true,
        cell: (row) => (
          <div className="d-flex column-action align-items-center table-icon">
            <Link
              className="me-50"
              id={`shp-view-${row?._id || ""}`}
              to={`${appsRoot}/shipping/view/${row?._id || ""}`}
            >
              <UncontrolledTooltip placement="top" target={`shp-view-${row?._id || ""}`}>
                {t("View")}
              </UncontrolledTooltip>
              <Eye size={20} />
            </Link>
            {canEdit && row?.status !== "delivered" && row?.status !== "cancelled" && (
              <Link
                className="me-50"
                id={`shp-edit-${row?._id || ""}`}
                to={`${appsRoot}/shipping/edit/${row?._id || ""}`}
              >
                <UncontrolledTooltip placement="top" target={`shp-edit-${row?._id || ""}`}>
                  {t("Edit")}
                </UncontrolledTooltip>
                <Edit size={20} />
              </Link>
            )}
            {canDelete && row?.status === "draft" && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`shp-del-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip placement="top" target={`shp-del-${row?._id || ""}`}>
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, canDelete, t]);

  return (
    <Fragment>
      <div className="main-content shipping">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Shipping")}</h3>
        </div>
        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-shp"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search voucher / BL / SB / container")}
                      onChange={(e) => setSearchInput(e?.target?.value || "")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Status")}
                      options={STATUS_OPTIONS}
                      value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
                      onChange={(opt) => setStatusFilter(opt ? opt.value : "")}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Mode")}
                      options={MODE_OPTIONS}
                      value={MODE_OPTIONS.find((o) => o.value === modeFilter) || null}
                      onChange={(opt) => setModeFilter(opt ? opt.value : "")}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="shp-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="shp-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("To")}
                    />
                  </Col>
                </Row>
              </Col>
              {/* Shipping is Invoice-driven by design — entry point is the
                  "Book Shipping" button on the Invoice detail page (only
                  visible once the Invoice is issued). The add page expects
                  ?invoice=<id> to pre-fill customer / consignee / country. */}
              <Col sm="3" md="3" />
            </Row>

            <Row className="mt-2">
              <Col md="12">
                <DatatablePagination
                  columns={columns}
                  data={store?.shippingItems || []}
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

export default ShippingList;
