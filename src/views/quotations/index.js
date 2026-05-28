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
import DateInput from "@components/date-input";
import VoucherStatsTiles from "@src/views/_shared/voucher-stats/VoucherStatsTiles";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Eye, Trash2, PlusCircle, FileText } from "react-feather";
import { formatMoney } from "@src/utility/currency";
import { formatDate } from "@src/utility/dateFormat";

// ** PFI conversion
import { createPfiFromQuotation } from "../pfi/store";

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
  }, [searchInput, customerFilter, statusFilter, dateFrom, dateTo, leadFilter]);

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
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;
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

  const formatTotal = (row) => formatMoney(row?.grand_total, row?.currency_code);

  const columns = [
    {
      name: t("Quote #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "200px",
      grow: 1.5,
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
      name: t("Date"),
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
            className="text-capitalize text-nowrap fw-bold"
            ref={(el) => {
              if (el) el.style.setProperty("color", c, "important");
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
            {isApproved && canConvertToPfi && (
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
              <Col sm="9" md="9">
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
              <Col sm="3" md="3" className="text-end">
                {canAdd && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/quotations/add`)}
                  >
                    {t("Add Quotation")} <PlusCircle size={16} />
                  </Button>
                )}
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
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default QuotationView;
