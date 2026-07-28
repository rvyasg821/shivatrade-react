// Debit Note (vendor return for QC-rejected goods) — redux slice.
// Action-flag prefix: DN_
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const ok = (body) => body?.statusCode === 200 || body?.statusCode === 201;

export const getDebitNoteList = createAsyncThunk(
  "appDebitNote/getList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.debitNotes.list, {
        params,
      });
      const body = resp?.data;
      return {
        debitNoteItems: ok(body) ? body.data || [] : [],
        pagination: ok(body) ? body?._metadata?.pagination || null : null,
        actionFlag: "DN_LST",
        success: "",
        error: ok(body) ? "" : body?.message || "Failed to load Debit Notes",
      };
    } catch (error) {
      return {
        debitNoteItems: [],
        pagination: null,
        actionFlag: "DN_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

export const getDebitNote = createAsyncThunk(
  "appDebitNote/get",
  async (id) => {
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.debitNotes.get}/${id}`
      );
      const body = resp?.data;
      return {
        debitNoteItem: ok(body) ? body.data : null,
        actionFlag: "DN_GET",
        success: "",
        error: ok(body) ? "" : body?.message || "Failed to load Debit Note",
      };
    } catch (error) {
      return {
        debitNoteItem: null,
        actionFlag: "DN_GET_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

const mutate = (name, flag, fn) =>
  createAsyncThunk(`appDebitNote/${name}`, async (arg) => {
    try {
      const resp = await fn(arg);
      const body = resp?.data;
      return {
        debitNoteItem: ok(body) ? body.data : null,
        actionFlag: ok(body) ? flag : `${flag}_ERR`,
        success: ok(body) ? body?.message || "" : "",
        error: ok(body) ? "" : body?.message || "Action failed",
      };
    } catch (error) {
      return {
        debitNoteItem: null,
        actionFlag: `${flag}_ERR`,
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  });

export const createDebitNoteFromGrn = mutate(
  "createFromGrn",
  "DN_CRTD",
  ({ grnId, data }) =>
    instance.post(`${API_ENDPOINTS.debitNotes.fromGrn}/${grnId}`, data || {})
);
export const updateDebitNote = mutate(
  "update",
  "DN_UPDT",
  ({ id, data }) =>
    instance.put(`${API_ENDPOINTS.debitNotes.update}/${id}`, data)
);
export const deleteDebitNote = createAsyncThunk(
  "appDebitNote/delete",
  async (id) => {
    try {
      const resp = await instance.delete(
        `${API_ENDPOINTS.debitNotes.delete}/${id}`
      );
      const body = resp?.data;
      return {
        actionFlag: ok(body) ? "DN_DLTD" : "DN_DLTD_ERR",
        success: ok(body) ? body?.message || "Deleted." : "",
        error: ok(body) ? "" : body?.message || "Delete failed",
      };
    } catch (error) {
      return {
        actionFlag: "DN_DLTD_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

export const deleteManyDebitNotes = createAsyncThunk(
  "appDebitNote/deleteManyDebitNotes",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.debitNotes.deleteMany, {
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

const initialState = {
  debitNoteItems: [],
  debitNoteItem: null,
  pagination: null,
  actionFlag: "",
  success: "",
  error: "",
  loading: false,
};

const applyResult = (state, action) => {
  const p = action.payload || {};
  if (p.debitNoteItems !== undefined) state.debitNoteItems = p.debitNoteItems;
  if (p.pagination !== undefined) state.pagination = p.pagination;
  if (p.debitNoteItem !== undefined && p.debitNoteItem !== null)
    state.debitNoteItem = p.debitNoteItem;
  state.actionFlag = p.actionFlag || "";
  state.success = p.success || "";
  state.error = p.error || "";
  state.loading = false;
};

export const appDebitNoteSlice = createSlice({
  name: "appDebitNote",
  initialState,
  reducers: {
    cleanDebitNoteMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanDebitNoteItem: (state) => {
      state.debitNoteItem = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (a) => a.type.startsWith("appDebitNote/") && a.type.endsWith("/pending"),
      (state) => {
        state.loading = true;
      }
    );
    builder.addMatcher(
      (a) =>
        a.type.startsWith("appDebitNote/") && a.type.endsWith("/fulfilled"),
      applyResult
    );
    builder.addMatcher(
      (a) => a.type.startsWith("appDebitNote/") && a.type.endsWith("/rejected"),
      (state) => {
        state.loading = false;
      }
    );
  },
});

export const { cleanDebitNoteMessage, cleanDebitNoteItem } =
  appDebitNoteSlice.actions;
export default appDebitNoteSlice.reducer;
