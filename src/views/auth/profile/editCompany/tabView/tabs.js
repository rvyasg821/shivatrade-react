// ** React Imports
import { Fragment } from "react";

// ** Reactstrap Imports
import { Nav, NavItem, NavLink } from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { getPaymentList, cleanPaymentMessage } from "@src/views/payment/store/";
import { getSubscriptionList } from "@src/views/subscription/store/"; // adjust path if needed

// ** Icons Imports
import { User, FileText, CreditCard } from "react-feather";
import { useSelector } from "react-redux";

const Tabs = ({ active, accountKey, subscriptionKey, paymentKey, toggleTab }) => {
  const { t } = useTranslation();

  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name;
  const isSystemUser = user?.authUserItem?.isSystemUser;

  // Company Admins and System Admins should be able to see administration tabs
  const canSeeAdminTabs =
    roleName === "Company Admin" ||
    roleName === "Admin" ||
    isSystemUser;

  return (
    <Fragment>
      <Nav pills className="mb-1">


        {/* Subscription Tab */}
        {canSeeAdminTabs && (
          <>
            <NavItem>
              <NavLink
                active={active === subscriptionKey}
                onClick={() => toggleTab(subscriptionKey)}
              >
                <FileText className="font-medium-3 me-50" />
                <span className="fw-bold">{t("Subscription")}</span>
              </NavLink>
            </NavItem>

            {/* Payment Tab */}
            <NavItem>
              <NavLink
                active={active === paymentKey}
                onClick={() => toggleTab(paymentKey)}
              >
                <CreditCard className="font-medium-3 me-50" />
                <span className="fw-bold">{t("Payment")}</span>
              </NavLink>
            </NavItem>
          </>
        )}
      </Nav>
    </Fragment>
  );
};

export default Tabs;
