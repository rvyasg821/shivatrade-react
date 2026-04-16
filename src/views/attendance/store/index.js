import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

// ── Employee ──────────────────────────────────────────────────────────────────

export const getToday = createAsyncThunk('attendance/getToday', async () => {
  const res = await instance.get(API_ENDPOINTS.attendance.today)
  return res.data
})

export const getMyRecords = createAsyncThunk('attendance/getMyRecords', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.myRecords, { params })
  return res.data
})

export const clockIn = createAsyncThunk('attendance/clockIn', async (data, { rejectWithValue }) => {
  try {
    const res = await instance.post(API_ENDPOINTS.attendance.clockIn, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err?.response?.data?.message || err?.message || 'Clock in failed')
  }
})

export const clockOut = createAsyncThunk('attendance/clockOut', async (data, { rejectWithValue }) => {
  try {
    const res = await instance.post(API_ENDPOINTS.attendance.clockOut, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err?.response?.data?.message || err?.message || 'Clock out failed')
  }
})

export const startBreak = createAsyncThunk('attendance/startBreak', async (data = {}) => {
  const res = await instance.post(API_ENDPOINTS.attendance.breakStart, data)
  return res.data
})

export const endBreak = createAsyncThunk('attendance/endBreak', async () => {
  const res = await instance.post(API_ENDPOINTS.attendance.breakEnd, {})
  return res.data
})

export const getMyMonthlyReport = createAsyncThunk('attendance/getMyMonthlyReport', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.myReportMonthly, { params })
  return res.data
})

export const getMyAnnualReport = createAsyncThunk('attendance/getMyAnnualReport', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.myReportAnnual, { params })
  return res.data
})

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getSettings = createAsyncThunk('attendance/getSettings', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.settings, { params })
  return res.data
})

export const updateSettings = createAsyncThunk('attendance/updateSettings', async ({ params, data }) => {
  const res = await instance.put(API_ENDPOINTS.attendance.settingsUpdate, data, { params })
  return res.data
})

export const getAttendanceList = createAsyncThunk('attendance/getAttendanceList', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.list, { params })
  return res.data
})

export const getAttendanceRecord = createAsyncThunk('attendance/getAttendanceRecord', async (id) => {
  const res = await instance.get(`${API_ENDPOINTS.attendance.get}/${id}`)
  return res.data
})

export const createManualEntry = createAsyncThunk('attendance/createManualEntry', async (data) => {
  const res = await instance.post(API_ENDPOINTS.attendance.manual, data)
  return res.data
})

export const updateRecord = createAsyncThunk('attendance/updateRecord', async ({ id, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.attendance.update}/${id}`, data)
  return res.data
})

export const deleteRecord = createAsyncThunk('attendance/deleteRecord', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.attendance.delete}/${id}`)
  return res.data
})

export const getMonthlyReport = createAsyncThunk('attendance/getMonthlyReport', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.reportMonthly, { params })
  return res.data
})

export const getAnnualReport = createAsyncThunk('attendance/getAnnualReport', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.reportAnnual, { params })
  return res.data
})

export const getDailyReport = createAsyncThunk('attendance/getDailyReport', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.attendance.reportDaily, { params })
  return res.data
})

export const resetLocationSettings = createAsyncThunk('attendance/resetLocationSettings', async (params = {}) => {
  const res = await instance.delete(API_ENDPOINTS.attendance.settings, { params })
  return res.data
})

