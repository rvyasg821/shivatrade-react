// ── PoVendor Receive Modal ──────────────────────────────────────────
// Captures per-line received_qty, shows damage notice + spawn-child
// radio, and flips POV status dispatched → closed.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  FormGroup,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info } from "react-feather";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { receivePoVendor } from "@src/views/po-vendors/store";
import { appsRoot } from "@constant/defaultValues";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const todayISO = () => new Date().toISOString().slice(0, 10);

const PoVendorReceiveModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};
  const lines = useMemo(() => p?.lines || [], [p?.lines]);

  const [arrivalDate, setArrivalDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [spawn, setSpawn] = useState(true);
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
    setSpawn(true);
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
      const result = await dispatch(
        receivePoVendor({
          id: p._id,
          data: {
            actual_arrival_date: arrivalDate,
            notes: notes || undefined,
            spawn_remainder: !!spawn,
            lines: lines.map((l) => ({
              _id: l._id,
              received_qty: String(num(qtyByLine[l._id])),
            })),
          },
        })
      ).unwrap();

      // If backend spawned a child POV, surface it.
      const child = result?.spawnedChild;
      if (child?._id) {
        Notification(
          "Child POV created",
          t(
            `${p.voucher_no} closed. ${child.voucher_no} opened for the remaining quantities.`
          ),
          "success"
        );
        toggle?.();
        navigate(`${appsRoot}/po-vendors/view/${child._id}`);
        return;
      }
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
            "Record received quantities. Short receipts (dispatched − received) are booked as a loss; undispatched balance (ordered − dispatched) can spawn a follow-up POV."
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
          <div>
            <Button
              size="sm"
              color="secondary"
              outline
              className="me-50"
              onClick={() => setQtyAll("full")}
            >
              {t("Set all to dispatched")}
            </Button>
            <Button
              size="sm"
              color="secondary"
              outline
              onClick={() => setQtyAll("zero")}
            >
              {t("Set all to 0")}
            </Button>
          </div>
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
                  <td>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      max={max}
                      bsSize="sm"
                      invalid={tooHigh}
                      value={qtyByLine[l._id] ?? ""}
                      onChange={(e) =>
                        setQtyByLine((s) => ({
                          ...s,
                          [l._id]: e.target.value,
                        }))
                      }
                    />
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

        {/* Spawn-child decision — visible only when undispatched > 0. */}
        {summary.hasUndispatched && (
          <div className="alert alert-info small mb-2">
            <Info size={14} className="me-1" />
            <strong>{t("Vendor still owes:")} </strong>
            {summary.totalUndispatched.toLocaleString()}{" "}
            {t("units across")} {summary.undispatchedRows.length}{" "}
            {t("line(s).")}{" "}
            {t("Create a follow-up POV for the remaining quantities?")}
            <div className="mt-1">
              <FormGroup check inline>
                <Input
                  type="radio"
                  id="spawn-yes"
                  checked={spawn}
                  onChange={() => setSpawn(true)}
                />
                <Label check for="spawn-yes" className="ms-50">
                  {t("Yes, spawn child POV")}
                </Label>
              </FormGroup>
              <FormGroup check inline className="ms-2">
                <Input
                  type="radio"
                  id="spawn-no"
                  checked={!spawn}
                  onChange={() => setSpawn(false)}
                />
                <Label check for="spawn-no" className="ms-50">
                  {t("No, write off remaining")}
                </Label>
              </FormGroup>
            </div>
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
