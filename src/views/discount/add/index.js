// ** React Imports
import { Fragment, useEffect, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getDiscountDetails, createDiscount, updateDiscount } from "@src/views/subscription/store";
import { startLoading, stopLoading } from "../../loadingstore";
import { useTranslation } from "react-i18next";
import { momentFormatDate } from "@src/utility/Utils";
import Select from "react-select";
import DateInput from "@components/date-input";
// ** Reactstrap Imports
import {
  Row,
  Form,
  Card,
  Label,
  Input,
  Button,
  Spinner,
  CardBody,
  FormFeedback,
  Col,
  Alert,
} from "reactstrap";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Notification from '@src/@core/components/toast/notification';

// ** Icons Import
import { ArrowLeft, Plus, Trash2, Info } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

// Duration type options
const durationTypeOptions = [
  { label: "Forever (All recurring payments)", value: "forever" },
  { label: "First Payment Only", value: "first_payment" },
  { label: "Limited Months", value: "limited_months" }
];

// Location rule type options
const locationRuleTypeOptions = [
  { label: "Any (No restriction)", value: "any" },
  { label: "Exact Match", value: "exact" },
  { label: "Minimum", value: "minimum" },
  { label: "Maximum", value: "maximum" },
  { label: "Range", value: "range" }
];

// Helper to get location rule description
const getLocationRuleDescription = (rule) => {
  if (!rule || !rule.type) return "";
  switch (rule.type) {
    case "any":
      return "Any locations";
    case "exact":
      return `Exactly ${rule.value || 0} location(s)`;
    case "minimum":
      return `At least ${rule.value || 0} location(s)`;
    case "maximum":
      return `At most ${rule.value || 0} location(s)`;
    case "range":
      return `${rule.min || 0} to ${rule.max || 0} location(s)`;
    default:
      return "";
  }
};

const DiscountForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((state) => state.subscription);
  const isEditMode = !!id;

  // Watch for duration type changes
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const [showDurationMonths, setShowDurationMonths] = useState(false);

  // Validation schema
  const DiscountSchema = yup.object().shape({
    name: yup.string().required("Discount name is required."),
    discount_type: yup.string().required("Discount type is required."),
    discount_value: yup
      .number()
      .typeError("Discount value must be a number.")
      .required("Discount value is required.")
      .min(0, "Discount value cannot be negative."),
    description: yup.string().nullable(),
    max_occurances: yup
      .number()
      .typeError("Max occurances must be a number.")
      .min(0, "Cannot be negative. Use 0 for unlimited."),
    start_date: yup
      .string()
      .required("Start date is required.")
      .test("is-valid-date", "Start date is invalid", (value) =>
        !!value && !isNaN(new Date(value).getTime())
      ),
    end_date: yup
      .string()
      .required("End date is required.")
      .test("is-valid-date", "End date is invalid", (value) =>
        !!value && !isNaN(new Date(value).getTime())
      )
      .test("is-after-start", "End date cannot be before start date", function (value) {
        const { start_date } = this.parent;
        if (!value) return true;
        if (!start_date) return true;
        return new Date(value) >= new Date(start_date);
      }),
    duration_type: yup.string().required("Duration type is required."),
    duration_months: yup
      .number()
      .nullable()
      .when("duration_type", {
        is: "limited_months",
        then: (schema) => schema.required("Duration months is required.").min(1, "Must be at least 1 month."),
        otherwise: (schema) => schema.nullable()
      }),
    location_rules: yup.array().of(
      yup.object().shape({
        type: yup.string().required("Rule type is required."),
        value: yup.number().nullable(),
        min: yup.number().nullable(),
        max: yup.number().nullable()
      })
    )
  });

  const {
    reset,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      name: "",
      discount_type: "",
      discount_value: "",
      description: "",
      max_occurances: 0,
      start_date: "",
      end_date: "",
      status: 1,
      duration_type: "forever",
      duration_months: null,
      location_rules: []
    },
    resolver: yupResolver(DiscountSchema),
    shouldFocusError: false,
  });

  // Field array for location rules
  const { fields, append, remove } = useFieldArray({
    control,
    name: "location_rules"
  });

  // Watch duration_type to show/hide duration_months
  const watchDurationType = watch("duration_type");

  useEffect(() => {
    setShowDurationMonths(watchDurationType === "limited_months");
    if (watchDurationType !== "limited_months") {
      setValue("duration_months", null);
    }
  }, [watchDurationType, setValue]);

  useLayoutEffect(() => {
    if (isEditMode) {
      dispatch(getDiscountDetails({ id }));
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store.discountItem) {
      reset({
        name: store.discountItem.name || "",
        discount_type: store.discountItem.discount_type || "percentage",
        discount_value: store.discountItem.discount_value || 0,
        description: store.discountItem.description || "",
        max_occurances: store.discountItem.max_occurances || 0,
        start_date: store.discountItem.start_date
          ? momentFormatDate(store.discountItem.start_date, "YYYY-MM-DD")
          : "",
        end_date: store.discountItem.end_date
          ? momentFormatDate(store.discountItem.end_date, "YYYY-MM-DD")
          : "",
        status: store.discountItem.status ?? 1,
        duration_type: store.discountItem.duration_type || "forever",
        duration_months: store.discountItem.duration_months || null,
        location_rules: store.discountItem.location_rules || []
      });
    }
  }, [store.discountItem]);


  const handleCancel = () => {
    navigate(`${appsRoot}/discount`);
  };

  const addLocationRule = () => {
    append({ type: "exact", value: null, min: null, max: null });
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      // Clean up location rules before submitting
      const cleanedLocationRules = values.location_rules.map(rule => {
        const cleanRule = { type: rule.type };
        if (rule.type === "range") {
          cleanRule.min = rule.min;
          cleanRule.max = rule.max;
        } else if (rule.type !== "any") {
          cleanRule.value = rule.value;
        }
        return cleanRule;
      });

      const payload = {
        ...values,
        location_rules: cleanedLocationRules
      };

      if (isEditMode) {
        const action = await dispatch(
          updateDiscount({
            discountId: id,
            payload
          })
        );
        if (action?.payload?.actionFlag === "DIS_UPDATE_SCS") {
          navigate(`${appsRoot}/discount`);
        }
        else {
          Notification("error", action?.payload?.error);
        }

      } else {

        const action = await dispatch(createDiscount(payload));
        if (action?.payload?.actionFlag === "DIS_CREATE_SCS") {
          navigate(`${appsRoot}/discount`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? "Edit Discount" : "Add Discount"}</h3>
          <Button type="button" className="ms-2 btn-primary" onClick={handleCancel}>
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Row>
              <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                <Row>
                  {/* Discount Name */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="name">Name <span className="text-danger">*</span></Label>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} invalid={!!errors.name} />
                      )}
                    />
                    <FormFeedback>{errors.name?.message}</FormFeedback>
                  </div>

                   {/* Max Occurances */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="max_occurances">Maximum Occurances</Label>
                    <Controller
                      name="max_occurances"
                      control={control}
                      render={({ field }) => (
                        <Input type="number" {...field} invalid={!!errors.max_occurances} />
                      )}
                    />
                    <small className="text-muted">0 means unlimited uses</small>
                    <FormFeedback>{errors.max_occurances?.message}</FormFeedback>
                  </div>

                  {/* Discount Type */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="discount_type">
                      {t("Discount Type")} <span className="text-danger">*</span>
                    </Label>

                    <Controller
                      name="discount_type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          isClearable={false}
                          options={[
                            { label: "Percentage", value: "percentage" },
                            { label: "Fixed Value", value: "value" }
                          ]}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select discount type...")}
                          value={
                            field.value
                              ? { label: field.value === "percentage" ? "Percentage" : "Fixed Value", value: field.value }
                              : null
                          }
                          onChange={(selected) => field.onChange(selected?.value)}
                        />
                      )}
                    />

                    <FormFeedback className="d-block">
                      {errors.discount_type?.message}
                    </FormFeedback>
                  </div>


                  {/* Discount Value */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="discount_value">Discount Value <span className="text-danger">*</span></Label>
                    <Controller
                      name="discount_value"
                      control={control}
                      render={({ field }) => (
                        <Input type="number" {...field} invalid={!!errors.discount_value} />
                      )}
                    />
                    <FormFeedback>{errors.discount_value?.message}</FormFeedback>
                  </div>



                  {/* Start Date */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="start_date">Start Date <span className="text-danger">*</span></Label>

                    <Controller
                      name="start_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput
                          field={field}
                          id="start_date"
                        />
                      )}
                    />

                    <FormFeedback className="d-block">{errors.start_date?.message}</FormFeedback>
                  </div>

                  {/* End Date */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="end_date">{t("End Date")} <span className="text-danger">*</span></Label>

                    <Controller
                      name="end_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput
                          field={field}
                          id="end_date"
                        />
                      )}
                    />
                    <div>

                      <FormFeedback className="d-block">{errors.end_date?.message}</FormFeedback>
                    </div>

                  </div>

                  {/* Description */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="description">Description</Label>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => <Input type="textarea" {...field} />}
                    />
                    <FormFeedback>{errors.description?.message}</FormFeedback>
                  </div>


                  {/* Status */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="status">
                      {t("Status")}
                    </Label>

                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Row className="px-1 status">

                          {/* ACTIVE = 1 */}
                          <div className="form-check" style={{ width: "max-content" }}>
                            <Input
                              type="radio"
                              id="status-active"
                              value={1}
                              checked={Number(field.value) === 1}
                              onChange={() => field.onChange(1)}
                            />
                            <Label className="form-check-label" for="status-active">
                              {t("Active")}
                            </Label>
                          </div>

                          {/* INACTIVE = 0 */}
                          <div className="form-check" style={{ width: "max-content" }}>
                            <Input
                              type="radio"
                              id="status-inactive"
                              value={0}
                              checked={Number(field.value) === 0}
                              onChange={() => field.onChange(0)}
                            />
                            <Label className="form-check-label" for="status-inactive">
                              {t("Inactive")}
                            </Label>
                          </div>

                        </Row>
                      )}
                    />

                    <FormFeedback className="d-block">
                      {errors.status?.message}
                    </FormFeedback>
                  </div>
                </Row>

                {/* Duration Settings Section */}
                <hr className="my-3" />
                <h5 className="mb-3">
                  <Info size={18} className="me-1" /> Duration Settings
                  <small className="text-muted ms-2">(For recurring subscriptions)</small>
                </h5>

                <Row>
                  {/* Duration Type */}
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label for="duration_type">Duration Type <span className="text-danger">*</span></Label>
                    <Controller
                      name="duration_type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          isClearable={false}
                          options={durationTypeOptions}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder="Select duration type..."
                          value={durationTypeOptions.find(opt => opt.value === field.value)}
                          onChange={(selected) => field.onChange(selected?.value)}
                        />
                      )}
                    />
                    <small className="text-muted">
                      {watchDurationType === "forever" && "Discount applies to all future payments"}
                      {watchDurationType === "first_payment" && "Discount applies only to the first payment"}
                      {watchDurationType === "limited_months" && "Discount applies for a specified number of months"}
                    </small>
                    <FormFeedback className="d-block">{errors.duration_type?.message}</FormFeedback>
                  </div>

                  {/* Duration Months (conditional) */}
                  {showDurationMonths && (
                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                      <Label for="duration_months">Number of Months <span className="text-danger">*</span></Label>
                      <Controller
                        name="duration_months"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            min="1"
                            placeholder="e.g., 6"
                            invalid={!!errors.duration_months}
                          />
                        )}
                      />
                      <small className="text-muted">Discount will apply for the first X billing cycles</small>
                      <FormFeedback>{errors.duration_months?.message}</FormFeedback>
                    </div>
                  )}
                </Row>

                {/* Location Rules Section */}
                <hr className="my-3" />
                <h5 className="mb-3">
                  <Info size={18} className="me-1" /> Location Rules
                  <small className="text-muted ms-2">(Optional - leave empty for no restriction)</small>
                </h5>

                <Alert color="info" className="mb-3">
                  <Info size={16} className="me-1" />
                  Add location rules to restrict this discount to subscriptions with specific location counts.
                  Multiple rules use OR logic (discount applies if ANY rule matches).
                </Alert>

                {fields.map((field, index) => {
                  const ruleType = watch(`location_rules.${index}.type`);

                  return (
                    <Card key={field.id} className="mb-2 bg-light">
                      <CardBody className="py-2">
                        <Row className="align-items-end">
                          {/* Rule Type */}
                          <Col md={3}>
                            <Label>Rule Type</Label>
                            <Controller
                              name={`location_rules.${index}.type`}
                              control={control}
                              render={({ field }) => (
                                <Select
                                  {...field}
                                  isClearable={false}
                                  options={locationRuleTypeOptions}
                                  className="react-select"
                                  classNamePrefix="select"
                                  value={locationRuleTypeOptions.find(opt => opt.value === field.value)}
                                  onChange={(selected) => {
                                    field.onChange(selected?.value);
                                    // Reset values when type changes
                                    if (selected?.value === "any") {
                                      setValue(`location_rules.${index}.value`, null);
                                      setValue(`location_rules.${index}.min`, null);
                                      setValue(`location_rules.${index}.max`, null);
                                    } else if (selected?.value === "range") {
                                      setValue(`location_rules.${index}.value`, null);
                                    } else {
                                      setValue(`location_rules.${index}.min`, null);
                                      setValue(`location_rules.${index}.max`, null);
                                    }
                                  }}
                                />
                              )}
                            />
                          </Col>

                          {/* Value field for exact/minimum/maximum */}
                          {ruleType !== "any" && ruleType !== "range" && (
                            <Col md={3}>
                              <Label>Location Count</Label>
                              <Controller
                                name={`location_rules.${index}.value`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value || ""}
                                    min="1"
                                    placeholder="e.g., 5"
                                  />
                                )}
                              />
                            </Col>
                          )}

                          {/* Min/Max fields for range */}
                          {ruleType === "range" && (
                            <>
                              <Col md={2}>
                                <Label>Min</Label>
                                <Controller
                                  name={`location_rules.${index}.min`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      value={field.value || ""}
                                      min="1"
                                      placeholder="Min"
                                    />
                                  )}
                                />
                              </Col>
                              <Col md={2}>
                                <Label>Max</Label>
                                <Controller
                                  name={`location_rules.${index}.max`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      value={field.value || ""}
                                      min="1"
                                      placeholder="Max"
                                    />
                                  )}
                                />
                              </Col>
                            </>
                          )}

                          {/* Description badge */}
                          <Col md={3}>
                            <span className="badge bg-secondary">
                              {getLocationRuleDescription(watch(`location_rules.${index}`))}
                            </span>
                          </Col>

                          {/* Remove button */}
                          <Col md={1}>
                            <Button
                              color="danger"
                              size="sm"
                              onClick={() => remove(index)}
                              title="Remove rule"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </Col>
                        </Row>
                      </CardBody>
                    </Card>
                  );
                })}

                <Button
                  type="button"
                  color="primary"
                  outline
                  size="sm"
                  onClick={addLocationRule}
                  className="mb-3"
                >
                  <Plus size={16} className="me-1" /> Add Location Rule
                </Button>

                <hr className="my-3" />

                <div className="main-form-btn">
                  <Button type="submit" color="primary" disabled={store.loading}>
                    {!store?.loading ? "Save" : <Spinner size="sm" />}
                  </Button>
                  <Button type="button" color="secondary" className="" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </Form>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default DiscountForm;
