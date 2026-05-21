// ** React Imports
import { Fragment, useEffect, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getCountry,
  createCountry,
  updateCountry,
  cleanCountryMessage,
} from "../store";
import { startLoading, stopLoading } from "../../loadingstore";
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
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** React Dropdown Import
import Select from "react-select";
import countryList from "react-select-country-list";

// ** Custom Components
import Notification from "@components/toast/notification";
import SimpleSpinner from "@components/spinner/Simple-spinner";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";
import { initCountryItem } from "@constant/reduxConstant";

// ** Styles
import "react-phone-input-2/lib/style.css";
import "@styles/react/libs/flatpickr/flatpickr.scss";

const EditCountry = () => {
  // ** Hooks
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.country);

  const [countries, setCountries] = useState(null);
  const [resetValue, setResetValue] = useState(false);

  /* Yup validation schema */
  const CountrySchema = yup.object().shape({
    name: yup.object().required(`${t("Name is required")}.`).nullable(),
    // country_code: yup.string().required(`${t("Country code is required")}.`),
    currency_code: yup.string().required(`${t("Currency code is required")}.`),
  });

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: initCountryItem,
    resolver: yupResolver(CountrySchema),
  });

  useLayoutEffect(() => {
    dispatch(getCountry(id));
  }, [id]);

  useEffect(() => {
    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCountryMessage(null));
    }

    // Get the country options
    const options = countryList().getData();
    setCountries(options);

    if ((store?.actionFlag === "CTRY_SCS" && store.countryItem) || resetValue) {
      const countryItem = { ...store.countryItem };

      countryItem.name = {
        label: countryItem.name,
        value: countryItem.country_code,
      }

      const status = countryItem.status === true ? "Active" : "Inactive";

      reset({ ...countryItem, status });
      setResetValue(() => false);
    }

    // if (
    //   store?.actionFlag === "CTRY_CREATED" ||
    //   store?.actionFlag === "CTRY_UPDATED"
    // ) {
    //   navigate(`${appsRoot}/countries`);
    // }

    /* Success toast notification */
    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    /* Error toast notification */
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error, resetValue]);

  const onSubmit = (values) => {
    if (values) {
      const ctryData = {
        // _id: values?._id || "",
        name: values?.name?.label || "",
        currency_code: values?.currency_code || "",
        country_code: values?.country_code || "",
      };

      if (values?.status === "Active") {
        ctryData.status = true;
      } else {
        ctryData.status = false;
      }

      if (values?._id) {
        dispatch(updateCountry({ id: values?._id, data: ctryData }));
      } else {
        // console.log("onSubmit >>> ", values, ctryData)
        dispatch(createCountry(ctryData));
      }
    }
  };
  useEffect(() => {
    if (!store?.loading) {
      // document.body.classList.add("loader-body");
      dispatch(startLoading())
    } else {
      // document.body.classList.remove("loader-body");
      dispatch(stopLoading())
    }
  }), [store?.loading]
  return (
    <Fragment>
      {/* {!store?.loading ? <SimpleSpinner /> : null} */}

      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Edit Country")}</h3>

          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Row>
              <Form
                className=""
                autoComplete="off"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Row>
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="name">
                      {t("Name")}
                    </Label>
                    <Controller
                      id="name"
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          isClearable={false}
                          options={countries}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Choose a country...")}
                          autoComplete="off"
                          onChange={(selected) => {
                            field.onChange(selected);
                            setValue("country_code", selected?.value);
                          }}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.name?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="country_code">
                      {t("Country Code")}
                    </Label>
                    <Controller
                      id="country_code"
                      name="country_code"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          disabled={true}
                          autoComplete="off"
                          invalid={errors.country_code && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.country_code?.message}</FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="currency_code">
                      {t("Currency Code")}
                    </Label>
                    <Controller
                      id="currency_code"
                      name="currency_code"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                          invalid={errors.currency_code && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.currency_code?.message}</FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="status">
                      {t("Status")}
                    </Label>
                    <Controller
                      id="status"
                      name="status"
                      defaultValue=""
                      control={control}
                      render={({ field }) => (
                        <Row className="px-1 status">
                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              {...field}
                              id="Active"
                              type="radio"
                              value="Active"
                              checked={field?.value === "Active"}
                            />
                            <Label className="form-check-label" for="Active">
                              {t("Active")}
                            </Label>
                          </div>

                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              {...field}
                              id="Inactive"
                              type="radio"
                              value="Inactive"
                              checked={field?.value === "Inactive"}
                            />
                            <Label className="form-check-label" for="Inactive">
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
                <div className="main-form-btn">
                  <div className="form-btn  mt-2">
                    <Button
                      type="submit"
                      color="primary"
                      disabled={!store.loading}
                    >
                      {store?.loading ? t("Save") : <Spinner className="spinner-border-login" size="sm" />}
                    </Button>
                  </div>
                  <div className="form-btn  mt-2">
                    <Button
                      type="reset"
                      color="secondary"
                      onClick={() => {
                        setResetValue(true);
                        navigate(`${appsRoot}/countries`);
                      }}
                      disabled={!store.loading}
                    >
                      {store?.loading ? t("Cancel") : <Spinner className="spinner-border-login" size="sm" />}
                    </Button>
                  </div>
                </div>
              </Form>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default EditCountry;
