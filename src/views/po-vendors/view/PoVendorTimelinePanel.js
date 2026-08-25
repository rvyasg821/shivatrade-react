// Event timeline panel for the POV detail page right column.
// Owns its own tracking-event fetch + add/retract handlers so it can live
// outside the Tracking tab (which keeps the editable transport form).

import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, Button, UncontrolledTooltip } from "reactstrap";
import { Plus } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getTrackingEventsByPov,
  deleteTrackingEvent,
  cleanTrackingEventMessage,
} from "@src/views/tracking/store";
import TrackingTimeline from "@src/views/_shared/tracking/TrackingTimeline";
import AddTrackingEventModal from "@src/views/_shared/tracking/AddTrackingEventModal";
import Notification from "@components/toast/notification";
import { isAdminUser } from "@constant/defaultValues";

const PoVendorTimelinePanel = ({ height }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const { poVendorItem, actionFlag: povActionFlag } = useSelector(
    (s) => s.poVendor
  );
  const trackingStore = useSelector((s) => s.trackingEvent);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = poVendorItem || {};
  const status = (p?.status || "").toLowerCase();
  const [addEventOpen, setAddEventOpen] = useState(false);

  // Load on POV id change.
  useEffect(() => {
    if (id) dispatch(getTrackingEventsByPov(id));
  }, [id, dispatch]);

  // Refresh after any POV state transition that emits a system event.
  useEffect(() => {
    if (!id) return;
    if (
      povActionFlag === "POV_DISPATCHED" ||
      povActionFlag === "POV_CLOSED" ||
      povActionFlag === "POV_CANCELLED" ||
      povActionFlag === "POV_REVERTED" ||
      povActionFlag === "POV_UPDT" ||
      povActionFlag === "POV_PAY_SCS" ||
      povActionFlag === "POV_PAY_VOID_SCS"
    ) {
      dispatch(getTrackingEventsByPov(id));
    }
  }, [povActionFlag, id, dispatch]);

  // Permission gates.
  const isAdmin = isAdminUser(authUserItem);
  const trackingPerms = authUserItem?.role?.permissions?.tracking;
  const canAddTrackingEvent =
    isAdmin || trackingPerms?.can_all || trackingPerms?.can_add;
  const canRetractEvent =
    isAdmin || trackingPerms?.can_all || trackingPerms?.can_delete;

  const statusAllowsAdd = status === "dispatched" || status === "closed";
  const canAddEvent = statusAllowsAdd && canAddTrackingEvent;
  const addEventTooltip = !canAddTrackingEvent
    ? t("You don't have permission to add tracking events.")
    : status === "draft"
    ? t("Available after dispatch.")
    : status === "cancelled"
    ? t("Cannot add events on cancelled POVs.")
    : "";

  const onRetractEvent = (event) => {
    mySwal
      .fire({
        title: t("Retract this tracking event?"),
        text: t(
          "The event will stay in the audit log, shown struck through. Provide a reason."
        ),
        icon: "warning",
        input: "textarea",
        inputPlaceholder: t("Reason (required)"),
        inputValidator: (v) =>
          !v || !v.trim() ? t("A reason is required.") : undefined,
        showCancelButton: true,
        confirmButtonText: t("Yes, retract"),
        cancelButtonText: t("Keep event"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed && result.value) {
          dispatch(
            deleteTrackingEvent({ id: event._id, reason: result.value.trim() })
          );
        }
      });
  };

  // After retract finishes, refresh + toast.
  useEffect(() => {
    if (trackingStore?.actionFlag === "TRACKING_DLT") {
      if (trackingStore?.success)
        Notification("Success", trackingStore.success, "success");
      dispatch(cleanTrackingEventMessage());
      if (id) dispatch(getTrackingEventsByPov(id));
    }
    if (trackingStore?.error) {
      Notification("Error", trackingStore.error, "warning");
      dispatch(cleanTrackingEventMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingStore?.actionFlag, trackingStore?.error]);

  return (
    <Fragment>
      <Card
        className="mb-1"
        style={
          height
            ? { height: `${height}px`, display: "flex", flexDirection: "column" }
            : undefined
        }
      >
        <CardBody
          style={
            height
              ? { display: "flex", flexDirection: "column", minHeight: 0 }
              : undefined
          }
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">{t("Event Timeline")}</h4>
            <span id="pov-add-event-btn-wrap">
              <Button
                color="primary"
                size="sm"
                onClick={() => setAddEventOpen(true)}
                disabled={!canAddEvent}
              >
                <Plus size={14} className="me-25" />
                {t("Add Event")}
              </Button>
            </span>
            {!canAddEvent && addEventTooltip ? (
              <UncontrolledTooltip
                placement="left"
                target="pov-add-event-btn-wrap"
              >
                {addEventTooltip}
              </UncontrolledTooltip>
            ) : null}
          </div>
          {/* Pinned to the left column's measured height; the feed scrolls
              internally when it exceeds that height (matches Lead detail). */}
          <div
            style={
              height
                ? {
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    paddingRight: 8,
                  }
                : undefined
            }
          >
            <TrackingTimeline
              events={trackingStore?.trackingEventTimeline || []}
              emptyText={t("No tracking events yet - add the first one above.")}
              onRetract={canRetractEvent ? onRetractEvent : undefined}
            />
          </div>
        </CardBody>
      </Card>

      <AddTrackingEventModal
        open={addEventOpen}
        toggle={() => setAddEventOpen((v) => !v)}
        poVendorId={id}
        onCreated={() => dispatch(getTrackingEventsByPov(id))}
      />
    </Fragment>
  );
};

export default PoVendorTimelinePanel;
