// Employee detail page — composes the shared detail-page kit so it reads like
// the rest of the app (quotation / lead / customer / SO / POV / invoice).
// Layout:
//   1. Header (sticky) — avatar, name, status, role + contact, edit/back
//   2. Two-panel row:
//        Left  — Tabs (Attendance | Leave | Documents | Contracts | Compliance)
//        Right — Details panel (About + Employment)

import { Fragment, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Edit, ArrowLeft, Mail, Briefcase, Hash } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getEmployee,
  cleanEmployeeMessage,
} from "@src/views/employees/store";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";

import {
  DetailHeader,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import EmployeeTabView from "./tabView/";
import EmployeeDetailsPanel from "./EmployeeDetailsPanel";

// ** Styles
import "@styles/react/apps/app-users.scss";

const ViewEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((state) => state.employee);
  const p = store?.employeeItem || {};

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.employee;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;

  useEffect(() => {
    if (id) dispatch(getEmployee(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanEmployeeMessage());
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  const fullName =
    p?.first_name && p?.last_name
      ? `${p.first_name} ${p.last_name}`
      : p?.name || "-";

  const roleName =
    typeof p?.role === "object" ? p?.role?.name : p?.roleName || "";

  const isActive = p?.is_active !== false;

  // Contact line under the name (role · email).
  const subtitle =
    roleName || p?.email ? (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {roleName ? (
          <span className="d-inline-flex align-items-center text-capitalize">
            <Briefcase size={13} className="me-25" />
            {roleName}
          </span>
        ) : null}
        {p?.email ? (
          <span className="d-inline-flex align-items-center">
            <Mail size={13} className="me-25" />
            {p.email}
          </span>
        ) : null}
      </span>
    ) : null;

  // Meta line — code + designation.
  const meta =
    p?.employee_code || p?.designation ? (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {p?.employee_code ? (
          <span className="d-inline-flex align-items-center text-uppercase">
            <Hash size={12} className="me-25" />
            {p.employee_code}
          </span>
        ) : null}
        {p?.designation ? (
          <span className="ms-1 text-capitalize">{p.designation}</span>
        ) : null}
      </span>
    ) : null;

  const headerActions = [
    ...(canEdit
      ? [
          {
            icon: Edit,
            label: t("Edit"),
            onClick: () => navigate(`${appsRoot}/employees/edit/${id}`),
          },
        ]
      : []),
    {
      icon: ArrowLeft,
      label: t("Back"),
      onClick: () => navigate(-1),
    },
  ];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText={fullName}
          title={fullName}
          subtitle={subtitle}
          meta={meta}
          badge={{
            label: isActive ? t("Active") : t("Inactive"),
            color: isActive ? "success" : "warning",
          }}
          actions={headerActions}
          moreActions={[]}
        />

        <DetailTwoPanel
          ratio="9-3"
          left={<EmployeeTabView />}
          right={<EmployeeDetailsPanel />}
        />
      </div>
    </Fragment>
  );
};

export default ViewEmployee;
