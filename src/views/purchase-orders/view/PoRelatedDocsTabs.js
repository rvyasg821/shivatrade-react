// Tabs hosting Line Items | Coverage | PO Vendors for the PO detail page.

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
import { Layers, Activity, Truck } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import PoLineItemsPanel from "./PoLineItemsPanel";
import {
  usePoCoverage,
  PoCoveragePanel,
  PoVendorsPanel,
} from "./PoCoverageAndVendors";

const PoRelatedDocsTabs = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("lines");
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const linesCount = (purchaseOrderItem?.lines || []).length;

  const coverageData = usePoCoverage();
  const povCount = coverageData.povs.length;

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
          {tabBtn("lines", t("Line Items"), Layers, linesCount)}
          {tabBtn("vendors", t("Vendor POs"), Truck, povCount)}
          {tabBtn("coverage", t("Coverage"), Activity, 0)}
        </Nav>

        <TabContent activeTab={active}>
          <TabPane tabId="lines">
            <PoLineItemsPanel bare />
          </TabPane>
          <TabPane tabId="vendors">
            <PoVendorsPanel data={coverageData} />
          </TabPane>
          <TabPane tabId="coverage">
            <PoCoveragePanel data={coverageData} />
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default PoRelatedDocsTabs;
