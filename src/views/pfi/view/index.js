// PFI detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (avatar P, voucher_no, customer, status, pipeline, actions)
//   2. KPI strip — Grand Total | PFI Date | Valid Until | Line Items
//   3. Summary panel (Parties + Shipping + Bank + Terms)
//   4. Tabs (Line Items | Purchase Orders)  |  Share / Public-link side panel

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  DollarSign,
  Layers,
  Edit,
  Eye,
  Truck,
  ArrowLeft,
  Hash,
  ExternalLink,
} from "react-feather";
import { useTranslation } from "react-i18next";

import { getPfi, cleanPfiMessage } from "@src/views/pfi/store";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";
import { QUOTATION_STATUS_BADGE_COLOR } from "@constant/options";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import PoGeneratePreviewModal from "@src/views/_shared/sales-doc/PoGeneratePreviewModal";
import { formatDate } from "@src/utility/dateFormat";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailPanel,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import PfiPartiesPanel from "./PfiPartiesPanel";
import PfiRelatedDocsTabs from "./PfiRelatedDocsTabs";
import PfiPublicLinkPanel from "./PfiPublicLinkPanel";

const PIPELINE_STEPS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
];

const TERMINAL_STEPS = [
  { value: "rejected", label: "Rejected", color: "danger" },
  { value: "closed", label: "Closed", color: "dark" },
];

const daysUntil = (iso) => {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const ViewPfi = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.pfi);
  const p = store?.pfiItem || {};
  const sym = p?.currency_symbol || p?.currency_code || "";
  const [poModalOpen, setPoModalOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(getPfi(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPfiMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  const statusLower = (p?.status || "").toLowerCase();
  const isApproved = statusLower === "approved";

  const validityDays = useMemo(() => daysUntil(p?.valid_until), [p?.valid_until]);
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

  const linesCount = (p?.lines || []).length;

  const kpiItems = [
    {
      key: "total",
      label: t("Grand Total"),
      value: p?.grand_total ? `${sym}${fmt(p.grand_total)}` : "-",
      sub: p?.currency_code || null,
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "date",
      label: t("PFI Date"),
      value: p?.pfi_date ? formatDate(p.pfi_date) : "-",
      icon: Calendar,
      tone: "secondary",
    },
    {
      key: "valid",
      label: t("Valid Until"),
      value: p?.valid_until ? formatDate(p.valid_until) : t("Not set"),
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

  const headerActions = [
    {
      icon: Eye,
      label: t("Preview"),
      onClick: () => window.open(`${appsRoot}/pfi/preview/${id}`, "_blank"),
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
      onClick: () => navigate(`${appsRoot}/pfi/edit/${id}`),
    },
    {
      icon: ArrowLeft,
      label: t("Back to PFIs"),
      onClick: () => navigate(`${appsRoot}/pfi`),
    },
  ];

  // Header subtitle / meta
  const subtitleParts = [p?.customer_name, p?.customer_contact_email].filter(
    Boolean
  );
  const sourceLink =
    p?.quotation_id ? (
      <a
        href={`${appsRoot}/quotations/view/${p.quotation_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-reset text-decoration-none ms-1"
      >
        <ExternalLink size={12} className="me-25" />
        {t("Source Quotation")}
        {p?.quotation_voucher_no ? ` · ${p.quotation_voucher_no}` : ""}
      </a>
    ) : null;

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="P"
          title={p?.voucher_no || "-"}
          subtitle={subtitleParts.join(" · ") || null}
          meta={
            <span className="d-inline-flex align-items-center flex-wrap gap-1">
              {p?._id ? (
                <span>
                  <Hash size={12} className="me-25" />
                  {p._id.slice(-8).toUpperCase()}
                </span>
              ) : null}
              {sourceLink}
            </span>
          }
          badge={{
            label: p?.status || "-",
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
          left={
            <Fragment>
              <DetailPanel title={t("PFI Summary")}>
                <PfiPartiesPanel />
              </DetailPanel>
              <PfiRelatedDocsTabs />
            </Fragment>
          }
          right={<PfiPublicLinkPanel />}
        />
      </div>

      <PoGeneratePreviewModal
        isOpen={poModalOpen}
        toggle={() => setPoModalOpen((s) => !s)}
        sourceType="pfi"
        sourceId={id}
        sourceVoucherNo={p?.voucher_no}
      />
    </Fragment>
  );
};

export default ViewPfi;
