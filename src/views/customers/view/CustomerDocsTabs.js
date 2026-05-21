// Invoices | Purchase Orders | Quotations | PFIs tabs for the customer
// detail page. Tab order matches the user's spec.

import { useState } from "react";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import { FileText, Truck, File, Layers } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import CustomerInvoicesPanel from "./CustomerInvoicesPanel";
import CustomerPosPanel from "./CustomerPosPanel";
import CustomerQuotationsPanel from "./CustomerQuotationsPanel";
import CustomerPfisPanel from "./CustomerPfisPanel";

const CustomerDocsTabs = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("invoices");

  const quotationCount = useSelector(
    (s) => (s.quotation?.quotationItems || []).length
  );
  const pfiCount = useSelector((s) => (s.pfi?.pfiItems || []).length);
  const poCount = useSelector(
    (s) => (s.purchaseOrder?.purchaseOrderItems || []).length
  );

  const tabBtn = (key, label, Icon, count) => (
    <NavItem>
      <NavLink
        active={active === key}
        onClick={() => setActive(key)}
        style={{
          color: active === key ? "#fff" : "#1a2238",
          display: "inline-flex",
          alignItems: "center",
          height: 38,
          padding: "0 14px",
        }}
      >
        <Icon size={16} className="me-50" />
        {label}
        {count > 0 ? (
          <span
            className="badge ms-1"
            style={{
              background:
                active === key ? "rgba(255,255,255,0.25)" : "#eef0f3",
              color: active === key ? "#fff" : "#1a2238",
            }}
          >
            {count}
          </span>
        ) : null}
      </NavLink>
    </NavItem>
  );

  return (
    <Card className="mb-1">
      <CardBody>
        <Nav pills className="mb-2">
          {tabBtn("invoices", t("Invoices"), File, 0)}
          {tabBtn("pos", t("Purchase Orders"), Truck, poCount)}
          {tabBtn("quotations", t("Quotations"), FileText, quotationCount)}
          {tabBtn("pfis", t("PFIs"), Layers, pfiCount)}
        </Nav>

        <TabContent activeTab={active}>
          <TabPane tabId="invoices">
            <CustomerInvoicesPanel />
          </TabPane>
          <TabPane tabId="pos">
            <CustomerPosPanel />
          </TabPane>
          <TabPane tabId="quotations">
            <CustomerQuotationsPanel />
          </TabPane>
          <TabPane tabId="pfis">
            <CustomerPfisPanel />
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default CustomerDocsTabs;
