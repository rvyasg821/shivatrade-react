/**
 * Utility functions for normalizing API responses from different endpoints
 * Ensures consistent data structure regardless of whether admin or tenant APIs are used
 */

/**
 * Normalize a single tool response
 * @param {Object} tool - Raw tool object from API
 * @param {string} source - Source of the data ('admin' or 'tenant')
 * @returns {Object} Normalized tool object
 */
export const normalizeToolResponse = (tool, source = 'unknown') => {
  if (!tool || typeof tool !== 'object') {
    return null
  }

  return {
    _id: tool._id || tool.id,
    name: tool.name || '',
    description: tool.description || '',
    status: tool.status || 1,
    tenantId: tool.tenantId || tool.tenant_id || null,
    createdAt: tool.createdAt || tool.created_at || null,
    updatedAt: tool.updatedAt || tool.updated_at || null,
    createdBy: tool.createdBy || tool.created_by || null,
    updatedBy: tool.updatedBy || tool.updated_by || null,
    // Additional fields that might be present
    category: tool.category || null,
    version: tool.version || null,
    isActive: tool.status === 1,
    // Metadata about the source
    _source: source,
    _normalized: true,
    _originalData: process.env.NODE_ENV === 'development' ? tool : undefined
  }
}

/**
 * Normalize tools list response
 * @param {Array} tools - Array of raw tool objects from API
 * @param {string} source - Source of the data ('admin' or 'tenant')
 * @returns {Array} Array of normalized tool objects
 */
export const normalizeToolsListResponse = (tools, source = 'unknown') => {
  if (!Array.isArray(tools)) {
    console.warn('normalizeToolsListResponse: Expected array, got:', typeof tools)
    return []
  }

  return tools.map(tool => normalizeToolResponse(tool, source)).filter(Boolean)
}

/**
 * Normalize pagination metadata
 * @param {Object} pagination - Raw pagination object from API
 * @returns {Object} Normalized pagination object
 */
export const normalizePaginationResponse = (pagination) => {
  if (!pagination || typeof pagination !== 'object') {
    return {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPrevPage: false
    }
  }

  return {
    currentPage: pagination.currentPage || pagination.current_page || pagination.page || 1,
    totalPages: pagination.totalPages || pagination.total_pages || pagination.pages || 1,
    totalItems: pagination.totalItems || pagination.total_items || pagination.total || 0,
    itemsPerPage: pagination.itemsPerPage || pagination.items_per_page || pagination.limit || 10,
    hasNextPage: pagination.hasNextPage || pagination.has_next_page || false,
    hasPrevPage: pagination.hasPrevPage || pagination.has_prev_page || false,
    // Additional fields
    startIndex: pagination.startIndex || pagination.start_index || null,
    endIndex: pagination.endIndex || pagination.end_index || null
  }
}

/**
 * Normalize full API response structure
 * @param {Object} response - Raw API response
 * @param {string} source - Source of the data ('admin' or 'tenant')
 * @returns {Object} Normalized response object
 */
