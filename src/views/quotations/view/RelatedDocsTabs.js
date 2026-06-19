// Tabbed panel hosting "Line Items" and "PFIs" on the quotation detail page.
// Each tab renders its panel in bare mode (no inner Card), so the outer
// DetailPanel owns the chrome and tab nav.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { FileText, Layers, Plus, Truck } from "react-feather";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import LineItemsPanel from "./LineItemsPanel";
import PfisPanel from "./PfisPanel";
import { PFI_RETIRED } from "@src/configs/appMode";
import { appsRoot } from "@constant/defaultValues";

const RelatedDocsTabs = ({ canGenerate = false, onGenerate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { quotationItem } = useSelector((s) => s.quotation);
  const pfiItems = useSelector((s) => s.pfi?.pfiItems || []);
  const linesCount = (quotationItem?.lines || []).length;
  const pfisCount = pfiItems.length;
  const isDraft = (quotationItem?.status || "").toLowerCase() === "draft";
  const [active, setActive] = useState("lines");

  return (
    <Card className="mb-1">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
        <Nav pills className="mb-0">
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
          {/* PFIs tab hidden — PFI retired from the workflow (S4). */}
          {!PFI_RETIRED && (
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
          )}
        </Nav>
          {active === "lines" && (
            <div className="d-flex gap-1">
              {isDraft && quotationItem?._id && (
                <Button
                  color="outline-primary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `${appsRoot}/quotations/edit/${quotationItem._id}?step=2`
                    )
                  }
                >
                  <Plus size={14} className="me-25" /> {t("Add Line")}
                </Button>
              )}
              {canGenerate && (
                <Button color="success" size="sm" onClick={onGenerate}>
                  <Truck size={14} className="me-25" />{" "}
                  {t("Generate Sales Order")}
                </Button>
              )}
            </div>
          )}
        </div>

        <TabContent activeTab={active}>
          <TabPane tabId="lines">
            <LineItemsPanel bare />
          </TabPane>
          {!PFI_RETIRED && (
            <TabPane tabId="pfis">
              <PfisPanel bare />
            </TabPane>
          )}
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default RelatedDocsTabs;
