// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Config
import instance from "@src/utility/AxiosConfig"
import { API_ENDPOINTS } from "../../../../utility/ApiEndPoints"


async function getSectionDropdownRequest(id) {
    return instance
        .get(`${API_ENDPOINTS.questionAssessment.sectionDropdown}`, {
            params: { assessment_id: id }
        })
        .then((res) => res.data)
        .catch((error) => error)
}

async function createQuestionRequest(payload) {
    return instance
        .post(API_ENDPOINTS.questionAssessment.createQuestion, payload) 
        .then((res) => res.data)
        .catch((error) => error)
}

async function getQuestionByIdRequest(id) {
    return instance
        .get(`${API_ENDPOINTS.questionAssessment.getQuestion}/${id}`)
        .then((res) => res.data)
        .catch((error) => error)
}

async function updateQuestionRequest(id, payload) {
    return instance
        .put(`${API_ENDPOINTS.questionAssessment.updateQuestion}/${id}`, payload)
        .then((res) => res.data)
        .catch((error) => error)
}

export const getSectionDropdown = createAsyncThunk(
    "appSectionAssessment/createSectionDropdown",
    async (id) => {
        try {
            const response = await getSectionDropdownRequest(id)
            if (response?.data) {
                return {
                    dropdownItem: response?.data,
                    actionFlag: "SECTION_DROPDOWN_CREATE_SUCCESS",
                    success: response.message || "Dropdown created successfully",
                    error: "",
                }
            }
            return {
                actionFlag: "SECTION_DROPDOWN_CREATE_ERROR",
                success: "",
                error: response?.message || "Failed to create dropdown",
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.message ||
                "Network error creating dropdown"

            return {
                actionFlag: "SECTION_DROPDOWN_CREATE_ERROR",
                success: "",
                error: msg,
            }
        }
    }
)

export const createQuestion = createAsyncThunk(
    "appSectionAssessment/createQuestion",
    async (payload) => {
        try {
            const response = await createQuestionRequest(payload)

            if (response?.data) {
                return {
                    question: response.data,
                    actionFlag: "QUESTION_CREATE_SUCCESS",
                    success: response.message || "Question created successfully",
                    error: "",
                }
            }
            return {
                actionFlag: "QUESTION_CREATE_ERROR",
                success: "",
                error: response?.message || "Failed to create question",
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.message ||
                "Network error creating question"

            return {
                actionFlag: "QUESTION_CREATE_ERROR",
                success: "",
                error: msg,
            }
        }
    }
)

export const getQuestionById = createAsyncThunk(
    "appSectionAssessment/getQuestionById",
    async (id) => {
        try {
            const response = await getQuestionByIdRequest(id)

            if (response?.data) {
                return {
                    questionItem: response.data,
                    actionFlag: "QUESTION_GET_SUCCESS",
                    success: response.message || "Question fetched successfully",
                    error: "",
                }
            }

            return {
                actionFlag: "QUESTION_GET_ERROR",
                success: "",
                error: response?.message || "Failed to fetch question",
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.message ||
                "Network error fetching question"

            return {
                actionFlag: "QUESTION_GET_ERROR",
                success: "",
                error: msg,
            }
        }
    }
)

export const updateQuestion = createAsyncThunk(
    "appSectionAssessment/updateQuestion",
    async ({ id, payload }) => {
        try {
            const response = await updateQuestionRequest(id, payload)

            if (response?.data) {
                return {
                    updatedQuestion: response.data,
                    actionFlag: "QUESTION_UPDATE_SUCCESS",
                    success: response.message || "Question updated successfully",
                    error: "",
                }
            }

            return {
                actionFlag: "QUESTION_UPDATE_ERROR",
                success: "",
                error: response?.message || "Failed to update question",
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.message ||
                "Network error updating question"

            return {
                actionFlag: "QUESTION_UPDATE_ERROR",
                success: "",
                error: msg,
            }
        }
    }
)

const initialState = {
    dropdownItem: null,
    loading: false,
    questionItem: null,
    success: "",
    error: "",
    actionFlag: "",
}

export const questionSectionSlice = createSlice({
    name: "appSectionDropdown",
    initialState,
    reducers: {
        cleanDropdownMessages: (state) => {
            state.success = ""
            state.error = ""
            state.actionFlag = ""
        },
        resetDropdownItem: (state) => {
            state.dropdownItem = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSectionDropdown.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getSectionDropdown.fulfilled, (state, action) => {
                state.loading = false
                state.dropdownItem = action.payload.dropdownItem
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getSectionDropdown.rejected, (state, action) => {
                state.loading = false
                state.dropdownItem = null
                state.success = action.payload?.success ?? ""
                state.error = action.payload?.error ?? "Failed to create dropdown"
                state.actionFlag = action.payload?.actionFlag ?? "SECTION_DROPDOWN_CREATE_ERROR"
            })
            .addCase(createQuestion.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(createQuestion.fulfilled, (state, action) => {
                state.loading = false
                state.question = action.payload.question ?? null
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(createQuestion.rejected, (state, action) => {
                state.loading = false
                state.question = null
                state.success = action.payload?.success ?? ""
                state.error = action.payload?.error ?? "Failed to create question"
                state.actionFlag = action.payload?.actionFlag ?? "QUESTION_CREATE_ERROR"
            })
            .addCase(getQuestionById.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getQuestionById.fulfilled, (state, action) => {
                state.loading = false
                state.questionItem = action.payload.questionItem ?? null
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getQuestionById.rejected, (state, action) => {
                state.loading = false
                state.questionItem = null
                state.success = action.payload?.success ?? ""
                state.error = action.payload?.error ?? "Failed to fetch question"
                state.actionFlag = action.payload?.actionFlag ?? "QUESTION_GET_ERROR"
            })
            .addCase(updateQuestion.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(updateQuestion.fulfilled, (state, action) => {
                state.loading = false
                state.questionItem = action.payload.updatedQuestion ?? null
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(updateQuestion.rejected, (state, action) => {
                state.loading = false
                state.success = action.payload?.success ?? ""
                state.error = action.payload?.error ?? "Failed to update question"
                state.actionFlag = action.payload?.actionFlag ?? "QUESTION_UPDATE_ERROR"
            })

    },
})

export const { cleanDropdownMessages, resetDropdownItem } = questionSectionSlice.actions
export default questionSectionSlice.reducer