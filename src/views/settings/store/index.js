import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// --------------------------- API CALLS ---------------------------
async function getSettingListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.settings.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getSettingList = createAsyncThunk(
  "appSetting/getSettingList",
  async (params, { rejectWithValue }) => {
    try {
      const response = await getSettingListRequest(params);

      if (response?.statusCode === 200) {
        return {
          settingItem: response.data || [],
          pagination: response._metadata?.pagination || null,
        };
      }
      return rejectWithValue(response?.message || "Failed to load settings");
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

async function getSettingRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.settings.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getSetting = createAsyncThunk(
  "appSetting/getSetting",
  async (id, { rejectWithValue }) => {
    try {
      const response = await getSettingRequest(id);
      if (response?.statusCode === 200) {
        return response.data;
      }
      return rejectWithValue(response?.message || "Failed to fetch setting");
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

async function updateSettingRequest({ key, payload }) {
  return instance
    .put(`${API_ENDPOINTS.settings.update}/${key}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}


// 🔹 Redux thunk
export const updateSetting = createAsyncThunk(
  "appSetting/updateSetting",
  async ({ key, payload }, { rejectWithValue }) => {
    try {
      const response = await updateSettingRequest({ key, payload });
      if (response?.statusCode === 200) {
        return response;
      }
      return rejectWithValue(response?.message || "Update failed");
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

async function deleteSettingRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.settings.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteSetting = createAsyncThunk(
  "appSetting/deleteSetting",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteSettingRequest(id);
      if (response?.statusCode === 200) {
        return response;
      }
      return rejectWithValue(response?.message || "Delete failed");
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// --------------------------- SLICE ---------------------------
export const appSettingSlice = createSlice({
  name: "appSetting",
  initialState: {
    settingItem: [],
    pagination: null,
    actionFlag: "",
    loading: false, // ⬅️ default not loading
    success: "",
    error: "",
  },
  reducers: {
    cleanSettingMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    // -------- getSettingList --------
    builder
      .addCase(getSettingList.pending, (state) => {
        state.loading = true; // ⬅️ start loading
        state.error = "";
      })
      .addCase(getSettingList.fulfilled, (state, action) => {
        state.settingItem = action.payload.settingItem;
        state.pagination = action.payload.pagination;
        state.loading = false; // ⬅️ stop loading
        state.success = "Settings list retrieved successfully";
        state.error = "";
      })
      .addCase(getSettingList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });

    // -------- getSetting --------
    builder
      .addCase(getSetting.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(getSetting.fulfilled, (state, action) => {
        state.settingItem = action.payload;
        state.loading = false;
      })
      .addCase(getSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });

    // -------- updateSetting --------
    builder
      .addCase(updateSetting.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(updateSetting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload?.message || "Updated successfully";
      })
      .addCase(updateSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });

    // -------- deleteSetting --------
    builder
      .addCase(deleteSetting.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(deleteSetting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload?.message || "Deleted successfully";
      })
      .addCase(deleteSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { cleanSettingMessage } = appSettingSlice.actions;
export default appSettingSlice.reducer;
