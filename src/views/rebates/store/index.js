import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { initRebateItem } from "@constant/reduxConstant";

async function getListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.rebates.list}`, { params })
    .then((r) => r.data)
    .catch((e) => e);
}

export const getRebateList = createAsyncThunk(
  "appRebate/getRebateList",
  async (params) => {
    try {
      const response = await getListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          rebateItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "REB_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        rebateItems: [],
        pagination: null,
        actionFlag: "REB_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        rebateItems: [],
        pagination: null,
        actionFlag: "REB_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

export const getRebateDropdown = createAsyncThunk(
  "appRebate/getRebateDropdown",
  async () => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.rebates.dropdown}`)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { rebateDropdown: response.data };
      }
      return { rebateDropdown: [] };
    } catch {
      return { rebateDropdown: [] };
    }
  }
);

export const getRebate = createAsyncThunk(
  "appRebate/getRebate",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.rebates.get}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode && response.data) {
        return { rebateItem: response.data, actionFlag: "REB_SCS", success: "", error: "" };
      }
      return {
        rebateItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return { rebateItem: null, actionFlag: "", success: "", error: error.message || error };
    }
  }
);

export const createRebate = createAsyncThunk(
  "appRebate/createRebate",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.rebates.create}`, payload)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          rebateItem: response.data,
          actionFlag: "REB_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message || response.message || "Failed to create rebate"
      );
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

export const updateRebate = createAsyncThunk(
  "appRebate/updateRebate",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.rebates.update}/${id}`, data)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          rebateItem: response.data,
          actionFlag: "REB_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message || response.message || "Failed to update rebate"
      );
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

export const deleteRebate = createAsyncThunk("appRebate/deleteRebate", async (id) => {
  try {
    const response = await instance
      .delete(`${API_ENDPOINTS.rebates.delete}/${id}`)
      .then((r) => r.data)
      .catch((e) => e);
    if (response?.statusCode === 200) {
      return { actionFlag: "REB_DLT", success: response?.message || "", error: "" };
    }
    return {
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return { actionFlag: "", success: "", error: error.message || error };
  }
});

export const appRebateSlice = createSlice({
  name: "appRebate",
  initialState: {
    rebateItems: [],
    rebateDropdown: [],
    pagination: null,
    rebateItem: initRebateItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanRebateMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanRebateState: (state) => {
      state.rebateItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getRebateList.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(getRebateList.fulfilled, (s, a) => {
        s.rebateItems = a.payload?.rebateItems || [];
        s.pagination = a.payload?.pagination || null;
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(getRebateList.rejected, (s) => { s.loading = true; })
      .addCase(getRebateDropdown.fulfilled, (s, a) => { s.rebateDropdown = a.payload?.rebateDropdown || []; })
      .addCase(getRebate.pending, (s) => { s.rebateItem = initRebateItem; s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(getRebate.fulfilled, (s, a) => {
        s.rebateItem = a.payload?.rebateItem || initRebateItem;
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(getRebate.rejected, (s) => { s.loading = true; })
      .addCase(createRebate.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(createRebate.fulfilled, (s, a) => {
        s.rebateItem = a.payload?.rebateItem || initRebateItem;
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(createRebate.rejected, (s, a) => { s.loading = true; s.error = a.payload || ""; })
      .addCase(updateRebate.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(updateRebate.fulfilled, (s, a) => {
        s.rebateItem = a.payload?.rebateItem || initRebateItem;
        s.loading = true; s.actionFlag = a.payload?.actionFlag;
        s.success = a.payload?.success; s.error = a.payload?.error;
      })
      .addCase(updateRebate.rejected, (s, a) => { s.loading = true; s.error = a.payload || ""; })
      .addCase(deleteRebate.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(deleteRebate.fulfilled, (s, a) => {
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(deleteRebate.rejected, (s) => { s.loading = true; });
  },
});

export const { cleanRebateMessage, cleanRebateState } = appRebateSlice.actions;
export default appRebateSlice.reducer;
