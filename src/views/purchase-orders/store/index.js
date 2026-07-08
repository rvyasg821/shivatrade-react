// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initPurchaseOrderItem } from "@constant/reduxConstant";

// ─── List ──────────────────────────────────────────────────────────────

async function getPurchaseOrderListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.purchaseOrders.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getPurchaseOrderList = createAsyncThunk(
  "appPurchaseOrder/getPurchaseOrderList",
  async (params) => {
    try {
      const response = await getPurchaseOrderListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          purchaseOrderItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "PO_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        purchaseOrderItems: [],
        pagination: null,
        actionFlag: "PO_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        purchaseOrderItems: [],
        pagination: null,
        actionFlag: "PO_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ─── Get one ──────────────────────────────────────────────────────────

async function getPurchaseOrderRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.purchaseOrders.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getPurchaseOrder = createAsyncThunk(
  "appPurchaseOrder/getPurchaseOrder",
  async (id) => {
    try {
      const response = await getPurchaseOrderRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          purchaseOrderItem: response.data,
          actionFlag: "PO_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        purchaseOrderItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        purchaseOrderItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ─── Create ───────────────────────────────────────────────────────────

async function createPurchaseOrderRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.purchaseOrders.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createPurchaseOrder = createAsyncThunk(
  "appPurchaseOrder/createPurchaseOrder",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createPurchaseOrderRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          purchaseOrderItem: response.data || null,
          actionFlag: "PO_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create Purchase Order";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Update ───────────────────────────────────────────────────────────

async function updatePurchaseOrderRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.purchaseOrders.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updatePurchaseOrder = createAsyncThunk(
  "appPurchaseOrder/updatePurchaseOrder",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updatePurchaseOrderRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          purchaseOrderItem: response.data || null,
          actionFlag: "PO_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update Purchase Order";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Delete ───────────────────────────────────────────────────────────

async function deletePurchaseOrderRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.purchaseOrders.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deletePurchaseOrder = createAsyncThunk(
  "appPurchaseOrder/deletePurchaseOrder",
  async (id) => {
    try {
      const response = await deletePurchaseOrderRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "PO_DLT",
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

// ─── Slice ────────────────────────────────────────────────────────────

export const appPurchaseOrderSlice = createSlice({
  name: "appPurchaseOrder",
  initialState: {
    purchaseOrderItems: [],
    pagination: null,
    purchaseOrderItem: initPurchaseOrderItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanPurchaseOrderMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanPurchaseOrderState: (state) => {
      state.purchaseOrderItem = initPurchaseOrderItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPurchaseOrderList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getPurchaseOrderList.fulfilled, (state, action) => {
        state.purchaseOrderItems = action.payload?.purchaseOrderItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPurchaseOrderList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getPurchaseOrder.pending, (state) => {
        state.purchaseOrderItem = initPurchaseOrderItem;
        state.loading = false;
      })
      .addCase(getPurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrderItem =
          action.payload?.purchaseOrderItem || initPurchaseOrderItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPurchaseOrder.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createPurchaseOrder.pending, (state) => {
        state.loading = false;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrderItem =
          action.payload?.purchaseOrderItem || initPurchaseOrderItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updatePurchaseOrder.pending, (state) => {
        state.loading = false;
      })
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrderItem =
          action.payload?.purchaseOrderItem || initPurchaseOrderItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updatePurchaseOrder.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deletePurchaseOrder.pending, (state) => {
        state.loading = false;
      })
      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deletePurchaseOrder.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanPurchaseOrderMessage, cleanPurchaseOrderState } =
  appPurchaseOrderSlice.actions;

export default appPurchaseOrderSlice.reducer;
