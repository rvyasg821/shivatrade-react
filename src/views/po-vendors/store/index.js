// PO Vendor (POV) — redux slice.
// Action-flag prefix: POV_

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { initPoVendorItem } from "@constant/reduxConstant";

// ─── List ──────────────────────────────────────────────────────────────

export const getPoVendorList = createAsyncThunk(
  "appPoVendor/getPoVendorList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.poVendors.list, { params });
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          params,
          poVendorItems: body.data,
          pagination: body?._metadata?.pagination || null,
          actionFlag: "POV_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        poVendorItems: [],
        pagination: null,
        actionFlag: "POV_LST_ERR",
        success: "",
        error: body?.message || "Failed to load POV list",
      };
    } catch (error) {
      return {
        params,
        poVendorItems: [],
        pagination: null,
        actionFlag: "POV_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Get one ───────────────────────────────────────────────────────────

export const getPoVendor = createAsyncThunk(
  "appPoVendor/getPoVendor",
  async (id) => {
    try {
      const resp = await instance.get(`${API_ENDPOINTS.poVendors.get}/${id}`);
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          id,
          poVendorItem: body.data,
          actionFlag: "POV_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        poVendorItem: null,
        actionFlag: "",
        success: "",
        error: body?.message || "Failed to load POV",
      };
    } catch (error) {
      return {
        id,
        poVendorItem: null,
        actionFlag: "",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Create from PO ────────────────────────────────────────────────────

export const createPoVendorFromPo = createAsyncThunk(
  "appPoVendor/createPoVendorFromPo",
  async ({ purchase_order_id, payload }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.poVendors.fromPo}/${purchase_order_id}`,
        payload
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          poVendorItem: body.data,
          actionFlag: "POV_CRTD",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to create POV");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Recover (multi-vendor batch from PO Coverage tab) ─────────────────
// Spawns N POVs in one call, grouped by vendor. Used by the recovery flow
// when one or more POVs were cancelled and their PO lines need re-coverage.

export const recoverPoVendors = createAsyncThunk(
  "appPoVendor/recoverPoVendors",
  async ({ purchase_order_id, assignments }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.poVendors.recover}/${purchase_order_id}`,
        { assignments }
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          created: body.data.created || [],
          actionFlag: "POV_RECOVERED",
          success:
            body?.message ||
            `${(body.data.created || []).length} POV(s) created.`,
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to recover POVs");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Update ────────────────────────────────────────────────────────────

export const updatePoVendor = createAsyncThunk(
  "appPoVendor/updatePoVendor",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await instance.put(
        `${API_ENDPOINTS.poVendors.update}/${id}`,
        data
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          poVendorItem: body.data,
          actionFlag: "POV_UPDT",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to update POV");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Action: Dispatch ──────────────────────────────────────────────────

export const dispatchPoVendor = createAsyncThunk(
  "appPoVendor/dispatchPoVendor",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.poVendors.dispatch}/${id}/dispatch`,
        data
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          poVendorItem: body.data,
          actionFlag: "POV_DISPATCHED",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to dispatch POV");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Action: Receive ────────────────────────────────────────────────────

export const receivePoVendor = createAsyncThunk(
  "appPoVendor/receivePoVendor",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.poVendors.receive}/${id}/receive`,
        data
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          poVendorItem: body.data.parent,
          actionFlag: "POV_CLOSED",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to receive POV");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Action: Cancel ────────────────────────────────────────────────────

export const cancelPoVendor = createAsyncThunk(
  "appPoVendor/cancelPoVendor",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.poVendors.cancel}/${id}/cancel`,
        { reason: reason || undefined }
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          poVendorItem: body.data,
          actionFlag: "POV_CANCELLED",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to cancel POV");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Delete (draft only) ───────────────────────────────────────────────

export const deletePoVendor = createAsyncThunk(
  "appPoVendor/deletePoVendor",
  async (id) => {
    try {
      const resp = await instance.delete(
        `${API_ENDPOINTS.poVendors.delete}/${id}`
      );
      const body = resp?.data;
      if (body?.statusCode === 200) {
        return {
          id,
          actionFlag: "POV_DLT",
          success: body?.message || "",
          error: "",
        };
      }
      return {
        id,
        actionFlag: "",
        success: "",
        error: body?.message || "Failed to delete POV",
      };
    } catch (error) {
      return {
        id,
        actionFlag: "",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────

export const appPoVendorSlice = createSlice({
  name: "appPoVendor",
  initialState: {
    poVendorItems: [],
    pagination: null,
    poVendorItem: initPoVendorItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanPoVendorMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanPoVendorState: (state) => {
      state.poVendorItem = initPoVendorItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPoVendorList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getPoVendorList.fulfilled, (state, action) => {
        state.poVendorItems = action.payload?.poVendorItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPoVendorList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getPoVendor.pending, (state) => {
        state.poVendorItem = initPoVendorItem;
        state.loading = false;
      })
      .addCase(getPoVendor.fulfilled, (state, action) => {
        state.poVendorItem = action.payload?.poVendorItem || initPoVendorItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPoVendor.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createPoVendorFromPo.pending, (state) => {
        state.loading = false;
      })
      .addCase(createPoVendorFromPo.fulfilled, (state, action) => {
        state.poVendorItem =
          action.payload?.poVendorItem || initPoVendorItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createPoVendorFromPo.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(recoverPoVendors.pending, (state) => {
        state.loading = false;
      })
      .addCase(recoverPoVendors.fulfilled, (state, action) => {
        // Doesn't replace poVendorItem — the user is on the PO detail page
        // and stays there. Listeners watch actionFlag = 'POV_RECOVERED' to
        // know to refresh coverage / POV list.
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(recoverPoVendors.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updatePoVendor.pending, (state) => {
        state.loading = false;
      })
      .addCase(updatePoVendor.fulfilled, (state, action) => {
        state.poVendorItem =
          action.payload?.poVendorItem || initPoVendorItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updatePoVendor.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(dispatchPoVendor.pending, (state) => {
        state.loading = false;
      })
      .addCase(dispatchPoVendor.fulfilled, (state, action) => {
        state.poVendorItem =
          action.payload?.poVendorItem || initPoVendorItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(dispatchPoVendor.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(receivePoVendor.pending, (state) => {
        state.loading = false;
      })
      .addCase(receivePoVendor.fulfilled, (state, action) => {
        state.poVendorItem =
          action.payload?.poVendorItem || initPoVendorItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(receivePoVendor.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(cancelPoVendor.pending, (state) => {
        state.loading = false;
      })
      .addCase(cancelPoVendor.fulfilled, (state, action) => {
        state.poVendorItem =
          action.payload?.poVendorItem || initPoVendorItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(cancelPoVendor.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deletePoVendor.pending, (state) => {
        state.loading = false;
      })
      .addCase(deletePoVendor.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deletePoVendor.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanPoVendorMessage, cleanPoVendorState } =
  appPoVendorSlice.actions;

export default appPoVendorSlice.reducer;
