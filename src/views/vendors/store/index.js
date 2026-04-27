// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initVendorItem } from "@constant/reduxConstant";

async function getVendorListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.vendors.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getVendorList = createAsyncThunk(
  "appVendor/getVendorList",
  async (params) => {
    try {
      const response = await getVendorListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          vendorItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "VEN_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        vendorItems: [],
        pagination: null,
        actionFlag: "VEN_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        vendorItems: [],
        pagination: null,
        actionFlag: "VEN_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getVendorDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.vendors.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getVendorDropdown = createAsyncThunk(
  "appVendor/getVendorDropdown",
  async () => {
    try {
      const response = await getVendorDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { vendorDropdown: response.data };
      }
      return { vendorDropdown: [] };
    } catch (error) {
      return { vendorDropdown: [] };
    }
  }
);

async function getVendorRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.vendors.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getVendor = createAsyncThunk(
  "appVendor/getVendor",
  async (id) => {
    try {
      const response = await getVendorRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          vendorItem: response.data,
          actionFlag: "VEN_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        vendorItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        vendorItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createVendorRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.vendors.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createVendor = createAsyncThunk(
  "appVendor/createVendor",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createVendorRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          vendorItem: response.data || null,
          actionFlag: "VEN_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create vendor";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateVendorRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.vendors.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateVendor = createAsyncThunk(
  "appVendor/updateVendor",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateVendorRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          vendorItem: response.data || null,
          actionFlag: "VEN_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update vendor";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteVendorRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.vendors.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteVendor = createAsyncThunk(
  "appVendor/deleteVendor",
  async (id) => {
    try {
      const response = await deleteVendorRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "VEN_DLT",
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

export const appVendorSlice = createSlice({
  name: "appVendor",
  initialState: {
    vendorItems: [],
    vendorDropdown: [],
    pagination: null,
    vendorItem: initVendorItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanVendorMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanVendorState: (state) => {
      state.vendorItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getVendorList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getVendorList.fulfilled, (state, action) => {
        state.vendorItems = action.payload?.vendorItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getVendorList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getVendorDropdown.fulfilled, (state, action) => {
        state.vendorDropdown = action.payload?.vendorDropdown || [];
      })
      .addCase(getVendor.pending, (state) => {
        state.vendorItem = initVendorItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getVendor.fulfilled, (state, action) => {
        state.vendorItem = action.payload?.vendorItem || initVendorItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getVendor.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createVendor.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.vendorItem = action.payload?.vendorItem || initVendorItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateVendor.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.vendorItem = action.payload?.vendorItem || initVendorItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteVendor.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteVendor.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanVendorMessage, cleanVendorState } = appVendorSlice.actions;

export default appVendorSlice.reducer;
