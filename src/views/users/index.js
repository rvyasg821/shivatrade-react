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
import { deleteUser, getUserList, cleanUserMessage } from "./store";
import { getRoleList } from "../roles/store";
import { startLoading, stopLoading } from "../loadingstore";
import avatar from "@src/assets/images/avatars/avatar.jpeg";

// ** Reactstrap Imports
import {
  Col,
  Badge,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";
// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
  ENUM_USER_STATUS,
  ENUM_USER_STATUS_COLOR,
  hostRestApiUrl
} from "@constant/defaultValues";

const UserList = (props) => {
  const { roleType = null, title = "Users", addPath = `${appsRoot}/users/add`, editPath = `${appsRoot}/users/edit` } = props;
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.user);
  const authStore = useSelector((state) => state.auth);
  const roleStore = useSelector((state) => state.role);
  const selectedLocationId = useSelector((state) => state.locationContext?.selectedLocationId);
  const authUserItem = authStore?.authUserItem || null;

  // 🔎 Debug logs
  console.log("DEBUG :: User:", authUserItem?.name);
  console.log("DEBUG :: Type:", authUserItem?.role?.type);
  console.log("DEBUG :: Role name:", authUserItem?.role?.name);
  console.log("DEBUG :: Permissions:", authUserItem?.role?.permissions);

  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  // status filter
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  // role filter
  const [roleFilter, setRoleFilter] = useState(null);
  const [roleOptions, setRoleOptions] = useState([]);

  const handleUserLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter,
      role = roleFilter
    ) => {
      const params = {
        orderBy: sortCol,
        orderDirection: sorting,
        page,
        perPage,
        search,
        status,
        role,
        roleType // Pass roleType to the action
      };

      if (selectedLocationId) {
        params.location_id = selectedLocationId;
      }

      dispatch(getUserList(params));
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, roleFilter, dispatch, roleType, selectedLocationId]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleUserLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleUserLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleUserLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };
  // ** Filters
  const handleStatusFilter = (value) => setStatusFilter(value);
  const handleRoleFilter = (value) => setRoleFilter(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleUserLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter, roleFilter);
      }, 500);
    } else {
      handleUserLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter, roleFilter);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, statusFilter, roleFilter, selectedLocationId]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useLayoutEffect(() => {
    // Fetch roles for filter dropdown
    dispatch(getRoleList());
  }, []);

  useEffect(() => {
    if (roleStore?.roleItems?.length) {
      const options = roleStore.roleItems
        // Users screen manages ADMINS only — staff (Employee + any custom
        // company role) live on the Employees screen. Built-in admin roles
        // (e.g. Location Admin) have companyId = null; custom company roles
        // carry a companyId. Same rule as the Add-User role dropdown.
        .filter((role) => role.name !== 'Employee' && !role.companyId)
        .map((role) => ({
          value: role._id,
          label: role.name,
        }));
      setRoleOptions(options);
    }
  }, [roleStore?.roleItems]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanUserMessage(null));
    }

    if (store?.actionFlag === "USR_DLT") {
      handleUserLists();
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
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
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteUser(id));
        }
      });
  };

  // ✅ Permission Checks
  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";

  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";

  const canAddUser =
    isSystemAdmin || authUserItem?.role?.permissions?.user?.can_add;

  const canEditUserGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.user?.can_update;

  const canDeleteUserGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.user?.can_delete;


  // ✅ Columns
  const columns = [
    {
      name: t("Profile"),
      selector: (row) => {
        const photoUrl =
          row.photo && row.photo.trim() !== ""
            ? `${hostRestApiUrl.replace(/\/$/, "")}/${row.photo.replace(/^\/+/, "")}`
            : avatar;

        return (
          <img
            src={photoUrl}
            alt=""
            style={{ width: 40, height: 40, borderRadius: "50%" }}
            onError={(e) => {
              e.currentTarget.onerror = null; // prevent infinite loop
              e.currentTarget.src = avatar;   // fallback
            }}
          />
        );
      },
    },
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => (<>
        {canEditUserGlobal ? (
          <Link
            to={`${editPath}/${row?._id || ""}`}
            className="text-capitalize text-wrap"
          >
            {row?.name || ""}
          </Link>
        ) : (
          <span className="text-wrap">{row?.name || ""}</span>
        )}
      </>),
    },
    {
      name: t("Email"),
      hide: "md",
      sortField: "email",
      sortable: true,
      selector: (row) => <span className="text-wrap">{row?.email || ""}</span>,
    },
    {
      name: t("Role"),
      sortField: "role",
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-capitalize">
          {row?.role?.name || ""}
        </span>
      ),
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

  // ✅ Add Action column only if allowed
  if (canEditUserGlobal || canDeleteUserGlobal) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        const canEditUser =
          isSystemAdmin || authUserItem?.role?.permissions?.user?.can_update;

        const canDeleteUser =
          isSystemAdmin || authUserItem?.role?.permissions?.user?.can_delete;

        return (
          <div className="d-flex column-action align-items-center table-icon">
            {canEditUser && (
              <Link
                className="me-50"
                id={`user-edit-tooltip-${row?._id || ""}`}
                to={`${editPath}/${row?._id || ""}`}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`user-edit-tooltip-${row?._id || ""}`}
                >
                  {t("Edit")}
                </UncontrolledTooltip>
                <Edit size={20} />
              </Link>
            )}

            {canDeleteUser && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`user-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`user-delete-tooltip-${row?._id || ""}`}
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
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content users">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t(title)}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row >
              <Col sm="12" md="9">
                <Row>
                  <Col sm="6" md="3">
                    <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                      <Input
                        type="text"
                        id="search-user"
                        value={searchInput}
                        className="w-100 select"
                        placeholder={t("Search Users")}
                        onChange={(event) => handleSearch(event?.target?.value)}
                      />
                    </div>

                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      value={
                        statusFilter
                          ? {
                            value: statusFilter,
                            label:
                              statusFilter === "ACTIVE"
                                ? t("ACTIVE")
                                : t("INACTIVE")
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
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      value={
                        roleFilter
                          ? roleOptions.find((opt) => opt.value === roleFilter)
                          : null
                      }
                      onChange={(selected) =>
                        handleRoleFilter(selected ? selected.value : null)
                      }
                      options={roleOptions}
                      isClearable
                      placeholder={t("Select Role")}
                      classNamePrefix="select"
                    />
                  </Col>

                </Row>
              </Col>
              <Col sm="4" md="3" className="text-end listing-toolbar-actions">
                {canAddUser && (
                  <Button
                    color="primary"
                    onClick={() => navigate(addPath, { state: { roleType } })}
                  >
                    <PlusCircle size={14} className="me-50" />{t("Add")} {t(roleType || "User")}
                  </Button>
                )}
              </Col>

            </Row>

            <Row className="mt-2">
              <Col md="12 " className="user-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.userItems || []}
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

export default UserList;
