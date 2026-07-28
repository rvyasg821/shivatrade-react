// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initCityItem } from "@constant/reduxConstant";

// ─── City CRUD ──────────────────────────────────────────────────────────

async function getCityListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.cities.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCityList = createAsyncThunk(
  "appCity/getCityList",
  async (params) => {
    try {
      const response = await getCityListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          cityItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "CITY_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        cityItems: [],
        pagination: null,
        actionFlag: "CITY_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        cityItems: [],
        pagination: null,
        actionFlag: "CITY_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

/** Active cities, narrowed by `state_id` or `country_id`. */
async function getCityDropdownRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.cities.dropdown}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCityDropdown = createAsyncThunk(
  "appCity/getCityDropdown",
  async (params) => {
    try {
      const response = await getCityDropdownRequest(params);
      if (response?.statusCode && response?.data) {
        return { cityDropdown: response.data };
      }
      return { cityDropdown: [] };
    } catch (error) {
      return { cityDropdown: [] };
    }
  }
);

async function getCityRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.cities.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCity = createAsyncThunk("appCity/getCity", async (id) => {
  try {
    const response = await getCityRequest(id);
    if (response?.statusCode && response.data) {
      return {
        id,
        cityItem: response.data,
        actionFlag: "CITY_SCS",
        success: "",
        error: "",
      };
    }
    return {
      id,
      cityItem: null,
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return {
      id,
      cityItem: null,
      actionFlag: "",
      success: "",
      error: error.message || error,
    };
  }
});

async function createCityRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.cities.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createCity = createAsyncThunk(
  "appCity/createCity",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createCityRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          cityItem: response.data || null,
          actionFlag: "CITY_CRTD",
          success: response?.message || "City created",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to create city"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function updateCityRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.cities.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateCity = createAsyncThunk(
  "appCity/updateCity",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateCityRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          cityItem: response.data || null,
          actionFlag: "CITY_UPDT",
          success: response?.message || "City updated",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to update city"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function deleteCityRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.cities.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteCity = createAsyncThunk("appCity/deleteCity", async (id) => {
  try {
    const response = await deleteCityRequest(id);
    if (response?.statusCode === 200) {
      return {
        id,
        actionFlag: "CITY_DLT",
        success: response?.message || "City deleted",
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
    return { id, actionFlag: "", success: "", error: error.message || error };
  }
});

export const deleteManyCities = createAsyncThunk(
  "appCity/deleteManyCities",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.cities.deleteMany, {
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

export const appCitySlice = createSlice({
  name: "appCity",
  initialState: {
    cityItems: [],
    cityDropdown: [],
    pagination: null,
    cityItem: initCityItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCityMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanCityState: (state) => {
      state.cityItem = initCityItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCityList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCityList.fulfilled, (state, action) => {
        state.cityItems = action.payload?.cityItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCityList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getCityDropdown.fulfilled, (state, action) => {
        state.cityDropdown = action.payload?.cityDropdown || [];
      })
      .addCase(getCity.pending, (state) => {
        state.cityItem = initCityItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCity.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createCity.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createCity.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateCity.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateCity.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteCity.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteCity.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteCity.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanCityMessage, cleanCityState } = appCitySlice.actions;

export default appCitySlice.reducer;
