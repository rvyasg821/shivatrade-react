// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constant
import { initSubscriptionPlanItem } from "@constant/reduxConstant";

// ---------------------- API CALLS ----------------------
async function getSubscriptionRequest(params) {
  try {
    const response = await instance.get(`${API_ENDPOINTS.Subscription.list}`, { params });
    return response.data;
  } catch (error) {
    console.error("getSubscriptionRequest error", error);
    return { statusCode: 500, data: [], message: error.message || "API Error" };
  }
}

async function getCompanySubscriptionRequest(params) {
  try {
    const response = await instance.get(`${API_ENDPOINTS.Subscription.getmysubscription}`, { params });
    return response.data;
  } catch (error) {
    console.error("getCompanySubscriptionRequest error", error);
    return { statusCode: 500, data: [], message: error.message || "API Error" };
  }
}
async function getSubscriptionById(id) {
  try {
    const response = await instance.get(`${API_ENDPOINTS.Subscription.get}/${id}`);
    return response.data;
  } catch (error) {
    console.error("getSubscriptionById error", error);
    return { statusCode: 500, data: null, message: error.message || "API Error" };
  }
}

async function updateSubscriptionRequest({ id, data }) {
  try {
    const response = await instance.put(`${API_ENDPOINTS.Subscription.update}/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("updateSubscriptionRequest error", error);
    return { statusCode: 500, data: null, message: error.message || "API Error" };
  }
}

async function getToolsListRequest(params) {
  try {
    const response = await instance.get(`${API_ENDPOINTS.tools.list}`, { params });
    return response.data;
  } catch (error) {
    console.error("getToolsListRequest error", error);
    return { statusCode: 500, data: [], message: error.message || "API Error" };
  }
}

async function cancelAllSubscriptionsRequest() {
  try {
    const response = await instance.post(`/public/subscription/cancel-all`);
    return response.data;
  } catch (error) {
    console.error("cancelAllSubscriptionsRequest error", error);
    return { statusCode: 500, data: null, message: error.message || "API Error" };
  }
}

async function cancelAdminSubscriptionsRequest(subscription_Id) {
  if (!subscription_Id) {
    return { statusCode: 400, message: "Subscription ID is required" };
  }

  try {
    const response = await instance.patch(
      `${API_ENDPOINTS.Subscription.cancel}/${subscription_Id}/cancel`
    );
    return response.data;
  } catch (error) {
    console.error("cancelAdminSubscriptionsRequest error", error);
    return {
      statusCode: 500,
      data: null,
      message: error.message || "API Error"
    };
  }
}

async function GetSubscriptionByIdRequest({ companyId, search, page, perPage, sort }) {
  try {
    // Check if companyId is available before making the request
    if (!companyId) {
      throw new Error("companyId is required");
    }

    // Build the URL with the companyId
    const url = `${API_ENDPOINTS.Subscription.getbyid}/${companyId}`;

    const response = await instance.get(url, {
      params: {
        search,  // Add search, page, perPage, sort in the query params
        page,
        perPage,
        sort,
      },
    });

    return response.data;
  } catch (error) {
    console.error("GetSubscriptionByIdRequest error", error);
    return { statusCode: 500, data: null, message: error.message || "API Error" };
  }
}

// -----discount request

async function getDiscountListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.discount.list}`, { params })
    .then((res) => res.data)
    .catch((err) => err); // keeping same behavior
}

async function getDiscountRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.discount.get}/${params?.id}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err; // same style as others
    });
}

