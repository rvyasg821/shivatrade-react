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

  // Try multiple possible locations for user data (match component logic)
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

  // Check for system admin role
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
 * Get effective tenant ID based on user role and context
 * @param {Object} userRole - User role object
 * @param {string|null} selectedCompany - Selected company tenant ID (for super admin)
 * @returns {string|null} Effective tenant ID to use for API calls
 */
export const getEffectiveTenantId = (userRole, selectedCompany = null) => {
  if (!userRole) {
    return null
  }

  const isSuper = isSuperAdmin(userRole)

  if (isSuper) {
    // Super Admin: use selected company if available, otherwise null (for admin API)
    return selectedCompany || null
  }

  // Company Admin or other roles: use their own tenant ID
  return getTenantId()
}

/**
 * Check if user has specific permission for tools
 * @param {Object} userRole - User role object
 * @param {string} permission - Permission to check (can_add, can_update, can_delete, can_view)
 * @returns {boolean} True if user has the permission
 */
export const hasToolsPermission = (userRole, permission) => {
  if (!userRole) {
    return false
  }

  // Super Admin has all permissions
  if (isSuperAdmin(userRole)) {
    return true
  }

  // Check specific permission in role
  return userRole.permissions?.tools?.[permission] === true
}

/**
 * Get user's display name for context
 * @param {Object} authState - Redux auth state
 * @returns {string} User display name
 */
export const getUserDisplayName = (authState) => {
  if (!authState || !authState.userData) {
    return 'Unknown User'
  }

  const userData = authState.userData
  return userData.name || userData.email || 'User'
}

/**
 * Get company name from companies list
 * @param {string} tenantId - Tenant ID to find
 * @param {Array} companiesItems - Array of company objects
 * @returns {string} Company name or tenant ID if not found
 */
export const getCompanyName = (tenantId, companiesItems = []) => {
  if (!tenantId || !companiesItems.length) {
    return tenantId || 'Unknown Company'
  }

  const company = companiesItems.find(
    company => company.tenantId === tenantId || company._id === tenantId
  )

  return company?.company_name || company?.name || tenantId
}

/**
 * Determine if user should see company filter dropdown
 * @param {Object} userRole - User role object
 * @returns {boolean} True if company filter should be shown
 */
export const shouldShowCompanyFilter = (userRole) => {
  // Only Super Admin should see company filter
  return isSuperAdmin(userRole)
}

/**
 * Get context description for current viewing mode
 * @param {Object} userRole - User role object
 * @param {string|null} selectedCompany - Selected company tenant ID
 * @param {Array} companiesItems - Array of company objects
 * @returns {Object} Context description with type and label
 */
export const getContextDescription = (userRole, selectedCompany = null, companiesItems = []) => {
  if (!userRole) {
    return {
      type: 'unknown',
      label: 'Loading...',
      color: 'secondary'
    }
  }

  const isSuper = isSuperAdmin(userRole)

  if (isSuper) {
    if (selectedCompany) {
      const companyName = getCompanyName(selectedCompany, companiesItems)
      return {
        type: 'tenant',
        label: `Viewing: ${companyName} Tools`,
        color: 'info'
      }
    } else {
      return {
        type: 'admin',
        label: 'Viewing: All Tools (Admin)',
        color: 'primary'
      }
    }
  } else {
    return {
      type: 'tenant',
      label: 'Company Tools',
      color: 'secondary'
    }
  }
}