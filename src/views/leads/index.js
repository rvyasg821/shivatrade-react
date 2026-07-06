// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  deleteLead,
  getLeadList,
  cleanLeadMessage,
  convertLead,
} from "./store";
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

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Eye, Trash2, PlusCircle, UserCheck, FileText, User, Mail, Phone } from "react-feather";
import { formatDate } from "@src/utility/dateFormat";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_BADGE_COLOR,
} from "@constant/options";
import { formatMoney, convertFromInr } from "@src/utility/currency";
import { getExchangeRateOptions } from "@src/views/currencies/store";

const LeadList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.lead);
  const exchangeOptions = useSelector(
    (state) => state.currency?.exchangeOptions || []
  );
  const authStore = useSelector((state) => state.auth);
  const creatorCtx = useSelector((state) => state.creatorContext);
  const selectedCreator = creatorCtx?.selectedCreator || "all";
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const handleLeadLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter,
      source = sourceFilter
    ) => {
      dispatch(
        getLeadList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status,
          source,
          created_by: selectedCreator,
        })
      );
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      statusFilter,
      sourceFilter,
      selectedCreator,
      dispatch,
    ]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleLeadLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleLeadLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleLeadLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleLeadLists(
          sort,
          sortColumn,
          1,
          rowsPerPage,
          searchInput,
          statusFilter,
          sourceFilter
        );
      }, 500);
    } else {
      handleLeadLists(
        sort,
        sortColumn,
        1,
        rowsPerPage,
        searchInput,
        statusFilter,
        sourceFilter
      );
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter, sourceFilter, selectedCreator]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    dispatch(getExchangeRateOptions());
  }, [dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanLeadMessage(null));
    }
    if (
      store?.actionFlag === "LEAD_DLT" ||
      store?.actionFlag === "LEAD_CONV"
    ) {
      handleLeadLists();
      // KPI tiles fetch independently — force them to re-fetch so the counts
      // reflect the deleted/converted lead.
      setStatsRefreshKey((k) => k + 1);
    }
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
        if (result.isConfirmed) dispatch(deleteLead(id));
      });
  };

  const handleConvert = (row) => {
    mySwal
      .fire({
        title: t("Convert to Customer?"),
        text: row?.customer_id
          ? t("Lead will be marked Won and linked to the existing customer.")
          : t(
              "A new customer will be created from this lead's company and contact details, and the lead will be linked to that customer."
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
        if (result.isConfirmed) dispatch(convertLead(row?._id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.leads;
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const statusLabel = (val) =>
    LEAD_STATUS_OPTIONS.find((s) => s.value === val)?.label || val || "-";

  const columns = [
    {
      name: t("Company"),
      sortField: "company_name",
      sortable: true,
      grow: 2, // primary identifier — absorb spare width so its text isn't squeezed
      selector: (row) => {
        const nameNode = (
          <span
            className="fw-bold text-capitalize"
            ref={(el) => {
              if (el)
                el.style.setProperty("color", "#09418B", "important");
            }}
          >
            {row?.company_name || "-"}
          </span>
        );
        return (
          <div className="py-1">
            <Link
              to={`${appsRoot}/leads/view/${row?._id || ""}`}
              style={{ textDecoration: "none" }}
            >
              {nameNode}
            </Link>
            {row?.voucher_no && (
              <div className="small text-muted">{row.voucher_no}</div>
            )}
            {row?.source && (
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
                  {LEAD_SOURCE_OPTIONS.find((s) => s.value === row?.source)
                    ?.label || row.source}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      name: t("Contact"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortable: false,
      selector: (row) => {
        const phone =
          row?.country_code?.formatted ||
          (row?.country_code?.dial_code && row?.contact_phone
            ? `${row.country_code.dial_code} ${row.contact_phone}`
            : row?.contact_phone) ||
          "";
        if (!row?.contact_name && !row?.contact_email && !phone) {
          return <span className="text-muted">-</span>;
        }
        return (
          <div className="py-75" style={{ minWidth: 0 }}>
            {row?.contact_name && (
              <div className="d-flex align-items-center text-capitalize text-break mb-25">
                <User size={13} className="text-muted me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.contact_name}
                </span>
              </div>
            )}
            {row?.contact_email && (
              <div className="d-flex align-items-center small text-muted text-break mb-25">
                <Mail size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.contact_email}
                </span>
              </div>
            )}
            {phone && (
              <div className="d-flex align-items-center small text-muted text-break">
                <Phone size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>{phone}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      name: t("Items & Value"),
      sortable: false,
      grow: 0, // short content — hug it instead of expanding (no wasted right gap)
      selector: (row) => {
        const count = Number(row?.line_items_count || 0);
        const val = Number(row?.estimated_sales_value || 0);
        // estimated_sales_value is base INR; show it in the lead currency.
        const display =
          val > 0
            ? `~ ${formatMoney(
                convertFromInr(val, row?.currency, exchangeOptions),
                row?.currency,
                { maximumFractionDigits: 0 }
              )}`
            : null;
        return (
          <div className="py-1">
            <div className="fw-bold">
              {count} {count === 1 ? t("item") : t("items")}
            </div>
            {display ? (
              <div className="small text-muted">{display}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      name: t("Status"),
      sortable: false,
      grow: 0, // pill badge — hug content, don't expand
      selector: (row) => {
        const colorMap = {
          new: "#6c757d",
          contacted: "#0dcaf0",
          qualified: "#d39e00",
          proposal_sent: "#0d6efd",
          won: "#198754",
          lost: "#dc3545",
        };
        const c = colorMap[row?.status] || "#6c757d";
        // Pill badge with a light tint of the status color. Forced via ref
        // because the global `.table td` rule overrides class/inline styles.
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
            {statusLabel(row?.status)}
          </span>
        );
      },
    },
    {
      name: t("Follow-up"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortField: "follow_up_date",
      sortable: true,
      selector: (row) => {
        const raw = (row?.follow_up_date || "").slice(0, 10);
        if (!raw) return <span className="text-muted">-</span>;
        const today = new Date().toISOString().slice(0, 10);
        const open = row?.status !== "won" && row?.status !== "lost";
        const overdue = open && raw < today;
        return (
          <span
            className={`text-nowrap ${overdue ? "fw-bold" : ""}`}
            ref={(el) => {
              if (el && overdue)
                el.style.setProperty("color", "#dc3545", "important");
            }}
          >
            {formatDate(raw)}
            {overdue && (
              <small className="ms-1">({t("overdue")})</small>
            )}
          </span>
        );
      },
    },
  ];

  {
    columns.push({
      name: t("Action"),
      center: true,
      minWidth: "190px", // reserve room for up to 5 icons so the last (Delete) isn't clipped on mobile
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          <Link
            className="me-50"
            id={`lead-view-tooltip-${row?._id || ""}`}
            to={`${appsRoot}/leads/view/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`lead-view-tooltip-${row?._id || ""}`}
            >
              {t("View")}
            </UncontrolledTooltip>
            <Eye size={20} />
          </Link>
          {/* List shortcut for the FIRST quotation only. Once a lead has
              quotations the list shows just "View Quotations"; create more
              from the lead detail / quotation module. */}
          {canEdit &&
            row?.status !== "lost" &&
            !row?.quotations_count && (
            <>
              <FileText
                size={20}
                className="cursor-pointer me-50 text-primary"
                id={`lead-create-qt-${row?._id || ""}`}
                onClick={() =>
                  navigate(
                    `${appsRoot}/quotations/add?lead_id=${row?._id || ""}`
                  )
                }
              />
              <UncontrolledTooltip
                placement="top"
                target={`lead-create-qt-${row?._id || ""}`}
              >
                {t("Create Quotation")}
              </UncontrolledTooltip>
            </>
          )}
          {row?.quotations_count > 0 && (
            <>
              <FileText
                size={20}
                className="cursor-pointer me-50 text-info"
                id={`lead-quotations-tooltip-${row?._id || ""}`}
                onClick={() =>
                  navigate(
                    `${appsRoot}/quotations?lead_id=${row?._id || ""}`,
                    {
                      state: {
                        leadName:
                          row?.company_name || row?.contact_name || "",
                      },
                    }
                  )
                }
              />
              <UncontrolledTooltip
                placement="top"
                target={`lead-quotations-tooltip-${row?._id || ""}`}
              >
                {t("View Quotations")} ({row.quotations_count})
              </UncontrolledTooltip>
            </>
          )}
          {canEdit && (
            <Link
              className="me-50"
              id={`lead-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/leads/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`lead-edit-tooltip-${row?._id || ""}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          )}
          {canEdit &&
            row?.status !== "lost" &&
            !row?.converted_customer_id && (
              <>
                <UserCheck
                  size={20}
                  className="cursor-pointer me-50 text-success"
                  id={`lead-convert-tooltip-${row?._id || ""}`}
                  onClick={() => handleConvert(row)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`lead-convert-tooltip-${row?._id || ""}`}
                >
                  {t("Convert to Customer")}
                </UncontrolledTooltip>
              </>
            )}
          {/* "Create Quotation" action moved to lead edit page only - keeps
              the listing focused on lead-level actions and avoids accidental
              recreation when a quotation already exists. */}
          {canDelete && (
            <>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`lead-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`lead-delete-tooltip-${row?._id || ""}`}
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
      <div className="main-content leads">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Leads")}</h3>
        </div>

        <VoucherStatsTiles
          module="lead"
          refreshKey={statsRefreshKey}
          filters={{
            status: statusFilter || undefined,
            source: sourceFilter || undefined,
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
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-lead"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Leads")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={
                        statusFilter && !statusFilter.includes(",")
                          ? LEAD_STATUS_OPTIONS.find(
                              (s) => s.value === statusFilter
                            )
                          : null
                      }
                      onChange={(selected) =>
                        setStatusFilter(selected ? selected.value : "")
                      }
                      options={LEAD_STATUS_OPTIONS}
                      isClearable
                      placeholder={
                        statusFilter && statusFilter.includes(",")
                          ? t("Multiple statuses (tile filter)")
                          : t("Filter by Status")
                      }
                      classNamePrefix="select"
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={
                        sourceFilter
                          ? LEAD_SOURCE_OPTIONS.find(
                              (s) => s.value === sourceFilter
                            )
                          : null
                      }
                      onChange={(selected) =>
                        setSourceFilter(selected ? selected.value : "")
                      }
                      options={LEAD_SOURCE_OPTIONS}
                      isClearable
                      placeholder={t("Filter by Source")}
                      classNamePrefix="select"
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="3" md="3" className="text-end">
                {canAdd && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/leads/add`)}
                  >
                    {t("Add Lead")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="lead-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.leadItems || []}
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

export default LeadList;
