// Shipment & Shipping Bill editor (SHIPPING_INVOICE_MERGE_PLAN §4 Phase B).
// Editable even after the invoice is ISSUED — the BE edit-gate
// (INVOICE_EDITABLE_AT_ISSUED) allows exactly these shipment fields post-issue.
// Dispatches updateInvoice with ONLY the shipment block; the view re-renders
// from the updated invoiceItem in the store.

import { useEffect, useState } from "react";
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
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import PortSelect from "@src/views/_shared/port-master/PortSelect";
import {
  SHIPPING_MODE_OPTIONS,
  SHIPPING_BILL_TYPE_OPTIONS,
  SHIPPING_SEA_MODES,
} from "@constant/options";
import { updateInvoice } from "@src/views/invoices/store";

const blank = {
  mode: "",
  shipping_bill_type: "free",
  shipping_bill_no: "",
  shipping_bill_date: "",
  port_of_loading_id: "",
  port_of_loading_snapshot: null,
  port_of_discharge_id: "",
  port_of_discharge_snapshot: null,
  pre_carriage_by: "",
  place_of_receipt: "",
  place_of_delivery: "",
  total_packages: "",
  net_weight_kg: "",
  gross_weight_kg: "",
  bl_awb_no: "",
  // GST/Assessable-Value-only rate override — blank = use exchange_rate.
  custom_exchange_rate: "",
};

