/* eslint-disable no-confusing-arrow */
// ** React Imports
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
// ** Reactstrap Imports
// import { Row, Col } from "react-bootstrap";
import { Card, CardBody, FormGroup, FormFeedback, Row, Col } from "reactstrap";
import { Formik, Form, Field, useFormik } from "formik";
import * as Yup from "yup";

// ** Third Party Components
import PhoneInput from 'react-phone-input-2';

// ** Styles
import 'react-phone-input-2/lib/style.css';
import EmailVerificationModal from "../../../auth/register/otpVerificationModal";
import { useTranslation } from "react-i18next";
import InputPasswordToggle from "../../../../@core/components/input-password-toggle";
import AssessmentSidebar from "../sidebar";
import { createAssessmentReport, getAssessmentReportById, updateAssessmentEmail, updateAssessmentReport } from "../store";
import { startLoading, stopLoading } from "../../../loadingstore";

const CompanyInfoStep = () => {
  // ** Hooks
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const tenantIdFromUrl = searchParams.get("tenantId"); // ← this is what you need!
  const reportID = searchParams.get("id");
  

  const navigate = useNavigate();
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const assessmentReport = useSelector((state) => state.assessmentReport);

  // const store = useSelector((state) => state.assessmentReport);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showEditModal, setShowEditModal] = useState(false);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
    if (reportID) {
      dispatch(getAssessmentReportById({ id: reportID, tenantID: tenantIdFromUrl }));
    }
  }, [dispatch]);

  // Populate form when existing assessmentReport is loaded
  const { control, setValue } = useForm({ defaultValues: { mobile: "" } });

  const truncate = (text, limit = 17) =>
    text.length > limit ? text.slice(0, limit) + "..." : text;

  const [reportIdS, setReportIdS] = useState()
  const handleCloseModal = () => setShowEditModal(false);

  const nextStep = () => {
    setShowEditModal(false);
    const query = new URLSearchParams();
    query.append("id", reportIdS || reportID);
    if (tenantIdFromUrl) {
      query.append("tenantId", tenantIdFromUrl);
    }

    navigate(`/assessment-form/${id}/assessmentreport?${query.toString()}`);
  };

  const [originalEmail, setOriginalEmail] = useState("");

  const formik = useFormik({
    initialValues: {
      // company_name: "",
      fname: "",
      lname: "",
      email: "",
      mobile: "",
      country_code: { code: "+1", name: "United States" },
      // password: "",
      // address_1: "",
      // address_2: "",
      // state: "",
      // city: "",
      // country: "",
      // zipcode: "",
      // userId: "",
    },
    validationSchema: Yup.object({
      // company_name: Yup.string()
      //   .max(50, t("Company Name is too long"))
      //   .required(t("Company Name is required")),
      fname: Yup.string()
        .max(20, t("First Name is too long"))
        .required(t("First Name is required")),
      lname: Yup.string()
        .max(20, t("Last Name is too long"))
        .required(t("Last Name is required")),
      email: Yup.string().email(t("Invalid email")).required(t("Email is required")),
      // password: Yup.string()
      //   .min(8, t("At least 8 characters"))
      //   .required(t("Password is required")),
      // mobile: Yup.string()
      //   .nullable()
      //   .test('mobile-length', t("Please enter a valid mobile number"), function (value) {
      //     if (!value) return true;
      //     return value.length >= 10;
      //   }),
      country_code: Yup.object({
        code: Yup.string().required(),
        name: Yup.string().required(),
      }),
    }),
    onSubmit: (values) => {
      if (values) {

        if (reportID) {
          const emailChanged = values.email.trim() !== originalEmail.trim();
          if (!emailChanged) {
            // Email same → go next directly
            console.log('Email has not changed!!!!');
            nextStep();
          } else {
            const payload = {
              reportId: reportID,
              name: `${values.fname} ${values.lname}`.trim(),
              ...values
            }
            dispatch(updateAssessmentEmail({ id: tenantIdFromUrl, data: payload })).then((res) => {
                          setReportIdS(res.payload.assessmentReport._id)

              console.log('res update', res);
              setShowEditModal(true)
            })
            // dispatch(updateAssessmentEmail({ id: tenantIdFromUrl, data: payload })).then((res) => {
            //   console.log('AFTER UPDATE RES ==>', res);

            // })
            // console.log('Email Has been chnaged !!!!!!');
          }
        } else {
          const payload = {
            assessment_id: id,
            name: `${values.fname} ${values.lname}`.trim(),
            ...values
          }

          dispatch(createAssessmentReport({
            id: tenantIdFromUrl, data: payload
          })).then((res) => {
            setReportIdS(res.payload.assessmentReport._id)
            Promise.resolve().then(() => {
              setShowEditModal(true)
            });

          })
        }

      }

    },
  });

  useEffect(() => {
    if (assessmentReport?.assessmentReport) {
      const report = assessmentReport.assessmentReport;

      // Extract first and last name from the full "name" field
      const [firstName = "", lastName = ""] = (report.name || "").trim().split(/\s+/);

      formik.setValues({
        fname: firstName || "",
        lname: lastName || "",
        email: report.email || "",
        mobile: report.mobile || "",
        country_code: report.country_code || { code: "+1", name: "United States" },
        // add any other fields you might have later
      });
      setOriginalEmail(report.email)
    }
  }, [assessmentReport?.assessmentReport]);

  useEffect(() => {
    if (assessmentReport?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [assessmentReport?.loading]);

  // const nextStep = () => {
  //   setShowEditModal(false)
  //   navigate(`/assessment-form/${id}/assessmentreport?id=${reportId}`);
  // }


  const handleChangeMobile = (field, value) => {
    setValue(field, value);
    formik.setFieldValue(field, value);
  };

  return (
    <div className="card">
      <div>
        <div className="">
          <form onSubmit={formik.handleSubmit}>
            <div className="form-section form-section-part1">
              <h2 className="form-section-title">{t("Personal Information")}</h2>
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
                      // if (emailAlreadyExists || manualEmailError) {
                      // setEmailAlreadyExists(false);
                      // setManualEmailError("");
                      formik.setFieldError("email", "");
                      // }
                    }}
                  // onBlur={handleEmailBlur}

                  />
                  <p className="error">
                    {(formik.touched.email && (formik.errors.email))}
                  </p>
                </div>

                {/* <div className="form-group">
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
                </div> */}
                {/* <div className="form-group">
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
                </div> */}
                <div className="form-group">
                  <label htmlFor="mobile">{t("Mobile (Optional)")}</label>
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

              {/* Company Name & Mobile */}
              {/* <div className="form-row">
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
                  <label htmlFor="mobile">{t("Mobile (Optional)")}</label>
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
              </div> */}
            </div>

            {/* <div className="form-section form-section-part1">
              <h2 className="form-section-title">{t("Address (Optional)")}</h2>
              <hr className="section-divider" />

  
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

             
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">{t("Country")}</label>
                  <input
                    id="country"
                    name="country"
                    type="text"

                    placeholder={
                      isMobile ? truncate(t("Enter your country")) : t("Enter your country")
                    } value={formik.values.country}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <p className="error">
                    {formik.touched.country && formik.errors.country}
                  </p>
                </div>

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
              </div>
            </div> */}

            <div className="form-actions">
              <button type="submit" className="btn-next btn btn-primary"
                disabled={assessmentReport?.loading}
              >
                {assessmentReport?.loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {t('Next')}
                  </>
                ) : (
                  <>
                    {t('Next')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <EmailVerificationModal
        isOpen={showEditModal}
        toggle={handleCloseModal}
        nextStep={nextStep}
        from={"AssessementReport"}
        assessmentId={reportIdS}
        tentanId={tenantIdFromUrl}
      />
    </div>
  )
}

export default CompanyInfoStep;