async function deleteDiscountRequest(discountId) {
  return instance
    .delete(`${API_ENDPOINTS.discount.delete}/${discountId}/delete`)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

async function deleteManyDiscountsRequest(ids) {
  return instance
    .post(API_ENDPOINTS.discount.deleteMany, { ids })
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

async function createDiscountRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.discount.create}`, payload)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

async function updateDiscountRequest({ discountId, payload }) {
  return instance
    .put(`${API_ENDPOINTS.discount.update}/${discountId}/update`, payload)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

// Validate discount on plan change (check if discount will be lost)
async function validateDiscountOnPlanChangeRequest({ subscriptionId, newLocations }) {
  return instance
    .get(`${API_ENDPOINTS.discount.validateOnPlanChange}`, {
      params: { subscription_id: subscriptionId, new_locations: newLocations }
    })
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

// Validate discount with location
async function validateDiscountWithLocationRequest({ code, amount, locations, userId }) {
  return instance
    .get(`${API_ENDPOINTS.discount.validateWithLocation}`, {
      params: { code, amount, locations, user_id: userId }
    })
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}



// ------------------- Thunks -------------------
export const getSubscriptionList = createAsyncThunk(
  "appSubscription/getSubscriptionList",
  async (params) => {
    const response = await getSubscriptionRequest(params);

    if (response?.statusCode === 200 && Array.isArray(response.data)) {
      return {
        params,
        subscriptionItems: response.data,
        pagination: response._metadata?.pagination || null,
        actionFlag: "SUBS_LST_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        params,
        subscriptionItems: [],
        pagination: null,
        actionFlag: "SUBS_LST_ERR",
        success: "",
        error: response?.message || "Failed to fetch subscription list",
      };
    }
  }
);

export const getCompanySubscriptionList = createAsyncThunk(
  "appSubscription/getCompanySubscriptionList",
  async ({ page, perPage, search, orderBy, orderDirection }) => {
    // Call API with pagination parameters
    const response = await getCompanySubscriptionRequest({
      page,
      perPage,
      search,
      orderBy,
      orderDirection,
    });

    if (response?.statusCode === 200 && response.data) {
      return {
        subscriptionItems: Array.isArray(response.data) ? response.data : [response.data],
        pagination: response._metadata?.pagination || null, // Assuming pagination metadata is returned
        actionFlag: "SUBS_LST_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        subscriptionItems: [],
        pagination: null,
        actionFlag: "SUBS_LST_ERR",
        success: "",
        error: response?.message || "Failed to fetch subscription list",
      };
    }
  }
);




export const getSubscription = createAsyncThunk(
  "appSubscription/getSubscription",
  async (id) => {
    const response = await getSubscriptionById(id);

    if (response?.statusCode === 200 && response.data) {
      return {
        id,
        planItem: response.data,
        actionFlag: "SUBS_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        id,
        planItem: null,
        actionFlag: "SUBS_ERR",
        success: "",
        error: response?.message || "Failed to fetch subscription",
      };
    }
  }
);

export const updateSubscription = createAsyncThunk(
  "appSubscription/updateSubscription",
  async (payload) => {
    const response = await updateSubscriptionRequest(payload);

    if (response?.statusCode === 200 && response.data) {
      return {
        payload,
        subscriptionItem: response.data,
        actionFlag: "SUBS_UPDT",
        success: "",
        error: "",
      };
    } else {
      return {
        payload,
        actionFlag: "SUBS_UPDT_ERR",
        success: "",
        error: response?.message || "Failed to update subscription",
      };
    }
  }
);

export const getToolsList = createAsyncThunk(
  "appSubscription/getToolsList",
  async (params) => {
    const response = await getToolsListRequest(params);

    if (response?.statusCode === 200 && Array.isArray(response.data)) {
      return {
        params,
        toolItems: response.data,
        actionFlag: "TOOLS_LST_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        params,
        toolItems: [],
        actionFlag: "TOOLS_LST_ERR",
        success: "",
        error: response?.message || "Failed to fetch tools list",
      };
    }
  }
);

export const cancelAllSubscriptions = createAsyncThunk(
  "appSubscription/cancelAllSubscriptions",
  async () => {
    const response = await cancelAllSubscriptionsRequest();

    if (response?.statusCode === 200) {
      return {
        actionFlag: "SUBS_CANCEL_SCS",
        success: response.message || "All subscriptions cancelled successfully",
        error: "",
      };
    } else {
      return {
        actionFlag: "SUBS_CANCEL_ERR",
        success: "",
        error: response?.message || "Failed to cancel subscriptions",
      };
    }
  }
);

export const cancelAdminSubscriptions = createAsyncThunk(
  "appSubscription/cancelAdminSubscriptions",
  async (subscription_Id, { rejectWithValue }) => {
    try {
      const response = await cancelAdminSubscriptionsRequest(subscription_Id);

      if (response?.statusCode === 200) {
        return {
          actionFlag: "SUBS_CANCEL_SCS",
          success: response.message || "Subscription cancelled successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "SUBS_CANCEL_ERR",
          success: "",
          error: response?.message || "Failed to cancel subscription",
        });
      }
    } catch (err) {
      return rejectWithValue({
        actionFlag: "SUBS_CANCEL_ERR",
        success: "",
        error: err.message || "Something went wrong",
      });
    }
  }
);



export const getSubscriptionByIds = createAsyncThunk(
  "appSubscription/getSubscriptionById",
  async ({ companyId, search, page, perPage, sort }) => {
    const response = await GetSubscriptionByIdRequest({ companyId, search, page, perPage, sort });

    if (response?.statusCode === 200 && response.data) {
      return {
        subscriptionItem: response.data,
        actionFlag: "SUBS_BY_ID_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        subscriptionItem: null,
        actionFlag: "SUBS_BY_ID_ERR",
        success: "",
        error: response?.message || "Failed to fetch subscription by ID",
      };
    }
  }
);

export const getDiscountList = createAsyncThunk(
  "company/getDiscountList",
  async (params) => {
    try {
      const response = await getDiscountListRequest(params);

      if (response?.statusCode === 200 && response?.data) {
        return {
          discountItems: response.data,
          pagination: response._metadata?.pagination || null,
          actionFlag: "DIS_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          discountItems: [],
          pagination: null,
          actionFlag: "DIS_LST_ERR",
          success: "",
          error: response?.message || "Failed to fetch discount list",
        };
      }
    } catch (error) {
      return {
        discountItems: [],
        pagination: null,
        actionFlag: "DIS_LST_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      };
    }
  }
);



export const getDiscountDetails = createAsyncThunk(
  "company/getDiscountDetails",
  async (params) => {
    try {
      const response = await getDiscountRequest(params); // FIXED

      if (response?.statusCode === 200 && response?.data) {
        return {
          discount: response.data,
          actionFlag: "GET_DISCOUNT_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          discount: {},
          actionFlag: "GET_DISCOUNT_ERR",
          success: "",
          error: response?.message || "Failed to fetch discount",
        };
      }
    } catch (error) {
      return {
        discount: {},
        actionFlag: "GET_DISCOUNT_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      };
    }
  }
);

export const createDiscount = createAsyncThunk(
  "company/createDiscount",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createDiscountRequest(payload);

      if (response?.statusCode === 201 && response?.data) {
        return {
          discount: response.data,
          actionFlag: "DIS_CREATE_SCS",
          success: response.message || "Discount created successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          discount: {},
          actionFlag: "DIS_CREATE_ERR",
          success: "",
          error: response?.message || "Failed to create discount",
        });
      }
    } catch (error) {
      return rejectWithValue({
        discount: {},
        actionFlag: "DIS_CREATE_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

export const updateDiscount = createAsyncThunk(
  "company/updateDiscount",
  async ({ discountId, payload }, { rejectWithValue }) => {
    try {
      const response = await updateDiscountRequest({ discountId, payload });

      if (response?.statusCode === 200 && response?.data) {
        return {
          discount: response.data,
          actionFlag: "DIS_UPDATE_SCS",
          success: response.message || "Discount updated successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          discount: {},
          actionFlag: "DIS_UPDATE_ERR",
          success: "",
          error: response?.message || "Failed to update discount",
        });
      }
    } catch (error) {
      return rejectWithValue({
        discount: {},
        actionFlag: "DIS_UPDATE_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);


export const deleteDiscount = createAsyncThunk(
  "company/deleteDiscount",
  async (discountId, { rejectWithValue }) => {
    try {
      const response = await deleteDiscountRequest(discountId);

      if (response?.statusCode === 200) {
        return {
          actionFlag: "DIS_DELETE_SCS",
          success: response.message || "Discount deleted successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "DIS_DELETE_ERR",
          success: "",
          error: response?.message || "Failed to delete discount",
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "DIS_DELETE_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

export const deleteManyDiscounts = createAsyncThunk(
  "company/deleteManyDiscounts",
  async (ids, { rejectWithValue }) => {
    try {
      const response = await deleteManyDiscountsRequest(ids);

      if (response?.statusCode === 200 || response?.statusCode === 201) {
        return {
          actionFlag: "DIS_DLT_MANY",
          success: response.message || `${ids.length} discount(s) deleted successfully`,
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "DIS_DLT_MANY_ERR",
          success: "",
          error: response?.message || "Failed to delete discounts",
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "DIS_DLT_MANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

// Validate discount on plan change
export const validateDiscountOnPlanChange = createAsyncThunk(
  "company/validateDiscountOnPlanChange",
  async ({ subscriptionId, newLocations }, { rejectWithValue }) => {
    try {
      const response = await validateDiscountOnPlanChangeRequest({ subscriptionId, newLocations });

      if (response?.statusCode === 200 && response?.data) {
        return {
          discountWarning: response.data,
          actionFlag: "DIS_VALIDATE_PLAN_CHANGE_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          discountWarning: null,
          actionFlag: "DIS_VALIDATE_PLAN_CHANGE_SCS",
          success: "",
          error: "",
        };
      }
    } catch (error) {
      return rejectWithValue({
        discountWarning: null,
        actionFlag: "DIS_VALIDATE_PLAN_CHANGE_ERR",
        success: "",
        error: error?.message || "Failed to validate discount",
      });
    }
  }
);

// Validate discount with location
export const validateDiscountWithLocation = createAsyncThunk(
  "company/validateDiscountWithLocation",
  async ({ code, amount, locations, userId }, { rejectWithValue }) => {
    try {
      const response = await validateDiscountWithLocationRequest({ code, amount, locations, userId });

      if (response?.statusCode === 200 && response?.data) {
        return {
          discountValidation: response.data,
          actionFlag: "DIS_VALIDATE_LOCATION_SCS",
          success: "",
          error: "",
        };
      } else {
        return rejectWithValue({
          discountValidation: null,
          actionFlag: "DIS_VALIDATE_LOCATION_ERR",
          success: "",
          error: response?.message || "Invalid discount code",
        });
      }
    } catch (error) {
      return rejectWithValue({
        discountValidation: null,
        actionFlag: "DIS_VALIDATE_LOCATION_ERR",
        success: "",
        error: error?.message || "Failed to validate discount",
      });
    }
  }
);



// ------------------- Slice -------------------
export const appSubscriptionSlice = createSlice({
  name: "appSubscription",
  initialState: {
    subscriptionItems: [],
    pagination: null,
    planItem: initSubscriptionPlanItem,
    toolItems: [],
    discountItems: [],
    discountItem: {},
    discountWarning: null,
    discountValidation: null,
    actionFlag: "",
    loading: false,
    success: "",
    error: "",
  },
  reducers: {
    cleanSubscriptionMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanSubscriptionState: (state) => {
      state.planItem = initSubscriptionPlanItem;
    },
    clearDiscountWarning: (state) => {
      state.discountWarning = null;
      state.discountValidation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get subscription list
      .addCase(getSubscriptionList.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getSubscriptionList.fulfilled, (state, action) => {
        state.subscriptionItems = action.payload.subscriptionItems;
        state.pagination = action.payload.pagination;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getSubscriptionList.rejected, (state, action) => {
        state.loading = false;
        state.subscriptionItems = [];
        state.pagination = null;
        state.actionFlag = "SUBS_LST_ERR";
        state.success = "";
        state.error = action.error?.message || "Something went wrong";
      })
      .addCase(getCompanySubscriptionList.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCompanySubscriptionList.fulfilled, (state, action) => {
        state.subscriptionItems = action.payload.subscriptionItems || [];
        state.pagination = action.payload.pagination || null;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag || "SUBS_LST_SCS";
        state.success = action.payload.success || "";
        state.error = action.payload.error || "";
      })
      .addCase(getCompanySubscriptionList.rejected, (state, action) => {
        state.loading = false;
        state.subscriptionItems = [];
        state.pagination = null;
        state.actionFlag = "SUBS_LST_ERR";
        state.success = "";
        state.error = action.error?.message || "Something went wrong";
      })

      // Get single subscription
      .addCase(getSubscription.pending, (state) => {
        state.loading = true;
        state.planItem = initSubscriptionPlanItem;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getSubscription.fulfilled, (state, action) => {
        state.planItem = action.payload.planItem;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getSubscription.rejected, (state, action) => {
        state.loading = false;
        state.planItem = initSubscriptionPlanItem;
        state.actionFlag = "SUBS_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to fetch subscription";
      })

      // Update subscription
      .addCase(updateSubscription.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.planItem = action.payload.subscriptionItem || state.planItem;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "SUBS_UPDT_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to update subscription";
      })

      // Get tools list
      .addCase(getToolsList.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getToolsList.fulfilled, (state, action) => {
        state.toolItems = action.payload.toolItems;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getToolsList.rejected, (state, action) => {
        state.loading = false;
        state.toolItems = [];
        state.actionFlag = "TOOLS_LST_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to fetch tools list";
      })

      // Cancel all subscriptions
      .addCase(cancelAllSubscriptions.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(cancelAllSubscriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(cancelAllSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "SUBS_CANCEL_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to cancel subscriptions";
      })

      .addCase(getSubscriptionByIds.pending, (state) => {
        state.loading = true;
        state.subscriptionItems = null;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getSubscriptionByIds.fulfilled, (state, action) => {
        state.subscriptionItems = action.payload.subscriptionItem;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getSubscriptionByIds.rejected, (state, action) => {
        state.loading = false;
        state.subscriptionItems = null;
        state.actionFlag = "SUBS_BY_ID_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to fetch subscription by ID";
      })
      // cancel companySubscriptions by superadmin
      .addCase(cancelAdminSubscriptions.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(cancelAdminSubscriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(cancelAdminSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "SUBS_CANCEL_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to cancel subscriptions";
      })
       .addCase(getDiscountList.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getDiscountList.fulfilled, (state, action) => {
        state.discountItems = action.payload.discountItems || [];
        state.pagination = action.payload.pagination || null;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getDiscountList.rejected, (state, action) => {
        state.loading = false;
        state.discountItems = [];
        state.pagination = null;
        state.actionFlag = "DIS_LST_ERR";
        state.success = "";
        state.error = action.error?.message || "Something went wrong";
      })

      // -------------------- DISCOUNT DETAILS --------------------
      .addCase(getDiscountDetails.pending, (state) => {
        state.loading = true;
        state.discountItem = {};
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getDiscountDetails.fulfilled, (state, action) => {
        state.discountItem = action.payload.discount;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getDiscountDetails.rejected, (state, action) => {
        state.loading = false;
        state.discountItem = {};
        state.actionFlag = "GET_DISCOUNT_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to fetch discount";
      })

      // -------------------- CREATE DISCOUNT --------------------
      .addCase(createDiscount.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })

      .addCase(createDiscount.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action?.payload?.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })

      .addCase(createDiscount.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "DIS_CREATE_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to create discount";
      })

      // -------------------- UPDATE DISCOUNT --------------------

      .addCase(updateDiscount.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })

      .addCase(updateDiscount.fulfilled, (state, action) => {
        state.loading = false;
        state.discountItem = action.payload.discount || state.discountItem;
        state.actionFlag = action.payload.actionFlag;  // e.g. "DIS_UPDATE_SCS"
        state.success = action.payload.success;
        state.error = action.payload.error;
      })

      .addCase(updateDiscount.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "DIS_UPDATE_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to update discount";
      })

      // -------------------- DELETE DISCOUNT --------------------
      .addCase(deleteDiscount.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })

      .addCase(deleteDiscount.fulfilled, (state, action) => {
        state.loading = false;

        // FIXED: Set correct flag expected by component
        state.actionFlag = "DIS_DLT";

        state.success = action.payload.success || "Deleted successfully";
        state.error = action.payload.error;

        // FIXED: use correct DB ID (_id)
        state.discountItems = state.discountItems.filter(
          (item) => item._id !== action.meta.arg
        );
      })

      .addCase(deleteDiscount.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "DIS_DELETE_ERR";
        state.success = "";
        state.error = action.error?.message || "Failed to delete discount";
      })

      // -------------------- DELETE MANY DISCOUNTS --------------------
      .addCase(deleteManyDiscounts.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteManyDiscounts.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = "DIS_DLT";
        state.success = action.payload.success || "Discounts deleted successfully";
        state.error = "";

        // Remove deleted items from the local list
        const deletedIds = action.meta.arg;
        state.discountItems = state.discountItems.filter(
          (item) => !deletedIds.includes(item._id)
        );
      })
      .addCase(deleteManyDiscounts.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "DIS_DLT_MANY_ERR";
        state.success = "";
        state.error = action.payload?.error || action.error?.message || "Failed to delete discounts";
      })

      // -------------------- VALIDATE DISCOUNT ON PLAN CHANGE --------------------
      .addCase(validateDiscountOnPlanChange.pending, (state) => {
        state.loading = true;
        state.discountWarning = null;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(validateDiscountOnPlanChange.fulfilled, (state, action) => {
        state.loading = false;
        state.discountWarning = action.payload.discountWarning;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(validateDiscountOnPlanChange.rejected, (state, action) => {
        state.loading = false;
        state.discountWarning = null;
        state.actionFlag = "DIS_VALIDATE_PLAN_CHANGE_ERR";
        state.success = "";
        state.error = action.payload?.error || "Failed to validate discount";
      })

      // -------------------- VALIDATE DISCOUNT WITH LOCATION --------------------
      .addCase(validateDiscountWithLocation.pending, (state) => {
        state.loading = true;
        state.discountValidation = null;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(validateDiscountWithLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.discountValidation = action.payload.discountValidation;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(validateDiscountWithLocation.rejected, (state, action) => {
        state.loading = false;
        state.discountValidation = null;
        state.actionFlag = "DIS_VALIDATE_LOCATION_ERR";
        state.success = "";
        state.error = action.payload?.error || "Failed to validate discount";
      });

  },
});

export const { cleanSubscriptionMessage, cleanSubscriptionState, clearDiscountWarning } = appSubscriptionSlice.actions;

export default appSubscriptionSlice.reducer;
