// PO Vendor (POV) detail page — composed with the shared detail-page kit.
// Layout mirrors the PO / PFI / Quotation detail pages:
//   1. Header (avatar V, voucher #, vendor, status badge, actions, pipeline)
//   2. KPI strip — POV Total | Dispatched % | Expected Arrival | Line Items
//   3. Tabs full width — Overview (line items) | Tracking
//
// Action buttons (Dispatch / Receive / Cancel) are contextual on status and
// live in the header `actions` array, replacing the old left-side info card.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  DollarSign,
  Layers,
  Send,
  X as XIcon,
  ArrowLeft,
  ExternalLink,
  Activity,
  Briefcase,
  Mail,
  Phone,
  Download,
  Inbox,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getPoVendor,
  cleanPoVendorMessage,
  cancelPoVendor,
} from "@src/views/po-vendors/store";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import PoVendorTabView from "./tabView";
import PoVendorTimelinePanel from "./PoVendorTimelinePanel";

import "@styles/react/apps/app-users.scss";

const PIPELINE_STEPS = [
  { value: "draft", label: "Draft" },
  { value: "dispatched", label: "Dispatched" },
  { value: "closed", label: "Closed" },
];

const TERMINAL_STEPS = [
  { value: "cancelled", label: "Cancelled", color: "danger" },
];

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const fmtMoney = (v) =>
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

const ViewPoVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const store = useSelector((s) => s.poVendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = store?.poVendorItem || {};
  const sym = p?.currency_symbol || "₹";

  useEffect(() => {
    if (id) dispatch(getPoVendor(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanPoVendorMessage());

    // Refresh after any state-changing action.
    if (
      id &&
      (store?.actionFlag === "POV_DISPATCHED" ||
        store?.actionFlag === "POV_CLOSED" ||
        store?.actionFlag === "POV_CANCELLED" ||
        store?.actionFlag === "POV_UPDT")
    ) {
      dispatch(getPoVendor(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error, store?.actionFlag]);

  const statusLower = (p?.status || "").toLowerCase();
  const statusLabel = (p?.status || "-").replace(/_/g, " ");

  // Permission gating — POV actions require po-vendors.can_update.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canUpdate = isAdmin || perms?.can_all || perms?.can_update;
  // The Event Timeline is the Tracking feature — gate it on tracking read access.
  const trackingPerms = authUserItem?.role?.permissions?.tracking;
  const canViewTracking =
    isAdmin ||
    trackingPerms?.can_all ||
    trackingPerms?.can_read ||
    trackingPerms?.can_view;
  const canDispatch = canUpdate && statusLower === "draft";
  const canReceive = canUpdate && statusLower === "dispatched";
  const canCancel =
    canUpdate && (statusLower === "draft" || statusLower === "dispatched");

  const handleCancel = () => {
    mySwal
      .fire({
        title: t("Cancel this POV?"),
        text: t(
          "Its ordered quantities will be released back to PO pending and can be re-issued on a new POV."
        ),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, cancel POV"),
        cancelButtonText: t("Keep open"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(cancelPoVendor({ id, reason: result.value }));
        }
      });
  };


  // ── KPI calculations ──
  const lines = p?.lines || [];
  const linesCount = lines.length;

  const orderedSum = useMemo(
    () => lines.reduce((s, l) => s + num(l?.ordered_qty), 0),
    [lines]
  );
  const dispatchedSum = useMemo(
    () => lines.reduce((s, l) => s + num(l?.dispatched_qty), 0),
    [lines]
  );
  const dispatchedPct =
    orderedSum > 0 ? Math.round((dispatchedSum / orderedSum) * 100) : 0;
  const dispatchedSub =
    orderedSum > 0
      ? `${dispatchedSum.toLocaleString()} / ${orderedSum.toLocaleString()}`
      : null;

  const grandTotal = useMemo(
    () => lines.reduce((s, l) => s + num(l?.line_total), 0),
    [lines]
  );

  const etaDays = useMemo(
    () => daysUntil(p?.expected_arrival_date),
    [p?.expected_arrival_date]
  );
  const etaTone =
    etaDays === null
      ? "secondary"
      : etaDays < 0
      ? "danger"
      : etaDays <= 3
      ? "warning"
      : "success";
  const etaSub =
    etaDays === null
      ? p?.actual_arrival_date
        ? `Arrived ${formatDate(p.actual_arrival_date)}`
        : null
      : etaDays < 0
      ? `Overdue ${Math.abs(etaDays)}d`
      : etaDays === 0
      ? "Due today"
      : `In ${etaDays}d`;

  const kpiItems = [
    {
      key: "total",
      label: t("POV Total"),
      value: lines.length > 0 ? `${sym} ${fmtMoney(grandTotal)}` : "-",
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "dispatched",
      label: t("Dispatched"),
      value: `${dispatchedPct}%`,
      sub: dispatchedSub,
      icon: Activity,
      tone:
        dispatchedPct === 0
          ? "secondary"
          : dispatchedPct < 100
          ? "warning"
          : "success",
    },
    {
      key: "eta",
      label: t("Expected Arrival"),
      value: p?.expected_arrival_date
        ? formatDate(p.expected_arrival_date)
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

  // Open the dispatch-advice PDF inline in a new tab (proper name) via a
  // short-lived ticket on the no-auth public route — a blob tab is UUID-named.
  const handleDownloadPdf = async () => {
    if (!id) return;
    const win = window.open("", "_blank"); // sync open → not popup-blocked
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.poVendors.pdf}/${id}/pdf-ticket`
      );
      const ticket = resp?.data?.data?.ticket;
      if (!ticket) throw new Error("no ticket");
      const url = `${instance.defaults.baseURL}${
        API_ENDPOINTS.poVendors.ticketPdf
      }?t=${encodeURIComponent(ticket)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      if (win) win.close();
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    }
  };


  // ── Header actions (contextual to status) ──
  const headerActions = [];
  if (canDispatch) {
    headerActions.push({
      icon: Send,
      label: t("Dispatch"),
      onClick: () => navigate(`${appsRoot}/po-vendors/dispatch/${id}`),
    });
  }
  if (canReceive) {
    // Create GRN — only after goods are dispatched. Opens a draft form (not
    // persisted until Save), like creating an RFQ from a Lead.
    headerActions.push({
      icon: Inbox,
      label: t("Create GRN"),
      onClick: () => navigate(`${appsRoot}/grn/create/${id}`),
    });
    // Edit Dispatch lives in the Line Items tab's top-right action bar.
  }
  if (canCancel) {
    headerActions.push({
      icon: XIcon,
      label: t("Cancel POV"),
      onClick: handleCancel,
    });
  }
  headerActions.push({
    icon: Download,
    label: t("Download"),
    color: "secondary",
    outline: true,
    onClick: () => handleDownloadPdf(),
  });
  headerActions.push({
    icon: ArrowLeft,
    label: t("Back"),
    onClick: () => navigate(-1),
  });

  // ── Subtitle (icon contact line) / meta links ──
  const cc = p?.vendor_contact_country_code;
  const vendorPhone =
    cc?.formatted ||
    (cc?.dial_code || cc?.dialCode
      ? `${cc.dial_code || cc.dialCode} ${p?.vendor_contact_phone || ""}`.trim()
      : p?.vendor_contact_phone) ||
    null;

  const contactLine =
    p?.vendor_name || p?.vendor_contact_email || vendorPhone ? (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {p?.vendor_name ? (
          <span className="d-inline-flex align-items-center text-capitalize">
            <Briefcase size={13} className="me-25" />
            {p.vendor_name}
          </span>
        ) : null}
        {p?.vendor_contact_email ? (
          <span className="d-inline-flex align-items-center">
            <Mail size={13} className="me-25" />
            {p.vendor_contact_email}
          </span>
        ) : null}
        {vendorPhone ? (
          <span className="d-inline-flex align-items-center">
            <Phone size={13} className="me-25" />
            {vendorPhone}
          </span>
        ) : null}
      </span>
    ) : null;

  const meta = (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      {p?.purchase_order_id ? (
        <a
          href={`${appsRoot}/purchase-orders/view/${p.purchase_order_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-reset text-decoration-none d-inline-flex align-items-center"
        >
          <ExternalLink size={12} className="me-25" />
          {t("Source SO")}
          {p?.purchase_order_voucher_no
            ? ` · ${p.purchase_order_voucher_no}`
            : ""}
        </a>
      ) : null}
      {p?.currency_code ? (
        <span className="text-muted">
          · {sym} {p.currency_code}
        </span>
      ) : null}
    </span>
  );

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="V"
          title={p?.voucher_no || "-"}
          subtitle={contactLine}
          meta={meta}
          badge={{
            label: statusLabel,
            color: PO_VENDOR_STATUS_BADGE_COLOR[statusLower] || "secondary",
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

        {canViewTracking ? (
          <DetailTwoPanel
            ratio="8-4"
            left={<PoVendorTabView />}
            right={<PoVendorTimelinePanel />}
          />
        ) : (
          // No tracking permission → hide the Event Timeline and let the tabs
          // take the full width (no empty column / white space).
          <PoVendorTabView />
        )}
      </div>
    </Fragment>
  );
};

export default ViewPoVendor;
