import ToolsAPIStrategy from './ToolsAPIStrategy'
import instance from "@src/utility/AxiosConfig"
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"
import { createToolsErrorFromResponse } from '../errors/ToolsErrors'
import { logApiRequest, logApiResponse, createPerformanceTimer } from '../utils/logger'

/**
 * Admin API Strategy for tools operations
 * Uses admin-level endpoints that provide access to all tools across tenants
 */
class AdminToolsAPIStrategy extends ToolsAPIStrategy {
  /**
   * Get list of tools using admin endpoint
   * @param {Object} params - Query parameters for filtering and pagination
   * @returns {Promise} API response promise
   */
  async getToolsList(params) {
    const endTimer = createPerformanceTimer('AdminToolsAPIStrategy.getToolsList')
    
    try {
      logApiRequest('getToolsList', API_ENDPOINTS.tools.list, params, 'admin')
      
      const response = await instance.get(`${API_ENDPOINTS.tools.list}`, { params })
      const duration = endTimer()
      
      logApiResponse('getToolsList', true, response.status, duration, 'admin')
      return response.data
    } catch (error) {
      const duration = endTimer()
      logApiResponse('getToolsList', false, error.response?.status, duration, 'admin')
      
      throw createToolsErrorFromResponse(error, API_ENDPOINTS.tools.list, {
        action: 'view tools list',
        userRole: { type: 'system', name: 'Admin' }
      })
    }
  }

  /**
   * Get a specific tool by ID using admin endpoint
   * @param {string} id - Tool ID
   * @returns {Promise} API response promise
   */
  async getTool(id) {
    try {
      const endpoint = `${API_ENDPOINTS.tools.get}/${id}`
      const response = await instance.get(endpoint)
      return response.data
    } catch (error) {
      throw createToolsErrorFromResponse(error, `${API_ENDPOINTS.tools.get}/${id}`, {
        action: 'view tool details',
        userRole: { type: 'system', name: 'Admin' },
        toolId: id
      })
    }
  }

  /**
   * Create a new tool using admin endpoint
   * @param {Object} data - Tool data
   * @returns {Promise} API response promise
   */
  async createTool(data) {
    try {
      const response = await instance.post(`${API_ENDPOINTS.tools.create}`, data)
      return response.data
    } catch (error) {
      throw createToolsErrorFromResponse(error, API_ENDPOINTS.tools.create, {
        action: 'create tool',
        userRole: { type: 'system', name: 'Admin' }
      })
    }
  }

  /**
   * Update an existing tool using admin endpoint
   * @param {string} id - Tool ID
   * @param {Object} data - Updated tool data
   * @returns {Promise} API response promise
   */
  async updateTool(id, data) {
    try {
      const endpoint = `${API_ENDPOINTS.tools.update}/${id}/update`
      const response = await instance.put(endpoint, data)
      return response.data
    } catch (error) {
      throw createToolsErrorFromResponse(error, `${API_ENDPOINTS.tools.update}/${id}/update`, {
        action: 'update tool',
        userRole: { type: 'system', name: 'Admin' },
        toolId: id
      })
    }
  }

  /**
   * Delete a tool using admin endpoint
   * @param {string} id - Tool ID
   * @returns {Promise} API response promise
   */
  async deleteTool(id) {
    try {
      const endpoint = `${API_ENDPOINTS.tools.delete}/${id}/delete`
      const response = await instance.delete(endpoint)
      return response.data
    } catch (error) {
      throw createToolsErrorFromResponse(error, `${API_ENDPOINTS.tools.delete}/${id}/delete`, {
        action: 'delete tool',
        userRole: { type: 'system', name: 'Admin' },
        toolId: id
      })
    }
  }

  /**
   * Update tool status using admin endpoint
   * @param {string} id - Tool ID
   * @param {number} status - New status
   * @returns {Promise} API response promise
   */
  async updateToolStatus(id, status) {
    try {
      const endpoint = `${API_ENDPOINTS.tools.status}/${id}/status`
      const response = await instance.patch(endpoint, { status })
      return response.data
    } catch (error) {
      throw createToolsErrorFromResponse(error, `${API_ENDPOINTS.tools.status}/${id}/status`, {
        action: 'update tool status',
        userRole: { type: 'system', name: 'Admin' },
        toolId: id
      })
    }
  }
}

export default AdminToolsAPIStrategy