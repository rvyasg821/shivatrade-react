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

// ─── Stats (header KPI cards) ───────────────────────────────────────────
// Aggregates over the same filtered set as the list. Failures are swallowed
// to null so a stats hiccup never blanks the listing.

export const getInventoryStats = createAsyncThunk(
  "appInventory/getInventoryStats",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.inventory.stats, {
        params,
      });
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return { stats: body.data };
      }
      return { stats: null };
    } catch (error) {
      return { stats: null };
    }
  }
);

// ─── Stock summary (ledger on-hand) ─────────────────────────────────────

export const getStockSummary = createAsyncThunk(
  "appInventory/getStockSummary",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.inventory.stock, {
        params,
      });
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          stockItems: body.data,
          stockPagination: body?._metadata?.pagination || null,
          error: "",
        };
      }
      return {
        stockItems: [],
        stockPagination: null,
        error: body?.message || "Failed to load stock summary",
      };
    } catch (error) {
      return {
        stockItems: [],
        stockPagination: null,
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Movement history (drill-in modal) ──────────────────────────────────

export const getMovementHistory = createAsyncThunk(
  "appInventory/getMovementHistory",
  async (productId, { rejectWithValue }) => {
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.inventory.movements}/${productId}`
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return { movementItem: body.data };
      }
      return rejectWithValue(body?.message || "Could not load movements.");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error.message ||
          "Could not load movements."
      );
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
    stats: null,
    stockItems: [],
    stockPagination: null,
    stockLoading: true,
    movementItem: null,
    movementLoading: false,
    movementError: "",
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
    clearMovementHistory: (state) => {
      state.movementItem = null;
      state.movementError = "";
      state.movementLoading = false;
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
      .addCase(getInventoryStats.fulfilled, (state, action) => {
        state.stats = action.payload?.stats || null;
      })
      .addCase(getStockSummary.pending, (state) => {
        state.stockLoading = false;
      })
      .addCase(getStockSummary.fulfilled, (state, action) => {
        state.stockItems = action.payload?.stockItems || [];
        state.stockPagination = action.payload?.stockPagination || null;
        state.stockLoading = true;
        state.error = action.payload?.error || "";
      })
      .addCase(getStockSummary.rejected, (state) => {
        state.stockLoading = true;
      })
      .addCase(getMovementHistory.pending, (state) => {
        state.movementItem = null;
        state.movementError = "";
        state.movementLoading = true;
      })
      .addCase(getMovementHistory.fulfilled, (state, action) => {
        state.movementItem = action.payload?.movementItem || null;
        state.movementLoading = false;
      })
      .addCase(getMovementHistory.rejected, (state, action) => {
        state.movementItem = null;
        state.movementLoading = false;
        state.movementError = action.payload || "Could not load movements.";
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

export const {
  cleanInventoryMessage,
  clearReceiptDetail,
  clearMovementHistory,
} = appInventorySlice.actions;

export default appInventorySlice.reducer;
