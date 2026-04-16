/* eslint-disable brace-style */
// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Utils
import {
  getCurrentUser,
  setCurrentUser,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearLocalStorage,
} from "@utils";

// ** Constant
import { initUserItem } from "@constant/reduxConstant";

// ** Helper to build ability
function buildAbilityFromPermissions(userData) {
  const roleName = userData?.role?.name;

  // Only Super Admin gets full access — Company Admin respects their actual permissions
  if (roleName === "Super Admin" || roleName === "Admin") {
    return [{ action: "manage", subject: "all" }];
  }

  const ability = [];
  const actionMap = {
    can_all: "manage",
    can_read: "read",
    can_add: "create",
    can_update: "update",
    can_delete: "delete"
  };

  // Use role permissions (from populated role object) or top-level permissions
  const permissions = userData?.role?.permissions || userData?.permissions;

  if (permissions) {
    Object.entries(permissions).forEach(([subject, actions]) => {
      if (actions && typeof actions === 'object') {
        Object.entries(actions).forEach(([permKey, allowed]) => {
          if (allowed && actionMap[permKey]) {
            ability.push({ action: actionMap[permKey], subject });
          }
        });
      }
    });
  }

  // Always allow reading Auth subject (for login pages)
  ability.push({ action: "read", subject: "Auth" });

  return ability;
}


