// ── PO Detail page ──────────────────────────────────────────────────
import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Col, Row } from "reactstrap";

import {
  getPurchaseOrder,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import Notification from "@components/toast/notification";

import PurchaseOrderInfoCard from "./PurchaseOrderInfoCard";
import PurchaseOrderTabView from "./tabView";

import "@styles/react/apps/app-users.scss";

const ViewPurchaseOrder = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.purchaseOrder);

  useEffect(() => {
    if (id) dispatch(getPurchaseOrder(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPurchaseOrderMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <PurchaseOrderInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <PurchaseOrderTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewPurchaseOrder;
