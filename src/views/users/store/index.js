// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initUserItem } from "@constant/reduxConstant"

// ** Authentication helpers
import { getTenantId } from "@src/redux/authentication"

async function getUserListRequest(params) {
    return instance.get(`${API_ENDPOINTS.users.list}`, { params })
        .then((items) => items.data).catch((error) => error)
}

async function getTenantUserListRequest(tenantId, params) {
    const endpoint = API_ENDPOINTS.tenantUsers.list.replace('{tenantId}', tenantId)
    return instance.get(endpoint, { params })
        .then((items) => items.data).catch((error) => error)
}

export const getUserList = createAsyncThunk("appUser/getUserList", async (params, { getState }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        const response = await getUserListRequest(params)

        if (response?.statusCode && response?.data) {
            return {
                params,
                userItems: response.data,
                pagination: response?._metadata?.pagination || null,
                actionFlag: "USR_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                userItems: [],
                pagination: null,
                actionFlag: "USR_LST_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getUserList catch ", error)
        return {
            params,
            userItems: [],
            pagination: null,
            actionFlag: "USR_LST_ERR",
            success: "",
            error: error.message || error
        }
    }
})

async function getUserRequest(id) {
    return instance.get(`${API_ENDPOINTS.users.get}/${id}`)
        .then((items) => items.data).catch((error) => error)
}

async function getTenantUserRequest(tenantId, userId) {
    const endpoint = API_ENDPOINTS.tenantUsers.get
        .replace('{tenantId}', tenantId)
        .replace('{userId}', userId)
    return instance.get(endpoint)
        .then((items) => items.data).catch((error) => error)
}

async function getAgentListRequest(params) {
    return instance
        .get(`${API_ENDPOINTS.agent.get}`, { params })
        .then((res) => res.data)
        .catch((error) => {
            throw error
        })
}
// get agent
export const getAgentList = createAsyncThunk(
    "appUser/getAgentList",
    async (params, { rejectWithValue }) => {
        try {
            const response = await getAgentListRequest(params)

            if (response?.statusCode === 200 && response?.data) {
                return {
                    userItems: response.data,
                    pagination: response._metadata?.pagination || null,
                    actionFlag: "AGE_LST_SCS",
                    success: "",
                    error: ""
                }
            } else {
                return rejectWithValue({
                    userItems: [],
                    pagination: null,
                    actionFlag: "AGE_LST_ERR",
                    success: "",
                    error: response?.response?.data?.message || response?.message || "Error fetching users"
                })
            }
        } catch (error) {
            return rejectWithValue({
                userItems: [],
                pagination: null,
                actionFlag: "AGE_LST_ERR",
                success: "",
                error: error?.message || "Something went wrong"
            })
        }
    }
)

// create Agent

async function createAgentRequest(payload) {
    return instance.post(`${API_ENDPOINTS.agent.create}`, payload)
        .then((items) => items.data).catch((error) => error)
}



export const getUser = createAsyncThunk("appUser/getUser", async (id, { getState }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        const response = await getUserRequest(id)

        if (response?.statusCode && response.data) {
            return {
                id,
                userItem: response.data,
                actionFlag: "USR_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                id,
                userItem: null,
                actionFlag: "",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getUser catch ", error)
        return {
            id,
            userItem: null,
            actionFlag: "",
            success: "",
            error: error.message || error
        }
    }
})

async function createUserRequest(payload) {
    return instance.post(`${API_ENDPOINTS.users.create}`, payload)
        .then((items) => items.data).catch((error) => error)
}

async function createTenantUserRequest(tenantId, payload) {
    const endpoint = API_ENDPOINTS.tenantUsers.create.replace('{tenantId}', tenantId)
    return instance.post(endpoint, payload)
        .then((items) => items.data).catch((error) => error)
}

export const createAgent = createAsyncThunk("appUser/createAgent", async (payload, { getState }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        const response = await createAgentRequest(payload)

        if (response?.statusCode && response?.data) {
            return {
                payload,
                userItem: response.data || null,
                actionFlag: "AGE_CRTD",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "AGE_CRTD_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("createUser catch ", error)
        return {
            payload,
            actionFlag: "AGE_CRTD_ERR",
            success: "",
            error: error.message || error
        }
    }
})

export const createUser = createAsyncThunk("appUser/createUser", async (payload, { getState, rejectWithValue }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        const response = await createUserRequest(payload)

        if (response?.statusCode && response?.data) {
            return {
                payload,
                userItem: response.data || null,
                actionFlag: "USR_CRTD",
                success: response?.message || "",
                error: ""
            }
        } else {
            // Reject with error message so .unwrap() throws in the form
            const errorMessage = response?.response?.data?.message || response.message || "Failed to create user";
            return rejectWithValue(errorMessage);
        }
    } catch (error) {
        console.log("createUser catch ", error)
        const errorMessage = error?.response?.data?.message || error.message || error;
        return rejectWithValue(errorMessage);
    }
})

async function updateUserRequest({ id, data }) {
    return instance.put(`${API_ENDPOINTS.users.update}/${id}`, data)
        .then((items) => items.data).catch((error) => error)
}

async function updateTenantUserRequest({ tenantId, userId, data }) {
    const endpoint = API_ENDPOINTS.tenantUsers.update
        .replace('{tenantId}', tenantId)
        .replace('{userId}', userId)
    return instance.put(endpoint, data)
        .then((items) => items.data).catch((error) => error)
}

export const updateUser = createAsyncThunk("appUser/updateUser", async (payload, { getState, rejectWithValue }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        const response = await updateUserRequest(payload)

        if (response?.statusCode && response?.data) {
            return {
                payload,
                userItem: response.data || null,
                actionFlag: "USR_UPDT",
                success: response?.message || "",
                error: ""
            }
        } else {
            // Reject with error message so .unwrap() throws in the form
            const errorMessage = response?.response?.data?.message || response.message || "Failed to update user";
            return rejectWithValue(errorMessage);
        }
    } catch (error) {
        console.log("updateUser catch ", error)
        const errorMessage = error?.response?.data?.message || error.message || error;
        return rejectWithValue(errorMessage);
    }
})

