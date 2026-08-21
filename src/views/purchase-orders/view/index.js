// Purchase Order detail page - composes the shared detail-page kit.
// Layout:
//   1. Header (avatar P, voucher #, vendor, status, pipeline, actions)
//   2. KPI strip - Grand Total | Order Date | Expected Delivery | Line Items
//   3. Summary (Buyer + Vendor + delivery/terms + notes)
//   4. Tabs (Line Items | Coverage | PO Vendors)  |  Snapshot side panel

import { Fragment, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  DollarSign,
  Layers,
  Edit,
  ArrowLeft,
  Hash,
  ExternalLink,
  Download,
  Mail,
  Briefcase,
  Truck,
  FileText,
  Info,
} from "react-feather";
import { Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getPurchaseOrder,
  updatePurchaseOrder,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import Notification from "@components/toast/notification";
import { openPdfViewer } from "@src/utility/pdf";
import { downloadExcel } from "@src/utility/excel";
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
  StatusChangeDropdown,
} from "@src/views/_shared/detail-page";

import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";

import PoRelatedDocsTabs from "./PoRelatedDocsTabs";
import PoCustomerOrderPanel from "./PoCustomerOrderPanel";
import { usePoCoverage } from "./PoCoverageAndVendors";

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

  // Vendor→document rate for the Costing Breakdown's "Vendor Rate" line —
  // see quotations/view/index.js for the full rationale (shared card).
  const vendorRate = useMemo(() => {
    const withRate = (p?.lines || []).find(
      (l) =>
        (Number(l?.cost_exchange_rate) || 0) > 0 &&
        Number(l?.cost_exchange_rate) !== 1
    );
    return Number((withRate || p?.lines?.[0])?.cost_exchange_rate) || 0;
  }, [p?.lines]);

  // Recompute the grand total from the lines with the SAME helper the
  // costing breakdown card uses, so the header KPI matches it exactly
  // (the stored grand_total carries a 2-decimal rounding drift).
  const headerTotals = useMemo(
    () =>
      computeDocTotals(p?.lines || [], p?.exchange_rate, {
        excludeGst: true,
        freightTotal: p?.freight_total,
      }),
    [p?.lines, p?.exchange_rate, p?.freight_total]
  );

  // ≈₹ INR estimate — same approach as the Invoice detail page: sum each
  // line's FROZEN line_total (not a live per-line recompute) + freight,
  // then divide by the precise header exchange_rate. `headerTotals.grand_inr`
  // recomputes from raw (unrounded) per-line math, which can drift a cent
  // from the persisted line totals shown in the table above — amplified
  // ~90-95x once divided into INR. This keeps the ₹ figure in lock-step
  // with the Invoice/PDF instead.
  const grandDocFrozen = useMemo(
    () =>
      (p?.lines || []).reduce((s, l) => s + (Number(l?.line_total) || 0), 0) +
      (Number(p?.freight_total) || 0),
    [p?.lines, p?.freight_total]
  );
  const exchangeRatePo = Number(p?.exchange_rate) || 1;
  const grandInrPrecise =
    exchangeRatePo > 0 ? grandDocFrozen / exchangeRatePo : grandDocFrozen;

  const kpiItems = [
    {
      key: "total",
      label: t("Grand Total"),
      value:
        p?.grand_total !== undefined
          ? `${sym} ${fmt(headerTotals.grand_currency)}`
          : "-",
      // Use computeDocTotals' own grand_inr (derived from the UNROUNDED
      // doc-currency total) — not grand_currency ÷ exchange_rate, which
      // divides the whole-dollar-ROUNDED total and amplifies that rounding
      // loss once the tiny exchange rate divides it back out (e.g. a 40-cent
      // rounding diff turned into a ₹38 error at ~1/95). Same field the
      // Quotation detail page already uses correctly. Domestic (₹) orders
      // need no second line.
      sub:
        sym !== "₹" && p?.grand_total !== undefined
          ? `≈ ₹${fmt(grandInrPrecise)}`
          : null,
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
  const povPerms = authUserItem?.role?.permissions?.["po-vendors"];
  const canCreatePov = isAdmin || povPerms?.can_all || povPerms?.can_add;
  const invoicePerms = authUserItem?.role?.permissions?.invoices;
  const canCreateInvoice =
    isAdmin || invoicePerms?.can_all || invoicePerms?.can_add;

  // Live coverage (also drives the Coverage / Vendor PO tabs — shared so the
  // header "Generate POV" button can gate on pending qty and refresh the tabs
  // after creating POVs).
  const coverageData = usePoCoverage();

  // Invoice coverage → header "Generate Invoice" button + progress banner.
  // Same numbers the Coverage tab shows, surfaced on the header so the operator
  // sees invoice status at a glance without opening the tab. `invoiceable` =
  // fulfilled (dispatched + sell-from-stock) qty not yet invoiced.
  const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
  const covTotals = coverageData?.coverage?.totals;
  const dispatchedTotal = num(covTotals?.dispatched);
  const fromStockTotal = num(covTotals?.from_stock);
  const invoiceableTotal = num(covTotals?.invoiceable);
  const invoicedTotal = num(covTotals?.invoiced);
  const canGenerateInvoice =
    canCreateInvoice &&
    invoiceableTotal > 1e-6 &&
    statusLower !== "draft" &&
    statusLower !== "cancelled";
  // Everything fulfilled is already on an invoice — nothing left to raise.
  const fullyInvoiced =
    (dispatchedTotal > 0 || fromStockTotal > 0) &&
    invoiceableTotal <= 1e-6 &&
    invoicedTotal > 0;
  // Show whenever there's uncovered (pending) qty. Procurement needs a
  // confirmed SO (BE rule), so from a re-edited Draft the button confirms the
  // SO first (see onGeneratePov) before opening the Generate POV page.
  const canGeneratePov =
    canCreatePov &&
    coverageData?.coverage?.has_pending &&
    (statusLower === "draft" ||
      statusLower === "confirmed" ||
      statusLower === "in_process");

  // Open the Generate POV page. From Draft we confirm-and-start first so the
  // backend (which requires confirmed/in_process) accepts the new Vendor PO;
  // the page itself pre-fills each line's pending qty.
  const onGeneratePov = () => {
    if (statusLower !== "draft") {
      navigate(`${appsRoot}/purchase-orders/generate-pov/${id}`);
      return;
    }
    mySwal
      .fire({
        title: t("Confirm this Sales Order?"),
        text: t(
          "Generating a Vendor PO moves this Sales Order to In Process. Continue?"
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Confirm & continue"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(updatePurchaseOrder({ id, data: { status: "in_process" } }))
          .unwrap()
          .then(() => {
            dispatch(getPurchaseOrder(id));
            navigate(`${appsRoot}/purchase-orders/generate-pov/${id}`);
          })
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
  const confirmStartAction = (newStatus) =>
    changeStatus(newStatus, {
      title: t("Confirm & start processing?"),
      text: t(
        "It will be confirmed and moved straight to the In Process stage."
      ),
      confirmButtonText: t("Yes, confirm & start"),
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
  // Status transitions → a single "Change Status" dropdown (consistent with
  // the RFQ / Quotation detail pages). Items reflect the legal next-statuses.
  const dot = (s) => PURCHASE_ORDER_STATUS_BADGE_COLOR[s] || "secondary";
  const statusActions = [];
  if (canEdit) {
    if (statusLower === "draft") {
      statusActions.push({
        key: "confirmed",
        label: t("Confirm"),
        dotColor: dot("confirmed"),
        onClick: () => confirmAction("confirmed"),
      });
      statusActions.push({
        key: "in_process",
        label: t("Confirm & Start"),
        dotColor: dot("in_process"),
        onClick: () => confirmStartAction("in_process"),
      });
      statusActions.push({
        key: "cancelled",
        label: t("Cancel"),
        dotColor: dot("cancelled"),
        onClick: () => cancelAction("cancelled"),
      });
    } else if (statusLower === "confirmed") {
      statusActions.push({
        key: "in_process",
        label: t("Start"),
        dotColor: dot("in_process"),
        onClick: () => startAction("in_process"),
      });
      statusActions.push({
        key: "cancelled",
        label: t("Cancel"),
        dotColor: dot("cancelled"),
        onClick: () => cancelAction("cancelled"),
      });
      statusActions.push({
        key: "draft",
        label: t("Revert to Draft"),
        dotColor: dot("draft"),
        onClick: () => revertAction("draft"),
      });
    } else if (statusLower === "in_process") {
      statusActions.push({
        key: "completed",
        label: t("Complete"),
        dotColor: dot("completed"),
        onClick: () => completeAction("completed"),
      });
      statusActions.push({
        key: "cancelled",
        label: t("Cancel"),
        dotColor: dot("cancelled"),
        onClick: () => cancelAction("cancelled"),
      });
      statusActions.push({
        key: "draft",
        label: t("Revert to Draft"),
        dotColor: dot("draft"),
        onClick: () => revertAction("draft"),
      });
    } else if (statusLower === "completed" || statusLower === "cancelled") {
      statusActions.push({
        key: "draft",
        label: t("Revert to Draft"),
        dotColor: dot("draft"),
        onClick: () => revertAction("draft"),
      });
    }
  }

  const headerActions = [
    {
      icon: Edit,
      label: t("Edit"),
      onClick: () => navigate(`${appsRoot}/purchase-orders/edit/${id}`),
    },
    {
      icon: ArrowLeft,
      label: t("Back"),
      onClick: () => navigate(-1),
    },
  ];

  // Open the PDF in the in-app viewer (new tab, frontend origin) — fetched via
  // the authed API, shown there, with a correctly-named Download.
  const handleDownloadPdf = () =>
    openPdfViewer({ kind: "purchase_order", id, name: p?.voucher_no });
  const handleDownloadExcel = () =>
    downloadExcel({ kind: "purchase_order", id, name: p?.voucher_no });

  // Change Status dropdown — rendered left of the action buttons, mirroring
  // the RFQ / Quotation detail pages.
  const statusDropdown = statusActions.length ? (
    <StatusChangeDropdown
      items={statusActions}
      toggleColor="outline-secondary"
      menuEnd
    />
  ) : null;

  const sourceLinks = (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      {!PFI_RETIRED && p?.pfi_id ? (
        <a
          href={`${appsRoot}/pfi/view/${p.pfi_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-reset text-decoration-none"
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
          className="text-reset text-decoration-none"
        >
          <ExternalLink size={12} className="me-25" />
          {t("Source Quotation")}
          {p?.quotation_voucher_no ? ` · ${p.quotation_voucher_no}` : ""}
        </a>
      ) : null}
    </span>
  );

  // PO is multi-vendor at line level; show customer (icon contact line) in
  // subtitle, fall back to legacy header vendor for older POs.
  const poName = p?.customer_name || p?.vendor_name;
  const poEmail = p?.customer_contact_email;
  const contactLine =
    poName || poEmail ? (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {poName ? (
          <span className="d-inline-flex align-items-center text-capitalize">
            <Briefcase size={13} className="me-25" />
            {poName}
          </span>
        ) : null}
        {poEmail ? (
          <span className="d-inline-flex align-items-center">
            <Mail size={13} className="me-25" />
            {poEmail}
          </span>
        ) : null}
      </span>
    ) : null;

  return (
    <Fragment>
      <div className="app-user-view">
        {/* Invoice-coverage banner — shows above the header whenever any qty has
            been invoiced against this SO. Green when everything fulfilled is
            invoiced (explains why "Generate Invoice" is gone); blue on a partial
            invoice. Numbers come from the same coverage the Coverage tab uses. */}
        {invoicedTotal > 0 && (
          <div
            className={`d-flex align-items-start gap-1 small p-1 mb-1 rounded ${
              fullyInvoiced
                ? "bg-light-success text-success"
                : "bg-light-info text-info"
            }`}
          >
            <Info size={14} className="mt-25 flex-shrink-0" />
            <div>
              <strong>
                {fullyInvoiced
                  ? t("All dispatched qty already invoiced.")
                  : t("Partial invoice raised for this Sales Order.")}
              </strong>{" "}
              <span className="text-body">
                {t("Invoiced")}: {invoicedTotal} / {t("Dispatched")}:{" "}
                {dispatchedTotal}
                {invoiceableTotal > 1e-6 && (
                  <>
                    {" · "}
                    {t("Still invoiceable")}: {invoiceableTotal}
                  </>
                )}
              </span>{" "}
              <Link
                to={`${appsRoot}/invoices?purchase_order_id=${id}`}
                className="text-decoration-underline"
              >
                {t("View invoices")} <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        )}
        <DetailHeader
          avatarText="P"
          title={p?.voucher_no || "-"}
          subtitle={contactLine}
          meta={sourceLinks}
          badge={{
            label: statusLabel,
            color:
              PURCHASE_ORDER_STATUS_BADGE_COLOR[statusLower] || "secondary",
          }}
          actions={headerActions}
          actionsPrefix={statusDropdown}
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
                {canGeneratePov && (
                  <Button
                    size="sm"
                    color="primary"
                    className="d-flex align-items-center"
                    onClick={onGeneratePov}
                  >
                    <Truck size={14} className="me-50" />
                    {t("Generate POV")}
                  </Button>
                )}
                {canGenerateInvoice && (
                  <Button
                    size="sm"
                    color="primary"
                    className="d-flex align-items-center"
                    onClick={() =>
                      navigate(`${appsRoot}/invoices/add?po_id=${id}`)
                    }
                  >
                    <FileText size={14} className="me-50" />
                    {t("Generate Invoice")}
                  </Button>
                )}
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

        <DetailTwoPanel
          ratio="8-4"
          left={<PoRelatedDocsTabs coverageData={coverageData} />}
          right={
            <Fragment>
              <DetailPanel title={t("Costing Breakdown")}>
                <SalesDocCostingCard
                  totals={{ ...headerTotals, grand_inr: grandInrPrecise }}
                  currencyCode={p?.currency_code}
                  hideGst
                  bare
                  vendorCurrencyCode={p?.vendor_currency_code}
                  vendorRate={vendorRate}
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
