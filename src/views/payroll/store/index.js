// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ============ PAY SCHEDULES ============

export const getPayScheduleList = createAsyncThunk(
  "appPayroll/getPayScheduleList",
  async () => {
    try {
      const res = await instance.get(API_ENDPOINTS.payroll.schedules);
      return {
        scheduleItems: res.data?.data || [],
        actionFlag: "PS_LST_SCS",
        success: "",
        error: "",
      };
    } catch (error) {
      return {
        scheduleItems: [],
        actionFlag: "PS_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

export const createPaySchedule = createAsyncThunk(
  "appPayroll/createPaySchedule",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.payroll.schedules, payload);
      if (res.data?.statusCode && res.data?.data) {
        return {
          scheduleItem: res.data.data,
          actionFlag: "PS_CRT_SCS",
          success: res.data?.message || "Pay schedule created",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to create pay schedule");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updatePaySchedule = createAsyncThunk(
  "appPayroll/updatePaySchedule",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await instance.put(`${API_ENDPOINTS.payroll.schedules}/${id}`, data);
      if (res.data?.statusCode && res.data?.data) {
        return {
          scheduleItem: res.data.data,
          actionFlag: "PS_UPD_SCS",
          success: res.data?.message || "Pay schedule updated",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to update pay schedule");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deletePaySchedule = createAsyncThunk(
  "appPayroll/deletePaySchedule",
  async (id) => {
    try {
      const res = await instance.delete(`${API_ENDPOINTS.payroll.schedules}/${id}`);
      return {
        id,
        actionFlag: res.data?.statusCode === 200 ? "PS_DEL_SCS" : "",
        success: res.data?.message || "",
        error: "",
      };
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error?.response?.data?.message || error.message };
    }
  }
);

// ============ PAY ELEMENTS ============

export const getPayElementList = createAsyncThunk(
  "appPayroll/getPayElementList",
  async () => {
    try {
      const res = await instance.get(API_ENDPOINTS.payroll.elements);
      return {
        elementItems: res.data?.data || [],
        actionFlag: "PE_LST_SCS",
        success: "",
        error: "",
      };
    } catch (error) {
      return {
        elementItems: [],
        actionFlag: "PE_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

export const createPayElement = createAsyncThunk(
  "appPayroll/createPayElement",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.payroll.elements, payload);
      if (res.data?.statusCode && res.data?.data) {
        return {
          elementItem: res.data.data,
          actionFlag: "PE_CRT_SCS",
          success: res.data?.message || "Pay element created",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to create pay element");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updatePayElement = createAsyncThunk(
  "appPayroll/updatePayElement",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await instance.put(`${API_ENDPOINTS.payroll.elements}/${id}`, data);
      if (res.data?.statusCode && res.data?.data) {
        return {
          elementItem: res.data.data,
          actionFlag: "PE_UPD_SCS",
          success: res.data?.message || "Pay element updated",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to update pay element");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deletePayElement = createAsyncThunk(
  "appPayroll/deletePayElement",
  async (id) => {
    try {
      const res = await instance.delete(`${API_ENDPOINTS.payroll.elements}/${id}`);
      return {
        id,
        actionFlag: res.data?.statusCode === 200 ? "PE_DEL_SCS" : "",
        success: res.data?.message || "",
        error: "",
      };
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error?.response?.data?.message || error.message };
    }
  }
);

// ============ PAY RUNS ============

export const getPayRunList = createAsyncThunk(
  "appPayroll/getPayRunList",
  async (params = {}) => {
    try {
      const res = await instance.get(API_ENDPOINTS.payroll.runs, { params });
      return {
        runItems: res.data?.data || [],
        pagination: res.data?._pagination || { total: 0, totalPage: 0 },
        actionFlag: "PR_LST_SCS",
        success: "",
        error: "",
      };
    } catch (error) {
      return {
        runItems: [],
        pagination: { total: 0, totalPage: 0 },
        actionFlag: "PR_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

export const getPayRun = createAsyncThunk(
  "appPayroll/getPayRun",
  async (id) => {
    try {
      const res = await instance.get(`${API_ENDPOINTS.payroll.runs}/${id}`);
      return {
        runItem: res.data?.data || null,
        actionFlag: "PR_GET_SCS",
        success: "",
        error: "",
      };
    } catch (error) {
      return {
        runItem: null,
        actionFlag: "PR_GET_ERR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

export const createPayRun = createAsyncThunk(
  "appPayroll/createPayRun",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.payroll.runs, payload);
      if (res.data?.statusCode && res.data?.data) {
        return {
          runItem: res.data.data,
          actionFlag: "PR_CRT_SCS",
          success: res.data?.message || "Pay run created",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to create pay run");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const calculatePayRun = createAsyncThunk(
  "appPayroll/calculatePayRun",
  async (id, { rejectWithValue }) => {
    try {
      const res = await instance.post(`${API_ENDPOINTS.payroll.runs}/${id}/calculate`);
      if (res.data?.statusCode) {
        return {
          actionFlag: "PR_CALC_SCS",
          success: res.data?.message || "Pay run calculated",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to calculate pay run");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const approvePayRun = createAsyncThunk(
  "appPayroll/approvePayRun",
  async (id, { rejectWithValue }) => {
    try {
      const res = await instance.post(`${API_ENDPOINTS.payroll.runs}/${id}/approve`);
      if (res.data?.statusCode) {
        return {
          actionFlag: "PR_APR_SCS",
          success: res.data?.message || "Pay run approved",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to approve pay run");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const markPayRunPaid = createAsyncThunk(
  "appPayroll/markPayRunPaid",
  async (id, { rejectWithValue }) => {
    try {
      const res = await instance.post(`${API_ENDPOINTS.payroll.runs}/${id}/mark-paid`);
      if (res.data?.statusCode) {
        return {
          actionFlag: "PR_PAID_SCS",
          success: res.data?.message || "Pay run marked as paid",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to mark as paid");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const revertPayRun = createAsyncThunk(
  "appPayroll/revertPayRun",
  async (id, { rejectWithValue }) => {
    try {
      const res = await instance.post(`${API_ENDPOINTS.payroll.runs}/${id}/revert`);
      if (res.data?.statusCode) {
        return {
          actionFlag: "PR_REV_SCS",
          success: res.data?.message || "Pay run reverted",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to revert");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deletePayRun = createAsyncThunk(
  "appPayroll/deletePayRun",
  async (id) => {
    try {
      const res = await instance.delete(`${API_ENDPOINTS.payroll.runs}/${id}`);
      return {
        id,
        actionFlag: res.data?.statusCode === 200 ? "PR_DEL_SCS" : "",
        success: res.data?.message || "",
        error: "",
      };
    } catch (error) {
      return { id, actionFlag: "", success: "", error: error?.response?.data?.message || error.message };
    }
  }
);

// ============ PAYSLIPS ============

export const getPayslip = createAsyncThunk(
  "appPayroll/getPayslip",
  async (id) => {
    try {
      const res = await instance.get(`${API_ENDPOINTS.payroll.payslip}/${id}`);
      return {
        payslipItem: res.data?.data || null,
        actionFlag: "SLIP_GET_SCS",
        success: "",
        error: "",
      };
    } catch (error) {
      return {
        payslipItem: null,
        actionFlag: "SLIP_GET_ERR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

export const addPayslipLineItem = createAsyncThunk(
  "appPayroll/addPayslipLineItem",
  async ({ payslipId, data }, { rejectWithValue }) => {
    try {
      const res = await instance.post(`${API_ENDPOINTS.payroll.payslip}/${payslipId}/line-items`, data);
      if (res.data?.statusCode) {
        return {
          actionFlag: "SLIP_ADD_LI_SCS",
          success: res.data?.message || "Line item added",
          error: "",
        };
      }
      return rejectWithValue(res.data?.message || "Failed to add line item");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deletePayslipLineItem = createAsyncThunk(
  "appPayroll/deletePayslipLineItem",
  async (itemId) => {
    try {
      const res = await instance.delete(`${API_ENDPOINTS.payroll.payslipLineItem}/${itemId}`);
      return {
        actionFlag: res.data?.statusCode === 200 ? "SLIP_DEL_LI_SCS" : "",
        success: res.data?.message || "",
        error: "",
      };
    } catch (error) {
      return { actionFlag: "", success: "", error: error?.response?.data?.message || error.message };
    }
  }
);

// ============ MY PAYSLIPS (employee self-service) ============

export const getMyPayslips = createAsyncThunk(
  "appPayroll/getMyPayslips",
  async () => {
    try {
      const res = await instance.get(API_ENDPOINTS.payroll.myPayslips);
      return {
        myPayslipItems: res.data?.data || [],
        actionFlag: "MY_LST_SCS",
        success: "",
        error: "",
      };
    } catch (error) {
      return {
        myPayslipItems: [],
        actionFlag: "MY_LST_ERR",
        success: "",
        error: error?.response?.data?.message || error.message,
      };
    }
  }
);

// ============ SLICE ============

export const appPayrollSlice = createSlice({
  name: "appPayroll",
  initialState: {
    scheduleItems: [],
    elementItems: [],
    runItems: [],
    runItem: null,
    pagination: { total: 0, totalPage: 0 },
    payslipItem: null,
    myPayslipItems: [],
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanPayrollMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanPayrollState: (state) => {
      state.payslipItem = null;
      state.runItem = null;
    },
  },
  extraReducers: (builder) => {
    const setSuccess = (state, action) => {
      state.loading = true;
      state.actionFlag = action.payload?.actionFlag || "";
      state.success = action.payload?.success || "";
      state.error = action.payload?.error || "";
    };
    const setRejected = (state, action) => {
      state.loading = true;
      state.actionFlag = "";
      state.error = action.payload || action.error?.message || "Failed";
    };
    const setPending = (state) => {
      state.loading = false;
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    };
    builder
      // Schedules
      .addCase(getPayScheduleList.pending, setPending)
      .addCase(getPayScheduleList.fulfilled, (state, action) => {
        state.scheduleItems = action.payload.scheduleItems || [];
        setSuccess(state, action);
      })
      .addCase(getPayScheduleList.rejected, setRejected)
      .addCase(createPaySchedule.fulfilled, setSuccess)
      .addCase(createPaySchedule.rejected, setRejected)
      .addCase(updatePaySchedule.fulfilled, setSuccess)
      .addCase(updatePaySchedule.rejected, setRejected)
      .addCase(deletePaySchedule.fulfilled, setSuccess)
      // Elements
      .addCase(getPayElementList.pending, setPending)
      .addCase(getPayElementList.fulfilled, (state, action) => {
        state.elementItems = action.payload.elementItems || [];
        setSuccess(state, action);
      })
      .addCase(getPayElementList.rejected, setRejected)
      .addCase(createPayElement.fulfilled, setSuccess)
      .addCase(createPayElement.rejected, setRejected)
      .addCase(updatePayElement.fulfilled, setSuccess)
      .addCase(updatePayElement.rejected, setRejected)
      .addCase(deletePayElement.fulfilled, setSuccess)
      // Runs
      .addCase(getPayRunList.pending, setPending)
      .addCase(getPayRunList.fulfilled, (state, action) => {
        state.runItems = action.payload.runItems || [];
        state.pagination = action.payload.pagination || { total: 0, totalPage: 0 };
        setSuccess(state, action);
      })
      .addCase(getPayRunList.rejected, setRejected)
      .addCase(getPayRun.pending, setPending)
      .addCase(getPayRun.fulfilled, (state, action) => {
        state.runItem = action.payload.runItem || null;
        setSuccess(state, action);
      })
      .addCase(getPayRun.rejected, setRejected)
      .addCase(createPayRun.fulfilled, setSuccess)
      .addCase(createPayRun.rejected, setRejected)
      .addCase(calculatePayRun.fulfilled, setSuccess)
      .addCase(calculatePayRun.rejected, setRejected)
      .addCase(approvePayRun.fulfilled, setSuccess)
      .addCase(approvePayRun.rejected, setRejected)
      .addCase(markPayRunPaid.fulfilled, setSuccess)
      .addCase(markPayRunPaid.rejected, setRejected)
      .addCase(revertPayRun.fulfilled, setSuccess)
      .addCase(revertPayRun.rejected, setRejected)
      .addCase(deletePayRun.fulfilled, setSuccess)
      // Payslips
      .addCase(getPayslip.pending, (state) => {
        state.payslipItem = null;
        state.loading = false;
      })
      .addCase(getPayslip.fulfilled, (state, action) => {
        state.payslipItem = action.payload.payslipItem || null;
        setSuccess(state, action);
      })
      .addCase(addPayslipLineItem.fulfilled, setSuccess)
      .addCase(addPayslipLineItem.rejected, setRejected)
      .addCase(deletePayslipLineItem.fulfilled, setSuccess)
      // My payslips
      .addCase(getMyPayslips.pending, setPending)
      .addCase(getMyPayslips.fulfilled, (state, action) => {
        state.myPayslipItems = action.payload.myPayslipItems || [];
        setSuccess(state, action);
      })
      .addCase(getMyPayslips.rejected, setRejected);
  },
});

export const { cleanPayrollMessage, cleanPayrollState } = appPayrollSlice.actions;
export default appPayrollSlice.reducer;
