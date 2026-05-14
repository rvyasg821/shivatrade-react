// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getLead,
  createLead,
  updateLead,
  convertLead,
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
} from "reactstrap";

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
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { ArrowLeft, UserCheck, FileText } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initLeadItem } from "@constant/reduxConstant";
import ActivityTab from "../ActivityTab";
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
  const mySwal = withReactContent(Swal);

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
        interested_categories: yup
          .array()
          .of(yup.string())
          .nullable()
          .notRequired(),
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
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initLeadItem,
  });

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
        social_media_urls: store.leadItem.social_media_urls || {},
        preferred_vendors: store.leadItem.preferred_vendors || [],
        follow_up_date: (store.leadItem.follow_up_date || "").slice(0, 10),
      });
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

  const currentStatus = watch("status");
  // Hide "Convert to Customer" when:
  //   - status already won or lost (terminal states)
  //   - lead is already linked to a customer (converted_customer_id from a
  //     prior Won, OR customer_id auto-stamped when creating a quotation)
  const isAlreadyConvertedOrLost =
    currentStatus === "won" ||
    currentStatus === "lost" ||
    !!watch("converted_customer_id") ||
    !!watch("customer_id");
  // Allowed on every status except 'lost'. Multiple quotations per lead
  // are intentional — don't gate by existing quotation count.
  const canCreateQuotation = currentStatus !== "lost";

  const handleConvert = () => {
    const linkedCustomerId = watch("customer_id");
    mySwal
      .fire({
        title: t("Convert this lead?"),
        text: linkedCustomerId
          ? t("Lead will be marked Won and linked to the existing customer.")
          : t(
              "We'll match by contact email; if no customer is found, a new one will be created."
            ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, convert"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) dispatch(convertLead(id));
      });
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

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
      interested_categories: data.interested_categories || [],
      interested_products: data.interested_products || [],
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

  const watchCategories = watch("interested_categories") || [];
  const productOptions = (productStore?.productDropdown || [])
    .filter(
      (p) => !p.category_id || watchCategories.includes(p.category_id)
    )
    .map((p) => ({
      value: p._id,
      label: p.name || p.product_name,
    }));

  // Drop products whose category is no longer selected.
  useEffect(() => {
    const allowed = new Set(watchCategories);
    const current = watch("interested_products") || [];
    const filtered = current.filter((pid) => {
      const product = (productStore?.productDropdown || []).find(
        (p) => p._id === pid
      );
      return !product?.category_id || allowed.has(product.category_id);
    });
    if (filtered.length !== current.length) {
      setValue("interested_products", filtered, { shouldValidate: true });
    }
  }, [JSON.stringify(watchCategories)]);

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
      <div className="main-content leads-form">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Lead") : t("Add Lead")}
          </h3>
          <div>
            {isEditMode && canCreateQuotation && (
              <Button
                color="primary"
                outline
                className="me-1"
                onClick={() =>
                  navigate(`${appsRoot}/quotations/add?lead_id=${id}`)
                }
              >
                <FileText size={14} /> {t("Create Quotation")}
              </Button>
            )}
            {isEditMode && !isAlreadyConvertedOrLost && (
              <Button
                color="success"
                className="me-1"
                onClick={handleConvert}
              >
                <UserCheck size={14} /> {t("Convert to Customer")}
              </Button>
            )}
            <Button
              color="secondary"
              outline
              onClick={() => navigate(`${appsRoot}/leads`)}
            >
              <ArrowLeft size={14} /> {t("Back")}
            </Button>
          </div>
        </div>

        {isEditMode && store?.leadItem?.quotations_count > 0 && (
          <div className="alert alert-info d-flex justify-content-between align-items-center mb-2">
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
        )}

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
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
              </Row>

              {/* ── Opportunity ── */}
              <h4 className="mt-3 mb-2">
                {t("Opportunity")}{" "}
                <small className="text-muted fw-normal">({t("Optional")})</small>
              </h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="interested_categories">
                    {t("Interested Categories")}
                  </Label>
                  <Controller
                    name="interested_categories"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="interested_categories"
                        isMulti
                        isClearable
                        options={categoryOptions}
                        value={categoryOptions.filter((o) =>
                          (field.value || []).includes(o.value)
                        )}
                        onChange={(opts) =>
                          field.onChange((opts || []).map((o) => o.value))
                        }
                        placeholder={t("Select categories")}
                        classNamePrefix="select"
                      />
                    )}
                  />
                  {errors.interested_categories && (
                    <FormFeedback className="d-block">
                      {errors.interested_categories.message}
                    </FormFeedback>
                  )}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="interested_products">
                    {t("Interested Products")}
                  </Label>
                  <Controller
                    name="interested_products"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="interested_products"
                        isMulti
                        isClearable
                        isDisabled={watchCategories.length === 0}
                        options={productOptions}
                        value={productOptions.filter((o) =>
                          (field.value || []).includes(o.value)
                        )}
                        onChange={(opts) =>
                          field.onChange(
                            (opts || []).map((o) => o.value)
                          )
                        }
                        placeholder={
                          watchCategories.length === 0
                            ? t("Select categories first")
                            : t("Refine with specific products")
                        }
                        classNamePrefix="select"
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("Optional. Filtered by selected categories.")}
                  </small>
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
                <Col md="12" className="mb-2">
                  <Label className="form-label" for="notes">
                    {t("Notes")}
                  </Label>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="notes"
                        type="textarea"
                        rows="3"
                        {...field}
                      />
                    )}
                  />
                </Col>
              </Row>

              {/* ── Address ── */}
              <h4 className="mt-3 mb-2">{t("Address Information")}</h4>
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

              <div className="d-flex justify-content-end mt-3">
                <Button
                  type="button"
                  color="secondary"
                  outline
                  className="me-1"
                  onClick={() => navigate(`${appsRoot}/leads`)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {isEditMode ? t("Update Lead") : t("Create Lead")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>

        {isEditMode && id && (
          <Card className="mt-3">
            <CardBody>
              <ActivityTab leadId={id} />
            </CardBody>
          </Card>
        )}
      </div>
    </Fragment>
  );
};

export default LeadForm;
