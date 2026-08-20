// POV Dispatch page — full-page replacement for the old dispatch modal.
// Captures per-line dispatched_qty + transport fields and flips POV
// draft → dispatched. Supports under-dispatch (shortfall released back to
// the parent PO's pending qty). Reached from the POV detail "Dispatch" CTA.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Row,
  Col,
  Label,
  Input,
  Table,
  Button,
  Spinner,
  Alert,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Send, Truck } from "react-feather";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { useBooksClosedUpto, isClosedPeriod, closedPeriodMessage } from "@src/hooks/useBooksClosed";
import {
  getPoVendor,
  dispatchPoVendor,
  editDispatchPoVendor,
  cleanPoVendorMessage,
} from "@src/views/po-vendors/store";
import { appsRoot } from "@constant/defaultValues";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const todayISO = () => new Date().toISOString().slice(0, 10);

const DispatchPoVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const booksClosedUpto = useBooksClosedUpto();

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};
  const lines = useMemo(() => p?.lines || [], [p?.lines]);
  const backTo = `${appsRoot}/po-vendors/view/${id}`;

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
  const [seeded, setSeeded] = useState(false);

  const pg = usePagination(lines.length);

  useEffect(() => {
    if (id) dispatch(getPoVendor(id));
  }, [id, dispatch]);

  // Seed once when the POV arrives. New dispatch → default to full ordered
  // qty; editing an already-dispatched POV → seed the saved dispatched qty.
  useEffect(() => {
    if (seeded || !p?._id || p._id !== id) return;
    const editing = (p.status || "").toLowerCase() === "dispatched";
    const seed = {};
    for (const l of lines)
      seed[l._id] = String(
        num(editing ? l.dispatched_qty : l.ordered_qty)
      );
    setQtyByLine(seed);
    if (editing && p.dispatch_date)
      setDispatchDate((p.dispatch_date || "").slice(0, 10));
    setExpectedArrival((p.expected_arrival_date || "").slice(0, 10) || "");
    setTransporter(p.transporter_name || "");
    setVehicle(p.vehicle_no || "");
    setLrNo(p.lr_no || "");
    setLrDate((p.lr_date || "").slice(0, 10) || "");
    setEwayNo(p.eway_bill_no || "");
    setEwayDate((p.eway_bill_date || "").slice(0, 10) || "");
    setNotes(p.notes || "");
    setSeeded(true);
  }, [p, id, lines, seeded]);

  const { totals, totalShort, shortLineCount } = useMemo(() => {
    let ordered = 0;
    let dispatched = 0;
    let totalShort = 0;
    let shortLineCount = 0;
    for (const l of lines) {
      const ord = num(l.ordered_qty);
      const dsp = num(qtyByLine[l._id]);
      ordered += ord;
      dispatched += dsp;
      const diff = ord - dsp;
      if (diff > 1e-6) {
        totalShort += diff;
        shortLineCount += 1;
      }
    }
    return {
      totals: { ordered, dispatched },
      totalShort,
      shortLineCount,
    };
  }, [lines, qtyByLine]);

  const totalRows = lines.length;
  const pageLines = lines.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  const handleQtyChange = (lineId, raw) =>
    setQtyByLine((prev) => ({ ...prev, [lineId]: raw }));

  const statusLower = (p?.status || "").toLowerCase();
  // Editing an already-dispatched POV (correct transport / qty). Closed or
  // cancelled POVs stay fully locked.
  const editMode = !!p?._id && statusLower === "dispatched";
  const locked =
    !!p?._id && statusLower !== "draft" && statusLower !== "dispatched";

  const onSubmit = async () => {
    if (!dispatchDate) {
      Notification("Validation", t("Dispatch date is required."), "warning");
      return;
    }
    if (isClosedPeriod(dispatchDate, booksClosedUpto)) {
      Notification("Validation", closedPeriodMessage(booksClosedUpto, t("dispatch date")), "warning");
      return;
    }
    // Over-dispatch (dispatched > ordered) is allowed (client 2026-08-06) — the
    // vendor can send more than ordered; no cap here.
    setSubmitting(true);
    try {
      const payload = {
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
      };
      await dispatch(
        editMode ? editDispatchPoVendor(payload) : dispatchPoVendor(payload)
      ).unwrap();
      dispatch(cleanPoVendorMessage());
      navigate(backTo);
    } catch (err) {
      // Error toast surfaced by the store effect on the detail page.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <Card className="po-gen-card">
        <CardHeader className="po-gen-head d-flex justify-content-between align-items-center flex-wrap gap-1">
          <div className="d-flex align-items-center gap-1">
            <Truck size={18} className="text-primary" />
            <h4 className="mb-0">
              {editMode ? t("Edit Dispatch") : t("Dispatch")}{" "}
              <code>{p?.voucher_no || ""}</code>
            </h4>
            {p?.vendor_name ? (
              <Badge color="light-secondary" className="text-capitalize">
                {p.vendor_name}
              </Badge>
            ) : null}
          </div>
          <Button
            color="secondary"
            outline
            size="sm"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft size={14} className="me-50" />
            {t("Back")}
          </Button>
        </CardHeader>

        <CardBody>
          {locked && (
            <Alert color="warning" className="p-2 mb-2">
              {t(
                "This Vendor PO is closed or cancelled. Dispatch details are read-only."
              )}
            </Alert>
          )}
          {editMode && (
            <Alert color="info" className="p-2 mb-2">
              {t(
                "Editing dispatch — adjust transport details and per-line dispatched quantity. A line's dispatched quantity cannot be set below what has already been received via GRN."
              )}
            </Alert>
          )}
          <p className="small text-muted mb-2">
            {t(
              "Capture per-line dispatched quantities + transport details. Any shortfall (ordered − dispatched) returns to the parent PO's pending qty."
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
                invalid={isClosedPeriod(dispatchDate, booksClosedUpto)}
              />
              {isClosedPeriod(dispatchDate, booksClosedUpto) && (
                <div className="text-danger small">
                  {closedPeriodMessage(booksClosedUpto, t("dispatch date"))}
                </div>
              )}
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
              <Input
                value={ewayNo}
                onChange={(e) => setEwayNo(e.target.value)}
              />
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
              {t("Edit the dispatched qty — over- or under-dispatch is allowed.")}
            </small>
          </div>

          <div className="border rounded">
            <Table responsive bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th style={{ minWidth: 220 }}>{t("Product")}</th>
                  <th style={{ width: 70 }}>{t("Unit")}</th>
                  <th style={{ width: 100 }} className="text-end">
                    {t("Ordered")}
                  </th>
                  <th style={{ width: 140 }} className="text-end">
                    {t("Dispatched")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Short")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageLines.map((l, idx) => {
                  const rowNum = pg.pageStart + idx + 1;
                  const ordered = num(l.ordered_qty);
                  const dispatched = num(qtyByLine[l._id]);
                  const short = ordered - dispatched;
                  const sub = [
                    l?.part_no ? `Part: ${l.part_no}` : null,
                    l?.hsn_code ? `HSN: ${l.hsn_code}` : null,
                  ].filter(Boolean);
                  return (
                    <tr key={l._id}>
                      <td className="text-muted">{rowNum}</td>
                      <td>
                        <div className="fw-semibold text-capitalize">
                          {l?.product_name || "-"}
                        </div>
                        {sub.length ? (
                          <div className="small text-muted">
                            {sub.join(" · ")}
                          </div>
                        ) : null}
                      </td>
                      <td>{l?.unit || "-"}</td>
                      <td className="text-end">{ordered.toLocaleString()}</td>
                      <td className="text-end">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          bsSize="sm"
                          className="text-end"
                          disabled={locked}
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
          </div>

          <TablePaginationBar
            {...pg}
            totalRows={totalRows}
            className="d-flex justify-content-between align-items-center flex-wrap gap-1 mt-2"
          />

          <div
            className="d-flex justify-content-end flex-wrap gap-2 fw-bold mt-2"
            style={{ fontSize: "1.05rem" }}
          >
            <span>
              <span className="text-muted me-50">{t("Total Ordered")}:</span>
              {totals.ordered.toLocaleString()}
            </span>
            <span className="text-muted">·</span>
            <span>
              <span className="text-muted me-50">
                {t("Total Dispatched")}:
              </span>
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
            <Alert
              color="warning"
              className="d-flex align-items-start mt-2 mb-0 p-2"
            >
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
        </CardBody>

        <CardFooter className="d-flex justify-content-end gap-1">
          <Button
            color="secondary"
            outline
            onClick={() => navigate(backTo)}
            disabled={submitting}
          >
            {t("Cancel")}
          </Button>
          <Button
            color="primary"
            onClick={onSubmit}
            disabled={submitting || locked}
          >
            {submitting ? (
              <Spinner size="sm" className="me-50" />
            ) : (
              <Send size={14} className="me-50" />
            )}
            {editMode ? t("Update Dispatch") : t("Confirm Dispatch")}
          </Button>
        </CardFooter>
      </Card>
    </Fragment>
  );
};

export default DispatchPoVendor;
