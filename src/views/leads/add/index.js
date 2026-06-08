// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getLead,
  createLead,
  updateLead,
  cleanLeadMessage,
} from "../store";
import { getCustomerDropdown, getCustomer } from "../../customers/store";
import { getProductDropdown } from "../../products/store";
import { getRebateDropdown } from "../../rebates/store";
import { getExpenseDropdown } from "../../expenses/store";
import { getExchangeRateOptions } from "../../currencies/store";
import { getVendorDropdown } from "../../vendors/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap
import {
  Row,
  Col,
  Form,
  Card,
  CardBody,
  Label,
  Input,
  InputGroup,
  InputGroupText,
  Button,
  FormFeedback,
} from "reactstrap";
import { getCurrencySymbol } from "@src/utility/currency";

// ** Form
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";

// ** Custom
import Notification from "@components/toast/notification";
import PhoneInputField from "@src/components/phone-input/PhoneInputField";
import DateInput from "@components/date-input";

// ** Third Party
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft, FileText, Briefcase, Target, MapPin } from "react-feather";

// ** Wizard scaffolding (shared with Customer / Quotation / PFI / PO wizards)
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

// ** Shared line-item table (same component the Quotation/PFI/PO wizards use).
import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initQuotationLineItem } from "@constant/reduxConstant";

// ** Constants
import { appsRoot } from "@constant/defaultValues";

const STEPS = [
  {
    key: "basic",
    label: "Lead & Contact",
    icon: Briefcase,
    fields: [
      "source",
      "company_name",
      "contact_name",
      "contact_email",
      "status",
    ],
  },
  {
    key: "opportunity",
    label: "Opportunity",
    icon: Target,
    fields: ["expected_value"],
  },
  {
    key: "address",
    label: "Address & Social",
    icon: MapPin,
    fields: [],
  },
];
import { initLeadItem } from "@constant/reduxConstant";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
} from "@constant/options";

const LeadForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.lead);
  const customerStore = useSelector((state) => state.customer);
  const productStore = useSelector((state) => state.product);
  const rebateStore = useSelector((state) => state.rebate);
  const expenseStore = useSelector((state) => state.expense);
  const vendorStore = useSelector((state) => state.vendor);
  const currencyStore = useSelector((state) => state.currency);
  const isEditMode = !!id;

  const [autoFillFromCustomer, setAutoFillFromCustomer] = useState(false);

  const schema = useMemo(
    () =>
      yup.object().shape({
        company_name: yup
          .string()
          .trim()
          .required(t("Company name is required"))
          .max(200),
        contact_name: yup
          .string()
          .trim()
          .required(t("Contact name is required"))
          .max(150),
        contact_email: yup
          .string()
          .trim()
          .email(t("Invalid email"))
          .required(t("Email is required")),
        contact_phone: yup.string().trim().nullable().notRequired(),
        source: yup.string().required(t("Source is required")),
        status: yup.string().required(t("Status is required")),
        expected_value: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0)
          .nullable()
          .notRequired(),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initLeadItem,
  });

  // ── Wizard navigation state ─────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));

  const goTo = async (idx, { validate = true } = {}) => {
    if (idx === activeStep) return;
    if (idx < 0 || idx >= STEPS.length) return;
    if (idx > activeStep && validate) {
      const fields = STEPS[activeStep].fields || [];
      const ok = fields.length === 0 ? true : await trigger(fields);
      if (!ok) {
        Notification(
          "Validation",
          t("Please complete the highlighted fields first."),
          "warning"
        );
        return;
      }
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

  const watchCustomerId = watch("customer_id");

  // Exchange rate for the selected currency (doc = INR × rate; base = 1).
  const watchCurrency = watch("currency");
  const leadRate = (() => {
    if (!watchCurrency || String(watchCurrency).toUpperCase() === "INR")
      return 1;
    const opt = (currencyStore?.exchangeOptions || []).find(
      (c) => String(c?.code).toUpperCase() === String(watchCurrency).toUpperCase()
    );
    const r = Number(opt?.rate);
    return r > 0 ? r : 1;
  })();

  // Expected Value is a manual forecast (rep's subjective deal size). It is NOT
  // auto-computed: requirement lines carry no price (vendor/pricing is decided
  // later at the quotation). The detail page shows a separate computed
  // "Estimated Sales Value" (Σ qty × product selling price) from the items.

  useLayoutEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getProductDropdown());
    dispatch(getRebateDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getExchangeRateOptions());
    dispatch(getVendorDropdown());
    if (isEditMode) {
      dispatch(getLead(id));
    } else {
      reset(initLeadItem);
    }
    window.scrollTo(0, 0);
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode && store?.leadItem && store.leadItem._id) {
      reset({
        ...initLeadItem,
        ...store.leadItem,
        expected_value: store.leadItem.expected_value ?? "",
        interested_categories: store.leadItem.interested_categories || [],
        interested_products: store.leadItem.interested_products || [],
        lines: (store.leadItem.lines || []).map((l) => ({
          product_id: l.product_id || "",
          vendor_id: l.vendor_id || "",
          description: l.description || "",
          customer_reference: l.customer_reference || "",
          qty: l.qty != null ? String(l.qty) : "",
          unit: l.unit || "",
          unit_price: l.unit_price != null ? String(l.unit_price) : "",
          discount_pct: l.discount_pct != null ? String(l.discount_pct) : "0",
          tax_pct: l.tax_pct != null ? String(l.tax_pct) : "0",
          margin_pct: l.margin_pct != null ? String(l.margin_pct) : "0",
          product_rebates_snapshot: l.product_rebates_snapshot || [],
          product_expenses_snapshot: l.product_expenses_snapshot || [],
          hs_code: l.hs_code || "",
          net_weight_kg: l.net_weight_kg != null ? String(l.net_weight_kg) : "0",
          gross_weight_kg:
            l.gross_weight_kg != null ? String(l.gross_weight_kg) : "0",
          package_count: l.package_count != null ? Number(l.package_count) : 0,
        })),
        social_media_urls: store.leadItem.social_media_urls || {},
        preferred_vendors: store.leadItem.preferred_vendors || [],
        follow_up_date: (store.leadItem.follow_up_date || "").slice(0, 10),
      });
      // Mark every step as visited so the user can click any of them.
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
  }, [store?.leadItem?._id]);

  // Auto-fill from existing customer when selected. Dropdown only carries
  // _id + company_name, so fetch the full customer record and copy the
  // primary contact + default address into the lead form.
  useEffect(() => {
    if (!autoFillFromCustomer || !watchCustomerId) return;
    dispatch(getCustomer(watchCustomerId));
  }, [watchCustomerId, autoFillFromCustomer]);

  useEffect(() => {
    if (!autoFillFromCustomer) return;
    const c = customerStore?.customerItem;
    if (!c || c._id !== watchCustomerId) return;

    const opts = { shouldValidate: true };
    setValue("company_name", c.company_name || "", opts);
    setValue("source", "existing_customer", opts);
    if (c.currency) setValue("currency", c.currency, opts);
    if (c.primary_contact_name)
      setValue("contact_name", c.primary_contact_name, opts);
    if (c.primary_contact_email)
      setValue("contact_email", c.primary_contact_email, opts);
    if (c.primary_contact_phone)
      setValue("contact_phone", c.primary_contact_phone);
    if (c.primary_contact_country_code)
      setValue("country_code", c.primary_contact_country_code);

    // Pull a default-or-first address from the customer's address book.
    const addr =
      (c.addresses || []).find((a) => a.is_default) ||
      (c.addresses || [])[0];
    if (addr) {
      if (addr.address_line1) setValue("address_line1", addr.address_line1);
      if (addr.address_line2) setValue("address_line2", addr.address_line2);
      if (addr.city) setValue("city", addr.city);
      if (addr.state) setValue("state", addr.state);
      if (addr.country) setValue("country", addr.country);
      if (addr.postcode) setValue("postcode", addr.postcode);
    }

    setAutoFillFromCustomer(false);
  }, [customerStore?.customerItem, watchCustomerId, autoFillFromCustomer]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanLeadMessage(null));
    }
    if (
      store?.actionFlag === "LEAD_CRTD" ||
      store?.actionFlag === "LEAD_UPDT" ||
      store?.actionFlag === "LEAD_CONV"
    ) {
      navigate(`${appsRoot}/leads`);
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  // Re-route Save → run full validation, jump to the first step containing
  // errors if any, otherwise submit through react-hook-form's normal flow.
  const findFirstErrorStep = () => {
    const errs = errors || {};
    const hasErr = (path) => !!errs[path.split(".")[0]];
    for (let i = 0; i < STEPS.length; i++) {
      if ((STEPS[i].fields || []).some(hasErr)) return i;
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
    handleSubmit(onSubmit)();
  };

  const onSubmit = (data) => {
    // Strip empty _id (init value "") so TypeORM doesn't treat it as
    // "save existing entity" and query LeadEntity._id IN ('') (invalid UUID).
    const { _id, ...rest } = data;
    const payload = {
      ...rest,
      customer_id: data.customer_id || undefined,
      assigned_to: data.assigned_to || undefined,
      currency: data.currency || undefined,
      country_code: data.country_code || undefined,
      // Field is shown in the selected currency; store it back in base (INR).
      expected_value:
        data.expected_value === "" || data.expected_value === null
          ? undefined
          : Number(data.expected_value) / (leadRate || 1),
      // Requirement line items (quotation line shape — managed by the shared
      // SalesDocLineItems component). Deprecated interested_* arrays are
      // omitted so legacy values on existing leads are preserved.
      lines: (data.lines || [])
        .filter((l) => l.product_id)
        .map((l, i) => {
          const numOrU = (v) =>
            v === "" || v == null ? undefined : String(v);
          return {
            product_id: l.product_id,
            vendor_id: l.vendor_id || undefined,
            description: l.description || undefined,
            customer_reference: l.customer_reference || undefined,
            qty: numOrU(l.qty),
            unit: l.unit || undefined,
            unit_price: numOrU(l.unit_price),
            discount_pct: numOrU(l.discount_pct),
            tax_pct: numOrU(l.tax_pct),
            margin_pct: numOrU(l.margin_pct),
            product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
              ? l.product_rebates_snapshot
              : undefined,
            product_expenses_snapshot: Array.isArray(
              l.product_expenses_snapshot
            )
              ? l.product_expenses_snapshot
              : undefined,
            hs_code: l.hs_code || undefined,
            net_weight_kg: numOrU(l.net_weight_kg),
            gross_weight_kg: numOrU(l.gross_weight_kg),
            package_count:
              l.package_count === "" || l.package_count == null
                ? undefined
                : Number(l.package_count),
            seq: i + 1,
          };
        }),
      website_url: data.website_url?.trim() || undefined,
      social_media_urls:
        data.social_media_urls &&
        Object.values(data.social_media_urls).some((v) => v?.trim())
          ? Object.fromEntries(
              Object.entries(data.social_media_urls).filter(
                ([, v]) => v?.trim()
              )
            )
          : undefined,
      quantity: data.quantity?.trim() || undefined,
      delivery_expectation: data.delivery_expectation?.trim() || undefined,
      preferred_vendors: data.preferred_vendors?.length
        ? data.preferred_vendors
        : undefined,
      follow_up_date: data.follow_up_date || undefined,
    };
    if (isEditMode) {
      dispatch(updateLead({ id, data: payload }));
    } else {
      dispatch(createLead(payload));
    }
  };

  const customerOptions = (customerStore?.customerDropdown || []).map((c) => ({
    value: c._id,
    label: c.company_name,
  }));

  // Option shapes for the shared SalesDocLineItems component (same as the
  // Quotation wizard). `raw` carries the full product/master record so the
  // component can auto-fill price (price list), HS code, weights, etc.
  const allProductOptions = (productStore?.productDropdown || []).map((p) => ({
    value: p._id,
    label: `${p.code ? p.code + " - " : ""}${p.name || p.product_name}`,
    raw: p,
  }));
  const rebateOptions = (rebateStore?.rebateDropdown || []).map((r) => ({
    value: r._id,
    label: r.name,
    raw: r,
  }));
  const expenseOptions = (expenseStore?.expenseDropdown || []).map((e) => ({
    value: e._id,
    label: e.name,
    raw: e,
  }));

  const currencyOptions = (currencyStore?.exchangeOptions || []).map((c) => ({
    value: c.code,
    label: c.name ? `${c.code} - ${c.name}` : c.code,
  }));

  const vendorOptions = (vendorStore?.vendorDropdown || []).map((v) => ({
    value: v._id,
    label: v.vendor_code
      ? `${v.company_name} [${v.vendor_code}]`
      : v.company_name,
  }));

  const requiredMark = <span className="text-danger">*</span>;

  return (
    <Fragment>
      <div className="main-content leads-form quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Lead") : t("Add Lead")}
          </h3>
          <div>
            <Button
              color="secondary"
              outline
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={14} /> {t("Back")}
            </Button>
          </div>
        </div>

        {isEditMode && store?.leadItem?.quotations_count > 0 && (
          <div className="alert alert-info mb-2">
            <div className="alert-body d-flex justify-content-between align-items-center gap-2">
              <div>
                <FileText size={16} className="me-1" />
                <strong>
                  {store.leadItem.quotations_count}{" "}
                  {store.leadItem.quotations_count === 1
                    ? t("quotation")
                    : t("quotations")}
                </strong>{" "}
                {t(
                  "already created from this lead. Avoid duplicates - review existing quotations before creating a new one."
                )}
              </div>
              <Button
                size="sm"
                color="info"
                outline
                type="button"
                className="flex-shrink-0"
                onClick={() =>
                  navigate(`${appsRoot}/quotations?lead_id=${id}`, {
                    state: {
                      leadName:
                        store?.leadItem?.company_name ||
                        store?.leadItem?.contact_name ||
                        "",
                    },
                  })
                }
              >
                {t("View Quotations")}
              </Button>
            </div>
          </div>
        )}

        <WizardHeader
          steps={STEPS}
          activeStep={activeStep}
          visited={visited}
          onStepClick={(i) => goTo(i)}
          isEdit={isEditMode}
        />

        <Card>
          <CardBody>
            <Form onSubmit={(e) => e.preventDefault()}>
              {activeStep === 0 && (
                <Fragment>
              {/* ── Lead Source / Existing Customer link ── */}
              <h4 className="mb-2">{t("Lead Information")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="customer_id">
                    {t("Existing Customer (optional)")}
                  </Label>
                  <Controller
                    name="customer_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="customer_id"
                        isClearable
                        options={customerOptions}
                        value={
                          customerOptions.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) => {
                          field.onChange(opt ? opt.value : "");
                          if (opt) {
                            setAutoFillFromCustomer(true);
                          } else {
                            // Cleared the customer - wipe the fields we
                            // auto-filled so the form returns to a blank slate.
                            const blankOpts = { shouldValidate: true };
                            setValue("company_name", "", blankOpts);
                            setValue("contact_name", "", blankOpts);
                            setValue("contact_email", "", blankOpts);
                            setValue("contact_phone", "");
                            setValue("country_code", null);
                            setValue("address_line1", "");
                            setValue("address_line2", "");
                            setValue("city", "");
                            setValue("state", "");
                            setValue("country", "India");
                            setValue("postcode", "");
                            setValue("source", "web", blankOpts);
                            setValue("currency", "", blankOpts);
                            setAutoFillFromCustomer(false);
                          }
                        }}
                        placeholder={t("Link to repeat customer")}
                        classNamePrefix="select"
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t(
                      "If this lead is from an existing customer, link it here for repeat-business tracking."
                    )}
                  </small>
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="source">
                    {t("Source")} {requiredMark}
                  </Label>
                  <Controller
                    name="source"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="source"
                        options={LEAD_SOURCE_OPTIONS}
                        value={
                          LEAD_SOURCE_OPTIONS.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                        classNamePrefix="select"
                      />
                    )}
                  />
                  {errors.source && (
                    <FormFeedback className="d-block">
                      {errors.source.message}
                    </FormFeedback>
                  )}
                </Col>
              </Row>

              {/* ── Company / Contact ── */}
              <h4 className="mt-3 mb-2">{t("Company & Contact")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="company_name">
                    {t("Company Name")} {requiredMark}
                  </Label>
                  <Controller
                    name="company_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="company_name"
                        invalid={!!errors.company_name}
                        {...field}
                      />
                    )}
                  />
                  {errors.company_name && (
                    <FormFeedback>{errors.company_name.message}</FormFeedback>
                  )}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="contact_name">
                    {t("Contact Name")} {requiredMark}
                  </Label>
                  <Controller
                    name="contact_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="contact_name"
                        invalid={!!errors.contact_name}
                        {...field}
                      />
                    )}
                  />
                  {errors.contact_name && (
                    <FormFeedback>{errors.contact_name.message}</FormFeedback>
                  )}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="contact_email">
                    {t("Email")} {requiredMark}
                  </Label>
                  <Controller
                    name="contact_email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="contact_email"
                        type="email"
                        invalid={!!errors.contact_email}
                        {...field}
                      />
                    )}
                  />
                  {errors.contact_email && (
                    <FormFeedback>{errors.contact_email.message}</FormFeedback>
                  )}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label">{t("Phone")}</Label>
                  <Controller
                    name="country_code"
                    control={control}
                    render={({ field: ccField }) => (
                      <PhoneInputField
                        value={ccField.value}
                        phone={watch("contact_phone")}
                        onChange={(next) => {
                          ccField.onChange(next);
                          setValue("contact_phone", next.phone || "");
                        }}
                      />
                    )}
                  />
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="website_url">
                    {t("Website")}
                  </Label>
                  <Controller
                    name="website_url"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="website_url"
                        type="text"
                        placeholder="https://"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="status">
                    {t("Status")} {requiredMark}
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="status"
                        options={LEAD_STATUS_OPTIONS}
                        value={
                          LEAD_STATUS_OPTIONS.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                        classNamePrefix="select"
                      />
                    )}
                  />
                  {errors.status && (
                    <FormFeedback className="d-block">
                      {errors.status.message}
                    </FormFeedback>
                  )}
                </Col>
              </Row>

                </Fragment>
              )}

              {activeStep === 1 && (
                <Fragment>
              {/* ── Opportunity ── */}
              <h4 className="mt-1 mb-2">
                {t("Opportunity")}{" "}
                <small className="text-muted fw-normal">({t("Optional")})</small>
              </h4>
              <Row>
                <Col md="12" className="mb-0">
                  <h5 className="mb-1">{t("Requirement Items")}</h5>
                  <small className="text-muted d-block mb-2">
                    {t(
                      "What the customer wants. Price auto-fills from the cheapest current vendor in the price list. Use Import / Export for bulk entry."
                    )}
                  </small>
                  <SalesDocLineItems
                    control={control}
                    setValue={setValue}
                    productOptions={allProductOptions}
                    allProductOptions={allProductOptions}
                    initLineItem={initQuotationLineItem}
                    rebateOptions={rebateOptions}
                    expenseOptions={expenseOptions}
                    currencyCode={watch("currency") || "INR"}
                    baseCurrencyCode="INR"
                    exchangeRate={1}
                    tableLayout="detailed"
                    displayInBase
                    docType="lead"
                    docNumber=""
                    hideGst
                    showExportFields
                    requirementMode
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="currency">
                    {t("Currency")}
                  </Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="currency"
                        isClearable
                        options={currencyOptions}
                        value={
                          currencyOptions.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                        placeholder={t("Select currency")}
                        classNamePrefix="select"
                      />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="expected_value">
                    {t("Expected Value")}{" "}
                    <span className="text-muted">({t("optional forecast")})</span>
                  </Label>
                  <Controller
                    name="expected_value"
                    control={control}
                    render={({ field }) => (
                      <InputGroup>
                        <InputGroupText>
                          {getCurrencySymbol(watchCurrency || "INR") || "₹"}
                        </InputGroupText>
                        <Input
                          id="expected_value"
                          type="number"
                          min="0"
                          step="any"
                          placeholder={t("Optional estimate")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </InputGroup>
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="delivery_expectation">
                    {t("Delivery Expectation")}
                  </Label>
                  <Controller
                    name="delivery_expectation"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="delivery_expectation"
                        type="text"
                        placeholder={t("e.g. within 30 days")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="follow_up_date">
                    {t("Follow-up Date")}
                  </Label>
                  <Controller
                    name="follow_up_date"
                    control={control}
                    render={({ field }) => (
                      <DateInput
                        id="follow_up_date"
                        value={field.value || ""}
                        onChange={(dates, str, iso) => field.onChange(iso)}
                      />
                    )}
                  />
                </Col>
                <Col md="12" className="mb-2">
                  <Label className="form-label" for="description">
                    {t("Lead Brief / Description")}
                  </Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="description"
                        type="textarea"
                        rows="3"
                        placeholder={t(
                          "Product specs, target price, RFQ details - the brief reps reference throughout the deal."
                        )}
                        {...field}
                      />
                    )}
                  />
                </Col>
              </Row>

                </Fragment>
              )}

              {activeStep === 2 && (
                <Fragment>
              {/* ── Address ── */}
              <h4 className="mt-1 mb-2">{t("Address Information")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="address_line1">
                    {t("Address Line 1")}
                  </Label>
                  <Controller
                    name="address_line1"
                    control={control}
                    render={({ field }) => (
                      <Input id="address_line1" {...field} />
                    )}
                  />
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="address_line2">
                    {t("Address Line 2")}
                  </Label>
                  <Controller
                    name="address_line2"
                    control={control}
                    render={({ field }) => (
                      <Input id="address_line2" {...field} />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="city">
                    {t("City")}
                  </Label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => <Input id="city" {...field} />}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="state">
                    {t("State")}
                  </Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => <Input id="state" {...field} />}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="country">
                    {t("Country")}
                  </Label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="country"
                        classNamePrefix="select"
                        isClearable
                        options={COUNTRY_OPTIONS}
                        value={
                          COUNTRY_OPTIONS.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                        placeholder={t("Select country")}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        }}
                      />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="postcode">
                    {t("Postcode")}
                  </Label>
                  <Controller
                    name="postcode"
                    control={control}
                    render={({ field }) => <Input id="postcode" {...field} />}
                  />
                </Col>

                <Col md="12" className="mb-1 mt-2">
                  <h6 className="fw-bold mb-0">{t("Social Profiles")}</h6>
                </Col>
                {["linkedin", "facebook", "instagram", "twitter"].map(
                  (platform) => (
                    <Col md="6" className="mb-2" key={platform}>
                      <Label
                        className="form-label"
                        for={`social_${platform}`}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Label>
                      <Controller
                        name={`social_media_urls.${platform}`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`social_${platform}`}
                            type="text"
                            placeholder="https://"
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                    </Col>
                  )
                )}
              </Row>

                </Fragment>
              )}

              <WizardFooter
                isFirst={activeStep === 0}
                isLast={activeStep === STEPS.length - 1}
                isEdit={isEditMode}
                onBack={back}
                onNext={next}
                onSubmit={onSave}
                onCancel={() => navigate(-1)}
                submitting={isSubmitting}
              />
            </Form>
          </CardBody>
        </Card>

      </div>
    </Fragment>
  );
};

export default LeadForm;
