/* eslint-disable no-return-assign */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import instance from "@src/utility/AxiosConfig"
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"
import { IdCard } from "lucide-react";

const initAssessmentReport = {
    id: null,
    assessment_id: "",
    report_data: "",
    status: ""
}

async function createAssessmentReportRequest(id, data) {
    const url = id
        ? `${API_ENDPOINTS.assessmentReport.createReport}?tenant_id=${id}`
        : `${API_ENDPOINTS.assessmentReport.createReport}`; // no tenant_id

    return instance
        .post(url, data)
        .then(res => res.data)
        .catch(error => error)
}

async function verifyAssessmentReportRequest(id, data) {
    const url = id
        ? `${API_ENDPOINTS.assessmentReport.verify}?tenant_id=${id}`
        : `${API_ENDPOINTS.assessmentReport.verify}`; // no tenant_id

    return instance
        .post(url, data)
        .then(res => res.data)
        .catch(error => error)
}

async function getAssessmentReportsListRequest(data) {
    return instance
        .get(`${API_ENDPOINTS.assessmentReport.reportlist}`, { params: data })
        .then(res => res.data)
        .catch(error => error)
}

async function deleteAssessmentReportRequest(id) {
    return instance
        .delete(`${API_ENDPOINTS.assessmentReport.deleteReport}/${id}`)
        .then(res => res.data)
        .catch(error => error)
}

async function getAssessmentReportByIdRequest(id, tentanId) {
    console.log('tenatid getAssessmentReportByIdRequest ==>', tentanId);
    console.log('id getAssessmentReportByIdRequest', id);

    const url = tentanId
        ? `${API_ENDPOINTS.assessmentReport.getReportByID}/${id}?tenant_id=${tentanId}`
        : `${API_ENDPOINTS.assessmentReport.getReportByID}/${id}`; // no tenant_id

    return instance
        .get(url)
        .then(res => res.data)
        .catch(error => error)
}

async function updateAssessmentReportRequest(id, data) {
    console.log('data ==>', data);

    const url = id
        ? `${API_ENDPOINTS.assessmentReport.updateEmail}/${data.reportId}?tenant_id=${id}`
        : `${API_ENDPOINTS.assessmentReport.updateEmail}/${data.reportId}`; // no tenant_id

    return instance
        .put(url, data)
        .then(res => res.data)
        .catch(error => error)
}

async function getAssessmentReportQuestionsRequest(params) {
    return instance
        .get(API_ENDPOINTS.assessmentReport.getQuestionsByReport, { params })
        .then(res => res.data)
        .catch(error => error)
}

export const createAssessmentReport = createAsyncThunk(
    "assessmentReports/createAssessmentReport",
    async ({ id, data }) => {
        try {

            const response = await createAssessmentReportRequest(id, data)

            if (response?.data) {
                return {
                    assessmentReport: response.data,
                    actionFlag: "ASSESSMENT_REPORT_CREATE_SUCCESS",
                    success: response.message || "Assessment report created successfully",
                    error: ""
                }
            } else {
                return {
                    assessmentReport: {},
                    actionFlag: "ASSESSMENT_REPORT_CREATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to create assessment report"
                }
            }
        } catch (error) {
            return {
                assessmentReport: {},
                actionFlag: "ASSESSMENT_REPORT_CREATE_ERROR",
                success: "",
                error: error.message || "Network error creating assessment report"
            }
        }
    }
)

export const verifyAssessmentReport = createAsyncThunk(
    "assessmentReports/verifyAssessmentReport",
    async ({ id, data }) => {
        try {

            const response = await verifyAssessmentReportRequest(id, data)

            if (response?.data) {
                return {
                    assessmentReport: response.data,
                    actionFlag: "ASSESSMENT_REPORT_VERIFY_SUCCESS",
                    success: response.message || "Assessment report verified successfully",
                    error: ""
                }
            } else {
                return {
                    assessmentReport: {},
                    actionFlag: "ASSESSMENT_REPORT_VERIFY_ERROR",
                    success: "",
                    error: response?.message || "Failed to verify assessment report"
                }
            }
        } catch (error) {
            return {
                assessmentReport: {},
                actionFlag: "ASSESSMENT_REPORT_VERIFY_ERROR",
                success: "",
                error: error.message || "Network error verifying assessment report"
            }
        }
    }
)

