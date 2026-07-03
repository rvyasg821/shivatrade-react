// ** React Imports
import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Context
import { AbilityContext } from "@src/utility/context/Can";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { login, cleanAuthMessage } from "./store";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Form,
  Input,
  Label,
  Button,
  Spinner,
  CardTitle,
  FormFeedback,
} from "reactstrap";
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

// ** Constant
import { appsRoot, appBaseName } from "@constant/defaultValues";

// ** Styles
import "@styles/react/pages/page-authentication.scss";
import mainImage from "@src/assets/images/front/loginimg.png";
import mainImageWebp from "@src/assets/images/front/loginimg.webp";
import logoImage from "@src/assets/images/logo/login-logo.png";

const Login = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ability = useContext(AbilityContext);

  // ** Store vars
  const dispatch = useDispatch();
  const authStore = useSelector((state) => state.auth);
  const companyData = useSelector((state) => state.authentication?.companyData) || getCompanyData();

  const defaultValues = {
    email: "",
    password: "",
  };

  const PlaceholderSchema = {
    email: "Email",
  };

  /* Yup validation schema */
  const AuthSchema = yup.object().shape({
    email: yup
      .string()
      .required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
    password: yup.string().required(`${t("Password is required")}.`),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues,
    resolver: yupResolver(AuthSchema),
  });

  const handleDefaultApis = () => { };

  useEffect(() => {
    // 1. Initial login check - avoid unnecessary redirects
    if (isUserLoggedIn() && authStore?.authUserItem?._id) {
      const homeRoute = getHomeRoute(authStore.authUserItem, companyData);
      if (homeRoute !== "/login") {
        navigate(homeRoute);
        return;
      }
    }

    // 2. Handle successful login transition
    if (authStore?.actionFlag === "AUTH_SUCCESS") {
      if (authStore.authUserItem?.ability) {
        ability.update(authStore.authUserItem.ability);
      }
      handleDefaultApis();

      const homeRoute = getHomeRoute(authStore.authUserItem, companyData);
      navigate(homeRoute);
    }

    // 3. Handle messages and notifications
    if (authStore?.success) {
      Notification("Success", authStore.success, "success");
      dispatch(cleanAuthMessage());
    }

    if (authStore?.error) {
      Notification("Error", authStore.error, "warning");
      dispatch(cleanAuthMessage());
    }

  }, [authStore.actionFlag, authStore.success, authStore.error, authStore.authUserItem, companyData]);

  const onSubmit = (values) => {
    if (values) {
      const authData = {
        email: values.email,
        password: values.password,
      };
      dispatch(login(authData));
    }
  };

  return (
    <div className="auth-wrapper auth-cover">
      <Row className="auth-inner main-left-right m-0">
        <div className="d-none d-lg-flex login-left">
          <div className="w-100 d-lg-flex justify-content-center">
            <picture style={{ display: "contents" }}>
              <source srcSet={mainImageWebp} type="image/webp" />
              <img
                className="img-fluid"
                src={mainImage}
                alt="Login Cover"
                width={780}
                height={900}
                decoding="async"
                fetchpriority="high"
              />
            </picture>
          </div>
        </div>

        <div
          className="h-100 right-login d-flex align-items-center auth-bg px-2 p-lg-5"
        // lg="6"
        // sm="12"
        >
          <Col className="h-100 px-xl-2 mx-auto main-login col-10" sm="8" md="7">
            <div 
              className="w-100 d-lg-flex align-items-center mb-3 justify-content-center" 
              style={{ textAlign: "center" }}
            >
              <img
                className="logo-login"
                src={logoImage}
                alt="Logo Cover"
                decoding="async"
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

            <CardTitle tag="h3" className="fw-bolder mb-1" style={{ textAlign: "center" }}>
              Welcome to {appBaseName}
            </CardTitle>

            <CardTitle tag="p" className="fw-bold mb-1" style={{ textAlign: "center" }}>
              {t("Please sign-in to your account and start the adventure")}
            </CardTitle>

            <Form autoComplete="off" className="auth-login-form mt-2" onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-2">
                <Label className="form-label" for="login-email">
                  {t("Email")}
                </Label>
                <Controller
                  id="email"
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      autoFocus
                      autoComplete="off"
                      className="input-login-email"
                      invalid={errors.email && true}
                      placeholder={PlaceholderSchema?.email}
                    />
                  )}
                />
                <FormFeedback>{errors.email?.message}</FormFeedback>
              </div>

              <div className="mb-1">
                <div className="d-flex justify-content-between">
                  <Label className="form-label bg" for="login-password">
                    {t("Password")}
                  </Label>
                </div>
                <Controller
                  id="password"
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <InputPasswordToggle
                      {...field}
                      invalid={errors.password && true}
                      className="input-group-merge input-login-password"
                    />
                  )}
                />
                <FormFeedback>{errors.password?.message}</FormFeedback>
                <div className="d-flex justify-content-end mt-1">
                  <Link
                    to="/forgot-password"
                    className="form-password"
                    style={{ display: "inline-block" }}
                  >
                    <small>{t("Forgot Password")}?</small>
                  </Link>
                </div>
              </div>

              <Button type="submit" block className="btn-custom">
                {authStore?.loading ? (
                  t("Login")
                ) : (
                  <Spinner
                    className="spinner-border-login"
                    style={{
                      height: "22px",
                      width: "22px",
                      borderColor: "#05DEF5",
                      borderRightColor: "#05DEF5",
                    }}
                  />
                )}
              </Button>

              {/* Sign up link */}
              {/* <div className="text-center mt-2">
                <span>{t("Don’t have an account?")}&nbsp;</span>
                <Link to="/register" className="text-warning fw-bold">
                  {t("Sign up")}
                </Link>
              </div> */}
            </Form>
          </Col>
        </div>
      </Row>
    </div>
  );
};

export default Login;
