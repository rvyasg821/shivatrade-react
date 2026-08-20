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
//           Qty   — draft AND dispatched, until a GRN exists. On dispatched it
//                   seeds from the dispatched qty and is the single source of
//                   truth: saving sets BOTH ordered and dispatched to it (the
//                   backend syncs dispatched_qty), so no un-dispatched pending
//                   is left. Never below what a GRN already received.
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
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Save } from "react-feather";
import Select from "react-select";

import DateInput from "@components/date-input";
import LocationSelect from "@src/views/_shared/LocationSelect";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import {
  getPoVendor,
  updatePoVendor,
  cleanPoVendorMessage,
} from "@src/views/po-vendors/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import { getExchangeRateOptions } from "@src/views/currencies/store";
import { getCurrencySymbol } from "@src/utility/currency";
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
  const currencyStore = useSelector((s) => s.currency);
  const co = companyStore?.companyItem;
  const p = store?.poVendorItem || {};
  const backTo = `${appsRoot}/po-vendors/view/${id}`;
  const status = (p?.status || "").toLowerCase();
  const isDraft = status === "draft";
  const loaded = p?._id === id;

  const povLines = useMemo(() => p?.lines || [], [p]);
  const hasToleranceHold = povLines.some((l) => l.tolerance_hold);
  // `received_qty` already counts every non-cancelled GRN (drafts included).
  const hasReceipt = povLines.some((l) => num(l?.received_qty) > 1e-6);
  const canEditRate = (isDraft || status === "dispatched") && !hasReceipt;
  const canEditGst = isDraft;
  // Quantity: draft, and dispatched too (the vendor may ship more/less than
  // ordered, so the order qty can be corrected to match) — until a GRN exists,
  // same rule as the rate. On dispatched it seeds from the dispatched qty.
  const canEditQty = (isDraft || status === "dispatched") && !hasReceipt;

  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchedThrough, setDispatchedThrough] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [rateByLine, setRateByLine] = useState({});
  const [taxByLine, setTaxByLine] = useState({});
  // Per-line vendor discount % — editable under the same rule as the rate.
  const [discByLine, setDiscByLine] = useState({});
  // Ordered qty per line — draft-only, like GST%. Editable so a POV's quantity
  // can be corrected before it goes to the vendor.
  const [qtyByLine, setQtyByLine] = useState({});
  // HSN / Part No — draft-only, like GST%. Both are descriptive fields that
  // print on the vendor PDF, so they must not move once the document is out.
  const [hsnByLine, setHsnByLine] = useState({});
  const [partByLine, setPartByLine] = useState({});
  // Display currency — draft-only, like GST%/terms. Amounts render native to
  // the vendor's currency; no INR conversion rate on the POV anymore.
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Sales-Order traceability links (soft, reference only). Options are the
  // company's confirmed / in-process Sales Orders; value is an array of ids.
  const [soOptions, setSoOptions] = useState([]);
  const [soLoading, setSoLoading] = useState(false);
  const [pickedSoIds, setPickedSoIds] = useState([]);

  // GST is an Indian (INR) tax — it does not apply on a foreign-currency POV.
  // When the POV is in a foreign currency the GST is treated as 0 and the GST%
  // inputs are disabled/blanked.
  const gstApplies = currencyCode === "INR";

  useEffect(() => {
    if (id) dispatch(getPoVendor(id));
    dispatch(getCompanyDetails());
    dispatch(getExchangeRateOptions());
  }, [id, dispatch]);

  // Load Sales-Order options for the traceability multi-select (confirmed /
  // in-process only), mirroring the create form.
  useEffect(() => {
    let mounted = true;
    setSoLoading(true);
    instance
      .get(API_ENDPOINTS.purchaseOrders.list, {
        params: { orderBy: "createdAt", orderDirection: "desc", page: 1, perPage: 300 },
      })
      .then((resp) => {
        if (!mounted) return;
        const items = (resp?.data?.data || []).filter((p2) =>
          ["confirmed", "in_process"].includes(p2?.status)
        );
        setSoOptions(
          items.map((p2) => ({
            value: p2._id,
            label: [p2.voucher_no, p2.customer_name].filter(Boolean).join(" — "),
          }))
        );
      })
      .catch(() => mounted && setSoOptions([]))
      .finally(() => mounted && setSoLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Seed once the POV lands, so typing isn't clobbered by a later refetch.
  useEffect(() => {
    if (seeded || !loaded) return;
    setDeliveryAddressId(p.delivery_address_id || "");
    setExpectedArrival(p.expected_arrival_date || "");
    // `effective_remarks` = the POV's own notes, or the company default when it
    // has none. Seeding from it means saving pins the default onto this POV —
    // the same thing the create page does.
    setNotes(p.notes || p.effective_remarks || "");
    setInvoiceNumber(p.invoice_number || "");
    // Company defaults fill a term this POV never set. Applied here too (not
    // only in the effect below) because the company may already have landed —
    // otherwise this seed would blank out what that effect just filled.
    setDispatchedThrough(
      p.dispatched_through || co?.pov_default_dispatched_through || ""
    );
    setPaymentTerms(p.payment_terms || co?.pov_default_payment_terms || "");
    setDeliveryTerms(p.delivery_terms || co?.pov_default_delivery_terms || "");
    // Display currency — seeded once from the loaded POV.
    setCurrencyCode(p.currency_code || "INR");
    // Keyed by the POV line's OWN `_id`, never `purchase_order_line_id` — that
    // column is NULL on a standalone POV, which would collapse every row onto
    // one key and make editing one line edit them all.
    const rates = {};
    const taxes = {};
    const discs = {};
    const hsns = {};
    const parts = {};
    const qtys = {};
    for (const l of p.lines || []) {
      rates[l._id] = String(num(l.unit_price));
      taxes[l._id] = String(num(l.tax_pct));
      discs[l._id] = String(num(l.discount_pct));
      hsns[l._id] = l.hsn_code || "";
      parts[l._id] = l.part_no || "";
      // On a dispatched POV the qty field auto-fills with what was actually
      // dispatched (which may be an over-dispatch, e.g. 15 vs ordered 10). It is
      // the single source of truth: saving sets BOTH ordered and dispatched to
      // this number (backend syncs dispatched_qty), so no un-dispatched pending
      // is left behind. Draft keeps the order qty.
      qtys[l._id] = String(
        num(
          status === "dispatched" && num(l.dispatched_qty) > 0
            ? l.dispatched_qty
            : l.ordered_qty
        )
      );
    }
    setRateByLine(rates);
    setTaxByLine(taxes);
    setDiscByLine(discs);
    setHsnByLine(hsns);
    setPartByLine(parts);
    setQtyByLine(qtys);
    // Seed the Sales-Order traceability links from the loaded POV snapshot.
    setPickedSoIds(
      Array.isArray(p.linked_sales_orders)
        ? p.linked_sales_orders.map((s) => s.id).filter(Boolean)
        : []
    );
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

  // Home INR (excluded from the exchange-rate options, which list only foreign
  // targets) + every foreign currency that has a rate configured. Unlike an
  // export quotation, a POV to a domestic vendor is legitimately in ₹.
  const currencyOptions = useMemo(() => {
    const foreign = (currencyStore?.exchangeOptions || [])
      .filter((c) => c.code !== "INR")
      .map((c) => ({
        value: c.code,
        label: c.name ? `${c.code} - ${c.name}` : c.code,
      }));
    return [{ value: "INR", label: "INR (₹)" }, ...foreign];
  }, [currencyStore?.exchangeOptions]);

  // ── Line maths (mirrors the backend: line_total is qty × rate, tax-free) ──
  const lineRate = (l) => num(rateByLine[l._id]);
  // Edited qty when present, else the stored ordered_qty (read-only statuses).
  const lineQty = (l) =>
    qtyByLine[l._id] !== undefined ? num(qtyByLine[l._id]) : num(l.ordered_qty);
  // Per-line vendor discount % reduces the line total before GST.
  const lineDisc = (l) => num(discByLine[l._id]);
  const lineTotal = (l) =>
    round2(lineQty(l) * lineRate(l) * (1 - lineDisc(l) / 100));
  // GST is an Indian INR tax — 0 on a foreign-currency POV.
  const lineGst = (l) =>
    gstApplies ? round2((lineTotal(l) * num(taxByLine[l._id])) / 100) : 0;

  // NATIVE model (plan §6.3): POV line amounts are stored in the POV's own
  // currency, so the table renders them AS-IS — no conversion. dispRate is 1;
  // toDisp is identity. (exchange_rate is now INR-per-unit, frozen server-side
  // from the currency master for INR stock/books valuation only.)
  const sym = getCurrencySymbol(currencyCode) || "₹";
  const dispRate = 1;
  const toDisp = (native) => num(native);
  // Value for the editable Rate input, shown in the POV currency (no commas).
  const rateInputVal = (l) => {
    const v = rateByLine[l._id];
    if (v === "" || v == null) return "";
    return String(Math.round(toDisp(num(v)) * 10000) / 10000);
  };

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
  }, [povLines, rateByLine, taxByLine, qtyByLine, discByLine, gstApplies]);

  const setRate = (lineId, v) => {
    if (v === "") return setRateByLine((s) => ({ ...s, [lineId]: "" }));
    setRateByLine((s) => ({ ...s, [lineId]: String(Math.max(0, num(v))) }));
  };
  const setDisc = (lineId, v) => {
    if (v === "") return setDiscByLine((s) => ({ ...s, [lineId]: "" }));
    setDiscByLine((s) => ({
      ...s,
      [lineId]: String(Math.min(100, Math.max(0, num(v)))),
    }));
  };
  const setQty = (lineId, v) => {
    if (v === "") return setQtyByLine((s) => ({ ...s, [lineId]: "" }));
    setQtyByLine((s) => ({ ...s, [lineId]: String(Math.max(0, num(v))) }));
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

  const onSave = async (overrideFlag) => {
    if (saving) return;
    const data = {};
    if (overrideFlag) data.override = true;

    // Header fields are draft-only server-side — sending them on a dispatched
    // POV is a hard 400, so they only go in the payload while it is a draft.
    if (isDraft) {
      if (!deliveryAddressId) {
        Notification("Validation", t("Pick a delivery address."), "warning");
        return;
      }
      // Invoice number is OPTIONAL — sent as-is (may be blank).
      data.invoice_number = invoiceNumber.trim();
      data.delivery_address_id = deliveryAddressId;
      // Omitted when blank — the DTO validates it as a date string, so ""
      // would 400. A set date can be changed but not cleared here.
      data.expected_arrival_date = expectedArrival || undefined;
      // Sent as "" (not undefined) so a cleared field is persisted.
      data.notes = notes?.trim() || "";
      data.dispatched_through = dispatchedThrough?.trim() || "";
      data.payment_terms = paymentTerms?.trim() || "";
      data.delivery_terms = deliveryTerms?.trim() || "";
      // NATIVE model: line prices are stored in the POV currency. Only the
      // currency is sent — the POV carries no INR conversion rate anymore.
      data.currency_code = currencyCode || undefined;
    }

    // Sales-Order traceability links — always editable (a reference field), so
    // sent regardless of status. Empty array clears the links.
    data.linked_sales_order_ids = pickedSoIds;

    // Quantity is editable in draft and dispatched — block a save that would
    // send 0 / blank, which the backend rejects anyway (ordered_qty must be > 0).
    if (canEditQty) {
      const bad = povLines.find((l) => num(qtyByLine[l._id]) <= 0);
      if (bad) {
        Notification(
          "Validation",
          t("Quantity must be greater than 0 on every line."),
          "warning"
        );
        return;
      }
    }

    // `line_edits` patches in place by POV line id — unlike `lines` it never
    // deletes/recreates rows and needs no purchase_order_line_id, so it works
    // on a standalone POV too. Only send what this status allows.
    if (povLines.length && (canEditRate || canEditGst)) {
      data.line_edits = povLines.map((l) => ({
        _id: l._id,
        // GST is an Indian INR tax — force 0 on a foreign-currency POV.
        ...(canEditGst
          ? { tax_pct: gstApplies ? String(num(taxByLine[l._id])) : "0" }
          : {}),
        // Quantity — draft, and dispatched (reconcile to the shipped qty).
        ...(canEditQty ? { ordered_qty: String(num(qtyByLine[l._id])) } : {}),
        ...(canEditRate ? { unit_price: String(num(rateByLine[l._id])) } : {}),
        // Discount rides the same rule as the rate.
        ...(canEditRate ? { discount_pct: String(num(discByLine[l._id])) } : {}),
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
                      "This Vendor PO is already with the vendor. The header and GST are frozen — the rate and quantity can still be revised. Re-send the PDF after saving."
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
                ? t("Quantity, rate and GST are editable while the PO is a draft.")
                : canEditRate
                  ? t("Quantity and rate are editable at this status.")
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
                        {t("Rate")} ({sym})
                      </th>
                      <th style={{ width: 90 }} className="text-end">
                        {t("Disc")} %
                      </th>
                      <th style={{ width: 130 }} className="text-end">
                        {t("Taxable")} ({sym})
                      </th>
                      <th style={{ width: 95 }} className="text-end">
                        {t("GST")} %
                      </th>
                      <th style={{ width: 130 }} className="text-end">
                        {t("GST Value")} ({sym})
                      </th>
                      <th style={{ width: 140 }} className="text-end">
                        {t("Total")} ({sym})
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
                          <td>
                            {canEditQty ? (
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                bsSize="sm"
                                className="text-end"
                                value={qtyByLine[l._id] ?? ""}
                                onChange={(e) => setQty(l._id, e.target.value)}
                              />
                            ) : (
                              <div className="text-end text-muted">
                                {num(l.ordered_qty).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td>
                            {canEditRate ? (
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                bsSize="sm"
                                className="text-end"
                                value={rateInputVal(l)}
                                onChange={(e) =>
                                  setRate(
                                    l._id,
                                    e.target.value === ""
                                      ? ""
                                      : String(num(e.target.value) / dispRate)
                                  )
                                }
                              />
                            ) : (
                              <div className="text-end text-muted">
                                {sym}
                                {fmt(toDisp(l.unit_price))}
                              </div>
                            )}
                            {/* Show what it was, so a typo is obvious. */}
                            {changed && (
                              <small className="text-muted d-block text-end mt-25">
                                {t("was")} {sym}
                                {fmt(toDisp(l.unit_price))}
                              </small>
                            )}
                            {l.tolerance_hold && (
                              <div className="mt-25">
                                <Badge
                                  className="doc-badge doc-badge-orange"
                                  title={l.tolerance_hold_reason}
                                >
                                  {t("Tolerance Hold")}
                                </Badge>
                              </div>
                            )}
                          </td>
                          {/* Discount % — editable under the same rule as Rate. */}
                          <td>
                            {canEditRate ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                value={discByLine[l._id] ?? ""}
                                onChange={(e) => setDisc(l._id, e.target.value)}
                              />
                            ) : (
                              <div className="text-end text-muted">
                                {lineDisc(l) > 0 ? `${lineDisc(l)}%` : "-"}
                              </div>
                            )}
                          </td>
                          <td className="text-end">
                            {sym}
                            {fmt(toDisp(lineTotal(l)))}
                          </td>
                          <td>
                            {canEditGst ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                disabled={!gstApplies}
                                value={gstApplies ? (taxByLine[l._id] ?? "") : 0}
                                onChange={(e) => setTax(l._id, e.target.value)}
                              />
                            ) : (
                              <div className="text-end text-muted">
                                {gstApplies ? fmt(l.tax_pct) : fmt(0)}
                              </div>
                            )}
                          </td>
                          <td className="text-end">
                            {sym}
                            {fmt(toDisp(lineGst(l)))}
                          </td>
                          <td className="text-end fw-semibold">
                            {sym}
                            {fmt(toDisp(round2(lineTotal(l) + lineGst(l))))}
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
                      {/* Span # · Product · HSN · Part No · Unit · Qty · Rate ·
                          Disc% (8) so goods lands under Taxable, gst under GST
                          Value, grand under Total. */}
                      <td colSpan="8" className="text-end">
                        {t("Goods Totals")}
                      </td>
                      <td className="text-end">
                        {sym}
                        {fmt(toDisp(totals.goods))}
                      </td>
                      <td />
                      <td className="text-end">
                        {sym}
                        {fmt(toDisp(totals.gst))}
                      </td>
                      <td className="text-end">
                        {sym}
                        {fmt(toDisp(totals.grand))}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Net effect of the rate changes, before saving. */}
              {Math.abs(totals.delta) > 0.001 && (
                <div className="alert alert-primary py-50 px-1 mt-1 mb-0 small">
                  {t("Goods total changes from")}{" "}
                  <strong>
                    {sym}
                    {fmt(toDisp(totals.wasGoods))}
                  </strong>{" "}
                  →{" "}
                  <strong>
                    {sym}
                    {fmt(toDisp(totals.goods))}
                  </strong>{" "}
                  ({totals.delta > 0 ? "+" : "−"}
                  {sym}
                  {fmt(toDisp(Math.abs(totals.delta)))}).{" "}
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

          {/* Display currency — draft-only. Line prices stay in INR; this only
              sets how the saved POV renders. Read-only once dispatched. */}
          <Row>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Currency")}</Label>
              {isDraft ? (
                <Select
                  classNamePrefix="select"
                  options={currencyOptions}
                  value={
                    currencyOptions.find((o) => o.value === currencyCode) || null
                  }
                  onChange={(opt) => setCurrencyCode(opt ? opt.value : "INR")}
                  placeholder={t("Select currency")}
                />
              ) : (
                <div className="fw-semibold">
                  {getCurrencySymbol(currencyCode) || ""} {currencyCode}
                </div>
              )}
            </Col>
            {/* Optional Sales-Order traceability links — reference only, so
                editable at any status (not gated on isDraft). */}
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Link Sales Order(s)")}</Label>
              <Select
                isMulti
                isClearable
                classNamePrefix="select"
                options={soOptions}
                value={soOptions.filter((o) => pickedSoIds.includes(o.value))}
                onChange={(opts) =>
                  setPickedSoIds((opts || []).map((o) => o.value))
                }
                isLoading={soLoading}
                placeholder={t("Select sales order(s)")}
                noOptionsMessage={() => t("No sales orders")}
              />
            </Col>
            {/* Exchange Rate field removed — the POV is native to the vendor's
                currency and inventory values stock per-currency, so no INR
                conversion rate is needed. */}
          </Row>

          {/* Vendor's invoice number — optional (draft-only edit). */}
          <Row>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Invoice Number")}</Label>
              <Input
                maxLength={120}
                disabled={!isDraft}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={t("Vendor's invoice number")}
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
          {hasToleranceHold && (
            <Button
              color="warning"
              disabled={saving || !canSave}
              onClick={() => onSave(true)}
            >
              {saving ? t("Saving…") : t("Override & Clear Hold")}
            </Button>
          )}
          <Button
            color="primary"
            disabled={saving || !canSave}
            onClick={() => onSave()}
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
