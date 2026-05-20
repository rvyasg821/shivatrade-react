// Quotation detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (avatar Q, voucher_no, customer, status, pipeline, action buttons)
//   2. KPI strip — Grand Total | Date | Valid Until | Line Items
//   3. Summary card (About + Costing snapshot + notes)
//   4. Line Items table + costing card  | Public Link / Share panel

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  DollarSign,
  Edit,
  Eye,
  Truck,
  ArrowLeft,
  Tag,
  Layers,
  CreditCard,
  MapPin,
  Hash,
  Percent,
} from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getQuotation,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";
import {
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
} from "@constant/options";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import PoGeneratePreviewModal from "@src/views/_shared/sales-doc/PoGeneratePreviewModal";
import { formatDate } from "@src/utility/dateFormat";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailFieldList,
  DetailPanel,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import RelatedDocsTabs from "./RelatedDocsTabs";
import PublicLinkPanel from "./PublicLinkPanel";

const PIPELINE_STEPS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
];

const TERMINAL_STEPS = [{ value: "rejected", label: "Rejected", color: "danger" }];

const labelize = (val, opts) =>
  opts.find((o) => o.value === val)?.label || val || "-";

const daysUntil = (iso) => {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const ViewQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.quotation);
  const q = store?.quotationItem || {};
  const sym = q?.currency_symbol || q?.currency_code || "";
  const [poModalOpen, setPoModalOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(getQuotation(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanQuotationMessage());
  }, [store?.success, store?.error]);

  const statusLower = (q?.status || "").toLowerCase();
  const isApproved = statusLower === "approved";

  const statusLabel = labelize(statusLower, QUOTATION_STATUS_OPTIONS);

  const validityDays = useMemo(() => daysUntil(q?.valid_until), [q?.valid_until]);
  const validityTone =
    validityDays === null
      ? "secondary"
      : validityDays < 0
      ? "danger"
      : validityDays <= 7
      ? "warning"
      : "success";
  const validitySub =
    validityDays === null
      ? null
      : validityDays < 0
      ? `Expired ${Math.abs(validityDays)}d ago`
      : validityDays === 0
      ? "Expires today"
      : `In ${validityDays}d`;

  const linesCount = (q?.lines || []).length;

  const kpiItems = [
    {
      key: "total",
      label: t("Grand Total"),
      value: q?.grand_total
        ? `${sym}${fmt(q.grand_total)}`
        : "-",
      sub: q?.currency_code || null,
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "date",
      label: t("Quotation Date"),
      value: q?.quotation_date ? formatDate(q.quotation_date) : "-",
      icon: Calendar,
      tone: "secondary",
    },
    {
      key: "valid",
      label: t("Valid Until"),
      value: q?.valid_until ? formatDate(q.valid_until) : t("Not set"),
      sub: validitySub,
      icon: Calendar,
      tone: validityTone,
    },
    {
      key: "lines",
      label: t("Line Items"),
      value: linesCount,
      icon: Layers,
      tone: "secondary",
    },
  ];

  // ── Header actions ──
  const headerActions = [
    {
      icon: Eye,
      label: t("Preview"),
      onClick: () =>
        window.open(`${appsRoot}/quotations/preview/${id}`, "_blank"),
      outline: true,
    },
    {
      icon: Truck,
      label: t("Generate POs"),
      onClick: () => setPoModalOpen(true),
      hidden: !isApproved,
      outline: false,
      color: "success",
    },
    {
      icon: Edit,
      label: t("Edit"),
      onClick: () => navigate(`${appsRoot}/quotations/edit/${id}`),
    },
    {
      icon: ArrowLeft,
      label: t("Back to Quotations"),
      onClick: () => navigate(`${appsRoot}/quotations`),
    },
  ];

  // ── Side panel field lists ──
  const moneyFields = [
    { icon: Tag, label: t("Currency"), value: q?.currency_code },
    {
      icon: Percent,
      label: t("Exchange Rate"),
      value: q?.exchange_rate ? Number(q.exchange_rate).toString() : null,
    },
  ];

  const termsFields = [
    { icon: CreditCard, label: t("Payment Terms"), value: q?.payment_terms },
    { icon: Truck, label: t("Delivery Terms"), value: q?.delivery_terms },
    {
      icon: MapPin,
      label: t("Delivery Location"),
      value: q?.delivery_location,
    },
  ];

  const costingFields = [
    {
      icon: DollarSign,
      label: t("Subtotal"),
      value: q?.subtotal ? fmt(q.subtotal) : null,
    },
    {
      icon: DollarSign,
      label: t("Expenses"),
      value: q?.expenses_total ? `${sym}${fmt(q.expenses_total)}` : null,
    },
    {
      icon: DollarSign,
      label: t("Rebates"),
      value: q?.rebates_total ? `${sym}${fmt(q.rebates_total)}` : null,
    },
    {
      icon: Percent,
      label: t("Margin"),
      value:
        q?.margin_amount
          ? `${fmt(q.margin_amount)}${
              q?.margin_pct ? ` (${q.margin_pct}%)` : ""
            }`
          : null,
    },
    {
      icon: DollarSign,
      label: t("Tax"),
      value: q?.tax_total ? fmt(q.tax_total) : null,
    },
    {
      icon: DollarSign,
      label: t("Grand Total"),
      value: q?.grand_total ? `${sym}${fmt(q.grand_total)}` : null,
    },
  ];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="Q"
          title={q?.voucher_no || "-"}
          subtitle={
            [q?.customer_name, q?.customer_email].filter(Boolean).join(" · ") ||
            null
          }
          meta={
            q?._id ? (
              <span>
                <Hash size={12} className="me-25" />
                {q._id.slice(-8).toUpperCase()}
              </span>
            ) : null
          }
          badge={{
            label: statusLabel,
            color:
              QUOTATION_STATUS_BADGE_COLOR[statusLower] || "secondary",
          }}
          actions={headerActions}
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
          left={<RelatedDocsTabs />}
          right={
            <Fragment>
              <PublicLinkPanel />
              <DetailPanel title={t("Details")}>
                <DetailFieldList items={moneyFields} />
                <DetailFieldList title={t("Terms")} items={termsFields} />
                <DetailFieldList title={t("Costing")} items={costingFields} />
                {(q?.notes_to_client || q?.internal_notes) && (
                  <div className="mt-1 pt-1 border-top">
                    <div className="text-muted small mb-50">
                      {q?.notes_to_client
                        ? t("Notes to Client")
                        : t("Internal Notes")}
                    </div>
                    <div
                      className="text-break small"
                      style={{
                        whiteSpace: "pre-line",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {q?.notes_to_client || q?.internal_notes}
                    </div>
                  </div>
                )}
              </DetailPanel>
            </Fragment>
          }
        />
      </div>

      <PoGeneratePreviewModal
        isOpen={poModalOpen}
        toggle={() => setPoModalOpen((s) => !s)}
        sourceType="quotation"
        sourceId={id}
        sourceVoucherNo={q?.voucher_no}
      />
    </Fragment>
  );
};

export default ViewQuotation;
