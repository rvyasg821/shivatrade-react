// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ============ LEAVE TYPES ============

export const getLeaveTypeList = createAsyncThunk("appLeave/getLeaveTypeList", async () => {
  try {
    const response = await instance.get(API_ENDPOINTS.leave.typeList).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { leaveTypeItems: response.data, actionFlag: "LT_LST_SCS", success: "", error: "" };
    }
    return { leaveTypeItems: [], actionFlag: "LT_LST_ERR", success: "", error: response?.message };
  } catch (error) {
    return { leaveTypeItems: [], actionFlag: "LT_LST_ERR", success: "", error: error.message };
  }
});

export const createLeaveType = createAsyncThunk("appLeave/createLeaveType", async (payload, { rejectWithValue }) => {
  try {
    const response = await instance.post(API_ENDPOINTS.leave.typeCreate, payload).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { leaveTypeItem: response.data, actionFlag: "LT_CRT_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const updateLeaveType = createAsyncThunk("appLeave/updateLeaveType", async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await instance.put(`${API_ENDPOINTS.leave.typeUpdate}/${id}`, data).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { leaveTypeItem: response.data, actionFlag: "LT_UPD_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const deleteLeaveType = createAsyncThunk("appLeave/deleteLeaveType", async (id, { rejectWithValue }) => {
  try {
    const response = await instance.delete(`${API_ENDPOINTS.leave.typeDelete}/${id}`).then((r) => r.data);
    if (response?.statusCode) {
      return { id, actionFlag: "LT_DEL_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

// ============ POLICY ============

export const getLeavePolicy = createAsyncThunk("appLeave/getLeavePolicy", async () => {
  try {
    const response = await instance.get(API_ENDPOINTS.leave.policy).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { leavePolicy: response.data, actionFlag: "LP_GET_SCS", success: "", error: "" };
    }
    return { leavePolicy: null, actionFlag: "LP_GET_ERR", success: "", error: response?.message };
  } catch (error) {
    return { leavePolicy: null, actionFlag: "LP_GET_ERR", success: "", error: error.message };
  }
});

export const updateLeavePolicy = createAsyncThunk("appLeave/updateLeavePolicy", async (data, { rejectWithValue }) => {
  try {
    const response = await instance.put(API_ENDPOINTS.leave.policy, data).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { leavePolicy: response.data, actionFlag: "LP_UPD_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

// ============ ENTITLEMENTS ============

export const getUserEntitlements = createAsyncThunk("appLeave/getUserEntitlements", async ({ userId, year }) => {
  try {
    const response = await instance
      .get(`${API_ENDPOINTS.leave.entitlementUser}/${userId}`, { params: { year } })
      .then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { entitlementItems: response.data, actionFlag: "ENT_LST_SCS", success: "", error: "" };
    }
    return { entitlementItems: [], actionFlag: "ENT_LST_ERR", success: "", error: response?.message };
  } catch (error) {
    return { entitlementItems: [], actionFlag: "ENT_LST_ERR", success: "", error: error.message };
  }
});

export const updateEntitlement = createAsyncThunk("appLeave/updateEntitlement", async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await instance.put(`${API_ENDPOINTS.leave.entitlementUpdate}/${id}`, data).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { entitlementItem: response.data, actionFlag: "ENT_UPD_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

// ============ LEAVE REQUESTS (ADMIN) ============

export const getLeaveRequestList = createAsyncThunk("appLeave/getLeaveRequestList", async (params) => {
  try {
    const response = await instance.get(API_ENDPOINTS.leave.requestList, { params }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return {
        requestItems: response.data,
        requestTotal: response._metadata?.total || 0,
        actionFlag: "LR_LST_SCS",
        success: "",
        error: "",
      };
    }
    return { requestItems: [], requestTotal: 0, actionFlag: "LR_LST_ERR", success: "", error: response?.message };
  } catch (error) {
    return { requestItems: [], requestTotal: 0, actionFlag: "LR_LST_ERR", success: "", error: error.message };
  }
});

export const approveLeaveRequest = createAsyncThunk("appLeave/approveLeaveRequest", async (id, { rejectWithValue }) => {
  try {
    const response = await instance.post(`${API_ENDPOINTS.leave.requestApprove}/${id}`).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { requestItem: response.data, actionFlag: "LR_APV_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const rejectLeaveRequest = createAsyncThunk("appLeave/rejectLeaveRequest", async ({ id, reason }, { rejectWithValue }) => {
  try {
    const response = await instance.post(`${API_ENDPOINTS.leave.requestReject}/${id}`, { reason }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { requestItem: response.data, actionFlag: "LR_REJ_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const changeLeaveStatus = createAsyncThunk("appLeave/changeLeaveStatus", async ({ id, status, reason }, { rejectWithValue }) => {
  try {
    const response = await instance.post(`${API_ENDPOINTS.leave.requestChangeStatus}/${id}`, { status, reason }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { requestItem: response.data, actionFlag: "LR_STATUS_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const deleteLeaveRequest = createAsyncThunk("appLeave/deleteLeaveRequest", async (id, { rejectWithValue }) => {
  try {
    const response = await instance.delete(`${API_ENDPOINTS.leave.requestDelete}/${id}`).then((r) => r.data);
    if (response?.statusCode === 200) {
      return { id, actionFlag: "LR_DEL_SCS", success: response.message || "Deleted", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

// ============ EMPLOYEE SELF-SERVICE ============

export const getMyLeaveBalance = createAsyncThunk("appLeave/getMyLeaveBalance", async (year) => {
  try {
    const response = await instance.get(API_ENDPOINTS.leave.employeeBalance, { params: { year } }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { myBalance: response.data, actionFlag: "MY_BAL_SCS", success: "", error: "" };
    }
    return { myBalance: [], actionFlag: "MY_BAL_ERR", success: "", error: response?.message };
  } catch (error) {
    return { myBalance: [], actionFlag: "MY_BAL_ERR", success: "", error: error.message };
  }
});

export const getMyLeaveRequests = createAsyncThunk("appLeave/getMyLeaveRequests", async (year) => {
  try {
    const response = await instance.get(API_ENDPOINTS.leave.employeeMyRequests, { params: { year } }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { myRequests: response.data, actionFlag: "MY_REQ_SCS", success: "", error: "" };
    }
    return { myRequests: [], actionFlag: "MY_REQ_ERR", success: "", error: response?.message };
  } catch (error) {
    return { myRequests: [], actionFlag: "MY_REQ_ERR", success: "", error: error.message };
  }
});

export const submitLeaveRequest = createAsyncThunk("appLeave/submitLeaveRequest", async (payload, { rejectWithValue }) => {
  try {
    const response = await instance.post(API_ENDPOINTS.leave.employeeRequest, payload).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { requestItem: response.data, actionFlag: "MY_REQ_CRT_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const adminCreateLeaveRequest = createAsyncThunk("appLeave/adminCreateLeaveRequest", async (payload, { rejectWithValue }) => {
  try {
    const response = await instance.post(API_ENDPOINTS.leave.requestCreate, payload).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { requestItem: response.data, actionFlag: "ADMIN_LR_CRT_SCS", success: response.message || "Leave request created", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const cancelLeaveRequest = createAsyncThunk("appLeave/cancelLeaveRequest", async (id, { rejectWithValue }) => {
  try {
    const response = await instance.post(`${API_ENDPOINTS.leave.employeeCancel}/${id}`).then((r) => r.data);
    if (response?.statusCode) {
      return { id, actionFlag: "MY_REQ_CAN_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const getLeaveConflicts = createAsyncThunk("appLeave/getLeaveConflicts", async (id) => {
  try {
    const response = await instance.get(`${API_ENDPOINTS.leave.requestConflicts}/${id}/conflicts`).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { conflictData: response.data, actionFlag: "LR_CONFLICT_SCS", success: "", error: "" };
    }
    return { conflictData: null, actionFlag: "LR_CONFLICT_ERR", success: "", error: response?.message };
  } catch (error) {
    return { conflictData: null, actionFlag: "LR_CONFLICT_ERR", success: "", error: error.message };
  }
});

export const calculateLeaveDays = createAsyncThunk("appLeave/calculateLeaveDays", async (params) => {
  try {
    const response = await instance.get(API_ENDPOINTS.leave.employeeCalculateDays, { params }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { calculatedDays: response.data.working_days, actionFlag: "CALC_SCS", success: "", error: "" };
    }
    return { calculatedDays: 0, actionFlag: "CALC_ERR", success: "", error: "" };
  } catch (error) {
    return { calculatedDays: 0, actionFlag: "CALC_ERR", success: "", error: error.message };
  }
});

// ============ SLICE ============

export const appLeaveSlice = createSlice({
  name: "appLeave",
  initialState: {
    leaveTypeItems: [],
    leaveTypeItem: null,
    leavePolicy: null,
    entitlementItems: [],
    requestItems: [],
    requestTotal: 0,
    requestItem: null,
    myBalance: [],
    myRequests: [],
    calculatedDays: 0,
    conflictData: null,
    loading: true,
    actionFlag: "",
    success: "",
    error: "",
  },
  reducers: {
    clearLeaveMessages: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    clearConflictData: (state) => {
      state.conflictData = null;
    },
    clearEntitlementItems: (state) => {
      state.entitlementItems = [];
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = false; state.actionFlag = ""; state.error = ""; };
    const fulfilled = (state, action) => { state.loading = true; Object.assign(state, action.payload); };
    const rejected = (state, action) => {
      state.loading = true;
      state.error = action.payload || action.error?.message || "An error occurred";
      state.actionFlag = "ERROR";
    };

    [
      getLeaveTypeList, createLeaveType, updateLeaveType, deleteLeaveType,
      getLeavePolicy, updateLeavePolicy,
      getUserEntitlements, updateEntitlement,
      getLeaveRequestList, approveLeaveRequest, rejectLeaveRequest,
      getLeaveConflicts,
      getMyLeaveBalance, getMyLeaveRequests, submitLeaveRequest,
      cancelLeaveRequest, calculateLeaveDays, adminCreateLeaveRequest,
      changeLeaveStatus, deleteLeaveRequest,
    ].forEach((thunk) => {
      builder
        .addCase(thunk.pending, pending)
        .addCase(thunk.fulfilled, fulfilled)
        .addCase(thunk.rejected, rejected);
    });
  },
});

export const { clearLeaveMessages, clearConflictData, clearEntitlementItems } = appLeaveSlice.actions;
export default appLeaveSlice.reducer;
