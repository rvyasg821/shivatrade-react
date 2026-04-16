// ** React Imports
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { forgotPassword, cleanAuthMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Form,
  Label,
  Input,
  Button,
  CardTitle,
  FormFeedback,
  Spinner,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Utils
import { isUserLoggedIn } from "@utils";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

// ** Styles
import "@styles/react/pages/page-authentication.scss";

// ** Images
import logoImage from "@src/assets/images/logo/login-logo.png";
import mainImage from "@src/assets/images/front/loginimg.png";

const ForgotPassword = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);

  // ** Const
  const defaultValues = { email: "" };
  const dashboardUrl = `${appsRoot}/dashboard`;

  /* Yup validation schema */
  const ForgotSchema = yup.object().shape({
    email: yup
      .string()
      .required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues,
    resolver: yupResolver(ForgotSchema),
  });

  useEffect(() => {
    // If user logged in → redirect
    if (isUserLoggedIn() !== null) {
      navigate(dashboardUrl);
    }

    // Navigate to reset-password/verify
    if (store?.actionFlag === "FRGT_SCS") {
      navigate(`/reset-password/verify/${store?.data?.token}`);
    }

    // Clear messages
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanAuthMessage(null));
    }

    // Success toast
    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    // Error toast
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error]);

  const onSubmit = (values) => {
    if (values) {
      const forgotPayload = { email: values?.email || "" };
      dispatch(forgotPassword(forgotPayload));
    }
  };

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <div
      className="auth-wrapper auth-cover">
      <Row className="auth-inner main-left-right m-0">
        {/* Left Image Section */}
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

        {/* Right Form Section */}
        <div
          className="h-100 right-login d-flex align-items-center auth-bg px-2 p-lg-5"
        >
          <Col className="h-100 px-xl-2 mx-auto main-login col-10" sm="8" md="7">
            {/* Logo */}
            <div
              className="w-100 d-lg-flex align-items-center mb-3 justify-content-center"
              style={{ textAlign: "center" }}
            >
              <img 
                className="logo-login" 
                src={logoImage} 
                alt="Logo Cover" 
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                  objectFit: "contain"
                }}
              />
            </div>

            {/* Titles */}
            <CardTitle
              tag="h3"
              className="fw-bolder mb-1" style={{ textAlign: "center" }}
            >
              {t("Forgot Password")}
            </CardTitle>
            <p
              className="fw-bold mb-2"
              style={{ textAlign: "center" }}
            >
              {t(
                "Enter your email and we'll send you instructions to reset your password"
              )}
            </p>

            {/* Forgot Password Form */}
            <Form
              autoComplete="off"
              className="auth-forgot-password-form mt-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              {/* Email */}
              <div className="mb-2">
                <Label className="form-label " for="forgot-email">
                  {t("Email")}
                </Label>
                <Controller
                  id="email"
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="forgot-email"
                      autoComplete="off"
                      className="input-login-email"
                      placeholder={t("Enter your email")}
                      invalid={errors.email && true}
                    />
                  )}
                />
                <FormFeedback>{errors.email?.message}</FormFeedback>
              </div>

              {/* Submit */}
               <Button type="submit" block
               className="btn-custom"
              >
                {store?.loading ? (
                  t("Send reset link")
                ) : (
                  <Spinner
                    className="spinner-border-login"
                    style={{
                      height: "22px",
                      width: "22px",
                      borderColor: "#05DEF5",
                      borderRightColor: "#05DEF5"  
                    }}
                  />
                )}
              </Button>
            </Form>

            {/* Back to Login */}
            <p className="text-center mt-2">
              <Link to="/login">
                <ChevronLeft
                  className="rotate-rtl me-25"
                  size={14}
                  style={{ color: "#09418B" }}
                />
                <span className="align-middle" style={{ color: "#05DEF5" }}>
                  {t("Back to login")}
                </span>
              </Link>
            </p>
          </Col>
        </div>
      </Row>
    </div>
  );
};

export default ForgotPassword;
