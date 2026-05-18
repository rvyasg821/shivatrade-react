// ── PFI Detail page ──────────────────────────────────────────────────
// Two-column: InfoCard (header summary + status) on the left, tabbed
// detail (Overview + Public Link) on the right. Mirrors the Quotation
// detail page; Public Link tab is wired in Phase 5.

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Col, Row } from "reactstrap";

import { getPfi, cleanPfiMessage } from "@src/views/pfi/store";
import Notification from "@components/toast/notification";

import PfiInfoCard from "./PfiInfoCard";
import PfiTabView from "./tabView";

import "@styles/react/apps/app-users.scss";

const ViewPfi = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.pfi);

  useEffect(() => {
    if (id) dispatch(getPfi(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPfiMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <PfiInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <PfiTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewPfi;
