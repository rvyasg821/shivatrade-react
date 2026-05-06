// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getPriceList,
  createPriceList,
  updatePriceList,
  cleanPriceListMessage,
} from "../store";
import { getVendorDropdown } from "../../vendors/store";
import { getProductDropdown } from "../../products/store";
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

// ** Custom
import Notification from "@components/toast/notification";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initPriceListItem } from "@constant/reduxConstant";

const PriceListForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.priceList);
  const vendorStore = useSelector((state) => state.vendor);
  const productStore = useSelector((state) => state.product);
  const currencyStore = useSelector((state) => state.currency);
  const isEditMode = !!id;

  const schema = useMemo(
    () =>
      yup.object().shape({
        vendor_id: yup.string().required(t("Vendor is required")),
        product_id: yup.string().required(t("Product is required")),
        currency_id: yup.string().required(t("Currency is required")),
        unit_price: yup
          .string()
          .trim()
          .required(t("Unit price is required"))
          .test("is-number", t("Unit price must be a number"), (v) =>
            v == null || v === "" ? false : !isNaN(Number(v))
          ),
        moq: yup
          .number()
          .typeError(t("MOQ must be a number"))
          .min(1, t("MOQ must be at least 1"))
          .nullable()
          .transform((v, o) => (o === "" ? null : v)),
        tax_pct: yup
          .string()
          .nullable()
          .test("is-number", t("Tax % must be a number"), (v) =>
            !v ? true : !isNaN(Number(v))
          ),
        discount_pct: yup
          .string()
          .nullable()
          .test("is-number", t("Discount % must be a number"), (v) =>
            !v ? true : !isNaN(Number(v))
          ),
        lead_time_days: yup
          .number()
          .typeError(t("Lead time must be a number"))
          .min(0)
          .nullable()
          .transform((v, o) => (o === "" ? null : v)),
        effective_date: yup.string().required(t("Effective date is required")),
        notes: yup.string().nullable().max(2000),
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
    defaultValues: initPriceListItem,
  });

  // When true, override the vendor-category filter and show all products.
  const [showAllProducts, setShowAllProducts] = useState(false);

  useLayoutEffect(() => {
    dispatch(getVendorDropdown());
    dispatch(getProductDropdown());
    dispatch(getCurrencyDropdown());
    if (isEditMode) {
      dispatch(getPriceList(id));
    } else {
      reset(initPriceListItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.priceListItem && store.priceListItem._id) {
      const r = store.priceListItem;
      reset({
        _id: r._id,
        vendor_id: r.vendor_id || "",
        product_id: r.product_id || "",
        currency_id: r.currency_id || "",
        unit_price: r.unit_price || "",
        moq: r.moq ?? 1,
        tax_pct: r.tax_pct || "",
        discount_pct: r.discount_pct || "",
        lead_time_days: r.lead_time_days ?? "",
        effective_date: (r.effective_date || "").slice(0, 10),
        valid_until: r.valid_until ? r.valid_until.slice(0, 10) : "",
        is_primary: !!r.is_primary,
        notes: r.notes || "",
      });
    }
  }, [store?.priceListItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "PL_CRTD" || store?.actionFlag === "PL_UPDT") {
      dispatch(cleanPriceListMessage(null));
      navigate(`${appsRoot}/price-list`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const onSubmit = (data) => {
    const payload = {
      vendor_id: data.vendor_id,
      product_id: data.product_id,
      currency_id: data.currency_id,
      unit_price: String(data.unit_price),
      effective_date: data.effective_date,
    };
    if (data.moq !== null && data.moq !== undefined && data.moq !== "")
      payload.moq = Number(data.moq);
    if (data.tax_pct) payload.tax_pct = String(data.tax_pct);
    if (data.discount_pct) payload.discount_pct = String(data.discount_pct);
    if (data.lead_time_days !== null && data.lead_time_days !== "")
      payload.lead_time_days = Number(data.lead_time_days);
    if (data.valid_until) payload.valid_until = data.valid_until;
    payload.is_primary = !!data.is_primary;
    if (data.notes) payload.notes = data.notes.trim();

    if (isEditMode) {
      dispatch(updatePriceList({ id, data: payload }));
    } else {
      dispatch(createPriceList(payload));
    }
  };

  const vendorOptions = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).map((v) => ({
        value: v._id,
        label: v.vendor_code
          ? `${v.company_name} [${v.vendor_code}]`
          : v.company_name,
      })),
    [vendorStore?.vendorDropdown]
  );

  // Resolve the selected vendor's categories from the dropdown payload.
  const watchedVendorId = watch("vendor_id");
  const selectedVendor = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).find(
        (v) => v._id === watchedVendorId
      ),
    [vendorStore?.vendorDropdown, watchedVendorId]
  );
  const vendorCategoryIds = selectedVendor?.category_ids || [];
  const vendorHasCategories = vendorCategoryIds.length > 0;

  const allProductOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code} — ${p.name}`,
        category_id: p.category_id,
      })),
    [productStore?.productDropdown]
  );

  // Default = filter by vendor's categories.
  //   no vendor       → empty list (Select is disabled below)
  //   show-all toggle → full list
  //   vendor w/o cats → full list with a warning
  //   normal          → only products in vendor's categories
  const productOptions = useMemo(() => {
    if (!watchedVendorId) return [];
    if (showAllProducts || !vendorHasCategories) return allProductOptions;
    const set = new Set(vendorCategoryIds);
    return allProductOptions.filter((o) => set.has(o.category_id));
  }, [
    allProductOptions,
    watchedVendorId,
    showAllProducts,
    vendorHasCategories,
    vendorCategoryIds,
  ]);

  // If the currently selected product no longer matches the filtered list
  // after a vendor change, clear it so users don't carry stale picks.
  useEffect(() => {
    const pid = watch("product_id");
    if (
      pid &&
      productOptions.length &&
      !productOptions.find((o) => o.value === pid)
    ) {
      setValue("product_id", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productOptions]);

  const currencyOptions = useMemo(
    () =>
      (currencyStore?.currencyDropdown || []).map((c) => ({
        value: c._id,
        label: `${c.code} — ${c.name}`,
      })),
    [currencyStore?.currencyDropdown]
  );

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content price-list">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Price") : t("Add Price")}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/price-list`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="4" className="mb-2">
                  <Label className="form-label">
                    {t("Vendor")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="vendor_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        options={vendorOptions}
                        value={vendorOptions.find((o) => o.value === field.value) || null}
                        placeholder={t("Select vendor")}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        }}
                      />
                    )}
                  />
                  {errors.vendor_id && (
                    <FormFeedback className="d-block">
                      {errors.vendor_id.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label d-flex justify-content-between align-items-center">
                    <span>
                      {t("Product")} <span className="text-danger">*</span>
                    </span>
                    {watchedVendorId && vendorHasCategories && (
                      <small>
                        <a
                          href="#"
                          className="text-decoration-none"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowAllProducts((s) => !s);
                          }}
                        >
                          {showAllProducts
                            ? t("Filter by vendor categories")
                            : t("Show all products")}
                        </a>
                      </small>
                    )}
                  </Label>
                  <Controller
                    name="product_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        options={productOptions}
                        value={productOptions.find((o) => o.value === field.value) || null}
                        placeholder={
                          watchedVendorId
                            ? t("Select product")
                            : t("Pick a vendor first")
                        }
                        isDisabled={!watchedVendorId}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        }}
                      />
                    )}
                  />
                  {watchedVendorId && !vendorHasCategories && (
                    <small className="text-warning d-block mt-1">
                      {t(
                        "This vendor has no categories set — showing all products."
                      )}
                    </small>
                  )}
                  {watchedVendorId &&
                    vendorHasCategories &&
                    !showAllProducts && (
                      <small className="text-muted d-block mt-1">
                        {t("Showing products matching this vendor's categories.")}
                      </small>
                    )}
                  {errors.product_id && (
                    <FormFeedback className="d-block">
                      {errors.product_id.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label">
                    {t("Currency")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        classNamePrefix="select"
                        options={currencyOptions}
                        value={currencyOptions.find((o) => o.value === field.value) || null}
                        placeholder={t("Select currency")}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        }}
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
                  <Label className="form-label" for="unit_price">
                    {t("Unit Price")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="unit_price"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="unit_price"
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.00"
                        invalid={!!errors.unit_price}
                        {...field}
                      />
                    )}
                  />
                  {errors.unit_price && (
                    <FormFeedback className="d-block">
                      {errors.unit_price.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="2" className="mb-2">
                  <Label className="form-label" for="moq">
                    {t("MOQ")}
                  </Label>
                  <Controller
                    name="moq"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="moq"
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                </Col>

                <Col md="2" className="mb-2">
                  <Label className="form-label" for="tax_pct">
                    {t("Tax %")}
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
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="2" className="mb-2">
                  <Label className="form-label" for="discount_pct">
                    {t("Discount %")}
                  </Label>
                  <Controller
                    name="discount_pct"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="discount_pct"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label" for="lead_time_days">
                    {t("Lead Time (days)")}
                  </Label>
                  <Controller
                    name="lead_time_days"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="lead_time_days"
                        type="number"
                        min="0"
                        placeholder="30"
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label" for="effective_date">
                    {t("Effective Date")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="effective_date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="effective_date"
                        type="date"
                        invalid={!!errors.effective_date}
                        {...field}
                      />
                    )}
                  />
                  {errors.effective_date && (
                    <FormFeedback className="d-block">
                      {errors.effective_date.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label" for="valid_until">
                    {t("Valid Until")}
                  </Label>
                  <Controller
                    name="valid_until"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="valid_until"
                        type="date"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("Optional explicit expiry. If blank, ends when a newer entry takes effect.")}
                  </small>
                </Col>

                <Col md="8" className="mb-2 d-flex align-items-end">
                  <div className="form-check">
                    <Controller
                      name="is_primary"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="checkbox"
                          id="is_primary"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                    <Label className="form-check-label" for="is_primary">
                      {t("Primary vendor for this product")}
                    </Label>
                    <small className="text-muted d-block">
                      {t("Default source used by Costing Sheet / fresh Purchase Order. Marking another vendor primary auto-unflags this one.")}
                    </small>
                  </div>
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
                        placeholder={t("Optional vendor terms or context")}
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
                  onClick={() => navigate(`${appsRoot}/price-list`)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting}>
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

export default PriceListForm;
