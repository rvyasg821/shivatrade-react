// ── POV Detail page ─────────────────────────────────────────────────
import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Col, Row } from "reactstrap";

import { getPoVendor, cleanPoVendorMessage } from "@src/views/po-vendors/store";
import Notification from "@components/toast/notification";

import PoVendorInfoCard from "./PoVendorInfoCard";
import PoVendorTabView from "./tabView";
import PoVendorDispatchModal from "@src/views/_shared/po-vendor/PoVendorDispatchModal";
import PoVendorReceiveModal from "@src/views/_shared/po-vendor/PoVendorReceiveModal";

import "@styles/react/apps/app-users.scss";

const ViewPoVendor = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.poVendor);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(getPoVendor(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPoVendorMessage());

    // Refresh detail after any state-changing action.
    if (
      id &&
      (store?.actionFlag === "POV_DISPATCHED" ||
        store?.actionFlag === "POV_CLOSED" ||
        store?.actionFlag === "POV_CANCELLED" ||
        store?.actionFlag === "POV_UPDT")
    ) {
      dispatch(getPoVendor(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error, store?.actionFlag]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <PoVendorInfoCard
              onOpenDispatch={() => setDispatchOpen(true)}
              onOpenReceive={() => setReceiveOpen(true)}
            />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <PoVendorTabView />
          </Col>
        </Row>
      </div>
      <PoVendorDispatchModal
        isOpen={dispatchOpen}
        toggle={() => setDispatchOpen((s) => !s)}
      />
      <PoVendorReceiveModal
        isOpen={receiveOpen}
        toggle={() => setReceiveOpen((s) => !s)}
      />
    </Fragment>
  );
};

export default ViewPoVendor;
