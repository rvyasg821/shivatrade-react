// ** React Imports
import { Fragment, useEffect, useState } from "react";
import { ArrowLeft } from "react-feather";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getCompany, updateCompanyDetails, createCompany, resetCompanyLoading } from "@src/views/auth/profile/editCompany/store";

// ** Reactstrap Imports
import { Row, Form, Label, Input, CardBody, Card, Button, Spinner, FormFeedback } from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

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
  autoDetectCountryAndTimezone,
  selectStyles
} from "@src/views/auth/register/utils/countryTimezoneUtils";
import {
  getCurrencyList,
  autoDetectCurrency,
  getCurrencyByCode
} from "@src/views/auth/register/utils/currencyUtils";

// ** Styles
import "react-phone-input-2/lib/style.css";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { useNavigate, useParams } from "react-router-dom";
import {
  appsRoot,

} from "@constant/defaultValues";
import { startLoading, stopLoading } from "../../loadingstore";

const CompanyProfileForm = ({ onCompanyUpdated }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.company);

  // State for dropdowns
  const [countryList] = useState(getCountryList());
  const [timezoneList] = useState(getTimezoneList());
  const [currencyList] = useState(getCurrencyList());
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [phoneCountry, setPhoneCountry] = useState("gb");
  const [emailExists, setEmailExists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const id = useParams();

  const CompanySchema = yup.object().shape({
    company_name: yup.string().required(`${t("Company Name is required")}.`),
    contact_first_name: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    contact_last_name: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    mobile: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    website: yup.string().transform((v) => (v === "" ? null : v)).url(t("Please enter a valid URL")).nullable(),
    license_number: yup.string().transform((v) => (v === "" ? null : v)).max(50, t("License number is too long")).nullable(),
    tax_number: yup.string().transform((v) => (v === "" ? null : v)).max(50, t("Tax number is too long")).nullable(),
    email: id?.id
      ? yup.string().transform((v) => (v === "" ? null : v)).email(t("Please enter a valid email")).nullable()
      : yup.string().email(t("Please enter a valid email")).required(t("Email is required")),
    // For update form, make these optional since old records won't have them
    selected_country: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    timezone: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    currency: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    // New fields
    company_code: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    paye_reference: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    contact_middle_name: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    pension_provider: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    is_sponsor_licence: yup.boolean().nullable(),
    // Address fields
    address_1: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    address_2: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    state: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    city: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    zipcode: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
  });

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    shouldFocusError: false,
    defaultValues: {
      company_name: "",
      contact_first_name: "",
      contact_middle_name: "",
      contact_last_name: "",
      email: "",
      mobile: "",
      website: "",
      company_code: "",
      license_number: "",
      tax_number: "",
      paye_reference: "",
      pension_provider: "",
      is_sponsor_licence: false,
      selected_country: "",
      timezone: "",
      currency: "",
      country_code: { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
      address_1: "",
      address_2: "",
      state: "",
      city: "",
      zipcode: "",
    },
    resolver: yupResolver(CompanySchema),
  });
  useEffect(() => {
    // In create mode (no id), don't show global loading and reset store loading
    if (!id?.id) {
      dispatch(stopLoading());
      dispatch(resetCompanyLoading());
      return;
    }
    if (store?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [store?.loading, id?.id])
  // Set defaults for create mode — auto-detect country, timezone, currency, phone code
  useEffect(() => {
    if (id?.id) return; // skip in edit mode

    const detectDefaults = async () => {
      try {
        const detected = await autoDetectCountryAndTimezone();

        if (detected.country) {
          // Set country
          setSelectedCountry(detected.country);
          setValue('selected_country', detected.country.value);

          // Set phone country code
          if (detected.country.code) {
            setPhoneCountry(detected.country.code.toLowerCase());
          }

          // Set timezone
          const primaryTimezone = getPrimaryTimezoneByCountry(detected.country.value);
          if (primaryTimezone) {
            const tzObj = timezoneList.find(tz => tz.value === primaryTimezone);
            if (tzObj) { setSelectedTimezone(tzObj); setValue('timezone', tzObj.value); }
          }

          // Set currency
          const detectedCurrency = autoDetectCurrency(detected.country.value);
          if (detectedCurrency) { setSelectedCurrency(detectedCurrency); setValue('currency', detectedCurrency.value); }
        }
      } catch (e) {
        console.warn('Auto-detect failed:', e);
      }
    };
    detectDefaults();
  }, []);

  // Load company details (edit mode only)
  useEffect(() => {
    if (!id?.id) return; // skip in create mode
    const company = store?.companyItem;

    if (company && Object.keys(company).length > 0) {
      // Set selected values for dropdowns first
      if (company.selected_country) {
        const country = countryList.find(c => c.value === company.selected_country);
        if (country) {
          setSelectedCountry(country);
          setValue('selected_country', country.value);
        }
      } else {
        // Clear the dropdowns for old records without these fields
        setSelectedCountry(null);
        setSelectedTimezone(null);
        setSelectedCurrency(null);
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
        company_name: company.company_name || "",
        contact_first_name: company.contact_first_name || "",
        contact_middle_name: company.contact_middle_name || "",
        contact_last_name: company.contact_last_name || "",
        email: company.email || "",
        mobile: company.mobile
          ? `${company.country_code?.dialCode || ""}${company.mobile}`
          : "",
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
        country_code:
          company.country_code || { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
        status: company?.status || "",
        address_1: company.address_1 || "",
        address_2: company.address_2 || "",
        state: company.state || "",
        city: company.city || "",
        zipcode: company.zipcode || "",
      });
    }
  }, [store?.companyItem, reset, countryList, timezoneList, setValue]);

  const handleChangeMobile = (value, data) => {
    setValue("mobile", value);
    setValue("country_code", data);
  };
  useEffect(() => {
    if (id?.id) {
      dispatch(getCompany(id));
    }
  }, [dispatch, id?.id]);
  const onSubmit = async (values) => {
    if (emailExists) {
      Notification("Error", t("This email already exists."), "warning");
      return;
    }
    setSubmitting(true);
    try {
      const dialCode = values.country_code?.dialCode || "";
      let mobileValue = values.mobile || "";
      if (mobileValue.startsWith(dialCode)) mobileValue = mobileValue.slice(dialCode.length);
      mobileValue = mobileValue.trim();

      const payload = {
        company_name: values.company_name,
        contact_name: `${values.contact_first_name || ''} ${values.contact_last_name || ''}`.trim() || values.company_name,
        contact_first_name: values.contact_first_name,
        contact_middle_name: values.contact_middle_name,
        contact_last_name: values.contact_last_name,
        email: values.email,
        mobile: mobileValue,
        country_code: values.country_code || { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
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
        status: values.status || "",
        address_1: values.address_1,
        address_2: values.address_2,
        state: values.state,
        city: values.city,
        zipcode: values.zipcode,
      };

      const companyId = store.companyItem?._id || id?.id;

      if (companyId) {
        // Update existing company
        try {
          const result = await dispatch(updateCompanyDetails({ companyId, payload })).unwrap();
          if (result.actionFlag === "UPDATE_COMPANY_DETAILS_SCS") {
            Notification("Success", "Company updated successfully", "success");
            navigate(`${appsRoot}/company`);
            if (onCompanyUpdated) onCompanyUpdated();
          }
        } catch (err) {
          Notification("Error", err?.message || "Update failed", "warning");
        }
      } else {
        // Create new company
        try {
          const result = await dispatch(createCompany(payload)).unwrap();
          if (result.actionFlag === "COMPANY_CREATED") {
            Notification("Success", "Company created successfully. Welcome email sent.", "success");
            navigate(`${appsRoot}/company`);
          }
        } catch (err) {
          Notification("Error", err?.message || err || "Create failed", "warning");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <Fragment>
      {/* Page Header */}
      

      <div className="main-content">
        <Card>
          <CardBody>
            <Fragment>


            <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>

              {/* ── Company Information ── */}
              <h6 className="fw-bold text-uppercase text-muted mb-1 mt-1">{t("Company Information")}</h6>
              <hr className="mt-0 mb-2" />
              <Row>
                {/* Row 1: Company Name, Company Code */}
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="company_name">{t("Company Name")} <span className="text-danger">*</span></Label>
                  <Controller name="company_name" control={control}
                    render={({ field }) => <Input {...field} invalid={!!errors.company_name} />}
                  />
                  <FormFeedback>{errors.company_name?.message}</FormFeedback>
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="company_code">{t("Company Code")}</Label>
                  <Controller name="company_code" control={control}
                    render={({ field }) => <Input {...field} placeholder={t("Auto-generated if empty")} />}
                  />
                </div>

                {/* Row 2: First Name, Middle Name, Last Name */}
                <div className="mb-2 col-lg-4 col-md-4">
                  <Label for="contact_first_name">{t("Contact First Name")}</Label>
                  <Controller name="contact_first_name" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-4 col-md-4">
                  <Label for="contact_middle_name">{t("Contact Middle Name")}</Label>
                  <Controller name="contact_middle_name" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-4 col-md-4">
                  <Label for="contact_last_name">{t("Contact Last Name")}</Label>
                  <Controller name="contact_last_name" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>

                {/* Row 3: Email, Mobile */}
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="email">{t("Email")} <span className="text-danger">*</span></Label>
                  <Controller name="email" control={control}
                    render={({ field }) => (
                      <Input {...field} type="email" disabled={!!id?.id}
                        invalid={!!errors.email || !!emailExists}
                        onBlur={async (e) => {
                          field.onBlur(e);
                          const val = e.target.value?.trim();
                          if (!val) { setEmailExists(false); return; }
                          if (id?.id) return;
                          try {
                            const res = await instance.post(API_ENDPOINTS.company.checkEmail, { email: val });
                            setEmailExists(!!res.data?.data?.exists);
                          } catch { setEmailExists(false); }
                        }}
                      />
                    )}
                  />
                  <FormFeedback>{errors.email?.message}</FormFeedback>
                  {emailExists && <div className="text-danger small mt-25">{t("This email already exists.")}</div>}
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="mobile">{t("Mobile")}</Label>
                  <Controller name="mobile" control={control}
                    render={({ field }) => (
                      <PhoneInput {...field}
                        key={`phone-${phoneCountry}`}
                        country={store?.companyItem?.country_code?.countryCode?.toLowerCase() || phoneCountry}
                        value={field.value || ""} inputClass="w-100"
                        disableDropdown={disableCountryDropdown} countryCodeEditable={countryCodeEditable}
                        placeholder="" onChange={handleChangeMobile}
                      />
                    )}
                  />
                </div>

                {/* Row 4: License Number, Tax Number */}
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="license_number">{t("Company Registration Number")}</Label>
                  <Controller name="license_number" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="tax_number">{t("Tax / VAT Number")}</Label>
                  <Controller name="tax_number" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>

                {/* Row 5: PAYE Reference, Pension Provider */}
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="paye_reference">{t("PAYE Reference Number")}</Label>
                  <Controller name="paye_reference" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="pension_provider">{t("Pension Provider")}</Label>
                  <Controller name="pension_provider" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>

                {/* Row 6: Sponsor Licence, Website */}
                <div className="mb-2 col-lg-6 col-md-6 d-flex align-items-center pt-2">
                  <Controller name="is_sponsor_licence" control={control}
                    render={({ field }) => (
                      <Input type="checkbox" id="is_sponsor_licence" checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)} className="me-1" />
                    )}
                  />
                  <Label for="is_sponsor_licence" className="mb-0">{t("Does business hold a sponsor licence?")}</Label>
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="website">{t("Website")}</Label>
                  <Controller name="website" control={control}
                    render={({ field }) => <Input {...field} invalid={!!errors.website} />}
                  />
                  <FormFeedback>{errors.website?.message}</FormFeedback>
                </div>
              </Row>

              {/* ── Timezone & Currency ── */}
              <h6 className="fw-bold text-uppercase text-muted mb-1 mt-2">{t("Timezone & Currency")}</h6>
              <hr className="mt-0 mb-2" />
              <Row>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="timezone">{t("Timezone")}</Label>
                  <Controller name="timezone" control={control}
                    render={({ field }) => (
                      <Select options={timezoneList} value={selectedTimezone}
                        onChange={(option) => { setSelectedTimezone(option); const v = option?.value || ''; setValue('timezone', v); field.onChange(v); }}
                        onBlur={field.onBlur} placeholder={t("Select timezone")} isClearable isSearchable styles={selectStyles}
                      />
                    )}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="currency">{t("Currency")}</Label>
                  <Controller name="currency" control={control}
                    render={({ field }) => (
                      <Select options={currencyList} value={selectedCurrency}
                        onChange={(option) => { setSelectedCurrency(option); const v = option?.value || ''; setValue('currency', v); field.onChange(v); }}
                        onBlur={field.onBlur} placeholder={t("Select currency")} isClearable isSearchable styles={selectStyles}
                      />
                    )}
                  />
                </div>
              </Row>

              {/* ── Address ── */}
              <h6 className="fw-bold text-uppercase text-muted mb-1 mt-2">{t("Address")}</h6>
              <hr className="mt-0 mb-2" />
              <Row>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="address_1">{t("Address Line 1")}</Label>
                  <Controller name="address_1" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="address_2">{t("Address Line 2")}</Label>
                  <Controller name="address_2" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="state">{t("State")}</Label>
                  <Controller name="state" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="city">{t("City")}</Label>
                  <Controller name="city" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="zipcode">{t("Post Code")}</Label>
                  <Controller name="zipcode" control={control}
                    render={({ field }) => <Input {...field} />}
                  />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="selected_country">{t("Country")}</Label>
                  <Controller name="selected_country" control={control}
                    render={({ field }) => (
                      <Select options={countryList} value={selectedCountry}
                        onChange={(option) => {
                          setSelectedCountry(option);
                          const value = option?.value || '';
                          setValue('selected_country', value);
                          setValue('country', option?.label || '');
                          field.onChange(value);
                          if (option) {
                            const primaryTimezone = getPrimaryTimezoneByCountry(option.value);
                            if (primaryTimezone) {
                              const tzObj = timezoneList.find(tz => tz.value === primaryTimezone);
                              if (tzObj) { setSelectedTimezone(tzObj); setValue('timezone', tzObj.value); }
                            }
                            const detectedCurrency = autoDetectCurrency(option.value);
                            if (detectedCurrency) { setSelectedCurrency(detectedCurrency); setValue('currency', detectedCurrency.value); }
                          }
                        }}
                        onBlur={field.onBlur} placeholder={t("Select country")} isClearable isSearchable styles={selectStyles}
                      />
                    )}
                  />
                </div>
              </Row>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button type="submit" color="primary" disabled={store.loading}>
                  {store.loading ? <Spinner size="sm" /> : t("Save")}
                </Button>

              </div>
            </Form>
            </Fragment>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default CompanyProfileForm;
