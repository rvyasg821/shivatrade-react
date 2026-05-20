import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { FileText, Link2, Truck } from "react-feather";

const Tabs = ({ active, toggleTab }) => {
  const { t } = useTranslation();
  return (
    <Fragment>
      <Nav pills className="mb-1">
        <NavItem>
          <NavLink
            active={active === "overview"}
            onClick={() => toggleTab("overview")}
          >
            <FileText className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Overview")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "pos"}
            onClick={() => toggleTab("pos")}
          >
            <Truck className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Purchase Orders")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "public-link"}
            onClick={() => toggleTab("public-link")}
          >
            <Link2 className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Public Link")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  );
};

export default Tabs;
