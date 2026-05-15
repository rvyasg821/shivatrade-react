// ── Customer View page ────────────────────────────────────────────────
// Two-column layout: InfoCard on the left, tabbed details on the right.
// Mirrors the Vendor view page.

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Col, Row } from "reactstrap";

import { getCustomer, cleanCustomerMessage } from "@src/views/customers/store";
import Notification from "@components/toast/notification";

import CustomerInfoCard from "./CustomerInfoCard";
import CustomerTabView from "./tabView";

import "@styles/react/apps/app-users.scss";

const ViewCustomer = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.customer);

  useEffect(() => {
    if (id) dispatch(getCustomer(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCustomerMessage());
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <CustomerInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <CustomerTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewCustomer;
