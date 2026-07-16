import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { FileText, Truck, Users, MapPin, CreditCard, BookOpen } from "react-feather";

const TAB_DEFS = [
  { key: "price_list", label: "Price List", icon: FileText },
  { key: "purchase_orders", label: "Purchase Orders", icon: Truck },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "bank_accounts", label: "Bank Accounts", icon: CreditCard },
  { key: "ledger", label: "Ledger", icon: BookOpen },
];

const Tabs = ({ active, toggleTab }) => {
  const { t } = useTranslation();

  return (
    <Fragment>
      <Nav pills className="mb-1 flex-wrap">
        {TAB_DEFS.map(({ key, label, icon: Icon }) => (
          <NavItem key={key}>
            <NavLink active={active === key} onClick={() => toggleTab(key)}>
              <Icon className="font-medium-3 me-50" />
              <span className="fw-bold">{t(label)}</span>
            </NavLink>
          </NavItem>
        ))}
      </Nav>
    </Fragment>
  );
};

export default Tabs;