export const updateUserSignup = createAsyncThunk("appUser/updateUser", async (payload) => {

    try {
        const response = await updateUserRequest(payload)

        if (response?.statusCode && response?.data) {
            const savedData = JSON.parse(localStorage.getItem("registerFormData")) || {};
            const updatedData = {
                ...savedData,
                primaryEmail: response?.data?.email // Add new field
            };

            localStorage.setItem("registerFormData", JSON.stringify(updatedData));

            return {
                payload,
                userItem: response.data || null,
                actionFlag: "USR_UPDT",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "USR_UPDT_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("updateUser catch ", error)
        return {
            payload,
            actionFlag: "USR_UPDT_ERR",
            success: "",
            error: error.message || error
        }
    }
})

async function deleteUserRequest(id) {
    return instance.delete(`${API_ENDPOINTS.users.delete}/${id}`)
        .then((items) => items.data).catch((error) => error)
}

async function deleteTenantUserRequest(tenantId, userId) {
    const endpoint = API_ENDPOINTS.tenantUsers.delete
        .replace('{tenantId}', tenantId)
        .replace('{userId}', userId)
    return instance.delete(endpoint)
        .then((items) => items.data).catch((error) => error)
}

export const deleteUser = createAsyncThunk("appUser/deleteUser", async (id, { getState }) => {
    try {
        // Multi-tenant removed - all users use the same admin endpoint
        const response = await deleteUserRequest(id);

        if (response?.statusCode === 200) {
            return {
                id,
                actionFlag: "USR_DLT",
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
        console.log("deleteUser catch >>> ", error)
        return {
            id,
            actionFlag: "",
            success: "",
            error: error.message || error
        }
    }
})


async function updateUserProfileRequest(payload) {
    return instance.patch(`${API_ENDPOINTS.users.updateprofile}`, payload)
        .then((items) => items.data)
        .catch((error) => error)
}

export const updateUserProfile = createAsyncThunk("appUser/updateUserProfile", async (payload) => {
    try {
        const response = await updateUserProfileRequest(payload)
        if (response && response.flag) {
            return {
                actionFlag: "USR_PROFILE_UPDATED",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "USR_PROFILE_UPDATED_ERROR",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        return {
            actionFlag: "USR_PROFILE_UPDATED_ERROR",
            success: "",
            error
        }
    }
})

export const appUserSlice = createSlice({
    name: "appUser",
    initialState: {
        userItems: [],
        pagination: null,
        userItem: initUserItem,
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanUserMessage: (state) => {
            state.actionFlag = ""
            state.success = ""
            state.error = ""
        },
        cleanUserState: (state) => {
            state.userItem = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getUserList.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getUserList.fulfilled, (state, action) => {
                state.userItems = action.payload?.userItems || [];
                state.pagination = action.payload?.pagination || null;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getUserList.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getUser.pending, (state) => {
                state.userItem = initUserItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getUser.fulfilled, (state, action) => {
                state.userItem = action.payload?.userItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getUser.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createUser.pending, (state) => {
                state.userItem = initUserItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createUser.fulfilled, (state, action) => {
                state.userItem = action.payload?.userItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(createUser.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateUser.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                state.userItem = action.payload?.userItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload?.actionFlag;
                state.success = action.payload?.success;
                state.error = action.payload?.error;
            })
            .addCase(updateUser.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(deleteUser.pending, (state) => {
                state.userItem = initUserItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.userItem = action.payload?.userItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(deleteUser.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            //  -----
            //  -----
            .addCase(getAgentList.pending, (state) => {
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getAgentList.fulfilled, (state, action) => {
                state.userItems = action.payload?.userItems || []
                state.pagination = action.payload?.pagination || null
                state.loading = true
                state.actionFlag = action.payload?.actionFlag || ""
                state.success = action.payload?.success || ""
                state.error = action.payload?.error || ""
            })
            .addCase(getAgentList.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
  .addCase(createAgent.pending, (state) => {
                state.userItem = initUserItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createAgent.fulfilled, (state, action) => {
                state.userItem = action.payload?.userItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(createAgent.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })




    }
})

export const {
    cleanUserMessage,
    cleanUserState
} = appUserSlice.actions

export default appUserSlice.reducer
