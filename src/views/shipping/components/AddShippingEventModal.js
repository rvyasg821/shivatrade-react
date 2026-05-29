// Shipping-owned manual event modal. Independent from POV's
// AddTrackingEventModal — different parent FK, different event type
// vocabulary, different store thunk.

import { Fragment, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Row,
  Col,
  Label,
  Input,
  Button,
  FormFeedback,
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "@styles/react/libs/flatpickr/flatpickr.scss";
import { useTranslation } from "react-i18next";

import { createShippingEvent } from "@src/views/shipping/store";
import { SHIPPING_EVENT_TYPE_OPTIONS } from "@constant/options";

const nowDate = () => new Date();

const initial = {
  type: "",
  type_other: "",
  occurred_at: "",
  location: "",
  notes: "",
};

const AddShippingEventModal = ({ open, toggle, shippingId, onCreated }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...initial, occurred_at: nowDate() });
      setErrors({});
      setAttachment(null);
    }
  }, [open]);

  const ALLOWED = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "application/pdf",
  ];

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setAttachment(null);
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      setErrors((s) => ({
        ...s,
        attachment: t("Allowed: JPG, PNG, GIF, WEBP, HEIC, PDF"),
      }));
      e.target.value = "";
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErrors((s) => ({ ...s, attachment: t("Max 15 MB") }));
      e.target.value = "";
      return;
    }
    setErrors((s) => ({ ...s, attachment: undefined }));
    setAttachment(f);
  };

  const setF = (k, v) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.type) next.type = t("Event type is required");
    if (form.type === "other" && !form.type_other?.trim())
      next.type_other = t("Specify the event type");
    if (!form.occurred_at) next.occurred_at = t("Date is required");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    setBusy(true);
    // Flatpickr stores a Date object — convert to a real ISO instant so the
    // BE records the actual moment (not midnight-UTC of the date).
    const occurredDate =
      form.occurred_at instanceof Date
        ? form.occurred_at
        : new Date(form.occurred_at);
    const payload = {
      type: form.type,
      occurred_at: occurredDate.toISOString(),
    };
    if (form.type === "other") payload.type_other = form.type_other.trim();
    if (form.location?.trim()) payload.location = form.location.trim();
    if (form.notes?.trim()) payload.notes = form.notes.trim();

    dispatch(createShippingEvent({ shippingId, data: payload, attachment }))
      .unwrap()
      .then(() => {
        onCreated?.();
        toggle();
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  return (
    <Modal isOpen={open} toggle={toggle} centered size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>{t("Add Tracking Event")}</ModalHeader>
      <ModalBody>
        <Row>
          <Col md="6" className="mb-1">
            <Label className="form-label">
              {t("Event Type")} <span className="text-danger">*</span>
            </Label>
            <Select
              classNamePrefix="select"
              options={SHIPPING_EVENT_TYPE_OPTIONS}
              value={
                SHIPPING_EVENT_TYPE_OPTIONS.find((o) => o.value === form.type) ||
                null
              }
              onChange={(opt) => setF("type", opt ? opt.value : "")}
              placeholder={t("Select event type")}
            />
            {errors.type && (
              <div className="text-danger small mt-25">{errors.type}</div>
            )}
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">
              {t("When")} <span className="text-danger">*</span>
            </Label>
            <Flatpickr
              className={`form-control ${
                errors.occurred_at ? "is-invalid" : ""
              }`}
              value={form.occurred_at}
              onChange={(dates) => setF("occurred_at", dates?.[0] || null)}
              options={{
                enableTime: true,
                time_24hr: false,
                dateFormat: "d/m/Y h:i K",
                defaultDate: form.occurred_at || new Date(),
              }}
            />
            {errors.occurred_at && (
              <div className="text-danger small mt-25">
                {errors.occurred_at}
              </div>
            )}
          </Col>
          {form.type === "other" && (
            <Col md="12" className="mb-1">
              <Label className="form-label">
                {t("Custom Type")} <span className="text-danger">*</span>
              </Label>
              <Input
                value={form.type_other}
                maxLength={120}
                onChange={(e) => setF("type_other", e.target.value)}
                invalid={!!errors.type_other}
              />
              {errors.type_other && (
                <FormFeedback className="d-block">
                  {errors.type_other}
                </FormFeedback>
              )}
            </Col>
          )}
          <Col md="12" className="mb-1">
            <Label className="form-label">{t("Location")}</Label>
            <Input
              value={form.location}
              maxLength={200}
              placeholder={t("Port, checkpoint, customs office, hub…")}
              onChange={(e) => setF("location", e.target.value)}
            />
          </Col>
          <Col md="12" className="mb-1">
            <Label className="form-label">{t("Notes")}</Label>
            <Input
              type="textarea"
              rows="3"
              value={form.notes}
              onChange={(e) => setF("notes", e.target.value)}
            />
          </Col>
          <Col md="12" className="mb-1">
            <Label className="form-label">{t("Attachment")}</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={onFile}
              invalid={!!errors.attachment}
            />
            <small className="text-muted">
              {t("Optional. JPG/PNG/GIF/WEBP/HEIC/PDF, up to 15 MB.")}
            </small>
            {attachment && (
              <div className="small mt-25">
                {t("Selected:")} {attachment.name}
              </div>
            )}
            {errors.attachment && (
              <div className="text-danger small mt-25">
                {errors.attachment}
              </div>
            )}
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button color="outline-secondary" onClick={toggle} disabled={busy}>
          {t("Cancel")}
        </Button>
        <Button color="primary" onClick={submit} disabled={busy}>
          {busy ? t("Adding…") : t("Add Event")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddShippingEventModal;
