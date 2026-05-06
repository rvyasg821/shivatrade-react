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
import { getCustomerDropdown } from "../../customers/store";
import { getProductDropdown } from "../../products/store";
import { getCategoryDropdown } from "../../categories/store";
import { getCurrencyDropdown } from "../../currencies/store";
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

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { ArrowLeft, UserCheck } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
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
  const mySwal = withReactContent(Swal);

  const store = useSelector((state) => state.lead);
  const customerStore = useSelector((state) => state.customer);
  const productStore = useSelector((state) => state.product);
  const categoryStore = useSelector((state) => state.category);
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
          .min(1, t("Select at least one category"))
          .required(t("At least one category is required")),
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
    dispatch(getCurrencyDropdown());
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
      });
    }
  }, [store?.leadItem?._id]);

  // Auto-fill from existing customer when selected
  useEffect(() => {
    if (!autoFillFromCustomer || !watchCustomerId) return;
    const c = customerStore?.customerDropdown?.find(
      (x) => x._id === watchCustomerId
    );
    if (c) {
      setValue("company_name", c.company_name || "", { shouldValidate: true });
      setValue("source", "existing_customer", { shouldValidate: true });
    }
    setAutoFillFromCustomer(false);
  }, [watchCustomerId, autoFillFromCustomer]);

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
  const isAlreadyConvertedOrLost =
    currentStatus === "won" || currentStatus === "lost";

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
    const payload = {
      ...data,
      customer_id: data.customer_id || undefined,
      assigned_to: data.assigned_to || undefined,
      expected_value:
        data.expected_value === "" || data.expected_value === null
          ? undefined
          : Number(data.expected_value),
      interested_categories: data.interested_categories || [],
      interested_products: data.interested_products || [],
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

  const currencyOptions = (currencyStore?.currencyDropdown || []).map((c) => ({
    value: c.code,
    label: `${c.code} - ${c.name}`,
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
                          if (opt) setAutoFillFromCustomer(true);
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
                  <Label className="form-label" for="contact_phone">
                    {t("Phone")}
                  </Label>
                  <Controller
                    name="contact_phone"
                    control={control}
                    render={({ field }) => (
                      <Input id="contact_phone" {...field} />
                    )}
                  />
                </Col>
              </Row>

              {/* ── Opportunity ── */}
              <h4 className="mt-3 mb-2">{t("Opportunity")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="interested_categories">
                    {t("Interested Categories")} {requiredMark}
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
      </div>
    </Fragment>
  );
};

export default LeadForm;
