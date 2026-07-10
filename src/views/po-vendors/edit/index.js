// POV Edit page — draft-only header edit. Reached from the POV detail "Edit"
// CTA. Covers the fields that are safe to change before the PDF goes to the
// vendor: Deliver To, Remarks, and the three vendor terms printed on the PDF.
//
// Line items, vendor and charges are NOT edited here — they have their own
// flows. The backend enforces the same draft-only rule (`draftEditable` in
// po-vendor.service.ts), so this page is a convenience, not the guard.

import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  CardTitle,
  Row,
  Col,
  Label,
  Input,
  Button,
  Spinner,
  Alert,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Save } from "react-feather";

import DateInput from "@components/date-input";
import LocationSelect from "@src/views/_shared/LocationSelect";
import Notification from "@components/toast/notification";
import {
  getPoVendor,
  updatePoVendor,
  cleanPoVendorMessage,
} from "@src/views/po-vendors/store";
import { appsRoot } from "@constant/defaultValues";

const EditPoVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.poVendor);
  const p = store?.poVendorItem || {};
  const backTo = `${appsRoot}/po-vendors/view/${id}`;
  const isDraft = (p?.status || "").toLowerCase() === "draft";
  const loaded = p?._id === id;

  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchedThrough, setDispatchedThrough] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (id) dispatch(getPoVendor(id));
  }, [id, dispatch]);

  // Seed once the POV lands, so typing isn't clobbered by a later refetch.
  useEffect(() => {
    if (seeded || !loaded) return;
    setDeliveryAddressId(p.delivery_address_id || "");
    setExpectedArrival(p.expected_arrival_date || "");
    // `effective_remarks` = the POV's own notes, or the company default when it
    // has none. Seeding from it means saving pins the default onto this POV —
    // the same thing the create page does.
    setNotes(p.notes || p.effective_remarks || "");
    setDispatchedThrough(p.dispatched_through || "");
    setPaymentTerms(p.payment_terms || "");
    setDeliveryTerms(p.delivery_terms || "");
    setSeeded(true);
  }, [loaded, seeded, p]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPoVendorMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  const onSave = async () => {
    if (saving) return;
    if (!deliveryAddressId) {
      Notification("Validation", t("Pick a delivery address."), "warning");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updatePoVendor({
          id,
          data: {
            delivery_address_id: deliveryAddressId,
            // Omitted when blank — the DTO validates it as a date string, so
            // "" would 400. A set date can be changed but not cleared here.
            expected_arrival_date: expectedArrival || undefined,
            // Sent as "" (not undefined) so a cleared field is persisted.
            notes: notes?.trim() || "",
            dispatched_through: dispatchedThrough?.trim() || "",
            payment_terms: paymentTerms?.trim() || "",
            delivery_terms: deliveryTerms?.trim() || "",
          },
        })
      ).unwrap();
      navigate(backTo);
    } catch (_err) {
      // The store's error toast already fired.
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="text-center py-4">
        <Spinner />
      </div>
    );
  }

  return (
    <Fragment>
      <Card>
        <CardHeader>
          <CardTitle tag="h4">
            {t("Edit Vendor PO")}{" "}
            <span className="text-muted fw-normal">{p.voucher_no}</span>
          </CardTitle>
          <Button color="secondary" outline size="sm" onClick={() => navigate(backTo)}>
            <ArrowLeft size={14} className="me-25" /> {t("Back")}
          </Button>
        </CardHeader>
        <CardBody>
          {!isDraft && (
            <Alert color="warning" className="p-1 d-flex align-items-center">
              <AlertTriangle size={16} className="me-1" />
              <span>
                {t(
                  "This Vendor PO is no longer a draft — its header can't be edited."
                )}
              </span>
            </Alert>
          )}

          <Row>
            <Col md="6" className="mb-1">
              <Label className="form-label">
                {t("Deliver To")} <span className="text-danger">*</span>
              </Label>
              <LocationSelect
                value={deliveryAddressId}
                onChange={setDeliveryAddressId}
                isDisabled={!isDraft}
                autoSelectDefault={false}
              />
            </Col>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Expected Arrival Date")}</Label>
              <DateInput
                id="pov-edit-exp-arrival"
                value={expectedArrival}
                disabled={!isDraft}
                onChange={(d, str, iso) => setExpectedArrival(iso || "")}
                placeholder={t("YYYY-MM-DD")}
              />
            </Col>
          </Row>

          {/* Vendor-side terms printed on this POV's PDF. */}
          <Row>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Dispatched Through")}</Label>
              <Input
                maxLength={150}
                disabled={!isDraft}
                value={dispatchedThrough}
                onChange={(e) => setDispatchedThrough(e.target.value)}
                placeholder={t("e.g. By Sea")}
              />
            </Col>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Mode/Terms of Payment")}</Label>
              <Input
                maxLength={500}
                disabled={!isDraft}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder={t("e.g. 50% ADVANCE & 50% AT DISPATCH TIME")}
              />
            </Col>
          </Row>

          <Row>
            <Col md="12" className="mb-1">
              <Label className="form-label">{t("Terms of Delivery")}</Label>
              <Input
                maxLength={1000}
                disabled={!isDraft}
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                placeholder={t("e.g. OUR PFI NO:…, DELIVERY TERM: 4 TO 5 WEEKS")}
              />
            </Col>
          </Row>

          <Row>
            <Col md="12">
              <Label className="form-label">{t("Remarks")}</Label>
              <Input
                type="textarea"
                rows="3"
                disabled={!isDraft}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  "Printed on the Vendor PO PDF. Leave blank to use the company's default POV remarks."
                )}
              />
            </Col>
          </Row>
        </CardBody>
        <CardFooter className="d-flex justify-content-end gap-1">
          <Button color="secondary" outline onClick={() => navigate(backTo)}>
            {t("Cancel")}
          </Button>
          <Button
            color="primary"
            disabled={saving || !isDraft}
            onClick={onSave}
          >
            <Save size={14} className="me-25" />{" "}
            {saving ? t("Saving…") : t("Save")}
          </Button>
        </CardFooter>
      </Card>
    </Fragment>
  );
};

export default EditPoVendor;
