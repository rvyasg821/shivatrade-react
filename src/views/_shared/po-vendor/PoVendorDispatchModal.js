// ── PoVendor Dispatch Modal ──────────────────────────────────────────
// Captures per-line dispatched_qty + transport fields and flips POV
// status from draft → dispatched.

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

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { dispatchPoVendor } from "@src/views/po-vendors/store";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const todayISO = () => new Date().toISOString().slice(0, 10);

const PoVendorDispatchModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};
  const lines = useMemo(() => p?.lines || [], [p?.lines]);

  const [dispatchDate, setDispatchDate] = useState(todayISO());
  const [expectedArrival, setExpectedArrival] = useState("");
  const [transporter, setTransporter] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [lrDate, setLrDate] = useState("");
  const [ewayNo, setEwayNo] = useState("");
  const [ewayDate, setEwayDate] = useState("");
  const [notes, setNotes] = useState("");
  const [qtyByLine, setQtyByLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill qty: dispatched = full ordered_qty per line.
  useEffect(() => {
    if (!isOpen) return;
    const seed = {};
    for (const l of lines) {
      seed[l._id] = String(num(l.ordered_qty));
    }
    setQtyByLine(seed);
    setDispatchDate(todayISO());
    setExpectedArrival(
      (p.expected_arrival_date || "").slice(0, 10) || ""
    );
    setTransporter(p.transporter_name || "");
    setVehicle(p.vehicle_no || "");
    setLrNo(p.lr_no || "");
    setLrDate((p.lr_date || "").slice(0, 10) || "");
    setEwayNo(p.eway_bill_no || "");
    setEwayDate((p.eway_bill_date || "").slice(0, 10) || "");
    setNotes(p.notes || "");
  }, [isOpen, lines, p]);

  const totals = useMemo(() => {
    let ordered = 0;
    let dispatched = 0;
    for (const l of lines) {
      ordered += num(l.ordered_qty);
      dispatched += num(qtyByLine[l._id]);
    }
    return { ordered, dispatched };
  }, [lines, qtyByLine]);

  const setQtyAll = (mode) => {
    const next = {};
    for (const l of lines) {
      next[l._id] = mode === "full" ? String(num(l.ordered_qty)) : "0";
    }
    setQtyByLine(next);
  };

  const onSubmit = async () => {
    if (!dispatchDate) {
      Notification(
        "Validation",
        t("Dispatch date is required."),
        "warning"
      );
      return;
    }
    // Client-side bound check: 0 ≤ dispatched ≤ ordered
    for (const l of lines) {
      const v = num(qtyByLine[l._id]);
      const max = num(l.ordered_qty);
      if (v < 0 || v > max + 1e-6) {
        Notification(
          "Validation",
          t(
            `Line "${
              l.product_name || l._id
            }": dispatched_qty must be 0–${max}.`
          ),
          "warning"
        );
        return;
      }
    }
    if (totals.dispatched <= 0) {
      Notification(
        "Validation",
        t("Set at least one line to a non-zero dispatched quantity."),
        "warning"
      );
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        dispatchPoVendor({
          id: p._id,
          data: {
            dispatch_date: dispatchDate,
            expected_arrival_date: expectedArrival || undefined,
            transporter_name: transporter || undefined,
            vehicle_no: vehicle || undefined,
            lr_no: lrNo || undefined,
            lr_date: lrDate || undefined,
            eway_bill_no: ewayNo || undefined,
            eway_bill_date: ewayDate || undefined,
            notes: notes || undefined,
            lines: lines.map((l) => ({
              _id: l._id,
              dispatched_qty: String(num(qtyByLine[l._id])),
            })),
          },
        })
      ).unwrap();
      toggle?.();
    } catch (err) {
      // Error toast is shown by the page-level store effect.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Mark Dispatched")} · <code>{p?.voucher_no}</code>
      </ModalHeader>
      <ModalBody>
        <p className="small text-muted mb-2">
          {t(
            "Capture per-line dispatched quantities + transport details. After dispatch, quantities lock; tracking fields stay editable until close."
          )}
        </p>

        <Row>
          <Col md="6" className="mb-1">
            <Label className="form-label">
              {t("Dispatch Date")} <span className="text-danger">*</span>
            </Label>
            <DateInput
              id="pov-disp-dispatch-date"
              value={dispatchDate}
              onChange={(d, str, iso) => setDispatchDate(iso || "")}
              placeholder={t("YYYY-MM-DD")}
            />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("Expected Arrival")}</Label>
            <DateInput
              id="pov-disp-exp-arrival"
              value={expectedArrival}
              onChange={(d, str, iso) => setExpectedArrival(iso || "")}
              placeholder={t("YYYY-MM-DD")}
            />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("Transporter")}</Label>
            <Input
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
              placeholder={t("Transporter name")}
            />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("Vehicle No")}</Label>
            <Input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder={t("e.g. MH04AB1234")}
            />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("LR / Bilty No")}</Label>
            <Input value={lrNo} onChange={(e) => setLrNo(e.target.value)} />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("LR Date")}</Label>
            <DateInput
              id="pov-disp-lr-date"
              value={lrDate}
              onChange={(d, str, iso) => setLrDate(iso || "")}
              placeholder={t("YYYY-MM-DD")}
            />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("E-way Bill No")}</Label>
            <Input value={ewayNo} onChange={(e) => setEwayNo(e.target.value)} />
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("E-way Bill Date")}</Label>
            <DateInput
              id="pov-disp-eway-date"
              value={ewayDate}
              onChange={(d, str, iso) => setEwayDate(iso || "")}
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
            {t("Per-line Dispatched Quantity")}
          </Label>
        </div>

        <Table bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Product")}</th>
              <th style={{ width: 70 }}>{t("Unit")}</th>
              <th style={{ width: 100 }} className="text-end">
                {t("Ordered")}
              </th>
              <th style={{ width: 130 }} className="text-end">
                {t("Dispatched")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const max = num(l.ordered_qty);
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
                  <td className="text-end">{max.toLocaleString()}</td>
                  <td className="text-end">
                    {num(qtyByLine[l._id]).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-light">
              <td colSpan="3" className="text-end fw-bold">
                {t("Totals")}
              </td>
              <td className="text-end fw-bold">
                {totals.ordered.toLocaleString()}
              </td>
              <td className="text-end fw-bold">
                {totals.dispatched.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button color="primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : null} {t("Mark Dispatched")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorDispatchModal;
