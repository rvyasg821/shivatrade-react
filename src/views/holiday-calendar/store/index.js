// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ============ HOLIDAY CALENDAR ============

async function getHolidayCalendarListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.holidayCalendar.list}`, { params })
    .then((res) => res.data)
    .catch((error) => error);
}

export const getHolidayCalendarList = createAsyncThunk(
  "appHolidayCalendar/getHolidayCalendarList",
  async (params) => {
    try {
      const response = await getHolidayCalendarListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          holidayCalendarItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "HC_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          holidayCalendarItems: [],
          pagination: null,
          actionFlag: "HC_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        params,
        holidayCalendarItems: [],
        pagination: null,
        actionFlag: "HC_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getHolidayCalendarRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.holidayCalendar.get}/${id}`)
    .then((res) => res.data)
    .catch((error) => error);
}

export const getHolidayCalendar = createAsyncThunk(
  "appHolidayCalendar/getHolidayCalendar",
  async (id) => {
    try {
      const response = await getHolidayCalendarRequest(id);
      if (response?.statusCode && response?.data) {
        return {
          holidayCalendarItem: response.data,
          actionFlag: "HC_GET_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          holidayCalendarItem: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        holidayCalendarItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createHolidayCalendarRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.holidayCalendar.create}`, payload)
    .then((res) => res.data)
    .catch((error) => error);
}

export const createHolidayCalendar = createAsyncThunk(
  "appHolidayCalendar/createHolidayCalendar",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createHolidayCalendarRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          holidayCalendarItem: response.data,
          actionFlag: "HC_CRT_SCS",
          success: response?.message || "",
          error: "",
        };
      } else {
        return rejectWithValue(
          response?.response?.data?.message || response.message || "Failed to create holiday calendar"
        );
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

async function updateHolidayCalendarRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.holidayCalendar.update}/${id}`, data)
    .then((res) => res.data)
    .catch((error) => error);
}

export const updateHolidayCalendar = createAsyncThunk(
  "appHolidayCalendar/updateHolidayCalendar",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateHolidayCalendarRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          holidayCalendarItem: response.data,
          actionFlag: "HC_UPD_SCS",
          success: response?.message || "",
          error: "",
        };
      } else {
        return rejectWithValue(
          response?.response?.data?.message || response.message || "Failed to update holiday calendar"
        );
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

async function deleteHolidayCalendarRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.holidayCalendar.delete}/${id}`)
    .then((res) => res.data)
    .catch((error) => error);
}

export const deleteHolidayCalendar = createAsyncThunk(
  "appHolidayCalendar/deleteHolidayCalendar",
  async (id) => {
    try {
      const response = await deleteHolidayCalendarRequest(id);
      if (response?.statusCode === 200 || response?.statusCode === 201) {
        return {
          id,
          actionFlag: "HC_DEL_SCS",
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
      return { id, actionFlag: "", success: "", error: error.message || error };
    }
  }
);

async function importUkHolidaysRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.holidayCalendar.importUk}`, payload)
    .then((res) => res.data)
    .catch((error) => error);
}

export const importUkHolidays = createAsyncThunk(
  "appHolidayCalendar/importUkHolidays",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await importUkHolidaysRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          holidayCalendarItem: response.data,
          actionFlag: "HC_IMP_SCS",
          success: response?.message || "UK Bank Holidays imported successfully",
          error: "",
        };
      } else {
        return rejectWithValue(
          response?.response?.data?.message || response.message || "Failed to import UK holidays"
        );
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

// ============ HOLIDAYS BY DATE RANGE ============

async function getHolidaysForRangeRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.holidayCalendar.holidays}`, { params })
    .then((res) => res.data)
    .catch((error) => error);
}

export const getHolidaysForRange = createAsyncThunk(
  "appHolidayCalendar/getHolidaysForRange",
  async (params) => {
    try {
      const response = await getHolidaysForRangeRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          holidays: response.data,
          actionFlag: "HOL_RANGE_SCS",
          error: "",
        };
      } else {
        return {
          holidays: [],
          actionFlag: "HOL_RANGE_ERR",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return { holidays: [], actionFlag: "HOL_RANGE_ERR", error: error.message || error };
    }
  }
);

// ============ HOLIDAYS (individual entries) ============

async function createHolidayRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.holidayCalendar.holidayCreate}`, payload)
    .then((res) => res.data)
    .catch((error) => error);
}

export const createHoliday = createAsyncThunk(
  "appHolidayCalendar/createHoliday",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createHolidayRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          holidayItem: response.data,
          actionFlag: "HOL_CRT_SCS",
          success: response?.message || "",
          error: "",
        };
      } else {
        return rejectWithValue(
          response?.response?.data?.message || response.message || "Failed to create holiday"
        );
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

async function updateHolidayRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.holidayCalendar.holidayUpdate}/${id}`, data)
    .then((res) => res.data)
    .catch((error) => error);
}

