// ── Quotation Wizard Orchestrator ─────────────────────────────────────
// Single source of form state. Steps are dumb views over this state.
// All side effects (fetches, hydration, toast, navigation) live here.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Card, CardBody, Form, Spinner, Button } from "reactstrap";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "react-feather";

// ── Redux thunks ──────────────────────────────────────────────────────
import {
  createQuotation,
  updateQuotation,
  getQuotation,
  cleanQuotationMessage,
  cleanQuotationState,
} from "../../store";
import { getCustomer } from "../../../customers/store";
import {
  getExchangeRateOptions,
  getCurrencyDropdown,
} from "../../../currencies/store";
import { getProductDropdown } from "../../../products/store";
import { getExpenseDropdown } from "../../../expenses/store";
import { getRebateDropdown } from "../../../rebates/store";
import { getLead } from "../../../leads/store";
import { getRfq, cleanRfqItem } from "../../../rfq/store";
import { getVendorDropdown } from "../../../vendors/store";
import { startLoading, stopLoading } from "../../../loadingstore";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { dispatchSafely } from "@src/utility/dispatchSafely";

import { appsRoot } from "@constant/defaultValues";
import {
  initQuotationItem,
  initQuotationLineItem,
} from "@constant/reduxConstant";
import { CUSTOMER_ADDRESS_TYPES } from "@constant/options";

