// Purchase Order detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (avatar P, voucher #, vendor, status, pipeline, actions)
//   2. KPI strip — Grand Total | PO Date | Expected Delivery | Line Items
//   3. Summary (Buyer + Vendor + delivery/terms + notes)
//   4. Tabs (Line Items | Coverage | PO Vendors)  |  Snapshot side panel

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  DollarSign,
  Layers,
  Edit,
  ArrowLeft,
  Hash,
  ExternalLink,
} from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrder,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";
import { PURCHASE_ORDER_STATUS_BADGE_COLOR } from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import PoRelatedDocsTabs from "./PoRelatedDocsTabs";
import PoActionsPanel from "./PoActionsPanel";

const PIPELINE_STEPS = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_process", label: "In Process" },
  { value: "completed", label: "Completed" },
];

const TERMINAL_STEPS = [
  { value: "cancelled", label: "Cancelled", color: "danger" },
];

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const daysUntil = (iso) => {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const ViewPurchaseOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.purchaseOrder);
  const p = store?.purchaseOrderItem || {};
  const sym = p?.currency_symbol || "₹";
  const rate = Number(p?.exchange_rate) || 1;
  const toCcy = (v) =>
    v === null || v === undefined || v === "" ? v : Number(v) * rate;

  useEffect(() => {
    if (id) dispatch(getPurchaseOrder(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPurchaseOrderMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  const statusLower = (p?.status || "").toLowerCase();
  const statusLabel = (p?.status || "-").replace(/_/g, " ");

  const etaDays = useMemo(
    () => daysUntil(p?.expected_delivery_date),
    [p?.expected_delivery_date]
  );
  const etaTone =
    etaDays === null
      ? "secondary"
      : etaDays < 0
      ? "danger"
      : etaDays <= 7
      ? "warning"
      : "success";
  const etaSub =
    etaDays === null
      ? null
      : etaDays < 0
      ? `Overdue ${Math.abs(etaDays)}d`
      : etaDays === 0
      ? "Due today"
      : `In ${etaDays}d`;

  const linesCount = (p?.lines || []).length;

  const kpiItems = [
    {
      key: "total",
      label: t("Grand Total"),
      value:
        p?.grand_total !== undefined
          ? `${sym} ${fmt(toCcy(p.grand_total))}`
          : "-",
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "date",
      label: t("PO Date"),
      value: p?.po_date ? formatDate(p.po_date) : "-",
      icon: Calendar,
      tone: "secondary",
    },
    {
      key: "eta",
      label: t("Expected Delivery"),
      value: p?.expected_delivery_date
        ? formatDate(p.expected_delivery_date)
        : t("Not set"),
      sub: etaSub,
      icon: Calendar,
      tone: etaTone,
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
      icon: Edit,
      label: t("Edit"),
      onClick: () => navigate(`${appsRoot}/purchase-orders/edit/${id}`),
    },
    {
      icon: ArrowLeft,
      label: t("Back to POs"),
      onClick: () => navigate(-1),
    },
  ];

  const sourceLinks = (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      {p?._id ? (
        <span>
          <Hash size={12} className="me-25" />
          {p._id.slice(-8).toUpperCase()}
        </span>
      ) : null}
      {p?.pfi_id ? (
        <a
          href={`${appsRoot}/pfi/view/${p.pfi_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-reset text-decoration-none ms-1"
        >
          <ExternalLink size={12} className="me-25" />
          {t("Source PFI")}
          {p?.pfi_voucher_no ? ` · ${p.pfi_voucher_no}` : ""}
        </a>
      ) : null}
      {p?.quotation_id ? (
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
      ) : null}
    </span>
  );

  // PO is multi-vendor at line level; show customer in subtitle, fall back
  // to legacy header vendor for older POs.
  const subtitleParts = [
    p?.customer_name,
    p?.customer_contact_email,
    !p?.customer_name ? p?.vendor_name : null,
  ].filter(Boolean);

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="P"
          title={p?.voucher_no || "-"}
          subtitle={subtitleParts.join(" · ") || null}
          meta={sourceLinks}
          badge={{
            label: statusLabel,
            color:
              PURCHASE_ORDER_STATUS_BADGE_COLOR[statusLower] || "secondary",
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
          left={<PoRelatedDocsTabs />}
          right={<PoActionsPanel />}
        />
      </div>
    </Fragment>
  );
};

export default ViewPurchaseOrder;
