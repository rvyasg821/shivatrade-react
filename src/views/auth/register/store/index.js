// src/views/auth/register/store.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import instance from '@src/utility/AxiosConfig';
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints';
import {
  setAccessToken,
  setCurrentUser,
  setRefreshToken,
} from '../../../../utility/Utils';

// Initial state
const initRegisterItem = {
  company_name: '',
  fname: '',
  lname: '',
  email: '',
  mobile: '',
  country_code: {
    code: '+1',
    name: 'United States',
    countryCode: 'us',
    format: '+.. .....-.....',
  },
  password: '',
  website: '', // Optional, default blank
  token: null, // Include token at root to avoid undefined issues
};

// Initial plan selection state
const initPlanSelection = {
  selectedPlan: null,
  selectedTools: [], // Array of selected tool IDs
  billingCycle: 'MONTHLY', // "MONTHLY", "YEARLY", "WEEKLY", or "TRIAL"
  selectedLocations: 1, // Number of locations selected (default 1)
  totalPrice: 0,
  platformFee: 0,
  tax_info: {},
  payment_gateway: 'stripe' // Default payment gateway: 'stripe' or 'paypal'
};

// Initial payment state
const initPaymentState = {
  paymentItem: null,
  paymentLoading: false,
  paymentActionFlag: '',
  paymentSuccess: '',
  paymentError: '',
};

// Initial trial state
const initTrialState = {
  trialLoading: false,
  trialActionFlag: '',
  trialSuccess: '',
  trialError: '',
};

function buildAbilityFromPermissions(userData) {
  // If role is Admin → full access
  if (userData?.role?.name?.toLowerCase().includes('admin')) {
    return [{ action: 'manage', subject: 'all' }];
  }

  const ability = [];
  const actionMap = {
    can_all: 'manage',
    can_read: 'read',
    can_add: 'create',
    can_update: 'update',
    can_delete: 'delete',
  };

  if (userData?.permissions) {
    Object.entries(userData.permissions).forEach(([subject, actions]) => {
      Object.entries(actions).forEach(([permKey, allowed]) => {
        if (allowed && actionMap[permKey]) {
          ability.push({ action: actionMap[permKey], subject });
        }
      });
    });
  }

  return ability;
}

// Async thunk for registration
async function registerRequest(payload) {
  const requestPayload = { ...payload, website: payload.website || '' };
  return instance
    .post(`${API_ENDPOINTS.auth.register}`, requestPayload)
    .then((res) => res.data)
    .catch((err) => err);
}

// Async thunk for fetching plans
async function fetchPlansRequest() {
  // Fetch all plans without filtering - client-side filtering will be used
  const url = API_ENDPOINTS.plan.publicFilteredList;

  return instance
    .get(url)
    .then((res) => res.data)
    .catch((err) => err);
}

async function getStoredCardsRequest(user_id) {
  try {
    const params = {
      user_id: user_id   // since user_id is actually company_id
    };

    const response = await instance.get(
      `${API_ENDPOINTS.payments.storedCard}`,
      { params }
    );

    return response.data;

  } catch (error) {
    console.error('getStoredCardsRequest error', error);
    return {
      statusCode: 500,
      data: [],
      message: error.message || 'API Error'
    };
  }
}


export const getStoredCard = createAsyncThunk(
  "appStoredCard/getStoredCard",
  async (companyId) => {
    const response = await getStoredCardsRequest(companyId);

    if (response?.statusCode === 200 && response?.data) {
      return {
        id: companyId,
        paymentItem: response.data,
        actionFlag: "PAYM_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        id: companyId,
        paymentItem: null,
        actionFlag: "PAYM_ERR",
        success: "",
        error: response?.message || "Failed to fetch subscription",
      };
    }
  }
);

