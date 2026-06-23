// Quotation detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (avatar Q, voucher_no, customer, status, pipeline, action buttons)
//   2. KPI strip — Grand Total | Date | Valid Until | Line Items
//   3. Summary card (About + Costing snapshot + notes)
//   4. Line Items table + costing card  | Public Link / Share panel

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Input, Button } from "reactstrap";
import {
  Calendar,
  DollarSign,
  Edit,
  ArrowLeft,
  Layers,
  Hash,
  Eye,
  Download,
  Mail,
  Briefcase,
  RotateCcw,
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
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  QUOTATION_STATUS_OPTIONS,
  QUOTATION_STATUS_BADGE_COLOR,
} from "@constant/options";
import { fmt, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import { formatDate } from "@src/utility/dateFormat";
import { createPfiFromQuotation } from "@src/views/pfi/store";
import { PFI_RETIRED } from "@src/configs/appMode";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailPanel,
  DetailTwoPanel,
  StatusChangeDropdown,
} from "@src/views/_shared/detail-page";

import RelatedDocsTabs from "./RelatedDocsTabs";
import {
  QuotationCurrencyProvider,
  QUOTATION_CURRENCY_LS_KEY,
} from "./CurrencyToggleContext";

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

// Right-column costing card. Rendered as a child of the currency provider so
// `useQuotationCurrency()` resolves the page-level View: USD⇄INR toggle, keeping
// the breakdown in lock-step with the table + KPI strip.
const CostingPanelBody = ({ lines, exchangeRate, currencyCode }) => {
  const totals = useMemo(
    () => computeDocTotals(lines || [], exchangeRate, { excludeGst: true }),
    [lines, exchangeRate]
  );
  // Same layout as the Step-3 review card: full INR breakdown → 1 {ccy} = X INR
  // → round-off on the quote currency → Grand Total ({ccy}). No doc-view toggle.
  return (
    <SalesDocCostingCard
      totals={totals}
      currencyCode={currencyCode}
      sticky={false}
      hideGst
      bare
    />
  );
};

const ViewQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.quotation);
  const currencyStore = useSelector((s) => s.currency);
  const pfiItems = useSelector((s) => s.pfi?.pfiItems || []);
  const q = store?.quotationItem || {};

  // A quotation is "already converted" when at least one PFI exists for
  // it that wasn't rejected / cancelled. Rejected/cancelled PFIs don't
  // count — the salesperson should be able to re-issue a fresh PFI in
  // that case.
  const hasLivePfi = pfiItems.some(
    (p) =>
      p?.quotation_id === id &&
      p?.status !== "rejected" &&
      p?.status !== "cancelled"
  );

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const quotationPerms = authUserItem?.role?.permissions?.quotations;
  const poPerms = authUserItem?.role?.permissions?.["purchase-orders"];
  const pfiPerms = authUserItem?.role?.permissions?.pfi;
  const canEdit =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_update;
  const canGeneratePo = isAdmin || poPerms?.can_all || poPerms?.can_add;
  const canConvertToPfi = isAdmin || pfiPerms?.can_all || pfiPerms?.can_add;

  // Currency-view toggle. Default → the quotation's OWN (customer/document)
  // currency — that's what the quote is denominated in and what the customer
  // sees; base INR is the internal reference behind the toggle. The operator's
  // manual choice is remembered in localStorage and wins over the default.
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showDoc, setShowDoc] = useState(() => {
    try {
      const stored = localStorage.getItem(QUOTATION_CURRENCY_LS_KEY);
      if (stored === "1") return true;
      if (stored === "0") return false;
      return true; // no stored preference → show the document currency
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(QUOTATION_CURRENCY_LS_KEY, showDoc ? "1" : "0");
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  }, [showDoc]);

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
          "Once approved, you can generate the customer Sales Order and the vendor Purchase Orders from this quotation."
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

  // One-click status transitions (no need to open the edit wizard).
  const changeStatus = (status, failMsg) =>
    dispatch(updateQuotation({ id, data: { status } }))
      .unwrap()
      .then(() => dispatch(getQuotation(id)))
      .catch((err) => Notification("Error", err || failMsg, "warning"));

  const handleSend = () => {
    mySwal
      .fire({
        title: t("Mark as Sent?"),
        text: t("Records that this quotation has been sent to the customer."),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, mark sent"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((r) => r.isConfirmed && changeStatus("sent", t("Could not mark sent")));
  };

  const handleReject = () => {
    mySwal
      .fire({
        title: t("Reject this quotation?"),
        text: t("Marks the quotation as rejected. You can revert to draft later."),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, reject"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((r) => r.isConfirmed && changeStatus("rejected", t("Could not reject")));
  };

  const handleRevertToDraft = () => {
    mySwal
      .fire({
        title: t("Revert to draft?"),
        text: t("Moves this rejected quotation back to draft so it can be edited and re-sent."),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, revert to draft"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then(
        (r) =>
          r.isConfirmed &&
          changeStatus("draft", t("Could not revert to draft"))
      );
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

  // ── Currency view (toggle-driven) ──
  // Stored money on a quotation is in INR (base); the doc Grand Total is
  // INR × exchange_rate. The toggle picks which currency the page reads in.
  const rate = Number(q?.exchange_rate || 0);
  const rateForConv = rate > 0 ? rate : 1;
  const isBaseCurrency =
    (q?.currency_code || "").toUpperCase() === baseCurrency.code.toUpperCase();
  const docCurrency = useMemo(
    () => ({
      code: q?.currency_code || baseCurrency.code,
      symbol: sym || baseCurrency.symbol,
    }),
    [q?.currency_code, sym, baseCurrency]
  );
  // A base-currency quotation has nothing to convert — the toggle is hidden
  // and the effective view is always "base".
  const showDocEffective = showDoc && !isBaseCurrency;
  const activeSym = showDocEffective ? docCurrency.symbol : baseCurrency.symbol;
  const activeCode = showDocEffective ? docCurrency.code : baseCurrency.code;

  const currencyCtx = useMemo(() => {
    const fromInr = (v) =>
      showDocEffective ? (Number(v) || 0) * rateForConv : Number(v) || 0;
    return {
      showDoc: showDocEffective,
      baseCurrency,
      docCurrency,
      rate: rateForConv,
      sym: activeSym,
      code: activeCode,
      fromInr,
      view: {
        mode: showDocEffective ? "doc" : "base",
        rate: rateForConv,
        sym: docCurrency.symbol,
        code: docCurrency.code,
      },
    };
  }, [
    showDocEffective,
    baseCurrency,
    docCurrency,
    rateForConv,
    activeSym,
    activeCode,
  ]);

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
  // Send: draft → sent. Reject: draft/sent → rejected.
  const canSend = canEdit && statusLower === "draft";
  const canReject =
    canEdit && (statusLower === "draft" || statusLower === "sent");
  // Revert: rejected → draft (re-open a turned-down quote for editing).
  const canRevert = canEdit && statusLower === "rejected";

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

  // Recompute the grand total from the lines with the SAME helper the costing
  // breakdown card uses, so the header KPI matches it exactly. (Reversing the
  // stored doc-currency grand_total back to INR via /rate amplifies the
  // 2-decimal rounding of the doc value into a visible ₹ discrepancy.)
  const headerTotals = useMemo(
    () => computeDocTotals(q?.lines || [], q?.exchange_rate, { excludeGst: true }),
    [q?.lines, q?.exchange_rate]
  );

  const kpiItems = [
    {
      key: "total",
      label: t("Grand Total"),
      // grand_inr = rounded whole-INR total; grand_currency = grand_inr × rate.
      // Pick by the active currency view — identical to the costing card.
      value: q?.grand_total
        ? `${activeSym}${fmt(
            showDocEffective
              ? headerTotals.grand_currency
              : headerTotals.grand_inr
          )}`
        : "-",
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

  // Open the server-rendered PDF inline in a new tab (with its proper name).
  // A short-lived ticket lets the browser hit the no-auth public route
  // directly, so the inline filename is honoured (a blob tab shows a UUID).
  const downloadPdf = () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    // Open the tab synchronously on the click so the popup blocker allows it.
    const win = window.open("", "_blank");
    instance
      .get(`${API_ENDPOINTS.quotations.pdf}/${id}/pdf-ticket`)
      .then((resp) => {
        const ticket = resp?.data?.data?.ticket;
        if (!ticket) throw new Error("no ticket");
        const url = `${instance.defaults.baseURL}${
          API_ENDPOINTS.quotations.ticketPdf
        }?t=${encodeURIComponent(ticket)}`;
        if (win) win.location.href = url;
        else window.open(url, "_blank");
      })
      .catch(() => {
        if (win) win.close();
        Notification("Error", t("Could not generate the PDF."), "warning");
      })
      .finally(() => setPdfLoading(false));
  };

  // ── Header actions ── (status transitions live in the dropdown below; the
  // header keeps only Edit + Back to stay uncluttered.)
  const headerActions = [
    ...(canRevert
      ? [
          {
            icon: RotateCcw,
            label: t("Revert to Draft"),
            onClick: handleRevertToDraft,
          },
        ]
      : []),
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
      label: t("Back"),
      onClick: () => navigate(`${appsRoot}/quotations`),
    },
  ];

  // Status transitions available from the current state — rendered as a single
  // "Change Status" dropdown (frees the header of 3 separate buttons).
  const statusActions = [
    canSend && {
      key: "sent",
      label: t("Mark as Sent"),
      dotColor: QUOTATION_STATUS_BADGE_COLOR.sent || "info",
      onClick: handleSend,
    },
    canApprove && {
      key: "approved",
      label: t("Mark as Approved"),
      dotColor: QUOTATION_STATUS_BADGE_COLOR.approved || "success",
      onClick: handleApprove,
    },
    canReject && {
      key: "rejected",
      label: t("Reject"),
      dotColor: QUOTATION_STATUS_BADGE_COLOR.rejected || "danger",
      onClick: handleReject,
    },
  ].filter(Boolean);

  // Currency-view toggle shown under the header action buttons. Hidden for
  // base-currency quotations (nothing to convert).
  const currencyToggle = isBaseCurrency ? null : (
    <div className="d-flex align-items-center gap-50">
      <span className="small text-muted me-25">{t("View")}:</span>
      <span
        className={`small fw-semibold ${
          showDocEffective ? "text-muted" : "text-primary"
        }`}
      >
        {baseCurrency.code}
      </span>
      <div className="form-check form-switch m-0 ps-0 d-flex">
        <Input
          type="switch"
          role="switch"
          id="quotation-currency-toggle"
          className="m-0"
          style={{ cursor: "pointer" }}
          checked={showDocEffective}
          onChange={(e) => setShowDoc(e.target.checked)}
        />
      </div>
      <span
        className={`small fw-semibold ${
          showDocEffective ? "text-primary" : "text-muted"
        }`}
      >
        {docCurrency.code}
      </span>
    </div>
  );

  // Bottom-of-header row: currency toggle (left) + Preview / Download (right),
  // so the PDF actions sit inline with the status row instead of wrapping the
  // main action buttons onto a second line.
  // "Change Status" dropdown — rendered left of Edit in the header action row.
  const statusDropdown = (
    <StatusChangeDropdown
      items={statusActions}
      toggleColor="outline-secondary"
      menuEnd
    />
  );


  return (
    <QuotationCurrencyProvider value={currencyCtx}>
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="Q"
          title={q?.voucher_no || "-"}
          subtitle={(() => {
            const cName = q?.customer_name || q?.customer_contact_name;
            const cEmail = q?.customer_contact_email || q?.customer_email;
            if (!cName && !cEmail) return null;
            return (
              <span className="d-inline-flex align-items-center flex-wrap gap-1">
                {cName ? (
                  <span className="d-inline-flex align-items-center text-capitalize">
                    <Briefcase size={13} className="me-25" />
                    {cName}
                  </span>
                ) : null}
                {cEmail ? (
                  <span className="d-inline-flex align-items-center">
                    <Mail size={13} className="me-25" />
                    {cEmail}
                  </span>
                ) : null}
              </span>
            );
          })()}
          meta={(() => {
            // Prefer the source RFQ number, then the source lead's RQ number,
            // and only fall back to the quotation's own id hash.
            const sourceNo = q?.rfq_voucher_no || q?.lead_voucher_no;
            return sourceNo ? (
              <span>
                <Hash size={12} className="me-25" />
                {sourceNo}
              </span>
            ) : null;
          })()}
          badge={{
            label: statusLabel,
            color:
              QUOTATION_STATUS_BADGE_COLOR[statusLower] || "secondary",
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
              <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
                <Button
                  size="sm"
                  color="secondary"
                  outline
                  className="d-flex align-items-center"
                  onClick={() =>
                    window.open(
                      `${appsRoot}/quotations/preview/${id}`,
                      "_blank"
                    )
                  }
                >
                  <Eye size={14} className="me-50" />
                  {t("Preview")}
                </Button>
                <Button
                  size="sm"
                  color="secondary"
                  outline
                  className="d-flex align-items-center"
                  disabled={pdfLoading}
                  onClick={downloadPdf}
                >
                  <Download size={14} className="me-50" />
                  {pdfLoading ? t("Generating…") : t("Download")}
                </Button>
              </div>
            </div>
          }
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="8-4"
          left={
            <RelatedDocsTabs
              canGenerate={isApproved && canGeneratePo}
              onGenerate={() =>
                navigate(`${appsRoot}/quotations/generate-so/${id}`)
              }
            />
          }
          right={
            <DetailPanel title={t("Costing Breakdown")}>
              <CostingPanelBody
                lines={q?.lines}
                exchangeRate={q?.exchange_rate}
                currencyCode={q?.currency_code}
              />
            </DetailPanel>
          }
        />
      </div>
    </Fragment>
    </QuotationCurrencyProvider>
  );
};

export default ViewQuotation;