export const normalizeApiResponse = (response, source = 'unknown') => {
  if (!response || typeof response !== 'object') {
    return {
      success: false,
      data: null,
      pagination: null,
      message: 'Invalid response format',
      statusCode: null
    }
  }

  // Handle different response formats
  // Format 1: Direct axios response with status
  // Format 2: API response with statusCode field
  // Format 3: Simple data response
  const statusCode = response.status || response.statusCode || (response.data ? 200 : null)
  const isSuccess = statusCode >= 200 && statusCode < 300

  const normalized = {
    success: isSuccess,
    statusCode: statusCode,
    message: response.message || response.statusText || '',
    timestamp: response.timestamp || new Date().toISOString(),
    source
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('normalizeApiResponse - input:', response)
    console.log('normalizeApiResponse - normalized so far:', normalized)
  }

  // Handle data normalization based on response structure
  if (response.data) {
    if (Array.isArray(response.data)) {
      // List response
      normalized.data = normalizeToolsListResponse(response.data, source)
      normalized.pagination = normalizePaginationResponse(response._metadata?.pagination)
    } else if (typeof response.data === 'object') {
      // Single item response
      normalized.data = normalizeToolResponse(response.data, source)
      normalized.pagination = null
    } else {
      normalized.data = response.data
      normalized.pagination = null
    }
  } else {
    // Handle case where response itself is the data (no wrapper)
    if (Array.isArray(response)) {
      normalized.data = normalizeToolsListResponse(response, source)
      normalized.pagination = normalizePaginationResponse(null)
    } else {
      normalized.data = null
      normalized.pagination = null
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('normalizeApiResponse - final result:', normalized)
  }

  return normalized
}

/**
 * Validate normalized tool object
 * @param {Object} tool - Normalized tool object
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateNormalizedTool = (tool) => {
  const errors = []

  if (!tool) {
    errors.push('Tool object is null or undefined')
    return { isValid: false, errors }
  }

  if (!tool._id) {
    errors.push('Tool ID is missing')
  }

  if (!tool.name || typeof tool.name !== 'string' || tool.name.trim().length === 0) {
    errors.push('Tool name is missing or invalid')
  }

  if (tool.status !== undefined && ![1, 2].includes(tool.status)) {
    errors.push('Tool status must be 1 (active) or 2 (inactive)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Transform tools data for different UI contexts
 * @param {Array} tools - Array of normalized tool objects
 * @param {string} context - UI context ('list', 'dropdown', 'card')
 * @returns {Array} Transformed tools data
 */
export const transformToolsForUI = (tools, context = 'list') => {
  if (!Array.isArray(tools)) {
    return []
  }

  switch (context) {
    case 'dropdown':
      return tools.map(tool => ({
        value: tool._id,
        label: tool.name,
        disabled: !tool.isActive
      }))

    case 'card':
      return tools.map(tool => ({
        id: tool._id,
        title: tool.name,
        description: tool.description,
        status: tool.status,
        statusText: tool.isActive ? 'Active' : 'Inactive',
        statusColor: tool.isActive ? 'success' : 'secondary',
        lastUpdated: tool.updatedAt
      }))

    case 'list':
    default:
      return tools
  }
}

/**
 * Merge tools data from different sources (useful for caching scenarios)
 * @param {Array} existingTools - Existing tools array
 * @param {Array} newTools - New tools array
 * @param {string} mergeStrategy - Strategy for merging ('replace', 'merge', 'append')
 * @returns {Array} Merged tools array
 */
export const mergeToolsData = (existingTools = [], newTools = [], mergeStrategy = 'replace') => {
  if (!Array.isArray(existingTools)) existingTools = []
  if (!Array.isArray(newTools)) newTools = []

  switch (mergeStrategy) {
    case 'merge':
      // Merge by ID, with new tools taking precedence
      const merged = [...existingTools]
      newTools.forEach(newTool => {
        const existingIndex = merged.findIndex(tool => tool._id === newTool._id)
        if (existingIndex >= 0) {
          merged[existingIndex] = newTool
        } else {
          merged.push(newTool)
        }
      })
      return merged

    case 'append':
      // Append new tools, avoiding duplicates
      const appended = [...existingTools]
      newTools.forEach(newTool => {
        if (!appended.find(tool => tool._id === newTool._id)) {
          appended.push(newTool)
        }
      })
      return appended

    case 'replace':
    default:
      return newTools
  }
}

/**
 * Filter tools based on user role and permissions
 * @param {Array} tools - Array of normalized tool objects
 * @param {Object} userRole - User role object
 * @param {Object} filters - Additional filters
 * @returns {Array} Filtered tools array
 */
export const filterToolsByRole = (tools, userRole, filters = {}) => {
  if (!Array.isArray(tools)) {
    return []
  }

  let filtered = [...tools]

  // Apply role-based filtering
  if (userRole?.type !== 'system') {
    // Non-system users can only see tools for their tenant
    const userTenantId = userRole?.tenantId
    if (userTenantId) {
      filtered = filtered.filter(tool => 
        !tool.tenantId || tool.tenantId === userTenantId
      )
    }
  }

  // Apply additional filters
  if (filters.status !== undefined) {
    filtered = filtered.filter(tool => tool.status === filters.status)
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    filtered = filtered.filter(tool => 
      tool.name.toLowerCase().includes(searchTerm) ||
      (tool.description && tool.description.toLowerCase().includes(searchTerm))
    )
  }

  if (filters.tenantId) {
    filtered = filtered.filter(tool => tool.tenantId === filters.tenantId)
  }

  return filtered
}