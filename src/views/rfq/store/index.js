// RFQ (Vendor Sourcing) — redux slice. Action-flag prefix: RFQ_
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const ok = (body) => body?.statusCode === 200 || body?.statusCode === 201;

export const getRfqList = createAsyncThunk(
  "appRfq/getRfqList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.rfq.list, { params });
      const body = resp?.data;
      return {
        rfqItems: ok(body) ? body.data || [] : [],
        pagination: ok(body) ? body?._metadata?.pagination || null : null,
        actionFlag: "RFQ_LST",
        success: "",
        error: ok(body) ? "" : body?.message || "Failed to load RFQs",
      };
    } catch (error) {
      return {
        rfqItems: [],
        pagination: null,
        actionFlag: "RFQ_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

export const getRfq = createAsyncThunk("appRfq/getRfq", async (id) => {
  try {
    const resp = await instance.get(`${API_ENDPOINTS.rfq.get}/${id}`);
    const body = resp?.data;
    return {
      rfqItem: ok(body) ? body.data : null,
      actionFlag: "RFQ_GET",
      success: "",
      error: ok(body) ? "" : body?.message || "Failed to load RFQ",
    };
  } catch (error) {
    return {
      rfqItem: null,
      actionFlag: "RFQ_GET_ERR",
      success: "",
      error: error?.response?.data?.message || error.message || error,
    };
  }
});

// Generic mutation helper — all mutating endpoints return the updated RFQ.
const mutate = (name, flag, fn) =>
  createAsyncThunk(`appRfq/${name}`, async (arg) => {
    try {
      const resp = await fn(arg);
      const body = resp?.data;
      return {
        rfqItem: ok(body) ? body.data : null,
        actionFlag: ok(body) ? flag : `${flag}_ERR`,
        success: ok(body) ? body?.message || "" : "",
        error: ok(body) ? "" : body?.message || "Action failed",
      };
    } catch (error) {
      return {
        rfqItem: null,
        actionFlag: `${flag}_ERR`,
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  });

export const createRfqFromLead = mutate(
  "createRfqFromLead",
  "RFQ_CRTD",
  ({ leadId, data }) =>
    instance.post(`${API_ENDPOINTS.rfq.fromLead}/${leadId}`, data || {})
);
export const updateRfq = mutate("updateRfq", "RFQ_UPDT", ({ id, data }) =>
  instance.put(`${API_ENDPOINTS.rfq.update}/${id}`, data)
);
export const deleteRfq = createAsyncThunk("appRfq/deleteRfq", async (id) => {
  try {
    const resp = await instance.delete(`${API_ENDPOINTS.rfq.delete}/${id}`);
    const body = resp?.data;
    return {
      actionFlag: ok(body) ? "RFQ_DLTD" : "RFQ_DLTD_ERR",
      success: ok(body) ? body?.message || "Deleted." : "",
      error: ok(body) ? "" : body?.message || "Delete failed",
    };
  } catch (error) {
    return {
      actionFlag: "RFQ_DLTD_ERR",
      success: "",
      error: error?.response?.data?.message || error.message || error,
    };
  }
});
export const deleteManyRfqs = createAsyncThunk(
  "appRfq/deleteManyRfqs",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.rfq.deleteMany, { ids });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);
export const addRfqVendors = mutate("addRfqVendors", "RFQ_VND", ({ id, data }) =>
  instance.post(`${API_ENDPOINTS.rfq.vendors}/${id}/vendors`, data)
);
export const removeRfqVendor = mutate(
  "removeRfqVendor",
  "RFQ_VND",
  ({ id, vendorId }) =>
    instance.delete(`${API_ENDPOINTS.rfq.vendors}/${id}/vendors/${vendorId}`)
);
export const setRfqPrices = mutate("setRfqPrices", "RFQ_PRC", ({ id, data }) =>
  instance.post(`${API_ENDPOINTS.rfq.prices}/${id}/prices`, data)
);
export const selectRfqPrice = mutate("selectRfqPrice", "RFQ_SEL", ({ id, data }) =>
  instance.post(`${API_ENDPOINTS.rfq.select}/${id}/select`, data)
);

const initialState = {
  rfqItems: [],
  rfqItem: null,
  pagination: null,
  actionFlag: "",
  success: "",
  error: "",
  loading: false,
};

const applyResult = (state, action) => {
  const p = action.payload || {};
  if (p.rfqItems !== undefined) state.rfqItems = p.rfqItems;
  if (p.pagination !== undefined) state.pagination = p.pagination;
  if (p.rfqItem !== undefined && p.rfqItem !== null) state.rfqItem = p.rfqItem;
  state.actionFlag = p.actionFlag || "";
  state.success = p.success || "";
  state.error = p.error || "";
  state.loading = false;
};

export const appRfqSlice = createSlice({
  name: "appRfq",
  initialState,
  reducers: {
    cleanRfqMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanRfqItem: (state) => {
      state.rfqItem = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (a) => a.type.startsWith("appRfq/") && a.type.endsWith("/pending"),
      (state) => {
        state.loading = true;
      }
    );
    builder.addMatcher(
      (a) => a.type.startsWith("appRfq/") && a.type.endsWith("/fulfilled"),
      applyResult
    );
    builder.addMatcher(
      (a) => a.type.startsWith("appRfq/") && a.type.endsWith("/rejected"),
      (state) => {
        state.loading = false;
      }
    );
  },
});

export const { cleanRfqMessage, cleanRfqItem } = appRfqSlice.actions;
export default appRfqSlice.reducer;
