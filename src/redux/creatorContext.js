// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

const STORAGE_KEY = "selectedCreator"

// Only these roles see the "Created By" dropdown. Everyone else is scoped to
// their own records by the backend regardless of what the UI sends.
const DROPDOWN_ROLES = ["Company Admin", "Location Admin"]

// Client-wide kill switch, mirrors the backend's CREATOR_SCOPE_ENABLED. When
// off, the backend ignores created_by scoping entirely, so the picker is
// pointless — hide it instead of showing a control with no effect.
const CREATOR_SCOPE_ENABLED = process.env.REACT_APP_CREATOR_SCOPE_ENABLED !== "false"

function getSavedCreator() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

// selectedCreator value is 'all' | 'me' | <userId>
export const initCreatorContext = createAsyncThunk(
  "creatorContext/initCreatorContext",
  async (userArg, { getState }) => {
    const empty = { enabled: false, roster: [], value: "all", label: "All" }
    try {
      const { auth } = getState()
      const user = userArg || auth?.authUserItem
      const roleName = user?.role?.name

      if (!CREATOR_SCOPE_ENABLED || !DROPDOWN_ROLES.includes(roleName)) {
        return empty
      }

      let roster = []
      try {
        const response = await instance.get(`${API_ENDPOINTS.creator.roster}`)
        if (response?.data?.data) {
          roster = response.data.data
        }
      } catch (e) {
        console.log("Failed to fetch creator roster", e)
      }

      // Restore a still-valid saved selection, else default to "All".
      const saved = getSavedCreator()
      let value = "all"
      let label = "All"
      if (saved?.value) {
        if (saved.value === "all" || saved.value === "me") {
          value = saved.value
          label = saved.value === "me" ? "You" : "All"
        } else {
          const found = roster.find((u) => u._id === saved.value)
          if (found) {
            value = found._id
            label = found.name
          }
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, label }))
      return { enabled: true, roster, value, label }
    } catch (error) {
      console.log("initCreatorContext error", error)
      return empty
    }
  }
)

export const creatorContextSlice = createSlice({
  name: "creatorContext",
  initialState: {
    enabled: false,
    roster: [],
    selectedCreator: getSavedCreator()?.value || "all",
    selectedCreatorLabel: getSavedCreator()?.label || "All",
    initialized: false,
  },
  reducers: {
    setSelectedCreator: (state, action) => {
      const { value, label } = action.payload
      state.selectedCreator = value
      state.selectedCreatorLabel = label
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, label }))
    },
    clearCreatorContext: (state) => {
      state.enabled = false
      state.roster = []
      state.selectedCreator = "all"
      state.selectedCreatorLabel = "All"
      state.initialized = false
      localStorage.removeItem(STORAGE_KEY)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initCreatorContext.fulfilled, (state, action) => {
        state.enabled = action.payload.enabled
        state.roster = action.payload.roster || []
        state.selectedCreator = action.payload.value
        state.selectedCreatorLabel = action.payload.label
        state.initialized = true
      })
      .addCase(initCreatorContext.rejected, (state) => {
        state.initialized = true
      })
  },
})

export const { setSelectedCreator, clearCreatorContext } =
  creatorContextSlice.actions

export default creatorContextSlice.reducer
