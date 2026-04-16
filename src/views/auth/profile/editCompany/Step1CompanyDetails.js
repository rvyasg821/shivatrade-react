// ** React Imports
import { Fragment, useEffect, useState } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { updateCompanyProfile, getCompanyDetails } from "./store";
import { authUpdateMe } from "@src/views/auth/store";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Reactstrap Imports
import {
  Row,
  Card,
  Form,
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
import Notification from "@components/toast/notification";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Constant
import { countryCodeEditable, disableCountryDropdown } from "@constant/defaultValues";

// ** Utilities
import {
  getCountryList,
  getTimezoneList,
  getPrimaryTimezoneByCountry,
  selectStyles
} from "@src/views/auth/register/utils/countryTimezoneUtils";
import {
  getCurrencyList,
  autoDetectCurrency,
  getCurrencyByCode
} from "@src/views/auth/register/utils/currencyUtils";

// ** Styles
import "react-phone-input-2/lib/style.css";
import { startLoading, stopLoading } from "../../../loadingstore";

const Step1CompanyDetails = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const companyStore = useSelector((state) => state.company);
  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name;
  const isSystemUser = user?.authUserItem?.isSystemUser;

  // Company Admins and System Admins should be able to edit company details
  const isReadOnly = !(
    roleName === "Company Admin" ||
    roleName === "Admin" ||
    isSystemUser
  );

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  // State for dropdowns
  const [countryList] = useState(getCountryList());
  const [timezoneList] = useState(getTimezoneList());
  const [currencyList] = useState(getCurrencyList());
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  useEffect(() => {
    if (user?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [user.loading]);

  const ProfileSchema = yup.object().shape({
    fname: yup.string().required(`${t("First Name is required")}.`),
    lname: yup.string().required(`${t("Last Name is required")}.`),
    company_name: yup.string().required(`${t("Company Name is required")}.`),
    email: yup.string().required(`${t("Email is required")}.`).email(`${t("Invalid email address")}.`),
    mobile: yup.string().nullable(),
    website: yup.string().url(t("Please enter a valid URL")).nullable(),
    license_number: yup.string().max(50, t("License number is too long")).nullable(),
    tax_number: yup.string().max(50, t("Tax number is too long")).nullable(),
    company_code: yup.string().nullable(),
    paye_reference: yup.string().nullable(),
    mname: yup.string().nullable(),
    pension_provider: yup.string().nullable(),
    is_sponsor_licence: yup.boolean().nullable(),
    // For update/edit, make these optional since old records won't have them
    selected_country: yup.string().nullable(),
    timezone: yup.string().nullable(),
    currency: yup.string().nullable(),
    // Address
    address_1: yup.string().nullable(),
    address_2: yup.string().nullable(),
    state: yup.string().nullable(),
    city: yup.string().nullable(),
    zipcode: yup.string().nullable(),
  });

  const { reset, control, setValue, handleSubmit, formState: { errors } } = useForm({
    mode: "all",
    shouldFocusError: false,
    resolver: yupResolver(ProfileSchema),
    defaultValues: {
      fname: "",
      lname: "",
      company_name: "",
      email: "",
      // Default to empty mobile (no digits). Country defaults to US below
      mobile: "",
      country_code: { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
      website: "",
      company_code: "",
      license_number: "",
      tax_number: "",
      paye_reference: "",
      mname: "",
      pension_provider: "",
      is_sponsor_licence: false,
      selected_country: "",
      timezone: "",
      currency: "",
      address_1: "",
      address_2: "",
      state: "",
      city: "",
      zipcode: "",
    },
  });

  // Fetch company details on mount
  useEffect(() => {
    dispatch(getCompanyDetails());
  }, [dispatch]);

  // Reset form when company details are loaded
  useEffect(() => {
    if (companyStore.actionFlag === "GET_COMPANY_SCS" && companyStore.companyItem) {
      const company = companyStore.companyItem;
      // Notification("Success", companyStore.success, "success");

      // Set selected values for dropdowns first
      if (company.selected_country) {
        const country = countryList.find(c => c.value === company.selected_country);
        if (country) {
          setSelectedCountry(country);
          setValue('selected_country', country.value);
        }
      }
      if (company.timezone) {
        const tz = timezoneList.find(t => t.value === company.timezone);
        if (tz) {
          setSelectedTimezone(tz);
          setValue('timezone', tz.value);
        }
      }
      if (company.currency) {
        const curr = getCurrencyByCode(company.currency);
        if (curr) {
          setSelectedCurrency(curr);
          setValue('currency', curr.value);
        }
      }

      // Then reset the form
      reset({
        fname: company.contact_first_name || "",
        mname: company.contact_middle_name || "",
        lname: company.contact_last_name || "",
        company_name: company.company_name || "",
        email: company.email || "",
        mobile: company.mobile ? `${company.country_code?.dialCode || ""}${company.mobile}` : "",
        country_code: company.country_code || { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
        website: company.website || "",
        company_code: company.company_code || "",
        license_number: company.license_number || "",
        tax_number: company.tax_number || "",
        paye_reference: company.paye_reference || "",
        pension_provider: company.pension_provider || "",
        is_sponsor_licence: company.is_sponsor_licence || false,
        selected_country: company.selected_country || "",
        timezone: company.timezone || "",
        currency: company.currency || "",
        address_1: company.address_1 || "",
        address_2: company.address_2 || "",
        state: company.state || "",
        city: company.city || "",
        zipcode: company.zipcode || "",
      });
    }
  }, [companyStore, reset, countryList, timezoneList, setValue]);


  const handleChangeMobile = (name, value, data) => {
    setValue(name, value);
    setValue("country_code", data);
  };
  const onSubmit = (values) => {
    const dialCode = values.country_code?.dialCode || "";
    let mobileValue = values.mobile || "";

    // Remove dial code from start if user typed number
    if (mobileValue.startsWith(dialCode)) {
      mobileValue = mobileValue.slice(dialCode.length);
    }

    mobileValue = mobileValue.trim();

    const payload = {
      contact_first_name: values.fname,
      contact_middle_name: values.mname,
      contact_last_name: values.lname,
      company_name: values.company_name,
      email: values.email,
      mobile: mobileValue,
      website: values.website,
      company_code: values.company_code,
      license_number: values.license_number,
      tax_number: values.tax_number,
      paye_reference: values.paye_reference,
      pension_provider: values.pension_provider,
      is_sponsor_licence: values.is_sponsor_licence || false,
      selected_country: values.selected_country,
      timezone: values.timezone,
      currency: values.currency,
      address_1: values.address_1,
      address_2: values.address_2,
      state: values.state,
      city: values.city,
      zipcode: values.zipcode,
    };

    // Only include country_code when mobile is provided
    if (mobileValue) {
      payload.country_code = values.country_code;
    }

    // Dispatch the action to update company profile
    setSubmitting(true);
    dispatch(updateCompanyProfile(payload))
      .unwrap()
      .then(() => {
        dispatch(getCompanyDetails());
        Notification("Success", t("Company profile updated successfully!"), "success");
      })
      .catch((error) => {
        Notification("Error", error?.message || t("Failed to update company profile"), "warning");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };



  const isAdmin = companyStore?.companyItem?.name?.trim().toLowerCase() === "admin";

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>

            {/* ── Company Information ── */}
            <h6 className="fw-bold text-uppercase text-muted mb-1 mt-1">{t("Company Information")}</h6>
            <hr className="mt-0 mb-2" />
            <Row>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Name")} <span className="text-danger">*</span></Label>
                <Controller name="company_name" control={control}
                  render={({ field }) => <Input {...field} invalid={!!errors.company_name} disabled={isReadOnly} />} />
                <FormFeedback>{errors.company_name?.message}</FormFeedback>
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Code")}</Label>
                <Controller name="company_code" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>

              <div className="mb-2 col-lg-4 col-md-4">
                <Label>{t("Contact First Name")} <span className="text-danger">*</span></Label>
                <Controller name="fname" control={control}
                  render={({ field }) => <Input {...field} invalid={!!errors.fname} disabled={isReadOnly} />} />
                <FormFeedback>{errors.fname?.message}</FormFeedback>
              </div>
              <div className="mb-2 col-lg-4 col-md-4">
                <Label>{t("Contact Middle Name")}</Label>
                <Controller name="mname" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-4 col-md-4">
                <Label>{t("Contact Last Name")} <span className="text-danger">*</span></Label>
                <Controller name="lname" control={control}
                  render={({ field }) => <Input {...field} invalid={!!errors.lname} disabled={isReadOnly} />} />
                <FormFeedback>{errors.lname?.message}</FormFeedback>
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Email")}</Label>
                <Controller name="email" control={control}
                  render={({ field }) => <Input {...field} type="email" disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Mobile")}</Label>
                <Controller name="mobile" control={control}
                  render={({ field }) => (
                    <PhoneInput {...field} disabled={isReadOnly} autoComplete="off" inputClass="w-100"
                      country={companyStore.companyItem?.country_code?.countryCode?.toLowerCase() || 'gb'}
                      value={field.value || ""} disableDropdown={disableCountryDropdown || isReadOnly}
                      countryCodeEditable={countryCodeEditable && !isReadOnly}
                      onChange={(val, data) => handleChangeMobile("mobile", val, data)} />
                  )} />
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Registration Number")}</Label>
                <Controller name="license_number" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Tax / VAT Number")}</Label>
                <Controller name="tax_number" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("PAYE Reference Number")}</Label>
                <Controller name="paye_reference" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Pension Provider")}</Label>
                <Controller name="pension_provider" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>

              <div className="mb-2 col-lg-6 col-md-6 d-flex align-items-center pt-2">
                <Controller name="is_sponsor_licence" control={control}
                  render={({ field }) => (
                    <Input type="checkbox" id="is_sponsor_licence" checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)} className="me-1" disabled={isReadOnly} />
                  )} />
                <Label for="is_sponsor_licence" className="mb-0">{t("Does business hold a sponsor licence?")}</Label>
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Website")}</Label>
                <Controller name="website" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} invalid={!!errors.website} />} />
                <FormFeedback>{errors.website?.message}</FormFeedback>
              </div>
            </Row>

            {/* ── Timezone & Currency ── */}
            <h6 className="fw-bold text-uppercase text-muted mb-1 mt-2">{t("Timezone & Currency")}</h6>
            <hr className="mt-0 mb-2" />
            <Row>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Timezone")}</Label>
                <Controller name="timezone" control={control}
                  render={({ field }) => (
                    <Select options={timezoneList} value={selectedTimezone} isDisabled={isReadOnly}
                      onChange={(o) => { setSelectedTimezone(o); const v = o?.value || ''; setValue('timezone', v); field.onChange(v); }}
                      onBlur={field.onBlur} placeholder={t("Select timezone")} isClearable isSearchable styles={selectStyles} />
                  )} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Currency")}</Label>
                <Controller name="currency" control={control}
                  render={({ field }) => (
                    <Select options={currencyList} value={selectedCurrency} isDisabled={isReadOnly}
                      onChange={(o) => { setSelectedCurrency(o); const v = o?.value || ''; setValue('currency', v); field.onChange(v); }}
                      onBlur={field.onBlur} placeholder={t("Select currency")} isClearable isSearchable styles={selectStyles} />
                  )} />
              </div>
            </Row>

            {/* ── Address ── */}
            <h6 className="fw-bold text-uppercase text-muted mb-1 mt-2">{t("Address")}</h6>
            <hr className="mt-0 mb-2" />
            <Row>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Address Line 1")}</Label>
                <Controller name="address_1" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Address Line 2")}</Label>
                <Controller name="address_2" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("State")}</Label>
                <Controller name="state" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("City")}</Label>
                <Controller name="city" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Post Code")}</Label>
                <Controller name="zipcode" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Country")}</Label>
                <Controller name="selected_country" control={control}
                  render={({ field }) => (
                    <Select options={countryList} value={selectedCountry} isDisabled={isReadOnly}
                      onChange={(o) => {
                        setSelectedCountry(o); const v = o?.value || '';
                        setValue('selected_country', v); setValue('country', o?.label || ''); field.onChange(v);
                        if (o) {
                          const tz = getPrimaryTimezoneByCountry(o.value);
                          if (tz) { const tzObj = timezoneList.find(t => t.value === tz); if (tzObj) { setSelectedTimezone(tzObj); setValue('timezone', tzObj.value); } }
                          const cur = autoDetectCurrency(o.value);
                          if (cur) { setSelectedCurrency(cur); setValue('currency', cur.value); }
                        }
                      }}
                      onBlur={field.onBlur} placeholder={t("Select country")} isClearable isSearchable styles={selectStyles} />
                  )} />
              </div>
            </Row>

            <div className="d-flex justify-content-end mt-3 gap-2 pt-2 pb-2">
              <Button type="submit" color="primary" disabled={isReadOnly || submitting}>
                {submitting ? <Spinner size="sm" /> : t("Save")}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default Step1CompanyDetails;