// GRN detail — reference chain header + receipt lines with an editable
// quality check (accepted / rejected qty), save, status, and PDF.
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Badge,
  Spinner,
  Table,
} from "reactstrap";
import ReactPaginate from "react-paginate";
import {
  ArrowLeft,
  Download,
  Save,
  CheckCircle,
  XCircle,
  CornerUpLeft,
  ExternalLink,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { getGrn, updateGrn, createGrnFromPov, cleanGrnMessage } from "../store";
import { getPoVendor } from "@src/views/po-vendors/store";
import { stopLoading } from "../../loadingstore";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { openPdfViewer } from "@src/utility/pdf";
import { downloadExcel } from "@src/utility/excel";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { getCurrencySymbol } from "@src/utility/currency";

const STATUS_COLOR = {
  draft: "secondary",
  confirmed: "success",
  cancelled: "danger",
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const GrnView = () => {
  const { id, povId } = useParams();
  const isCreate = !!povId; // /grn/create/:povId → draft, not persisted yet
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  const store = useSelector((s) => s.grn);
  const povStore = useSelector((s) => s.poVendor);
  // In create mode the form is a LOCAL draft built from the POV — nothing is
  // saved until the user clicks Save (mirrors creating an RFQ from a Lead).
  const [draftGrn, setDraftGrn] = useState(null);
  const [saving, setSaving] = useState(false);
  const grn = isCreate ? draftGrn : store?.grnItem;

  // Editable quality-check map keyed by grn line id.
  const [qc, setQc] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  // Active (non-cancelled) Debit Note already raised against this GRN, if any.
  const [existingDn, setExistingDn] = useState(null);

  // Editable vendor invoice number (defaults from the POV on GRN create).
  const [invoiceNo, setInvoiceNo] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  // Seed once (keyed on the loaded doc's id) so it doesn't clobber typing.
  // Create mode → default from the POV's invoice number; detail → the saved GRN.
  useEffect(() => {
    if (isCreate)
      setInvoiceNo(povStore?.poVendorItem?.invoice_number || "");
    else setInvoiceNo(store?.grnItem?.po_vendor_invoice_number || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, store?.grnItem?._id, povStore?.poVendorItem?._id]);

  const saveInvoiceNo = () => {
    if (!id) return;
    setSavingInvoice(true);
    instance
      .put(`${API_ENDPOINTS.grn.invoiceNumber}/${id}`, {
        invoice_number: invoiceNo,
      })
      .then(() => {
        Notification("Success", t("Invoice number saved"), "success");
        dispatch(getGrn(id));
      })
      .catch((e) =>
        Notification(
          "Error",
          e?.response?.data?.message || t("Could not save invoice number"),
          "warning"
        )
      )
      .finally(() => setSavingInvoice(false));
  };

  useEffect(() => {
    dispatch(stopLoading());
    if (isCreate) dispatch(getPoVendor(povId));
    else dispatch(getGrn(id));
  }, [id, povId, isCreate, dispatch]);

  // Build the local draft from the POV's dispatched lines (create mode only).
  // Each line is seeded to receive the qty still outstanding on the POV.
  useEffect(() => {
    if (!isCreate) return;
    const pov = povStore?.poVendorItem;
    if (!pov || pov._id !== povId) return;
    const lines = (pov.lines || [])
      .map((l) => ({ l, remaining: num(l.dispatched_qty) - num(l.received_qty) }))
      .filter(({ remaining }) => remaining > 1e-6)
      .map(({ l, remaining }) => ({
        _id: l._id, // po_vendor_line_id used as the draft/QC key
        po_vendor_line_id: l._id,
        product_name: l.product_name,
        part_no: l.part_no,
        hsn_code: l.hsn_code,
        unit: l.unit,
        // Agreed price (vendor currency) — drives the read-only Price/Amount.
        unit_price: l.unit_price,
        // GST% + discount% from the POV line — read-only GST column.
        tax_pct: l.tax_pct,
        discount_pct: l.discount_pct,
        dispatched_qty: remaining.toFixed(2),
        received_qty: remaining.toFixed(2),
        accepted_qty: remaining.toFixed(2),
        rejected_qty: "0.00",
        batch_no: "",
        remarks: "",
      }));
    setDraftGrn({
      _id: null,
      voucher_no: t("New GRN"),
      status: "draft",
      vendor_name: pov.vendor_name,
      po_vendor_id: pov._id,
      po_vendor_voucher_no: pov.voucher_no,
      purchase_order_voucher_no: pov.purchase_order_voucher_no,
      // Vendor currency of the POV — the Price column renders in it.
      currency_code: pov.currency_code,
      grn_date: null,
      lines,
    });
  }, [isCreate, povId, povStore?.poVendorItem, t]);

  // A Debit Note can only be raised once the GRN is confirmed; look up any
  // existing one so we show a link instead of a duplicate "Create" button.
  useEffect(() => {
    if (!id || grn?.status !== "confirmed") {
      setExistingDn(null);
      return;
    }
    instance
      .get(`${API_ENDPOINTS.debitNotes.forGrn}/${id}`)
      .then((resp) => {
        const list = resp?.data?.data || [];
        setExistingDn(list.find((d) => d.status !== "cancelled") || null);
      })
      .catch(() => setExistingDn(null));
  }, [id, grn?.status]);

  const hasRejected = useMemo(
    () => (grn?.lines || []).some((l) => num(l.rejected_qty) > 0),
    [grn?.lines]
  );

  // Open the Debit Note draft form (not persisted until Save).
  const onCreateDebitNote = () => {
    navigate(`${appsRoot}/debit-notes/create/${id}`);
  };

  // Seed the editable QC fields from the loaded GRN lines.
  useEffect(() => {
    if (!grn?.lines) return;
    const m = {};
    for (const l of grn.lines) {
      m[l._id] = {
        received_qty:
          l.received_qty != null ? num(l.received_qty).toFixed(2) : "",
        accepted_qty:
          l.accepted_qty != null ? num(l.accepted_qty).toFixed(2) : "",
        rejected_qty:
          l.rejected_qty != null ? num(l.rejected_qty).toFixed(2) : "",
        batch_no: l.batch_no || "",
        remarks: l.remarks || "",
      };
    }
    setQc(m);
  }, [grn?._id, grn?.lines?.length]);

  useEffect(() => {
    // Create-from-POV (GRN_CRTD) is the intermediate step of the create flow:
    // create → apply QC (update). Suppress its toast so only the final
    // save/confirm message shows (otherwise two success toasts appear).
    if (store?.success && store?.actionFlag !== "GRN_CRTD") {
      Notification("Success", store.success, "success");
    }
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanGrnMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  const lines = grn?.lines || [];
  // Qty + QC are editable only while draft. Once confirmed/cancelled the GRN
  // is locked (reverse via "Cancel GRN", which re-opens the POV).
  const isLocked = (grn?.status || "") !== "draft";

  // Client-side pagination for the line table (not a DataTable).
  const totalLines = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalLines / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageLines = lines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  const totals = useMemo(() => {
    let dispatched = 0;
    let received = 0;
    let rejected = 0;
    let pending = 0;
    let amount = 0;
    let gst = 0;
    for (const l of lines) {
      // This GRN's share of dispatched = full dispatched − other GRNs' accounted.
      const base = Math.max(
        0,
        num(l.dispatched_qty) - num(l.other_received_qty ?? 0)
      );
      // "Received" column = good qty (stored as accepted_qty).
      const acc = num(qc[l._id]?.accepted_qty ?? l.accepted_qty);
      const rej = num(qc[l._id]?.rejected_qty ?? l.rejected_qty);
      dispatched += base;
      received += acc;
      rejected += rej;
      pending += Math.max(0, base - acc - rej);
      // Amount = received (good) qty × unit price × (1−disc%) (taxable);
      // GST = Amount × GST% (vendor currency).
      const taxable = acc * num(l.unit_price) * (1 - num(l.discount_pct) / 100);
      amount += taxable;
      gst += taxable * (num(l.tax_pct) / 100);
    }
    return {
      dispatched,
      received,
      rejected,
      pending,
      amount,
      gst,
      total: amount + gst,
    };
  }, [lines, qc]);

  const setField = (lineId, field, value) =>
    setQc((m) => ({ ...m, [lineId]: { ...m[lineId], [field]: value } }));

  const r4 = (n) => Math.round(num(n) * 10000) / 10000;

  // Received (good) and Rejected are INDEPENDENT inputs — whatever isn't
  // received-good or rejected stays Pending (= Dispatched − Received − Rejected),
  // so a line can be partially received now and finished on a later GRN. The
  // only limit is Received + Rejected ≤ Dispatched (no over-receipt). The
  // "Received" column is the good qty, stored as accepted_qty.
  const acceptedOf = (l) => r4(qc[l._id]?.accepted_qty ?? l.accepted_qty ?? 0);
  const rejectedOf = (l) => r4(qc[l._id]?.rejected_qty ?? l.rejected_qty ?? 0);

  // This GRN's share of the dispatched qty = full dispatched minus what OTHER
  // GRNs of the same POV already accounted (received good + rejected). In
  // create mode there are no other GRNs, so base = the seeded remaining.
  const baseOf = (l) =>
    Math.max(0, r4(num(l.dispatched_qty) - num(l.other_received_qty ?? 0)));

  // Pending = base − Received(good) − Rejected. Never negative.
  const pendingOf = (l) =>
    Math.max(0, r4(baseOf(l) - acceptedOf(l) - rejectedOf(l)));

  // Read-only pricing (vendor currency, from the source POV line): Price is the
  // agreed unit rate; Amount = Received(good) qty × Price × (1−disc%) (taxable);
  // GST = Amount × GST%. Amount + GST is the GST-inclusive value that posts to
  // the vendor ledger when the GRN is confirmed.
  const sym = getCurrencySymbol(grn?.currency_code || "INR") || "";
  const priceOf = (l) => num(l.unit_price);
  const discOf = (l) => num(l.discount_pct);
  const taxOf = (l) => num(l.tax_pct);
  const amountOf = (l) => acceptedOf(l) * priceOf(l) * (1 - discOf(l) / 100);
  const gstOf = (l) => amountOf(l) * (taxOf(l) / 100);
  // GST-inclusive total = taxable + GST — the value that posts to the ledger.
  const totalOf = (l) => amountOf(l) + gstOf(l);
  const money = (n) =>
    num(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const onReceivedChange = (l, raw) => {
    const base = baseOf(l);
    let v = num(raw);
    if (!Number.isFinite(v) || v < 0) v = 0;
    // Cap so Received + Rejected can't exceed the base; the rest is Pending.
    const maxReceived = r4(base - rejectedOf(l));
    if (v > maxReceived) v = maxReceived;
    setField(l._id, "accepted_qty", raw === "" ? "" : String(v));
  };

  const onRejectedChange = (l, raw) => {
    const base = baseOf(l);
    let v = num(raw);
    if (!Number.isFinite(v) || v < 0) v = 0;
    const maxRejected = r4(base - acceptedOf(l));
    if (v > maxRejected) v = maxRejected;
    setField(l._id, "rejected_qty", raw === "" ? "" : String(v));
  };

  const onSave = async (statusOverride) => {
    // Create mode: persist now — create the GRN from the POV (backend seeds the
    // lines), then apply the operator's QC edits, then open the saved GRN.
    if (isCreate) {
      if (saving) return;
      setSaving(true);
      try {
        const created = await dispatch(
          createGrnFromPov({ povId, data: { invoice_number: invoiceNo } })
        ).unwrap();
        const newGrn = created?.grnItem;
        if (!newGrn?._id)
          throw new Error(created?.error || t("Could not create GRN."));
        // QC is keyed by po_vendor_line_id → map onto the new GRN lines.
        const linesPayload = (newGrn.lines || []).map((gl) => {
          const q = qc[gl.po_vendor_line_id] || {};
          const acc = num(q.accepted_qty ?? gl.accepted_qty ?? "0");
          const rej = num(q.rejected_qty ?? gl.rejected_qty ?? "0");
          return {
            _id: gl._id,
            // Total accounted = good (Received) + Rejected.
            received_qty: String(r4(acc + rej)),
            accepted_qty: String(acc),
            rejected_qty: String(rej),
            batch_no: q.batch_no ?? "",
            remarks: q.remarks ?? "",
          };
        });
        const data = { lines: linesPayload };
        if (statusOverride) data.status = statusOverride;

        if (statusOverride) {
          // "Create & Confirm" — same raw-axios probe as the update branch
          // below: bypasses Redux so a tolerance rejection can't race the
          // generic error-toast effect (see that branch's comment).
          try {
            await instance.put(
              `${API_ENDPOINTS.grn.update}/${newGrn._id}`,
              data
            );
          } catch (err) {
            const errMsg =
              err?.response?.data?.message || err?.message || String(err);
            if (/outside quantity tolerance/i.test(String(errMsg))) {
              const result = await mySwal.fire({
                title: t("Outside tolerance"),
                text: String(errMsg),
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: t("Confirm anyway"),
                cancelButtonText: t("Go back and adjust"),
                customClass: { confirmButton: "btn btn-warning", cancelButton: "btn btn-outline-secondary ms-1" },
                buttonsStyling: false,
              });
              if (result.isConfirmed) {
                dispatch(
                  updateGrn({
                    id: newGrn._id,
                    data: { ...data, override: true },
                  })
                );
              }
              // The GRN was already created (as draft) either way — go to it
              // so the QC state isn't lost, whether or not it got confirmed.
              navigate(`${appsRoot}/grn/view/${newGrn._id}`, {
                replace: true,
              });
              return;
            }
            throw err;
          }
        } else {
          dispatch(updateGrn({ id: newGrn._id, data }));
        }
        // Replace (not push) so Back after saving returns to the POV, not to the
        // now-submitted create form.
        navigate(`${appsRoot}/grn/view/${newGrn._id}`, { replace: true });
      } catch (err) {
        Notification(
          "Error",
          err?.response?.data?.message || err?.message || t("Could not create GRN."),
          "warning"
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload = {
      lines: lines.map((l) => {
        const acc = num(qc[l._id]?.accepted_qty ?? l.accepted_qty ?? "0");
        const rej = num(qc[l._id]?.rejected_qty ?? l.rejected_qty ?? "0");
        return {
          _id: l._id,
          // Total accounted = good (Received) + Rejected.
          received_qty: String(r4(acc + rej)),
          accepted_qty: String(acc),
          rejected_qty: String(rej),
          batch_no: qc[l._id]?.batch_no ?? l.batch_no ?? "",
          remarks: qc[l._id]?.remarks ?? l.remarks ?? "",
        };
      }),
    };
    if (statusOverride) payload.status = statusOverride;

    if (!statusOverride) {
      // Plain "Save" (draft) — the tolerance check never runs on a draft
      // (backend gates it on status === confirmed), so no special handling
      // needed. Normal thunk path.
      dispatch(updateGrn({ id, data: payload }));
      return;
    }

    // "Save & Confirm" — probe with a RAW axios call first, bypassing Redux
    // entirely, so a tolerance rejection never touches `store.error` and
    // can't race the generic error-toast effect (that effect fires off ANY
    // dispatch(updateGrn(...)) whose payload carries an error — trying to
    // suppress it AFTER dispatching lost that race in practice, since the
    // effect can run before the next line of this function does).
    try {
      await instance.put(`${API_ENDPOINTS.grn.update}/${id}`, payload);
      // Succeeded outside Redux — re-dispatch through the normal thunk so
      // the store/UI refreshes as usual (idempotent: same payload).
      dispatch(updateGrn({ id, data: payload }));
    } catch (err) {
      const errMsg =
        err?.response?.data?.message || err?.message || String(err);
      if (/outside quantity tolerance/i.test(String(errMsg))) {
        const result = await mySwal.fire({
          title: t("Outside tolerance"),
          text: String(errMsg),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: t("Confirm anyway"),
          cancelButtonText: t("Go back and adjust"),
          customClass: { confirmButton: "btn btn-warning", cancelButton: "btn btn-outline-secondary ms-1" },
          buttonsStyling: false,
        });
        if (result.isConfirmed) {
          dispatch(
            updateGrn({ id, data: { ...payload, override: true } })
          );
        }
        return;
      }
      // Some other error — fall through to the normal thunk path so its
      // usual toast shows (keeps existing behaviour for non-tolerance errors).
      dispatch(updateGrn({ id, data: payload }));
    }
  };

  // Open the GRN PDF in the in-app viewer (new tab, frontend origin) — fetched
  // via the authed API, shown there, with a correctly-named Download.
  const downloadPdf = () =>
    openPdfViewer({ kind: "grn", id, name: grn?.voucher_no });
  const downloadXlsx = () =>
    downloadExcel({ kind: "grn", id, name: grn?.voucher_no });

  if (!grn) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  const chip = (label, value) =>
    value ? (
      <span className="me-1">
        {label}: <span className="fw-semibold">{value}</span>
      </span>
    ) : null;

  return (
    <Fragment>
      <Card className="mb-1">
        <CardBody className="d-flex flex-wrap justify-content-between align-items-start gap-1">
          <div>
            <h4 className="mb-0">
              {grn.voucher_no || t("GRN")}{" "}
              <Badge
                color={`light-${STATUS_COLOR[grn.status] || "secondary"}`}
                className="text-capitalize ms-1"
              >
                {grn.status}
              </Badge>
            </h4>
            <div className="mt-50">
              <div
                className="text-uppercase text-muted fw-bold"
                style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
              >
                {t("Reference Chain")}
              </div>
              {grn.vendor_name && (
                <div className="fw-semibold text-capitalize mt-25">
                  {grn.vendor_name}
                </div>
              )}
              <div className="text-muted small d-flex flex-wrap gap-1">
                {chip(t("Vendor Code"), grn.vendor_code)}
                {chip(t("VPO"), grn.po_vendor_voucher_no)}
                {chip(t("SO"), grn.purchase_order_voucher_no)}
                {chip(t("Customer PO"), grn.customer_po_number)}
                {chip(t("Date"), grn.grn_date ? formatDate(grn.grn_date) : null)}
              </div>
              {/* Editable vendor invoice number — auto-filled from the POV. In
                  create mode it's saved with the GRN (no separate button); on a
                  saved GRN it has its own Save button. */}
              <div className="d-flex align-items-center gap-1 mt-1">
                <span className="text-muted small fw-semibold text-nowrap">
                  {t("Invoice No")}:
                </span>
                <Input
                  bsSize="sm"
                  style={{ maxWidth: 220 }}
                  value={invoiceNo}
                  placeholder={t("Vendor invoice number")}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
                <Button
                  color="primary"
                  size="sm"
                  // Create mode: the GRN isn't persisted yet, so "Save" here
                  // saves it as a draft (carrying the invoice number). Saved
                  // GRN: update just the invoice number in place.
                  onClick={isCreate ? () => onSave() : saveInvoiceNo}
                  disabled={isCreate ? saving : savingInvoice}
                >
                  {(isCreate ? saving : savingInvoice) ? (
                    <Spinner size="sm" />
                  ) : (
                    t("Save")
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="d-flex gap-1">
            {grn.status === "confirmed" && existingDn ? (
              <Button
                color="warning"
                outline
                size="sm"
                onClick={() =>
                  navigate(`${appsRoot}/debit-notes/view/${existingDn._id}`)
                }
              >
                <ExternalLink size={14} className="me-25" />{" "}
                {t("View Debit Note")}
              </Button>
            ) : grn.status === "confirmed" && hasRejected ? (
              <Button color="warning" size="sm" onClick={onCreateDebitNote}>
                {(
                  <>
                    <CornerUpLeft size={14} className="me-25" />{" "}
                    {t("Create Debit Note")}
                  </>
                )}
              </Button>
            ) : null}
            {!isCreate && (
              <Button color="secondary" outline size="sm" onClick={downloadPdf}>
                <Download size={14} className="me-25" /> {t("PDF")}
              </Button>
            )}
            {!isCreate && (
              <Button color="secondary" outline size="sm" onClick={downloadXlsx}>
                <Download size={14} className="me-25" /> {t("Excel")}
              </Button>
            )}
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() =>
                // Pop history when we got here in-app (returns to the existing
                // POV-detail entry) instead of PUSHING a new one — otherwise the
                // POV page's own navigate(-1) lands back here. Fall back to an
                // explicit path only on a deep-link/refresh (no history to pop).
                window.history.state?.idx > 0
                  ? navigate(-1)
                  : navigate(
                      grn?.po_vendor_id
                        ? `${appsRoot}/po-vendors/view/${grn.po_vendor_id}`
                        : `${appsRoot}/po-vendors`
                    )
              }
            >
              <ArrowLeft size={14} /> {t("Back")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="d-flex justify-content-between align-items-center">
          <CardTitle tag="h6" className="mb-0">
            {t("Receipt & Quality Check")}
          </CardTitle>
          {!isLocked && (
            <div className="d-flex gap-1">
              {grn.status === "draft" && (
                <Button
                  color="primary"
                  size="sm"
                  outline
                  disabled={saving}
                  onClick={() => onSave()}
                >
                  <Save size={14} className="me-25" />{" "}
                  {saving
                    ? t("Saving…")
                    : isCreate
                    ? t("Save As Draft")
                    : t("Save")}
                </Button>
              )}
              {grn.status === "draft" && (
                <Button
                  color="success"
                  size="sm"
                  disabled={saving}
                  onClick={() => onSave("confirmed")}
                >
                  <CheckCircle size={14} className="me-25" />{" "}
                  {isCreate ? t("Create & Confirm") : t("Save & Confirm")}
                </Button>
              )}
              {!isCreate && (
                <Button
                  color="danger"
                  size="sm"
                  outline
                  onClick={() => onSave("cancelled")}
                >
                  <XCircle size={14} className="me-25" /> {t("Cancel GRN")}
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardBody className="px-0">
          <div className="table-responsive px-2">
            <style>{`
              .grn-qc-table th,
              .grn-qc-table td { padding: 0.6rem 0.85rem; }
            `}</style>
            <Table
              bordered
              size="sm"
              className="mb-0 align-middle grn-qc-table"
            >
              <thead className="table-light">
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th style={{ minWidth: 200 }}>{t("Item")}</th>
                  <th className="text-end" style={{ width: 90 }}>
                    {t("Dispatched")}
                  </th>
                  <th className="text-end" style={{ width: 120 }}>
                    {t("Received")}
                  </th>
                  <th className="text-end" style={{ width: 120 }}>
                    {t("Rejected")}
                  </th>
                  <th className="text-end" style={{ width: 90 }}>
                    {t("Pending")}
                  </th>
                  <th className="text-end" style={{ width: 110 }}>
                    {t("Price")}
                    {grn?.currency_code ? ` (${grn.currency_code})` : ""}
                  </th>
                  <th className="text-end" style={{ width: 120 }}>
                    {t("Amount")}
                  </th>
                  <th className="text-end" style={{ width: 120 }}>
                    {t("GST")}
                  </th>
                  <th className="text-end" style={{ width: 130 }}>
                    {t("Total Amt")}
                  </th>
                  <th style={{ width: 130 }}>{t("Batch")}</th>
                  <th style={{ minWidth: 150 }}>{t("Remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {pageLines.map((l, i) => {
                  const sub = [
                    l.part_no ? `Part: ${l.part_no}` : null,
                    l.hsn_code ? `HSN: ${l.hsn_code}` : null,
                  ].filter(Boolean);
                  return (
                    <tr key={l._id}>
                      <td className="text-muted">{pageStart + i + 1}</td>
                      <td>
                        <div
                          className="fw-semibold text-capitalize"
                          ref={(el) =>
                            el &&
                            el.style.setProperty(
                              "color",
                              "#09418B",
                              "important"
                            )
                          }
                        >
                          {l.product_name || "-"}
                        </div>
                        {sub.length ? (
                          <div className="text-muted small">
                            {sub.join(" · ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="text-end text-nowrap">
                        {baseOf(l).toFixed(2)}
                        {l.unit ? (
                          <span className="text-muted"> {l.unit}</span>
                        ) : null}
                      </td>
                      <td>
                        <Input
                          type="number"
                          bsSize="sm"
                          className="text-end"
                          style={{ fontSize: "inherit" }}
                          min="0"
                          max={r4(baseOf(l) - rejectedOf(l))}
                          step="any"
                          disabled={isLocked}
                          value={qc[l._id]?.accepted_qty ?? ""}
                          onChange={(e) =>
                            onReceivedChange(l, e.target.value)
                          }
                        />
                        {l.tolerance_hold ? (
                          <Badge
                            className="doc-badge doc-badge-orange d-block mt-25"
                            title={l.tolerance_hold_reason}
                          >
                            {t("Tolerance Hold")}
                          </Badge>
                        ) : null}
                      </td>
                      <td>
                        <Input
                          type="number"
                          bsSize="sm"
                          className="text-end"
                          style={{ fontSize: "inherit" }}
                          min="0"
                          max={r4(baseOf(l) - acceptedOf(l))}
                          step="any"
                          disabled={isLocked}
                          value={qc[l._id]?.rejected_qty ?? ""}
                          onChange={(e) =>
                            onRejectedChange(l, e.target.value)
                          }
                        />
                      </td>
                      <td className="text-end text-nowrap">
                        {/* Pending = Dispatched − Received − Rejected (auto). */}
                        <span className={pendingOf(l) > 1e-6 ? "text-warning fw-semibold" : "text-muted"}>
                          {pendingOf(l).toFixed(2)}
                        </span>
                        {l.unit ? (
                          <span className="text-muted"> {l.unit}</span>
                        ) : null}
                      </td>
                      {/* Read-only: agreed unit price + received-value (Amount). */}
                      <td className="text-end text-nowrap">
                        {sym}
                        {money(priceOf(l))}
                      </td>
                      <td className="text-end text-nowrap fw-semibold">
                        {sym}
                        {money(amountOf(l))}
                      </td>
                      {/* Read-only GST = Amount × GST% (from the POV line). */}
                      <td className="text-end text-nowrap">
                        {sym}
                        {money(gstOf(l))}
                        {taxOf(l) > 0 ? (
                          <span className="text-muted small d-block">
                            {taxOf(l)}%
                          </span>
                        ) : null}
                      </td>
                      {/* GST-inclusive total = Amount + GST. */}
                      <td className="text-end text-nowrap fw-semibold">
                        {sym}
                        {money(totalOf(l))}
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          style={{ fontSize: "inherit" }}
                          maxLength={60}
                          disabled={isLocked}
                          value={qc[l._id]?.batch_no ?? ""}
                          onChange={(e) =>
                            setField(l._id, "batch_no", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          style={{ fontSize: "inherit" }}
                          maxLength={300}
                          disabled={isLocked}
                          value={qc[l._id]?.remarks ?? ""}
                          onChange={(e) =>
                            setField(l._id, "remarks", e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr>
                  <td colSpan={2} className="text-end">
                    {t("Total")}
                  </td>
                  <td className="text-end">{totals.dispatched.toFixed(2)}</td>
                  <td className="text-end">{totals.received.toFixed(2)}</td>
                  <td className="text-end">{totals.rejected.toFixed(2)}</td>
                  <td className="text-end">{totals.pending.toFixed(2)}</td>
                  <td />
                  <td className="text-end">
                    {sym}
                    {money(totals.amount)}
                  </td>
                  <td className="text-end">
                    {sym}
                    {money(totals.gst)}
                  </td>
                  <td className="text-end">
                    {sym}
                    {money(totals.total)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </Table>

            {totalLines > 0 && (
              <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 px-1 gap-1">
                <div className="d-flex align-items-center small text-muted">
                  <span className="me-50">{t("Show")}</span>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value) || 10);
                      setPage(0);
                    }}
                    style={{ width: 80 }}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Input>
                  <span className="ms-50">
                    {t("of")} {totalLines} {t("rows")}
                  </span>
                </div>
                <ReactPaginate
                  previousLabel=""
                  nextLabel=""
                  pageCount={pageCount}
                  activeClassName="active"
                  forcePage={safePage}
                  onPageChange={({ selected }) => setPage(selected)}
                  pageClassName="page-item"
                  nextLinkClassName="page-link"
                  nextClassName="page-item next"
                  previousClassName="page-item prev"
                  previousLinkClassName="page-link"
                  pageLinkClassName="page-link"
                  containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
                />
              </div>
            )}

            <div className="small text-muted mt-1 px-1">
              {t(
                "Received (good) and Rejected are entered independently; anything left of the Dispatched qty stays Pending and can be received on a later GRN. Received + Rejected cannot exceed Dispatched. Save & Confirm finalises the quality check."
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default GrnView;
