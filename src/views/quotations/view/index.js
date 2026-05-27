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
  Truck,
  ArrowLeft,
  Layers,
  CreditCard,
  MapPin,
  Hash,
  Percent,
  FileText,
  CheckCircle,
} from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getQuotation,
  updateQuotation,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import {
  getExchangeRateOptions,
  getCurrencyDropdown,
} from "@src/views/currencies/store";
import { getCurrencySymbol } from "@src/utility/currency";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
} from "@constant/options";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import PoGeneratePreviewModal from "@src/views/_shared/sales-doc/PoGeneratePreviewModal";
import { formatDate } from "@src/utility/dateFormat";
import { createPfiFromQuotation } from "@src/views/pfi/store";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

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
  const currencyStore = useSelector((s) => s.currency);
  const q = store?.quotationItem || {};

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const quotationPerms = authUserItem?.role?.permissions?.quotations;
  const poPerms = authUserItem?.role?.permissions?.["purchase-orders"];
  const pfiPerms = authUserItem?.role?.permissions?.pfi;
  const canEdit =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_update;
  const canGeneratePo = isAdmin || poPerms?.can_all || poPerms?.can_add;
  const canConvertToPfi = isAdmin || pfiPerms?.can_all || pfiPerms?.can_add;
  const [poModalOpen, setPoModalOpen] = useState(false);

  const mySwal = withReactContent(Swal);
  const handleConvertToPfi = () => {
    mySwal
      .fire({
        title: t("Convert to PFI?"),
        text: t(
          "A new PFI will be created from this quotation with all line items, expenses and rebates copied over."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, convert"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(createPfiFromQuotation(id))
          .unwrap()
          .then((res) => {
            const newId = res?.pfiItem?._id;
            Notification(
              "Success",
              res?.success || t("PFI created"),
              "success"
            );
            if (newId) navigate(`${appsRoot}/pfi/edit/${newId}`);
          })
          .catch((err) =>
            Notification("Error", err || t("Conversion failed"), "warning")
          );
      });
  };

  // Flip status to `approved` via the standard update endpoint. Confirmation
  // prompt mirrors the convert-to-PFI flow.
  const handleApprove = () => {
    mySwal
      .fire({
        title: t("Mark as Approved?"),
        text: t(
          "Once approved, this quotation can be converted to a PFI or used to generate POs."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, approve"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(updateQuotation({ id, data: { status: "approved" } }))
          .unwrap()
          // The store auto-emits a success notification on update — no need
          // to fire a second one here; just refresh the detail so the
          // status badge + downstream buttons reflect the new state.
          .then(() => dispatch(getQuotation(id)))
          .catch((err) =>
            Notification("Error", err || t("Approval failed"), "warning")
          );
      });
  };

  useEffect(() => {
    if (id) dispatch(getQuotation(id));
    // Pull live currency master so symbols + base currency are dynamic.
    dispatch(getExchangeRateOptions());
    dispatch(getCurrencyDropdown());
  }, [id, dispatch]);

  // Build a live { CODE: symbol } map from /admin/currency/exchange-rate/options
  // so any currency added in the master is reflected here without code changes.
  const liveSymbols = useMemo(() => {
    const out = {};
    (currencyStore?.exchangeOptions || []).forEach((c) => {
      if (c?.code && c?.symbol) out[String(c.code).toUpperCase()] = c.symbol;
    });
    return out;
  }, [currencyStore?.exchangeOptions]);

  const baseCurrency = useMemo(() => {
    const def =
      (currencyStore?.currencyDropdown || []).find((c) => c.is_default) ||
      (currencyStore?.exchangeOptions || []).find((c) => c.is_default);
    return {
      code: def?.code || "INR",
      symbol:
        def?.symbol ||
        getCurrencySymbol(def?.code || "INR", liveSymbols) ||
        "₹",
    };
  }, [
    currencyStore?.currencyDropdown,
    currencyStore?.exchangeOptions,
    liveSymbols,
  ]);

  // Resolve the quotation's currency symbol live from the DB master first,
  // then fall back to whatever the doc was snapshotted with.
  const sym =
    getCurrencySymbol(q?.currency_code, liveSymbols) ||
    q?.currency_symbol ||
    q?.currency_code ||
    "";

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanQuotationMessage());
  }, [store?.success, store?.error]);

  const statusLower = (q?.status || "").toLowerCase();
  const isApproved = statusLower === "approved";
  // Approve is available from draft/sent only; users without edit permission
  // can't change status (mirrors the Edit button gate).
  const canApprove =
    canEdit && (statusLower === "draft" || statusLower === "sent");

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
      value: q?.grand_total ? `${sym}${fmt(q.grand_total)}` : "-",
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
      icon: CheckCircle,
      label: t("Mark as Approve"),
      onClick: handleApprove,
      hidden: !canApprove,
      outline: false,
      color: "success",
    },
    {
      icon: FileText,
      label: t("Convert to PFI"),
      onClick: handleConvertToPfi,
      hidden: !isApproved || !canConvertToPfi,
      outline: true,
      color: "info",
    },
    {
      icon: Truck,
      label: t("Generate POs"),
      onClick: () => setPoModalOpen(true),
      hidden: !isApproved || !canGeneratePo,
      outline: false,
      color: "success",
    },
    ...(canEdit
      ? [
          {
            icon: Edit,
            label: t("Edit"),
            onClick: () => navigate(`${appsRoot}/quotations/edit/${id}`),
          },
        ]
      : []),
    {
      icon: ArrowLeft,
      label: t("Back to Quotations"),
      onClick: () => navigate(`${appsRoot}/quotations`),
    },
  ];

  // ── Side panel field lists ──
  const rate = Number(q?.exchange_rate || 0);
  const isBaseCurrency =
    (q?.currency_code || "").toUpperCase() === baseCurrency.code.toUpperCase();
  // Show quote currency → base (e.g. "$1 = ₹83.33") so the customer sees
  // how much of the home currency one unit of their currency buys.
  const inrConversionLine =
    rate > 0 && !isBaseCurrency
      ? `${sym}1 = ${baseCurrency.symbol}${(1 / rate).toLocaleString(
          undefined,
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`
      : isBaseCurrency
      ? t("Base currency — no conversion")
      : null;

  const moneyFields = [
    {
      icon: Percent,
      label: t("Exchange Rate"),
      value: inrConversionLine,
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
                {termsFields.some((f) => f.value) && (
                  <DetailFieldList title={t("Terms")} items={termsFields} />
                )}
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
        onCreated={() => dispatch(getQuotation(id))}
      />
    </Fragment>
  );
};

export default ViewQuotation;
