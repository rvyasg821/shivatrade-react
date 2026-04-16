// ** React Imports
import { Fragment } from "react";

// ** Reactstrap Imports
import { Nav, NavItem, NavLink } from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Imports
import { Clock, Calendar, FileText, File, Shield } from "react-feather";

const Tabs = ({ active, toggleTab, toolFlags = {} }) => {
  const { t } = useTranslation();

  return (
    <Fragment>
      <Nav pills className="mb-1">
        {toolFlags.attendance && (
          <NavItem>
            <NavLink
              active={active === "attendance"}
              onClick={() => toggleTab("attendance")}
            >
              <Clock className="font-medium-3 me-50" />
              <span className="fw-bold">{t("Attendance")}</span>
            </NavLink>
          </NavItem>
        )}

        {toolFlags.leave && (
          <NavItem>
            <NavLink
              active={active === "leave"}
              onClick={() => toggleTab("leave")}
            >
              <Calendar className="font-medium-3 me-50" />
              <span className="fw-bold">{t("Leave")}</span>
            </NavLink>
          </NavItem>
        )}

        {toolFlags.documents && (
          <NavItem>
            <NavLink
              active={active === "documents"}
              onClick={() => toggleTab("documents")}
            >
              <FileText className="font-medium-3 me-50" />
              <span className="fw-bold">{t("Documents")}</span>
            </NavLink>
          </NavItem>
        )}

        {toolFlags.contracts && (
          <NavItem>
            <NavLink
              active={active === "contracts"}
              onClick={() => toggleTab("contracts")}
            >
              <File className="font-medium-3 me-50" />
              <span className="fw-bold">{t("Contracts")}</span>
            </NavLink>
          </NavItem>
        )}

        {toolFlags.compliance && (
          <NavItem>
            <NavLink
              active={active === "compliance"}
              onClick={() => toggleTab("compliance")}
            >
              <Shield className="font-medium-3 me-50" />
              <span className="fw-bold">{t("Compliance")}</span>
            </NavLink>
          </NavItem>
        )}
      </Nav>
    </Fragment>
  );
};

export default Tabs;
