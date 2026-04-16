import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

export const getCompanySettings = createAsyncThunk('companySettings/getSettings', async (params = {}) => {
  const res = await instance.get(API_ENDPOINTS.companySettings.settings, { params })
  return res.data
})

export const updateCompanySettings = createAsyncThunk('companySettings/updateSettings', async ({ params, data }) => {
  const res = await instance.put(API_ENDPOINTS.companySettings.settings, data, { params })
  return res.data
})

export const resetCompanyLocationSettings = createAsyncThunk('companySettings/resetLocationSettings', async (params = {}) => {
  const res = await instance.delete(API_ENDPOINTS.companySettings.settings, { params })
  return res.data
})

export const getCodeSettings = createAsyncThunk('companySettings/getCodeSettings', async () => {
  const res = await instance.get(API_ENDPOINTS.companySettings.codeSettings)
  return res.data
})

const companySettingsSlice = createSlice({
  name: 'companySettings',
  initialState: {
    settings: null,
    settingsInherited: false,
    companyDefaults: null,
    codeSettings: null,
    actionFlag: '',
    loading: true,
    error: null,
  },
  reducers: {
    clearCompanySettingsActionFlag(state) {
      state.actionFlag = ''
      state.error = null
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
          if (successFlag === 'GET_SETTINGS') {
            state.settings = d
            state.settingsInherited = !!d?.is_inherited
            state.companyDefaults = action.payload?.companyDefaults || null
          } else if (successFlag === 'UPDATE_SETTINGS') {
            state.settings = d
            state.settingsInherited = !!d?.is_inherited
          } else if (successFlag === 'RESET_LOCATION_SETTINGS') {
            state.settings = d
            state.settingsInherited = true
            state.companyDefaults = null
          }
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = true
          state.error = action.payload || action.error?.message || 'Error'
        })
    }

    handle(getCompanySettings, 'GET_SETTINGS')
    handle(updateCompanySettings, 'UPDATE_SETTINGS')
    handle(resetCompanyLocationSettings, 'RESET_LOCATION_SETTINGS')

    builder
      .addCase(getCodeSettings.pending, (state) => { state.error = null })
      .addCase(getCodeSettings.fulfilled, (state, action) => {
        state.codeSettings = action.payload?.data || null
      })
      .addCase(getCodeSettings.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Error'
      })
  },
})

export const { clearCompanySettingsActionFlag } = companySettingsSlice.actions
export default companySettingsSlice.reducer
