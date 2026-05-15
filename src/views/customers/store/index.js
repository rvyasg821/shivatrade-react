// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initCustomerItem } from "@constant/reduxConstant";

async function getCustomerListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.customers.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCustomerList = createAsyncThunk(
  "appCustomer/getCustomerList",
  async (params) => {
    try {
      const response = await getCustomerListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          customerItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "CUST_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        customerItems: [],
        pagination: null,
        actionFlag: "CUST_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        customerItems: [],
        pagination: null,
        actionFlag: "CUST_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getCustomerDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.customers.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCustomerDropdown = createAsyncThunk(
  "appCustomer/getCustomerDropdown",
  async () => {
    try {
      const response = await getCustomerDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { customerDropdown: response.data };
      }
      return { customerDropdown: [] };
    } catch (error) {
      return { customerDropdown: [] };
    }
  }
);

async function getCustomerRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.customers.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCustomer = createAsyncThunk(
  "appCustomer/getCustomer",
  async (id) => {
    try {
      const response = await getCustomerRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          customerItem: response.data,
          actionFlag: "CUST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        customerItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        customerItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createCustomerRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.customers.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createCustomer = createAsyncThunk(
  "appCustomer/createCustomer",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createCustomerRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          customerItem: response.data || null,
          actionFlag: "CUST_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create customer";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateCustomerRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.customers.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateCustomer = createAsyncThunk(
  "appCustomer/updateCustomer",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateCustomerRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          customerItem: response.data || null,
          actionFlag: "CUST_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update customer";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteCustomerRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.customers.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteCustomer = createAsyncThunk(
  "appCustomer/deleteCustomer",
  async (id) => {
    try {
      const response = await deleteCustomerRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "CUST_DLT",
          success: response?.message || "",
          error: "",
        };
      }
      return {
        id,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

export const appCustomerSlice = createSlice({
  name: "appCustomer",
  initialState: {
    customerItems: [],
    customerDropdown: [],
    pagination: null,
    customerItem: initCustomerItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCustomerMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanCustomerState: (state) => {
      state.customerItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCustomerList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCustomerList.fulfilled, (state, action) => {
        state.customerItems = action.payload?.customerItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCustomerList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getCustomerDropdown.fulfilled, (state, action) => {
        state.customerDropdown = action.payload?.customerDropdown || [];
      })
      .addCase(getCustomer.pending, (state) => {
        state.customerItem = initCustomerItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCustomer.fulfilled, (state, action) => {
        state.customerItem = action.payload?.customerItem || initCustomerItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCustomer.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createCustomer.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.customerItem = action.payload?.customerItem || initCustomerItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateCustomer.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.customerItem = action.payload?.customerItem || initCustomerItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteCustomer.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanCustomerMessage, cleanCustomerState } = appCustomerSlice.actions;

export default appCustomerSlice.reducer;
