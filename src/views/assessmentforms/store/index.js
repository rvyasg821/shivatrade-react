import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

import instance from "@src/utility/AxiosConfig"

import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

const initAssessmentItem = {
    id: null,
    name: "",
    description: "",
    status: "",
}

async function getAssessmentsListRequest(params) {    
    return instance
        .get(`${API_ENDPOINTS.assessmentForms.list}`,{params})
        .then((items) => items.data)
        .catch((error) => error)
}

async function deleteAssessmentRequest(id) {
    return instance
        .delete(`${API_ENDPOINTS.assessmentForms.delete}/${id}`)
        .then((res) => res.data)
        .catch((error) => error)
}

async function createAssessmentRequest(data) {
    return instance
        .post(`${API_ENDPOINTS.assessmentForms.create}`, data)
        .then((res) => res.data)
        .catch((error) => error)
}

async function getAssessmentByIdRequest(id) {
    return instance
        .get(`${API_ENDPOINTS.assessmentForms.get}/${id}`)
        .then((res) => res.data)
        .catch((error) => error)
}

async function updateAssessmentRequest(id, data) {
    return instance
        .put(`${API_ENDPOINTS.assessmentForms.update}/${id}`, data)
        .then((res) => res.data)
        .catch((error) => error)
}

export const getAssessmentsList = createAsyncThunk(
    "appAssessments/getAssessmentsList",
    async (params) => {
        try {
            const response = await getAssessmentsListRequest(params)
            if (response?.data) {
                return {
                    assessmentItems: response.data,
                    pagination: response?._metadata?.pagination || null,
                    actionFlag: "ASSESSMENT_LIST_SUCCESS",
                    success: response.message || "Assessments fetched successfully",
                    error: "",
                }
            } else {
                return {
                    assessmentItems: [],
                    pagination: null,
                    actionFlag: "ASSESSMENT_LIST_ERROR",
                    success: "",
                    error: response?.data?.message || "Failed to fetch assessments",
                }
            }
        } catch (error) {
            return {
                assessmentItems: [],
                pagination: null,
                actionFlag: "ASSESSMENT_LIST_ERROR",
                success: "",
                error: error.message || "Network error fetching assessments",
            }
        }
    }
)

export const deleteAssessment = createAsyncThunk(
    "appAssessments/deleteAssessment",
    async (id) => {
        try {
            const response = await deleteAssessmentRequest(id)
            if (response?.success || response?.status === true) {
                return {
                    id,
                    actionFlag: "ASSESSMENT_DELETE_SUCCESS",
                    success: response.message || "Assessment deleted successfully",
                    error: "",
                }
            } else {
                return {
                    id: null,
                    actionFlag: "ASSESSMENT_DELETE_ERROR",
                    success: "",
                    error: response?.message || "Failed to delete assessment",
                }
            }
        } catch (error) {
            return {
                id: null,
                actionFlag: "ASSESSMENT_DELETE_ERROR",
                success: "",
                error: error.message || "Network error deleting assessment",
            }
        }
    }
)

export const createAssessment = createAsyncThunk(
    "appAssessments/createAssessment",
    async (data) => {
        try {
            const response = await createAssessmentRequest(data)
            if (response?.data) {
                return {
                    assessmentItem: response.data || {},
                    actionFlag: "ASSESSMENT_CREATE_SUCCESS",
                    success: response.message || "Assessment created successfully",
                    error: "",
                }
            } else {
                return {
                    assessmentItem: {},
                    actionFlag: "ASSESSMENT_CREATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to create assessment",
                }
            }
        } catch (error) {
            return {
                assessmentItem: {},
                actionFlag: "ASSESSMENT_CREATE_ERROR",
                success: "",
                error: error.message || "Network error creating assessment",
            }
        }
    }
)

export const getAssessmentById = createAsyncThunk(
    "appAssessments/getAssessmentById",
    async (id) => {
        try {
            const response = await getAssessmentByIdRequest(id)
            if (response?.data) {
                return {
                    assessmentItem: response.data,
                    actionFlag: "ASSESSMENT_FETCH_SUCCESS",
                    success: response.message || "Assessment fetched successfully",
                    error: "",
                }
            } else {
                return {
                    assessmentItem: {},
                    actionFlag: "ASSESSMENT_FETCH_ERROR",
                    success: "",
                    error: response?.message || "Failed to fetch assessment",
                }
            }
        } catch (error) {
            return {
                assessmentItem: {},
                actionFlag: "ASSESSMENT_FETCH_ERROR",
                success: "",
                error: error.message || "Network error fetching assessment",
            }
        }
    }
)

