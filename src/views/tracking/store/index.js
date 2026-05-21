// Tracking events - redux slice.
// Action-flag prefix: TRACKING_

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ─── List (cross-POV ops feed) ─────────────────────────────────────────

export const getTrackingEventList = createAsyncThunk(
  "appTrackingEvent/getTrackingEventList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.trackingEvents.list, {
        params,
      });
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          params,
          trackingEventItems: body.data,
          pagination: body?._metadata?.pagination || null,
          actionFlag: "TRACKING_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        trackingEventItems: [],
        pagination: null,
        actionFlag: "TRACKING_LST_ERR",
        success: "",
        error: body?.message || "Failed to load tracking events",
      };
    } catch (error) {
      return {
        params,
        trackingEventItems: [],
        pagination: null,
        actionFlag: "TRACKING_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Timeline by POV ───────────────────────────────────────────────────

export const getTrackingEventsByPov = createAsyncThunk(
  "appTrackingEvent/getTrackingEventsByPov",
  async (povId) => {
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.trackingEvents.byPov}/${povId}`
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          povId,
          trackingEventTimeline: body.data,
          actionFlag: "TRACKING_TIMELINE_SCS",
          success: "",
          error: "",
        };
      }
      return {
        povId,
        trackingEventTimeline: [],
        actionFlag: "TRACKING_TIMELINE_ERR",
        success: "",
        error: body?.message || "Failed to load tracking events",
      };
    } catch (error) {
      return {
        povId,
        trackingEventTimeline: [],
        actionFlag: "TRACKING_TIMELINE_ERR",
        success: "",
        error: error?.response?.data?.message || error.message || error,
      };
    }
  }
);

// ─── Create (multipart for optional attachment) ────────────────────────

export const createTrackingEvent = createAsyncThunk(
  "appTrackingEvent/createTrackingEvent",
  async ({ payload, file }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      Object.entries(payload || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") form.append(k, v);
      });
      if (file) form.append("attachment", file);
      const resp = await instance.post(
        API_ENDPOINTS.trackingEvents.create,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          trackingEventItem: body.data,
          actionFlag: "TRACKING_CRTD",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(body?.message || "Failed to add tracking event");
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Retract (Option D — soft-delete with reason) ─────────────────────

export const deleteTrackingEvent = createAsyncThunk(
  "appTrackingEvent/deleteTrackingEvent",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const resp = await instance.delete(
        `${API_ENDPOINTS.trackingEvents.delete}/${id}`,
        { data: { reason } }
      );
      const body = resp?.data;
      if (body?.statusCode && body?.data) {
        return {
          trackingEventItem: body.data,
          actionFlag: "TRACKING_DLT",
          success: body?.message || "",
          error: "",
        };
      }
      return rejectWithValue(
        body?.message || "Failed to retract tracking event"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────

export const appTrackingEventSlice = createSlice({
  name: "appTrackingEvent",
  initialState: {
    trackingEventItems: [],
    trackingEventTimeline: [],
    pagination: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanTrackingEventMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanTrackingEventState: (state) => {
      state.trackingEventTimeline = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getTrackingEventList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getTrackingEventList.fulfilled, (state, action) => {
        state.trackingEventItems = action.payload?.trackingEventItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getTrackingEventList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getTrackingEventsByPov.pending, (state) => {
        state.loading = false;
      })
      .addCase(getTrackingEventsByPov.fulfilled, (state, action) => {
        state.trackingEventTimeline =
          action.payload?.trackingEventTimeline || [];
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getTrackingEventsByPov.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createTrackingEvent.pending, (state) => {
        state.loading = false;
      })
      .addCase(createTrackingEvent.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(createTrackingEvent.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteTrackingEvent.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteTrackingEvent.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(deleteTrackingEvent.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      });
  },
});

export const { cleanTrackingEventMessage, cleanTrackingEventState } =
  appTrackingEventSlice.actions;

export default appTrackingEventSlice.reducer;
