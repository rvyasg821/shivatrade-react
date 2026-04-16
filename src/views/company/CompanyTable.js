// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getCompanyList, cleanCompanyMessage, deleteCompany } from "@src/views/auth/profile/editCompany/store/";
import { impersonateCompanyAdmin } from "@src/views/auth/store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
  Badge,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber"
import Select from "react-select";

// ** Icons Import
import { Eye, Trash2, LogIn, Plus } from "react-feather";

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
  ENUM_USER_STATUS_COLOR,
  ENUM_USER_STATUS
} from "@constant/defaultValues";

const CompanyTable = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.company);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  // ** Pagination & Search
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");


  // ** Toast local state to prevent duplicates
  const [shownSuccess, setShownSuccess] = useState(false);
  const [shownError, setShownError] = useState(false);

  // ** Fetch Company List
  const handleCompanyLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status=statusFilter
    ) => {
      dispatch(
        getCompanyList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, statusFilter,searchInput, dispatch]
  );
const handleStatusFilter = (value) => setStatusFilter(value);
  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleCompanyLists(sort, sortColumn, 1, rowsPerPage, searchInput,statusFilter);
      }, 500);
    } else {
      handleCompanyLists(sort, sortColumn, 1, rowsPerPage, searchInput,statusFilter);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput,statusFilter]);

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleCompanyLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleCompanyLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleCompanyLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleCompanyLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleCompanyLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ** Notifications
  useEffect(() => {
    if (store?.success && !shownSuccess) {
      // Notification("Success", store.success, "success");
      setShownSuccess(true);
      dispatch(cleanCompanyMessage());
    }

    if (store?.error && !shownError) {
      Notification("Error", store.error, "warning");
      setShownError(true);
      dispatch(cleanCompanyMessage());
    }
  }, [store.success, store.error, shownSuccess, shownError, dispatch]);

  // Reset local toast flags when store messages cleared
  useEffect(() => {
    if (!store?.success) setShownSuccess(false);
    if (!store?.error) setShownError(false);
  }, [store.success, store.error]);

  // ** Delete Company
  const handleDelete = (row = {}) => {
    const companyName = row?.company_name || t("this company");
    const adminName = row?.contact_name || "";

    mySwal
      .fire({
        title: t("Permanently Delete Company?"),
        icon: "warning",
        html: `
          <div style="text-align:left; font-size:14px; line-height:1.7;">
            <p style="margin-bottom:10px;">
              You are about to <strong style="color:#ea5455;">permanently delete</strong>
              <strong>${companyName}</strong>. This action <strong>cannot be undone</strong>.
            </p>
            <p style="margin-bottom:6px; font-weight:600;">The following data will be removed forever:</p>
            <ul style="padding-left:18px; margin:0 0 10px 0;">
              <li>Company record — <em>${companyName}</em></li>
              ${adminName ? `<li>Company admin user — <em>${adminName}</em></li>` : "<li>Company admin user</li>"}
              <li>All users &amp; employees</li>
              <li>All locations</li>
              <li>All subscriptions</li>
              <li>All payments &amp; invoices</li>
              <li>All saved cards</li>
              <li>All custom roles</li>
            </ul>
            <p style="color:#ea5455; font-weight:600; margin:0;">
              ⚠ There is no way to recover this data after deletion.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: t("Yes, delete permanently"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
          htmlContainer: "text-start",
        },
        buttonsStyling: false,
        focusCancel: true,
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await dispatch(deleteCompany(row?._id)).unwrap();
            Notification("Success", t("Company permanently deleted"), "success");
            handleCompanyLists();
          } catch (error) {
            Notification("Error", error?.error || t("Delete failed"), "warning");
          }
        }
      });
  };

  // ** Impersonate as Company Admin
  const handleImpersonate = (row) => {
    mySwal
      .fire({
        title: t("Login as Company Admin?"),
        html: `<p>You will be logged in as <strong>${row?.contact_name || "Company Admin"}</strong> of <strong>${row?.company_name || "this company"}</strong>.</p>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, login as"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await dispatch(impersonateCompanyAdmin(row._id)).unwrap();
            if (res.actionFlag === "IMPERSONATE_SUCCESS") {
              window.location.href = "/apps/dashboard";
            } else {
              Notification("Error", res?.error || t("Impersonation failed"), "warning");
            }
          } catch (error) {
            Notification("Error", error?.error || t("Impersonation failed"), "warning");
          }
        }
      });
  };

  // ** Permission Checks
  const isSystemAdmin =
    authUserItem?.role?.type === "system" &&
    authUserItem?.role?.name === "Admin";

  const canViewCompanyGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.company?.can_read;

  const canDeleteCompanyGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.company?.can_delete;

  // ** Table Columns
  const columns = [
    {
      name: t("Company"),
      sortField: "company_name",
      sortable: true,
      selector: (row) => (
        <Link
          to={`${appsRoot}/company/view/${row?._id || ""}`}
          className="text-capitalize text-wrap"
        >
          {row?.company_name || ""}
        </Link>
      ),
    },
    {
      name: t("Name"),
      sortField: "contact_name",
      sortable: true,
      selector: (row) => <span className="text-wrap">{row?.contact_name || ""}</span>,
    },
    {
      // name: t("Contact Details (Email+Phone)"),
      name: t("Contact"),
      sortField: "email",
      sortable: true,
      selector: (row) => {
        // Format phone if available
        let formattedPhone = "";
        if (row?.mobile) {
          formattedPhone = formatPhoneNumber(
            row?.mobile,
            typeof row?.country_code?.format === "string"
              ? row?.country_code?.format
              : "+. (...) ...-....",
            (row?.country_code?.dialCode || row?.country_code?.code || "").replace("+", "")
          );
        }
             return (
          <div className="text-wrap ">
            <div>{row?.email || "-"}</div>
            <div className="text">{formattedPhone}</div>
          </div>
        );
      },
    },
{
      name: t("Status"),
      sortField: "status",
      sortable: false,
      selector: (row) => (
        <Badge color={ENUM_USER_STATUS_COLOR?.[row?.status]}>
          {t(ENUM_USER_STATUS?.[row?.status]) || ""}
        </Badge>
      ),
    },


  ];

  // ** Action Column
  if (canViewCompanyGlobal || canDeleteCompanyGlobal) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        const canView = canViewCompanyGlobal;
        const canDelete = canDeleteCompanyGlobal;

        return (
          <div className="d-flex column-action align-items-center table-icon">
            {isSystemAdmin && (
              <>
                <LogIn
                  size={20}
                  className="cursor-pointer me-50"
                  id={`company-impersonate-tooltip-${row?._id || ""}`}
                  onClick={() => handleImpersonate(row)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`company-impersonate-tooltip-${row?._id || ""}`}
                >
                  {t("Login As")}
                </UncontrolledTooltip>
              </>
            )}
            {canView && (
              <Link
                className="me-50"
                id={`company-view-tooltip-${row?._id || ""}`}
                to={`${appsRoot}/company/view/${row?._id || ""}`}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`company-view-tooltip-${row?._id || ""}`}
                >
                  {t("View")}
                </UncontrolledTooltip>
                <Eye size={20} />
              </Link>
            )}
            {canDelete && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`company-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`company-delete-tooltip-${row?._id || ""}`}
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

  // ** Handle loading spinner
  useEffect(() => {
    if (store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Companies")}</h3>
          <Button color="primary" size="sm" onClick={() => navigate(`${appsRoot}/company/add`)}>
            <Plus size={14} className="me-50" />{t("Add Company")}
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="4">
                <div className="d-flex align-items-center mb-sm-0 mb-1">
                  <Input
                    type="text"
                    id="search-company"
                    value={searchInput}
                    className="w-100 select"
                    placeholder={t("Search Companies")}
                    onChange={(event) => handleSearch(event?.target?.value)}
                  />
                </div>
              </Col>
               <Col sm="6" md="4" className="mb-2 mb-md-0">
                <Select
                  value={
                    statusFilter
                      ? {
                        value: statusFilter,
                        label:
                          statusFilter === "ACTIVE"
                            ? t("ACTIVE")
                            :t("INACTIVE")
                      }
                      : null
                  }
                  onChange={(selected) =>
                    handleStatusFilter(selected ? selected.value : "")
                  }
                  options={[
                    { value: "ACTIVE", label: t("Active") },
                    { value: "INACTIVE", label: t("Inactive") },
                  ]}
                  isClearable
                  placeholder={t("Select Status")}
                  classNamePrefix="select"
                />
              </Col>

            </Row>

            <Row className="mt-2">
              <Col md="12" className="subscription-table">
                <DatatablePagination
                  columns={columns}
                  data={store?.companyItem || []}
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

export default CompanyTable;
