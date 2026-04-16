// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Config
import instance from "@src/utility/AxiosConfig"

// ** API Endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

const initSectionItem = {
    id: null,
    assessmentId: null,
    name: "",
    description: "",
    order: null,
    status: "",
}

async function getSectionByQuestionsRequest(assessment_id) {
    return instance
        .get(`${API_ENDPOINTS.sectionAssessment.byQuestions}`, {
            params: { assessment_id }
        }
        )
        .then((res) => res.data)
        .catch((error) => error)
}

async function deleteQuestionRequest(deleteId) {
    return instance
        .delete(`${API_ENDPOINTS.sectionAssessment.deleteQuestion}/${deleteId}`)
        .then((res) => res.data)
        .catch((error) => error)
}

async function deleteSectionRequest(sectionId) {
    return instance
        .delete(`${API_ENDPOINTS.sectionAssessment.sectionDelete}/${sectionId}`)
        .then((res) => res.data)
        .catch((error) => error)
}

async function createSectionRequest(payload) {
    return instance
        .post(API_ENDPOINTS.sectionAssessment.sectionCreate, payload)
        .then((res) => res.data)
        .catch((error) => error)
}

async function updateSectionRequest({ id, payload }) {
    return instance
        .put(`${API_ENDPOINTS.sectionAssessment.sectionUpdate}/${id}`, payload)
        .then((res) => res.data)
        .catch((error) => error)
}

async function updateSectionsOrderRequest({ assessmentId, payload }) {
    return instance
        .put(`${API_ENDPOINTS.sectionAssessment.updateSectionsOrder}/${assessmentId}`, payload)
        .then((res) => res.data)
        .catch((error) => error)
}

async function bulkOrderUpdateRequest(payload) {
    return instance
        .put(API_ENDPOINTS.sectionAssessment.bulkOrderUpdate, payload)
        .then((res) => res.data)
        .catch((error) => error)
}

export const getSectionByQuestions = createAsyncThunk(
    "appSectionAssessment/getSectionByAssessment",
    async (assessment_id) => {
        try {
            const response = await getSectionByQuestionsRequest(assessment_id)
            if (response?.data) {
                return {
                    sectionItems: response.data,
                    pagination: response?._metadata?.pagination || null,
                    actionFlag: "SECTION_LIST_SUCCESS",
                    success: response.message || "Sections fetched successfully",
                    error: "",
                }
            } else {
                return {
                    sectionItems: [],
                    pagination: null,
                    actionFlag: "SECTION_LIST_ERROR",
                    success: "",
                    error: response?.message || "Failed to fetch sections",
                }
            }
        } catch (error) {
            return {
                sectionItems: [],
                pagination: null,
                actionFlag: "SECTION_LIST_ERROR",
                success: "",
                error: error.message || "Network error fetching sections",
            }
        }
    }
)

export const deleteQuestion = createAsyncThunk(
    "appSectionAssessment/deleteQuestion",
    async (id) => {
        try {
            const response = await deleteQuestionRequest(id)
            if (response?.success) {
                return {
                    id,
                    actionFlag: "QUESTION_DELETE_SUCCESS",
                    success: response.message || "Question deleted successfully",
                    error: "",
                }
            } else {
                return {
                    id,
                    actionFlag: "QUESTION_DELETE_ERROR",
                    success: "",
                    error: response?.message || "Failed to delete question",
                }
            }
        } catch (error) {
            return {
                id,
                actionFlag: "QUESTION_DELETE_ERROR",
                success: "",
                error: error.message || "Network error deleting question",
            }
        }
    }
)

export const deleteSection = createAsyncThunk(
    "appSectionAssessment/deleteSection",
    async (id) => {
        try {
            const response = await deleteSectionRequest(id)
            if (response?.success) {
                return {
                    id,
                    actionFlag: "SECTION_DELETE_SUCCESS",
                    success: response.message || "Section deleted successfully",
                    error: "",
                }
            } else {
                return {
                    id,
                    actionFlag: "SECTION_DELETE_ERROR",
                    success: "",
                    error: response?.message || "Failed to delete section",
                }
            }
        } catch (error) {
            return {
                id,
                actionFlag: "SECTION_DELETE_ERROR",
                success: "",
                error: error.message || "Network error deleting section",
            }
        }
    }
)

export const createSection = createAsyncThunk(
    "appSectionAssessment/createSection",
    async (payload) => {
        try {
            const response = await createSectionRequest(payload)
            if (response?.success) {
                return {
                    sectionItem: response.data,
                    actionFlag: "SECTION_CREATE_SUCCESS",
                    success: response.message || "Section created successfully",
                    error: "",
                }
            } else {
                return {
                    actionFlag: "SECTION_CREATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to create section",
                }
            }
        } catch (error) {
            return {
                actionFlag: "SECTION_CREATE_ERROR",
                success: "",
                error: error.response?.data?.message || error.message || "Network error creating section",
            }
        }
    }
)

