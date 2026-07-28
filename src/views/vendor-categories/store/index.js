// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constant
import { initVendorCategoryItem } from "@constant/reduxConstant";

async function getVendorCategoryListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.vendorCategories.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getVendorCategoryList = createAsyncThunk(
  "appVendorCategory/getVendorCategoryList",
  async (params) => {
    try {
      const response = await getVendorCategoryListRequest(params);

      if (response?.statusCode && response?.data) {
        return {
          params,
          vendorCategoryItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "VCAT_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          vendorCategoryItems: [],
          pagination: null,
          actionFlag: "VCAT_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        params,
        vendorCategoryItems: [],
        pagination: null,
        actionFlag: "VCAT_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getVendorCategoryDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.vendorCategories.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getVendorCategoryDropdown = createAsyncThunk(
  "appVendorCategory/getVendorCategoryDropdown",
  async () => {
    try {
      const response = await getVendorCategoryDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { vendorCategoryDropdown: response.data };
      }
      return { vendorCategoryDropdown: [] };
    } catch (error) {
      return { vendorCategoryDropdown: [] };
    }
  }
);

async function getVendorCategoryRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.vendorCategories.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getVendorCategory = createAsyncThunk(
  "appVendorCategory/getVendorCategory",
  async (id) => {
    try {
      const response = await getVendorCategoryRequest(id);

      if (response?.statusCode && response.data) {
        return {
          id,
          vendorCategoryItem: response.data,
          actionFlag: "VCAT_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          id,
          vendorCategoryItem: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        id,
        vendorCategoryItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createVendorCategoryRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.vendorCategories.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createVendorCategory = createAsyncThunk(
  "appVendorCategory/createVendorCategory",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createVendorCategoryRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          vendorCategoryItem: response.data || null,
          actionFlag: "VCAT_CRTD",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to create vendor category";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateVendorCategoryRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.vendorCategories.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateVendorCategory = createAsyncThunk(
  "appVendorCategory/updateVendorCategory",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateVendorCategoryRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          vendorCategoryItem: response.data || null,
          actionFlag: "VCAT_UPDT",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to update vendor category";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteVendorCategoryRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.vendorCategories.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

// Bulk soft-delete. Returns { deleted, skipped } from the server (guard-aware).
export const deleteManyVendorCategories = createAsyncThunk(
  "appVendorCategory/deleteManyVendorCategories",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(
        API_ENDPOINTS.vendorCategories.deleteMany,
        { ids }
      );
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

export const deleteVendorCategory = createAsyncThunk(
  "appVendorCategory/deleteVendorCategory",
  async (id) => {
    try {
      const response = await deleteVendorCategoryRequest(id);

      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "VCAT_DLT",
          success: response?.message || "",
          error: "",
        };
      } else {
        return {
          id,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
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

export const appVendorCategorySlice = createSlice({
  name: "appVendorCategory",
  initialState: {
    vendorCategoryItems: [],
    vendorCategoryDropdown: [],
    pagination: null,
    vendorCategoryItem: initVendorCategoryItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanVendorCategoryMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanVendorCategoryState: (state) => {
      state.vendorCategoryItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getVendorCategoryList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getVendorCategoryList.fulfilled, (state, action) => {
        state.vendorCategoryItems = action.payload?.vendorCategoryItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getVendorCategoryList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getVendorCategoryDropdown.fulfilled, (state, action) => {
        state.vendorCategoryDropdown =
          action.payload?.vendorCategoryDropdown || [];
      })
      .addCase(getVendorCategory.pending, (state) => {
        state.vendorCategoryItem = initVendorCategoryItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getVendorCategory.fulfilled, (state, action) => {
        state.vendorCategoryItem =
          action.payload?.vendorCategoryItem || initVendorCategoryItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getVendorCategory.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createVendorCategory.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createVendorCategory.fulfilled, (state, action) => {
        state.vendorCategoryItem =
          action.payload?.vendorCategoryItem || initVendorCategoryItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createVendorCategory.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateVendorCategory.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateVendorCategory.fulfilled, (state, action) => {
        state.vendorCategoryItem =
          action.payload?.vendorCategoryItem || initVendorCategoryItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateVendorCategory.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteVendorCategory.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteVendorCategory.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteVendorCategory.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanVendorCategoryMessage, cleanVendorCategoryState } =
  appVendorCategorySlice.actions;

export default appVendorCategorySlice.reducer;
