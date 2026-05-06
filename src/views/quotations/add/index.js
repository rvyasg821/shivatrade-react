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
import { getLead } from "../../leads/store";
import { startLoading, stopLoading } from "../../loadingstore";

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
import { ArrowLeft } from "react-feather";

// ** Sections (split for readability — each owns its section + edit modal)
import QuotationLineItems from "./QuotationLineItems";
import QuotationExpenses from "./QuotationExpenses";
import QuotationRebates from "./QuotationRebates";
import QuotationCostingCard from "./QuotationCostingCard";
import {
  num,
  round2,
  deriveExpenseAmount,
  deriveRebateAmount,
} from "./_helpers";

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
  const leadStore = useSelector((state) => state.lead);

  const [submitting, setSubmitting] = useState(false);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);

  const schema = useMemo(
    () =>
      yup.object().shape({
        customer_id: yup.string().trim().required(t("Customer is required")),
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

  // Rule B: when lead loads, only auto-fill customer_id if currently empty.
  useEffect(() => {
    const lead = leadStore?.leadItem;
    if (!lead || lead._id !== watchedLeadId) return;
    if (lead.customer_id && !watch("customer_id")) {
      setValue("customer_id", lead.customer_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadStore?.leadItem, watchedLeadId]);

  // Live form arrays for the costing engine.
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const liveExpenses = useWatch({ control, name: "expenses" }) || [];
  const liveRebates = useWatch({ control, name: "rebates" }) || [];
  const liveMargin = useWatch({ control, name: "margin_pct" });
  const liveRate = useWatch({ control, name: "exchange_rate" });
  const liveCurrencyId = useWatch({ control, name: "currency_id" });

  // ─── Initial loads ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getCurrencyDropdown());
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getRebateDropdown());
    if (isEdit) {
      dispatch(getQuotation(id));
    } else {
      dispatch(cleanQuotationState());
      reset(initQuotationItem);
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
        })),
        expenses: (q.expenses || []).map((e) => ({
          ...initQuotationExpenseItem,
          ...e,
          amount: String(e.amount ?? ""),
        })),
        rebates: (q.rebates || []).map((r) => ({
          ...initQuotationRebateItem,
          ...r,
          amount: String(r.amount ?? ""),
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
      const opts = (cust.addresses || [])
        .filter(
          (a) =>
            !a.type ||
            a.type === CUSTOMER_ADDRESS_TYPES.BILL_TO ||
            a.is_default
        )
        .map((a) => ({
          value: a._id,
          label: [a.label, a.address_line1, a.city, a.country]
            .filter(Boolean)
            .join(", "),
        }));
      setCustomerAddressOptions(opts);
    }
  }, [customerStore?.customerItem, watchedCustomer]);

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
        label: `${c.code} — ${c.name}`,
      })),
    [currencyStore?.currencyDropdown]
  );

  const productOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code ? p.code + " — " : ""}${p.name}`,
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
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax_total = 0;
    (liveLines || []).forEach((l) => {
      const qty = num(l?.qty);
      const price = num(l?.unit_price);
      const disc = num(l?.discount_pct);
      const taxPct = num(l?.tax_pct);
      const lineNet = qty * price * (1 - disc / 100);
      subtotal += lineNet;
      tax_total += lineNet * (taxPct / 100);
    });
    const expenses_total = (liveExpenses || []).reduce(
      (s, e) => s + deriveExpenseAmount(e, subtotal, expenseMasterMap),
      0
    );
    const rebates_total = (liveRebates || []).reduce(
      (s, r) => s + deriveRebateAmount(r, subtotal, rebateMasterMap),
      0
    );
    const net = subtotal + expenses_total - rebates_total;
    const margin_amount = net * (num(liveMargin) / 100);
    const grand_inr = net + margin_amount + tax_total;
    const rate = num(liveRate) || 1;
    const grand_currency = grand_inr * rate;
    return {
      subtotal,
      expenses_total,
      rebates_total,
      net,
      margin_amount,
      tax_total,
      grand_inr,
      grand_currency,
      rate,
    };
  }, [
    liveLines,
    liveExpenses,
    liveRebates,
    liveMargin,
    liveRate,
    expenseMasterMap,
    rebateMasterMap,
  ]);

  // ─── Submit ─────────────────────────────────────────────────────────
  const onSubmit = (values) => {
    const payload = {
      lead_id: values.lead_id || undefined,
      customer_id: values.customer_id,
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
      })),
      expenses: (values.expenses || [])
        .filter((e) => e.name || e.expense_id || e.amount)
        .map((e) => ({
          expense_id: e.expense_id || undefined,
          name: e.name || "",
          amount: String(
            round2(deriveExpenseAmount(e, totals.subtotal, expenseMasterMap)) ||
              0
          ),
          is_overridden: !!e.is_overridden,
        })),
      rebates: (values.rebates || [])
        .filter((r) => r.name || r.rebate_id || r.amount)
        .map((r) => ({
          rebate_id: r.rebate_id || undefined,
          name: r.name || "",
          amount: String(
            round2(deriveRebateAmount(r, totals.subtotal, rebateMasterMap)) ||
              0
          ),
          is_overridden: !!r.is_overridden,
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
              ? ` — ${store.quotationItem.voucher_no}`
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
          {/* ── Header ─────────────────────────────── */}
          <Card>
            <CardBody>
              <h5 className="mb-2 mt-1 fw-bold text-uppercase text-muted">
                {t("Header")}
              </h5>
              <hr className="mt-0 mb-2" />

              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label">
                    {t("Customer")} {required}
                  </Label>
                  <Controller
                    name="customer_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
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
                        isDisabled={!watchedCustomer}
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
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("INR × rate = customer-currency amount.")}
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
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label">{t("Margin %")}</Label>
                  <Controller
                    name="margin_pct"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value ?? ""}
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
                      return (
                        <div className="form-control bg-light">
                          {linked ? (
                            <span>
                              🔗{" "}
                              <strong>
                                {lead.company_name ||
                                  lead.contact_name ||
                                  "—"}
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
                          ) : (
                            <span className="text-muted">
                              {t("Loading lead…")}
                            </span>
                          )}
                        </div>
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

                <Col md="6" className="mb-2">
                  <Label className="form-label">{t("Notes to Client")}</Label>
                  <Controller
                    name="notes_to_client"
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
              <QuotationLineItems
                control={control}
                setValue={setValue}
                productOptions={productOptions}
              />
              <QuotationExpenses
                control={control}
                setValue={setValue}
                expenseOptions={expenseOptions}
                expenseMasterMap={expenseMasterMap}
                subtotal={totals.subtotal}
              />
              <QuotationRebates
                control={control}
                setValue={setValue}
                rebateOptions={rebateOptions}
                rebateMasterMap={rebateMasterMap}
                subtotal={totals.subtotal}
              />
            </Col>
            <Col lg="3">
              <QuotationCostingCard
                totals={totals}
                marginPct={liveMargin}
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
