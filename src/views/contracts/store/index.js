// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ============ TEMPLATES ============

export const getContractTemplateList = createAsyncThunk(
  "appContract/getContractTemplateList",
  async (params) => {
    try {
      const response = await instance
        .get(API_ENDPOINTS.contract.templateList, { params })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return {
          templateItems: response.data,
          templateTotal: response._metadata?.total || 0,
          actionFlag: "CT_LST_SCS",
          success: "",
          error: "",
        };
      }
      return { templateItems: [], templateTotal: 0, actionFlag: "CT_LST_ERR", success: "", error: response?.message };
    } catch (error) {
      return { templateItems: [], templateTotal: 0, actionFlag: "CT_LST_ERR", success: "", error: error.message };
    }
  }
);

export const getContractTemplate = createAsyncThunk(
  "appContract/getContractTemplate",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.contract.templateGet}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { templateItem: response.data, actionFlag: "CT_GET_SCS", success: "", error: "" };
      }
      return { templateItem: null, actionFlag: "CT_GET_ERR", success: "", error: response?.message };
    } catch (error) {
      return { templateItem: null, actionFlag: "CT_GET_ERR", success: "", error: error.message };
    }
  }
);

export const createContractTemplate = createAsyncThunk(
  "appContract/createContractTemplate",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.contract.templateCreate, payload)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { templateItem: response.data, actionFlag: "CT_CRT_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to create template");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updateContractTemplate = createAsyncThunk(
  "appContract/updateContractTemplate",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.templateUpdate}/${id}`, data)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { templateItem: response.data, actionFlag: "CT_UPD_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update template");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deleteContractTemplate = createAsyncThunk(
  "appContract/deleteContractTemplate",
  async (id, { rejectWithValue }) => {
    try {
      const response = await instance
        .delete(`${API_ENDPOINTS.contract.templateDelete}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode) {
        return { id, actionFlag: "CT_DEL_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to delete template");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

// ============ SECTIONS ============

export const createContractSection = createAsyncThunk(
  "appContract/createContractSection",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.contract.sectionCreate, payload)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { sectionItem: response.data, actionFlag: "CS_CRT_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to create section");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updateContractSection = createAsyncThunk(
  "appContract/updateContractSection",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.sectionUpdate}/${id}`, data)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { sectionItem: response.data, actionFlag: "CS_UPD_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update section");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deleteContractSection = createAsyncThunk(
  "appContract/deleteContractSection",
  async (id, { rejectWithValue }) => {
    try {
      const response = await instance
        .delete(`${API_ENDPOINTS.contract.sectionDelete}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode) {
        return { id, actionFlag: "CS_DEL_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to delete section");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const reorderContractSections = createAsyncThunk(
  "appContract/reorderContractSections",
  async ({ templateId, orderedIds }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.sectionReorder}?template_id=${templateId}`, { ordered_ids: orderedIds })
        .then((r) => r.data);
      if (response?.statusCode) {
        return { actionFlag: "CS_ORD_SCS", success: "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to reorder sections");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

// ============ FIELDS ============

export const createContractField = createAsyncThunk(
  "appContract/createContractField",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.contract.fieldCreate, payload)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { fieldItem: response.data, actionFlag: "CF_CRT_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to create field");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updateContractField = createAsyncThunk(
  "appContract/updateContractField",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.fieldUpdate}/${id}`, data)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { fieldItem: response.data, actionFlag: "CF_UPD_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update field");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deleteContractField = createAsyncThunk(
  "appContract/deleteContractField",
  async (id, { rejectWithValue }) => {
    try {
      const response = await instance
        .delete(`${API_ENDPOINTS.contract.fieldDelete}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode) {
        return { id, actionFlag: "CF_DEL_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to delete field");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const reorderContractFields = createAsyncThunk(
  "appContract/reorderContractFields",
  async ({ sectionId, orderedIds }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.fieldReorder}?section_id=${sectionId}`, { ordered_ids: orderedIds })
        .then((r) => r.data);
      if (response?.statusCode) {
        return { actionFlag: "CF_ORD_SCS", success: "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to reorder fields");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

// ============ EMPLOYEE CONTRACTS ============

export const issueContract = createAsyncThunk(
  "appContract/issueContract",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(API_ENDPOINTS.contract.issue, payload)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { contractItem: response.data, actionFlag: "EC_ISS_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to issue contract");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const getContractList = createAsyncThunk(
  "appContract/getContractList",
  async (params) => {
    try {
      const response = await instance
        .get(API_ENDPOINTS.contract.list, { params })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return {
          contractItems: response.data,
          contractTotal: response._metadata?.total || 0,
          actionFlag: "EC_LST_SCS",
          success: "",
          error: "",
        };
      }
      return { contractItems: [], contractTotal: 0, actionFlag: "EC_LST_ERR", success: "", error: response?.message };
    } catch (error) {
      return { contractItems: [], contractTotal: 0, actionFlag: "EC_LST_ERR", success: "", error: error.message };
    }
  }
);

export const getContract = createAsyncThunk(
  "appContract/getContract",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.contract.get}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { contractItem: response.data, actionFlag: "EC_GET_SCS", success: "", error: "" };
      }
      return { contractItem: null, actionFlag: "EC_GET_ERR", success: "", error: response?.message };
    } catch (error) {
      return { contractItem: null, actionFlag: "EC_GET_ERR", success: "", error: error.message };
    }
  }
);

// Fetch contract via employee endpoint — succeeds only if current user is the assignee
export const getContractAsEmployee = createAsyncThunk(
  "appContract/getContractAsEmployee",
  async (id) => {
    try {
      const response = await instance
        .get(`${API_ENDPOINTS.contract.employeeGet}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode === 200 && response?.data) {
        return { contractItem: response.data, isContractOwner: true, actionFlag: "EC_EMP_GET_SCS", success: "", error: "" };
      }
      return { contractItem: null, isContractOwner: false, actionFlag: "EC_EMP_GET_ERR", success: "", error: response?.message };
    } catch {
      return { contractItem: null, isContractOwner: false, actionFlag: "EC_EMP_GET_ERR", success: "", error: "" };
    }
  }
);

export const updateContractFieldValues = createAsyncThunk(
  "appContract/updateContractFieldValues",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.fieldValuesUpdate}/${id}`, { updates })
        .then((r) => r.data);
      if (response?.statusCode) {
        return { actionFlag: "EC_FV_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update field values");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const updateContractHtml = createAsyncThunk(
  "appContract/updateContractHtml",
  async ({ id, rendered_html }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.updateHtml}/${id}`, { rendered_html })
        .then((r) => r.data);
      if (response?.statusCode) {
        return { contractItem: response.data, actionFlag: "EC_HTML_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update contract");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const changeContractStatus = createAsyncThunk(
  "appContract/changeContractStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.changeStatus}/${id}`, { status })
        .then((r) => r.data);
      if (response?.statusCode) {
        return { contractItem: response.data, actionFlag: "EC_STATUS_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to change status");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const deleteContract = createAsyncThunk(
  "appContract/deleteContract",
  async (id, { rejectWithValue }) => {
    try {
      const response = await instance
        .delete(`${API_ENDPOINTS.contract.delete}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode) {
        return { id, actionFlag: "EC_DEL_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to delete contract");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const cloneContractTemplate = createAsyncThunk(
  "appContract/cloneContractTemplate",
  async (id, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.contract.templateClone}/${id}`)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { templateItem: response.data, actionFlag: "CT_CLN_SCS", success: response.message || "Template cloned", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to clone template");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

// Employee self-service
export const getMyContracts = createAsyncThunk(
  "appContract/getMyContracts",
  async () => {
    try {
      const response = await instance
        .get(API_ENDPOINTS.contract.myContracts)
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { myContractItems: response.data, actionFlag: "MY_LST_SCS", success: "", error: "" };
      }
      return { myContractItems: [], actionFlag: "MY_LST_ERR", success: "", error: response?.message };
    } catch (error) {
      return { myContractItems: [], actionFlag: "MY_LST_ERR", success: "", error: error.message };
    }
  }
);

export const updateEmployeeFieldValues = createAsyncThunk(
  "appContract/updateEmployeeFieldValues",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await instance
        .put(`${API_ENDPOINTS.contract.employeeFieldValues}/${id}`, { updates })
        .then((r) => r.data);
      if (response?.statusCode) {
        return { actionFlag: "EC_EFV_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to update field values");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

export const signContract = createAsyncThunk(
  "appContract/signContract",
  async ({ id, signature_data }, { rejectWithValue }) => {
    try {
      const response = await instance
        .post(`${API_ENDPOINTS.contract.sign}/${id}`, { signature_data })
        .then((r) => r.data);
      if (response?.statusCode && response?.data) {
        return { contractItem: response.data, actionFlag: "EC_SGN_SCS", success: response.message || "", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to sign contract");
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  }
);

// ============ SLICE ============

export const appContractSlice = createSlice({
  name: "appContract",
  initialState: {
    // Templates
    templateItems: [],
    templateTotal: 0,
    templateItem: null,
    // Employee contracts
    contractItems: [],
    contractTotal: 0,
    contractItem: null,
    isContractOwner: false,
    myContractItems: [],
    // Status
    loading: true,
    actionFlag: "",
    success: "",
    error: "",
  },
  reducers: {
    clearContractMessages: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    clearContractItem: (state) => {
      state.contractItem = null;
      state.templateItem = null;
      state.isContractOwner = false;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = false; state.actionFlag = ""; state.error = ""; };
    const fulfilled = (state, action) => {
      state.loading = true;
      Object.assign(state, action.payload);
    };
    const rejected = (state, action) => {
      state.loading = true;
      state.error = action.payload || action.error?.message || "An error occurred";
      state.actionFlag = "ERROR";
    };

    [
      getContractTemplateList, getContractTemplate, createContractTemplate,
      updateContractTemplate, deleteContractTemplate, cloneContractTemplate,
      createContractSection, updateContractSection, deleteContractSection, reorderContractSections,
      createContractField, updateContractField, deleteContractField, reorderContractFields,
      issueContract, getContractList, getContract, getContractAsEmployee, updateContractFieldValues, updateContractHtml, changeContractStatus,
      deleteContract, getMyContracts, signContract, updateEmployeeFieldValues,
    ].forEach((thunk) => {
      builder
        .addCase(thunk.pending, pending)
        .addCase(thunk.fulfilled, fulfilled)
        .addCase(thunk.rejected, rejected);
    });
  },
});

export const { clearContractMessages, clearContractItem } = appContractSlice.actions;

export default appContractSlice.reducer;
