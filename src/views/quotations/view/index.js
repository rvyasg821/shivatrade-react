// ── Quotation Detail page ────────────────────────────────────────────
// Two-column: InfoCard (header summary + status) on the left, tabbed
// detail (Overview + Public Link) on the right. Mirrors the Lead /
// Customer / Vendor view pages.

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Col, Row } from "reactstrap";

import { getQuotation, cleanQuotationMessage } from "@src/views/quotations/store";
import Notification from "@components/toast/notification";

import QuotationInfoCard from "./QuotationInfoCard";
import QuotationTabView from "./tabView";

import "@styles/react/apps/app-users.scss";

const ViewQuotation = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.quotation);

  useEffect(() => {
    if (id) dispatch(getQuotation(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanQuotationMessage());
  }, [store?.success, store?.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <QuotationInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <QuotationTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewQuotation;
