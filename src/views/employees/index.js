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
import { deleteEmployee, getEmployeeList, cleanEmployeeMessage } from "./store";
import { getLocationList } from "../locations/store";
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
} from "reactstrap";
import Select from "react-select";
import SetupReturnBanner from '@src/components/SetupReturnBanner'

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Edit, Trash2, PlusCircle, Eye, Download, Upload, LogIn } from "react-feather";
import { impersonateEmployee } from "@src/views/auth/store";
import ImportModal from "./components/ImportModal";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
} from "@constant/defaultValues";

const EmployeeList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.employee);
  const authStore = useSelector((state) => state.auth);
  const selectedLocationId = useSelector((state) => state.locationContext?.selectedLocationId);
  const locationStore = useSelector((state) => state.location);
  const authUserItem = authStore?.authUserItem || null;
  const isLocationAdmin = authUserItem?.role?.name === "Location Admin";

  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  // status filter
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [locationFilter, setLocationFilter] = useState("");
  const [importModal, setImportModal] = useState(false);

  const handleExport = async () => {
    try {
      const params = {};
      if (selectedLocationId) params.location_id = selectedLocationId;
      const res = await instance.get(API_ENDPOINTS.employees.export, { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `employees-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Export failed"), "warning");
    }
  };

  const handleEmployeeLists = (sorting, sortCol, page, perPage, search, status) => {
    const params = {
      orderBy: sortCol,
      orderDirection: sorting,
      page,
      perPage,
      search,
      status,
    };
    // Scope to the top-level header location for every role — same as the
    // Inventory listing. `locationFilter` stays as a fallback (currently the
    // page-level dropdown is disabled, so the header is the single source).
    const effectiveLoc = selectedLocationId || locationFilter || "";
    if (effectiveLoc) {
      params.location_id = effectiveLoc;
    }
    dispatch(getEmployeeList(params));
  };

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleEmployeeLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput, statusFilter);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleEmployeeLists(sort, sortColumn, page + 1, rowsPerPage, searchInput, statusFilter);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleEmployeeLists(sort, sortColumn, 1, value, searchInput, statusFilter);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };

  // ** Filters
  const handleStatusFilter = (value) => setStatusFilter(value);

  useEffect(() => {
    let handler;
    const fetchList = () => {
      const params = {
        orderBy: sortColumn,
        orderDirection: sort,
        page: 1,
        perPage: rowsPerPage,
        search: searchInput,
        status: statusFilter,
      };
      const effectiveLoc = selectedLocationId || locationFilter || "";
      if (effectiveLoc) {
        params.location_id = effectiveLoc;
      }
      setCurrentPage(1);
      dispatch(getEmployeeList(params));
    };

    if (searchInput) {
      handler = setTimeout(fetchList, 500);
    } else {
      fetchList();
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, statusFilter, selectedLocationId, locationFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (!isLocationAdmin) {
      dispatch(getLocationList({ status: "ACTIVE", dropdown: "yes" }));
    }
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanEmployeeMessage(null));
    }

    if (store?.actionFlag === "EMP_DLT") {
      handleEmployeeLists();
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error]);

  const handleImpersonate = (employeeId) => {
    // The thunk handles the hard navigation to /apps/dashboard itself, BEFORE
    // Redux updates state.authUserItem with the new employee user. If we let
    // Redux update first, the route guard for /apps/employees would re-evaluate
    // with the (now-employee) user, fail the permission check, and bounce to
    // /auth/not-auth — the brief "not authorized" flash. We only handle errors
    // here; success path navigates inside the thunk.
    dispatch(impersonateEmployee(employeeId)).then((res) => {
      if (res?.payload?.actionFlag === "IMPERSONATE_EMP_ERROR" || res?.payload?.error) {
        Notification("Error", res.payload?.error || "Impersonation failed", "warning");
      }
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
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteEmployee(id));
        }
      });
  };

  // Permission Checks
  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";

  const canAddEmployee =
    isSystemAdmin || authUserItem?.role?.permissions?.employee?.can_add;

  const canEditEmployeeGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.employee?.can_update;

  const canDeleteEmployeeGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.employee?.can_delete;

  // Columns
  const columns = [
    {
      name: t("Employee"),
      sortField: "first_name",
      sortable: true,
      selector: (row) => (
        <>
          <Link
            to={`${appsRoot}/employees/view/${row?._id || ""}`}
            className="text-capitalize text-wrap"
          >
            {`${row?.first_name || ""} ${row?.last_name || ""}`}
          </Link>
          <br/>
          {t("Code")}: <span className="text-wrap text-uppercase">{row?.employee_code || ""}</span>
          <br/>
          {t("Designation")}: <span className="text-wrap text-capitalize">{row?.designation || ""}</span>
        </>
      ),
    },
    {
      name: t("Contact"),
      hide: "md",
      sortField: "email",
      sortable: true,
      minWidth: "250px",
      selector: (row) => {
        let phone = ''
        if (row?.mobile) {
          const cc = row?.country_code
          const dialCode = (cc?.dialCode || '').replace('+', '')
          const format = cc?.format || ''
          let rawMobile = String(row.mobile).replace(/\D/g, '')

          // Strip dial code if already present to get just the local number
          if (dialCode && rawMobile.startsWith(dialCode)) {
            rawMobile = rawMobile.slice(dialCode.length)
          }

          if (format && dialCode) {
            // formatPhoneNumber expects full number with dial code
            const fullNumber = dialCode + rawMobile
            try {
              const formatted = formatPhoneNumber(fullNumber, format, dialCode)
              phone = formatted.startsWith('+') ? formatted : `+${formatted}`
            } catch {
              phone = `+${dialCode} ${rawMobile}`
            }
          } else if (dialCode) {
            phone = `+${dialCode} ${rawMobile}`
          } else {
            phone = rawMobile
          }
        }
        return (
          <div>
            <div className="text-wrap">{row?.email || ""}</div>
            {phone && <div className="small text-muted">{phone}</div>}
          </div>
        )
      },
    },
    {
      name: t("Location"),
      hide: "md",
      sortField: "location",
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-capitalize">
          {row?.location_id?.location_name || ""}
        </span>
      ),
    },
    {
      name: t("Role"),
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-capitalize">
          {row?.role_name || t("Employee")}
        </span>
      ),
    },
    {
      name: t("Status"),
      sortField: "is_active",
      sortable: false,
      cell: (row) => (
        <span className={`doc-badge ${row?.is_active ? "doc-badge-green" : "doc-badge-red"}`}>
          {row?.is_active ? t("Active") : t("Inactive")}
        </span>
      ),
    },
  ];

  // Add Action column (View always available, Edit/Delete conditional)
  {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        const canEditEmployee =
          isSystemAdmin || authUserItem?.role?.permissions?.employee?.can_update;

        const canDeleteEmployee =
          isSystemAdmin || authUserItem?.role?.permissions?.employee?.can_delete;

        return (
          <div className="d-flex column-action align-items-center table-icon">
            <Link
              className="me-50"
              id={`employee-view-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/employees/view/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`employee-view-tooltip-${row?._id || ""}`}
              >
                {t("View")}
              </UncontrolledTooltip>
              <Eye size={20} />
            </Link>
            {canEditEmployee && (
              <Link
                className="me-50"
                id={`employee-edit-tooltip-${row?._id || ""}`}
                to={`${appsRoot}/employees/edit/${row?._id || ""}`}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`employee-edit-tooltip-${row?._id || ""}`}
                >
                  {t("Edit")}
                </UncontrolledTooltip>
                <Edit size={20} />
              </Link>
            )}

            {canDeleteEmployee && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`employee-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`employee-delete-tooltip-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )}

            <LogIn
              size={20}
              className="cursor-pointer ms-50 text-info"
              id={`employee-login-tooltip-${row?._id || ""}`}
              onClick={() => handleImpersonate(row?._id)}
            />
            <UncontrolledTooltip
              placement="top"
              target={`employee-login-tooltip-${row?._id || ""}`}
            >
              {t("Login As")}
            </UncontrolledTooltip>
          </div>
        );
      },
    });
  }

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <SetupReturnBanner />
      <div className="main-content employees">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Employees")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-1">
              <div className="d-flex align-items-center gap-1 flex-wrap listing-toolbar-filters">
                <Input
                  type="text"
                  id="search-employee"
                  value={searchInput}
                  placeholder={t("Search Employees")}
                  onChange={(event) => handleSearch(event?.target?.value)}
                  style={{ width: 200 }}
                />
                <div style={{ width: 160 }}>
                  <Select
                    value={
                      statusFilter
                        ? {
                            value: statusFilter,
                            label:
                              statusFilter === "ACTIVE"
                                ? t("ACTIVE")
                                : t("INACTIVE"),
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
                </div>
                {/* Location filter — temporarily disabled.
                {!isLocationAdmin && (
                  <div style={{ width: 220 }}>
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("All Locations")}
                      options={(locationStore?.locationItems || []).map(
                        (loc) => ({
                          value: loc._id,
                          label: loc.location_name,
                        })
                      )}
                      value={
                        locationFilter
                          ? (locationStore?.locationItems || [])
                              .map((loc) => ({
                                value: loc._id,
                                label: loc.location_name,
                              }))
                              .find((o) => o.value === locationFilter) || null
                          : null
                      }
                      onChange={(opt) =>
                        setLocationFilter(opt ? opt.value : "")
                      }
                    />
                  </div>
                )}
                */}
              </div>
              <div className="d-flex align-items-center gap-1 flex-wrap listing-toolbar-actions">
                <Button color="outline-secondary" size="sm" onClick={handleExport}>
                  <Download size={14} className="me-50" />{t("Export")}
                </Button>
                {canAddEmployee && (
                  <Button color="outline-secondary" size="sm" onClick={() => setImportModal(true)}>
                    <Upload size={14} className="me-50" />{t("Import")}
                  </Button>
                )}
                {canAddEmployee && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/employees/add`)}
                  >
                    <PlusCircle size={14} className="me-50" />{t("Add Employee")}
                  </Button>
                )}
              </div>
            </div>

            <Row className="mt-2">
              <Col md="12" className="employee-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.employeeItems || []}
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

      <ImportModal
        isOpen={importModal}
        toggle={() => setImportModal(false)}
        locationId={selectedLocationId}
        onSuccess={() => handleEmployeeLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter)}
      />
    </Fragment>
  );
};

export default EmployeeList;
