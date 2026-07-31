// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constant
import { initEmployeeItem } from "@constant/reduxConstant";

async function getEmployeeListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.employees.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getEmployeeList = createAsyncThunk(
  "appEmployee/getEmployeeList",
  async (params) => {
    try {
      const response = await getEmployeeListRequest(params);

      if (response?.statusCode && response?.data) {
        return {
          params,
          employeeItems: response.data,
          pagination: response?._metadata?.pagination || null,
          actionFlag: "EMP_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          employeeItems: [],
          pagination: null,
          actionFlag: "EMP_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      console.log("getEmployeeList catch ", error);
      return {
        params,
        employeeItems: [],
        pagination: null,
        actionFlag: "EMP_LST_ERR",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function getEmployeeRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.employees.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getEmployee = createAsyncThunk(
  "appEmployee/getEmployee",
  async (id) => {
    try {
      const response = await getEmployeeRequest(id);

      if (response?.statusCode && response.data) {
        return {
          id,
          employeeItem: response.data,
          actionFlag: "EMP_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          id,
          employeeItem: null,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      console.log("getEmployee catch ", error);
      return {
        id,
        employeeItem: null,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

async function createEmployeeRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.employees.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createEmployee = createAsyncThunk(
  "appEmployee/createEmployee",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createEmployeeRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          employeeItem: response.data || null,
          actionFlag: "EMP_CRTD",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to create employee";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      console.log("createEmployee catch ", error);
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

async function updateEmployeeRequest({ id, data }) {
  return instance
    .put(`${API_ENDPOINTS.employees.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateEmployee = createAsyncThunk(
  "appEmployee/updateEmployee",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateEmployeeRequest(payload);

      if (response?.statusCode && response?.data) {
        return {
          payload,
          employeeItem: response.data || null,
          actionFlag: "EMP_UPDT",
          success: response?.message || "",
          error: "",
        };
      } else {
        const errorMessage =
          response?.response?.data?.message ||
          response.message ||
          "Failed to update employee";
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      console.log("updateEmployee catch ", error);
      const errorMessage =
        error?.response?.data?.message || error.message || error;
      return rejectWithValue(errorMessage);
    }
  }
);

// ** Location Assignment thunks
async function getLocationAssignmentsRequest(employeeId) {
  return instance
    .get(`${API_ENDPOINTS.employees.locationAssignments}/${employeeId}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getLocationAssignments = createAsyncThunk(
  "appEmployee/getLocationAssignments",
  async (employeeId) => {
    try {
      const response = await getLocationAssignmentsRequest(employeeId);
      if (response?.statusCode && response?.data) {
        return {
          locationAssignments: response.data,
          actionFlag: "LOC_ASSIGN_LST",
          error: "",
        };
      }
      return { locationAssignments: [], actionFlag: "", error: response?.message || "" };
    } catch (error) {
      return { locationAssignments: [], actionFlag: "", error: error.message || error };
    }
  }
);

async function addLocationAssignmentRequest(employeeId, data) {
  return instance
    .post(`${API_ENDPOINTS.employees.locationAssignments}/${employeeId}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const addLocationAssignment = createAsyncThunk(
  "appEmployee/addLocationAssignment",
  async ({ employeeId, data }, { rejectWithValue }) => {
    try {
      const response = await addLocationAssignmentRequest(employeeId, data);
      if (response?.statusCode && response?.data) {
        return {
          assignment: response.data,
          actionFlag: "LOC_ASSIGN_ADD",
          success: response?.message || "Location assigned successfully",
          error: "",
        };
      }
      return rejectWithValue(response?.response?.data?.message || response?.message || "Failed to assign location");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

async function removeLocationAssignmentRequest(assignmentId) {
  return instance
    .delete(`${API_ENDPOINTS.employees.locationAssignments}/${assignmentId}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const removeLocationAssignment = createAsyncThunk(
  "appEmployee/removeLocationAssignment",
  async (assignmentId, { rejectWithValue }) => {
    try {
      const response = await removeLocationAssignmentRequest(assignmentId);
      if (response?.statusCode) {
        return {
          assignmentId,
          actionFlag: "LOC_ASSIGN_RMV",
          success: "Location assignment removed",
          error: "",
        };
      }
      return rejectWithValue(response?.response?.data?.message || response?.message || "Failed to remove assignment");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message || error);
    }
  }
);

async function deleteEmployeeRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.employees.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

// Bulk delete — mirrors the shared useBulkDelete contract: resolves to
// { deleted, skipped } so the hook reports deleted-vs-skipped counts.
export const deleteManyEmployees = createAsyncThunk(
  "appEmployee/deleteManyEmployees",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await instance.post(API_ENDPOINTS.employees.deleteMany, {
        ids,
      });
      return res?.data?.data || { deleted: ids, skipped: [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || "Delete failed"
      );
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "appEmployee/deleteEmployee",
  async (id) => {
    try {
      const response = await deleteEmployeeRequest(id);

      if (response?.statusCode === 200) {
        return {
          id,
          actionFlag: "EMP_DLT",
          success: response?.message || "",
          error: "",
        };
      } else {
        return {
          id,
          actionFlag: "",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      console.log("deleteEmployee catch >>> ", error);
      return {
        id,
        actionFlag: "",
        success: "",
        error: error.message || error,
      };
    }
  }
);

export const appEmployeeSlice = createSlice({
  name: "appEmployee",
  initialState: {
    employeeItems: [],
    pagination: null,
    employeeItem: initEmployeeItem,
    locationAssignments: [],
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanEmployeeMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    cleanEmployeeState: (state) => {
      state.employeeItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getEmployeeList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getEmployeeList.fulfilled, (state, action) => {
        state.employeeItems = action.payload?.employeeItems || [];
        state.pagination = action.payload?.pagination || null;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getEmployeeList.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getEmployee.pending, (state) => {
        state.employeeItem = initEmployeeItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getEmployee.fulfilled, (state, action) => {
        state.employeeItem = action.payload?.employeeItem || initEmployeeItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getEmployee.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createEmployee.pending, (state) => {
        state.employeeItem = initEmployeeItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.employeeItem = action.payload?.employeeItem || initEmployeeItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createEmployee.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateEmployee.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.employeeItem = action.payload?.employeeItem || initEmployeeItem;
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag;
        state.success = action.payload?.success;
        state.error = action.payload?.error;
      })
      .addCase(updateEmployee.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteEmployee.pending, (state) => {
        state.employeeItem = initEmployeeItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employeeItem = action.payload?.employeeItem || initEmployeeItem;
        state.loading = true;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteEmployee.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      // Location Assignments — do NOT set actionFlag/success/error
      // to avoid interfering with the main employee form useEffect
      .addCase(getLocationAssignments.fulfilled, (state, action) => {
        state.locationAssignments = action.payload?.locationAssignments || [];
      })
      .addCase(addLocationAssignment.fulfilled, (state, action) => {
        state.locationAssignments = [...state.locationAssignments, action.payload.assignment];
      })
      .addCase(addLocationAssignment.rejected, () => {})
      .addCase(removeLocationAssignment.fulfilled, (state, action) => {
        state.locationAssignments = state.locationAssignments.filter(
          (a) => a._id !== action.payload.assignmentId
        );
      })
      .addCase(removeLocationAssignment.rejected, () => {});
  },
});

export const { cleanEmployeeMessage, cleanEmployeeState } =
  appEmployeeSlice.actions;

export default appEmployeeSlice.reducer;
