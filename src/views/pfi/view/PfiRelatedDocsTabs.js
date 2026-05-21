// Tabbed panel hosting "Line Items" and "Purchase Orders" on the PFI
// detail page. Each tab renders in bare mode (no inner Card).

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import { Layers, Truck, BarChart2 } from "react-feather";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import PfiLineItemsPanel from "./PfiLineItemsPanel";
import PfiPosPanel from "./PfiPosPanel";
import SourceCoveragePanel from "@src/views/_shared/sales-doc/SourceCoveragePanel";

const PfiRelatedDocsTabs = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const [active, setActive] = useState("lines");
  const [posLoaded, setPosLoaded] = useState(false);

  // Fetch only the POs that belong to this PFI so the count badge is accurate.
  // Until the response lands we keep `posLoaded` false to avoid showing a
  // stale count from the PO listing page.
  useEffect(() => {
    if (!id) return;
    setPosLoaded(false);
    dispatch(cleanPurchaseOrderMessage(null));
    dispatch(
      getPurchaseOrderList({
        orderBy: "po_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        pfi_id: id,
      })
    ).finally(() => setPosLoaded(true));
  }, [id, dispatch]);

  const { pfiItem } = useSelector((s) => s.pfi);
  const posItems = useSelector(
    (s) => s.purchaseOrder?.purchaseOrderItems || []
  );
  const posCount = posLoaded ? posItems.length : 0;
  const linesCount = (pfiItem?.lines || []).length;

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
          {tabBtn("pos", t("Purchase Orders"), Truck, posCount)}
          {tabBtn("coverage", t("PO Coverage"), BarChart2, 0)}
        </Nav>

        <TabContent activeTab={active}>
          <TabPane tabId="lines">
            <PfiLineItemsPanel bare />
          </TabPane>
          <TabPane tabId="pos">
            {active === "pos" && <PfiPosPanel bare />}
          </TabPane>
          <TabPane tabId="coverage">
            {active === "coverage" && (
              <SourceCoveragePanel sourceType="pfi" sourceId={id} />
            )}
          </TabPane>
        </TabContent>
      </CardBody>
    </Card>
  );
};

export default PfiRelatedDocsTabs;
