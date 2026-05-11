// ── PFI Wizard Orchestrator ───────────────────────────────────────────
// Mirrors QuotationWizard. Differences: pfi_date field name, no lead URL
// param / category filter, source-quotation banner.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
import { getCustomerDropdown, getCustomer } from "../../../customers/store";
import { getCurrencyDropdown } from "../../../currencies/store";
import { getProductDropdown } from "../../../products/store";
import { getExpenseDropdown } from "../../../expenses/store";
import { getRebateDropdown } from "../../../rebates/store";
import { getLead } from "../../../leads/store";
import { getVendorDropdown } from "../../../vendors/store";
import { startLoading, stopLoading } from "../../../loadingstore";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

import { appsRoot } from "@constant/defaultValues";
import { initPfiItem, initPfiLineItem } from "@constant/reduxConstant";
import { CUSTOMER_ADDRESS_TYPES } from "@constant/options";

import { num } from "@src/views/_shared/sales-doc/_helpers";

import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

import { STEPS } from "./steps";

const PfiWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEdit = !!id;

  const store = useSelector((s) => s.pfi);
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

  const schema = useMemo(
    () =>
      yup.object().shape({
        customer_id: yup.string().trim().required(t("Customer is required")),
        currency_id: yup.string().trim().required(t("Currency is required")),
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
    defaultValues: initPfiItem,
  });
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;

  // ── Wizard navigation ───────────────────────────────────────────────
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

  const watchedCustomer = watch("customer_id");
  const watchedLeadId = watch("lead_id");
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const liveMargin = useWatch({ control, name: "margin_pct" });
  const liveRate = useWatch({ control, name: "exchange_rate" });
  const liveCurrencyId = useWatch({ control, name: "currency_id" });
  const liveStatus = useWatch({ control, name: "status" });

  const isLocked = isEdit && liveStatus && liveStatus !== "draft";

  // PFI inherits lead_id from source quotation; load it for the banner.
  useEffect(() => {
    if (watchedLeadId) dispatch(getLead(watchedLeadId));
  }, [watchedLeadId, dispatch]);

  // Exchange rate fetch.
  useEffect(() => {
    if (!liveCurrencyId) {
      setRateMeta(null);
      return;
    }
    const dropdown = currencyStore?.currencyDropdown || [];
    const defaultCurrency = dropdown.find((c) => c.is_default);
    if (!defaultCurrency) return;
    if (isEdit && store?.pfiItem?.currency_id === liveCurrencyId) return;
    instance
      .get(API_ENDPOINTS.currencies.currentRate, {
        params: { from: defaultCurrency._id, to: liveCurrencyId },
      })
      .then((resp) => {
        const data = resp?.data?.data;
        if (!data) return setRateMeta({ missing: true });
        setValue("exchange_rate", String(data.rate));
        setRateMeta({
          rate: Number(data.rate),
          effective_date: data.effective_date,
          same: !!data.same,
          fromCode: defaultCurrency.code,
          toCode: dropdown.find((c) => c._id === liveCurrencyId)?.code,
        });
      })
      .catch(() => setRateMeta({ missing: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCurrencyId, currencyStore?.currencyDropdown]);

  // Initial loads.
  useEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getCurrencyDropdown());
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getRebateDropdown());
    dispatch(getVendorDropdown());
    if (isEdit) {
      dispatch(getPfi(id));
    } else {
      dispatch(cleanPfiState());
      reset(initPfiItem);
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
      reset({
        ...initPfiItem,
        ...p,
        margin_pct: String(p.margin_pct ?? "0"),
        exchange_rate: String(p.exchange_rate ?? "1"),
        pfi_date:
          (p.pfi_date || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        valid_until: (p.valid_until || "").slice(0, 10) || "",
        lines: (p.lines || []).map((l) => ({
          ...initPfiLineItem,
          ...l,
          qty: String(l.qty ?? ""),
          unit_price: String(l.unit_price ?? ""),
          discount_pct: String(l.discount_pct ?? "0"),
          tax_pct: String(l.tax_pct ?? "0"),
          product_rebates_snapshot: l.product_rebates_snapshot || [],
          product_expenses_snapshot: l.product_expenses_snapshot || [],
        })),
      });
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.pfiItem?._id]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerStore?.customerItem, watchedCustomer, watch("customer_address_id")]);

  // Toast.
  useEffect(() => {
    if (store?.actionFlag === "PFI_CRTD" || store?.actionFlag === "PFI_UPDT") {
      Notification("Success", store?.success || t("Saved"), "success");
      dispatch(cleanPfiMessage());
      navigate(`${appsRoot}/pfi`);
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

  const productOptions = useMemo(
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

  const selectedCurrencyCode = useMemo(() => {
    const c = (currencyStore?.currencyDropdown || []).find(
      (x) => x._id === liveCurrencyId
    );
    return c?.code || "";
  }, [currencyStore?.currencyDropdown, liveCurrencyId]);

  const productById = useMemo(() => {
    const m = new Map();
    (productStore?.productDropdown || []).forEach((p) => m.set(p._id, p));
    return m;
  }, [productStore?.productDropdown]);

  // Costing engine.
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

      let lineProdReb = 0;
      let lineProdExp = 0;
      for (const r of l?.product_rebates_snapshot || []) {
        lineProdReb += (lineNet * num(r.pct)) / 100;
      }
      for (const e of l?.product_expenses_snapshot || []) {
        lineProdExp +=
          e.type === "percent" ? (lineNet * num(e.value)) / 100 : num(e.value);
      }
      product_rebates_total += lineProdReb;
      product_expenses_total += lineProdExp;

      const lineMarginPct = num(l?.margin_pct);
      line_margin_total +=
        (lineNet + lineProdExp - lineProdReb) * (lineMarginPct / 100);
    });
    const net = subtotal + product_expenses_total - product_rebates_total;
    const margin_amount = line_margin_total;
    const grand_inr = net + margin_amount + tax_total;
    const rate = num(liveRate) || 1;
    return {
      subtotal,
      product_expenses_total,
      product_rebates_total,
      net,
      margin_amount,
      tax_total,
      grand_inr,
      grand_currency: grand_inr * rate,
      rate,
    };
  }, [liveLines, liveMargin, liveRate]);

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
      pfi_date: values.pfi_date,
      valid_until: values.valid_until || undefined,
      currency_id: values.currency_id,
      exchange_rate: values.exchange_rate || "1",
      payment_terms: values.payment_terms?.trim() || undefined,
      delivery_terms: values.delivery_terms?.trim() || undefined,
      delivery_location: values.delivery_location?.trim() || undefined,
      notes_to_client: values.notes_to_client?.trim() || undefined,
      internal_notes: values.internal_notes?.trim() || undefined,
      margin_pct: values.margin_pct || "0",
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
  };

  const dispatchSave = (payload) => {
    setSubmitting(true);
    const action = isEdit
      ? dispatch(updatePfi({ id, data: payload }))
      : dispatch(createPfi(payload));
    action.unwrap?.().finally(() => setSubmitting(false)) ||
      action.finally?.(() => setSubmitting(false));
  };

  const onSave = handleSubmit(
    async (values) => {
      const ok = await trigger();
      if (!ok) {
        Notification(
          "Validation",
          t("Please fix the highlighted fields."),
          "warning"
        );
        return;
      }
      dispatchSave(buildPayload(values));
    },
    () => {
      Notification(
        "Validation",
        t("Please fix the highlighted fields."),
        "warning"
      );
    }
  );

  const sourceQuotationVoucher = store?.pfiItem?.quotation_voucher_no;

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
    totals,
    sourceQuotationVoucher,
    onRevertToDraft: () =>
      setValue("status", "draft", { shouldDirty: true }),
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
            onClick={() => navigate(`${appsRoot}/pfi`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <FormProvider {...form}>
          <Form onSubmit={(e) => e.preventDefault()}>
            {isLocked && (
              <div className="alert alert-warning d-flex justify-content-between align-items-center mb-2">
                <div>
                  <strong>
                    {t("This PFI is")} {liveStatus}.
                  </strong>{" "}
                  {t(
                    "Fields are locked. Revert to draft to make changes — Status field stays editable."
                  )}
                </div>
                <Button
                  size="sm"
                  color="warning"
                  type="button"
                  onClick={stepCtx.onRevertToDraft}
                >
                  {t("Revert to Draft")}
                </Button>
              </div>
            )}

            <Card>
              <CardBody>
                <WizardHeader
                  steps={visibleSteps}
                  activeStep={activeStep}
                  visited={visited}
                  onStepClick={goTo}
                  isEdit={isEdit}
                />

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
