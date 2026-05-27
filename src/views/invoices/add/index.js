import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
} from "reactstrap";
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

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  INVOICE_GST_ROUTE_OPTIONS as GST_ROUTES,
  COUNTRY_OPTIONS,
  INCOTERMS_OPTIONS,
  REBATE_EXPENSE_TYPE_OPTIONS,
} from "@constant/options";
import { getCurrencySymbol } from "@src/utility/currency";

import {
  createInvoice,
  updateInvoice,
  getInvoice,
  cleanInvoiceMessage,
  resetInvoiceItem,
} from "@src/views/invoices/store";
import { getPurchaseOrder } from "@src/views/purchase-orders/store";
import { getCustomerDropdown } from "@src/views/customers/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import {
  getExchangeRateOptions,
  getCurrencyDropdown,
} from "@src/views/currencies/store";
import { getRebateDropdown } from "@src/views/rebates/store";
import { getExpenseDropdown } from "@src/views/expenses/store";

const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(v || 0);

// Mirror BE `sumRebates` / `sumExpenses` — PFI/PO convention:
//   Rebate row : { rebate_id, code, name, type: 'percent'|'fixed', pct }
//                value lives in `pct` regardless of `type`
//   Expense row: { expense_id, code, name, type: 'percent'|'fixed', value }
//                value lives in `value` regardless of `type`
const sumRebates = (items, base) => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let total = 0;
  for (const r of items) {
    if (!r) continue;
    total += r.type === "fixed" ? num(r.pct) : (base * num(r.pct)) / 100;
  }
  return total;
};
const sumExpenses = (items, base) => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let total = 0;
  for (const e of items) {
    if (!e) continue;
    total += e.type === "percent" ? (base * num(e.value)) / 100 : num(e.value);
  }
  return total;
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
  const { id: editId } = useParams();
  const location = useLocation();
  const isEdit = !!editId;

  const queryPoId =
    new URLSearchParams(location.search).get("po_id") || "";

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
    dispatch(getCustomerDropdown());
    dispatch(getCompanyDetails());
  }, [dispatch]);

  const rebateStore = useSelector((s) => s.rebate);
  const expenseStore = useSelector((s) => s.expense);
  const customerStore = useSelector((s) => s.customer);
  const companyStore = useSelector((s) => s.company);

  const customerOptions = useMemo(
    () =>
      (customerStore?.customerDropdown || []).map((c) => ({
        value: c._id,
        label: c.company_name,
      })),
    [customerStore?.customerDropdown]
  );

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

  const countryOptions = useMemo(
    () =>
      (COUNTRY_OPTIONS || []).map((c) =>
        typeof c === "string" ? { value: c, label: c } : c
      ),
    []
  );

  // ── Form state ──────────────────────────────────────────────────────

  const [form, setForm] = useState({
    invoice_date: todayISO(),
    due_date: "",
    purchase_order_id: queryPoId,
    customer_po_no: "",
    country_of_destination: "",
    country_of_origin: "India",
    customer_id: "",
    customer_address_id: "",
    consignee_id: "",
    consignee_address_id: "",
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
  // Coverage from the PO arrival (?po=...). Drives the BE qty guard mirror:
  // qty cap per line = dispatched − already_invoiced; banner + disable Save
  // when nothing has been dispatched yet.
  const [poCoverage, setPoCoverage] = useState(null);
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

  const onF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

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
  const ensureAddresses = useCallback(
    async (customerId) => {
      if (!customerId || addressOptionsByCustomer[customerId]) return;
      try {
        const resp = await instance.get(
          `${API_ENDPOINTS.customers.get}/${customerId}`
        );
        const cust = resp?.data?.data;
        const opts = (cust?.addresses || []).map((a) => ({
          value: a._id,
          label: [a.label, a.address_line1, a.city, a.country]
            .filter(Boolean)
            .join(", "),
        }));
        setAddressOptionsByCustomer((s) => ({ ...s, [customerId]: opts }));
      } catch {
        setAddressOptionsByCustomer((s) => ({ ...s, [customerId]: [] }));
      }
    },
    [addressOptionsByCustomer]
  );

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

      setForm((s) => ({
        ...s,
        purchase_order_id: po._id,
        customer_id: po.customer_id || "",
        customer_address_id: po.customer_address_id || "",
        // Consignee — inherit from PO if it carries one (set when the
        // source PFI had a consignee). Otherwise default to the buyer.
        consignee_id: po.consignee_id || po.customer_id || "",
        consignee_address_id: po.customer_address_id || "",
        consignee_from_customer: !!(po.consignee_id || po.customer_id),
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
        incoterm: po.incoterm || "FOB",
        payment_terms: po.payment_terms || "",
        delivery_terms: po.delivery_terms || "",
        country_of_destination:
          po.country_of_final_destination || po.country_of_destination || "",
      }));

      // Map PO lines → invoice lines. qty defaults to dispatched-but-not-
      // yet-invoiced when coverage is available, falling back to PO ordered.
      // Mirrors the BE guard so users can hit Save without surprise rejects.
      const dispatchedAvailByLine = new Map();
      for (const cl of coverage?.lines || []) {
        // pending in PO coverage = ordered − dispatched (i.e. yet to dispatch)
        // dispatched = qty actually moved; we want dispatched here.
        const dispatched = Number(cl.dispatched || 0);
        dispatchedAvailByLine.set(
          (cl.purchase_order_line_id || "").toString(),
          dispatched
        );
      }
      // Auto-drop lines with no dispatched qty — operator can re-add them
      // on a later invoice once vendor dispatches more. When coverage is
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
          purchase_order_line_id: l._id,
          po_vendor_line_id: undefined,
          product_id: l.product_id,
          product_name: l.product_name || "",
          product_code: l.product_code || "",
          // Default description to product_name so the line carries a
          // sensible value the operator can refine. Mirrors the PDF
          // fallback: when description is blank, the PDF shows product_name.
          description: l.description || l.product_name || "",
          hsn_code: l.hsn_code || "",
          customer_reference: l.customer_reference || "",
          unit: l.unit || "Nos",
          uqc_code: mapUomToUqc(l.unit),
          qty: String(cap),
          unit_price: String(l.unit_price || 0),
          discount_pct: "0",
          tax_pct: "0",
          igst_rate_pct: String(l.tax_pct || 0),
          product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
            ? l.product_rebates_snapshot
            : [],
          product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
            ? l.product_expenses_snapshot
            : [],
        };
      });
      setLines(mapped);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryPoId, isEdit]);

  // Auto-fetch addresses when customer/consignee/notify changes so the
  // matching address picker can populate.
  useEffect(() => {
    if (form.customer_id) ensureAddresses(form.customer_id);
  }, [form.customer_id, ensureAddresses]);
  useEffect(() => {
    if (form.consignee_id) ensureAddresses(form.consignee_id);
  }, [form.consignee_id, ensureAddresses]);

  // When consignee equals customer and ship-to address isn't set, mirror
  // the bill-to address. Lets operator change later without bookkeeping.
  useEffect(() => {
    if (!form.consignee_id || !form.customer_id) return;
    if (form.consignee_id !== form.customer_id) return;
    if (form.consignee_address_id) return;
    if (!form.customer_address_id) return;
    onF("consignee_address_id", form.customer_address_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.consignee_id, form.customer_id, form.customer_address_id]);

  // When consignee_from_customer is on and a customer id is set but the
  // snapshot is empty (e.g. just arrived via PO pre-fill), load it.
  useEffect(() => {
    if (!form.consignee_from_customer) return;
    if (!form.consignee_id) return;
    if (form.consignee_snapshot?.name) return;
    prefillSnapshotFromCustomer(
      form.consignee_id,
      "consignee_snapshot",
      "consignee_id"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.consignee_from_customer, form.consignee_id]);

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
  const noDispatchedYet =
    !!queryPoId &&
    !isEdit &&
    !!poCoverage &&
    Number(poCoverage?.totals?.dispatched || 0) <= 0;

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
    setForm((s) => ({
      ...s,
      invoice_date: inv.invoice_date?.slice(0, 10) || todayISO(),
      due_date: inv.due_date?.slice(0, 10) || "",
      purchase_order_id: inv.purchase_order_id || "",
      customer_po_no: inv.customer_po_no || "",
      country_of_destination: inv.country_of_destination || "",
      country_of_origin: inv.country_of_origin || "India",
      customer_id: inv.customer_id || "",
      customer_address_id: inv.customer_address_id || "",
      consignee_id: inv.consignee_id || "",
      consignee_address_id: inv.consignee_address_id || "",
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
    setLines(
      (inv.lines || []).map((l, i) => ({
        _id: l._id,
        seq: l.seq || i + 1,
        purchase_order_line_id: l.purchase_order_line_id,
        po_vendor_line_id: l.po_vendor_line_id,
        product_id: l.product_id,
        product_name: l.product_name,
        product_code: l.product_code,
        description: l.description,
        hsn_code: l.hsn_code,
        customer_reference: l.customer_reference,
        unit: l.unit,
        uqc_code: l.uqc_code,
        qty: l.qty,
        unit_price: l.unit_price,
        discount_pct: l.discount_pct,
        tax_pct: l.tax_pct,
        igst_rate_pct: l.igst_rate_pct,
        product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
          ? l.product_rebates_snapshot
          : [],
        product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
          ? l.product_expenses_snapshot
          : [],
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

  const totals = useMemo(() => {
    let subtotal = 0;
    for (const l of lines) {
      const qty = num(l.qty);
      const price = num(l.unit_price);
      const discount = num(l.discount_pct);
      const base = qty * price;
      // Match BE recompute math: (base + Σ expenses − Σ rebates) × (1 − disc%)
      const expensesTotal = sumExpenses(l.product_expenses_snapshot, base);
      const rebatesTotal = sumRebates(l.product_rebates_snapshot, base);
      const adjusted = base + expensesTotal - rebatesTotal;
      subtotal += adjusted * (1 - discount / 100);
    }
    const fob = subtotal - num(form.discount_total);
    const grand =
      fob +
      num(form.freight_charges) +
      num(form.insurance_charges) +
      num(form.other_charges);
    const balance = grand - num(form.advance_received);
    return { subtotal, fob, grand, balance };
  }, [
    lines,
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

  // ── Line helpers ────────────────────────────────────────────────────

  const updateLine = (idx, patch) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

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

  const buildPayload = () => ({
    ...form,
    lines: lines.map((l) => ({
      _id: l._id,
      seq: l.seq,
      purchase_order_line_id: l.purchase_order_line_id,
      po_vendor_line_id: l.po_vendor_line_id,
      product_id: l.product_id,
      product_name: l.product_name,
      product_code: l.product_code,
      description: l.description,
      hsn_code: l.hsn_code,
      customer_reference: l.customer_reference,
      unit: l.unit,
      uqc_code: l.uqc_code,
      qty: String(l.qty),
      unit_price: String(l.unit_price),
      discount_pct: String(l.discount_pct || 0),
      tax_pct: String(l.tax_pct || 0),
      igst_rate_pct: String(l.igst_rate_pct || 0),
      product_rebates_snapshot: l.product_rebates_snapshot || [],
      product_expenses_snapshot: l.product_expenses_snapshot || [],
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
  });

  const onSave = async () => {
    if (!validate()) {
      Notification("Validation", "Please fix the highlighted fields.", "warning");
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        const r = await dispatch(
          updateInvoice({ id: editId, data: buildPayload() })
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
                <Select
                  classNamePrefix="select"
                  isClearable
                  options={customerOptions}
                  value={(() => {
                    const id = form[idKey];
                    if (!id) return null;
                    const match = customerOptions.find(
                      (o) => o.value === id
                    );
                    if (match) return match;
                    // Fallback: customer master list hasn't loaded yet, OR
                    // the linked customer is now inactive. Surface what we
                    // know from the snapshot so the user can see it.
                    return {
                      value: id,
                      label: snap.name || t("(customer)"),
                    };
                  })()}
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
            <Col md="6" className="mb-1">
              <Label className="form-label">{t("City")}</Label>
              <Input
                value={snap.city || ""}
                onChange={(e) => updateSnap({ city: e.target.value })}
                maxLength={120}
              />
            </Col>
            <Col md="4" className="mb-1">
              <Label className="form-label">{t("State")}</Label>
              <Input
                value={snap.state || ""}
                onChange={(e) => updateSnap({ state: e.target.value })}
                maxLength={120}
              />
            </Col>
            <Col md="4" className="mb-1">
              <Label className="form-label">{t("Postcode")}</Label>
              <Input
                value={snap.postcode || ""}
                onChange={(e) => updateSnap({ postcode: e.target.value })}
                maxLength={30}
              />
            </Col>
            <Col md="4" className="mb-1">
              <Label className="form-label">{t("Country")}</Label>
              <Select
                classNamePrefix="select"
                isClearable
                options={countryOptions}
                value={
                  countryOptions.find((o) => o.value === snap.country) ||
                  null
                }
                onChange={(opt) =>
                  updateSnap({ country: opt ? opt.value : "" })
                }
                placeholder={t("Select country")}
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
                <strong>{t("Nothing dispatched yet on this PO.")}</strong>{" "}
                {t(
                  "A Commercial Invoice can only be raised for qty the vendor has already dispatched (POV status: dispatched / closed)."
                )}{" "}
                {t(
                  "Open a POV from the PO detail page, mark it dispatched, then come back here."
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
          <div className="wizard-step-body">
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
              <Select
                classNamePrefix="select"
                options={customerOptions}
                value={
                  customerOptions.find((o) => o.value === form.customer_id) ||
                  null
                }
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
                placeholder={
                  form.customer_id
                    ? t("Select address")
                    : t("Pick customer first")
                }
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* ── Consignee (Ship-to) ─────────────────────────────────────── */}
      {renderPartyCard({
        title: t("Consignee (Ship-to)"),
        flagKey: "consignee_from_customer",
        idKey: "consignee_id",
        snapKey: "consignee_snapshot",
        required: true,
        errorKey: "consignee_id",
      })}

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
                invalid={!!errors.invoice_date}
              />
              {errors.invoice_date && (
                <FormFeedback className="d-block">
                  {errors.invoice_date}
                </FormFeedback>
              )}
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
              <small className="text-muted">{t("Pulled from PO")}</small>
            </Col>
            <Col md="4" className="mb-2">
              <Label className="form-label">{t("Exchange Rate")}</Label>
              <Input
                type="number"
                step="0.000001"
                min="0"
                value={form.exchange_rate}
                onChange={(e) => onF("exchange_rate", e.target.value)}
              />
              <small className="text-muted">
                {t("INR × rate = customer-currency amount.")}
              </small>
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

      {/* ─── STEP 3 of 4 — Items & Charges ──────────────────────────── */}
      {activeStep === 2 && (
        <Fragment>
      {/* ── Lines ────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("Line Items")}
          </h5>
        <div>
          {lines.length === 0 ? (
            <div className="text-muted text-center py-2">
              {t(
                "No lines. Pick a PO via the 'Generate Invoice' action on the PO detail page."
              )}
            </div>
          ) : (
            <Table bordered size="sm" className="align-top mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th style={{ width: 110 }}>{t("HSN")} <span className="text-danger">*</span></th>
                  <th>{t("Product / Description")}</th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Qty")}
                  </th>
                  <th style={{ width: 70 }}>{t("UQC")}</th>
                  <th style={{ width: 110 }} className="text-end">
                    {t("Unit Price")}
                  </th>
                  <th style={{ width: 80 }} className="text-end">
                    {t("IGST %")}
                  </th>
                  <th style={{ width: 110 }} className="text-end">
                    {t("Line Total")}
                  </th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const base = num(l.qty) * num(l.unit_price);
                  const expensesTotal = sumExpenses(
                    l.product_expenses_snapshot,
                    base,
                  );
                  const rebatesTotal = sumRebates(
                    l.product_rebates_snapshot,
                    base,
                  );
                  const adjusted = base + expensesTotal - rebatesTotal;
                  const lineTotal = adjusted * (1 - num(l.discount_pct) / 100);
                  const rebateCount = (l.product_rebates_snapshot || []).length;
                  const expenseCount = (l.product_expenses_snapshot || []).length;
                  return (
                    <tr key={l._id || i}>
                      <td>{i + 1}</td>
                      <td>
                        <Input
                                    value={l.hsn_code || ""}
                          onChange={(e) =>
                            updateLine(i, { hsn_code: e.target.value })
                          }
                          invalid={!!errors[`line_${i}_hsn`]}
                          placeholder="HSN"
                        />
                      </td>
                      <td>
                        {l.product_code && (
                          <span
                            className="badge"
                            style={{
                              background: "#eef0f3",
                              color: "#1a2238",
                              fontWeight: 500,
                            }}
                          >
                            {l.product_code}
                          </span>
                        )}
                        <Input
                          type="textarea"
                          rows="1"
                          className="mt-25"
                          value={l.description || ""}
                          onChange={(e) =>
                            updateLine(i, { description: e.target.value })
                          }
                          placeholder={t("Description (goods)")}
                        />
                        <Input
                          className="mt-25"
                          value={l.customer_reference || ""}
                          onChange={(e) =>
                            updateLine(i, {
                              customer_reference: e.target.value,
                            })
                          }
                          maxLength={120}
                          placeholder={t(
                            "Buyer's Requirement # (e.g. BOSCH PUMP REQUISITION)",
                          )}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="any"
                          className="text-end"
                          value={l.qty}
                          onChange={(e) => updateLine(i, { qty: e.target.value })}
                          invalid={!!errors[`line_${i}_qty`]}
                        />
                      </td>
                      <td>
                        <Input
                          value={l.uqc_code || ""}
                          onChange={(e) =>
                            updateLine(i, { uqc_code: e.target.value.toUpperCase() })
                          }
                          maxLength={10}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="any"
                                    className="text-end"
                          value={l.unit_price}
                          onChange={(e) =>
                            updateLine(i, { unit_price: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="any"
                                    className="text-end"
                          value={l.igst_rate_pct}
                          onChange={(e) =>
                            updateLine(i, { igst_rate_pct: e.target.value })
                          }
                        />
                      </td>
                      <td className="text-end fw-semibold">
                        {sym}
                        {fmt(lineTotal)}
                        {(rebateCount > 0 || expenseCount > 0) && (
                          <div className="small text-muted">
                            {expenseCount > 0 && (
                              <span title={t("Expenses")}>
                                +exp {fmt(expensesTotal)}
                              </span>
                            )}
                            {rebateCount > 0 && (
                              <span
                                title={t("Rebates")}
                                className={expenseCount > 0 ? "ms-1" : ""}
                              >
                                −reb {fmt(rebatesTotal)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          size="sm"
                          color="link"
                          className="p-0 me-1"
                          title={t("Edit rebates / expenses")}
                          onClick={() => setCostingModal({ open: true, idx: i })}
                        >
                          <Tag size={14} className="text-primary" />
                        </Button>
                        <Button
                          size="sm"
                          color="link"
                          className="p-0"
                          onClick={() => removeLine(i)}
                        >
                          <Trash2 size={14} className="text-danger" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <td colSpan="7" className="text-end fw-bold">
                    {t("Subtotal")}
                  </td>
                  <td className="text-end fw-bold">
                    {sym}{fmt(totals.subtotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          )}
          {errors.lines && (
            <div className="text-danger small mt-1">{errors.lines}</div>
          )}
        </div>
      </div>

      {/* ── Money + Totals ─────────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="mt-2 mb-2">
            {t("Charges & Totals")}
          </h5>
        <div>
          <Row>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Discount Total")}</Label>
              <Input
                type="number"
                step="any"
                value={form.discount_total}
                onChange={(e) => onF("discount_total", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Freight")}</Label>
              <Input
                type="number"
                step="any"
                value={form.freight_charges}
                onChange={(e) => onF("freight_charges", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Insurance")}</Label>
              <Input
                type="number"
                step="any"
                value={form.insurance_charges}
                onChange={(e) => onF("insurance_charges", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Other Charges")}</Label>
              <Input
                type="number"
                step="any"
                value={form.other_charges}
                onChange={(e) => onF("other_charges", e.target.value)}
              />
            </Col>
            <Col md="3" className="mb-2">
              <Label className="form-label">{t("Advance Received")}</Label>
              <Input
                type="number"
                step="any"
                value={form.advance_received}
                onChange={(e) => onF("advance_received", e.target.value)}
              />
            </Col>
            <Col md="9" className="d-flex align-items-end justify-content-end">
              <div className="small text-end" style={{ minWidth: 280 }}>
                <div className="d-flex justify-content-between py-25">
                  <span className="text-muted">{t("FOB Value")}</span>
                  <span>{sym}{fmt(totals.fob)}</span>
                </div>
                <div className="d-flex justify-content-between py-25 border-top border-bottom py-1 my-25">
                  <span className="fw-bold">{t("Grand Total")}</span>
                  <span className="fw-bold">{sym}{fmt(totals.grand)}</span>
                </div>
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
        {t("Rebates & Expenses")} —{" "}
        <code className="ms-1">{line?.product_code || line?.product_name}</code>
      </ModalHeader>
      <ModalBody>
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
            "Per-line costing — line_total = ((qty × price) + Σ expenses − Σ rebates) × (1 − discount/100). Frozen at issue."
          )}
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

// Quick UOM → UQC lookup (GSTR-1 standard codes).
// Operator can override per-line in the form.
function mapUomToUqc(unit) {
  const u = (unit || "").trim().toUpperCase();
  const map = {
    KG: "KGS",
    KGS: "KGS",
    NOS: "NOS",
    PIECE: "PCS",
    PCS: "PCS",
    PACK: "PAC",
    BOX: "BOX",
    LITRE: "LTR",
    LTR: "LTR",
    ML: "MLT",
    METER: "MTR",
    MTR: "MTR",
    CM: "CMS",
    BAG: "BAG",
    PALLET: "PAL",
    CONTAINER: "OTH",
    TONNE: "TON",
    MT: "MTS",
    SET: "SET",
  };
  return map[u] || "OTH";
}

export default InvoiceAddEdit;
