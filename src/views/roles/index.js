// ** React Imports
import { Fragment, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { deleteRole, getRoleList, cleanRoleMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Input,
  Button,
  Badge,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Settings, Edit, Trash2, PlusCircle } from "react-feather";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import { initRoleItem } from "@constant/reduxConstant";

// ** Modals
import ModalAddRole from "./modals/ModalAddRole";

const RoleList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.role);
  const authStore = useSelector((state) => state.auth);

  const authUserItem = authStore?.authUserItem || null;

  // ** Permission checks
  const isAdmin =
    authUserItem?.role?.type === "system" &&
    authUserItem?.role?.name === "Admin";

  const canUpdateRole =
    authUserItem?.role?.permissions?.role?.can_update === true;

  const canCreateRole =
    authUserItem?.role?.permissions?.role?.can_add === true;

  const canDeleteRole =
    authUserItem?.role?.permissions?.role?.can_delete === true;

  const canEditRole = isAdmin || canUpdateRole;

  // ** States
  const [modalOpen, setModalOpen] = useState(false);
  const [roleItemData, setRoleItemData] = useState(initRoleItem);

  // Client-side list controls (roles are few — the API returns them in one
  // shot, so we search / sort / paginate locally to match the Locations look).
  const [searchInput, setSearchInput] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);

  const openModal = () => {
    if (!modalOpen) setModalOpen(true);
  };

  const closeModal = () => {
    if (modalOpen) {
      setModalOpen(false);
      setRoleItemData(initRoleItem);
    }
  };

  const handleRoleLists = useCallback(() => {
    dispatch(
      getRoleList({
        sort: { orderBy: "_id", orderDirection: "asc" },
        purpose: "manage", // excludes default roles for non-Super Admin
      })
    );
  }, [dispatch]);

  useEffect(() => {
    window.scrollTo(0, 0);
    handleRoleLists();
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanRoleMessage(null));
    }

    if (store?.actionFlag === "ROLE_CRTD" || store?.actionFlag === "ROLE_UPDT") {
      closeModal();
      handleRoleLists();
    }

    if (store?.actionFlag === "ROLE_DLTD") {
      handleRoleLists();
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
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteRole(id));
        }
      });
  };

  const handleEdit = (item = null) => {
    setRoleItemData(item);
    openModal();
  };

  useEffect(() => {
    if (store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  // ** List controls
  const handleSearch = (value) => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const handleSort = (column, sortDirection) => {
    setSortColumn(column.sortField);
    setSortDir(sortDirection);
    setCurrentPage(1);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(Number(value) || defaultPerPageRow);
    setCurrentPage(1);
  };

  // ** Derived list (filter → sort → paginate, all client-side)
  const allRoles = store?.roleItems || [];
  const term = searchInput.trim().toLowerCase();
  const filtered = term
    ? allRoles.filter((r) =>
        `${r?.name || ""} ${r?.description || ""}`.toLowerCase().includes(term)
      )
    : allRoles;
  const sorted = [...filtered].sort((a, b) => {
    const av = (a?.[sortColumn] ?? "").toString().toLowerCase();
    const bv = (b?.[sortColumn] ?? "").toString().toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const total = sorted.length;
  const pageData = sorted.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const pagination = { total, perPage: rowsPerPage, page: currentPage };

  // ** Columns
  const columns = [
    {
      name: t("Role Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => (
        <div className="d-flex align-items-center gap-50 flex-wrap">
          {!row?.isDefault && canEditRole ? (
            <Link
              to="/"
              className="text-capitalize text-wrap fw-bold"
              onClick={(event) => {
                event.preventDefault();
                handleEdit(row);
              }}
            >
              {row?.name || ""}
            </Link>
          ) : (
            <span className="text-capitalize text-wrap fw-bold">
              {row?.name || ""}
            </span>
          )}
          {row?.isDefault && (
            <Badge
              className="rounded-pill"
              style={{
                backgroundColor: "rgba(40, 199, 111, 0.12)",
                color: "#28c76f",
              }}
            >
              {t("Default")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      name: t("Description"),
      sortField: "description",
      sortable: true,
      selector: (row) => (
        <span className="text-wrap">{row?.description || "-"}</span>
      ),
    },
  ];

  if (canEditRole || canDeleteRole) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          {canEditRole && (
            <Link
              className="me-50"
              id={`role-perm-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/roles/permission/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`role-perm-tooltip-${row?._id || ""}`}
              >
                {t("Module Permissions")}
              </UncontrolledTooltip>
              <Settings size={20} />
            </Link>
          )}

          {!row?.isDefault && canEditRole && (
            <Link
              className="me-50"
              id={`role-edit-tooltip-${row?._id || ""}`}
              to="/"
              onClick={(event) => {
                event.preventDefault();
                handleEdit(row);
              }}
            >
              <UncontrolledTooltip
                placement="top"
                target={`role-edit-tooltip-${row?._id || ""}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          )}

          {!row?.isDefault && (isAdmin || canDeleteRole) && (
            <Fragment>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`role-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`role-delete-tooltip-${row?._id || ""}`}
              >
                {t("Delete")}
              </UncontrolledTooltip>
            </Fragment>
          )}
        </div>
      ),
    });
  }

  return (
    <Fragment>
      <div className="main-content role-main">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Roles")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="8" md="9">
                <Row>
                  <Col sm="6" md="4">
                    <div className="d-flex align-items-center mb-sm-0 mb-1">
                      <Input
                        type="text"
                        id="search-role"
                        value={searchInput}
                        className="w-100 select"
                        placeholder={t("Search Roles")}
                        onChange={(event) => handleSearch(event?.target?.value)}
                      />
                    </div>
                  </Col>
                </Row>
              </Col>
              <Col sm="4" md="3" className="text-end">
                {(isAdmin || canCreateRole) && (
                  <Button color="primary" onClick={() => openModal()}>
                    {t("Add New Role")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="role-tables">
                <DatatablePagination
                  columns={columns}
                  data={pageData}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>

        <ModalAddRole
          open={modalOpen}
          closeModal={closeModal}
          loading={store?.loading}
          roleItemData={roleItemData}
        />
      </div>
    </Fragment>
  );
};

export default RoleList;
