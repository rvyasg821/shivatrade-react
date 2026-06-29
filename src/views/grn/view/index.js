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

import { getGrn, updateGrn, createGrnFromPov, cleanGrnMessage } from "../store";
import { getPoVendor } from "@src/views/po-vendors/store";
import { stopLoading } from "../../loadingstore";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { openPdfViewer } from "@src/utility/pdf";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

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
    for (const l of lines) {
      dispatched += num(l.dispatched_qty);
      // "Received" column = good qty (stored as accepted_qty).
      received += num(qc[l._id]?.accepted_qty ?? l.accepted_qty);
      rejected += num(qc[l._id]?.rejected_qty ?? l.rejected_qty);
    }
    return { dispatched, received, rejected };
  }, [lines, qc]);

  const setField = (lineId, field, value) =>
    setQc((m) => ({ ...m, [lineId]: { ...m[lineId], [field]: value } }));

  const r4 = (n) => Math.round(num(n) * 10000) / 10000;

  // Received (good) + Rejected always equal Dispatched — the whole dispatched
  // qty is accounted as either received-good or rejected. Editing Received
  // auto-fills Rejected = Dispatched − Received (and vice versa). The "Received"
  // column is the good qty; we store it as accepted_qty, and received_qty
  // (total accounted) = good + rejected = dispatched.
  const onReceivedChange = (l, raw) => {
    const dispatched = r4(l.dispatched_qty);
    let v = num(raw);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > dispatched) v = dispatched;
    const rejected = r4(dispatched - v);
    setQc((m) => ({
      ...m,
      [l._id]: {
        ...m[l._id],
        accepted_qty: raw === "" ? "" : String(v),
        rejected_qty: String(rejected),
        received_qty: String(dispatched),
      },
    }));
  };

  // Editing Rejected auto-fills Received (good) = Dispatched − Rejected.
  const onRejectedChange = (l, raw) => {
    const dispatched = r4(l.dispatched_qty);
    let v = num(raw);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > dispatched) v = dispatched;
    const accepted = r4(dispatched - v);
    setQc((m) => ({
      ...m,
      [l._id]: {
        ...m[l._id],
        rejected_qty: raw === "" ? "" : String(v),
        accepted_qty: String(accepted),
        received_qty: String(dispatched),
      },
    }));
  };

  const onSave = async (statusOverride) => {
    // Create mode: persist now — create the GRN from the POV (backend seeds the
    // lines), then apply the operator's QC edits, then open the saved GRN.
    if (isCreate) {
      if (saving) return;
      setSaving(true);
      try {
        const created = await dispatch(
          createGrnFromPov({ povId })
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
        await dispatch(updateGrn({ id: newGrn._id, data })).unwrap();
        navigate(`${appsRoot}/grn/view/${newGrn._id}`);
      } catch (err) {
        Notification(
          "Error",
          err?.message || t("Could not create GRN."),
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
    dispatch(updateGrn({ id, data: payload }));
  };

  // Open the GRN PDF in the in-app viewer (new tab, frontend origin) — fetched
  // via the authed API, shown there, with a correctly-named Download.
  const downloadPdf = () =>
    openPdfViewer({ kind: "grn", id, name: grn?.voucher_no });

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
                {chip(t("VPO"), grn.po_vendor_voucher_no)}
                {chip(t("SO"), grn.purchase_order_voucher_no)}
                {chip(t("Customer PO"), grn.customer_po_number)}
                {chip(t("Date"), grn.grn_date ? formatDate(grn.grn_date) : null)}
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
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() =>
                navigate(
                  grn?.po_vendor_id
                    ? `${appsRoot}/po-vendors/view/${grn.po_vendor_id}`
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
                  {saving ? t("Saving…") : isCreate ? t("Create GRN") : t("Save")}
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
                        {num(l.dispatched_qty).toFixed(2)}
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
                          max={num(l.dispatched_qty)}
                          step="any"
                          disabled={isLocked}
                          value={qc[l._id]?.accepted_qty ?? ""}
                          onChange={(e) =>
                            onReceivedChange(l, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          bsSize="sm"
                          className="text-end"
                          style={{ fontSize: "inherit" }}
                          min="0"
                          max={num(l.dispatched_qty)}
                          step="any"
                          disabled={isLocked}
                          value={qc[l._id]?.rejected_qty ?? ""}
                          onChange={(e) =>
                            onRejectedChange(l, e.target.value)
                          }
                        />
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
                "Received (good) + Rejected always equals Dispatched — adjusting one auto-fills the other. Save & Confirm finalises the quality check."
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default GrnView;
