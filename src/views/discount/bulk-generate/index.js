// ** React Imports
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Card,
  Form,
  Label,
  Input,
  Button,
  CardBody,
  FormFeedback,
  Badge,
} from "reactstrap";

// ** Third Party Components
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Eye, Plus, X } from "react-feather";
import DateInput from "@components/date-input";
import moment from "moment";

// ** Utils & Constants
import { appsRoot } from "@constant/defaultValues";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";

// ** Styles
import "./BulkGenerate.scss";

const BulkGenerateDiscount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [locationRules, setLocationRules] = useState([]);

  // Validation Schema
  const BulkDiscountSchema = yup.object().shape({
    quantity: yup
      .number()
      .required(t("Quantity is required"))
      .min(1, t("Minimum 1 code required"))
      .typeError(t("Quantity must be a number")),
    name_prefix: yup.string().required(t("Name prefix is required")),
    discount_type: yup.string().required(t("Discount type is required")),
    discount_value: yup
      .number()
      .required(t("Discount value is required"))
      .min(0, t("Discount value must be positive"))
      .typeError(t("Discount value must be a number")),
    duration_type: yup.string().required(t("Duration type is required")),
    duration_months: yup.number().when("duration_type", {
      is: "limited_months",
      then: (schema) =>
        schema
          .required(t("Duration months is required"))
          .min(1, t("Minimum 1 month required")),
      otherwise: (schema) => schema.nullable(),
    }),
    start_date: yup.string().required(t("Start date is required")).transform((v) => (v === "" ? null : v)).nullable(),
    end_date: yup
      .string()
      .required(t("End date is required"))
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .test("after-start", t("End date must be after start date"), function (val) {
        const { start_date } = this.parent;
        if (!val || !start_date) return true;
        return val >= start_date;
      }),
    max_occurrences: yup
      .number()
      .required(t("Max occurrences is required"))
      .min(1, t("Minimum 1 occurrence required"))
      .typeError(t("Max occurrences must be a number")),
  });

  const {
    reset,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      quantity: 10,
      name_prefix: "",
      discount_type: "percentage",
      discount_value: 10,
      duration_type: "forever",
      duration_months: null,
      start_date: new Date(),
      end_date: moment().add(1, "year").toDate(),
      max_occurrences: 100,
      status: true,
    },
    resolver: yupResolver(BulkDiscountSchema),
  });

  const watchDurationType = watch("duration_type");
  const watchDiscountType = watch("discount_type");

  // Add location rule
  const addLocationRule = () => {
    setLocationRules([...locationRules, { type: "any", value: null, min: null, max: null }]);
  };

  // Remove location rule
  const removeLocationRule = (index) => {
    setLocationRules(locationRules.filter((_, i) => i !== index));
  };

  // Update location rule
  const updateLocationRule = (index, field, value) => {
    const updated = [...locationRules];
    updated[index] = { ...updated[index], [field]: value };
    setLocationRules(updated);
  };

  // Generate preview codes
  const onGeneratePreview = async (data) => {
    setSubmitting(true);
    try {
      setIsGenerating(true);

      const payload = {
        quantity: parseInt(data.quantity),
        name_prefix: data.name_prefix,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        duration_type: data.duration_type,
        duration_months: data.duration_type === "limited_months" ? parseInt(data.duration_months) : null,
        start_date: moment(data.start_date).format("YYYY-MM-DD"),
        end_date: moment(data.end_date).format("YYYY-MM-DD"),
        max_occurrences: parseInt(data.max_occurrences),
        location_rules: locationRules.filter(rule => rule.type !== 'any' || locationRules.length === 1),
        status: data.status ? "ACTIVE" : "INACTIVE",
      };

      // Generate codes locally for preview
      const codes = [];
      for (let i = 0; i < payload.quantity; i++) {
        codes.push({
          discount_code: generateUniqueCode(),
          name: `${payload.name_prefix} #${i + 1}`,
          ...payload,
        });
      }

      setGeneratedCodes(codes);
      setShowPreview(true);
    } catch (error) {
      console.error("Error generating preview:", error);
      Notification("Error", t("Failed to generate preview"), "error");
    } finally {
      setIsGenerating(false);
      setSubmitting(false);
    }
  };

  // Generate unique code (8 characters alphanumeric)
  const generateUniqueCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Save all codes to database
  const handleSaveAll = async () => {
    setSubmitting(true);
    try {
      setIsGenerating(true);

      const response = await instance.post("/public/discount/bulk-generate", {
        codes: generatedCodes,
      });

      // Check if request was successful (status 200 or 201)
      if (response?.status === 200 || response?.status === 201) {
        const result = response?.data?.data;

        if (result?.failed > 0) {
          // Some codes failed to create
          Notification(
            "Warning",
            t("{{success}} codes created, {{failed}} failed", {
              success: result.success,
              failed: result.failed
            }),
            "warning"
          );
        } else {
          // All codes created successfully
          Notification(
            "Success",
            t("{{count}} discount codes created successfully", { count: result.success }),
            "success"
          );
        }
        navigate(`${appsRoot}/discount`);
      } else {
        throw new Error(response?.data?.message || "Failed to save codes");
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message ||
                          error?.response?.data?.error ||
                          error?.message ||
                          t("Failed to save discount codes");

      Notification(
        "Error",
        errorMessage,
        "error"
      );
    } finally {
      setIsGenerating(false);
      setSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      // CSV headers
      const headers = [
        "Code",
        "Name",
        "Type",
        "Value",
        "Duration",
        "Duration Months",
        "Location Rules",
        "Start Date",
        "End Date",
        "Max Occurrences",
        "Status",
      ];

      // CSV rows
      const rows = generatedCodes.map((code) => [
        code.discount_code,
        code.name,
        code.discount_type,
        code.discount_value,
        code.duration_type,
        code.duration_months || "",
        JSON.stringify(code.location_rules || []),
        code.start_date,
        code.end_date,
        code.max_occurrences,
        code.status,
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `discount-codes-${moment().format("YYYY-MM-DD-HHmmss")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Notification("Success", t("CSV exported successfully"), "success");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      Notification("Error", t("Failed to export CSV"), "error");
    }
  };

  // Back to form
  const handleBackToForm = () => {
    setShowPreview(false);
    setGeneratedCodes([]);
  };

  if (showPreview) {
    return (
      <div className="main-content bulk-generate-discount">
        <div className="preview-section">
          <div className="preview-header d-flex align-items-center justify-content-between mb-2">
            <div>
              <h3>{t("Preview Generated Codes")}</h3>
              <p className="text-muted">{t("{{count}} codes generated", { count: generatedCodes.length })}</p>
            </div>
            <Button color="secondary" outline onClick={handleBackToForm}>
              <ArrowLeft size={16} className="me-1" />
              {t("Back to Form")}
            </Button>
          </div>

          <Card>
            <CardBody>
              <div className="preview-actions d-flex flex-wrap gap-2">
                <Button color="primary" onClick={handleSaveAll} disabled={isGenerating}>
                  {isGenerating ? t("Saving...") : t("Save All Codes")}
                </Button>
                <Button color="success" outline onClick={handleExportCSV}>
                  {t("Export to CSV")}
                </Button>
              </div>

              <div className="preview-table-wrapper">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("#")}</th>
                        <th>{t("Code")}</th>
                        <th>{t("Name")}</th>
                        <th>{t("Type")}</th>
                        <th>{t("Value")}</th>
                        <th>{t("Duration")}</th>
                        <th>{t("Start Date")}</th>
                        <th>{t("End Date")}</th>
                        <th>{t("Max Uses")}</th>
                        <th>{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedCodes.map((code, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            <Badge className="badge-light-primary">{code.discount_code}</Badge>
                          </td>
                          <td>{code.name}</td>
                          <td className="text-capitalize">{code.discount_type}</td>
                          <td>
                            {code.discount_type === "percentage" ? `${code.discount_value}%` : code.discount_value}
                          </td>
                          <td>
                            {code.duration_type === "forever"
                              ? t("Forever")
                              : code.duration_type === "first_payment"
                              ? t("First Payment")
                              : `${code.duration_months} ${t("months")}`}
                          </td>
                          <td>{code.start_date}</td>
                          <td>{code.end_date}</td>
                          <td>{code.max_occurrences}</td>
                          <td>
                            <Badge className={code.status === "ACTIVE" ? "bg-success" : "bg-secondary"}>
                              {code.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 className="mb-0">{t("Bulk Generate Discount Codes")}</h3>
        <Button color="secondary" outline onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="me-1" />
          {t("Back to List")}
        </Button>
      </div>

      <Card>
        <CardBody>
          <Form onSubmit={handleSubmit(onGeneratePreview)}>
            <Row>
              {/* Quantity */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="quantity">
                  {t("Number of Codes")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="quantity"
                      type="number"
                      placeholder={t("Enter quantity")}
                      invalid={!!errors.quantity}
                    />
                  )}
                />
                {errors.quantity && <FormFeedback>{errors.quantity.message}</FormFeedback>}
              </Col>

              {/* Name Prefix */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="name_prefix">
                  {t("Name Prefix")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="name_prefix"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name_prefix"
                      placeholder={t("e.g., Summer Sale 2024")}
                      invalid={!!errors.name_prefix}
                    />
                  )}
                />
                {errors.name_prefix && <FormFeedback>{errors.name_prefix.message}</FormFeedback>}
              </Col>

              {/* Discount Type */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="discount_type">
                  {t("Discount Type")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="discount_type"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="discount_type" type="select" invalid={!!errors.discount_type}>
                      <option value="percentage">{t("Percentage")}</option>
                      <option value="fixed">{t("Fixed Amount")}</option>
                    </Input>
                  )}
                />
                {errors.discount_type && <FormFeedback>{errors.discount_type.message}</FormFeedback>}
              </Col>

              {/* Discount Value */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="discount_value">
                  {t("Discount Value")} {watchDiscountType === "percentage" ? "(%)" : ""}{" "}
                  <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="discount_value"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="discount_value"
                      type="number"
                      step="0.01"
                      placeholder={t("Enter value")}
                      invalid={!!errors.discount_value}
                    />
                  )}
                />
                {errors.discount_value && <FormFeedback>{errors.discount_value.message}</FormFeedback>}
              </Col>

              {/* Duration Type */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="duration_type">
                  {t("Duration Type")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="duration_type"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="duration_type" type="select" invalid={!!errors.duration_type}>
                      <option value="forever">{t("Forever")}</option>
                      <option value="first_payment">{t("First Payment Only")}</option>
                      <option value="limited_months">{t("Limited Months")}</option>
                    </Input>
                  )}
                />
                {errors.duration_type && <FormFeedback>{errors.duration_type.message}</FormFeedback>}
              </Col>

              {/* Duration Months (conditional) */}
              {watchDurationType === "limited_months" && (
                <Col md={6} className="mb-2">
                  <Label className="form-label" for="duration_months">
                    {t("Duration (Months)")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="duration_months"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="duration_months"
                        type="number"
                        placeholder={t("Enter months")}
                        invalid={!!errors.duration_months}
                      />
                    )}
                  />
                  {errors.duration_months && <FormFeedback>{errors.duration_months.message}</FormFeedback>}
                </Col>
              )}

              {/* Start Date */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="start_date">
                  {t("Start Date")} <span className="text-danger">*</span>
                </Label>
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
                {errors.start_date && <FormFeedback className="d-block">{errors.start_date.message}</FormFeedback>}
              </Col>

              {/* End Date */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="end_date">
                  {t("End Date")} <span className="text-danger">*</span>
                </Label>
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
                {errors.end_date && <FormFeedback className="d-block">{errors.end_date.message}</FormFeedback>}
              </Col>

              {/* Max Occurrences */}
              <Col md={6} className="mb-2">
                <Label className="form-label" for="max_occurrences">
                  {t("Max Uses per Code")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="max_occurrences"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="max_occurrences"
                      type="number"
                      placeholder={t("e.g., 100")}
                      invalid={!!errors.max_occurrences}
                    />
                  )}
                />
                {errors.max_occurrences && <FormFeedback>{errors.max_occurrences.message}</FormFeedback>}
              </Col>

              {/* Location Rules */}
              <Col md={12} className="mb-2">
                <Label className="form-label">
                  {t("Location Rules")} <span className="text-muted">({t("Optional")})</span>
                </Label>
                <div className="location-rules-section">
                  {locationRules.map((rule, index) => (
                    <div key={index} className="location-rule-row mb-2">
                      <Row>
                        <Col md={3}>
                          <Input
                            type="select"
                            value={rule.type}
                            onChange={(e) => updateLocationRule(index, "type", e.target.value)}
                          >
                            <option value="any">{t("Any")}</option>
                            <option value="exact">{t("Exactly")}</option>
                            <option value="minimum">{t("Minimum")}</option>
                            <option value="maximum">{t("Maximum")}</option>
                            <option value="range">{t("Range")}</option>
                          </Input>
                        </Col>
                        {rule.type === "exact" && (
                          <Col md={3}>
                            <Input
                              type="number"
                              placeholder={t("Value")}
                              value={rule.value || ""}
                              onChange={(e) => updateLocationRule(index, "value", parseInt(e.target.value))}
                            />
                          </Col>
                        )}
                        {rule.type === "minimum" && (
                          <Col md={3}>
                            <Input
                              type="number"
                              placeholder={t("Min Value")}
                              value={rule.value || ""}
                              onChange={(e) => updateLocationRule(index, "value", parseInt(e.target.value))}
                            />
                          </Col>
                        )}
                        {rule.type === "maximum" && (
                          <Col md={3}>
                            <Input
                              type="number"
                              placeholder={t("Max Value")}
                              value={rule.value || ""}
                              onChange={(e) => updateLocationRule(index, "value", parseInt(e.target.value))}
                            />
                          </Col>
                        )}
                        {rule.type === "range" && (
                          <>
                            <Col md={3}>
                              <Input
                                type="number"
                                placeholder={t("Min")}
                                value={rule.min || ""}
                                onChange={(e) => updateLocationRule(index, "min", parseInt(e.target.value))}
                              />
                            </Col>
                            <Col md={3}>
                              <Input
                                type="number"
                                placeholder={t("Max")}
                                value={rule.max || ""}
                                onChange={(e) => updateLocationRule(index, "max", parseInt(e.target.value))}
                              />
                            </Col>
                          </>
                        )}
                        <Col md={2}>
                          <Button color="danger" outline size="sm" onClick={() => removeLocationRule(index)}>
                            <X size={14} />
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  ))}
                  <Button color="secondary" outline size="sm" onClick={addLocationRule}>
                    <Plus size={14} className="me-1" />
                    {t("Add Location Rule")}
                  </Button>
                </div>
              </Col>

              {/* Status */}
              <Col md={12} className="mb-2">
                <div className="form-check form-switch">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field: { value, ...field } }) => (
                      <Input {...field} type="switch" id="status" checked={value} />
                    )}
                  />
                  <Label className="form-check-label" for="status">
                    {t("Active by Default")}
                  </Label>
                </div>
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-3">
              <Button color="primary" type="submit" disabled={isGenerating}>
                <Eye size={16} className="me-1" />
                {isGenerating ? t("Generating...") : t("Generate & Preview")}
              </Button>
              <Button color="secondary" outline onClick={() => navigate(-1)}>
                {t("Cancel")}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </div>
  );
};

export default BulkGenerateDiscount;
