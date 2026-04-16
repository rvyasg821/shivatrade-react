import { Col, Row, Button, CardTitle } from "reactstrap";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { useEffect, useLayoutEffect } from "react";
import {
  verifyForgotToken,
  resetPasswordOtpVerify,
  cleanAuthMessage,
} from "../auth/store";
import { useDispatch, useSelector } from "react-redux";
import Notification from "@components/toast/notification";
import OtpInput from "react-otp-input";

import { useNavigate, useParams } from "react-router-dom";

import { startLoading, stopLoading } from "../loadingstore";
import logoImage from "@src/assets/images/logo/login-logo.png";
import mainImage from "@src/assets/images/front/loginimg.png";

const OtpVerify = () => {
  // ** Hooks
  const { t } = useTranslation();
  const { token } = useParams();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);
  const navigate = useNavigate();
  /* State variables related to timer */
  // const [seconds, setSeconds] = useState(30);
  // const [isTimerRunning, setIsTimerRunning] = useState(false); // Timer state

  const validationOtpSchema = Yup.object().shape({
    otp: Yup.string()
      .length(6, "OTP must be 6 digits")
      .required("OTP is required"),
  });

  // Formik initial values
  const initialValuesOtp = { otp: "" };

  /*  Timer for resend code  */
  // useEffect(() => {
  //   if (seconds === 0) {
  //     setIsTimerRunning(false); // Timer finished
  //     return;
  //   }

  //   setIsTimerRunning(true); // Timer started
  //   const timer = setInterval(() => {
  //     setSeconds((prev) => prev - 1);
  //   }, 1000);

  //   return () => clearInterval(timer);
  // }, [seconds]);

  // const resetTimer = () => {
  //   setSeconds(30); // Reset to 30 seconds
  //   setIsTimerRunning(true); // Start the timer
  // };

  useEffect(() => {
    if (store?.actionFlag === "FRGT_TKN_ERR") {
      navigate(`/forgot-password`);
    }
    if (store?.actionFlag === "RESET_PASS_OTP_SUCCESS") {
      navigate(`/reset-password/${token}`);
    }

    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanAuthMessage(null));
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store?.actionFlag, store?.error, store.success]);

  const onSubmitOtp = async (values) => {
    const payload = {
      token,
      otp: values?.otp,
    };
    dispatch(resetPasswordOtpVerify(payload));
  };
  /*  Resend OTP handler  */
  // const handleResendCode = () => {
  //   const payload = {};
  //   if (email) payload.email = email;
  //   // if (store?.loading) dispatch(loginwithOtp(payload));
  // };

  useLayoutEffect(() => {
    dispatch(verifyForgotToken({ token }));
  }, [token]);

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <div className="auth-wrapper auth-cover">
      <Row className="auth-inner main-left-right m-0">
        <div className="d-none d-lg-flex login-left">
          <div className="w-100 d-lg-flex justify-content-center">
            <img
              className="img-fluid"
              src={mainImage}
              alt="Forgot Password Cover"
              width={780}
              height={900}
            />
          </div>
        </div>

        {/* verify otp */}
        {store?.forgotTokenVerified && (
          <div className="h-100 right-login d-flex align-items-center auth-bg px-2 p-lg-5">
            <Col className="h-100 px-xl-2 mx-auto main-login col-10"sm="8" md="7">
              <div
                className="w-100 d-lg-flex align-items-center mb-3 justify-content-center"
                style={{ textAlign: "center" }}
              >
                <img className="logo-login" src={logoImage} alt="Logo Cover" />
              </div>
              <CardTitle
                tag="h3"
                className="fw-bolder mb-1 "
                style={{ textAlign: "center" }}
              >
                {t("Verify Your Account")}
              </CardTitle>
              {store?.data?.to && (
                <CardTitle
                  tag="p"
                  className="fw-bold mb-1 mail-code"
                  style={{ textAlign: "center" }}
                >
                  {t("Please enter the code we just sent to email")}
                  <div>{store?.data.to || t("(no email provided)")}</div>
                </CardTitle>
              )}
              <div className="varify-otp">
                <Formik
                  initialValues={initialValuesOtp}
                  validationSchema={validationOtpSchema}
                  onSubmit={onSubmitOtp}
                >
                  {({ setFieldValue, values, errors, touched }) => (
                    <Form>
                      <div className="form-group otp-form">
                        <label className="otp fw-bolder">Enter OTP</label>
                        <div className="form-otp-center mt-1">
                          <OtpInput
                            value={values.otp}
                            onChange={(otp) => {
                              setFieldValue("otp", otp);
                              if (errors.otp) {
                                // clear error when user types again
                                errors.otp = undefined;
                              }
                            }}
                            numInputs={6}
                            renderSeparator={<span> </span>}
                            renderInput={(props) => (
                              <input
                                {...props}
                                type="text" // Use "text" instead of "number" for better handling
                                className={`form-control ${errors.otp && touched.otp ? "is-invalid" : ""
                                  }`}
                              />
                            )}
                          />
                        </div>
                        {errors.otp && touched.otp && (
                          <div className="invalid-feedback d-block">
                            {errors.otp}
                          </div>
                        )}
                      </div>
                      {/* <div className="otp-form">
                        <div className="mt-2 mail-code fw-bold">
                          <p>{t("Didn’t receive OTP?")}</p>
                        </div>
                        <p className="mb-0 para-text">
                          You may request a new code in <span>{seconds}</span>
                        </p>
                        {!isTimerRunning && (
                          <span
                            className={
                              store?.loading
                                ? "cursor-pointer text-bold"
                                : "disabled"
                            }
                            onClick={() => handleResendCode()}
                            role="button"
                            aria-disabled={!store?.loading || !isTimerRunning}
                          >
                            {t("Resend code")}
                          </span>
                        )}
                      </div> */}
                      <Button
                        type="submit"
                        className="btn-custom btn btn-secondary d-block w-100 mt-2"
                      >
                        {t("Verify OTP")}
                      </Button>
                    </Form>
                  )}
                </Formik>
              </div>
            </Col>
          </div>
        )}
      </Row>
    </div>
  );
};

export default OtpVerify;
