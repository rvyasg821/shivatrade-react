// Invoice redux slice - list / get / create / update / issue / cancel / delete.

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { initInvoiceItem } from "@constant/reduxConstant";

// ─── List ──────────────────────────────────────────────────────────────

export const getInvoiceList = createAsyncThunk(
  "appInvoice/getInvoiceList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.invoices.list, { params });
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          params,
          invoiceItems: body.data,
          pagination: body?._metadata?.pagination || null,
          actionFlag: "INV_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        invoiceItems: [],
        pagination: null,
        actionFlag: "INV_LST_ERR",
        success: "",
        error: body?.message || "Failed to load invoices",
      };
    } catch (err) {
      return {
        params,
        invoiceItems: [],
        pagination: null,
        actionFlag: "INV_LST_ERR",
        success: "",
        error: err?.response?.data?.message || err.message,
      };
    }
  }
);

// ─── Get one ───────────────────────────────────────────────────────────

export const getInvoice = createAsyncThunk(
  "appInvoice/getInvoice",
  async (id) => {
    try {
      const resp = await instance.get(`${API_ENDPOINTS.invoices.get}/${id}`);
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          id,
          invoiceItem: body.data,
          actionFlag: "INV_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        invoiceItem: null,
        actionFlag: "INV_ERR",
        success: "",
        error: body?.message || "Failed to load invoice",
      };
    } catch (err) {
      return {
        id,
        invoiceItem: null,
        actionFlag: "INV_ERR",
        success: "",
        error: err?.response?.data?.message || err.message,
      };
    }
  }
);

// ─── Create ────────────────────────────────────────────────────────────

export const createInvoice = createAsyncThunk(
  "appInvoice/createInvoice",
  async (data, { rejectWithValue }) => {
    try {
      const resp = await instance.post(API_ENDPOINTS.invoices.create, data);
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          invoiceItem: body.data,
          actionFlag: "INV_CRE_SCS",
          success: body?.message || "Invoice created",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to create invoice");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

// ─── Update ────────────────────────────────────────────────────────────

export const updateInvoice = createAsyncThunk(
  "appInvoice/updateInvoice",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await instance.put(
        `${API_ENDPOINTS.invoices.update}/${id}`,
        data
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          invoiceItem: body.data,
          actionFlag: "INV_UPD_SCS",
          success: body?.message || "Invoice updated",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to update invoice");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

// ─── Issue ─────────────────────────────────────────────────────────────

export const issueInvoice = createAsyncThunk(
  "appInvoice/issueInvoice",
  async (id, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.invoices.issue}/${id}`,
        {}
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          invoiceItem: body.data,
          actionFlag: "INV_ISS_SCS",
          success: body?.message || "Invoice issued",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to issue invoice");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

// ─── Cancel ────────────────────────────────────────────────────────────

export const cancelInvoice = createAsyncThunk(
  "appInvoice/cancelInvoice",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.invoices.cancel}/${id}`,
        { reason }
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          invoiceItem: body.data,
          actionFlag: "INV_CAN_SCS",
          success: body?.message || "Invoice cancelled",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to cancel invoice");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

// ─── Soft delete ───────────────────────────────────────────────────────

export const deleteInvoice = createAsyncThunk(
  "appInvoice/deleteInvoice",
  async (id, { rejectWithValue }) => {
    try {
      const resp = await instance.delete(
        `${API_ENDPOINTS.invoices.delete}/${id}`
      );
      const body = resp?.data;
      if (body?.statusCode) {
        return {
          id,
          actionFlag: "INV_DLT_SCS",
          success: body?.message || "Invoice deleted",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to delete invoice");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────

export const appInvoiceSlice = createSlice({
  name: "appInvoice",
  initialState: {
    invoiceItems: [],
    invoiceItem: { ...initInvoiceItem },
    pagination: null,
    params: null,
    // Inverted-flag convention used across this codebase: `loading=true` means
    // "idle / not fetching"; `loading=false` means "fetch in flight". The
    // global spinner reads `if (!store.loading) show()` (see startLoading /
    // stopLoading wiring in the listing).
    loading: true,
    actionFlag: "",
    success: "",
    error: "",
  },
  reducers: {
    cleanInvoiceMessage: (state) => {
      state.success = "";
      state.error = "";
      state.actionFlag = "";
    },
    resetInvoiceItem: (state) => {
      state.invoiceItem = { ...initInvoiceItem };
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(getInvoiceList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getInvoiceList.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.invoiceItems = p.invoiceItems || [];
        state.pagination = p.pagination;
        state.params = p.params;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.error = p.error;
        state.loading = true;
      })
      .addCase(getInvoiceList.rejected, (state, action) => {
        state.loading = true;
        state.error = action.error?.message || "Failed";
      })
      // Get
      .addCase(getInvoice.pending, (state) => {
        state.loading = false;
      })
      .addCase(getInvoice.fulfilled, (state, action) => {
        const p = action.payload || {};
        if (p.invoiceItem) state.invoiceItem = p.invoiceItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.error = p.error;
        state.loading = true;
      })
      .addCase(getInvoice.rejected, (state) => {
        state.loading = true;
      })
      // Create
      .addCase(createInvoice.pending, (state) => {
        state.loading = false;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.invoiceItem = p.invoiceItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "INV_CRE_ERR";
        state.loading = true;
      })
      // Update
      .addCase(updateInvoice.pending, (state) => {
        state.loading = false;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.invoiceItem = p.invoiceItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "INV_UPD_ERR";
        state.loading = true;
      })
      // Issue
      .addCase(issueInvoice.pending, (state) => {
        state.loading = false;
      })
      .addCase(issueInvoice.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.invoiceItem = p.invoiceItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(issueInvoice.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "INV_ISS_ERR";
        state.loading = true;
      })
      // Cancel
      .addCase(cancelInvoice.pending, (state) => {
        state.loading = false;
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.invoiceItem = p.invoiceItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(cancelInvoice.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "INV_CAN_ERR";
        state.loading = true;
      })
      // Delete
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "INV_DLT_ERR";
        state.loading = true;
      });
  },
});

export const { cleanInvoiceMessage, resetInvoiceItem } = appInvoiceSlice.actions;

export default appInvoiceSlice.reducer;
