/**
 * Logging utilities for tools management with role-based access
 */

// ** Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// ** Current log level (can be configured via environment)
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'development'
  ? LOG_LEVELS.DEBUG
  : LOG_LEVELS.WARN

/**
 * Base logger function
 * @param {number} level - Log level
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
const log = (level, category, message, data = null) => {
  if (level > CURRENT_LOG_LEVEL) {
    return
  }

  const timestamp = new Date().toISOString()
  const levelName = Object.keys(LOG_LEVELS)[level]
  const logEntry = {
    timestamp,
    level: levelName,
    category,
    message,
    ...(data && { data })
  }

  // Console output with appropriate method
  const consoleMethod = level === LOG_LEVELS.ERROR ? 'error'
    : level === LOG_LEVELS.WARN ? 'warn'
      : level === LOG_LEVELS.INFO ? 'info'
        : 'debug'

  console[consoleMethod](`[${timestamp}] [${levelName}] [${category}] ${message}`, data || '')

  // In production, you might want to send logs to a service
  if (process.env.NODE_ENV === 'production' && level <= LOG_LEVELS.WARN) {
    // Example: Send to logging service
    // logService.send(logEntry)
  }
}

/**
 * Log API strategy selection
 * @param {Object} userRole - User role object
 * @param {string|null} selectedCompany - Selected company
 * @param {string|null} tenantId - Tenant ID
 * @param {string} strategyType - Selected strategy type
 */
export const logStrategySelection = (userRole, selectedCompany, tenantId, strategyType) => {
  log(LOG_LEVELS.INFO, 'STRATEGY', 'API strategy selected', {
    userRole: {
      type: userRole?.type,
      name: userRole?.name
    },
    selectedCompany,
    tenantId,
    strategyType,
    timestamp: Date.now()
  })
}

/**
 * Log API request
 * @param {string} action - Action being performed
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @param {string} strategyType - Strategy type used
 */
export const logApiRequest = (action, endpoint, params, strategyType) => {
  log(LOG_LEVELS.DEBUG, 'API_REQUEST', `${action} request initiated`, {
    action,
    endpoint,
    params,
    strategyType,
    timestamp: Date.now()
  })
}

/**
 * Log API response
 * @param {string} action - Action that was performed
 * @param {boolean} success - Whether request was successful
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in ms
 * @param {string} strategyType - Strategy type used
 */
export const logApiResponse = (action, success, statusCode, duration, strategyType) => {
  const level = success ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN
  log(level, 'API_RESPONSE', `${action} request ${success ? 'completed' : 'failed'}`, {
    action,
    success,
    statusCode,
    duration,
    strategyType,
    timestamp: Date.now()
  })
}

/**
 * Log permission check
 * @param {string} action - Action being checked
 * @param {Object} userRole - User role object
 * @param {boolean} hasPermission - Whether user has permission
 */
export const logPermissionCheck = (action, userRole, hasPermission) => {
  const level = hasPermission ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN
  log(level, 'PERMISSION', `Permission check for ${action}`, {
    action,
    userRole: {
      type: userRole?.type,
      name: userRole?.name
    },
    hasPermission,
    timestamp: Date.now()
  })
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalData - Additional context data
 */
export const logError = (error, context, additionalData = {}) => {
  log(LOG_LEVELS.ERROR, 'ERROR', `Error in ${context}: ${error.message}`, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context,
    ...additionalData,
    timestamp: Date.now()
  })
}

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
export const logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG
  log(level, 'PERFORMANCE', `${operation} took ${duration}ms`, {
    operation,
    duration,
    ...metadata,
    timestamp: Date.now()
  })
}

/**
 * Log context changes (role, company selection, etc.)
 * @param {string} changeType - Type of context change
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {Object} userRole - Current user role
 */
export const logContextChange = (changeType, oldValue, newValue, userRole) => {
  log(LOG_LEVELS.INFO, 'CONTEXT_CHANGE', `${changeType} changed`, {
    changeType,
    oldValue,
    newValue,
    userRole: {
      type: userRole?.type,
      name: userRole?.name
    },
    timestamp: Date.now()
  })
}

/**
 * Log cache operations
 * @param {string} operation - Cache operation (hit, miss, set, clear)
 * @param {string} key - Cache key
 * @param {Object} metadata - Additional metadata
 */
export const logCacheOperation = (operation, key, metadata = {}) => {
  log(LOG_LEVELS.DEBUG, 'CACHE', `Cache ${operation} for key: ${key}`, {
    operation,
    key,
    ...metadata,
    timestamp: Date.now()
  })
}

/**
 * Create a performance timer
 * @param {string} operation - Operation name
 * @returns {Function} Function to end the timer
 */
export const createPerformanceTimer = (operation) => {
  const startTime = performance.now()

  return (metadata = {}) => {
    const duration = Math.round(performance.now() - startTime)
    logPerformance(operation, duration, metadata)
    return duration
  }
}

/**
 * Log user action for audit trail
 * @param {string} action - User action
 * @param {Object} userRole - User role
 * @param {Object} target - Target of the action (tool, company, etc.)
 * @param {Object} details - Additional details
 */
export const logUserAction = (action, userRole, target = {}, details = {}) => {
  log(LOG_LEVELS.INFO, 'USER_ACTION', `User performed ${action}`, {
    action,
    user: {
      type: userRole?.type,
      name: userRole?.name,
      tenantId: userRole?.tenantId
    },
    target,
    details,
    timestamp: Date.now()
  })
}

/**
 * Debug helper for development
 * @param {string} message - Debug message
 * @param {any} data - Data to debug
 */
export const debug = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    log(LOG_LEVELS.DEBUG, 'DEBUG', message, data)
  }
}