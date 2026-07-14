// ** React Imports
import { Fragment, useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { getCity, createCity, updateCity, cleanCityMessage } from "../store";
import { getStateDropdown } from "../../states/store";
import { getCountryDropdown } from "../../countries/store";

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
import { initCityItem } from "@constant/reduxConstant";

const GEO_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const CityForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.city);
  const stateStore = useSelector((state) => state.states);
  const countryStore = useSelector((state) => state.country);
  const isEditMode = !!id;

  // Country is a picker, not a saved field: the backend derives a city's country
  // from its state. It exists here only to narrow the state list down from
  // "every state in the world" to something usable.
  const [countryId, setCountryId] = useState(null);

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup.string().trim().max(100).required(t("City name is required")),
        state_id: yup.string().nullable().required(t("State is required")),
        city_code: yup.string().trim().max(20).nullable(),
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initCityItem,
  });

  useLayoutEffect(() => {
    dispatch(getCountryDropdown());
    dispatch(getStateDropdown({}));
    if (isEditMode) {
      dispatch(getCity(id));
    } else {
      reset(initCityItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.cityItem?._id) {
      const c = store.cityItem;
      reset({
        _id: c._id,
        name: c.name || "",
        state_id: c.state_id || null,
        city_code: c.city_code || "",
        status: c.status || "ACTIVE",
      });
      // Pre-set the country picker from the saved city so the state dropdown
      // opens already narrowed to the right country.
      setCountryId(c.country_id || null);
      if (c.country_id) {
        dispatch(getStateDropdown({ country_id: c.country_id }));
      }
    }
  }, [store?.cityItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "CITY_CRTD" || store?.actionFlag === "CITY_UPDT") {
      dispatch(cleanCityMessage(null));
      navigate(`${appsRoot}/cities`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const countryOptions = (countryStore?.countryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));
  const stateOptions = (stateStore?.stateDropdown || []).map((s) => ({
    value: s._id,
    label: s.name,
  }));

  const onCountryChange = (selected) => {
    const value = selected ? selected.value : null;
    setCountryId(value);
    // The chosen state may not live in the new country — clear it rather than
    // submit a state/country pair that disagree.
    setValue("state_id", null, { shouldValidate: true });
    dispatch(getStateDropdown(value ? { country_id: value } : {}));
  };

  const onSubmit = (data) => {
    const payload = {
      name: data.name.trim(),
      state_id: data.state_id,
      city_code: data.city_code?.trim().toUpperCase() || undefined,
      status: data.status,
    };

    if (isEditMode) {
      dispatch(updateCity({ id, data: payload }));
    } else {
      dispatch(createCity(payload));
    }
  };

  return (
    <Fragment>
      <div className="main-content cities">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit City") : t("Add City")}</h3>
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
                    {t("City Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="name"
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("Ahmedabad")}
                        invalid={!!errors.name}
                      />
                    )}
                  />
                  {errors.name && <FormFeedback>{errors.name.message}</FormFeedback>}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="country_picker">
                    {t("Country")}
                  </Label>
                  <Select
                    inputId="country_picker"
                    options={countryOptions}
                    value={countryOptions.find((o) => o.value === countryId) || null}
                    onChange={onCountryChange}
                    isClearable
                    classNamePrefix="select"
                    placeholder={t("Select Country")}
                  />
                  <small className="text-muted">
                    {t("Narrows the state list. Saved from the state you pick.")}
                  </small>
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="state_id">
                    {t("State")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="state_id"
                    name="state_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={stateOptions}
                        value={stateOptions.find((o) => o.value === field.value) || null}
                        onChange={(selected) =>
                          field.onChange(selected ? selected.value : null)
                        }
                        isClearable
                        classNamePrefix="select"
                        placeholder={t("Select State")}
                        noOptionsMessage={() =>
                          t("No states — add one under Master → States first")
                        }
                      />
                    )}
                  />
                  {errors.state_id && (
                    <div className="text-danger small mt-25">
                      {errors.state_id.message}
                    </div>
                  )}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="city_code">
                    {t("City Code")}
                  </Label>
                  <Controller
                    id="city_code"
                    name="city_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        className="text-uppercase"
                        invalid={!!errors.city_code}
                      />
                    )}
                  />
                  {errors.city_code && (
                    <FormFeedback>{errors.city_code.message}</FormFeedback>
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
                        options={GEO_STATUS_OPTIONS.map((o) => ({
                          ...o,
                          label: t(o.label),
                        }))}
                        value={
                          GEO_STATUS_OPTIONS.filter((o) => o.value === field.value).map(
                            (o) => ({ ...o, label: t(o.label) })
                          )[0] || null
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

export default CityForm;
