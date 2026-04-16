/**
 * Role utility functions for determining user permissions and API routing
 */

/**
 * Check if the user is a super admin
 * @param {object} role - User role object
 * @returns {boolean} - True if user is super admin
 */
export const isSuperAdmin = (role) => {
  if (!role) return false

  // Check for system admin role
  return (role.type === "system") && (role.name === "Super Admin" || role.name === "Admin")
}

/**
 * Check if the user is a company admin
 * @param {object} role - User role object
 * @returns {boolean} - True if user is company admin
 */
export const isCompanyAdmin = (role) => {
  if (!role) return false

  // Recognition for both system-level Company Admin and tenant-level Admin
  return (role.type === "company" && role.name === "Company Admin") ||
    (role.type === "admin" && role.name === "Admin") ||
    (role.name === "Company Admin")
}

/**
 * Get normalized role name from role object
 * @param {object} role - User role object
 * @returns {string} - Normalized role name
 */
export const getUserRole = (role) => {
  if (!role) return ''

  // Return role name from object
  return role.name || ''
}

/**
 * Determine if tenant-based APIs should be used
 * @param {object} role - User role object
 * @returns {boolean} - True if tenant APIs should be used
 */
export const shouldUseTenantAPI = (role) => {
  return !isSuperAdmin(role)
}