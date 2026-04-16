import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import instance from "@src/utility/AxiosConfig"
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// Initial data structure
const initAnswer = {
    id: null,
    question_id: "",
    answer: "",
    assessment_id: "",
    assessment_report_id: ""
}

async function createAnswerRequest(id, data) {
    const url = id
        ? `${API_ENDPOINTS.questionCrud.createQuestion}?tenant_id=${id}`
        : `${API_ENDPOINTS.questionCrud.createQuestion}`; // no tenant_id

    return instance
        .post(url, data)
        .then((res) => res.data)
        .catch((error) => error)
}

async function updateAnswerRequest(id, data) {

    const url = id
        ? `${API_ENDPOINTS.questionCrud.updateQuestion}/${data._id}?tenant_id=${id}`
        : `${API_ENDPOINTS.questionCrud.updateQuestion}/${data._id}`; // no tenant_id

    return instance
        .put(url, data)
        .then((res) => {
            console.log('UPDATE REQUEST RES', res.data);

            return res.data
        })
        .catch((error) => {
            console.log('UPDATE REQUEST ERROR', error);

            return error
        })
}

export const createAnswer = createAsyncThunk(
    "answer/createAnswer",
    async ({ id, data }) => {
        try {
            const response = await createAnswerRequest(id, data)

            if (response?.data) {
                return {
                    answer: response.data,
                    actionFlag: "ANSWER_CREATE_SUCCESS",
                    success: response.message || "Answer created successfully",
                    error: ""
                }
            } else {
                return {
                    answer: {},
                    actionFlag: "ANSWER_CREATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to create answer"
                }
            }
        } catch (error) {
            return {
                answer: {},
                actionFlag: "ANSWER_CREATE_ERROR",
                success: "",
                error: error.message || "Network error creating answer"
            }
        }
    }
)

export const updateAnswer = createAsyncThunk(
    "answer/updateAnswer",
    async ({ id, data }) => {
        try {
            // console.log('updateAnswer payload', payload);

            const response = await updateAnswerRequest(id, data)

            if (response?.data) {
                return {
                    answer: response.data,
                    actionFlag: "ANSWER_UPDATE_SUCCESS",
                    success: response.message || "Answer updated successfully",
                    error: ""
                }
            } else {
                return {
                    answer: {},
                    actionFlag: "ANSWER_UPDATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to update answer"
                }
            }
        } catch (error) {
            return {
                answer: {},
                actionFlag: "ANSWER_UPDATE_ERROR",
                success: "",
                error: error.message || "Network error updating answer"
            }
        }
    }
)

export const answerSlice = createSlice({
    name: "answer",

    initialState: {
        answer: {},
        loading: false,
        success: "",
        error: "",
        actionFlag: ""
    },

    reducers: {
        cleanAnswerMessages: (state) => {
            state.success = ""
            state.error = ""
            state.actionFlag = ""
        },

        cleanAnswerState: (state) => {
            state.answer = initAnswer
        }
    },

    extraReducers: (builder) => {
        builder
            .addCase(createAnswer.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(createAnswer.fulfilled, (state, action) => {
                state.loading = false
                state.answer = action.payload.answer || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(createAnswer.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to create answer"
                state.actionFlag = "ANSWER_CREATE_ERROR"
            })
            .addCase(updateAnswer.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(updateAnswer.fulfilled, (state, action) => {
                state.loading = false
                state.answer = action.payload.answer || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(updateAnswer.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to update answer"
                state.actionFlag = "ANSWER_UPDATE_ERROR"
            })
    }
})

export const {
    cleanAnswerMessages,
    cleanAnswerState
} = answerSlice.actions

export default answerSlice.reducer
