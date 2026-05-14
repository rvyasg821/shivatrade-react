// Lead Activity (timeline) slice.
// API:
//   GET    /admin/lead/:leadId/activity
//   POST   /admin/lead/:leadId/activity        body: { body }
//   PUT    /admin/lead/:leadId/activity/:id    body: { body }
//   DELETE /admin/lead/:leadId/activity/:id

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const BASE = API_ENDPOINTS.leads.activity; // "/admin/lead"

export const getLeadActivities = createAsyncThunk(
  "leadActivity/list",
  async (leadId) => {
    try {
      const res = await instance
        .get(`${BASE}/${leadId}/activity`)
        .then((r) => r.data)
        .catch((e) => e);
      if (res?.statusCode && Array.isArray(res?.data)) {
        return { items: res.data };
      }
      return { items: [] };
    } catch {
      return { items: [] };
    }
  }
);

export const addLeadNote = createAsyncThunk(
  "leadActivity/add",
  async ({ leadId, body }, { rejectWithValue }) => {
    try {
      const res = await instance
        .post(`${BASE}/${leadId}/activity`, { body })
        .then((r) => r.data)
        .catch((e) => e);
      if (res?.statusCode && res?.data) {
        return {
          item: res.data,
          actionFlag: "LEAD_ACT_CRTD",
          success: res?.message || "",
        };
      }
      return rejectWithValue(
        res?.response?.data?.message || res?.message || "Failed to add note"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || error
      );
    }
  }
);

export const updateLeadNote = createAsyncThunk(
  "leadActivity/update",
  async ({ leadId, activityId, body }, { rejectWithValue }) => {
    try {
      const res = await instance
        .put(`${BASE}/${leadId}/activity/${activityId}`, { body })
        .then((r) => r.data)
        .catch((e) => e);
      if (res?.statusCode && res?.data) {
        return {
          item: res.data,
          actionFlag: "LEAD_ACT_UPDT",
          success: res?.message || "",
        };
      }
      return rejectWithValue(
        res?.response?.data?.message || res?.message || "Failed to edit note"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || error
      );
    }
  }
);

export const deleteLeadNote = createAsyncThunk(
  "leadActivity/delete",
  async ({ leadId, activityId }, { rejectWithValue }) => {
    try {
      const res = await instance
        .delete(`${BASE}/${leadId}/activity/${activityId}`)
        .then((r) => r.data)
        .catch((e) => e);
      if (res?.statusCode === 200 || res?.statusCode === 204) {
        return { activityId, actionFlag: "LEAD_ACT_DLTD" };
      }
      return rejectWithValue(
        res?.response?.data?.message || res?.message || "Failed to delete note"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || error
      );
    }
  }
);

const slice = createSlice({
  name: "leadActivity",
  initialState: {
    items: [],
    loading: false,
    actionFlag: "",
    success: "",
    error: "",
  },
  reducers: {
    cleanLeadActivityMessage: (s) => {
      s.actionFlag = "";
      s.success = "";
      s.error = "";
    },
  },
  extraReducers: (b) => {
    b.addCase(getLeadActivities.pending, (s) => {
      s.loading = true;
    })
      .addCase(getLeadActivities.fulfilled, (s, a) => {
        s.items = a.payload?.items || [];
        s.loading = false;
      })
      .addCase(getLeadActivities.rejected, (s) => {
        s.loading = false;
      })
      .addCase(addLeadNote.fulfilled, (s, a) => {
        // Prepend newest item; BE returns the fully hydrated row.
        if (a.payload?.item) s.items = [a.payload.item, ...s.items];
        s.actionFlag = a.payload?.actionFlag || "";
        s.success = a.payload?.success || "Note added";
      })
      .addCase(addLeadNote.rejected, (s, a) => {
        s.error = a.payload || "Failed to add note";
      })
      .addCase(updateLeadNote.fulfilled, (s, a) => {
        if (a.payload?.item) {
          s.items = s.items.map((it) =>
            it._id === a.payload.item._id ? a.payload.item : it
          );
        }
        s.actionFlag = a.payload?.actionFlag || "";
        s.success = a.payload?.success || "Note updated";
      })
      .addCase(updateLeadNote.rejected, (s, a) => {
        s.error = a.payload || "Failed to edit note";
      })
      .addCase(deleteLeadNote.fulfilled, (s, a) => {
        s.items = s.items.filter((it) => it._id !== a.payload?.activityId);
        s.actionFlag = a.payload?.actionFlag || "";
        s.success = "Note deleted";
      })
      .addCase(deleteLeadNote.rejected, (s, a) => {
        s.error = a.payload || "Failed to delete note";
      });
  },
});

export const { cleanLeadActivityMessage } = slice.actions;
export default slice.reducer;
