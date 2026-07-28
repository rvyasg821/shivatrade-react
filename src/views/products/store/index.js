// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initProductItem } from "@constant/reduxConstant";

async function getProductListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.products.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getProductList = createAsyncThunk(
  "appProduct/getProductList",
  async (params) => {
    try {
      const response = await getProductListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          productItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "PROD_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        productItems: [],
        pagination: null,
        actionFlag: "PROD_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        productItems: [],
        pagination: null,
        actionFlag: "PROD_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getProductDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.products.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getProductDropdown = createAsyncThunk(
  "appProduct/getProductDropdown",
  async () => {
    try {
      const response = await getProductDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { productDropdown: response.data };
      }
      return { productDropdown: [] };
    } catch (error) {
      return { productDropdown: [] };
    }
  }
);

async function getProductRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.products.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getProduct = createAsyncThunk(
  "appProduct/getProduct",
  async (id) => {
    try {
      const response = await getProductRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          productItem: response.data,
          actionFlag: "PROD_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        productItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        productItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createProductRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.products.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createProduct = createAsyncThunk(
  "appProduct/createProduct",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createProductRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          productItem: response.data || null,
          actionFlag: "PROD_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create product";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateProductRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.products.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateProduct = createAsyncThunk(
  "appProduct/updateProduct",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateProductRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          productItem: response.data || null,
          actionFlag: "PROD_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update product";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteProductRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.products.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteProduct = createAsyncThunk(
  "appProduct/deleteProduct",
  async (id) => {
    try {
      const response = await deleteProductRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "PROD_DLT",
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

export const deleteManyProducts = createAsyncThunk(
  "appProduct/deleteManyProducts",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.products.deleteMany, {
        ids,
      });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

export const appProductSlice = createSlice({
  name: "appProduct",
  initialState: {
    productItems: [],
    productDropdown: [],
    pagination: null,
    productItem: initProductItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanProductMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanProductState: (state) => {
      state.productItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProductList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getProductList.fulfilled, (state, action) => {
        state.productItems = action.payload?.productItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getProductList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getProductDropdown.fulfilled, (state, action) => {
        state.productDropdown = action.payload?.productDropdown || [];
      })
      .addCase(getProduct.pending, (state) => {
        state.productItem = initProductItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getProduct.fulfilled, (state, action) => {
        state.productItem = action.payload?.productItem || initProductItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getProduct.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createProduct.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.productItem = action.payload?.productItem || initProductItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateProduct.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.productItem = action.payload?.productItem || initProductItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteProduct.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteProduct.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanProductMessage, cleanProductState } =
  appProductSlice.actions;

export default appProductSlice.reducer;