// Fetch active card for admin plan assignment (with fallback strategy)
async function getActiveCardRequest(userId, gateway) {
  try {
    const params = { gateway };
    const response = await instance.get(
      `${API_ENDPOINTS.payments.activeCard}/${userId}`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('getActiveCardRequest error', error);
    return {
      statusCode: 500,
      data: null,
      message: error.message || 'API Error'
    };
  }
}

export const getActiveCard = createAsyncThunk(
  "appStoredCard/getActiveCard",
  async ({ userId, gateway }) => {
    const response = await getActiveCardRequest(userId, gateway);

    if (response?.statusCode === 200 && response?.data) {
      return {
        id: userId,
        activeCard: response.data,
        actionFlag: "ACTIVE_CARD_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        id: userId,
        activeCard: null,
        actionFlag: "ACTIVE_CARD_ERR",
        success: "",
        error: response?.message || "Failed to fetch active card",
      };
    }
  }
);

export const createAccount = createAsyncThunk(
  'register/createAccount',
  async (payload) => {
    try {
      const response = await registerRequest(payload);

      if (response?.statusCode && response?.data) {
        const { token, ...userData } = response.data;
        // const { accessToken, refreshToken, ...userData } = response.data;
        // const token = { accessToken, refreshToken };

        // Map country_code properly
        userData.country_code = {
          code: userData?.country_code?.dialCode || '+1',
          name: userData?.country_code?.name || 'United States',
          countryCode: userData?.country_code?.countryCode || 'us',
          format: userData?.country_code?.format || '+.. .....-.....',
        };

        userData.ability = buildAbilityFromPermissions(userData);
        const savedData = JSON.parse(localStorage.getItem("registerFormData")) || {};
        const updatedData = {
          ...savedData,
          userId: response?.data?._id,
          primaryEmail: response?.data?.email // Add new field
        };
        localStorage.setItem("registerFormData", JSON.stringify(updatedData));

        await setCurrentUser(userData);
        await setAccessToken(token.accessToken);
        await setRefreshToken(token.refreshToken);

        // Store the cross-login URL for redirect to appointment app
        const appointmentAppCrossLoginUrl = response.data?.appointmentAppCrossLoginUrl || '';
        if (appointmentAppCrossLoginUrl) {
          localStorage.setItem('appointmentAppCrossLoginUrl', appointmentAppCrossLoginUrl);
        }

        // Set justSignedUp flag for dashboard redirect
        localStorage.setItem('justSignedUp', 'true');

        return {
          registerItem: { ...userData, token, appointmentAppCrossLoginUrl },
          actionFlag: 'REGISTER_SCS',
          success: response.data?.message || 'Registration successful',
          error: '',
          appointmentAppCrossLoginUrl,
        };
      } else {
        return {
          actionFlag: 'REGISTER_ERR',
          success: '',
          error:
            response?.response?.data?.message ||
            response.message ||
            'Registration failed',
        };
      }
    } catch (error) {
      return {
        actionFlag: 'REGISTER_ERR',
        success: '',
        error:
          error?.response?.data?.message ||
          error.message ||
          'Registration failed',
      };
    }
  },
);

// Async thunk for completing registration with plan selection
export const completeRegistrationWithPlan = createAsyncThunk(
  'register/completeRegistrationWithPlan',
  async (_, { getState }) => {
    try {
      const state = getState().register;
      const registrationData = {
        ...state.registerItem,
        selectedPlan: state.planSelection.selectedPlan,
        billingCycle: state.planSelection.billingCycle,
        totalPrice: state.planSelection.totalPrice,
      };

      const response = await registerRequest(registrationData);

      if (response?.statusCode && response?.data) {
        const { token, ...userData } = response.data;
        // Map country_code properly
        userData.country_code = {
          code: userData?.country_code?.dialCode || '+1',
          name: userData?.country_code?.name || 'United States',
          countryCode: userData?.country_code?.countryCode || 'us',
          format: userData?.country_code?.format || '+.. .....-.....',
        };

        userData.ability = buildAbilityFromPermissions(userData);

        await setCurrentUser(userData);
        await setAccessToken(token.accessToken);
        await setRefreshToken(token.refreshToken);

        return {
          registerItem: { ...userData, token },
          actionFlag: 'REGISTER_WITH_PLAN_SCS',
          success: 'Registration completed successfully',
          error: '',
        };
      } else {
        return {
          actionFlag: 'REGISTER_WITH_PLAN_ERR',
          success: '',
          error:
            response?.response?.data?.message ||
            response.message ||
            'Registration failed',
        };
      }
    } catch (error) {
      return {
        actionFlag: 'REGISTER_WITH_PLAN_ERR',
        success: '',
        error:
          error?.response?.data?.message ||
          error.message ||
          'Registration failed',
      };
    }
  },
);

// Async thunk for starting trial subscription
export const startTrial = createAsyncThunk(
  'register/startTrial',
  async (payload) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.subscription.startTrial, payload)
        .then((res) => res.data)
        .catch((err) => err);

      if (response?.statusCode && response?.data) {
        // Save cross-login URL to localStorage if provided
        const appointmentAppCrossLoginUrl = response.data?.appointmentAppCrossLoginUrl || '';
        if (appointmentAppCrossLoginUrl) {
          localStorage.setItem('appointmentAppCrossLoginUrl', appointmentAppCrossLoginUrl);
        }

        // Set justSignedUp flag for dashboard redirect
        localStorage.setItem('justSignedUp', 'true');

        return {
          trialData: response.data,
          actionFlag: 'START_TRIAL_SCS',
          success: response.message || 'Trial started successfully',
          error: '',
        };
      } else {
        return {
          trialData: null,
          actionFlag: 'START_TRIAL_ERR',
          success: '',
          error:
            response?.response?.data?.message ||
            response.message ||
            'Failed to start trial',
        };
      }
    } catch (error) {
      return {
        trialData: null,
        actionFlag: 'START_TRIAL_ERR',
        success: '',
        error:
          error?.response?.data?.message ||
          error.message ||
          'Failed to start trial',
      };
    }
  },
);