export const updateAssessment = createAsyncThunk(
    "appAssessments/updateAssessment",
    async ({ id, data }) => {
        try {
            const response = await updateAssessmentRequest(id, data)
            if (response?.data) {
                return {
                    assessmentItem: response.data || {},
                    actionFlag: "ASSESSMENT_UPDATE_SUCCESS",
                    success: response.message || "Assessment updated successfully",
                    error: "",
                }
            } else {
                return {
                    assessmentItem: {},
                    actionFlag: "ASSESSMENT_UPDATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to update assessment",
                }
            }
        } catch (error) {
            return {
                assessmentItem: {},
                actionFlag: "ASSESSMENT_UPDATE_ERROR",
                success: "",
                error: error.message || "Network error updating assessment",
            }
        }
    }
)


// ** Slice
export const appAssessmentsSlice = createSlice({
    name: "appAssessments",
    initialState: {
        assessmentItems: [],
        assessmentItem: {},
        pagination: null,
        loading: false,
        success: "",
        error: "",
        actionFlag: "",
    },

    reducers: {
        cleanAssessmentMessages: (state) => {
            state.success = ""
            state.error = ""
            state.actionFlag = ""
        },
        cleanAssessmentState: (state) => {
            state.assessmentItem = initAssessmentItem
        },
    },

    extraReducers: (builder) => {
        builder
            // ** Get List
            .addCase(getAssessmentsList.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getAssessmentsList.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentItems = action.payload.assessmentItems || []
                state.pagination = action.payload.pagination || null
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getAssessmentsList.rejected, (state, action) => {
                state.loading = false
                state.assessmentItems = []
                state.error = action.payload?.error || "Failed to fetch assessments"
                state.actionFlag = "ASSESSMENT_LIST_ERROR"
            })

            // ** Delete Assessment
            .addCase(deleteAssessment.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(deleteAssessment.fulfilled, (state, action) => {
                state.loading = false
                if (action.payload.id) {
                    state.assessmentItems = state.assessmentItems.filter(
                        (item) => item._id !== action.payload.id && item.id !== action.payload.id
                    )
                }
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
                state.deleteSuccess = true;
            })
            .addCase(deleteAssessment.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to delete assessment"
                state.actionFlag = "ASSESSMENT_DELETE_ERROR"
            })
            // ** Create Assessment
            .addCase(createAssessment.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(createAssessment.fulfilled, (state, action) => {
                state.loading = false
                if (action.payload.assessmentItem && Object.keys(action.payload.assessmentItem).length > 0) {
                    state.assessmentItems.unshift(action.payload.assessmentItem)
                }
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(createAssessment.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to create assessment"
                state.actionFlag = "ASSESSMENT_CREATE_ERROR"
            })
            // ** Get Single Assessment by ID
            .addCase(getAssessmentById.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getAssessmentById.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentItem = action.payload.assessmentItem || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getAssessmentById.rejected, (state, action) => {
                state.loading = false
                state.assessmentItem = {}
                state.error = action.payload?.error || "Failed to fetch assessment"
                state.actionFlag = "ASSESSMENT_FETCH_ERROR"
            })
            // ** Update Assessment
            .addCase(updateAssessment.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(updateAssessment.fulfilled, (state, action) => {
                state.loading = false
                // const updatedItem = action.payload.assessmentItem

                // if (updatedItem && (updatedItem._id || updatedItem.id)) {
                //     state.assessmentItems = state.assessmentItems.map((item) =>
                //         item._id === updatedItem._id || item.id === updatedItem.id
                //             ? updatedItem
                //             : item
                //     )
                // }

                state.assessmentItem = action.payload.assessmentItem
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(updateAssessment.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to update assessment"
                state.actionFlag = "ASSESSMENT_UPDATE_ERROR"
            })

    },
})

export const {
    cleanAssessmentMessages,
    cleanAssessmentState,
} = appAssessmentsSlice.actions

export default appAssessmentsSlice.reducer
