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
  deleteManySalesOrders,
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "./store";
import EntitySearchSelect from "@components/entity-select";
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
import useBulkDelete from "@src/utility/hooks/useBulkDelete";
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
  Upload,
  User,
  Mail,
} from "react-feather";

import { openPdfViewer } from "@src/utility/pdf";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

// ** Import/Export
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportModal from "./components/ImportModal";
import {
  PURCHASE_ORDER_STATUS_OPTIONS,
  PURCHASE_ORDER_STATUS_COLOR_MAP as STATUS_COLOR_MAP,
} from "@constant/options";
import { formatMoney } from "@src/utility/currency";
import { formatDate } from "@src/utility/dateFormat";
import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import StatusPill from "@src/views/_shared/StatusPill";

const PurchaseOrderView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.purchaseOrder);
  const authStore = useSelector((state) => state.auth);
  const creatorCtx = useSelector((state) => state.creatorContext);
  const selectedCreator = creatorCtx?.selectedCreator || "all";
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
      params.created_by = selectedCreator;
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
      selectedCreator,
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
  }, [searchInput, customerFilter, statusFilter, dateFrom, dateTo, selectedCreator]);

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

  // Open the PDF in the in-app viewer (new tab, frontend origin) — fetched via
  // the authed API, shown there, with a correctly-named Download.
  const handleDownloadPdf = (row) => {
    if (!row?._id) return;
    openPdfViewer({
      kind: "purchase_order",
      id: row._id,
      name: row.voucher_no,
    });
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

  // Import / Export
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.purchaseOrders.export, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-orders-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export sales orders"), "warning");
    } finally {
      setExporting(false);
    }
  };
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  // Multi-select bulk delete (server respects the Sales Order delete guard).
  const bulk = useBulkDelete({
    entityLabel: "sales orders",
    deleteFn: (ids) => dispatch(deleteManySalesOrders(ids)).unwrap(),
    onDone: () => handleList(),
  });


  // Recompute from the lines with the same helper the detail page + costing
  // card use, so the listed amount matches them (the stored grand_total
  // carries a 2-decimal rounding drift in foreign currency).
  const formatTotal = (row) => {
    const lines = row?.lines || [];
    const amount = lines.length
      ? computeDocTotals(lines, row?.exchange_rate, {
          excludeGst: true,
          freightTotal: row?.freight_total,
        }).grand_currency
      : row?.grand_total;
    return formatMoney(amount, row?.currency_code);
  };

  const columns = useMemo(() => {
    const cols = [
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
              <div className="d-none d-md-flex align-items-center small text-muted text-break">
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
      name: t("Reference No."),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortable: false,
      minWidth: "140px",
      wrap: true,
      selector: (row) => row?.reference_no || "-",
    },
    {
      name: t("Date"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
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
        return <StatusPill label={label} hex={c} />;
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

    cols.push({
    name: t("Action"),
    center: true,
    minWidth: "170px", // reserve room for the action icons so the last (Delete) isn't clipped on mobile
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
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, canDelete, t]);

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
            created_by: selectedCreator,
          }}
          activeStatuses={statusFilter || ""}
          onStatusClick={(csv) => {
            setStatusFilter((prev) => (prev === csv ? "" : csv));
            setCurrentPage(1);
          }}
        />

        <Card className="overflow-hidden">
          <CardBody>
            <div className="d-flex align-items-center flex-nowrap gap-2">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
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
                    <EntitySearchSelect
                      kind="customer"
                      isClearable
                      placeholder={t("Filter by Customer")}
                      value={customerFilter || null}
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
              </div>
              <div className="d-flex align-items-center justify-content-end gap-1 flex-shrink-0">
                {canDelete && bulk.selectedRows.length > 0 && (
                  <Button
                    color="danger"
                    outline
                    size="sm"
                    className="text-nowrap"
                    onClick={bulk.confirmBulkDelete}
                    disabled={bulk.deleting}
                  >
                    {t("Delete Selected")} ({bulk.selectedRows.length})
                  </Button>
                )}
                <Button
                  color="outline-secondary"
                  size="sm"
                  className="text-nowrap"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {t("Export")} <Download size={14} />
                </Button>
                {canAdd && (
                  <Button
                    color="outline-secondary"
                    size="sm"
                    className="text-nowrap"
                    onClick={() => setImportModalOpen(true)}
                  >
                    {t("Import")} <Upload size={14} />
                  </Button>
                )}
                {canAdd && (
                  <Button
                    color="primary"
                    className="text-nowrap"
                    onClick={() => navigate(`${appsRoot}/purchase-orders/add`)}
                  >
                    {t("Add SO")} <PlusCircle size={16} />
                  </Button>
                )}
              </div>
            </div>

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
                  selectableRows={canDelete}
                  onSelectedRowsChange={bulk.onSelectedRowsChange}
                  clearSelectedRows={bulk.toggleCleared}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      <ImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          setStatsRefreshKey((k) => k + 1);
          handleList();
        }}
      />
    </Fragment>
  );
};

export default PurchaseOrderView;
