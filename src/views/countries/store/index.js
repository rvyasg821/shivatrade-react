// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initCountryItem } from "@constant/reduxConstant"

async function getCountryListRequest(params) {
    return instance.get(`${API_ENDPOINTS.countries.list}`, { params })
        .then((items) => items.data)
        .catch((error) => error)
}

export const getCountryList = createAsyncThunk("appCountry/getCountryList", async (params) => {
    try {
        const response = await getCountryListRequest(params)
        if (response && response.flag) {
            return {
                params,
                countryItems: response.data,
                pagination: response?.page_data || null,
                actionFlag: "CTRY_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                countryItems: [],
                pagination: null,
                actionFlag: "CTRY_LST_ERR",
                success: "",
                error: ""
            }
        }
    } catch (error) {
        return {
            params,
            countryItems: [],
            pagination: null,
            actionFlag: "CTRY_LST_ERR",
            success: "",
            error
        }
    }
})

async function getCountryRequest(id) {
    return instance.get(`${API_ENDPOINTS.countries.get}/${id}`)
        .then((items) => items.data)
        .catch((error) => error)
}

export const getCountry = createAsyncThunk("appCountry/getCountry", async (id) => {
    try {
        const response = await getCountryRequest(id)
        if (response && response.flag) {
            return {
                id,
                countryItem: response.data,
                actionFlag: "CTRY_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                id,
                countryItem: null,
                actionFlag: "",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        return {
            id,
            countryItem: null,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function createCountryRequest(payload) {
    return instance.post(`${API_ENDPOINTS.countries.create}`, payload)
        .then((items) => items.data)
        .catch((error) => console.log(error,'error creating country'))
}

export const createCountry = createAsyncThunk("appCountry/createCountry", async (payload) => {
    try {
        const response = await createCountryRequest(payload)
        console.log(response, 'response')
        if (response && response.flag) {
            return {
                payload,
                countryItem: response.data || null,
                actionFlag: "CTRY_CREATED",
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
        return {
            payload,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function updateCountryRequest({ id, data }) {
    return instance.patch(`${API_ENDPOINTS.countries.update}/${id}`, data)
        .then((items) => items.data)
        .catch((error) => error)
}

export const updateCountry = createAsyncThunk("appCountry/updateCountry", async (payload) => {
    try {
        const response = await updateCountryRequest(payload)
        if (response && response.flag) {
            return {
                payload,
                countryItem: response.data || null,
                actionFlag: "CTRY_UPDATED",
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
        return {
            payload,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function deleteCountryRequest(id) {
    return instance.delete(`${API_ENDPOINTS.countries.delete}/${id}`)
        .then((items) => items.data)
        .catch((error) => error)
}

export const deleteCountry = createAsyncThunk("appCountry/deleteCountry", async (id) => {
    try {
        const response = await deleteCountryRequest(id)
        if (response && response.flag) {
            return {
                id,
                actionFlag: "CTRY_DELETED",
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
        return {
            id,
            actionFlag: "",
            success: "",
            error
        }
    }
})

async function getCountryCurrencyListRequest(params) {
    return instance.get(`${API_ENDPOINTS.countries.currencyList}`, { params })
        .then((items) => items.data)
        .catch((error) => error)
}

export const getCountryCurrencyList = createAsyncThunk("appCountry/getCountryCurrencyList", async (params) => {
    try {
        const response = await getCountryCurrencyListRequest(params)
        if (response && response.flag) {
            return {
                params,
                countryCurrencyItems: response.data,
                pagination: response?.page_data || null,
                actionFlag: "CTRY_CURRENCY_LST_SCS",
                success: "",
                error: ""
            }
        } else {
            return {
                params,
                countryCurrencyItems: [],
                pagination: null,
                actionFlag: "CTRY_CURRENCY_LST_ERR",
                success: "",
                error: ""
            }
        }
    } catch (error) {
        return {
            params,
            countryCurrencyItems: [],
            pagination: null,
            actionFlag: "CTRY_CURRENCY_LST_ERR",
            success: "",
            error
        }
    }
})

export const appCountrySlice = createSlice({
    name: "appCountry",
    initialState: {
        countryItems: [],
        countryCurrencyItems: [],
        pagination: null,
        countryItem: initCountryItem,
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanCountryMessage: (state) => {
            state.actionFlag = ""
            state.success = ""
            state.error = ""
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getCountryList.pending, (state) => {
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getCountryList.fulfilled, (state, action) => {
                state.countryItems = action.payload?.countryItems || []
                state.pagination = action.payload?.pagination || null
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getCountryList.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getCountry.pending, (state) => {
                state.countryItem = initCountryItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getCountry.fulfilled, (state, action) => {
                state.countryItem = action.payload?.countryItem || initCountryItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getCountry.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(createCountry.pending, (state) => {
                state.countryItem = initCountryItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(createCountry.fulfilled, (state, action) => {
                state.countryItem = action.payload?.countryItem || initCountryItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(createCountry.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(updateCountry.pending, (state) => {
                state.countryItem = initCountryItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(updateCountry.fulfilled, (state, action) => {
                state.countryItem = action.payload?.countryItem || initCountryItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(updateCountry.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deleteCountry.pending, (state) => {
                state.countryItem = initCountryItem
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(deleteCountry.fulfilled, (state, action) => {
                state.countryItem = action.payload?.countryItem || initCountryItem
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(deleteCountry.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getCountryCurrencyList.pending, (state) => {
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(getCountryCurrencyList.fulfilled, (state, action) => {
                state.countryCurrencyItems = action.payload?.countryCurrencyItems || []
                state.pagination = action.payload?.pagination || null
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(getCountryCurrencyList.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
    }
})

export const {
    cleanCountryMessage
} = appCountrySlice.actions

export default appCountrySlice.reducer