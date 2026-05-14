import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { FileText, MapPin, CreditCard, Users } from "react-feather";

const Tabs = ({ active, toggleTab }) => {
  const { t } = useTranslation();

  return (
    <Fragment>
      <Nav pills className="mb-1">
        <NavItem>
          <NavLink
            active={active === "price_list"}
            onClick={() => toggleTab("price_list")}
          >
            <FileText className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Price List")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "addresses"}
            onClick={() => toggleTab("addresses")}
          >
            <MapPin className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Addresses")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "banks"}
            onClick={() => toggleTab("banks")}
          >
            <CreditCard className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Bank Accounts")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "contacts"}
            onClick={() => toggleTab("contacts")}
          >
            <Users className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Contacts")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  );
};

export default Tabs;
