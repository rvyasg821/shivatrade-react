// Shipping add/edit - single-page sectioned form.
//
// Entry points:
//   /shipping/add               - blank
//   /shipping/add?invoice=<id>  - pre-fills consignee + country + invoice attach
//   /shipping/edit/:id          - loads existing shipping

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Row,
  Col,
  Label,
  Input,
  Button,
  Spinner,
  FormFeedback,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save, AlertTriangle } from "react-feather";
import Select from "react-select";

import {
  createShipping,
  updateShipping,
  getShipping,
  cleanShippingMessage,
  resetShippingItem,
} from "@src/views/shipping/store";
import { getInvoice } from "@src/views/invoices/store";
import PortSelect from "@src/views/_shared/port-master/PortSelect";
import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  SHIPPING_MODE_OPTIONS as MODES,
  SHIPPING_SEA_MODES,
  SHIPPING_AIR_MODES,
  SHIPPING_BILL_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
} from "@constant/options";

const todayISO = () => new Date().toISOString().slice(0, 10);

const isSeaMode = (m) => SHIPPING_SEA_MODES.includes(m);
const isAirMode = (m) => SHIPPING_AIR_MODES.includes(m);

const ShippingAddEdit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: editId } = useParams();
  const location = useLocation();
  const isEdit = !!editId;
  const invoiceIdFromQuery = new URLSearchParams(location.search).get("invoice");

  const store = useSelector((s) => s.shipping);
  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.shipping;
  const canAdd = isAdmin || perms?.can_all || perms?.can_add;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;

  const [form, setForm] = useState({
    mode: "sea_fcl",
    customer_id: "",
    consignee_id: "",
    consignee_address_id: "",
    notify_party_id: "",
    forwarder_id: "",
    bl_awb_no: "",
    bl_awb_date: "",
    shipping_bill_no: "",
    shipping_bill_date: "",
    shipping_bill_type: "",
    let_export_order_date: "",
    egm_no: "",
    egm_date: "",
    container_no: "",
    seal_no: "",
    container_type: "",
    vessel_name: "",
    voyage_no: "",
    flight_no: "",
    pre_carriage_by: "",
    place_of_receipt: "",
    port_of_loading_id: "",
    port_of_loading_snapshot: null,
    port_of_discharge_id: "",
    port_of_discharge_snapshot: null,
    place_of_delivery: "",
    country_of_origin: "India",
    country_of_destination: "",
    booking_date: "",
    gate_in_date: "",
    etd: "",
    eta: "",
    total_packages: 0,
    package_type: "",
    net_weight_kg: "0",
    gross_weight_kg: "0",
    volume_cbm: "0",
    marks_and_nos: "",
    marine_insurance_policy_no: "",
    insurance_company: "",
    policy_amount_inr: "0",
    freight_charges_inr: "0",
    insurance_charges_inr: "0",
    cha_charges_inr: "0",
    forwarder_charges_inr: "0",
    other_charges_inr: "0",
    notes: "",
    internal_notes: "",
    invoice_ids: [],
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [discharge, setDischarge] = useState({ name: "" });

  const onF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // Load invoice → pre-fill consignee + country + attach
  useEffect(() => {
    if (isEdit || !invoiceIdFromQuery) return;
    (async () => {
      const action = await dispatch(getInvoice(invoiceIdFromQuery));
      const inv = action?.payload?.invoiceItem;
      if (!inv) return;
      setForm((s) => ({
        ...s,
        customer_id: inv.customer_id || "",
        consignee_id: inv.consignee_id || "",
        consignee_address_id: inv.consignee_address_id || "",
        notify_party_id: inv.notify_party_id || "",
        country_of_destination: inv.country_of_destination || "",
        invoice_ids: [inv._id],
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceIdFromQuery, isEdit]);

  // Load existing for edit
  useEffect(() => {
    if (!isEdit) return;
    dispatch(getShipping(editId));
    return () => dispatch(resetShippingItem());
  }, [isEdit, editId, dispatch]);

  useEffect(() => {
    if (!isEdit) return;
    const ship = store?.shippingItem;
    if (!ship?._id) return;
    setForm((s) => ({
      ...s,
      ...ship,
      booking_date: ship.booking_date?.slice(0, 10) || "",
      etd: ship.etd?.slice(0, 10) || "",
      eta: ship.eta?.slice(0, 10) || "",
      bl_awb_date: ship.bl_awb_date?.slice(0, 10) || "",
      shipping_bill_date: ship.shipping_bill_date?.slice(0, 10) || "",
      let_export_order_date: ship.let_export_order_date?.slice(0, 10) || "",
      egm_date: ship.egm_date?.slice(0, 10) || "",
      gate_in_date: ship.gate_in_date?.slice(0, 10) || "",
      invoice_ids: (ship.invoices || []).map((i) => i.invoice_id),
    }));
    setDischarge(
      ship.port_of_discharge_snapshot || { name: "" }
    );
  }, [isEdit, store?.shippingItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanShippingMessage());
  }, [store?.success, store?.error, dispatch]);

  const loadingPortTypes = useMemo(
    () =>
      isAirMode(form.mode)
        ? ["air", "icd"]
        : ["sea", "icd", "sez"],
    [form.mode]
  );

  const countryOptions = useMemo(
    () =>
      (COUNTRY_OPTIONS || []).map((c) =>
        typeof c === "string" ? { value: c, label: c } : c
      ),
    []
  );

  const validate = () => {
    const e = {};
    if (!form.mode) e.mode = "Mode required";
    if (!form.customer_id) e.customer_id = "Customer required";
    if (!form.consignee_id) e.consignee_id = "Consignee required";
    if (!form.port_of_loading_id) e.port_of_loading_id = "Port of loading required";
    if (!discharge?.name) e.discharge = "Port of discharge required";
    if (!form.country_of_destination)
      e.country_of_destination = "Destination required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSave = async () => {
    if (!validate()) {
      Notification("Validation", "Please fix the highlighted fields.", "warning");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        port_of_discharge_snapshot: discharge,
      };
      if (isEdit) {
        const r = await dispatch(
          updateShipping({ id: editId, data: payload })
        ).unwrap();
        navigate(`${appsRoot}/shipping/view/${r?.shippingItem?._id || editId}`);
      } else {
        const r = await dispatch(createShipping(payload)).unwrap();
        const newId = r?.shippingItem?._id;
        if (newId) navigate(`${appsRoot}/shipping/view/${newId}`);
        else navigate(`${appsRoot}/shipping`);
      }
    } catch (_err) {
      // toast surfaced via the store-effect listener
    } finally {
      setBusy(false);
    }
  };

  if (isEdit && !store?.shippingItem?._id) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }
  if (isEdit && store?.shippingItem?.status === "cancelled") {
    return (
      <Card>
        <CardBody className="text-center py-4">
          <AlertTriangle size={32} className="text-warning mb-2" />
          <h5>{t("This shipping is cancelled and cannot be edited")}</h5>
          <Button color="primary" outline onClick={() => navigate(`${appsRoot}/shipping/view/${editId}`)}>
            {t("Open detail page")}
          </Button>
        </CardBody>
      </Card>
    );
  }
  if (!isEdit && !canAdd) return <div className="p-3 text-muted">No permission</div>;
  if (isEdit && !canEdit) return <div className="p-3 text-muted">No permission</div>;

  return (
    <Fragment>
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1 d-flex align-items-center justify-content-between">
          <CardTitle tag="h4" className="mb-0">
            {isEdit ? t("Edit Shipping") : t("New Shipping")}
          </CardTitle>
          <div className="d-flex gap-1">
            <Button
              size="sm"
              color="secondary"
              outline
              onClick={() => navigate(`${appsRoot}/shipping`)}
              disabled={busy}
            >
              <ArrowLeft size={14} className="me-25" /> {t("Cancel")}
            </Button>
            <Button color="primary" size="sm" onClick={onSave} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <Save size={14} />} {t("Save")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Header */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {t("Header")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Mode")} <span className="text-danger">*</span>
              </Label>
              <Input
                type="select"
                value={form.mode}
                onChange={(e) => onF("mode", e.target.value)}
                disabled={isEdit && store?.shippingItem?.status !== "draft"}
              >
                {MODES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Input>
              {isEdit && store?.shippingItem?.status !== "draft" && (
                <small className="text-muted">{t("Mode locked after booking")}</small>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Customer ID")} <span className="text-danger">*</span>
              </Label>
              <Input
                value={form.customer_id}
                onChange={(e) => onF("customer_id", e.target.value)}
                invalid={!!errors.customer_id}
                placeholder="UUID"
              />
              {errors.customer_id && (
                <FormFeedback className="d-block">{errors.customer_id}</FormFeedback>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Consignee ID")} <span className="text-danger">*</span>
              </Label>
              <Input
                value={form.consignee_id}
                onChange={(e) => onF("consignee_id", e.target.value)}
                invalid={!!errors.consignee_id}
                placeholder="UUID"
              />
              {errors.consignee_id && (
                <FormFeedback className="d-block">{errors.consignee_id}</FormFeedback>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Country of Destination")} <span className="text-danger">*</span>
              </Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={countryOptions}
                value={
                  countryOptions.find(
                    (o) => o.value === form.country_of_destination
                  ) ||
                  (form.country_of_destination
                    ? {
                        value: form.country_of_destination,
                        label: form.country_of_destination,
                      }
                    : null)
                }
                onChange={(opt) =>
                  onF("country_of_destination", opt ? opt.value : "")
                }
              />
              {errors.country_of_destination && (
                <FormFeedback className="d-block">
                  {errors.country_of_destination}
                </FormFeedback>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Country of Origin")}</Label>
              <Select
                classNamePrefix="select"
                options={countryOptions}
                value={
                  countryOptions.find(
                    (o) => o.value === form.country_of_origin
                  ) ||
                  (form.country_of_origin
                    ? {
                        value: form.country_of_origin,
                        label: form.country_of_origin,
                      }
                    : null)
                }
                onChange={(opt) =>
                  onF("country_of_origin", opt ? opt.value : "India")
                }
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Route */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {t("Route")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Pre Carriage By")}</Label>
              <Input
                value={form.pre_carriage_by}
                onChange={(e) => onF("pre_carriage_by", e.target.value)}
                placeholder="ROAD / OWN VEHICLE"
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Place of Receipt")}</Label>
              <Input
                value={form.place_of_receipt}
                onChange={(e) => onF("place_of_receipt", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Port of Loading")} <span className="text-danger">*</span>
              </Label>
              <PortSelect
                value={form.port_of_loading_snapshot}
                countryCode="IN"
                types={loadingPortTypes}
                placeholder={t("Search port by code or name…")}
                onChange={(port) => {
                  onF("port_of_loading_id", port?._id || "");
                  onF("port_of_loading_snapshot", port || null);
                }}
              />
              {errors.port_of_loading_id && (
                <div className="text-danger small">{errors.port_of_loading_id}</div>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Port of Discharge")} <span className="text-danger">*</span>
              </Label>
              <Input
                placeholder="e.g. Conakry, Guinea"
                value={discharge?.name || ""}
                onChange={(e) => setDischarge({ name: e.target.value })}
                invalid={!!errors.discharge}
                maxLength={150}
              />
              <small className="text-muted">{t("Foreign port - free text")}</small>
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Place of Delivery")}</Label>
              <Input
                value={form.place_of_delivery}
                onChange={(e) => onF("place_of_delivery", e.target.value)}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Transport */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {isAirMode(form.mode) ? t("Air Transport") : t("Sea Transport")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {isAirMode(form.mode) ? "AWB #" : "BL #"}
              </Label>
              <Input
                value={form.bl_awb_no}
                onChange={(e) => onF("bl_awb_no", e.target.value)}
                maxLength={60}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {isAirMode(form.mode) ? "AWB Date" : "BL Date"}
              </Label>
              <DateInput
                id="shp-bl-awb-date"
                value={form.bl_awb_date}
                onChange={(_d, _s, iso) => onF("bl_awb_date", iso || "")}
              />
            </Col>
            {isSeaMode(form.mode) && (
              <>
                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Container #")}</Label>
                  <Input
                        value={form.container_no}
                    onChange={(e) => onF("container_no", e.target.value)}
                    maxLength={30}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Seal #")}</Label>
                  <Input
                        value={form.seal_no}
                    onChange={(e) => onF("seal_no", e.target.value)}
                    maxLength={30}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Container Type")}</Label>
                  <Input
                    type="select"
                        value={form.container_type}
                    onChange={(e) => onF("container_type", e.target.value)}
                  >
                    <option value="">-</option>
                    <option value="20FT">20FT</option>
                    <option value="40FT">40FT</option>
                    <option value="40FT-HC">40FT-HC</option>
                    <option value="LCL">LCL</option>
                  </Input>
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Vessel")}</Label>
                  <Input
                        value={form.vessel_name}
                    onChange={(e) => onF("vessel_name", e.target.value)}
                    maxLength={80}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Voyage #")}</Label>
                  <Input
                        value={form.voyage_no}
                    onChange={(e) => onF("voyage_no", e.target.value)}
                    maxLength={30}
                  />
                </Col>
              </>
            )}
            {isAirMode(form.mode) && (
              <Col md="3" className="mb-2">
                <Label className="form-label">{t("Flight #")}</Label>
                <Input
                    value={form.flight_no}
                  onChange={(e) => onF("flight_no", e.target.value)}
                  maxLength={30}
                />
              </Col>
            )}
          </Row>
        </CardBody>
      </Card>

      {/* Customs */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {t("Customs / DGFT")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Shipping Bill #")}</Label>
              <Input
                value={form.shipping_bill_no}
                onChange={(e) => onF("shipping_bill_no", e.target.value)}
                maxLength={60}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Shipping Bill Date")}</Label>
              <DateInput
                id="shp-sb-date"
                value={form.shipping_bill_date}
                onChange={(_d, _s, iso) =>
                  onF("shipping_bill_date", iso || "")
                }
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("SB Type")}</Label>
              <Input
                type="select"
                value={form.shipping_bill_type}
                onChange={(e) => onF("shipping_bill_type", e.target.value)}
              >
                <option value="">-</option>
                {SHIPPING_BILL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Input>
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("LEO Date")}</Label>
              <DateInput
                id="shp-leo-date"
                value={form.let_export_order_date}
                onChange={(_d, _s, iso) =>
                  onF("let_export_order_date", iso || "")
                }
              />
              <small className="text-muted">{t("Required to dispatch")}</small>
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("EGM #")}</Label>
              <Input
                value={form.egm_no}
                onChange={(e) => onF("egm_no", e.target.value)}
                maxLength={60}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("EGM Date")}</Label>
              <DateInput
                id="shp-egm-date"
                value={form.egm_date}
                onChange={(_d, _s, iso) => onF("egm_date", iso || "")}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Cargo */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {t("Cargo")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Total Packages")}</Label>
              <Input
                type="number"
                value={form.total_packages}
                onChange={(e) => onF("total_packages", +e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Package Type")}</Label>
              <Input
                value={form.package_type}
                onChange={(e) => onF("package_type", e.target.value)}
                placeholder="cartons / drums / pallets"
                maxLength={40}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Net Weight (kg)")}</Label>
              <Input
                type="number"
                step="any"
                value={form.net_weight_kg}
                onChange={(e) => onF("net_weight_kg", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Gross Weight (kg)")}</Label>
              <Input
                type="number"
                step="any"
                value={form.gross_weight_kg}
                onChange={(e) => onF("gross_weight_kg", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Volume (CBM)")}</Label>
              <Input
                type="number"
                step="any"
                value={form.volume_cbm}
                onChange={(e) => onF("volume_cbm", e.target.value)}
              />
            </Col>
            <Col md="9" className="mb-2">
              <Label className="form-label">{t("Marks & Numbers")}</Label>
              <Input
                type="textarea"
                rows="2"
                value={form.marks_and_nos}
                onChange={(e) => onF("marks_and_nos", e.target.value)}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Costs */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {t("Costs (INR)")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Freight")}</Label>
              <Input
                type="number"
                step="any"
                value={form.freight_charges_inr}
                onChange={(e) => onF("freight_charges_inr", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Insurance")}</Label>
              <Input
                type="number"
                step="any"
                value={form.insurance_charges_inr}
                onChange={(e) => onF("insurance_charges_inr", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("CHA")}</Label>
              <Input
                type="number"
                step="any"
                value={form.cha_charges_inr}
                onChange={(e) => onF("cha_charges_inr", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Forwarder")}</Label>
              <Input
                type="number"
                step="any"
                value={form.forwarder_charges_inr}
                onChange={(e) => onF("forwarder_charges_inr", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Other")}</Label>
              <Input
                type="number"
                step="any"
                value={form.other_charges_inr}
                onChange={(e) => onF("other_charges_inr", e.target.value)}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Notes */}
      <Card className="mb-2">
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">
            {t("Notes")}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Row>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Public Notes")}</Label>
              <Input
                type="textarea"
                rows="3"
                value={form.notes}
                onChange={(e) => onF("notes", e.target.value)}
              />
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Internal Notes")}</Label>
              <Input
                type="textarea"
                rows="3"
                value={form.internal_notes}
                onChange={(e) => onF("internal_notes", e.target.value)}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      <div className="d-flex justify-content-end gap-1 mb-3">
        <Button
          color="secondary"
          outline
          onClick={() => navigate(`${appsRoot}/shipping`)}
          disabled={busy}
        >
          {t("Cancel")}
        </Button>
        <Button color="primary" onClick={onSave} disabled={busy}>
          {busy ? <Spinner size="sm" /> : <Save size={14} />} {t("Save")}
        </Button>
      </div>
    </Fragment>
  );
};

export default ShippingAddEdit;
