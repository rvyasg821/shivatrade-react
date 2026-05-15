// ** React Imports
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

// ** Reactstrap
import {
  Card,
  CardBody,
  Col,
  Form,
  FormFeedback,
  Input,
  Label,
  Row,
  Button,
  Spinner,
} from "reactstrap";

// ** Forms
import { useForm, Controller, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";

// ** Redux
import { useDispatch, useSelector } from "react-redux";
import {
  createQuotation,
  updateQuotation,
  getQuotation,
  cleanQuotationMessage,
  cleanQuotationState,
} from "../store";
import { getCustomerDropdown, getCustomer } from "../../customers/store";
import { getCurrencyDropdown } from "../../currencies/store";
import { getProductDropdown } from "../../products/store";
import { getExpenseDropdown } from "../../expenses/store";
import { getRebateDropdown } from "../../rebates/store";
import { getCategoryDropdown } from "../../categories/store";
import { getLead } from "../../leads/store";
import { getVendorDropdown } from "../../vendors/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Axios (direct call for currency rate lookup - per-pick transient data)
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Utils
import Notification from "@components/toast/notification";
import { useTranslation } from "react-i18next";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import {
  initQuotationItem,
  initQuotationLineItem,
  initQuotationExpenseItem,
  initQuotationRebateItem,
} from "@constant/reduxConstant";
import {
  QUOTATION_STATUS_OPTIONS,
  INCOTERMS_OPTIONS,
  CUSTOMER_ADDRESS_TYPES,
  PAYMENT_TERMS_OPTIONS,
} from "@constant/options";

// ** Icons
import { ArrowLeft, ExternalLink } from "react-feather";

// ** Shared sales-doc sections (used by Quotation / PFI / PO)
import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import SalesDocExpenses from "@src/views/_shared/sales-doc/SalesDocExpenses";
import SalesDocRebates from "@src/views/_shared/sales-doc/SalesDocRebates";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import {
  num,
  round2,
  deriveExpenseAmount,
  deriveRebateAmount,
} from "@src/views/_shared/sales-doc/_helpers";

const AddQuotation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlLeadId = searchParams.get("lead_id") || "";
  const isEdit = !!id;

  const store = useSelector((state) => state.quotation);
  const customerStore = useSelector((state) => state.customer);
  const currencyStore = useSelector((state) => state.currency);
  const productStore = useSelector((state) => state.product);
  const expenseStore = useSelector((state) => state.expense);
  const rebateStore = useSelector((state) => state.rebate);
  const categoryStore = useSelector((state) => state.category);
  const leadStore = useSelector((state) => state.lead);
  const vendorStore = useSelector((state) => state.vendor);

  const [submitting, setSubmitting] = useState(false);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);
  // UI-only filter - narrows the Product dropdown in line items modal.
  // Defaulted from lead.interested_categories when arriving from a lead.
  // Empty array = no filter (show all).
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Last fetched rate metadata for the helper text (effective_date + inverse).
  const [rateMeta, setRateMeta] = useState(null);

  const schema = useMemo(
    () =>
      yup.object().shape({
        // Customer is optional when a lead_id is set - backend auto-creates
        // (or links) a customer from the lead's fields on save.
        customer_id: yup
          .string()
          .trim()
          .when("lead_id", {
            is: (v) => !!v,
            then: (s) => s.notRequired(),
            otherwise: (s) => s.required(t("Customer is required")),
          }),
        currency_id: yup.string().trim().required(t("Currency is required")),
        quotation_date: yup
          .string()
          .trim()
          .required(t("Quotation date is required")),
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
        lead_id: yup.string().nullable(),
        lines: yup
          .array()
          .of(
            yup.object().shape({
              product_id: yup.string().required(t("Product is required")),
              qty: yup.string().required(t("Qty is required")),
              unit_price: yup.string().required(t("Unit price is required")),
            })
          )
          .min(1, t("Add at least one line item")),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initQuotationItem,
  });

  const watchedCustomer = watch("customer_id");
  const watchedLeadId = watch("lead_id");

  // ─── Lead URL-param hydration (one-time) ────────────────────────────
  // When user arrives at /quotations/add?lead_id=... (from a Lead page),
  // capture the lead_id into the form and load lead details for display.
  useEffect(() => {
    if (urlLeadId && !isEdit) {
      setValue("lead_id", urlLeadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLeadId]);

  // Load lead detail whenever a lead_id is set on the form (URL or edit).
  useEffect(() => {
    if (watchedLeadId) {
      dispatch(getLead(watchedLeadId));
    }
  }, [watchedLeadId, dispatch]);

  // Rule B: when lead loads, auto-fill empty fields only - never overwrite
  // user input. Lead stores currency as code (e.g. "USD"); Quotation needs
  // currency_id (UUID), so translate via the Currency dropdown.
  useEffect(() => {
    const lead = leadStore?.leadItem;
    if (!lead || lead._id !== watchedLeadId) return;
    if (lead.customer_id && !watch("customer_id")) {
      setValue("customer_id", lead.customer_id);
    }
    if (lead.currency && !watch("currency_id")) {
      const match = (currencyStore?.currencyDropdown || []).find(
        (c) => c.code === lead.currency
      );
      if (match) setValue("currency_id", match._id);
    }
    // Seed category filter from lead's interested_categories (one-time;
    // empty filter remains untouched after user starts editing).
    if (
      Array.isArray(lead.interested_categories) &&
      lead.interested_categories.length &&
      categoryFilter.length === 0 &&
      !showAllCategories
    ) {
      setCategoryFilter(lead.interested_categories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadStore?.leadItem, watchedLeadId, currencyStore?.currencyDropdown]);

  // Live form arrays for the costing engine.
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const liveExpenses = useWatch({ control, name: "expenses" }) || [];
  const liveRebates = useWatch({ control, name: "rebates" }) || [];
  const liveMargin = useWatch({ control, name: "margin_pct" });
  const liveRate = useWatch({ control, name: "exchange_rate" });
  const liveCurrencyId = useWatch({ control, name: "currency_id" });
  const liveStatus = useWatch({ control, name: "status" });
  const liveSkipProduct = useWatch({ control, name: "skip_product_costing" });

  // When the quotation is past draft, fields lock down - only the status
  // select and internal_notes remain editable. UI mirrors backend guard.
  const isLocked = isEdit && liveStatus && liveStatus !== "draft";

  // ─── Exchange rate auto-fetch on currency pick ─────────────────────
  // When the user picks a currency, look up the latest rate from the
  // company's default currency to the picked currency. Skip if the picked
  // currency IS the default (rate = 1).
  useEffect(() => {
    if (!liveCurrencyId) {
      setRateMeta(null);
      return;
    }
    const dropdown = currencyStore?.currencyDropdown || [];
    const defaultCurrency = dropdown.find((c) => c.is_default);
    if (!defaultCurrency) return;
    // Don't overwrite a user-typed rate when editing an existing quote.
    if (isEdit && store?.quotationItem?.currency_id === liveCurrencyId) return;
    const fromId = defaultCurrency._id;
    const toId = liveCurrencyId;
    instance
      .get(API_ENDPOINTS.currencies.currentRate, {
        params: { from: fromId, to: toId },
      })
      .then((resp) => {
        const data = resp?.data?.data;
        if (!data) {
          setRateMeta({ missing: true });
          return;
        }
        setValue("exchange_rate", String(data.rate));
        setRateMeta({
          rate: Number(data.rate),
          effective_date: data.effective_date,
          same: !!data.same,
          fromCode: defaultCurrency.code,
          toCode: dropdown.find((c) => c._id === toId)?.code,
        });
      })
      .catch(() => setRateMeta({ missing: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCurrencyId, currencyStore?.currencyDropdown]);

  // ─── Initial loads ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getCurrencyDropdown());
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getRebateDropdown());
    dispatch(getCategoryDropdown());
    dispatch(getVendorDropdown());
    if (isEdit) {
      dispatch(getQuotation(id));
    } else {
      dispatch(cleanQuotationState());
      // Preserve URL-provided lead_id across the reset so the Lead Reference
      // card hydrates correctly when arriving from a Lead row.
      reset({ ...initQuotationItem, lead_id: urlLeadId || "" });
    }
    return () => {
      dispatch(cleanQuotationMessage());
    };
  }, [dispatch, id]);

  // ─── Hydrate form when edit data lands ──────────────────────────────
  useEffect(() => {
    if (isEdit && store?.quotationItem?._id) {
      const q = store.quotationItem;
      reset({
        ...initQuotationItem,
        ...q,
        margin_pct: String(q.margin_pct ?? "0"),
        skip_product_costing: !!q.skip_product_costing,
        exchange_rate: String(q.exchange_rate ?? "1"),
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
    }
  }, [store?.quotationItem?._id]);

  // ─── Load addresses when customer selected ──────────────────────────
  useEffect(() => {
    if (!watchedCustomer) {
      setCustomerAddressOptions([]);
      return;
    }
    dispatch(getCustomer(watchedCustomer));
  }, [watchedCustomer]);

  useEffect(() => {
    const cust = customerStore?.customerItem;
    if (cust && cust._id === watchedCustomer) {
      // Default filter: BILL_TO + default + untyped. But always include the
      // currently bound address even if it falls outside that filter, so the
      // saved value still renders (otherwise it'd silently disappear).
      const boundId = watch("customer_address_id");
      const opts = (cust.addresses || [])
        .filter(
          (a) =>
            !a.type ||
            a.type === CUSTOMER_ADDRESS_TYPES.BILL_TO ||
            a.is_default ||
            a._id === boundId
        )
        .map((a) => ({
          value: a._id,
          label: [a.label, a.address_line1, a.city, a.country]
            .filter(Boolean)
            .join(", "),
        }));
      setCustomerAddressOptions(opts);
    }
  }, [customerStore?.customerItem, watchedCustomer, watch("customer_address_id")]);

  // ─── Toast on success/error ─────────────────────────────────────────
  useEffect(() => {
    if (store?.actionFlag === "QT_CRTD" || store?.actionFlag === "QT_UPDT") {
      Notification("Success", store?.success || t("Saved"), "success");
      dispatch(cleanQuotationMessage());
      navigate(`${appsRoot}/quotations`);
    }
    if (store?.error && !submitting) {
      Notification("Error", store.error, "warning");
      dispatch(cleanQuotationMessage());
    }
  }, [store?.actionFlag, store?.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  // ─── Master maps + dropdown options ─────────────────────────────────
  const customerOptions = useMemo(
    () =>
      (customerStore?.customerDropdown || []).map((c) => ({
        value: c._id,
        label: c.company_name,
      })),
    [customerStore?.customerDropdown]
  );

  const currencyOptions = useMemo(
    () =>
      (currencyStore?.currencyDropdown || []).map((c) => ({
        value: c._id,
        label: `${c.code} - ${c.name}`,
      })),
    [currencyStore?.currencyDropdown]
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

  // Apply category filter unless "show all" toggle is on. When the filter
  // is empty (no lead seed, or user cleared it) → show all products.
  const productOptions = useMemo(() => {
    if (showAllCategories || !categoryFilter.length) return allProductOptions;
    const set = new Set(categoryFilter);
    return allProductOptions.filter((o) => set.has(o.raw?.category_id));
  }, [allProductOptions, categoryFilter, showAllCategories]);

  // Full list - used when "Show all categories" toggle is on, and as the
  // source for line-modal Category select.
  const allCategoryOptions = useMemo(
    () =>
      (categoryStore?.categoryDropdown || []).map((c) => ({
        value: c._id,
        label: c.name,
      })),
    [categoryStore?.categoryDropdown]
  );

  // Lead's interested_categories - narrows the dropdown options to what the
  // lead said they're interested in. Empty when not coming from a lead.
  const leadCategoryIds = useMemo(() => {
    const lead = leadStore?.leadItem;
    if (!lead || lead._id !== watchedLeadId) return [];
    return Array.isArray(lead.interested_categories)
      ? lead.interested_categories
      : [];
  }, [leadStore?.leadItem, watchedLeadId]);

  // Default-narrowed list shown in header + line modal when not in show-all
  // mode AND we have a lead with categories. Otherwise full list.
  const categoryOptions = useMemo(() => {
    if (showAllCategories || leadCategoryIds.length === 0)
      return allCategoryOptions;
    const set = new Set(leadCategoryIds);
    return allCategoryOptions.filter((o) => set.has(o.value));
  }, [allCategoryOptions, leadCategoryIds, showAllCategories]);

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

  const expenseMasterMap = useMemo(() => {
    const m = new Map();
    (expenseStore?.expenseDropdown || []).forEach((e) => m.set(e._id, e));
    return m;
  }, [expenseStore?.expenseDropdown]);

  const rebateMasterMap = useMemo(() => {
    const m = new Map();
    (rebateStore?.rebateDropdown || []).forEach((r) => m.set(r._id, r));
    return m;
  }, [rebateStore?.rebateDropdown]);

  const selectedCurrencyCode = useMemo(() => {
    const c = (currencyStore?.currencyDropdown || []).find(
      (x) => x._id === liveCurrencyId
    );
    return c?.code || "";
  }, [currencyStore?.currencyDropdown, liveCurrencyId]);

  // ─── Costing engine (mirrors backend recompute) ─────────────────────
  // Lookup map: product._id → raw product (with product_rebates / product_expenses).
  const productById = useMemo(() => {
    const m = new Map();
    (productStore?.productDropdown || []).forEach((p) => m.set(p._id, p));
    return m;
  }, [productStore?.productDropdown]);

  // Sets of master IDs that are already auto-applied via products on the
  // current lines. Used to soft-warn when the user adds the SAME rebate or
  // expense at quotation level - would double-count silently.
  const productAppliedRebateIds = useMemo(() => {
    if (liveSkipProduct) return new Set();
    const s = new Set();
    (liveLines || []).forEach((l) => {
      const product = productById.get(l?.product_id);
      (product?.product_rebates || []).forEach((r) => s.add(r.rebate_id));
    });
    return s;
  }, [liveLines, productById, liveSkipProduct]);

  const productAppliedExpenseIds = useMemo(() => {
    if (liveSkipProduct) return new Set();
    const s = new Set();
    (liveLines || []).forEach((l) => {
      const product = productById.get(l?.product_id);
      (product?.product_expenses || []).forEach((e) => s.add(e.expense_id));
    });
    return s;
  }, [liveLines, productById, liveSkipProduct]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax_total = 0;
    let product_rebates_total = 0;
    let product_expenses_total = 0;
    let line_margin_total = 0;
    (liveLines || []).forEach((l) => {
      const qty = num(l?.qty);
      const price = num(l?.unit_price);
      const disc = num(l?.discount_pct);
      const taxPct = num(l?.tax_pct);
      const lineNet = qty * price * (1 - disc / 100);
      subtotal += lineNet;
      tax_total += lineNet * (taxPct / 100);

      // Per-line rebates/expenses come from the line's snapshot (which is
      // seeded from product master and may be edited per-line).
      let lineProdReb = 0;
      let lineProdExp = 0;
      for (const r of l?.product_rebates_snapshot || []) {
        lineProdReb += (lineNet * num(r.pct)) / 100;
      }
      for (const e of l?.product_expenses_snapshot || []) {
        lineProdExp +=
          e.type === "percent"
            ? (lineNet * num(e.value)) / 100
            : num(e.value);
      }
      product_rebates_total += lineProdReb;
      product_expenses_total += lineProdExp;

      // Mirror backend: per-line margin on (taxable + line product expenses
      // − line product rebates), zeroing the product buckets if skip flag.
      const effLineExp = liveSkipProduct ? 0 : lineProdExp;
      const effLineReb = liveSkipProduct ? 0 : lineProdReb;
      // No header margin anymore - empty line margin = 0.
      const lineMarginPct = num(l?.margin_pct);
      line_margin_total +=
        (lineNet + effLineExp - effLineReb) * (lineMarginPct / 100);
    });
    // Header expenses/rebates removed - all rebates/expenses are per-line now.
    const eff_product_rebates = liveSkipProduct ? 0 : product_rebates_total;
    const eff_product_expenses = liveSkipProduct ? 0 : product_expenses_total;
    const net =
      subtotal +
      eff_product_expenses -
      eff_product_rebates;
    // Margin is now per-line (sum of line.margin_amount). Header margin_pct
    // is used only as the seed default for new lines.
    const margin_amount = line_margin_total;
    const grand_inr = net + margin_amount + tax_total;
    const rate = num(liveRate) || 1;
    const grand_currency = grand_inr * rate;
    return {
      subtotal,
      product_expenses_total: eff_product_expenses,
      product_expenses_total_raw: product_expenses_total,
      product_rebates_total: eff_product_rebates,
      product_rebates_total_raw: product_rebates_total,
      skipped: !!liveSkipProduct,
      net,
      margin_amount,
      tax_total,
      grand_inr,
      grand_currency,
      rate,
    };
  }, [
    liveLines,
    liveMargin,
    liveRate,
    liveSkipProduct,
    productById,
  ]);

  // ─── Submit ─────────────────────────────────────────────────────────
  const onSubmit = (values) => {
    // When locked, only status + internal_notes can change. Sending full
    // payload would trip the backend's status-lock check.
    if (isLocked) {
      const slim = {
        status: values.status || "draft",
        internal_notes: values.internal_notes?.trim() || undefined,
      };
      setSubmitting(true);
      const action = dispatch(updateQuotation({ id, data: slim }));
      action.unwrap?.().finally(() => setSubmitting(false)) ||
        action.finally?.(() => setSubmitting(false));
      return;
    }

    const payload = {
      lead_id: values.lead_id || undefined,
      customer_id: values.customer_id || undefined,
      customer_address_id: values.customer_address_id || undefined,
      quotation_date: values.quotation_date,
      valid_until: values.valid_until || undefined,
      currency_id: values.currency_id,
      exchange_rate: values.exchange_rate || "1",
      payment_terms: values.payment_terms?.trim() || undefined,
      delivery_terms: values.delivery_terms?.trim() || undefined,
      delivery_location: values.delivery_location?.trim() || undefined,
      notes_to_client: values.notes_to_client?.trim() || undefined,
      internal_notes: values.internal_notes?.trim() || undefined,
      // Header margin removed - kept as "0" for back-compat with the column.
      margin_pct: "0",
      skip_product_costing: !!values.skip_product_costing,
      status: values.status || "draft",
      lines: (values.lines || []).map((l) => ({
        product_id: l.product_id,
        vendor_id: l.vendor_id || undefined,
        description: l.description || "",
        qty: String(l.qty || "0"),
        unit: l.unit || "",
        unit_price: String(l.unit_price || "0"),
        discount_pct: String(l.discount_pct || "0"),
        tax_pct: String(l.tax_pct || "0"),
        margin_pct: String(l.margin_pct || "0"),
        // Per-line rebate/expense snapshots (edited or auto-applied from
        // product master). These are scoped to this quotation only and
        // never write back to product/rebate/expense masters.
        product_rebates_snapshot: (l.product_rebates_snapshot || []).map(
          (r) => ({
            rebate_id: r.rebate_id || null,
            code: r.code || "",
            name: r.name || "",
            pct: String(r.pct ?? "0"),
          })
        ),
        product_expenses_snapshot: (l.product_expenses_snapshot || []).map(
          (e) => ({
            expense_id: e.expense_id || null,
            code: e.code || "",
            name: e.name || "",
            type: e.type || "amount",
            value: String(e.value ?? "0"),
          })
        ),
      })),
    };

    setSubmitting(true);
    const action = isEdit
      ? dispatch(updateQuotation({ id, data: payload }))
      : dispatch(createQuotation(payload));

    action.unwrap?.().finally(() => setSubmitting(false)) ||
      action.finally?.(() => setSubmitting(false));
  };

  const required = <span className="text-danger">*</span>;

  return (
    <Fragment>
      <div className="main-content quotation-add">
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
            onClick={() => navigate(`${appsRoot}/quotations`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          {isLocked && (
            <div className="alert alert-warning d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>{t("This quotation is")} {liveStatus}.</strong>{" "}
                {t(
                  "Fields are locked. Revert to draft to make changes - Status field below stays editable for transitions."
                )}
              </div>
              <Button
                size="sm"
                color="warning"
                type="button"
                onClick={() => {
                  setValue("status", "draft", { shouldDirty: true });
                }}
              >
                {t("Revert to Draft")}
              </Button>
            </div>
          )}
          {/* ── Header ─────────────────────────────── */}
          <Card>
            <CardBody>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label">
                    {t("Customer")}{" "}
                    {watchedLeadId ? (
                      <small className="text-muted">({t("optional")})</small>
                    ) : (
                      required
                    )}
                  </Label>
                  <Controller
                    name="customer_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        isDisabled={isLocked}
                        options={customerOptions}
                        value={
                          customerOptions.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) => {
                          field.onChange(opt ? opt.value : "");
                          setValue("customer_address_id", "");
                        }}
                      />
                    )}
                  />
                  {watchedLeadId &&
                    !watch("customer_id") &&
                    leadStore?.leadItem?._id === watchedLeadId && (
                      <small className="text-info d-block mt-1">
                        {t(
                          "Customer will be auto-created from lead "
                        )}
                        <strong>
                          {leadStore.leadItem.company_name ||
                            leadStore.leadItem.contact_name ||
                            "-"}
                        </strong>
                        {t(" on save (or matched by email if exists).")}
                      </small>
                    )}
                  {errors.customer_id && (
                    <FormFeedback className="d-block">
                      {errors.customer_id.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label">{t("Bill-to Address")}</Label>
                  <Controller
                    name="customer_address_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        options={customerAddressOptions}
                        value={
                          customerAddressOptions.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                        placeholder={
                          watchedCustomer
                            ? t("Select address")
                            : t("Pick a customer first")
                        }
                        isDisabled={!watchedCustomer || isLocked}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("Used to determine intra/inter-state for tax.")}
                  </small>
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label">
                    {t("Quotation Date")} {required}
                  </Label>
                  <Controller
                    name="quotation_date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="date"
                        invalid={!!errors.quotation_date}
                        disabled={isLocked}
                        {...field}
                      />
                    )}
                  />
                  {errors.quotation_date && (
                    <FormFeedback>
                      {errors.quotation_date.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Valid Until")}</Label>
                  <Controller
                    name="valid_until"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="date"
                        disabled={isLocked}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label">
                    {t("Currency")} {required}
                  </Label>
                  <Controller
                    name="currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        isDisabled={isLocked}
                        options={currencyOptions}
                        value={
                          currencyOptions.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                      />
                    )}
                  />
                  {errors.currency_id && (
                    <FormFeedback className="d-block">
                      {errors.currency_id.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Exchange Rate")}</Label>
                  <Controller
                    name="exchange_rate"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.000001"
                        min="0"
                        disabled={isLocked}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  <small className="text-muted d-block">
                    {rateMeta?.same ? (
                      t(
                        "Same currency - rate fixed at 1."
                      )
                    ) : rateMeta?.rate ? (
                      <>
                        {t("Auto-filled from Currency master")}
                        {rateMeta.effective_date
                          ? ` (${t("as of")} ${rateMeta.effective_date})`
                          : ""}
                        .{" "}
                        <span>
                          1 {rateMeta.fromCode} ={" "}
                          {Number(rateMeta.rate).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          {rateMeta.toCode}
                          {rateMeta.rate > 0
                            ? ` · 1 ${rateMeta.toCode} = ${(
                                1 / rateMeta.rate
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })} ${rateMeta.fromCode}`
                            : ""}
                        </span>
                      </>
                    ) : rateMeta?.missing ? (
                      <span className="text-warning">
                        {t(
                          "No rate set in Currency master - enter manually."
                        )}
                      </span>
                    ) : (
                      t("INR × rate = customer-currency amount.")
                    )}
                  </small>
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label">{t("Payment Terms")}</Label>
                  <Controller
                    name="payment_terms"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        isDisabled={isLocked}
                        options={PAYMENT_TERMS_OPTIONS}
                        value={
                          PAYMENT_TERMS_OPTIONS.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                      />
                    )}
                  />
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label">
                    {t("Delivery Terms (Incoterm)")}
                  </Label>
                  <Controller
                    name="delivery_terms"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        isDisabled={isLocked}
                        options={INCOTERMS_OPTIONS}
                        value={
                          INCOTERMS_OPTIONS.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                      />
                    )}
                  />
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label">
                    {t("Delivery Location")}
                  </Label>
                  <Controller
                    name="delivery_location"
                    control={control}
                    render={({ field }) => (
                      <Input
                        placeholder="e.g. Mumbai Port, Dubai (Jebel Ali)"
                        disabled={isLocked}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Status")}</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        options={QUOTATION_STATUS_OPTIONS}
                        value={
                          QUOTATION_STATUS_OPTIONS.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "draft")
                        }
                      />
                    )}
                  />
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label">{t("Lead Reference")}</Label>
                  {watchedLeadId ? (
                    (() => {
                      const lead = leadStore?.leadItem;
                      const linked = lead && lead._id === watchedLeadId;
                      const prefIds = linked
                        ? lead.preferred_vendors || []
                        : [];
                      const prefNames = prefIds
                        .map((vid) => {
                          const v = (vendorStore?.vendorDropdown || []).find(
                            (x) => x._id === vid
                          );
                          return v
                            ? v.vendor_code
                              ? `${v.company_name} [${v.vendor_code}]`
                              : v.company_name
                            : null;
                        })
                        .filter(Boolean);
                      return (
                        <>
                          <div className="form-control bg-light d-flex justify-content-between align-items-center">
                            {linked ? (
                              <>
                                <span>
                                  🔗{" "}
                                  <strong>
                                    {lead.company_name ||
                                      lead.contact_name ||
                                      "-"}
                                  </strong>
                                  {lead.contact_name && lead.company_name
                                    ? ` · ${lead.contact_name}`
                                    : ""}
                                  {lead.status ? (
                                    <span className="ms-2 badge bg-info text-dark text-capitalize">
                                      {lead.status}
                                    </span>
                                  ) : null}
                                </span>
                                <a
                                  href={`${appsRoot}/leads/edit/${watchedLeadId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t("Open Lead in new tab")}
                                  className="text-decoration-none ms-2"
                                >
                                  <ExternalLink size={16} />
                                </a>
                              </>
                            ) : (
                              <span className="text-muted">
                                {t("Loading lead…")}
                              </span>
                            )}
                          </div>
                          {prefNames.length > 0 && (
                            <div className="alert alert-info py-1 px-2 mt-1 mb-0 small">
                              ⭐ {t("Customer prefers")}:{" "}
                              <strong>{prefNames.join(", ")}</strong>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="form-control bg-light text-muted">
                      <small>
                        {t(
                          "No lead linked. To attach, create the quotation from the Lead page."
                        )}
                      </small>
                    </div>
                  )}
                </Col>

                <Col md="12" className="mb-2">
                  <Label className="form-label d-flex justify-content-between align-items-center">
                    <span>{t("Interested Categories")}</span>
                    {categoryFilter.length > 0 && (
                      <small>
                        <a
                          href="#"
                          className="text-decoration-none"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowAllCategories((s) => !s);
                          }}
                        >
                          {showAllCategories
                            ? t("Re-apply category filter")
                            : t("Show all categories")}
                        </a>
                      </small>
                    )}
                  </Label>
                  <Select
                    classNamePrefix="select"
                    isMulti
                    isClearable
                    isDisabled={isLocked}
                    options={categoryOptions}
                    value={categoryOptions.filter((o) =>
                      categoryFilter.includes(o.value)
                    )}
                    onChange={(opts) => {
                      setCategoryFilter((opts || []).map((o) => o.value));
                      setShowAllCategories(false);
                    }}
                    placeholder={t(
                      "All categories (pick to narrow Product dropdown in line items)"
                    )}
                    menuPortalTarget={document.body}
                    styles={{
                      menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                    }}
                  />
                  {watchedLeadId &&
                    categoryFilter.length > 0 &&
                    !showAllCategories && (
                      <small className="text-muted d-block mt-1">
                        {t(
                          "Pre-filled from lead's interested categories."
                        )}
                      </small>
                    )}
                  {showAllCategories && (
                    <small className="text-warning d-block mt-1">
                      {t(
                        "Showing all products - category filter is bypassed."
                      )}
                    </small>
                  )}
                </Col>

                <Col md="12" className="mb-2">
                  <Controller
                    name="skip_product_costing"
                    control={control}
                    render={({ field }) => (
                      <div className="form-check">
                        <Input
                          type="checkbox"
                          id="skip_product_costing"
                          disabled={isLocked}
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <Label
                          className="form-check-label"
                          for="skip_product_costing"
                        >
                          {t(
                            "Skip per-product rebates & expenses for this quote"
                          )}
                        </Label>
                        <small className="d-block text-muted mt-1">
                          {t(
                            "When checked, only the rebates/expenses you add below will apply. Useful for one-off custom-rate quotes where the per-product master config doesn't fit."
                          )}
                        </small>
                      </div>
                    )}
                  />
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label">{t("Notes to Client")}</Label>
                  <Controller
                    name="notes_to_client"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="textarea"
                        rows="2"
                        disabled={isLocked}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label">{t("Internal Notes")}</Label>
                  <Controller
                    name="internal_notes"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="textarea"
                        rows="2"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Lines / Expenses / Rebates / Costing ── */}
          <Row>
            <Col lg="9">
              <SalesDocLineItems
                control={control}
                setValue={setValue}
                productOptions={productOptions}
                allProductOptions={allProductOptions}
                categoryOptions={categoryOptions}
                allCategoryOptions={allCategoryOptions}
                defaultCategoryIds={
                  showAllCategories ? [] : categoryFilter
                }
                initLineItem={initQuotationLineItem}
                rebateOptions={rebateOptions}
                expenseOptions={expenseOptions}
                readOnly={isLocked}
              />
            </Col>
            <Col lg="3">
              <SalesDocCostingCard
                totals={totals}
                currencyCode={selectedCurrencyCode}
              />
            </Col>
          </Row>

          {/* ── Action ──────────────────────────────── */}
          <div className="d-flex justify-content-end gap-2 pt-2 pb-3">
            <Button
              type="button"
              color="secondary"
              outline
              onClick={() => navigate(`${appsRoot}/quotations`)}
              disabled={submitting}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" color="primary" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : t("Save")}
            </Button>
          </div>
        </Form>
      </div>
    </Fragment>
  );
};

export default AddQuotation;
