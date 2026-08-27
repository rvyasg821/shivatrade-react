import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Row,
  Col,
  Label,
  Input,
  Button,
  Table,
  Spinner,
  FormFeedback,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  UncontrolledTooltip,
} from "reactstrap";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Tag,
  X,
  Users,
  FileText,
  Layers,
  Percent,
} from "react-feather";

import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";
import Select from "react-select";

import MultiSoPickerModal from "../components/MultiSoPickerModal";
import InvoiceLineWorksheet from "./components/InvoiceLineWorksheet";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import DateInput from "@components/date-input";
import { useBooksClosedUpto, isClosedPeriod, closedPeriodMessage } from "@src/hooks/useBooksClosed";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
// Countries/states/cities come from the masters via the API — no static list.
import PlainGeoFields from "@src/views/_shared/geo/PlainGeoFields";
import { useCountryOptions } from "@src/views/_shared/geo/useGeoOptions";
// GST UQC now comes off the UOM master row — see useUomOptions.js. The three
// hand-written copies of this mapping had DIVERGED: this file knew 16 units,
// select-so-lines and MultiSoPickerModal only 9, so the same SO line produced a
// different GST code depending on which screen imported it.
import {
  useUqcResolver,
  useUomReady,
} from "@src/views/_shared/uom/useUomOptions";
import {
  INVOICE_GST_ROUTE_OPTIONS as GST_ROUTES,
  CUSTOMER_ADDRESS_TYPES,
  INCOTERMS_OPTIONS,
  REBATE_EXPENSE_TYPE_OPTIONS,
  SHIPPING_MODE_OPTIONS,
  SHIPPING_BILL_TYPE_OPTIONS,
  SHIPPING_SEA_MODES,
} from "@constant/options";
import PortSelect from "@src/views/_shared/port-master/PortSelect";
import { getCurrencySymbol } from "@src/utility/currency";

import {
  createInvoice,
  updateInvoice,
  getInvoice,
  cleanInvoiceMessage,
  resetInvoiceItem,
} from "@src/views/invoices/store";
import { getPurchaseOrder } from "@src/views/purchase-orders/store";
import { getCustomer } from "@src/views/customers/store";
import EntitySearchSelect from "@components/entity-select";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import {
  getExchangeRateOptions,
  getCurrencyDropdown,
} from "@src/views/currencies/store";
import { getRebateDropdown } from "@src/views/rebates/store";
import { getExpenseDropdown } from "@src/views/expenses/store";

const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(v || 0);
// Banker-safe rounding to 2 dp. JS floating point can leave a
// 0.1 + 0.2 = 0.30000000000000004 trail; we snap intermediate
// rebate / expense / line totals to 2 dp so downstream math stays
// exact instead of accumulating noise.
const round2 = (n) =>
  Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;

// Mirror BE `sumRebates` / `sumExpenses` — PFI/PO convention:
//   Rebate row : { rebate_id, code, name, type: 'percent'|'fixed', pct }
//                value lives in `pct` regardless of `type`
//   Expense row: { expense_id, code, name, type: 'percent'|'fixed', value }
//                value lives in `value` regardless of `type`
// `rate` = the line's cost_exchange_rate (source→doc). FIXED amounts are in the
// vendor (source) currency → convert them like the unit price; PERCENT heads are
// a % of a doc-currency base, so no conversion. Defaults to 1 (domestic line).
const sumRebates = (items, base, rate = 1) => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let total = 0;
  for (const r of items) {
    if (!r) continue;
    const add =
      r.type === "fixed" ? num(r.pct) * rate : (base * num(r.pct)) / 100;
    // Round each entry before summing so a row of 33.333… 's doesn't
    // build into noise across many lines.
    total += round2(add);
  }
  return round2(total);
};
const sumExpenses = (items, base, rate = 1) => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let total = 0;
  for (const e of items) {
    if (!e) continue;
    const add =
      e.type === "percent" ? (base * num(e.value)) / 100 : num(e.value) * rate;
    total += round2(add);
  }
  return round2(total);
};
const fmt = (v, dp = 2) =>
  num(v).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

