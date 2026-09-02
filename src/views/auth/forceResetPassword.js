// Forced first-login password change (SECURITY_HARDENING_PLAN.md B4).
// Shown when the logged-in user's `must_reset_password` flag is true (set
// on auto-provisioned vendor/customer/employee logins using the fixed
// default password). Reuses the existing /auth/change-password endpoint —
// no new backend flow — then refreshes the cached user so the flag clears
// and the normal app becomes reachable.

// ** React Imports
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { changePassword, cleanAuthMessage, getAuthMe } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import { Row, Col, Form, Label, Button, CardTitle, FormFeedback } from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Utils
import { isUserLoggedIn, getHomeRoute } from "@utils";
import { getCompanyData } from "@src/redux/authentication";

// ** Custom Components
import Notification from "@components/toast/notification";
import InputPasswordToggle from "@components/input-password-toggle";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Styles
import "@styles/react/pages/page-authentication.scss";

// ** Assets
import logoImage from "@src/assets/images/logo/login-logo.png";
import mainImage from "@src/assets/images/front/loginimg.png";

const ForceResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);
  const companyData = useSelector((state) => state.authentication?.companyData) || getCompanyData();

  const Schema = yup.object().shape({
    oldPassword: yup.string().required(`${t("Current password is required")}.`),
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
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
    resolver: yupResolver(Schema),
  });

  useEffect(() => {
    if (!isUserLoggedIn()) {
      navigate("/login");
      return;
    }
    // Already cleared (e.g. back-nav after a successful change) — leave.
    if (store?.authUserItem?.must_reset_password === false) {
      navigate(getHomeRoute(store.authUserItem, companyData));
    }
  }, []);

  useEffect(() => {
    if (store?.actionFlag === "CHANGE_PSWD_SCS") {
      Notification("Success", t("Password changed. Redirecting…"), "success");
      dispatch(cleanAuthMessage());
      // Refresh the cached user so must_reset_password flips false, then
      // land on the role's normal home route. Use the action's own payload
      // (not the outer `store` closure, which is stale here) so the redirect
      // decision reflects the just-fetched, already-cleared flag.
      dispatch(getAuthMe()).then((action) => {
        const freshUser = action.payload?.authUserItem;
        navigate(getHomeRoute(freshUser, companyData));
      });
      return;
    }
    if (store?.actionFlag || store?.success || store?.error) dispatch(cleanAuthMessage(null));
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  const onSubmit = (values) => {
    dispatch(
      changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
    );
  };

  return (
    <div className="auth-wrapper auth-cover">
      <Row className="auth-inner main-left-right m-0">
        <div className="d-none d-lg-flex login-left">
          <div className="w-100 d-lg-flex justify-content-center">
            <img
              className="img-fluid"
              src={mainImage}
              alt="Set New Password Cover"
              width={780}
              height={900}
            />
          </div>
        </div>

        <div className="h-100 right-login d-flex align-items-center auth-bg px-2 p-lg-5">
          <Col className="h-100 px-xl-2 mx-auto main-login col-10" sm="8" md="7">
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

            <CardTitle tag="h3" className="fw-bolder mb-1" style={{ textAlign: "center" }}>
              {t("Set a New Password")}
            </CardTitle>
            <p className="fw-bold mb-2" style={{ textAlign: "center" }}>
              {t("For your account's security, you must set a new password before continuing.")}
            </p>

            <Form
              autoComplete="off"
              className="auth-reset-password-form mt-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="mb-2">
                <Label className="form-label" for="oldPassword">
                  {t("Current Password")}
                </Label>
                <Controller
                  id="oldPassword"
                  name="oldPassword"
                  control={control}
                  render={({ field }) => (
                    <InputPasswordToggle
                      {...field}
                      autoFocus
                      autoComplete="off"
                      className="input-group-merge input-login-password"
                      invalid={errors.oldPassword && true}
                    />
                  )}
                />
                <FormFeedback>{errors.oldPassword?.message}</FormFeedback>
              </div>

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
                      autoComplete="off"
                      className="input-group-merge input-login-password"
                      invalid={errors.newPassword && true}
                    />
                  )}
                />
                <FormFeedback>{errors.newPassword?.message}</FormFeedback>
              </div>

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
          </Col>
        </div>
      </Row>
    </div>
  );
};

export default ForceResetPassword;
