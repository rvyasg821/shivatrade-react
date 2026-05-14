import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Activity, FileText, Info } from "react-feather";

const Tabs = ({ active, toggleTab }) => {
  const { t } = useTranslation();
  return (
    <Fragment>
      <Nav pills className="mb-1">
        <NavItem>
          <NavLink
            active={active === "activity"}
            onClick={() => toggleTab("activity")}
          >
            <Activity className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Activity")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "quotations"}
            onClick={() => toggleTab("quotations")}
          >
            <FileText className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Quotations")}</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={active === "details"}
            onClick={() => toggleTab("details")}
          >
            <Info className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Details")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  );
};

export default Tabs;
