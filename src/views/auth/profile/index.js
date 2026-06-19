// ** React Imports
import { Fragment, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { cleanAuthMessage } from "@src/views/auth/store";
import { startLoading, stopLoading } from "../../loadingstore";
import { getCompanyDetails } from "./editCompany/store";

// ** Reactstrap Imports
import { Spinner } from "reactstrap";
import { ArrowLeft } from "react-feather";
import { useTranslation } from "react-i18next";

// ** Custom Components
import Notification from "@components/toast/notification";
import { DetailHeader } from "@src/views/_shared/detail-page";
import ProfileTabView from "./tabView";

// ** Styles
import "@styles/react/apps/app-users.scss";

const Profile = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const store = useSelector((state) => state.auth);
  const company = useSelector((state) => state.company?.companyItem || {});

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanAuthMessage(null));
    }
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  // Loading management
  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  // Permission check
  const profile = store?.authUserItem;
  const roleName = profile?.role?.name?.toLowerCase() || "";
  const isUser = profile?.isSystemUser === true;
  const isCompanyAdmin = roleName === "company admin";
  const isSuperAdmin = roleName === "super admin" || roleName === "admin";

  // Fetch company data for all company-level roles.
  useEffect(() => {
    if (!isSuperAdmin && !isUser) dispatch(getCompanyDetails());
  }, [isSuperAdmin, isUser, dispatch]);

  if (!store?.loading || !profile) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "70vh" }}
      >
        <Spinner color="primary" />
      </div>
    );
  }

  // ── Header identity (company-facing for admins, else the user) ──
  const title =
    isCompanyAdmin && company?.company_name
      ? company.company_name
      : profile?.name || t("Profile");
  const subtitle =
    [isCompanyAdmin && profile?.name ? profile.name : null, profile?.email]
      .filter(Boolean)
      .join(" · ") || null;

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText={title}
          title={title}
          subtitle={subtitle}
          badge={
            profile?.role?.name
              ? { label: profile.role.name, color: "primary" }
              : undefined
          }
          actions={[
            {
              icon: ArrowLeft,
              label: t("Back"),
              color: "secondary",
              outline: true,
              onClick: () => navigate(-1),
            },
          ]}
        />

        <ProfileTabView />
      </div>
    </Fragment>
  );
};

export default Profile;
