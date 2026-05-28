import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  Badge,
  Row,
  Col,
  Spinner,
} from "reactstrap";
import {
  Calendar,
  DollarSign,
  Edit,
  ArrowLeft,
  Layers,
  CreditCard,
  Hash,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Percent,
  Globe,
  Truck,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getInvoice,
  issueInvoice,
  cancelInvoice,
  cleanInvoiceMessage,
  recordInvoicePayment,
  voidInvoicePayment,
} from "@src/views/invoices/store";
import { Input, Label, Button, Modal, ModalHeader, ModalBody, ModalFooter, FormFeedback, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import Select from "react-select";
import DateInput from "@components/date-input";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { startLoading, stopLoading } from "@src/views/loadingstore";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  INVOICE_PIPELINE_STEPS as PIPELINE_STEPS,
  INVOICE_TERMINAL_STEPS as TERMINAL_STEPS,
  INVOICE_STATUS_BADGE_COLOR as STATUS_COLORS,
  INVOICE_PAYMENT_METHOD_OPTIONS as PAYMENT_METHOD_OPTIONS,
} from "@constant/options";
import { getCurrencySymbol } from "@src/utility/currency";
import { formatDate } from "@src/utility/dateFormat";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailFieldList,
  DetailPanel,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

const num = (v) => Number(v || 0);
const fmt = (v, dp = 2) =>
  num(v).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

