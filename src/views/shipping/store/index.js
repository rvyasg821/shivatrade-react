import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { initShippingItem } from "@constant/reduxConstant";

const ok = (b) => b?.statusCode && b?.data;

export const getShippingList = createAsyncThunk(
  "appShipping/getShippingList",
  async (params) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.shipping.list, { params });
      const body = resp?.data;
      if (ok(body)) {
        return {
          params,
          shippingItems: body.data,
          pagination: body?._metadata?.pagination || null,
          actionFlag: "SHP_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        shippingItems: [],
        pagination: null,
        actionFlag: "SHP_LST_ERR",
        error: body?.message || "Failed to load shipping",
      };
    } catch (err) {
      return {
        params,
        shippingItems: [],
        pagination: null,
        actionFlag: "SHP_LST_ERR",
        error: err?.response?.data?.message || err.message,
      };
    }
  }
);

export const getShipping = createAsyncThunk(
  "appShipping/getShipping",
  async (id) => {
    try {
      const resp = await instance.get(`${API_ENDPOINTS.shipping.get}/${id}`);
      const body = resp?.data;
      if (ok(body)) {
        return {
          id,
          shippingItem: body.data,
          actionFlag: "SHP_SCS",
        };
      }
      return { id, shippingItem: null, actionFlag: "SHP_ERR", error: body?.message };
    } catch (err) {
      return {
        id,
        shippingItem: null,
        actionFlag: "SHP_ERR",
        error: err?.response?.data?.message || err.message,
      };
    }
  }
);

