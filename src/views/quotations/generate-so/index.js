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
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");

  // Sales Orders already generated from this quotation (non-cancelled). If any
  // exist we block a duplicate generation and warn the user.
  const [existingSos, setExistingSos] = useState([]);

  // Load the quotation for the header voucher label + order total / currency.
  useEffect(() => {
    if (quotationId && q?._id !== quotationId)
      dispatch(getQuotation(quotationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

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
  const grandTotal = Number(q?.grand_total) || 0;

  const advanceTooHigh =
    advanceAmount !== "" &&
    grandTotal > 0 &&
    Number(advanceAmount) >= grandTotal;

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
        t("Advance amount must be less than the order total."),
        "warning"
      );
      return;
    }
    setCreating(true);
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.purchaseOrders.fromQuotation}/${quotationId}`,
        {
          delivery_address_id: deliveryAddressId,
          customer_po_number: customerPoNumber?.trim() || undefined,
          advance_amount:
            advanceAmount === "" || advanceAmount == null
              ? undefined
              : String(advanceAmount),
          advance_date: advanceDate || undefined,
          advance_notes: advanceNotes?.trim() || undefined,
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
                    {t("Must be less than the order total")} ({sym}
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
