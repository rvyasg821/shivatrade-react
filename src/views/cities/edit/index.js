// ** React Imports
import { Fragment, useEffect, useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getCity, createCity, updateCity, cleanCityMessage } from "../store";
import { startLoading, stopLoading } from "../../loadingstore";
import {
  getCountryList,
} from "@src/views/pages/customerbooking/store";
import { getStateListByCountry } from "@src/views/states/store";

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

const EditCity = () => {
  // ** Hooks
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.city);
  const countryStore = useSelector((state) => state.booking);
  const stateStore = useSelector((state) => state.states);

  // ** States
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [resetValue, setResetValue] = useState(false);
  const [countrySearchInput, setCountrySearchInput] = useState("");
  const [stateSearchInput, setStateSearchInput] = useState("");
  const [isLoadingForCountry, setIsLoadingForCountry] = useState(true);

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
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: initCityItem,
    resolver: yupResolver(CitySchema),
  });

  useLayoutEffect(() => {
    dispatch(getCity(id));
    // dispatch(getCountryList());
  }, [id]);

  useEffect(() => {
      if ((selectedCountry?._id || store?.cityItem?.country_id?.id)) {
        dispatch(getStateListByCountry(selectedCountry?._id))
  
        if (!isLoadingForCountry) {
          setIsLoadingForCountry(false); // Update the loading state to false
        }
      }
    }, [selectedCountry, store?.cityItem?.country_id?.id, isLoadingForCountry])

  useEffect(() => {
    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCityMessage(null));
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
      }
      setCountryOptions(ctryOpts);
    }

    if (stateStore?.actionFlag === "STT_CNT_LST_SCS") {
      let sttOpts = [];

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

    if ((store?.actionFlag === "CITY_SCS" && store?.cityItem) || resetValue) {
      let cityItem = { ...store.cityItem };

      const status = cityItem.status === true ? "Active" : "Inactive";

      if (cityItem?.country_id) {
        const country_id = {
          ...cityItem?.country_id,
          value: cityItem?.country_id?._id || "",
          label: cityItem?.country_id?.name || "",
        };
        setSelectedCountry(country_id)

        cityItem = { ...cityItem, country_id };
      }

      if (cityItem?.state_id) {
        const state_id = {
          ...cityItem.state_id,
          value: cityItem.state_id?._id || "",
          label: cityItem.state_id?.name || "",
        };

        cityItem = { ...cityItem, state_id };
      }

      reset({ ...cityItem, status });
      setResetValue(() => false);
    }

    // if (
    //   store?.actionFlag === "CITY_CREATED" ||
    //   store?.actionFlag === "CITY_UPDATED"
    // ) {
    //   navigate(`${appsRoot}/cities`);
    // }

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
    resetValue,
  ]);

  const handleStateSearch = (inputValue) => {
    if (selectedCountry?.value) {
      setStateSearchInput(inputValue);
    }
    // Dispatch the action to fetch filtered city list based on the input value
    // dispatch(getStateListByCountry({ id: selectedCountry?.value, search: inputValue }))
  };

  // Function for search country
  const handleSearchCountry = (searchTerm) => {
    setCountrySearchInput(searchTerm)
    // dispatch(getCountryList({ search: searchTerm }))
  }

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
    if (stateSearchInput && selectedCountry?.value) {
      handler = setTimeout(() => {
        dispatch(getStateListByCountry(`${selectedCountry?.value}?search=${stateSearchInput}`));
      }, 500);
    } else if (!stateSearchInput && selectedCountry?.value) {
      dispatch(getStateListByCountry(selectedCountry?.value));
    }

    return () => {
      clearTimeout(handler)
    }
  }, [stateSearchInput])

  const onSubmit = (values) => {
    if (values) {
      const ctyData = {
        // _id: values?._id || "",
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

      if (values?._id) {
        dispatch(updateCity({ id: values?._id, data: ctyData }));
      } else {
        // console.log("onSubmit >>> ", values, srvcData)
        dispatch(createCity(ctyData));
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
          <h3 className="mb-0">{t("Edit City")}</h3>

          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/cities`)}
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
                          value={selectedCountry}
                          onChange={(selectedOption) => {
                            setSelectedCountry(selectedOption);
                            setValue("country_id", selectedOption || "")
                            setValue("state_id", "")
                            setIsLoadingForCountry(() => false)
                          }}
                          onInputChange={(value) => handleSearchCountry(value)}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select country...")}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.country_id?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2  col-lg-6 col-md-6 col-sm-6">
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
                          onInputChange={(inputValue) => handleStateSearch(inputValue)}
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
                      disabled={!store.loading}
                      onClick={() => {
                        setResetValue(true);
                        navigate(`${appsRoot}/cities`);
                      }}
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

export default EditCity;
