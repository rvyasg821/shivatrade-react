// POV Payments tab — record advances / part-payments against a vendor PO,
// track the balance payable and Unpaid / Partially Paid / Paid status, and
// download the Payment Voucher (STIPL/PV/…) PDF. Mirrors the Sales-side
// Record Payment flow but for money going OUT to vendors.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Badge,
  Button,
  Col,
  FormFeedback,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Table,
} from "reactstrap";
import { AlertTriangle, DollarSign, Download } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { openPdfViewer } from "@src/utility/pdf";
import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { isAdminUser } from "@constant/defaultValues";
import {
  recordPoVendorPayment,
  voidPoVendorPayment,
} from "@src/views/po-vendors/store";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const fmt = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const dateOnly = (v) => (v ? String(v).slice(0, 10) : "-");

const STATUS_PILL = {
  unpaid: { label: "Unpaid", color: "secondary" },
  partially_paid: { label: "Partially Paid", color: "warning" },
  paid: { label: "Paid", color: "success" },
  overpaid: { label: "Overpaid", color: "danger" },
};

const PaymentsTab = ({ registerActions }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;

  const p = poVendorItem || {};
  const id = p?._id;
  const sym = p?.currency_symbol || "₹";
  const statusLower = (p?.status || "").toLowerCase();

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canUpdate = isAdmin || perms?.can_all || perms?.can_update;
  // Payments run independently of dispatch — allowed in any non-cancelled
  // status (incl. draft); blocked only once the POV is cancelled.
  const canPay = canUpdate && statusLower !== "cancelled";

  const orderValue = num(p?.order_value);
  const paidToDate = num(p?.amount_paid);
  const balance = num(p?.balance_payable);
  const payments = useMemo(
    () => (Array.isArray(p?.payments) ? p.payments : []),
    [p?.payments]
  );
  const pill = STATUS_PILL[(p?.payment_status || "unpaid").toLowerCase()] ||
    STATUS_PILL.unpaid;

  // ── Record modal ─────────────────────────────────────────────────────
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    payment_date: "",
    invoice_number: "",
    amount: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  const openModal = () => {
    setForm({
      payment_date: new Date().toISOString().slice(0, 10),
      invoice_number: "",
      amount: balance > 0 ? balance.toFixed(2) : "",
      notes: "",
    });
    setErrors({});
    setPayOpen(true);
  };

  const submit = () => {
    const e = {};
    if (!form.payment_date) e.payment_date = t("Date required");
    const amt = num(form.amount);
    if (!(amt > 0)) e.amount = t("Amount must be greater than 0");
    // Overpaying the vendor is allowed (advances / rounding / FX) — we warn
    // in the modal but never block. See `willOverpay` below.
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    dispatch(recordPoVendorPayment({ id, data: form }))
      .then((r) => {
        if (r?.meta?.requestStatus === "fulfilled") {
          setPayOpen(false);
        } else {
          Notification(
            t("Error"),
            r?.payload || t("Could not record payment"),
            "warning"
          );
        }
      })
      .finally(() => setSaving(false));
  };

  const handleVoid = (paymentId) => {
    mySwal
      .fire({
        title: t("Void this payment?"),
        text: t(
          "It will remain in the audit log but won't count toward the balance."
        ),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, void"),
        cancelButtonText: t("Back"),
        customClass: {
          confirmButton: "btn btn-warning",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        dispatch(
          voidPoVendorPayment({
            id,
            paymentId,
            reason: res.value || undefined,
          })
        ).then((r) => {
          if (r?.meta?.requestStatus !== "fulfilled") {
            Notification(
              t("Error"),
              r?.payload || t("Could not void payment"),
              "warning"
            );
          }
        });
      });
  };

  // Open the Payment Voucher PDF in the in-app viewer (new tab, frontend
  // origin) — fetched via the authed API, with a correctly-named Download.
  const openVoucherPdf = (payment) =>
    openPdfViewer({
      kind: "po_vendor_payment",
      id,
      name: payment?.payment_voucher_no,
      params: { paymentId: payment?._id },
    });

  // Publish the Record Payment button to the tab bar (right of the titles).
  useEffect(() => {
    if (!registerActions) return undefined;
    registerActions(
      canPay ? (
        <Button color="success" size="sm" onClick={openModal}>
          <DollarSign size={14} className="me-50" /> {t("Record Payment")}
        </Button>
      ) : null
    );
    return () => registerActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPay, balance]);

  return (
    <Fragment>
      {/* Money position summary */}
      <Row className="g-1 mb-2">
        <Col md="3" sm="6">
          <div className="border rounded p-1 h-100">
            <div className="text-muted small">{t("Order Value (Payable)")}</div>
            <div className="fw-bolder text-body">
              {sym}
              {fmt(orderValue)}
            </div>
          </div>
        </Col>
        <Col md="3" sm="6">
          <div className="border rounded p-1 h-100">
            <div className="text-muted small">{t("Total Paid")}</div>
            <div className="fw-bolder text-body">
              {sym}
              {fmt(paidToDate)}
            </div>
          </div>
        </Col>
        <Col md="3" sm="6">
          <div className="border rounded p-1 h-100">
            <div className="text-muted small">
              {balance < -0.01 ? t("Overpaid") : t("Balance Payable")}
            </div>
            <div
              className="fw-bolder"
              style={{
                color:
                  balance < -0.01
                    ? "#ea5455"
                    : balance > 0.01
                      ? "#c77700"
                      : "#1f8a3b",
              }}
            >
              {sym}
              {fmt(Math.abs(balance))}
            </div>
          </div>
        </Col>
        <Col md="3" sm="6">
          <div className="border rounded p-1 h-100">
            <div className="text-muted small">{t("Payment Status")}</div>
            <Badge color={pill.color} className="mt-25 text-white">
              {t(pill.label)}
            </Badge>
          </div>
        </Col>
      </Row>

      {payments.length === 0 ? (
        <div className="text-muted text-center py-3">
          {t("No payments recorded yet.")}
        </div>
      ) : (
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>{t("Voucher")}</th>
              <th>{t("Date")}</th>
              <th>{t("Invoice Number")}</th>
              <th>{t("Notes")}</th>
              <th className="text-end">{t("Amount")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => {
              const voided = !!pay.voided_at;
              return (
                <tr
                  key={pay._id}
                  className={voided ? "text-muted" : ""}
                  style={voided ? { textDecoration: "line-through" } : {}}
                >
                  <td>
                    {pay.payment_voucher_no ? (
                      <Button
                        size="sm"
                        color="link"
                        className="p-0"
                        title={t("Download Voucher")}
                        onClick={() => openVoucherPdf(pay)}
                      >
                        <Download size={13} className="me-25" />
                        {pay.payment_voucher_no}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{dateOnly(pay.payment_date)}</td>
                  <td>{pay.invoice_number || "-"}</td>
                  <td>{pay.notes || "-"}</td>
                  <td className="text-end">
                    {sym}
                    {fmt(pay.amount)}
                  </td>
                  <td className="text-end">
                    {!voided && canPay ? (
                      <Button
                        size="sm"
                        color="link"
                        className="p-0 text-danger"
                        onClick={() => handleVoid(pay._id)}
                      >
                        {t("Void")}
                      </Button>
                    ) : voided ? (
                      <span className="badge bg-light text-muted">
                        {t("voided")}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Record Payment modal */}
      <Modal
        isOpen={payOpen}
        toggle={() => setPayOpen(false)}
        centered
        size="lg"
      >
        <ModalHeader toggle={() => setPayOpen(false)}>
          {t("Record Payment")}
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md="6" className="mb-2">
              <Label className="form-label">
                {t("Payment Date")} <span className="text-danger">*</span>
              </Label>
              <DateInput
                id="pov-pay-date"
                value={form.payment_date}
                onChange={(_d, _s, iso) =>
                  setForm((s) => ({ ...s, payment_date: iso || "" }))
                }
              />
              {errors.payment_date && (
                <div className="text-danger small">{errors.payment_date}</div>
              )}
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">
                {t("Amount")}
                {p?.currency_code ? ` (${p.currency_code})` : ""}{" "}
                <span className="text-danger">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((s) => ({ ...s, amount: e.target.value }))
                }
                invalid={!!errors.amount}
              />
              {errors.amount && (
                <FormFeedback className="d-block">{errors.amount}</FormFeedback>
              )}
              <small className="text-muted">
                {balance < -0.01
                  ? `${t("Already overpaid by")}: ${sym}${fmt(
                      Math.abs(balance)
                    )}`
                  : `${t("Balance payable")}: ${sym}${fmt(balance)}`}
              </small>
              {num(form.amount) - balance > 0.01 && num(form.amount) > 0 ? (
                <div className="d-flex align-items-start gap-50 mt-1 text-warning small">
                  <AlertTriangle size={14} className="mt-25 flex-shrink-0" />
                  <span>
                    {t(
                      "This payment overpays the vendor. It's allowed — the POV will be marked Overpaid."
                    )}
                  </span>
                </div>
              ) : null}
            </Col>
            <Col md="12" className="mb-2">
              <Label className="form-label">{t("Invoice Number")}</Label>
              <Input
                value={form.invoice_number}
                maxLength={120}
                placeholder={t("Vendor's invoice number")}
                onChange={(e) =>
                  setForm((s) => ({ ...s, invoice_number: e.target.value }))
                }
              />
            </Col>
            <Col md="12" className="mb-2">
              <Label className="form-label">{t("Notes")}</Label>
              <Input
                type="textarea"
                rows="2"
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setPayOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button color="primary" onClick={submit} disabled={saving}>
            {t("Record")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default PaymentsTab;
