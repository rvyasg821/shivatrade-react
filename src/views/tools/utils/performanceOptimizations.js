/**
 * Performance optimization utilities for tools management
 */

// ** Strategy instance cache
const strategyCache = new Map()

/**
 * Get cached API strategy instance or create new one
 * @param {Object} userRole - User role object
 * @param {string|null} selectedCompany - Selected company tenant ID
 * @param {string|null} tenantId - User's tenant ID
 * @returns {ToolsAPIStrategy} Cached or new strategy instance
 */
export const getCachedStrategy = (userRole, selectedCompany = null, tenantId = null) => {
  // Debug logging
  console.log('getCachedStrategy called with:', { userRole, selectedCompany, tenantId })
  
  // Create cache key based on role and context
  const cacheKey = `${userRole?.type || 'unknown'}-${userRole?.name || 'unknown'}-${selectedCompany || 'none'}-${tenantId || 'none'}`
  
  // Check if strategy is already cached
  if (strategyCache.has(cacheKey)) {
    console.log('Returning cached strategy for key:', cacheKey)
    return strategyCache.get(cacheKey)
  }
  
  try {
    // Import strategy factory dynamically to avoid circular dependencies
    const { ToolsAPIStrategyFactory } = require('../strategies')
    
    // Create new strategy instance
    console.log('Creating new strategy instance')
    const strategy = ToolsAPIStrategyFactory.createStrategy(userRole, selectedCompany, tenantId)
    
    // Cache the strategy (with size limit)
    if (strategyCache.size >= 10) {
      // Remove oldest entry if cache is full
      const firstKey = strategyCache.keys().next().value
      strategyCache.delete(firstKey)
    }
    
    strategyCache.set(cacheKey, strategy)
    console.log('Strategy cached with key:', cacheKey)
    return strategy
  } catch (error) {
    console.error('Failed to create strategy:', error)
    throw error
  }
}

/**
 * Clear strategy cache (useful for logout or role changes)
 */
export const clearStrategyCache = () => {
  strategyCache.clear()
}

// ** Request deduplication
const pendingRequests = new Map()

/**
 * Deduplicate API requests to prevent multiple identical calls
 * @param {string} requestKey - Unique key for the request
 * @param {Function} requestFunction - Function that returns a promise
 * @returns {Promise} Deduplicated request promise
 */
export const deduplicateRequest = (requestKey, requestFunction) => {
  // Check if request is already pending
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)
  }
  
  // Create new request promise
  const requestPromise = requestFunction()
    .finally(() => {
      // Remove from pending requests when completed
      pendingRequests.delete(requestKey)
    })
  
  // Store pending request
  pendingRequests.set(requestKey, requestPromise)
  
  return requestPromise
}

/**
 * Generate request key for deduplication
 * @param {string} action - Action type (e.g., 'getToolsList', 'getTool')
 * @param {Object} params - Request parameters
 * @param {string} strategy - Strategy type ('admin' or 'tenant')
 * @returns {string} Unique request key
 */
export const generateRequestKey = (action, params = {}, strategy = 'unknown') => {
  const paramString = JSON.stringify(params, Object.keys(params).sort())
  return `${action}-${strategy}-${paramString}`
}

// ** Data caching utilities
const dataCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Cache data with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export const cacheData = (key, data, ttl = CACHE_TTL) => {
  const expiresAt = Date.now() + ttl
  dataCache.set(key, { data, expiresAt })
  
  // Clean up expired entries periodically
  if (dataCache.size % 10 === 0) {
    cleanExpiredCache()
  }
}

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/not found
 */
export const getCachedData = (key) => {
  const cached = dataCache.get(key)
  
  if (!cached) {
    return null
  }
  
  if (Date.now() > cached.expiresAt) {
    dataCache.delete(key)
    return null
  }
  
  return cached.data
}

/**
 * Clear expired cache entries
 */
const cleanExpiredCache = () => {
  const now = Date.now()
  for (const [key, value] of dataCache.entries()) {
    if (now > value.expiresAt) {
      dataCache.delete(key)
    }
  }
}

/**
 * Clear all cached data
 */
export const clearDataCache = () => {
  dataCache.clear()
}

// ** Debounced functions
const debounceTimers = new Map()

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {string} key - Unique key for the debounced function
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay, key = 'default') => {
  return (...args) => {
    // Clear existing timer
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key))
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      func.apply(this, args)
      debounceTimers.delete(key)
    }, delay)
    
    debounceTimers.set(key, timer)
  }
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @param {string} key - Unique key for the throttled function
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit, key = 'default') => {
  let inThrottle = false
  const throttleKey = `throttle-${key}`
  
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// ** Memory optimization
/**
 * Optimize large arrays by implementing virtual scrolling data
 * @param {Array} items - Full items array
 * @param {number} startIndex - Start index for visible items
 * @param {number} endIndex - End index for visible items
 * @param {number} bufferSize - Buffer size for smooth scrolling
 * @returns {Object} Optimized data structure
 */
export const optimizeForVirtualScrolling = (items, startIndex, endIndex, bufferSize = 5) => {
  if (!Array.isArray(items)) {
    return { visibleItems: [], totalCount: 0, startIndex: 0, endIndex: 0 }
  }
  
  const bufferedStart = Math.max(0, startIndex - bufferSize)
  const bufferedEnd = Math.min(items.length, endIndex + bufferSize)
  
  return {
    visibleItems: items.slice(bufferedStart, bufferedEnd),
    totalCount: items.length,
    startIndex: bufferedStart,
    endIndex: bufferedEnd,
    actualStartIndex: startIndex,
    actualEndIndex: endIndex
  }
}

/**
 * Batch multiple state updates to reduce re-renders
 * @param {Function} updateFunction - Function that performs state updates
 * @returns {Function} Batched update function
 */
export const batchUpdates = (updateFunction) => {
  let pendingUpdates = []
  let updateScheduled = false
  
  return (update) => {
    pendingUpdates.push(update)
    
    if (!updateScheduled) {
      updateScheduled = true
      
      // Use React's unstable_batchedUpdates if available, otherwise setTimeout
      const batchFunction = window.React?.unstable_batchedUpdates || ((fn) => setTimeout(fn, 0))
      
      batchFunction(() => {
        const updates = [...pendingUpdates]
        pendingUpdates = []
        updateScheduled = false
        
        updateFunction(updates)
      })
    }
  }
}

// ** Company data optimization for super admin
let companiesCache = null
let companiesCacheExpiry = 0
const COMPANIES_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/**
 * Get cached companies list for super admin
 * @returns {Array|null} Cached companies or null if expired
 */
export const getCachedCompanies = () => {
  if (companiesCache && Date.now() < companiesCacheExpiry) {
    return companiesCache
  }
  return null
}

/**
 * Cache companies list
 * @param {Array} companies - Companies array
 */
export const cacheCompanies = (companies) => {
  companiesCache = companies
  companiesCacheExpiry = Date.now() + COMPANIES_CACHE_TTL
}

/**
 * Clear companies cache
 */
export const clearCompaniesCache = () => {
  companiesCache = null
  companiesCacheExpiry = 0
}

// ** Cleanup function for component unmount
export const cleanup = () => {
  clearStrategyCache()
  clearDataCache()
  clearCompaniesCache()
  
  // Clear debounce timers
  debounceTimers.forEach(timer => clearTimeout(timer))
  debounceTimers.clear()
  
  // Clear pending requests
  pendingRequests.clear()
}