export const createShipping = createAsyncThunk(
  "appShipping/createShipping",
  async (data, { rejectWithValue }) => {
    try {
      const resp = await instance.post(API_ENDPOINTS.shipping.create, data);
      const body = resp?.data;
      if (ok(body)) {
        return {
          shippingItem: body.data,
          actionFlag: "SHP_CRE_SCS",
          success: body?.message || "Shipping created",
        };
      }
      return rejectWithValue(body?.message || "Failed to create shipping");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const updateShipping = createAsyncThunk(
  "appShipping/updateShipping",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await instance.put(
        `${API_ENDPOINTS.shipping.update}/${id}`,
        data
      );
      const body = resp?.data;
      if (ok(body)) {
        return {
          shippingItem: body.data,
          actionFlag: "SHP_UPD_SCS",
          success: body?.message || "Shipping updated",
        };
      }
      return rejectWithValue(body?.message || "Failed to update shipping");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const transitionShipping = createAsyncThunk(
  "appShipping/transitionShipping",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.shipping.transition}/${id}`,
        data
      );
      const body = resp?.data;
      if (ok(body)) {
        return {
          shippingItem: body.data,
          actionFlag: "SHP_TRN_SCS",
          success: body?.message || `Transitioned to ${data?.to}`,
        };
      }
      return rejectWithValue(body?.message || "Failed to transition");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const cancelShipping = createAsyncThunk(
  "appShipping/cancelShipping",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.shipping.cancel}/${id}`,
        { reason }
      );
      const body = resp?.data;
      if (ok(body)) {
        return {
          shippingItem: body.data,
          actionFlag: "SHP_CAN_SCS",
          success: body?.message || "Shipping cancelled",
        };
      }
      return rejectWithValue(body?.message || "Failed to cancel shipping");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const deleteShipping = createAsyncThunk(
  "appShipping/deleteShipping",
  async (id, { rejectWithValue }) => {
    try {
      const resp = await instance.delete(
        `${API_ENDPOINTS.shipping.delete}/${id}`
      );
      const body = resp?.data;
      if (body?.statusCode) {
        return {
          id,
          actionFlag: "SHP_DLT_SCS",
          success: body?.message || "Shipping deleted",
        };
      }
      return rejectWithValue(body?.message || "Failed to delete shipping");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const attachShippingInvoices = createAsyncThunk(
  "appShipping/attachInvoices",
  async ({ id, invoice_ids }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.shipping.attachInvoices}/${id}`,
        { invoice_ids }
      );
      const body = resp?.data;
      if (ok(body)) {
        return {
          shippingItem: body.data,
          actionFlag: "SHP_INV_ATT_SCS",
          success: body?.message || "Invoices attached",
        };
      }
      return rejectWithValue(body?.message || "Failed to attach invoices");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const detachShippingInvoice = createAsyncThunk(
  "appShipping/detachInvoice",
  async ({ shippingId, invoiceId }, { rejectWithValue }) => {
    try {
      await instance.delete(
        `${API_ENDPOINTS.shipping.detachInvoice}/${invoiceId}`
      );
      return { shippingId, actionFlag: "SHP_INV_DET_SCS", success: "Detached" };
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const createShippingEvent = createAsyncThunk(
  "appShipping/createShippingEvent",
  async ({ shippingId, data, attachment }, { rejectWithValue }) => {
    try {
      const fd = new FormData();
      Object.entries(data || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") fd.append(k, v);
      });
      if (attachment) fd.append("attachment", attachment);
      const resp = await instance.post(
        `${API_ENDPOINTS.shipping.addEvent}/${shippingId}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const body = resp?.data;
      if (ok(body)) {
        return {
          shippingId,
          event: body.data,
          actionFlag: "SHP_EVT_ADD_SCS",
          success: body?.message || "Event added",
        };
      }
      return rejectWithValue(body?.message || "Failed to add event");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const retractShippingEvent = createAsyncThunk(
  "appShipping/retractShippingEvent",
  async ({ shippingId, eventId, reason }, { rejectWithValue }) => {
    try {
      const resp = await instance.post(
        `${API_ENDPOINTS.shipping.retractEvent}/${eventId}/retract`,
        { reason }
      );
      const body = resp?.data;
      if (body?.statusCode) {
        return {
          shippingId,
          eventId,
          actionFlag: "SHP_EVT_RTR_SCS",
          success: body?.message || "Event retracted",
        };
      }
      return rejectWithValue(body?.message || "Failed to retract event");
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  }
);

export const appShippingSlice = createSlice({
  name: "appShipping",
  initialState: {
    shippingItems: [],
    shippingItem: { ...initShippingItem },
    pagination: null,
    params: null,
    loading: true, // inverted: true=idle, false=fetching
    actionFlag: "",
    success: "",
    error: "",
  },
  reducers: {
    cleanShippingMessage: (state) => {
      state.success = "";
      state.error = "";
      state.actionFlag = "";
    },
    resetShippingItem: (state) => {
      state.shippingItem = { ...initShippingItem };
    },
  },
  extraReducers: (builder) => {
    const setLoadingPending = (state) => {
      state.loading = false;
    };
    const setLoadingDone = (state) => {
      state.loading = true;
    };

    builder
      // List
      .addCase(getShippingList.pending, setLoadingPending)
      .addCase(getShippingList.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.shippingItems = p.shippingItems || [];
        state.pagination = p.pagination;
        state.params = p.params;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.error = p.error;
        state.loading = true;
      })
      .addCase(getShippingList.rejected, (state, action) => {
        state.loading = true;
        state.error = action.error?.message;
      })
      // Get
      .addCase(getShipping.pending, setLoadingPending)
      .addCase(getShipping.fulfilled, (state, action) => {
        const p = action.payload || {};
        if (p.shippingItem) state.shippingItem = p.shippingItem;
        state.actionFlag = p.actionFlag;
        state.error = p.error;
        state.loading = true;
      })
      .addCase(getShipping.rejected, setLoadingDone)
      // Create / Update / Transition / Cancel / Attach
      .addCase(createShipping.pending, setLoadingPending)
      .addCase(createShipping.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.shippingItem = p.shippingItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(createShipping.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_CRE_ERR";
        state.loading = true;
      })
      .addCase(updateShipping.pending, setLoadingPending)
      .addCase(updateShipping.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.shippingItem = p.shippingItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(updateShipping.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_UPD_ERR";
        state.loading = true;
      })
      .addCase(transitionShipping.pending, setLoadingPending)
      .addCase(transitionShipping.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.shippingItem = p.shippingItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(transitionShipping.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_TRN_ERR";
        state.loading = true;
      })
      .addCase(cancelShipping.pending, setLoadingPending)
      .addCase(cancelShipping.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.shippingItem = p.shippingItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
        state.loading = true;
      })
      .addCase(cancelShipping.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_CAN_ERR";
        state.loading = true;
      })
      .addCase(attachShippingInvoices.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.shippingItem = p.shippingItem;
        state.actionFlag = p.actionFlag;
        state.success = p.success;
      })
      .addCase(attachShippingInvoices.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_INV_ATT_ERR";
      })
      .addCase(detachShippingInvoice.fulfilled, (state, action) => {
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
      })
      .addCase(detachShippingInvoice.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_INV_DET_ERR";
      })
      .addCase(deleteShipping.fulfilled, (state, action) => {
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
      })
      .addCase(deleteShipping.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_DLT_ERR";
      })
      .addCase(createShippingEvent.fulfilled, (state, action) => {
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
      })
      .addCase(createShippingEvent.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_EVT_ADD_ERR";
      })
      .addCase(retractShippingEvent.fulfilled, (state, action) => {
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
      })
      .addCase(retractShippingEvent.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
        state.actionFlag = "SHP_EVT_RTR_ERR";
      });
  },
});

export const { cleanShippingMessage, resetShippingItem } =
  appShippingSlice.actions;

export default appShippingSlice.reducer;
