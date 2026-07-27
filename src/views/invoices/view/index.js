import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Activity,
  Paperclip,
  Plus,
  Edit2,
  AlertTriangle,
  X,
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
import AddInvoiceEventModal from "@src/views/invoices/components/AddInvoiceEventModal";
import ShipmentEditModal from "@src/views/invoices/components/ShipmentEditModal";
import { Input, Label, Button, Modal, ModalHeader, ModalBody, ModalFooter, FormFeedback, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import Select from "react-select";
import DateInput from "@components/date-input";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { openPdfViewer } from "@src/utility/pdf";
import Notification from "@components/toast/notification";
import {
  appsRoot,
  backendFilesBaseUrl,
  isAdminUser,
} from "@constant/defaultValues";
import {
  INVOICE_PIPELINE_STEPS as PIPELINE_STEPS,
  INVOICE_TERMINAL_STEPS as TERMINAL_STEPS,
  INVOICE_STATUS_BADGE_COLOR as STATUS_COLORS,
  INVOICE_PAYMENT_METHOD_OPTIONS as PAYMENT_METHOD_OPTIONS,
  INVOICE_EVENT_TYPE_LABEL,
  SHIPPING_MODE_OPTIONS,
  SHIPPING_BILL_TYPE_OPTIONS,
} from "@constant/options";
import { getCurrencySymbol } from "@src/utility/currency";
import CustomerCostingTable from "@src/views/_shared/sales-doc/CustomerCostingTable";
import { formatDate, formatDateTime } from "@src/utility/dateFormat";
import { PFI_RETIRED } from "@src/configs/appMode";

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
  // Persistent banner shown above the header when issuing fails (e.g. Company
  // Profile is missing GSTIN / PAN / IEC). The toast disappears; this stays put
  // until the user fixes the data and retries (or dismisses it).
  const [issueError, setIssueError] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [payOpen, setPayOpen] = useState(false);
  // Tracking + shipment editor (SHIPPING_INVOICE_MERGE_PLAN §5c).
  const [events, setEvents] = useState([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [shipmentEditOpen, setShipmentEditOpen] = useState(false);
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
      // Pre-fill the outstanding balance in the document (customer) currency.
      amount: balanceDoc > 0 ? balanceDoc.toFixed(2) : "",
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
    // Validate against the document-currency balance due.
    const bal = balanceDoc;
    if (amt > bal + 0.01)
      e.amount = `Cannot exceed balance due ${sym}${fmt(bal)}`;
    setPayErrors(e);
    if (Object.keys(e).length) return;
    dispatch(recordInvoicePayment({ id, data: payForm })).then((r) => {
      if (r?.meta?.requestStatus === "fulfilled") {
        setPayOpen(false);
        dispatch(getInvoice(id));
      }
    });
  };

  // Open an invoice PDF (commercial | export | packing-list | receipt) in the
  // in-app viewer — new tab on the frontend origin, with a correctly-named
  // Download. `extraParams` carries paymentId for the receipt voucher.
  const openInvoicePdf = (doc, extraParams = {}) =>
    openPdfViewer({
      kind: "invoice",
      id,
      name: `${inv?.voucher_no || "invoice"}-${doc}`,
      params: { doc, ...extraParams },
    });

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

  // ── Tracking events ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!id) return;
    try {
      const resp = await instance.get(`${API_ENDPOINTS.invoices.event}/${id}`);
      setEvents(resp?.data?.data || []);
    } catch {
      setEvents([]);
    }
  }, [id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const resolveAttachmentHref = (rel) => {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    const base = (backendFilesBaseUrl || "").replace(/\/$/, "");
    const path = rel.replace(/^\//, "").replace(/^assets\//, "");
    return `${base}/${path}`;
  };

  const handleRetractEvent = (eventId) => {
    mySwal
      .fire({
        title: t("Retract event?"),
        text: t("Provide a reason — kept on record alongside the event."),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason"),
        showCancelButton: true,
        confirmButtonText: t("Yes, retract"),
        cancelButtonText: t("Back"),
        inputValidator: (v) =>
          !v || !v.trim() ? t("A reason is required.") : undefined,
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (res) => {
        if (!res.isConfirmed) return;
        try {
          await instance.post(
            `${API_ENDPOINTS.invoices.event}/${eventId}/retract`,
            { reason: res.value.trim() }
          );
          Notification("Success", t("Tracking event retracted."), "success");
          fetchEvents();
        } catch (err) {
          Notification(
            "Error",
            err?.response?.data?.message || t("Failed to retract event"),
            "warning"
          );
        }
      });
  };

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

  // Line items live in INR. Subtotal is the sum of line totals (INR);
  // the doc-currency value is INR × exchange_rate, matching the add /
  // edit form's "₹X × rate = $Y" presentation.
  const subtotalInr = useMemo(
    () => lines.reduce((sum, l) => sum + num(l?.line_total), 0),
    [lines],
  );
  const exchangeRate = num(inv?.exchange_rate) || 1;
  const subtotalDoc = subtotalInr * exchangeRate;
  // Charges & Totals fields are typed in the document currency. We
  // recompute the chain on the FE so KPI tiles + Costing card show
  // proper doc-currency values instead of the legacy INR-mixed numbers
  // that the BE stores on the header row.
  const fobDoc = subtotalDoc - num(inv?.discount_total);
  // Un-rounded doc-currency total (sum of FOB + charges) …
  const rawGrandDoc =
    fobDoc +
    num(inv?.freight_charges) +
    num(inv?.insurance_charges) +
    num(inv?.other_charges);
  // Keep the exact 2-decimal total, mirroring the backend recompute (round2).
  // The grand total must equal FOB + freight + insurance + other to the cent
  // (767.65, not 768). roundOffDoc then collapses to 0 and its line hides.
  const grandDoc = Math.round(rawGrandDoc * 100) / 100;
  const roundOffDoc = grandDoc - rawGrandDoc;
  // Adjustment Notes applied to THIS invoice. Positive = the receivable was
  // reduced (a customer Credit note); negative = increased (a Debit note).
  const adjustmentDoc = num(inv?.adjustment_total);
  const balanceDoc = grandDoc - num(inv?.advance_received) - adjustmentDoc;
  const grandInr = exchangeRate > 0 ? grandDoc / exchangeRate : grandDoc;

  // Payment-status pill for the Payments tab summary cards (mirrors the POV
  // Payments tab). Derived from amounts so it reads right even while draft.
  const paidDoc = num(inv?.advance_received);
  // Settled = cash received + Adjustment Notes applied to this invoice, so a
  // credit note that clears the balance reads "Paid" rather than "Unpaid".
  // Mirrors InvoiceService.applyPaymentDerived.
  const settledDoc = paidDoc + adjustmentDoc;
  const payPill =
    grandDoc > 0 && balanceDoc <= 0.01 && settledDoc > 0
      ? { label: "Paid", color: "success" }
      : settledDoc > 0
        ? { label: "Partially Paid", color: "warning" }
        : { label: "Unpaid", color: "secondary" };

  // ── Handlers ────────────────────────────────────────────────────────

  const handleIssue = async () => {
    const fmtN = (v) =>
      Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

    // Goods-Out preview: per-product required vs current on-hand (single pool,
    // same comparison the backend issue() guard uses). Lets us list what leaves
    // stock and DISABLE the Issue button when any product is short.
    mySwal.fire({
      title: t("Checking stock…"),
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      showConfirmButton: false,
    });
    let preview = null;
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.invoices.issuePreview}/${id}`
      );
      preview = resp?.data?.data || null;
    } catch {
      preview = null; // fall back to a plain confirm; backend still guards.
    }

    let rows = (preview?.lines || []).map((r) => ({
      key: r.product_id,
      name: r.product_name || r.product_code || t("item"),
      code: r.product_code || "",
      uom: r.uom || "",
      required: Number(r.required) || 0,
      available: Number(r.available) || 0,
      short: !!r.short,
    }));
    // Fallback (preview unavailable) — aggregate qty from the loaded lines;
    // availability unknown, so don't block (the server guard still applies).
    if (!preview) {
      const byProduct = new Map();
      for (const l of lines || []) {
        const q = Number(l.qty) || 0;
        if (q <= 0) continue;
        const key = (
          l.product_id ||
          l.product_code ||
          l.product_name ||
          ""
        ).toString();
        const ex = byProduct.get(key) || {
          key,
          name: l.product_name || l.product_code || t("item"),
          code: l.product_code || "",
          uom: l.uqc_code || l.unit || "",
          required: 0,
          available: null,
          short: false,
        };
        ex.required += q;
        byProduct.set(key, ex);
      }
      rows = [...byProduct.values()];
    }

    const hasShortage = rows.some((r) => r.short);
    const shortCount = rows.filter((r) => r.short).length;
    const totalUnits = rows.reduce((s, r) => s + r.required, 0);
    // Shortages first (so the cap never hides them), then by name.
    const ordered = [...rows].sort(
      (a, b) =>
        Number(b.short) - Number(a.short) ||
        (a.name || "").localeCompare(b.name || "")
    );
    const PREVIEW_CAP = 50;
    const previewRows = ordered.slice(0, PREVIEW_CAP);
    const moreCount = ordered.length - previewRows.length;

    const res = await mySwal.fire({
      title: t("Issue Invoice?"),
      width: 680,
      html: (
        <div className="text-start">
          <p className="mb-1" style={{ fontSize: "0.9rem" }}>
            {t(
              "Snapshots will be frozen. Only Shipping link, Advance and Notes are editable after issue."
            )}
          </p>
          {rows.length > 0 && (
            <Fragment>
              {hasShortage ? (
                <div
                  className="alert alert-danger py-50 px-1 mt-1 mb-1"
                  style={{ fontSize: "0.85rem" }}
                >
                  <strong>{shortCount}</strong>{" "}
                  {shortCount === 1
                    ? t("product is short on stock")
                    : t("products are short on stock")}{" "}
                  — {t("restock before issuing.")}
                </div>
              ) : (
                <div
                  className="alert alert-warning py-50 px-1 mt-1 mb-1"
                  style={{ fontSize: "0.85rem" }}
                >
                  <strong>{fmtN(totalUnits)}</strong> {t("units")}{" "}
                  {t("across")} <strong>{rows.length}</strong>{" "}
                  {rows.length === 1 ? t("product") : t("products")}{" "}
                  {t("will go out of stock.")}
                </div>
              )}
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  border: "1px solid #ebe9f1",
                  borderRadius: 6,
                }}
              >
                <div className="table-responsive">
                <table
                  className="table table-sm mb-0 align-middle"
                  style={{ fontSize: "0.85rem" }}
                >
                  <thead
                    className="table-light"
                    style={{ position: "sticky", top: 0, zIndex: 1 }}
                  >
                    <tr>
                      <th>{t("Product")}</th>
                      <th className="text-end">{t("Qty out")}</th>
                      <th className="text-end">{t("Available")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r) => (
                      <tr
                        key={r.key}
                        style={r.short ? { background: "#fdecea" } : undefined}
                      >
                        <td className="text-start">
                          {r.name}
                          {r.code ? (
                            <span className="text-muted"> · {r.code}</span>
                          ) : null}
                        </td>
                        <td className="text-end text-danger fw-semibold text-nowrap">
                          −{fmtN(r.required)}
                          {r.uom ? ` ${r.uom}` : ""}
                        </td>
                        <td
                          className={`text-end text-nowrap fw-semibold ${
                            r.short ? "text-danger" : "text-success"
                          }`}
                        >
                          {r.available === null ? "—" : fmtN(r.available)}
                          {r.available !== null && r.uom ? ` ${r.uom}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              {moreCount > 0 && (
                <div className="text-muted small mt-50">
                  +{moreCount}{" "}
                  {moreCount === 1 ? t("more product") : t("more products")}{" "}
                  {t("(see the invoice for the full list)")}
                </div>
              )}
            </Fragment>
          )}
        </div>
      ),
      icon: hasShortage ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: t("Yes, issue"),
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-outline-secondary ms-1",
      },
      buttonsStyling: false,
      // Short on stock → keep the Issue button visible but disabled.
      didOpen: () => {
        if (hasShortage) {
          const btn = Swal.getConfirmButton();
          if (btn) {
            btn.disabled = true;
            btn.classList.add("disabled");
          }
        }
      },
    });

    if (!res.isConfirmed) return;
    setBusy(true);
    setIssueError("");
    dispatch(issueInvoice(id))
      .unwrap()
      .then(() => {
        setIssueError("");
        // Show what was removed from inventory on issue (Goods Out).
        const deducted = (lines || [])
          .filter((l) => Number(l.qty) > 0)
          .map(
            (l) =>
              `${Number(l.qty).toLocaleString()} × ${
                l.product_name || l.product_code || t("item")
              }`
          );
        if (deducted.length) {
          const shown = deducted.slice(0, 4).join(", ");
          const more =
            deducted.length > 4 ? ` +${deducted.length - 4} more` : "";
          Notification(
            t("Stock updated"),
            t(`Removed from inventory: ${shown}${more}.`),
            "info"
          );
        }
      })
      .catch((err) => {
        // Surface the backend's "Company Profile is incomplete. Missing:…"
        // message as a sticky banner, not just a fleeting toast. The thunk
        // rejects with the message string itself (rejectWithValue), so
        // `err` is usually that string.
        const msg =
          (typeof err === "string" && err) ||
          err?.message ||
          err?.data?.message ||
          t("Could not issue the invoice. Please review the details.");
        setIssueError(typeof msg === "string" ? msg : String(msg));
      })
      .finally(() => setBusy(false));
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
      // Book Shipping hidden — the shipping module is retired; shipment data
      // is now captured directly on the invoice. (Kept for reversibility.)
      if (false && !inv.shipping_id) {
        actions.push({
          icon: Truck,
          label: t("Book Shipping"),
          onClick: () =>
            navigate(`${appsRoot}/shipping/add?invoice_id=${id}`),
          color: "primary",
        });
      }
      // The 3 PDF downloads now live on a second row, right-aligned
      // (see `pdfActions` → DetailHeader's actionsFooter slot).
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

  // PDF downloads — shown on a second row, right-aligned, under the header
  // action buttons. Available once the invoice is no longer a draft.
  const pdfActions = useMemo(() => {
    if (isDraft || isCancelled) return [];
    return [
      {
        label: t("Commercial Invoice"),
        onClick: () => openInvoicePdf("commercial"),
      },
      {
        label: t("Export Invoice"),
        onClick: () => openInvoicePdf("export"),
      },
      {
        label: t("Packing List"),
        onClick: () => openInvoicePdf("packing-list"),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, isCancelled, t]);

  // ── KPI tiles ───────────────────────────────────────────────────────

  const kpiItems = [
    {
      key: "grand",
      label: t("Grand Total"),
      value: grandDoc > 0 ? `${sym}${fmt(grandDoc)}` : "-",
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "balance",
      label: t("Balance"),
      value: balanceDoc > 0 ? `${sym}${fmt(balanceDoc)}` : "-",
      icon: CreditCard,
      tone: balanceDoc > 0 ? "warning" : "success",
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
      label: t("SO"),
      value: inv.purchase_order_voucher_no,
    },
    !PFI_RETIRED &&
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
    inv?.reference_no && {
      icon: Hash,
      label: t("Reference No."),
      value: inv.reference_no,
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
      // exchange_rate is stored as foreign-per-₹1 (e.g. 0.0120). Invert it to
      // show the rupee value of one foreign unit, matching the PDF:
      // "$1 = ₹83.33", not the raw "$1 = ₹0.0120".
      value: `${sym}1 = ₹${fmt(exchangeRate > 0 ? 1 / exchangeRate : 0, 2)}`,
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
        {issueError && (
          <div
            className="d-flex align-items-start mb-1"
            style={{
              background: "#28c76f",
              color: "#fff",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              boxShadow: "0 4px 24px 0 rgba(34, 41, 47, 0.1)",
            }}
            role="alert"
          >
            <AlertTriangle size={18} className="flex-shrink-0 mt-25 me-1" />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="fw-bold">{t("Cannot issue this invoice")}</div>
              <div style={{ whiteSpace: "pre-line" }}>{issueError}</div>
            </div>
            <X
              size={18}
              className="cursor-pointer flex-shrink-0 ms-1"
              onClick={() => setIssueError("")}
            />
          </div>
        )}
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
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <DetailPipeline
                  steps={PIPELINE_STEPS}
                  current={statusLower}
                  terminalSteps={TERMINAL_STEPS}
                />
              </div>
              {pdfActions.length ? (
                <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end flex-shrink-0 dp-header-actions dp-header-actions-row">
                  {pdfActions.map((a, idx) => (
                    <Button
                      key={`inv-pdf-${idx}`}
                      size="sm"
                      className="d-flex align-items-center btn-brand-blue"
                      onClick={a.onClick}
                    >
                      <Download size={14} className="me-50" />
                      {a.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          }
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="9-3"
          left={
            <Card className="mb-1">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-2">
                <Nav pills className="mb-0">
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
                  <NavItem>
                    <NavLink
                      active={activeTab === "shipment"}
                      onClick={() => setActiveTab("shipment")}
                      style={{
                        color: activeTab === "shipment" ? "#fff" : "#1a2238",
                        display: "inline-flex",
                        alignItems: "center",
                        height: 38,
                        padding: "0 14px",
                      }}
                    >
                      <Truck size={16} className="me-50" />
                      {t("Shipment")}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      active={activeTab === "tracking"}
                      onClick={() => setActiveTab("tracking")}
                      style={{
                        color: activeTab === "tracking" ? "#fff" : "#1a2238",
                        display: "inline-flex",
                        alignItems: "center",
                        height: 38,
                        padding: "0 14px",
                      }}
                    >
                      <Activity size={16} className="me-50" />
                      {t("Tracking")}
                      {events.filter((e) => !e.soft_delete).length > 0 && (
                        <span
                          className="badge ms-1"
                          style={{
                            background:
                              activeTab === "tracking"
                                ? "rgba(255,255,255,0.25)"
                                : "#eef0f3",
                            color:
                              activeTab === "tracking" ? "#fff" : "#1a2238",
                          }}
                        >
                          {events.filter((e) => !e.soft_delete).length}
                        </span>
                      )}
                    </NavLink>
                  </NavItem>
                </Nav>
                  {/* Active tab's action button, pinned top-right of the tab
                      bar (same pattern as the Lead / POV detail tabs). */}
                  <div className="d-flex gap-1">
                    {activeTab === "payments" &&
                      (isIssued || isPartial) &&
                      canEdit && (
                        <Button
                          size="sm"
                          color="success"
                          onClick={openPaymentModal}
                        >
                          <DollarSign size={14} className="me-50" />
                          {t("Record Payment")}
                        </Button>
                      )}
                    {activeTab === "shipment" && canEdit && !isCancelled && (
                      <Button
                        size="sm"
                        color="primary"
                        outline
                        onClick={() => setShipmentEditOpen(true)}
                      >
                        <Edit2 size={14} className="me-50" />
                        {t("Edit")}
                      </Button>
                    )}
                    {activeTab === "tracking" && canEdit && !isCancelled && (
                      <Button
                        size="sm"
                        color="primary"
                        onClick={() => setAddEventOpen(true)}
                      >
                        <Plus size={14} className="me-50" />
                        {t("Add Event")}
                      </Button>
                    )}
                  </div>
                </div>

                <TabContent activeTab={activeTab}>
                  <TabPane tabId="details">
              {/* Line Items — same customer-facing table + logic as the
                  Sales Order / Quotation detail (shared CustomerCostingTable:
                  Part No · Product · Qty · Rate · Amount, with computed
                  per-line costing incl. discount/rebate/expense/margin). */}
              <div className="mb-3">
                <CustomerCostingTable
                  lines={lines}
                  exchangeRate={exchangeRate}
                  docCurrencyCode={inv?.currency_code || "INR"}
                  baseCurrencyCode="INR"
                  showHsn
                />
              </div>

              {/* Costing summary */}
              <div className="mb-3">
                <h5 className="mb-2">{t("Costing")}</h5>
                <div>
                  <Row className="small">
                    <Col md="6">
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Subtotal")}</span>
                        <span>{sym}{fmt(subtotalDoc)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Discount")}</span>
                        <span>− {sym}{fmt(inv?.discount_total)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25 border-top pt-25">
                        <span className="fw-semibold">{t("FOB Value")}</span>
                        <span className="fw-semibold">{sym}{fmt(fobDoc)}</span>
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
                      <div className="border-top border-bottom py-1 mb-1">
                        {sym && sym !== "₹" && (
                          <div className="d-flex justify-content-between small text-muted">
                            <span>{t("INR equivalent")}</span>
                            <span>₹{fmt(grandInr)}</span>
                          </div>
                        )}
                        {Math.abs(roundOffDoc) >= 0.005 && (
                          <div className="d-flex justify-content-between py-25 text-muted">
                            <span>{t("Round Off")}</span>
                            <span>
                              {roundOffDoc < 0 ? "− " : "+ "}
                              {sym}
                              {fmt(Math.abs(roundOffDoc))}
                            </span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between py-25">
                          <span className="fw-bold">{t("Grand Total")}</span>
                          <span className="fw-bold">{sym}{fmt(grandDoc)}</span>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Advance Received")}</span>
                        <span>{sym}{fmt(inv?.advance_received)}</span>
                      </div>
                      {/* Adjustment Notes applied to this invoice — shown only
                          when there are any, so untouched invoices look the
                          same as before. */}
                      {Math.abs(adjustmentDoc) > 0.001 && (
                        <div className="d-flex justify-content-between py-25">
                          <span className="text-muted">
                            {t("Adjustment Notes")}
                          </span>
                          <span>
                            {adjustmentDoc > 0 ? "− " : "+ "}
                            {sym}
                            {fmt(Math.abs(adjustmentDoc))}
                          </span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between py-25 border-top pt-25">
                        <span className="fw-semibold">{t("Balance Receivable")}</span>
                        <span
                          className={`fw-semibold ${
                            balanceDoc > 0 ? "text-warning" : "text-success"
                          }`}
                        >
                          {sym}{fmt(balanceDoc)}
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
                      <Table responsive bordered size="sm" className="align-middle mb-0">
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
                  {/* Money position summary — mirrors the POV Payments tab.
                      Only meaningful once the invoice is issued (a draft has no
                      receivable position yet), so hide it while draft. */}
                  {(isIssued || isPartial || isPaid) && (
                  <Row className="g-1 mb-2">
                    <Col md="3" sm="6">
                      <div className="border rounded p-1 h-100">
                        <div className="text-muted small">
                          {t("Invoice Value (Receivable)")}
                        </div>
                        <div className="fw-bolder text-body">
                          {sym}
                          {fmt(grandDoc)}
                        </div>
                      </div>
                    </Col>
                    <Col md="3" sm="6">
                      <div className="border rounded p-1 h-100">
                        <div className="text-muted small">{t("Total Paid")}</div>
                        <div className="fw-bolder text-body">
                          {sym}
                          {fmt(paidDoc)}
                        </div>
                      </div>
                    </Col>
                    <Col md="3" sm="6">
                      <div className="border rounded p-1 h-100">
                        <div className="text-muted small">
                          {t("Balance Receivable")}
                        </div>
                        <div
                          className="fw-bolder"
                          style={{
                            color: balanceDoc > 0.01 ? "#c77700" : "#1f8a3b",
                          }}
                        >
                          {sym}
                          {fmt(balanceDoc)}
                        </div>
                      </div>
                    </Col>
                    <Col md="3" sm="6">
                      <div className="border rounded p-1 h-100">
                        <div className="text-muted small">
                          {t("Payment Status")}
                        </div>
                        <Badge color={payPill.color} className="mt-25 text-white">
                          {t(payPill.label)}
                        </Badge>
                      </div>
                    </Col>
                  </Row>
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
                            <th>{t("Receipt")}</th>
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
                                <td>
                                  {!voided && p.receipt_voucher_no ? (
                                    <Button
                                      size="sm"
                                      color="link"
                                      className="p-0"
                                      title={t("Download Receipt")}
                                      onClick={() =>
                                        openInvoicePdf("receipt", {
                                          paymentId: p._id,
                                        })
                                      }
                                    >
                                      <Download size={13} className="me-25" />
                                      {p.receipt_voucher_no}
                                    </Button>
                                  ) : (
                                    <span className="text-muted">
                                      {p.receipt_voucher_no || "-"}
                                    </span>
                                  )}
                                </td>
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

                <TabPane tabId="shipment">
                  <div className="mb-2">
                    <h6 className="mb-0">{t("Shipment & Shipping Bill")}</h6>
                  </div>
                  <Table responsive bordered size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <th style={{ width: "25%" }}>{t("Mode")}</th>
                        <td>
                          {SHIPPING_MODE_OPTIONS.find(
                            (o) => o.value === inv?.mode
                          )?.label || "-"}
                        </td>
                        <th style={{ width: "25%" }}>{t("Export Scheme")}</th>
                        <td>
                          {SHIPPING_BILL_TYPE_OPTIONS.find(
                            (o) => o.value === inv?.shipping_bill_type
                          )?.label || "-"}
                        </td>
                      </tr>
                      <tr>
                        <th>{t("AWB / BL No.")}</th>
                        <td>{inv?.bl_awb_no || "-"}</td>
                        <th>{t("Shipping Bill No.")}</th>
                        <td>{inv?.shipping_bill_no || "-"}</td>
                      </tr>
                      <tr>
                        <th>{t("Shipping Bill Date")}</th>
                        <td>
                          {inv?.shipping_bill_date
                            ? formatDate(inv.shipping_bill_date)
                            : "-"}
                        </td>
                        <th>{t("Pre-Carriage By")}</th>
                        <td>{inv?.pre_carriage_by || "-"}</td>
                      </tr>
                      <tr>
                        <th>{t("Place of Receipt")}</th>
                        <td>{inv?.place_of_receipt || "-"}</td>
                        <th>{t("Place of Delivery")}</th>
                        <td>{inv?.place_of_delivery || "-"}</td>
                      </tr>
                      <tr>
                        <th>{t("Port of Loading")}</th>
                        <td>
                          {inv?.port_of_loading_snapshot?.name ||
                            inv?.port_of_loading_snapshot?.code ||
                            "-"}
                        </td>
                        <th>{t("Port of Discharge")}</th>
                        <td>
                          {inv?.port_of_discharge_snapshot?.name ||
                            inv?.port_of_discharge_snapshot?.code ||
                            "-"}
                        </td>
                      </tr>
                      <tr>
                        <th>{t("Total Packages")}</th>
                        <td>
                          {inv?.total_packages != null
                            ? inv.total_packages
                            : "-"}
                        </td>
                        <th>{t("Net / Gross Weight (kg)")}</th>
                        <td>
                          {inv?.net_weight_kg != null
                            ? fmt(inv.net_weight_kg, 3)
                            : "-"}{" "}
                          /{" "}
                          {inv?.gross_weight_kg != null
                            ? fmt(inv.gross_weight_kg, 3)
                            : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </TabPane>

                <TabPane tabId="tracking">
                  <div className="mb-2">
                    <h6 className="mb-0">{t("Tracking Timeline")}</h6>
                  </div>
                  {events.length === 0 ? (
                    <div className="text-muted text-center py-3">
                      {t("No tracking events yet.")}
                    </div>
                  ) : (
                    <ul className="timeline ms-50">
                      {events.map((e) => {
                        const retracted = !!e.soft_delete;
                        return (
                          <li key={e._id} className="timeline-item">
                            <span
                              className={`timeline-point timeline-point-indicator ${
                                retracted
                                  ? "timeline-point-secondary"
                                  : "timeline-point-info"
                              }`}
                            />
                            <div className="timeline-event">
                              <div
                                className="d-flex justify-content-between flex-sm-row flex-column mb-sm-0 mb-1"
                                style={
                                  retracted
                                    ? {
                                        textDecoration: "line-through",
                                        opacity: 0.6,
                                      }
                                    : {}
                                }
                              >
                                <h6 className="mb-0">
                                  {INVOICE_EVENT_TYPE_LABEL[e.type] ||
                                    e.type_other ||
                                    e.type}
                                </h6>
                                <span className="timeline-event-time">
                                  {e.occurred_at
                                    ? formatDateTime(e.occurred_at)
                                    : ""}
                                </span>
                              </div>
                              {e.location && (
                                <p className="mb-0 small">{e.location}</p>
                              )}
                              {e.notes && (
                                <p className="mb-0 text-muted small">
                                  {e.notes}
                                </p>
                              )}
                              <div className="d-flex align-items-center gap-1 mt-25 flex-wrap">
                                {e.created_by_name && (
                                  <span className="text-muted small">
                                    {t("— Logged by")} {e.created_by_name}
                                  </span>
                                )}
                                {e.attachment_url && (
                                  <a
                                    href={resolveAttachmentHref(
                                      e.attachment_url
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="small d-inline-flex align-items-center"
                                  >
                                    <Paperclip size={14} className="me-25" />
                                    {t("Attachment")}
                                  </a>
                                )}
                                {!retracted && canEdit && !isCancelled && (
                                  <Button
                                    size="sm"
                                    color="link"
                                    className="p-0 text-danger small"
                                    onClick={() => handleRetractEvent(e._id)}
                                  >
                                    {t("Retract")}
                                  </Button>
                                )}
                              </div>
                              {retracted && (
                                <div className="mt-50 small text-warning">
                                  <strong>{t("Retracted by")}</strong>{" "}
                                  {e.deleted_by_name || t("user")}
                                  {e.deleted_at
                                    ? ` · ${formatDateTime(e.deleted_at)}`
                                    : ""}
                                  {e.deleted_reason && (
                                    <div className="text-muted">
                                      <strong>{t("Reason:")}</strong>{" "}
                                      {e.deleted_reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
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
              {/* "Source Sales Orders" panel removed — duplicated the SO/Quote
                  already shown in Source Documents above. */}
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

      {/* ── Tracking event + Shipment editor modals ─────────────────── */}
      <AddInvoiceEventModal
        open={addEventOpen}
        toggle={() => setAddEventOpen(false)}
        invoiceId={id}
        onCreated={fetchEvents}
      />
      <ShipmentEditModal
        open={shipmentEditOpen}
        toggle={() => setShipmentEditOpen(false)}
        invoiceId={id}
        invoice={inv}
      />

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
                {t("Amount")}
                {inv?.currency_code ? ` (${inv.currency_code})` : ""}{" "}
                <span className="text-danger">*</span>
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
                {fmt(balanceDoc)}
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
