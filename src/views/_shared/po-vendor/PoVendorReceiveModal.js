// ── PoVendor Receive Modal ──────────────────────────────────────────
// Captures arrival date + per-line received qty and flips POV status
// dispatched → closed. Received qty is editable (≤ dispatched) so the
// operator can record short receipts (damaged / lost / quality reject).
// Any shortfall is automatically released back to the parent PO's
// pending qty so a follow-up POV can be raised from the Coverage tab.

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
  Alert,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "react-feather";

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
  const [shortReason, setShortReason] = useState("");
  const [qtyByLine, setQtyByLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const seed = {};
    for (const l of lines) {
      seed[l._id] = String(num(l.dispatched_qty));
    }
    setQtyByLine(seed);
    setArrivalDate(todayISO());
    setNotes(p?.notes || "");
    setShortReason("");
  }, [isOpen, lines, p]);

  // Compute per-line shortfall + aggregate so we can show the reason
  // field + the "returns to PO pending" hint only when relevant.
  const { totalShort, shortLineCount, overLineCount } = useMemo(() => {
    let totalShort = 0;
    let shortLineCount = 0;
    let overLineCount = 0;
    for (const l of lines) {
      const dispatched = num(l.dispatched_qty);
      const received = num(qtyByLine[l._id]);
      const diff = dispatched - received;
      if (diff > 1e-6) {
        totalShort += diff;
        shortLineCount += 1;
      } else if (diff < -1e-6) {
        overLineCount += 1;
      }
    }
    return { totalShort, shortLineCount, overLineCount };
  }, [lines, qtyByLine]);

  const handleQtyChange = (lineId, raw) => {
    // Allow empty during typing; clamp on submit.
    setQtyByLine((prev) => ({ ...prev, [lineId]: raw }));
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
    if (overLineCount > 0) {
      Notification(
        "Validation",
        t(
          "Received quantity cannot exceed dispatched quantity on any line."
        ),
        "warning"
      );
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        receivePoVendor({
          id: p._id,
          data: {
            actual_arrival_date: arrivalDate,
            notes: notes || undefined,
            short_reason:
              totalShort > 0 && shortReason ? shortReason : undefined,
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
          <small className="text-muted">
            {t("Edit if short receipt. Cannot exceed dispatched.")}
          </small>
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
              <th style={{ width: 110 }} className="text-end">
                {t("Received")}
              </th>
              <th style={{ width: 90 }} className="text-end">
                {t("Short")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const dispatched = num(l.dispatched_qty);
              const received = num(qtyByLine[l._id]);
              const short = dispatched - received;
              const over = short < -1e-6;
              return (
                <tr key={l._id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="fw-semibold">
                      {l?.product_name || "-"}
                    </div>
                    {l?.product_code && (
                      <small className="text-muted">{l.product_code}</small>
                    )}
                  </td>
                  <td>{l?.unit || "-"}</td>
                  <td className="text-end">
                    {num(l.ordered_qty).toLocaleString()}
                  </td>
                  <td className="text-end">{dispatched.toLocaleString()}</td>
                  <td className="text-end">
                    <Input
                      type="number"
                      min="0"
                      max={dispatched}
                      step="any"
                      bsSize="sm"
                      className="text-end"
                      invalid={over}
                      value={qtyByLine[l._id] ?? ""}
                      onChange={(e) =>
                        handleQtyChange(l._id, e.target.value)
                      }
                    />
                  </td>
                  <td
                    className={`text-end ${
                      short > 1e-6 ? "text-warning fw-semibold" : ""
                    }`}
                  >
                    {short > 1e-6 ? short.toLocaleString() : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {totalShort > 1e-6 && (
          <Alert color="warning" className="d-flex align-items-start mb-2">
            <AlertTriangle size={16} className="me-1 mt-25 flex-shrink-0" />
            <div className="flex-grow-1">
              <div className="fw-semibold mb-25">
                {t("Short receipt detected")} —{" "}
                {totalShort.toLocaleString()} {t("unit(s) across")}{" "}
                {shortLineCount} {t("line(s)")}
              </div>
              <div className="small">
                {t(
                  "The shortfall will be released back to the parent PO's pending quantity. You can raise a follow-up POV from the PO's Coverage tab to procure the missing quantity."
                )}
              </div>
              <div className="mt-1">
                <Label className="form-label mb-25">
                  {t("Short reason (optional)")}
                </Label>
                <Input
                  type="text"
                  bsSize="sm"
                  placeholder={t(
                    "e.g. Damaged in transit, Quality reject, Lost"
                  )}
                  value={shortReason}
                  onChange={(e) => setShortReason(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button
          color="success"
          onClick={onSubmit}
          disabled={submitting || overLineCount > 0}
        >
          {submitting ? <Spinner size="sm" /> : null}{" "}
          {t("Mark Received & Close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorReceiveModal;
