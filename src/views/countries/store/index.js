// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initCountryItem } from "@constant/reduxConstant";

// ─── Country CRUD ───────────────────────────────────────────────────────

async function getCountryListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.countries.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCountryList = createAsyncThunk(
  "appCountry/getCountryList",
  async (params) => {
    try {
      const response = await getCountryListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          countryItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "CNTRY_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        countryItems: [],
        pagination: null,
        actionFlag: "CNTRY_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        countryItems: [],
        pagination: null,
        actionFlag: "CNTRY_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

/**
 * Active countries for the address dropdowns. Unpaginated — every address form
 * needs the whole list to resolve a stored ISO code back to a label.
 */
async function getCountryDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.countries.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCountryDropdown = createAsyncThunk(
  "appCountry/getCountryDropdown",
  async () => {
    try {
      const response = await getCountryDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { countryDropdown: response.data };
      }
      return { countryDropdown: [] };
    } catch (error) {
      return { countryDropdown: [] };
    }
  }
);

async function getCountryRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.countries.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCountry = createAsyncThunk(
  "appCountry/getCountry",
  async (id) => {
    try {
      const response = await getCountryRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          countryItem: response.data,
          actionFlag: "CNTRY_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        countryItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        countryItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createCountryRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.countries.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createCountry = createAsyncThunk(
  "appCountry/createCountry",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createCountryRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          countryItem: response.data || null,
          actionFlag: "CNTRY_CRTD",
          success: response?.message || "Country created",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to create country"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function updateCountryRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.countries.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateCountry = createAsyncThunk(
  "appCountry/updateCountry",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateCountryRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          countryItem: response.data || null,
          actionFlag: "CNTRY_UPDT",
          success: response?.message || "Country updated",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to update country"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function deleteCountryRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.countries.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteCountry = createAsyncThunk(
  "appCountry/deleteCountry",
  async (id) => {
    try {
      const response = await deleteCountryRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "CNTRY_DLT",
          success: response?.message || "Country deleted",
          error: "",
        };
      }
      return {
        id,
        actionFlag: "",
        success: "",
        // The backend refuses to delete a country that still has states or
        // cities under it — surface that message rather than a generic failure.
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

export const deleteManyCountries = createAsyncThunk(
  "appCountry/deleteManyCountries",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.countries.deleteMany, {
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

// ─── Slice ──────────────────────────────────────────────────────────────

export const appCountrySlice = createSlice({
  name: "appCountry",
  initialState: {
    countryItems: [],
    countryDropdown: [],
    pagination: null,
    countryItem: initCountryItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCountryMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanCountryState: (state) => {
      state.countryItem = initCountryItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCountryList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCountryList.fulfilled, (state, action) => {
        state.countryItems = action.payload?.countryItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCountryList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getCountryDropdown.fulfilled, (state, action) => {
        state.countryDropdown = action.payload?.countryDropdown || [];
      })
      .addCase(getCountry.pending, (state) => {
        state.countryItem = initCountryItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCountry.fulfilled, (state, action) => {
        state.countryItem = action.payload?.countryItem || initCountryItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCountry.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createCountry.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCountry.fulfilled, (state, action) => {
        state.countryItem = action.payload?.countryItem || initCountryItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createCountry.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateCountry.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCountry.fulfilled, (state, action) => {
        state.countryItem = action.payload?.countryItem || initCountryItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateCountry.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteCountry.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteCountry.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteCountry.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanCountryMessage, cleanCountryState } =
  appCountrySlice.actions;

export default appCountrySlice.reducer;
