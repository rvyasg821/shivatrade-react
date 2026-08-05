// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getPriceList,
  createPriceList,
  updatePriceList,
  cleanPriceListMessage,
} from "../store";
import { resolveEntityByIds, ENTITY_KINDS } from "@src/utility/asyncSelect";
import EntitySearchSelect from "@components/entity-select";
import { getCurrencySymbol } from "@src/utility/currency";
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
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initPriceListItem } from "@constant/reduxConstant";
import DateInput from "@components/date-input";

const PriceListForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const urlVendorId = searchParams.get("vendor_id") || "";

  // Single source of truth for "where to go when leaving this page".
  // Uses the browser history so the user lands on the exact previous
  // location they came from (filtered list, vendor detail, etc.).
  const goBack = () => navigate(-1);

  const store = useSelector((state) => state.priceList);
  const isEditMode = !!id;

  const schema = useMemo(
    () =>
      yup.object().shape({
        vendor_id: yup.string().required(t("Vendor is required")),
        product_id: yup.string().required(t("Product is required")),
        unit_price: yup
          .string()
          .trim()
          .required(t("Unit price is required"))
          .test("is-number", t("Unit price must be a number"), (v) =>
            v == null || v === "" ? false : !isNaN(Number(v))
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

  useLayoutEffect(() => {
    if (isEditMode) {
      dispatch(getPriceList(id));
    } else {
      reset(initPriceListItem);
    }
  }, [id]);


  // On create, pre-select the vendor when arriving from /vendors/view/:id
  // (URL carries ?vendor_id=<id>).
  useEffect(() => {
    if (isEditMode) return;
    if (!urlVendorId) return;
    if (watch("vendor_id")) return;
    setValue("vendor_id", urlVendorId, { shouldDirty: false });
  }, [urlVendorId, isEditMode]);

  useEffect(() => {
    if (isEditMode && store?.priceListItem && store.priceListItem._id) {
      const r = store.priceListItem;
      reset({
        _id: r._id,
        vendor_id: r.vendor_id || "",
        product_id: r.product_id || "",
        currency_id: r.currency_id || "",
        unit_price: r.unit_price || "",
        lead_time_days: r.lead_time_days ?? "",
        effective_date: (r.effective_date || "").slice(0, 10),
        notes: r.notes || "",
      });
    }
  }, [store?.priceListItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "PL_CRTD" || store?.actionFlag === "PL_UPDT") {
      dispatch(cleanPriceListMessage(null));
      goBack();
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const onSubmit = (data) => {
    const payload = {
      vendor_id: data.vendor_id,
      product_id: data.product_id,
      // Currency is not sent — the backend uses the vendor's currency.
      unit_price: String(data.unit_price),
      effective_date: data.effective_date,
    };
    if (data.lead_time_days !== null && data.lead_time_days !== "")
      payload.lead_time_days = Number(data.lead_time_days);
    if (data.notes) payload.notes = data.notes.trim();

    if (isEditMode) {
      dispatch(updatePriceList({ id, data: payload }));
    } else {
      dispatch(createPriceList(payload));
    }
  };

  const watchedVendorId = watch("vendor_id");
  // The picked vendor's full row — its currency_code drives the currency
  // display. Set on pick; resolved via ?ids= on edit / ?vendor_id= prefill.
  const [selectedVendor, setSelectedVendor] = useState(null);
  useEffect(() => {
    if (!watchedVendorId) {
      setSelectedVendor(null);
      return;
    }
    if (selectedVendor?._id === watchedVendorId) return;
    let alive = true;
    resolveEntityByIds(ENTITY_KINDS.vendor, [watchedVendorId]).then((opts) => {
      if (alive && opts[0]) setSelectedVendor(opts[0].raw);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedVendorId]);


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
            onClick={goBack}
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
                      <EntitySearchSelect
                        kind="vendor"
                        value={field.value || null}
                        placeholder={t("Search vendor")}
                        isClearable={false}
                        onChange={(opt) => {
                          field.onChange(opt ? opt.value : "");
                          setSelectedVendor(opt?.raw || null);
                        }}
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
                  <Label className="form-label">
                    {t("Product")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="product_id"
                    control={control}
                    render={({ field }) => (
                      <EntitySearchSelect
                        kind="product"
                        value={field.value || null}
                        placeholder={
                          watchedVendorId
                            ? t("Search product")
                            : t("Pick a vendor first")
                        }
                        isClearable={false}
                        isDisabled={!watchedVendorId}
                        onChange={(opt) => {
                          field.onChange(opt ? opt.value : "");
                          if (!opt) return;
                          const p = opt.raw || {};
                          // Auto-fill from product master only if the field is
                          // empty - don't overwrite user-typed values.
                          if (
                            p.selling_price !== undefined &&
                            p.selling_price !== null &&
                            String(p.selling_price) !== "" &&
                            !watch("unit_price")
                          ) {
                            setValue("unit_price", String(p.selling_price), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        }}
                      />
                    )}
                  />
                  {errors.product_id && (
                    <FormFeedback className="d-block">
                      {errors.product_id.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label">{t("Currency")}</Label>
                  <div className="form-control-plaintext fw-semibold">
                    {selectedVendor?.currency_code
                      ? `${
                          getCurrencySymbol(selectedVendor.currency_code) || ""
                        } ${selectedVendor.currency_code}`
                      : "—"}
                  </div>
                  <small className="text-muted">
                    {t("Follows the vendor's currency")}
                  </small>
                </Col>
              </Row>

              <Row>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="unit_price">
                    {t("Price")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="unit_price"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="unit_price"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.00"
                        invalid={!!errors.unit_price}
                        {...field}
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
                  {errors.unit_price && (
                    <FormFeedback className="d-block">
                      {errors.unit_price.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="4" className="mb-2">
                  <Label className="form-label" for="effective_date">
                    {t("Effective Date")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="effective_date"
                    control={control}
                    render={({ field }) => (
                      <DateInput
                        id="effective_date"
                        value={field.value || ""}
                        invalid={!!errors.effective_date}
                        onChange={(dates, str, iso) => field.onChange(iso)}
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
              </Row>

              <Row>
                <Col md="12" className="mb-1">
                  <small className="text-muted">
                    {t("Versioning is by effective date — a newer entry auto-expires the previous price.")}
                  </small>
                </Col>
              </Row>

              <Row>
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
                  onClick={goBack}
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