export const updateHoliday = createAsyncThunk(
  "appHolidayCalendar/updateHoliday",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateHolidayRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          holidayItem: response.data,
          actionFlag: "HOL_UPD_SCS",
          success: response?.message || "",
          error: "",
        };
      } else {
        return rejectWithValue(
          response?.response?.data?.message || response.message || "Failed to update holiday"
        );
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

async function deleteHolidayRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.holidayCalendar.holidayDelete}/${id}`)
    .then((res) => res.data)
    .catch((error) => error);
}

export const deleteHoliday = createAsyncThunk(
  "appHolidayCalendar/deleteHoliday",
  async (id) => {
    try {
      const response = await deleteHolidayRequest(id);
      if (response?.statusCode === 200 || response?.statusCode === 201) {
        return { id, actionFlag: "HOL_DEL_SCS", success: "", error: "" };
      } else {
        return { id, actionFlag: "", success: "", error: response?.response?.data?.message || response.message };
      }
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error.message || error };
    }
  }
);

// ============ SLICE ============

export const appHolidayCalendarSlice = createSlice({
  name: "appHolidayCalendar",
  initialState: {
    holidayCalendarItems: [],
    pagination: null,
    holidayCalendarItem: null,
    rangeHolidays: [],
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanHolidayCalendarMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanHolidayCalendarState: (state) => {
      state.holidayCalendarItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(getHolidayCalendarList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getHolidayCalendarList.fulfilled, (state, action) => {
        state.holidayCalendarItems = action.payload?.holidayCalendarItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getHolidayCalendarList.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
      })
      // Get
      .addCase(getHolidayCalendar.pending, (state) => {
        state.holidayCalendarItem = null;
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(getHolidayCalendar.fulfilled, (state, action) => {
        state.holidayCalendarItem = action.payload?.holidayCalendarItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getHolidayCalendar.rejected, (state) => {
        state.loading = true;
      })
      // Create
      .addCase(createHolidayCalendar.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createHolidayCalendar.fulfilled, (state, action) => {
        state.holidayCalendarItem = action.payload?.holidayCalendarItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createHolidayCalendar.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = "";
        state.error = action.payload || "Failed to create holiday calendar";
      })
      // Update
      .addCase(updateHolidayCalendar.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateHolidayCalendar.fulfilled, (state, action) => {
        state.holidayCalendarItem = action.payload?.holidayCalendarItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(updateHolidayCalendar.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = "";
        state.error = action.payload || "Failed to update holiday calendar";
      })
      // Delete
      .addCase(deleteHolidayCalendar.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(deleteHolidayCalendar.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteHolidayCalendar.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
      })
      // Import UK
      .addCase(importUkHolidays.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(importUkHolidays.fulfilled, (state, action) => {
        state.holidayCalendarItem = action.payload?.holidayCalendarItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(importUkHolidays.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = "";
        state.error = action.payload || "Failed to import UK holidays";
      })
      // Create Holiday
      .addCase(createHoliday.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
        // Update holidays in current item if it exists
        if (state.holidayCalendarItem && action.payload?.holidayItem) {
          if (!state.holidayCalendarItem.holidays) {
            state.holidayCalendarItem.holidays = [];
          }
          state.holidayCalendarItem.holidays.push(action.payload.holidayItem);
        }
      })
      .addCase(createHoliday.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = "";
        state.error = action.payload || "Failed to create holiday";
      })
      // Update Holiday
      .addCase(updateHoliday.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
        // Update holiday in list
        if (state.holidayCalendarItem?.holidays && action.payload?.holidayItem) {
          state.holidayCalendarItem.holidays = state.holidayCalendarItem.holidays.map(
            (h) => h._id === action.payload.holidayItem._id ? action.payload.holidayItem : h
          );
        }
      })
      .addCase(updateHoliday.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = "";
        state.error = action.payload || "Failed to update holiday";
      })
      // Holidays for range
      .addCase(getHolidaysForRange.fulfilled, (state, action) => {
        state.rangeHolidays = action.payload?.holidays || [];
      })
      .addCase(getHolidaysForRange.rejected, (state) => {
        state.rangeHolidays = [];
      })
      // Delete Holiday
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
        // Remove holiday from list
        if (state.holidayCalendarItem?.holidays) {
          state.holidayCalendarItem.holidays = state.holidayCalendarItem.holidays.filter(
            (h) => h._id !== action.payload.id
          );
        }
      })
      .addCase(deleteHoliday.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
      });
  },
});

export const { cleanHolidayCalendarMessage, cleanHolidayCalendarState } =
  appHolidayCalendarSlice.actions;

export default appHolidayCalendarSlice.reducer;
