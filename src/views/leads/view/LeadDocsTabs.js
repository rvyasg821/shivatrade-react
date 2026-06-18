// Tabbed panel on the lead detail page: Requirement Items (default) + RFQ +
// Quotation. Pill-style tabs matching the quotation detail page.

import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Button,
} from "reactstrap";
import { Layers, Send, FileText, Plus } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { appsRoot } from "@constant/defaultValues";
import RequirementItemsPanel from "./RequirementItemsPanel";
import RfqsPanel from "./RfqsPanel";
import QuotationsPanel from "./QuotationsPanel";

const LeadDocsTabs = ({ onActiveTabChange }) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState("requirement");

  // Report the active tab so the parent can pin the Activity panel height to
  // the Line Items ("requirement") tab only — not the RFQ / Quotation tabs.
  const selectTab = useCallback(
    (key) => {
      setActive(key);
      onActiveTabChange?.(key);
    },
    [onActiveTabChange]
  );

  // Context-aware shortcut on the right of the tab bar — its action follows
  // the active tab: add a requirement line, raise an RFQ, or start a
  // quotation, each pre-linked to this lead.
  const headerAction = {
    requirement: {
      label: t("Add Line"),
      onClick: () => navigate(`${appsRoot}/leads/edit/${id}?step=2`),
    },
    rfq: {
      label: t("Create RFQ"),
      onClick: () => navigate(`${appsRoot}/rfq/view/new?lead_id=${id}`),
    },
    quotation: {
      label: t("Create Quote"),
      onClick: () => navigate(`${appsRoot}/quotations/add?lead_id=${id}`),
    },
  }[active];

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
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-2">
        <Nav pills className="flex-wrap mb-0">
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;
            return (
              <NavItem key={tab.key}>
                <NavLink
                  active={isActive}
                  onClick={() => selectTab(tab.key)}
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
          {headerAction && (
            <Button color="primary" size="sm" onClick={headerAction.onClick}>
              <Plus size={14} className="me-25" />
              {headerAction.label}
            </Button>
          )}
        </div>

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
