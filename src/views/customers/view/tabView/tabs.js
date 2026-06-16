import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { MapPin, Users, FileText, File } from "react-feather";

import { PFI_RETIRED } from "@src/configs/appMode";

const Tabs = ({ active, toggleTab }) => {
  const { t } = useTranslation();
  return (
    <Fragment>
      <Nav pills className="mb-1">
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
            active={active === "contacts"}
            onClick={() => toggleTab("contacts")}
          >
            <Users className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Contacts")}</span>
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
        {!PFI_RETIRED && (
          <NavItem>
            <NavLink
              active={active === "pfis"}
              onClick={() => toggleTab("pfis")}
            >
              <File className="font-medium-3 me-50" />
              <span className="fw-bold">{t("PFIs")}</span>
            </NavLink>
          </NavItem>
        )}
      </Nav>
    </Fragment>
  );
};

export default Tabs;
