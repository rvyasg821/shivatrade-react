// PO Vendor (POV) detail page — composed with the shared detail-page kit.
// Layout mirrors the PO / PFI / Quotation detail pages:
//   1. Header (avatar V, voucher #, vendor, status badge, actions, pipeline)
//   2. KPI strip — POV Total | Dispatched % | Expected Arrival | Line Items
//   3. Tabs full width — Overview (line items) | Tracking
//
// Action buttons (Dispatch / Receive / Cancel) are contextual on status and
// live in the header `actions` array, replacing the old left-side info card.

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  DollarSign,
  Layers,
  Send,
  X as XIcon,
  RotateCcw,
  ArrowLeft,
  ExternalLink,
  Activity,
  Briefcase,
  Hash,
  Mail,
  Phone,
  Download,
  Inbox,
  Repeat,
  Edit2,
} from "react-feather";
import { Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getPoVendor,
  revertPoVendorToDraft,
  cleanPoVendorMessage,
  cancelPoVendor,
  createBalancePoVendor,
} from "@src/views/po-vendors/store";
import Notification from "@components/toast/notification";
import { openPdfViewer } from "@src/utility/pdf";
import { downloadExcel } from "@src/utility/excel";
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
  // NATIVE model (plan §6.3): POV money is stored in the POV's own currency, so
  // it displays AS-IS — no conversion. `inrRate` = ₹ per 1 unit (INR-per-foreign,
  // the frozen exchange_rate) is shown only as an informational reference.
  const rate = 1;
  const inrRate = Number(p?.exchange_rate) || 1;
  const fmtCcy = (vNative) => fmtMoney(num(vNative) * rate);

  // Right-side Event Timeline height tracks ONLY the Line Items ("overview")
  // tab so it doesn't balloon on the taller GRN / Debit Note / Expense tabs.
  // Excess feed scrolls inside (like the Lead detail page's Activity panel).
  const leftColRef = useRef(null);
  const activeLeftTabRef = useRef("overview");
  const [leftHeight, setLeftHeight] = useState(null);
  const onLeftTabChange = useCallback((key) => {
    activeLeftTabRef.current = key;
  }, []);
  useEffect(() => {
    const el = leftColRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      if (activeLeftTabRef.current === "overview") {
        setLeftHeight(el.offsetHeight);
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

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
        store?.actionFlag === "POV_REVERTED" ||
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
  // Cancel is only available before dispatch — once goods are dispatched the
  // POV can no longer be cancelled from the detail page.
  const canCancel = canUpdate && statusLower === "draft";
  // A cancelled POV (no dispatch/receipt activity) can be put back to draft so
  // its quantities are re-reserved against the PO.
  const canRevert = canUpdate && statusLower === "cancelled";
  // Re-order what this POV never delivered. `has_balance` is computed on the
  // detail response — it nets off any balance POV already raised from this one,
  // and caps a PO-backed line at the parent PO line's pending.
  const canCreateBalance = canUpdate && !!p?.has_balance;

  const handleCreateBalance = () => {
    mySwal
      .fire({
        title: t("Raise a balance Vendor PO?"),
        text: t(
          "A new draft Vendor PO will be created on the same vendor for the quantity this one never delivered. Charges are not carried over."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, create it"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(createBalancePoVendor(id))
          .unwrap()
          .then((res) => {
            if (res?.balancePovId) {
              navigate(`${appsRoot}/po-vendors/view/${res.balancePovId}`);
            }
          })
          // The rejected case already surfaces via the store's error toast.
          .catch(() => {});
      });
  };

  const handleRevert = () => {
    mySwal
      .fire({
        title: t("Revert this POV to draft?"),
        text: t(
          "Its ordered quantities will be re-reserved against the PO. Only possible if they haven't been re-issued on another POV."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, revert to draft"),
        cancelButtonText: t("Keep cancelled"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) dispatch(revertPoVendorToDraft(id));
      });
  };

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

  // Anything left to receipt? A POV line's `received_qty` already counts every
  // non-cancelled GRN (drafts included), so a full draft receipt leaves nothing
  // for a second GRN — the backend rejects it, so don't offer the action.
  const hasPendingReceipt = lines.some(
    (l) => num(l?.dispatched_qty) - num(l?.received_qty) > 1e-6
  );

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

  // Vendor expenses (charges) snapshotted on the POV header — each row carries
  // a pre-computed `amount`. The POV total = goods + these charges.
  // Charges shown GROSS = taxable + each charge's own GST (gst_pct), so the
  // "Charges" figure matches the POV total / PDF (which tax charges per-charge).
  const expensesTotal = useMemo(
    () =>
      (p?.expenses_snapshot || []).reduce(
        (s, e) => s + num(e?.amount) * (1 + num(e?.gst_pct) / 100),
        0
      ),
    [p?.expenses_snapshot]
  );
  const goodsTotal = useMemo(
    () => lines.reduce((s, l) => s + num(l?.line_total), 0),
    [lines]
  );
  // GST on the goods lines (Σ line_total × tax_pct%) — same basis as the POV
  // PDF's Input IGST / CGST+SGST. Charges carry no GST (per-charge GST was
  // dropped), so line GST is the whole tax.
  // GST is an Indian (INR) tax — it does not apply to a POV priced in a
  // foreign currency, so it stays 0 there.
  const gstApplies = (p?.currency_code || "INR") === "INR";
  const computedGst = useMemo(
    () =>
      gstApplies
        ? lines.reduce(
            (s, l) => s + (num(l?.line_total) * num(l?.tax_pct)) / 100,
            0
          )
        : 0,
    [lines, gstApplies]
  );
  // True amount payable to the vendor = goods + charges + GST. Use the
  // backend's `order_value` (GST-inclusive — the exact figure the Payments
  // tab shows) so this card can never drift from the payable; fall back to
  // goods + charges + computed GST when order_value isn't present yet.
  const preTaxTotal = goodsTotal + expensesTotal;
  const orderValue = num(p?.order_value);
  const grandTotal = orderValue > 0 ? orderValue : preTaxTotal + computedGst;
  const gstTotal = Math.max(0, grandTotal - preTaxTotal);

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
      value: lines.length > 0 ? `${sym} ${fmtCcy(grandTotal)}` : "-",
      sub:
        lines.length > 0 && (expensesTotal > 0 || gstTotal > 0)
          ? [
              `${t("Goods")} ${sym}${fmtCcy(goodsTotal)}`,
              gstTotal > 0 ? `${t("GST")} ${sym}${fmtCcy(gstTotal)}` : null,
              expensesTotal > 0
                ? `${t("Charges")} ${sym}${fmtCcy(expensesTotal)}`
                : null,
            ]
              .filter(Boolean)
              .join(" + ")
          : null,
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

  // Open the Vendor PO PDF in the in-app viewer (new tab, frontend origin) —
  // fetched via the authed API, shown there, with a correctly-named Download.
  const handleDownloadPdf = () =>
    openPdfViewer({ kind: "po_vendor", id, name: p?.voucher_no });
  const handleDownloadExcel = () =>
    downloadExcel({ kind: "po_vendor", id, name: p?.voucher_no });


  // ── Header actions (contextual to status) ──
  const headerActions = [];
  // Edit — the one place a POV is edited after creation (header + line rate /
  // GST). Draft opens the full form; once dispatched only the vendor's rate is
  // revisable (client #3), and that stops as soon as a GRN exists because the
  // cost is then baked into stock valuation — a Debit Note covers it from
  // there. Mirrors the backend's draft/dispatched allowlists.
  const hasReceipt = lines.some((l) => num(l?.received_qty) > 1e-6);
  if (
    canUpdate &&
    (statusLower === "draft" ||
      (statusLower === "dispatched" && !hasReceipt))
  ) {
    headerActions.push({
      icon: Edit2,
      label: statusLower === "draft" ? t("Edit") : t("Revise Prices"),
      onClick: () => navigate(`${appsRoot}/po-vendors/edit/${id}`),
    });
  }
  if (canDispatch) {
    headerActions.push({
      icon: Send,
      label: t("Dispatch"),
      onClick: () => navigate(`${appsRoot}/po-vendors/dispatch/${id}`),
    });
  }
  // Create GRN — shown in the header only once the POV is dispatched and some
  // dispatched qty is still un-receipted. Opens the draft GRN form for this POV
  // (same target as the GRNs tab action).
  if (canUpdate && statusLower === "dispatched" && hasPendingReceipt) {
    headerActions.push({
      icon: Inbox,
      label: t("Create GRN"),
      color: "primary",
      onClick: () => navigate(`${appsRoot}/grn/create/${id}`),
    });
  }
  if (canCreateBalance) {
    headerActions.push({
      icon: Repeat,
      label: t("Create Balance POV"),
      onClick: handleCreateBalance,
    });
  }
  if (canCancel) {
    headerActions.push({
      icon: XIcon,
      label: t("Cancel POV"),
      onClick: handleCancel,
    });
  }
  if (canRevert) {
    headerActions.push({
      icon: RotateCcw,
      label: t("Revert to Draft"),
      color: "primary",
      onClick: handleRevert,
    });
  }
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
    p?.vendor_name || p?.vendor_code || p?.vendor_contact_email || vendorPhone ? (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {p?.vendor_name ? (
          <span className="d-inline-flex align-items-center text-capitalize">
            <Briefcase size={13} className="me-25" />
            {p.vendor_name}
          </span>
        ) : null}
        {p?.vendor_code ? (
          <span className="d-inline-flex align-items-center">
            <Hash size={13} className="me-25" />
            {p.vendor_code}
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
      {p?.invoice_number ? (
        <span className="text-muted">
          {t("Invoice No")}: {p.invoice_number}
        </span>
      ) : null}
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
      {Array.isArray(p?.linked_sales_orders) &&
      p.linked_sales_orders.length ? (
        <span className="d-inline-flex align-items-center flex-wrap gap-1">
          <ExternalLink size={12} className="me-25" />
          {t("Linked SO")}:{" "}
          {p.linked_sales_orders.map((so, i) => (
            <a
              key={so.id}
              href={`${appsRoot}/purchase-orders/view/${so.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-reset text-decoration-none"
            >
              {so.voucher_no || so.id}
              {i < p.linked_sales_orders.length - 1 ? "," : ""}
            </a>
          ))}
        </span>
      ) : null}
      {p?.currency_code ? (
        <span className="text-muted">
          · {sym} {p.currency_code}
          {p.currency_code !== "INR" && inrRate > 0
            ? ` · ₹${inrRate.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })} ${t("per 1")} ${p.currency_code}`
            : ""}
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
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <DetailPipeline
                  steps={PIPELINE_STEPS}
                  current={statusLower}
                  terminalSteps={TERMINAL_STEPS}
                />
              </div>
              <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end dp-header-actions dp-header-actions-row">
                <Button
                  size="sm"
                  color="secondary"
                  outline
                  className="d-flex align-items-center"
                  onClick={() => handleDownloadPdf()}
                >
                  <Download size={14} className="me-50" />
                  {t("PDF")}
                </Button>
                <Button
                  size="sm"
                  color="secondary"
                  outline
                  className="d-flex align-items-center"
                  onClick={() => handleDownloadExcel()}
                >
                  <Download size={14} className="me-50" />
                  {t("Excel")}
                </Button>
              </div>
            </div>
          }
        />

        <DetailKpiStrip items={kpiItems} />

        {canViewTracking ? (
          <DetailTwoPanel
            ratio="8-4"
            left={
              <div ref={leftColRef}>
                <PoVendorTabView onActiveTabChange={onLeftTabChange} />
              </div>
            }
            right={<PoVendorTimelinePanel height={leftHeight} />}
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
