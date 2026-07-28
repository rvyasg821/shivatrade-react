// Debit Note detail — reference chain header + return lines (returned qty /
// unit price editable while draft), with Save / Issue / Cancel actions.
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
import { ArrowLeft, Save, CheckCircle, XCircle, Download } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getDebitNote,
  updateDebitNote,
  createDebitNoteFromGrn,
  cleanDebitNoteMessage,
} from "../store";
import { getGrn } from "@src/views/grn/store";
import { getPoVendor } from "@src/views/po-vendors/store";
import { stopLoading } from "../../loadingstore";
import Notification from "@components/toast/notification";
import { openPdfViewer } from "@src/utility/pdf";
import { getCurrencySymbol } from "@src/utility/currency";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

const STATUS_COLOR = {
  draft: "secondary",
  issued: "success",
  cancelled: "danger",
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (v) =>
  num(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DebitNoteView = () => {
  const { id, grnId } = useParams();
  const isCreate = !!grnId; // /debit-notes/create/:grnId → draft, not saved yet
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((s) => s.debitNote);
  const grnStore = useSelector((s) => s.grn);
  const povStore = useSelector((s) => s.poVendor);
  // In create mode the form is a LOCAL draft built from the GRN's rejected
  // lines (unit prices from the POV) — nothing is saved until Save.
  const [draftDn, setDraftDn] = useState(null);
  const [saving, setSaving] = useState(false);
  const dn = isCreate ? draftDn : store?.debitNoteItem;
  // Amounts are STORED in INR; a foreign-currency Debit Note (inherited from the
  // POV) carries exchange_rate (foreign-per-₹1) + code. The form works in the
  // POV currency: `edits` hold POV-currency unit prices (seeded × rate) and are
  // converted back to INR at save. `sym` is the currency symbol for display.
  const rate = Number(dn?.exchange_rate) || 1;
  const sym = getCurrencySymbol(dn?.currency_code) || "₹";

  // Editable line map keyed by debit-note line id.
  const [edits, setEdits] = useState({});

  // Open the Debit Note PDF in the in-app viewer (new tab, frontend origin) —
  // fetched via the authed API, shown there, with a correctly-named Download.
  const downloadPdf = () =>
    openPdfViewer({ kind: "debit_note", id, name: dn?.voucher_no });

  useEffect(() => {
    dispatch(stopLoading());
    if (isCreate) dispatch(getGrn(grnId));
    else dispatch(getDebitNote(id));
  }, [id, grnId, isCreate, dispatch]);

  // Create mode: once the GRN is loaded, fetch its POV (for unit prices).
  useEffect(() => {
    if (!isCreate) return;
    const g = grnStore?.grnItem;
    if (g && g._id === grnId && g.po_vendor_id) {
      dispatch(getPoVendor(g.po_vendor_id));
    }
  }, [isCreate, grnId, grnStore?.grnItem, dispatch]);

  // Build the local draft once GRN + POV are both loaded (create mode only).
  useEffect(() => {
    if (!isCreate) return;
    const g = grnStore?.grnItem;
    const pov = povStore?.poVendorItem;
    if (!g || g._id !== grnId) return;
    if (!pov || pov._id !== g.po_vendor_id) return; // wait for unit prices
    const povLineById = new Map(
      (pov.lines || []).map((pl) => [String(pl._id), pl])
    );
    const lines = (g.lines || [])
      .filter((l) => num(l.rejected_qty) > 1e-6)
      .map((gl) => {
        const pl = povLineById.get(String(gl.po_vendor_line_id));
        return {
          _id: gl._id, // grn_line_id used as the draft/edit key
          grn_line_id: gl._id,
          product_name: gl.product_name,
          product_code: gl.product_code,
          part_no: gl.part_no,
          hsn_code: gl.hsn_code,
          unit: gl.unit,
          rejected_qty: String(num(gl.rejected_qty)),
          returned_qty: num(gl.rejected_qty).toFixed(2),
          unit_price: num(pl?.unit_price).toFixed(2),
          remarks: "",
        };
      });
    setDraftDn({
      _id: null,
      voucher_no: t("New Debit Note"),
      status: "draft",
      vendor_name: g.vendor_name,
      po_vendor_id: g.po_vendor_id,
      grn_voucher_no: g.voucher_no,
      po_vendor_voucher_no: g.po_vendor_voucher_no,
      purchase_order_voucher_no: g.purchase_order_voucher_no,
      currency_code: pov.currency_code,
      exchange_rate: pov.exchange_rate,
      dn_date: null,
      lines,
    });
  }, [isCreate, grnId, grnStore?.grnItem, povStore?.poVendorItem, t]);

  // Seed the editable fields from the loaded DN lines.
  useEffect(() => {
    if (!dn?.lines) return;
    const seed = {};
    for (const l of dn.lines) {
      seed[l._id] = {
        returned_qty:
          l.returned_qty != null ? num(l.returned_qty).toFixed(2) : "0.00",
        // Stored INR → shown/edited in the POV currency (× rate).
        unit_price:
          l.unit_price != null ? (num(l.unit_price) * rate).toFixed(2) : "0.00",
        remarks: l.remarks || "",
      };
    }
    setEdits(seed);
  }, [dn?._id, dn?.lines?.length]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanDebitNoteMessage());
    if (
      id &&
      (store?.actionFlag === "DN_UPDT" || store?.actionFlag === "DN_CRTD")
    ) {
      dispatch(getDebitNote(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error, store?.actionFlag]);

  const status = (dn?.status || "").toLowerCase();
  const isDraft = status === "draft";

  const setField = (lineId, key, value) =>
    setEdits((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], [key]: value },
    }));

  // Live total preview from the editable fields.
  const previewTotal = useMemo(() => {
    if (!dn?.lines) return 0;
    return dn.lines.reduce((sum, l) => {
      const e = edits[l._id] || {};
      return sum + num(e.returned_qty) * num(e.unit_price);
    }, 0);
  }, [dn?.lines, edits]);

  // Unit price is edited in the POV currency; convert back to INR for storage.
  const unitPriceInr = (v) => (rate > 0 ? num(v) / rate : num(v));

  const buildLinesPayload = () =>
    (dn?.lines || []).map((l) => {
      const e = edits[l._id] || {};
      return {
        _id: l._id,
        returned_qty: String(num(e.returned_qty)),
        unit_price: String(unitPriceInr(e.unit_price)),
        remarks: e.remarks || "",
      };
    });

  const onSave = async (nextStatus) => {
    // Create mode: persist now — create the Debit Note from the GRN with the
    // operator's edits (one call; the backend accepts line overrides), then
    // open the saved Debit Note.
    if (isCreate) {
      if (saving) return;
      setSaving(true);
      try {
        const linesPayload = (dn?.lines || []).map((l) => {
          const e = edits[l._id] || {};
          return {
            grn_line_id: l.grn_line_id,
            returned_qty: String(num(e.returned_qty)),
            unit_price: String(unitPriceInr(e.unit_price)),
            remarks: e.remarks || "",
          };
        });
        const created = await dispatch(
          createDebitNoteFromGrn({ grnId, data: { lines: linesPayload } })
        ).unwrap();
        const newId = created?.debitNoteItem?._id;
        if (!newId)
          throw new Error(created?.error || t("Could not create Debit Note."));
        navigate(`${appsRoot}/debit-notes/view/${newId}`);
      } catch (err) {
        Notification(
          "Error",
          err?.message || t("Could not create Debit Note."),
          "warning"
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const data = {};
    // Only send line edits while draft (server rejects line edits otherwise).
    if (isDraft) data.lines = buildLinesPayload();
    if (nextStatus) data.status = nextStatus;
    dispatch(updateDebitNote({ id, data }));
  };

  if (!dn) {
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

  const cur = dn.currency_code ? ` ${dn.currency_code}` : "";

  return (
    <Fragment>
      <Card className="mb-1">
        <CardBody className="d-flex flex-wrap justify-content-between align-items-start gap-1">
          <div>
            <h4 className="mb-0">
              {dn.voucher_no || t("Debit Note")}{" "}
              <Badge
                color={`light-${STATUS_COLOR[status] || "secondary"}`}
                className="text-capitalize ms-1"
              >
                {dn.status}
              </Badge>
            </h4>
            <div className="mt-50">
              <div
                className="text-uppercase text-muted fw-bold"
                style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
              >
                {t("Reference Chain")}
              </div>
              {dn.vendor_name && (
                <div className="fw-semibold text-capitalize mt-25">
                  {dn.vendor_name}
                </div>
              )}
              <div className="text-muted small d-flex flex-wrap gap-1">
                {chip(t("GRN"), dn.grn_voucher_no)}
                {chip(t("VPO"), dn.po_vendor_voucher_no)}
                {chip(t("SO"), dn.purchase_order_voucher_no)}
                {chip(t("Date"), dn.dn_date ? formatDate(dn.dn_date) : null)}
              </div>
            </div>
          </div>
          <div className="d-flex gap-1">
            {!isCreate && (
              <Button color="secondary" outline size="sm" onClick={downloadPdf}>
                <Download size={14} className="me-25" /> {t("PDF")}
              </Button>
            )}
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() =>
                navigate(
                  dn?.po_vendor_id
                    ? `${appsRoot}/po-vendors/view/${dn.po_vendor_id}`
                    : -1
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
            {t("Returned Items")}
          </CardTitle>
          <div className="d-flex gap-1">
            {isCreate ? (
              <Button
                color="success"
                size="sm"
                disabled={saving}
                onClick={() => onSave()}
              >
                <Save size={14} className="me-25" />{" "}
                {saving ? t("Saving…") : t("Save As Draft")}
              </Button>
            ) : (
              <>
                {isDraft && (
                  <Button
                    color="primary"
                    size="sm"
                    outline
                    onClick={() => onSave()}
                  >
                    <Save size={14} className="me-25" /> {t("Save")}
                  </Button>
                )}
                {isDraft && (
                  <Button
                    color="success"
                    size="sm"
                    onClick={() => onSave("issued")}
                  >
                    <CheckCircle size={14} className="me-25" />{" "}
                    {t("Save & Issue")}
                  </Button>
                )}
                {status !== "cancelled" && (
                  <Button
                    color="danger"
                    size="sm"
                    outline
                    onClick={() => onSave("cancelled")}
                  >
                    <XCircle size={14} className="me-25" /> {t("Cancel")}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div className="table-responsive">
            <Table bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th style={{ minWidth: 220 }}>{t("Item")}</th>
                  <th style={{ width: 110 }}>{t("Part No")}</th>
                  <th className="text-end" style={{ width: 110 }}>
                    {t("Rejected")}
                  </th>
                  <th className="text-end" style={{ width: 130 }}>
                    {t("Return Qty")}
                  </th>
                  <th className="text-end" style={{ width: 140 }}>
                    {t("Unit Price")}
                  </th>
                  <th className="text-end" style={{ width: 130 }}>
                    {t("Amount")}
                  </th>
                  <th style={{ minWidth: 160 }}>{t("Remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {(dn.lines || []).map((l, i) => {
                  const e = edits[l._id] || {};
                  const lineAmt = num(e.returned_qty) * num(e.unit_price);
                  return (
                    <tr key={l._id}>
                      <td className="text-muted">{i + 1}</td>
                      <td>
                        <div className="fw-semibold">
                          {l.product_name || l.product_code || "-"}
                        </div>
                        {l.hsn_code ? (
                          <div className="small text-muted">
                            {t("HSN")}: {l.hsn_code}
                          </div>
                        ) : null}
                      </td>
                      <td>{l.part_no || "-"}</td>
                      <td className="text-end text-nowrap">
                        {num(l.rejected_qty)}
                        {l.unit ? ` ${l.unit}` : ""}
                      </td>
                      <td className="text-end">
                        {isDraft ? (
                          <Input
                            type="number"
                            bsSize="sm"
                            min={0}
                            max={num(l.rejected_qty)}
                            value={e.returned_qty ?? ""}
                            onChange={(ev) =>
                              setField(l._id, "returned_qty", ev.target.value)
                            }
                            className="text-end"
                          />
                        ) : (
                          <span>{num(l.returned_qty).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="text-end">
                        {isDraft ? (
                          <Input
                            type="number"
                            bsSize="sm"
                            min={0}
                            value={e.unit_price ?? ""}
                            onChange={(ev) =>
                              setField(l._id, "unit_price", ev.target.value)
                            }
                            className="text-end"
                          />
                        ) : (
                          <span>
                            {sym}
                            {fmtMoney(num(l.unit_price) * rate)}
                          </span>
                        )}
                      </td>
                      <td className="text-end fw-semibold text-nowrap">
                        {sym}
                        {fmtMoney(lineAmt)}
                      </td>
                      <td>
                        {isDraft ? (
                          <Input
                            type="text"
                            bsSize="sm"
                            value={e.remarks ?? ""}
                            onChange={(ev) =>
                              setField(l._id, "remarks", ev.target.value)
                            }
                          />
                        ) : (
                          <span className="small">{l.remarks || "-"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-end fw-bold">
                    {t("Total")}
                  </td>
                  <td className="text-end fw-bold text-nowrap">
                    {sym}
                    {fmtMoney(
                      isDraft ? previewTotal : num(dn.total_amount) * rate
                    )}
                    {cur}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default DebitNoteView;
