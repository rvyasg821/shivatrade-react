// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constant
import { initCategoryItem } from "@constant/reduxConstant";

async function getCategoryListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.categories.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCategoryList = createAsyncThunk(
  "appCategory/getCategoryList",
  async (params) => {
    try {
      const response = await getCategoryListRequest(params);

      if (response?.statusCode && response?.data) {
        return {
          params,
          categoryItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "CAT_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          categoryItems: [],
          pagination: null,
          actionFlag: "CAT_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        params,
        categoryItems: [],
        pagination: null,
        actionFlag: "CAT_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getCategoryDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.categories.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCategoryDropdown = createAsyncThunk(
  "appCategory/getCategoryDropdown",
  async () => {
    try {
      const response = await getCategoryDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { categoryDropdown: response.data };
      }
      return { categoryDropdown: [] };
    } catch (error) {
      return { categoryDropdown: [] };
    }
  }
);

async function getCategoryRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.categories.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCategory = createAsyncThunk(
  "appCategory/getCategory",
  async (id) => {
    try {
      const response = await getCategoryRequest(id);

      if (response?.statusCode && response.data) {
        return {
          id,
          categoryItem: response.data,
          actionFlag: "CAT_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          id,
          categoryItem: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        id,
        categoryItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createCategoryRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.categories.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createCategory = createAsyncThunk(
  "appCategory/createCategory",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createCategoryRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          categoryItem: response.data || null,
          actionFlag: "CAT_CRTD",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to create category";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateCategoryRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.categories.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateCategory = createAsyncThunk(
  "appCategory/updateCategory",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateCategoryRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          categoryItem: response.data || null,
          actionFlag: "CAT_UPDT",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to update category";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteCategoryRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.categories.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteCategory = createAsyncThunk(
  "appCategory/deleteCategory",
  async (id) => {
    try {
      const response = await deleteCategoryRequest(id);

      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "CAT_DLT",
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

export const appCategorySlice = createSlice({
  name: "appCategory",
  initialState: {
    categoryItems: [],
    categoryDropdown: [],
    pagination: null,
    categoryItem: initCategoryItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCategoryMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanCategoryState: (state) => {
      state.categoryItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCategoryList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCategoryList.fulfilled, (state, action) => {
        state.categoryItems = action.payload?.categoryItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCategoryList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getCategoryDropdown.fulfilled, (state, action) => {
        state.categoryDropdown = action.payload?.categoryDropdown || [];
      })
      .addCase(getCategory.pending, (state) => {
        state.categoryItem = initCategoryItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCategory.fulfilled, (state, action) => {
        state.categoryItem = action.payload?.categoryItem || initCategoryItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCategory.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createCategory.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categoryItem = action.payload?.categoryItem || initCategoryItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateCategory.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.categoryItem = action.payload?.categoryItem || initCategoryItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteCategory.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteCategory.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanCategoryMessage, cleanCategoryState } =
  appCategorySlice.actions;

export default appCategorySlice.reducer;