// Async thunk for fetching plans
export const fetchPlans = createAsyncThunk('register/fetchPlans', async () => {
  try {
    const response = await fetchPlansRequest();

    if (response?.data || Array.isArray(response)) {
      // Handle new response format with _pagination and data array
      const plans = response?.data || response;

      // Filter active plans and sort by displayOrder
      const activePlans = plans
        .filter((plan) => !plan.soft_delete && plan.status !== 0)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      localStorage.setItem('taxInfo', JSON.stringify(response?.tax_info))
      localStorage.setItem('paymentGateway', response?.payment_gateway || 'stripe')
      return {
        plans: activePlans,
        filters: response?._filters || [],
        pagination: response?._pagination || {},
        tax_info: response?.tax_info || {},
        payment_gateway: response?.payment_gateway || 'stripe',
        actionFlag: 'FETCH_PLANS_SCS',
        success: 'Plans loaded successfully',
        error: '',
      };
    } else {
      return {
        plans: [],
        filters: [],
        pagination: {},
        tax_info: {},
        payment_gateway: 'stripe',
        actionFlag: 'FETCH_PLANS_ERR',
        success: '',
        error:
          response?.response?.data?.message ||
          response.message ||
          'Failed to load plans',
      };
    }
  } catch (error) {
    return {
      plans: [],
      actionFlag: 'FETCH_PLANS_ERR',
      success: '',
      error:
        error?.response?.data?.message ||
        error.message ||
        'Failed to load plans',
    };
  }
});

// Async thunk for PayPal card payment
export const paypalCardPayment = createAsyncThunk(
  'register/paypalCardPayment',
  async (payload) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.payments.paypalCardPayment, payload)
        .then((res) => res.data)
        .catch((err) => err);

      if (response?.statusCode && response?.data) {
        return {
          paymentItem: response.data?.payment,
          paymentActionFlag: 'PPAL_CRD_PMNT_SCS',
          paymentSuccess: response.message || 'Payment processed successfully',
          paymentError: '',
        };
      } else {
        return {
          paymentItem: null,
          paymentActionFlag: 'PPAL_CRD_PMNT_ERR',
          paymentSuccess: '',
          paymentError:
            response?.response?.data?.message ||
            response.message ||
            'Payment failed',
        };
      }
    } catch (error) {
      return {
        paymentItem: null,
        paymentActionFlag: 'PPAL_CRD_PMNT_ERR',
        paymentSuccess: '',
        paymentError:
          error?.response?.data?.message || error.message || 'Payment failed',
      };
    }
  },
);



// Async thunk for confirming PayPal redirect payment
export const confirmRedirectPaypalPayment = createAsyncThunk(
  'register/confirmRedirectPaypalPayment',
  async (payload) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.payments.confirmPaypalPayment, payload)
        .then((res) => res.data)
        .catch((err) => err);

      if (response?.statusCode && response?.data) {
        return {
          paymentItem: response.data?.data,
          paymentActionFlag: 'PPAL_RDRT_PMNT_CNFRM_SCS',
          paymentSuccess: response.message || 'Payment confirmed successfully',
          paymentError: '',
        };
      } else {
        return {
          paymentItem: null,
          paymentActionFlag: 'PPAL_RDRT_PMNT_CNFRM_ERR',
          paymentSuccess: '',
          paymentError:
            response?.response?.data?.message ||
            response.message ||
            'Payment confirmation failed',
        };
      }
    } catch (error) {
      return {
        paymentItem: null,
        paymentActionFlag: 'PPAL_RDRT_PMNT_CNFRM_ERR',
        paymentSuccess: '',
        paymentError:
          error?.response?.data?.message ||
          error.message ||
          'Payment confirmation failed',
      };
    }
  },
);

