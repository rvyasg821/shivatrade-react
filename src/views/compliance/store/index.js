import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboard = createAsyncThunk('compliance/getDashboard', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.compliance.dashboard, { params })
  return res.data
})

// ── Immigration ───────────────────────────────────────────────────────────────

export const getImmigrationList = createAsyncThunk('compliance/getImmigrationList', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.compliance.immigrationList, { params })
  return res.data
})

export const getImmigrationByUser = createAsyncThunk('compliance/getImmigrationByUser', async (userId) => {
  const res = await instance.get(`${API_ENDPOINTS.compliance.immigrationUser}/${userId}`)
  return res.data
})

export const createImmigration = createAsyncThunk('compliance/createImmigration', async (data) => {
  const res = await instance.post(API_ENDPOINTS.compliance.immigrationCreate, data)
  return res.data
})

export const updateImmigration = createAsyncThunk('compliance/updateImmigration', async ({ id, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.compliance.immigrationUpdate}/${id}`, data)
  return res.data
})

export const deleteImmigration = createAsyncThunk('compliance/deleteImmigration', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.compliance.immigrationDelete}/${id}`)
  return res.data
})

export const getExpiringVisas = createAsyncThunk('compliance/getExpiringVisas', async (days = 90) => {
  const res = await instance.get(API_ENDPOINTS.compliance.immigrationExpiring, { params: { days } })
  return res.data
})

// ── RTW Checks ────────────────────────────────────────────────────────────────

export const getRtwList = createAsyncThunk('compliance/getRtwList', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.compliance.rtwList, { params })
  return res.data
})

export const createRtwCheck = createAsyncThunk('compliance/createRtwCheck', async (data) => {
  const res = await instance.post(API_ENDPOINTS.compliance.rtwCreate, data)
  return res.data
})

export const updateRtwCheck = createAsyncThunk('compliance/updateRtwCheck', async ({ id, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.compliance.rtwUpdate}/${id}`, data)
  return res.data
})

export const deleteRtwCheck = createAsyncThunk('compliance/deleteRtwCheck', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.compliance.rtwDelete}/${id}`)
  return res.data
})

// ── Compliance Events ─────────────────────────────────────────────────────────

export const getEventList = createAsyncThunk('compliance/getEventList', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.compliance.eventList, { params })
  return res.data
})

export const createEvent = createAsyncThunk('compliance/createEvent', async (data) => {
  const res = await instance.post(API_ENDPOINTS.compliance.eventCreate, data)
  return res.data
})

export const updateEvent = createAsyncThunk('compliance/updateEvent', async ({ id, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.compliance.eventUpdate}/${id}`, data)
  return res.data
})

export const reportEvent = createAsyncThunk('compliance/reportEvent', async ({ id, data }) => {
  const res = await instance.post(`${API_ENDPOINTS.compliance.eventReport}/${id}`, data)
  return res.data
})

export const markEventNotApplicable = createAsyncThunk('compliance/markEventNotApplicable', async (id) => {
  const res = await instance.post(`${API_ENDPOINTS.compliance.eventNotApplicable}/${id}`, {})
  return res.data
})

export const deleteEvent = createAsyncThunk('compliance/deleteEvent', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.compliance.eventDelete}/${id}`)
  return res.data
})

// ── Audit Log ─────────────────────────────────────────────────────────────────

export const getAuditLog = createAsyncThunk('compliance/getAuditLog', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.compliance.auditList, { params })
  return res.data
})

// ── Compliance Settings ──────────────────────────────────────────────────────

export const getComplianceSettings = createAsyncThunk('compliance/getSettings', async () => {
  const res = await instance.get(API_ENDPOINTS.compliance.settingsGet)
  return res.data
})

export const updateComplianceSettings = createAsyncThunk('compliance/updateSettings', async (data) => {
  const res = await instance.put(API_ENDPOINTS.compliance.settingsUpdate, data)
  return res.data
})

// ── Slice ─────────────────────────────────────────────────────────────────────

const complianceSlice = createSlice({
  name: 'compliance',
  initialState: {
    dashboard: null,
    immigrationList: [],
    expiringVisas: [],
    rtwList: [],
    eventList: [],
    eventTotal: 0,
    auditLog: [],
    actionFlag: '',
    loading: false,
    error: null,
  },
  reducers: {
    clearComplianceActionFlag(state) {
      state.actionFlag = ''
      state.error = null
    },
  },
  extraReducers: (builder) => {
    const handle = (thunk, flag) => {
      builder
        .addCase(thunk.pending, (state) => { state.loading = true; state.error = null })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false
          state.actionFlag = flag
          const d = action.payload?.data
          if (flag === 'GET_DASHBOARD') state.dashboard = d
          else if (flag === 'GET_IMMIGRATION') state.immigrationList = d ?? []
          else if (flag === 'GET_EXPIRING') state.expiringVisas = d ?? []
          else if (flag === 'GET_RTW') state.rtwList = d ?? []
          else if (flag === 'GET_EVENTS') {
            state.eventList = d ?? []
            state.eventTotal = action.payload?._metadata?.total ?? 0
          }
          else if (flag === 'GET_AUDIT') state.auditLog = d ?? []
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false
          state.error = action.error?.message ?? 'Error'
        })
    }

    handle(getDashboard, 'GET_DASHBOARD')
    handle(getImmigrationList, 'GET_IMMIGRATION')
    handle(getImmigrationByUser, 'GET_IMMIGRATION')
    handle(createImmigration, 'CREATE_IMMIGRATION')
    handle(updateImmigration, 'UPDATE_IMMIGRATION')
    handle(deleteImmigration, 'DELETE_IMMIGRATION')
    handle(getExpiringVisas, 'GET_EXPIRING')
    handle(getRtwList, 'GET_RTW')
    handle(createRtwCheck, 'CREATE_RTW')
    handle(updateRtwCheck, 'UPDATE_RTW')
    handle(deleteRtwCheck, 'DELETE_RTW')
    handle(getEventList, 'GET_EVENTS')
    handle(createEvent, 'CREATE_EVENT')
    handle(updateEvent, 'UPDATE_EVENT')
    handle(reportEvent, 'REPORT_EVENT')
    handle(markEventNotApplicable, 'NOT_APPLICABLE_EVENT')
    handle(deleteEvent, 'DELETE_EVENT')
    handle(getAuditLog, 'GET_AUDIT')
    handle(getComplianceSettings, 'GET_COMP_SETTINGS')
    handle(updateComplianceSettings, 'UPDATE_COMP_SETTINGS')
  },
})

export const { clearComplianceActionFlag } = complianceSlice.actions
export default complianceSlice.reducer
