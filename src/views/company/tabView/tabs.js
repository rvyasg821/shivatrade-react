// ** React Imports
import { Fragment } from "react";

// ** Reactstrap Imports
import { Nav, NavItem, NavLink } from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Imports
import { User, Lock,FileText,CreditCard } from "react-feather";

const Tabs = ({
  active,
  accountKey,
  changePasswordKey,
  toggleTab,
}) => {
  // ** Hooks
  const { t } = useTranslation();

  return (
    <Fragment>
      <Nav pills className="mb-1">
        <NavItem>
          <NavLink
            active={active === accountKey}
            onClick={() => toggleTab(accountKey)}
          >
            <FileText className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Subscription")}</span>
          </NavLink>
        </NavItem>

        <NavItem>
          <NavLink
            active={active === changePasswordKey}
            onClick={() => toggleTab(changePasswordKey)}
          >
            <CreditCard className="font-medium-3 me-50" />
            <span className="fw-bold">{t("Payment")}</span>
          </NavLink>
        </NavItem>
      </Nav>
    </Fragment>
  )
}

export default Tabs;
