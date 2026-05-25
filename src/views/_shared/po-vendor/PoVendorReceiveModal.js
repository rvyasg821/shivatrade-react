// ── PoVendor Receive Modal ──────────────────────────────────────────
// Captures per-line received_qty and flips POV status dispatched → closed.
// Follow-up POVs for any remaining qty are created manually from the
// PO detail page (industry-standard flat-siblings model — SAP / Tally / Zoho).

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Row,
  Col,
  Label,
  Input,
  Table,
  Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info } from "react-feather";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { receivePoVendor } from "@src/views/po-vendors/store";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const todayISO = () => new Date().toISOString().slice(0, 10);

const PoVendorReceiveModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};
  const lines = useMemo(() => p?.lines || [], [p?.lines]);

  const [arrivalDate, setArrivalDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [qtyByLine, setQtyByLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill received = dispatched per line (the common case).
  useEffect(() => {
    if (!isOpen) return;
    const seed = {};
    for (const l of lines) {
      seed[l._id] = String(num(l.dispatched_qty));
    }
    setQtyByLine(seed);
    setArrivalDate(todayISO());
    setNotes(p?.notes || "");
  }, [isOpen, lines, p]);

  // Live computed warnings.
  const summary = useMemo(() => {
    let totalShort = 0;
    let totalUndispatched = 0;
    const shortRows = [];
    const undispatchedRows = [];
    for (const l of lines) {
      const ordered = num(l.ordered_qty);
      const dispatched = num(l.dispatched_qty);
      const received = num(qtyByLine[l._id]);
      const short = Math.max(0, dispatched - received);
      const undispatched = Math.max(0, ordered - dispatched);
      if (short > 1e-6) {
        totalShort += short;
        shortRows.push({ name: l.product_name || l._id, qty: short });
      }
      if (undispatched > 1e-6) {
        totalUndispatched += undispatched;
        undispatchedRows.push({
          name: l.product_name || l._id,
          qty: undispatched,
        });
      }
    }
    return {
      totalShort,
      totalUndispatched,
      shortRows,
      undispatchedRows,
      hasShort: totalShort > 1e-6,
      hasUndispatched: totalUndispatched > 1e-6,
    };
  }, [lines, qtyByLine]);

  const setQtyAll = (mode) => {
    const next = {};
    for (const l of lines) {
      next[l._id] = mode === "full" ? String(num(l.dispatched_qty)) : "0";
    }
    setQtyByLine(next);
  };

  const onSubmit = async () => {
    if (!arrivalDate) {
      Notification(
        "Validation",
        t("Actual arrival date is required."),
        "warning"
      );
      return;
    }
    for (const l of lines) {
      const v = num(qtyByLine[l._id]);
      const max = num(l.dispatched_qty);
      if (v < 0 || v > max + 1e-6) {
        Notification(
          "Validation",
          t(
            `Line "${
              l.product_name || l._id
            }": received_qty must be 0–${max} (cannot exceed dispatched).`
          ),
          "warning"
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await dispatch(
        receivePoVendor({
          id: p._id,
          data: {
            actual_arrival_date: arrivalDate,
            notes: notes || undefined,
            lines: lines.map((l) => ({
              _id: l._id,
              received_qty: String(num(qtyByLine[l._id])),
            })),
          },
        })
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
        {t("Mark Received")} · <code>{p?.voucher_no}</code>
      </ModalHeader>
      <ModalBody>
        <p className="small text-muted mb-2">
          {t(
            "Record received quantities. Short receipts (dispatched − received) are booked as a loss. Any undispatched balance can be shipped via a new POV created from the PO detail page."
          )}
        </p>

        <Row>
          <Col md="6" className="mb-1">
            <Label className="form-label">
              {t("Actual Arrival Date")} <span className="text-danger">*</span>
            </Label>
            <DateInput
              id="pov-rcv-arrival-date"
              value={arrivalDate}
              onChange={(d, str, iso) => setArrivalDate(iso || "")}
              placeholder={t("YYYY-MM-DD")}
            />
          </Col>
          <Col md="12" className="mb-1">
            <Label className="form-label">{t("Notes")}</Label>
            <Input
              type="textarea"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mt-2 mb-1">
          <Label className="form-label mb-0">
            {t("Per-line Received Quantity")}
          </Label>
        </div>

        <Table bordered size="sm" className="align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Product")}</th>
              <th style={{ width: 70 }}>{t("Unit")}</th>
              <th style={{ width: 90 }} className="text-end">
                {t("Ordered")}
              </th>
              <th style={{ width: 90 }} className="text-end">
                {t("Dispatched")}
              </th>
              <th style={{ width: 130 }} className="text-end">
                {t("Received")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const max = num(l.dispatched_qty);
              const cur = num(qtyByLine[l._id]);
              const tooHigh = cur > max + 1e-6;
              return (
                <tr key={l._id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="fw-semibold">{l?.product_name || "-"}</div>
                    {l?.product_code && (
                      <small className="text-muted">{l.product_code}</small>
                    )}
                  </td>
                  <td>{l?.unit || "-"}</td>
                  <td className="text-end">
                    {num(l.ordered_qty).toLocaleString()}
                  </td>
                  <td className="text-end">{max.toLocaleString()}</td>
                  <td className="text-end">
                    {num(qtyByLine[l._id]).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {/* Damage notice — informational only, no user choice. */}
        {summary.hasShort && (
          <div className="alert alert-warning small mb-2">
            <AlertTriangle size={14} className="me-1" />
            <strong>
              {t("Damage / short in transit:")}{" "}
              {summary.totalShort.toLocaleString()}{" "}
              {t("units short across")} {summary.shortRows.length}{" "}
              {t("line(s).")}
            </strong>{" "}
            {t(
              "This is recorded as a loss and will NOT be added back to PO pending."
            )}
          </div>
        )}

        {/* Undispatched notice — informational only. Follow-up POVs are
            created manually from the PO detail page. */}
        {summary.hasUndispatched && (
          <div className="alert alert-info small mb-2">
            <Info size={14} className="me-1" />
            <strong>{t("Vendor still owes:")} </strong>
            {summary.totalUndispatched.toLocaleString()}{" "}
            {t("units across")} {summary.undispatchedRows.length}{" "}
            {t("line(s).")}{" "}
            {t(
              "After closing this POV, create a new POV from the PO detail page to ship the remainder."
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button color="success" onClick={onSubmit} disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : null} {t("Mark Received & Close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorReceiveModal;