// Request function
async function verificationOtpGeneratorRequest({ email }) {
  return instance
    .post(API_ENDPOINTS.auth.generateEmailOtp, { email })
    .then((res) => res.data)
    .catch((error) => error);
}

// Redux Thunk
export const verificationOtpGenerator = createAsyncThunk(
  "appAuth/verificationOtpGenerator",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await verificationOtpGeneratorRequest(payload);

      if (response && response.statusCode === 200) {
        return {
          data: response?.data,
          actionFlag: "VERIFY_OTP_GENERATE_SUCCESS",
          success: response.message,
          error: "",
        };
      } else {
        // ❌ Throw error or use rejectWithValue
        return rejectWithValue(
          response?.response?.data?.message || response.message || "OTP generation failed"
        );
      }
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || "OTP generation failed"
      );
    }
  }
);

// Request function
async function verificationOtpVerifyRequest({ email, otp }) {
  return instance
    .post(API_ENDPOINTS.auth.verifyEmailOtp, { email, otp })
    .then((res) => res.data)
    .catch((error) => error);
}

// Redux Thunk
export const verificationOtpVerify = createAsyncThunk(
  "appAuth/verificationOtpVerify",
  async (payload) => {
    try {
      const response = await verificationOtpVerifyRequest(payload);

      if (response && response.statusCode === 200) {
        return {
          data: response?.data,
          actionFlag: "VERIFY_OTP_SUCCESS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "VERIFY_OTP_ERROR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "VERIFY_OTP_ERROR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

async function checkUserExistRequest({ email, userId }) {
  return instance
    .post(API_ENDPOINTS.auth.userExist, { email, userId })
    .then((res) => res.data)
    .catch((error) => error);
}

export const checkUserExist = createAsyncThunk(
  "appAuth/checkUserExist",
  async (payload) => {
    try {
      const response = await checkUserExistRequest(payload);

      if (response && response.statusCode === 201) {
        const userExists = response?.data?.userExists;

        return {
          data: response?.data,
          actionFlag: userExists
            ? "USER_EXIST_SUCCESS"
            : "USER_NOT_FOUND_SUCCESS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "USER_EXIST_ERROR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        actionFlag: "USER_EXIST_ERROR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

async function validateReferralCodeRequest(referalCode) {
  const url = API_ENDPOINTS.auth.referalCodeValidation.replace(
    "{referalCode}",
    referalCode
  );

  return instance
    .get(url)
    .then((res) => res.data)
    .catch((error) => error);
}

export const validateReferralCode = createAsyncThunk(
  "appAuth/validateReferralCode",
  async (payload) => {
    try {
      const response = await validateReferralCodeRequest(payload);
      if (response && response.statusCode === 200) {
        return {
          data: response?.data,
          actionFlag: "REFERRAL_CODE_VALID_SUCCESS",
          success: response.message,
          error: "",
        };
      } else {
        return {
          actionFlag: "REFERRAL_CODE_VALID_ERROR",
          success: "",
          error: response.message,
        }
      }
    } catch (error) {
      return {
        actionFlag: "REFERRAL_CODE_VALID_ERROR",
        success: "",
        error: response.message,
      }
    }
  }
);

async function applyDiscountCodeRequest(payload) {
  // The API expects discount_code, amount, and locations for validation
  const params = {
    discount_code: payload.code,
    amount: payload.amount,
    company_id: payload.company_id,
    user_id: payload.user_id,
  };

  // Add locations parameter if provided (for location-based discount validation)
  if (payload.locations) {
    params.locations = payload.locations;
  }

  return instance
    .get(API_ENDPOINTS.auth.discountCodeApply, {
      params: params
    })
    .then((res) => res.data)
    .catch((error) => {
      return error.response?.data || error;
    });
}

export const applyDiscountCode = createAsyncThunk(
  'register/applyDiscountCode',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await applyDiscountCodeRequest(payload);

      if (response?.data) {
        // Check if discount is NOT valid (valid: false or can_apply: false)
        if (response.data.valid === false || response.data.can_apply === false) {
          // Check for location eligibility error
          if (response.data.error_type === 'LOCATION_NOT_ELIGIBLE') {
            return rejectWithValue(
              response.data.message ||
              `This discount code is not valid for ${payload.locations} location(s).`
            );
          }
          // Other validation errors
          return rejectWithValue(
            response.data.message || 'Discount code is not valid'
          );
        }

        // Return the entire response data which contains pricing fields at root level
        return {
          appliedDiscount: {
            ...response.data,
            total_price: response.data.total_price,
            discounted_price: response.data.discounted_price,
            price: response.data.price,
            isLocationEligible: response.data.is_location_eligible !== false,
            locationRules: response.data.location_rules || [],
            currentLocations: response.data.current_locations,
          },
          actionFlag: 'DISCOUNT_CODE_APPLIED_SUCCESS',
          success: response.data.message || 'Discount applied successfully',
          error: '',
        };
      } else {
        return rejectWithValue(
          response?.message || response?.response?.data?.message || 'Failed to apply discount'
        );
      }
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || 'Failed to apply discount code'
      );
    }
  }
);

// Slice
export const registerSlice = createSlice({
  name: 'register',
  initialState: {
    registerItem: initRegisterItem,
    planSelection: initPlanSelection,
    plans: [],
    filters: [],
    pagination: {},
    tax_info: {},
    payment_gateway: 'stripe',
    plansLoading: false,
    actionFlag: '',
    loading: false,
    success: '',
    error: '',
    referalCode: '',
    // Payment state
    ...initPaymentState,
    // Trial state
    ...initTrialState,
    storedCards: {},
    // Active card state (for admin plan assignment)
    activeCard: null,
    activeCardLoading: false,
    activeCardError: null,
  },
  reducers: {
    cleanCreateAccountMessage: (state) => {
      state.actionFlag = '';
      state.success = '';
      state.error = '';
    },
    setBillingCycle: (state, action) => {
      state.planSelection.billingCycle = action.payload;
      localStorage.setItem("billingCycle", action.payload);
    },
    setSelectedLocations: (state, action) => {
      state.planSelection.selectedLocations = action.payload;
      localStorage.setItem("selectedLocations", JSON.stringify(action.payload));
    },
    selectPlan: (state, action) => {
      const plan = action.payload;
      state.planSelection.selectedPlan = plan;

      // Auto-select mandatory tools, rest user can choose
      const mandatoryToolIds = (plan.tools || [])
        .filter(tool => tool.is_mandatory || tool.mandatory)
        .map(tool => tool._id);
      state.planSelection.selectedTools = mandatoryToolIds;

      // Set default selected locations from smallest location_pricing tier (sorted)
      const sortedTiers = [...(plan.location_pricing || [])].sort((a, b) => a.locations - b.locations);
      const firstTier = sortedTiers[0];
      state.planSelection.selectedLocations = firstTier?.locations || 1;

      // Set platform fee but no tools selected initially
      const platformFee = firstTier?.price || plan.platform_price || 0;
      state.planSelection.totalPrice = platformFee;
      state.planSelection.platformFee = platformFee;
      state.planSelection.tax_info = action.payload.tax_info;
      state.planSelection.payment_gateway = state.payment_gateway || 'stripe';

      localStorage.setItem("selectedPlan", JSON.stringify(action.payload));
      localStorage.setItem("selectedLocations", JSON.stringify(state.planSelection.selectedLocations));
      localStorage.setItem("selectedTools", JSON.stringify(state.planSelection.selectedTools));
    },
    toggleTool: (state, action) => {
      const toolId = action.payload;
      const selectedTools = state.planSelection.selectedTools;

      if (selectedTools.includes(toolId)) {
        // Remove tool from selection
        state.planSelection.selectedTools = selectedTools.filter(
          (id) => id !== toolId,
        );
      } else {
        // Add tool to selection
        state.planSelection.selectedTools = [...selectedTools, toolId];
      }

      localStorage.setItem(
        "selectedTools",
        JSON.stringify(state.planSelection.selectedTools)
      );

      // // If all tools are deselected, clear the plan selection
      // if (state.planSelection.selectedTools.length === 0) {
      //   state.planSelection.selectedPlan = null;
      //   state.planSelection.totalPrice = 0;
      //   state.planSelection.platformFee = 0;
      //   localStorage.removeItem("selectedTools");

      // } else {
      //   // Recalculate total price based on selected tools
      //   if (state.planSelection.selectedPlan) {
      //     const selectedToolsData =
      //       state.planSelection.selectedPlan.tools.filter((tool) =>
      //         state.planSelection.selectedTools.includes(tool._id),
      //       );
      //     const toolsTotal = selectedToolsData.reduce(
      //       (sum, tool) => sum + tool.price,
      //       0,
      //     );
      //     const platformFee = state.planSelection.platformFee;

      //     state.planSelection.totalPrice = toolsTotal + platformFee;
      //   }
      // }

    },
    clearPlanSelection: (state) => {
      state.planSelection = {
        ...state.planSelection,        // ✅ keep billingCycle
        selectedPlan: null,
        selectedTools: [],
        totalPrice: 0,
        platformFee: 0,
        tax_info: {},
        payment_gateway: state.payment_gateway || 'stripe'
      };
      localStorage.removeItem("selectedPlan");
    },
    autoSelectFirstPlan: (state, action) => {
      const plans = action.payload;
      if (plans.length > 0 && !state.planSelection.selectedPlan) {
        const firstPlan = plans[0];
        state.planSelection.selectedPlan = firstPlan;

        // Auto-select mandatory tools
        const mandatoryToolIds = (firstPlan.tools || [])
          .filter(tool => tool.is_mandatory || tool.mandatory)
          .map(tool => tool._id);
        state.planSelection.selectedTools = mandatoryToolIds;

        // Set default selected locations from smallest location_pricing tier (sorted)
        const sortedTiers = [...(firstPlan.location_pricing || [])].sort((a, b) => a.locations - b.locations);
        const firstTier = sortedTiers[0];
        state.planSelection.selectedLocations = firstTier?.locations || 1;

        const platformFee = firstTier?.price || firstPlan.platform_price || 0;
        state.planSelection.totalPrice = platformFee;
        state.planSelection.platformFee = platformFee;
        state.planSelection.tax_info = plans.tax_info;
        state.planSelection.payment_gateway = state.payment_gateway || 'stripe';
        localStorage.setItem("selectedPlan", JSON.stringify(firstPlan));
        localStorage.setItem("selectedLocations", JSON.stringify(state.planSelection.selectedLocations));
        localStorage.setItem("selectedTools", JSON.stringify(state.planSelection.selectedTools));
      }

    },
    cleanPlansMessage: (state) => {
      if (state.actionFlag.includes('PLANS')) {
        state.actionFlag = '';
        state.success = '';
        state.error = '';
      }
    },
    saveCompanyDetails: (state, action) => {
      state.registerItem = { ...state.registerItem, ...action.payload };
    },
    cleanPaymentMessage: (state) => {
      state.paymentActionFlag = '';
      state.paymentSuccess = '';
      state.paymentError = '';
    },
    resetPaymentState: (state) => {
      Object.assign(state, initPaymentState);
    },
    filterPlansByBillingCycle: (state) => {
      // Client-side filtering - no API call needed
      // This is handled in the selector now
    },
    cleanTrialMessage: (state) => {
      state.trialActionFlag = '';
      state.trialSuccess = '';
      state.trialError = '';
    },
    clearDiscountError: (state) => {
      state.discountData = null;
      state.actionFlag = '';
      state.error = '';
    },
    clearAppliedDiscountData: (state) => {
      state.appliedDiscount = null;
      state.actionFlag = '';
      state.error = '';
    }

  },
  extraReducers: (builder) => {
    builder
      // Create Account cases
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.actionFlag = '';
        state.success = '';
        state.error = '';
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.registerItem = action.payload?.registerItem || initRegisterItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = false;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = 'REGISTER_ERR';
        state.success = '';
        state.error =
          action.error?.message ||
          action.payload?.error ||
          'Failed to register';
      })
      // Fetch Plans cases
      .addCase(fetchPlans.pending, (state) => {
        state.plansLoading = true;
        state.actionFlag = '';
        state.success = '';
        state.error = '';
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.plans = action.payload?.plans || [];
        state.filters = action.payload?.filters || [];
        state.pagination = action.payload?.pagination || {};
        state.tax_info = action.payload?.tax_info || {};
        state.payment_gateway = action.payload?.payment_gateway || 'stripe';
        state.actionFlag = action.payload.actionFlag;
        state.plansLoading = false;
        state.success = action.payload.success;
        state.error = action.payload.error;

        // Only reset planSelection if there's no existing selection
        // This preserves the selection when navigating back from payment step
        if (!state.planSelection.selectedPlan) {
          // Try to restore from localStorage first
          const savedPlan = localStorage.getItem("selectedPlan");
          const savedTools = localStorage.getItem("selectedTools");
          const savedLocations = localStorage.getItem("selectedLocations");
          const savedBillingCycle = localStorage.getItem("billingCycle");

          if (savedPlan) {
            try {
              const parsedPlan = JSON.parse(savedPlan);
              const parsedTools = savedTools ? JSON.parse(savedTools) : [];
              const parsedLocations = savedLocations ? JSON.parse(savedLocations) : 1;

              // Find the plan in fetched plans to ensure it's still valid
              const validPlan = state.plans.find(p => p._id === parsedPlan._id);
              if (validPlan) {
                state.planSelection.selectedPlan = validPlan;
                state.planSelection.selectedTools = parsedTools;
                state.planSelection.selectedLocations = parsedLocations;
                state.planSelection.billingCycle = savedBillingCycle || "MONTHLY";
              } else {
                // Plan not found, reset to defaults
                state.planSelection = {
                  selectedPlan: null,
                  selectedTools: [],
                  selectedLocations: 1,
                  billingCycle: "MONTHLY",
                };
              }
            } catch (e) {
              state.planSelection = {
                selectedPlan: null,
                selectedTools: [],
                selectedLocations: 1,
                billingCycle: "MONTHLY",
              };
            }
          } else {
            state.planSelection = {
              selectedPlan: null,
              selectedTools: [],
              selectedLocations: 1,
              billingCycle: "MONTHLY",
            };
          }
        }
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.plansLoading = false;
        state.actionFlag = 'FETCH_PLANS_ERR';
        state.success = '';
        state.error =
          action.error?.message ||
          action.payload?.error ||
          'Failed to load plans';
      })
      // Complete Registration with Plan cases
      .addCase(completeRegistrationWithPlan.pending, (state) => {
        state.loading = true;
        state.actionFlag = '';
        state.success = '';
        state.error = '';
      })
      .addCase(completeRegistrationWithPlan.fulfilled, (state, action) => {
        state.registerItem = action.payload?.registerItem || initRegisterItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = false;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(completeRegistrationWithPlan.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = 'REGISTER_WITH_PLAN_ERR';
        state.success = '';
        state.error =
          action.error?.message ||
          action.payload?.error ||
          'Failed to complete registration';
      })
      // PayPal Card Payment cases
      .addCase(paypalCardPayment.pending, (state) => {
        state.paymentLoading = true;
        state.paymentActionFlag = '';
        state.paymentSuccess = '';
        state.paymentError = '';
      })
      .addCase(paypalCardPayment.fulfilled, (state, action) => {
        state.paymentItem = action.payload?.paymentItem || null;
        state.paymentActionFlag = action.payload.paymentActionFlag;
        state.paymentLoading = false;
        state.paymentSuccess = action.payload.paymentSuccess;
        state.paymentError = action.payload.paymentError;
      })
      .addCase(paypalCardPayment.rejected, (state, action) => {
        state.paymentLoading = false;
        state.paymentActionFlag = 'PPAL_CRD_PMNT_ERR';
        state.paymentSuccess = '';
        state.paymentError =
          action.error?.message ||
          action.payload?.paymentError ||
          'Payment failed';
      })
      // Confirm PayPal Redirect Payment cases
      .addCase(confirmRedirectPaypalPayment.pending, (state) => {
        state.paymentLoading = true;
        state.paymentActionFlag = '';
        state.paymentSuccess = '';
        state.paymentError = '';
      })
      .addCase(confirmRedirectPaypalPayment.fulfilled, (state, action) => {
        state.paymentItem = action.payload?.paymentItem || null;
        state.paymentActionFlag = action.payload.paymentActionFlag;
        state.paymentLoading = false;
        state.paymentSuccess = action.payload.paymentSuccess;
        state.paymentError = action.payload.paymentError;
      })
      .addCase(confirmRedirectPaypalPayment.rejected, (state, action) => {
        state.paymentLoading = false;
        state.paymentActionFlag = 'PPAL_RDRT_PMNT_CNFRM_ERR';
        state.paymentSuccess = '';
        state.paymentError =
          action.error?.message ||
          action.payload?.paymentError ||
          'Payment confirmation failed';
      })
      // Start Trial cases
      .addCase(startTrial.pending, (state) => {
        state.trialLoading = true;
        state.trialActionFlag = '';
        state.trialSuccess = '';
        state.trialError = '';
      })
      .addCase(startTrial.fulfilled, (state, action) => {
        state.trialLoading = false;
        state.trialActionFlag = action.payload.actionFlag;
        state.trialSuccess = action.payload.success;
        state.trialError = action.payload.error;
      })
      .addCase(startTrial.rejected, (state, action) => {
        state.trialLoading = false;
        state.trialActionFlag = 'START_TRIAL_ERR';
        state.trialSuccess = '';
        state.trialError =
          action.error?.message ||
          action.payload?.error ||
          'Failed to start trial';
      })
      .addCase(verificationOtpGenerator.pending, (state) => {
        state.loading = true;
        state.actionFlag = "VERIFY_OTP_GENERATE_PENDING";
      })
      .addCase(verificationOtpGenerator.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(verificationOtpGenerator.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "VERIFY_OTP_GENERATE_ERROR";
        state.error = action.error.message;
      })
      .addCase(checkUserExist.pending, (state) => {
        state.loading = true;
        state.actionFlag = "USER_EXIST_PENDING";
      })
      .addCase(checkUserExist.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
        state.userExistData = action.payload.data; // optional: store response data
      })
      .addCase(checkUserExist.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "USER_EXIST_ERROR";
        state.error = action.error.message;
      })
      .addCase(verificationOtpVerify.pending, (state) => {
        state.loading = true;
        state.actionFlag = "VERIFY_OTP_PENDING";
        state.success = "";
        state.error = "";
      })
      .addCase(verificationOtpVerify.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(verificationOtpVerify.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "VERIFY_OTP_ERROR";
        state.success = "";
        state.error =
          action.error?.message ||
          action.payload?.error ||
          "OTP verification failed";
      })
      .addCase(validateReferralCode.pending, (state) => {
        state.loading = true;
        state.actionFlag = "REFERRAL_CODE_VALID_PENDING";
      })
      .addCase(validateReferralCode.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
        state.referalCode = action.payload.data
      })
      .addCase(validateReferralCode.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "REFERRAL_CODE_VALID_ERROR";
        state.error = action.payload || action.error.message;
      })
      .addCase(getStoredCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })


      .addCase(getStoredCard.fulfilled, (state, action) => {
        state.loading = false;
        const { paymentItem, actionFlag, error } = action.payload;

        if (actionFlag === "PAYM_SCS") {
          state.storedCards = paymentItem;
        } else {
          state.error = error || "Failed to fetch stored card list";
        }
      })

      .addCase(getStoredCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Something went wrong";
      })

      // Active Card handlers (for admin plan assignment)
      .addCase(getActiveCard.pending, (state) => {
        state.activeCardLoading = true;
        state.activeCardError = null;
      })
      .addCase(getActiveCard.fulfilled, (state, action) => {
        state.activeCardLoading = false;
        const { activeCard, actionFlag, error } = action.payload;

        if (actionFlag === "ACTIVE_CARD_SCS") {
          state.activeCard = activeCard;
        } else {
          state.activeCard = null;
          state.activeCardError = error || "Failed to fetch active card";
        }
      })
      .addCase(getActiveCard.rejected, (state, action) => {
        state.activeCardLoading = false;
        state.activeCard = null;
        state.activeCardError = action.error.message || "Something went wrong";
      })

        .addCase(applyDiscountCode.pending, (state) => {
        state.discountLoading = true;
        state.actionFlag = 'DISCOUNT_CODE_APPLY_PENDING';
        state.error = '';
        state.success = '';
      })
      .addCase(applyDiscountCode.fulfilled, (state, action) => {
        state.discountLoading = false;
        state.appliedDiscount = action.payload.appliedDiscount;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
      })

      .addCase(applyDiscountCode.rejected, (state, action) => {
        state.discountLoading = false;
        state.appliedDiscount = null;
        state.actionFlag = 'DISCOUNT_CODE_APPLIED_ERROR';
        state.error = action.payload || 'Failed to apply discount code';
        state.success = '';
      });
  },
});

export const {
  cleanCreateAccountMessage,
  setBillingCycle,
  setSelectedLocations,
  selectPlan,
  toggleTool,
  clearPlanSelection,
  autoSelectFirstPlan,
  cleanPlansMessage,
  saveCompanyDetails,
  cleanPaymentMessage,
  resetPaymentState,
  filterPlansByBillingCycle,
  clearDiscountError,
  cleanTrialMessage,
  clearAppliedDiscountData,
} = registerSlice.actions;

export default registerSlice.reducer;
