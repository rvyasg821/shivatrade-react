// Inventory (Received-Goods Register) — redux slice.
// Read-only: a paginated list of received POV lines + a per-receipt detail
// fetch for the modal. Action-flag prefix: INV_

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ─── List ──────────────────────────────────────────────────────────────

export const getInventoryList = createAsyncThunk(
  "appInventory/getInventoryList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.inventory.list, { params });
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          params,
          inventoryItems: body.data,
          pagination: body?._metadata?.pagination || null,
          actionFlag: "INV_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        inventoryItems: [],
        pagination: null,
        actionFlag: "INV_LST_ERR",
        success: "",
        error: body?.message || "Failed to load inventory list",
      };
    } catch (error) {
      return {
        params,
        inventoryItems: [],
        pagination: null,
        actionFlag: "INV_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Receipt detail (modal) ─────────────────────────────────────────────

export const getReceiptDetail = createAsyncThunk(
  "appInventory/getReceiptDetail",
  async (povLineId, { rejectWithValue }) => {
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.inventory.receipt}/${povLineId}`
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return { receiptItem: body.data };
      }
      return rejectWithValue(body?.message || "This receipt is no longer valid.");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error.message ||
          "This receipt is no longer valid."
      );
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────

export const appInventorySlice = createSlice({
  name: "appInventory",
  initialState: {
    inventoryItems: [],
    pagination: null,
    receiptItem: null,
    receiptLoading: false,
    receiptError: "",
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanInventoryMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    clearReceiptDetail: (state) => {
      state.receiptItem = null;
      state.receiptError = "";
      state.receiptLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getInventoryList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getInventoryList.fulfilled, (state, action) => {
        state.inventoryItems = action.payload?.inventoryItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getInventoryList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getReceiptDetail.pending, (state) => {
        state.receiptItem = null;
        state.receiptError = "";
        state.receiptLoading = true;
      })
      .addCase(getReceiptDetail.fulfilled, (state, action) => {
        state.receiptItem = action.payload?.receiptItem || null;
        state.receiptLoading = false;
        state.receiptError = "";
      })
      .addCase(getReceiptDetail.rejected, (state, action) => {
        state.receiptItem = null;
        state.receiptLoading = false;
        state.receiptError = action.payload || "This receipt is no longer valid.";
      });
  },
});

export const { cleanInventoryMessage, clearReceiptDetail } =
  appInventorySlice.actions;

export default appInventorySlice.reducer;
