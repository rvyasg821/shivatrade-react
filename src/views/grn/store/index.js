// GRN (Goods Receipt Note) — redux slice. Action-flag prefix: GRN_
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const ok = (body) => body?.statusCode === 200 || body?.statusCode === 201;

export const getGrnList = createAsyncThunk(
  "appGrn/getGrnList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.grn.list, { params });
      const body = resp?.data;
      return {
        grnItems: ok(body) ? body.data || [] : [],
        pagination: ok(body) ? body?._metadata?.pagination || null : null,
        actionFlag: "GRN_LST",
        success: "",
        error: ok(body) ? "" : body?.message || "Failed to load GRNs",
      };
    } catch (error) {
      return {
        grnItems: [],
        pagination: null,
        actionFlag: "GRN_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

export const getGrn = createAsyncThunk("appGrn/getGrn", async (id) => {
  try {
    const resp = await instance.get(`${API_ENDPOINTS.grn.get}/${id}`);
    const body = resp?.data;
    return {
      grnItem: ok(body) ? body.data : null,
      actionFlag: "GRN_GET",
      success: "",
      error: ok(body) ? "" : body?.message || "Failed to load GRN",
    };
  } catch (error) {
    return {
      grnItem: null,
      actionFlag: "GRN_GET_ERR",
      success: "",
      error: error?.response?.data?.message || error.message || error,
    };
  }
});

export const getGrnSourcePovs = createAsyncThunk(
  "appGrn/getGrnSourcePovs",
  async () => {
    try {
      const resp = await instance.get(API_ENDPOINTS.grn.sourcePovs);
      const body = resp?.data;
      return {
        sourcePovs: ok(body) ? body.data || [] : [],
        actionFlag: "GRN_SRC",
        success: "",
        error: ok(body) ? "" : body?.message || "Failed to load Vendor POs",
      };
    } catch (error) {
      return {
        sourcePovs: [],
        actionFlag: "GRN_SRC_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

const mutate = (name, flag, fn) =>
  createAsyncThunk(`appGrn/${name}`, async (arg) => {
    try {
      const resp = await fn(arg);
      const body = resp?.data;
      return {
        grnItem: ok(body) ? body.data : null,
        actionFlag: ok(body) ? flag : `${flag}_ERR`,
        success: ok(body) ? body?.message || "" : "",
        error: ok(body) ? "" : body?.message || "Action failed",
      };
    } catch (error) {
      return {
        grnItem: null,
        actionFlag: `${flag}_ERR`,
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  });

export const createGrnFromPov = mutate(
  "createGrnFromPov",
  "GRN_CRTD",
  ({ povId, data }) =>
    instance.post(`${API_ENDPOINTS.grn.fromPov}/${povId}`, data || {})
);
export const updateGrn = mutate("updateGrn", "GRN_UPDT", ({ id, data }) =>
  instance.put(`${API_ENDPOINTS.grn.update}/${id}`, data)
);
export const deleteGrn = createAsyncThunk("appGrn/deleteGrn", async (id) => {
  try {
    const resp = await instance.delete(`${API_ENDPOINTS.grn.delete}/${id}`);
    const body = resp?.data;
    return {
      actionFlag: ok(body) ? "GRN_DLTD" : "GRN_DLTD_ERR",
      success: ok(body) ? body?.message || "Deleted." : "",
      error: ok(body) ? "" : body?.message || "Delete failed",
    };
  } catch (error) {
    return {
      actionFlag: "GRN_DLTD_ERR",
      success: "",
      error: error?.response?.data?.message || error.message || error,
    };
  }
});

export const deleteManyGrns = createAsyncThunk(
  "appGrn/deleteManyGrns",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.grn.deleteMany, { ids });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

const initialState = {
  grnItems: [],
  grnItem: null,
  sourcePovs: [],
  pagination: null,
  actionFlag: "",
  success: "",
  error: "",
  loading: false,
};

const applyResult = (state, action) => {
  const p = action.payload || {};
  if (p.grnItems !== undefined) state.grnItems = p.grnItems;
  if (p.pagination !== undefined) state.pagination = p.pagination;
  if (p.grnItem !== undefined && p.grnItem !== null) state.grnItem = p.grnItem;
  if (p.sourcePovs !== undefined) state.sourcePovs = p.sourcePovs;
  state.actionFlag = p.actionFlag || "";
  state.success = p.success || "";
  state.error = p.error || "";
  state.loading = false;
};

export const appGrnSlice = createSlice({
  name: "appGrn",
  initialState,
  reducers: {
    cleanGrnMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanGrnItem: (state) => {
      state.grnItem = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (a) => a.type.startsWith("appGrn/") && a.type.endsWith("/pending"),
      (state) => {
        state.loading = true;
      }
    );
    builder.addMatcher(
      (a) => a.type.startsWith("appGrn/") && a.type.endsWith("/fulfilled"),
      applyResult
    );
    builder.addMatcher(
      (a) => a.type.startsWith("appGrn/") && a.type.endsWith("/rejected"),
      (state) => {
        state.loading = false;
      }
    );
  },
});

export const { cleanGrnMessage, cleanGrnItem } = appGrnSlice.actions;
export default appGrnSlice.reducer;
