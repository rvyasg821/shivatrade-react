// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initUserItem } from "@constant/reduxConstant"

// ** Helper function to get tenantId from Redux state
import { getTenantId } from "@src/redux/authentication"

async function getToolSchedulesListRequest(params) {
    const tenantId = getTenantId()
    if (!tenantId) {
        return {
            statusCode: false,
            message: 'Tenant ID not found. Please login again.',
            data: []
        }
    }
    const url = API_ENDPOINTS.toolSchedule.list.replace('{tenantId}', tenantId)
    return instance.get(url, { params })
        .then((items) => items.data).catch((error) => error)
}

export const getToolSchedulesList = createAsyncThunk("appToolSchedules/getToolSchedulesList", async (params) => {
    try {
        const response = await getToolSchedulesListRequest(params)
        if (response?.data?.schedules) {
            return {
                params,
                toolScheduleItems: response.data.schedules,
                pagination: {
                    total: response.data.total || 0,
                    page: response.data.page || 1,
                    limit: response.data.limit || 10,
                    totalPages: response.data.totalPages || 1
                },
                actionFlag: "TOOL_SCHEDULE_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                toolScheduleItems: [],
                pagination: null,
                actionFlag: "TOOL_SCHEDULE_LST_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getToolSchedulesList catch ", error)
        return {
            params,
            toolScheduleItems: [],
            pagination: null,
            actionFlag: "TOOL_SCHEDULE_LST_ERR",
            success: "",
            error
        }
    }
})

async function getToolScheduleRequest(id) {
    const tenantId = getTenantId()
    if (!tenantId) {
        return {
            statusCode: false,
            message: 'Tenant ID not found. Please login again.',
            data: null
        }
    }
    const url = API_ENDPOINTS.toolSchedule.get.replace('{tenantId}', tenantId).replace('{id}', id)
    return instance.get(url)
        .then((items) => items.data).catch((error) => error)
}

export const getToolSchedule = createAsyncThunk("appToolSchedules/getToolSchedule", async (id) => {
    try {
        const response = await getToolScheduleRequest(id)
        if (response?.statusCode && response.data?.schedule) {
            return {
                id,
                toolScheduleItem: response.data.schedule,
                actionFlag: "TOOL_SCHEDULE_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                id,
                toolScheduleItem: null,
                actionFlag: "",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getToolSchedule catch ", error)
        return {
            id,
            toolScheduleItem: null,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function createToolScheduleRequest(payload) {
    const tenantId = getTenantId()
    if (!tenantId) {
        return {
            statusCode: false,
            message: 'Tenant ID not found. Please login again.',
            data: null
        }
    }
    const url = API_ENDPOINTS.toolSchedule.create.replace('{tenantId}', tenantId)
    return instance.post(url, payload)
        .then((items) => items.data).catch((error) => error)
}

export const createToolSchedule = createAsyncThunk("appToolSchedules/createToolSchedule", async (payload) => {
    try {
        const response = await createToolScheduleRequest(payload)
        if (response?.statusCode && response?.data) {
            return {
                payload,
                toolScheduleItem: response.data || null,
                actionFlag: "TOOL_SCHEDULE_CRTD",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "TOOL_SCHEDULE_CRTD_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("createToolSchedule catch ", error)
        return {
            payload,
            actionFlag: "TOOL_SCHEDULE_CRTD_ERR",
            success: "",
            error
        }
    }
})

async function updateToolScheduleRequest({ id, data }) {
    const tenantId = getTenantId()
    if (!tenantId) {
        return {
            statusCode: false,
            message: 'Tenant ID not found. Please login again.',
            data: null
        }
    }
    const url = API_ENDPOINTS.toolSchedule.update.replace('{tenantId}', tenantId).replace('{id}', id)
    return instance.put(url, data)
        .then((items) => items.data).catch((error) => error)
}

export const updateToolSchedule = createAsyncThunk("appToolSchedules/updateToolSchedule", async (payload) => {
    try {
        const response = await updateToolScheduleRequest(payload)
        if (response?.statusCode && response?.data) {
            return {
                payload,
                toolScheduleItem: response.data || null,
                actionFlag: "TOOL_SCHEDULE_UPDT",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "TOOL_SCHEDULE_UPDT_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("updateToolSchedule catch ", error)
        return {
            payload,
            actionFlag: "TOOL_SCHEDULE_UPDT_ERR",
            success: "",
            error
        }
    }
})

async function deleteToolScheduleRequest(id) {
    const tenantId = getTenantId()
    if (!tenantId) {
        return {
            statusCode: false,
            message: 'Tenant ID not found. Please login again.',
            data: null
        }
    }
    const url = API_ENDPOINTS.toolSchedule.delete.replace('{tenantId}', tenantId).replace('{id}', id)
    return instance.delete(url)
        .then((items) => items.data).catch((error) => error)
}

export const deleteToolSchedule = createAsyncThunk("appToolSchedules/deleteToolSchedule", async (id) => {
    try {
        const response = await deleteToolScheduleRequest(id);
        if (response?.statusCode === 200) {
            return {
                id,
                actionFlag: "TOOL_SCHEDULE_DLT",
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
        console.log("deleteToolSchedule catch >>> ", error)
        return {
            id,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function updateToolScheduleStatusRequest({ id, status }) {
    const tenantId = getTenantId()
    if (!tenantId) {
        return {
            statusCode: false,
            message: 'Tenant ID not found. Please login again.',
            data: null
        }
    }
    const url = API_ENDPOINTS.toolSchedule.status.replace('{tenantId}', tenantId).replace('{id}', id)
    return instance.patch(url, { status })
        .then((items) => items.data).catch((error) => error)
}

export const updateToolScheduleStatus = createAsyncThunk("appToolSchedules/updateToolScheduleStatus", async (payload) => {
    try {
        const response = await updateToolScheduleStatusRequest(payload)
        if (response?.statusCode && response?.data) {
            return {
                payload,
                toolScheduleItem: response.data || null,
                actionFlag: "TOOL_SCHEDULE_STATUS_UPDT",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "TOOL_SCHEDULE_STATUS_UPDT_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("updateToolScheduleStatus catch ", error)
        return {
            payload,
            actionFlag: "TOOL_SCHEDULE_STATUS_UPDT_ERR",
            success: "",
            error
        }
    }
})

export const appToolSchedulesSlice = createSlice({
    name: "appToolSchedules",
    initialState: {
        toolScheduleItems: [],
        pagination: null,
        toolScheduleItem: initUserItem,
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanToolSchedulesMessage: (state) => {
            state.actionFlag = ""
            state.success = ""
            state.error = ""
        },
        cleanToolScheduleState: (state) => {
            state.toolScheduleItem = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getToolSchedulesList.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getToolSchedulesList.fulfilled, (state, action) => {
                state.toolScheduleItems = action.payload?.toolScheduleItems || [];
                state.pagination = action.payload?.pagination || null;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getToolSchedulesList.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getToolSchedule.pending, (state) => {
                state.toolScheduleItem = initUserItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getToolSchedule.fulfilled, (state, action) => {
                state.toolScheduleItem = action.payload?.toolScheduleItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getToolSchedule.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createToolSchedule.pending, (state) => {
                state.toolScheduleItem = initUserItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createToolSchedule.fulfilled, (state, action) => {
                state.toolScheduleItem = action.payload?.toolScheduleItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(createToolSchedule.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateToolSchedule.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateToolSchedule.fulfilled, (state, action) => {
                state.toolScheduleItem = action.payload?.toolScheduleItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload?.success;
                state.error = action.payload?.error;
            })
            .addCase(updateToolSchedule.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(deleteToolSchedule.pending, (state) => {
                state.toolScheduleItem = initUserItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deleteToolSchedule.fulfilled, (state, action) => {
                state.toolScheduleItem = action.payload?.toolScheduleItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(deleteToolSchedule.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateToolScheduleStatus.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updateToolScheduleStatus.fulfilled, (state, action) => {
                state.toolScheduleItem = action.payload?.toolScheduleItem || initUserItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload?.success;
                state.error = action.payload?.error;
            })
            .addCase(updateToolScheduleStatus.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
    }
})

export const {
    cleanToolSchedulesMessage,
    cleanToolScheduleState
} = appToolSchedulesSlice.actions

export default appToolSchedulesSlice.reducer