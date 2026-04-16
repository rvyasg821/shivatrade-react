// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initRoleItem } from "@constant/reduxConstant"

// ** Authentication helpers
import { getTenantId } from "@src/redux/authentication"

// ** Role utilities
import { isSuperAdmin } from "../utils/roleUtils"

async function getRoleListRequest(params) {
    return instance.get(`${API_ENDPOINTS.roles.list}`, { params })
      .then((items) => items.data).catch((error) => error)
}

async function getTenantRoleListRequest(tenantId, params) {
  const endpoint = API_ENDPOINTS.tenantRoles.list.replace('{tenantId}', tenantId)
  return instance.get(endpoint, { params })
    .then((items) => items.data).catch((error) => error)
}

export const getRoleList = createAsyncThunk("appRole/getRoleList", async (params, { getState }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        // Backend filters roles based on user's company automatically
        const response = await getRoleListRequest(params)
        
        if (response?.statusCode && response.data) {
            return {
                params,
                roleItems: response.data,
                pagination: response?._metadata?.pagination || null,
                actionFlag: "ROLE_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                roleItems: [],
                pagination: null,
                actionFlag: "ROLE_LST_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getRoleList catch ", error)
        return {
            params,
            roleItems: [],
            pagination: null,
            actionFlag: "ROLE_LST_ERR",
            success: "",
            error: error.message || error
        }
    }
})

async function getRoleRequest(id) {
  return instance.get(`${API_ENDPOINTS.roles.get}/${id}`)
    .then((items) => items.data).catch((error) => error)
}

async function getTenantRoleRequest(tenantId, roleId) {
  const endpoint = API_ENDPOINTS.tenantRoles.get
      .replace('{tenantId}', tenantId)
      .replace('{roleId}', roleId)
  return instance.get(endpoint)
    .then((items) => items.data).catch((error) => error)
}

export const getRole = createAsyncThunk("appRole/getRole", async (id, { getState }) => {
  try {
    // Multi-tenant removed - all users use the same admin endpoint
    const response = await getRoleRequest(id)

    if (response?.statusCode && response?.data) {
      const normalized = {
        ...response.data,
        _id: response.data._id || response.data.id || id
      }

      return {
        id,
        roleItem: normalized,
        actionFlag: "ROLE_SCS",
        success: "",
        error: ""
      }
    } else {
      return {
        id,
        roleItem: null,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message
      }
    }
  } catch (error) {
    console.log("getRole catch ", error)
    return {
      id,
      roleItem: null,
      actionFlag: "",
      success: "",
      error: error.message || error
    }
  }
})

async function createRoleRequest(payload) {
  return instance.post(`${API_ENDPOINTS.roles.create}`, payload)
    .then((items) => items.data).catch((error) => error)
}

async function createTenantRoleRequest(tenantId, payload) {
  const endpoint = API_ENDPOINTS.tenantRoles.create.replace('{tenantId}', tenantId)
  return instance.post(endpoint, payload)
    .then((items) => items.data).catch((error) => error)
}

export const createRole = createAsyncThunk("appRole/createRole", async (payload, { getState }) => {
  try {
    const finalPayload = {
      ...payload,
      type: "custom",
      permissions:
        payload.permissions &&
        typeof payload.permissions === "object" &&
        !Array.isArray(payload.permissions)
          ? payload.permissions : {}
    }

    // Multi-tenant removed - all users use the same admin endpoint
    const response = await createRoleRequest(finalPayload)

    if (response?.statusCode && response?.data) {
      return {
        payload: finalPayload,
        roleItem: response.data || null,
        actionFlag: "ROLE_CRTD",
        success: response?.message || "",
        error: ""
      }
    } else {
      return {
        payload: finalPayload,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message
      }
    }
  } catch (error) {
    console.log("createRole catch ", error)
    return {
      payload,
      actionFlag: "",
      success: "",
      error: error.message || error
    }
  }
})


async function updateRoleRequest({ id, data }) {
  return instance.put(`${API_ENDPOINTS.roles.update}/${id}`, data)
    .then((items) => items.data).catch((error) => {
      console.error("❌ API error:", error)
      throw error
    })
}

async function updateTenantRoleRequest({ tenantId, roleId, data }) {
    const endpoint = API_ENDPOINTS.tenantRoles.update
        .replace('{tenantId}', tenantId)
        .replace('{roleId}', roleId)
    return instance.put(endpoint, data)
      .then((items) => items.data).catch((error) => error)
}