import { num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import { getCurrencySymbol } from "@src/utility/currency";
import { confirmAndCreateMissingPrices } from "@src/views/_shared/price-list/confirmMissingPrices";

// ── Wizard pieces ─────────────────────────────────────────────────────
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import { STEPS } from "./steps";
import "@src/views/_shared/wizard/wizard.scss";

const QuotationWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlLeadId = searchParams.get("lead_id") || "";
  const urlRfqId = searchParams.get("rfq_id") || "";
  const isEdit = !!id;

  const store = useSelector((s) => s.quotation);
  const customerStore = useSelector((s) => s.customer);
  const currencyStore = useSelector((s) => s.currency);
  const productStore = useSelector((s) => s.product);
  const expenseStore = useSelector((s) => s.expense);
  const rebateStore = useSelector((s) => s.rebate);
  const leadStore = useSelector((s) => s.lead);
  const rfqStore = useSelector((s) => s.rfq);
  const vendorStore = useSelector((s) => s.vendor);

  const [submitting, setSubmitting] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);
  // customer _id → company name, cached from the same on-demand detail fetches
  // used for addresses. Feeds the consignee snapshot name so the full customer
  // list isn't needed.
  const [customerNameById, setCustomerNameById] = useState({});
  const [rateMeta, setRateMeta] = useState(null);

  // ── Yup schema ──────────────────────────────────────────────────────
  const schema = useMemo(
    () =>
      yup.object().shape({
        customer_id: yup
          .string()
          .trim()
          .when("lead_id", {
            is: (v) => !!v,
            then: (s) => s.notRequired(),
            otherwise: (s) => s.required(t("Customer is required")),
          }),
        currency_code: yup.string().trim().required(t("Currency is required")),
        quotation_date: yup
          .string()
          .trim()
          .required(t("Quotation date is required")),
        valid_until: yup.string().nullable(),
        reference_no: yup.string().nullable().max(100),
        customer_address_id: yup.string().nullable(),
        exchange_rate: yup.string().nullable(),
        payment_terms: yup.string().nullable().max(100),
        delivery_terms: yup.string().nullable().max(100),
        delivery_location: yup.string().nullable().max(200),
        notes_to_client: yup.string().nullable().max(2000),
        internal_notes: yup.string().nullable().max(2000),
        margin_pct: yup.string().nullable(),
        status: yup.string().nullable(),
        lead_id: yup.string().nullable(),
        rfq_id: yup.string().nullable(),
        lines: yup
          .array()
          .of(
            yup.object().shape({
              product_id: yup.string().required(t("Product is required")),
              qty: yup
                .string()
                .required(t("Qty is required"))
                .test(
                  "qty-positive",
                  t("Qty must be greater than 0"),
                  (v) => Number(v) > 0
                ),
              unit_price: yup.string().required(t("Unit price is required")),
            })
          )
          .min(1, t("Add at least one line item")),
      }),
    [t]
  );

  const form = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initQuotationItem,
  });
  const { control, handleSubmit, reset, setValue, watch, trigger, getValues } =
    form;

  // ── Wizard navigation state ─────────────────────────────────────────
  // Optional ?step=N (1-indexed) deep-link — e.g. "Add Line" jumps to step 2.
  const initialStep = (() => {
    const raw = parseInt(searchParams.get("step"), 10);
    if (!raw || Number.isNaN(raw)) return 0;
    return Math.min(Math.max(raw - 1, 0), STEPS.length - 1);
  })();
  const [activeStep, setActiveStep] = useState(initialStep);
  const [visited, setVisited] = useState(
    new Set(Array.from({ length: initialStep + 1 }, (_, i) => i))
  );

  // Filter steps that should be shown given current form state.
  const visibleSteps = useMemo(
    () => STEPS.filter((s) => !s.isVisible || s.isVisible(form)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [STEPS, form]
  );

  const goTo = async (idx, { validate = true } = {}) => {
    if (idx === activeStep) return;
    if (idx < 0 || idx >= visibleSteps.length) return;

    // Forward nav: validate current step's fields first.
    if (idx > activeStep && validate) {
      const fields = visibleSteps[activeStep].fields || [];
      if (fields.length > 0) {
        const ok = await trigger(fields);
        if (!ok) {
          Notification(
            "Validation",
            t("Please complete the highlighted fields first."),
            "warning"
          );
          return;
        }
      }
    }

    // Guard: target step's canEnter check.
    const target = visibleSteps[idx];
    if (target.canEnter && !target.canEnter(form)) {
      Notification(
        "Step locked",
        t("Complete the previous step first."),
        "warning"
      );
      return;
    }

    setVisited((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    setActiveStep(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => goTo(activeStep + 1);
  const back = () => goTo(activeStep - 1, { validate: false });

  // ── Watch for live calc / locking ───────────────────────────────────
  const watchedCustomer = watch("customer_id");
  const watchedLeadId = watch("lead_id");
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const liveMargin = useWatch({ control, name: "margin_pct" });
  const liveRate = useWatch({ control, name: "exchange_rate" });
  const liveFreight = useWatch({ control, name: "freight_total" });
  const liveCurrencyCode = useWatch({ control, name: "currency_code" });
  const liveStatus = useWatch({ control, name: "status" });

  const isLocked = isEdit && liveStatus && liveStatus !== "draft";

  // ── URL lead_id seeding (one-time) ──────────────────────────────────
  useEffect(() => {
    if (urlLeadId && !isEdit) setValue("lead_id", urlLeadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLeadId]);

  // Load lead detail whenever a lead_id is set.
  useEffect(() => {
    if (watchedLeadId) dispatch(getLead(watchedLeadId));
  }, [watchedLeadId, dispatch]);

  // Auto-fill empty fields from loaded lead.
  useEffect(() => {
    const lead = leadStore?.leadItem;
    if (!lead || lead._id !== watchedLeadId) return;
    // Prefer the converted customer (set when the lead was won + converted)
    // over the original linked customer — a converted lead always points
    // at its new customer record via converted_customer_id.
    const customerFromLead =
      lead.converted_customer_id || lead.customer_id;
    if (customerFromLead && !watch("customer_id")) {
      setValue("customer_id", customerFromLead);
    }
    if (lead.currency && !watch("currency_code")) {
      setValue("currency_code", lead.currency);
    }
    // Manual tracking reference flows Lead → Quotation → SO → Invoice.
    if (lead.reference_no && !watch("reference_no")) {
      setValue("reference_no", lead.reference_no);
    }
    // Lead `description` is the RFQ brief the salesperson captured —
    // copy into internal_notes so the original spec stays attached to
    // the quotation without leaking onto the client-facing PDF.
    if (lead.description && !watch("internal_notes")) {
      setValue("internal_notes", lead.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadStore?.leadItem, watchedLeadId]);

  // ── URL rfq_id seeding (one-time): tag the quotation + fetch the RFQ ──
  useEffect(() => {
    if (urlRfqId && !isEdit) {
      setValue("rfq_id", urlRfqId);
      // Drop any RFQ left in the store from the detail page so the line
      // seed below fires on the FRESH fetch — i.e. AFTER the wizard's
      // mount reset() — and isn't wiped by it.
      dispatch(cleanRfqItem());
      dispatch(getRfq(urlRfqId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRfqId]);

  // rfq_id flow: once the RFQ lands, set lead_id from it so the lead detail
  // loads — the lead-seed effect below then drives line + best-price fill.
  useEffect(() => {
    const rfq = rfqStore?.rfqItem;
    if (isEdit || !urlRfqId || !rfq || rfq._id !== urlRfqId) return;
    if (rfq.lead_id && !watch("lead_id")) setValue("lead_id", rfq.lead_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqStore?.rfqItem, urlRfqId]);

  // Seed line items from the source LEAD, once, when generating a quotation
  // from a lead (urlLeadId path, and the rfq_id path which also carries a
  // lead). The lead requirement lines carry product/qty/unit/HSN/specs only;
  // vendor + price are decided HERE by auto-picking the cheapest current
  // price-list row per product (price-list best-prices), stamping the
  // provenance (price_list_id / source_rfq_*) so the line shows where its
  // price came from. The previous rfq is_selected-driven seeding is gone —
  // pricing is now driven by best-prices, not the RFQ.
  const leadSeededRef = useRef(false);
  const formReadyRef = useRef(false);
  useEffect(() => {
    const seedLeadId = urlLeadId || urlRfqId; // both flows seed from the lead
    if (isEdit || !seedLeadId || !formReadyRef.current || leadSeededRef.current)
      return;
    const lead = leadStore?.leadItem;
    // Wait for the lead matching the one we're seeding from. In the rfq_id
    // flow the lead arrives via the RFQ's lead_id; the lead detail load is
    // triggered by the watchedLeadId effect once lead_id is set on the form.
    if (!lead || !(lead.lines || []).length) return;
    if (urlLeadId && lead._id !== urlLeadId) return;
    // Wait for the product dropdown so the master fallback (price / margin /
    // rebates / expenses) is available before we seed the lines.
    if (!(productStore?.productDropdown || []).length) return;

    leadSeededRef.current = true;

    // Product master lookup (selling_price / tax_pct / margin_pct / hsn_code /
    // product_rebates / product_expenses) — the fallback source when a product
    // has no price-list row.
    const masterById = {};
    (productStore?.productDropdown || []).forEach((p) => {
      if (p?._id) masterById[p._id] = p;
    });
    const mapRebates = (m) =>
      (m?.product_rebates || []).map((r) => ({
        rebate_id: r.rebate_id,
        code: r.code,
        name: r.name,
        type: r.type ?? "percent",
        pct: String(r.pct ?? "0"),
      }));
    const mapExpenses = (m) =>
      (m?.product_expenses || []).map((e) => ({
        expense_id: e.expense_id,
        code: e.code,
        name: e.name,
        type: e.type ?? "fixed",
        value: String(e.value ?? "0"),
      }));

    const seeded = (lead.lines || [])
      .filter((ll) => ll.product_id)
      .map((ll) => {
        const m = masterById[ll.product_id];
        return {
          ...initQuotationLineItem,
          product_id: ll.product_id,
          description: ll.description || "",
          customer_reference: ll.customer_reference || "",
          qty: ll.qty != null ? String(ll.qty) : "",
          unit: ll.unit || m?.unit_of_measure || "",
          hs_code: ll.hs_code || (m?.hsn_code != null ? String(m.hsn_code) : ""),
          part_no: ll.part_no || m?.part_no || "",
          // GST %, margin, and rebate/expense snapshots come from the product
          // master (source of truth); all overridable per line.
          tax_pct: m?.tax_pct != null ? String(m.tax_pct) : "0",
          margin_pct: m?.margin_pct != null ? String(m.margin_pct) : "0",
          product_rebates_snapshot: mapRebates(m),
          product_expenses_snapshot: mapExpenses(m),
          net_weight_kg: ll.net_weight_kg != null ? String(ll.net_weight_kg) : "0",
          gross_weight_kg:
            ll.gross_weight_kg != null ? String(ll.gross_weight_kg) : "0",
          package_count: ll.package_count != null ? Number(ll.package_count) : 0,
          // Cost basis: price-list best price overrides below; otherwise the
          // product master's default selling price stands.
          unit_price: m?.selling_price != null ? String(m.selling_price) : "0",
          vendor_id: "",
        };
      });

    if (!seeded.length) return;

    // Auto-pick the cheapest current price per product, stamping provenance.
    const productIds = Array.from(
      new Set(seeded.map((l) => l.product_id).filter(Boolean))
    );
    const applyAndReset = (bestByProduct) => {
      const filled = seeded.map((l) => {
        const r = bestByProduct[l.product_id];
        // No price-list row → keep the product-master fallback already seeded
        // (selling_price / margin / rebates / expenses).
        if (!r) return l;
        // Price-list row wins for the cost basis + vendor; margin falls back to
        // the master when the price-list row carries none; rebate/expense
        // snapshots stay from the master (product-intrinsic).
        return {
          ...l,
          vendor_id: r.vendor_id || "",
          unit_price: r.unit_price != null ? String(r.unit_price) : l.unit_price,
          discount_pct:
            r.discount_pct != null ? String(r.discount_pct) : "0",
          margin_pct:
            r.margin_pct != null && r.margin_pct !== ""
              ? String(r.margin_pct)
              : l.margin_pct,
          price_list_id: r.price_list_id || "",
          source_rfq_id: r.source_type === "rfq" ? r.source_rfq_id || "" : "",
          source_rfq_voucher_no:
            r.source_type === "rfq" ? r.source_rfq_voucher_no || "" : "",
        };
      });
      // Seed via reset() (not setValue) — SalesDocLineItems renders from
      // useFieldArray.fields, which only re-syncs on a form-level reset.
      const cur = getValues();
      reset({
        ...cur,
        lead_id: cur.lead_id || lead._id || "",
        lines: filled,
      });
    };

    if (!productIds.length) {
      applyAndReset({});
      setPricingLoading(false);
      return;
    }
    setPricingLoading(true);
    instance
      .get(API_ENDPOINTS.priceList.bestPrices, {
        params: { product_ids: productIds.join(",") },
      })
      .then((resp) => {
        const rows = resp?.data?.data || [];
        const byProduct = {};
        for (const r of rows) byProduct[r.product_id] = r;
        applyAndReset(byProduct);
        setPricingLoading(false);
      })
      .catch(() => {
        applyAndReset({});
        setPricingLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadStore?.leadItem, urlLeadId, urlRfqId, productStore?.productDropdown]);

  // Exchange rate lookup on currency pick. The fetched master rate ALWAYS
  // populates `rateMeta` (the "Auto-filled / Custom" comparison hint). The
  // form field is auto-written whenever the currency CHANGES to a code we
  // haven't filled for yet:
  //   • New mode: on the user's first pick of each currency.
  //   • Edit mode: on initial load the ref is seeded with the saved
  //     currency (see hydration effect) so the saved rate is preserved;
  //     picking a DIFFERENT currency then pulls that currency's master rate.
  // Tracking the last auto-filled currency in a ref also prevents a
  // downstream re-render (e.g. exchangeOptions arriving late) from
  // clobbering a user override.
  const autoFilledForCurrency = useRef(null);
  useEffect(() => {
    if (!liveCurrencyCode) {
      setRateMeta(null);
      autoFilledForCurrency.current = null;
      return undefined;
    }
    // Guard against a stale response clobbering a just-hydrated rate (e.g. an
    // INR fetch from the form's initial default resolving after the saved
    // currency loads on a slow server). The cleanup cancels the prior fetch.
    let cancelled = false;
    const shouldWriteToField =
      autoFilledForCurrency.current !== liveCurrencyCode;
    const options = currencyStore?.exchangeOptions || [];
    const defaultOpt = options.find((o) => o.is_default);
    instance
      .get(API_ENDPOINTS.currencies.currentRate, {
        params: { to: liveCurrencyCode },
      })
      .then((resp) => {
        if (cancelled) return;
        const data = resp?.data?.data;
        if (!data) return setRateMeta({ missing: true });
        if (shouldWriteToField) {
          autoFilledForCurrency.current = liveCurrencyCode;
          // Trim trailing zeros ("0.01200000" → "0.012").
          setValue("exchange_rate", String(Number(data.rate)));
        }
        setRateMeta({
          rate: Number(data.rate),
          effective_date: data.effective_date,
          same: !!data.same,
          fromCode: data.from_currency_code || defaultOpt?.code,
          toCode: liveCurrencyCode,
        });
      })
      .catch(() => {
        if (!cancelled) setRateMeta({ missing: true });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCurrencyCode, currencyStore?.exchangeOptions, isEdit]);

  // ── Initial loads ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getExchangeRateOptions());
    dispatch(getCurrencyDropdown());
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getRebateDropdown());
    dispatch(getVendorDropdown());
    if (isEdit) {
      dispatch(getQuotation(id));
    } else {
      dispatch(cleanQuotationState());
      reset({
        ...initQuotationItem,
        lead_id: urlLeadId || "",
        rfq_id: urlRfqId || "",
      });
      // Mount reset done — the RFQ line seed may now run safely (any value
      // it writes won't be wiped by this reset).
      formReadyRef.current = true;
    }
    return () => {
      dispatch(cleanQuotationMessage());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  // Hydrate form when edit data lands. Mark all steps visited so
  // the user can jump anywhere immediately.
  useEffect(() => {
    if (isEdit && store?.quotationItem?._id) {
      const q = store.quotationItem;
      // Mark the saved currency as "already filled" so the rate effect
      // keeps the persisted exchange_rate on load and only auto-fills when
      // the user later switches to a different currency.
      autoFilledForCurrency.current = q.currency_code || null;
      // The saved currency belongs to the saved customer — never overwritten
      // by the customer master's current currency when the quote loads.
      currencyFromCustomer.current = q.customer_id || null;
      reset({
        ...initQuotationItem,
        ...q,
        margin_pct: String(q.margin_pct ?? "0"),
        exchange_rate: String(Number(q.exchange_rate ?? 1)),
        freight_total: String(q.freight_total ?? "0"),
        quotation_date:
          (q.quotation_date || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        valid_until: (q.valid_until || "").slice(0, 10) || "",
        lines: (q.lines || []).map((l) => ({
          ...initQuotationLineItem,
          ...l,
          qty: String(l.qty ?? ""),
          unit_price: String(l.unit_price ?? ""),
          discount_pct: String(l.discount_pct ?? "0"),
          tax_pct: String(l.tax_pct ?? "0"),
          product_rebates_snapshot: l.product_rebates_snapshot || [],
          product_expenses_snapshot: l.product_expenses_snapshot || [],
        })),
      });
      // Edit mode → all steps visited so user can jump freely.
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.quotationItem?._id]);

  // Customer address dropdown.
  useEffect(() => {
    if (!watchedCustomer) {
      setCustomerAddressOptions([]);
      return;
    }
    dispatch(getCustomer(watchedCustomer));
  }, [watchedCustomer, dispatch]);

  // Customer whose currency is currently sitting in the form — see the
  // Sales Order wizard for the same guard. Distinguishes "inherited from this
  // customer" from "the user picked this for this customer".
  const currencyFromCustomer = useRef(null);

  useEffect(() => {
    const cust = customerStore?.customerItem;
    if (cust && cust._id === watchedCustomer) {
      const boundId = watch("customer_address_id");
      const filtered = (cust.addresses || []).filter(
        (a) =>
          !a.type ||
          a.type === CUSTOMER_ADDRESS_TYPES.BILL_TO ||
          a.is_default ||
          a._id === boundId
      );
      const opts = filtered.map((a) => ({
        value: a._id,
        label: [a.label, a.address_line1, a.city, a.country]
          .filter(Boolean)
          .join(", "),
        raw: a,
      }));
      setCustomerAddressOptions(opts);

      // Default the currency from the customer record when not already set.
      // The lead's currency only fills if the lead itself carried one; this
      // also covers manually-picked customers and lead-converted customers
      // whose currency was set on the customer, not the lead.
      // Re-applied when the customer CHANGES so the previous customer's
      // currency never sticks; a manual override for the same customer is
      // preserved (the ref only advances here and on edit-hydrate).
      if (cust.currency && currencyFromCustomer.current !== cust._id) {
        currencyFromCustomer.current = cust._id;
        if (watch("currency_code") !== cust.currency) {
          setValue("currency_code", cust.currency);
        }
      }

      // Auto-pick an address when none is bound yet — covers the
      // "New Quotation from Lead" flow where the lead has only a
      // customer link (no specific address). Prefer the explicit
      // default, then first BILL_TO, then any first address.
      if (!boundId && filtered.length) {
        const pick =
          filtered.find((a) => a.is_default) ||
          filtered.find((a) => a.type === CUSTOMER_ADDRESS_TYPES.BILL_TO) ||
          filtered[0];
        if (pick?._id) setValue("customer_address_id", pick._id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerStore?.customerItem, watchedCustomer, watch("customer_address_id")]);

  // Cache the name of whichever customer the store is currently holding (buyer
  // or consignee) so the consignee snapshot never needs the full customer list.
  useEffect(() => {
    const cust = customerStore?.customerItem;
    if (cust?._id)
      setCustomerNameById((m) => ({
        ...m,
        [cust._id]: cust.company_name || cust.name || "",
      }));
  }, [customerStore?.customerItem]);

  // ── Consignee (Ship-to) — mirrors the Sales Order form ──────────────
  // "Same as Buyer" (default) → consignee mirrors the bill-to customer +
  // address and the dropdowns are locked. Uncheck to ship to a different
  // customer; the address then auto-selects that customer's default.
  const watchedConsignee = useWatch({ control, name: "consignee_id" });
  const watchedSameAsBuyer = useWatch({
    control,
    name: "consignee_same_as_buyer",
  });
  const watchedCustomerAddr = useWatch({
    control,
    name: "customer_address_id",
  });
  const [consigneeAddressOptions, setConsigneeAddressOptions] = useState([]);

  // When "Same as Buyer" is on, keep consignee mirrored to the buyer.
  useEffect(() => {
    if (!watchedSameAsBuyer) return;
    if (watchedCustomer && getValues("consignee_id") !== watchedCustomer) {
      setValue("consignee_id", watchedCustomer, { shouldDirty: false });
    }
    const billAddr = getValues("customer_address_id") || "";
    if (getValues("consignee_address_id") !== billAddr) {
      setValue("consignee_address_id", billAddr, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSameAsBuyer, watchedCustomer, watchedCustomerAddr]);

  // Build the consignee address options. Mirror the bill-to options when
  // "Same as Buyer"; otherwise load the picked consignee customer's addresses
  // and auto-pick its default.
  useEffect(() => {
    if (watchedSameAsBuyer) {
      setConsigneeAddressOptions(customerAddressOptions);
      return undefined;
    }
    if (!watchedConsignee) {
      setConsigneeAddressOptions([]);
      return undefined;
    }
    let cancelled = false;
    const applyAddrs = (addrs) => {
      if (cancelled) return;
      const opts = (addrs || []).map((a) => ({
        value: a._id,
        label: [a.label, a.address_line1, a.city, a.country]
          .filter(Boolean)
          .join(", "),
        raw: a,
      }));
      setConsigneeAddressOptions(opts);
      if (addrs && addrs.length) {
        const current = getValues("consignee_address_id");
        const valid = opts.some((o) => o.value === current);
        if (!valid) {
          const def = addrs.find((a) => a.is_default || a.is_primary);
          setValue("consignee_address_id", def?._id || addrs[0]?._id || "", {
            shouldDirty: false,
          });
        }
      } else {
        setValue("consignee_address_id", "", { shouldDirty: false });
      }
    };

    const sameAsBillTo =
      watchedConsignee === watchedCustomer &&
      customerStore?.customerItem?._id === watchedConsignee;
    if (sameAsBillTo) {
      applyAddrs(customerStore.customerItem.addresses || []);
      return undefined;
    }
    instance
      .get(`${API_ENDPOINTS.customers.get}/${watchedConsignee}`)
      .then((resp) => {
        const c = resp?.data?.data;
        if (c?._id)
          setCustomerNameById((m) => ({
            ...m,
            [c._id]: c.company_name || c.name || "",
          }));
        applyAddrs(c?.addresses || []);
      })
      .catch(() => {
        if (!cancelled) setConsigneeAddressOptions([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedSameAsBuyer,
    customerAddressOptions,
    watchedConsignee,
    watchedCustomer,
    customerStore?.customerItem,
  ]);

  // Freeze the picked consignee address into a flat snapshot (name = consignee
  // customer's label) so it survives even if the customer's address changes.
  const buildConsigneeSnapshot = (addrId) => {
    if (!addrId) return undefined;
    const a = consigneeAddressOptions.find((o) => o.value === addrId)?.raw;
    if (!a) return undefined;
    // Name from the per-customer detail cache (populated by the consignee
    // address fetch above) — no full customer list needed.
    const name = customerNameById[getValues("consignee_id")];
    return {
      name: name || undefined,
      address_line1: a.address_line1 || undefined,
      address_line2: a.address_line2 || undefined,
      city: a.city || undefined,
      state: a.state || undefined,
      postcode: a.postcode || undefined,
      country: a.country || undefined,
    };
  };

  // ── Toast on success / error ────────────────────────────────────────
  // Save keeps you on the current step. After a fresh create we silently
  // switch the URL to /edit/:newId so the next Save is a PUT, not another
  // POST (the wizard component instance is preserved across the URL change).
  useEffect(() => {
    if (store?.actionFlag === "QT_CRTD" || store?.actionFlag === "QT_UPDT") {
      Notification("Success", store?.success || t("Saved"), "success");
      dispatch(cleanQuotationMessage());
      // Save completes the wizard → return to the listing.
      navigate(`${appsRoot}/quotations`, { replace: true });
    }
    if (store?.error && !submitting) {
      Notification("Error", store.error, "warning");
      dispatch(cleanQuotationMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.actionFlag, store?.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading, dispatch]);

  // ── Master maps + dropdown options ──────────────────────────────────

  const currencyOptions = useMemo(
    () =>
      (currencyStore?.exchangeOptions || []).map((c) => ({
        value: c.code,
        label: c.name ? `${c.code} - ${c.name}` : c.code,
      })),
    [currencyStore?.exchangeOptions]
  );

  const allProductOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code ? p.code + " - " : ""}${p.name}`,
        raw: p,
      })),
    [productStore?.productDropdown]
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

  const rebateOptions = useMemo(
    () =>
      (rebateStore?.rebateDropdown || []).map((r) => ({
        value: r._id,
        label: r.name,
        raw: r,
      })),
    [rebateStore?.rebateDropdown]
  );

  // currency_code is the source of truth post-migration - the watched value
  // is already the code, no lookup needed.
  const selectedCurrencyCode = liveCurrencyCode || "";

  const productById = useMemo(() => {
    const m = new Map();
    (productStore?.productDropdown || []).forEach((p) => m.set(p._id, p));
    return m;
  }, [productStore?.productDropdown]);

  // ── Costing engine (mirrors backend recompute) ──────────────────────
  const totals = useMemo(
    () =>
      computeDocTotals(liveLines, liveRate, {
        excludeGst: true,
        freightTotal: liveFreight,
      }),
    [liveLines, liveMargin, liveRate, liveFreight]
  );

  // ── Submit (full) ───────────────────────────────────────────────────
  const buildPayload = (values, statusOverride) => {
    if (isLocked) {
      return {
        status: statusOverride || values.status || "draft",
        internal_notes: values.internal_notes?.trim() || undefined,
      };
    }
    return {
      lead_id: values.lead_id || undefined,
      rfq_id: values.rfq_id || undefined,
      customer_id: values.customer_id || undefined,
      customer_address_id: values.customer_address_id || undefined,
      // Consignee (Ship-to) — id + selected address + frozen snapshot.
      // Propagated onto the Sales Order on Generate Sales Order.
      consignee_same_as_buyer: values.consignee_same_as_buyer !== false,
      consignee_id: values.consignee_id || undefined,
      consignee_address_id: values.consignee_address_id || undefined,
      consignee_snapshot: buildConsigneeSnapshot(values.consignee_address_id),
      quotation_date: values.quotation_date,
      valid_until: values.valid_until || undefined,
      reference_no: values.reference_no?.trim() || undefined,
      currency_code: values.currency_code,
      // Vendor (buy) currency — one per document (multi-currency rule). Drives
      // the line-item vendor filter in the costing worksheet.
      vendor_currency_code: values.vendor_currency_code || undefined,
      exchange_rate: values.exchange_rate || "1",
      // Shipment freight (document currency) for a CNF quote — split by qty
      // across lines in the costing worksheet.
      freight_total: values.freight_total ? String(values.freight_total) : "0",
      payment_terms: values.payment_terms?.trim() || undefined,
      delivery_terms: values.delivery_terms?.trim() || undefined,
      delivery_location: values.delivery_location?.trim() || undefined,
      notes_to_client: values.notes_to_client?.trim() || undefined,
      internal_notes: values.internal_notes?.trim() || undefined,
      margin_pct: "0",
      status: statusOverride || values.status || "draft",
      lines: (values.lines || []).map((l) => ({
        product_id: l.product_id,
        vendor_id: l.vendor_id || undefined,
        // Pricing provenance — which price-list row (and source RFQ) the
        // auto-picked vendor price came from.
        price_list_id: l.price_list_id || undefined,
        source_rfq_id: l.source_rfq_id || undefined,
        source_rfq_voucher_no: l.source_rfq_voucher_no || undefined,
        description: l.description || "",
        customer_reference: l.customer_reference || undefined,
        qty: String(l.qty || "0"),
        unit: l.unit || "",
        unit_price: String(l.unit_price || "0"),
        discount_pct: String(l.discount_pct || "0"),
        tax_pct: String(l.tax_pct || "0"),
        margin_pct: String(l.margin_pct || "0"),
        // Per-line freight override (CNF): non-empty = manual, empty = auto.
        freight: l.freight != null && String(l.freight).trim() !== ""
          ? String(l.freight)
          : "",
        product_rebates_snapshot: (l.product_rebates_snapshot || []).map(
          (r) => ({
            rebate_id: r.rebate_id || null,
            code: r.code || "",
            name: r.name || "",
            type: r.type || "percent",
            pct: String(r.pct ?? "0"),
          })
        ),
        product_expenses_snapshot: (l.product_expenses_snapshot || []).map(
          (e) => ({
            expense_id: e.expense_id || null,
            code: e.code || "",
            name: e.name || "",
            type: e.type || "fixed",
            value: String(e.value ?? "0"),
          })
        ),
        // ── Export / Shipping (mirrors PFI line shape) ──
        part_no: l.part_no || undefined,
        // The costing worksheet stores HSN under `hsn_code`; the backend line
        // field is `hs_code`. Fall back so the picked/typed HSN is persisted.
        hs_code: l.hs_code || l.hsn_code || undefined,
        net_weight_kg: String(l.net_weight_kg ?? "0"),
        gross_weight_kg: String(l.gross_weight_kg ?? "0"),
        package_count: Number(l.package_count || 0),
      })),
    };
  };

  const dispatchSave = (payload) => {
    setSubmitting(true);
    const action = isEdit
      ? dispatch(updateQuotation({ id, data: payload }))
      : dispatch(createQuotation(payload));
    // dispatchSafely catches the unwrap() rejection (no React error
    // overlay) and shows the BE message via the right-side toast.
    dispatchSafely(action, { errorTitle: "Error" }).finally(() =>
      setSubmitting(false)
    );
  };

  // Walk steps in order; return the first index whose declared `fields`
  // contain a current validation error. Falls back to the active step.
  const findFirstErrorStep = () => {
    const errs = form.formState.errors || {};
    const hasErr = (path) => {
      // top-level key like "lines" or "customer_id"
      const root = path.split(".")[0];
      return !!errs[root];
    };
    for (let i = 0; i < visibleSteps.length; i++) {
      if ((visibleSteps[i].fields || []).some(hasErr)) return i;
    }
    return activeStep;
  };

  // Single Save action - validates whole form, saves on pass, otherwise
  // jumps to the first step with errors so the user can see them.
  const onSave = async () => {
    const ok = await trigger();
    if (!ok) {
      const firstBad = findFirstErrorStep();
      if (firstBad !== activeStep) {
        setVisited((prev) => {
          const n = new Set(prev);
          n.add(firstBad);
          return n;
        });
        setActiveStep(firstBad);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      Notification(
        "Validation",
        t("Please fix the highlighted fields."),
        "warning"
      );
      return;
    }
    handleSubmit(async (values) => {
      // Offer to add any (vendor, product) not yet in the price list, at the
      // entered rate + today's date. Cancel aborts the save.
      const proceed = await confirmAndCreateMissingPrices({
        lines: (values.lines || []).map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          vendor_id: l.vendor_id,
          vendor_name: l.vendor_name,
          unit_price: l.unit_price,
        })),
        t,
        currencySymbol:
          getCurrencySymbol(values.vendor_currency_code) || "",
      });
      if (!proceed) return;
      dispatchSave(buildPayload(values));
    })();
  };

  // ── Step body context (props passed to all steps) ───────────────────
  const stepCtx = {
    isEdit,
    isLocked,
    pricingLoading,
    rateMeta,
    customerAddressOptions,
    consigneeAddressOptions,
    currencyOptions,
    productOptions: allProductOptions,
    allProductOptions,
    expenseOptions,
    rebateOptions,
    leadStore,
    vendorStore,
    productById,
    selectedCurrencyCode,
    baseCurrencyCode:
      (currencyStore?.currencyDropdown || []).find((c) => c.is_default)
        ?.code || "",
    exchangeRate: num(liveRate) || 1,
    totals,
    onRevertToDraft: () =>
      setValue("status", "draft", { shouldDirty: true }),
  };

  const ActiveStepComponent = visibleSteps[activeStep]?.Component;

  return (
    <Fragment>
      <div className="main-content quotation-add quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEdit ? t("Edit Quotation") : t("Add Quotation")}
            {isEdit && store?.quotationItem?.voucher_no
              ? ` - ${store.quotationItem.voucher_no}`
              : ""}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <FormProvider {...form}>
          <Form onSubmit={(e) => e.preventDefault()}>
            {isLocked && (
              <div className="alert alert-warning mb-2">
                <div className="alert-body d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <strong>
                      {t("This quotation is")} {liveStatus}.
                    </strong>{" "}
                    {t(
                      "Fields are locked. Revert to draft to make changes - Status field stays editable."
                    )}
                  </div>
                  <Button
                    size="sm"
                    color="warning"
                    outline
                    type="button"
                    className="flex-shrink-0"
                    onClick={stepCtx.onRevertToDraft}
                  >
                    {t("Revert to Draft")}
                  </Button>
                </div>
              </div>
            )}

            <WizardHeader
              steps={visibleSteps}
              activeStep={activeStep}
              visited={visited}
              onStepClick={goTo}
              isEdit={isEdit}
            />

            <Card>
              <CardBody>
                <div className="wizard-step-body">
                  {ActiveStepComponent ? (
                    <ActiveStepComponent {...stepCtx} />
                  ) : (
                    <div className="text-center p-5">
                      <Spinner />
                    </div>
                  )}
                </div>

                <WizardFooter
                  isFirst={activeStep === 0}
                  isLast={activeStep === visibleSteps.length - 1}
                  isEdit={isEdit}
                  onBack={back}
                  onNext={next}
                  onSubmit={onSave}
                  onCancel={() => navigate(`${appsRoot}/quotations`)}
                  submitting={submitting}
                />
              </CardBody>
            </Card>
          </Form>
        </FormProvider>
      </div>
    </Fragment>
  );
};

export default QuotationWizard;
