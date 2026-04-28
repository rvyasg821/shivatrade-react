// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initCurrencyItem } from "@constant/reduxConstant";

// ─── Currency CRUD ──────────────────────────────────────────────────────

async function getCurrencyListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.currencies.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCurrencyList = createAsyncThunk(
  "appCurrency/getCurrencyList",
  async (params) => {
    try {
      const response = await getCurrencyListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          currencyItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "CUR_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        currencyItems: [],
        pagination: null,
        actionFlag: "CUR_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        currencyItems: [],
        pagination: null,
        actionFlag: "CUR_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getCurrencyDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.currencies.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCurrencyDropdown = createAsyncThunk(
  "appCurrency/getCurrencyDropdown",
  async () => {
    try {
      const response = await getCurrencyDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { currencyDropdown: response.data };
      }
      return { currencyDropdown: [] };
    } catch (error) {
      return { currencyDropdown: [] };
    }
  }
);

async function getCurrencyRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.currencies.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCurrency = createAsyncThunk(
  "appCurrency/getCurrency",
  async (id) => {
    try {
      const response = await getCurrencyRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          currencyItem: response.data,
          actionFlag: "CUR_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        currencyItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        currencyItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createCurrencyRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.currencies.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createCurrency = createAsyncThunk(
  "appCurrency/createCurrency",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createCurrencyRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          currencyItem: response.data || null,
          actionFlag: "CUR_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create currency";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateCurrencyRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.currencies.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateCurrency = createAsyncThunk(
  "appCurrency/updateCurrency",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateCurrencyRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          currencyItem: response.data || null,
          actionFlag: "CUR_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update currency";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteCurrencyRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.currencies.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteCurrency = createAsyncThunk(
  "appCurrency/deleteCurrency",
  async (id) => {
    try {
      const response = await deleteCurrencyRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "CUR_DLT",
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

// ─── Exchange Rates ─────────────────────────────────────────────────────

export const getExchangeRates = createAsyncThunk(
  "appCurrency/getExchangeRates",
  async (currencyId) => {
    try {
      const res = await instance
        .get(`${API_ENDPOINTS.currencies.rates}/${currencyId}/rates`)
        .then((r) => r.data)
        .catch((e) => e);
      if (res?.statusCode && res?.data) {
        return { exchangeRates: res.data };
      }
      return { exchangeRates: [] };
    } catch (error) {
      return { exchangeRates: [] };
    }
  }
);

export const addExchangeRate = createAsyncThunk(
  "appCurrency/addExchangeRate",
  async ({ currencyId, data }, { rejectWithValue }) => {
    try {
      const res = await instance
        .post(`${API_ENDPOINTS.currencies.rates}/${currencyId}/rates`, data)
        .then((r) => r.data)
        .catch((e) => e);
      if (res?.statusCode && res?.data) {
        return {
          actionFlag: "CUR_RATE_CRTD",
          success: res?.message || "Exchange rate added",
          error: "",
        };
      }
      return rejectWithValue(
        res?.response?.data?.message || res.message || "Failed to add rate"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────

export const appCurrencySlice = createSlice({
  name: "appCurrency",
  initialState: {
    currencyItems: [],
    currencyDropdown: [],
    pagination: null,
    currencyItem: initCurrencyItem,
    exchangeRates: [],
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCurrencyMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanCurrencyState: (state) => {
      state.currencyItem = null;
      state.exchangeRates = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCurrencyList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCurrencyList.fulfilled, (state, action) => {
        state.currencyItems = action.payload?.currencyItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCurrencyList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getCurrencyDropdown.fulfilled, (state, action) => {
        state.currencyDropdown = action.payload?.currencyDropdown || [];
      })
      .addCase(getCurrency.pending, (state) => {
        state.currencyItem = initCurrencyItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCurrency.fulfilled, (state, action) => {
        state.currencyItem = action.payload?.currencyItem || initCurrencyItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCurrency.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createCurrency.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCurrency.fulfilled, (state, action) => {
        state.currencyItem = action.payload?.currencyItem || initCurrencyItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createCurrency.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateCurrency.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCurrency.fulfilled, (state, action) => {
        state.currencyItem = action.payload?.currencyItem || initCurrencyItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateCurrency.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteCurrency.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteCurrency.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteCurrency.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getExchangeRates.fulfilled, (state, action) => {
        state.exchangeRates = action.payload?.exchangeRates || [];
      })
      .addCase(addExchangeRate.fulfilled, (state, action) => {
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = "";
      })
      .addCase(addExchangeRate.rejected, (state, action) => {
        state.error = action.payload || "Failed to add rate";
      });
  },
});

export const { cleanCurrencyMessage, cleanCurrencyState } =
  appCurrencySlice.actions;

export default appCurrencySlice.reducer;
