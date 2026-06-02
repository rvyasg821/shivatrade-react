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
import { getCategoryDropdown } from "../../categories/store";
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
  Button,
  FormFeedback,
  Table,
} from "reactstrap";

// ** Form
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { ArrowLeft, FileText, Briefcase, Target, MapPin, Plus, Trash2 } from "react-feather";

// ** Wizard scaffolding (shared with Customer / Quotation / PFI / PO wizards)
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

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
  const categoryStore = useSelector((state) => state.category);
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

  // Requirement line items (replaces interested categories/products).
  const {
    fields: lineFields,
    append: appendLine,
    remove: removeLine,
  } = useFieldArray({ control, name: "lines" });

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

  useLayoutEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getProductDropdown());
    dispatch(getCategoryDropdown());
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
          category_id: l.category_id || "",
          description: l.description || "",
          qty: l.qty != null ? String(l.qty) : "",
          unit: l.unit || "",
          target_price: l.target_price != null ? String(l.target_price) : "",
          customer_reference: l.customer_reference || "",
          notes: l.notes || "",
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
      expected_value:
        data.expected_value === "" || data.expected_value === null
          ? undefined
          : Number(data.expected_value),
      // Requirement line items (replaces interested categories/products).
      // The deprecated interested_* arrays are intentionally omitted so any
      // legacy values on existing leads are preserved, not wiped.
      lines: (data.lines || [])
        .filter(
          (l) =>
            l.product_id || l.category_id || (l.description || "").trim()
        )
        .map((l, i) => ({
          product_id: l.product_id || undefined,
          category_id: l.category_id || undefined,
          description: (l.description || "").trim() || undefined,
          qty: l.qty === "" || l.qty == null ? undefined : String(l.qty),
          unit: l.unit?.trim() || undefined,
          target_price:
            l.target_price === "" || l.target_price == null
              ? undefined
              : String(l.target_price),
          customer_reference: l.customer_reference?.trim() || undefined,
          notes: l.notes?.trim() || undefined,
          seq: i + 1,
        })),
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

  const categoryOptions = (categoryStore?.categoryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  // Per-line product picker — all products (each line carries its own product
  // / category, so no global category filter).
  const productOptions = (productStore?.productDropdown || []).map((p) => ({
    value: p._id,
    label: p.code
      ? `${p.code} — ${p.name || p.product_name}`
      : p.name || p.product_name,
    raw: p,
  }));

  // Picking a product auto-fills the line's category, description (if blank)
  // and unit from the product master.
  const onPickLineProduct = (idx, opt) => {
    const p = opt?.raw;
    setValue(`lines.${idx}.product_id`, opt?.value || "");
    if (p) {
      if (p.category_id) setValue(`lines.${idx}.category_id`, p.category_id);
      const curDesc = watch(`lines.${idx}.description`);
      if (!curDesc) {
        setValue(`lines.${idx}.description`, p.name || p.product_name || "");
      }
      const curUnit = watch(`lines.${idx}.unit`);
      if (!curUnit && p.unit_of_measure) {
        setValue(`lines.${idx}.unit`, p.unit_of_measure);
      }
      // Seed the target price from the product's standard selling price as a
      // starting reference (price-list is vendor cost, resolved later at RFQ).
      const curTarget = watch(`lines.${idx}.target_price`);
      if (
        (curTarget === "" || curTarget == null) &&
        p.selling_price != null &&
        String(p.selling_price) !== ""
      ) {
        setValue(`lines.${idx}.target_price`, String(p.selling_price));
      }
    }
  };

  const addRequirementLine = () =>
    appendLine({
      product_id: "",
      category_id: "",
      description: "",
      qty: "",
      unit: "",
      target_price: "",
    });

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
                <Col md="12" className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Label className="form-label mb-0">
                      {t("Requirement Items")}
                    </Label>
                    <Button
                      size="sm"
                      color="primary"
                      outline
                      type="button"
                      onClick={addRequirementLine}
                    >
                      <Plus size={14} className="me-25" /> {t("Add Item")}
                    </Button>
                  </div>
                  <small className="text-muted d-block mb-1">
                    {t(
                      "What the customer wants — pick a product or type a free-text item. Used to source vendor pricing."
                    )}
                  </small>
                  {lineFields.length === 0 ? (
                    <div className="text-muted small border rounded p-2 text-center">
                      {t(
                        "No items yet. Click \"Add Item\" to capture the requirement."
                      )}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table size="sm" bordered className="mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th style={{ minWidth: 200 }}>{t("Product")}</th>
                            <th style={{ minWidth: 150 }}>{t("Category")}</th>
                            <th style={{ minWidth: 200 }}>{t("Description")}</th>
                            <th style={{ width: 90 }}>{t("Qty")}</th>
                            <th style={{ width: 90 }}>{t("Unit")}</th>
                            <th style={{ width: 120 }}>{t("Target Price")}</th>
                            <th style={{ width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineFields.map((f, idx) => (
                            <tr key={f.id}>
                              <td>{idx + 1}</td>
                              <td>
                                <Controller
                                  name={`lines.${idx}.product_id`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select
                                      classNamePrefix="select"
                                      isClearable
                                      options={productOptions}
                                      menuPortalTarget={document.body}
                                      styles={{
                                        menuPortal: (b) => ({
                                          ...b,
                                          zIndex: 9999,
                                        }),
                                      }}
                                      value={
                                        productOptions.find(
                                          (o) => o.value === field.value
                                        ) || null
                                      }
                                      onChange={(opt) =>
                                        onPickLineProduct(idx, opt)
                                      }
                                      placeholder={t("Pick product")}
                                    />
                                  )}
                                />
                              </td>
                              <td>
                                <Controller
                                  name={`lines.${idx}.category_id`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select
                                      classNamePrefix="select"
                                      isClearable
                                      options={categoryOptions}
                                      menuPortalTarget={document.body}
                                      styles={{
                                        menuPortal: (b) => ({
                                          ...b,
                                          zIndex: 9999,
                                        }),
                                      }}
                                      value={
                                        categoryOptions.find(
                                          (o) => o.value === field.value
                                        ) || null
                                      }
                                      onChange={(opt) =>
                                        field.onChange(opt?.value || "")
                                      }
                                      placeholder={t("Category")}
                                    />
                                  )}
                                />
                              </td>
                              <td>
                                <Controller
                                  name={`lines.${idx}.description`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      bsSize="sm"
                                      {...field}
                                      placeholder={t("Item / spec")}
                                    />
                                  )}
                                />
                              </td>
                              <td>
                                <Controller
                                  name={`lines.${idx}.qty`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      bsSize="sm"
                                      type="number"
                                      step="any"
                                      min="0"
                                      {...field}
                                    />
                                  )}
                                />
                              </td>
                              <td>
                                <Controller
                                  name={`lines.${idx}.unit`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      bsSize="sm"
                                      {...field}
                                      placeholder={t("e.g. PCS")}
                                    />
                                  )}
                                />
                              </td>
                              <td>
                                <Controller
                                  name={`lines.${idx}.target_price`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      bsSize="sm"
                                      type="number"
                                      step="any"
                                      min="0"
                                      {...field}
                                    />
                                  )}
                                />
                              </td>
                              <td className="text-center">
                                <Button
                                  size="sm"
                                  color="flat-danger"
                                  className="p-25"
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  title={t("Remove")}
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="expected_value">
                    {t("Expected Value")}
                  </Label>
                  <Controller
                    name="expected_value"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="expected_value"
                        type="number"
                        step="0.01"
                        invalid={!!errors.expected_value}
                        {...field}
                      />
                    )}
                  />
                  {errors.expected_value && (
                    <FormFeedback>
                      {errors.expected_value.message}
                    </FormFeedback>
                  )}
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
                  <Label className="form-label" for="quantity">
                    {t("Required Quantity")}
                  </Label>
                  <Controller
                    name="quantity"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="quantity"
                        type="text"
                        placeholder={t("e.g. 500 PCS")}
                        {...field}
                        value={field.value || ""}
                      />
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
                <Col md="9" className="mb-2">
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
                  <Label className="form-label" for="preferred_vendors">
                    {t("Preferred Vendors")}
                  </Label>
                  <Controller
                    name="preferred_vendors"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="preferred_vendors"
                        isMulti
                        isClearable
                        options={vendorOptions}
                        value={vendorOptions.filter((o) =>
                          (field.value || []).includes(o.value)
                        )}
                        onChange={(opts) =>
                          field.onChange((opts || []).map((o) => o.value))
                        }
                        placeholder={t("Select preferred vendors")}
                        classNamePrefix="select"
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("Vendors the customer named as preferred suppliers.")}
                  </small>
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
