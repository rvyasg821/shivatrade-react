import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

// ── Templates ─────────────────────────────────────────────────────────────────

export const getTemplates = createAsyncThunk('shift/getTemplates', async () => {
  const res = await instance.get(API_ENDPOINTS.shift.templateList)
  return res.data
})

export const createTemplate = createAsyncThunk('shift/createTemplate', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.templateCreate, data)
  return res.data
})

export const updateTemplate = createAsyncThunk('shift/updateTemplate', async ({ id, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.shift.templateUpdate}/${id}`, data)
  return res.data
})

export const deleteTemplate = createAsyncThunk('shift/deleteTemplate', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.shift.templateDelete}/${id}`)
  return res.data
})

// ── Assignments ───────────────────────────────────────────────────────────────

export const getAssignments = createAsyncThunk('shift/getAssignments', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.shift.assignmentList, { params })
  return res.data
})

export const createAssignment = createAsyncThunk('shift/createAssignment', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.assignmentCreate, data)
  return res.data
})

export const updateAssignment = createAsyncThunk('shift/updateAssignment', async ({ id, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.shift.assignmentUpdate}/${id}`, data)
  return res.data
})

export const deleteAssignment = createAsyncThunk('shift/deleteAssignment', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.shift.assignmentDelete}/${id}`)
  return res.data
})

// ── Rota Builder ──────────────────────────────────────────────────────────────

export const bulkAssign = createAsyncThunk('shift/bulkAssign', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.rotaBulkAssign, data)
  return res.data
})

export const copyWeek = createAsyncThunk('shift/copyWeek', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.rotaCopyWeek, data)
  return res.data
})

export const publishRota = createAsyncThunk('shift/publishRota', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.rotaPublish, data)
  return res.data
})

export const checkConflicts = createAsyncThunk('shift/checkConflicts', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.rotaCheckConflicts, data)
  return res.data
})

export const getRotaLeaves = createAsyncThunk('shift/getRotaLeaves', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.shift.rotaLeaves, { params })
  return res.data
})

// ── Swaps (admin) ─────────────────────────────────────────────────────────────

export const getSwaps = createAsyncThunk('shift/getSwaps', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.shift.swapList, { params })
  return res.data
})

export const adminDecideSwap = createAsyncThunk('shift/adminDecideSwap', async ({ id, data }) => {
  const res = await instance.post(`${API_ENDPOINTS.shift.swapDecide}/${id}`, data)
  return res.data
})

// ── Employee ──────────────────────────────────────────────────────────────────

export const getMyShifts = createAsyncThunk('shift/getMyShifts', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.shift.myShifts, { params })
  return res.data
})

export const getTodayShift = createAsyncThunk('shift/getTodayShift', async () => {
  const res = await instance.get(API_ENDPOINTS.shift.employeeToday)
  return res.data
})

export const getSwapColleagues = createAsyncThunk('shift/getSwapColleagues', async () => {
  const res = await instance.get(API_ENDPOINTS.shift.swapColleagues)
  return res.data
})

export const getMySwapRequests = createAsyncThunk('shift/getMySwapRequests', async () => {
  const res = await instance.get(API_ENDPOINTS.shift.mySwapRequests)
  return res.data
})

export const requestSwap = createAsyncThunk('shift/requestSwap', async (data) => {
  const res = await instance.post(API_ENDPOINTS.shift.swapRequest, data)
  return res.data
})

export const respondSwap = createAsyncThunk('shift/respondSwap', async ({ id, data }) => {
  const res = await instance.post(`${API_ENDPOINTS.shift.swapRespond}/${id}`, data)
  return res.data
})

export const cancelSwap = createAsyncThunk('shift/cancelSwap', async (id) => {
  const res = await instance.post(`${API_ENDPOINTS.shift.swapCancel}/${id}`, {})
  return res.data
})

// ── Slice ─────────────────────────────────────────────────────────────────────

const shiftSlice = createSlice({
  name: 'shift',
  initialState: {
    templates: [],
    assignments: [],
    assignmentsTotal: 0,
    swaps: [],
    myShifts: [],
    todayShift: null,
    mySwapRequests: [],
    swapColleagues: [],
    conflicts: [],
    rotaLeaves: [],
    actionFlag: '',
    loading: true,
    error: null,
  },
  reducers: {
    clearShiftActionFlag(state) {
      state.actionFlag = ''
      state.error = null
    },
  },
  extraReducers: (builder) => {
    const handle = (thunk, flag) => {
      builder
        .addCase(thunk.pending, (state) => { state.loading = false; state.error = null })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = true
          state.actionFlag = flag
          const d = action.payload?.data
          if (flag === 'GET_TEMPLATES') state.templates = d ?? []
          else if (flag === 'GET_ASSIGNMENTS') {
            state.assignments = d ?? []
            state.assignmentsTotal = action.payload?._metadata?.total ?? 0
          }
          else if (flag === 'GET_SWAPS') state.swaps = d ?? []
          else if (flag === 'GET_MY_SHIFTS') state.myShifts = d ?? []
          else if (flag === 'GET_TODAY_SHIFT') state.todayShift = d
          else if (flag === 'GET_MY_SWAPS') state.mySwapRequests = d ?? []
          else if (flag === 'GET_SWAP_COLLEAGUES') state.swapColleagues = d ?? []
          else if (flag === 'CHECK_CONFLICTS') state.conflicts = d ?? []
          else if (flag === 'GET_ROTA_LEAVES') state.rotaLeaves = d ?? []
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = true
          state.error = action.error?.message ?? 'Error'
        })
    }

    handle(getTemplates, 'GET_TEMPLATES')
    handle(createTemplate, 'CREATE_TEMPLATE')
    handle(updateTemplate, 'UPDATE_TEMPLATE')
    handle(deleteTemplate, 'DELETE_TEMPLATE')
    handle(getAssignments, 'GET_ASSIGNMENTS')
    handle(createAssignment, 'CREATE_ASSIGNMENT')
    handle(updateAssignment, 'UPDATE_ASSIGNMENT')
    handle(deleteAssignment, 'DELETE_ASSIGNMENT')
    handle(bulkAssign, 'BULK_ASSIGN')
    handle(copyWeek, 'COPY_WEEK')
    handle(publishRota, 'PUBLISH_ROTA')
    handle(checkConflicts, 'CHECK_CONFLICTS')
    handle(getRotaLeaves, 'GET_ROTA_LEAVES')
    handle(getSwaps, 'GET_SWAPS')
    handle(adminDecideSwap, 'ADMIN_DECIDE_SWAP')
    handle(getMyShifts, 'GET_MY_SHIFTS')
    handle(getTodayShift, 'GET_TODAY_SHIFT')
    handle(getSwapColleagues, 'GET_SWAP_COLLEAGUES')
    handle(getMySwapRequests, 'GET_MY_SWAPS')
    handle(requestSwap, 'REQUEST_SWAP')
    handle(respondSwap, 'RESPOND_SWAP')
    handle(cancelSwap, 'CANCEL_SWAP')
  },
})

export const { clearShiftActionFlag } = shiftSlice.actions
export default shiftSlice.reducer
