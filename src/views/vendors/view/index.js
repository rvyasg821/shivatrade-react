// ── Vendor View page ──────────────────────────────────────────────────
// Two-column layout mirroring the Employee view: info card on the left,
// tab-switched detail panes on the right (Price List / Addresses / Bank
// Accounts / Contacts).

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Col, Row } from "reactstrap";

import { getVendor, cleanVendorMessage } from "@src/views/vendors/store";
import Notification from "@components/toast/notification";

import VendorInfoCard from "./VendorInfoCard";
import VendorTabView from "./tabView";

import "@styles/react/apps/app-users.scss";

const ViewVendor = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.vendor);

  useEffect(() => {
    if (id) dispatch(getVendor(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanVendorMessage());
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <VendorInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <VendorTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewVendor;
