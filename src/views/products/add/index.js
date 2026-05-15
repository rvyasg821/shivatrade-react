// ** React Imports
import { Fragment, useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getProduct,
  createProduct,
  updateProduct,
  cleanProductMessage,
  cleanProductState,
} from "../store";
import { getCategoryDropdown } from "@src/views/categories/store";
import { getCurrencyDropdown } from "@src/views/currencies/store";
import { getRebateDropdown } from "@src/views/rebates/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Axios + Endpoints
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

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
import { useForm, Controller, useFieldArray } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom
import Notification from "@components/toast/notification";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft, Loader, Plus, Trash2 } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initProductItem } from "@constant/reduxConstant";
import {
  STATUS_OPTIONS,
  PRODUCT_UOM_OPTIONS,
  COUNTRY_OPTIONS,
  REBATE_EXPENSE_TYPE_OPTIONS,
} from "@constant/options";

const ProductForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get("category_id") || "";

  const store = useSelector((state) => state.product);
  const categoryStore = useSelector((state) => state.category);
  const currencyStore = useSelector((state) => state.currency);
  const rebateStore = useSelector((state) => state.rebate);
  const expenseStore = useSelector((state) => state.expense);
  const isEditMode = !!id;
  const required = <span className="text-danger">*</span>;

  const schema = useMemo(
    () =>
      yup.object().shape({
        code: yup
          .string()
          .trim()
          .required(t("Code / SKU is required"))
          .max(50, t("Code must be at most 50 characters")),
        name: yup
          .string()
          .trim()
          .required(t("Name is required"))
          .min(2, t("Name must be at least 2 characters"))
          .max(200, t("Name must be at most 200 characters")),
        category_id: yup.string().required(t("Category is required")),
        description: yup.string().trim().nullable().notRequired(),
        specifications: yup.string().trim().nullable().notRequired(),
        packaging_details: yup.string().trim().nullable().notRequired(),
        quality_parameters: yup.string().trim().nullable().notRequired(),
        hsn_code: yup
          .string()
          .trim()
          .nullable()
          .notRequired()
          .max(50, t("HSN code must be at most 50 characters")),
        tax_pct: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0, t("Must be ≥ 0"))
          .max(100, t("Must be ≤ 100"))
          .test(
            "max-2-decimals",
            t("Up to 2 decimal places only"),
            (v) => v === undefined || /^\d+(\.\d{1,2})?$/.test(String(v))
          )
          .nullable()
          .notRequired(),
        unit_of_measure: yup.string().nullable().notRequired(),
        // Pricing
        selling_price: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0, t("Must be ≥ 0"))
          .test(
            "max-2-decimals",
            t("Up to 2 decimal places only"),
            (v) => v === undefined || /^\d+(\.\d{1,2})?$/.test(String(v))
          )
          .nullable()
          .notRequired(),
        margin_pct: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0, t("Must be ≥ 0"))
          .max(100, t("Must be ≤ 100"))
          .test(
            "max-2-decimals",
            t("Up to 2 decimal places only"),
            (v) => v === undefined || /^\d+(\.\d{1,2})?$/.test(String(v))
          )
          .nullable()
          .notRequired(),
        currency_id: yup
          .string()
          .nullable()
          .when("selling_price", {
            is: (v) => v !== undefined && v !== null && Number(v) > 0,
            then: (s) => s.required(t("Currency is required when price is set")),
            otherwise: (s) => s.notRequired(),
          }),
        // Identification
        part_no: yup.string().trim().nullable().notRequired().max(100),
        // Logistics
        pack_size: yup
          .number()
          .integer()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be an integer"))
          .min(1)
          .nullable()
          .notRequired(),
        net_weight_per_unit: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0)
          .nullable()
          .notRequired(),
        gross_weight_per_unit: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0)
          .nullable()
          .notRequired()
          .test(
            "gross-ge-net",
            t("Gross weight must be ≥ net weight"),
            function (v) {
              const net = this.parent.net_weight_per_unit;
              if (v == null || net == null) return true;
              return Number(v) >= Number(net);
            }
          ),
        country_of_origin: yup.string().trim().nullable().notRequired().max(100),
        status: yup
          .string()
          .oneOf(["active", "inactive"])
          .required(t("Status is required")),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initProductItem,
  });

  const rebatesField = useFieldArray({ control, name: "rebates", keyName: "_key" });
  const expensesField = useFieldArray({ control, name: "expenses", keyName: "_key" });

  // ── Live SKU uniqueness check (onBlur) ──
  const [codeExists, setCodeExists] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);

  const handleCodeBlur = async (e) => {
    const code = (e.target.value || "").trim().toUpperCase();
    if (!code) {
      setCodeExists(false);
      return;
    }
    // In edit mode, skip if code is unchanged
    if (
      isEditMode &&
      store?.productItem?.code &&
      code === store.productItem.code.toUpperCase()
    ) {
      setCodeExists(false);
      return;
    }
    setCodeChecking(true);
    setCodeExists(false);
    try {
      const res = await instance.post(API_ENDPOINTS.products.checkCode, {
        code,
        productId: isEditMode ? id : undefined,
      });
      setCodeExists(!!res?.data?.data?.exists);
    } catch (err) {
      setCodeExists(false);
    } finally {
      setCodeChecking(false);
    }
  };

  useLayoutEffect(() => {
    dispatch(getCategoryDropdown());
    dispatch(getCurrencyDropdown());
    dispatch(getRebateDropdown());
    dispatch(getExpenseDropdown());
    if (isEditMode) {
      dispatch(getProduct(id));
    } else {
      // Clear stale productItem in redux so a previously edited product
      // (with rebates/expenses arrays) doesn't bleed into the Add form.
      dispatch(cleanProductState());
      reset(initProductItem);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode && store?.productItem && store.productItem._id) {
      const p = store.productItem;
      reset({
        _id: p._id,
        code: p.code || "",
        name: p.name || "",
        category_id: p.category_id || "",
        description: p.description || "",
        specifications: p.specifications || "",
        packaging_details: p.packaging_details || "",
        quality_parameters: p.quality_parameters || "",
        hsn_code: p.hsn_code || "",
        tax_pct: p.tax_pct ?? "",
        unit_of_measure: p.unit_of_measure || "",
        selling_price: p.selling_price ?? "",
        margin_pct: p.margin_pct ?? "",
        currency_id: p.currency_id || "",
        part_no: p.part_no || "",
        pack_size: p.pack_size ?? "",
        net_weight_per_unit: p.net_weight_per_unit ?? "",
        gross_weight_per_unit: p.gross_weight_per_unit ?? "",
        country_of_origin: p.country_of_origin || "",
        rebates: (p.rebates || []).map((r) => ({
          rebate_id: r.rebate_id,
          // Backend returns the effective type and pct (override or master).
          type: r.type ?? "percent",
          pct: r.pct ?? "",
        })),
        expenses: (p.expenses || []).map((e) => ({
          expense_id: e.expense_id,
          type: e.type ?? "fixed",
          value: e.value ?? "",
        })),
        status: p.status || (p.is_active ? "active" : "inactive"),
        is_active: p.is_active,
      });
    }
  }, [store?.productItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "PROD_CRTD" || store?.actionFlag === "PROD_UPDT") {
      dispatch(cleanProductMessage(null));
      navigate(`${appsRoot}/products`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  // On create, default the Currency field to the company's default currency
  // once the dropdown finishes loading. Skip on edit - saved value wins.
  useEffect(() => {
    if (isEditMode) return;
    const list = currencyStore?.currencyDropdown || [];
    if (!list.length) return;
    if (watch("currency_id")) return;
    const def = list.find((c) => c.is_default);
    if (def?._id) setValue("currency_id", def._id, { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyStore?.currencyDropdown, isEditMode]);

  // On create, pre-select the category when arriving with ?category_id=<id>
  // (e.g. clicked "+ Add Product" from a category detail / listing).
  useEffect(() => {
    if (isEditMode) return;
    if (!urlCategoryId) return;
    if (watch("category_id")) return;
    setValue("category_id", urlCategoryId, { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategoryId, isEditMode]);

  const categoryOptions = useMemo(
    () =>
      (categoryStore?.categoryDropdown || []).map((c) => ({
        value: c._id,
        label: c.name,
      })),
    [categoryStore?.categoryDropdown]
  );

  const selectedCategory = useMemo(
    () => categoryOptions.find((o) => o.value === watch("category_id")) || null,
    [categoryOptions, watch("category_id")]
  );

  const selectedUom = useMemo(
    () => PRODUCT_UOM_OPTIONS.find((o) => o.value === watch("unit_of_measure")) || null,
    [watch("unit_of_measure")]
  );

  const onSubmit = (data) => {
    const numOrUndef = (v) =>
      v === "" || v === null || v === undefined ? undefined : Number(v);
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);
    const payload = {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      category_id: data.category_id || undefined,
      description: data.description?.trim() || undefined,
      specifications: data.specifications?.trim() || undefined,
      packaging_details: data.packaging_details?.trim() || undefined,
      quality_parameters: data.quality_parameters?.trim() || undefined,
      hsn_code: data.hsn_code?.trim() || undefined,
      tax_pct: numOrUndef(data.tax_pct),
      unit_of_measure: data.unit_of_measure || undefined,
      selling_price: numOrUndef(data.selling_price),
      margin_pct: numOrUndef(data.margin_pct),
      currency_id: data.currency_id || undefined,
      part_no: data.part_no?.trim() || undefined,
      pack_size: numOrUndef(data.pack_size),
      net_weight_per_unit: numOrUndef(data.net_weight_per_unit),
      gross_weight_per_unit: numOrUndef(data.gross_weight_per_unit),
      country_of_origin: data.country_of_origin?.trim() || undefined,
      rebates: (data.rebates || [])
        .filter((r) => isUuid(r.rebate_id))
        .map((r) => ({
          rebate_id: r.rebate_id,
          type: r.type || undefined,
          pct: numOrUndef(r.pct),
        })),
      expenses: (data.expenses || [])
        .filter((e) => isUuid(e.expense_id))
        .map((e) => ({
          expense_id: e.expense_id,
          type: e.type || undefined,
          value: numOrUndef(e.value),
        })),
      status: data.status,
      is_active: data.status === "active",
    };

    if (isEditMode) {
      dispatch(updateProduct({ id, data: payload }));
    } else {
      dispatch(createProduct(payload));
    }
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content products">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Product") : t("Add Product")}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/products`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="name">
                    {t("Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="name"
                        placeholder={t("Product name")}
                        invalid={!!errors.name}
                        {...field}
                      />
                    )}
                  />
                  {errors.name && (
                    <FormFeedback className="d-block">
                      {errors.name.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label" for="code">
                    {t("Code / SKU")} <span className="text-danger">*</span>
                    {codeChecking && (
                      <Loader
                        size={14}
                        className="ms-1 spinner-border-sm text-muted"
                      />
                    )}
                  </Label>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="code"
                        placeholder={t("e.g. WIDGET-001")}
                        invalid={!!errors.code || codeExists}
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleCodeBlur(e);
                        }}
                      />
                    )}
                  />
                  {errors.code && (
                    <FormFeedback className="d-block">
                      {errors.code.message}
                    </FormFeedback>
                  )}
                  {!errors.code && codeExists && (
                    <FormFeedback className="d-block">
                      {t("This Code / SKU is already in use")}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label" for="category_id">
                    {t("Category")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="category_id"
                        isClearable
                        classNamePrefix="select"
                        options={categoryOptions}
                        value={selectedCategory}
                        placeholder={t("Select category")}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                      />
                    )}
                  />
                  {errors.category_id && (
                    <FormFeedback className="d-block">
                      {errors.category_id.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label" for="unit_of_measure">
                    {t("Unit of Measure")}
                  </Label>
                  <Controller
                    name="unit_of_measure"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="unit_of_measure"
                        isClearable
                        classNamePrefix="select"
                        options={PRODUCT_UOM_OPTIONS}
                        value={selectedUom}
                        placeholder={t("Select unit")}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                      />
                    )}
                  />
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label d-block">
                    {t("Status")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="d-flex align-items-center gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <div className="form-check form-check-inline" key={opt.value}>
                            <Input
                              type="radio"
                              id={`status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label
                              className="form-check-label"
                              for={`status-${opt.value}`}
                            >
                              {t(opt.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  {errors.status && (
                    <FormFeedback className="d-block">
                      {errors.status.message}
                    </FormFeedback>
                  )}
                </Col>
              </Row>

              {/* ── Pricing ── */}
              <h4 className="mt-3 mb-2">{t("Pricing")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="hsn_code">
                    {t("HSN Code")}
                  </Label>
                  <Controller
                    name="hsn_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="hsn_code"
                        placeholder={t("Optional")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="tax_pct">
                    {t("GST %")}
                  </Label>
                  <Controller
                    name="tax_pct"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="tax_pct"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                        invalid={!!errors.tax_pct}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  {errors.tax_pct && (
                    <FormFeedback className="d-block">
                      {errors.tax_pct.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label" for="selling_price">
                    {t("Selling Price")}
                  </Label>
                  <Controller
                    name="selling_price"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        min="0"
                        invalid={!!errors.selling_price}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  {errors.selling_price && (
                    <FormFeedback className="d-block">
                      {errors.selling_price.message}
                    </FormFeedback>
                  )}
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="margin_pct">
                    {t("Margin %")}
                  </Label>
                  <Controller
                    name="margin_pct"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="margin_pct"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        invalid={!!errors.margin_pct}
                        placeholder="e.g. 15"
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  {errors.margin_pct && (
                    <FormFeedback className="d-block">
                      {errors.margin_pct.message}
                    </FormFeedback>
                  )}
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="currency_id">
                    {t("Currency")}
                    {Number(watch("selling_price")) > 0 ? <> {required}</> : null}
                  </Label>
                  <Controller
                    name="currency_id"
                    control={control}
                    render={({ field }) => {
                      const opts = (currencyStore?.currencyDropdown || []).map(
                        (c) => ({ value: c._id, label: `${c.code} - ${c.name}` })
                      );
                      return (
                        <Select
                          inputId="currency_id"
                          isClearable
                          classNamePrefix="select"
                          options={opts}
                          value={opts.find((o) => o.value === field.value) || null}
                          placeholder={t("Select currency")}
                          onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        />
                      );
                    }}
                  />
                  {errors.currency_id && (
                    <FormFeedback className="d-block">
                      {errors.currency_id.message}
                    </FormFeedback>
                  )}
                </Col>
              </Row>

              {/* ── Identification (extra) + Logistics ── */}
              <h4 className="mt-3 mb-2">{t("Logistics")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="part_no">
                    {t("Part No / OEM No")}
                  </Label>
                  <Controller
                    name="part_no"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="part_no"
                        placeholder={t("e.g. F002A0Z234")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="pack_size">
                    {t("Pack Size")}
                  </Label>
                  <Controller
                    name="pack_size"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="pack_size"
                        type="number"
                        min="1"
                        invalid={!!errors.pack_size}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  {errors.pack_size && (
                    <FormFeedback className="d-block">
                      {errors.pack_size.message}
                    </FormFeedback>
                  )}
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="country_of_origin">
                    {t("Country of Origin")}
                  </Label>
                  <Controller
                    name="country_of_origin"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="country_of_origin"
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
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="net_weight_per_unit">
                    {t("Net Weight per Unit (Kg)")}
                  </Label>
                  <Controller
                    name="net_weight_per_unit"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="net_weight_per_unit"
                        type="number"
                        step="0.001"
                        min="0"
                        invalid={!!errors.net_weight_per_unit}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  {errors.net_weight_per_unit && (
                    <FormFeedback className="d-block">
                      {errors.net_weight_per_unit.message}
                    </FormFeedback>
                  )}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="gross_weight_per_unit">
                    {t("Gross Weight per Unit (Kg)")}
                  </Label>
                  <Controller
                    name="gross_weight_per_unit"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="gross_weight_per_unit"
                        type="number"
                        step="0.001"
                        min="0"
                        invalid={!!errors.gross_weight_per_unit}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                  {errors.gross_weight_per_unit && (
                    <FormFeedback className="d-block">
                      {errors.gross_weight_per_unit.message}
                    </FormFeedback>
                  )}
                </Col>
              </Row>

              <Row>
                <Col md="12" className="mb-2">
                  <Label className="form-label" for="description">
                    {t("Description")}
                  </Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="description"
                        type="textarea"
                        rows="2"
                        placeholder={t("Optional description")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="12" className="mb-2">
                  <Label className="form-label" for="specifications">
                    {t("Specifications")}
                  </Label>
                  <Controller
                    name="specifications"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="specifications"
                        type="textarea"
                        rows="3"
                        placeholder={t(
                          "e.g. Weight: 50kg, Grade: A, Material: Stainless Steel 304"
                        )}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="12" className="mb-2">
                  <Label className="form-label" for="packaging_details">
                    {t("Packaging Details")}
                  </Label>
                  <Controller
                    name="packaging_details"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="packaging_details"
                        type="textarea"
                        rows="3"
                        placeholder={t(
                          "e.g. 25 kg PP bags, 40 bags per pallet, 20 pallets per 20ft container"
                        )}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="12" className="mb-2">
                  <Label className="form-label" for="quality_parameters">
                    {t("Quality Parameters")}
                  </Label>
                  <Controller
                    name="quality_parameters"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="quality_parameters"
                        type="textarea"
                        rows="3"
                        placeholder={t(
                          "e.g. Moisture ≤ 14%, Impurity ≤ 2%, As per ISO 9001"
                        )}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>
              </Row>

              {/* ── Applicable Rebates ── */}
              <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                <h4 className="mb-0">{t("Rebates")}</h4>
                <Button
                  type="button"
                  size="sm"
                  color="primary"
                  outline
                  onClick={() =>
                    rebatesField.append({
                      rebate_id: "",
                      type: "percent",
                      pct: "",
                    })
                  }
                >
                  <Plus size={14} /> {t("Add Rebate")}
                </Button>
              </div>
              {rebatesField.fields.length === 0 && (
                <small className="text-muted d-block mb-2">
                  {t("No rebates linked. Add DBK / RODTEP if this product is export-eligible.")}
                </small>
              )}
              {rebatesField.fields.map((row, idx) => {
                const opts = (rebateStore?.rebateDropdown || []).map((r) => ({
                  value: r._id,
                  label: `${r.code} - ${r.name} (${r.pct}${
                    r.type === "fixed" ? "" : "%"
                  })`,
                  pct: r.pct,
                  type: r.type || "percent",
                }));
                const selectedRebate = opts.find(
                  (o) => o.value === watch(`rebates.${idx}.rebate_id`)
                );
                const currentType = watch(`rebates.${idx}.type`) || "percent";
                return (
                  <Row key={row._key} className="align-items-end">
                    <Col md="5" className="mb-2">
                      <Label className="form-label">{t("Rebate")}</Label>
                      <Controller
                        name={`rebates.${idx}.rebate_id`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            isClearable
                            classNamePrefix="select"
                            options={opts}
                            value={opts.find((o) => o.value === field.value) || null}
                            onChange={(opt) => {
                              field.onChange(opt ? opt.value : "");
                              setValue(
                                `rebates.${idx}.type`,
                                opt ? opt.type : "percent",
                                { shouldValidate: true }
                              );
                              setValue(
                                `rebates.${idx}.pct`,
                                opt ? opt.pct : "",
                                { shouldValidate: true }
                              );
                            }}
                            placeholder={t("Select rebate")}
                          />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2">
                      <Label className="form-label">{t("Type")}</Label>
                      <Controller
                        name={`rebates.${idx}.type`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            classNamePrefix="select"
                            options={REBATE_EXPENSE_TYPE_OPTIONS}
                            value={
                              REBATE_EXPENSE_TYPE_OPTIONS.find(
                                (o) => o.value === field.value
                              ) || null
                            }
                            onChange={(opt) =>
                              field.onChange(opt ? opt.value : "percent")
                            }
                          />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2">
                      <Label className="form-label">
                        {currentType === "fixed" ? t("Amount") : t("Percentage")}
                      </Label>
                      <Controller
                        name={`rebates.${idx}.pct`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={
                              selectedRebate
                                ? `Default ${selectedRebate.pct}${
                                    selectedRebate.type === "fixed" ? "" : "%"
                                  }`
                                : ""
                            }
                            {...field}
                            value={field.value ?? ""}
                          />
                        )}
                      />
                    </Col>
                    <Col md="1" className="mb-2 text-end">
                      <Button
                        type="button"
                        color="danger"
                        size="sm"
                        outline
                        onClick={() => rebatesField.remove(idx)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </Col>
                  </Row>
                );
              })}

              {/* ── Default Expenses ── */}
              <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                <h4 className="mb-0">{t("Expenses")}</h4>
                <Button
                  type="button"
                  size="sm"
                  color="primary"
                  outline
                  onClick={() =>
                    expensesField.append({
                      expense_id: "",
                      type: "fixed",
                      value: "",
                    })
                  }
                >
                  <Plus size={14} /> {t("Add Expense")}
                </Button>
              </div>
              {expensesField.fields.length === 0 && (
                <small className="text-muted d-block mb-2">
                  {t("No default expenses. Add Packing / Transport / CHA if they always apply to this product.")}
                </small>
              )}
              {expensesField.fields.map((row, idx) => {
                const opts = (expenseStore?.expenseDropdown || []).map((e) => ({
                  value: e._id,
                  label: `${e.code} - ${e.name} (${e.value}${
                    e.type === "percent" ? "%" : ""
                  })`,
                  type: e.type || "fixed",
                  master_value: e.value,
                }));
                const selectedExpense = opts.find(
                  (o) => o.value === watch(`expenses.${idx}.expense_id`)
                );
                const currentType = watch(`expenses.${idx}.type`) || "fixed";
                return (
                  <Row key={row._key} className="align-items-end">
                    <Col md="5" className="mb-2">
                      <Label className="form-label">{t("Expense")}</Label>
                      <Controller
                        name={`expenses.${idx}.expense_id`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            isClearable
                            classNamePrefix="select"
                            options={opts}
                            value={opts.find((o) => o.value === field.value) || null}
                            onChange={(opt) => {
                              field.onChange(opt ? opt.value : "");
                              setValue(
                                `expenses.${idx}.type`,
                                opt ? opt.type : "fixed",
                                { shouldValidate: true }
                              );
                              setValue(
                                `expenses.${idx}.value`,
                                opt ? opt.master_value : "",
                                { shouldValidate: true }
                              );
                            }}
                            placeholder={t("Select expense")}
                          />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2">
                      <Label className="form-label">{t("Type")}</Label>
                      <Controller
                        name={`expenses.${idx}.type`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            classNamePrefix="select"
                            options={REBATE_EXPENSE_TYPE_OPTIONS}
                            value={
                              REBATE_EXPENSE_TYPE_OPTIONS.find(
                                (o) => o.value === field.value
                              ) || null
                            }
                            onChange={(opt) =>
                              field.onChange(opt ? opt.value : "fixed")
                            }
                          />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2">
                      <Label className="form-label">
                        {currentType === "percent" ? t("Percentage") : t("Amount")}
                      </Label>
                      <Controller
                        name={`expenses.${idx}.value`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={
                              selectedExpense
                                ? `Default ${selectedExpense.master_value}${
                                    selectedExpense.type === "percent" ? "%" : ""
                                  }`
                                : ""
                            }
                            {...field}
                            value={field.value ?? ""}
                          />
                        )}
                      />
                    </Col>
                    <Col md="1" className="mb-2 text-end">
                      <Button
                        type="button"
                        color="danger"
                        size="sm"
                        outline
                        onClick={() => expensesField.remove(idx)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </Col>
                  </Row>
                );
              })}

              <div className="d-flex justify-content-end mt-3">
                <Button
                  type="button"
                  color="secondary"
                  outline
                  className="me-1"
                  onClick={() => navigate(`${appsRoot}/products`)}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting || codeChecking || codeExists}
                >
                  {isEditMode ? t("Update") : t("Create")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ProductForm;
