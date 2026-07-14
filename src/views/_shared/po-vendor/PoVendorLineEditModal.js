// ── PoVendor GST Edit Modal ────────────────────────────────────────
//
// DRAFT ONLY. The GST rate is the one and only editable field here.
//
// Quantities are NOT editable: a POV carries the PO line's full ordered qty by
// policy, and the qty is what the pending/coverage guards are computed from.
// They are shown read-only for context and sent back unchanged, so the backend's
// replace-on-update writes the same numbers it already had.
//
// The GST *amount* is never stored anywhere — `line_total` is qty × price with
// no tax in it, and the POV PDF derives the tax from `tax_pct` at render time.
// So editing the rate here is all that is needed: every downstream figure (the
// PDF's Input CGST/SGST/IGST rows, the grand total) follows automatically.
// Nothing can go stale, because there is no second copy of the number.

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  Input,
  Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "react-feather";

import Notification from "@components/toast/notification";
import { updatePoVendor } from "@src/views/po-vendors/store";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const round2 = (n) =>
  !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (v) =>
  num(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PoVendorLineEditModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const pov = poVendorItem || {};

  // The POV's own lines are the source of truth — they already carry tax_pct,
  // unit_price, ordered_qty and the product name. The modal used to re-fetch the
  // PO's coverage for this, which was a network round-trip for data we already
  // had, and coverage does not know what rate THIS POV was saved with.
  const povLines = useMemo(() => pov?.lines || [], [pov]);

  const [taxByLine, setTaxByLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Keyed by the POV line's OWN `_id`, never by `purchase_order_line_id`: that
  // column is NULLABLE — a standalone POV's lines have none — so keying on it
  // collapsed every row onto the single key `undefined`, and editing one line's
  // GST edited them all.
  //
  // Seeded fresh on each open, so re-opening after a cancelled edit shows what is
  // actually stored rather than the last keystroke.
  useEffect(() => {
    if (!isOpen) return;
    const seed = {};
    for (const l of povLines) {
      seed[l._id] = String(num(l.tax_pct));
    }
    setTaxByLine(seed);
  }, [isOpen, povLines]);

  const lineGst = (l) => {
    const taxable = num(l.ordered_qty) * num(l.unit_price);
    return round2((taxable * num(taxByLine[l._id])) / 100);
  };

  const totals = useMemo(() => {
    let taxable = 0;
    let gst = 0;
    for (const l of povLines) {
      taxable += num(l.ordered_qty) * num(l.unit_price);
      gst += lineGst(l);
    }
    return { taxable: round2(taxable), gst: round2(gst) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [povLines, taxByLine]);

  const setTax = (lineId, v) => {
    // Clamp at the edges. A negative rate would reduce the payable, and >100 is
    // not a GST rate — the backend rejects both, but stop it at the input.
    if (v === "") return setTaxByLine((s) => ({ ...s, [lineId]: "" }));
    const n = Math.min(100, Math.max(0, num(v)));
    setTaxByLine((s) => ({ ...s, [lineId]: String(n) }));
  };

  const onSubmit = async () => {
    // `line_taxes`, NOT `lines`. The `lines` path is a wholesale replace — it
    // deletes and recreates every POV line, and it demands a
    // purchase_order_line_id that standalone POVs do not have. This patches the
    // rate in place, by POV line id.
    const line_taxes = povLines.map((l) => ({
      _id: l._id,
      tax_pct: String(num(taxByLine[l._id])),
    }));

    if (!line_taxes.length) {
      Notification("Validation", t("This POV has no lines."), "warning");
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        updatePoVendor({ id: pov._id, data: { line_taxes } })
      ).unwrap();
      toggle?.();
    } catch (err) {
      // Page-level effect shows the error toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Edit GST")} · <code>{pov?.voucher_no}</code>
      </ModalHeader>
      <ModalBody>
        {!povLines.length ? (
          <div className="alert alert-warning small mb-0">
            <AlertTriangle size={14} className="me-1" />
            {t("This POV has no lines.")}
          </div>
        ) : (
          <>
            <div className="small text-muted mb-1">
              {t(
                "Only the GST rate can be changed, and only while the POV is a draft. Quantity and rate are locked to the Sales Order line."
              )}
            </div>
            <Table responsive bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>{t("Product")}</th>
                  <th style={{ width: 70 }}>{t("Unit")}</th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Qty")}
                  </th>
                  <th style={{ width: 100 }} className="text-end">
                    {t("Rate")} (₹)
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("GST")} %
                  </th>
                  <th style={{ width: 110 }} className="text-end">
                    {t("GST Amt")} (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {povLines.map((l, idx) => (
                  <tr key={l._id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="fw-semibold">{l?.product_name || "-"}</div>
                      {l?.product_code && (
                        <small className="text-muted">{l.product_code}</small>
                      )}
                    </td>
                    <td>{l?.unit || "-"}</td>
                    <td className="text-end text-muted">
                      {num(l.ordered_qty).toLocaleString()}
                    </td>
                    <td className="text-end text-muted">
                      {fmt(l.unit_price)}
                    </td>
                    <td>
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
                    </td>
                    <td className="text-end fw-semibold">₹{fmt(lineGst(l))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-light fw-bold">
                  <td colSpan="4" className="text-end">
                    {t("Taxable")} (₹)
                  </td>
                  <td className="text-end">{fmt(totals.taxable)}</td>
                  <td />
                  <td className="text-end">₹{fmt(totals.gst)}</td>
                </tr>
              </tfoot>
            </Table>
            <div className="small text-muted mt-1">
              {t(
                "CGST/SGST vs IGST is decided from your GSTIN and the vendor's when the PDF is generated."
              )}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          onClick={onSubmit}
          disabled={submitting || !povLines.length}
        >
          {submitting ? <Spinner size="sm" /> : null} {t("Save GST")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorLineEditModal;