const InvoiceAddEdit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);
  const { id: editId } = useParams();
  const location = useLocation();
  const isEdit = !!editId;

  const queryPoId =
    new URLSearchParams(location.search).get("po_id") || "";

  const booksClosedUpto = useBooksClosedUpto();
  const store = useSelector((s) => s.invoice);
  const poStore = useSelector((s) => s.purchaseOrder);
  const currencyStore = useSelector((s) => s.currency);
  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.invoices;
  const canAdd = isAdmin || perms?.can_all || perms?.can_add;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;

  // Pull live currency + rebate + expense + customer + company masters
  // (same sources PFI uses).
  useEffect(() => {
    dispatch(getExchangeRateOptions());
    dispatch(getCurrencyDropdown());
    dispatch(getRebateDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getCompanyDetails());
  }, [dispatch]);

  const rebateStore = useSelector((s) => s.rebate);
  const expenseStore = useSelector((s) => s.expense);
  const customerStore = useSelector((s) => s.customer);
  const companyStore = useSelector((s) => s.company);


  // Active bank accounts of the company; PFI already enriches each with
  // currency_code. bankAccountOptions itself depends on form.currency_code
  // and lives below the form-state declaration to avoid a TDZ ref.
  const allBankAccounts = useMemo(
    () => companyStore?.companyItem?.bank_accounts || [],
    [companyStore?.companyItem]
  );

  const rebateOptions = useMemo(
    () =>
      (rebateStore?.rebateDropdown || []).map((r) => ({
        value: r._id,
        label: r.name,
        raw: r,
      })),
    [rebateStore?.rebateDropdown]
  );

  const expenseOptions = useMemo(
    () =>
      (expenseStore?.expenseDropdown || []).map((e) => ({
        value: e._id,
        label: e.name,
        raw: e,
      })),
    [expenseStore?.expenseDropdown]
  );

  const currencyOptions = useMemo(
    () =>
      (currencyStore?.exchangeOptions || []).map((c) => ({
        value: c.code,
        label: c.name ? `${c.code} - ${c.name}` : c.code,
      })),
    [currencyStore?.exchangeOptions]
  );

  // Countries come from the country master (API), not a static package.
  // Name-valued: the invoice stores "India", not "IN", and the PDF prints it
  // verbatim. Used by the party snapshots AND by Country of Origin/Destination.
  const countryOptions = useCountryOptions("name");
  const uqcFor = useUqcResolver();
  const uomReady = useUomReady();

  // ── Form state ──────────────────────────────────────────────────────

  const [form, setForm] = useState({
    invoice_date: todayISO(),
    due_date: "",
    purchase_order_id: queryPoId,
    customer_po_no: "",
    reference_no: "",
    country_of_destination: "",
    country_of_origin: "India",
    customer_id: "",
    customer_address_id: "",
    consignee_id: "",
    consignee_address_id: "",
    // SO-style "Same as Buyer" — when on, consignee mirrors the buyer and the
    // dropdowns lock. UI-only (stripped from the payload).
    consignee_same_as_buyer: true,
    // Notify Party — structured snapshot. The id is optional (set only
    // when picked from customer master); snapshot is the source of truth.
    notify_party_id: "",
    notify_party_from_customer: false,
    notify_party_snapshot: {
      name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
    },
    // Consignee — same hybrid model: optional FK + structured snapshot.
    consignee_from_customer: true, // most consignees ARE in master
    consignee_snapshot: {
      name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
    },
    currency_code: "USD",
    currency_symbol: "",
    exchange_rate: "1",
    discount_total: "0",
    freight_charges: "0",
    insurance_charges: "0",
    other_charges: "0",
    advance_received: "0",
    gst_route: "igst_paid",
    lut_no: "",
    lut_date: "",
    incoterm: "FOB",
    payment_terms: "",
    delivery_terms: "",
    end_use_code: "",
    preferential_agreement: "",
    // ── Shipment & Shipping Bill (optional at create; editable post-issue) ──
    mode: "",
    shipping_bill_type: "free",
    shipping_bill_no: "",
    shipping_bill_date: "",
    // GST/Assessable-Value-only rate override — see backend entity doc
    // comment. Blank = fall back to the invoice's own exchange_rate.
    custom_exchange_rate: "",
    port_of_loading_id: "",
    port_of_loading_snapshot: null,
    port_of_discharge_id: "",
    port_of_discharge_snapshot: null,
    pre_carriage_by: "",
    place_of_receipt: "",
    place_of_delivery: "",
    total_packages: "",
    net_weight_kg: "",
    gross_weight_kg: "",
    bl_awb_no: "",
    notes_to_buyer: "",
    internal_notes: "",
    declaration_text:
      "We declare that invoice shows the actual price of the goods described and that all particulars are true and correct.",
    terms: "",
    // Multi-select: list of company_bank_account ids. Pre-selected from
    // source PFI (via PO chain) on create, else home-currency default.
    bank_account_ids: [],
    // Picked company address (shipper). BE captures snapshot at save.
    company_address_id: "",
  });
  const [lines, setLines] = useState([]);
  const [bankSnapshots, setBankSnapshots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [costingModal, setCostingModal] = useState({ open: false, idx: null });
  // Address options per customer/consignee/notify — cached so picking the same
  // entity again doesn't refetch. Keyed by customer _id.
  const [addressOptionsByCustomer, setAddressOptionsByCustomer] = useState({});
  // customer _id → company name, cached from the same on-demand detail fetch as
  // the addresses. Used for the consignee snapshot name so the full customer
  // list isn't needed. Keyed by the id ON THE RECORD.
  const [customerNameById, setCustomerNameById] = useState({});
  // Coverage from the PO arrival (?po=...). Drives the BE qty guard mirror:
  // qty cap per line = dispatched − already_invoiced; banner + disable Save
  // when nothing has been dispatched yet.
  const [poCoverage, setPoCoverage] = useState(null);
  // Advance amount per source SO id — used to auto-sum the invoice's advance
  // across EVERY source SO its lines come from (the advance is auto-managed:
  // the field is read-only and the backend is authoritative on save; this is
  // the live preview). Seeded on generate + each SO picked. Declared here (not
  // near the picker) so the effects above can reference it without a TDZ error.
  const [soAdvanceById, setSoAdvanceById] = useState({});
  // Count of PO lines auto-dropped because they had 0 dispatched qty.
  // Used to render the "N of M dispatched" info banner.
  const [droppedLineCount, setDroppedLineCount] = useState(0);

  // ── Wizard navigation ───────────────────────────────────────────────
  const STEPS = useMemo(
    () => [
      { key: "parties", label: t("Parties"), icon: Users },
      { key: "header", label: t("Invoice Details"), icon: FileText },
      { key: "items", label: t("Items & Charges"), icon: Layers },
      { key: "tax", label: t("Tax & Notes"), icon: Percent },
    ],
    [t]
  );
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));
  const isLastStep = activeStep === STEPS.length - 1;

  const onF = (k, v) => {
    setForm((s) => ({ ...s, [k]: v }));
    // Clear this field's validation error as soon as it's edited.
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  // Exchange Rate field shows the intuitive inverse — ₹ per 1 foreign unit
  // (e.g. 83.33) — while the form still STORES "foreign per ₹1" (system
  // convention: doc = INR × rate, e.g. 0.012). Local input state, seeded from
  // the stored value while unfocused; store 1/X on edit. (Same as the
  // quotation / sales-order Step 1.)
  const rateSameCurrency =
    !form.currency_code ||
    String(form.currency_code).toUpperCase() === "INR";
  const [rateDisplay, setRateDisplay] = useState("");
  const rateFocused = useRef(false);
  useEffect(() => {
    if (rateFocused.current) return;
    if (rateSameCurrency) {
      setRateDisplay("1");
      return;
    }
    const r = Number(form.exchange_rate);
    setRateDisplay(r > 0 ? String(Math.round((1 / r) * 100) / 100) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.exchange_rate, rateSameCurrency]);

  const onRateDisplayChange = (text) => {
    setRateDisplay(text);
    const inrPerForeign = Number(text);
    onF("exchange_rate", inrPerForeign > 0 ? String(1 / inrPerForeign) : "");
  };

  // Auto-fetch the exchange rate from the currency MASTER when a currency is
  // picked (mirrors the quotation Step-1). Writes the stored "foreign-per-₹1"
  // value; the rateDisplay effect above then shows its ₹-per-unit inverse.
  // Skips INR (rate = 1). On EDIT the ref is seeded on hydrate (below) so a
  // saved invoice's FROZEN rate is never clobbered; a manual edit is preserved
  // because it changes exchange_rate, not currency_code (this effect's dep).
  const autoFilledForCurrency = useRef(null);
  useEffect(() => {
    const code = (form.currency_code || "").toUpperCase();
    if (!code || code === "INR") {
      if (code === "INR") autoFilledForCurrency.current = "INR";
      return undefined;
    }
    if (autoFilledForCurrency.current === code) return undefined;
    let cancelled = false;
    instance
      .get(API_ENDPOINTS.currencies.currentRate, { params: { to: code } })
      .then((resp) => {
        if (cancelled) return;
        const data = resp?.data?.data;
        if (data && Number(data.rate) > 0) {
          autoFilledForCurrency.current = code;
          onF("exchange_rate", String(Number(data.rate)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.currency_code]);

  // Client 2026-08-07 (Option A): the costing worksheet's vendor rate box IS the
  // invoice's exchange rate. When the vendor/source currency is the base (INR),
  // a line's cost_exchange_rate (doc units per 1 INR) is numerically identical
  // to the invoice header exchange_rate (foreign-per-₹1) — so mirror it onto
  // form.exchange_rate. The Record-Payment modal + forex gain/loss then compare
  // against this same rate automatically. GUARD: only when an INR-source line
  // exists; a purely foreign-vendor invoice carries no INR rate to derive here,
  // so its master-fetched exchange_rate is left untouched.
  useEffect(() => {
    const inrLine = (lines || []).find(
      (l) =>
        (l?.source_currency_code || "").toUpperCase() === "INR" &&
        num(l?.cost_exchange_rate) > 0
    );
    if (!inrLine) return;
    const want = String(inrLine.cost_exchange_rate);
    if (Math.abs(num(form.exchange_rate) - num(want)) > 1e-9) {
      onF("exchange_rate", want);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  // ── Source→document rate box (mirrors the costing worksheet) ──────────
  // The line cost is native to the VENDOR (source) currency; the invoice is in
  // the customer (document) currency. One-currency-per-document → a single
  // source currency. The box shows "1 {src} = {rate} {doc}" and is DISABLED at
  // 1 when the two match (e.g. USD vendor → USD customer, no conversion).
  // Editing it re-freezes every line's cost_exchange_rate.
  const docCur = (form.currency_code || "INR").toUpperCase();
  const srcCur = (
    lines.find((l) => l.source_currency_code)?.source_currency_code || docCur
  ).toUpperCase();
  // The source→document exchange rate is now owned per-line by the Costing
  // Worksheet (its per-currency rate box); the old single-rate invoice box was
  // removed. `docCur`/`srcCur` are still used for the currency-symbol display.

  // GST route defaults to IGST Paid for EVERY invoice (domestic and export).
  // The operator opts into LUT / zero-rated manually via the radio below — we
  // no longer auto-switch export invoices to LUT based on currency (client
  // 2026-08-12).

  // ── Packing totals: auto-sum from line items, editable override ──────
  // Header Total Packages / Net / Gross default to the sum of the per-line
  // packing fields and keep tracking the lines — until the operator edits a
  // field, which marks it manual (e.g. to add pallet/packaging weight).
  const packingAuto = useRef({
    total_packages: true,
    net_weight_kg: true,
    gross_weight_kg: true,
  });

  const packingSums = useMemo(() => {
    const calc = (key, decimals) => {
      let sum = 0;
      let anySet = false;
      for (const l of lines) {
        const v = l?.[key];
        if (v !== "" && v != null && !Number.isNaN(Number(v))) {
          sum += Number(v);
          anySet = true;
        }
      }
      if (!anySet) return "";
      return decimals != null ? String(Number(sum.toFixed(decimals))) : String(sum);
    };
    return {
      total_packages: calc("packages", null),
      net_weight_kg: calc("net_weight", 3),
      gross_weight_kg: calc("gross_weight", 3),
    };
  }, [lines]);

  // Push the computed sums into any header field still in "auto" mode.
  useEffect(() => {
    setForm((prev) => {
      let next = prev;
      for (const field of [
        "total_packages",
        "net_weight_kg",
        "gross_weight_kg",
      ]) {
        if (!packingAuto.current[field]) continue;
        const v = packingSums[field];
        if (String(prev[field] ?? "") !== String(v)) {
          if (next === prev) next = { ...prev };
          next[field] = v;
        }
      }
      return next;
    });
  }, [packingSums]);

  // Header edit pins the field to manual; clearing it (empty) re-arms
  // auto-tracking so it resumes summing from the per-line packing — and
  // immediately reflects the current line sum instead of staying blank.
  const onPackingF = (k, v) => {
    const empty = v === "" || v == null;
    packingAuto.current[k] = empty;
    onF(k, empty ? packingSums[k] : v);
  };

  // Sea modes show a "BL No." label; air / unset show "AWB / BL No.".
  const isSeaMode = SHIPPING_SEA_MODES.includes(form.mode);

  // Bank account dropdown — filtered by the invoice currency (falls back to
  // any active account when no currency match). Declared here because it
  // depends on `form.currency_code`; needs to be after the form state.
  const bankAccountOptions = useMemo(() => {
    const active = allBankAccounts.filter(
      (b) => !b.soft_delete && b.is_active !== false
    );
    const cc = (form?.currency_code || "").toUpperCase();
    const matching = active.filter(
      (b) => (b.currency_code || "").toUpperCase() === cc
    );
    const pool = matching.length ? matching : active;
    return pool.map((b) => ({
      value: b._id,
      label: `${b.bank_name} — ${b.account_number}${
        b.ad_code ? ` (AD ${b.ad_code})` : ""
      }${b.currency_code ? ` · ${b.currency_code}` : ""}`,
      raw: b,
    }));
  }, [allBankAccounts, form?.currency_code]);

  // Company addresses for the shipper picker. Lists ALL active addresses
  // (corporate, branch, warehouse) — type is shown as a prominent prefix so
  // the operator can tell them apart at a glance.
  const companyAddressOptions = useMemo(() => {
    const list = companyStore?.companyItem?.addresses || [];
    const titleize = (s) =>
      (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return list
      .filter((a) => !a.soft_delete)
      .map((a) => {
        const typeLabel = titleize(a.type || "Address");
        const rest = [a.label, a.address_line1, a.city, a.country]
          .filter(Boolean)
          .join(", ");
        const defaultTag = a.is_default ? " (default)" : "";
        return {
          value: a._id,
          label: `[${typeLabel}] ${rest}${defaultTag}`,
          raw: a,
        };
      });
  }, [companyStore?.companyItem]);

  // Auto-pick default company address on new invoice — corporate+default,
  // else corporate, else any default, else first.
  useEffect(() => {
    if (isEdit) return;
    if (form.company_address_id) return;
    if (!companyAddressOptions.length) return;
    const def =
      companyAddressOptions.find(
        (o) => o.raw?.type === "corporate" && o.raw?.is_default
      ) ||
      companyAddressOptions.find((o) => o.raw?.type === "corporate") ||
      companyAddressOptions.find((o) => o.raw?.is_default) ||
      companyAddressOptions[0];
    if (def?.value) onF("company_address_id", def.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyAddressOptions, isEdit]);

  // Pre-fill Terms & Conditions from company profile's default_terms on
  // new invoice. Operator can edit per invoice; PDF reads invoice.terms.
  useEffect(() => {
    if (isEdit) return;
    if (form.terms) return;
    const defaultTerms = companyStore?.companyItem?.default_terms || "";
    if (defaultTerms) onF("terms", defaultTerms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyStore?.companyItem?.default_terms, isEdit]);

  // Pre-fill LUT No / LUT Date from company profile on new invoice.
  // Operator can override per invoice; only fills when form fields blank.
  useEffect(() => {
    if (isEdit) return;
    const cLutNo = companyStore?.companyItem?.lut_no || "";
    const cLutDate = companyStore?.companyItem?.lut_date || "";
    if (cLutNo && !form.lut_no) onF("lut_no", cLutNo);
    if (cLutDate && !form.lut_date) onF("lut_date", cLutDate.slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyStore?.companyItem?.lut_no, companyStore?.companyItem?.lut_date, isEdit]);

  // Pre-fill Port of Loading (Step 2) from company profile's default on a new
  // invoice. Operator can override per invoice; only fills when blank so it
  // never clobbers a value the operator already picked.
  useEffect(() => {
    if (isEdit) return;
    if (form.port_of_loading_id || form.port_of_loading_snapshot) return;
    const polId =
      companyStore?.companyItem?.default_port_of_loading_id || "";
    const polSnap =
      companyStore?.companyItem?.default_port_of_loading_snapshot || null;
    if (polId) onF("port_of_loading_id", polId);
    if (polSnap) onF("port_of_loading_snapshot", polSnap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyStore?.companyItem?.default_port_of_loading_id,
    companyStore?.companyItem?.default_port_of_loading_snapshot,
    isEdit,
  ]);

  // Load a customer + its default address, then write into the named
  // snapshot field on form. Used when operator picks "From Customer
  // Master" for Consignee / Notify Party — copies structured fields
  // one-to-one and sets the FK id for traceability.
  const prefillSnapshotFromCustomer = useCallback(
    async (customerId, snapshotField, idField) => {
      if (!customerId) return;
      try {
        const resp = await instance.get(
          `${API_ENDPOINTS.customers.get}/${customerId}`
        );
        const cust = resp?.data?.data;
        const addrs = cust?.addresses || [];
        const addr =
          addrs.find((a) => a.is_default) || addrs[0] || {};
        setForm((s) => ({
          ...s,
          [idField]: customerId,
          [snapshotField]: {
            name: cust?.company_name || "",
            address_line1: addr.address_line1 || "",
            address_line2: addr.address_line2 || "",
            city: addr.city || "",
            state: addr.state || "",
            postcode: addr.postcode || "",
            country: addr.country || "",
          },
        }));
      } catch {
        // Soft-fail — operator can type fields manually.
      }
    },
    []
  );

  // Fetch addresses for a given customer when not cached yet. Customer
  // dropdown only returns id + name, so addresses are loaded on demand
  // via /customer/get and cached by customerId.
  // Ask for a customer's detail record. Fire-and-forget: the effect below picks
  // the result up out of the store. This mirrors the Quotation wizard, which
  // dispatches getCustomer and then reads `customerStore.customerItem` — rather
  // than trying to unwrap the thunk's return value at the call site, which is
  // what this form used to do and where the addresses were being lost.
  const ensureAddresses = useCallback(
    (customerId) => {
      if (!customerId || addressOptionsByCustomer[customerId]) return;
      dispatch(getCustomer(customerId));
    },
    [addressOptionsByCustomer, dispatch]
  );

  // Cache the addresses of whichever customer the store is currently holding.
  //
  // Keyed by the id ON THE RECORD, not by the id we asked for, so it does not
  // matter which of the three pickers (buyer / consignee / notify) triggered the
  // fetch — the result lands under the right customer either way.
  useEffect(() => {
    const cust = customerStore?.customerItem;
    if (!cust?._id) return;
    const opts = (cust.addresses || []).map((a) => ({
      value: a._id,
      label: [a.label, a.address_line1, a.city, a.country]
        .filter(Boolean)
        .join(", "),
      raw: a,
    }));
    setAddressOptionsByCustomer((s) => ({ ...s, [cust._id]: opts }));
    setCustomerNameById((s) => ({
      ...s,
      [cust._id]: cust.company_name || cust.name || "",
    }));
  }, [customerStore?.customerItem]);

  // Auto-fill Country of Destination from the consignee's country — the goods
  // ship to the consignee, so its country is the natural final destination.
  // Only fills when the field is still EMPTY, so it never clobbers a value that
  // came from the source PO, an edited invoice, or the operator's manual choice
  // (still fully editable; merchant/re-export trades can override it).
  useEffect(() => {
    const consigneeCountry = form.consignee_snapshot?.country;
    if (!consigneeCountry) return;
    setForm((s) =>
      s.country_of_destination
        ? s
        : { ...s, country_of_destination: consigneeCountry }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.consignee_snapshot?.country]);

  // ── Load PO data (?po=<id>) and pre-fill ───────────────────────────

  useEffect(() => {
    if (isEdit || !queryPoId) return;
    (async () => {
      const [action, covResp] = await Promise.all([
        dispatch(getPurchaseOrder(queryPoId)),
        instance
          .get(`${API_ENDPOINTS.purchaseOrders.coverage}/${queryPoId}/coverage`)
          .catch(() => null),
      ]);
      const po = action?.payload?.purchaseOrderItem;
      if (!po) return;
      const coverage = covResp?.data?.data || null;
      setPoCoverage(coverage);
      // Seed the primary source SO's advance for the auto-sum preview.
      setSoAdvanceById((m) => ({
        ...m,
        [po._id]: Number(po.advance_amount || 0),
      }));

      setForm((s) => ({
        ...s,
        purchase_order_id: po._id,
        customer_id: po.customer_id || "",
        customer_address_id: po.customer_address_id || "",
        // Consignee — inherit from PO if it carries one (set when the
        // source PFI had a consignee). Otherwise default to the buyer.
        consignee_id: po.consignee_id || po.customer_id || "",
        consignee_address_id:
          po.consignee_address_id || po.customer_address_id || "",
        consignee_from_customer: !!(po.consignee_id || po.customer_id),
        // "Same as Buyer" when the SO's consignee is the buyer (or none).
        consignee_same_as_buyer:
          !po.consignee_id || po.consignee_id === po.customer_id,
        // When PO has a consignee_snapshot from PFI propagation, use it
        // directly; the snapshot is the source of truth on PDF.
        ...(po.consignee_snapshot
          ? { consignee_snapshot: po.consignee_snapshot }
          : {}),
        // Pre-select PFI's bank when the PO came via PFI. Falls back to
        // the home-currency default via the effect below if PFI didn't
        // carry a bank.
        bank_account_ids: po.pfi_bank_account_id
          ? [po.pfi_bank_account_id]
          : s.bank_account_ids,
        currency_code: po.currency_code || "USD",
        currency_symbol: po.currency_symbol || "",
        exchange_rate: po.exchange_rate || "1",
        // CNF freight carried from the SO costing sheet → the invoice's
        // existing freight_charges (same document currency); flip incoterm
        // FOB→CFR (CNF) when the SO carries freight. Fresh prefill, no clobber.
        freight_charges:
          po.freight_total != null && Number(po.freight_total) > 0
            ? String(po.freight_total)
            : s.freight_charges || "0",
        incoterm:
          po.freight_total != null && Number(po.freight_total) > 0
            ? "CFR"
            : po.incoterm || "FOB",
        payment_terms: po.payment_terms || "",
        delivery_terms: po.delivery_terms || "",
        country_of_destination:
          po.country_of_final_destination || po.country_of_destination || "",
        // Carry the buyer's PO# + advance already collected from the source
        // Sales Order (S4) so they're visible/editable before save.
        customer_po_no: po.customer_po_number || s.customer_po_no || "",
        // Manual tracking reference carried from the source Sales Order.
        reference_no: po.reference_no || s.reference_no || "",
        advance_received:
          po.advance_amount != null && po.advance_amount !== ""
            ? String(po.advance_amount)
            : s.advance_received,
      }));

      // Map PO lines → invoice lines. qty defaults to the coverage's
      // INVOICEABLE qty (= dispatched + from-stock − already-invoiced), NOT just
      // `dispatched`. A line fulfilled partly from stock (e.g. 3 procured + 7
      // from inventory of an ordered 10) is fully invoiceable = 10 — using
      // `dispatched` alone under-billed it to 3. Falls back to PO ordered when
      // no coverage. Mirrors the BE invoice ceiling so Save doesn't reject.
      const dispatchedAvailByLine = new Map();
      for (const cl of coverage?.lines || []) {
        const invoiceable = Number(
          cl.invoiceable ?? cl.dispatched ?? 0
        );
        dispatchedAvailByLine.set(
          (cl.purchase_order_line_id || "").toString(),
          invoiceable
        );
      }
      // Auto-drop lines with nothing invoiceable yet — operator can re-add them
      // on a later invoice once more is dispatched / stocked. When coverage is
      // unavailable, fall back to all PO lines at ordered qty (legacy).
      const haveCoverage = !!coverage;
      const filteredPoLines = haveCoverage
        ? (po.lines || []).filter((l) => {
              const d = dispatchedAvailByLine.get((l._id || "").toString());
              return typeof d === "number" && d > 0;
          })
        : po.lines || [];
      const droppedCount = haveCoverage
        ? (po.lines || []).length - filteredPoLines.length
        : 0;
      setDroppedLineCount(droppedCount);
      const mapped = filteredPoLines.map((l, i) => {
        const dispatched = dispatchedAvailByLine.get((l._id || "").toString());
        const cap =
          typeof dispatched === "number"
            ? Math.max(0, dispatched)
            : Number(l.qty || 0);
        return {
          seq: i + 1,
          // Source SO id — drives the multi-SO advance auto-sum preview.
          purchase_order_id: po._id,
          purchase_order_line_id: l._id,
          po_vendor_line_id: undefined,
          product_id: l.product_id,
          product_name: l.product_name || "",
          product_code: l.product_code || "",
          // Carry the SO line's VENDOR so the invoice keeps the exact cost the
          // order was priced at. Without it the line arrived vendorless and the
          // Costing Worksheet auto-picked the *cheapest* vendor, silently
          // rewriting the rate/value/margin away from the Sales Order.
          vendor_id: l.vendor_id || "",
          vendor_name: l.vendor_name || "",
          vendor_code: l.vendor_code || "",
          part_no: l.part_no || "",
          // Description is seeded directly from product_name only —
          // operators can edit it later. We do NOT inherit the SO line's
          // long description blurb.
          description: l.product_name || "",
          hsn_code: l.hsn_code || "",
          customer_reference: l.customer_reference || "",
          unit: l.unit || "Nos",
          // Same fallback as `unit` above — this was passed the raw `l.unit`,
          // so a line with no unit asked the master for "" and got nothing.
          uqc_code: uqcFor(l.unit || "Nos"),
          qty: String(cap),
          // Full precision — a toFixed(2) here silently truncated a low
          // per-unit price (e.g. ₹0.0308 → ₹0.03, a ~3% loss) that a huge
          // qty amplifies into a large absolute value gap vs the source SO.
          unit_price: String(l.unit_price ?? 0),
          // Multi-currency: carry the vendor (source) currency + frozen
          // source→doc rate from the SO line so the invoice converts each line
          // the same way (native × cost_exchange_rate). 1 for a same-currency
          // line (e.g. USD vendor → USD customer).
          source_currency_code: (
            l.source_currency_code ||
            form.currency_code ||
            "INR"
          ).toUpperCase(),
          cost_exchange_rate:
            l.cost_exchange_rate != null && l.cost_exchange_rate !== ""
              ? String(l.cost_exchange_rate)
              : "1",
          // Carry the full costing from the SO line so the invoice total
          // equals the SO total (was hardcoded 0 / margin dropped).
          discount_pct: String(l.discount_pct || 0),
          margin_pct: String(l.margin_pct || 0),
          tax_pct: "0",
          igst_rate_pct: String(l.tax_pct || 0),
          product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
            ? l.product_rebates_snapshot
            : [],
          product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
            ? l.product_expenses_snapshot
            : [],
          // Packing carried from the SO line (originally from quotation, where
          // the operator may have overridden the product defaults).
          packages: l.package_count != null ? String(l.package_count) : "",
          net_weight: l.net_weight_kg != null ? String(l.net_weight_kg) : "",
          gross_weight:
            l.gross_weight_kg != null ? String(l.gross_weight_kg) : "",
        };
      });
      setLines(mapped);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryPoId, isEdit]);

  // ── Multi-SO seed from the listing "Create Invoice" picker ──────────
  // The listing hands { customer_id, currency_code, country_of_destination,
  // lines } via router state. We fetch the primary SO (first picked line's
  // PO) and reuse the same header pre-fill as the ?po= path — so bill-to
  // address, consignee snapshot, exchange rate, incoterm, bank, etc. all
  // populate exactly like a single-SO invoice. The picker-selected lines
  // (which may span several SOs) replace the PO's own lines.
  useEffect(() => {
    if (isEdit || queryPoId) return;
    const seed = location.state?.multiSo;
    if (!seed || !Array.isArray(seed.lines) || !seed.lines.length) return;
    const primaryPoId = seed.lines[0]?.purchase_order_id || "";
    (async () => {
      let po = null;
      if (primaryPoId) {
        const action = await dispatch(getPurchaseOrder(primaryPoId));
        po = action?.payload?.purchaseOrderItem || null;
      }
      setForm((s) => ({
        ...s,
        // Primary SO pointer (per-line linkage is authoritative for multi-SO;
        // BE relaxed purchase_order_id to optional).
        purchase_order_id: primaryPoId || s.purchase_order_id,
        customer_id: seed.customer_id || po?.customer_id || s.customer_id,
        customer_address_id: po?.customer_address_id || s.customer_address_id,
        consignee_id: po?.consignee_id || seed.customer_id || s.consignee_id,
        consignee_address_id:
          po?.consignee_address_id ||
          po?.customer_address_id ||
          s.consignee_address_id,
        consignee_from_customer: !!(po?.consignee_id || seed.customer_id),
        consignee_same_as_buyer:
          !po?.consignee_id || po.consignee_id === po.customer_id,
        ...(po?.consignee_snapshot
          ? { consignee_snapshot: po.consignee_snapshot }
          : {}),
        bank_account_ids: po?.pfi_bank_account_id
          ? [po.pfi_bank_account_id]
          : s.bank_account_ids,
        currency_code: seed.currency_code || po?.currency_code || s.currency_code,
        currency_symbol:
          po?.currency_symbol ||
          getCurrencySymbol(seed.currency_code) ||
          s.currency_symbol,
        exchange_rate: po?.exchange_rate || s.exchange_rate,
        // CNF freight from the primary SO → invoice freight_charges; flip
        // incoterm FOB→CFR (CNF) when the SO carries freight.
        freight_charges:
          po?.freight_total != null && Number(po.freight_total) > 0
            ? String(po.freight_total)
            : s.freight_charges || "0",
        incoterm:
          po?.freight_total != null && Number(po.freight_total) > 0
            ? "CFR"
            : po?.incoterm || s.incoterm,
        payment_terms: po?.payment_terms || s.payment_terms,
        delivery_terms: po?.delivery_terms || s.delivery_terms,
        country_of_destination:
          seed.country_of_destination ||
          po?.country_of_final_destination ||
          po?.country_of_destination ||
          s.country_of_destination,
        // Buyer's PO # — carried from the primary source Sales Order, same as
        // the single-SO path. Blank-only, so it never clobbers a typed value.
        customer_po_no: po?.customer_po_number || s.customer_po_no || "",
        // Reference No. — carried from the primary source Sales Order, same
        // blank-only rule so it never clobbers a typed value.
        reference_no: po?.reference_no || s.reference_no || "",
        advance_received:
          po?.advance_amount != null && po?.advance_amount !== ""
            ? String(po.advance_amount)
            : s.advance_received,
      }));
      if (primaryPoId)
        setSoAdvanceById((m) => ({
          ...m,
          [primaryPoId]: Number(po?.advance_amount || 0),
        }));
      // Full precision — a toFixed(2) here silently truncated a low
      // per-unit price (e.g. ₹0.0308 → ₹0.03) that a huge qty amplifies into
      // a large absolute value gap vs the source SO.
      setLines(
        seed.lines.map((l, i) => ({
          ...l,
          seq: i + 1,
          unit_price: String(l.unit_price ?? 0),
        }))
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, queryPoId]);

  // Advance is auto-managed: it's the Σ of advance_amount over EVERY distinct
  // source SO the lines come from. Only overrides the field when every source
  // SO's advance is known here (generate + picked SOs); otherwise it leaves the
  // value untouched and the backend computes the exact sum on save — so it can
  // never wrongly zero the advance on edit (where per-SO advances aren't known).
  useEffect(() => {
    const poIds = Array.from(
      new Set((lines || []).map((l) => l.purchase_order_id).filter(Boolean))
    );
    if (!poIds.length) return;
    if (!poIds.every((id) => soAdvanceById[id] != null)) return;
    const sum = poIds.reduce((s, id) => s + Number(soAdvanceById[id] || 0), 0);
    const next = String(round2(sum));
    setForm((f) =>
      f.advance_received === next ? f : { ...f, advance_received: next }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, soAdvanceById]);

  // Auto-fetch addresses when customer/consignee/notify changes so the
  // matching address picker can populate.
  useEffect(() => {
    if (form.customer_id) ensureAddresses(form.customer_id);
  }, [form.customer_id, ensureAddresses]);
  useEffect(() => {
    if (form.consignee_id) ensureAddresses(form.consignee_id);
  }, [form.consignee_id, ensureAddresses]);

  // Auto-pick the buyer's default bill-to address once their addresses load.
  //
  // Picking a customer clears `customer_address_id` (the old pick belonged to a
  // different customer), and without this the field just sat empty until the
  // operator opened the dropdown and chose by hand — even when the customer had
  // exactly one address. The consignee picker below has always done this; the
  // bill-to one was simply missing it.
  //
  // The `valid` guard is what makes this safe on an existing invoice: if the
  // saved address is among the loaded options we leave it alone, so editing an
  // invoice never silently re-points it at the default.
  useEffect(() => {
    if (!form.customer_id) return;
    const opts = addressOptionsByCustomer[form.customer_id];
    if (!opts || !opts.length) return;
    const valid = opts.some((o) => o.value === form.customer_address_id);
    if (!valid) {
      // Same priority as the Quotation wizard: explicit default, then the first
      // BILL_TO, then whatever is first.
      const pick =
        opts.find((o) => o.raw?.is_default) ||
        opts.find((o) => o.raw?.type === CUSTOMER_ADDRESS_TYPES.BILL_TO) ||
        opts[0];
      onF("customer_address_id", pick?.value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer_id, addressOptionsByCustomer]);

  // ── Consignee (Ship-to), SO-style ──
  // "Same as Buyer" → mirror the buyer's customer + bill-to address.
  useEffect(() => {
    if (!form.consignee_same_as_buyer) return;
    setForm((s) => ({
      ...s,
      consignee_id: s.customer_id || "",
      consignee_address_id: s.customer_address_id || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.consignee_same_as_buyer, form.customer_id, form.customer_address_id]);

  // When NOT same-as-buyer, auto-pick the consignee customer's default address
  // once its addresses load (and the current pick isn't valid for it).
  useEffect(() => {
    if (form.consignee_same_as_buyer) return;
    if (!form.consignee_id) return;
    const opts = addressOptionsByCustomer[form.consignee_id];
    if (!opts || !opts.length) return;
    const valid = opts.some((o) => o.value === form.consignee_address_id);
    if (!valid) {
      const def =
        opts.find((o) => o.raw?.is_default || o.raw?.is_primary) || opts[0];
      onF("consignee_address_id", def?.value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.consignee_same_as_buyer,
    form.consignee_id,
    addressOptionsByCustomer,
  ]);

  // Keep the consignee snapshot in sync with the picked consignee customer +
  // address, so the saved invoice + PDF show the right ship-to.
  useEffect(() => {
    if (!form.consignee_id) return;
    const opts = addressOptionsByCustomer[form.consignee_id] || [];
    const a = opts.find((o) => o.value === form.consignee_address_id)?.raw || {};
    // Name comes from the per-customer detail cache (or the already-hydrated
    // snapshot on edit) — no full customer list needed.
    const name =
      customerNameById[form.consignee_id] ||
      form.consignee_snapshot?.name ||
      "";
    // Don't wipe a pre-filled snapshot before the master data has loaded.
    if (!name && !a.address_line1) return;
    onF("consignee_snapshot", {
      name,
      address_line1: a.address_line1 || "",
      address_line2: a.address_line2 || "",
      city: a.city || "",
      state: a.state || "",
      postcode: a.postcode || "",
      country: a.country || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.consignee_id,
    form.consignee_address_id,
    addressOptionsByCustomer,
    customerNameById,
  ]);

  // Default bank pre-fill on new invoice — first matching by currency,
  // else first active. Skipped when bank_account_ids was already
  // pre-selected from a source PFI via PO chain.
  useEffect(() => {
    if (isEdit) return;
    if (form.bank_account_ids?.length) return;
    const def =
      bankAccountOptions.find((o) => o.raw?.is_default) ||
      bankAccountOptions[0];
    if (def?.value) onF("bank_account_ids", [def.value]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccountOptions, isEdit]);

  // On edit, resolve the previously-saved bank snapshots back to IDs
  // by matching account_number against the live company list.
  useEffect(() => {
    if (!isEdit) return;
    if (form.bank_account_ids?.length) return;
    const snaps = bankSnapshots || [];
    if (!snaps.length || !allBankAccounts.length) return;
    const matchedIds = snaps
      .map((s) => {
        const target = (s.account_no || "").trim();
        if (!target) return null;
        const m = allBankAccounts.find(
          (b) => (b.account_number || "").trim() === target
        );
        return m?._id || null;
      })
      .filter(Boolean);
    if (matchedIds.length) onF("bank_account_ids", matchedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, bankSnapshots, allBankAccounts]);

  // Guard: if we arrived via ?po=<id> but no POV has been dispatched yet,
  // surface a banner and block Save. Mirrors the BE Rule A enforcement.
  // Nothing to invoice = nothing INVOICEABLE (vendor-dispatched POV qty PLUS
  // free-stock/sell-from-stock qty), not just `dispatched`. A stock-fulfilled SO
  // with no POV is still invoiceable, so it must not be blocked here.
  const noDispatchedYet =
    !!queryPoId &&
    !isEdit &&
    !!poCoverage &&
    Number(poCoverage?.totals?.invoiceable || 0) <= 0;

  // ── Load existing invoice for edit ─────────────────────────────────

  useEffect(() => {
    if (!isEdit) return;
    dispatch(getInvoice(editId));
    return () => dispatch(resetInvoiceItem());
  }, [isEdit, editId, dispatch]);

  useEffect(() => {
    if (!isEdit) return;
    const inv = store?.invoiceItem;
    if (!inv?._id) return;
    // Preserve the saved (frozen) rate: mark this currency as already filled so
    // the master auto-fetch effect doesn't overwrite it on load.
    autoFilledForCurrency.current = (inv.currency_code || "").toUpperCase();
    setForm((s) => ({
      ...s,
      invoice_date: inv.invoice_date?.slice(0, 10) || todayISO(),
      due_date: inv.due_date?.slice(0, 10) || "",
      purchase_order_id: inv.purchase_order_id || "",
      customer_po_no: inv.customer_po_no || "",
      reference_no: inv.reference_no || "",
      country_of_destination: inv.country_of_destination || "",
      country_of_origin: inv.country_of_origin || "India",
      customer_id: inv.customer_id || "",
      customer_address_id: inv.customer_address_id || "",
      consignee_id: inv.consignee_id || "",
      consignee_address_id: inv.consignee_address_id || "",
      consignee_same_as_buyer:
        !inv.consignee_id || inv.consignee_id === inv.customer_id,
      notify_party_id: inv.notify_party_id || "",
      notify_party_from_customer: !!inv.notify_party_id,
      notify_party_snapshot: {
        name: inv.notify_party_snapshot?.name || "",
        address_line1:
          inv.notify_party_snapshot?.address_line1 ||
          inv.notify_party_snapshot?.address ||
          "",
        address_line2: inv.notify_party_snapshot?.address_line2 || "",
        city: inv.notify_party_snapshot?.city || "",
        state: inv.notify_party_snapshot?.state || "",
        postcode: inv.notify_party_snapshot?.postcode || "",
        country: inv.notify_party_snapshot?.country || "",
      },
      consignee_from_customer: !!inv.consignee_id,
      consignee_snapshot: {
        name: inv.consignee_snapshot?.name || "",
        address_line1: inv.consignee_snapshot?.address_line1 || "",
        address_line2: inv.consignee_snapshot?.address_line2 || "",
        city: inv.consignee_snapshot?.city || "",
        state: inv.consignee_snapshot?.state || "",
        postcode: inv.consignee_snapshot?.postcode || "",
        country: inv.consignee_snapshot?.country || "",
      },
      currency_code: inv.currency_code || "USD",
      currency_symbol: inv.currency_symbol || "",
      exchange_rate: inv.exchange_rate || "1",
      discount_total: inv.discount_total || "0",
      freight_charges: inv.freight_charges || "0",
      insurance_charges: inv.insurance_charges || "0",
      other_charges: inv.other_charges || "0",
      advance_received: inv.advance_received || "0",
      gst_route: inv.gst_route || "igst_paid",
      lut_no: inv.lut_no || "",
      lut_date: inv.lut_date?.slice(0, 10) || "",
      incoterm: inv.incoterm || "FOB",
      payment_terms: inv.payment_terms || "",
      delivery_terms: inv.delivery_terms || "",
      end_use_code: inv.end_use_code || "",
      preferential_agreement: inv.preferential_agreement || "",
      // ── Shipment & Shipping Bill ──
      mode: inv.mode || "",
      shipping_bill_type: inv.shipping_bill_type || "free",
      shipping_bill_no: inv.shipping_bill_no || "",
      shipping_bill_date: inv.shipping_bill_date?.slice(0, 10) || "",
      custom_exchange_rate: inv.custom_exchange_rate || "",
      port_of_loading_id: inv.port_of_loading_id || "",
      port_of_loading_snapshot: inv.port_of_loading_snapshot || null,
      port_of_discharge_id: inv.port_of_discharge_id || "",
      port_of_discharge_snapshot: inv.port_of_discharge_snapshot || null,
      pre_carriage_by: inv.pre_carriage_by || "",
      place_of_receipt: inv.place_of_receipt || "",
      place_of_delivery: inv.place_of_delivery || "",
      total_packages: inv.total_packages != null ? inv.total_packages : "",
      net_weight_kg: inv.net_weight_kg || "",
      gross_weight_kg: inv.gross_weight_kg || "",
      bl_awb_no: inv.bl_awb_no || "",
      notes_to_buyer: inv.notes_to_buyer || "",
      internal_notes: inv.internal_notes || "",
      declaration_text: inv.declaration_text || "",
      terms: inv.terms || "",
      // Bank accounts aren't stored as IDs on Invoice — only as snapshots.
      // Resolved by account_number against current company bank list in
      // the post-load effect below.
      bank_account_ids: [],
      company_address_id: inv.company_address_id || "",
    }));
    // Preserve saved packing totals — a field with a stored value is treated
    // as a manual override so the auto-sum effect won't clobber it on load.
    packingAuto.current = {
      total_packages: inv.total_packages == null || inv.total_packages === "",
      net_weight_kg: !inv.net_weight_kg,
      gross_weight_kg: !inv.gross_weight_kg,
    };
    setLines(
      (inv.lines || []).map((l, i) => ({
        _id: l._id,
        seq: l.seq || i + 1,
        purchase_order_line_id: l.purchase_order_line_id,
        po_vendor_line_id: l.po_vendor_line_id,
        // Restore the frozen vendor so the dropdown shows it (not blank) on edit.
        vendor_id: l.vendor_id || "",
        product_id: l.product_id,
        product_name: l.product_name,
        product_code: l.product_code,
        part_no: l.part_no,
        description: l.description,
        hsn_code: l.hsn_code,
        customer_reference: l.customer_reference,
        unit: l.unit,
        uqc_code: l.uqc_code,
        qty: l.qty,
        // Full precision — a toFixed(2) here re-truncated the already-saved
        // unit_price EVERY time the invoice was reopened for edit, silently
        // degrading it further on each re-save (same class of bug as the
        // Costing Worksheet's rate-precision race, fixed earlier).
        unit_price: String(l.unit_price ?? 0),
        // Multi-currency: preserve the source currency + frozen source→doc rate.
        source_currency_code: (
          l.source_currency_code ||
          inv.currency_code ||
          "INR"
        ).toUpperCase(),
        cost_exchange_rate:
          l.cost_exchange_rate != null && l.cost_exchange_rate !== ""
            ? String(l.cost_exchange_rate)
            : "1",
        discount_pct: l.discount_pct,
        margin_pct: l.margin_pct,
        tax_pct: l.tax_pct,
        igst_rate_pct: l.igst_rate_pct,
        product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
          ? l.product_rebates_snapshot
          : [],
        product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
          ? l.product_expenses_snapshot
          : [],
        packages: l.packages != null ? l.packages : "",
        net_weight: l.net_weight || "",
        gross_weight: l.gross_weight || "",
      }))
    );
    setBankSnapshots(inv.bank_snapshots || []);
  }, [isEdit, store?.invoiceItem?._id]);

  // ── Notifications ───────────────────────────────────────────────────

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanInvoiceMessage());
  }, [store?.success, store?.error, dispatch]);

  // ── Computed totals ─────────────────────────────────────────────────

  // Line items live in INR (unit_price, rebates, expenses are all
  // captured in home currency). Charges & Totals fields, on the other
  // hand, are entered in the document currency. The Subtotal converts
  // the INR roll-up into the doc currency so the rest of the math
  // (FOB / Grand / Balance) stays in a single currency.
  //   exchange_rate stored as "1 INR = X doc_units"  →  doc = INR × rate.
  // Subtotal exposed in BOTH currencies so the UI can show ₹X · $Y.
  // An LUT export is zero-rated: no IGST is charged and the backend forces
  // igst_amount = 0 on save (invoice.service.ts). The preview must agree.
  const isLut = form.gst_route === "lut_zero_rated";

  const totals = useMemo(() => {
    // Multi-currency (D-7 = A): convert each line's cost source→document
    // currency FIRST (× cost_exchange_rate), then build in the document
    // currency. So the sums below are in the DOCUMENT currency; the INR
    // versions are derived by ÷ exchange_rate (doc-per-₹1) for the ₹ grid.
    const rate = num(form.exchange_rate) || 1;
    let subtotalDoc = 0;
    // IGST is an Indian tax — it must be computed on the INR taxable value,
    // never on the document-currency amount, even for a USD/GBP invoice
    // (mirrors the Costing Worksheet's own igstAmtInr helper: amtDoc ÷
    // exchange_rate × IGST%). Computing it on lineNet directly (the old bug)
    // silently produced a USD-denominated "IGST" a hundred-fold too small.
    let igstInr = 0;
    for (const l of lines) {
      const lineRate = num(l.cost_exchange_rate) || 1;
      const priceDoc = num(l.unit_price) * lineRate;
      const taxable =
        num(l.qty) * priceDoc * (1 - num(l.discount_pct) / 100);
      // Fixed expenses/rebates are in the vendor (source) currency → convert
      // with the same per-line rate as the price.
      const expensesTotal = sumExpenses(
        l.product_expenses_snapshot,
        taxable,
        lineRate
      );
      const afterExpense = taxable + expensesTotal;
      const rebatesTotal = sumRebates(
        l.product_rebates_snapshot,
        afterExpense,
        lineRate
      );
      const afterRebate = afterExpense - rebatesTotal;
      const marginAmt = (afterRebate * num(l.margin_pct)) / 100;
      const lineNet = round2(afterRebate + marginAmt);
      subtotalDoc = round2(subtotalDoc + lineNet);
      if (!isLut) {
        const lineNetInr = rate > 0 ? lineNet / rate : lineNet;
        igstInr = round2(
          igstInr + (lineNetInr * num(l.igst_rate_pct)) / 100
        );
      }
    }
    const subtotal = round2(subtotalDoc); // already document currency
    const subtotalInr = rate > 0 ? round2(subtotalDoc / rate) : subtotalDoc;
    const fob = round2(subtotal - num(form.discount_total));
    // Whole-number customer-currency grand total, mirroring the backend
    // invoice recompute (Math.round) so the preview matches what's saved.
    const grand = Math.round(
      fob +
        num(form.freight_charges) +
        num(form.insurance_charges) +
        num(form.other_charges),
    );
    const balance = round2(grand - num(form.advance_received));
    // IGST is deliberately NOT added into `grand`. On an IGST-paid export the
    // tax is refunded to the exporter, so it is not part of what the customer
    // pays — it is shown for information (and for GSTR-1) only. Folding it into
    // the Grand Total would overstate the invoice's headline figure. Always ₹
    // (see igstInr comment above) — there is no meaningful doc-currency IGST.
    return { subtotalInr, subtotal, fob, igstInr, grand, balance };
  }, [
    lines,
    // Switching to LUT zero-rates the whole invoice — without this dep the IGST
    // total would keep showing the old amount after the route changed.
    isLut,
    form.exchange_rate,
    form.discount_total,
    form.freight_charges,
    form.insurance_charges,
    form.other_charges,
    form.advance_received,
  ]);

  const sym = useMemo(
    () => getCurrencySymbol(form.currency_code) || form.currency_symbol || "",
    [form.currency_code, form.currency_symbol]
  );
  // Unit Price is NATIVE to the vendor (source) currency, which may differ from
  // the invoice (document) currency — label that column with the source symbol.
  // (srcSym removed — the per-line source-currency symbol is rendered inside
  // the Costing Worksheet now.)

  // ── UQC back-fill ───────────────────────────────────────────────────
  //
  // Lines get seeded the moment the PO / SO data arrives, which is usually
  // BEFORE the UOM master's dropdown request has come back. At that point the
  // resolver has nothing to look up against, so every line was being stamped
  // with the GST catch-all "OTH" — even a plain "KG", which should be "KGS".
  // That wrong code then went straight onto GSTR-1 and the Shipping Bill.
  //
  // Once the master lands, re-derive any code we could not resolve at seed time.
  // Only blank / "OTH" cells are touched: a code the master actually resolved is
  // left alone, so nothing an operator or the backend set gets overwritten.
  useEffect(() => {
    if (!uomReady) return;
    setLines((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        if (l.uqc_code && l.uqc_code !== "OTH") return l;
        const resolved = uqcFor(l.unit);
        if (!resolved || resolved === l.uqc_code) return l;
        changed = true;
        return { ...l, uqc_code: resolved };
      });
      // Return the SAME array when nothing moved — a fresh array every time
      // would re-render the whole grid on every unrelated state change.
      return changed ? next : prev;
    });
  }, [uomReady, uqcFor, lines.length]);

  // ── Line helpers ────────────────────────────────────────────────────

  // Stable handler identities so row-level memoisation stays effective
  // when the table grows into the hundreds of rows.
  const updateLine = useCallback(
    (idx, patch) =>
      setLines((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
      ),
    [],
  );
  // (Per-line error clearing + row delete are now handled inside the Costing
  // Worksheet; the old table's `clearLineError`/`removeLine` were removed.)

  // ── "Add lines from PO" picker (edit mode only) ─────────────────────
  // Surfaces PO lines that have dispatched-but-not-yet-invoiced qty
  // available — typically lines that landed on a POV after the draft
  // was first created.
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addableLines, setAddableLines] = useState([]);
  const [addPicks, setAddPicks] = useState({});
  const addPg = usePagination(addableLines.length);
  // (The old Step-3 line Import/Export state was retired — the Costing
  // Worksheet's own import/export bar handles it now.)

  // "+ Add items from another SO" — same-customer multi-SO picker.
  const [soPickerOpen, setSoPickerOpen] = useState(false);
  const appendSoLines = (picked) => {
    setSoPickerOpen(false);
    if (!picked?.length) return;
    // Learn each picked SO's advance so the preview can include it.
    setSoAdvanceById((m) => {
      const next = { ...m };
      for (const row of picked) {
        if (row.purchase_order_id && row.so_advance_amount != null)
          next[row.purchase_order_id] = Number(row.so_advance_amount || 0);
      }
      return next;
    });
    setLines((prev) => {
      const next = prev.slice();
      for (const row of picked) {
        // Merge same SO line (sum qty); else append.
        const idx = next.findIndex(
          (l) => l.purchase_order_line_id === row.purchase_order_line_id
        );
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            qty: String(Number(next[idx].qty || 0) + Number(row.qty || 0)),
          };
        } else {
          next.push(row);
        }
      }
      return next.map((l, i) => ({ ...l, seq: i + 1 }));
    });
  };

  const openAddFromPo = useCallback(async () => {
    if (!form.purchase_order_id) return;
    setAddModalOpen(true);
    setAddLoading(true);
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.invoices.poAddable}/${form.purchase_order_id}`,
        { params: editId ? { exclude_invoice_id: editId } : {} }
      );
      // Hide products that are already on the draft — the line items
      // table is the source of truth for "already added", and dedupe is
      // by product code (matches the import flow).
      const usedCodes = new Set(
        (lines || [])
          .map((l) => (l.product_code || "").toLowerCase())
          .filter(Boolean),
      );
      const rows = (resp?.data?.data || []).filter(
        (r) => !usedCodes.has((r.product_code || "").toLowerCase()),
      );
      setAddableLines(rows);
      const picks = {};
      rows.forEach((r) => {
        picks[r.purchase_order_line_id] = {
          selected: false,
          qty: r.available,
        };
      });
      setAddPicks(picks);
    } catch (err) {
      Notification(
        err?.response?.data?.message || t("Failed to load addable lines"),
        "danger"
      );
      setAddModalOpen(false);
    } finally {
      setAddLoading(false);
    }
  }, [form.purchase_order_id, editId, t, lines]);

  const togglePick = (poLineId) => {
    setAddPicks((p) => ({
      ...p,
      [poLineId]: { ...p[poLineId], selected: !p[poLineId]?.selected },
    }));
  };
  const setPickQty = (poLineId, qty) => {
    setAddPicks((p) => ({
      ...p,
      [poLineId]: { ...p[poLineId], qty },
    }));
  };

  const confirmAddFromPo = () => {
    const toAppend = [];
    let nextSeq = lines.length;
    for (const row of addableLines) {
      const pick = addPicks[row.purchase_order_line_id];
      if (!pick?.selected) continue;
      const qty = Number(pick.qty || 0);
      if (qty <= 0) continue;
      // Merge into the existing draft line for the same product so the
      // product column never duplicates — qty is summed in place.
      const codeKey = (row.product_code || "").toLowerCase();
      const existingIdx = codeKey
        ? lines.findIndex(
            (l) => (l.product_code || "").toLowerCase() === codeKey,
          )
        : lines.findIndex(
            (l) => l.purchase_order_line_id === row.purchase_order_line_id,
          );
      if (existingIdx >= 0) {
        const cur = Number(lines[existingIdx].qty || 0);
        setLines((prev) =>
          prev.map((l, i) =>
            i === existingIdx ? { ...l, qty: String(cur + qty) } : l
          )
        );
        continue;
      }
      nextSeq += 1;
      toAppend.push({
        seq: nextSeq,
        purchase_order_line_id: row.purchase_order_line_id,
        po_vendor_line_id: undefined,
        product_id: row.product_id,
        product_name: row.product_name || "",
        product_code: row.product_code || "",
        // PO is multi-vendor at line level — carry the SO line's own vendor
        // forward (was missing → the invoice line showed "Pick vendor").
        vendor_id: row.vendor_id || "",
        vendor_name: row.vendor_name || "",
        part_no: row.part_no || "",
        description: row.product_name || "",
        hsn_code: row.hsn_code || "",
        customer_reference: row.customer_reference || "",
        unit: row.unit || "Nos",
        uqc_code: uqcFor(row.unit),
        qty: String(qty),
        // Full precision — a toFixed(2) here silently truncated a low
        // per-unit price that a huge qty amplifies into a large value gap.
        unit_price: String(row.unit_price ?? 0),
        // Multi-currency: carry the SO line's source currency + frozen
        // source→document rate so the line total converts like every other
        // line (was missing here → the total showed the raw source value
        // unconverted, e.g. ₹25,000 printed as €25,000).
        source_currency_code: row.source_currency_code || "INR",
        cost_exchange_rate:
          row.cost_exchange_rate != null && row.cost_exchange_rate !== ""
            ? String(row.cost_exchange_rate)
            : "1",
        // Carry the full costing from the SO line so the invoice total
        // equals the SO total (was hardcoded 0 / margin dropped).
        discount_pct: String(row.discount_pct || 0),
        margin_pct: String(row.margin_pct || 0),
        tax_pct: "0",
        igst_rate_pct: String(row.tax_pct || 0),
        product_rebates_snapshot: Array.isArray(row.product_rebates_snapshot)
          ? row.product_rebates_snapshot
          : [],
        product_expenses_snapshot: Array.isArray(row.product_expenses_snapshot)
          ? row.product_expenses_snapshot
          : [],
        // Packing carried from the SO line (originally from quotation).
        packages: row.package_count != null ? String(row.package_count) : "",
        net_weight: row.net_weight_kg != null ? String(row.net_weight_kg) : "",
        gross_weight:
          row.gross_weight_kg != null ? String(row.gross_weight_kg) : "",
      });
    }
    if (toAppend.length) {
      setLines((prev) => [...prev, ...toAppend]);
    }
    setAddModalOpen(false);
    setAddableLines([]);
    setAddPicks({});
  };


  // ── Validation + submit ─────────────────────────────────────────────

  // Per-step validators. Each returns {} or an errors map. Used to gate
  // Next + the final Save call. Composed into validate() below.
  const stepValidators = {
    parties: () => {
      const e = {};
      if (!form.purchase_order_id) e.purchase_order_id = "PO required";
      if (!form.customer_id) e.customer_id = "Customer required";
      if (!form.consignee_snapshot?.name)
        e.consignee_id = "Consignee name required";
      return e;
    },
    header: () => {
      const e = {};
      if (!form.invoice_date) e.invoice_date = "Invoice date required";
      else if (isClosedPeriod(form.invoice_date, booksClosedUpto))
        e.invoice_date = closedPeriodMessage(booksClosedUpto, "invoice date");
      if (!form.currency_code) e.currency_code = "Currency required";
      return e;
    },
    items: () => {
      const e = {};
      if (!lines.length) e.lines = "At least one line item required";
      for (let i = 0; i < lines.length; i++) {
        if (num(lines[i].qty) <= 0) e[`line_${i}_qty`] = "Qty > 0";
        if (!lines[i].hsn_code) e[`line_${i}_hsn`] = "HSN required";
      }
      // Shipment fields are now required (shipping module retired — this
      // data is captured on the invoice instead).
      if (!form.mode) e.mode = "Mode required";
      if (!form.port_of_loading_id && !form.port_of_loading_snapshot)
        e.port_of_loading_id = "Port of Loading required";
      // Port of Discharge, Shipping Bill No./Date and Place of Delivery are
      // optional — they aren't always known at invoice time.
      if (!form.total_packages || num(form.total_packages) <= 0)
        e.total_packages = "Total Packages required";
      if (!form.net_weight_kg || num(form.net_weight_kg) <= 0)
        e.net_weight_kg = "Net Weight required";
      if (!form.gross_weight_kg || num(form.gross_weight_kg) <= 0)
        e.gross_weight_kg = "Gross Weight required";
      return e;
    },
    tax: () => {
      const e = {};
      if (form.gst_route === "lut_zero_rated") {
        if (!form.lut_no) e.lut_no = "LUT no required for zero-rated route";
        if (!form.lut_date) e.lut_date = "LUT date required";
      }
      return e;
    },
  };

  const validateStep = (idx) => {
    const key = STEPS[idx]?.key;
    if (!key || !stepValidators[key]) return true;
    const e = stepValidators[key]();
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  const validate = () => {
    const e = {
      ...stepValidators.parties(),
      ...stepValidators.header(),
      ...stepValidators.items(),
      ...stepValidators.tax(),
    };
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Wizard navigation handlers ──────────────────────────────────────
  const goToStep = (idx, { skipValidate = false } = {}) => {
    if (idx === activeStep) return;
    if (idx < 0 || idx >= STEPS.length) return;
    if (idx > activeStep && !skipValidate) {
      if (!validateStep(activeStep)) {
        Notification(
          "Validation",
          t("Please fix the highlighted fields first."),
          "warning",
        );
        return;
      }
    }
    setVisited((prev) => new Set(prev).add(idx));
    setActiveStep(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onNext = () => goToStep(activeStep + 1);
  const onBack = () => goToStep(activeStep - 1, { skipValidate: true });

  const buildPayload = () => {
    // class-validator @IsOptional treats "" as a value and runs the
    // validator — empty string fails @IsUUID / @IsDateString. Strip
    // these optional fields when blank so they arrive as undefined.
    const OPTIONAL_NULLABLE = [
      "due_date",
      "lut_date",
      "notify_party_id",
      "consignee_id",
      "consignee_address_id",
      "customer_address_id",
      "company_address_id",
      "pfi_id",
      "quotation_id",
      "shipping_id",
      // Shipment & Shipping Bill — blank → undefined so @IsEnum/@IsUUID/
      // @IsDateString/@IsNumberString don't run on empty strings.
      "mode",
      "shipping_bill_date",
      "port_of_loading_id",
      "port_of_discharge_id",
      "net_weight_kg",
      "gross_weight_kg",
      "custom_exchange_rate",
    ];
    const cleaned = { ...form };
    OPTIONAL_NULLABLE.forEach((k) => {
      if (cleaned[k] === "") cleaned[k] = undefined;
    });
    // Charge/total fields are @IsNumberString on the DTO — an emptied input
    // ("") is NOT skipped by @IsOptional (that only skips undefined/null), so
    // it fails validation. Coerce blanks to "0" (they feed grand_total).
    [
      "discount_total",
      "freight_charges",
      "insurance_charges",
      "other_charges",
      "advance_received",
    ].forEach((k) => {
      if (cleaned[k] === "" || cleaned[k] == null) cleaned[k] = "0";
    });
    // UI-only flag — not an invoice field.
    delete cleaned.consignee_same_as_buyer;
    // total_packages is @IsInt — send a number or omit.
    cleaned.total_packages =
      cleaned.total_packages === "" || cleaned.total_packages == null
        ? undefined
        : Number(cleaned.total_packages);
    return {
    ...cleaned,
    lines: lines.map((l) => ({
      _id: l._id,
      seq: l.seq,
      purchase_order_line_id: l.purchase_order_line_id,
      po_vendor_line_id: l.po_vendor_line_id,
      // Persist the frozen vendor so an edit re-shows it (no blank dropdown).
      vendor_id: l.vendor_id || undefined,
      product_id: l.product_id,
      product_name: l.product_name,
      product_code: l.product_code,
      part_no: l.part_no,
      description: l.description,
      hsn_code: l.hsn_code,
      customer_reference: l.customer_reference,
      unit: l.unit,
      uqc_code: l.uqc_code,
      qty: String(l.qty),
      unit_price: String(l.unit_price),
      // Multi-currency: persist the source currency + frozen source→doc rate so
      // the backend recompute converts each line the same way.
      source_currency_code: (l.source_currency_code || "INR").toUpperCase(),
      cost_exchange_rate: String(
        l.cost_exchange_rate != null && l.cost_exchange_rate !== ""
          ? l.cost_exchange_rate
          : 1
      ),
      discount_pct: String(l.discount_pct || 0),
      margin_pct: String(l.margin_pct || 0),
      tax_pct: String(l.tax_pct || 0),
      igst_rate_pct: String(l.igst_rate_pct || 0),
      product_rebates_snapshot: l.product_rebates_snapshot || [],
      product_expenses_snapshot: l.product_expenses_snapshot || [],
      // Packing List (§3b) — blank → omit so optional validators don't run.
      packages:
        l.packages === "" || l.packages == null
          ? undefined
          : Number(l.packages),
      net_weight:
        l.net_weight === "" || l.net_weight == null
          ? undefined
          : String(l.net_weight),
      gross_weight:
        l.gross_weight === "" || l.gross_weight == null
          ? undefined
          : String(l.gross_weight),
    })),
    bank_snapshots: (() => {
      // Build one snapshot per picked bank id. Falls back to any
      // hydrated snapshots, and finally lets the BE substitute the
      // company default at issue time.
      const ids = form.bank_account_ids || [];
      const picked = ids
        .map((id) => allBankAccounts.find((b) => b._id === id))
        .filter(Boolean);
      if (picked.length) {
        return picked.map((b) => ({
          name: b.bank_name || "",
          account_no: b.account_number || "",
          beneficiary: b.account_holder_name || "",
          ad_code: b.ad_code || "",
          swift_code: b.swift_code || "",
          branch: b.branch_name || "",
          currency_code: b.currency_code || "",
        }));
      }
      return bankSnapshots.length ? bankSnapshots : undefined;
    })(),
    };
  };

  const onSave = async () => {
    if (!validate()) {
      Notification("Validation", "Please fix the highlighted fields.", "warning");
      return;
    }
    // A held invoice (TOLERANCE_THREE_WAY_MATCH_PLAN.md §8.1) still saves
    // fine as draft — only issue() blocks it — so ask here whether to clear
    // the hold now (override) rather than leave it silently unresolved.
    let override = false;
    if (isEdit && store?.invoiceItem?.tolerance_hold) {
      const result = await mySwal.fire({
        title: t("Outside tolerance"),
        text:
          store.invoiceItem.tolerance_hold_reason ||
          t("This invoice has a qty/price tolerance hold."),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Override & Clear Hold"),
        cancelButtonText: t("Save, keep it held"),
        customClass: {
          confirmButton: "btn btn-warning",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      });
      override = !!result.isConfirmed;
    }
    setBusy(true);
    try {
      if (isEdit) {
        const r = await dispatch(
          updateInvoice({
            id: editId,
            data: { ...buildPayload(), ...(override ? { override: true } : {}) },
          })
        ).unwrap();
        const newId = r?.invoiceItem?._id || editId;
        navigate(`${appsRoot}/invoices/view/${newId}`);
      } else {
        const r = await dispatch(createInvoice(buildPayload())).unwrap();
        const newId = r?.invoiceItem?._id;
        if (newId) navigate(`${appsRoot}/invoices/view/${newId}`);
        else navigate(`${appsRoot}/invoices`);
      }
    } catch (_err) {
      // toast surfaced via the store-effect listener
    } finally {
      setBusy(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  // Reusable Consignee / Notify Party card with radio toggle + optional
  // "From Customer Master" picker + structured address fields.
  const renderPartyCard = ({
    title,
    subtitle,
    flagKey,
    idKey,
    snapKey,
    required,
    errorKey,
  }) => {
    const snap = form[snapKey] || {};
    const fromCustomer = !!form[flagKey];
    const updateSnap = (patch) =>
      onF(snapKey, { ...(form[snapKey] || {}), ...patch });
    return (
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
          {title}
          {subtitle && (
            <small className="text-muted ms-1">({subtitle})</small>
          )}
        </h5>
        <Row>
            <Col md="12" className="mb-1">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <Label className="form-label mb-0 me-1">
                  {t("From Customer?")}
                </Label>
                <div className="form-check form-check-inline mb-0">
                  <Input
                    type="radio"
                    id={`${flagKey}-yes`}
                    name={flagKey}
                    checked={fromCustomer}
                    onChange={() => onF(flagKey, true)}
                  />
                  <Label
                    className="form-check-label"
                    for={`${flagKey}-yes`}
                  >
                    {t("Yes")}
                  </Label>
                </div>
                <div className="form-check form-check-inline mb-0">
                  <Input
                    type="radio"
                    id={`${flagKey}-no`}
                    name={flagKey}
                    checked={!fromCustomer}
                    onChange={() => {
                      setForm((s) => ({
                        ...s,
                        [flagKey]: false,
                        [idKey]: "",
                      }));
                    }}
                  />
                  <Label className="form-check-label" for={`${flagKey}-no`}>
                    {t("No")}
                  </Label>
                </div>
              </div>
            </Col>

            {fromCustomer && (
              <Col md="12" className="mb-1">
                <Label className="form-label">{t("Pick Customer")}</Label>
                <EntitySearchSelect
                  kind="customer"
                  isClearable
                  // Show the name from the snapshot instantly (no ?ids= flash);
                  // the snapshot is the source of truth for this party.
                  value={
                    form[idKey]
                      ? snap.name
                        ? { value: form[idKey], label: snap.name }
                        : // No snapshot name yet — pass the bare id so
                          // EntitySearchSelect resolves the real label via ?ids=
                          // instead of showing a generic "(customer)".
                          form[idKey]
                      : null
                  }
                  onChange={(opt) => {
                    const v = opt ? opt.value : "";
                    if (v) {
                      prefillSnapshotFromCustomer(v, snapKey, idKey);
                    } else {
                      // Clearing the picker should wipe both the FK and
                      // the auto-filled snapshot so the operator starts
                      // clean. Manual edits done after the pick are lost
                      // — that's the expected meaning of "Clear".
                      setForm((s) => ({
                        ...s,
                        [idKey]: "",
                        [snapKey]: {
                          name: "",
                          address_line1: "",
                          address_line2: "",
                          city: "",
                          state: "",
                          postcode: "",
                          country: "",
                        },
                      }));
                    }
                  }}
                  placeholder={t("Search & select customer")}
                />
                <small className="text-muted">
                  {t(
                    "Picking a customer pre-fills the fields below. You can edit any field after."
                  )}
                </small>
              </Col>
            )}

            <Col md="6" className="mb-1">
              <Label className="form-label">
                {t("Name")}
                {required && <span className="text-danger"> *</span>}
              </Label>
              <Input
                value={snap.name || ""}
                onChange={(e) => updateSnap({ name: e.target.value })}
                placeholder={t("Entity name")}
                maxLength={200}
              />
              {errorKey && errors[errorKey] && (
                <FormFeedback className="d-block">
                  {errors[errorKey]}
                </FormFeedback>
              )}
            </Col>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Address Line 1")}</Label>
              <Input
                value={snap.address_line1 || ""}
                onChange={(e) =>
                  updateSnap({ address_line1: e.target.value })
                }
                maxLength={200}
              />
            </Col>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Address Line 2")}</Label>
              <Input
                value={snap.address_line2 || ""}
                onChange={(e) =>
                  updateSnap({ address_line2: e.target.value })
                }
                maxLength={200}
              />
            </Col>
            {/* Country first — it drives the State list, which drives City. */}
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Country")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={countryOptions}
                value={
                  countryOptions.find((o) => o.value === snap.country) ||
                  // A snapshot country the master has never heard of (typed
                  // years ago, or a country since deactivated) must still show.
                  (snap.country
                    ? { value: snap.country, label: snap.country }
                    : null)
                }
                onChange={(opt) =>
                  // Changing the country invalidates the state and city under it.
                  updateSnap({
                    country: opt ? opt.value : "",
                    state: "",
                    city: "",
                  })
                }
                placeholder={t("Select country")}
              />
            </Col>
            {/* State + City suggest from the masters, still accept free text. */}
            <PlainGeoFields
              country={snap.country}
              countryList={countryOptions}
              state={snap.state}
              city={snap.city}
              onChange={updateSnap}
              colProps={{ md: "4" }}
            />
            <Col md="4" className="mb-1">
              <Label className="form-label">{t("Postcode")}</Label>
              <Input
                value={snap.postcode || ""}
                onChange={(e) => updateSnap({ postcode: e.target.value })}
                maxLength={30}
              />
            </Col>
          </Row>
      </div>
    );
  };

  if (isEdit && !store?.invoiceItem?._id) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }

  // Block edit on non-draft.
  if (isEdit && store?.invoiceItem?.status && store.invoiceItem.status !== "draft") {
    return (
      <Card>
        <CardBody className="text-center py-4">
          <AlertTriangle size={32} className="text-warning mb-2" />
          <h5>{t("This invoice is no longer a draft")}</h5>
          <p className="text-muted small">
            {t(
              "Only DRAFT invoices can be fully edited. Issued invoices allow limited edits (shipping, advance, notes) only on the detail page."
            )}
          </p>
          <Button
            color="primary"
            outline
            onClick={() => navigate(`${appsRoot}/invoices/view/${editId}`)}
          >
            {t("Open detail page")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!isEdit && !canAdd) {
    return <div className="p-3 text-muted">{t("No permission")}</div>;
  }
  if (isEdit && !canEdit) {
    return <div className="p-3 text-muted">{t("No permission")}</div>;
  }

  return (
    <Fragment>
      <div className="main-content invoice-add quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEdit ? t("Edit Invoice") : t("Add Invoice")}
            {isEdit && store?.invoiceItem?.voucher_no
              ? ` - ${store.invoiceItem.voucher_no}`
              : ""}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/invoices`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <WizardHeader
          steps={STEPS}
          activeStep={activeStep}
          visited={visited}
          onStepClick={(i) => goToStep(i)}
          isEdit={isEdit}
        />

      {noDispatchedYet && (
        <Card className="mb-2 border-danger">
          <CardBody className="py-2">
            <div className="d-flex align-items-start">
              <AlertTriangle size={18} className="text-danger me-1 mt-25" />
              <div className="small">
                <strong>{t("Nothing to invoice yet on this SO.")}</strong>{" "}
                {t(
                  "A Commercial Invoice can only be raised for qty that is already dispatched on a POV (status: dispatched / closed) or available in free stock to sell from."
                )}{" "}
                {t(
                  "Dispatch a POV from the SO detail page (or ensure the product has free stock), then come back here."
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!noDispatchedYet && droppedLineCount > 0 && (
        <Card className="mb-2 border-info">
          <CardBody className="py-2">
            <div className="d-flex align-items-start">
              <AlertTriangle size={18} className="text-info me-1 mt-25" />
              <div className="small">
                <strong>
                  {t(
                    "{{shown}} of {{total}} PO lines are dispatched and pre-filled.",
                    {
                      shown: lines.length,
                      total: lines.length + droppedLineCount,
                    }
                  )}
                </strong>{" "}
                {t(
                  "The other {{count}} line(s) had no dispatched qty yet and were dropped from this invoice.",
                  { count: droppedLineCount }
                )}{" "}
                {t(
                  "Once the remaining POVs are dispatched, raise another invoice from the PO Coverage tab — already-invoiced qty is tracked automatically."
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!form.purchase_order_id && (
        <Card className="mb-2 border-warning">
          <CardBody className="py-2">
            <div className="d-flex align-items-start">
              <AlertTriangle
                size={18}
                className="text-warning me-1 mt-25 flex-shrink-0"
              />
              <div className="small">
                <strong>{t("No source PO selected")}.</strong>{" "}
                {t(
                  "Open a Purchase Order's detail page and click 'Generate Invoice' to pre-fill customer, currency and lines automatically."
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          {/* minHeight override: the shared wizard reserves 300px per step,
              which left a large blank gap under short steps (e.g. Invoice
              Details). Footer carries its own separation, so size to content. */}
          <div className="wizard-step-body" style={{ minHeight: 0 }}>
      {/* ─── STEP 1 of 4 — Parties ──────────────────────────────────── */}
      {activeStep === 0 && (
        <Fragment>
      {/* ── Customer (Bill-to) ──────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("Customer (Bill-to)")}
          </h5>
        <div>
          <Row>
            <Col md="6" className="mb-1">
              <Label className="form-label">
                {t("Customer")} <span className="text-danger">*</span>
              </Label>
              <EntitySearchSelect
                kind="customer"
                value={form.customer_id || null}
                isClearable={false}
                onChange={(opt) => {
                  const v = opt ? opt.value : "";
                  setForm((s) => {
                    const sameAsConsignee = s.consignee_id === s.customer_id;
                    return {
                      ...s,
                      customer_id: v,
                      customer_address_id: "",
                      consignee_id: s.consignee_id || v,
                      ...(sameAsConsignee && {
                        consignee_id: v,
                        consignee_address_id: "",
                      }),
                    };
                  });
                }}
                isDisabled={!!queryPoId && !isEdit}
              />
              {errors.customer_id && (
                <FormFeedback className="d-block">
                  {errors.customer_id}
                </FormFeedback>
              )}
            </Col>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Bill-to Address")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={addressOptionsByCustomer[form.customer_id] || []}
                value={
                  (
                    addressOptionsByCustomer[form.customer_id] || []
                  ).find((o) => o.value === form.customer_address_id) || null
                }
                onChange={(opt) =>
                  onF("customer_address_id", opt ? opt.value : "")
                }
                isDisabled={!form.customer_id}
                placeholder={(() => {
                  if (!form.customer_id) return t("Pick customer first");
                  const opts = addressOptionsByCustomer[form.customer_id];
                  // Distinguish "still loading" from "this customer genuinely
                  // has none". A bare "Select address" on an empty list reads
                  // as a bug when it is actually missing master data.
                  if (!opts) return t("Loading addresses…");
                  if (!opts.length)
                    return t("No addresses on this customer — add one in Customers");
                  return t("Select address");
                })()}
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* ── Consignee (Ship-to) — same style as the Sales Order form ── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">{t("Consignee (Ship-to)")}</h5>
        <Row>
          <Col md="6" className="mb-1">
            <div className="d-flex align-items-center justify-content-between">
              <Label className="form-label mb-0">{t("Consignee")}</Label>
              <div className="form-check mb-0">
                <Input
                  type="checkbox"
                  id="inv-consignee-same-as-buyer"
                  checked={form.consignee_same_as_buyer !== false}
                  onChange={(e) =>
                    onF("consignee_same_as_buyer", e.target.checked)
                  }
                />
                <Label
                  for="inv-consignee-same-as-buyer"
                  className="form-check-label small"
                >
                  {t("Same as Buyer")}
                </Label>
              </div>
            </div>
            <EntitySearchSelect
              kind="customer"
              isClearable
              isDisabled={form.consignee_same_as_buyer !== false}
              value={form.consignee_id || null}
              onChange={(opt) => onF("consignee_id", opt ? opt.value : "")}
              placeholder={t("Search & select consignee")}
            />
            {errors.consignee_id && (
              <FormFeedback className="d-block">
                {errors.consignee_id}
              </FormFeedback>
            )}
          </Col>
          <Col md="6" className="mb-1">
            <Label className="form-label">{t("Consignee Address")}</Label>
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={form.consignee_same_as_buyer !== false}
              options={addressOptionsByCustomer[form.consignee_id] || []}
              value={
                (addressOptionsByCustomer[form.consignee_id] || []).find(
                  (o) => o.value === form.consignee_address_id
                ) || null
              }
              onChange={(opt) =>
                onF("consignee_address_id", opt ? opt.value : "")
              }
              placeholder={
                form.consignee_id
                  ? t("Select address")
                  : t("Pick a consignee first")
              }
            />
          </Col>
        </Row>
      </div>

      {/* ── Notify Party ────────────────────────────────────────────── */}
      {renderPartyCard({
        title: t("Notify Party"),
        flagKey: "notify_party_from_customer",
        idKey: "notify_party_id",
        snapKey: "notify_party_snapshot",
        required: false,
      })}

      {/* ── Company Address (Shipper) + Bank Account(s) ────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("Company Address & Bank")}
          </h5>
        <div>
          <Row>
            <Col md="6" className="mb-1">
              <Label className="form-label">
                {t("Company Address (Shipper)")}
              </Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={companyAddressOptions}
                value={
                  companyAddressOptions.find(
                    (o) => o.value === form.company_address_id
                  ) || null
                }
                onChange={(opt) =>
                  onF("company_address_id", opt ? opt.value : "")
                }
                placeholder={
                  companyAddressOptions.length
                    ? t("Auto-picked default corporate address")
                    : t("No company addresses configured")
                }
              />
            </Col>
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("Bank Account(s)")}</Label>
              <Select
                isMulti
                classNamePrefix="select"
                options={bankAccountOptions}
                value={bankAccountOptions.filter((o) =>
                  (form.bank_account_ids || []).includes(o.value)
                )}
                onChange={(opts) =>
                  onF(
                    "bank_account_ids",
                    (opts || []).map((o) => o.value)
                  )
                }
                placeholder={
                  bankAccountOptions.length
                    ? t("Pick one or more bank accounts")
                    : t("No bank accounts on Company Profile")
                }
              />
            </Col>
          </Row>
        </div>
      </div>

        </Fragment>
      )}

      {/* ─── STEP 2 of 4 — Header ───────────────────────────────────── */}
      {activeStep === 1 && (
        <Fragment>
      {/* ── Invoice Details ──────────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("Invoice Details")}
          </h5>
        <div>
          <Row>
            <Col md="4" className="mb-2">
              <Label className="form-label">
                {t("Invoice Date")} <span className="text-danger">*</span>
              </Label>
              <DateInput
                id="inv-invoice-date"
                value={form.invoice_date}
                onChange={(_d, _s, iso) => onF("invoice_date", iso || "")}
                invalid={!!errors.invoice_date || isClosedPeriod(form.invoice_date, booksClosedUpto)}
              />
              {errors.invoice_date ? (
                <FormFeedback className="d-block">
                  {errors.invoice_date}
                </FormFeedback>
              ) : isClosedPeriod(form.invoice_date, booksClosedUpto) ? (
                <FormFeedback className="d-block">
                  {closedPeriodMessage(booksClosedUpto, "invoice date")}
                </FormFeedback>
              ) : null}
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Due Date")}</Label>
              <DateInput
                id="inv-due-date"
                value={form.due_date}
                onChange={(_d, _s, iso) => onF("due_date", iso || "")}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Buyer's PO #")}</Label>
              <Input
                value={form.customer_po_no}
                onChange={(e) => onF("customer_po_no", e.target.value)}
                placeholder="e.g. PO-2026-018"
                maxLength={60}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Reference No.")}</Label>
              <Input
                value={form.reference_no}
                onChange={(e) => onF("reference_no", e.target.value)}
                placeholder="e.g. REF-2026-018"
                maxLength={100}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Country of Destination")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={countryOptions}
                value={
                  countryOptions.find(
                    (o) => o.value === form.country_of_destination
                  ) ||
                  (form.country_of_destination
                    ? {
                        value: form.country_of_destination,
                        label: form.country_of_destination,
                      }
                    : null)
                }
                onChange={(opt) =>
                  onF("country_of_destination", opt ? opt.value : "")
                }
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Country of Origin")}</Label>
              <Select
                classNamePrefix="select"
                options={countryOptions}
                value={
                  countryOptions.find(
                    (o) => o.value === form.country_of_origin
                  ) ||
                  (form.country_of_origin
                    ? {
                        value: form.country_of_origin,
                        label: form.country_of_origin,
                      }
                    : null)
                }
                onChange={(opt) =>
                  onF("country_of_origin", opt ? opt.value : "India")
                }
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Currency")}</Label>
              <Select
                classNamePrefix="select"
                isDisabled={!!form.purchase_order_id}
                options={currencyOptions}
                value={
                  currencyOptions.find(
                    (o) => o.value === form.currency_code
                  ) || null
                }
                onChange={(opt) =>
                  onF("currency_code", opt ? opt.value : "")
                }
              />
              <small className="text-muted">{t("Pulled from SO")}</small>
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Incoterm")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={INCOTERMS_OPTIONS}
                value={
                  INCOTERMS_OPTIONS.find((o) => o.value === form.incoterm) ||
                  null
                }
                onChange={(opt) => onF("incoterm", opt ? opt.value : "")}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Payment Terms")}</Label>
              <Input
                value={form.payment_terms}
                onChange={(e) => onF("payment_terms", e.target.value)}
                placeholder="e.g. Against documents"
                maxLength={100}
              />
            </Col>
          </Row>
        </div>
      </div>

        </Fragment>
      )}

      {/* ─── STEP 3 of 4 — Items & Charges (Shipment + Line Items) ──── */}
      {activeStep === 2 && (
        <Fragment>

      {/* ── Lines ────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mt-2 mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h5 className="mb-0">{t("Line Items")}</h5>
            {/* The source→document exchange rate now lives inside the Costing
                Worksheet's own per-currency rate box (below). */}
          </div>
          <div className="d-flex flex-wrap gap-1">
            {/* Excel Import/Export now lives inside the Costing Worksheet's own
                bar (below), so the old invoice line Import/Export buttons were
                retired. The SO pickers stay here. */}
            {isEdit && form.purchase_order_id && (
              <Button
                size="sm"
                color="primary"
                outline
                onClick={openAddFromPo}
                type="button"
              >
                <Plus size={14} className="me-1" />
                {t("Add lines from SO")}
              </Button>
            )}
            {form.customer_id && (
              <Button
                size="sm"
                color="primary"
                outline
                onClick={() => setSoPickerOpen(true)}
                type="button"
              >
                <Plus size={14} className="me-1" />
                {t("Add items from another SO")}
              </Button>
            )}
          </div>
        </div>
        <div>
          <InvoiceLineWorksheet
            lines={lines}
            onLinesChange={setLines}
            uqcFor={uqcFor}
            expenseOptions={expenseOptions}
            rebateOptions={rebateOptions}
            docCurrencyCode={form.currency_code || "INR"}
            baseCurrencyCode="INR"
            freightTotal={form.freight_charges}
            onFreightChange={(v) => onF("freight_charges", v)}
            isLut={isLut}
            exchangeRate={num(form.exchange_rate) || 1}
          />
          {errors.lines && (
            <div className="text-danger small mt-1">{errors.lines}</div>
          )}
        </div>
      </div>

      {/* ── Shipment & Shipping Bill (optional now; recorded after goods ship) ── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
          {t("Shipment & Shipping Bill")}
          <small className="text-muted ms-1">
            ({t("required fields marked")} <span className="text-danger">*</span>)
          </small>
        </h5>
        <div>
          <Row>
            <Col md="4" className="mb-2">
              <Label className="form-label">
                {t("Mode")} <span className="text-danger">*</span>
              </Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={SHIPPING_MODE_OPTIONS}
                value={
                  SHIPPING_MODE_OPTIONS.find((o) => o.value === form.mode) ||
                  null
                }
                onChange={(opt) => onF("mode", opt ? opt.value : "")}
              />
              {errors.mode && (
                <div className="text-danger small mt-25">{t("Mode required")}</div>
              )}
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Export Scheme")}</Label>
              <Select
                classNamePrefix="select"
                options={SHIPPING_BILL_TYPE_OPTIONS}
                value={
                  SHIPPING_BILL_TYPE_OPTIONS.find(
                    (o) => o.value === form.shipping_bill_type
                  ) || SHIPPING_BILL_TYPE_OPTIONS[0]
                }
                onChange={(opt) =>
                  onF("shipping_bill_type", opt ? opt.value : "free")
                }
              />
              <small className="text-muted">
                {t('Renders "Export Under <scheme>" on the invoice PDF.')}
              </small>
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">
                {isSeaMode ? "BL No." : "AWB / BL No."}
              </Label>
              <Input
                value={form.bl_awb_no}
                onChange={(e) => onF("bl_awb_no", e.target.value)}
                maxLength={60}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">
                {t("Shipping Bill No.")}
              </Label>
              <Input
                value={form.shipping_bill_no}
                onChange={(e) => onF("shipping_bill_no", e.target.value)}
                maxLength={60}
                placeholder={t("Record-only (issued by CHA)")}
                invalid={!!errors.shipping_bill_no}
              />
              {errors.shipping_bill_no && (
                <div className="text-danger small mt-25">
                  {t("Shipping Bill No. required")}
                </div>
              )}
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">
                {t("Shipping Bill Date")}
              </Label>
              <DateInput
                id="inv-shipping-bill-date"
                value={form.shipping_bill_date}
                onChange={(_d, _s, iso) => onF("shipping_bill_date", iso || "")}
              />
              {errors.shipping_bill_date && (
                <div className="text-danger small mt-25">
                  {t("Shipping Bill Date required")}
                </div>
              )}
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">
                {t("Custom Exchange Rate")}
              </Label>
              <Input
                type="number"
                step="0.000001"
                min="0"
                value={form.custom_exchange_rate}
                onChange={(e) =>
                  onF("custom_exchange_rate", e.target.value)
                }
                placeholder={t("e.g. 91 (₹ per 1 unit)")}
              />
              <small className="text-muted">
                {t(
                  "₹ per 1 unit of the invoice currency (e.g. 91 for $1 = ₹91) — not the invoice's own Exchange Rate format. Used only for GST/Assessable Value on the Commercial PDF. Leave blank to use the invoice's own Exchange Rate."
                )}
              </small>
            </Col>
          </Row>

          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Pre-Carriage By")}</Label>
              <Input
                value={form.pre_carriage_by}
                onChange={(e) => onF("pre_carriage_by", e.target.value)}
                maxLength={80}
                placeholder="ROAD / OWN VEHICLE"
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Place of Receipt")}</Label>
              <Input
                value={form.place_of_receipt}
                onChange={(e) => onF("place_of_receipt", e.target.value)}
                maxLength={80}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Port of Loading")} <span className="text-danger">*</span>
              </Label>
              <PortSelect
                value={form.port_of_loading_snapshot}
                countryCode="IN"
                placeholder={t("Search port by code or name…")}
                onChange={(port) => {
                  onF("port_of_loading_id", port?._id || "");
                  onF("port_of_loading_snapshot", port || null);
                }}
              />
              {errors.port_of_loading_id && (
                <div className="text-danger small mt-25">
                  {t("Port of Loading required")}
                </div>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Port of Discharge")}
              </Label>
              <PortSelect
                value={form.port_of_discharge_snapshot}
                countryCode={null}
                placeholder={t("Search port by code or name…")}
                onChange={(port) => {
                  onF("port_of_discharge_id", port?._id || "");
                  onF("port_of_discharge_snapshot", port || null);
                }}
              />
              {errors.port_of_discharge_id && (
                <div className="text-danger small mt-25">
                  {t("Port of Discharge required")}
                </div>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Place of Delivery")}
              </Label>
              <Input
                value={form.place_of_delivery}
                onChange={(e) => onF("place_of_delivery", e.target.value)}
                maxLength={80}
                invalid={!!errors.place_of_delivery}
              />
              {errors.place_of_delivery && (
                <div className="text-danger small mt-25">
                  {t("Place of Delivery required")}
                </div>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Total Packages")} <span className="text-danger">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.total_packages}
                onChange={(e) => onPackingF("total_packages", e.target.value)}
                invalid={!!errors.total_packages}
              />
              {errors.total_packages ? (
                <div className="text-danger small mt-25">
                  {t("Total Packages required")}
                </div>
              ) : (
                <small className="text-muted">
                  {t("Auto-summed from line items; editable")}
                </small>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Net Weight (kg)")} <span className="text-danger">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.net_weight_kg}
                onChange={(e) => onPackingF("net_weight_kg", e.target.value)}
                invalid={!!errors.net_weight_kg}
              />
              {errors.net_weight_kg ? (
                <div className="text-danger small mt-25">
                  {t("Net Weight required")}
                </div>
              ) : (
                <small className="text-muted">
                  {t("Auto-summed from line items; editable")}
                </small>
              )}
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Gross Weight (kg)")} <span className="text-danger">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.gross_weight_kg}
                onChange={(e) => onPackingF("gross_weight_kg", e.target.value)}
                invalid={!!errors.gross_weight_kg}
              />
              {errors.gross_weight_kg ? (
                <div className="text-danger small mt-25">
                  {t("Gross Weight required")}
                </div>
              ) : (
                <small className="text-muted">
                  {t("Auto-summed from line items; editable")}
                </small>
              )}
            </Col>
          </Row>
        </div>
      </div>

      {/* ── Money + Totals ─────────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-1">
            {t("Charges & Totals")}
          </h5>
        <div className="small text-muted mb-2">
          {t(
            "Amounts below are in the invoice currency ({{sym}} {{code}}). Line items are in ₹; the Subtotal converts at the exchange rate above.",
            { sym, code: form.currency_code || "-" },
          )}
        </div>
        <div>
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Discount Total")} ({sym || "-"})
              </Label>
              <Input
                type="number"
                step="any"
                value={form.discount_total}
                onChange={(e) => onF("discount_total", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Freight")} ({sym || "-"})
              </Label>
              <Input
                type="number"
                step="any"
                value={form.freight_charges}
                onChange={(e) => onF("freight_charges", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Insurance")} ({sym || "-"})
              </Label>
              <Input
                type="number"
                step="any"
                value={form.insurance_charges}
                onChange={(e) => onF("insurance_charges", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Other Charges")} ({sym || "-"})
              </Label>
              <Input
                type="number"
                step="any"
                value={form.other_charges}
                onChange={(e) => onF("other_charges", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Advance Received")} ({sym || "-"})
              </Label>
              {/* Auto-managed: Σ of every source Sales Order's advance. Read-only
                  — the backend is authoritative and finalises the sum on save. */}
              <Input
                type="number"
                step="any"
                value={form.advance_received}
                readOnly
                disabled
              />
              <small className="text-muted">
                {t("Auto-summed from the source Sales Orders' advances.")}
              </small>
            </Col>
            <Col md="9" className="d-flex align-items-end justify-content-end">
              <div className="small text-end" style={{ minWidth: 280 }}>
                {/* Full breakdown so the jump from FOB → Grand Total is
                    transparent: each charge is its own signed line, shown only
                    when non-zero. Mirrors the backend recompute exactly. */}
                <div className="d-flex justify-content-between py-25">
                  <span className="text-muted">{t("Subtotal")}</span>
                  <span>{sym}{fmt(totals.subtotal)}</span>
                </div>
                {num(form.discount_total) > 0 && (
                  <div className="d-flex justify-content-between py-25">
                    <span className="text-muted">{t("Discount Total")}</span>
                    <span>− {sym}{fmt(num(form.discount_total))}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between py-25">
                  <span className="text-muted">{t("FOB Value")}</span>
                  <span>{sym}{fmt(totals.fob)}</span>
                </div>
                {num(form.freight_charges) > 0 && (
                  <div className="d-flex justify-content-between py-25">
                    <span className="text-muted">{t("Freight")}</span>
                    <span>+ {sym}{fmt(num(form.freight_charges))}</span>
                  </div>
                )}
                {num(form.insurance_charges) > 0 && (
                  <div className="d-flex justify-content-between py-25">
                    <span className="text-muted">{t("Insurance")}</span>
                    <span>+ {sym}{fmt(num(form.insurance_charges))}</span>
                  </div>
                )}
                {num(form.other_charges) > 0 && (
                  <div className="d-flex justify-content-between py-25">
                    <span className="text-muted">{t("Other Charges")}</span>
                    <span>+ {sym}{fmt(num(form.other_charges))}</span>
                  </div>
                )}
                {/* NOT part of Grand Total — see the totals memo. On an
                    IGST-paid export the tax is refunded to the exporter, so it
                    is informational (and feeds GSTR-1), not payable by the
                    customer. Under LUT it is zero-rated outright. */}
                <div className="d-flex justify-content-between py-25">
                  <span className="text-muted">
                    {t("Total IGST")}
                    {isLut && (
                      <small className="ms-25">({t("zero-rated under LUT")})</small>
                    )}
                  </span>
                  {/* IGST is always ₹ (INR) — an Indian tax computed on the
                      INR taxable value, regardless of the invoice's own
                      document currency. */}
                  <span>₹{fmt(totals.igstInr)}</span>
                </div>
                <div className="d-flex justify-content-between py-25 border-top border-bottom py-1 my-25">
                  <span className="fw-bold">{t("Grand Total")}</span>
                  <span className="fw-bold">{sym}{fmt(totals.grand)}</span>
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {t("IGST is shown for information — it is not added to the Grand Total.")}
                </div>
                {num(form.advance_received) > 0 && (
                  <div className="d-flex justify-content-between py-25">
                    <span className="text-muted">{t("Advance Received")}</span>
                    <span>− {sym}{fmt(num(form.advance_received))}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between py-25">
                  <span className="text-muted">{t("Balance Receivable")}</span>
                  <span
                    className={
                      totals.balance > 0
                        ? "fw-semibold text-warning"
                        : "fw-semibold text-success"
                    }
                  >
                    {sym}{fmt(totals.balance)}
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>

        </Fragment>
      )}

      {/* ─── STEP 4 of 4 — Tax & Notes ──────────────────────────────── */}
      {activeStep === 3 && (
        <Fragment>
      {/* ── GST + LUT ────────────────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("GST Route")}
          </h5>
        <div>
          {/* Row 1: full-width radio strip */}
          <Row>
            <Col md="12" className="mb-1">
              <div className="d-flex flex-wrap align-items-center gap-3">
                {GST_ROUTES.map((opt) => (
                  <div key={opt.value} className="form-check mb-0">
                    <Input
                      type="radio"
                      id={`gst-${opt.value}`}
                      name="gst_route"
                      checked={form.gst_route === opt.value}
                      onChange={() => onF("gst_route", opt.value)}
                    />
                    <Label
                      className="form-check-label ms-25"
                      for={`gst-${opt.value}`}
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
              <small className="text-muted d-block mt-1">
                {t(
                  "IGST Paid → IGST refund footer rendered on PDF. LUT → declare 'Supply meant for export under LUT without payment of IGST'."
                )}
              </small>
            </Col>
          </Row>

          {/* Row 2: conditional LUT inputs (6+6) */}
          {form.gst_route === "lut_zero_rated" && (
            <Row className="mt-1">
              <Col md="6" className="mb-2">
                <Label className="form-label">
                  {t("LUT No")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={form.lut_no}
                  onChange={(e) => onF("lut_no", e.target.value)}
                  invalid={!!errors.lut_no}
                  maxLength={60}
                />
                {errors.lut_no && (
                  <FormFeedback className="d-block">{errors.lut_no}</FormFeedback>
                )}
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label">
                  {t("LUT Date")} <span className="text-danger">*</span>
                </Label>
                <DateInput
                  id="inv-lut-date"
                  value={form.lut_date}
                  onChange={(_d, _s, iso) => onF("lut_date", iso || "")}
                  invalid={!!errors.lut_date}
                />
                {errors.lut_date && (
                  <FormFeedback className="d-block">
                    {errors.lut_date}
                  </FormFeedback>
                )}
              </Col>
            </Row>
          )}
        </div>
      </div>

      {/* ── Compliance + Notes ───────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("Compliance & Notes")}
          </h5>
        <div>
          <Row>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("End Use Code")}</Label>
              <Input
                value={form.end_use_code}
                onChange={(e) => onF("end_use_code", e.target.value)}
                placeholder="e.g. GNX100"
                maxLength={60}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Preferential Agreement")}</Label>
              <Input
                value={form.preferential_agreement}
                onChange={(e) =>
                  onF("preferential_agreement", e.target.value)
                }
                placeholder="N/A"
                maxLength={60}
              />
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Delivery Terms")}</Label>
              <Input
                value={form.delivery_terms}
                onChange={(e) => onF("delivery_terms", e.target.value)}
                maxLength={100}
              />
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Notes to Buyer")}</Label>
              <Input
                type="textarea"
                rows="3"
                value={form.notes_to_buyer}
                onChange={(e) => onF("notes_to_buyer", e.target.value)}
              />
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("Internal Notes")}</Label>
              <Input
                type="textarea"
                rows="3"
                value={form.internal_notes}
                onChange={(e) => onF("internal_notes", e.target.value)}
              />
            </Col>
            <Col md="12" className="mb-2">
              <Label className="form-label">{t("Declaration Text")}</Label>
              <Input
                type="textarea"
                rows="2"
                value={form.declaration_text}
                onChange={(e) => onF("declaration_text", e.target.value)}
              />
            </Col>
            <Col md="12" className="mb-2">
              <Label className="form-label">
                {t("Terms & Conditions")}
              </Label>
              <Input
                type="textarea"
                rows="4"
                value={form.terms}
                onChange={(e) => onF("terms", e.target.value)}
              />
            </Col>
          </Row>
        </div>
      </div>

        </Fragment>
      )}

          </div>

          {/* ── Wizard Footer (inside same Card) ────────────────────── */}
          <WizardFooter
            isFirst={activeStep === 0}
            isLast={isLastStep}
            isEdit={isEdit}
            onBack={onBack}
            onNext={onNext}
            onSubmit={onSave}
            onCancel={() => navigate(`${appsRoot}/invoices`)}
            submitting={busy || noDispatchedYet}
          />
        </CardBody>
      </Card>
    </div>

      {/* ── Add items from another SO (same customer/currency/country) ── */}
      <MultiSoPickerModal
        isOpen={soPickerOpen}
        toggle={() => setSoPickerOpen(false)}
        customerId={form.customer_id || undefined}
        lockCurrency={form.currency_code || undefined}
        excludeInvoiceId={editId || undefined}
        existingPoLineIds={lines
          .map((l) => l.purchase_order_line_id)
          .filter(Boolean)}
        onConfirm={appendSoLines}
      />

      {/* ── Add lines from PO modal ───────────────────────────────────── */}
      <Modal
        isOpen={addModalOpen}
        toggle={() => setAddModalOpen(false)}
        size="lg"
        centered
      >
        <ModalHeader toggle={() => setAddModalOpen(false)}>
          {t("Add lines from SO")}
        </ModalHeader>
        <ModalBody>
          {addLoading ? (
            <div className="text-center py-4">
              <Spinner size="sm" /> {t("Loading...")}
            </div>
          ) : addableLines.length === 0 ? (
            <div className="text-muted text-center py-3">
              {t(
                "No PO lines have additional dispatched qty available to add."
              )}
            </div>
          ) : (
            <Fragment>
              <div className="small text-muted mb-2">
                {t(
                  "Lines with dispatched-but-not-yet-invoiced qty. Tick to add to this draft."
                )}
              </div>
              <Table responsive bordered size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 36 }} className="text-center">
                      <Input
                        type="checkbox"
                        title={t("Select all")}
                        checked={
                          addableLines.length > 0 &&
                          addableLines.every(
                            (r) => addPicks[r.purchase_order_line_id]?.selected,
                          )
                        }
                        onChange={(e) => {
                          const v = e.target.checked;
                          setAddPicks((p) => {
                            const next = { ...p };
                            addableLines.forEach((r) => {
                              next[r.purchase_order_line_id] = {
                                ...next[r.purchase_order_line_id],
                                selected: v,
                              };
                            });
                            return next;
                          });
                        }}
                      />
                    </th>
                    <th>{t("Product")}</th>
                    <th className="text-end" style={{ width: 90 }}>
                      {t("Dispatched")}
                    </th>
                    <th className="text-end" style={{ width: 90 }}>
                      {t("Available")}
                    </th>
                    <th style={{ width: 120 }}>{t("Qty to add")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    return addableLines
                      .slice(addPg.pageStart, addPg.pageStart + addPg.pageSize)
                      .map((r) => {
                    const pick = addPicks[r.purchase_order_line_id] || {};
                    return (
                      <tr key={r.purchase_order_line_id}>
                        <td className="text-center">
                          <Input
                            type="checkbox"
                            checked={!!pick.selected}
                            onChange={() =>
                              togglePick(r.purchase_order_line_id)
                            }
                          />
                        </td>
                        <td>
                          <div className="fw-semibold">
                            {r.product_name || r.product_code || "-"}
                          </div>
                          {r.product_code && (
                            <div className="small text-muted">
                              {r.product_code}
                            </div>
                          )}
                          {Number(r.already_on_draft) > 0 && (
                            <div className="small text-muted">
                              {t("Already on draft")}: {r.already_on_draft}{" "}
                              {r.unit}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          {r.dispatched} {r.unit}
                        </td>
                        <td className="text-end">
                          {r.available} {r.unit}
                        </td>
                        <td>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max={r.available}
                            value={pick.qty || ""}
                            disabled={!pick.selected}
                            onChange={(e) =>
                              setPickQty(
                                r.purchase_order_line_id,
                                e.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                      });
                  })()}
                </tbody>
              </Table>
              <TablePaginationBar
                {...addPg}
                totalRows={addableLines.length}
                className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1"
              />
            </Fragment>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            outline
            onClick={() => setAddModalOpen(false)}
          >
            {t("Cancel")}
          </Button>
          <Button
            color="primary"
            onClick={confirmAddFromPo}
            disabled={
              addLoading ||
              !Object.values(addPicks).some((p) => p?.selected)
            }
          >
            {t("Add Selected")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Per-line Rebates / Expenses modal ─────────────────────────── */}
      {costingModal.open && costingModal.idx !== null && (
        <CostingModal
          isOpen={costingModal.open}
          toggle={() => setCostingModal({ open: false, idx: null })}
          line={lines[costingModal.idx]}
          onChange={(patch) => updateLine(costingModal.idx, patch)}
          rebateOptions={rebateOptions}
          expenseOptions={expenseOptions}
        />
      )}

    </Fragment>
  );
};

// ─── Rebates / Expenses modal ────────────────────────────────────────────
//
// Mirrors the SalesDocLineItems rebate/expense sub-editor used by
// Quotation / PFI / PO — same shape, same master dropdowns, same field
// names (rebate.pct, expense.value) so the costing engine treats them
// identically across the chain.

const CostingModal = ({
  isOpen,
  toggle,
  line,
  onChange,
  rebateOptions,
  expenseOptions,
}) => {
  const { t } = useTranslation();
  const rebates = line?.product_rebates_snapshot || [];
  const expenses = line?.product_expenses_snapshot || [];

  // ── Discount ─────────────────────────────────────────────────────────
  // `discount_pct` is a plain number on the line and is always present (0 when
  // unused), so "add" / "delete" is a UI affordance, not a data one: deleting
  // sets it back to 0. The modal remounts on every open, so seeding this from
  // the line is enough — no effect needed to keep it in sync.
  const [discountOpen, setDiscountOpen] = useState(num(line?.discount_pct) > 0);

  const setDiscount = (v) => {
    // Clamp at the edge. A negative discount would silently INCREASE the line
    // total, and >100 would flip it negative — both are nonsense the backend
    // would happily store.
    if (v === "") return onChange({ discount_pct: "" });
    const n = Math.min(100, Math.max(0, num(v)));
    onChange({ discount_pct: String(n) });
  };

  const removeDiscount = () => {
    onChange({ discount_pct: "0" });
    setDiscountOpen(false);
  };

  // ── Margin ───────────────────────────────────────────────────────────
  // `margin_pct` mirrors `discount_pct`: a plain number always present on the
  // line (0 when unused). It is ADDED on top of the costing base
  // (qty × price + expenses − rebates − discount) to reach the line total, so
  // it is the per-line selling uplift carried from the SO / quotation.
  const [marginOpen, setMarginOpen] = useState(num(line?.margin_pct) > 0);

  const setMargin = (v) => {
    // No upper clamp (a large margin is a valid business choice); just block a
    // negative, which would silently REDUCE the line total below its cost base.
    if (v === "") return onChange({ margin_pct: "" });
    const n = Math.max(0, num(v));
    onChange({ margin_pct: String(n) });
  };

  const removeMargin = () => {
    onChange({ margin_pct: "0" });
    setMarginOpen(false);
  };

  // ── Rebate row helpers ───────────────────────────────────────────────
  const setRebates = (next) => onChange({ product_rebates_snapshot: next });

  const pickRebateMaster = (idx, opt) => {
    const cur = rebates.slice();
    cur[idx] = {
      ...cur[idx],
      rebate_id: opt?.value || null,
      code: opt?.raw?.code || cur[idx]?.code || "",
      name: opt?.raw?.name || opt?.label || "",
      type: opt?.raw?.type || cur[idx]?.type || "percent",
      pct: opt?.raw?.pct != null ? String(opt.raw.pct) : cur[idx]?.pct || "0",
    };
    setRebates(cur);
  };
  const setRebateField = (idx, patch) => {
    const cur = rebates.slice();
    cur[idx] = { ...cur[idx], ...patch };
    setRebates(cur);
  };
  const addRebate = () =>
    setRebates([
      ...rebates,
      { rebate_id: null, code: "", name: "", type: "percent", pct: "0" },
    ]);
  const removeRebate = (idx) => {
    const cur = rebates.slice();
    cur.splice(idx, 1);
    setRebates(cur);
  };

  // ── Expense row helpers ──────────────────────────────────────────────
  const setExpenses = (next) => onChange({ product_expenses_snapshot: next });

  const pickExpenseMaster = (idx, opt) => {
    const cur = expenses.slice();
    cur[idx] = {
      ...cur[idx],
      expense_id: opt?.value || null,
      code: opt?.raw?.code || cur[idx]?.code || "",
      name: opt?.raw?.name || opt?.label || "",
      type: opt?.raw?.type || cur[idx]?.type || "fixed",
      value:
        opt?.raw?.value != null ? String(opt.raw.value) : cur[idx]?.value || "0",
    };
    setExpenses(cur);
  };
  const setExpenseField = (idx, patch) => {
    const cur = expenses.slice();
    cur[idx] = { ...cur[idx], ...patch };
    setExpenses(cur);
  };
  const addExpense = () =>
    setExpenses([
      ...expenses,
      { expense_id: null, code: "", name: "", type: "fixed", value: "0" },
    ]);
  const removeExpense = (idx) => {
    const cur = expenses.slice();
    cur.splice(idx, 1);
    setExpenses(cur);
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Line Details")} —{" "}
        <code className="ms-1">{line?.product_code || line?.product_name}</code>
      </ModalHeader>
      <ModalBody>
        {/* ── Discount ─────────────────────────────────────────────── */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <Label className="form-label fw-bold mb-0">{t("Discount")}</Label>
          {!discountOpen && (
            <Button
              size="sm"
              color="warning"
              outline
              onClick={() => setDiscountOpen(true)}
            >
              + {t("Add Discount")}
            </Button>
          )}
        </div>
        {!discountOpen ? (
          <div className="text-muted small mb-2">{t("No discount")}</div>
        ) : (
          <Row className="align-items-center g-1 mb-2">
            <Col md="4">
              <Input
                type="number"
                step="any"
                min="0"
                max="100"
                value={line?.discount_pct ?? ""}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
              />
            </Col>
            <Col md="1" className="text-muted">
              %
            </Col>
            <Col md="5" className="small text-muted">
              {t("Applied to (qty × price + expenses − rebates).")}
            </Col>
            <Col md="2" className="text-end">
              <Trash2
                size={16}
                className="text-danger cursor-pointer"
                onClick={removeDiscount}
              />
            </Col>
          </Row>
        )}

        <hr className="my-2" />

        {/* ── Margin ───────────────────────────────────────────────── */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <Label className="form-label fw-bold mb-0">{t("Margin")}</Label>
          {!marginOpen && (
            <Button
              size="sm"
              color="success"
              outline
              onClick={() => setMarginOpen(true)}
            >
              + {t("Add Margin")}
            </Button>
          )}
        </div>
        {!marginOpen ? (
          <div className="text-muted small mb-2">{t("No margin")}</div>
        ) : (
          <Row className="align-items-center g-1 mb-2">
            <Col md="4">
              <Input
                type="number"
                step="any"
                min="0"
                value={line?.margin_pct ?? ""}
                onChange={(e) => setMargin(e.target.value)}
                placeholder="0"
              />
            </Col>
            <Col md="1" className="text-muted">
              %
            </Col>
            <Col md="5" className="small text-muted">
              {t("Selling uplift added on top of (qty × price + expenses − rebates − discount).")}
            </Col>
            <Col md="2" className="text-end">
              <Trash2
                size={16}
                className="text-danger cursor-pointer"
                onClick={removeMargin}
              />
            </Col>
          </Row>
        )}

        <hr className="my-2" />

        {/* ── Rebates ──────────────────────────────────────────────── */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <Label className="form-label fw-bold mb-0">{t("Rebates")}</Label>
          <Button size="sm" color="info" outline onClick={addRebate}>
            + {t("Add Rebate")}
          </Button>
        </div>
        {rebates.length === 0 ? (
          <div className="text-muted small mb-2">{t("No rebates")}</div>
        ) : (
          rebates.map((row, ri) => (
            <Row key={`reb-${ri}`} className="align-items-center g-1 mb-1">
              <Col md="6">
                <Select
                  classNamePrefix="select"
                  isClearable
                  options={rebateOptions}
                  value={
                    rebateOptions.find((o) => o.value === row.rebate_id) ||
                    (row.name ? { value: null, label: row.name } : null)
                  }
                  onChange={(opt) => pickRebateMaster(ri, opt)}
                  placeholder={t("Pick a rebate")}
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col md="3">
                <Select
                  classNamePrefix="select"
                  options={REBATE_EXPENSE_TYPE_OPTIONS}
                  value={
                    REBATE_EXPENSE_TYPE_OPTIONS.find(
                      (o) => o.value === (row.type || "percent")
                    ) || REBATE_EXPENSE_TYPE_OPTIONS[0]
                  }
                  onChange={(opt) =>
                    setRebateField(ri, { type: opt?.value || "percent" })
                  }
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col md="2">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0"
                  value={row.pct ?? ""}
                  onChange={(e) =>
                    setRebateField(ri, { pct: e.target.value })
                  }
                />
              </Col>
              <Col md="1" className="text-end">
                <Trash2
                  size={16}
                  className="cursor-pointer text-danger"
                  onClick={() => removeRebate(ri)}
                />
              </Col>
            </Row>
          ))
        )}

        <hr className="my-2" />

        {/* ── Expenses ─────────────────────────────────────────────── */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <Label className="form-label fw-bold mb-0">{t("Expenses")}</Label>
          <Button size="sm" color="warning" outline onClick={addExpense}>
            + {t("Add Expense")}
          </Button>
        </div>
        {expenses.length === 0 ? (
          <div className="text-muted small">{t("No expenses")}</div>
        ) : (
          expenses.map((row, ei) => (
            <Row key={`exp-${ei}`} className="align-items-center g-1 mb-1">
              <Col md="6">
                <Select
                  classNamePrefix="select"
                  isClearable
                  options={expenseOptions}
                  value={
                    expenseOptions.find((o) => o.value === row.expense_id) ||
                    (row.name ? { value: null, label: row.name } : null)
                  }
                  onChange={(opt) => pickExpenseMaster(ei, opt)}
                  placeholder={t("Pick an expense")}
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col md="3">
                <Select
                  classNamePrefix="select"
                  options={REBATE_EXPENSE_TYPE_OPTIONS}
                  value={
                    REBATE_EXPENSE_TYPE_OPTIONS.find(
                      (o) => o.value === (row.type || "fixed")
                    ) || REBATE_EXPENSE_TYPE_OPTIONS[0]
                  }
                  onChange={(opt) =>
                    setExpenseField(ei, { type: opt?.value || "fixed" })
                  }
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col md="2">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0"
                  value={row.value ?? ""}
                  onChange={(e) =>
                    setExpenseField(ei, { value: e.target.value })
                  }
                />
              </Col>
              <Col md="1" className="text-end">
                <Trash2
                  size={16}
                  className="cursor-pointer text-danger"
                  onClick={() => removeExpense(ei)}
                />
              </Col>
            </Row>
          ))
        )}

        <div className="small text-muted mt-2">
          {t(
            "Per-line costing — line_total = (qty × price × (1 − discount/100) + Σ expenses − Σ rebates) × (1 + margin/100). Frozen at issue."
          )}
        </div>

        {/* ── Packing (per-line, for the Packing List) ──────────────── */}
        <hr className="my-2" />
        <Label className="form-label fw-bold">{t("Packing")}</Label>
        <Row className="g-1">
          <Col md="4">
            <Label className="form-label small">{t("Packages")}</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={line?.packages ?? ""}
              onChange={(e) => onChange({ packages: e.target.value })}
            />
          </Col>
          <Col md="4">
            <Label className="form-label small">{t("Net Weight (kg)")}</Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={line?.net_weight ?? ""}
              onChange={(e) => onChange({ net_weight: e.target.value })}
            />
          </Col>
          <Col md="4">
            <Label className="form-label small">{t("Gross Weight (kg)")}</Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={line?.gross_weight ?? ""}
              onChange={(e) => onChange({ gross_weight: e.target.value })}
            />
          </Col>
        </Row>
        <div className="small text-muted mt-1">
          {t("Optional — prints on the Packing List per line.")}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={toggle}>
          {t("Done")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};


export default InvoiceAddEdit;
