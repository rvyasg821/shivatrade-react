// Tabbed panel hosting "Line Items" and "PFIs" on the quotation detail page.
// Each tab renders its panel in bare mode (no inner Card), so the outer
// DetailPanel owns the chrome and tab nav.

import { useState } from "react";
import { Card, CardBody, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import { FileText, Layers } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import LineItemsPanel from "./LineItemsPanel";
import PfisPanel from "./PfisPanel";

const RelatedDocsTabs = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("lines");
  const { quotationItem } = useSelector((s) => s.quotation);
  const pfiItems = useSelector((s) => s.pfi?.pfiItems || []);
  const linesCount = (quotationItem?.lines || []).length;
  const pfisCount = pfiItems.length;

  return (
    <Card className="mb-1">
      <CardBody>
        <Nav pills className="mb-2">
          <NavItem>
            <NavLink
              active={active === "lines"}
              onClick={() => setActive("lines")}
              style={{
                color: active === "lines" ? "#fff" : "#1a2238",
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 14px",
              }}
            >
              <Layers size={16} className="me-50" />
              {t("Line Items")}
              {linesCount > 0 ? (
                <span
                  className="badge ms-1"
                  style={{
                    background:
                      active === "lines"
                        ? "rgba(255,255,255,0.25)"
                        : "#eef0f3",
                    color: active === "lines" ? "#fff" : "#1a2238",
                  }}
                >
                  {linesCount}
                </span>
              ) : null}
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              active={active === "pfis"}
              onClick={() => setActive("pfis")}
              style={{
                color: active === "pfis" ? "#fff" : "#1a2238",
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 14px",
              }}
            >
              <FileText size={16} className="me-50" />
              {t("PFIs")}
              {pfisCount > 0 ? (
                <span
                  className="badge ms-1"
                  style={{
                    background:
                      active === "pfis"
                        ? "rgba(255,255,255,0.25)"
                        : "#eef0f3",
                    color: active === "pfis" ? "#fff" : "#1a2238",
                  }}
                >
                  {pfisCount}
                </span>
              ) : null}
            </NavLink>
          </NavItem>
        </Nav>

        <TabContent activeTab={active}>
          <TabPane tabId="lines">
            <LineItemsPanel bare />
          </TabPane>
          <TabPane tabId="pfis">
            <PfisPanel bare />
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default RelatedDocsTabs;
