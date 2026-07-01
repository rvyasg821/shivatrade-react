// ── PoVendorEditRemarksModal ────────────────────────────────────────
// Edit the POV's remarks (the `notes` field printed on the Vendor
// Purchase Order PDF). Mirrors PoVendorEditDeliveryModal. When left
// blank the PDF falls back to the company's default POV remarks.

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "reactstrap";
import { useTranslation } from "react-i18next";

import { updatePoVendor } from "@src/views/po-vendors/store";

const PoVendorEditRemarksModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Seed with the per-POV note when set, otherwise the effective remarks
    // (the company default) so editing starts from what currently prints.
    setText(p?.notes || p?.effective_remarks || "");
  }, [isOpen, p?.notes, p?.effective_remarks]);

  const onSave = async () => {
    setSubmitting(true);
    try {
      await dispatch(
        updatePoVendor({ id: p._id, data: { notes: text.trim() } })
      ).unwrap();
      toggle?.();
    } catch (_err) {
      // page-level toast surfaces error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Edit Remarks")} · <code>{p?.voucher_no}</code>
      </ModalHeader>
      <ModalBody>
        <Label className="form-label" for="pov-remarks-text">
          {t("Remarks")}
        </Label>
        <Input
          id="pov-remarks-text"
          type="textarea"
          rows="6"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(
            "Printed on the Vendor PO PDF. Leave blank to use the company's default POV remarks."
          )}
        />
        <small className="text-muted">
          {t(
            "When left blank, the Vendor PO PDF uses the default remarks set in Company Profile."
          )}
        </small>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button color="primary" onClick={onSave} disabled={submitting}>
          {submitting ? t("Saving…") : t("Save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorEditRemarksModal;
