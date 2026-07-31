// ** Redux
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios
import instance from "@src/utility/AxiosConfig";

// ** Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constants
import { initUomItem } from "@constant/reduxConstant";

// ─── UOM CRUD ───────────────────────────────────────────────────────────

async function getUomListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.uom.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getUomList = createAsyncThunk(
  "appUom/getUomList",
  async (params) => {
    try {
      const response = await getUomListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          params,
          uomItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "UOM_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        params,
        uomItems: [],
        pagination: null,
        actionFlag: "UOM_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        params,
        uomItems: [],
        pagination: null,
        actionFlag: "UOM_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

/**
 * Active units for every product form and line-item grid in the app.
 * Unpaginated — the whole list is small and needed in one go.
 */
async function getUomDropdownRequest() {
  return instance
    .get(`${API_ENDPOINTS.uom.dropdown}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getUomDropdown = createAsyncThunk(
  "appUom/getUomDropdown",
  async () => {
    try {
      const response = await getUomDropdownRequest();
      if (response?.statusCode && response?.data) {
        return { uomDropdown: response.data };
      }
      return { uomDropdown: [] };
    } catch (error) {
      return { uomDropdown: [] };
    }
  }
);

async function getUomRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.uom.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getUom = createAsyncThunk("appUom/getUom", async (id) => {
  try {
    const response = await getUomRequest(id);
    if (response?.statusCode && response.data) {
      return {
        id,
        uomItem: response.data,
        actionFlag: "UOM_SCS",
        success: "",
        error: "",
      };
    }
    return {
      id,
      uomItem: null,
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return {
      id,
      uomItem: null,
      actionFlag: "",
      success: "",
      error: error.message || error,
    };
  }
});

async function createUomRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.uom.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createUom = createAsyncThunk(
  "appUom/createUom",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createUomRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          uomItem: response.data || null,
          actionFlag: "UOM_CRTD",
          success: response?.message || "Unit created",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to create unit"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function updateUomRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.uom.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateUom = createAsyncThunk(
  "appUom/updateUom",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateUomRequest(payload);
      if (response?.statusCode && response?.data) {
        return {
          payload,
          uomItem: response.data || null,
          actionFlag: "UOM_UPDT",
          success: response?.message || "Unit updated",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message ||
          response.message ||
          "Failed to update unit"
      );
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || error
      );
    }
  }
);

async function deleteUomRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.uom.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteUom = createAsyncThunk("appUom/deleteUom", async (id) => {
  try {
    const response = await deleteUomRequest(id);
    if (response?.statusCode === 200) {
      return {
        id,
        actionFlag: "UOM_DLT",
        success: response?.message || "Unit deleted",
        error: "",
      };
    }
    return {
      id,
      actionFlag: "",
      success: "",
      // The backend refuses to delete a unit that products still use — surface
      // its counted message rather than a generic failure.
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return { id, actionFlag: "", success: "", error: error.message || error };
  }
});

// Bulk delete — mirrors the shared useBulkDelete contract: resolves to
// { deleted, skipped } so the hook reports deleted-vs-skipped (in-use) counts.
export const deleteManyUom = createAsyncThunk(
  "appUom/deleteManyUom",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.uom.deleteMany, { ids });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || "Delete failed"
      );
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────

export const appUomSlice = createSlice({
  name: "appUom",
  initialState: {
    uomItems: [],
    uomDropdown: [],
    pagination: null,
    uomItem: initUomItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanUomMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanUomState: (state) => {
      state.uomItem = initUomItem;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUomList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getUomList.fulfilled, (state, action) => {
        state.uomItems = action.payload?.uomItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getUomList.rejected, (state) => {
        state.loading = true;
      })
      .addCase(getUomDropdown.fulfilled, (state, action) => {
        state.uomDropdown = action.payload?.uomDropdown || [];
      })
      .addCase(getUom.pending, (state) => {
        state.uomItem = initUomItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getUom.fulfilled, (state, action) => {
        state.uomItem = action.payload?.uomItem || initUomItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getUom.rejected, (state) => {
        state.loading = true;
      })
      .addCase(createUom.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createUom.fulfilled, (state, action) => {
        state.uomItem = action.payload?.uomItem || initUomItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createUom.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(updateUom.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateUom.fulfilled, (state, action) => {
        state.uomItem = action.payload?.uomItem || initUomItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateUom.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload || "";
      })
      .addCase(deleteUom.pending, (state) => {
        state.loading = false;
      })
      .addCase(deleteUom.fulfilled, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteUom.rejected, (state) => {
        state.loading = true;
      });
  },
});

export const { cleanUomMessage, cleanUomState } = appUomSlice.actions;

export default appUomSlice.reducer;
