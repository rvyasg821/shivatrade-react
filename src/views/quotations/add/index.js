// ** React Imports
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
import { useForm, Controller } from "react-hook-form";
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
import { startLoading, stopLoading } from "../../loadingstore";

// ** Utils
import Notification from "@components/toast/notification";
import { useTranslation } from "react-i18next";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initQuotationItem } from "@constant/reduxConstant";
import {
  QUOTATION_STATUS_OPTIONS,
  INCOTERMS_OPTIONS,
  CUSTOMER_ADDRESS_TYPES,
} from "@constant/options";

// ** Icons
import { ChevronLeft } from "react-feather";

const AddQuotation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEdit = !!id;

  const store = useSelector((state) => state.quotation);
  const customerStore = useSelector((state) => state.customer);
  const currencyStore = useSelector((state) => state.currency);

  const [submitting, setSubmitting] = useState(false);
  const [customerAddressOptions, setCustomerAddressOptions] = useState([]);

  const schema = useMemo(
    () =>
      yup.object().shape({
        customer_id: yup
          .string()
          .trim()
          .required(t("Customer is required")),
        currency_id: yup
          .string()
          .trim()
          .required(t("Currency is required")),
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

  // ─── Initial loads ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getCustomerDropdown());
    dispatch(getCurrencyDropdown());
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
      reset({
        ...initQuotationItem,
        ...store.quotationItem,
        // Coerce to strings so Inputs don't get NaN
        margin_pct: String(store.quotationItem.margin_pct ?? "0"),
        exchange_rate: String(store.quotationItem.exchange_rate ?? "1"),
        quotation_date:
          (store.quotationItem.quotation_date || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        valid_until:
          (store.quotationItem.valid_until || "").slice(0, 10) || "",
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
          (a) => !a.type || a.type === CUSTOMER_ADDRESS_TYPES.BILL_TO || a.is_default
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
      // Lines/expenses/rebates wired Thursday — preserve existing rows on edit.
      lines: store?.quotationItem?.lines || [],
      expenses: store?.quotationItem?.expenses || [],
      rebates: store?.quotationItem?.rebates || [],
    };

    setSubmitting(true);
    const action = isEdit
      ? dispatch(updateQuotation({ id, data: payload }))
      : dispatch(createQuotation(payload));

    action.unwrap?.().finally(() => setSubmitting(false)) ||
      action.finally?.(() => setSubmitting(false));
  };

  // ─── Options ────────────────────────────────────────────────────────
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

  const required = <span className="text-danger">*</span>;

  return (
    <Fragment>
      <div className="main-content quotation-add">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <Link
              to={`${appsRoot}/quotations`}
              className="me-2 text-muted"
              title={t("Back")}
            >
              <ChevronLeft size={22} />
            </Link>
            <h3 className="mb-0">
              {isEdit ? t("Edit Quotation") : t("Add Quotation")}
              {isEdit && store?.quotationItem?.voucher_no
                ? ` — ${store.quotationItem.voucher_no}`
                : ""}
            </h3>
          </div>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              {/* ── Header ─────────────────────────────── */}
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
                          customerOptions.find((o) => o.value === field.value) ||
                          null
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
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
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
                    <FormFeedback>{errors.quotation_date.message}</FormFeedback>
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
                          currencyOptions.find((o) => o.value === field.value) ||
                          null
                        }
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
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
                      <Input
                        placeholder="e.g. 30% advance, 70% before shipment"
                        {...field}
                        value={field.value || ""}
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
                          INCOTERMS_OPTIONS.find((o) => o.value === field.value) ||
                          null
                        }
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                      />
                    )}
                  />
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label">{t("Delivery Location")}</Label>
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
                  <Label className="form-label">
                    {t("Lead Reference (optional)")}
                  </Label>
                  <Controller
                    name="lead_id"
                    control={control}
                    render={({ field }) => (
                      <Input
                        placeholder={t("Lead UUID — populated automatically when converting from a Lead")}
                        {...field}
                        value={field.value || ""}
                      />
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

              {/* ── Line Items / Expenses / Rebates / Costing card ──── */}
              <h5 className="mb-2 mt-3 fw-bold text-uppercase text-muted">
                {t("Line Items")}
              </h5>
              <hr className="mt-0 mb-2" />
              <div className="border rounded p-3 mb-3 bg-light text-muted">
                <em>
                  {t(
                    "Line items, expenses, rebates and the live costing card land Thursday. Save the header today; rows can be added on next iteration."
                  )}
                </em>
              </div>

              {/* ── Action ──────────────────────────────── */}
              <div className="d-flex justify-content-end gap-2 pt-2 pb-1">
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
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default AddQuotation;
