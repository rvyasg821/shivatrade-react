import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

export const getNotificationEvents = createAsyncThunk('notificationSettings/getEvents', async () => {
  const res = await instance.get(API_ENDPOINTS.notifications.events)
  return res.data
})

export const getNotificationPreferences = createAsyncThunk('notificationSettings/getPreferences', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.notifications.preferences, { params })
  return res.data
})

export const updateNotificationPreferences = createAsyncThunk('notificationSettings/updatePreferences', async ({ params, data }) => {
  const res = await instance.put(API_ENDPOINTS.notifications.preferences, data, { params })
  return res.data
})

export const getNotificationTemplates = createAsyncThunk('notificationSettings/getTemplates', async ({ eventKey, params = {} }) => {
  const res = await instance.get(`${API_ENDPOINTS.notifications.templates}/${eventKey}`, { params })
  return res.data
})

export const updateNotificationTemplate = createAsyncThunk('notificationSettings/updateTemplate', async ({ eventKey, params, data }) => {
  const res = await instance.put(`${API_ENDPOINTS.notifications.templates}/${eventKey}`, data, { params })
  return res.data
})

export const deleteNotificationTemplate = createAsyncThunk('notificationSettings/deleteTemplate', async (id) => {
  const res = await instance.delete(`${API_ENDPOINTS.notifications.templates}/${id}`)
  return res.data
})

const notificationSettingsSlice = createSlice({
  name: 'notificationSettings',
  initialState: {
    events: null,
    preferences: [],
    templates: [],
    loading: false,
    actionFlag: '',
    error: null,
  },
  reducers: {
    clearNotificationSettingsFlag(state) {
      state.actionFlag = ''
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getNotificationEvents.fulfilled, (state, action) => {
        // API returns grouped object { module: [events] }, flatten to array with normalized keys
        const grouped = action.payload?.data
        if (grouped && typeof grouped === 'object' && !Array.isArray(grouped)) {
          const flat = []
          Object.values(grouped).forEach((arr) => {
            if (Array.isArray(arr)) {
              arr.forEach((evt) => flat.push({ key: evt.event_key, name: evt.name, module: evt.module, ...evt }))
            }
          })
          state.events = flat
        } else {
          state.events = grouped || null
        }
      })
      .addCase(getNotificationPreferences.pending, (state) => { state.loading = true })
      .addCase(getNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false
        state.preferences = action.payload?.data || []
      })
      .addCase(getNotificationPreferences.rejected, (state) => { state.loading = false })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.actionFlag = 'PREFS_UPDATED'
        state.preferences = action.payload?.data || state.preferences
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Error'
      })
      .addCase(getNotificationTemplates.fulfilled, (state, action) => {
        state.templates = action.payload?.data || []
      })
      .addCase(updateNotificationTemplate.fulfilled, (state, action) => {
        state.actionFlag = 'TEMPLATE_UPDATED'
      })
      .addCase(deleteNotificationTemplate.fulfilled, (state, action) => {
        state.actionFlag = 'TEMPLATE_DELETED'
      })
  },
})

export const { clearNotificationSettingsFlag } = notificationSettingsSlice.actions
export default notificationSettingsSlice.reducer
