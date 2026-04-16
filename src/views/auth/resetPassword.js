// ** React Imports
import { useEffect, useLayoutEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { resetPassword, cleanAuthMessage, verifyForgotToken } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Form,
  Label,
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
import InputPasswordToggle from "@components/input-password-toggle";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Imports
import { ChevronLeft } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

// ** Styles
import "@styles/react/pages/page-authentication.scss";

// ** Assets
import logoImage from "@src/assets/images/logo/login-logo.png";
import mainImage from "@src/assets/images/front/loginimg.png";

const ResetPassword = () => {
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);
  const dashboardUrl = `${appsRoot}/dashboard`;

  const ResetSchema = yup.object().shape({
    newPassword: yup
      .string()
      .required(`${t("New password is required")}.`)
      .min(8, `${t("New password must be at least 8 characters")}.`)
      .matches(
        "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$",
        t("Min. 8 characters, at least one uppercase, one lowercase, one number and one special character.")
      ),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("newPassword"), null], `${t("Passwords must match")}.`)
      .required(`${t("Confirm Password is required")}.`),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: { newPassword: "", confirmPassword: "" },
    resolver: yupResolver(ResetSchema),
  });

  useLayoutEffect(() => {
    dispatch(verifyForgotToken({ token }));
  }, [token]);

  useEffect(() => {
    if (!token) navigate(`/`);
    if (isUserLoggedIn() !== null) navigate(dashboardUrl);
    if (store?.actionFlag === "RESET_PSWD_SCS") navigate(`/login`);
    if (store?.actionFlag === "FRGT_TKN_ERR") navigate(`/forgot-password`);
    if (store?.actionFlag || store?.success || store?.error) dispatch(cleanAuthMessage(null));
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const onSubmit = (values) => {
    if (values) {
      dispatch(resetPassword({
        token,
        newPassword: values?.newPassword || "",
        confirmPassword: values?.confirmPassword || "",
      }));
    }
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <div className="auth-wrapper auth-cover">
      <Row className="auth-inner main-left-right m-0">
        {/* Left Image Section */}
        <div className="d-none d-lg-flex login-left">
          <div className="w-100 d-lg-flex justify-content-center">
            <img
              className="img-fluid"
              src={mainImage}
              alt="Reset Password Cover"
              width={780}
              height={900}
            />
          </div>
        </div>

        {/* Right Form Section */}
        <div className="h-100 right-login d-flex align-items-center auth-bg px-2 p-lg-5">
          <Col className="h-100 px-xl-2 mx-auto main-login col-10" sm="8" md="7">
            {/* Logo */}
            <div
              className="w-100 d-lg-flex align-items-center mb-3 justify-content-center"
              style={{ textAlign: "center" }}
            >
              <img
                className="logo-login"
                src={logoImage}
                alt="Logo"
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                  objectFit: "contain",
                }}
              />
            </div>

            {store?.forgotTokenVerified ? (
              <>
                <CardTitle tag="h3" className="fw-bolder mb-1" style={{ textAlign: "center" }}>
                  {t("Reset Password")}
                </CardTitle>
                <p className="fw-bold mb-2" style={{ textAlign: "center" }}>
                  {t("Your new password must be different from previously used passwords")}
                </p>

                <Form
                  autoComplete="off"
                  className="auth-reset-password-form mt-2"
                  onSubmit={handleSubmit(onSubmit)}
                >
                  {/* New Password */}
                  <div className="mb-2">
                    <Label className="form-label" for="newPassword">
                      {t("New Password")}
                    </Label>
                    <Controller
                      id="newPassword"
                      name="newPassword"
                      control={control}
                      render={({ field }) => (
                        <InputPasswordToggle
                          {...field}
                          autoFocus
                          autoComplete="off"
                          className="input-group-merge input-login-password"
                          invalid={errors.newPassword && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.newPassword?.message}</FormFeedback>
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-2">
                    <Label className="form-label" for="confirmPassword">
                      {t("Confirm Password")}
                    </Label>
                    <Controller
                      id="confirmPassword"
                      name="confirmPassword"
                      control={control}
                      render={({ field }) => (
                        <InputPasswordToggle
                          {...field}
                          autoComplete="off"
                          className="input-group-merge input-login-password"
                          invalid={errors.confirmPassword && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.confirmPassword?.message}</FormFeedback>
                  </div>

                  <Button type="submit" block className="btn-custom">
                    {t("Set New Password")}
                  </Button>
                </Form>

                <p className="text-center mt-2">
                  <Link to="/login">
                    <ChevronLeft className="rotate-rtl me-25" size={14} />
                    <span className="align-middle">{t("Back to login")}</span>
                  </Link>
                </p>
              </>
            ) : (
              <div className="text-center py-3">
                <Spinner color="primary" />
                <p className="mt-1 text-muted">{t("Verifying reset token...")}</p>
              </div>
            )}
          </Col>
        </div>
      </Row>
    </div>
  );
};

export default ResetPassword;