export const updateRole = createAsyncThunk("appRole/updateRole", async (payload, { rejectWithValue, getState }) => {
  try {
    // Multi-tenant removed - all users use the same admin endpoint
    const response = await updateRoleRequest(payload)

    if (response?.statusCode && response?.data) { 
      return {
        payload,
        roleItem: response.data || null,
        actionFlag: "ROLE_UPDT",
        success: response?.message || "",
        error: ""
      }
    } else {
      return rejectWithValue({
        payload,
        actionFlag: "",
        success: "",
        error:
          response?.response?.data?.message ||
          response?.message ||
          "Unknown error"
      })
    }
  } catch (error) {
    console.error("❌ updateRole catch error", error)
    return rejectWithValue({
      payload,
      actionFlag: "",
      success: "",
      error:
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
    })
  }
})

async function deleteRoleRequest(id) {
  return instance.delete(`${API_ENDPOINTS.roles.delete}/${id}`)
    .then((items) => items.data).catch((error) => error)
}

export const deleteRole = createAsyncThunk("appRole/deleteRole", async (id) => {
  try {
    const response = await deleteRoleRequest(id)
    if (response?.statusCode === 200) {
      return {
        id,
        actionFlag: "ROLE_DLTD",
        success: response?.message || "",
        error: ""
      }
    } else {
      return {
        id,
        actionFlag: "",
        success: "",
        error: response?.response?.data?.message || response.message,
      }
    }
  } catch (error) {
    console.log("deleteRole catch === ", error)
    return {
      id,
      actionFlag: "",
      success: "",
      error
    }
  }
})

export const appRoleSlice = createSlice({
    name: "appRole",
    initialState: {
        roleItems: [],
        pagination: null,
        roleItem: initRoleItem,
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanRoleMessage: (state) => {
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        }
    },
    extraReducers: (builder) => {
      builder
        .addCase(getRoleList.pending, (state) => {
          state.loading = true
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(getRoleList.fulfilled, (state, action) => {
          state.roleItems = action.payload?.roleItems || []
          state.pagination = action.payload?.pagination || null
          state.actionFlag = action.payload.actionFlag
          state.loading = false
          state.success = action.payload.success
          state.error = action.payload.error
        })
        .addCase(getRoleList.rejected, (state) => {
          state.loading = false
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(getRole.pending, (state) => {
          state.roleItem = initRoleItem
          state.loading = true
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(getRole.fulfilled, (state, action) => {
          state.roleItem = action.payload?.roleItem || initRoleItem
          state.actionFlag = action.payload.actionFlag
          state.loading = false
          state.success = action.payload.success
          state.error = action.payload.error
        })
        .addCase(getRole.rejected, (state) => {
          state.loading = false
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(createRole.pending, (state) => {
          state.roleItem = initRoleItem
          state.loading = true
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(createRole.fulfilled, (state, action) => {
          state.roleItem = action.payload?.roleItem || initRoleItem
          state.actionFlag = action.payload.actionFlag
          state.loading = false
          state.success = action.payload.success
          state.error = action.payload.error
        })
        .addCase(createRole.rejected, (state) => {
          state.loading = false
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(updateRole.pending, (state) => {
          state.loading = true
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(updateRole.fulfilled, (state, action) => {
          state.roleItem = action.payload?.roleItem || initRoleItem
          state.actionFlag = action.payload.actionFlag
          state.loading = false
          state.success = action.payload.success
          state.error = action.payload.error
        })
        .addCase(updateRole.rejected, (state, action) => {
          state.loading = false
          state.actionFlag = ""
          state.success = ""
          state.error = action.payload?.error || "Something went wrong"
        })
        .addCase(deleteRole.pending, (state) => {
          state.roleItem = initRoleItem
          state.loading = true
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
        .addCase(deleteRole.fulfilled, (state, action) => {
          state.roleItem = action.payload?.roleItem || initRoleItem
          state.actionFlag = action.payload.actionFlag
          state.loading = false
          state.success = action.payload.success
          state.error = action.payload.error
        })
        .addCase(deleteRole.rejected, (state) => {
          state.loading = false
          state.actionFlag = ""
          state.success = ""
          state.error = ""
        })
    }
})

export const {
    cleanRoleMessage
} = appRoleSlice.actions

export default appRoleSlice.reducer
