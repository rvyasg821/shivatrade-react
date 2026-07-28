import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { initExpenseItem } from "@constant/reduxConstant";

async function getListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.expenses.list}`, { params })
    .then((r) => r.data)
    .catch((e) => e);
}

export const getExpenseList = createAsyncThunk(
  "appExpense/getExpenseList",
  async (params) => {
    try {
      const response = await getListRequest(params);
      if (response?.statusCode && response?.data) {
        return {
          expenseItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "EXP_LST_SCS",
          success: "",
          error: "",
        };
      }
      return {
        expenseItems: [],
        pagination: null,
        actionFlag: "EXP_LST_ERR",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return {
        expenseItems: [],
        pagination: null,
        actionFlag: "EXP_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

export const getExpenseDropdown = createAsyncThunk(
  "appExpense/getExpenseDropdown",
  async () => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.expenses.dropdown}`)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { expenseDropdown: response.data };
      }
      return { expenseDropdown: [] };
    } catch {
      return { expenseDropdown: [] };
    }
  }
);

export const getExpense = createAsyncThunk(
  "appExpense/getExpense",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.expenses.get}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode && response.data) {
        return { expenseItem: response.data, actionFlag: "EXP_SCS", success: "", error: "" };
      }
      return {
        expenseItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      };
    } catch (error) {
      return { expenseItem: null, actionFlag: "", success: "", error: error.message || error };
    }
  }
);

export const createExpense = createAsyncThunk(
  "appExpense/createExpense",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.expenses.create}`, payload)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          expenseItem: response.data,
          actionFlag: "EXP_CRTD",
          success: response?.message || "",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message || response.message || "Failed to create expense"
      );
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

export const updateExpense = createAsyncThunk(
  "appExpense/updateExpense",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.expenses.update}/${id}`, data)
        .then((r) => r.data)
        .catch((e) => e);
      if (response?.statusCode && response?.data) {
        return {
          expenseItem: response.data,
          actionFlag: "EXP_UPDT",
          success: response?.message || "",
          error: "",
        };
      }
      return rejectWithValue(
        response?.response?.data?.message || response.message || "Failed to update expense"
      );
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

export const deleteExpense = createAsyncThunk("appExpense/deleteExpense", async (id) => {
  try {
    const response = await instance
      .delete(`${API_ENDPOINTS.expenses.delete}/${id}`)
      .then((r) => r.data)
      .catch((e) => e);
    if (response?.statusCode === 200) {
      return { actionFlag: "EXP_DLT", success: response?.message || "", error: "" };
    }
    return {
      actionFlag: "",
      success: "",
      error: response?.response?.data?.message || response.message,
    };
  } catch (error) {
    return { actionFlag: "", success: "", error: error.message || error };
  }
});

export const deleteManyExpenses = createAsyncThunk(
  "appExpense/deleteManyExpenses",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.expenses.deleteMany, { ids });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

export const appExpenseSlice = createSlice({
  name: "appExpense",
  initialState: {
    expenseItems: [],
    expenseDropdown: [],
    pagination: null,
    expenseItem: initExpenseItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanExpenseMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanExpenseState: (state) => {
      state.expenseItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getExpenseList.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(getExpenseList.fulfilled, (s, a) => {
        s.expenseItems = a.payload?.expenseItems || [];
        s.pagination = a.payload?.pagination || null;
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(getExpenseList.rejected, (s) => { s.loading = true; })
      .addCase(getExpenseDropdown.fulfilled, (s, a) => { s.expenseDropdown = a.payload?.expenseDropdown || []; })
      .addCase(getExpense.pending, (s) => { s.expenseItem = initExpenseItem; s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(getExpense.fulfilled, (s, a) => {
        s.expenseItem = a.payload?.expenseItem || initExpenseItem;
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(getExpense.rejected, (s) => { s.loading = true; })
      .addCase(createExpense.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(createExpense.fulfilled, (s, a) => {
        s.expenseItem = a.payload?.expenseItem || initExpenseItem;
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(createExpense.rejected, (s, a) => { s.loading = true; s.error = a.payload || ""; })
      .addCase(updateExpense.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(updateExpense.fulfilled, (s, a) => {
        s.expenseItem = a.payload?.expenseItem || initExpenseItem;
        s.loading = true; s.actionFlag = a.payload?.actionFlag;
        s.success = a.payload?.success; s.error = a.payload?.error;
      })
      .addCase(updateExpense.rejected, (s, a) => { s.loading = true; s.error = a.payload || ""; })
      .addCase(deleteExpense.pending, (s) => { s.loading = false; s.actionFlag = ""; s.success = ""; s.error = ""; })
      .addCase(deleteExpense.fulfilled, (s, a) => {
        s.loading = true; s.actionFlag = a.payload.actionFlag;
        s.success = a.payload.success; s.error = a.payload.error;
      })
      .addCase(deleteExpense.rejected, (s) => { s.loading = true; });
  },
});

export const { cleanExpenseMessage, cleanExpenseState } = appExpenseSlice.actions;
export default appExpenseSlice.reducer;
