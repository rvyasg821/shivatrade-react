// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initQuotationItem } from "@constant/reduxConstant";

// ─── List ──────────────────────────────────────────────────────────────

async function getQuotationListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.quotations.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getQuotationList = createAsyncThunk(
  "appQuotation/getQuotationList",
  async (params) => {
    try {
      const response = await getQuotationListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          quotationItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "QT_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        quotationItems: [],
        pagination: null,
        actionFlag: "QT_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        quotationItems: [],
        pagination: null,
        actionFlag: "QT_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ─── Get one ──────────────────────────────────────────────────────────

async function getQuotationRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.quotations.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getQuotation = createAsyncThunk(
  "appQuotation/getQuotation",
  async (id) => {
    try {
      const response = await getQuotationRequest(id);
      if (response?.statusCode && response.data) {
        return {
          id,
          quotationItem: response.data,
          actionFlag: "QT_SCS",
          success: "",
          error: "",
        };
      }
      return {
        id,
        quotationItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        id,
        quotationItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

// ─── Create ───────────────────────────────────────────────────────────

async function createQuotationRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.quotations.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createQuotation = createAsyncThunk(
  "appQuotation/createQuotation",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createQuotationRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          quotationItem: response.data || null,
          actionFlag: "QT_CRTD",
          success: "Quotation created successfully",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to create quotation";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Update ───────────────────────────────────────────────────────────

async function updateQuotationRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.quotations.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateQuotation = createAsyncThunk(
  "appQuotation/updateQuotation",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateQuotationRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          quotationItem: response.data || null,
          actionFlag: "QT_UPDT",
          success: "Quotation updated successfully",
          error: "",
        };
      }
      const errorMessage =
        response?.response?.data?.message ||
        response.message ||
        "Failed to update quotation";
      return rejectWithValue(errorMessage);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Delete ───────────────────────────────────────────────────────────

async function deleteQuotationRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.quotations.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteQuotation = createAsyncThunk(
  "appQuotation/deleteQuotation",
  async (id) => {
    try {
      const response = await deleteQuotationRequest(id);
      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "QT_DLT",
          success: "Quotation deleted successfully",
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
  }
);

// ─── Public share link ────────────────────────────────────────────────

// View-only fetch by public token - no auth. Powers the /q/:token page.
export const getPublicQuotation = createAsyncThunk(
  "appQuotation/getPublicQuotation",
  async (token) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.quotations.public}/${token}`)
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
          "Quotation not found",
      };
    } catch (error) {
      return { publicItem: null, error: error.message || error };
    }
  }
);

// Admin "preview as client" - same sanitized shape as the public route,
// works in any status. Feeds the same renderer as /q/:token.
export const getQuotationPreview = createAsyncThunk(
  "appQuotation/getQuotationPreview",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.quotations.publicPreview}/${id}`)
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
          "Quotation not found",
      };
    } catch (error) {
      return { publicItem: null, error: error.message || error };
    }
  }
);

// Admin: publish / rotate / unpublish - all return the updated quotation.
const PUBLISH_SUCCESS = {
  QT_PUBLISHED: "Quotation published successfully",
  QT_TOKEN_ROTATED: "Public link rotated successfully",
  QT_UNPUBLISHED: "Quotation unpublished successfully",
};

const publishLikeThunk = (name, endpointKey, flag) =>
  createAsyncThunk(`appQuotation/${name}`, async (id) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.quotations[endpointKey]}/${id}`)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response.data) {
        return {
          quotationItem: response.data,
          actionFlag: flag,
          success: PUBLISH_SUCCESS[flag] || "Action completed successfully",
          error: "",
        };
      }
      return {
        quotationItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response?.message,
      };
    } catch (error) {
      return {
        quotationItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  });

export const publishQuotation = publishLikeThunk(
  "publishQuotation",
  "publish",
  "QT_PUBLISHED"
);
export const rotateQuotationToken = publishLikeThunk(
  "rotateQuotationToken",
  "rotateToken",
  "QT_TOKEN_ROTATED"
);
export const unpublishQuotation = publishLikeThunk(
  "unpublishQuotation",
  "unpublish",
  "QT_UNPUBLISHED"
);

// ─── Slice ────────────────────────────────────────────────────────────

export const appQuotationSlice = createSlice({
  name: "appQuotation",
  initialState: {
    quotationItems: [],
    pagination: null,
    quotationItem: initQuotationItem,
    publicItem: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanQuotationMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanQuotationState: (state) => {
      state.quotationItem = initQuotationItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getQuotationList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getQuotationList.fulfilled, (state, action) => {
        state.quotationItems = action.payload?.quotationItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getQuotationList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getQuotation.pending, (state) => {
        state.quotationItem = initQuotationItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getQuotation.fulfilled, (state, action) => {
        state.quotationItem =
          action.payload?.quotationItem || initQuotationItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getQuotation.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createQuotation.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createQuotation.fulfilled, (state, action) => {
        state.quotationItem =
          action.payload?.quotationItem || initQuotationItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createQuotation.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateQuotation.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateQuotation.fulfilled, (state, action) => {
        state.quotationItem =
          action.payload?.quotationItem || initQuotationItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateQuotation.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteQuotation.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteQuotation.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteQuotation.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getPublicQuotation.pending, (state) => {
        state.loading = false;
        state.publicItem = null;
        state.error = "";
      })
      .addCase(getPublicQuotation.fulfilled, (state, action) => {
        state.loading = true;
        state.publicItem = action.payload?.publicItem || null;
        state.error = action.payload?.error || "";
      })
      .addCase(getPublicQuotation.rejected, (state) => {
        state.loading = true;
        state.publicItem = null;
      })
      .addCase(getQuotationPreview.pending, (state) => {
        state.loading = false;
        state.publicItem = null;
        state.error = "";
      })
      .addCase(getQuotationPreview.fulfilled, (state, action) => {
        state.loading = true;
        state.publicItem = action.payload?.publicItem || null;
        state.error = action.payload?.error || "";
      })
      .addCase(getQuotationPreview.rejected, (state) => {
        state.loading = true;
        state.publicItem = null;
      });
    // publish / rotate / unpublish share one fulfilled handler.
    [publishQuotation, rotateQuotationToken, unpublishQuotation].forEach(
      (thunk) => {
        builder
          .addCase(thunk.pending, (state) => {
            state.loading = false;
            state.actionFlag = "";
            state.success = "";
            state.error = "";
          })
          .addCase(thunk.fulfilled, (state, action) => {
            state.loading = true;
            if (action.payload?.quotationItem) {
              state.quotationItem = action.payload.quotationItem;
            }
            state.actionFlag = action.payload?.actionFlag || "";
            state.success = action.payload?.success || "";
            state.error = action.payload?.error || "";
          })
          .addCase(thunk.rejected, (state) => {
            state.loading = true;
          });
      }
    );
  },
});

export const { cleanQuotationMessage, cleanQuotationState } =
  appQuotationSlice.actions;

export default appQuotationSlice.reducer;
