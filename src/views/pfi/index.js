// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { deletePfi, getPfiList, cleanPfiMessage } from "./store";
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
import VoucherStatsTiles from "@src/views/_shared/voucher-stats/VoucherStatsTiles";
import DateInput from "@components/date-input";
import { formatDate } from "@src/utility/dateFormat";
import { formatMoney } from "@src/utility/currency";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Eye, Trash2, PlusCircle } from "react-feather";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
} from "@constant/options";

const PfiView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.pfi);
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
      dispatch(getPfiList(params));
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
      dispatch(cleanPfiMessage(null));
    }
    if (store?.actionFlag === "PFI_DLT") handleList();
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
        if (result.isConfirmed) dispatch(deletePfi(id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.["pfi"];
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

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
      name: t("PFI #"),
      sortField: "voucher_no",
      sortable: false,
      minWidth: "200px",
      grow: 1.5,
      selector: (row) => (
        <Link
          to={`${appsRoot}/pfi/view/${row?._id || ""}`}
          className="text-nowrap"
        >
          {row?.voucher_no || "-"}
        </Link>
      ),
    },
    {
      name: t("Quote #"),
      sortable: false,
      minWidth: "200px",
      grow: 1.5,
      selector: (row) => {
        if (!row?.quotation_voucher_no) return "-";
        if (!row?.quotation_id) return row.quotation_voucher_no;
        return (
          <Link
            to={`${appsRoot}/quotations/view/${row.quotation_id}`}
            className="text-nowrap"
          >
            {row.quotation_voucher_no}
          </Link>
        );
      },
    },
    {
      name: t("Company"),
      sortable: false,
      grow: 2,
      selector: (row) => {
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
      name: t("Date"),
      sortField: "pfi_date",
      sortable: true,
      selector: (row) => (row?.pfi_date ? formatDate(row.pfi_date) : "-"),
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

  {
    // View action is always available; Edit/Delete are gated by perms.
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          <Link
            className="me-50"
            id={`pfi-view-${row?._id || ""}`}
            to={`${appsRoot}/pfi/view/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`pfi-view-${row?._id || ""}`}
            >
              {t("View")}
            </UncontrolledTooltip>
            <Eye size={20} />
          </Link>
          {canEdit && (
            <Link
              className="me-50"
              id={`pfi-edit-${row?._id || ""}`}
              to={`${appsRoot}/pfi/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`pfi-edit-${row?._id || ""}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          )}
          {canDelete && (
            <>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`pfi-delete-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`pfi-delete-${row?._id || ""}`}
              >
                {t("Delete")}
              </UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    });
  }

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content pfi">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("PFI")}</h3>
        </div>

        <VoucherStatsTiles
          module="pfi"
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
                      id="search-pfi"
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
                      id="pfi-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="pfi-date-to"
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
                    onClick={() => navigate(`${appsRoot}/pfi/add`)}
                  >
                    {t("Add PFI")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="pfi-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.pfiItems || []}
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

export default PfiView;
