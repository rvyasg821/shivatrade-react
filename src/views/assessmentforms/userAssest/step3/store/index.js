import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import instance from "@src/utility/AxiosConfig"
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

const initQuestionAnswer = {
    id: null,
    question_id: "",
    answer: "",
    assessment_report_id: ""
}

async function getQuestionAnswerRequest(id, data) {
    const url = id
        ? `${API_ENDPOINTS.questionAnswer.getQuestion}?tenant_id=${id}`
        : `${API_ENDPOINTS.questionAnswer.getQuestion}`; // no tenant_id

    return instance
        .get(url, {
            params: data
        })
        .then(res => res.data)
        .catch(error => error)
}

export const getQuestionAnswer = createAsyncThunk(
    "questionAnswer/createQuestionAnswer",
    async ({ id, data }) => {
        try {
            const response = await getQuestionAnswerRequest(id, data)

            if (response?.data) {
                return {
                    questionAnswer: response.data,
                    actionFlag: "QUESTION_ANSWER_CREATE_SUCCESS",
                    success: response.message || "Question answer created successfully",
                    error: ""
                }
            } else {
                return {
                    questionAnswer: {},
                    actionFlag: "QUESTION_ANSWER_CREATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to create question answer"
                }
            }
        } catch (error) {
            return {
                questionAnswer: {},
                actionFlag: "QUESTION_ANSWER_CREATE_ERROR",
                success: "",
                error: error.message || "Network error creating question answer"
            }
        }
    }
)

async function generatePdfRequest(id, data) {
    const url = id
        ? `${API_ENDPOINTS.assessmentReport.generatePdf}?tenant_id=${id}`
        : `${API_ENDPOINTS.assessmentReport.generatePdf}`; // no tenant_id

    return instance
        .post(url, data)
        .then(res => res.data)
        .catch(error => error)
}

export const generatePdf = createAsyncThunk(
    "assessmentReport/generatePdf",
    async ({ id, data }) => {
        try {
            const response = await generatePdfRequest(id, data)

            if (response?.data) {
                return {
                    pdfData: response.data,
                    actionFlag: "GENERATE_PDF_SUCCESS",
                    success: response.message || "PDF generated successfully",
                    error: ""
                }
            } else {
                return {
                    pdfData: null,
                    actionFlag: "GENERATE_PDF_ERROR",
                    success: "",
                    error: response?.message || "Failed to generate PDF"
                }
            }
        } catch (error) {
            return {
                pdfData: null,
                actionFlag: "GENERATE_PDF_ERROR",
                success: "",
                error: error.message || "Network error generating PDF"
            }
        }
    }
)

async function generatePdfEmailRequest(id, data) {
    const url = id
        ? `${API_ENDPOINTS.assessmentReport.generatePdfEmail}?tenant_id=${id}`
        : `${API_ENDPOINTS.assessmentReport.generatePdfEmail}`; // no tenant_id

    return instance
        .post(url, data)
        .then(res => res.data)
        .catch(error => error)
}

export const generatePdfEmail = createAsyncThunk(
    "assessmentReport/generatePdfEmail",
    async ({ id, data }) => {
        try {
            const response = await generatePdfEmailRequest(id, data)

            if (response?.data) {
                return {
                    pdfEmailData: response.data,
                    actionFlag: "GENERATE_PDF_EMAIL_SUCCESS",
                    success: response.message || "PDF emailed successfully",
                    error: ""
                }
            } else {
                return {
                    pdfEmailData: null,
                    actionFlag: "GENERATE_PDF_EMAIL_ERROR",
                    success: "",
                    error: response?.message || "Failed to send PDF email"
                }
            }
        } catch (error) {
            return {
                pdfEmailData: null,
                actionFlag: "GENERATE_PDF_EMAIL_ERROR",
                success: "",
                error: error.message || "Network error sending PDF email"
            }
        }
    }
)

export const questionAnswerSlice = createSlice({
    name: "questionAnswer",

    initialState: {
        questionAnswer: {},
        loading: false,
        success: "",
        error: "",
        actionFlag: ""
    },

    reducers: {
        cleanQuestionAnswerMessages: (state) => {
            state.success = ""
            state.error = ""
            state.actionFlag = ""
        },

        cleanQuestionAnswerState: (state) => {
            state.questionAnswer = initQuestionAnswer
        }
    },

    extraReducers: (builder) => {
        builder
            .addCase(getQuestionAnswer.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getQuestionAnswer.fulfilled, (state, action) => {
                state.loading = false
                state.questionAnswer = action.payload.questionAnswer || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getQuestionAnswer.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to create question answer"
                state.actionFlag = "QUESTION_ANSWER_CREATE_ERROR"
            })
            .addCase(generatePdfEmail.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(generatePdfEmail.fulfilled, (state, action) => {
                state.loading = false
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(generatePdfEmail.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to send PDF email"
                state.actionFlag = "GENERATE_PDF_EMAIL_ERROR"
            })
    }
})

export const {
    cleanQuestionAnswerMessages,
    cleanQuestionAnswerState
} = questionAnswerSlice.actions

export default questionAnswerSlice.reducer
