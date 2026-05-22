import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { FileText, Truck } from "react-feather";

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
            active={active === "purchase_orders"}
            onClick={() => toggleTab("purchase_orders")}
          >
            <Truck className="font-medium-3 me-50" />
            <span className="fw-bold">{t("PO Vendors")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  );
};

export default Tabs;
