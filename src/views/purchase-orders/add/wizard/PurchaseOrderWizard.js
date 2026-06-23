// ── Purchase Order Wizard Orchestrator ──────────────────────────────
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardBody, Form, Spinner, Button } from "reactstrap";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "react-feather";

import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  cleanPurchaseOrderMessage,
  cleanPurchaseOrderState,
} from "../../store";
import { getVendorDropdown, getVendor } from "../../../vendors/store";
import { getProductDropdown } from "../../../products/store";
import { getCustomerDropdown, getCustomer } from "../../../customers/store";
import { getExpenseDropdown } from "../../../expenses/store";
import { getRebateDropdown } from "../../../rebates/store";
import {
  getExchangeRateOptions,
  getCurrencyDropdown,
} from "../../../currencies/store";
import { startLoading, stopLoading } from "../../../loadingstore";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

import { appsRoot } from "@constant/defaultValues";
import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import {
  initPurchaseOrderItem,
  initPurchaseOrderLineItem,
} from "@constant/reduxConstant";

import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

import { STEPS } from "./steps";

// Normalise state names so "Gujarat" / "gujarat" / " Gujarat " match.
const normState = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const PurchaseOrderWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEdit = !!id;

  const store = useSelector((s) => s.purchaseOrder);
  const vendorStore = useSelector((s) => s.vendor);
  const productStore = useSelector((s) => s.product);
  const customerStore = useSelector((s) => s.customer);
  const companyStore = useSelector((s) => s.company);
  const currencyStore = useSelector((s) => s.currency);
  const expenseStore = useSelector((s) => s.expense);
  const rebateStore = useSelector((s) => s.rebate);

  const [submitting, setSubmitting] = useState(false);
  const [vendorPriceList, setVendorPriceList] = useState([]);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);
  const [rateMeta, setRateMeta] = useState(null);

  const schema = useMemo(
    () =>
      yup.object().shape({
        // Header vendor_id is legacy / optional. PO is multi-vendor at
        // line level — each line carries its own vendor_id.
        vendor_id: yup.string().nullable(),
        customer_id: yup
          .string()
          .trim()
          .required(t("Customer is required")),
        currency_code: yup
          .string()
          .trim()
          .required(t("Currency is required")),
        po_date: yup.string().trim().required(t("PO date is required")),
        delivery_address: yup.string().nullable(),
        delivery_address_id: yup.string().nullable(),
        expected_delivery_date: yup.string().nullable(),
        payment_terms: yup.string().nullable().max(100),
        delivery_terms: yup.string().nullable().max(100),
        notes_to_vendor: yup.string().nullable().max(2000),
        internal_notes: yup.string().nullable().max(2000),
        status: yup.string().nullable(),
        vendor_address_id: yup.string().nullable(),
        lines: yup
          .array()
          .of(
            yup.object().shape({
              vendor_id: yup
                .string()
                .required(t("Vendor is required")),
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
    defaultValues: initPurchaseOrderItem,
  });
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;

  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));

  const visibleSteps = useMemo(
    () => STEPS.filter((s) => !s.isVisible || s.isVisible(form)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [STEPS, form]
  );

  const goTo = async (idx, { validate = true } = {}) => {
    if (idx === activeStep) return;
    if (idx < 0 || idx >= visibleSteps.length) return;
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
      const n = new Set(prev);
      n.add(idx);
      return n;
    });
    setActiveStep(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => goTo(activeStep + 1);
  const back = () => goTo(activeStep - 1, { validate: false });

  const watchedVendor = watch("vendor_id");
  const watchedVendorAddr = watch("vendor_address_id");
  const watchedCustomer = useWatch({ control, name: "customer_id" });
  const watchedCustomerAddr = useWatch({
    control,
    name: "customer_address_id",
  });
  const liveCurrencyCode = useWatch({ control, name: "currency_code" });
  const liveStatus = useWatch({ control, name: "status" });
  const isLocked = isEdit && liveStatus && liveStatus !== "draft";

  // ── Initial dropdowns + edit hydration ──
  useEffect(() => {
    dispatch(getVendorDropdown());
    dispatch(getProductDropdown());
    dispatch(getCustomerDropdown());
    dispatch(getExchangeRateOptions());
    dispatch(getCurrencyDropdown());
    dispatch(getCompanyDetails());
    dispatch(getExpenseDropdown());
    dispatch(getRebateDropdown());
    if (isEdit) {
      dispatch(getPurchaseOrder(id));
    } else {
      dispatch(cleanPurchaseOrderState());
      // Start a new SO with NO currency so the required-currency validation
      // actually engages — the shared init defaults to "INR", which made the
      // field never empty and let "Next" through without an explicit pick.
      reset({ ...initPurchaseOrderItem, currency_code: "" });
    }
    return () => {
      dispatch(cleanPurchaseOrderMessage());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  // Hydrate on edit.
  useEffect(() => {
    if (isEdit && store?.purchaseOrderItem?._id) {
      const p = store.purchaseOrderItem;
      // Seed the saved currency so the rate effect preserves the persisted
      // exchange_rate on load and only auto-fills on a later currency change.
      autoFilledForCurrency.current = p.currency_code || null;
      reset({
        ...initPurchaseOrderItem,
        ...p,
        po_date:
          (p.po_date || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        expected_delivery_date:
          (p.expected_delivery_date || "").slice(0, 10) || "",
        lines: (p.lines || []).map((l) => ({
          ...initPurchaseOrderLineItem,
          ...l,
          qty: String(l.qty ?? ""),
          unit_price: String(l.unit_price ?? ""),
          discount_pct: String(l.discount_pct ?? "0"),
          tax_pct: String(l.tax_pct ?? "0"),
          hsn_code: l.hsn_code || "",
          unit: l.unit || "",
          description: l.description || "",
        })),
      });
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.purchaseOrderItem?._id]);

  // Pre-fill delivery_address is now handled by CompanyAddressSelect
  // (auto-picks the first warehouse/corporate address). No legacy
  // company.default_po_delivery_address fallback - that field has
  // been retired in this refactor.

  // Load vendor details (for vendor addresses dropdown).
  useEffect(() => {
    if (!watchedVendor) return;
    dispatch(getVendor(watchedVendor));
  }, [watchedVendor, dispatch]);

  // Customer master → addresses for the bill-to dropdown.
  useEffect(() => {
    if (!watchedCustomer) {
      setCustomerAddressOptions([]);
      return;
    }
    dispatch(getCustomer(watchedCustomer));
  }, [watchedCustomer, dispatch]);

  useEffect(() => {
    const cust = customerStore?.customerItem;
    if (cust && cust._id === watchedCustomer) {
      const addrs = cust.addresses || [];
      const opts = addrs.map((a) => ({
        value: a._id,
        label: [a.label, a.address_line1, a.city, a.country]
          .filter(Boolean)
          .join(", "),
        raw: a,
      }));
      setCustomerAddressOptions(opts);

      // Default the currency from the customer record when not already set —
      // mirrors the quotation wizard. Without this, picking a customer filled
      // the address but left Currency blank.
      if (cust.currency && !form.getValues("currency_code")) {
        setValue("currency_code", cust.currency, { shouldDirty: true });
      }

      // Auto-select the customer's address: prefer a default/primary one, else
      // the first. Only when none is chosen yet or the chosen one doesn't
      // belong to this customer (e.g. after switching customers) — a valid
      // saved/manual pick is left untouched.
      if (addrs.length) {
        const current = form.getValues("customer_address_id");
        const valid = opts.some((o) => o.value === current);
        if (!valid) {
          const def = addrs.find((a) => a.is_default || a.is_primary);
          setValue("customer_address_id", def?._id || addrs[0]?._id || "", {
            shouldDirty: true,
          });
        }
      }
    }
  }, [customerStore?.customerItem, watchedCustomer]);

  // ── Consignee (Ship-to) ──
  // "Same as Buyer" (default) → consignee mirrors the bill-to customer +
  // address and the dropdowns are locked. Uncheck to ship to a different
  // customer; the address then auto-selects that customer's default.
  const watchedConsignee = useWatch({ control, name: "consignee_id" });
  const watchedSameAsBuyer = useWatch({
    control,
    name: "consignee_same_as_buyer",
  });
  const [consigneeAddressOptions, setConsigneeAddressOptions] = useState([]);

  // When "Same as Buyer" is on, keep consignee mirrored to the buyer.
  useEffect(() => {
    if (!watchedSameAsBuyer) return;
    if (watchedCustomer && form.getValues("consignee_id") !== watchedCustomer) {
      setValue("consignee_id", watchedCustomer, { shouldDirty: false });
    }
    const billAddr = form.getValues("customer_address_id") || "";
    if (form.getValues("consignee_address_id") !== billAddr) {
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
        const current = form.getValues("consignee_address_id");
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
      .then((resp) => applyAddrs(resp?.data?.data?.addresses || []))
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

  // Exchange rate lookup on currency pick. The fetched master rate ALWAYS
  // populates `rateMeta` (the "Auto-filled / Custom" comparison hint), but
  // the form field is only auto-written:
  //   • New mode: on the user's first pick of each currency.
  //   • Edit mode: never — the saved rate is the source of truth.
  // Tracking the last auto-filled currency in a ref prevents a downstream
  // re-render (e.g. exchangeOptions arriving late) from clobbering a user
  // override.
  const autoFilledForCurrency = useRef(null);
  useEffect(() => {
    if (!liveCurrencyCode) {
      setRateMeta(null);
      autoFilledForCurrency.current = null;
      return undefined;
    }
    // Guard against a stale response: on edit the form briefly defaults to INR
    // before the saved SO currency hydrates, firing an INR rate fetch. On a
    // slow server that resolves AFTER hydration and would otherwise clobber the
    // saved rate with 1. The cleanup cancels the previous currency's fetch.
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

  // Load vendor price list whenever vendor changes.
  useEffect(() => {
    if (!watchedVendor) {
      setVendorPriceList([]);
      return;
    }
    instance
      .get(API_ENDPOINTS.priceList.list, {
        params: { vendor_id: watchedVendor, perPage: 500 },
      })
      .then((resp) => setVendorPriceList(resp?.data?.data || []))
      .catch(() => setVendorPriceList([]));
  }, [watchedVendor]);

  // Vendor → list of addresses.
  const vendorAddressOptions = useMemo(() => {
    const v = vendorStore?.vendorItem;
    if (!v || v._id !== watchedVendor) return [];
    return (v.addresses || []).map((a) => ({
      value: a._id,
      label: [a.label, a.address_line1, a.city, a.state, a.country]
        .filter(Boolean)
        .join(", "),
      raw: a,
    }));
  }, [vendorStore?.vendorItem, watchedVendor]);

  // Auto-pick vendor's default address on new PO.
  useEffect(() => {
    if (!watchedVendor) return;
    if (watchedVendorAddr) return;
    const v = vendorStore?.vendorItem;
    if (!v || v._id !== watchedVendor) return;
    const def =
      (v.addresses || []).find((a) => a.is_default) ||
      (v.addresses || [])[0];
    if (def?._id) {
      setValue("vendor_address_id", def._id, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorStore?.vendorItem, watchedVendor]);

  // Vendor's state (from the picked address) drives intra/inter-state GST.
  const vendorState = useMemo(() => {
    const v = vendorStore?.vendorItem;
    if (!v || v._id !== watchedVendor) return "";
    const addr =
      (v.addresses || []).find((a) => a._id === watchedVendorAddr) ||
      (v.addresses || []).find((a) => a.is_default) ||
      (v.addresses || [])[0];
    return addr?.state || "";
  }, [vendorStore?.vendorItem, watchedVendor, watchedVendorAddr]);

  const companyState = useMemo(() => {
    const ci = companyStore?.companyItem;
    if (!ci) return "";
    const addrs = ci.addresses || [];
    const corp =
      addrs.find((a) => a.type === "corporate" && a.is_default) ||
      addrs.find((a) => a.type === "corporate") ||
      addrs.find((a) => a.is_default) ||
      addrs[0];
    return corp?.state || ci.state || "";
  }, [companyStore?.companyItem]);

  const intraState =
    !!vendorState && !!companyState && normState(vendorState) === normState(companyState);

  // ── Product master map (full product dropdown) ──
  const productById = useMemo(() => {
    const m = new Map();
    (productStore?.productDropdown || []).forEach((p) => m.set(p._id, p));
    return m;
  }, [productStore?.productDropdown]);

  // ── Vendor → price list product set ──
  // Only products on this vendor's price list can be added (per plan §8).
  const priceByProduct = useMemo(() => {
    const m = new Map();
    for (const r of vendorPriceList) {
      const pid = r.product_id?.toString?.() || r.product_id;
      if (!pid) continue;
      // Keep first occurrence (price-list returns desc by effective_date).
      if (!m.has(pid)) m.set(pid, r);
    }
    return m;
  }, [vendorPriceList]);

  // Full client-side product list — feeds the "Show all products"
  // toggle inside the line-item modal.
  const allProductOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code ? p.code + " - " : ""}${p.name}`,
        raw: p,
      })),
    [productStore?.productDropdown]
  );

  // Same product option shape but named differently — SalesDocLineItems
  // consumes both `productOptions` and `allProductOptions`.
  const productOptions = allProductOptions;

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

  const liveExchangeRate = useWatch({ control, name: "exchange_rate" });
  const exchangeRate = Number(liveExchangeRate) || 1;
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const totals = useMemo(
    () => computeDocTotals(liveLines, exchangeRate, { excludeGst: true }),
    [liveLines, exchangeRate]
  );

  const vendorProductOptions = useMemo(() => {
    const opts = [];
    for (const [pid] of priceByProduct) {
      const p = productById.get(pid);
      if (!p) continue;
      opts.push({
        value: pid,
        label: `${p.code ? p.code + " - " : ""}${p.name}`,
        raw: p,
      });
    }
    return opts;
  }, [priceByProduct, productById]);

  const vendorOptions = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).map((v) => ({
        value: v._id,
        label: v.company_name || v.name,
      })),
    [vendorStore?.vendorDropdown]
  );

  // Customer options - inject a synthetic option for the currently
  // linked customer when it's missing from the dropdown (inactive /
  // soft-deleted / not on current page). Ensures the Select still
  // renders the correct label in edit mode.
  const customerOptions = useMemo(() => {
    const base = (customerStore?.customerDropdown || []).map((c) => ({
      value: c._id,
      label: c.company_name,
    }));
    const linkedId = store?.purchaseOrderItem?.customer_id;
    const linkedName = store?.purchaseOrderItem?.customer_name;
    if (linkedId && linkedName && !base.find((o) => o.value === linkedId)) {
      return [{ value: linkedId, label: `${linkedName} (linked)` }, ...base];
    }
    return base;
  }, [
    customerStore?.customerDropdown,
    store?.purchaseOrderItem?.customer_id,
    store?.purchaseOrderItem?.customer_name,
  ]);

  const currencyOptions = useMemo(
    () =>
      (currencyStore?.exchangeOptions || []).map((c) => ({
        value: c.code,
        label: c.name ? `${c.code} - ${c.name}` : c.code,
      })),
    [currencyStore?.exchangeOptions]
  );

  // Freeze the picked consignee address into a flat snapshot (name = consignee
  // customer's label) so it survives even if the customer's address changes.
  const buildConsigneeSnapshot = (addrId) => {
    if (!addrId) return undefined;
    const a = consigneeAddressOptions.find((o) => o.value === addrId)?.raw;
    if (!a) return undefined;
    const name = customerOptions.find(
      (o) => o.value === form.getValues("consignee_id")
    )?.label;
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

  // ── Submit ──
  const buildPayload = (values) => {
    if (isLocked) {
      return {
        status: values.status || "draft",
        internal_notes: values.internal_notes?.trim() || undefined,
      };
    }
    return {
      // Header vendor_id intentionally omitted — PO is multi-vendor at
      // line level (each line carries its own vendor_id).
      vendor_address_id: values.vendor_address_id || undefined,
      customer_id: values.customer_id || undefined,
      customer_address_id: values.customer_address_id || undefined,
      // Consignee (Ship-to) — id + selected address + frozen snapshot.
      consignee_same_as_buyer: values.consignee_same_as_buyer !== false,
      consignee_id: values.consignee_id || undefined,
      consignee_address_id: values.consignee_address_id || undefined,
      consignee_snapshot: buildConsigneeSnapshot(values.consignee_address_id),
      quotation_id: values.quotation_id || undefined,
      pfi_id: values.pfi_id || undefined,
      po_date: values.po_date,
      expected_delivery_date: values.expected_delivery_date || undefined,
      delivery_address: values.delivery_address?.trim() || undefined,
      delivery_address_id: values.delivery_address_id || undefined,
      payment_terms: values.payment_terms?.trim() || undefined,
      delivery_terms: values.delivery_terms?.trim() || undefined,
      notes_to_vendor: values.notes_to_vendor?.trim() || undefined,
      internal_notes: values.internal_notes?.trim() || undefined,
      currency_code: values.currency_code || "INR",
      exchange_rate: values.exchange_rate || "1",
      status: values.status || "draft",
      lines: (values.lines || []).map((l) => ({
        // Preserve _id on existing lines — backend keys upsert by it,
        // and POV lines reference PO lines via purchase_order_line_id.
        _id: l._id || undefined,
        product_id: l.product_id,
        vendor_id: l.vendor_id,
        source_quotation_line_id: l.source_quotation_line_id || undefined,
        source_pfi_line_id: l.source_pfi_line_id || undefined,
        description: l.description || "",
        customer_reference: l.customer_reference || undefined,
        hsn_code: l.hsn_code || undefined,
        qty: String(l.qty || "0"),
        unit: l.unit || "",
        unit_price: String(l.unit_price || "0"),
        discount_pct: String(l.discount_pct || "0"),
        tax_pct: String(l.tax_pct || "0"),
      })),
    };
  };

  const dispatchSave = (payload) => {
    setSubmitting(true);
    const action = isEdit
      ? dispatch(updatePurchaseOrder({ id, data: payload }))
      : dispatch(createPurchaseOrder(payload));
    // Don't `.unwrap()` - it re-throws on rejectWithValue and surfaces as
    // an uncaught runtime error overlay in dev. The thunk's rejection is
    // already captured into store.error and shown as a toast by the
    // useEffect below.
    action.finally?.(() => setSubmitting(false));
  };

  const findFirstErrorStep = () => {
    const errs = form.formState.errors || {};
    const hasErr = (path) => !!errs[path.split(".")[0]];
    for (let i = 0; i < visibleSteps.length; i++) {
      if ((visibleSteps[i].fields || []).some(hasErr)) return i;
    }
    return activeStep;
  };

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
    handleSubmit((values) => dispatchSave(buildPayload(values)))();
  };

  // Save completes → back to listing.
  useEffect(() => {
    if (
      store?.actionFlag === "PO_CRTD" ||
      store?.actionFlag === "PO_UPDT"
    ) {
      Notification("Success", store?.success || t("Saved"), "success");
      dispatch(cleanPurchaseOrderMessage());
      navigate(`${appsRoot}/purchase-orders`, { replace: true });
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanPurchaseOrderMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.actionFlag, store?.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading, dispatch]);

  const stepCtx = {
    isEdit,
    isLocked,
    vendorOptions,
    customerOptions,
    customerAddressOptions,
    consigneeAddressOptions,
    currencyOptions,
    rateMeta,
    vendorAddressOptions,
    productById,
    priceByProduct,
    vendorProductOptions,
    allProductOptions,
    productOptions,
    expenseOptions,
    rebateOptions,
    selectedCurrencyCode: liveCurrencyCode || "",
    baseCurrencyCode: "INR",
    exchangeRate,
    totals,
    intraState,
    sourcePfiVoucher: store?.purchaseOrderItem?.pfi_voucher_no,
    sourcePfiId: store?.purchaseOrderItem?.pfi_id,
    sourceQuotationVoucher: store?.purchaseOrderItem?.quotation_voucher_no,
    sourceQuotationId: store?.purchaseOrderItem?.quotation_id,
    onRevertToDraft: () =>
      setValue("status", "draft", { shouldDirty: true }),
  };

  const ActiveStepComponent = visibleSteps[activeStep]?.Component;

  return (
    <Fragment>
      <div className="main-content purchase-orders-add quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEdit ? t("Edit Sales Order") : t("Add Sales Order")}
            {isEdit && store?.purchaseOrderItem?.voucher_no
              ? ` - ${store.purchaseOrderItem.voucher_no}`
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
                      {t("This PO is")} {liveStatus.replace(/_/g, " ")}.
                    </strong>{" "}
                    {t(
                      "Fields are locked. Revert to draft to make changes - status & internal notes stay editable."
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
                  onCancel={() => navigate(`${appsRoot}/purchase-orders`)}
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

export default PurchaseOrderWizard;
