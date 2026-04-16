/**
 * Base error class for all tools-related errors
 */
class ToolsError extends Error {
  constructor(message, code = null, details = null) {
    super(message)
    this.name = 'ToolsError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * Error thrown when user lacks permission for a tools operation
 */
class ToolsPermissionError extends ToolsError {
  constructor(action, userRole, details = null) {
    const message = `User role ${userRole?.name || 'Unknown'} does not have permission to ${action}`
    super(message, 'PERMISSION_DENIED', details)
    this.name = 'ToolsPermissionError'
    this.action = action
    this.userRole = userRole
  }
}

/**
 * Error thrown for API-specific issues
 */
class ToolsAPIError extends ToolsError {
  constructor(message, statusCode = null, endpoint = null, details = null) {
    super(message, 'API_ERROR', details)
    this.name = 'ToolsAPIError'
    this.statusCode = statusCode
    this.endpoint = endpoint
  }
}

/**
 * Error thrown when tenant ID is missing or invalid
 */
class TenantNotFoundError extends ToolsError {
  constructor(tenantId = null, details = null) {
    const message = tenantId 
      ? `Tenant with ID '${tenantId}' not found or inaccessible`
      : 'Tenant ID is required but not provided'
    super(message, 'TENANT_NOT_FOUND', details)
    this.name = 'TenantNotFoundError'
    this.tenantId = tenantId
  }
}

/**
 * Error thrown when API strategy cannot be determined
 */
class StrategySelectionError extends ToolsError {
  constructor(userRole, selectedCompany, tenantId, details = null) {
    const message = 'Unable to determine appropriate API strategy for user context'
    super(message, 'STRATEGY_SELECTION_ERROR', details)
    this.name = 'StrategySelectionError'
    this.userRole = userRole
    this.selectedCompany = selectedCompany
    this.tenantId = tenantId
  }
}

/**
 * Error thrown when tool data validation fails
 */
class ToolValidationError extends ToolsError {
  constructor(field, value, reason, details = null) {
    const message = `Validation failed for field '${field}': ${reason}`
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ToolValidationError'
    this.field = field
    this.value = value
    this.reason = reason
  }
}

/**
 * Error thrown when tool is not found
 */
class ToolNotFoundError extends ToolsError {
  constructor(toolId, details = null) {
    const message = `Tool with ID '${toolId}' not found`
    super(message, 'TOOL_NOT_FOUND', details)
    this.name = 'ToolNotFoundError'
    this.toolId = toolId
  }
}

/**
 * Utility function to create appropriate error from API response
 * @param {Object} error - Error object from API response
 * @param {string} endpoint - API endpoint that failed
 * @param {Object} context - Additional context (userRole, tenantId, etc.)
 * @returns {ToolsError} Appropriate error instance
 */
export const createToolsErrorFromResponse = (error, endpoint = null, context = {}) => {
  if (!error) {
    return new ToolsError('Unknown error occurred')
  }

  // Handle axios error structure
  if (error.response) {
    const { status, data } = error.response
    const message = data?.message || error.message || 'API request failed'

    // Permission errors
    if (status === 403) {
      return new ToolsPermissionError(
        context.action || 'perform this action',
        context.userRole,
        { originalError: error, endpoint }
      )
    }

    // Not found errors
    if (status === 404) {
      if (endpoint?.includes('/tools/')) {
        const toolId = endpoint.split('/').pop()
        return new ToolNotFoundError(toolId, { originalError: error, endpoint })
      }
      return new ToolsAPIError(message, status, endpoint, { originalError: error })
    }

    // Validation errors
    if (status === 400) {
      return new ToolValidationError(
        data?.field || 'unknown',
        data?.value || null,
        message,
        { originalError: error, endpoint }
      )
    }

    // General API errors
    return new ToolsAPIError(message, status, endpoint, { originalError: error })
  }

  // Handle network errors
  if (error.request) {
    return new ToolsAPIError(
      'Network error: Unable to reach server',
      null,
      endpoint,
      { originalError: error }
    )
  }

  // Handle other errors
  if (error.message?.includes('Tenant ID')) {
    return new TenantNotFoundError(context.tenantId, { originalError: error })
  }

  if (error.message?.includes('strategy')) {
    return new StrategySelectionError(
      context.userRole,
      context.selectedCompany,
      context.tenantId,
      { originalError: error }
    )
  }

  // Default to generic tools error
  return new ToolsError(error.message || 'Unknown error occurred', null, { originalError: error })
}

/**
 * Utility function to get user-friendly error message
 * @param {Error} error - Error instance
 * @param {Function} t - Translation function
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, t = (key) => key) => {
  if (!error) {
    return t('An unknown error occurred')
  }

  switch (error.name) {
    case 'ToolsPermissionError':
      return t('You do not have permission to perform this action')
    
    case 'TenantNotFoundError':
      return t('Company not found or inaccessible')
    
    case 'ToolNotFoundError':
      return t('Tool not found')
    
    case 'ToolValidationError':
      return t('Invalid data provided: {{reason}}', { reason: error.reason })
    
    case 'ToolsAPIError':
      if (error.statusCode === 500) {
        return t('Server error occurred. Please try again later.')
      }
      return error.message || t('API request failed')
    
    case 'StrategySelectionError':
      return t('Unable to determine access level. Please refresh and try again.-')
    
    default:
      return error.message || t('An unexpected error occurred')
  }
}

export {
  ToolsError,
  ToolsPermissionError,
  ToolsAPIError,
  TenantNotFoundError,
  StrategySelectionError,
  ToolValidationError,
  ToolNotFoundError
}