export const updateSection = createAsyncThunk(
    "appSectionAssessment/updateSection",
    async ({ id, payload }) => {
        try {
            console.log('Update Api in Store', id, payload);

            const response = await updateSectionRequest({ id, payload })

            if (response?.success) {
                return {
                    sectionItem: response.data,
                    actionFlag: "SECTION_UPDATE_SUCCESS",
                    success: response.message || "Section updated successfully",
                    error: "",
                }
            } else {
                return {
                    actionFlag: "SECTION_UPDATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to update section",
                }
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.message ||
                "Network error updating section"

            return {
                actionFlag: "SECTION_UPDATE_ERROR",
                success: "",
                error: msg,
            }
        }
    }
)

export const bulkOrderUpdate = createAsyncThunk(
    "appSectionAssessment/bulkOrderUpdate",
    async (payload) => {
        try {
            const response = await bulkOrderUpdateRequest(payload)

            if (response?.data) {
                return {
                    updatedItems: response.data,
                    actionFlag: "QUESTION_BULK_ORDER_UPDATE_SUCCESS",
                    success: response.message || "Order updated successfully",
                    error: "",
                }
            } else {
                return {
                    actionFlag: "QUESTION_BULK_ORDER_UPDATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to update order",
                }
            }
        } catch (error) {
            return {
                actionFlag: "QUESTION_BULK_ORDER_UPDATE_ERROR",
                success: "",
                error:
                    error.response?.data?.message ||
                    error.message ||
                    "Network error updating order",
            }
        }
    }
)

export const updateSectionsOrder = createAsyncThunk(
    "appSectionAssessment/updateSectionsOrder",
    async ({ assessmentId, payload }) => {
        try {
            const response = await updateSectionsOrderRequest({ assessmentId, payload })

            if (response?.success) {
                return {
                    updatedSections: response.data,
                    actionFlag: "SECTIONS_ORDER_UPDATE_SUCCESS",
                    success: response.message || "Sections order updated successfully",
                    error: "",
                }
            } else {
                return {
                    actionFlag: "SECTIONS_ORDER_UPDATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to update sections order",
                }
            }
        } catch (error) {
            return {
                actionFlag: "SECTIONS_ORDER_UPDATE_ERROR",
                success: "",
                error:
                    error.response?.data?.message ||
                    error.message ||
                    "Network error updating sections order",
            }
        }
    }
)

export const appSectionAssessmentSlice = createSlice({
    name: "appSectionAssessment",
    initialState: {
        sectionItems: [],
        sectionItem: {},
        pagination: null,
        loading: false,
        success: "",
        error: "",
        actionFlag: "",
    },

    reducers: {
        cleanSectionMessages: (state) => {
            state.success = ""
            state.error = ""
            state.actionFlag = ""
        },
        cleanSectionState: (state) => {
            state.sectionItem = initSectionItem
        },
    },

    extraReducers: (builder) => {
        builder
            // ** Get List
            .addCase(getSectionByQuestions.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getSectionByQuestions.fulfilled, (state, action) => {
                state.loading = false
                state.sectionItems = action.payload.sectionItems || []
                state.pagination = action.payload.pagination
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getSectionByQuestions.rejected, (state, action) => {
                state.loading = false
                state.sectionItems = []
                state.error = action.payload?.error || "Failed to fetch sections"
                state.actionFlag = "SECTION_LIST_ERROR"
            })
            // ✅ Delete Question Cases
            .addCase(deleteQuestion.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(deleteQuestion.fulfilled, (state, action) => {
                state.loading = false
                // Remove the deleted question from nested sectionItems (if you want)
                // state.sectionItems = state.sectionItems.map((section) => ({
                //     ...section,
                //     questions: section.questions?.filter(
                //         (q) => q.id !== action.payload.id
                //     ),
                // }))
                state.sectionItems = action.payload.sectionItems
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(deleteQuestion.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to delete question"
                state.actionFlag = "QUESTION_DELETE_ERROR"
            })
            .addCase(deleteSection.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(deleteSection.fulfilled, (state, action) => {
                state.loading = false
                // state.sectionItems = state.sectionItems.filter(
                //     (section) => section.id !== action.payload.id
                // )
                state.sectionItems = action.payload.sectionItems
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(deleteSection.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to delete section"
                state.actionFlag = "SECTION_DELETE_ERROR"
            })
            .addCase(createSection.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(createSection.fulfilled, (state, action) => {
                state.loading = false
                // state.sectionItems = [...state.sectionItems, action.payload.sectionItem]
                state.sectionItem = action.payload.sectionItem
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(createSection.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to create section"
                state.actionFlag = action.payload?.actionFlag || "SECTION_CREATE_ERROR"
            })
            .addCase(updateSection.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(updateSection.fulfilled, (state, action) => {
                state.loading = false
                state.sectionItem = action.payload.sectionItem
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(updateSection.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to update section"
                state.actionFlag = action.payload?.actionFlag || "SECTION_UPDATE_ERROR"
            })
            .addCase(bulkOrderUpdate.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(bulkOrderUpdate.fulfilled, (state, action) => {
                state.loading = false
                state.sectionItems = action.payload.updatedItems || state.sectionItems
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(bulkOrderUpdate.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to update order"
                state.actionFlag = action.payload?.actionFlag || "QUESTION_BULK_ORDER_UPDATE_ERROR"
            })
            .addCase(updateSectionsOrder.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(updateSectionsOrder.fulfilled, (state, action) => {
                state.loading = false
                state.sectionItems = action.payload.updatedSections || state.sectionItems
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(updateSectionsOrder.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to update sections order"
                state.actionFlag = action.payload?.actionFlag || "SECTIONS_ORDER_UPDATE_ERROR"
            })

    },
})

export const { cleanSectionMessages, cleanSectionState } = appSectionAssessmentSlice.actions
export default appSectionAssessmentSlice.reducer