export const getAssessmentReportsList = createAsyncThunk(
    "assessmentReports/getAssessmentReportsList",
    async (params) => {
        try {
            const response = await getAssessmentReportsListRequest(params)
            console.log('getAssessmentReportsList response ==>', response);

            if (response?.data) {
                return {
                    list: response.data,
                    pagination: response?._metadata?.pagination || null,   // <-- added
                    actionFlag: "ASSESSMENT_REPORT_LIST_SUCCESS",
                    success: response.message || "Assessment report list fetched successfully",
                    error: ""
                }
            } else {
                return {
                    list: [],
                    pagination: null,   // <-- added
                    actionFlag: "ASSESSMENT_REPORT_LIST_ERROR",
                    success: "",
                    error: response?.message || "Failed to fetch assessment report list"
                }
            }
        } catch (error) {
            return {
                list: [],
                pagination: null,  // <-- added
                actionFlag: "ASSESSMENT_REPORT_LIST_ERROR",
                success: "",
                error: error.message || "Network error fetching assessment reports"
            }
        }
    }
)

export const deleteAssessmentReport = createAsyncThunk(
    "assessmentReports/deleteAssessmentReport",
    async (id) => {
        try {
            const response = await deleteAssessmentReportRequest(id)

            if (response?.data) {
                return {
                    actionFlag: "ASSESSMENT_REPORT_DELETE_SUCCESS",
                    success: response.message || "Assessment report deleted successfully",
                    error: "",
                    deletedId: id
                }
            } else {
                return {
                    actionFlag: "ASSESSMENT_REPORT_DELETE_ERROR",
                    success: "",
                    error: response?.message || "Failed to delete assessment report",
                    deletedId: null
                }
            }
        } catch (error) {
            return {
                actionFlag: "ASSESSMENT_REPORT_DELETE_ERROR",
                success: "",
                error: error.message || "Network error deleting assessment report",
                deletedId: null
            }
        }
    }
)

export const getAssessmentReportById = createAsyncThunk(
    "assessmentReports/getAssessmentReportById",
    async ({ id, tenantID }) => {
        // console.log('getAssessmentReportById ID store',id);

        try {
            const response = await getAssessmentReportByIdRequest(id, tenantID)

            if (response?.data) {
                return {
                    assessmentReport: response.data,
                    actionFlag: "ASSESSMENT_REPORT_GET_BY_ID_SUCCESS",
                    success: response.message || "Assessment report fetched successfully",
                    error: ""
                }
            } else {
                return {
                    assessmentReport: {},
                    actionFlag: "ASSESSMENT_REPORT_GET_BY_ID_ERROR",
                    success: "",
                    error: response?.message || "Failed to fetch assessment report"
                }
            }
        } catch (error) {
            return {
                assessmentReport: {},
                actionFlag: "ASSESSMENT_REPORT_GET_BY_ID_ERROR",
                success: "",
                error: error.message || "Network error fetching assessment report"
            }
        }
    }
)

export const getAssessmentReportQuestions = createAsyncThunk(
    "assessmentReports/getAssessmentReportQuestions",
    async (id, params) => {
        try {
            const response = await getAssessmentReportQuestionsRequest(id, params)

            if (response?.data) {
                return {
                    questions: response.data,
                    actionFlag: "ASSESSMENT_REPORT_QUESTIONS_SUCCESS",
                    success: response.message || "Assessment report questions fetched successfully",
                    error: ""
                }
            } else {
                return {
                    questions: [],
                    actionFlag: "ASSESSMENT_REPORT_QUESTIONS_ERROR",
                    success: "",
                    error: response?.message || "Failed to fetch assessment report questions"
                }
            }
        } catch (error) {
            return {
                questions: [],
                actionFlag: "ASSESSMENT_REPORT_QUESTIONS_ERROR",
                success: "",
                error: error.message || "Network error fetching assessment report questions"
            }
        }
    }
)

export const updateAssessmentEmail = createAsyncThunk(
    "assessmentReports/updateAssessmentReport",
    async ({ id, data }) => {
        try {
            console.log('updateAssessmentEmail id, data', data);

            const response = await updateAssessmentReportRequest(id, data)

            if (response?.data) {
                return {
                    assessmentReport: response.data,
                    actionFlag: "ASSESSMENT_REPORT_UPDATE_SUCCESS",
                    success: response.message || "Assessment report updated successfully",
                    error: ""
                }
            } else {
                return {
                    assessmentReport: {},
                    actionFlag: "ASSESSMENT_REPORT_UPDATE_ERROR",
                    success: "",
                    error: response?.message || "Failed to update assessment report"
                }
            }
        } catch (error) {
            return {
                assessmentReport: {},
                actionFlag: "ASSESSMENT_REPORT_UPDATE_ERROR",
                success: "",
                error: error.message || "Network error updating assessment report"
            }
        }
    }
)

async function getSingleAssessmentReportRequest(id) {
    const url = `${API_ENDPOINTS.assessmentReport.getSingleReport}/${id}`;

    return instance
        .get(url)
        .then(res => res.data)
        .catch(error => error)
}

