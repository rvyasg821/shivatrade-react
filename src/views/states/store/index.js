// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initStateItem } from "@constant/reduxConstant";

// ─── State CRUD ─────────────────────────────────────────────────────────

async function getStateListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.states.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getStateList = createAsyncThunk(
  "appState/getStateList",
  async (params) => {
    try {
      const response = await getStateListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          stateItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "STATE_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        stateItems: [],
        pagination: null,
        actionFlag: "STATE_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        stateItems: [],
        pagination: null,
        actionFlag: "STATE_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

/**
 * Active states, optionally narrowed to one country. Address forms pass
 * `country_code` (that is what they hold); the master screen passes `country_id`.
 */
async function getStateDropdownRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.states.dropdown}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getStateDropdown = createAsyncThunk(
  "appState/getStateDropdown",
  async (params) => {
    try {
      const response = await getStateDropdownRequest(params);
      if (response?.statusCode && response?.data) {
        return { stateDropdown: response.data };
      }
      return { stateDropdown: [] };
    } catch (error) {
      return { stateDropdown: [] };
    }
  }
);

async function getStateRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.states.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getState = createAsyncThunk("appState/getState", async (id) => {
  try {
    const response = await getStateRequest(id);
    if (response?.statusCode && response.data) {
      return {
        id,
        stateItem: response.data,
        actionFlag: "STATE_SCS",
        success: "",
        error: "",
      };
    }
    return {
      id,
      stateItem: null,
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return {
      id,
      stateItem: null,
      actionFlag: "",
      success: "",
      error: error.message || error,
    };
  }
});

async function createStateRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.states.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createState = createAsyncThunk(
  "appState/createState",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createStateRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          stateItem: response.data || null,
          actionFlag: "STATE_CRTD",
          success: response?.message || "State created",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to create state"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function updateStateRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.states.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateState = createAsyncThunk(
  "appState/updateState",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateStateRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          stateItem: response.data || null,
          actionFlag: "STATE_UPDT",
          success: response?.message || "State updated",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to update state"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function deleteStateRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.states.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteState = createAsyncThunk(
  "appState/deleteState",
  async (id) => {
    try {
      const response = await deleteStateRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "STATE_DLT",
          success: response?.message || "State deleted",
          error: "",
        };
      }
      return {
        id,
        actionFlag: "",
        success: "",
        // Backend blocks the delete while cities still point at this state.
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error.message || error };
    }
  }
);

export const deleteManyStates = createAsyncThunk(
  "appState/deleteManyStates",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.states.deleteMany, {
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

export const appStateSlice = createSlice({
  name: "appState",
  initialState: {
    stateItems: [],
    stateDropdown: [],
    pagination: null,
    stateItem: initStateItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanStateMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanStateState: (state) => {
      state.stateItem = initStateItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getStateList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getStateList.fulfilled, (state, action) => {
        state.stateItems = action.payload?.stateItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getStateList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getStateDropdown.fulfilled, (state, action) => {
        state.stateDropdown = action.payload?.stateDropdown || [];
      })
      .addCase(getState.pending, (state) => {
        state.stateItem = initStateItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getState.fulfilled, (state, action) => {
        state.stateItem = action.payload?.stateItem || initStateItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getState.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createState.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createState.fulfilled, (state, action) => {
        state.stateItem = action.payload?.stateItem || initStateItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createState.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateState.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateState.fulfilled, (state, action) => {
        state.stateItem = action.payload?.stateItem || initStateItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateState.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteState.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteState.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteState.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanStateMessage, cleanStateState } = appStateSlice.actions;

export default appStateSlice.reducer;
