// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ===================== Helper =====================
function buildAbilityFromPermissions(userData) {
  if (userData?.role?.name?.toLowerCase().includes("admin")) {
    return [{ action: "manage", subject: "all" }];
  }

  const ability = [];
  const actionMap = {
    can_all: "manage",
    can_read: "read",
    can_add: "create",
    can_update: "update",
    can_delete: "delete",
  };

  if (userData?.permissions) {
    Object.entries(userData.permissions).forEach(([subject, actions]) => {
      Object.entries(actions).forEach(([permKey, allowed]) => {
        if (allowed && actionMap[permKey]) {
          ability.push({ action: actionMap[permKey], subject });
        }
      });
    });
  }

  return ability;
}

// ===================== API Requests =====================
async function getCompanyListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.company.getList}`, { params })
    .then((res) => res.data)
    .catch((err) => err);
}

async function getCompanyDetailsRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.company.list}`, { params })
    .then((res) => res.data)
    .catch((err) => err);
}

async function updateCompanyProfileRequest(payload) {
  return instance
    .put(`${API_ENDPOINTS.company.updateProfile}`, payload)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

async function updateCompanyDetailsRequest(companyId, payload) {
  return instance
    .put(`${API_ENDPOINTS.company.updateDetails}/${companyId}`, payload)
    .then((res) => ({
      data: res.data,
      headers: res.headers,
    }))
    .catch((err) => {
      throw err.response?.data || err;
    });
}



// Create company (Super Admin)
async function createCompanyRequest(payload) {
  return instance
    .post(API_ENDPOINTS.company.create, payload)
    .then((res) => res.data)
    .catch((err) => { throw err.response?.data || err; });
}

//  Get a single company by ID
async function getCompanyRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.company.get}/${params?.id}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

