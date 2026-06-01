// ── PFI Wizard Orchestrator ───────────────────────────────────────────
// Mirrors QuotationWizard. Differences: pfi_date field name, no lead URL
// param / category filter, source-quotation banner.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { Card, CardBody, Form, Spinner, Button } from "reactstrap";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "react-feather";

import {
  createPfi,
  updatePfi,
  getPfi,
  cleanPfiMessage,
  cleanPfiState,
} from "../../store";
import { getQuotation } from "@src/views/quotations/store";
import { getCustomerDropdown, getCustomer } from "../../../customers/store";
import {
  getExchangeRateOptions,
  getCurrencyDropdown,
} from "../../../currencies/store";
import { getProductDropdown } from "../../../products/store";
import { getExpenseDropdown } from "../../../expenses/store";
import { getRebateDropdown } from "../../../rebates/store";
import { getLead } from "../../../leads/store";
import { getVendorDropdown } from "../../../vendors/store";
import { startLoading, stopLoading } from "../../../loadingstore";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { dispatchSafely } from "@src/utility/dispatchSafely";

import { appsRoot } from "@constant/defaultValues";
import { initPfiItem, initPfiLineItem } from "@constant/reduxConstant";
import { CUSTOMER_ADDRESS_TYPES } from "@constant/options";

