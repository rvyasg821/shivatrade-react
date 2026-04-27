// ** React Imports
import { Fragment, useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getProduct,
  createProduct,
  updateProduct,
  cleanProductMessage,
} from "../store";
import { getCategoryDropdown } from "@src/views/categories/store";
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

// ** Icons
import { ArrowLeft, Loader } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initProductItem } from "@constant/reduxConstant";
import { STATUS_OPTIONS, PRODUCT_UOM_OPTIONS } from "@constant/options";

const ProductForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.product);
  const categoryStore = useSelector((state) => state.category);
  const isEditMode = !!id;

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
        unit_of_measure: yup.string().nullable().notRequired(),
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
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initProductItem,
  });

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
    if (isEditMode) {
      dispatch(getProduct(id));
    } else {
      reset(initProductItem);
    }
  }, [id]);

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
        unit_of_measure: p.unit_of_measure || "",
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
    const payload = {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      category_id: data.category_id || undefined,
      description: data.description?.trim() || undefined,
      specifications: data.specifications?.trim() || undefined,
      packaging_details: data.packaging_details?.trim() || undefined,
      quality_parameters: data.quality_parameters?.trim() || undefined,
      hsn_code: data.hsn_code?.trim() || undefined,
      unit_of_measure: data.unit_of_measure || undefined,
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
                  <Label className="form-label" for="hsn_code">
                    {t("HSN Code")}
                  </Label>
                  <Controller
                    name="hsn_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="hsn_code"
                        placeholder={t("Optional, for GST")}
                        {...field}
                        value={field.value || ""}
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

              <div className="d-flex justify-content-end mt-2">
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
