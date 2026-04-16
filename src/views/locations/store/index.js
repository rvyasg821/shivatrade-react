// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constant
import { initLocationItem } from "@constant/reduxConstant";

async function getLocationListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.locations.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getLocationList = createAsyncThunk(
  "appLocation/getLocationList",
  async (params) => {
    try {
      const response = await getLocationListRequest(params);

      if (response?.statusCode && response?.data) {
        return {
          params,
          locationItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "LOC_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          locationItems: [],
          pagination: null,
          actionFlag: "LOC_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      console.log("getLocationList catch ", error);
      return {
        params,
        locationItems: [],
        pagination: null,
        actionFlag: "LOC_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getLocationRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.locations.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getLocation = createAsyncThunk(
  "appLocation/getLocation",
  async (id) => {
    try {
      const response = await getLocationRequest(id);

      if (response?.statusCode && response.data) {
        return {
          id,
          locationItem: response.data,
          actionFlag: "LOC_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          id,
          locationItem: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      console.log("getLocation catch ", error);
      return {
        id,
        locationItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createLocationRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.locations.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createLocation = createAsyncThunk(
  "appLocation/createLocation",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createLocationRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          locationItem: response.data || null,
          actionFlag: "LOC_CRTD",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to create location";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      console.log("createLocation catch ", error);
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateLocationRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.locations.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateLocation = createAsyncThunk(
  "appLocation/updateLocation",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateLocationRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          locationItem: response.data || null,
          actionFlag: "LOC_UPDT",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to update location";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      console.log("updateLocation catch ", error);
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function getLocationCapacityRequest(companyId) {
  const params = companyId ? { company_id: companyId } : {};
  return instance
    .get(`${API_ENDPOINTS.locations.capacity}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getLocationCapacity = createAsyncThunk(
  "appLocation/getLocationCapacity",
  async (companyId) => {
    try {
      const response = await getLocationCapacityRequest(companyId);

      if (response?.statusCode && response?.data) {
        return {
          locationCapacity: response.data,
          actionFlag: "",
          success: "",
          error: "",
        };
      } else {
        return {
          locationCapacity: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        locationCapacity: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function deleteLocationRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.locations.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteLocation = createAsyncThunk(
  "appLocation/deleteLocation",
  async (id) => {
    try {
      const response = await deleteLocationRequest(id);

      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "LOC_DLT",
          success: response?.message || "",
          error: "",
        };
      } else {
        return {
          id,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      console.log("deleteLocation catch >>> ", error);
      return {
        id,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

export const appLocationSlice = createSlice({
  name: "appLocation",
  initialState: {
    locationItems: [],
    pagination: null,
    locationItem: initLocationItem,
    locationCapacity: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanLocationMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanLocationState: (state) => {
      state.locationItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getLocationList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getLocationList.fulfilled, (state, action) => {
        state.locationItems = action.payload?.locationItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getLocationList.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getLocation.pending, (state) => {
        state.locationItem = initLocationItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getLocation.fulfilled, (state, action) => {
        state.locationItem = action.payload?.locationItem || initLocationItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getLocation.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createLocation.pending, (state) => {
        state.locationItem = initLocationItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.locationItem = action.payload?.locationItem || initLocationItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createLocation.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateLocation.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.locationItem = action.payload?.locationItem || initLocationItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateLocation.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteLocation.pending, (state) => {
        state.locationItem = initLocationItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.locationItem = action.payload?.locationItem || initLocationItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteLocation.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getLocationCapacity.fulfilled, (state, action) => {
        state.locationCapacity = action.payload?.locationCapacity || null;
      });
  },
});

export const { cleanLocationMessage, cleanLocationState } =
  appLocationSlice.actions;

export default appLocationSlice.reducer;