const ShipmentEditModal = ({ open, toggle, invoiceId, invoice }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const inv = invoice || {};
    setForm({
      mode: inv.mode || "",
      shipping_bill_type: inv.shipping_bill_type || "free",
      shipping_bill_no: inv.shipping_bill_no || "",
      shipping_bill_date: inv.shipping_bill_date?.slice(0, 10) || "",
      port_of_loading_id: inv.port_of_loading_id || "",
      port_of_loading_snapshot: inv.port_of_loading_snapshot || null,
      port_of_discharge_id: inv.port_of_discharge_id || "",
      port_of_discharge_snapshot: inv.port_of_discharge_snapshot || null,
      pre_carriage_by: inv.pre_carriage_by || "",
      place_of_receipt: inv.place_of_receipt || "",
      place_of_delivery: inv.place_of_delivery || "",
      total_packages: inv.total_packages != null ? inv.total_packages : "",
      net_weight_kg: inv.net_weight_kg || "",
      gross_weight_kg: inv.gross_weight_kg || "",
      bl_awb_no: inv.bl_awb_no || "",
      custom_exchange_rate: inv.custom_exchange_rate || "",
    });
  }, [open, invoice]);

  const onF = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const isSeaMode = SHIPPING_SEA_MODES.includes(form.mode);

  const submit = async () => {
    setBusy(true);
    // Send only the shipment block; blank optional fields → undefined.
    const data = {
      mode: form.mode || undefined,
      shipping_bill_type: form.shipping_bill_type || "free",
      shipping_bill_no: form.shipping_bill_no || undefined,
      shipping_bill_date: form.shipping_bill_date || undefined,
      port_of_loading_id: form.port_of_loading_id || undefined,
      port_of_loading_snapshot: form.port_of_loading_snapshot || undefined,
      port_of_discharge_id: form.port_of_discharge_id || undefined,
      port_of_discharge_snapshot: form.port_of_discharge_snapshot || undefined,
      pre_carriage_by: form.pre_carriage_by || undefined,
      place_of_receipt: form.place_of_receipt || undefined,
      place_of_delivery: form.place_of_delivery || undefined,
      total_packages:
        form.total_packages === "" || form.total_packages == null
          ? undefined
          : Number(form.total_packages),
      net_weight_kg: form.net_weight_kg || undefined,
      gross_weight_kg: form.gross_weight_kg || undefined,
      bl_awb_no: form.bl_awb_no || undefined,
      custom_exchange_rate: form.custom_exchange_rate || undefined,
    };
    try {
      await dispatch(updateInvoice({ id: invoiceId, data })).unwrap();
      toggle();
    } catch {
      // toast surfaced via the view's store-effect listener
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Shipment & Shipping Bill")}
      </ModalHeader>
      <ModalBody>
        <Row>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Mode")}</Label>
            <Select
              classNamePrefix="select"
              isClearable
              options={SHIPPING_MODE_OPTIONS}
              value={
                SHIPPING_MODE_OPTIONS.find((o) => o.value === form.mode) || null
              }
              onChange={(opt) => onF("mode", opt ? opt.value : "")}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Export Scheme")}</Label>
            <Select
              classNamePrefix="select"
              options={SHIPPING_BILL_TYPE_OPTIONS}
              value={
                SHIPPING_BILL_TYPE_OPTIONS.find(
                  (o) => o.value === form.shipping_bill_type
                ) || SHIPPING_BILL_TYPE_OPTIONS[0]
              }
              onChange={(opt) =>
                onF("shipping_bill_type", opt ? opt.value : "free")
              }
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">
              {isSeaMode ? "BL No." : "AWB / BL No."}
            </Label>
            <Input
              value={form.bl_awb_no}
              maxLength={60}
              onChange={(e) => onF("bl_awb_no", e.target.value)}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Shipping Bill No.")}</Label>
            <Input
              value={form.shipping_bill_no}
              maxLength={60}
              onChange={(e) => onF("shipping_bill_no", e.target.value)}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Shipping Bill Date")}</Label>
            <DateInput
              id="inv-edit-sb-date"
              value={form.shipping_bill_date}
              onChange={(_d, _s, iso) => onF("shipping_bill_date", iso || "")}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Custom Exchange Rate")}</Label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.custom_exchange_rate}
              onChange={(e) => onF("custom_exchange_rate", e.target.value)}
              placeholder={t("e.g. 91 (₹ per 1 unit)")}
            />
            <small className="text-muted">
              {t(
                "₹ per 1 unit of the invoice currency (e.g. 91 for $1 = ₹91). Used only for GST/Assessable Value on the Commercial PDF."
              )}
            </small>
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Pre-Carriage By")}</Label>
            <Input
              value={form.pre_carriage_by}
              maxLength={80}
              onChange={(e) => onF("pre_carriage_by", e.target.value)}
            />
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Place of Receipt")}</Label>
            <Input
              value={form.place_of_receipt}
              maxLength={80}
              onChange={(e) => onF("place_of_receipt", e.target.value)}
            />
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Port of Loading")}</Label>
            <PortSelect
              value={form.port_of_loading_snapshot}
              countryCode="IN"
              placeholder={t("Search port…")}
              onChange={(port) => {
                onF("port_of_loading_id", port?._id || "");
                onF("port_of_loading_snapshot", port || null);
              }}
            />
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Port of Discharge")}</Label>
            <PortSelect
              value={form.port_of_discharge_snapshot}
              countryCode={null}
              placeholder={t("Search port…")}
              onChange={(port) => {
                onF("port_of_discharge_id", port?._id || "");
                onF("port_of_discharge_snapshot", port || null);
              }}
            />
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Place of Delivery")}</Label>
            <Input
              value={form.place_of_delivery}
              maxLength={80}
              onChange={(e) => onF("place_of_delivery", e.target.value)}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Total Packages")}</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.total_packages}
              onChange={(e) => onF("total_packages", e.target.value)}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Net Weight (kg)")}</Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.net_weight_kg}
              onChange={(e) => onF("net_weight_kg", e.target.value)}
            />
          </Col>
          <Col md="4" className="mb-2">
            <Label className="form-label">{t("Gross Weight (kg)")}</Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.gross_weight_kg}
              onChange={(e) => onF("gross_weight_kg", e.target.value)}
            />
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button color="outline-secondary" onClick={toggle} disabled={busy}>
          {t("Cancel")}
        </Button>
        <Button color="primary" onClick={submit} disabled={busy}>
          {busy ? t("Saving…") : t("Save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ShipmentEditModal;
