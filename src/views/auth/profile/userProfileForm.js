// ** React Imports
import { Fragment, useEffect, useState } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { authUpdateMe } from "../store";
import { getCompanyDetails, updateCompanyProfile } from "./editCompany/store";
import Avatar from "@src/assets/images/avatars/avatar.jpeg";
import {handleImgSrcError}from "@src/utility/Utils";

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
import { useNavigate } from "react-router-dom";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Constant
import { countryCodeEditable, disableCountryDropdown,hostRestApiUrl,appsRoot } from "@constant/defaultValues";
import { initUserItem } from "@constant/reduxConstant";

// ** Utilities
import {
  getCountryList,
  getTimezoneList,
  getPrimaryTimezoneByCountry,
  selectStyles
} from "../register/utils/countryTimezoneUtils";
import {
  getCurrencyList,
  autoDetectCurrency,
  getCurrencyByCode
} from "../register/utils/currencyUtils";

// ** Styles
import "react-phone-input-2/lib/style.css";
import { startLoading, stopLoading } from "../../loadingstore";

const UserProfileForm = ({ toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const store = useSelector((state) => state.auth);
  const companyStore = useSelector((state) => state.company);

  // State for company dropdowns
  const [countryList] = useState(getCountryList());
  const [timezoneList] = useState(getTimezoneList());
  const [currencyList] = useState(getCurrencyList());
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  const ProfileSchema = yup.object().shape({
    fname: yup.string().required(`${t("First Name is required")}.`),
    lname: yup.string().required(`${t("Last Name is required")}.`),
    email: yup
      .string()
      .required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
    mobile: yup.string().nullable(),
    gender: yup.string().required(`${t("Gender is required")}.`),
    // Company fields (optional for existing records)
    website: yup.string().url(t("Please enter a valid URL")).nullable(),
    license_number: yup.string().max(50, t("License number is too long")).nullable(),
    tax_number: yup.string().max(50, t("Tax number is too long")).nullable(),
    selected_country: yup.string().nullable(),
    timezone: yup.string().nullable(),
    currency: yup.string().nullable(),
    // Address fields
    address_1: yup.string().nullable(),
    address_2: yup.string().nullable(),
    city: yup.string().nullable(),
    state: yup.string().nullable(),
    zipcode: yup.string().nullable(),
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
      fname: "",
      lname: "",
      email: "",
      mobile: "",
      gender: "",
      country_code: { dialCode: "1", countryCode: "us", name: "United States" },
      // Company fields
      website: "",
      license_number: "",
      tax_number: "",
      selected_country: "",
      timezone: "",
      currency: "",
      // Address fields
      address_1: "",
      address_2: "",
      city: "",
      state: "",
      zipcode: "",
    },
    resolver: yupResolver(ProfileSchema),
  });

  // Load company data
  useEffect(() => {
    dispatch(getCompanyDetails());
  }, [dispatch]);

  // convert url into base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  // Load user data
  useEffect(() => {
    const user = store?.authUserItem;
    if (!user) return;

    const firstName = user.first_name || user.name?.split(" ")[0] || "";
    const lastName = user.last_name || user.name?.split(" ").slice(1).join(" ") || "";

    reset({
      fname: firstName,
      lname: lastName,
      email: user.email || "",
      mobile: user.mobile ? `${(user.country_code?.dialCode || "")}${user.mobile}` : "",
      gender: user.gender || "",
      photo: user.photo,
      country_code: user.country_code || { dialCode: "1", countryCode: "us", name: "United States" },
      // Company fields will be loaded separately
      website: "",
      license_number: "",
      tax_number: "",
      selected_country: "",
      timezone: "",
      currency: "",
    });
  }, [store?.authUserItem, reset]);

  // Load company data into form
  useEffect(() => {
    if (companyStore.actionFlag === "GET_COMPANY_SCS" && companyStore.companyItem) {
      const company = companyStore.companyItem;

      // Set dropdown values for company fields
      if (company.selected_country) {
        const country = countryList.find(c => c.value === company.selected_country);
        if (country) {
          setSelectedCountry(country);
          setValue('selected_country', country.value);
          setValue('country', country.label);
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

      // Set other company fields
      setValue('website', company.website || '');
      setValue('license_number', company.license_number || '');
      setValue('tax_number', company.tax_number || '');

      // Set address fields
      setValue('address_1', company.address_1 || '');
      setValue('address_2', company.address_2 || '');
      setValue('city', company.city || '');
      setValue('state', company.state || '');
      setValue('zipcode', company.zipcode || '');
    }
  }, [companyStore, countryList, timezoneList, setValue]);

  const handleChangeMobile = (name, value, data) => {
    setValue(name, value);
    setValue("country_code", data);
  };

  const onSubmit = async (values) => {
    const dialCode = values.country_code?.dialCode || "";
    let mobileValue = values.mobile || "";

    if (mobileValue.startsWith(dialCode)) {
      mobileValue = mobileValue.slice(dialCode.length);
    }

    mobileValue = mobileValue.trim();

    let photoValue = values.photo;
    if (photoValue instanceof File) {
      photoValue = await fileToBase64(photoValue);
    }

    // User data
    const usrData = {
      first_name: values.fname,
      last_name: values.lname,
      email: values.email,
      mobile: mobileValue,
      gender: values.gender,
      photo: photoValue
    };

    if (mobileValue) {
      usrData.country_code = values.country_code;
    }

    // Company data
    const companyData = {
      website: values.website,
      license_number: values.license_number,
      tax_number: values.tax_number,
      selected_country: values.selected_country,
      country: values.country,
      timezone: values.timezone,
      currency: values.currency,
      address_1: values.address_1,
      address_2: values.address_2,
      city: values.city,
      state: values.state,
      zipcode: values.zipcode,
    };

    try {
      // Update user profile
      const userResult = await dispatch(authUpdateMe(usrData)).unwrap();

      // Update company details using my-company endpoint
      await dispatch(updateCompanyProfile(companyData)).unwrap();

      if (userResult?.actionFlag === "UPDATE_PROFILE_SCS" || userResult?.success) {
        Notification("Success", "Profile updated successfully", "success");
        navigate(`${appsRoot}/profile`);
      } else {
        Notification("Error", "Failed to update profile", "error");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      Notification("Error", "Profile update failed", "error");
    }
  };

  const isAdmin = store?.authUserItem?.name?.trim().toLowerCase() === "admin";

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [store?.loading])

  const getBackendImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith("http")) return photo;
    const cleanPath = photo.replace(/^\/+/, "");
    return `${hostRestApiUrl}/${cleanPath}`;
  };

  return (
    <div className="main-content">
      <Card>
        <CardBody>
          <Fragment>
            <Form className="mt-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)} >

              {/* ── Personal Information ── */}
              <h5 className="mb-2 fw-bold">{t("Personal Information")}</h5>
              <Row>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label className="form-label">{t("First Name")} <span className="text-danger">*</span></Label>
                  <Controller name="fname" control={control} render={({ field }) => (
                    <Input {...field} invalid={!!errors.fname} />
                  )} />
                  <FormFeedback>{errors.fname?.message}</FormFeedback>
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label className="form-label">{t("Last Name")} <span className="text-danger">*</span></Label>
                  <Controller name="lname" control={control} render={({ field }) => (
                    <Input {...field} invalid={!!errors.lname} />
                  )} />
                  <FormFeedback>{errors.lname?.message}</FormFeedback>
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label className="form-label">{t("Email")} <span className="text-danger">*</span></Label>
                  <Controller name="email" control={control} render={({ field }) => (
                    <Input {...field} invalid={!!errors.email} disabled />
                  )} />
                  <FormFeedback>{errors.email?.message}</FormFeedback>
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label className="form-label">{t("Mobile")}</Label>
                  <Controller name="mobile" control={control} render={({ field }) => (
                    <PhoneInput
                      {...field}
                      autoComplete="off"
                      inputClass="w-100"
                      country={((typeof field.value === 'string' && field.value.startsWith('1')) ? 'us' : 'us')}
                      inputProps={{ name: "mobile" }}
                      disableDropdown={disableCountryDropdown}
                      countryCodeEditable={countryCodeEditable}
                      onChange={(val, data) => handleChangeMobile("mobile", val, data)}
                    />
                  )} />
                  <FormFeedback>{errors.mobile?.message}</FormFeedback>
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label className="form-label">{t("Photo")}</Label>
                  <Controller name="photo" control={control} render={({ field }) => {
                    const value = field.value;
                    const imageUrl = getBackendImageUrl(typeof value === "string" ? value : null);
                    const previewUrl = value instanceof File ? URL.createObjectURL(value) : null;
                    return (
                      <>
                        <div className="file-wrapper d-flex">
                          <Input type="file" id="photo" accept="image/*" className="form-control"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) field.onChange(file); }} />
                          {imageUrl && !previewUrl && (
                            <img src={imageUrl} className="file-preview-icon fileicon" alt="" onError={(e) => handleImgSrcError(e, Avatar)} />
                          )}
                          {previewUrl && (
                            <img src={previewUrl} className="file-preview-icon fileicon" alt="" onError={(e) => handleImgSrcError(e, Avatar)} />
                          )}
                        </div>
                      </>
                    );
                  }} />
                </div>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label className="form-label">{t("Gender")} <span className="text-danger">*</span></Label>
                  <Controller name="gender" control={control} render={({ field }) => (
                    <div className="d-flex gap-2 mt-50">
                      {["MALE", "FEMALE"].map((g) => (
                        <div className="form-check" key={g}>
                          <Input type="radio" id={`gender-${g}`} value={g} checked={field.value === g} onChange={() => field.onChange(g)} />
                          <Label className="form-check-label" htmlFor={`gender-${g}`}>{t(g.charAt(0) + g.slice(1).toLowerCase())}</Label>
                        </div>
                      ))}
                    </div>
                  )} />
                  <FormFeedback className="d-block">{errors.gender?.message}</FormFeedback>
                </div>
              </Row>

              {/* ── Company Information ── */}
              <h5 className="mt-3 mb-2 fw-bold">{t("Company Information")}</h5>
              <Row>
                {/* Country */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="selected_country">{t("Country")}</Label>
                  <Controller
                    name="selected_country"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={countryList}
                        value={selectedCountry}
                        onChange={(option) => {
                          setSelectedCountry(option);
                          const value = option?.value || '';
                          setValue('selected_country', value);
                          setValue('country', option?.label || '');
                          field.onChange(value);

                          // Auto-update timezone and currency
                          if (option) {
                            const primaryTimezone = getPrimaryTimezoneByCountry(option.value);
                            if (primaryTimezone) {
                              const timezoneObj = timezoneList.find(tz => tz.value === primaryTimezone);
                              if (timezoneObj) {
                                setSelectedTimezone(timezoneObj);
                                setValue('timezone', timezoneObj.value);
                              }
                            }

                            const detectedCurrency = autoDetectCurrency(option.value);
                            if (detectedCurrency) {
                              setSelectedCurrency(detectedCurrency);
                              setValue('currency', detectedCurrency.value);
                            }
                          }
                        }}
                        onBlur={field.onBlur}
                        placeholder={t("Select country")}
                        isClearable
                        isSearchable
                        styles={selectStyles}
                        className={errors.selected_country ? 'is-invalid' : ''}
                      />
                    )}
                  />
                  <FormFeedback className="d-block">{errors.selected_country?.message}</FormFeedback>
                </div>

                {/* Timezone */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="timezone">{t("Timezone")}</Label>
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={timezoneList}
                        value={selectedTimezone}
                        onChange={(option) => {
                          setSelectedTimezone(option);
                          const value = option?.value || '';
                          setValue('timezone', value);
                          field.onChange(value);
                        }}
                        onBlur={field.onBlur}
                        placeholder={t("Select timezone")}
                        isClearable
                        isSearchable
                        styles={selectStyles}
                        className={errors.timezone ? 'is-invalid' : ''}
                      />
                    )}
                  />
                  <FormFeedback className="d-block">{errors.timezone?.message}</FormFeedback>
                </div>

                {/* Currency */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="currency">{t("Currency")}</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={currencyList}
                        value={selectedCurrency}
                        onChange={(option) => {
                          setSelectedCurrency(option);
                          const value = option?.value || '';
                          setValue('currency', value);
                          field.onChange(value);
                        }}
                        onBlur={field.onBlur}
                        placeholder={t("Select currency")}
                        isClearable
                        isSearchable
                        styles={selectStyles}
                        className={errors.currency ? 'is-invalid' : ''}
                      />
                    )}
                  />
                  <FormFeedback className="d-block">{errors.currency?.message}</FormFeedback>
                </div>

                {/* License Number */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="license_number">{t("License Number")}</Label>
                  <Controller
                    name="license_number"
                    control={control}
                    render={({ field }) => <Input {...field} invalid={!!errors.license_number} />}
                  />
                  <FormFeedback>{errors.license_number?.message}</FormFeedback>
                </div>

                {/* Tax Number */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="tax_number">{t("Tax Number")}</Label>
                  <Controller
                    name="tax_number"
                    control={control}
                    render={({ field }) => <Input {...field} invalid={!!errors.tax_number} />}
                  />
                  <FormFeedback>{errors.tax_number?.message}</FormFeedback>
                </div>

                {/* Website */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="website">{t("Website")}</Label>
                  <Controller
                    name="website"
                    control={control}
                    render={({ field }) => <Input {...field} invalid={!!errors.website} />}
                  />
                  <FormFeedback>{errors.website?.message}</FormFeedback>
                </div>

              </Row>

              {/* ── Address ── */}
              <h5 className="mt-3 mb-2 fw-bold">{t("Address")}</h5>
              <Row>
                <div className="mb-2 col-lg-6 col-md-6">
                  <Label for="address_1">{t("Address Line 1")}</Label>
                  <Controller
                    name="address_1"
                    control={control}
                    render={({ field }) => <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.address_1} />}
                  />
                  <FormFeedback>{errors.address_1?.message}</FormFeedback>
                </div>

                {/* Address Line 2 */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="address_2">{t("Address Line 2")}</Label>
                  <Controller
                    name="address_2"
                    control={control}
                    render={({ field }) => <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.address_2} />}
                  />
                  <FormFeedback>{errors.address_2?.message}</FormFeedback>
                </div>

                {/* City */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="city">{t("City")}</Label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.city} />}
                  />
                  <FormFeedback>{errors.city?.message}</FormFeedback>
                </div>

                {/* State */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="state">{t("State")}</Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.state} />}
                  />
                  <FormFeedback>{errors.state?.message}</FormFeedback>
                </div>

                {/* Zip Code */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label for="zipcode">{t("Zip Code")}</Label>
                  <Controller
                    name="zipcode"
                    control={control}
                    render={({ field }) => <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.zipcode} />}
                  />
                  <FormFeedback>{errors.zipcode?.message}</FormFeedback>
                </div>

              </Row>

              <div className="d-flex justify-content-end mt-5 profile-btn gap-2 pt-1 pb-4">
                <Button type="submit" color="primary" disabled={!store.loading}>
                  {store?.loading ? t("Save") : <Spinner size="sm" />}
                </Button>
              </div>
            </Form>
          </Fragment>
        </CardBody>
      </Card>
    </div>
  );
};

export default UserProfileForm;
