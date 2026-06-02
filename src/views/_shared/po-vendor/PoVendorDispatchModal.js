// ── PoVendor Dispatch Modal ──────────────────────────────────────────
// Captures per-line dispatched_qty + transport fields and flips POV
// status from draft → dispatched. Per-line dispatched qty is editable
// (≤ ordered) so the operator can record under-dispatch (vendor
// stock-out / partial fulfillment). Any shortfall is released back to
// the parent PO's pending qty so a follow-up POV can be raised.

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
import ReactPaginate from "react-paginate";

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
  const [shortReason, setShortReason] = useState("");
  const [qtyByLine, setQtyByLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Client-side pagination for the per-line table ──
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

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
    setShortReason("");
    setPage(0);
  }, [isOpen, lines, p]);

  const { totals, totalShort, shortLineCount, overLineCount } = useMemo(() => {
    let ordered = 0;
    let dispatched = 0;
    let totalShort = 0;
    let shortLineCount = 0;
    let overLineCount = 0;
    for (const l of lines) {
      const ord = num(l.ordered_qty);
      const dsp = num(qtyByLine[l._id]);
      ordered += ord;
      dispatched += dsp;
      const diff = ord - dsp;
      if (diff > 1e-6) {
        totalShort += diff;
        shortLineCount += 1;
      } else if (diff < -1e-6) {
        overLineCount += 1;
      }
    }
    return {
      totals: { ordered, dispatched },
      totalShort,
      shortLineCount,
      overLineCount,
    };
  }, [lines, qtyByLine]);

  const totalRows = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageLines = lines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  const handleQtyChange = (lineId, raw) => {
    setQtyByLine((prev) => ({ ...prev, [lineId]: raw }));
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
    if (overLineCount > 0) {
      Notification(
        "Validation",
        t(
          "Dispatched quantity cannot exceed ordered quantity on any line."
        ),
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
            short_reason:
              totalShort > 0 && shortReason ? shortReason : undefined,
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
          <small className="text-muted">
            {t("Edit if under-dispatch. Cannot exceed ordered.")}
          </small>
        </div>

        <Table bordered size="sm" className="align-middle mb-2">
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
              <th style={{ width: 90 }} className="text-end">
                {t("Short")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageLines.map((l, idx) => {
              const rowNum = pageStart + idx + 1;
              const ordered = num(l.ordered_qty);
              const dispatched = num(qtyByLine[l._id]);
              const short = ordered - dispatched;
              const over = short < -1e-6;
              return (
                <tr key={l._id}>
                  <td>{rowNum}</td>
                  <td>
                    <div className="fw-semibold">
                      {l?.product_name || "-"}
                    </div>
                    {l?.product_code && (
                      <small className="text-muted">{l.product_code}</small>
                    )}
                  </td>
                  <td>{l?.unit || "-"}</td>
                  <td className="text-end">{ordered.toLocaleString()}</td>
                  <td className="text-end">
                    <Input
                      type="number"
                      min="0"
                      max={ordered}
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

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-2">
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
              {t("of")} {totalRows} {t("rows")}
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

        {/* Totals shown OUTSIDE the table (after pagination) so they always
            reflect every line, not just the current page. */}
        <div
          className="d-flex justify-content-end flex-wrap gap-2 fw-bold mb-1"
          style={{ fontSize: "1.05rem" }}
        >
          <span>
            <span className="text-muted me-50">{t("Total Ordered")}:</span>
            {totals.ordered.toLocaleString()}
          </span>
          <span className="text-muted">·</span>
          <span>
            <span className="text-muted me-50">{t("Total Dispatched")}:</span>
            {totals.dispatched.toLocaleString()}
          </span>
          <span className="text-muted">·</span>
          <span>
            <span className="text-muted me-50">{t("Total Short")}:</span>
            <span className="text-warning">
              {totalShort > 1e-6 ? totalShort.toLocaleString() : "-"}
            </span>
          </span>
        </div>

        {totalShort > 1e-6 && (
          <Alert color="warning" className="d-flex align-items-start mb-0 p-2">
            <AlertTriangle size={16} className="me-1 mt-25 flex-shrink-0" />
            <div className="flex-grow-1">
              <div className="fw-semibold mb-25">
                {t("Under-dispatch detected")} —{" "}
                {totalShort.toLocaleString()} {t("unit(s) across")}{" "}
                {shortLineCount} {t("line(s)")}
              </div>
              <div className="small">
                {t(
                  "The shortfall will be released back to the parent PO's pending quantity. You can raise a follow-up POV from the PO's Coverage tab to procure the missing quantity from this or another vendor."
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
                    "e.g. Vendor stock-out, Partial fulfillment"
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
          color="primary"
          onClick={onSubmit}
          disabled={submitting || overLineCount > 0}
        >
          {submitting ? <Spinner size="sm" /> : null} {t("Mark Dispatched")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorDispatchModal;
