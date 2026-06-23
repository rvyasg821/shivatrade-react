// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  deletePurchaseOrder,
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "./store";
import { getCustomerDropdown } from "../customers/store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap
import {
  Col,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

// ** Custom
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import VoucherStatsTiles from "@src/views/_shared/voucher-stats/VoucherStatsTiles";
import DateInput from "@components/date-input";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import {
  Edit,
  Eye,
  Trash2,
  PlusCircle,
  Download,
  User,
  Mail,
} from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  PURCHASE_ORDER_STATUS_OPTIONS,
  PURCHASE_ORDER_STATUS_COLOR_MAP as STATUS_COLOR_MAP,
} from "@constant/options";
import { formatMoney } from "@src/utility/currency";
import { formatDate } from "@src/utility/dateFormat";
import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";

const PurchaseOrderView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.purchaseOrder);
  const customerStore = useSelector((state) => state.customer);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      customerId = customerFilter,
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
      if (customerId) params.customer_id = customerId;
      if (status) params.status = status;
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      dispatch(getPurchaseOrderList(params));
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      customerFilter,
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
    dispatch(getCustomerDropdown());
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
          customerFilter,
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
        customerFilter,
        statusFilter,
        dateFrom,
        dateTo
      );
    }
    return () => clearTimeout(handler);
  }, [searchInput, customerFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanPurchaseOrderMessage(null));
    }
    if (store?.actionFlag === "PO_DLT") {
      handleList();
      // KPI tiles fetch separately — force a re-fetch so counts drop the
      // deleted Sales Order.
      setStatsRefreshKey((k) => k + 1);
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  // Open the PDF inline in a new tab (proper name) via a short-lived ticket on
  // the no-auth public route — a blob tab is named by its UUID.
  const handleDownloadPdf = async (row) => {
    if (!row?._id) return;
    const win = window.open("", "_blank"); // sync open → not popup-blocked
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.purchaseOrders.pdf}/${row._id}/pdf-ticket`
      );
      const ticket = resp?.data?.data?.ticket;
      if (!ticket) throw new Error("no ticket");
      const url = `${instance.defaults.baseURL}${
        API_ENDPOINTS.purchaseOrders.ticketPdf
      }?t=${encodeURIComponent(ticket)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      if (win) win.close();
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    }
  };

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
        if (result.isConfirmed) dispatch(deletePurchaseOrder(id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.["purchase-orders"];
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const customerOptions = useMemo(
    () =>
      (customerStore?.customerDropdown || []).map((c) => ({
        value: c._id,
        label: c.company_name || c.name,
      })),
    [customerStore?.customerDropdown]
  );

  // Recompute from the lines with the same helper the detail page + costing
  // card use, so the listed amount matches them (the stored grand_total
  // carries a 2-decimal rounding drift in foreign currency).
  const formatTotal = (row) => {
    const lines = row?.lines || [];
    const amount = lines.length
      ? computeDocTotals(lines, row?.exchange_rate, { excludeGst: true })
          .grand_currency
      : row?.grand_total;
    return formatMoney(amount, row?.currency_code);
  };

  const columns = [
    {
      name: t("SO #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "210px",
      grow: 1.5,
      wrap: true,
      selector: (row) => {
        const refVoucher = row?.quotation_voucher_no || row?.pfi_voucher_no;
        const refTo = row?.quotation_id
          ? `${appsRoot}/quotations/view/${row.quotation_id}`
          : null;
        const refPill = (
          <span
            className="badge rounded-pill text-nowrap"
            ref={(el) => {
              if (el) {
                el.style.setProperty("background-color", "#09418B", "important");
                el.style.setProperty("color", "#fff", "important");
              }
            }}
          >
            {t("Quotation")} - {refVoucher}
          </span>
        );
        return (
          <div className="py-1">
            <Link
              to={`${appsRoot}/purchase-orders/view/${row?._id || ""}`}
              style={{ textDecoration: "none" }}
            >
              <span
                className="fw-bold text-nowrap"
                ref={(el) => {
                  if (el)
                    el.style.setProperty("color", "#09418B", "important");
                }}
              >
                {row?.voucher_no || "-"}
              </span>
            </Link>
            {refVoucher ? (
              <div className="mt-25">
                {refTo ? (
                  <Link to={refTo} style={{ textDecoration: "none" }}>
                    {refPill}
                  </Link>
                ) : (
                  refPill
                )}
              </div>
            ) : null}
            {row?.customer_po_number ? (
              <div className="small text-muted mt-25">
                {t("Buyer PO")}: {row.customer_po_number}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      name: t("Customer"),
      sortable: false,
      grow: 1.8,
      wrap: true,
      selector: (row) => {
        if (!row?.customer_name && !row?.customer_contact_name)
          return <span className="text-muted">-</span>;
        return (
          <div className="py-75" style={{ minWidth: 0 }}>
            <div className="fw-bold text-capitalize text-break">
              {row?.customer_name || "-"}
            </div>
            {row?.customer_contact_name && (
              <div className="d-flex align-items-center text-capitalize text-break mt-25 mb-25">
                <User size={13} className="text-muted me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.customer_contact_name}
                </span>
              </div>
            )}
            {row?.customer_contact_email && (
              <div className="d-flex align-items-center small text-muted text-break">
                <Mail size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.customer_contact_email}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      name: t("Date"),
      sortField: "po_date",
      sortable: false,
      minWidth: "120px",
      selector: (row) => (row?.po_date ? formatDate(row.po_date) : "-"),
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      center: true,
      minWidth: "130px",
      selector: (row) => {
        const c = STATUS_COLOR_MAP[row?.status] || "#6c757d";
        const label =
          PURCHASE_ORDER_STATUS_OPTIONS.find((o) => o.value === row?.status)
            ?.label || (row?.status || "-").replace(/_/g, " ");
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
            {label}
          </span>
        );
      },
    },
    {
      name: t("Amount"),
      sortable: false,
      right: true,
      minWidth: "140px",
      cell: (row) => (
        <div className="py-1 text-end">
          <div className="fw-bold">{formatTotal(row)}</div>
          {Number(row?.advance_amount) > 0 && (
            <div className="small text-muted text-nowrap">
              {t("Adv")}: {formatMoney(row.advance_amount, row?.currency_code)}
            </div>
          )}
        </div>
      ),
    },
  ];

  columns.push({
    name: t("Action"),
    center: true,
    cell: (row) => (
      <div className="d-flex column-action align-items-center table-icon">
        <Link
          className="me-50"
          id={`po-view-${row?._id || ""}`}
          to={`${appsRoot}/purchase-orders/view/${row?._id || ""}`}
        >
          <UncontrolledTooltip
            placement="top"
            target={`po-view-${row?._id || ""}`}
          >
            {t("View")}
          </UncontrolledTooltip>
          <Eye size={20} />
        </Link>
        {canEdit && (
          <Link
            className="me-50"
            id={`po-edit-${row?._id || ""}`}
            to={`${appsRoot}/purchase-orders/edit/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`po-edit-${row?._id || ""}`}
            >
              {t("Edit")}
            </UncontrolledTooltip>
            <Edit size={20} />
          </Link>
        )}
        <Download
          size={20}
          className="cursor-pointer me-50"
          id={`po-pdf-${row?._id || ""}`}
          onClick={() => handleDownloadPdf(row)}
        />
        <UncontrolledTooltip
          placement="top"
          target={`po-pdf-${row?._id || ""}`}
        >
          {t("Download PDF")}
        </UncontrolledTooltip>
        {canDelete && (
          <>
            <Trash2
              size={20}
              className="cursor-pointer"
              id={`po-delete-${row?._id || ""}`}
              onClick={() => handleDelete(row?._id)}
            />
            <UncontrolledTooltip
              placement="top"
              target={`po-delete-${row?._id || ""}`}
            >
              {t("Delete")}
            </UncontrolledTooltip>
          </>
        )}
      </div>
    ),
  });

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content purchase-orders">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Sales Orders")}</h3>
        </div>

        <VoucherStatsTiles
          module="po"
          refreshKey={statsRefreshKey}
          filters={{
            customer_id: customerFilter || undefined,
            status: statusFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
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
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-po"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search voucher / notes")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Filter by Customer")}
                      options={customerOptions}
                      value={
                        customerOptions.find(
                          (o) => o.value === customerFilter
                        ) || null
                      }
                      onChange={(opt) =>
                        setCustomerFilter(opt ? opt.value : "")
                      }
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={
                        statusFilter && statusFilter.includes(",")
                          ? t("Multiple statuses (tile filter)")
                          : t("Status")
                      }
                      options={PURCHASE_ORDER_STATUS_OPTIONS}
                      value={
                        statusFilter && !statusFilter.includes(",")
                          ? PURCHASE_ORDER_STATUS_OPTIONS.find(
                              (o) => o.value === statusFilter
                            )
                          : null
                      }
                      onChange={(opt) => setStatusFilter(opt ? opt.value : "")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="po-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="po-date-to"
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
                    onClick={() => navigate(`${appsRoot}/purchase-orders/add`)}
                  >
                    {t("Add SO")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="purchase-orders-tables">
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
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default PurchaseOrderView;
