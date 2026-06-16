// Purchase Order detail page - composes the shared detail-page kit.
// Layout:
//   1. Header (avatar P, voucher #, vendor, status, pipeline, actions)
//   2. KPI strip - Grand Total | PO Date | Expected Delivery | Line Items
//   3. Summary (Buyer + Vendor + delivery/terms + notes)
//   4. Tabs (Line Items | Coverage | PO Vendors)  |  Snapshot side panel

import { Fragment, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "reactstrap";
import {
  Calendar,
  DollarSign,
  Layers,
  Edit,
  ArrowLeft,
  Hash,
  ExternalLink,
  CheckCircle,
  Play,
  CheckSquare,
  XCircle,
  RotateCcw,
  Eye,
  Download,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getPurchaseOrder,
  updatePurchaseOrder,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PFI_RETIRED } from "@src/configs/appMode";
import { PURCHASE_ORDER_STATUS_BADGE_COLOR } from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailTwoPanel,
  DetailPanel,
} from "@src/views/_shared/detail-page";

import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";

import PoRelatedDocsTabs from "./PoRelatedDocsTabs";
import PoCustomerOrderPanel from "./PoCustomerOrderPanel";

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
  const mySwal = withReactContent(Swal);

  const store = useSelector((s) => s.purchaseOrder);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = store?.purchaseOrderItem || {};
  const sym = p?.currency_symbol || "₹";

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

  // Recompute the grand total from the lines with the SAME helper the
  // costing breakdown card uses, so the header KPI matches it exactly
  // (the stored grand_total carries a 2-decimal rounding drift).
  const headerTotals = useMemo(
    () => computeDocTotals(p?.lines || [], p?.exchange_rate, { excludeGst: true }),
    [p?.lines, p?.exchange_rate]
  );

  const kpiItems = [
    {
      key: "total",
      label: t("Grand Total"),
      value:
        p?.grand_total !== undefined
          ? `${sym} ${fmt(headerTotals.grand_currency)}`
          : "-",
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "date",
      label: t("Order Date"),
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

  // Permission gating — PO status actions require purchase-orders.can_update.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["purchase-orders"];
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;

  // One-click status transitions. The allowed next-statuses mirror the
  // server-side transition matrix; we only render buttons that are legal.
  const changeStatus = (newStatus, confirm) => {
    mySwal
      .fire({
        title: confirm.title,
        text: confirm.text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: confirm.confirmButtonText,
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: `btn ${confirm.confirmColor || "btn-primary"}`,
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(updatePurchaseOrder({ id, data: { status: newStatus } }))
          .unwrap()
          .then(() => dispatch(getPurchaseOrder(id)))
          .catch((err) =>
            Notification(
              "Error",
              typeof err === "string"
                ? err
                : err?.message || t("Could not update status"),
              "warning"
            )
          );
      });
  };

  const confirmAction = (newStatus) =>
    changeStatus(newStatus, {
      title: t("Confirm this Sales Order?"),
      text: t("It will move to the Confirmed stage."),
      confirmButtonText: t("Yes, confirm"),
    });
  const startAction = (newStatus) =>
    changeStatus(newStatus, {
      title: t("Start processing this order?"),
      text: t("It will move to the In Process stage."),
      confirmButtonText: t("Yes, start"),
    });
  const completeAction = (newStatus) =>
    changeStatus(newStatus, {
      title: t("Mark this order complete?"),
      text: t("It will move to the Completed stage."),
      confirmButtonText: t("Yes, complete"),
      confirmColor: "btn-success",
    });
  const cancelAction = (newStatus) =>
    changeStatus(newStatus, {
      title: t("Cancel this Sales Order?"),
      text: t("It will move to the Cancelled stage."),
      confirmButtonText: t("Yes, cancel"),
      confirmColor: "btn-danger",
    });
  const revertAction = (newStatus) =>
    changeStatus(newStatus, {
      title: t("Revert to Draft?"),
      text: t("It will move back to the Draft stage."),
      confirmButtonText: t("Yes, revert"),
    });

  // Generate Invoice now lives on the PO Coverage tab next to "Create POV"
  // — it's gated on dispatched POV qty, which the Coverage tab already shows.
  const headerActions = [];

  if (canEdit) {
    if (statusLower === "draft") {
      headerActions.push({
        icon: CheckCircle,
        label: t("Confirm"),
        onClick: () => confirmAction("confirmed"),
      });
      headerActions.push({
        icon: XCircle,
        label: t("Cancel"),
        onClick: () => cancelAction("cancelled"),
      });
    } else if (statusLower === "confirmed") {
      headerActions.push({
        icon: Play,
        label: t("Start"),
        onClick: () => startAction("in_process"),
      });
      headerActions.push({
        icon: XCircle,
        label: t("Cancel"),
        onClick: () => cancelAction("cancelled"),
      });
      headerActions.push({
        icon: RotateCcw,
        label: t("Revert to Draft"),
        onClick: () => revertAction("draft"),
      });
    } else if (statusLower === "in_process") {
      headerActions.push({
        icon: CheckSquare,
        label: t("Complete"),
        onClick: () => completeAction("completed"),
      });
      headerActions.push({
        icon: XCircle,
        label: t("Cancel"),
        onClick: () => cancelAction("cancelled"),
      });
      headerActions.push({
        icon: RotateCcw,
        label: t("Revert to Draft"),
        onClick: () => revertAction("draft"),
      });
    } else if (statusLower === "completed" || statusLower === "cancelled") {
      headerActions.push({
        icon: RotateCcw,
        label: t("Revert to Draft"),
        onClick: () => revertAction("draft"),
      });
    }
  }

  headerActions.push({
    icon: Edit,
    label: t("Edit"),
    onClick: () => navigate(`${appsRoot}/purchase-orders/edit/${id}`),
  });
  headerActions.push({
    icon: ArrowLeft,
    label: t("Back to Sales Orders"),
    onClick: () => navigate(-1),
  });

  // Server-side PDF download (same endpoint the listing uses).
  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.purchaseOrders.pdf}/${id}/pdf`,
        { responseType: "blob" }
      );
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${p?.voucher_no || "sales-order"}.pdf`;
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    }
  };

  // Bottom-of-header row: Preview (opens the print-ready page) + Download
  // PDF, right-aligned beside the status — mirrors the quotation detail page.
  const headerFooter = (
    <div className="d-flex align-items-center flex-wrap justify-content-end gap-1">
      <Button
        color="secondary"
        outline
        size="sm"
        onClick={() =>
          window.open(`${appsRoot}/purchase-orders/preview/${id}`, "_blank")
        }
      >
        <Eye size={14} className="me-50" />
        {t("Preview")}
      </Button>
      <Button color="secondary" outline size="sm" onClick={handleDownloadPdf}>
        <Download size={14} className="me-50" />
        {t("Download PDF")}
      </Button>
    </div>
  );

  const sourceLinks = (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      {p?._id ? (
        <span>
          <Hash size={12} className="me-25" />
          {p._id.slice(-8).toUpperCase()}
        </span>
      ) : null}
      {!PFI_RETIRED && p?.pfi_id ? (
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
          actionsFooter={headerFooter}
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
          ratio="8-4"
          left={<PoRelatedDocsTabs />}
          right={
            <Fragment>
              <DetailPanel title={t("Costing Breakdown")}>
                <SalesDocCostingCard
                  totals={headerTotals}
                  currencyCode={p?.currency_code}
                  hideGst
                  bare
                />
              </DetailPanel>
              <PoCustomerOrderPanel />
            </Fragment>
          }
        />
      </div>
    </Fragment>
  );
};

export default ViewPurchaseOrder;
