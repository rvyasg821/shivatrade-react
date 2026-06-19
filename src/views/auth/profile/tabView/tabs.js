import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { User, Lock, Briefcase, MapPin, CreditCard } from "react-feather";
import { useSelector } from "react-redux";

const Tabs = ({ active, accountKey, changePasswordKey, companyKey, addressKey, bankKey, toggleTab }) => {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name?.toLowerCase() || "";
  const isCompanyAdmin = roleName === "company admin";

  // Pill styling matched to the shared detail-page tabs (navy active pill).
  const pillStyle = (key) => ({
    color: active === key ? "#fff" : "#1a2238",
    display: "inline-flex",
    alignItems: "center",
    height: 38,
    padding: "0 14px",
  });

  return (
    <Fragment>
      <Nav pills className="mb-2 d-flex flex-wrap">
        {isCompanyAdmin && (
          <NavItem>
            <NavLink
              active={active === companyKey}
              onClick={() => toggleTab(companyKey)}
              style={pillStyle(companyKey)}
            >
              <Briefcase size={16} className="me-50" />
              <span className="fw-bold">{t("Company Information")}</span>
            </NavLink>
          </NavItem>
        )}
        {isCompanyAdmin && (
          <NavItem>
            <NavLink
              active={active === addressKey}
              onClick={() => toggleTab(addressKey)}
              style={pillStyle(addressKey)}
            >
              <MapPin size={16} className="me-50" />
              <span className="fw-bold">{t("Addresses")}</span>
            </NavLink>
          </NavItem>
        )}
        {isCompanyAdmin && (
          <NavItem>
            <NavLink
              active={active === bankKey}
              onClick={() => toggleTab(bankKey)}
              style={pillStyle(bankKey)}
            >
              <CreditCard size={16} className="me-50" />
              <span className="fw-bold">{t("Bank Accounts")}</span>
            </NavLink>
          </NavItem>
        )}
        <NavItem>
          <NavLink
            active={active === accountKey}
            onClick={() => toggleTab(accountKey)}
            style={pillStyle(accountKey)}
          >
            <User size={16} className="me-50" />
            <span className="fw-bold">{t("Account")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === changePasswordKey}
            onClick={() => toggleTab(changePasswordKey)}
            style={pillStyle(changePasswordKey)}
          >
            <Lock size={16} className="me-50" />
            <span className="fw-bold">{t("Change Password")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  );
};

export default Tabs;
