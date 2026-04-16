import { Fragment, useEffect, useState } from "react";
import { Row, Col, Label, Input, Button, Spinner, FormFeedback } from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import { getCountryList } from "@src/views/auth/register/utils/countryTimezoneUtils";
import { useSelector } from "react-redux";

const AddressDetailsTab = ({ employeeData, onSave, loading }) => {
  const { t } = useTranslation();
  const countryList = getCountryList();
  const [selectedCountry, setSelectedCountry] = useState(null);
  const locationCtx = useSelector((state) => state.locationContext);
  const authStore = useSelector((state) => state.auth);
  const companyItem = useSelector((state) => state.company?.companyItem);

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
  }, [employeeData, locationCtx, companyItem, authStore]);

  const onSubmit = (values) => {
    onSave({
      address_1: values.address_1 || "",
      address_2: values.address_2 || "",
      city: values.city || "",
      state: values.state || "",
      zip_code: values.zip_code || "",
      country: values.country || "",
    });
  };

  return (
    <Fragment>
      <form onSubmit={handleSubmit(onSubmit)}>
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
            <Label>{t("City")}</Label>
            <Controller name="city" control={control} render={({ field }) => <Input {...field} invalid={!!errors.city} />} />
            <FormFeedback>{errors.city?.message}</FormFeedback>
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("State")}</Label>
            <Controller name="state" control={control} render={({ field }) => <Input {...field} invalid={!!errors.state} />} />
            <FormFeedback>{errors.state?.message}</FormFeedback>
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
                onChange={(option) => { setSelectedCountry(option); field.onChange(option?.value || ""); }}
                placeholder={t("Select country")}
                isClearable isSearchable
              />
            )} />
            {errors.country && <div className="text-danger small mt-25">{errors.country?.message}</div>}
          </Col>
        </Row>
        <div className="mt-2">
          <Button type="submit" color="primary" disabled={loading}>
            {loading ? <Spinner size="sm" /> : t("Save Address")}
          </Button>
        </div>
      </form>
    </Fragment>
  );
};

export default AddressDetailsTab;
