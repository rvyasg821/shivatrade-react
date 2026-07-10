// SaaS tracking store. Read-only, except the manual usage-rollup trigger.
// Every endpoint here is SUPER_ADMIN-gated on the backend.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const unwrap = (resp, fallback) => {
  const body = resp?.data;
  if (body?.statusCode && body?.data !== undefined) return body.data;
  throw new Error(body?.message || fallback);
};

const errText = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const getActivityLog = createAsyncThunk(
  "appTrackingLogs/getActivityLog",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.trackingLogs.activity, {
        params,
      });
      return unwrap(resp, "Failed to load activity log");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load activity log"));
    }
  }
);

export const getApiCalls = createAsyncThunk(
  "appTrackingLogs/getApiCalls",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.trackingLogs.apiCalls, {
        params,
      });
      return unwrap(resp, "Failed to load API calls");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load API calls"));
    }
  }
);

export const getApiCallStats = createAsyncThunk(
  "appTrackingLogs/getApiCallStats",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.trackingLogs.apiCallStats, {
        params,
      });
      return unwrap(resp, "Failed to load stats");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load stats"));
    }
  }
);

export const getUsage = createAsyncThunk(
  "appTrackingLogs/getUsage",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.trackingLogs.usage, {
        params,
      });
      return unwrap(resp, "Failed to load usage");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load usage"));
    }
  }
);

/** Backfill/refresh one day. Idempotent server-side — safe to click twice. */
export const runUsageRollup = createAsyncThunk(
  "appTrackingLogs/runUsageRollup",
  async (day, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        API_ENDPOINTS.trackingLogs.usageRollup,
        {},
        { params: day ? { day } : {} }
      );
      return unwrap(resp, "Rollup failed");
    } catch (error) {
      return rejectWithValue(errText(error, "Rollup failed"));
    }
  }
);

const emptyList = { items: [], total: 0, page: 1, perPage: 25 };

export const appTrackingLogsSlice = createSlice({
  name: "appTrackingLogs",
  initialState: {
    activity: { ...emptyList },
    apiCalls: { ...emptyList },
    apiCallStats: null,
    usage: { days: [], totals: null },
    loadingActivity: false,
    loadingApiCalls: false,
    loadingUsage: false,
    rollingUp: false,
    error: "",
    success: "",
  },
  reducers: {
    cleanTrackingLogsMessage: (state) => {
      state.error = "";
      state.success = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Activity ──
      .addCase(getActivityLog.pending, (state) => {
        state.loadingActivity = true;
      })
      .addCase(getActivityLog.fulfilled, (state, action) => {
        state.loadingActivity = false;
        state.activity = action.payload;
        state.error = "";
      })
      .addCase(getActivityLog.rejected, (state, action) => {
        state.loadingActivity = false;
        state.activity = { ...emptyList };
        state.error = action.payload || "";
      })
      // ── API calls ──
      .addCase(getApiCalls.pending, (state) => {
        state.loadingApiCalls = true;
      })
      .addCase(getApiCalls.fulfilled, (state, action) => {
        state.loadingApiCalls = false;
        state.apiCalls = action.payload;
        state.error = "";
      })
      .addCase(getApiCalls.rejected, (state, action) => {
        state.loadingApiCalls = false;
        state.apiCalls = { ...emptyList };
        state.error = action.payload || "";
      })
      .addCase(getApiCallStats.fulfilled, (state, action) => {
        state.apiCallStats = action.payload;
      })
      .addCase(getApiCallStats.rejected, (state) => {
        state.apiCallStats = null;
      })
      // ── Usage ──
      .addCase(getUsage.pending, (state) => {
        state.loadingUsage = true;
      })
      .addCase(getUsage.fulfilled, (state, action) => {
        state.loadingUsage = false;
        state.usage = action.payload;
        state.error = "";
      })
      .addCase(getUsage.rejected, (state, action) => {
        state.loadingUsage = false;
        state.usage = { days: [], totals: null };
        state.error = action.payload || "";
      })
      // ── Manual rollup ──
      .addCase(runUsageRollup.pending, (state) => {
        state.rollingUp = true;
      })
      .addCase(runUsageRollup.fulfilled, (state, action) => {
        state.rollingUp = false;
        state.success = `Rollup complete — ${action.payload?.companies ?? 0} company row(s).`;
      })
      .addCase(runUsageRollup.rejected, (state, action) => {
        state.rollingUp = false;
        state.error = action.payload || "";
      });
  },
});

export const { cleanTrackingLogsMessage } = appTrackingLogsSlice.actions;
export default appTrackingLogsSlice.reducer;