// ── Slice ─────────────────────────────────────────────────────────────────────

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    todayRecord: null,
    employeeSettings: null,
    myRecords: [],
    attendanceList: [],
    attendanceTotal: 0,
    currentRecord: null,
    settings: null,
    settingsInherited: false,
    companyDefaults: null,
    timezone: null,
    monthlyReport: [],
    annualReport: [],
    dailyReport: [],
    myMonthlySummary: null,
    myAnnualReport: [],
    actionFlag: '',
    loading: true,
    error: null,
    success: '',
  },
  reducers: {
    clearAttendanceActionFlag(state) {
      state.actionFlag = ''
      state.error = null
      state.success = ''
    },
  },
  extraReducers: (builder) => {
    const handle = (thunk, successFlag) => {
      builder
        .addCase(thunk.pending, (state) => { state.loading = false; state.error = null })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = true
          state.actionFlag = successFlag
          const d = action.payload?.data
          if (successFlag === 'GET_TODAY') {
            state.todayRecord = d
            state.employeeSettings = action.payload?.settings || null
            if (action.payload?.timezone) state.timezone = action.payload.timezone
          }
          else if (successFlag === 'GET_MY_RECORDS') state.myRecords = d ?? []
          else if (successFlag === 'CLOCK_IN' || successFlag === 'CLOCK_OUT') {
            state.todayRecord = d
            if (action.payload?.timezone) state.timezone = action.payload.timezone
          }
          else if (successFlag === 'START_BREAK' || successFlag === 'END_BREAK') { /* handled by parent */ }
          else if (successFlag === 'GET_SETTINGS') {
            state.settings = d
            state.settingsInherited = !!d?.is_inherited
            state.companyDefaults = action.payload?.companyDefaults || null
          }
          else if (successFlag === 'UPDATE_SETTINGS') {
            state.settings = d
            state.settingsInherited = !!d?.is_inherited
          }
          else if (successFlag === 'RESET_LOCATION_SETTINGS') {
            state.settings = d
            state.settingsInherited = true
            state.companyDefaults = null
          }
          else if (successFlag === 'GET_LIST') {
            state.attendanceList = d ?? []
            state.attendanceTotal = action.payload?._metadata?.total ?? 0
            if (action.payload?.timezone) state.timezone = action.payload.timezone
          }
          else if (successFlag === 'GET_RECORD') state.currentRecord = d
          else if (successFlag === 'MANUAL_ENTRY') state.actionFlag = 'MANUAL_ENTRY'
          else if (successFlag === 'UPDATE_RECORD') state.actionFlag = 'UPDATE_RECORD'
          else if (successFlag === 'DELETE_RECORD') state.actionFlag = 'DELETE_RECORD'
          else if (successFlag === 'MONTHLY_REPORT') state.monthlyReport = d ?? []
          else if (successFlag === 'ANNUAL_REPORT') state.annualReport = d ?? []
          else if (successFlag === 'DAILY_REPORT') {
            state.dailyReport = d ?? []
            if (action.payload?.timezone) state.timezone = action.payload.timezone
          }
          else if (successFlag === 'MY_MONTHLY_REPORT') state.myMonthlySummary = d ?? null
          else if (successFlag === 'MY_ANNUAL_REPORT') state.myAnnualReport = d ?? []
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = true
          state.error = action.payload || action.error?.message || 'Error'
        })
    }

    handle(getToday, 'GET_TODAY')
    handle(getMyRecords, 'GET_MY_RECORDS')
    handle(clockIn, 'CLOCK_IN')
    handle(clockOut, 'CLOCK_OUT')
    handle(startBreak, 'START_BREAK')
    handle(endBreak, 'END_BREAK')
    handle(getSettings, 'GET_SETTINGS')
    handle(updateSettings, 'UPDATE_SETTINGS')
    handle(getAttendanceList, 'GET_LIST')
    handle(getAttendanceRecord, 'GET_RECORD')
    handle(createManualEntry, 'MANUAL_ENTRY')
    handle(updateRecord, 'UPDATE_RECORD')
    handle(deleteRecord, 'DELETE_RECORD')
    handle(getMonthlyReport, 'MONTHLY_REPORT')
    handle(getAnnualReport, 'ANNUAL_REPORT')
    handle(getDailyReport, 'DAILY_REPORT')
    handle(getMyMonthlyReport, 'MY_MONTHLY_REPORT')
    handle(getMyAnnualReport, 'MY_ANNUAL_REPORT')
    handle(resetLocationSettings, 'RESET_LOCATION_SETTINGS')
  },
})

export const { clearAttendanceActionFlag } = attendanceSlice.actions
export default attendanceSlice.reducer
