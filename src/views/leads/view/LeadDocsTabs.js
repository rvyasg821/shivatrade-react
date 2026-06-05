// Tabbed panel on the lead detail page: Requirement Items (default) + RFQ +
// Quotation. Pill-style tabs matching the quotation detail page.

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
import { Layers, Send, FileText } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import RequirementItemsPanel from "./RequirementItemsPanel";
import RfqsPanel from "./RfqsPanel";
import QuotationsPanel from "./QuotationsPanel";

const LeadDocsTabs = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("requirement");

  const reqCount = (useSelector((s) => s.lead?.leadItem?.lines) || []).length;
  const rfqCount = (useSelector((s) => s.rfq?.rfqItems) || []).length;
  const qtCount = (useSelector((s) => s.quotation?.quotationItems) || []).length;

  const tabs = [
    { key: "requirement", label: t("Line Items"), icon: Layers, count: reqCount },
    { key: "rfq", label: t("RFQ"), icon: Send, count: rfqCount },
    { key: "quotation", label: t("Quotation"), icon: FileText, count: qtCount },
  ];

  return (
    <Card className="mb-1">
      <CardBody>
        <Nav pills className="mb-2 flex-wrap">
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;
            return (
              <NavItem key={tab.key}>
                <NavLink
                  active={isActive}
                  onClick={() => setActive(tab.key)}
                  style={{
                    color: isActive ? "#fff" : "#1a2238",
                    display: "inline-flex",
                    alignItems: "center",
                    height: 38,
                    padding: "0 14px",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={16} className="me-50" />
                  {tab.label}
                  {tab.count > 0 ? (
                    <span
                      className="badge ms-1"
                      style={{
                        background: isActive
                          ? "rgba(255,255,255,0.25)"
                          : "#eef0f3",
                        color: isActive ? "#fff" : "#1a2238",
                      }}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </NavLink>
              </NavItem>
            );
          })}
        </Nav>

        <TabContent activeTab={active}>
          <TabPane tabId="requirement">
            <RequirementItemsPanel embedded />
          </TabPane>
          <TabPane tabId="rfq">
            <RfqsPanel embedded />
          </TabPane>
          <TabPane tabId="quotation">
            <QuotationsPanel embedded />
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default LeadDocsTabs;
