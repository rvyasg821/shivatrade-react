// ** Authentication helpers
import { getTenantId } from "@src/redux/authentication"

/**
 * Extract user role from authentication state
 * @param {Object} authState - Redux auth state
 * @returns {Object|null} User role object or null if not available
 */
export const getUserRole = (authState) => {
  if (!authState) {
    return null
  }

  // Try multiple possible locations for user data
  const authUserItem = authState.userData || authState.authUserItem || null

  if (!authUserItem) {
    return null
  }

  return authUserItem.role || null
}

/**
 * Check if user is a Super Admin
 * @param {Object} userRole - User role object
 * @returns {boolean} True if user is super admin
 */
export const isSuperAdmin = (userRole) => {
  if (!userRole) {
    return false
  }

  return (userRole.type === "system") && (userRole.name === "Super Admin" || userRole.name === "Admin")
}

/**
 * Check if user is a Company Admin
 * @param {Object} userRole - User role object
 * @returns {boolean} True if user is company admin
 */
export const isCompanyAdmin = (userRole) => {
  if (!userRole) {
    return false
  }

  // Recognition for both system-level Company Admin and tenant-level Admin
  return (userRole.type === "company" && userRole.name === "Company Admin") ||
    (userRole.type === "admin" && userRole.name === "Admin") ||
    (userRole.name === "Company Admin")
}

/**
 * Get effective tenant ID based on user role
 * @param {Object} userRole - User role object
 * @returns {string|null} Effective tenant ID to use for API calls
 */
export const getEffectiveTenantId = (userRole) => {
  if (!userRole) {
    return null
  }

  const isSuper = isSuperAdmin(userRole)

  if (isSuper) {
    // Super Admin: use admin APIs (return null)
    return null
  }

  // Company Admin or other roles: use their own tenant ID
  return getTenantId()
}

/**
 * Determine which API endpoints to use based on user role
 * @param {Object} userRole - User role object
 * @returns {Object} API endpoints object
 */
export const getApiEndpoints = (userRole) => {
  const isSuper = isSuperAdmin(userRole)

  if (isSuper) {
    // Super Admin: use admin APIs
    return API_ENDPOINTS.users
  } else {
    // Company Admin: use tenant APIs
    return API_ENDPOINTS.tenantUsers
  }
}