// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initLeadItem } from "@constant/reduxConstant";

async function getLeadListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.leads.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getLeadList = createAsyncThunk(
  "appLead/getLeadList",
  async (params) => {
    try {
      const response = await getLeadListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          leadItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "LEAD_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        leadItems: [],
        pagination: null,
        actionFlag: "LEAD_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        leadItems: [],
        pagination: null,
        actionFlag: "LEAD_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getLeadRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.leads.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getLead = createAsyncThunk("appLead/getLead", async (id) => {
  try {
    const response = await getLeadRequest(id);
    if (response?.statusCode && response.data) {
      return {
        id,
        leadItem: response.data,
        actionFlag: "LEAD_SCS",
        success: "",
        error: "",
      };
    }
    return {
      id,
      leadItem: null,
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return {
      id,
      leadItem: null,
      actionFlag: "",
      success: "",
      error: error.message || error,
    };
  }
});

async function createLeadRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.leads.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createLead = createAsyncThunk(
  "appLead/createLead",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createLeadRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          leadItem: response.data || null,
          actionFlag: "LEAD_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create lead";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateLeadRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.leads.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateLead = createAsyncThunk(
  "appLead/updateLead",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateLeadRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          leadItem: response.data || null,
          actionFlag: "LEAD_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update lead";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function deleteLeadRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.leads.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteLead = createAsyncThunk("appLead/deleteLead", async (id) => {
  try {
    const response = await deleteLeadRequest(id);
    if (response?.statusCode === 200) {
      return {
        id,
        actionFlag: "LEAD_DLT",
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
});

async function convertLeadRequest(id) {
  return instance
    .post(`${API_ENDPOINTS.leads.convert}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const convertLead = createAsyncThunk(
  "appLead/convertLead",
  async (id, { rejectWithValue }) => {
    try {
      const response = await convertLeadRequest(id);
      if (response?.statusCode && response?.data) {
        return {
          leadItem: response.data,
          actionFlag: "LEAD_CONV",
          success: response?.message || "Lead converted to customer",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to convert lead";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

export const appLeadSlice = createSlice({
  name: "appLead",
  initialState: {
    leadItems: [],
    pagination: null,
    leadItem: initLeadItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanLeadMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanLeadState: (state) => {
      state.leadItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getLeadList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getLeadList.fulfilled, (state, action) => {
        state.leadItems = action.payload?.leadItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getLeadList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getLead.pending, (state) => {
        state.leadItem = initLeadItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getLead.fulfilled, (state, action) => {
        state.leadItem = action.payload?.leadItem || initLeadItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getLead.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createLead.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createLead.fulfilled, (state, action) => {
        state.leadItem = action.payload?.leadItem || initLeadItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createLead.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateLead.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        state.leadItem = action.payload?.leadItem || initLeadItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateLead.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteLead.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteLead.rejected, (state) => {
        state.loading = true;
      })
      .addCase(convertLead.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(convertLead.fulfilled, (state, action) => {
        state.leadItem = action.payload?.leadItem || initLeadItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = "";
      })
      .addCase(convertLead.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      });
  },
});

export const { cleanLeadMessage, cleanLeadState } = appLeadSlice.actions;

export default appLeadSlice.reducer;
