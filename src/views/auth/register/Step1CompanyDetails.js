/* eslint-disable no-use-before-define */
/* eslint-disable no-confusing-arrow */
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import InputPasswordToggle from "@components/input-password-toggle";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import { useDispatch, useSelector } from "react-redux";
import { checkUserExist, validateReferralCode, verificationOtpGenerator } from "./store";
import { Link, useLocation } from "react-router-dom";
import "react-phone-input-2/lib/style.css";
import "./Wizard.scss";
import EmailVerificationModal from "./otpVerificationModal";
import { updateUserSignup } from "../../users/store"
import { logout } from "../../auth/store/index";
import { clearLocationContext } from "@src/redux/locationContext";
import { startLoading, stopLoading } from "../../loadingstore";
import { useTranslation } from "react-i18next"
import Select from "react-select";
import {
  getCountryList,
  getTimezoneList,
  autoDetectCountryAndTimezone,
  formatCountryOption,
  selectStyles
} from "./utils/countryTimezoneUtils";
import {
  getCurrencyList,
  autoDetectCurrency,
  getCurrencyByCode
} from "./utils/currencyUtils";
import { getPrimaryTimezoneByCountry } from "./utils/countryTimezoneUtils";

const Step1CompanyDetails = ({ nextStep }) => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const referralCode = queryParams.get("referral_code");
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.register);

  const { loading, actionFlag } = store;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    if (!referralCode) return;

    const ValidateReferral = () => {
      dispatch(validateReferralCode(referralCode))
    }
    ValidateReferral()
  }, [])

  // Responsive handling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const truncate = (text, limit = 17) =>
    text.length > limit ? text.slice(0, limit) + "..." : text;

  const { control, setValue } = useForm({ defaultValues: { mobile: "" } });

  const handleChangeMobile = (field, value) => {
    setValue(field, value);
    formik.setFieldValue(field, value);
  };

  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [manualEmailError, setManualEmailError] = useState("");

  // Country, Timezone, and Currency states
  const [countryList] = useState(getCountryList());
  const [timezoneList] = useState(getTimezoneList());
  const [currencyList] = useState(getCurrencyList());
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [autoDetecting, setAutoDetecting] = useState(true);


  useEffect(() => {
    if (store.actionFlag === "USER_EXIST_SUCCESS") {
      const msg = "This email is already registered";
      formik.setFieldError("email", msg);
      setEmailAlreadyExists(true);
      setManualEmailError(msg);
    }

  }, [store.actionFlag]);

  useEffect(() => {
    if (store.registerItem?._id) {
      localStorage.setItem("registerItem", JSON.stringify(store.registerItem));
    }
  }, [store.registerItem]);

  const savedData = JSON.parse(localStorage.getItem("registerFormData") || "{}");

  // Auto-detect country, timezone, currency, and phone country code on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const detected = await autoDetectCountryAndTimezone();

        // Set detected values if not already saved
        if (!savedData.selected_country && detected.country) {
          setSelectedCountry(detected.country);
          formik.setFieldValue('selected_country', detected.country.value);

          // Auto-set phone country code based on detected country
          if (detected.country.dialCode) {
            formik.setFieldValue('country_code', {
              code: detected.country.dialCode,
              name: detected.country.label,
              countryCode: detected.country.code.toLowerCase(),
            });
          }

          // Auto-detect timezone based on country
          const primaryTimezone = getPrimaryTimezoneByCountry(detected.country.value);
          if (primaryTimezone && !savedData.timezone) {
            const timezoneObj = timezoneList.find(tz => tz.value === primaryTimezone);
            if (timezoneObj) {
              setSelectedTimezone(timezoneObj);
              formik.setFieldValue('timezone', timezoneObj.value);
            }
          }

          // Auto-detect currency based on country
          const detectedCurrency = autoDetectCurrency(detected.country.value);
          if (detectedCurrency && !savedData.currency) {
            setSelectedCurrency(detectedCurrency);
            formik.setFieldValue('currency', detectedCurrency.value);
          }
        } else if (savedData.selected_country) {
          const savedCountry = countryList.find(c => c.value === savedData.selected_country);
          if (savedCountry) setSelectedCountry(savedCountry);
        }

        // Load saved timezone
        if (savedData.timezone) {
          const savedTz = timezoneList.find(tz => tz.value === savedData.timezone);
          if (savedTz) setSelectedTimezone(savedTz);
        }

        // Load saved currency
        if (savedData.currency) {
          const savedCurr = getCurrencyByCode(savedData.currency);
          if (savedCurr) setSelectedCurrency(savedCurr);
        }
      } catch (error) {
        console.error('Error auto-detecting location:', error);
      } finally {
        setAutoDetecting(false);
      }
    };

    detectLocation();
  }, []);

  const formik = useFormik({
    initialValues: {
      company_name: savedData.company_name || "",
      fname: savedData.fname || "",
      lname: savedData.lname || "",
      email: savedData.email || "",
      mobile: savedData.mobile || "",
      country_code: savedData.country_code || { code: "+1", name: "United States", countryCode: "us" },
      password: savedData.password || "",
      website: savedData.website || "",
      license_number: savedData.license_number || "",
      tax_number: savedData.tax_number || "",
      address_1: savedData.address_1 || "",
      address_2: savedData.address_2 || "",
      state: savedData.state || "",
      city: savedData.city || "",
      country: savedData.country || "",
      zipcode: savedData.zipcode || "",
      selected_country: savedData.selected_country || "",
      timezone: savedData.timezone || "",
      currency: savedData.currency || "",
      userId: savedData.userId || "",
    },
    validationSchema: Yup.object({
      company_name: Yup.string()
        .max(50, t("Company Name is too long"))
        .required(t("Company Name is required")),
      fname: Yup.string()
        .max(20, t("First Name is too long"))
        .required(t("First Name is required")),
      lname: Yup.string()
        .max(20, t("Last Name is too long"))
        .required(t("Last Name is required")),
      email: Yup.string().email(t("Invalid email")).required(t("Email is required")),
      password: Yup.string()
        .min(8, t("At least 8 characters"))
        .required(t("Password is required")),
      mobile: Yup.string()
        .nullable()
        .test('mobile-length', t("Please enter a valid mobile number"), function (value) {
          if (!value) return true; // Optional field
          return value.length >= 10; // Minimum length for international numbers
        }),
      country_code: Yup.object({
        code: Yup.string().required(),
        name: Yup.string().required(),
      }),
      selected_country: Yup.string().required(t("Country is required")),
      timezone: Yup.string().required(t("Timezone is required")),
      currency: Yup.string().required(t("Currency is required")),
      website: Yup.string()
        .url(t("Please enter a valid URL (e.g., https://example.com)"))
        .nullable(),
      license_number: Yup.string()
        .max(50, t("License number is too long"))
        .nullable(),
      tax_number: Yup.string()
        .max(50, t("Tax number is too long"))
        .nullable(),
    }),
    onSubmit: (values) => {
      if (savedData?.userId) {

        if (values?.email === savedData?.primaryEmail) {
          // nextStep()
          dispatch(updateUserSignup({ id: savedData?.userId, data: values }))
            .unwrap()
            .then(() => {
              // skipToStep(3, values);
              nextStep()
            })
            .catch(() => {
              // console.error("Error updating user:", error);
            });
        } else {
          dispatch(verificationOtpGenerator({ email: values.email }))
            .unwrap()
            .then(() => {
              handleOpenModal(values, true)
            })
            .catch(() => {
              // nextStep()
            });
        }
      } else {
        dispatch(verificationOtpGenerator({ email: values.email }))
          .unwrap()
          .then(() => {
            handleOpenModal(values, false)
          })
          .catch(() => {
            if (values?.email === savedData?.primaryEmail) {
              nextStep()
            } else {
              // console.log('values?.email === savedData?.primaryEmail IS NOT VALID ELSE CASE');
            }
          });
      }
    },
  });

  useEffect(() => {
    const prevData = JSON.parse(localStorage.getItem("registerFormData")) || {};
    localStorage.setItem(
      "registerFormData",
      JSON.stringify({ ...prevData, ...formik.values })
    );
  }, [formik.values]);

  const handleEmailBlur = async (e) => {
    formik.handleBlur(e);
    const email = e.target.value.trim();
    if (!email || formik.errors.email) return;

    const payload = { email };
    if (savedData?.userId) {
      payload.userId = savedData.userId;
    }
    dispatch(checkUserExist(payload))
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [step1data, setStep1data] = useState({})

  const handleOpenModal = (values, isEmailUpdated = false) => {
    setShowEditModal(true)
    // const referal_code = store?.referalCode?.isReferalCodeValid ? referralCode
    //   : "";
    // console.log('handleOpenModal referralData', referal_code);

    // setStep1data({ ...values, isEmailUpdated, referal_code })

    const referal_code =
      store?.referalCode?.isReferalCodeValid ? referralCode : "";

    console.log('handleOpenModal referralData', referal_code);

    const baseData = { ...values, isEmailUpdated };

    // only add referal_code if it's truthy (not empty)
    if (referal_code) {
      baseData.referal_code = referal_code;
    }

    setStep1data(baseData);

  };

  const handleCloseModal = () => setShowEditModal(false);

  useEffect(() => {
    if (store?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [store?.loading])

  return (
    <div className="card">
      <div className="">
        <form onSubmit={formik.handleSubmit}>
          <div className="form-section form-section-part1">
            <h2 className="form-section-title">{t("Company Details")}</h2>
            <hr className="section-divider" />

            {/* First Name & Last Name */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fname">{t("First Name")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span> </label>
                <input
                  id="fname"
                  name="fname"
                  type="text"
                  placeholder={
                    isMobile
                      ? truncate(t("Enter your first name"))
                      : t("Enter your first name")
                  }
                  value={formik.values.fname}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">{formik.touched.fname && formik.errors.fname}</p>
              </div>

              <div className="form-group">
                <label htmlFor="lname">{t("Last Name")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span></label>
                <input
                  id="lname"
                  name="lname"
                  type="text"
                  placeholder={
                    isMobile ? truncate(t("Enter your last name")) : t("Enter your last name")
                  } value={formik.values.lname}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">{formik.touched.lname && formik.errors.lname}</p>
              </div>
            </div>

            {/* Email & Password */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">{t("Email")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span></label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={
                    isMobile ? truncate(t("Enter your email")) : t("Enter your email")
                  } value={formik.values.email}
                  onChange={(e) => {
                    formik.handleChange(e);
                    // If user modifies the email, clear the manual error
                    if (emailAlreadyExists || manualEmailError) {
                      setEmailAlreadyExists(false);
                      setManualEmailError("");
                      formik.setFieldError("email", "");
                    }
                  }}
                  onBlur={handleEmailBlur}

                />
                <p className="error">
                  {(formik.touched.email && (formik.errors.email || manualEmailError)) || manualEmailError}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="password">{t("Password")}<span style={{ color: "red", marginLeft: "0px" }}>*</span></label>
                <InputPasswordToggle
                  id="password"
                  name="password"
                  value={formik.values.password}
                  placeholder={
                    isMobile ? truncate(t("Enter a strong password")) : t("Enter a strong password")
                  } onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  invalid={formik.touched.password && !!formik.errors.password}
                  className="input-group-merge input-login-password"
                />
                <p className="error">{formik.touched.password && formik.errors.password}</p>
              </div>
            </div>

            {/* Company Name & Mobile */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="company_name">{t("Company Name")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span> </label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  placeholder={
                    isMobile ? truncate(t("Enter your company name")) : t("Enter your company name")
                  } value={formik.values.company_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">{formik.touched.company_name && formik.errors.company_name}</p>
              </div>

              <div className="form-group">
                <label htmlFor="mobile">{t("Mobile")}</label>
                <Controller
                  name="mobile"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      country={formik.values.country_code?.countryCode?.toLowerCase() || "us"}
                      disableDropdown={false}
                      countryCodeEditable={false}
                      inputStyle={{
                        width: "100%",
                        paddingLeft: "60px",
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                      }}
                      buttonStyle={{
                        border: "1px solid #ddd",
                        borderRadius: "6px 0 0 6px",
                        backgroundColor: "#f9f9f9",
                        marginLeft: "0px",
                      }}
                      value={formik.values.mobile}
                      onChange={(value, country) => {
                        handleChangeMobile("mobile", value);
                        formik.setFieldValue("country_code", {
                          code: `+${country.dialCode}`,
                          name: country.name,
                          countryCode: country.countryCode,
                          format: country.format || "+.. .....-.....",
                        });
                      }}
                    />
                  )}
                />
                <p className="error">{formik.touched.mobile && formik.errors.mobile}</p>
              </div>
            </div>

            {/* Country & Timezone */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="selected_country">
                  {t("Country")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span>
                </label>
                <Select
                  id="selected_country"
                  name="selected_country"
                  classNamePrefix="custom-select"
                  options={countryList}
                  value={selectedCountry}
                  onChange={(option) => {
                    setSelectedCountry(option);
                    formik.setFieldValue('selected_country', option?.value || '');
                    formik.setFieldValue('country', option?.label || '');

                    // Auto-update timezone, currency, and phone country code when country changes
                    if (option) {
                      // Update phone country code based on country
                      if (option.dialCode) {
                        formik.setFieldValue('country_code', {
                          code: option.dialCode,
                          name: option.label,
                          countryCode: option.code.toLowerCase(),
                        });
                      }

                      // Update timezone based on country
                      const primaryTimezone = getPrimaryTimezoneByCountry(option.value);
                      if (primaryTimezone) {
                        const timezoneObj = timezoneList.find(tz => tz.value === primaryTimezone);
                        if (timezoneObj) {
                          setSelectedTimezone(timezoneObj);
                          formik.setFieldValue('timezone', timezoneObj.value);
                        }
                      }

                      // Update currency based on country
                      const detectedCurrency = autoDetectCurrency(option.value);
                      if (detectedCurrency) {
                        setSelectedCurrency(detectedCurrency);
                        formik.setFieldValue('currency', detectedCurrency.value);
                      }
                    } else {
                      // Clear timezone, currency, and reset phone country code if country is cleared
                      setSelectedTimezone(null);
                      setSelectedCurrency(null);
                      formik.setFieldValue('timezone', '');
                      formik.setFieldValue('currency', '');
                      formik.setFieldValue('country_code', { code: '+1', name: 'United States', countryCode: 'us' });
                    }
                  }}
                  onBlur={() => formik.setFieldTouched('selected_country', true)}
                  placeholder={t("Select your country")}
                  isClearable
                  isSearchable
                  isLoading={autoDetecting}
                  formatOptionLabel={formatCountryOption}
                  styles={selectStyles}
                  className={formik.touched.selected_country && formik.errors.selected_country ? 'is-invalid' : ''}
                />
                <p className="error">
                  {formik.touched.selected_country && formik.errors.selected_country}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="timezone">
                  {t("Timezone")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span>
                </label>
                <Select
                  id="timezone"
                  name="timezone"
                  classNamePrefix="custom-select"
                  options={timezoneList}
                  value={selectedTimezone}
                  onChange={(option) => {
                    setSelectedTimezone(option);
                    formik.setFieldValue('timezone', option?.value || '');
                  }}
                  onBlur={() => formik.setFieldTouched('timezone', true)}
                  placeholder={t("Select your timezone")}
                  isClearable
                  isSearchable
                  isLoading={autoDetecting}
                  styles={selectStyles}
                  className={formik.touched.timezone && formik.errors.timezone ? 'is-invalid' : ''}
                />
                <p className="error">
                  {formik.touched.timezone && formik.errors.timezone}
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="currency">
                  {t("Currency")} <span style={{ color: "red", marginLeft: "-4px" }}>*</span>
                </label>
                <Select
                  id="currency"
                  name="currency"
                  classNamePrefix="custom-select"
                  options={currencyList}
                  value={selectedCurrency}
                  onChange={(option) => {
                    setSelectedCurrency(option);
                    formik.setFieldValue('currency', option?.value || '');
                  }}
                  onBlur={() => formik.setFieldTouched('currency', true)}
                  placeholder={t("Select your currency")}
                  isClearable
                  isSearchable
                  isLoading={autoDetecting}
                  styles={selectStyles}
                  className={formik.touched.currency && formik.errors.currency ? 'is-invalid' : ''}
                />
                <p className="error">
                  {formik.touched.currency && formik.errors.currency}
                </p>
              </div>
            </div>


          </div>

          <div className="form-section form-section-part1">
            <h2 className="form-section-title">{t("Other Details (Optional)")}</h2>
            <hr className="section-divider" />
            {/* Address Lines */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="address_1">{t("Address Line 1")}</label>
                <input
                  id="address_1"
                  name="address_1"
                  type="text"

                  placeholder={
                    isMobile ? truncate(t("Enter your address line 1")) : t("Enter your address line 1")
                  }
                  value={formik.values.address_1}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.address_1 && formik.errors.address_1}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="address_2">{t("Address Line 2")}</label>
                <input
                  id="address_2"
                  name="address_2"
                  type="text"

                  placeholder={
                    isMobile ? truncate(t("Enter your address line 2")) : t("Enter your address line 2")
                  }
                  value={formik.values.address_2}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.address_2 && formik.errors.address_2}
                </p>
              </div>
            </div>

            {/* State & City */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="state">{t("State")}</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  placeholder={
                    isMobile ? truncate(t("Enter your state")) : t("Enter your state")
                  } value={formik.values.state}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.state && formik.errors.state}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="city">{t("City")}</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder={
                    isMobile ? truncate(t("Enter your city")) : t("Enter your city")
                  } value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.city && formik.errors.city}
                </p>
              </div>
            </div>

            {/* Country & Zipcode */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="zipcode">{t("Zipcode")}</label>
                <input
                  id="zipcode"
                  name="zipcode"
                  type="text"
                  placeholder={
                    isMobile ? truncate(t("Enter your zipcode")) : t("Enter your zipcode")
                  } value={formik.values.zipcode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.zipcode && formik.errors.zipcode}
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="website">{t("Website")}</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  placeholder={
                    isMobile
                      ? truncate(t("example.com"))
                      : t("example.com")
                  }
                  value={formik.values.website}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.website && formik.errors.website}
                </p>
              </div>
            </div>
            {/* Website & Tax Number */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="license_number">{t("License Number")}</label>
                <input
                  id="license_number"
                  name="license_number"
                  type="text"
                  placeholder={
                    isMobile
                      ? truncate(t("Enter license number"))
                      : t("Enter license number")
                  }
                  value={formik.values.license_number}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.license_number && formik.errors.license_number}
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="tax_number">{t("Tax Number")}</label>
                <input
                  id="tax_number"
                  name="tax_number"
                  type="text"
                  placeholder={
                    isMobile
                      ? truncate(t("Enter tax/VAT number"))
                      : t("Enter tax/VAT number")
                  }
                  value={formik.values.tax_number}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <p className="error">
                  {formik.touched.tax_number && formik.errors.tax_number}
                </p>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-next btn btn-primary" disabled={loading || actionFlag === "REGISTER_SCS" || actionFlag === "USER_EXIST_SUCCESS" || store?.referalCode?.isReferalCodeValid === false || store?.actionFlag === "REFERRAL_CODE_VALID_ERROR"}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : actionFlag === "REGISTER_SCS" ? (
                "Account Created! Redirecting..."
              ) : (
                "Create Account & Continue"
              )}
            </button>
          </div>

          {store?.actionFlag === "REGISTER_ERR" && store?.error && (
            <div className="alert alert-danger mt-3">
              <strong>Registration Failed:</strong> {store.error}
            </div>
          )}

          {(
            store?.referalCode?.isReferalCodeValid === false ||
            store?.actionFlag === "REFERRAL_CODE_VALID_ERROR"
          )
            && (
              <div className="alert alert-danger mt-3">
                <strong>Invalid Referral Code:</strong> {store?.referalCode?.message || "Referral code is not valid."}
              </div>
            )}

          <div className="text-center mt-2 fs-7">

            {localStorage.accessToken ? (
              <button
                type="button"
                className="text-warning fw-bold"
                onClick={() => {
                  dispatch(logout())
                  window.location.reload();
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ffc107",
                  fontWeight: "bold",
                }}
              >
                Logout
              </button>


            ) : (
              <>
                <span style={{ color: "#fff" }}>{t("Already have an account?")}&nbsp;</span>
                <Link to="/login" className="text-warning fw-bold">
                  {t("Log In")}                </Link>
              </>
            )}
          </div>
          {/* </div>
            <span style={{ color: "#fff" }}>
              Already have an account?&nbsp;
            </span>
            <Link to="/login" className="text-warning fw-bold">
              Log In
            </Link>
          </div> */}

        </form>
      </div>
      <EmailVerificationModal
        isOpen={showEditModal}
        toggle={handleCloseModal}
        step1Data={step1data}
        nextStep={nextStep}
      // onCompanyUpdated={handleCompanyUpdated}
      />
    </div>
  );
};

export default Step1CompanyDetails;
