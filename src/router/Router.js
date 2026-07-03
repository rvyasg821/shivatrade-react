// ** React Imports
import { lazy } from "react";

// ** Redux Imports
import { useSelector } from "react-redux";

// ** Router imports
import { useRoutes, Navigate } from "react-router-dom";

// ** Layouts
import BlankLayout from "@layouts/BlankLayout";

// ** Utils
import { getCurrentUser, getHomeRoute } from "../utility/Utils";
import { getCompanyData } from "../redux/authentication";

// ** Constant
import { appsRoot } from "@constant/defaultValues";
import Wizard from "../views/auth/register/Wizard";
import { APP_MODE } from "../configs/appMode";

// ** Components
const Login = lazy(() => import("@src/views/auth/login"));
const ForgotPassword = lazy(() => import("@src/views/auth/forgotPassword"));
const ResetPassword = lazy(() => import("@src/views/auth/resetPassword"));
const Error = lazy(() => import("@src/views/pages/misc/Error"));
const NotAuthorized = lazy(() => import("@src/views/pages/misc/NotAuthorized"));
const Company = lazy(() => import("@src/views/company/CompanyTable"));
const ForgotPasswordVerifyOtp = lazy(() => import("@src/views/auth/verifyOtp.js"));
const PlanSelection = lazy(() => import("@src/views/auth/PlanSelection"));
const PlanPayment = lazy(() => import("@src/views/auth/PlanPayment"))

const Router = ({ allRoutes }) => {
  // ** Store Vars
  const authStore = useSelector(state => state.auth);
  const user = authStore?.authUserItem || getCurrentUser();
  const companyData = authStore?.companyData || getCompanyData();

  // ** Get home route centralized
  const homeRoute = getHomeRoute(user, companyData);


  const routes = useRoutes([
    {
      path: "/",
      index: true,
      element: <Navigate replace to={homeRoute} />,
    },
    {
      path: "/apps",
      element: <Navigate replace to="/apps/dashboard" />,
    },
    {
      // Single-tenant mode blocks self-signup — the one company is seeded.
      path: "/register",
      element: <BlankLayout />,
      children: [
        {
          path: "/register",
          element:
            APP_MODE === "single" ? (
              <Navigate replace to="/login" />
            ) : (
              <Wizard />
            ),
        },
      ],
    },
    {
      path: "/login",
      element: <BlankLayout />,
      children: [{ path: "/login", element: <Login /> }],
    },
    {
      path: "/forgot-password",
      element: <BlankLayout />,
      children: [{ path: "/forgot-password", element: <ForgotPassword /> }],
    },
    {
      path: "/forgot-password/otp-verify/:token",
      element: <BlankLayout />,
      children: [{ path: "/forgot-password/otp-verify/:token", element: <ForgotPasswordVerifyOtp /> }],
    },
    {
      path: "/reset-password/verify/:token",
      element: <BlankLayout />,
      children: [
        { path: "/reset-password/verify/:token", element: <ForgotPasswordVerifyOtp /> },
      ],
    },
    {
      path: "/reset-password/:token",
      element: <BlankLayout />,
      children: [
        { path: "/reset-password/:token", element: <ResetPassword /> },
      ],
    },
    {
      path: "/auth/not-auth",
      element: <BlankLayout />,
      children: [{ path: "/auth/not-auth", element: <NotAuthorized /> }],
    },
    {
      path: "*",
      element: <BlankLayout />,
      children: [{ path: "*", element: <Error /> }],
    },
    {
      path: "/plan-selection",
      element: <BlankLayout />,
      children: [{ path: "/plan-selection", element: <PlanSelection user={user} /> }],
    },
    {
      path: "/plan-payment",
      element: <BlankLayout />,
      children: [{ path: "/plan-payment", element: <PlanPayment user={user} /> }],
    },
    ...allRoutes,
  ]);

  return routes;
};

export default Router;
