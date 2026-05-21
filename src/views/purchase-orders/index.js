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
import { getVendorDropdown } from "../vendors/store";
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
  ExternalLink,
  Download,
} from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  PURCHASE_ORDER_STATUS_OPTIONS,
  PURCHASE_ORDER_STATUS_COLOR_MAP as STATUS_COLOR_MAP,
} from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";

const PurchaseOrderView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.purchaseOrder);
  const vendorStore = useSelector((state) => state.vendor);
  const authStore = useSelector((state) => state.auth);
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
      dispatch(getPurchaseOrderList(params));
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
      dispatch(cleanPurchaseOrderMessage(null));
    }
    if (store?.actionFlag === "PO_DLT") handleList();
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDownloadPdf = async (row) => {
    if (!row?._id) return;
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.purchaseOrders.pdf}/${row._id}/pdf`,
        { responseType: "blob" }
      );
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${row?.voucher_no || "purchase-order"}.pdf`;
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
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

  const vendorOptions = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).map((v) => ({
        value: v._id,
        label: v.company_name || v.name,
      })),
    [vendorStore?.vendorDropdown]
  );

  const formatTotal = (row) => {
    const v = row?.grand_total;
    if (v === null || v === undefined || v === "") return "-";
    return `₹ ${Number(v).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const columns = [
    {
      name: t("PO #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "240px",
      grow: 1.8,
      selector: (row) => {
        const c = STATUS_COLOR_MAP[row?.status] || "#6c757d";
        const label = (row?.status || "-").replace(/_/g, " ");
        const refVoucher = row?.pfi_voucher_no || row?.quotation_voucher_no;
        const refTo = row?.pfi_id
          ? `${appsRoot}/pfi/view/${row.pfi_id}`
          : row?.quotation_id
          ? `${appsRoot}/quotations/view/${row.quotation_id}`
          : null;
        return (
          <div className="py-1">
            <Link
              to={`${appsRoot}/purchase-orders/view/${row?._id || ""}`}
              className="text-nowrap d-block"
            >
              {row?.voucher_no || "-"}
            </Link>
            {refVoucher ? (
              <div className="mt-1">
                {refTo ? (
                  <Link
                    to={refTo}
                    className="small text-muted text-nowrap d-inline-flex align-items-center"
                  >
                    PFI - {refVoucher}
                    <ExternalLink size={12} className="ms-1" />
                  </Link>
                ) : (
                  <span className="small text-muted text-nowrap">
                    PFI - {refVoucher}
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
        if (!row?.customer_name && !row?.customer_contact_name) return "-";
        const phone = row?.customer_contact_country_code?.formatted || "";
        return (
          <div className="py-1">
            <span className="fw-bold text-capitalize">
              {row?.customer_name || "-"}
            </span>
            {row?.customer_contact_name && (
              <div className="text-capitalize small">
                {row.customer_contact_name}
              </div>
            )}
            {row?.customer_contact_email && (
              <div className="small text-muted">
                {row.customer_contact_email}
              </div>
            )}
            {phone && <div className="small text-muted">{phone}</div>}
          </div>
        );
      },
    },
    {
      name: t("Created"),
      sortField: "po_date",
      sortable: true,
      minWidth: "130px",
      selector: (row) =>
        row?.po_date ? formatDate(row.po_date) : "-",
    },
    {
      name: t("Expected Date"),
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
      selector: formatTotal,
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
          <h3 className="mb-0">{t("Purchase Orders")}</h3>
        </div>

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
                      options={PURCHASE_ORDER_STATUS_OPTIONS}
                      value={
                        PURCHASE_ORDER_STATUS_OPTIONS.find(
                          (o) => o.value === statusFilter
                        ) || null
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
                    {t("Add PO")} <PlusCircle size={16} />
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
