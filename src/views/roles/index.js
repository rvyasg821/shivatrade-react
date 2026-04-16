// ** React Imports
import { Fragment, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { deleteRole, getRoleList, cleanRoleMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import { Col, Row, Card, Button, CardBody } from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Settings, Trash2 } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
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
  const [validationError, setValidationError] = useState("");

  const openModal = () => {
    if (!modalOpen) {
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    if (modalOpen) {
      setModalOpen(false);
      setRoleItemData(initRoleItem);
    }
  };

  const handleRoleLists = useCallback(() => {
    const query = {
      sort: { orderBy: "_id", orderDirection: "asc" },
      purpose: "manage", // Only show manageable roles (excludes default roles for non-Super Admin)
    };

    dispatch(getRoleList(query));
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
        cancelButtonText:t("Cancel"),
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
    if (store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content role-main">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Roles")}</h3>
        </div>

        {/* Default Roles section — Super Admin only */}
        {isAdmin && store?.roleItems?.some((item) => item?.isDefault) && (
          <>
            <div className="mb-1 mt-1">
              <h5 className="text-muted fw-bold">{t("Default Roles")}</h5>
              <small className="text-muted">{t("These roles are system-defined. Only permissions can be configured.")}</small>
            </div>
            <Row className="mb-2">
              {store.roleItems
                .filter((item) => item?.isDefault)
                .map((item, ind) => (
                  <Col key={`default-${ind}`} xl={4} md={6} className="mb-2">
                    <Card className="h-100 m-0">
                      <CardBody>
                        <div className="pt-25">
                          <div className="role-heading">
                            <h4 className="fw-bolder mb-1 text-break">{item?.name || ""}</h4>
                          </div>
                          <div className="d-flex align-items-center justify-content-end">
                            <div className="actions d-flex align-items-center">
                              <Link
                                to={`${appsRoot}/roles/permission/${item?._id}`}
                                className="text-body"
                                title="Configure Permissions"
                              >
                                <Settings className="font-medium-5 me-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))}
            </Row>
          </>
        )}

        {/* Custom Roles section — always rendered when user can create or custom roles exist */}
        {(isAdmin || canCreateRole || store?.roleItems?.some((item) => !item?.isDefault)) && (
          <>
            {isAdmin && (
              <div className="mb-1 mt-1">
                <h5 className="text-muted fw-bold">{t("Custom Roles")}</h5>
              </div>
            )}
            <Row>
              {store.roleItems
                .filter((item) => !item?.isDefault)
                .map((item, ind) => (
                  <Col key={`custom-${ind}`} xl={4} md={6} className="mb-2">
                    <Card className="h-100 m-0">
                      <CardBody>
                        <div className="pt-25">
                          <div className="role-heading">
                            <h4 className="fw-bolder mb-1 text-break">{item?.name || ""}</h4>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            {canEditRole && (
                              <Link
                                to="/"
                                className="role-edit-modal"
                                onClick={(event) => {
                                  event.preventDefault();
                                  handleEdit(item);
                                }}
                              >
                                <small className="fw-bolder">
                                  {t("Edit Role")}
                                </small>
                              </Link>
                            )}

                            <div className="actions d-flex align-items-center">
                              {canEditRole ? (
                                <Link
                                  to={`${appsRoot}/roles/permission/${item?._id}`}
                                  className="text-body"
                                  title="Module Permission"
                                >
                                  <Settings className="font-medium-5 me-1" />
                                </Link>
                              ) : null}

                              {!item?.isDefault && (isAdmin || canDeleteRole) ? (
                                <Link
                                  to=""
                                  className="text-body"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    handleDelete(item?._id);
                                  }}
                                >
                                  <Trash2 className="font-medium-5 me-2" />
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))}

              {/* Add New Role card — always visible when user has permission */}
              {(isAdmin || canCreateRole) && (
                <Col xl={4} md={6} className="mb-2">
                  <Card className="h-100 m-0">
                    <Row>
                      <Col sm={12}>
                        <CardBody>
                          <div className="buttons">
                            <Button
                              color="primary"
                              className="text-nowrap"
                              onClick={() => openModal()}
                            >
                              {t("Add New Role")}
                            </Button>
                          </div>
                          <p className="mb-0 add-role">
                            {t("Add a new role, if it does not exist")}
                          </p>
                        </CardBody>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              )}
            </Row>
          </>
        )}

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
