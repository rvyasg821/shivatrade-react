// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initStateItem } from "@constant/reduxConstant"

async function getStateDrpdwnListRequest(params) {
    return instance.get(`${API_ENDPOINTS.states.drpdwn}`, { params })
        .then((items) => items.data)
        .catch((error) => error)
}

export const getStateDrpdwnList = createAsyncThunk("appState/getStateDrpdwnList", async (params) => {
    try {
        const response = await getStateDrpdwnListRequest(params)
        if (response && response.flag) {
            return {
                params,
                stateDrpdwnItems: response.data,
                actionFlag: "STT_DRPDWN_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                stateDrpdwnItems: [],
                actionFlag: "STT_DRPDWN_LST_ERR",
                success: "",
                error: ""
            }
        }
    } catch (error) {
        console.log("getStateList catch ", error)
        return {
            params,
            stateDrpdwnItems: [],
            actionFlag: "STT_DRPDWN_LST_ERR",
            success: "",
            error
        }
    }
})

async function getStateListRequest(params) {
    return instance.get(`${API_ENDPOINTS.states.list}`, { params })
        .then((items) => items.data)
        .catch((error) => error)
}

export const getStateList = createAsyncThunk("appState/getStateList", async (params) => {
    try {
        const response = await getStateListRequest(params)
        if (response && response.flag) {
            return {
                params,
                stateItems: response.data,
                pagination: response?.page_data || null,
                actionFlag: "STT_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                stateItems: [],
                pagination: null,
                actionFlag: "STT_LST_ERR",
                success: "",
                error: ""
            }
        }
    } catch (error) {
        console.log("getStateList catch ", error)
        return {
            params,
            stateItems: [],
            pagination: null,
            actionFlag: "STT_LST_ERR",
            success: "",
            error
        }
    }
})

async function getStateRequest(id) {
    return instance.get(`${API_ENDPOINTS.states.get}/${id}`)
        .then((items) => items.data)
        .catch((error) => error)
}

export const getState = createAsyncThunk("appState/getState", async (id) => {
    try {
        const response = await getStateRequest(id)
        if (response && response.flag) {
            return {
                id,
                stateItem: response.data,
                actionFlag: "STT_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                id,
                stateItem: null,
                actionFlag: "",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        console.log("getState catch ", error)
        return {
            id,
            stateItem: null,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function createStateRequest(payload) {
    return instance.post(`${API_ENDPOINTS.states.create}`, payload)
        .then((items) => items.data)
        .catch((error) => error)
}

export const createState = createAsyncThunk("appState/createState", async (payload) => {
    try {
        const response = await createStateRequest(payload)
        if (response && response.flag) {
            return {
                payload,
                stateItem: response.data || null,
                actionFlag: "STT_CREATED",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        console.log("createState catch ", error)
        return {
            payload,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function updateStateRequest({ id, data }) {
    return instance.patch(`${API_ENDPOINTS.states.update}/${id}`, data)
        .then((items) => items.data)
        .catch((error) => error)
}

export const updateState = createAsyncThunk("appState/updateState", async (payload) => {
    try {
        const response = await updateStateRequest(payload)
        if (response && response.flag) {
            return {
                payload,
                stateItem: response.data || null,
                actionFlag: "STT_UPDATED",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        console.log("updateState catch ", error)
        return {
            payload,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function deleteStateRequest(id) {
    return instance.delete(`${API_ENDPOINTS.states.delete}/${id}`)
        .then((items) => items.data)
        .catch((error) => error)
}

export const deleteState = createAsyncThunk("appState/deleteState", async (id) => {
    try {
        const response = await deleteStateRequest(id)
        if (response && response.flag) {
            return {
                id,
                actionFlag: "STT_DELETED",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                id,
                actionFlag: "",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        console.log("deleteState catch >>> ", error)
        return {
            id,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function getStateListByCountryRequest({ id, search }) {
    let url = `${API_ENDPOINTS.states.list}/countryId/${id}`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  return instance
    .get(url)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getStateListByCountry = createAsyncThunk(
    "appState/getStateListByCountry",
    async (input) => {
        try {
            const isObject = typeof input === "object" && input !== null;
            const id = isObject ? input.id : input; // Extract id
            const search = isObject ? input.search : undefined; // Extract search if available

            const response = await getStateListByCountryRequest({ id, search })
            if (response && response.flag) {
                return {
                    id,
                    stateItems: response.data,
                    actionFlag: "STT_CNT_LST_SCS",
                    success: "",
                    error: ""
                }
            } else {
                return {
                    id,
                    stateItems: [],
                    actionFlag: "STT_CNT_LST_ERR",
                    success: "",
                    error: response.message
                }
            }
        } catch (error) {
            console.log("getStateListByCountry catch ", error)
            return {
                id: input.id || input,
                stateItems: [],
                actionFlag: "STT_CNT_LST_ERR",
                success: "",
                error
            }
        }
    }
)

export const appStateSlice = createSlice({
    name: "appState",
    initialState: {
        stateItems: [],
        stateDrpdwnItems:[],
        pagination: null,
        stateItem: initStateItem,
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanStateMessage: (state) => {
            state.actionFlag = ""
            state.success = ""
            state.error = ""
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getStateList.pending, (state) => {
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getStateList.fulfilled, (state, action) => {
                state.stateItems = action.payload?.stateItems || []
                state.pagination = action.payload?.pagination || null
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getStateList.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getState.pending, (state) => {
                state.stateItem = initStateItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getState.fulfilled, (state, action) => {
                state.stateItem = action.payload?.stateItem || initStateItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getState.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(createState.pending, (state) => {
                state.stateItem = initStateItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(createState.fulfilled, (state, action) => {
                state.stateItem = action.payload?.stateItem || initStateItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(createState.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(updateState.pending, (state) => {
                state.stateItem = initStateItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(updateState.fulfilled, (state, action) => {
                state.stateItem = action.payload?.stateItem || initStateItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(updateState.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deleteState.pending, (state) => {
                state.stateItem = initStateItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deleteState.fulfilled, (state, action) => {
                state.stateItem = action.payload?.stateItem || initStateItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(deleteState.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getStateDrpdwnList.pending, (state) => {
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getStateDrpdwnList.fulfilled, (state, action) => {
                state.stateDrpdwnItems = action.payload?.stateDrpdwnItems || []
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getStateDrpdwnList.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            // -------------------------------------
            .addCase(getStateListByCountry.pending, (state) => {
                state.stateItems = []
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getStateListByCountry.fulfilled, (state, action) => {
                state.stateItems = action.payload?.stateItems || []
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getStateListByCountry.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
    }
})

export const {
    cleanStateMessage
} = appStateSlice.actions

export default appStateSlice.reducer