// DELETE company by ID
async function deleteCompanyRequest(companyId) {
  return instance
    .delete(`${API_ENDPOINTS.company.delete}/${companyId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}

// suspend company request
async function suspendCompanyRequest({ companyId }) {
  return instance
    .put(`${API_ENDPOINTS.company.suspend}/${companyId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}
// reactivate company request
async function reactivateCompanyRequest({ companyId }) {
  return instance
    .put(`${API_ENDPOINTS.company.reactivate}/${companyId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err.response?.data || err;
    });
}



// ===================== Redux Async Thunks =====================


export const getCompanyList = createAsyncThunk(
  "company/getCompanyList",
  async (params) => {
    try {
      const response = await getCompanyListRequest(params);

      if (response?.statusCode === 200 && response?.data) {
        return {
          companyItems: response.data,
          pagination: response._metadata?.pagination || null,
          actionFlag: "COM_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          companyItems: [],
          pagination: null,
          actionFlag: "COM_LST_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        };
      }
    } catch (error) {
      return {
        companyItems: [],
        pagination: null,
        actionFlag: "COM_LST_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      };
    }
  }
);


export const getCompanyDetails = createAsyncThunk(
  "company/getCompanyDetails",
  async (params) => {
    try {
      const response = await getCompanyDetailsRequest(params);

      if (response?.statusCode === 200 && response?.data) {
        const company = response.data;

        return {
          company: { ...company, ability: buildAbilityFromPermissions(company) },
          actionFlag: "GET_COMPANY_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          company: {},
          actionFlag: "GET_COMPANY_ERR",
          success: "",
          error: "",
        };
      }
    } catch (error) {
      return {
        company: {},
        actionFlag: "GET_COMPANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      };
    }
  }
);

export const getCompany = createAsyncThunk(
  "company/getCompany",
  async (params, { rejectWithValue }) => {
    try {
      const response = await getCompanyRequest(params);
      if (response?.statusCode === 200 && response?.data) {
        const company = response.data;
        return {
          company: { ...company, ability: buildAbilityFromPermissions(company) },
          actionFlag: "GET_COMPANY_SCS",
          success: "",
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "GET_COMPANY_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "GET_COMPANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

export const updateCompanyProfile = createAsyncThunk(
  "company/updateCompanyProfileRequest",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateCompanyProfileRequest(payload);

      if (response?.statusCode === 200 && response?.data) {
        const updatedCompany = response.data;
        return {
          company: { ...updatedCompany, ability: buildAbilityFromPermissions(updatedCompany) },
          actionFlag: "UPDATE_COMPANY_SCS",
          success: response.message,
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "UPDATE_COMPANY_ERR",
          success: "",
          error: response?.response?.data?.message || response.message,
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "UPDATE_COMPANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

export const createCompany = createAsyncThunk(
  "company/createCompany",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createCompanyRequest(payload);
      if (response?.statusCode && response?.data) {
        return { companyItem: response.data, actionFlag: "COMPANY_CREATED", success: response.message || "Company created successfully", error: "" };
      }
      return rejectWithValue(response?.message || "Failed to create company");
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to create company");
    }
  }
);

export const updateCompanyDetails = createAsyncThunk(
  "company/updateCompanyDetails",
  async ({ companyId, payload }, { dispatch, rejectWithValue }) => {
    try {
      const response = await updateCompanyDetailsRequest(companyId, payload);
      const updatedCompany = response.data.data;

      // ✅ Update Redux immediately
      dispatch(setCompanyItem(updatedCompany));

      return {
        company: updatedCompany,
        actionFlag: "UPDATE_COMPANY_DETAILS_SCS",
        success: response.data.message || "Company updated successfully",
        error: "",
      };
    } catch (error) {
      return rejectWithValue({
        actionFlag: "UPDATE_COMPANY_DETAILS_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

export const deleteCompany = createAsyncThunk(
  "company/deleteCompany",
  async (companyId, { rejectWithValue }) => {
    try {
      const response = await deleteCompanyRequest(companyId);

      if (response?.statusCode === 200) {
        return {
          companyId,
          actionFlag: "DELETE_COMPANY_SCS",
          success: response.message || "Company deleted successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "DELETE_COMPANY_ERR",
          success: "",
          error: response?.message || "Failed to delete company",
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "DELETE_COMPANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);



export const suspendCompany = createAsyncThunk(
  "company/suspendCompany",
  async (companyId, { rejectWithValue }) => {
    try {
      const response = await suspendCompanyRequest(companyId);

      if (response?.statusCode === 200 && response?.data) {
        return {
          company: response.data,
          companyId,
          actionFlag: "SUSPEND_COMPANY_SCS",
          success: response.message || "Company suspended successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "SUSPEND_COMPANY_ERR",
          success: "",
          error: response?.message || "Failed to suspend company",
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "SUSPEND_COMPANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);

export const reactivateCompany = createAsyncThunk(
  "company/reactivateCompany",
  async (companyId, { rejectWithValue }) => {
    try {
      const response = await reactivateCompanyRequest(companyId);

      if (response?.statusCode === 200 && response?.data) {
        return {
          company: response.data,
          companyId,
          actionFlag: "REACTIVATE_COMPANY_SCS",
          success: response.message || "Company reactivated successfully",
          error: "",
        };
      } else {
        return rejectWithValue({
          actionFlag: "REACTIVATE_COMPANY_ERR",
          success: "",
          error: response?.message || "Failed to reactivate company",
        });
      }
    } catch (error) {
      return rejectWithValue({
        actionFlag: "REACTIVATE_COMPANY_ERR",
        success: "",
        error: error?.message || "Something went wrong",
      });
    }
  }
);


// ===================== Company Slice =====================
export const companySlice = createSlice({
  name: "company",
  initialState: {
    companyItem: {},
    pagination: null,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCompanyMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
    setCompanyItem: (state, action) => {
      state.companyItem = action.payload;
    },
    resetCompanyLoading: (state) => {
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // GET COMPANY
      .addCase(getCompanyDetails.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCompanyDetails.fulfilled, (state, action) => {
        state.companyItem = action.payload?.company || {};
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCompanyDetails.rejected, (state, action) => {
        state.loading = true;
        state.companyItem = {};
        state.actionFlag = "GET_COMPANY_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })

      // UPDATE COMPANY Profile
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.companyItem = action.payload?.company || {};
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = true;
        state.actionFlag = action.payload?.actionFlag || "UPDATE_COMPANY_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })

      // Get company List 
      .addCase(getCompanyList.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCompanyList.fulfilled, (state, action) => {
        state.companyItem = action.payload.companyItems || [];
        state.pagination = action.payload.pagination || null;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCompanyList.rejected, (state, action) => {
        state.loading = false;
        state.companyItem = [];
        state.pagination = null;
        state.actionFlag = "COM_LST_ERR";
        state.success = "";
        state.error = action.error?.message || "Something went wrong";
      })
      .addCase(getCompany.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
      })
      .addCase(getCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companyItem = action.payload.company;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCompany.rejected, (state, action) => {
        state.loading = false;
        state.companyItem = {};
        state.actionFlag = "GET_COMPANY_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })
      .addCase(updateCompanyDetails.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCompanyDetails.fulfilled, (state, action) => {
        state.companyItem = action.payload?.company || state.companyItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = false;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })

      .addCase(updateCompanyDetails.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload?.actionFlag || "UPDATE_COMPANY_DETAILS_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = "";

        // Remove company from list if you store list in state
        if (state.companyItem?._id === action.payload.companyId) {
          state.companyItem = {};
        }
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload?.actionFlag || "DELETE_COMPANY_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })
      .addCase(suspendCompany.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(suspendCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = "";

        // ✅ Update company status if same company is loaded
        if (state.companyItem?._id === action.payload.companyId) {
          state.companyItem = action.payload.company;
        }
      })
      .addCase(suspendCompany.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload?.actionFlag || "SUSPEND_COMPANY_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })

      .addCase(reactivateCompany.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(reactivateCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = "";

        // ✅ Update company status if same company is loaded
        if (state.companyItem?._id === action.payload.companyId) {
          state.companyItem = action.payload.company;
        }
      })
      .addCase(reactivateCompany.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = action.payload?.actionFlag || "REACTIVATE_COMPANY_ERR";
        state.success = "";
        state.error = action.payload?.error || "Something went wrong";
      })

      // CREATE COMPANY
      .addCase(createCompany.pending, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companyItem = action.payload?.companyItem || {};
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = "";
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false;
        state.actionFlag = "CREATE_COMPANY_ERR";
        state.success = "";
        state.error = action.payload || "Something went wrong";
      });

  }
});

export const { cleanCompanyMessage, setCompanyItem, resetCompanyLoading } = companySlice.actions;
export default companySlice.reducer;
