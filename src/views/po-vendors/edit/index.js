// POV Edit page — the single place a Vendor PO is edited after creation.
// Reached from the POV detail "Edit" CTA.
//
// Two sections, with different lifetimes (mirroring the backend allowlists in
// po-vendor.service.ts — this page is a convenience, not the guard):
//
//   Header  (Deliver To, terms, remarks)  — DRAFT ONLY. Once dispatched the
//           PDF is with the vendor and those printed terms are frozen.
//   Lines   Rate  — draft AND dispatched (client #3: suppliers revise their
//                   rates after the PO has gone out), but only until a GRN
//                   exists, because a receipt bakes the cost into stock.
//           GST % — draft only, same reason as the header terms.
//           Qty   — never editable here; it is locked to the SO line and the
//                   pending/coverage guards are computed from it.
//
// The GST *amount* is never stored: `line_total` is qty × price with no tax in
// it and the PDF derives the tax from `tax_pct` at render time, so writing the
// rate is all that is needed — nothing downstream can fall out of sync.

import { Fragment, useEffect, useMemo, useState } from "react";
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
  Table,
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
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import { appsRoot } from "@constant/defaultValues";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const round2 = (n) =>
  !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (v) =>
  num(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EditPoVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.poVendor);
  const companyStore = useSelector((s) => s.company);
  const co = companyStore?.companyItem;
  const p = store?.poVendorItem || {};
  const backTo = `${appsRoot}/po-vendors/view/${id}`;
  const status = (p?.status || "").toLowerCase();
  const isDraft = status === "draft";
  const loaded = p?._id === id;

  const povLines = useMemo(() => p?.lines || [], [p]);
  // `received_qty` already counts every non-cancelled GRN (drafts included).
  const hasReceipt = povLines.some((l) => num(l?.received_qty) > 1e-6);
  const canEditRate = (isDraft || status === "dispatched") && !hasReceipt;
  const canEditGst = isDraft;

  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchedThrough, setDispatchedThrough] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [rateByLine, setRateByLine] = useState({});
  const [taxByLine, setTaxByLine] = useState({});
  // HSN / Part No — draft-only, like GST%. Both are descriptive fields that
  // print on the vendor PDF, so they must not move once the document is out.
  const [hsnByLine, setHsnByLine] = useState({});
  const [partByLine, setPartByLine] = useState({});
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (id) dispatch(getPoVendor(id));
    dispatch(getCompanyDetails());
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
    // Company defaults fill a term this POV never set. Applied here too (not
    // only in the effect below) because the company may already have landed —
    // otherwise this seed would blank out what that effect just filled.
    setDispatchedThrough(
      p.dispatched_through || co?.pov_default_dispatched_through || ""
    );
    setPaymentTerms(p.payment_terms || co?.pov_default_payment_terms || "");
    setDeliveryTerms(p.delivery_terms || co?.pov_default_delivery_terms || "");
    // Keyed by the POV line's OWN `_id`, never `purchase_order_line_id` — that
    // column is NULL on a standalone POV, which would collapse every row onto
    // one key and make editing one line edit them all.
    const rates = {};
    const taxes = {};
    const hsns = {};
    const parts = {};
    for (const l of p.lines || []) {
      rates[l._id] = String(num(l.unit_price));
      taxes[l._id] = String(num(l.tax_pct));
      hsns[l._id] = l.hsn_code || "";
      parts[l._id] = l.part_no || "";
    }
    setRateByLine(rates);
    setTaxByLine(taxes);
    setHsnByLine(hsns);
    setPartByLine(parts);
    setSeeded(true);
  }, [loaded, seeded, p, co]);

  // Company defaults fill any term this POV never set. Runs once, when the
  // company lands — so it can't overwrite a field the operator has cleared.
  useEffect(() => {
    if (!co) return;
    if (co.pov_default_dispatched_through) {
      setDispatchedThrough((v) => v || co.pov_default_dispatched_through);
    }
    if (co.pov_default_payment_terms) {
      setPaymentTerms((v) => v || co.pov_default_payment_terms);
    }
    if (co.pov_default_delivery_terms) {
      setDeliveryTerms((v) => v || co.pov_default_delivery_terms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    co?.pov_default_dispatched_through,
    co?.pov_default_payment_terms,
    co?.pov_default_delivery_terms,
  ]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPoVendorMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  // ── Line maths (mirrors the backend: line_total is qty × rate, tax-free) ──
  const lineRate = (l) => num(rateByLine[l._id]);
  const lineTotal = (l) => round2(num(l.ordered_qty) * lineRate(l));
  const lineGst = (l) => round2((lineTotal(l) * num(taxByLine[l._id])) / 100);

  const totals = useMemo(() => {
    let goods = 0;
    let gst = 0;
    let wasGoods = 0;
    for (const l of povLines) {
      goods += lineTotal(l);
      gst += lineGst(l);
      wasGoods += round2(num(l.ordered_qty) * num(l.unit_price));
    }
    return {
      goods: round2(goods),
      gst: round2(gst),
      // Goods + GST. Vendor charges are NOT in here — they are added on the
      // detail page, so this is the goods total, not the POV grand total.
      grand: round2(goods + gst),
      wasGoods: round2(wasGoods),
      delta: round2(goods - wasGoods),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [povLines, rateByLine, taxByLine]);

  const setRate = (lineId, v) => {
    if (v === "") return setRateByLine((s) => ({ ...s, [lineId]: "" }));
    setRateByLine((s) => ({ ...s, [lineId]: String(Math.max(0, num(v))) }));
  };
  const setTax = (lineId, v) => {
    // Clamp at the edges: negative would cut the payable and >100 is not a GST
    // rate. The backend rejects both, but stop it at the input.
    if (v === "") return setTaxByLine((s) => ({ ...s, [lineId]: "" }));
    setTaxByLine((s) => ({
      ...s,
      [lineId]: String(Math.min(100, Math.max(0, num(v)))),
    }));
  };

  const onSave = async () => {
    if (saving) return;
    const data = {};

    // Header fields are draft-only server-side — sending them on a dispatched
    // POV is a hard 400, so they only go in the payload while it is a draft.
    if (isDraft) {
      if (!deliveryAddressId) {
        Notification("Validation", t("Pick a delivery address."), "warning");
        return;
      }
      data.delivery_address_id = deliveryAddressId;
      // Omitted when blank — the DTO validates it as a date string, so ""
      // would 400. A set date can be changed but not cleared here.
      data.expected_arrival_date = expectedArrival || undefined;
      // Sent as "" (not undefined) so a cleared field is persisted.
      data.notes = notes?.trim() || "";
      data.dispatched_through = dispatchedThrough?.trim() || "";
      data.payment_terms = paymentTerms?.trim() || "";
      data.delivery_terms = deliveryTerms?.trim() || "";
    }

    // `line_edits` patches in place by POV line id — unlike `lines` it never
    // deletes/recreates rows and needs no purchase_order_line_id, so it works
    // on a standalone POV too. Only send what this status allows.
    if (povLines.length && (canEditRate || canEditGst)) {
      data.line_edits = povLines.map((l) => ({
        _id: l._id,
        ...(canEditGst ? { tax_pct: String(num(taxByLine[l._id])) } : {}),
        ...(canEditRate ? { unit_price: String(num(rateByLine[l._id])) } : {}),
        // Sent as "" (not undefined) when cleared, so emptying a wrong HSN
        // actually persists instead of silently keeping the old one.
        ...(canEditGst
          ? {
              hsn_code: String(hsnByLine[l._id] ?? "").trim(),
              part_no: String(partByLine[l._id] ?? "").trim(),
            }
          : {}),
      }));
    }

    if (!Object.keys(data).length) {
      Notification("Info", t("Nothing can be edited at this status."), "info");
      return;
    }

    setSaving(true);
    try {
      await dispatch(updatePoVendor({ id, data })).unwrap();
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

  const canSave = isDraft || canEditRate;

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
          {/* What is editable right now, and why. */}
          {!isDraft && (
            <Alert
              color={canEditRate ? "info" : "warning"}
              className="p-1 d-flex align-items-center"
            >
              <AlertTriangle size={16} className="me-1" />
              <span>
                {canEditRate
                  ? t(
                      "This Vendor PO is already with the vendor. The header and GST are frozen — only the vendor's rate can be revised. Re-send the PDF after saving."
                    )
                  : hasReceipt
                    ? t(
                        "This Vendor PO already has a goods receipt, so nothing can be edited. Raise a Debit Note for any price difference."
                      )
                    : t(
                        "This Vendor PO is no longer a draft — its header can't be edited."
                      )}
              </span>
            </Alert>
          )}

          {/* ── Line items — first section: the vendor's rate is the reason
              this page is opened after dispatch (client #3). ── */}
          <div className="d-flex align-items-center justify-content-between mb-1">
            <h5 className="mb-0">{t("Line Items")}</h5>
            <small className="text-muted">
              {canEditGst
                ? t(
                    "Rate and GST are editable. Quantity is locked to the Sales Order line."
                  )
                : canEditRate
                  ? t("Only the rate is editable at this status.")
                  : t("Read-only at this status.")}
            </small>
          </div>

          {!povLines.length ? (
            <div className="alert alert-warning small mb-0">
              <AlertTriangle size={14} className="me-1" />
              {t("This Vendor PO has no lines.")}
            </div>
          ) : (
            <Fragment>
              <div className="border rounded">
                <Table responsive bordered size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 34 }}>#</th>
                      <th>{t("Product")}</th>
                      <th style={{ width: 120 }}>{t("HSN")}</th>
                      <th style={{ width: 120 }}>{t("Part No")}</th>
                      <th style={{ width: 70 }}>{t("Unit")}</th>
                      <th style={{ width: 90 }} className="text-end">
                        {t("Qty")}
                      </th>
                      {/* Ordered as the calculation reads, left to right:
                          Rate ×qty → Taxable ×% → GST Value + → Total. */}
                      <th style={{ width: 130 }} className="text-end">
                        {t("Rate")} (₹)
                      </th>
                      <th style={{ width: 130 }} className="text-end">
                        {t("Taxable")} (₹)
                      </th>
                      <th style={{ width: 95 }} className="text-end">
                        {t("GST")} %
                      </th>
                      <th style={{ width: 130 }} className="text-end">
                        {t("GST Value")} (₹)
                      </th>
                      <th style={{ width: 140 }} className="text-end">
                        {t("Total")} (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {povLines.map((l, idx) => {
                      const changed =
                        Math.abs(lineRate(l) - num(l.unit_price)) > 0.001;
                      return (
                        <tr key={l._id}>
                          <td>{idx + 1}</td>
                          <td>
                            <div className="fw-semibold">
                              {l?.product_name || "-"}
                            </div>
                            {l?.product_code && (
                              <small className="text-muted">
                                {l.product_code}
                              </small>
                            )}
                          </td>
                          {/* HSN + Part No — draft-only, same rule as GST%.
                              Text, not number: an HSN can carry a leading zero
                              and a part number is not a quantity. */}
                          <td>
                            {canEditGst ? (
                              <Input
                                type="text"
                                bsSize="sm"
                                placeholder={t("HSN")}
                                value={hsnByLine[l._id] ?? ""}
                                onChange={(e) =>
                                  setHsnByLine((s) => ({
                                    ...s,
                                    [l._id]: e.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <div className="text-muted">
                                {l?.hsn_code || "-"}
                              </div>
                            )}
                          </td>
                          <td>
                            {canEditGst ? (
                              <Input
                                type="text"
                                bsSize="sm"
                                placeholder={t("Part No")}
                                value={partByLine[l._id] ?? ""}
                                onChange={(e) =>
                                  setPartByLine((s) => ({
                                    ...s,
                                    [l._id]: e.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <div className="text-muted">
                                {l?.part_no || "-"}
                              </div>
                            )}
                          </td>
                          <td>{l?.unit || "-"}</td>
                          <td className="text-end text-muted">
                            {num(l.ordered_qty).toLocaleString()}
                          </td>
                          <td>
                            {canEditRate ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                value={rateByLine[l._id] ?? ""}
                                onChange={(e) => setRate(l._id, e.target.value)}
                              />
                            ) : (
                              <div className="text-end text-muted">
                                {fmt(l.unit_price)}
                              </div>
                            )}
                            {/* Show what it was, so a typo is obvious. */}
                            {changed && (
                              <small className="text-muted d-block text-end mt-25">
                                {t("was")} {fmt(l.unit_price)}
                              </small>
                            )}
                          </td>
                          <td className="text-end">₹{fmt(lineTotal(l))}</td>
                          <td>
                            {canEditGst ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                value={taxByLine[l._id] ?? ""}
                                onChange={(e) => setTax(l._id, e.target.value)}
                              />
                            ) : (
                              <div className="text-end text-muted">
                                {fmt(l.tax_pct)}
                              </div>
                            )}
                          </td>
                          <td className="text-end">₹{fmt(lineGst(l))}</td>
                          <td className="text-end fw-semibold">
                            ₹{fmt(round2(lineTotal(l) + lineGst(l)))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* "Goods" not "POV total": vendor charges are added on
                        the detail page, so this must not read as the POV's
                        grand total. */}
                    <tr className="table-light fw-bold">
                      <td colSpan="5" className="text-end">
                        {t("Goods Totals")}
                      </td>
                      <td className="text-end">₹{fmt(totals.goods)}</td>
                      <td />
                      <td className="text-end">₹{fmt(totals.gst)}</td>
                      <td className="text-end">₹{fmt(totals.grand)}</td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Net effect of the rate changes, before saving. */}
              {Math.abs(totals.delta) > 0.001 && (
                <div className="alert alert-primary py-50 px-1 mt-1 mb-0 small">
                  {t("Goods total changes from")}{" "}
                  <strong>₹{fmt(totals.wasGoods)}</strong> →{" "}
                  <strong>₹{fmt(totals.goods)}</strong> (
                  {totals.delta > 0 ? "+" : "−"}₹{fmt(Math.abs(totals.delta))}).{" "}
                  {t(
                    "Percentage vendor charges and the balance payable are recalculated on save."
                  )}
                </div>
              )}
              <div className="small text-muted mt-1">
                {t(
                  "CGST/SGST vs IGST is decided from your GSTIN and the vendor's when the PDF is generated."
                )}
              </div>
            </Fragment>
          )}

          {/* ── Header / vendor terms — draft-only (the PDF is with the
              vendor once dispatched, so its printed terms are frozen). ── */}
          <hr className="my-2" />
          <h5 className="mb-1">{t("Delivery & Terms")}</h5>

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
                type="textarea"
                rows="3"
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
          <Button color="primary" disabled={saving || !canSave} onClick={onSave}>
            <Save size={14} className="me-25" />{" "}
            {saving ? t("Saving…") : t("Save")}
          </Button>
        </CardFooter>
      </Card>
    </Fragment>
  );
};

export default EditPoVendor;
