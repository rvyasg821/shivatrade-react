// Slim "Generate Sales Order" page. The SO is now created on its own — vendor
// assignment + charges happen later on the SO detail via "Generate POV". This
// page collects only the Sales-Order (customer-side) fields: deliver-to
// address, customer PO #, and the advance. On success it redirects to the new
// Sales Order detail, where Vendor POs can be generated.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Spinner,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  FileText,
  ArrowLeft,
  AlertTriangle,
} from "react-feather";
import { Link } from "react-router-dom";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import LocationSelect from "@src/views/_shared/LocationSelect";
import { getQuotation } from "@src/views/quotations/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import { getCurrencySymbol } from "@src/utility/currency";
import { appsRoot } from "@constant/defaultValues";

const GenerateSalesOrder = () => {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const q = useSelector((s) => s.quotation?.quotationItem) || {};

  const [creating, setCreating] = useState(false);
  const [locations, setLocations] = useState([]);
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [customerPoNumber, setCustomerPoNumber] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  // Receipt-time rate, entered human-readable as "1 {CUR} = ₹ ___"
  // (₹-per-foreign) — same field/convention as the Invoice Record Payment
  // form. Converted to the SO's foreign-per-₹1 on submit.
  const [advanceExchangeRateInr, setAdvanceExchangeRateInr] = useState("");
  const [advanceExchangeRateTouched, setAdvanceExchangeRateTouched] =
    useState(false);
  const [advanceNotes, setAdvanceNotes] = useState("");
  // Company bank account the advance was received into ("received in bank").
  const [advanceBankId, setAdvanceBankId] = useState("");
  const companyStore = useSelector((s) => s.company);

  // Sales Orders already generated from this quotation (non-cancelled). If any
  // exist we block a duplicate generation and warn the user.
  const [existingSos, setExistingSos] = useState([]);

  // Load the quotation for the header voucher label + order total / currency.
  useEffect(() => {
    if (quotationId && q?._id !== quotationId)
      dispatch(getQuotation(quotationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  // Company bank accounts feed the "Received in bank" picker.
  useEffect(() => {
    dispatch(getCompanyDetails());
  }, [dispatch]);

  // Active bank accounts; prefer those matching the order currency, else all.
  const bankOptions = useMemo(() => {
    const active = (companyStore?.companyItem?.bank_accounts || []).filter(
      (b) => !b.soft_delete && b.is_active !== false
    );
    const cc = (q?.currency_code || "").toUpperCase();
    const matching = active.filter(
      (b) => (b.currency_code || "").toUpperCase() === cc
    );
    return (matching.length ? matching : active).map((b) => ({
      value: b._id,
      label: `${b.bank_name} — ${b.account_number}${
        b.currency_code ? ` · ${b.currency_code}` : ""
      }`,
    }));
  }, [companyStore?.companyItem?.bank_accounts, q?.currency_code]);

  // Prefill the Reference No. from the quotation being converted (the backend
  // also defaults it, but seeding here keeps the field visible + editable).
  useEffect(() => {
    if (q?._id === quotationId && q?.reference_no)
      setReferenceNo(q.reference_no);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?._id, q?.reference_no, quotationId]);

  // Seed "1 {CUR} = ₹___" from the quotation's own stored foreign-per-₹1 rate
  // (same default logic as the Invoice Record Payment form) — a same-rate
  // advance yields 0 forex gain/loss on the invoice it later seeds. Only
  // seeds once the quotation loads and the operator hasn't already typed a
  // rate themselves.
  useEffect(() => {
    if (q?._id !== quotationId || advanceExchangeRateTouched) return;
    const qRate = Number(q?.exchange_rate) || 1;
    const rateInr = qRate > 0 ? 1 / qRate : 1;
    setAdvanceExchangeRateInr(Number(rateInr.toFixed(2)).toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?._id, q?.exchange_rate, quotationId]);

  // Check whether this quotation already spawned a Sales Order.
  useEffect(() => {
    let cancelled = false;
    if (!quotationId) return undefined;
    instance
      .get(API_ENDPOINTS.purchaseOrders.list, {
        params: { quotation_id: quotationId, page: 1, perPage: 50 },
      })
      .then((resp) => {
        if (cancelled) return;
        const rows = resp?.data?.data || [];
        setExistingSos(
          rows.filter(
            (r) => (r?.status || "").toLowerCase() !== "cancelled"
          )
        );
      })
      .catch(() => {
        if (!cancelled) setExistingSos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [quotationId]);

  const hasExistingSo = existingSos.length > 0;

  const sym = useMemo(
    () => getCurrencySymbol(q?.currency_code) || q?.currency_symbol || "",
    [q?.currency_code, q?.currency_symbol]
  );
  // The backend rounds the Sales Order grand_total to a whole number on
  // create, so the order total we preview + pay against is the rounded value.
  // (New quotations are already whole; older ones may still store e.g. 80.44,
  // but the SO they generate becomes 80 — so preview/full-payment must use 80.)
  const grandTotal = Math.round(Number(q?.grand_total) || 0);

  // Advance may equal the order total (full prepayment) but not exceed it.
  const advanceTooHigh =
    advanceAmount !== "" &&
    grandTotal > 0 &&
    Number(advanceAmount) > grandTotal;

  // "Full payment" = advance equals the (whole-number) order total. Derived,
  // so typing the exact total also ticks the box and editing it unticks.
  const isFullPayment =
    advanceAmount !== "" &&
    grandTotal > 0 &&
    Number(advanceAmount) === grandTotal;

  const canCreate =
    !creating && !!deliveryAddressId && !advanceTooHigh && !hasExistingSo;

  const backToQuotation = () =>
    navigate(`${appsRoot}/quotations/view/${quotationId}`);

  const onCreate = async () => {
    if (creating) return;
    if (hasExistingSo) {
      Notification(
        "Validation",
        t("A Sales Order has already been generated from this quotation."),
        "warning"
      );
      return;
    }
    if (!deliveryAddressId) {
      Notification(
        "Validation",
        t("Pick a delivery address before generating the Sales Order."),
        "warning"
      );
      return;
    }
    if (advanceTooHigh) {
      Notification(
        "Validation",
        t("Advance amount cannot exceed the order total."),
        "warning"
      );
      return;
    }
    setCreating(true);
    try {
      // Convert the human-readable "1 {CUR} = ₹___" (₹-per-foreign) back to
      // the stored foreign-per-₹1, same as the Invoice Record Payment form.
      // Only meaningful for a foreign order — domestic just defaults to 1.
      const isForeign = (q?.currency_code || "INR").toUpperCase() !== "INR";
      const rateInr = Number(advanceExchangeRateInr || 0);
      const advanceExchangeRate =
        isForeign && rateInr > 0 ? String(1 / rateInr) : undefined;
      const resp = await instance.post(
        `${API_ENDPOINTS.purchaseOrders.fromQuotation}/${quotationId}`,
        {
          delivery_address_id: deliveryAddressId,
          customer_po_number: customerPoNumber?.trim() || undefined,
          reference_no: referenceNo?.trim() || undefined,
          advance_amount:
            advanceAmount === "" || advanceAmount == null
              ? undefined
              : String(advanceAmount),
          advance_date: advanceDate || undefined,
          advance_exchange_rate: advanceExchangeRate,
          advance_notes: advanceNotes?.trim() || undefined,
          advance_bank_account_id: advanceBankId || undefined,
          // Name snapshot so the ledger/PDF survives a later bank edit/removal.
          advance_bank_name:
            (bankOptions.find((o) => o.value === advanceBankId)?.label || "")
              .split(" — ")[0] || undefined,
        }
      );
      const purchaseOrder = resp?.data?.data?.purchase_order;
      if (!purchaseOrder?._id) {
        Notification(
          "Error",
          t("Sales Order creation failed. Please try again."),
          "warning"
        );
        return;
      }
      Notification(
        "Success",
        t(`Sales Order ${purchaseOrder.voucher_no || ""} created.`),
        "success"
      );
      navigate(`${appsRoot}/purchase-orders/view/${purchaseOrder._id}`);
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Failed to create Sales Order"),
        "warning"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Fragment>
      <div className="app-user-view">
        <Card className="mb-1">
          <CardHeader>
            <h4 className="mb-0">
              {t("Generate Sales Order")}{" "}
              <span className="text-muted">
                {t("from")} {t("Quotation")}
              </span>{" "}
              <code>{q?.voucher_no || ""}</code>
              {grandTotal > 0 && (
                <Badge color="light-primary" className="ms-1">
                  {sym}
                  {grandTotal.toLocaleString()}
                </Badge>
              )}
            </h4>
          </CardHeader>
          <CardBody>
            {hasExistingSo && (
              <div
                className="alert alert-danger d-flex align-items-center mb-3"
                style={{ fontWeight: 500 }}
              >
                <AlertTriangle
                  size={18}
                  className="me-1 flex-shrink-0"
                />
                <span style={{ padding: 6 }}>
                  {t(
                    "A Sales Order has already been generated from this quotation"
                  )}
                  {": "}
                  {existingSos.map((so, i) => (
                    <Fragment key={so?._id || i}>
                      {i > 0 ? ", " : ""}
                      <Link
                        to={`${appsRoot}/purchase-orders/view/${so?._id || ""}`}
                        className="fw-bold alert-link"
                      >
                        {so?.voucher_no || t("(draft)")}
                      </Link>
                    </Fragment>
                  ))}
                  {". "}
                  {t("Generating another would create a duplicate.")}
                </span>
              </div>
            )}

            {!hasExistingSo && (
              <div
                className="alert alert-info d-flex align-items-center mb-3"
                style={{ color: "#055160", fontWeight: 500 }}
              >
                <FileText size={16} className="me-1 flex-shrink-0" />
                <span>
                  {t(
                    "This creates the Sales Order only. Assign vendors and add charges later from the Sales Order detail using “Generate POV”."
                  )}
                </span>
              </div>
            )}

            <div className="row g-2">
              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  {t("Deliver goods to")}{" "}
                  <span className="text-danger">*</span>
                </label>
                <LocationSelect
                  value={deliveryAddressId}
                  onChange={setDeliveryAddressId}
                  onLocationsLoaded={setLocations}
                />
                <small className="text-muted">
                  {t(
                    "Vendors will deliver to this location. Pick from your Locations master."
                  )}
                </small>
                {!locations.length && (
                  <div className="alert alert-warning small mt-2 mb-0">
                    {t("No locations on file.")}{" "}
                    <a
                      href={`${appsRoot}/locations`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("Add one in Locations")}
                    </a>
                  </div>
                )}
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  {t("Customer PO #")}
                </label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={100}
                  value={customerPoNumber}
                  onChange={(e) => setCustomerPoNumber(e.target.value)}
                  placeholder={t("Buyer's own PO number")}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  {t("Reference No.")}
                </label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={100}
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder={t("Manual tracking reference")}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  {t("Advance Amount")}
                  {sym ? ` (${sym})` : ""}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`form-control${
                    advanceTooHigh ? " is-invalid" : ""
                  }`}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                />
                {advanceTooHigh ? (
                  <small className="text-danger">
                    {/* Show the true stored total. The backend now rounds the
                        grand_total to a whole number at quotation/SO/invoice,
                        so new docs are already whole; older docs show their
                        real (pre-rounding) value until recomputed. */}
                    {t("Cannot exceed the order total")} ({sym}
                    {grandTotal.toLocaleString()})
                  </small>
                ) : (
                  grandTotal > 0 && (
                    <small className="text-muted">
                      {t("Order total")}: {sym}
                      {grandTotal.toLocaleString()}
                    </small>
                  )
                )}
                {grandTotal > 0 && (
                  <div className="form-check mt-50">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="so-full-payment"
                      checked={isFullPayment}
                      onChange={(e) =>
                        setAdvanceAmount(
                          e.target.checked ? String(grandTotal) : ""
                        )
                      }
                    />
                    <label
                      className="form-check-label text-body"
                      htmlFor="so-full-payment"
                    >
                      {t("Full payment (100%)")}
                    </label>
                  </div>
                )}
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  {t("Advance Date")}
                </label>
                <DateInput
                  id="so-advance-date"
                  value={advanceDate}
                  onChange={(_d, _s, iso) => setAdvanceDate(iso || "")}
                />
              </div>

              {(q?.currency_code || "INR").toUpperCase() !== "INR" && (
                <div className="col-md-3">
                  <label className="form-label fw-semibold">
                    {t("Exchange rate at receipt")}
                  </label>
                  <div className="d-flex align-items-center">
                    <span className="me-1 text-nowrap">
                      1 {q.currency_code} = ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      value={advanceExchangeRateInr}
                      onChange={(e) => {
                        setAdvanceExchangeRateTouched(true);
                        setAdvanceExchangeRateInr(e.target.value);
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  {t("Received in Bank")}
                </label>
                <select
                  className="form-control"
                  value={advanceBankId}
                  onChange={(e) => setAdvanceBankId(e.target.value)}
                >
                  <option value="">{t("Select bank account")}</option>
                  {bankOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {t("Company account the advance was received into.")}
                </small>
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">
                  {t("Advance Notes")}
                </label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={200}
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
          <CardFooter className="d-flex justify-content-end gap-1">
            <Button
              color="secondary"
              outline
              onClick={backToQuotation}
              disabled={creating}
            >
              <ArrowLeft size={15} className="me-25" />
              {t("Cancel")}
            </Button>
            <Button color="success" onClick={onCreate} disabled={!canCreate}>
              {creating ? <Spinner size="sm" /> : <CheckCircle size={15} />}{" "}
              {t("Create Sales Order")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Fragment>
  );
};

export default GenerateSalesOrder;
