// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initPfiItem } from "@constant/reduxConstant";

// ─── List ──────────────────────────────────────────────────────────────

async function getPfiListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.pfis.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getPfiList = createAsyncThunk(
  "appPfi/getPfiList",
  async (params) => {
    try {
      const response = await getPfiListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          pfiItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "PFI_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        pfiItems: [],
        pagination: null,
        actionFlag: "PFI_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        pfiItems: [],
        pagination: null,
        actionFlag: "PFI_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ─── Get one ──────────────────────────────────────────────────────────

async function getPfiRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.pfis.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getPfi = createAsyncThunk("appPfi/getPfi", async (id) => {
  try {
    const response = await getPfiRequest(id);
    if (response?.statusCode && response.data) {
      return {
        id,
        pfiItem: response.data,
        actionFlag: "PFI_SCS",
        success: "",
        error: "",
      };
    }
    return {
      id,
      pfiItem: null,
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return {
      id,
      pfiItem: null,
      actionFlag: "",
      success: "",
      error: error.message || error,
    };
  }
});

// ─── Create ───────────────────────────────────────────────────────────

async function createPfiRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.pfis.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createPfi = createAsyncThunk(
  "appPfi/createPfi",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createPfiRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          pfiItem: response.data || null,
          actionFlag: "PFI_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create PFI";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Create from Quotation ────────────────────────────────────────────

async function createPfiFromQuotationRequest(quotationId) {
  return instance
    .post(`${API_ENDPOINTS.pfis.fromQuotation}/${quotationId}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createPfiFromQuotation = createAsyncThunk(
  "appPfi/createPfiFromQuotation",
  async (quotationId, { rejectWithValue }) => {
    try {
      const response = await createPfiFromQuotationRequest(quotationId);
      if (response?.statusCode && response?.data) {
        return {
          pfiItem: response.data || null,
          actionFlag: "PFI_FROM_QT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create PFI from quotation";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Update ───────────────────────────────────────────────────────────

async function updatePfiRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.pfis.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updatePfi = createAsyncThunk(
  "appPfi/updatePfi",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updatePfiRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          pfiItem: response.data || null,
          actionFlag: "PFI_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update PFI";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Delete ───────────────────────────────────────────────────────────

async function deletePfiRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.pfis.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deletePfi = createAsyncThunk("appPfi/deletePfi", async (id) => {
  try {
    const response = await deletePfiRequest(id);
    if (response?.statusCode === 200) {
      return {
        id,
        actionFlag: "PFI_DLT",
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

// ─── Public share link ────────────────────────────────────────────────

// View-only fetch by public token - no auth. Powers the /p/:token page.
export const getPublicPfi = createAsyncThunk(
  "appPfi/getPublicPfi",
  async (token) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.pfis.public}/${token}`)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response.data) {
        return { publicItem: response.data, error: "" };
      }
      return {
        publicItem: null,
        error:
          response?.response?.data?.message ||
          response?.message ||
          "PFI not found",
      };
    } catch (error) {
      return { publicItem: null, error: error.message || error };
    }
  }
);

// Admin "preview as client" - same sanitized shape as the public route,
// works in any status. Feeds the same renderer as /p/:token.
export const getPfiPreview = createAsyncThunk(
  "appPfi/getPfiPreview",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.pfis.publicPreview}/${id}`)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response.data) {
        return { publicItem: response.data, error: "" };
      }
      return {
        publicItem: null,
        error:
          response?.response?.data?.message ||
          response?.message ||
          "PFI not found",
      };
    } catch (error) {
      return { publicItem: null, error: error.message || error };
    }
  }
);

// Admin: publish / rotate / unpublish - all return the updated PFI.
const publishLikePfiThunk = (name, endpointKey, flag) =>
  createAsyncThunk(`appPfi/${name}`, async (id) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.pfis[endpointKey]}/${id}`)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response.data) {
        return {
          pfiItem: response.data,
          actionFlag: flag,
          success: response?.message || "",
          error: "",
        };
      }
      return {
        pfiItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response?.message,
      };
    } catch (error) {
      return {
        pfiItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  });

export const publishPfi = publishLikePfiThunk(
  "publishPfi",
  "publish",
  "PFI_PUBLISHED"
);
export const rotatePfiToken = publishLikePfiThunk(
  "rotatePfiToken",
  "rotateToken",
  "PFI_TOKEN_ROTATED"
);
export const unpublishPfi = publishLikePfiThunk(
  "unpublishPfi",
  "unpublish",
  "PFI_UNPUBLISHED"
);

// ─── Slice ────────────────────────────────────────────────────────────

export const appPfiSlice = createSlice({
  name: "appPfi",
  initialState: {
    pfiItems: [],
    pagination: null,
    pfiItem: initPfiItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanPfiMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanPfiState: (state) => {
      state.pfiItem = initPfiItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPfiList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getPfiList.fulfilled, (state, action) => {
        state.pfiItems = action.payload?.pfiItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPfiList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getPfi.pending, (state) => {
        state.pfiItem = initPfiItem;
        state.loading = false;
      })
      .addCase(getPfi.fulfilled, (state, action) => {
        state.pfiItem = action.payload?.pfiItem || initPfiItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPfi.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createPfi.pending, (state) => {
        state.loading = false;
      })
      .addCase(createPfi.fulfilled, (state, action) => {
        state.pfiItem = action.payload?.pfiItem || initPfiItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createPfi.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(createPfiFromQuotation.pending, (state) => {
        state.loading = false;
      })
      .addCase(createPfiFromQuotation.fulfilled, (state, action) => {
        state.pfiItem = action.payload?.pfiItem || initPfiItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createPfiFromQuotation.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updatePfi.pending, (state) => {
        state.loading = false;
      })
      .addCase(updatePfi.fulfilled, (state, action) => {
        state.pfiItem = action.payload?.pfiItem || initPfiItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updatePfi.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deletePfi.pending, (state) => {
        state.loading = false;
      })
      .addCase(deletePfi.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deletePfi.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getPublicPfi.pending, (state) => {
        state.loading = false;
        state.publicItem = null;
        state.error = "";
      })
      .addCase(getPublicPfi.fulfilled, (state, action) => {
        state.loading = true;
        state.publicItem = action.payload?.publicItem || null;
        state.error = action.payload?.error || "";
      })
      .addCase(getPublicPfi.rejected, (state) => {
        state.loading = true;
        state.publicItem = null;
      })
      .addCase(getPfiPreview.pending, (state) => {
        state.loading = false;
        state.publicItem = null;
        state.error = "";
      })
      .addCase(getPfiPreview.fulfilled, (state, action) => {
        state.loading = true;
        state.publicItem = action.payload?.publicItem || null;
        state.error = action.payload?.error || "";
      })
      .addCase(getPfiPreview.rejected, (state) => {
        state.loading = true;
        state.publicItem = null;
      });
    // publish / rotate / unpublish share one fulfilled handler.
    [publishPfi, rotatePfiToken, unpublishPfi].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = false;
          state.actionFlag = "";
          state.success = "";
          state.error = "";
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = true;
          if (action.payload?.pfiItem) {
            state.pfiItem = action.payload.pfiItem;
          }
          state.actionFlag = action.payload?.actionFlag || "";
          state.success = action.payload?.success || "";
          state.error = action.payload?.error || "";
        })
        .addCase(thunk.rejected, (state) => {
          state.loading = true;
        });
    });
  },
});

export const { cleanPfiMessage, cleanPfiState } = appPfiSlice.actions;

export default appPfiSlice.reducer;
