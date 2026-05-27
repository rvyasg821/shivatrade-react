// POV detail-page tab panel — Card-wrapped Nav pills + TabContent, same
// shape and styling as PfiRelatedDocsTabs so the section aligns with the
// right-hand Share panel.

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
import { FileText, Truck, Percent } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import OverviewTab from "./OverviewTab";
import TrackingTab from "./TrackingTab";
import ExpensesTab from "./ExpensesTab";

const PoVendorTabView = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("overview");

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const linesCount = (poVendorItem?.lines || []).length;
  const expensesCount = (poVendorItem?.expenses_snapshot || []).length;

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
          {tabBtn("overview", t("Overview"), FileText, linesCount)}
          {tabBtn("expenses", t("Expenses"), Percent, expensesCount)}
          {tabBtn("tracking", t("Tracking"), Truck, 0)}
        </Nav>

        <TabContent activeTab={active}>
          <TabPane tabId="overview">
            <OverviewTab />
          </TabPane>
          <TabPane tabId="expenses">
            {active === "expenses" && <ExpensesTab />}
          </TabPane>
          <TabPane tabId="tracking">
            {active === "tracking" && <TrackingTab />}
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default PoVendorTabView;
