// Tracking tab - transporter, vehicle, LR, e-way bill, dates.
// Editable inline while POV is draft or dispatched (per edit lock §11).

import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Row,
  Col,
  Label,
  Input,
  Button,
  UncontrolledTooltip,
} from "reactstrap";
import { Plus } from "react-feather";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";

import { updatePoVendor } from "@src/views/po-vendors/store";
import {
  getTrackingEventsByPov,
  deleteTrackingEvent,
  cleanTrackingEventMessage,
} from "@src/views/tracking/store";
import TrackingTimeline from "@src/views/_shared/tracking/TrackingTimeline";
import AddTrackingEventModal from "@src/views/_shared/tracking/AddTrackingEventModal";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import { isAdminUser } from "@constant/defaultValues";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const TrackingTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { poVendorItem, actionFlag: povActionFlag } = useSelector(
    (s) => s.poVendor
  );
  const trackingStore = useSelector((s) => s.trackingEvent);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = poVendorItem || {};
  const status = (p?.status || "").toLowerCase();
  const [addEventOpen, setAddEventOpen] = useState(false);

  // Tracking events: load whenever the POV id changes; refresh after
  // each successful create (driven by the modal's onCreated callback).
  useEffect(() => {
    if (id) dispatch(getTrackingEventsByPov(id));
  }, [id, dispatch]);

  // Refresh timeline after any POV state transition that emits a
  // system event (dispatch / receive / cancel / update). Without this,
  // the timeline shows stale data if the user is already on this tab
  // when they click the action button.
  useEffect(() => {
    if (!id) return;
    if (
      povActionFlag === "POV_DISPATCHED" ||
      povActionFlag === "POV_CLOSED" ||
      povActionFlag === "POV_CANCELLED" ||
      povActionFlag === "POV_UPDT"
    ) {
      dispatch(getTrackingEventsByPov(id));
    }
  }, [povActionFlag, id, dispatch]);

  // Permission gates.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canUpdate = isAdmin || perms?.can_all || perms?.can_update;
  const trackingPerms = authUserItem?.role?.permissions?.tracking;
  const canAddTrackingEvent =
    isAdmin || trackingPerms?.can_all || trackingPerms?.can_add;
  const canRetractEvent =
    isAdmin || trackingPerms?.can_all || trackingPerms?.can_delete;

  // "Add Event" enabled only when BOTH (a) POV status allows it AND
  // (b) the user has tracking.can_add. Tooltip explains the blocker.
  const statusAllowsAdd =
    status === "dispatched" || status === "closed";
  const canAddEvent = statusAllowsAdd && canAddTrackingEvent;
  const addEventTooltip = !canAddTrackingEvent
    ? t("You don't have permission to add tracking events.")
    : status === "draft"
    ? t("Available after dispatch.")
    : status === "cancelled"
    ? t("Cannot add events on cancelled POVs.")
    : "";

  // SweetAlert prompt + dispatch retract.
  const mySwal = withReactContent(Swal);
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

  // After retract finishes, refresh the timeline + show toast.
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
  }, [trackingStore?.actionFlag, trackingStore?.error]);

  // Editable in DRAFT or DISPATCHED, but only if user can update.
  const editable = canUpdate && (status === "draft" || status === "dispatched");

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      transporter_name: "",
      vehicle_no: "",
      lr_no: "",
      lr_date: "",
      eway_bill_no: "",
      eway_bill_date: "",
      expected_arrival_date: "",
      internal_notes: "",
    },
  });

  useEffect(() => {
    if (p?._id) {
      reset({
        transporter_name: p.transporter_name || "",
        vehicle_no: p.vehicle_no || "",
        lr_no: p.lr_no || "",
        lr_date: (p.lr_date || "").slice(0, 10),
        eway_bill_no: p.eway_bill_no || "",
        eway_bill_date: (p.eway_bill_date || "").slice(0, 10),
        expected_arrival_date: (p.expected_arrival_date || "").slice(0, 10),
        internal_notes: p.internal_notes || "",
      });
    }
  }, [p?._id, reset]);

  const onSubmit = (values) => {
    const data = {
      transporter_name: values.transporter_name || undefined,
      vehicle_no: values.vehicle_no || undefined,
      lr_no: values.lr_no || undefined,
      lr_date: values.lr_date ? values.lr_date.slice(0, 10) : undefined,
      eway_bill_no: values.eway_bill_no || undefined,
      eway_bill_date: values.eway_bill_date
        ? values.eway_bill_date.slice(0, 10)
        : undefined,
      expected_arrival_date: values.expected_arrival_date
        ? values.expected_arrival_date.slice(0, 10)
        : undefined,
      internal_notes: values.internal_notes || undefined,
    };
    dispatch(updatePoVendor({ id, data }));
  };

  return (
    <Fragment>
      <Row className="mb-3">
        <Col xl="8" lg="7">
      <Card>
        <CardBody>
          <h4 className="mb-2">{t("Tracking")}</h4>
          {!editable && (
            <div className="alert alert-secondary small mb-2">
              {t(
                "Tracking fields are read-only because this POV is closed/cancelled."
              )}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Row>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Transporter")}</Label>
                <Controller
                  name="transporter_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                      placeholder={t("Transporter name")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Vehicle No")}</Label>
                <Controller
                  name="vehicle_no"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                      placeholder={t("e.g. MH04AB1234")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("LR / Bilty No")}</Label>
                <Controller
                  name="lr_no"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("LR Date")}</Label>
                <Controller
                  name="lr_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      id="pov-lr-date"
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso || "")}
                      disabled={!editable}
                      placeholder={t("YYYY-MM-DD")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("E-way Bill No")}</Label>
                <Controller
                  name="eway_bill_no"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("E-way Bill Date")}</Label>
                <Controller
                  name="eway_bill_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      id="pov-eway-date"
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso || "")}
                      disabled={!editable}
                      placeholder={t("YYYY-MM-DD")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Expected Arrival")}</Label>
                <Controller
                  name="expected_arrival_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      id="pov-exp-arr-date"
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso || "")}
                      disabled={!editable}
                      placeholder={t("YYYY-MM-DD")}
                    />
                  )}
                />
              </Col>
              <Col md="12" className="mb-1">
                <Label className="form-label">{t("Notes")}</Label>
                <Controller
                  name="internal_notes"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      rows="2"
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                      placeholder={t("Internal ops notes for this shipment")}
                    />
                  )}
                />
              </Col>
            </Row>
            {editable && (
              <div className="d-flex justify-content-end">
                <Button color="primary" type="submit">
                  {t("Save Tracking")}
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
        </Col>

        <Col xl="4" lg="5">
          <Card className="h-100">
            <CardBody>
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
              <TrackingTimeline
                events={trackingStore?.trackingEventTimeline || []}
                emptyText={t(
                  "No tracking events yet - add the first one above."
                )}
                onRetract={canRetractEvent ? onRetractEvent : undefined}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <AddTrackingEventModal
        open={addEventOpen}
        toggle={() => setAddEventOpen((v) => !v)}
        poVendorId={id}
        onCreated={() => dispatch(getTrackingEventsByPov(id))}
      />
    </Fragment>
  );
};

export default TrackingTab;
