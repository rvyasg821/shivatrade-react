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
import Select from "react-select";
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
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const round2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const fmt = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
// Display as DD-MM-YYYY (stored/sent as YYYY-MM-DD).
const dateOnly = (v) => {
  const s = String(v || "").slice(0, 10);
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}-${m}-${y}` : "-";
};

// TDS section presets (India). Picking one auto-fills the rate; still editable.
// Rate shown in the label; the 194Q ₹50L-turnover threshold is the client's
// call (they pick it when applicable — no turnover logic on our side).
const TDS_SECTIONS = [
  { value: "194C", label: "194C — Contractor / Sub-contractor (1–2%)", rate: 2 },
  { value: "194J", label: "194J — Professional / Technical fees (10%)", rate: 10 },
  { value: "194I", label: "194I — Rent, land & building (10%)", rate: 10 },
  { value: "194H", label: "194H — Commission / Brokerage (5%)", rate: 5 },
  { value: "194Q", label: "194Q — Purchase of goods > ₹50L (0.1%)", rate: 0.1 },
  { value: "194A", label: "194A — Interest, non-securities (10%)", rate: 10 },
];

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
  const companyStore = useSelector((s) => s.company);

  // Company bank accounts (the "paid from" dropdown, #7). Loaded once.
  useEffect(() => {
    dispatch(getCompanyDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bankOptions = useMemo(
    () =>
      (companyStore?.companyItem?.bank_accounts || [])
        .filter((b) => b?.is_active !== false)
        .map((b) => ({
          value: b._id,
          label: `${b.bank_name}${
            b.account_number ? ` — A/c ${b.account_number}` : ""
          }${b.is_default ? " (default)" : ""}`,
        })),
    [companyStore?.companyItem]
  );

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
  // Net effect of Adjustment Notes applied to this POV — positive means the
  // payable was reduced (a vendor Debit note).
  const adjustmentTotal = num(p?.adjustment_total);
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
    company_bank_account_id: "",
    tds_section: "",
    tds_rate_pct: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  // Live TDS breakdown: amount is GROSS → TDS held back → Net paid to vendor.
  const grossAmt = num(form.amount);
  const tdsRate = num(form.tds_rate_pct);
  const tdsAmt = round2((grossAmt * tdsRate) / 100);
  const netPaid = round2(grossAmt - tdsAmt);

  const pickDefaultBank = (opts) =>
    opts.find((o) => /\(default\)/.test(o.label)) || opts[0];

  // getCompanyDetails() is async, so opening the modal before it resolves left
  // bankOptions empty and the dropdown blank. Back-fill the default as soon as
  // the accounts land — but never overwrite a choice already made.
  useEffect(() => {
    if (!payOpen || !bankOptions.length) return;
    setForm((s) =>
      s.company_bank_account_id
        ? s
        : { ...s, company_bank_account_id: pickDefaultBank(bankOptions)?.value || "" }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payOpen, bankOptions]);

  const openModal = () => {
    // Default the paying bank to the company's default account, if any.
    const def = pickDefaultBank(bankOptions);
    setForm({
      payment_date: new Date().toISOString().slice(0, 10),
      invoice_number: "",
      amount: balance > 0 ? balance.toFixed(2) : "",
      company_bank_account_id: def?.value || "",
      tds_section: "",
      tds_rate_pct: "",
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
    if (tdsAmt > amt) e.tds = t("TDS cannot exceed the gross amount");
    // Overpaying the vendor is allowed (advances / rounding / FX) — we warn
    // in the modal but never block. See `willOverpay` below.
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    // amount = GROSS (settles the vendor in full). Backend derives net_paid.
    const payload = {
      payment_date: form.payment_date,
      amount: form.amount,
      invoice_number: form.invoice_number || undefined,
      notes: form.notes || undefined,
      company_bank_account_id: form.company_bank_account_id || undefined,
      tds_section: form.tds_section || undefined,
      tds_rate_pct: String(tdsRate),
      tds_amount: String(tdsAmt),
    };
    dispatch(recordPoVendorPayment({ id, data: payload }))
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
            {/* Adjustment Notes applied to THIS POV settle it alongside cash —
                surfaced here so the Balance Payable below adds up on screen.
                Hidden when there are none. */}
            {Math.abs(adjustmentTotal) > 0.001 && (
              <div className="text-muted small mt-25">
                {t("Adjustments")}: {adjustmentTotal > 0 ? "− " : "+ "}
                {sym}
                {fmt(Math.abs(adjustmentTotal))}
              </div>
            )}
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
              <th className="text-nowrap text-start">{t("Voucher")}</th>
              <th className="text-nowrap text-start">{t("Date")}</th>
              <th>{t("Invoice Number")}</th>
              <th>{t("Paid From (Bank)")}</th>
              <th className="text-end">{t("Gross")}</th>
              <th className="text-end">{t("TDS")}</th>
              <th className="text-end">{t("Net Paid")}</th>
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
                  <td className="text-nowrap text-start">
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
                  <td className="text-nowrap text-start">{dateOnly(pay.payment_date)}</td>
                  <td>{pay.invoice_number || "-"}</td>
                  <td>
                    {pay.company_bank_snapshot?.bank_name || "-"}
                    {pay.company_bank_snapshot?.account_number ? (
                      <div className="small text-muted">
                        {t("A/c")} {pay.company_bank_snapshot.account_number}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-end">
                    {sym}
                    {fmt(pay.amount)}
                  </td>
                  <td className="text-end">
                    {num(pay.tds_amount) > 0 ? (
                      <span title={pay.tds_section || ""}>
                        {sym}
                        {fmt(pay.tds_amount)}
                        {pay.tds_section ? (
                          <div className="small text-muted">
                            {pay.tds_section}
                          </div>
                        ) : null}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="text-end fw-semibold">
                    {sym}
                    {fmt(num(pay.net_paid) || num(pay.amount))}
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
                {t("Gross Amount")}
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
            {/* Paying company bank account (#7 — "from which account") */}
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Paid From")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={bankOptions}
                value={
                  bankOptions.find(
                    (o) => o.value === form.company_bank_account_id
                  ) || null
                }
                onChange={(opt) =>
                  setForm((s) => ({
                    ...s,
                    company_bank_account_id: opt ? opt.value : "",
                  }))
                }
                placeholder={
                  bankOptions.length
                    ? t("Select company bank account")
                    : t("No bank accounts — add them in Company settings")
                }
                noOptionsMessage={() => t("No bank accounts")}
              />
            </Col>
            <Col md="6" className="mb-2">
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

            {/* TDS (#7): Gross → TDS → Net paid. Optional. */}
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("TDS Section")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={TDS_SECTIONS}
                value={
                  TDS_SECTIONS.find((o) => o.value === form.tds_section) || null
                }
                onChange={(opt) =>
                  setForm((s) => ({
                    ...s,
                    tds_section: opt ? opt.value : "",
                    // Auto-fill the rate on pick; clearing wipes it.
                    tds_rate_pct: opt ? String(opt.rate) : "",
                  }))
                }
                placeholder={t("No TDS")}
              />
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("TDS Rate (%)")}</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.tds_rate_pct}
                placeholder="0"
                onChange={(e) =>
                  setForm((s) => ({ ...s, tds_rate_pct: e.target.value }))
                }
              />
            </Col>
            {(tdsAmt > 0 || tdsRate > 0) && (
              <Col md="12" className="mb-2">
                <div className="border rounded p-1 bg-light small">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t("Gross")}</span>
                    <span>{sym}{fmt(grossAmt)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-danger">
                    <span>
                      {t("TDS")}
                      {form.tds_section ? ` (${form.tds_section})` : ""} @{" "}
                      {fmt(tdsRate)}%
                    </span>
                    <span>− {sym}{fmt(tdsAmt)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-25 mt-25">
                    <span>{t("Net Paid to Vendor")}</span>
                    <span>{sym}{fmt(netPaid)}</span>
                  </div>
                  {errors.tds && (
                    <div className="text-danger mt-25">{errors.tds}</div>
                  )}
                </div>
              </Col>
            )}
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
