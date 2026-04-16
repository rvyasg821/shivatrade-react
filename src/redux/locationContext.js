// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

const STORAGE_KEY = "selectedLocation"

function getSavedLocation() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export const initLocationContext = createAsyncThunk(
  "locationContext/initLocationContext",
  async (userArg, { getState }) => {
    try {
      // Prefer the directly-passed user (freshest data) over stale getState()
      const { auth } = getState()
      const user = userArg || auth?.authUserItem
      const roleName = user?.role?.name

      // Super Admin doesn't need location context
      if (roleName === "Super Admin" || roleName === "Admin") {
        return {
          companyLocations: [],
          selectedLocationId: null,
          selectedLocationName: null,
        }
      }

      // Employee and custom roles with assigned location: fixed to their location
      const userLocationId = user?.location_id?._id || user?.location_id || null
      const accessibleLocs = user?.accessible_locations || []
      const isLocationAdmin = roleName === "Location Admin"

      // Location Admin with multiple locations: interactive dropdown (like Company Admin but filtered)
      if (isLocationAdmin && (accessibleLocs.length > 0 || userLocationId)) {
        let allAssigned = [...new Set([...(userLocationId ? [userLocationId] : []), ...accessibleLocs])]
        let assignedLocations = []

        try {
          const response = await instance.get(`${API_ENDPOINTS.locations.list}`, {
            params: { status: "ACTIVE", dropdown: "yes" },
          })
          if (response?.data?.statusCode && response?.data?.data) {
            const locations = response.data.data
            assignedLocations = locations.filter((loc) => allAssigned.includes(loc._id))
          }
        } catch (e) {
          console.log("Failed to fetch locations for location admin context", e)
        }

        const saved = getSavedLocation()
        let selectedId = null
        let selectedName = null

        // Restore saved selection if still valid
        if (saved?.id && assignedLocations.find((l) => l._id === saved.id)) {
          selectedId = saved.id
          selectedName = assignedLocations.find((l) => l._id === saved.id)?.location_name
        }

        // Fallback to primary location
        if (!selectedId && userLocationId) {
          const primary = assignedLocations.find((l) => l._id === userLocationId)
          if (primary) {
            selectedId = primary._id
            selectedName = primary.location_name
          }
        }

        // Fallback to first assigned
        if (!selectedId && assignedLocations.length > 0) {
          selectedId = assignedLocations[0]._id
          selectedName = assignedLocations[0].location_name
        }

        if (selectedId) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: selectedId, name: selectedName }))
        }

        return {
          companyLocations: assignedLocations,
          selectedLocationId: selectedId,
          selectedLocationName: selectedName,
        }
      }

      // Employee and other roles: fixed to single location
      if (roleName === "Employee" || (roleName !== "Company Admin" && userLocationId)) {
        let locationId = user?.location_id?._id || user?.location_id || null
        let locationName = user?.location_id?.location_name || null

        try {
          const response = await instance.get(`${API_ENDPOINTS.locations.list}`, {
            params: { status: "ACTIVE", dropdown: "yes" },
          })
          if (response?.data?.statusCode && response?.data?.data) {
            const locations = response.data.data
            if (locationId) {
              const found = locations.find((loc) => loc._id === locationId || loc._id === String(locationId))
              if (found) locationName = found.location_name
            } else if (locations.length > 0) {
              const defaultLoc = locations.find((loc) => loc.is_default === true) || locations[0]
              locationId = defaultLoc._id
              locationName = defaultLoc.location_name
            }
          }
        } catch (e) {
          console.log("Failed to fetch locations for location context", e)
        }

        if (!locationName) locationName = "Unknown Location"
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: locationId, name: locationName }))

        return {
          companyLocations: [],
          selectedLocationId: locationId,
          selectedLocationName: locationName,
        }
      }

      // Company Admin: fetch all company locations
      const response = await instance.get(`${API_ENDPOINTS.locations.list}`, {
        params: { status: "ACTIVE", dropdown: "yes" },
      })

      if (response?.data?.statusCode && response?.data?.data) {
        const locations = response.data.data
        const saved = getSavedLocation()

        // Check if saved location is still valid
        let selectedId = null
        let selectedName = null

        if (saved?.id) {
          const found = locations.find((loc) => loc._id === saved.id)
          if (found) {
            selectedId = found._id
            selectedName = found.location_name
          }
        }

        // Fallback to default location
        if (!selectedId) {
          const defaultLoc = locations.find((loc) => loc.is_default === true)
          if (defaultLoc) {
            selectedId = defaultLoc._id
            selectedName = defaultLoc.location_name
          } else if (locations.length > 0) {
            selectedId = locations[0]._id
            selectedName = locations[0].location_name
          }
        }

        // Persist to localStorage
        if (selectedId) {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ id: selectedId, name: selectedName })
          )
        }

        return {
          companyLocations: locations,
          selectedLocationId: selectedId,
          selectedLocationName: selectedName,
        }
      }

      return {
        companyLocations: [],
        selectedLocationId: null,
        selectedLocationName: null,
      }
    } catch (error) {
      console.log("initLocationContext error", error)
      return {
        companyLocations: [],
        selectedLocationId: null,
        selectedLocationName: null,
      }
    }
  }
)

export const locationContextSlice = createSlice({
  name: "locationContext",
  initialState: {
    selectedLocationId: getSavedLocation()?.id || null,
    selectedLocationName: getSavedLocation()?.name || null,
    selectedLocationDetails: null,
    companyLocations: [],
    initialized: false,
  },
  reducers: {
    setSelectedLocation: (state, action) => {
      const { id, name } = action.payload
      state.selectedLocationId = id
      state.selectedLocationName = name
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }))
    },
    setCompanyLocations: (state, action) => {
      state.companyLocations = action.payload
    },
    clearLocationContext: (state) => {
      state.selectedLocationId = null
      state.selectedLocationName = null
      state.selectedLocationDetails = null
      state.companyLocations = []
      state.initialized = false
      localStorage.removeItem(STORAGE_KEY)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initLocationContext.fulfilled, (state, action) => {
        state.companyLocations = action.payload.companyLocations || []
        state.selectedLocationId = action.payload.selectedLocationId
        state.selectedLocationName = action.payload.selectedLocationName
        state.selectedLocationDetails = action.payload.selectedLocationDetails || null
        state.initialized = true
      })
      .addCase(initLocationContext.rejected, (state) => {
        state.initialized = true // Mark as initialized even on error to prevent infinite retries
      })
  },
})

export const { setSelectedLocation, setCompanyLocations, clearLocationContext } =
  locationContextSlice.actions

export default locationContextSlice.reducer
