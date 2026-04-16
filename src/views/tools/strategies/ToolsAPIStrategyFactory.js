import AdminToolsAPIStrategy from './AdminToolsAPIStrategy'
// import TenantToolsAPIStrategy from './TenantToolsAPIStrategy' // Multi-tenant removed
import { StrategySelectionError } from '../errors/ToolsErrors'
import { logStrategySelection, logError } from '../utils/logger'

/**
 * Factory class to create appropriate API strategy
 * Multi-tenant removed - always uses AdminToolsAPIStrategy
 */
class ToolsAPIStrategyFactory {
  /**
   * Create the appropriate API strategy
   * Multi-tenant removed - tenant parameters ignored
   * @param {Object} userRole - User role object with type and name
   * @param {string|null} selectedCompany - IGNORED - multi-tenant removed
   * @param {string|null} tenantId - IGNORED - multi-tenant removed
   * @returns {ToolsAPIStrategy} API strategy instance
   */
  static createStrategy(userRole, selectedCompany = null, tenantId = null) {
    // Debug logging
    console.log('ToolsAPIStrategyFactory.createStrategy called (multi-tenant removed)')

    if (!userRole) {
      console.error('No user role provided to strategy factory')
      // Default to admin strategy
      console.log('No role found, using default admin strategy')
      return new AdminToolsAPIStrategy()
    }

    // Validate user role structure
    if (!userRole.type || !userRole.name) {
      console.error('Invalid user role structure:', userRole)
      throw new StrategySelectionError(userRole, selectedCompany, tenantId, {
        reason: 'User role must have type and name properties'
      })
    }

    try {
      // Multi-tenant removed - always use admin strategy
      console.log('Creating admin strategy (multi-tenant removed)')
      const strategy = new AdminToolsAPIStrategy()
      const strategyType = 'admin'

      console.log('Strategy created successfully:', strategyType)

      // Log strategy selection
      logStrategySelection(userRole, selectedCompany, tenantId, strategyType)

      return strategy
    } catch (error) {
      console.error('Error creating strategy:', error)
      logError(error, 'ToolsAPIStrategyFactory.createStrategy', {
        userRole,
        selectedCompany,
        tenantId
      })

      throw new StrategySelectionError(userRole, selectedCompany, tenantId, {
        reason: 'Failed to create API strategy',
        originalError: error
      })
    }
  }

  /**
   * Determine if user is a super admin
   * @param {Object} userRole - User role object
   * @returns {boolean} True if user is super admin
   */
  static isSuperAdmin(userRole) {
    return userRole?.type === "system" && userRole?.name === "Admin"
  }

  /**
   * Get strategy type for debugging/logging purposes
   * Multi-tenant removed - always returns 'admin'
   * @param {Object} userRole - User role object
   * @param {string|null} selectedCompany - IGNORED - multi-tenant removed
   * @param {string|null} tenantId - IGNORED - multi-tenant removed
   * @returns {string} Strategy type (always 'admin')
   */
  static getStrategyType(userRole, selectedCompany = null, tenantId = null) {
    return 'admin'
  }
}

export default ToolsAPIStrategyFactory