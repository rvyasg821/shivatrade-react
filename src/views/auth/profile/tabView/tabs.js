import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { User, Lock, Briefcase } from "react-feather";
import { useSelector } from "react-redux";

const Tabs = ({ active, accountKey, changePasswordKey, companyKey, toggleTab }) => {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name?.toLowerCase() || "";
  const isCompanyAdmin = roleName === "company admin";

  return (
    <Fragment>
      <Nav pills className="mb-1 d-flex">
        {isCompanyAdmin && (
          <NavItem>
            <NavLink active={active === companyKey} onClick={() => toggleTab(companyKey)}>
              <Briefcase className="font-medium-3 me-50" />
              <span className="fw-bold">{t("Company Information")}</span>
            </NavLink>
          </NavItem>
        )}
        <NavItem>
          <NavLink active={active === accountKey} onClick={() => toggleTab(accountKey)}>
            <User className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Account")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink active={active === changePasswordKey} onClick={() => toggleTab(changePasswordKey)}>
            <Lock className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Change Password")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  );
};

export default Tabs;
