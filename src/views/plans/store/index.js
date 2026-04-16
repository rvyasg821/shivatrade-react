// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initPlanItem } from "@constant/reduxConstant"

async function getPlanListRequest(params) {
    return instance.get(`${API_ENDPOINTS.plan.list}`, { params })
        .then((items) => items.data).catch((error) => error)
}

export const getPlanList = createAsyncThunk("appPlan/getPlanList", async (params) => {
    try {
        const response = await getPlanListRequest(params)
        if (response?.statusCode && response?.data) {
            return {
                params,
                planItems: response.data,
                pagination: response?._metadata?.pagination || null,
                actionFlag: "PLAN_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                planItems: [],
                pagination: null,
                actionFlag: "PLAN_LST_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getPlanList catch ", error)
        return {
            params,
            planItems: [],
            pagination: null,
            actionFlag: "PLAN_LST_ERR",
            success: "",
            error
        }
    }
})

async function getPlanRequest(id) {
    return instance.get(`${API_ENDPOINTS.plan.get}/${id}`)
        .then((items) => items.data).catch((error) => error)
}

export const getPlan = createAsyncThunk("appPlan/getPlan", async (id) => {
    try {
        const response = await getPlanRequest(id)
        if (response?.statusCode && response.data) {
            return {
                id,
                planItem: response.data,
                actionFlag: "PLAN_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                id,
                planItem: null,
                actionFlag: "",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getPlan catch ", error)
        return {
            id,
            planItem: null,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function createPlanRequest(payload) {
    return instance.post(`${API_ENDPOINTS.plan.create}`, payload)
        .then((items) => items.data).catch((error) => error)
}

export const createPlan = createAsyncThunk("appPlan/createPlan", async (payload) => {
    try {
        const response = await createPlanRequest(payload)
        if (response?.statusCode && response?.data) {
            return {
                payload,
                planItem: response.data || null,
                actionFlag: "PLAN_CRTD",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "PLAN_CRTD_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("createPlan catch ", error)
        return {
            payload,
            actionFlag: "PLAN_CRTD_ERR",
            success: "",
            error
        }
    }
})

async function updatePlanRequest({ id, data }) {
    return instance.put(`${API_ENDPOINTS.plan.update}/${id}`, data)
        .then((items) => items.data).catch((error) => error)
}

export const updatePlan = createAsyncThunk("appPlan/updatePlan", async (payload) => {
    try {
        const response = await updatePlanRequest(payload)
        if (response?.statusCode && response?.data) {
            return {
                payload,
                planItem: response.data || null,
                actionFlag: "PLAN_UPDT",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "PLAN_UPDT_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("updatePlan catch ", error)
        return {
            payload,
            actionFlag: "PLAN_UPDT_ERR",
            success: "",
            error
        }
    }
})

async function deletePlanRequest(id) {
    return instance.delete(`${API_ENDPOINTS.plan.delete}/${id}`)
        .then((items) => items.data).catch((error) => error)
}

export const deletePlan = createAsyncThunk("appPlan/deletePlan", async (id) => {
    try {
        const response = await deletePlanRequest(id);
        if (response?.statusCode === 200) {
            return {
                id,
                actionFlag: "PLAN_DLT",
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
        console.log("deletePlan catch >>> ", error)
        return {
            id,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function getToolsListRequest(params) {
    return instance.get(`${API_ENDPOINTS.tools.list}`, { params })
        .then((items) => items.data).catch((error) => error)
}

export const getToolsList = createAsyncThunk("appPlan/getToolsList", async (params) => {
    try {
        console.log('Plans Store getToolsList Params ====>',params);
        
        const response = await getToolsListRequest(params)
        if (response?.statusCode && response?.data) {
            return {
                params,
                toolItems: response.data,
                actionFlag: "TOOLS_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                toolItems: [],
                actionFlag: "TOOLS_LST_ERR",
                success: "",
                error: response?.response?.data?.message || response.message,
            }
        }
    } catch (error) {
        console.log("getToolsList catch ", error)
        return {
            params,
            toolItems: [],
            actionFlag: "TOOLS_LST_ERR",
            success: "",
            error
        }
    }
})

export const appPlanSlice = createSlice({
    name: "appPlan",
    initialState: {
        planItems: [],
        pagination: null,
        planItem: initPlanItem,
        toolItems: [],
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanPlanMessage: (state) => {
            state.actionFlag = ""
            state.success = ""
            state.error = ""
        },
        cleanPlanState: (state) => {
            state.planItem = initPlanItem
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPlanList.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getPlanList.fulfilled, (state, action) => {
                state.planItems = action.payload?.planItems || [];
                state.pagination = action.payload?.pagination || null;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getPlanList.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getPlan.pending, (state) => {
                state.planItem = initPlanItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getPlan.fulfilled, (state, action) => {
                state.planItem = action.payload?.planItem || initPlanItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getPlan.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createPlan.pending, (state) => {
                state.planItem = initPlanItem;
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(createPlan.fulfilled, (state, action) => {
                state.planItem = action.payload?.planItem || initPlanItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(createPlan.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updatePlan.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(updatePlan.fulfilled, (state, action) => {
                state.planItem = action.payload?.planItem || initPlanItem;
                state.loading = true;
                state.actionFlag = action.payload?.actionFlag;
                state.success = action.payload?.success;
                state.error = action.payload?.error;
            })
            .addCase(updatePlan.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(deletePlan.pending, (state) => {
                state.planItem = initPlanItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deletePlan.fulfilled, (state, action) => {
                state.planItem = action.payload?.planItem || initPlanItem;
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(deletePlan.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getToolsList.pending, (state) => {
                state.loading = false;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
            .addCase(getToolsList.fulfilled, (state, action) => {
                state.toolItems = action.payload?.toolItems || [];
                state.loading = true;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(getToolsList.rejected, (state) => {
                state.loading = true;
                state.actionFlag = "";
                state.success = "";
                state.error = "";
            })
    }
})

export const {
    cleanPlanMessage,
    cleanPlanState
} = appPlanSlice.actions

export default appPlanSlice.reducer