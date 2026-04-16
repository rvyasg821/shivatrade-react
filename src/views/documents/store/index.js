// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ============ DOCUMENT CATEGORIES ============

export const getDocumentCategoryList = createAsyncThunk(
  "appDocument/getDocumentCategoryList",
  async (params) => {
    try {
      const response = await instance
        .get(API_ENDPOINTS.document.categoryList, { params })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return {
          categoryItems: response.data,
          actionFlag: "DC_LST_SCS",
          success: "",
          error: "",
        };
      }
      return { categoryItems: [], actionFlag: "DC_LST_ERR", success: "", error: response?.message };
    } catch (error) {
      return { categoryItems: [], actionFlag: "DC_LST_ERR", success: "", error: error.message };
    }
  }
);

export const createDocumentCategory = createAsyncThunk(
  "appDocument/createDocumentCategory",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.document.categoryCreate, payload)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { categoryItem: response.data, actionFlag: "DC_CRT_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to create category");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updateDocumentCategory = createAsyncThunk(
  "appDocument/updateDocumentCategory",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.document.categoryUpdate}/${id}`, data)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { categoryItem: response.data, actionFlag: "DC_UPD_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update category");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deleteDocumentCategory = createAsyncThunk(
  "appDocument/deleteDocumentCategory",
  async (id) => {
    try {
      const response = await instance
        .delete(`${API_ENDPOINTS.document.categoryDelete}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode === 200 || response?.statusCode === 201) {
        return { id, actionFlag: "DC_DEL_SCS", success: response.message || "", error: "" };
      }
      return { id, actionFlag: "", success: "", error: response?.message };
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error.message };
    }
  }
);

// ============ DOCUMENTS ============

export const getDocumentList = createAsyncThunk(
  "appDocument/getDocumentList",
  async (params) => {
    try {
      const response = await instance
        .get(API_ENDPOINTS.document.list, { params })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return {
          documentItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "DOC_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        documentItems: [],
        pagination: null,
        actionFlag: "DOC_LST_ERR",
        success: "",
        error: response?.message,
      };
    } catch (error) {
      return { documentItems: [], pagination: null, actionFlag: "DOC_LST_ERR", success: "", error: error.message };
    }
  }
);

export const getDocument = createAsyncThunk(
  "appDocument/getDocument",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.document.get}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { documentItem: response.data, actionFlag: "DOC_GET_SCS", success: "", error: "" };
      }
      return { documentItem: null, actionFlag: "", success: "", error: response?.message };
    } catch (error) {
      return { documentItem: null, actionFlag: "", success: "", error: error.message };
    }
  }
);

export const uploadDocument = createAsyncThunk(
  "appDocument/uploadDocument",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.document.upload, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { documentItem: response.data, actionFlag: "DOC_UPL_SCS", success: response.message || "Document uploaded", error: "" };
      }
      return rejectWithValue(response?.message || "Upload failed");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updateDocument = createAsyncThunk(
  "appDocument/updateDocument",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.document.update}/${id}`, data)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { documentItem: response.data, actionFlag: "DOC_UPD_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Update failed");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deleteDocument = createAsyncThunk(
  "appDocument/deleteDocument",
  async (id) => {
    try {
      const response = await instance
        .delete(`${API_ENDPOINTS.document.delete}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode === 200 || response?.statusCode === 201) {
        return { id, actionFlag: "DOC_DEL_SCS", success: response.message || "", error: "" };
      }
      return { id, actionFlag: "", success: "", error: response?.message };
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error.message };
    }
  }
);

export const approveDocument = createAsyncThunk(
  "appDocument/approveDocument",
  async ({ id, approval_note }, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.document.approve}/${id}`, { approval_note })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { documentItem: response.data, actionFlag: "DOC_APR_SCS", success: response.message || "Document approved", error: "" };
      }
      return rejectWithValue(response?.message || "Approval failed");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const rejectDocument = createAsyncThunk(
  "appDocument/rejectDocument",
  async ({ id, approval_note }, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.document.reject}/${id}`, { approval_note })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { documentItem: response.data, actionFlag: "DOC_REJ_SCS", success: response.message || "Document rejected", error: "" };
      }
      return rejectWithValue(response?.message || "Rejection failed");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

// ============ SLICE ============

export const appDocumentSlice = createSlice({
  name: "appDocument",
  initialState: {
    documentItems: [],
    pagination: null,
    documentItem: null,
    categoryItems: [],
    categoryItem: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanDocumentMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanDocumentState: (state) => {
      state.documentItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Category list
      .addCase(getDocumentCategoryList.pending, (state) => {
        state.loading = false;
      })
      .addCase(getDocumentCategoryList.fulfilled, (state, action) => {
        state.categoryItems = action.payload?.categoryItems || [];
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
      })
      .addCase(getDocumentCategoryList.rejected, (state) => {
        state.loading = true;
      })
      // Category create
      .addCase(createDocumentCategory.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.categoryItems = [...state.categoryItems, action.payload.categoryItem];
      })
      .addCase(createDocumentCategory.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "Failed";
      })
      // Category update
      .addCase(updateDocumentCategory.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.categoryItems = state.categoryItems.map((c) =>
          c._id === action.payload.categoryItem._id ? action.payload.categoryItem : c
        );
      })
      .addCase(updateDocumentCategory.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "Failed";
      })
      // Category delete
      .addCase(deleteDocumentCategory.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.categoryItems = state.categoryItems.filter((c) => c._id !== action.payload.id);
      })
      // Document list
      .addCase(getDocumentList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(getDocumentList.fulfilled, (state, action) => {
        state.documentItems = action.payload?.documentItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.error = action.payload.error;
      })
      .addCase(getDocumentList.rejected, (state) => {
        state.loading = true;
      })
      // Document get
      .addCase(getDocument.pending, (state) => {
        state.documentItem = null;
        state.loading = false;
      })
      .addCase(getDocument.fulfilled, (state, action) => {
        state.documentItem = action.payload?.documentItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
      })
      .addCase(getDocument.rejected, (state) => {
        state.loading = true;
      })
      // Upload
      .addCase(uploadDocument.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.documentItem = action.payload?.documentItem || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = "";
        state.error = action.payload || "Upload failed";
      })
      // Update
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.documentItems = state.documentItems.map((d) =>
          d._id === action.payload.documentItem._id ? action.payload.documentItem : d
        );
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "Failed";
      })
      // Approve
      .addCase(approveDocument.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.documentItems = state.documentItems.map((d) =>
          d._id === action.payload.documentItem._id ? { ...d, ...action.payload.documentItem } : d
        );
      })
      .addCase(approveDocument.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "Approval failed";
      })
      // Reject
      .addCase(rejectDocument.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.documentItems = state.documentItems.map((d) =>
          d._id === action.payload.documentItem._id ? { ...d, ...action.payload.documentItem } : d
        );
      })
      .addCase(rejectDocument.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "Rejection failed";
      })
      // Delete
      .addCase(deleteDocument.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteDocument.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanDocumentMessage, cleanDocumentState } = appDocumentSlice.actions;
export default appDocumentSlice.reducer;
