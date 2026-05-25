// ── PoVendor Receive Modal ──────────────────────────────────────────
// Captures arrival date + notes and flips POV status dispatched → closed.
// Per-line received qty is locked to dispatched qty (policy: no variance).

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

  const onSubmit = async () => {
    if (!arrivalDate) {
      Notification(
        "Validation",
        t("Actual arrival date is required."),
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
              <th style={{ width: 90 }} className="text-end">
                {t("Received")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
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
                <td className="text-end">
                  {num(l.dispatched_qty).toLocaleString()}
                </td>
                <td className="text-end">
                  {num(qtyByLine[l._id]).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
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
