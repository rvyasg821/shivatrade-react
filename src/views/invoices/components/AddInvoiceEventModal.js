// Invoice-owned manual tracking-event modal (SHIPPING_INVOICE_MERGE_PLAN §8).
// Re-homed from AddShippingEventModal — same UX (type, when, location, notes,
// single attachment) but posts multipart to /admin/invoice/event/:invoiceId.

import { useEffect, useState } from "react";
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

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { INVOICE_EVENT_TYPE_OPTIONS } from "@constant/options";

const initial = {
  type: "",
  type_other: "",
  occurred_at: "",
  location: "",
  notes: "",
};

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/pdf",
];

const AddInvoiceEventModal = ({ open, toggle, invoiceId, onCreated }) => {
  const { t } = useTranslation();

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...initial, occurred_at: new Date() });
      setErrors({});
      setAttachment(null);
    }
  }, [open]);

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

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    const occurredDate =
      form.occurred_at instanceof Date
        ? form.occurred_at
        : new Date(form.occurred_at);

    const fd = new FormData();
    fd.append("type", form.type);
    fd.append("occurred_at", occurredDate.toISOString());
    if (form.type === "other") fd.append("type_other", form.type_other.trim());
    if (form.location?.trim()) fd.append("location", form.location.trim());
    if (form.notes?.trim()) fd.append("notes", form.notes.trim());
    if (attachment) fd.append("attachment", attachment);

    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.invoices.event}/${invoiceId}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      Notification(
        "Success",
        resp?.data?.message || t("Tracking event added."),
        "success"
      );
      onCreated?.();
      toggle();
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Failed to add event"),
        "warning"
      );
    } finally {
      setBusy(false);
    }
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
              options={INVOICE_EVENT_TYPE_OPTIONS}
              value={
                INVOICE_EVENT_TYPE_OPTIONS.find((o) => o.value === form.type) ||
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
              <div className="text-danger small mt-25">{errors.attachment}</div>
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

export default AddInvoiceEventModal;
