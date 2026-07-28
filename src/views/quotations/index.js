// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  deleteQuotation,
  deleteManyQuotations,
  getQuotationList,
  cleanQuotationMessage,
} from "./store";
import { getCustomerDropdown } from "../customers/store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap
import {
  Col,
  Row,
  Card,
  Badge,
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
import DateInput from "@components/date-input";
import VoucherStatsTiles from "@src/views/_shared/voucher-stats/VoucherStatsTiles";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Eye, Trash2, PlusCircle, FileText, User, Mail, Phone, Download, Upload } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportModal from "./components/ImportModal";
import { formatMoney } from "@src/utility/currency";
import { formatDate } from "@src/utility/dateFormat";
import { openPdfViewer } from "@src/utility/pdf";

// ** PFI conversion
import { createPfiFromQuotation } from "../pfi/store";
import { PFI_RETIRED } from "@src/configs/appMode";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
} from "@constant/options";

const QuotationView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.quotation);
  const customerStore = useSelector((state) => state.customer);
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

  // Optional URL filter - `?lead_id=<uuid>` scopes the listing to a lead.
  // The lead's display name is passed via router state from the source page
  // (Lead edit "View Quotations" button) so we don't need an extra fetch.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const leadFilter = searchParams.get("lead_id") || "";
  const leadFilterName = location?.state?.leadName || "";

  const clearLeadFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("lead_id");
    setSearchParams(next);
  };

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
      if (leadFilter) params.lead_id = leadFilter;
      params.created_by = selectedCreator;
      dispatch(getQuotationList(params));
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
      leadFilter,
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
  }, [searchInput, customerFilter, statusFilter, dateFrom, dateTo, leadFilter, selectedCreator]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanQuotationMessage(null));
    }
    if (store?.actionFlag === "QT_DLT") handleList();
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

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
        if (result.isConfirmed) dispatch(deleteQuotation(id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.["quotations"];
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;

  // Import / Export
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.quotations.export, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotations-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export quotations"), "warning");
    } finally {
      setExporting(false);
    }
  };
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;
  const bulk = useBulkDelete({
    entityLabel: "quotations",
    deleteFn: (ids) => dispatch(deleteManyQuotations(ids)).unwrap(),
    onDone: () => handleList(),
  });
  const pfiPerms = authUserItem?.role?.permissions?.pfi;
  const canConvertToPfi =
    isSystemAdmin ||
    isCompanyAdmin ||
    pfiPerms?.can_all ||
    pfiPerms?.can_add;

  const customerOptions = useMemo(
    () =>
      (customerStore?.customerDropdown || []).map((c) => ({
        value: c._id,
        label: c.company_name,
      })),
    [customerStore?.customerDropdown]
  );

  // Match the detail page: customer total rounded to a whole unit, shown 2 dp.
  const formatTotal = (row) =>
    formatMoney(
      Math.round(Number(row?.grand_total) || 0),
      row?.currency_code
    );

  const columns = [
    {
      name: t("Quote #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "200px",
      grow: 1.5,
      selector: (row) => (
        <div className="py-1">
          <Link
            to={`${appsRoot}/quotations/view/${row?._id || ""}`}
            style={{ textDecoration: "none" }}
          >
            <span
              className="fw-bold text-nowrap"
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
      name: t("Company"),
      sortable: false,
      grow: 2,
      selector: (row) => {
        const phone =
          row?.customer_contact_country_code?.formatted ||
          (row?.customer_contact_country_code?.dial_code &&
          row?.customer_contact_phone
            ? `${row.customer_contact_country_code.dial_code} ${row.customer_contact_phone}`
            : row?.customer_contact_phone) ||
          "";
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
              <div className="d-none d-md-flex align-items-center small text-muted text-break mb-25">
                <Mail size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.customer_contact_email}
                </span>
              </div>
            )}
            {phone && (
              <div className="d-none d-md-flex align-items-center small text-muted text-break">
                <Phone size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>{phone}</span>
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
      selector: (row) => row?.reference_no || "-",
    },
    {
      name: t("Date"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortField: "quotation_date",
      sortable: true,
      selector: (row) => (row?.quotation_date ? formatDate(row.quotation_date) : "-"),
    },
    {
      name: t("Total"),
      sortable: false,
      selector: formatTotal,
    },
    {
      name: t("Status"),
      center: true,
      sortable: false,
      selector: (row) => {
        const colorMap = {
          draft: "#6c757d",
          sent: "#0dcaf0",
          approved: "#198754",
          rejected: "#dc3545",
        };
        const c = colorMap[row?.status] || "#6c757d";
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
      },
    },
  ];

  // Convert to PFI flow - only available on approved quotations.
  const handleConvertToPfi = (id) => {
    mySwal
      .fire({
        title: t("Convert to PFI?"),
        text: t(
          "A new PFI will be created from this quotation with all line items, expenses and rebates copied over."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, convert"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(createPfiFromQuotation(id))
          .unwrap()
          .then((res) => {
            const newId = res?.pfiItem?._id;
            Notification(
              "Success",
              res?.success || t("PFI created"),
              "success"
            );
            if (newId) navigate(`${appsRoot}/pfi/edit/${newId}`);
          })
          .catch((err) =>
            Notification("Error", err || t("Conversion failed"), "warning")
          );
      });
  };

  if (canEdit || canDelete) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        const isApproved = row?.status === "approved";
        return (
          <div className="d-flex column-action align-items-center table-icon">
            <Link
              className="me-50"
              id={`qt-view-${row?._id || ""}`}
              to={`${appsRoot}/quotations/view/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`qt-view-${row?._id || ""}`}
              >
                {t("View")}
              </UncontrolledTooltip>
              <Eye size={20} />
            </Link>
            <span
              className="me-50 cursor-pointer"
              id={`qt-download-${row?._id || ""}`}
              onClick={() =>
                openPdfViewer({
                  kind: "quotation",
                  id: row?._id,
                  name: row?.voucher_no,
                })
              }
            >
              <UncontrolledTooltip
                placement="top"
                target={`qt-download-${row?._id || ""}`}
              >
                {t("Download PDF")}
              </UncontrolledTooltip>
              <Download size={20} />
            </span>
            {canEdit && (
              <Link
                className="me-50"
                id={`qt-edit-${row?._id || ""}`}
                to={`${appsRoot}/quotations/edit/${row?._id || ""}`}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`qt-edit-${row?._id || ""}`}
                >
                  {t("Edit")}
                </UncontrolledTooltip>
                <Edit size={20} />
              </Link>
            )}
            {!PFI_RETIRED && isApproved && canConvertToPfi && (
              <>
                <FileText
                  size={20}
                  className="cursor-pointer text-success me-50"
                  id={`qt-pfi-${row?._id || ""}`}
                  onClick={() => handleConvertToPfi(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`qt-pfi-${row?._id || ""}`}
                >
                  {t("Convert to PFI")}
                </UncontrolledTooltip>
              </>
            )}
            {canDelete && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`qt-delete-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`qt-delete-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        );
      },
    });
  }

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content quotation">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Quotations")}</h3>
        </div>

        <VoucherStatsTiles
          module="quotation"
          filters={{
            customer_id: customerFilter || undefined,
            lead_id: leadFilter || undefined,
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

        {leadFilter && (
          <div className="alert alert-info d-flex justify-content-between align-items-center mb-2">
            <div>
              {t("Filtered to lead")}
              {leadFilterName ? (
                <>
                  : <strong>{leadFilterName}</strong>
                </>
              ) : (
                ""
              )}
            </div>
            <Button
              size="sm"
              color="info"
              outline
              type="button"
              onClick={clearLeadFilter}
            >
              {t("Clear filter")}
            </Button>
          </div>
        )}

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="8" md="8">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-qt"
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
                        customerOptions.find((o) => o.value === customerFilter) ||
                        null
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
                      options={QUOTATION_STATUS_OPTIONS}
                      value={
                        statusFilter && !statusFilter.includes(",")
                          ? QUOTATION_STATUS_OPTIONS.find(
                              (o) => o.value === statusFilter
                            )
                          : null
                      }
                      onChange={(opt) => setStatusFilter(opt ? opt.value : "")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="qt-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="qt-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("To")}
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="4" md="4">
                <div className="d-flex gap-1 justify-content-end flex-nowrap listing-toolbar-actions">
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
                      onClick={() => navigate(`${appsRoot}/quotations/add`)}
                    >
                      {t("Add Quotation")} <PlusCircle size={16} />
                    </Button>
                  )}
                </div>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="quotation-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.quotationItems || []}
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
          handleList();
        }}
      />
    </Fragment>
  );
};

export default QuotationView;
