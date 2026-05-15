// ── Lead View page ────────────────────────────────────────────────────
// Two-column layout: InfoCard on the left, tabbed details on the right.
// Mirrors the Customer / Vendor view pages.

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, Col, Row } from "reactstrap";
import { useTranslation } from "react-i18next";

import { getLead, cleanLeadMessage } from "@src/views/leads/store";
import Notification from "@components/toast/notification";

import LeadInfoCard from "./LeadInfoCard";
import LeadTabView from "./tabView";

import "@styles/react/apps/app-users.scss";

const ViewLead = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.lead);
  const description = store?.leadItem?.description;

  useEffect(() => {
    if (id) dispatch(getLead(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanLeadMessage(null));
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        {description && (
          <Card className="mb-1">
            <CardBody className="py-1">
              <div className="d-flex">
                <div className="me-1 text-muted small fw-bold">
                  {t("Brief")}:
                </div>
                <div
                  className="text-break flex-grow-1"
                  style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
                >
                  {description}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <LeadInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <LeadTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewLead;