async function loginRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.auth.login}`, payload)
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const login = createAsyncThunk("appAuth/login", async (payload) => {
  try {
    const response = await loginRequest(payload);

    if (response?.statusCode && response?.data) {
      const { userData, accessToken, refreshToken } = response.data;

      // Build ability from backend permissions
      userData.ability = buildAbilityFromPermissions(userData);

      // Preserve hasActiveSubscription from login response
      if (response.data.hasActiveSubscription !== undefined) {
        userData.hasActiveSubscription = response.data.hasActiveSubscription;
      }

      await setCurrentUser({ userData, ...response.data });

      await setAccessToken(accessToken);
      await setRefreshToken(refreshToken);

      return {
        authUserItem: userData || null,
        accessToken: accessToken || "",
        refreshToken: refreshToken || "",
        actionFlag: "AUTH_SUCCESS",
        success: response.message,
        error: "",
      };
    } else {
      return {
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    }
  } catch (error) {
    return {
      actionFlag: "",
      success: "",
      error,
    };
  }
});

async function getAuthMeRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.auth.me}`, { params })
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const getAuthMe = createAsyncThunk(
  "appAuth/getAuthMe",
  async (params) => {
    try {
      const response = await getAuthMeRequest(params);
      if (response?.statusCode && response?.data) {
        const userData = response.data;

        userData.ability = buildAbilityFromPermissions(userData);

        // Preserve hasActiveSubscription from backend response if available
        if (response.data.hasActiveSubscription !== undefined) {
          userData.hasActiveSubscription = response.data.hasActiveSubscription;
        }

        await setCurrentUser(userData);

        return {
          authUserItem: userData || null,
          actionFlag: "AUTH_ME_SCS",
          success: "",
          error: "",
        };
      }
      else {
        return {
          actionFlag: "AUTH_ME_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "AUTH_ME_ERR",
        success: "",
        error,
      };
    }
  }
);

async function authUpdateMeRequest(payload) {
  return instance
    .put(`${API_ENDPOINTS.auth.updateMe}`, payload)
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const authUpdateMe = createAsyncThunk(
  "appAuth/authUpdateMe",
  async (payload) => {
    try {
      const response = await authUpdateMeRequest(payload);
      if (response?.statusCode && response?.data) {
        response.data.ability = buildAbilityFromPermissions(response.data);
        await setCurrentUser(response?.data);

        return {
          authUserItem: response?.data || null,
          actionFlag: "AUTH_UPDT_ME_SCS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "",
        success: "",
        error,
      };
    }
  }
);

async function changePasswordRequest(payload) {
  return instance
    .patch(`${API_ENDPOINTS.auth.changePassword}`, payload)
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const changePassword = createAsyncThunk(
  "appAuth/changePassword",
  async (payload) => {
    try {
      const response = await changePasswordRequest(payload);
      if (response?.statusCode === 200) {
        return {
          actionFlag: "CHANGE_PSWD_SCS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "",
        success: "",
        error,
      };
    }
  }
);

async function resetPasswordOtpVerifyRequest({ token, otp }) {
  return instance
    .post(`${API_ENDPOINTS.auth.resetPasswordOtpVerify}/${token}`, { otp })
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const resetPasswordOtpVerify = createAsyncThunk(
  "appAuth/resetPasswordOtpVerify",
  async (payload) => {
    try {
      const response = await resetPasswordOtpVerifyRequest(payload);
      if (response && response.statusCode === 200) {
        return {
          data: response?.data,
          actionFlag: "RESET_PASS_OTP_SUCCESS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "RESET_PASS_OTP_ERROR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "RESET_PASS_OTP_ERROR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    }
  }
);

async function forgotPasswordRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.auth.requestResetPasswordOtp}`, payload)
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const forgotPassword = createAsyncThunk(
  "appAuth/forgotPassword",
  async (payload) => {
    try {
      const response = await forgotPasswordRequest(payload);
      if (response && response.statusCode === 200) {
        return {
          actionFlag: "FRGT_SCS",
          data: response?.data,
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "FRGT_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "FRGT_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    }
  }
);

async function verifyForgotTokenRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.auth.verifyToken}/${payload.token}`)
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const verifyForgotToken = createAsyncThunk(
  "appAuth/verifyForgotToken",
  async (payload) => {
    try {
      const response = await verifyForgotTokenRequest(payload);
      if (response && response.statusCode === 200) {
        return {
          forgotTokenVerified: true,
          actionFlag: "FRGT_TKN_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          actionFlag: "FRGT_TKN_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "FRGT_TKN_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    }
  }
);

async function resetPasswordRequest({ token, newPassword }) {
  return instance
    .post(`${API_ENDPOINTS.auth.resetPassword}/${token}`, {
      newPassword,
    })
    .then((auth) => auth.data)
    .catch((error) => error);
}

export const resetPassword = createAsyncThunk(
  "appAuth/resetPassword",
  async (payload) => {
    try {
      const response = await resetPasswordRequest(payload);
      if (response && response.statusCode === 200) {
        return {
          actionFlag: "RESET_PSWD_SCS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    }
  }
);

// ** Impersonation
async function impersonateRequest(companyId) {
  return instance
    .post(`${API_ENDPOINTS.company.impersonate}/${companyId}`)
    .then((res) => res.data)
    .catch((error) => error);
}

export const impersonateCompanyAdmin = createAsyncThunk(
  "appAuth/impersonateCompanyAdmin",
  async (companyId) => {
    try {
      const response = await impersonateRequest(companyId);
      if (response?.statusCode && response?.data) {
        const { userData, accessToken, refreshToken, companyName, hasActiveSubscription } = response.data;

        // Save original Super Admin tokens before swapping
        const originalAccessToken = getAccessToken();
        const originalRefreshToken = getRefreshToken();
        const originalUserData = getCurrentUser();
        localStorage.setItem("sa_accessToken", JSON.stringify(originalAccessToken));
        localStorage.setItem("sa_refreshToken", JSON.stringify(originalRefreshToken));
        localStorage.setItem("sa_userData", JSON.stringify(originalUserData));
        localStorage.setItem("sa_companyName", companyName || "");

        // Build ability for the impersonated user
        userData.ability = buildAbilityFromPermissions(userData);
        userData.isImpersonating = true;
        userData.impersonatingCompanyName = companyName || "";
        userData.hasActiveSubscription = hasActiveSubscription;

        await setCurrentUser({ userData, ...response.data });
        await setAccessToken(accessToken);
        await setRefreshToken(refreshToken);

        return {
          authUserItem: userData,
          accessToken,
          refreshToken,
          actionFlag: "IMPERSONATE_SUCCESS",
          success: "Impersonating as Company Admin",
          error: "",
        };
      } else {
        return {
          actionFlag: "IMPERSONATE_ERROR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "IMPERSONATE_ERROR",
        success: "",
        error: error?.message || "Impersonation failed",
      };
    }
  }
);

// ** Employee Impersonation (Company Admin / Location Admin -> Employee)
export const impersonateEmployee = createAsyncThunk(
  "appAuth/impersonateEmployee",
  async (employeeId) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.employees.impersonate}/${employeeId}`)
        .then((res) => res.data);

      if (response?.statusCode && response?.data) {
        const { userData, accessToken, refreshToken, companyName, employeeName, companyData } = response.data;

        // Save original admin tokens
        const originalAccessToken = getAccessToken();
        const originalRefreshToken = getRefreshToken();
        const originalUserData = getCurrentUser();
        localStorage.setItem("admin_accessToken", JSON.stringify(originalAccessToken));
        localStorage.setItem("admin_refreshToken", JSON.stringify(originalRefreshToken));
        localStorage.setItem("admin_userData", JSON.stringify(originalUserData));
        localStorage.setItem("admin_employeeName", employeeName || "");

        userData.ability = buildAbilityFromPermissions(userData);
        userData.isImpersonatingEmployee = true;
        userData.impersonatingEmployeeName = employeeName || "";
        if (companyData) userData.company = companyData;

        await setCurrentUser({ userData, ...response.data });
        await setAccessToken(accessToken);
        await setRefreshToken(refreshToken);

        // Hard-navigate IMMEDIATELY before Redux updates `state.authUserItem`
        // with the new employee user. If we let the thunk resolve normally,
        // React re-renders the current /apps/employees page with the new
        // (employee) auth state, which doesn't have employee.read permission,
        // and the route guard bounces to /auth/not-auth — the flash the user
        // sees. Triggering a hard navigation here means the next page load
        // reads the new tokens fresh from localStorage with the correct
        // dashboard route from the start.
        if (typeof window !== 'undefined') {
          window.location.replace('/apps/dashboard');
        }

        return {
          // NOTE: deliberately NOT returning authUserItem here so the reducer
          // skips the Redux state update. The page is unloading anyway and we
          // don't want a transient employee-user state to trigger route guards.
          accessToken,
          refreshToken,
          actionFlag: "IMPERSONATE_EMP_SUCCESS",
          success: `Viewing as ${employeeName}`,
          error: "",
        };
      } else {
        return {
          actionFlag: "IMPERSONATE_EMP_ERROR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "IMPERSONATE_EMP_ERROR",
        success: "",
        error: error?.message || "Impersonation failed",
      };
    }
  }
);

export const appAuthSlice = createSlice({
  name: "appAuth",
  initialState: {
    authUserItem: getCurrentUser() ? getCurrentUser() : initUserItem,
    accessToken: getAccessToken() || "",
    refreshToken: getRefreshToken() || "",
    data: [],
    forgotTokenVerified: false,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    logout: (state) => {
      clearLocalStorage();
      state.authUserItem = initUserItem;
      state.accessToken = "";
      state.refreshToken = "";
    },

    cleanAuthMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },

    exitImpersonation: (state) => {
      // Restore original Super Admin tokens
      const saAccessToken = JSON.parse(localStorage.getItem("sa_accessToken") || "null");
      const saRefreshToken = JSON.parse(localStorage.getItem("sa_refreshToken") || "null");
      const saUserData = JSON.parse(localStorage.getItem("sa_userData") || "null");

      if (saAccessToken && saUserData) {
        setAccessToken(saAccessToken);
        setRefreshToken(saRefreshToken);
        setCurrentUser(saUserData);

        state.authUserItem = saUserData;
        state.accessToken = saAccessToken;
        state.refreshToken = saRefreshToken;
      }

      // Clean up impersonation storage
      localStorage.removeItem("sa_accessToken");
      localStorage.removeItem("sa_refreshToken");
      localStorage.removeItem("sa_userData");
      localStorage.removeItem("sa_companyName");
    },

    exitEmployeeImpersonation: (state) => {
      const adminAccessToken = JSON.parse(localStorage.getItem("admin_accessToken") || "null");
      const adminRefreshToken = JSON.parse(localStorage.getItem("admin_refreshToken") || "null");
      const adminUserData = JSON.parse(localStorage.getItem("admin_userData") || "null");

      if (adminAccessToken && adminUserData) {
        setAccessToken(adminAccessToken);
        setRefreshToken(adminRefreshToken);
        setCurrentUser(adminUserData);
        state.authUserItem = adminUserData?.userData || adminUserData;
        state.accessToken = adminAccessToken;
        state.refreshToken = adminRefreshToken;
      }

      localStorage.removeItem("admin_accessToken");
      localStorage.removeItem("admin_refreshToken");
      localStorage.removeItem("admin_userData");
      localStorage.removeItem("admin_employeeName");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.authUserItem = action.payload?.authUserItem || initUserItem;
        state.accessToken = action.payload?.accessToken;
        state.refreshToken = action.payload?.refreshToken;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(login.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getAuthMe.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getAuthMe.fulfilled, (state, action) => {
        state.authUserItem = action.payload?.authUserItem || initUserItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getAuthMe.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "AUTH_ME_ERR";
        state.success = "";
        state.error = "";
      })
      .addCase(authUpdateMe.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(authUpdateMe.fulfilled, (state, action) => {
        state.authUserItem = action.payload?.authUserItem || state.authUserItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(authUpdateMe.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(changePassword.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(changePassword.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.actionFlag = action.payload.actionFlag;
        state.data = action.payload.data;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(forgotPassword.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(verifyForgotToken.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(verifyForgotToken.fulfilled, (state, action) => {
        state.forgotTokenVerified = action.payload.forgotTokenVerified || false;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(verifyForgotToken.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(resetPassword.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(resetPasswordOtpVerify.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(resetPasswordOtpVerify.fulfilled, (state, action) => {
        state.actionFlag = action.payload.actionFlag;
        state.data = action.payload.data;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(resetPasswordOtpVerify.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(impersonateCompanyAdmin.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(impersonateCompanyAdmin.fulfilled, (state, action) => {
        if (action.payload?.authUserItem) {
          state.authUserItem = action.payload.authUserItem;
        }
        state.accessToken = action.payload?.accessToken || state.accessToken;
        state.refreshToken = action.payload?.refreshToken || state.refreshToken;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(impersonateCompanyAdmin.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      // Employee impersonation
      .addCase(impersonateEmployee.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(impersonateEmployee.fulfilled, (state, action) => {
        if (action.payload?.authUserItem) state.authUserItem = action.payload.authUserItem;
        state.accessToken = action.payload?.accessToken || state.accessToken;
        state.refreshToken = action.payload?.refreshToken || state.refreshToken;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(impersonateEmployee.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      });
  },
});

export const { logout, cleanAuthMessage, exitImpersonation, exitEmployeeImpersonation } = appAuthSlice.actions;

export default appAuthSlice.reducer;
