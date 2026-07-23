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
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom
import Notification from "@components/toast/notification";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { ArrowLeft, Loader, Package, DollarSign, Truck } from "react-feather";

// ** Wizard scaffolding (shared with Customer / Lead / Quotation wizards)
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

// ** Constants
import { appsRoot } from "@constant/defaultValues";

const STEPS = [
  {
    key: "basic",
    label: "Basic Info",
    icon: Package,
    fields: ["name", "code", "category_id", "unit_of_measure", "status"],
  },
  {
    key: "pricing",
    label: "Pricing & Tax",
    icon: DollarSign,
    fields: [
      "hsn_code",
      "part_no",
      "tax_pct",
      "selling_price",
      "margin_pct",
      "currency_id",
    ],
  },
  {
    key: "logistics",
    label: "Logistics",
    icon: Truck,
    fields: [
      "pack_size",
      "country_of_origin",
      "net_weight_per_unit",
      "gross_weight_per_unit",
    ],
  },
];
import { initProductItem } from "@constant/reduxConstant";
import { STATUS_OPTIONS } from "@constant/options";
// Units come from the UOM master via the API — the hardcoded list is gone.
import { useUomOptions } from "@src/views/_shared/uom/useUomOptions";
// Country of Origin comes from the country master via the API — no static list.
import { useCountryOptions } from "@src/views/_shared/geo/useGeoOptions";

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
  const isEditMode = !!id;
  const mySwal = withReactContent(Swal);
  const [applyingHsn, setApplyingHsn] = useState(false);

  // The product stores the country NAME ("India"), and the invoice/PDF print it
  // verbatim — so ask for name-valued options. No state/city cascade here:
  // country of origin is a customs field, not an address.
  const countryOptions = useCountryOptions("name");
  const uomOptions = useUomOptions();
  const required = <span className="text-danger">*</span>;

  const schema = useMemo(
    () =>
      yup.object().shape({
        // Code is auto-generated (PRD-0001) — optional/read-only in the form.
        code: yup
          .string()
          .trim()
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
        unit_of_measure: yup
          .string()
          .trim()
          .required(t("Unit of Measure is required")),
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
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initProductItem,
  });

  // Apply the current HSN code to every existing document (leads, quotations,
  // sales orders, vendor POs, GRNs, debit notes, invoices) that uses this
  // product. Overwrites per-line HSN across ALL statuses — hence the confirm.
  const handleApplyHsn = async () => {
    const hsn = (watch("hsn_code") || "").trim();
    const confirm = await mySwal.fire({
      title: t("Apply HSN to all documents?"),
      html: hsn
        ? t(
            "HSN <b>{{hsn}}</b> will be written onto every document that uses this product — leads, quotations, sales orders, vendor POs, GRNs, debit notes and invoices — across all statuses. This overwrites any HSN edited on those lines and cannot be undone.",
            { hsn }
          )
        : t(
            "The HSN on every document that uses this product will be <b>cleared</b> — leads, quotations, sales orders, vendor POs, GRNs, debit notes and invoices — across all statuses. This cannot be undone."
          ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, apply to all"),
      cancelButtonText: t("Cancel"),
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-outline-danger ms-1",
      },
      buttonsStyling: false,
    });
    if (!confirm.isConfirmed) return;

    setApplyingHsn(true);
    try {
      const res = await instance.post(
        `${API_ENDPOINTS.products.applyHsn}/${id}`,
        { hsn_code: hsn }
      );
      const data = res?.data?.data || res?.data || {};
      const rows = (data.updated || [])
        .map((u) => `${u.count} ${u.label}`)
        .join(", ");
      await mySwal.fire({
        title: t("Done"),
        html: data.total
          ? t("Updated {{total}} line(s): {{rows}}", {
              total: data.total,
              rows,
            })
          : t("No existing documents use this product yet."),
        icon: "success",
        confirmButtonText: t("OK"),
        customClass: { confirmButton: "btn btn-primary" },
        buttonsStyling: false,
      });
    } catch {
      Notification("Error", t("Failed to apply HSN to documents"), "warning");
    } finally {
      setApplyingHsn(false);
    }
  };

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


  // ── Live SKU uniqueness check (onBlur) ──
  const [codeExists, setCodeExists] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);

  // ── Live name uniqueness check (onBlur) ──
  const [nameExists, setNameExists] = useState(false);
  const [nameChecking, setNameChecking] = useState(false);

  const handleNameBlur = async (e) => {
    const name = (e.target.value || "").trim();
    if (!name) {
      setNameExists(false);
      return;
    }
    // In edit mode, skip if name is unchanged
    if (
      isEditMode &&
      store?.productItem?.name &&
      name.toLowerCase() === store.productItem.name.trim().toLowerCase()
    ) {
      setNameExists(false);
      return;
    }
    setNameChecking(true);
    setNameExists(false);
    try {
      const res = await instance.post(API_ENDPOINTS.products.checkName, {
        name,
        productId: isEditMode ? id : undefined,
      });
      setNameExists(!!res?.data?.data?.exists);
    } catch (err) {
      setNameExists(false);
    } finally {
      setNameChecking(false);
    }
  };

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
        status: p.status || (p.is_active ? "active" : "inactive"),
        is_active: p.is_active,
      });
      // Mark every step as visited so the user can click any of them.
      setVisited(new Set(STEPS.map((_, i) => i)));
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

  // Default the Currency field once the dropdown loads (create AND edit). A
  // saved value always wins via the watch() guard; only a blank field gets a
  // default. Re-runs after the edit prefill (productItem._id dep) so an edited
  // product with no saved currency still falls back. Order: flagged default →
  // INR by code (company base currency) → first item, so it's never blank.
  useEffect(() => {
    const list = currencyStore?.currencyDropdown || [];
    if (!list.length) return;
    if (isEditMode && !store?.productItem?._id) return; // wait for prefill
    if (watch("currency_id")) return;
    const def =
      list.find((c) => c.is_default) ||
      list.find((c) => (c.code || "").toUpperCase() === "INR") ||
      list[0];
    if (def?._id) setValue("currency_id", def._id, { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyStore?.currencyDropdown, isEditMode, store?.productItem?._id]);

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
    () =>
      uomOptions.find((o) => o.value === watch("unit_of_measure")) ||
      // A unit saved before it was removed from the master must still render,
      // not silently blank out and re-save as empty.
      (watch("unit_of_measure")
        ? { value: watch("unit_of_measure"), label: watch("unit_of_measure") }
        : null),
    [uomOptions, watch("unit_of_measure")]
  );

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
    // On edit, a cleared optional field must be sent as null so the backend
    // overwrites the stored value with NULL. On create, undefined lets the
    // backend apply its defaults. (`undefined` is dropped from the JSON body,
    // which is why clearing a field used to keep the old value on update.)
    const emptyVal = isEditMode ? null : undefined;
    const strOrEmpty = (v) => (v?.trim() ? v.trim() : emptyVal);
    const numOrEmpty = (v) =>
      v === "" || v === null || v === undefined ? emptyVal : Number(v);
    const payload = {
      // Omit on create → backend auto-generates (PRD-0001). On edit the
      // existing code is preserved (the field is read-only).
      code: data.code?.trim() ? data.code.trim().toUpperCase() : undefined,
      name: data.name.trim(),
      category_id: data.category_id || undefined,
      description: strOrEmpty(data.description),
      specifications: strOrEmpty(data.specifications),
      packaging_details: strOrEmpty(data.packaging_details),
      quality_parameters: strOrEmpty(data.quality_parameters),
      hsn_code: strOrEmpty(data.hsn_code),
      // Blank → 0 (not undefined) so clearing the field actually removes
      // GST on save; undefined would tell the backend to keep the old value.
      tax_pct:
        data.tax_pct === "" || data.tax_pct == null
          ? 0
          : Number(data.tax_pct),
      unit_of_measure: data.unit_of_measure || undefined,
      selling_price: numOrEmpty(data.selling_price),
      margin_pct: numOrEmpty(data.margin_pct),
      currency_id: data.currency_id || emptyVal,
      part_no: strOrEmpty(data.part_no),
      pack_size: numOrEmpty(data.pack_size),
      net_weight_per_unit: numOrEmpty(data.net_weight_per_unit),
      gross_weight_per_unit: numOrEmpty(data.gross_weight_per_unit),
      country_of_origin: strOrEmpty(data.country_of_origin),
      // Rebates/expenses are no longer captured at product level — they're set
      // at quotation time. Omit them from the payload so the backend's update
      // (which only replaces links when the key is present) preserves any
      // existing links instead of wiping them.
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
      <div className="main-content products quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Product") : t("Add Product")}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

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
                        invalid={!!errors.name || nameExists}
                        {...field}
                        onChange={(e) => {
                          if (nameExists) setNameExists(false);
                          field.onChange(e);
                        }}
                        onBlur={(e) => {
                          field.onBlur(e);
                          handleNameBlur(e);
                        }}
                      />
                    )}
                  />
                  {errors.name && (
                    <FormFeedback className="d-block">
                      {errors.name.message}
                    </FormFeedback>
                  )}
                  {!errors.name && nameChecking && (
                    <small className="text-muted">
                      {t("Checking name availability…")}
                    </small>
                  )}
                  {!errors.name && nameExists && (
                    <FormFeedback className="d-block">
                      {t("A product with this name already exists.")}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label" for="code">
                    {t("Code / SKU")}
                  </Label>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="code"
                        disabled
                        placeholder={t("Auto-generated (e.g. PRD-0001)")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("Generated automatically on save.")}
                  </small>
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
                    {t("Unit of Measure")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="unit_of_measure"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="unit_of_measure"
                        isClearable
                        classNamePrefix="select"
                        options={uomOptions}
                        value={selectedUom}
                        placeholder={t("Select unit")}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                      />
                    )}
                  />
                  {errors.unit_of_measure && (
                    <FormFeedback className="d-block">
                      {errors.unit_of_measure.message}
                    </FormFeedback>
                  )}
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

                </Fragment>
              )}

              {activeStep === 1 && (
                <Fragment>
              {/* ── Pricing ── */}
              <h4 className="mt-1 mb-2">{t("Pricing")}</h4>
              <Row>
                <Col md="4" className="mb-2">
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
                  {isEditMode && (
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 mt-50"
                      onClick={handleApplyHsn}
                      disabled={applyingHsn}
                    >
                      {applyingHsn
                        ? t("Applying…")
                        : t("Apply HSN to all documents")}
                    </Button>
                  )}
                </Col>
                <Col md="4" className="mb-2">
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
                  <Label className="form-label" for="part_no">
                    {t("Part No / OEM No")}
                  </Label>
                  <Controller
                    name="part_no"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="part_no"
                        placeholder={t("Optional")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
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
                        inputMode="decimal"
                        invalid={!!errors.selling_price}
                        {...field}
                        value={field.value ?? ""}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== "" && !Number.isNaN(Number(val))) {
                            field.onChange(Number(val).toFixed(2));
                          }
                          field.onBlur();
                        }}
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

                </Fragment>
              )}

              {activeStep === 2 && (
                <Fragment>
              {/* ── Identification (extra) + Logistics ── */}
              <h4 className="mt-1 mb-2">{t("Logistics")}</h4>
              <Row>
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
                  <small className="text-muted d-block mt-25">
                    {t(
                      "Units per standard pack/box/carton. Used to auto-fill Packages on quotation, PFI and PO line items (Packages = Qty ÷ Pack Size, rounded up).",
                    )}
                  </small>
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
                        options={countryOptions}
                        value={
                          countryOptions.find(
                            (o) => o.value === field.value
                          ) ||
                          // A value the master has never heard of — saved before
                          // this switched to the API, or a country since
                          // deactivated — must still render, not blank out.
                          (field.value
                            ? { value: field.value, label: field.value }
                            : null)
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
                <Col md="3" className="mb-2">
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
                submitting={
                  isSubmitting ||
                  codeChecking ||
                  codeExists ||
                  nameChecking ||
                  nameExists
                }
              />
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ProductForm;
