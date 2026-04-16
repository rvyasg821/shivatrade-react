// ** Redux Imports
import { createSlice } from '@reduxjs/toolkit'

// ** UseJWT import to get config
import useJwt from '@src/auth/jwt/useJwt'

const config = useJwt.jwtConfig

const initialUser = () => {
  const item = window.localStorage.getItem('userData')
  //** Parse stored json or if none return initialValue
  if (item) {
    const parsedData = JSON.parse(item)
    return parsedData.userData || parsedData || {}
  }
  return {}
}

const initialCompanyData = () => {
  const item = window.localStorage.getItem('userData')
  if (item) {
    const parsedData = JSON.parse(item)
    return parsedData.companyData || {}
  }
  return {}
}

const initialTenantId = () => {
  // Multi-tenant feature removed - always return null
  return null
}

const initialLocationId = () => {
  const item = window.localStorage.getItem('userData')
  if (item) {
    const parsedData = JSON.parse(item)
    const userData = parsedData.userData || parsedData || {}
    return userData.locationId || userData.location_id || null
  }
  return null
}

// Helper function to get access token from localStorage
export const getAccessToken = () => {
  return localStorage.getItem(config.storageTokenKeyName)
}

// Helper function to get refresh token from localStorage
export const getRefreshToken = () => {
  return localStorage.getItem(config.storageRefreshTokenKeyName)
}

// Helper function to get user data from localStorage
export const getUserData = () => {
  const item = localStorage.getItem('userData')
  if (item) {
    const parsedData = JSON.parse(item)
    return parsedData.userData || parsedData || {}
  }
  return {}
}

// Helper function to get company data from localStorage
export const getCompanyData = () => {
  const item = localStorage.getItem('userData')
  if (item) {
    const parsedData = JSON.parse(item)
    return parsedData.companyData || null
  }
  return null
}

// Helper function to get tenant ID from localStorage
// Multi-tenant feature removed - always returns null
export const getTenantId = () => {
  return null
}

// Helper function to get location ID from localStorage
export const getLocationId = () => {
  const item = localStorage.getItem('userData')
  if (item) {
    const parsedData = JSON.parse(item)
    const userData = parsedData.userData || parsedData || {}
    return userData.locationId || userData.location_id || null
  }
  return null
}

export const authSlice = createSlice({
  name: 'authentication',
  initialState: {
    userData: initialUser(),
    companyData: initialCompanyData(),
    tenantId: initialTenantId(),
    locationId: initialLocationId()
  },
  reducers: {
    handleLogin: (state, action) => {
      // Store user data and tokens
      const userData = action.payload.userData || action.payload
      state.userData = userData
      state[config.storageTokenKeyName] = action.payload[config.storageTokenKeyName]
      state[config.storageRefreshTokenKeyName] = action.payload[config.storageRefreshTokenKeyName]
      state.locationId = userData.locationId || userData.location_id || null

      // Store company details and tenantId separately for tenant-tools API calls
      if (action.payload.companyData) {
        state.companyData = action.payload.companyData
        // state.tenantId = action.payload.companyData.tenantId // Multi-tenant removed
      }

      // Store in localStorage - clean separation of user and company data
      const storageData = {
        userData: action.payload.userData || action.payload,
        companyData: action.payload.companyData || null,
        tokenType: action.payload.tokenType,
        expiresIn: action.payload.expiresIn,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      }
      console.log("🚀 ~ storageData:", storageData)
      localStorage.setItem('userData', JSON.stringify(storageData))
      // localStorage.setItem('tenantId', ...) // Multi-tenant removed
      localStorage.setItem('locationId', JSON.stringify(state.locationId))
      localStorage.setItem(config.storageTokenKeyName, JSON.stringify(action.payload.accessToken))
      localStorage.setItem(config.storageRefreshTokenKeyName, JSON.stringify(action.payload.refreshToken))

      // Custom event removed - TenantContext no longer exists
    },
    handleLogout: state => {
      state.userData = {}
      state.companyData = null
      state.tenantId = null
      state.locationId = null
      state[config.storageTokenKeyName] = null
      state[config.storageRefreshTokenKeyName] = null
      // ** Remove user, accessToken & refreshToken from localStorage
      localStorage.removeItem('userData')
      // localStorage.removeItem('tenantId') // Multi-tenant removed
      localStorage.removeItem('locationId')
      localStorage.removeItem(config.storageTokenKeyName)
      localStorage.removeItem(config.storageRefreshTokenKeyName)
    },
    /**
     * Refresh the active subscription tool list and the inactive flag without
     * forcing a re-login. Called after a successful upgrade so the nav menu,
     * dashboard widgets, and route guards immediately reflect the new tool set.
     */
    setSubscriptionTools: (state, action) => {
      const { tools, isActive } = action.payload || {}
      if (state.companyData) {
        state.companyData.tools = tools || []
      }
      if (state.userData) {
        state.userData.subscription_inactive = isActive === false
      }
      // Mirror to localStorage so a page refresh keeps the new state
      const item = window.localStorage.getItem('userData')
      if (item) {
        try {
          const parsed = JSON.parse(item)
          if (parsed.companyData) parsed.companyData.tools = tools || []
          if (parsed.userData) parsed.userData.subscription_inactive = isActive === false
          window.localStorage.setItem('userData', JSON.stringify(parsed))
        } catch { /* ignore */ }
      }
    }
  }
})

export const { handleLogin, handleLogout, setSubscriptionTools } = authSlice.actions

// Helper functions are already individually exported above

export default authSlice.reducer
