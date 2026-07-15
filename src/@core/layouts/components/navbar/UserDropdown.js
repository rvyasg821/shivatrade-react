// ** React Imports
import { useEffect, useLayoutEffect } from "react";
import { Link } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { logout, logoutUser, getAuthMe, cleanAuthMessage } from "@src/views/auth/store";
import { clearLocationContext } from "@src/redux/locationContext";
import { clearCreatorContext } from "@src/redux/creatorContext";

// ** Reactstrap Imports
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from "reactstrap";

// ** Utils
import { isUserLoggedIn } from "@utils";

// ** Custom Components
import Avatar from "@components/avatar";

// ** Third Party Components
import { User, Power, Settings } from "react-feather";
import { useTranslation } from "react-i18next";

// ** Constant
import { appsRoot, ADMIN_ROLE_TYPE, hostRestApiUrl } from "@constant/defaultValues";

// ** Default Avatar Image
import defaultAvatar from "@src/assets/images/avatars/avatar.jpeg";


const UserDropdown = () => {
  // ** Hooks
  const { t } = useTranslation();

  // ** Store Vars
  const dispatch = useDispatch();
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const handleLogout = () => {
    // Notify the server first (revokes the session + records "Signed out"). This
    // reads the token synchronously and fires the request before we clear state
    // below, so it goes out authenticated. Best-effort — never blocks logout.
    dispatch(logoutUser());
    dispatch(clearLocationContext()); // Reset so next user gets a fresh location context
    dispatch(clearCreatorContext()); // Reset the Created-By selection for the next user
    dispatch(logout());
  }

  useLayoutEffect(() => {
    // if (isUserLoggedIn()) {
    //   dispatch(getAuthMe({}));
    // }
  }, [dispatch])

  useEffect(() => {
    /* For blank message api called inside */
    if (authStore?.actionFlag) {
      dispatch(cleanAuthMessage(null));
    }
  }, [dispatch, authStore.actionFlag])

  const getBackendImageUrl = (photo) => {
    if (!photo || typeof photo !== "string") return null;


    // Full URL already provided
    if (photo.startsWith("http")) return photo;

    const cleanPath = photo.replace(/^\/+/, ""); // remove starting slashes
    return `${hostRestApiUrl}/${cleanPath}`;
  };

  // Final user avatar (preview from backend or default)
  const userAvatar = getBackendImageUrl(authUserItem?.photo) || false;
  return (
    <UncontrolledDropdown tag="li" className="dropdown-user nav-item">
      <DropdownToggle
        tag="a"
        href="/"
        className="nav-link dropdown-user-link"
        onClick={(event) => event.preventDefault()}

      >

        <div className="user-nav d-sm-flex d-none">
          <span className="user-name fw-bold text-capitalize">
            {authUserItem?.name || ""}
          </span>
          {/* <span className='user-status'>{authUserItem?.role?.name || ''}</span> */}
        </div>
        <Avatar imgWidth="40" imgHeight="40" status="online" img={userAvatar || defaultAvatar} />
      </DropdownToggle>
      <DropdownMenu end>
        <DropdownItem tag={Link} to={`${appsRoot}/profile`}>
          <User size={14} className="me-75" />
          <span className="align-middle">{t("Profile")}</span>
        </DropdownItem>
        {(
          authUserItem?.role?.name === "Company Admin" ||
          authUserItem?.role?.name === "Location Admin"
        ) ? (
          <DropdownItem tag={Link} to={`${appsRoot}/company-settings`}>
            <Settings size={14} className="me-75" />
            <span className="align-middle">{t("General Settings")}</span>
          </DropdownItem>
        ) : null}

        <DropdownItem
          tag={Link}
          to="/login"
          onClick={() => handleLogout()}
        >
          {" "}
          <Power size={14} className="me-75" />
          <span className="align-middle">{t("Logout")}</span>
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );
};

export default UserDropdown;
