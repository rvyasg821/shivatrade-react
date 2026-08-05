import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

export const getAdjustmentNoteList = createAsyncThunk(
  "appAdjustmentNote/getList",
  async (params) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.ledger.register}`, { params })
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          items: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "AN_LST",
          success: "",
          error: "",
        };
      }
      return {
        items: [],
        pagination: null,
        actionFlag: "AN_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        items: [],
        pagination: null,
        actionFlag: "AN_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

export const createAdjustmentNote = createAsyncThunk(
  "appAdjustmentNote/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.adjustmentNotes.create}`, payload)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          actionFlag: "AN_CRTD",
          success: response?.message || "Adjustment note posted.",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to post adjustment note"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// Post several notes for one party in one shot (each line → its own note).
export const createAdjustmentNotesBatch = createAsyncThunk(
  "appAdjustmentNote/createBatch",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.adjustmentNotes.createBatch}`, payload)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          actionFlag: "AN_CRTD",
          success: response?.message || "Adjustment notes posted.",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to post adjustment notes"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

export const voidAdjustmentNote = createAsyncThunk(
  "appAdjustmentNote/void",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.adjustmentNotes.void}/${id}/void`, { reason })
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode) {
        return {
          actionFlag: "AN_VOID",
          success: response?.message || "Adjustment note voided.",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to void note"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

export const appAdjustmentNoteSlice = createSlice({
  name: "appAdjustmentNote",
  initialState: {
    items: [],
    pagination: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanAdjustmentNoteMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAdjustmentNoteList.pending, (s) => {
        s.loading = false;
        s.actionFlag = "";
        s.success = "";
        s.error = "";
      })
      .addCase(getAdjustmentNoteList.fulfilled, (s, a) => {
        s.items = a.payload?.items || [];
        s.pagination = a.payload?.pagination || null;
        s.loading = true;
        s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success;
        s.error = a.payload.error;
      })
      .addCase(getAdjustmentNoteList.rejected, (s) => {
        s.loading = true;
      })
      .addCase(createAdjustmentNote.fulfilled, (s, a) => {
        s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success;
        s.error = a.payload.error;
      })
      .addCase(createAdjustmentNote.rejected, (s, a) => {
        s.error = a.payload || "";
      })
      .addCase(voidAdjustmentNote.fulfilled, (s, a) => {
        s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success;
        s.error = a.payload.error;
      })
      .addCase(voidAdjustmentNote.rejected, (s, a) => {
        s.error = a.payload || "";
      });
  },
});

export const { cleanAdjustmentNoteMessage } = appAdjustmentNoteSlice.actions;
export default appAdjustmentNoteSlice.reducer;
