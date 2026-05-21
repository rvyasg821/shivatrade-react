// ** React Imports
import { Fragment, useEffect, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { createCity, cleanCityMessage } from "../store";
import { startLoading, stopLoading } from "../../loadingstore";
import {
  getCountryList,
} from "@src/views/pages/customerbooking/store";
import {
  cleanStateMessage,
  getStateListByCountry,
} from "@src/views/states/store";

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

// ** Custom Components
import Notification from "@components/toast/notification";
import SimpleSpinner from "@components/spinner/Simple-spinner";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";
import { initCityItem } from "@constant/reduxConstant";

// ** Styles
import "react-phone-input-2/lib/style.css";
import "@styles/react/libs/flatpickr/flatpickr.scss";

const AddCity = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.city);
  const countryStore = useSelector((state) => state.booking);
  const stateStore = useSelector((state) => state.states);

  // ** States
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [countryId, setCountryId] = useState(null);
  const [countrySearchInput, setCountrySearchInput] = useState("");
  const [stateSearchInput, setStateSearchInput] = useState("");

  /* Yup validation schema */
  const CitySchema = yup.object().shape({
    name: yup.string().required(`${t("Name is required")}.`),
    country_id: yup
      .object()
      .required(`${t("Country is required")}.`)
      .nullable(),
    state_id: yup
      .object()
      .required(`${t("State is required")}.`)
      .nullable(),
  });

  const {
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: initCityItem,
    resolver: yupResolver(CitySchema),
  });

  useEffect(() => {
    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCityMessage(null));
    }

    if (stateStore?.actionFlag || stateStore?.success || stateStore?.error) {
      dispatch(cleanStateMessage(null));
    }

    if (
      countryStore?.actionFlag === "COUNTRIES_LST_SCS" ||
      countryStore.actionFlag === "COUNTRIES_SLOTS_LST_ERR"
    ) {
      let ctryOpts = [];

      if (countryStore?.CountryItems?.length) {
        ctryOpts = countryStore.CountryItems.map((item) => {
          return {
            ...item,
            value: item?._id,
            label: item?.name,
          };
        });
        console.log("ctryOpts", ctryOpts);
      }
      setCountryOptions(ctryOpts);
    }

    if (
      stateStore?.actionFlag === "STT_CNT_LST_SCS" ||
      stateStore.actionFlag === "STT_CNT_LST_ERR"
    ) {
      let sttOpts = [];
      console.log("sttOpts", sttOpts);

      if (stateStore?.stateItems?.length) {
        sttOpts = stateStore.stateItems.map((item) => {
          return {
            ...item,
            value: item?._id,
            label: item?.name,
          };
        });
      }
      setStateOptions(sttOpts);
    }

    if (store?.actionFlag === "CITY_CREATED") {
      navigate(`${appsRoot}/cities`);
    }

    /* Success toast notification */
    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    /* Error toast notification */
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [
    countryStore.actionFlag,
    stateStore.actionFlag,
    store.actionFlag,
    store.success,
    store.error,
  ]);

  const handleCountryChange = (selectedCountry) => {
    setValue("state_id", null); // Reset state dropdown
    dispatch(getStateListByCountry(selectedCountry?.value));
    setCountryId(selectedCountry)
  };

  // Function for search country
  const handleSearchCountry = (searchTerm) => {
    setCountrySearchInput(searchTerm)
  }

  const handleStateSearch = (searchValue) => {
    if (countryId?.value) {
      setStateSearchInput(searchValue)
    }
  };

  // ** Country search debounce
  useEffect(() => {
    let handler;
    if (countrySearchInput) {
      handler = setTimeout(() => {
        dispatch(getCountryList({ search: countrySearchInput }))
      }, 500);
    } else {
      dispatch(getCountryList({ search: countrySearchInput }))
    }

    return () => {
      clearTimeout(handler)
    }
  }, [countrySearchInput])

  // ** State search debounce
  useEffect(() => {
    let handler;
    if (stateSearchInput && countryId?.value) {
      handler = setTimeout(() => {
        dispatch(getStateListByCountry(`${countryId?.value}?search=${stateSearchInput}`));
      }, 500);
    } else if (!stateSearchInput && countryId?.value) {
      dispatch(getStateListByCountry(countryId?.value));
    }

    return () => {
      clearTimeout(handler)
    }
  }, [stateSearchInput])

  const handleCancel = () => {
    // Reset the form to its initial values
    reset(initCityItem);
    navigate(`${appsRoot}/cities`);

  };
  const onSubmit = (values) => {
    if (values) {
      const ctyData = {
        name: values?.name || "",
        city_code: values?.city_code || "",
      };

      if (values?.status === "Active") {
        ctyData.status = true;
      } else {
        ctyData.status = false;
      }

      if (values?.country_id) {
        ctyData.country_id =
          values.country_id?.value || values?.country_id || "";
      }

      if (values?.state_id) {
        ctyData.state_id = values.state_id?.value || values?.state_id || "";
      }

      // console.log("onSubmit >>> ", values, ctyData)
      dispatch(createCity(ctyData));
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
          <h3 className="mb-0">{t("Add City")}</h3>

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
                    <Label className="form-label" for="country_id">
                      {t("Country")}
                    </Label>
                    <Controller
                      id="country_id"
                      name="country_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          isClearable={false}
                          options={countryOptions}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select country...")}
                          onChange={(e) => {
                            field.onChange(e);
                            handleCountryChange(e);
                          }}
                          onInputChange={(value) => handleSearchCountry(value)}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.country_id?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="state_id">
                      {t("County / State")}
                    </Label>
                    <Controller
                      id="state_id"
                      name="state_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          isClearable={false}
                          options={stateOptions}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select state...")}
                          onInputChange={(searchValue) => handleStateSearch(searchValue)}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.state_id?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="name">
                      {t("Name")}
                    </Label>
                    <Controller
                      id="name"
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                          invalid={errors.name && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.name?.message}</FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
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
                          className=""
                          autoComplete="off"
                        // invalid={errors.city_code && true}
                        />
                      )}
                    />
                    {/* <FormFeedback>{errors.city_code?.message}</FormFeedback> */}
                  </div>

                  <div className="mb-2 col-lg-4 col-md-4 col-sm-6">
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
                  <div className="main-form-btn">
                    <div className="form-btn  mt-2">
                      <Button
                        type="submit"
                        color="primary"
                        disabled={!store.loading}
                      >
                        {store?.loading ? t("Save") : (<Spinner className="spinner-border-login" size="sm" />)}
                      </Button>
                    </div>
                    <div className="form-btn  mt-2">
                      <Button
                        type="button"
                        color="secondary"
                        disabled={!store.loading}
                        onClick={handleCancel}
                      >
                        {store?.loading ? t("Cancel") : (<Spinner className="spinner-border-login" size="sm" />)}
                      </Button>
                    </div>
                  </div>
                </Row>
              </Form>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default AddCity;
