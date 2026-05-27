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
} from "@src/views/invoices/store";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  INVOICE_PIPELINE_STEPS as PIPELINE_STEPS,
  INVOICE_TERMINAL_STEPS as TERMINAL_STEPS,
  INVOICE_STATUS_BADGE_COLOR as STATUS_COLORS,
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
            navigate(`${appsRoot}/shipping/add?invoice=${id}`),
          color: "primary",
        });
      }
      actions.push({
        icon: Download,
        label: t("Commercial Invoice"),
        onClick: () =>
          window.open(
            `/api/v1/admin/invoice/${id}/pdf?doc=commercial`,
            "_blank"
          ),
        color: "info",
        outline: true,
      });
      actions.push({
        icon: Download,
        label: t("Export Invoice"),
        onClick: () =>
          window.open(
            `/api/v1/admin/invoice/${id}/pdf?doc=export`,
            "_blank"
          ),
        color: "info",
        outline: true,
      });
      actions.push({
        icon: Download,
        label: t("Packing List"),
        onClick: () =>
          window.open(
            `/api/v1/admin/invoice/${id}/pdf?doc=packing-list`,
            "_blank"
          ),
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
            <Fragment>
              {/* Line Items */}
              <Card className="mb-2">
                <CardHeader className="border-bottom py-1">
                  <CardTitle tag="h5" className="mb-0">
                    {t("Line Items")}
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-2">
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
                </CardBody>
              </Card>

              {/* Costing summary */}
              <Card className="mb-2">
                <CardHeader className="border-bottom py-1">
                  <CardTitle tag="h5" className="mb-0">
                    {t("Costing")}
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-2">
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
                </CardBody>
              </Card>

              {/* IGST refund footer (igst_paid route only) */}
              {Array.isArray(inv?.igst_refund_buckets) &&
                inv.igst_refund_buckets.length > 0 && (
                  <Card className="mb-2">
                    <CardHeader className="border-bottom py-1">
                      <CardTitle tag="h5" className="mb-0">
                        {t("IGST Refund (per HSN rate)")}
                      </CardTitle>
                    </CardHeader>
                    <CardBody className="pt-2">
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
                    </CardBody>
                  </Card>
                )}
            </Fragment>
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
    </Fragment>
  );
};

export default ViewInvoice;