const ViewInvoice = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  const store = useSelector((s) => s.invoice);
  const inv = store?.invoiceItem || {};

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.invoices;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;
  const canDelete = isAdmin || perms?.can_all || perms?.can_delete;

  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_date: "",
    amount: "",
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [payErrors, setPayErrors] = useState({});

  const openPaymentModal = () => {
    setPayForm({
      payment_date: new Date().toISOString().slice(0, 10),
      amount: String(inv?.balance_receivable || ""),
      method: "bank_transfer",
      reference: "",
      notes: "",
    });
    setPayErrors({});
    setPayOpen(true);
  };

  const submitPayment = () => {
    const e = {};
    if (!payForm.payment_date) e.payment_date = "Date required";
    const amt = Number(payForm.amount || 0);
    if (!(amt > 0)) e.amount = "Amount > 0";
    const bal = Number(inv?.balance_receivable || 0);
    if (amt > bal + 0.01) e.amount = `Cannot exceed balance ${bal}`;
    setPayErrors(e);
    if (Object.keys(e).length) return;
    dispatch(recordInvoicePayment({ id, data: payForm })).then((r) => {
      if (r?.meta?.requestStatus === "fulfilled") {
        setPayOpen(false);
        dispatch(getInvoice(id));
      }
    });
  };

  // Fetch the PDF via the auth-aware axios instance, then open it as a
  // blob URL. window.open(serverUrl) would skip the Bearer header → 401.
  // Uses the global page overlay (SimpleSpinner) for the loading state.
  const openInvoicePdf = async (doc) => {
    dispatch(startLoading());
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.invoices.pdf}/${id}/pdf`,
        { params: { doc }, responseType: "blob" }
      );
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      // Some popup blockers return null; fall back to a download.
      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${inv?.voucher_no || "invoice"}-${doc}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      // Revoke after a delay so the new tab has time to load it.
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || "Failed to load PDF",
        "warning"
      );
    } finally {
      dispatch(stopLoading());
    }
  };

  const handleVoidPayment = (paymentId) => {
    mySwal
      .fire({
        title: t("Void this payment?"),
        text: t("It will remain in the audit log but won't count toward the balance."),
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
          voidInvoicePayment({ id, paymentId, reason: res.value || undefined })
        ).then((r) => {
          if (r?.meta?.requestStatus === "fulfilled") dispatch(getInvoice(id));
        });
      });
  };

  useEffect(() => {
    if (id) dispatch(getInvoice(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanInvoiceMessage());
  }, [store?.success, store?.error, dispatch]);

  const sym = useMemo(
    () => getCurrencySymbol(inv?.currency_code) || inv?.currency_symbol || "",
    [inv?.currency_code, inv?.currency_symbol]
  );

  const isDraft = (inv?.status || "").toLowerCase() === "draft";
  const isIssued = (inv?.status || "").toLowerCase() === "issued";
  const isPartial = (inv?.status || "").toLowerCase() === "partially_paid";
  const isPaid = (inv?.status || "").toLowerCase() === "paid";
  const isCancelled = (inv?.status || "").toLowerCase() === "cancelled";

  const lines = inv?.lines || [];

  // ── Handlers ────────────────────────────────────────────────────────

  const handleIssue = () => {
    mySwal
      .fire({
        title: t("Issue Invoice?"),
        text: t(
          "A voucher number will be assigned and snapshots will be frozen. Only Shipping link, Advance and Notes are editable after issue."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, issue"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        setBusy(true);
        dispatch(issueInvoice(id))
          .unwrap()
          .catch(() => {})
          .finally(() => setBusy(false));
      });
  };

  const handleCancel = () => {
    mySwal
      .fire({
        title: t("Cancel Invoice?"),
        text: t("This invoice will be marked CANCELLED. Reason (optional):"),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, cancel"),
        cancelButtonText: t("Back"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        setBusy(true);
        dispatch(cancelInvoice({ id, reason: res.value || undefined }))
          .unwrap()
          .catch(() => {})
          .finally(() => setBusy(false));
      });
  };

  // ── Header actions ──────────────────────────────────────────────────

  const headerActions = useMemo(() => {
    const actions = [];

    if (isDraft && canEdit) {
      actions.push({
        icon: Edit,
        label: t("Edit"),
        onClick: () => navigate(`${appsRoot}/invoices/edit/${id}`),
      });
      actions.push({
        icon: CheckCircle,
        label: t("Issue"),
        onClick: handleIssue,
        color: "success",
      });
    }

    if ((isIssued || isPartial) && canEdit) {
      actions.push({
        icon: DollarSign,
        label: t("Record Payment"),
        onClick: openPaymentModal,
        color: "success",
      });
    }

    if ((isIssued || isPartial) && canDelete) {
      actions.push({
        icon: XCircle,
        label: t("Cancel"),
        onClick: handleCancel,
        color: "danger",
        outline: true,
      });
    }

    if (!isDraft && !isCancelled) {
      // Book a Shipping from this Invoice - pre-fills consignee, country,
      // and attaches the invoice automatically. Hidden if already booked.
      if (!inv.shipping_id) {
        actions.push({
          icon: Truck,
          label: t("Book Shipping"),
          onClick: () =>
            navigate(`${appsRoot}/shipping/add?invoice_id=${id}`),
          color: "primary",
        });
      }
      actions.push({
        icon: Download,
        label: t("Commercial Invoice"),
        onClick: () => openInvoicePdf("commercial"),
        color: "info",
        outline: true,
      });
      actions.push({
        icon: Download,
        label: t("Export Invoice"),
        onClick: () => openInvoicePdf("export"),
        color: "info",
        outline: true,
      });
      actions.push({
        icon: Download,
        label: t("Packing List"),
        onClick: () => openInvoicePdf("packing-list"),
        color: "info",
        outline: true,
      });
    }

    actions.push({
      icon: ArrowLeft,
      label: t("Back"),
      onClick: () => navigate(`${appsRoot}/invoices`),
    });

    return actions;
  }, [
    isDraft,
    isIssued,
    isPartial,
    isCancelled,
    canEdit,
    canDelete,
    id,
    navigate,
    t,
    inv?.shipping_id,
  ]);

  // ── KPI tiles ───────────────────────────────────────────────────────

  const kpiItems = [
    {
      key: "grand",
      label: t("Grand Total"),
      value: inv?.grand_total
        ? `${sym}${fmt(inv.grand_total)}`
        : "-",
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "balance",
      label: t("Balance"),
      value: inv?.balance_receivable
        ? `${sym}${fmt(inv.balance_receivable)}`
        : "-",
      icon: CreditCard,
      tone:
        num(inv?.balance_receivable) > 0 ? "warning" : "success",
      sub:
        num(inv?.advance_received) > 0
          ? `${t("Advance")}: ${sym}${fmt(inv.advance_received)}`
          : null,
    },
    {
      key: "date",
      label: t("Invoice Date"),
      value: inv?.invoice_date ? formatDate(inv.invoice_date) : "-",
      icon: Calendar,
      tone: "secondary",
    },
    {
      key: "lines",
      label: t("Line Items"),
      value: lines.length,
      icon: Layers,
      tone: "secondary",
    },
  ];

  // ── Side panel fields ──────────────────────────────────────────────

  const sourceFields = [
    inv?.purchase_order_voucher_no && {
      icon: Hash,
      label: t("PO"),
      value: inv.purchase_order_voucher_no,
    },
    inv?.pfi_voucher_no && {
      icon: FileText,
      label: t("PFI"),
      value: inv.pfi_voucher_no,
    },
    inv?.quotation_voucher_no && {
      icon: FileText,
      label: t("Quotation"),
      value: inv.quotation_voucher_no,
    },
    inv?.customer_po_no && {
      icon: Hash,
      label: t("Buyer's PO #"),
      value: inv.customer_po_no,
    },
  ].filter(Boolean);

  const tradeFields = [
    inv?.incoterm && {
      icon: Globe,
      label: t("Incoterm"),
      value: inv.incoterm,
    },
    inv?.country_of_destination && {
      icon: Globe,
      label: t("Destination"),
      value: inv.country_of_destination,
    },
    inv?.gst_route && {
      icon: Percent,
      label: t("GST Route"),
      value: (inv.gst_route || "").replace("_", " "),
    },
    inv?.exchange_rate && {
      icon: Percent,
      label: t("Exchange Rate"),
      value: `1 ${inv.currency_code} = ${fmt(inv.exchange_rate, 4)} INR`,
    },
  ].filter(Boolean);

  const complianceFields = [
    inv?.gst_no && { icon: Hash, label: t("GSTIN"), value: inv.gst_no },
    inv?.iec_no && { icon: Hash, label: t("IEC"), value: inv.iec_no },
    inv?.pan_no && { icon: Hash, label: t("PAN"), value: inv.pan_no },
    inv?.ad_code && { icon: Hash, label: t("AD Code"), value: inv.ad_code },
    inv?.lut_no && {
      icon: FileText,
      label: t("LUT"),
      value: `${inv.lut_no}${inv.lut_date ? ` (${formatDate(inv.lut_date)})` : ""}`,
    },
  ].filter(Boolean);

  if (!inv?._id) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }

  const statusLower = (inv?.status || "").toLowerCase();
  const statusLabel = (statusLower || "").replace("_", " ");

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="I"
          title={inv?.voucher_no || t("(Draft)")}
          subtitle={
            [inv?.customer_snapshot?.name, inv?.customer_snapshot?.email]
              .filter(Boolean)
              .join(" · ") || null
          }
          meta={
            inv?._id ? (
              <span>
                <Hash size={12} className="me-25" />
                {inv._id.slice(-8).toUpperCase()}
              </span>
            ) : null
          }
          badge={{
            label: statusLabel,
            color: STATUS_COLORS[statusLower] || "secondary",
          }}
          actions={headerActions.filter((a) => !a.hidden)}
          moreActions={[]}
          belowSlot={
            <DetailPipeline
              steps={PIPELINE_STEPS}
              current={statusLower}
              terminalSteps={TERMINAL_STEPS}
            />
          }
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="9-3"
          left={
            <Card className="mb-1">
              <CardBody>
                <Nav pills className="mb-2">
                  <NavItem>
                    <NavLink
                      active={activeTab === "details"}
                      onClick={() => setActiveTab("details")}
                      style={{
                        color: activeTab === "details" ? "#fff" : "#1a2238",
                        display: "inline-flex",
                        alignItems: "center",
                        height: 38,
                        padding: "0 14px",
                      }}
                    >
                      <FileText size={16} className="me-50" />
                      {t("Line Items")}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      active={activeTab === "payments"}
                      onClick={() => setActiveTab("payments")}
                      style={{
                        color:
                          activeTab === "payments" ? "#fff" : "#1a2238",
                        display: "inline-flex",
                        alignItems: "center",
                        height: 38,
                        padding: "0 14px",
                      }}
                    >
                      <DollarSign size={16} className="me-50" />
                      {t("Payments")}
                      {Array.isArray(inv?.payments) &&
                        inv.payments.filter((p) => !p.voided_at).length >
                          0 && (
                          <span
                            className="badge ms-1"
                            style={{
                              background:
                                activeTab === "payments"
                                  ? "rgba(255,255,255,0.25)"
                                  : "#eef0f3",
                              color:
                                activeTab === "payments" ? "#fff" : "#1a2238",
                            }}
                          >
                            {
                              inv.payments.filter((p) => !p.voided_at).length
                            }
                          </span>
                        )}
                    </NavLink>
                  </NavItem>
                </Nav>

                <TabContent activeTab={activeTab}>
                  <TabPane tabId="details">
              {/* Line Items */}
              <div className="mb-3">
                <div>
                  {lines.length === 0 ? (
                    <div className="text-muted text-center py-2">
                      {t("No lines")}
                    </div>
                  ) : (
                    <Table responsive bordered size="sm" className="align-top mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>{t("HSN")}</th>
                          <th>{t("Product / Description")}</th>
                          <th style={{ width: 70 }}>{t("UQC")}</th>
                          <th style={{ width: 80 }} className="text-end">
                            {t("Qty")}
                          </th>
                          <th style={{ width: 100 }} className="text-end">
                            {t("Unit Price")}
                          </th>
                          <th style={{ width: 100 }} className="text-end">
                            {t("Line Total")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, i) => (
                          <tr key={l._id || i}>
                            <td>{l.seq || i + 1}</td>
                            <td>{l.hsn_code || "-"}</td>
                            <td>
                              <div className="fw-semibold">
                                {l.product_name || "-"}
                              </div>
                              {l.product_code && (
                                <small className="text-muted">
                                  {l.product_code}
                                </small>
                              )}
                              {l.description && (
                                <div className="small text-muted mt-25">
                                  {l.description}
                                </div>
                              )}
                            </td>
                            <td>{l.uqc_code || l.unit || "-"}</td>
                            <td className="text-end">{fmt(l.qty, 4)}</td>
                            <td className="text-end">
                              {sym}
                              {fmt(l.unit_price, 4)}
                            </td>
                            <td className="text-end fw-semibold">
                              {sym}
                              {fmt(l.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <td colSpan="6" className="text-end fw-bold">
                            {t("Subtotal")}
                          </td>
                          <td className="text-end fw-bold">
                            {sym}
                            {fmt(inv?.subtotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  )}
                </div>
              </div>

              {/* Costing summary */}
              <div className="mb-3">
                <h5 className="mb-2">{t("Costing")}</h5>
                <div>
                  <Row className="small">
                    <Col md="6">
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Subtotal")}</span>
                        <span>{sym}{fmt(inv?.subtotal)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Discount")}</span>
                        <span>− {sym}{fmt(inv?.discount_total)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25 border-top pt-25">
                        <span className="fw-semibold">{t("FOB Value")}</span>
                        <span className="fw-semibold">{sym}{fmt(inv?.fob_value)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Freight")}</span>
                        <span>{sym}{fmt(inv?.freight_charges)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Insurance")}</span>
                        <span>{sym}{fmt(inv?.insurance_charges)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Other")}</span>
                        <span>{sym}{fmt(inv?.other_charges)}</span>
                      </div>
                    </Col>
                    <Col md="6">
                      <div className="d-flex justify-content-between py-25 border-top border-bottom py-1 mb-1">
                        <span className="fw-bold">{t("Grand Total")}</span>
                        <span className="fw-bold">{sym}{fmt(inv?.grand_total)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25 small text-muted">
                        <span>{t("INR equivalent")}</span>
                        <span>₹{fmt(inv?.grand_total_inr)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Advance Received")}</span>
                        <span>{sym}{fmt(inv?.advance_received)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25 border-top pt-25">
                        <span className="fw-semibold">{t("Balance Receivable")}</span>
                        <span
                          className={`fw-semibold ${
                            num(inv?.balance_receivable) > 0
                              ? "text-warning"
                              : "text-success"
                          }`}
                        >
                          {sym}{fmt(inv?.balance_receivable)}
                        </span>
                      </div>
                    </Col>
                  </Row>
                  {inv?.amount_in_words && (
                    <div className="mt-2 small fst-italic text-muted">
                      {t("In words")}: {inv.amount_in_words}
                    </div>
                  )}
                </div>
              </div>

              {/* IGST refund footer (igst_paid route only) */}
              {Array.isArray(inv?.igst_refund_buckets) &&
                inv.igst_refund_buckets.length > 0 && (
                  <div className="mb-3">
                    <h5 className="mb-2">
                      {t("IGST Refund (per HSN rate)")}
                    </h5>
                    <div>
                      <Table bordered size="sm" className="align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="text-end">{t("Assessable (INR)")}</th>
                            <th className="text-end">{t("IGST Rate")}</th>
                            <th className="text-end">{t("IGST Amount (INR)")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.igst_refund_buckets.map((b, i) => (
                            <tr key={i}>
                              <td className="text-end">
                                ₹{fmt(b.assessable_value_inr)}
                              </td>
                              <td className="text-end">
                                {fmt(b.rate, 2)}%
                              </td>
                              <td className="text-end fw-semibold">
                                ₹{fmt(b.igst_amount_inr)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan="2" className="text-end fw-bold">
                              {t("Total Refund")}
                            </td>
                            <td className="text-end fw-bold">
                              ₹{fmt(inv?.igst_refund_amount)}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>
                  </div>
                )}
                </TabPane>

                <TabPane tabId="payments">
                <div className="mb-3">
                  {(isIssued || isPartial) && canEdit && (
                    <div className="d-flex justify-content-end mb-2">
                      <Button
                        size="sm"
                        color="success"
                        onClick={openPaymentModal}
                      >
                        <DollarSign size={14} className="me-50" />
                        {t("Record Payment")}
                      </Button>
                    </div>
                  )}
                  <div>
                    {!Array.isArray(inv?.payments) || inv.payments.length === 0 ? (
                      <div className="text-muted text-center py-3">
                        {t("No payments recorded yet.")}
                      </div>
                    ) : (
                      <Table responsive bordered size="sm" className="align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t("Date")}</th>
                            <th>{t("Method")}</th>
                            <th>{t("Reference")}</th>
                            <th>{t("Notes")}</th>
                            <th className="text-end">{t("Amount")}</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.payments.map((p) => {
                            const voided = !!p.voided_at;
                            return (
                              <tr
                                key={p._id}
                                className={voided ? "text-muted" : ""}
                                style={
                                  voided ? { textDecoration: "line-through" } : {}
                                }
                              >
                                <td>{formatDate(p.payment_date)}</td>
                                <td className="text-capitalize">
                                  {(p.method || "-").replace(/_/g, " ")}
                                </td>
                                <td>{p.reference || "-"}</td>
                                <td>{p.notes || "-"}</td>
                                <td className="text-end">
                                  {sym}
                                  {fmt(p.amount)}
                                </td>
                                <td className="text-end">
                                  {!voided &&
                                    (isIssued || isPartial) &&
                                    canEdit && (
                                      <Button
                                        size="sm"
                                        color="link"
                                        className="p-0 text-danger"
                                        onClick={() =>
                                          handleVoidPayment(p._id)
                                        }
                                      >
                                        {t("Void")}
                                      </Button>
                                    )}
                                  {voided && (
                                    <span className="badge bg-light text-muted">
                                      {t("voided")}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </div>
                </TabPane>
                </TabContent>
              </CardBody>
            </Card>
          }
          right={
            <Fragment>
              {sourceFields.length > 0 && (
                <DetailPanel title={t("Source Documents")}>
                  <DetailFieldList items={sourceFields} />
                </DetailPanel>
              )}
              {tradeFields.length > 0 && (
                <DetailPanel title={t("Trade Terms")}>
                  <DetailFieldList items={tradeFields} />
                </DetailPanel>
              )}
              {complianceFields.length > 0 && (
                <DetailPanel title={t("Compliance")}>
                  <DetailFieldList items={complianceFields} />
                </DetailPanel>
              )}

              {/* Banks */}
              {Array.isArray(inv?.bank_snapshots) &&
                inv.bank_snapshots.length > 0 && (
                  <DetailPanel title={t("Banks")}>
                    {inv.bank_snapshots.map((b, i) => (
                      <div
                        key={i}
                        className={`small ${
                          i > 0 ? "border-top pt-1 mt-1" : ""
                        }`}
                      >
                        <div className="fw-semibold">{b.name}</div>
                        {b.account_no && (
                          <div className="text-muted">A/C: {b.account_no}</div>
                        )}
                        {b.swift_code && (
                          <div className="text-muted">SWIFT: {b.swift_code}</div>
                        )}
                        {b.ad_code && (
                          <div className="text-muted">AD: {b.ad_code}</div>
                        )}
                        {b.branch && (
                          <div className="text-muted">{b.branch}</div>
                        )}
                      </div>
                    ))}
                  </DetailPanel>
                )}

              {/* Notes */}
              {(inv?.notes_to_buyer || inv?.internal_notes) && (
                <DetailPanel title={t("Notes")}>
                  {inv?.notes_to_buyer && (
                    <div className="small mb-1">
                      <div className="text-muted mb-25">{t("To buyer")}</div>
                      <div
                        className="text-break"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {inv.notes_to_buyer}
                      </div>
                    </div>
                  )}
                  {inv?.internal_notes && (
                    <div className="small mt-1 pt-1 border-top">
                      <div className="text-muted mb-25">{t("Internal")}</div>
                      <div
                        className="text-break"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {inv.internal_notes}
                      </div>
                    </div>
                  )}
                </DetailPanel>
              )}

              {inv?.cancelled_reason && (
                <DetailPanel title={t("Cancellation")}>
                  <div className="small">
                    <div className="text-danger fw-semibold mb-25">
                      {t("Cancelled")}
                    </div>
                    {inv?.cancelled_at && (
                      <div className="text-muted">
                        {formatDate(inv.cancelled_at)}
                      </div>
                    )}
                    <div className="mt-25">{inv.cancelled_reason}</div>
                  </div>
                </DetailPanel>
              )}

            </Fragment>
          }
        />
      </div>

      {/* ── Record payment modal ─────────────────────────────────────── */}
      <Modal isOpen={payOpen} toggle={() => setPayOpen(false)} centered size="lg">
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
                id="pay-date"
                value={payForm.payment_date}
                onChange={(_d, _s, iso) =>
                  setPayForm((s) => ({ ...s, payment_date: iso || "" }))
                }
              />
              {payErrors.payment_date && (
                <div className="text-danger small">{payErrors.payment_date}</div>
              )}
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">
                {t("Amount")} <span className="text-danger">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={payForm.amount}
                onChange={(e) =>
                  setPayForm((s) => ({ ...s, amount: e.target.value }))
                }
                invalid={!!payErrors.amount}
              />
              {payErrors.amount && (
                <FormFeedback className="d-block">
                  {payErrors.amount}
                </FormFeedback>
              )}
              <small className="text-muted">
                {t("Balance due")}: {sym}
                {fmt(inv?.balance_receivable)}
              </small>
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Method")}</Label>
              <Select
                classNamePrefix="select"
                options={PAYMENT_METHOD_OPTIONS}
                value={
                  PAYMENT_METHOD_OPTIONS.find(
                    (o) => o.value === payForm.method
                  ) || null
                }
                onChange={(opt) =>
                  setPayForm((s) => ({ ...s, method: opt ? opt.value : "" }))
                }
              />
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Reference (UTR / Wire / LC #)")}</Label>
              <Input
                value={payForm.reference}
                maxLength={120}
                onChange={(e) =>
                  setPayForm((s) => ({ ...s, reference: e.target.value }))
                }
              />
            </Col>
            <Col md="12" className="mb-2">
              <Label className="form-label">{t("Notes")}</Label>
              <Input
                type="textarea"
                rows="2"
                value={payForm.notes}
                onChange={(e) =>
                  setPayForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setPayOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button color="primary" onClick={submitPayment}>
            {t("Record")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default ViewInvoice;
