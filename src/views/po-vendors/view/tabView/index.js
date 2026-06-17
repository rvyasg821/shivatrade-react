// POV detail-page tab panel — Card-wrapped Nav pills + TabContent, same
// shape and styling as PfiRelatedDocsTabs so the section aligns with the
// right-hand Share panel.

import { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import { FileText, Percent, Inbox, CornerUpLeft } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import OverviewTab from "./OverviewTab";
import ExpensesTab from "./ExpensesTab";
import GrnsTab from "./GrnsTab";
import DebitNotesTab from "./DebitNotesTab";

const PoVendorTabView = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("overview");

  // The active tab registers its own action buttons here, rendered on the
  // right of the tab bar (same pattern as the Lead / Quotation detail tabs).
  const [tabActions, setTabActions] = useState(null);
  const registerActions = useCallback((node) => setTabActions(node || null), []);

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
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-2">
          <Nav pills className="mb-0">
            {tabBtn("overview", t("Line Items"), FileText, linesCount)}
            {tabBtn("expenses", t("Expenses"), Percent, expensesCount)}
            {tabBtn("grns", t("GRNs"), Inbox, 0)}
            {tabBtn("debitnotes", t("Debit Notes"), CornerUpLeft, 0)}
          </Nav>
          {tabActions ? (
            <div className="d-flex gap-1">{tabActions}</div>
          ) : null}
        </div>

        <TabContent activeTab={active}>
          <TabPane tabId="overview">
            {active === "overview" && (
              <OverviewTab registerActions={registerActions} />
            )}
          </TabPane>
          <TabPane tabId="expenses">
            {active === "expenses" && (
              <ExpensesTab registerActions={registerActions} />
            )}
          </TabPane>
          <TabPane tabId="grns">
            {active === "grns" && (
              <GrnsTab registerActions={registerActions} />
            )}
          </TabPane>
          <TabPane tabId="debitnotes">
            {active === "debitnotes" && (
              <DebitNotesTab registerActions={registerActions} />
            )}
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default PoVendorTabView;
