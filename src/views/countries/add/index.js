// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getCountry,
  createCountry,
  updateCountry,
  cleanCountryMessage,
} from "../store";

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
import { initCountryItem } from "@constant/reduxConstant";

// The geo masters store the backend enum verbatim. Not the shared
// STATUS_OPTIONS, which is lowercase "active"/"inactive" and would fail the
// DTO's @IsEnum check.
const GEO_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const CountryForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.country);
  const isEditMode = !!id;

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup
          .string()
          .trim()
          .min(3, t("Name must be at least 3 characters"))
          .max(100)
          .required(t("Country name is required")),
        country_code: yup
          .string()
          .trim()
          .matches(/^[A-Za-z]{2,3}$/, t("Country code must be 2 or 3 letters"))
          .required(t("Country code is required")),
        currency_code: yup
          .string()
          .trim()
          .max(20)
          .required(t("Currency code is required")),
        time_zone: yup.string().trim().max(100).nullable(),
        status: yup
          .string()
          .oneOf(["ACTIVE", "INACTIVE"])
          .required(t("Status is required")),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initCountryItem,
  });

  useLayoutEffect(() => {
    if (isEditMode) {
      dispatch(getCountry(id));
    } else {
      reset(initCountryItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.countryItem?._id) {
      const c = store.countryItem;
      reset({
        _id: c._id,
        name: c.name || "",
        country_code: c.country_code || "",
        currency_code: c.currency_code || "",
        time_zone: c.time_zone || "",
        status: c.status || "ACTIVE",
      });
    }
  }, [store?.countryItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (
      store?.actionFlag === "CNTRY_CRTD" ||
      store?.actionFlag === "CNTRY_UPDT"
    ) {
      dispatch(cleanCountryMessage(null));
      navigate(`${appsRoot}/countries`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const onSubmit = (data) => {
    const payload = {
      name: data.name.trim(),
      country_code: data.country_code.trim().toUpperCase(),
      currency_code: data.currency_code.trim().toUpperCase(),
      time_zone: data.time_zone?.trim() || undefined,
      status: data.status,
    };

    if (isEditMode) {
      dispatch(updateCountry({ id, data: payload }));
    } else {
      dispatch(createCountry(payload));
    }
  };

  return (
    <Fragment>
      <div className="main-content countries">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Country") : t("Add Country")}
          </h3>
          <Button color="secondary" outline onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="me-50" />
            {t("Back")}
          </Button>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="6" className="mb-1">
                  <Label className="form-label" for="name">
                    {t("Country Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="name"
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("India")}
                        invalid={!!errors.name}
                      />
                    )}
                  />
                  {errors.name && (
                    <FormFeedback>{errors.name.message}</FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="country_code">
                    {t("Country Code")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="country_code"
                    name="country_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("IN")}
                        className="text-uppercase"
                        invalid={!!errors.country_code}
                      />
                    )}
                  />
                  {errors.country_code && (
                    <FormFeedback>{errors.country_code.message}</FormFeedback>
                  )}
                  <small className="text-muted">
                    {t("ISO code — this is the value address records store.")}
                  </small>
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="currency_code">
                    {t("Currency Code")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="currency_code"
                    name="currency_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("INR")}
                        className="text-uppercase"
                        invalid={!!errors.currency_code}
                      />
                    )}
                  />
                  {errors.currency_code && (
                    <FormFeedback>{errors.currency_code.message}</FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="time_zone">
                    {t("Time Zone")}
                  </Label>
                  <Controller
                    id="time_zone"
                    name="time_zone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("Asia/Kolkata")}
                        invalid={!!errors.time_zone}
                      />
                    )}
                  />
                  {errors.time_zone && (
                    <FormFeedback>{errors.time_zone.message}</FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="status">
                    {t("Status")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="status"
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        options={GEO_STATUS_OPTIONS.map((o) => ({
                          ...o,
                          label: t(o.label),
                        }))}
                        value={
                          GEO_STATUS_OPTIONS.filter(
                            (o) => o.value === field.value
                          ).map((o) => ({ ...o, label: t(o.label) }))[0] || null
                        }
                        onChange={(selected) =>
                          field.onChange(selected ? selected.value : "")
                        }
                        classNamePrefix="select"
                        placeholder={t("Select Status")}
                      />
                    )}
                  />
                  {errors.status && (
                    <div className="text-danger small mt-25">
                      {errors.status.message}
                    </div>
                  )}
                </Col>
              </Row>

              <Row className="mt-2">
                <Col className="d-flex">
                  <Button
                    type="submit"
                    color="primary"
                    className="me-1"
                    disabled={isSubmitting}
                  >
                    {isEditMode ? t("Update") : t("Save")}
                  </Button>
                  <Button
                    type="button"
                    color="secondary"
                    outline
                    onClick={() => navigate(-1)}
                  >
                    {t("Cancel")}
                  </Button>
                </Col>
              </Row>
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default CountryForm;
