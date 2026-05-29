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
  const isEdit = !!id;

  const store = useSelector((s) => s.quotation);
  const customerStore = useSelector((s) => s.customer);
  const currencyStore = useSelector((s) => s.currency);
  const productStore = useSelector((s) => s.product);
  const expenseStore = useSelector((s) => s.expense);
  const rebateStore = useSelector((s) => s.rebate);
  const leadStore = useSelector((s) => s.lead);
  const vendorStore = useSelector((s) => s.vendor);

  const [submitting, setSubmitting] = useState(false);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);
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

  const form = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initQuotationItem,
  });
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;

  // ── Wizard navigation state ─────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));

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
    // Lead `description` is the RFQ brief the salesperson captured —
    // copy into internal_notes so the original spec stays attached to
    // the quotation without leaking onto the client-facing PDF.
    if (lead.description && !watch("internal_notes")) {
      setValue("internal_notes", lead.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadStore?.leadItem, watchedLeadId]);

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
      !isEdit && autoFilledForCurrency.current !== liveCurrencyCode;
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

  // ── Initial loads ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getCustomerDropdown());
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
      reset({ ...initQuotationItem, lead_id: urlLeadId || "" });
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
      reset({
        ...initQuotationItem,
        ...q,
        margin_pct: String(q.margin_pct ?? "0"),
        exchange_rate: String(Number(q.exchange_rate ?? 1)),
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
      }));
      setCustomerAddressOptions(opts);

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
    () => computeDocTotals(liveLines, liveRate, { excludeGst: true }),
    [liveLines, liveMargin, liveRate]
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
      customer_id: values.customer_id || undefined,
      customer_address_id: values.customer_address_id || undefined,
      quotation_date: values.quotation_date,
      valid_until: values.valid_until || undefined,
      currency_code: values.currency_code,
      exchange_rate: values.exchange_rate || "1",
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
    handleSubmit((values) => dispatchSave(buildPayload(values)))();
  };

  // ── Step body context (props passed to all steps) ───────────────────
  const stepCtx = {
    isEdit,
    isLocked,
    rateMeta,
    customerOptions,
    customerAddressOptions,
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
