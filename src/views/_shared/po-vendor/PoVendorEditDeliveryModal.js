// ── PoVendorEditDeliveryModal ───────────────────────────────────────
// Edit the POV's delivery address while status = draft. Mirrors the
// PO wizard Step 1 layout: a LocationSelect for picking a saved
// location, with a collapsible "Override with custom text" toggle
// below for one-off destinations.

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
import { ChevronDown, ChevronRight } from "react-feather";
import { useTranslation } from "react-i18next";

import { updatePoVendor } from "@src/views/po-vendors/store";
import LocationSelect from "@src/views/_shared/LocationSelect";
import Notification from "@components/toast/notification";

const PoVendorEditDeliveryModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};

  const [pickedId, setPickedId] = useState("");
  const [manualText, setManualText] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPickedId(p?.delivery_address_id || "");
    // If there's a delivery_address text but no FK, the POV was
    // created with a manual override — expand the textarea and seed it.
    if (!p?.delivery_address_id && p?.delivery_address) {
      setManualText(p.delivery_address);
      setShowOverride(true);
    } else {
      setManualText("");
      setShowOverride(false);
    }
  }, [isOpen, p?.delivery_address_id, p?.delivery_address]);

  const onSave = async () => {
    // Manual text wins when filled (matches BE precedence).
    const trimmed = manualText.trim();
    if (showOverride && trimmed) {
      setSubmitting(true);
      try {
        await dispatch(
          updatePoVendor({ id: p._id, data: { delivery_address: trimmed } })
        ).unwrap();
        toggle?.();
      } catch (_err) {
        // page-level toast surfaces error
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!pickedId) {
      Notification(
        "Validation",
        t("Pick a delivery location or enter a manual address."),
        "warning"
      );
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(
        updatePoVendor({
          id: p._id,
          data: { delivery_address_id: pickedId },
        })
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
        {t("Edit Delivery Address")} · <code>{p?.voucher_no}</code>
      </ModalHeader>
      <ModalBody>
        <Label className="form-label">
          {t("Delivery Address")}{" "}
          <span className="text-danger">*</span>
        </Label>
        <LocationSelect
          value={pickedId}
          onChange={(id) => {
            setPickedId(id);
            // Switching to a saved location → clear the manual override
            // so the BE re-snapshots from the location.
            setManualText("");
          }}
          autoSelectDefault={false}
        />
        <small className="text-muted">
          {t(
            "Pick a delivery location. Vendors will deliver here. Manage locations under the Locations menu."
          )}
        </small>

        <button
          type="button"
          className="btn btn-link btn-sm p-0 mt-50"
          onClick={() => setShowOverride((s) => !s)}
        >
          {showOverride ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}{" "}
          {t("Override with custom text (advanced)")}
        </button>
        {showOverride && (
          <Input
            type="textarea"
            rows="3"
            className="mt-1"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={t(
              "One-off destination — factory-to-port direct, customer pickup, etc. Wins over the saved location when filled."
            )}
          />
        )}

        <div className="mt-2">
          <Label className="text-muted small mb-25">
            {t("Current snapshot")}
          </Label>
          <pre
            className="small text-muted mb-0"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {p?.delivery_address || "-"}
          </pre>
        </div>
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

export default PoVendorEditDeliveryModal;