export const getSingleAssessmentReport = createAsyncThunk(
    "assessmentReports/getSingleAssessmentReport",
    async (id) => {
        try {
            const response = await getSingleAssessmentReportRequest(id)

            if (response?.data) {
                return {
                    singleReport: response.data,
                    actionFlag: "GET_SINGLE_REPORT_SUCCESS",
                    success: response.message || "Report fetched successfully",
                    error: ""
                }
            } else {
                return {
                    singleReport: {},
                    actionFlag: "GET_SINGLE_REPORT_ERROR",
                    success: "",
                    error: response?.message || "Failed to fetch report"
                }
            }
        } catch (error) {
            return {
                singleReport: {},
                actionFlag: "GET_SINGLE_REPORT_ERROR",
                success: "",
                error: error.message || "Network error fetching report"
            }
        }
    }
)


export const assessmentReportsSlice = createSlice({
    name: "assessmentReports",

    initialState: {
        assessmentReport: {},
        loading: false,
        success: "",
        pagination: null,
        error: "",
        actionFlag: "",
        assessmentReportsList: [],
        questions: [],
    },

    reducers: {
        cleanAssessmentReportMessages: (state) => {
            state.success = ""
            state.error = ""
            state.actionFlag = ""
        },

        cleanAssessmentReportState: (state) => {
            state.assessmentReport = initAssessmentReport
        }
    },

    extraReducers: (builder) => {
        builder
            .addCase(createAssessmentReport.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(createAssessmentReport.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentReport = action.payload.assessmentReport || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(createAssessmentReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.error || "Failed to create assessment report";
                state.actionFlag = "ASSESSMENT_REPORT_CREATE_ERROR";
            })
            .addCase(verifyAssessmentReport.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(verifyAssessmentReport.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentReport = action.payload.assessmentReport || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(verifyAssessmentReport.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to verify assessment report"
                state.actionFlag = "ASSESSMENT_REPORT_VERIFY_ERROR"
            })
            .addCase(getAssessmentReportsList.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getAssessmentReportsList.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentReportsList = action.payload.list || []
                state.pagination = action.payload.pagination || null   // <-- add this
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getAssessmentReportsList.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to fetch assessment report list"
                state.actionFlag = "ASSESSMENT_REPORT_LIST_ERROR"
            })
            .addCase(deleteAssessmentReport.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(deleteAssessmentReport.fulfilled, (state, action) => {
                state.loading = false
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
                state.assessmentReportsList = action.payload.assessmentReportsList
            })
            .addCase(deleteAssessmentReport.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to delete assessment report"
                state.actionFlag = "ASSESSMENT_REPORT_DELETE_ERROR"
            })
            .addCase(getAssessmentReportById.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getAssessmentReportById.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentReport = action.payload.assessmentReport || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getAssessmentReportById.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to fetch assessment report"
                state.actionFlag = "ASSESSMENT_REPORT_GET_BY_ID_ERROR"
            })
            .addCase(getAssessmentReportQuestions.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(getAssessmentReportQuestions.fulfilled, (state, action) => {
                state.loading = false
                state.questions = action.payload.questions || []
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(getAssessmentReportQuestions.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to fetch assessment report questions"
                state.actionFlag = "ASSESSMENT_REPORT_QUESTIONS_ERROR"
            })
            .addCase(updateAssessmentEmail.pending, (state) => {
                state.loading = true
                state.success = ""
                state.error = ""
                state.actionFlag = ""
            })
            .addCase(updateAssessmentEmail.fulfilled, (state, action) => {
                state.loading = false
                state.assessmentReport = action.payload.assessmentReport || {}
                state.success = action.payload.success
                state.error = action.payload.error
                state.actionFlag = action.payload.actionFlag
            })
            .addCase(updateAssessmentEmail.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload?.error || "Failed to update assessment report"
                state.actionFlag = "ASSESSMENT_REPORT_UPDATE_ERROR"
            })
            .addCase(getSingleAssessmentReport.pending, (state) => {
                state.loading = true;
                state.success = "";
                state.error = "";
                state.actionFlag = "";
            })
            .addCase(getSingleAssessmentReport.fulfilled, (state, action) => {
                state.loading = false;
                state.assessmentReport = action.payload.singleReport || {};
                state.success = action.payload.success;
                state.error = action.payload.error;
                state.actionFlag = action.payload.actionFlag;
            })
            .addCase(getSingleAssessmentReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.error || "Failed to fetch report";
                state.actionFlag = "GET_SINGLE_REPORT_ERROR";
            })

    }
})

export const {
    cleanAssessmentReportMessages,
    cleanAssessmentReportState
} = assessmentReportsSlice.actions

export default assessmentReportsSlice.reducer
