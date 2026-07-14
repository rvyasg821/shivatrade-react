import { Fragment, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import { useForm, Controller, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { useSelector } from "react-redux";
import {
  useCountryOptions,
  useStateOptions,
  useCityOptions,
  toGeoOption,
} from "@src/views/_shared/geo/useGeoOptions";

const AddressDetailsTab = forwardRef(({ employeeData }, ref) => {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState(null);
  const locationCtx = useSelector((state) => state.locationContext);
  const authStore = useSelector((state) => state.auth);
  const companyItem = useSelector((state) => state.company?.companyItem);

  // Countries come from the master now (with the static list as a fallback);
  // state and city SUGGEST from the master but still accept a typed value, so
  // every employee whose city was entered by hand keeps working.
  const countryList = useCountryOptions();

  const schema = yup.object().shape({
    address_1: yup.string().nullable(),
    address_2: yup.string().nullable(),
    city: yup.string().nullable(),
    state: yup.string().nullable(),
    zip_code: yup.string().nullable(),
    country: yup.string().nullable(),
  });

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    shouldFocusError: false,
    defaultValues: { address_1: "", address_2: "", city: "", state: "", zip_code: "", country: "" },
  });

  const countryValue = useWatch({ control, name: "country" });
  const stateValue = useWatch({ control, name: "state" });
  const stateOptions = useStateOptions(countryValue);
  const cityOptions = useCityOptions(stateValue, stateOptions);

  useEffect(() => {
    if (employeeData) {
      reset({
        address_1: employeeData.address_line1 || "",
        address_2: employeeData.address_line2 || "",
        city: employeeData.city || "",
        state: employeeData.state || "",
        zip_code: employeeData.postcode || "",
        country: employeeData.country || "",
      });
      // Set country dropdown — employee country, fallback to location/company country
      const countryValue = employeeData.country
        || locationCtx?.selectedLocationDetails?.country
        || companyItem?.selected_country
        || authStore?.authUserItem?.company?.selected_country
        || "";
      if (countryValue) {
        const cOption =
          countryList.find((c) => c.value.toUpperCase() === countryValue.toUpperCase()) ||
          countryList.find((c) => c.label.toLowerCase() === countryValue.toLowerCase());
        if (cOption) {
          setSelectedCountry(cOption);
          if (!employeeData.country) setValue("country", cOption.value);
        }
      }
    }
    // `countryList` is deliberately NOT a dep. It changes identity when the
    // country master arrives from the API, and this effect calls reset() —
    // re-running it would wipe whatever the user had already typed. It does not
    // need to re-run: useCountryOptions falls back to the static list, so the
    // list is already populated on the first render and the country resolves.
  }, [employeeData, locationCtx, companyItem, authStore]);

  const buildPayload = (values) => ({
    address_1: values.address_1 || "",
    address_2: values.address_2 || "",
    city: values.city || "",
    state: values.state || "",
    zip_code: values.zip_code || "",
    country: values.country || "",
  });

  useImperativeHandle(ref, () => ({
    getData: () =>
      new Promise((resolve) => {
        handleSubmit(
          (values) => resolve(buildPayload(values)),
          () => resolve(undefined)
        )();
      }),
  }));

  return (
    <Fragment>
      <form onSubmit={(e) => e.preventDefault()}>
        <Row>
          <Col md="6" className="mb-2">
            <Label>{t("Address Line 1")}</Label>
            <Controller name="address_1" control={control} render={({ field }) => <Input {...field} invalid={!!errors.address_1} />} />
            <FormFeedback>{errors.address_1?.message}</FormFeedback>
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Address Line 2")}</Label>
            <Controller name="address_2" control={control} render={({ field }) => <Input {...field} />} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("State")}</Label>
            <Controller name="state" control={control} render={({ field }) => (
              <CreatableSelect
                inputId="state"
                classNamePrefix="select"
                options={stateOptions}
                value={toGeoOption(field.value)}
                onChange={(option) => {
                  field.onChange(option?.value || "");
                  // The old city belongs to the old state — drop it rather than
                  // save a state/city pair that contradict each other.
                  setValue("city", "");
                }}
                onCreateOption={(input) => field.onChange(input)}
                formatCreateLabel={(input) => `${t("Use")} "${input}"`}
                placeholder={t("Select or type a state")}
                isClearable
              />
            )} />
            {errors.state && <div className="text-danger small mt-25">{errors.state?.message}</div>}
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("City")}</Label>
            <Controller name="city" control={control} render={({ field }) => (
              <CreatableSelect
                inputId="city"
                classNamePrefix="select"
                options={cityOptions}
                value={toGeoOption(field.value)}
                onChange={(option) => field.onChange(option?.value || "")}
                onCreateOption={(input) => field.onChange(input)}
                formatCreateLabel={(input) => `${t("Use")} "${input}"`}
                placeholder={t("Select or type a city")}
                noOptionsMessage={() => t("Type to enter a city")}
                isClearable
              />
            )} />
            {errors.city && <div className="text-danger small mt-25">{errors.city?.message}</div>}
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Postcode / ZIP")}</Label>
            <Controller name="zip_code" control={control} render={({ field }) => <Input {...field} invalid={!!errors.zip_code} />} />
            <FormFeedback>{errors.zip_code?.message}</FormFeedback>
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Country")}</Label>
            <Controller name="country" control={control} render={({ field }) => (
              <Select
                inputId="country"
                classNamePrefix="select"
                options={countryList}
                value={selectedCountry}
                onChange={(option) => {
                  setSelectedCountry(option);
                  field.onChange(option?.value || "");
                  // A state and city from the previous country are now wrong.
                  setValue("state", "");
                  setValue("city", "");
                }}
                placeholder={t("Select country")}
                isClearable isSearchable
              />
            )} />
            {errors.country && <div className="text-danger small mt-25">{errors.country?.message}</div>}
          </Col>
        </Row>
      </form>
    </Fragment>
  );
});

export default AddressDetailsTab;