import { num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";

import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

import { STEPS } from "./steps";

const PfiWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const location = useLocation();
  const sourceQuotationIdFromUrl = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return sp.get("quotation_id") || "";
  }, [location.search]);
  const isEdit = !!id;

  const store = useSelector((s) => s.pfi);
  const quotationStore = useSelector((s) => s.quotation);
  const customerStore = useSelector((s) => s.customer);
  const currencyStore = useSelector((s) => s.currency);
  const productStore = useSelector((s) => s.product);
  const expenseStore = useSelector((s) => s.expense);
  const rebateStore = useSelector((s) => s.rebate);
  const leadStore = useSelector((s) => s.lead);
  const vendorStore = useSelector((s) => s.vendor);
  const companyStore = useSelector((s) => s.company);

  const [submitting, setSubmitting] = useState(false);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);
  const [rateMeta, setRateMeta] = useState(null);

  const schema = useMemo(
    () =>
      yup.object().shape({
        customer_id: yup.string().trim().required(t("Customer is required")),
        currency_code: yup.string().trim().required(t("Currency is required")),
        pfi_date: yup.string().trim().required(t("PFI date is required")),
        valid_until: yup.string().nullable(),
        customer_address_id: yup.string().nullable(),
        exchange_rate: yup.string().nullable(),
        payment_terms: yup.string().nullable().max(100),
        delivery_terms: yup.string().nullable().max(100),
        delivery_location: yup.string().nullable().max(200),
        notes_to_client: yup.string().nullable().max(2000),
        internal_notes: yup.string().nullable().max(2000),
        margin_pct: yup.string().nullable(),
        status: yup.string().nullable(),
        quotation_id: yup.string().nullable(),
        lead_id: yup.string().nullable(),
        // ── Shipping & Packing step ──
        port_of_loading: yup
          .string()
          .nullable()
          .transform((v) => (typeof v === "string" ? v.trim() : v))
          .required(t("Port of Loading is required"))
          .max(150),
        port_of_discharge: yup
          .string()
          .nullable()
          .transform((v) => (typeof v === "string" ? v.trim() : v))
          .required(t("Port of Discharge is required"))
          .max(150),
        final_destination: yup.string().nullable().max(150),
        country_of_origin: yup
          .string()
          .nullable()
          .transform((v) => (typeof v === "string" ? v.trim() : v))
          .required(t("Country of Origin is required"))
          .max(100),
        country_of_final_destination: yup
          .string()
          .nullable()
          .transform((v) => (typeof v === "string" ? v.trim() : v))
          .required(t("Country of Final Destination is required"))
          .max(100),
        mode_of_shipment: yup
          .string()
          .nullable()
          .required(t("Mode of Shipment is required"))
          .oneOf(["sea", "air", "road"], t("Mode of Shipment is required")),
        container_details: yup.string().nullable().max(200),
        est_shipment_date: yup.string().nullable(),
        est_delivery_date: yup.string().nullable(),
        packing_marks: yup.string().nullable().max(200),
        packing_type: yup
          .array()
          .of(yup.string())
          .min(1, t("Packing Type is required"))
          .required(t("Packing Type is required")),
        container_used: yup
          .boolean()
          .nullable()
          .transform((v) => (v === "" || v == null ? null : v)),
        container_no: yup.string().nullable().max(50),
        seal_no: yup.string().nullable().max(50),
        container_load_type: yup
          .string()
          .nullable()
          .oneOf(["", "FCL", "LCL", null], t("Invalid load type")),
        validity_days: yup
          .number()
          .transform((v, o) => (o === "" || o == null ? undefined : v))
          .nullable()
          .integer()
          .min(0),
        // payment_terms_text removed — payment_terms (Step 1) is the SoT.
        declaration_text: yup
          .string()
          .nullable()
          .transform((v) => (typeof v === "string" ? v.trim() : v))
          .required(t("Declaration is required"))
          .max(4000),
        bank_account_id: yup
          .string()
          .nullable()
          .required(t("Bank Account is required")),
        lines: yup
          .array()
          .of(
            yup.object().shape({
              product_id: yup.string().required(t("Product is required")),
              qty: yup.string().required(t("Qty is required")),
              unit_price: yup.string().required(t("Unit price is required")),
            }),
          )
          .min(1, t("Add at least one line item")),
      }),
    [t],
  );

  const form = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initPfiItem,
  });
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;

  // ── Wizard navigation ───────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));

  const visibleSteps = useMemo(
    () => STEPS.filter((s) => !s.isVisible || s.isVisible(form)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [STEPS, form],
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
            "warning",
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
        "warning",
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

  const watchedCustomer = watch("customer_id");
  const watchedLeadId = watch("lead_id");
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const liveMargin = useWatch({ control, name: "margin_pct" });
  const liveRate = useWatch({ control, name: "exchange_rate" });
  const liveCurrencyCode = useWatch({ control, name: "currency_code" });
  const liveStatus = useWatch({ control, name: "status" });

  const isLocked = isEdit && liveStatus && liveStatus !== "draft";

  // PFI inherits lead_id from source quotation; load it for the banner.
  useEffect(() => {
    if (watchedLeadId) dispatch(getLead(watchedLeadId));
  }, [watchedLeadId, dispatch]);

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
      return;
    }
    const shouldWriteToField =
      autoFilledForCurrency.current !== liveCurrencyCode;
    const options = currencyStore?.exchangeOptions || [];
    const defaultOpt = options.find((o) => o.is_default);
    instance
      .get(API_ENDPOINTS.currencies.currentRate, {
        params: { to: liveCurrencyCode },
      })
      .then((resp) => {
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
      .catch(() => setRateMeta({ missing: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCurrencyCode, currencyStore?.exchangeOptions, isEdit]);

  // Initial loads.
  useEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getExchangeRateOptions());
    dispatch(getCurrencyDropdown());
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getRebateDropdown());
    dispatch(getVendorDropdown());
    dispatch(getCompanyDetails());
    if (isEdit) {
      dispatch(getPfi(id));
    } else {
      dispatch(cleanPfiState());
      reset(initPfiItem);
      // When started from "+ New PFI" on a Quotation detail page, fetch
      // the source quotation so we can pre-fill the form below.
      if (sourceQuotationIdFromUrl) {
        dispatch(getQuotation(sourceQuotationIdFromUrl));
      }
    }
    return () => {
      dispatch(cleanPfiMessage());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  // Hydrate on edit.
  useEffect(() => {
    if (isEdit && store?.pfiItem?._id) {
      const p = store.pfiItem;
      // Seed the saved currency so the rate effect preserves the persisted
      // exchange_rate on load and only auto-fills on a later currency change.
      autoFilledForCurrency.current = p.currency_code || null;
      reset({
        ...initPfiItem,
        ...p,
        bank_account_id: p.bank_account_id || "",
        margin_pct: String(p.margin_pct ?? "0"),
        exchange_rate: String(Number(p.exchange_rate ?? 1)),
        pfi_date:
          (p.pfi_date || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        valid_until: (p.valid_until || "").slice(0, 10) || "",
        est_shipment_date: (p.est_shipment_date || "").slice(0, 10) || "",
        est_delivery_date: (p.est_delivery_date || "").slice(0, 10) || "",
        packing_type: Array.isArray(p.packing_type)
          ? p.packing_type
          : p.packing_type
            ? String(p.packing_type)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        container_used: p.container_used === true,
        container_no: p.container_no || "",
        seal_no: p.seal_no || "",
        container_load_type: p.container_load_type || "",
        lines: (p.lines || []).map((l) => ({
          ...initPfiLineItem,
          ...l,
          qty: String(l.qty ?? ""),
          unit_price: String(l.unit_price ?? ""),
          discount_pct: String(l.discount_pct ?? "0"),
          tax_pct: String(l.tax_pct ?? "0"),
          product_rebates_snapshot: l.product_rebates_snapshot || [],
          product_expenses_snapshot: l.product_expenses_snapshot || [],
          // ── Export-document line fields (Phase 2) ──
          hs_code: l.hs_code || "",
          net_weight_kg: String(l.net_weight_kg ?? "0"),
          gross_weight_kg: String(l.gross_weight_kg ?? "0"),
          package_count: Number(l.package_count || 0),
        })),
      });
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.pfiItem?._id]);

  // Pre-fill from the source quotation when arriving via the
  // "+ New PFI" button on the Quotation detail page. Runs once per
  // fetched quotation so user edits are not clobbered on rerender.
  useEffect(() => {
    if (isEdit) return;
    if (!sourceQuotationIdFromUrl) return;
    const q = quotationStore?.quotationItem;
    if (!q || q._id !== sourceQuotationIdFromUrl) return;
    reset({
      ...initPfiItem,
      quotation_id: q._id,
      quotation_voucher_no: q.voucher_no || "",
      lead_id: q.lead_id || "",
      customer_id: q.customer_id || "",
      customer_address_id: q.customer_address_id || "",
      currency_code: q.currency_code || "",
      exchange_rate: String(Number(q.exchange_rate ?? 1)),
      payment_terms: q.payment_terms || "",
      delivery_terms: q.delivery_terms || "",
      delivery_location: q.delivery_location || "",
      notes_to_client: q.notes_to_client || "",
      margin_pct: String(q.margin_pct ?? "0"),
      pfi_date: new Date().toISOString().slice(0, 10),
      lines: (q.lines || []).map((l) => ({
        ...initPfiLineItem,
        product_id: l.product_id || "",
        vendor_id: l.vendor_id || "",
        description: l.description || "",
        qty: String(l.qty ?? ""),
        unit: l.unit || "",
        unit_price: String(l.unit_price ?? ""),
        discount_pct: String(l.discount_pct ?? "0"),
        tax_pct: String(l.tax_pct ?? "0"),
        margin_pct: String(l.margin_pct ?? "0"),
        product_rebates_snapshot: l.product_rebates_snapshot || [],
        product_expenses_snapshot: l.product_expenses_snapshot || [],
      })),
    });
    setVisited(new Set([0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationStore?.quotationItem?._id, sourceQuotationIdFromUrl]);

  // Customer addresses.
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
      const boundId = watch("customer_address_id");
      const opts = (cust.addresses || [])
        .filter(
          (a) =>
            !a.type ||
            a.type === CUSTOMER_ADDRESS_TYPES.BILL_TO ||
            a.is_default ||
            a._id === boundId,
        )
        .map((a) => ({
          value: a._id,
          label: [a.label, a.address_line1, a.city, a.country]
            .filter(Boolean)
            .join(", "),
        }));
      setCustomerAddressOptions(opts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customerStore?.customerItem,
    watchedCustomer,
    watch("customer_address_id"),
  ]);

  // On new PFI: pre-fill port_of_loading + declaration_text from the
  // company-level defaults once the company profile finishes loading.
  // Only fills empty fields — never overrides what the user has typed or
  // what came back hydrated from an existing PFI on edit.
  useEffect(() => {
    if (isEdit) return;
    const ci = companyStore?.companyItem;
    if (!ci || !ci._id) return;
    if (!watch("port_of_loading") && ci.default_port_of_loading) {
      setValue("port_of_loading", ci.default_port_of_loading, {
        shouldDirty: false,
      });
    }
    if (!watch("declaration_text") && ci.default_declaration_text) {
      setValue("declaration_text", ci.default_declaration_text, {
        shouldDirty: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyStore?.companyItem?._id, isEdit]);

  // Save completes the wizard → return to the listing.
  useEffect(() => {
    if (store?.actionFlag === "PFI_CRTD" || store?.actionFlag === "PFI_UPDT") {
      Notification("Success", store?.success || t("Saved"), "success");
      dispatch(cleanPfiMessage());
      navigate(`${appsRoot}/pfi`, { replace: true });
    }
    if (store?.error && !submitting) {
      Notification("Error", store.error, "warning");
      dispatch(cleanPfiMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.actionFlag, store?.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading, dispatch]);

  // Master maps.
  const customerOptions = useMemo(
    () =>
      (customerStore?.customerDropdown || []).map((c) => ({
        value: c._id,
        label: c.company_name,
      })),
    [customerStore?.customerDropdown],
  );

  const currencyOptions = useMemo(
    () =>
      (currencyStore?.exchangeOptions || []).map((c) => ({
        value: c.code,
        label: c.name ? `${c.code} - ${c.name}` : c.code,
      })),
    [currencyStore?.exchangeOptions],
  );

  const productOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code ? p.code + " - " : ""}${p.name}`,
        raw: p,
      })),
    [productStore?.productDropdown],
  );

  const expenseOptions = useMemo(
    () =>
      (expenseStore?.expenseDropdown || []).map((e) => ({
        value: e._id,
        label: e.name,
        raw: e,
      })),
    [expenseStore?.expenseDropdown],
  );

  const rebateOptions = useMemo(
    () =>
      (rebateStore?.rebateDropdown || []).map((r) => ({
        value: r._id,
        label: r.name,
        raw: r,
      })),
    [rebateStore?.rebateDropdown],
  );

  const selectedCurrencyCode = liveCurrencyCode || "";

  const productById = useMemo(() => {
    const m = new Map();
    (productStore?.productDropdown || []).forEach((p) => m.set(p._id, p));
    return m;
  }, [productStore?.productDropdown]);

  // Costing engine - shared roll-up, same as the Quotation wizard.
  const totals = useMemo(
    () => computeDocTotals(liveLines, liveRate, { excludeGst: true }),
    [liveLines, liveMargin, liveRate],
  );

  // Submit.
  const buildPayload = (values) => {
    if (isLocked) {
      return {
        status: values.status || "draft",
        internal_notes: values.internal_notes?.trim() || undefined,
      };
    }
    return {
      quotation_id: values.quotation_id || undefined,
      lead_id: values.lead_id || undefined,
      customer_id: values.customer_id,
      customer_address_id: values.customer_address_id || undefined,
      // Consignee (Ship-to) — propagates to PO + Invoice on createFrom chain.
      consignee_id: values.consignee_id || undefined,
      consignee_snapshot: (() => {
        const s = values.consignee_snapshot || {};
        const hasAny = [
          s.name,
          s.address_line1,
          s.address_line2,
          s.city,
          s.state,
          s.postcode,
          s.country,
        ].some((v) => v && String(v).trim());
        return hasAny ? s : undefined;
      })(),
      pfi_date: values.pfi_date,
      valid_until: values.valid_until || undefined,
      currency_code: values.currency_code,
      exchange_rate: values.exchange_rate || "1",
      payment_terms: values.payment_terms?.trim() || undefined,
      delivery_terms: values.delivery_terms?.trim() || undefined,
      delivery_location: values.delivery_location?.trim() || undefined,
      notes_to_client: values.notes_to_client?.trim() || undefined,
      internal_notes: values.internal_notes?.trim() || undefined,
      margin_pct: values.margin_pct || "0",
      status: values.status || "draft",
      // ── Shipping & Packing ──
      port_of_loading: values.port_of_loading?.trim() || undefined,
      // Carry the FK + snapshot through to the backend so the PortSelect
      // can pre-select the saved port on re-edit (the free-text name alone
      // isn't enough — PortSelect renders from the snapshot object).
      port_of_loading_id: values.port_of_loading_id || undefined,
      port_of_loading_snapshot: values.port_of_loading_snapshot || undefined,
      port_of_discharge: values.port_of_discharge?.trim() || undefined,
      port_of_discharge_id: values.port_of_discharge_id || undefined,
      port_of_discharge_snapshot:
        values.port_of_discharge_snapshot || undefined,
      final_destination: values.final_destination?.trim() || undefined,
      country_of_origin: values.country_of_origin?.trim() || undefined,
      country_of_final_destination:
        values.country_of_final_destination?.trim() || undefined,
      mode_of_shipment: values.mode_of_shipment || undefined,
      container_details: values.container_details?.trim() || undefined,
      est_shipment_date: values.est_shipment_date || undefined,
      est_delivery_date: values.est_delivery_date || undefined,
      packing_marks: values.packing_marks?.trim() || undefined,
      packing_type: Array.isArray(values.packing_type)
        ? values.packing_type.filter(Boolean).join(", ") || undefined
        : values.packing_type || undefined,
      // Header-level packing totals — editable in Step 3. Send when the
      // user has typed a value; otherwise let the backend compute from
      // line sums.
      net_weight_kg:
        values.net_weight_kg === "" || values.net_weight_kg == null
          ? undefined
          : String(values.net_weight_kg),
      gross_weight_kg:
        values.gross_weight_kg === "" || values.gross_weight_kg == null
          ? undefined
          : String(values.gross_weight_kg),
      total_packages:
        values.total_packages === "" || values.total_packages == null
          ? undefined
          : Number(values.total_packages),
      container_used: values.container_used === true,
      container_no:
        values.container_used === true
          ? values.container_no?.trim() || undefined
          : undefined,
      seal_no:
        values.container_used === true
          ? values.seal_no?.trim() || undefined
          : undefined,
      container_load_type:
        values.container_used === true
          ? values.container_load_type || undefined
          : undefined,
      validity_days:
        values.validity_days === "" || values.validity_days == null
          ? undefined
          : Number(values.validity_days),
      declaration_text: values.declaration_text?.trim() || undefined,
      bank_account_id: values.bank_account_id || undefined,
      lines: (values.lines || []).map((l) => ({
        product_id: l.product_id,
        vendor_id: l.vendor_id || undefined,
        description: l.description || "",
        customer_reference: l.customer_reference || undefined,
        qty: String(l.qty || "0"),
        unit: l.unit || "",
        unit_price: String(l.unit_price || "0"),
        discount_pct: String(l.discount_pct || "0"),
        tax_pct: String(l.tax_pct || "0"),
        margin_pct: String(l.margin_pct || "0"),
        product_rebates_snapshot: (l.product_rebates_snapshot || []).map(
          (r) => ({
            rebate_id: r.rebate_id || null,
            code: r.code || "",
            name: r.name || "",
            type: r.type || "percent",
            pct: String(r.pct ?? "0"),
          }),
        ),
        product_expenses_snapshot: (l.product_expenses_snapshot || []).map(
          (e) => ({
            expense_id: e.expense_id || null,
            code: e.code || "",
            name: e.name || "",
            type: e.type || "fixed",
            value: String(e.value ?? "0"),
          }),
        ),
        // ── Export-document line fields (Phase 2) ──
        hs_code: l.hs_code || undefined,
        net_weight_kg: String(l.net_weight_kg ?? "0"),
        gross_weight_kg: String(l.gross_weight_kg ?? "0"),
        package_count: Number(l.package_count || 0),
      })),
    };
  };

  const dispatchSave = (payload) => {
    setSubmitting(true);
    const action = isEdit
      ? dispatch(updatePfi({ id, data: payload }))
      : dispatch(createPfi(payload));
    // dispatchSafely catches the unwrap() rejection so it never bubbles
    // to React's error overlay, and shows the BE message via the
    // right-side toast. The existing useEffect that watches `store.error`
    // is guarded by `!submitting`, so the toast won't be duplicated —
    // by the time that effect re-runs after `setSubmitting(false)`,
    // dispatchSafely has already fired the toast and we don't depend
    // on the store update timing.
    dispatchSafely(action, { errorTitle: "Error" }).finally(() =>
      setSubmitting(false)
    );
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
        "warning",
      );
      return;
    }
    handleSubmit((values) => dispatchSave(buildPayload(values)))();
  };

  const sourceQuotationVoucher = store?.pfiItem?.quotation_voucher_no;
  const sourceQuotationId = store?.pfiItem?.quotation_id;

  // Bank accounts come back from /admin/company/my-company with currency_code
  // already enriched on each row. Filter to active + matching the PFI currency.
  const allBankAccounts = useMemo(
    () => companyStore?.companyItem?.bank_accounts || [],
    [companyStore?.companyItem]
  );
  const bankAccountsForCurrency = useMemo(
    () =>
      allBankAccounts.filter(
        (b) =>
          !b.soft_delete &&
          b.is_active !== false &&
          (b.currency_code || "").toUpperCase() ===
            (liveCurrencyCode || "").toUpperCase()
      ),
    [allBankAccounts, liveCurrencyCode]
  );
  const liveBankAccountId = useWatch({ control, name: "bank_account_id" });

  // Active (non-deleted, is_active) bank accounts of any currency. Used as a
  // fallback so the PFI always ends up with some bank_account_id rather than
  // saving NULL when no currency-matching account exists.
  const activeBankAccounts = useMemo(
    () =>
      allBankAccounts.filter(
        (b) => !b.soft_delete && b.is_active !== false
      ),
    [allBankAccounts]
  );

  // Default-pick logic — applies ONLY to new PFI creation. Pick the
  // is_default bank in the company's HOME currency. Operator can change
  // to a different bank from the form.
  useEffect(() => {
    if (isEdit) return;
    if (!allBankAccounts.length) return;
    const stillValid = activeBankAccounts.some(
      (b) => b._id === liveBankAccountId
    );
    if (liveBankAccountId && stillValid) return;
    const homeCurrency = (
      companyStore?.companyItem?.currency || ""
    ).toUpperCase();
    const banksInHome = homeCurrency
      ? activeBankAccounts.filter(
          (b) => (b.currency_code || "").toUpperCase() === homeCurrency
        )
      : [];
    const def =
      banksInHome.find((b) => b.is_default) || banksInHome[0];
    setValue("bank_account_id", def ? def._id : "", { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBankAccounts, isEdit, companyStore?.companyItem?.currency]);

  const stepCtx = {
    isEdit,
    isLocked,
    rateMeta,
    customerOptions,
    customerAddressOptions,
    currencyOptions,
    productOptions,
    expenseOptions,
    rebateOptions,
    leadStore,
    vendorStore,
    productById,
    selectedCurrencyCode,
    baseCurrencyCode:
      (currencyStore?.currencyDropdown || []).find((c) => c.is_default)?.code ||
      "",
    exchangeRate: num(liveRate) || 1,
    totals,
    sourceQuotationVoucher,
    sourceQuotationId,
    allBankAccounts,
    bankAccountsForCurrency,
    prefillConsigneeFromCustomer: async (customerId) => {
      if (!customerId) return;
      try {
        const resp = await instance.get(
          `${API_ENDPOINTS.customers.get}/${customerId}`,
        );
        const cust = resp?.data?.data;
        const addrs = cust?.addresses || [];
        const addr =
          addrs.find((a) => a.is_default) || addrs[0] || {};
        setValue("consignee_id", customerId, { shouldDirty: true });
        setValue(
          "consignee_snapshot",
          {
            name: cust?.company_name || "",
            address_line1: addr.address_line1 || "",
            address_line2: addr.address_line2 || "",
            city: addr.city || "",
            state: addr.state || "",
            postcode: addr.postcode || "",
            country: addr.country || "",
          },
          { shouldDirty: true },
        );
      } catch {
        // Soft-fail — operator can type fields manually.
      }
    },
    onRevertToDraft: () => setValue("status", "draft", { shouldDirty: true }),
  };

  const ActiveStepComponent = visibleSteps[activeStep]?.Component;

  return (
    <Fragment>
      <div className="main-content pfi-add quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEdit ? t("Edit PFI") : t("Add PFI")}
            {isEdit && store?.pfiItem?.voucher_no
              ? ` - ${store.pfiItem.voucher_no}`
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
                      {t("This PFI is")} {liveStatus}.
                    </strong>{" "}
                    {t(
                      "Fields are locked. Revert to draft to make changes - Status field stays editable.",
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
                  onCancel={() => navigate(`${appsRoot}/pfi`)}
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

export default PfiWizard;
