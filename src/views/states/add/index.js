// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { getState, createState, updateState, cleanStateMessage } from "../store";
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
import { initStateItem } from "@constant/reduxConstant";

const GEO_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const StateForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.states);
  const countryStore = useSelector((state) => state.country);
  const isEditMode = !!id;

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup
          .string()
          .trim()
          .max(100)
          .required(t("State name is required")),
        country_id: yup.string().nullable().required(t("Country is required")),
        state_code: yup.string().trim().max(20).nullable(),
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
    defaultValues: initStateItem,
  });

  useLayoutEffect(() => {
    dispatch(getCountryDropdown());
    if (isEditMode) {
      dispatch(getState(id));
    } else {
      reset(initStateItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.stateItem?._id) {
      const s = store.stateItem;
      reset({
        _id: s._id,
        name: s.name || "",
        country_id: s.country_id || null,
        state_code: s.state_code || "",
        status: s.status || "ACTIVE",
      });
    }
  }, [store?.stateItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "STATE_CRTD" || store?.actionFlag === "STATE_UPDT") {
      dispatch(cleanStateMessage(null));
      navigate(`${appsRoot}/states`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const countryOptions = (countryStore?.countryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const onSubmit = (data) => {
    const payload = {
      name: data.name.trim(),
      country_id: data.country_id,
      state_code: data.state_code?.trim().toUpperCase() || undefined,
      status: data.status,
    };

    if (isEditMode) {
      dispatch(updateState({ id, data: payload }));
    } else {
      dispatch(createState(payload));
    }
  };

  return (
    <Fragment>
      <div className="main-content states">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit State") : t("Add State")}</h3>
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
                    {t("State Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="name"
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("Gujarat")}
                        invalid={!!errors.name}
                      />
                    )}
                  />
                  {errors.name && <FormFeedback>{errors.name.message}</FormFeedback>}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="country_id">
                    {t("Country")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="country_id"
                    name="country_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={countryOptions}
                        value={
                          countryOptions.find((o) => o.value === field.value) || null
                        }
                        onChange={(selected) =>
                          field.onChange(selected ? selected.value : null)
                        }
                        isClearable
                        classNamePrefix="select"
                        placeholder={t("Select Country")}
                      />
                    )}
                  />
                  {errors.country_id && (
                    <div className="text-danger small mt-25">
                      {errors.country_id.message}
                    </div>
                  )}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="state_code">
                    {t("State Code")}
                  </Label>
                  <Controller
                    id="state_code"
                    name="state_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("GJ")}
                        className="text-uppercase"
                        invalid={!!errors.state_code}
                      />
                    )}
                  />
                  {errors.state_code && (
                    <FormFeedback>{errors.state_code.message}</FormFeedback>
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

export default StateForm;
