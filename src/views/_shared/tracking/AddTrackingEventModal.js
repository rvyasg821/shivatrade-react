// Add Tracking Event modal - opened from POV detail Tracking tab.
// Tracking plan §13. Append-only: no edit/delete modal counterpart exists.

import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Label,
  Input,
  Row,
  Col,
  FormFeedback,
} from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import {
  createTrackingEvent,
  cleanTrackingEventMessage,
} from "@src/views/tracking/store";
import { TRACKING_EVENT_TYPE_OPTIONS } from "@constant/options";
import { selectThemeColors } from "@utils";

// Keep in sync with `FileUploadSingle` cap on the BE controller.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_ATTACHMENT_EXTS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "heic",
];

const schema = yup.object({
  event_at: yup.string().required("When is required"),
  event_type: yup.string().required("Event is required"),
  event_type_other: yup
    .string()
    .when("event_type", (event_type, s) =>
      event_type === "other"
        ? s
            .required("Custom Event Label is required")
            .max(100, "Max 100 chars")
        : s.nullable()
    ),
  location: yup.string().max(200, "Max 200 chars").nullable(),
  notes: yup.string().nullable(),
  attachment: yup
    .mixed()
    .nullable()
    .test(
      "file-size",
      `Attachment must be ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB or smaller`,
      (file) => !file || (file.size && file.size <= MAX_ATTACHMENT_BYTES)
    )
    .test(
      "file-type",
      `Unsupported file type. Allowed: ${ALLOWED_ATTACHMENT_EXTS.join(", ")}`,
      (file) => {
        if (!file) return true;
        const name = (file.name || "").toLowerCase();
        const ext = name.includes(".") ? name.split(".").pop() : "";
        return ALLOWED_ATTACHMENT_EXTS.includes(ext);
      }
    ),
});

const nowLocalISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

const AddTrackingEventModal = ({ open, toggle, poVendorId, onCreated }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.trackingEvent);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      event_at: nowLocalISO(),
      event_type: "",
      event_type_other: "",
      location: "",
      notes: "",
      attachment: null,
    },
  });

  const eventType = watch("event_type");

  useEffect(() => {
    if (open) {
      reset({
        event_at: nowLocalISO(),
        event_type: "",
        event_type_other: "",
        location: "",
        notes: "",
        attachment: null,
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (store?.actionFlag === "TRACKING_CRTD") {
      onCreated && onCreated();
      toggle && toggle();
      dispatch(cleanTrackingEventMessage());
    }
  }, [store?.actionFlag, dispatch, onCreated, toggle]);

  const onSubmit = (values) => {
    const eventAtIso = new Date(values.event_at).toISOString();
    const payload = {
      po_vendor_id: poVendorId,
      event_at: eventAtIso,
      event_type: values.event_type,
      event_type_other:
        values.event_type === "other" ? values.event_type_other : undefined,
      location: values.location || undefined,
      notes: values.notes || undefined,
    };
    dispatch(
      createTrackingEvent({ payload, file: values.attachment || null })
    );
  };

  return (
    <Modal isOpen={open} toggle={toggle} size="md" centered>
      <ModalHeader toggle={toggle}>{t("Add Tracking Event")}</ModalHeader>
      <ModalBody>
        <form id="add-tracking-event-form" onSubmit={handleSubmit(onSubmit)}>
          <Row>
            <Col md="12" className="mb-1">
              <Label className="form-label">
                {t("When")} <span className="text-danger">*</span>
              </Label>
              <Controller
                name="event_at"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    {...field}
                    invalid={!!errors.event_at}
                  />
                )}
              />
              {errors.event_at && (
                <FormFeedback className="d-block">
                  {errors.event_at.message}
                </FormFeedback>
              )}
            </Col>

            <Col md="12" className="mb-1">
              <Label className="form-label">
                {t("Event")} <span className="text-danger">*</span>
              </Label>
              <Controller
                name="event_type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    classNamePrefix="select"
                    theme={selectThemeColors}
                    options={TRACKING_EVENT_TYPE_OPTIONS}
                    value={
                      TRACKING_EVENT_TYPE_OPTIONS.find(
                        (o) => o.value === field.value
                      ) || null
                    }
                    onChange={(opt) => field.onChange(opt?.value || "")}
                    placeholder={t("Select event type")}
                  />
                )}
              />
              {errors.event_type && (
                <FormFeedback className="d-block">
                  {errors.event_type.message}
                </FormFeedback>
              )}
            </Col>

            {eventType === "other" && (
              <Col md="12" className="mb-1">
                <Label className="form-label">
                  {t("Custom Event Label")}{" "}
                  <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="event_type_other"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      invalid={!!errors.event_type_other}
                      placeholder={t("Describe the event")}
                      maxLength={100}
                    />
                  )}
                />
                {errors.event_type_other && (
                  <FormFeedback className="d-block">
                    {errors.event_type_other.message}
                  </FormFeedback>
                )}
              </Col>
            )}

            <Col md="12" className="mb-1">
              <Label className="form-label">
                {t("Location")} <span className="text-muted">({t("optional")})</span>
              </Label>
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    invalid={!!errors.location}
                    placeholder={t("City / toll / checkpoint")}
                    maxLength={200}
                  />
                )}
              />
            </Col>

            <Col md="12" className="mb-1">
              <Label className="form-label">
                {t("Notes")} <span className="text-muted">({t("optional")})</span>
              </Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Input type="textarea" rows="2" {...field} />
                )}
              />
            </Col>

            <Col md="12" className="mb-1">
              <Label className="form-label">
                {t("Attachment")}{" "}
                <span className="text-muted">({t("optional")})</span>
              </Label>
              <Controller
                name="attachment"
                control={control}
                render={({ field: { onChange } }) => (
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    invalid={!!errors.attachment}
                    onChange={(e) => onChange(e.target.files?.[0] || null)}
                  />
                )}
              />
              {errors.attachment && (
                <FormFeedback className="d-block">
                  {errors.attachment.message}
                </FormFeedback>
              )}
            </Col>
          </Row>
          {store?.error ? (
            <div className="text-danger small mt-1">{String(store.error)}</div>
          ) : null}
        </form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          type="submit"
          form="add-tracking-event-form"
          disabled={isSubmitting}
        >
          {t("Add Event")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddTrackingEventModal;
