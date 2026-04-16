// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ============ MESSAGE LOG LIST ============

async function getMessageLogListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.messageLogs.list}`, { params })
    .then((res) => res.data)
    .catch((error) => error);
}

export const getMessageLogList = createAsyncThunk(
  "appMessageLog/getMessageLogList",
  async (params) => {
    try {
      const response = await getMessageLogListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          messageLogItems: response.data,
          pagination: response?._pagination || { total: 0, totalPage: 0 },
          actionFlag: "ML_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          messageLogItems: [],
          pagination: { total: 0, totalPage: 0 },
          actionFlag: "ML_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        params,
        messageLogItems: [],
        pagination: { total: 0, totalPage: 0 },
        actionFlag: "ML_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ============ MESSAGE LOG DETAIL ============

async function getMessageLogRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.messageLogs.get}/${id}`)
    .then((res) => res.data)
    .catch((error) => error);
}

export const getMessageLog = createAsyncThunk(
  "appMessageLog/getMessageLog",
  async (id) => {
    try {
      const response = await getMessageLogRequest(id);
      if (response?.statusCode && response?.data) {
        return {
          messageLogItem: response.data,
          actionFlag: "ML_GET_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          messageLogItem: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        messageLogItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ============ SLICE ============

export const appMessageLogSlice = createSlice({
  name: "appMessageLog",
  initialState: {
    messageLogItems: [],
    pagination: { total: 0, totalPage: 0 },
    messageLogItem: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanMessageLogMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanMessageLogState: (state) => {
      state.messageLogItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getMessageLogList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(getMessageLogList.fulfilled, (state, action) => {
        state.messageLogItems = action.payload?.messageLogItems || [];
        state.pagination = action.payload?.pagination || { total: 0, totalPage: 0 };
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getMessageLogList.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
      })
      .addCase(getMessageLog.pending, (state) => {
        state.messageLogItem = null;
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(getMessageLog.fulfilled, (state, action) => {
        state.messageLogItem = action.payload?.messageLogItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getMessageLog.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanMessageLogMessage, cleanMessageLogState } =
  appMessageLogSlice.actions;

export default appMessageLogSlice.reducer;
