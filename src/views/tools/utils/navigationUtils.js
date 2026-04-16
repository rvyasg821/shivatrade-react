/**
 * Navigation utilities for tools with company context
 */

/**
 * Navigate to tool edit page with company context
 * @param {Function} navigate - React Router navigate function
 * @param {string} toolId - Tool ID to edit
 * @param {string|null} selectedCompany - Selected company context
 */
export const navigateToToolEdit = (navigate, toolId, selectedCompany = null) => {
  const basePath = `/apps/tools/edit/${toolId}`

  if (selectedCompany) {
    // Add company context as URL parameter
    navigate(`${basePath}?company=${selectedCompany}`)
  } else {
    navigate(basePath)
  }
}

/**
 * Navigate to tool add page with company context
 * @param {Function} navigate - React Router navigate function
 * @param {string|null} selectedCompany - Selected company context
 */
export const navigateToToolAdd = (navigate, selectedCompany = null) => {
  const basePath = `/apps/tools/add`

  if (selectedCompany) {
    // Add company context as URL parameter
    navigate(`${basePath}?company=${selectedCompany}`)
  } else {
    navigate(basePath)
  }
}

/**
 * Get company context from URL parameters
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {string|null} Company ID from URL or null
 */
export const getCompanyFromURL = (searchParams) => {
  return searchParams.get('company') || null
}

/**
 * Navigate to tools list with company context preserved
 * @param {Function} navigate - React Router navigate function
 * @param {string|null} selectedCompany - Selected company context
 */
export const navigateToToolsList = (navigate, selectedCompany = null) => {
  const basePath = `/apps/tools`

  if (selectedCompany) {
    navigate(`${basePath}?company=${selectedCompany}`)
  } else {
    navigate(basePath)
  }
}

/**
 * Update URL with company context without navigation
 * @param {Function} navigate - React Router navigate function
 * @param {string} currentPath - Current path
 * @param {string|null} selectedCompany - Selected company context
 * @param {boolean} replace - Whether to replace current history entry
 */
export const updateURLWithCompany = (navigate, currentPath, selectedCompany, replace = true) => {
  if (selectedCompany) {
    const url = `${currentPath}?company=${selectedCompany}`
    navigate(url, { replace })
  } else {
    navigate(currentPath, { replace })
  }
}