// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initPriceListItem } from "@constant/reduxConstant";

async function getPriceListListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.priceList.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getPriceListList = createAsyncThunk(
  "appPriceList/getPriceListList",
  async (params) => {
    try {
      const response = await getPriceListListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          priceListItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "PL_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        priceListItems: [],
        pagination: null,
        actionFlag: "PL_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        priceListItems: [],
        pagination: null,
        actionFlag: "PL_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getPriceListRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.priceList.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getPriceList = createAsyncThunk(
  "appPriceList/getPriceList",
  async (id) => {
    try {
      const response = await getPriceListRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          priceListItem: response.data,
          actionFlag: "PL_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        priceListItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        priceListItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createPriceListRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.priceList.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createPriceList = createAsyncThunk(
  "appPriceList/createPriceList",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createPriceListRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          priceListItem: response.data || null,
          actionFlag: "PL_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create price list entry";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updatePriceListRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.priceList.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updatePriceList = createAsyncThunk(
  "appPriceList/updatePriceList",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updatePriceListRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          priceListItem: response.data || null,
          actionFlag: "PL_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update price list entry";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deletePriceListRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.priceList.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deletePriceList = createAsyncThunk(
  "appPriceList/deletePriceList",
  async (id) => {
    try {
      const response = await deletePriceListRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "PL_DLT",
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

// Bulk delete — mirrors the shared useBulkDelete contract: resolves to
// { deleted, skipped } so the hook can report deleted-vs-skipped counts.
export const deleteManyPriceList = createAsyncThunk(
  "appPriceList/deleteManyPriceList",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.priceList.deleteMany, {
        ids,
      });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || "Delete failed"
      );
    }
  }
);

export const appPriceListSlice = createSlice({
  name: "appPriceList",
  initialState: {
    priceListItems: [],
    pagination: null,
    priceListItem: initPriceListItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanPriceListMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanPriceListState: (state) => {
      state.priceListItem = initPriceListItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPriceListList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getPriceListList.fulfilled, (state, action) => {
        state.priceListItems = action.payload?.priceListItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPriceListList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getPriceList.pending, (state) => {
        state.priceListItem = initPriceListItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getPriceList.fulfilled, (state, action) => {
        state.priceListItem =
          action.payload?.priceListItem || initPriceListItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPriceList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createPriceList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createPriceList.fulfilled, (state, action) => {
        state.priceListItem =
          action.payload?.priceListItem || initPriceListItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createPriceList.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updatePriceList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updatePriceList.fulfilled, (state, action) => {
        state.priceListItem =
          action.payload?.priceListItem || initPriceListItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updatePriceList.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deletePriceList.pending, (state) => {
        state.loading = false;
      })
      .addCase(deletePriceList.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deletePriceList.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanPriceListMessage, cleanPriceListState } =
  appPriceListSlice.actions;

export default appPriceListSlice.reducer;
