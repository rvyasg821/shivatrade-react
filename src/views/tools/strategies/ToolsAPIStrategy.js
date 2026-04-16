/**
 * Base abstract class for Tools API strategies
 * Defines the interface that all concrete strategies must implement
 */
class ToolsAPIStrategy {
  /**
   * Get list of tools with pagination and filtering
   * @param {Object} params - Query parameters for filtering and pagination
   * @returns {Promise} API response promise
   */
  getToolsList(params) {
    throw new Error('getToolsList method must be implemented by concrete strategy')
  }

  /**
   * Get a specific tool by ID
   * @param {string} id - Tool ID
   * @returns {Promise} API response promise
   */
  getTool(id) {
    throw new Error('getTool method must be implemented by concrete strategy')
  }

  /**
   * Create a new tool
   * @param {Object} data - Tool data
   * @returns {Promise} API response promise
   */
  createTool(data) {
    throw new Error('createTool method must be implemented by concrete strategy')
  }

  /**
   * Update an existing tool
   * @param {string} id - Tool ID
   * @param {Object} data - Updated tool data
   * @returns {Promise} API response promise
   */
  updateTool(id, data) {
    throw new Error('updateTool method must be implemented by concrete strategy')
  }

  /**
   * Delete a tool
   * @param {string} id - Tool ID
   * @returns {Promise} API response promise
   */
  deleteTool(id) {
    throw new Error('deleteTool method must be implemented by concrete strategy')
  }

  /**
   * Update tool status
   * @param {string} id - Tool ID
   * @param {number} status - New status
   * @returns {Promise} API response promise
   */
  updateToolStatus(id, status) {
    throw new Error('updateToolStatus method must be implemented by concrete strategy')
  }
}

export default ToolsAPIStrategy