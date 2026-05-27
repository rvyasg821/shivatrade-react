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

import {
  Edit,
  Eye,
  Trash2,
  PlusCircle,
  ExternalLink,
} from "react-feather";

import {
  getInvoiceList,
  deleteInvoice,
  cleanInvoiceMessage,
} from "./store";
import { startLoading, stopLoading } from "../loadingstore";
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  INVOICE_STATUS_COLOR_MAP as STATUS_COLOR_MAP,
  INVOICE_STATUS_OPTIONS as STATUS_OPTIONS,
} from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";
import { formatMoney } from "@src/utility/currency";

const InvoicesList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const dispatch = useDispatch();

  const store = useSelector((s) => s.invoice);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── List fetcher ────────────────────────────────────────────────────

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
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
      if (status) params.status = status;
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      dispatch(getInvoiceList(params));
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
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
        dateFrom,
        dateTo
      );
    }
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanInvoiceMessage());
    if (store?.actionFlag === "INV_DLT_SCS") handleList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error, store?.actionFlag]);

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
        if (result.isConfirmed) dispatch(deleteInvoice(id));
      });
  };

  // ── Permissions ─────────────────────────────────────────────────────

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.invoices;
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  // ── Columns ─────────────────────────────────────────────────────────

  const formatTotal = (row) => formatMoney(row?.grand_total, row?.currency_code);
  const formatBalance = (row) =>
    formatMoney(row?.balance_receivable, row?.currency_code);

  const columns = useMemo(() => {
    const cols = [
      {
        name: t("Invoice #"),
        sortField: "voucher_no",
        sortable: false,
        minWidth: "240px",
        grow: 1.8,
        selector: (row) => {
          const c = STATUS_COLOR_MAP[row?.status] || "#6c757d";
          const label = (row?.status || "-").replace(/_/g, " ");
          const refVoucher =
            row?.purchase_order_voucher_no || row?.pfi_voucher_no;
          const refTo = row?.purchase_order_id
            ? `${appsRoot}/purchase-orders/view/${row.purchase_order_id}`
            : row?.pfi_id
            ? `${appsRoot}/pfi/view/${row.pfi_id}`
            : null;
          return (
            <div className="py-1">
              <Link
                to={`${appsRoot}/invoices/view/${row?._id || ""}`}
                className="text-nowrap d-block"
              >
                {row?.voucher_no || (
                  <span className="text-muted fst-italic">{t("(draft)")}</span>
                )}
              </Link>
              {refVoucher ? (
                <div className="mt-1">
                  {refTo ? (
                    <Link
                      to={refTo}
                      className="small text-muted text-nowrap d-inline-flex align-items-center"
                    >
                      PO - {refVoucher}
                      <ExternalLink size={12} className="ms-1" />
                    </Link>
                  ) : (
                    <span className="small text-muted text-nowrap">
                      PO - {refVoucher}
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
        name: t("Customer"),
        sortable: false,
        grow: 2,
        selector: (row) => {
          if (!row?.customer_name && !row?.customer_snapshot?.name) return "-";
          const cs = row?.customer_snapshot || {};
          return (
            <div className="py-1">
              <span className="fw-bold text-capitalize">
                {row?.customer_name || cs.name || "-"}
              </span>
              {cs.contact_name && (
                <div className="text-capitalize small">{cs.contact_name}</div>
              )}
              {cs.email && (
                <div className="small text-muted">{cs.email}</div>
              )}
            </div>
          );
        },
      },
      {
        name: t("Date"),
        sortField: "invoice_date",
        sortable: true,
        minWidth: "130px",
        selector: (row) =>
          row?.invoice_date ? formatDate(row.invoice_date) : "-",
      },
      {
        name: t("Amount"),
        sortable: false,
        selector: formatTotal,
      },
      {
        name: t("Balance"),
        sortable: false,
        selector: (row) => {
          const bal = Number(row?.balance_receivable || 0);
          return (
            <span
              className={
                bal > 0 ? "text-warning fw-semibold" : "text-muted"
              }
            >
              {formatBalance(row)}
            </span>
          );
        },
      },
      {
        name: t("Action"),
        center: true,
        cell: (row) => (
          <div className="d-flex column-action align-items-center table-icon">
            <Link
              className="me-50"
              id={`inv-view-${row?._id || ""}`}
              to={`${appsRoot}/invoices/view/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`inv-view-${row?._id || ""}`}
              >
                {t("View")}
              </UncontrolledTooltip>
              <Eye size={20} />
            </Link>
            {canEdit && row?.status === "draft" && (
              <Link
                className="me-50"
                id={`inv-edit-${row?._id || ""}`}
                to={`${appsRoot}/invoices/edit/${row?._id || ""}`}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`inv-edit-${row?._id || ""}`}
                >
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
                  id={`inv-delete-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`inv-delete-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        ),
      },
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, canDelete, t]);

  return (
    <Fragment>
      <div className="main-content invoices">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Invoices")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-invoice"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search voucher / PO #")}
                      onChange={(e) => setSearchInput(e?.target?.value || "")}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Status")}
                      options={STATUS_OPTIONS}
                      value={
                        STATUS_OPTIONS.find(
                          (o) => o.value === statusFilter
                        ) || null
                      }
                      onChange={(opt) => setStatusFilter(opt ? opt.value : "")}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <DateInput
                      id="inv-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("From")}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <DateInput
                      id="inv-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("To")}
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="3" md="3" className="text-end">
                {canAdd && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/invoices/add`)}
                  >
                    {t("Add Invoice")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="invoices-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.invoiceItems || []}
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

export default InvoicesList;
