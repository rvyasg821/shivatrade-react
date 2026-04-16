// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { deleteUser, getAgentList, cleanUserMessage } from "@src/views/users/store/";
import { startLoading, stopLoading } from "../loadingstore";

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
import { CopyToClipboard } from 'react-copy-to-clipboard';
import {handleImgSrcError}from "@src/utility/Utils";

// ** Icons Import
import { Edit, Trash2, PlusCircle, Clipboard, Check, CheckSquare } from "react-feather";
import avatar from "@src/assets/images/avatars/avatar.jpeg";

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
  ENUM_USER_STATUS,
  ENUM_USER_STATUS_COLOR,
  hostRestApiUrl
} from "@constant/defaultValues";

import {
  getDomailUrl
} from "@src/utility/Utils"

const UserList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const location = useLocation();
  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.user);
  const authStore = useSelector((state) => state.auth);
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

  // copied
  const [copiedId, setCopiedId] = useState(null);

  // status filter
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const handleUserLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getAgentList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, dispatch]
  );

  // sorting 
  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleUserLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  // pagination
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

  // serach
  const handleSearch = (value) => {
    setSearchInput(value);
  };
  // ** Filters
  const handleStatusFilter = (value) => setStatusFilter(value);
  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleUserLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleUserLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  //  delete
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
  // loadding management
  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);
  // copy

  const handleCopySuccess = (row) => {
    setCopiedId(row?._id);

    // Reset icon after 2 seconds
    setTimeout(() => setCopiedId(null), 3000);

  };
  // ✅ Permission Checks
  const isSystemAdmin =
    authUserItem?.role?.type === "system" &&
    authUserItem?.role?.name === "Admin";

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
        const photo = typeof row.photo === "string" ? row.photo.trim() : "";
        const photoUrl =
          photo !== ""
            ? `${hostRestApiUrl.replace(/\/$/, "")}/${photo.replace(/^\/+/, "")}`
            : avatar; // fallback immediately

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
      selector: (row) => (
        <div className="text-wrap">
          {canEditUserGlobal ? (
            <Link
              to={`${appsRoot}/agents/edit/${row?._id || ""}`}
              className="text-capitalize fw-bold d-block"
            >
              {row?.name || ""}
            </Link>
          ) : (
            <span className="text-capitalize fw-bold d-block">{row?.name || ""}</span>
          )}
          <small className="">{row?.email || ""}</small>
        </div>
      ),
    },

    {
      name: t("Referral Code"),
      sortField: "referal_code",
      sortable: true,
      selector: (row) => <span className="text-wrap">{row?.referal_code || "-"}</span>,
    },
    {
      name: t("Commission (%)"),
      sortField: "commission",
      sortable: true,
      selector: (row) => <span className="text-wrap">{row?.commission ? `${row.commission}%` : "-"}</span>

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
            {row?.referal_code && (
              <CopyToClipboard
                text={`${getDomailUrl()}/register?referral_code=${row?.referal_code || ""}`}
                onCopy={() => handleCopySuccess(row)}
                className="me-50"
              >
                <div>
                  {copiedId === row?._id ? (
                    <CheckSquare
                      id={`user-copy-tooltip-${row?._id || ""}`}
                      size={20}
                      className=""
                    />
                  ) : (
                    <Clipboard
                      id={`user-copy-tooltip-${row?._id || ""}`}
                      size={20}
                      className="cursor-pointer"
                    />
                  )}
                  <UncontrolledTooltip
                    placement="top"
                    target={`user-copy-tooltip-${row?._id || ""}`}
                  >
                    {copiedId === row?._id ? t("Copied!") : t("Copy")}
                  </UncontrolledTooltip>
                </div>
              </CopyToClipboard>
            )}
            {canEditUser && (
              <Link
                className="me-50"
                id={`user-edit-tooltip-${row?._id || ""}`}
                to={`${appsRoot}/agents/edit/${row?._id || ""}`}
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
                  className="cursor-pointer me-50"
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

  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Agents")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row >
              <Col sm="8" md="9">
                <Row>
                  <Col sm="6" md="4">
                    <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                      <Input
                        type="text"
                        id="search-user"
                        value={searchInput}
                        className="w-100 select"
                        placeholder={t("Search Agents")}
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

                </Row>
              </Col>
              <Col sm="4" md="3" className="text-end">
                {canAddUser && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/agents/add`)}
                  >
                    {t("Add Agent")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12 " className="user-table five-row-table">
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
