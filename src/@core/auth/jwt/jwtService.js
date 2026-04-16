import axios from 'axios'
import jwtDefaultConfig from './jwtDefaultConfig'
import toast from 'react-hot-toast'


export default class JwtService {
  // ** jwtConfig <= Will be used by this service
  jwtConfig = { ...jwtDefaultConfig }

  // ** For Refreshing Token
  isAlreadyFetchingAccessToken = false

  // ** For Refreshing Token
  subscribers = []

  constructor(jwtOverrideConfig) {
    this.jwtConfig = { ...this.jwtConfig, ...jwtOverrideConfig }

    // ** Request Interceptor
    axios.interceptors.request.use(
      config => {
        // ** Get token from localStorage
        const accessToken = this.getToken()

        // ** If token is present add it to request's Authorization Header
        if (accessToken) {
          // ** eslint-disable-next-line no-param-reassign
          config.headers.Authorization = `${this.jwtConfig.tokenType} ${accessToken}`
        }

        // ** Add Tenant and Location headers if available
        const tenantId = localStorage.getItem('tenantId')
        const locationId = localStorage.getItem('locationId')

        if (tenantId) {
          config.headers['X-Tenant-Id'] = tenantId.replace(/"/g, '')
        }

        if (locationId && locationId !== 'null') {
          config.headers['X-Location-Id'] = locationId.replace(/"/g, '')
        }

        return config
      },
      error => Promise.reject(error)
    )

    // ** Add request/response interceptor
    axios.interceptors.response.use(
      response => response,
      error => {
        // ** const { config, response: { status } } = error
        const { config, response } = error
        const originalRequest = config

        // ** Handle tenant-specific errors
        if (response && response.data) {
          const { error: errorType, message, statusCode } = response.data

          // ** Tenant Not Found - redirect to tenant not found page
          // Only match explicit TENANT_NOT_FOUND errors, not generic NOT_FOUND
          if (
            errorType === 'TENANT_NOT_FOUND' ||
            (message && message.toLowerCase().includes('tenant') && message.toLowerCase().includes('not found'))
          ) {
            console.warn('Tenant not found, redirecting to error page')

            toast.error('Portal not found. Redirecting...', {
              duration: 1500,
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              }
            })

            setTimeout(() => {
              localStorage.removeItem('userData')
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              window.location.href = '/tenant/not-found'
            }, 1500)

            return Promise.reject(error)
          }

          // ** Tenant Suspended - redirect to suspended page
          // Only match explicit TENANT_SUSPENDED errors, not generic FORBIDDEN
          if (
            errorType === 'TENANT_SUSPENDED' ||
            (message && message.toLowerCase().includes('tenant') && message.toLowerCase().includes('suspended'))
          ) {
            console.warn('Tenant suspended, redirecting to suspended page')

            toast.error('Account suspended. Redirecting...', {
              duration: 1500,
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              }
            })

            setTimeout(() => {
              localStorage.removeItem('userData')
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              window.location.href = '/tenant/suspended'
            }, 1500)

            return Promise.reject(error)
          }

          // ** Tenant Validation Error - could indicate tenant issues
          if (
            errorType === 'TENANT_VALIDATION_ERROR' &&
            statusCode === 400 &&
            message &&
            (message.includes('not found') || message.includes('not accessible'))
          ) {
            console.warn('🏢 Tenant validation failed, redirecting to error page')
            // Clear auth data
            localStorage.removeItem('userData')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            // Redirect to tenant not found page
            window.location.href = '/tenant/not-found'
            return Promise.reject(error)
          }

          // ** Tool Access / Permission Forbidden (Non-Suspended)
          if (response.status === 403 && !message?.toLowerCase().includes('suspended')) {
            toast.error(message || 'Access Denied: You do not have permission to view this resource.', {
              duration: 4000,
              icon: '🔒'
            });
            return Promise.reject(error); // Don't redirect, let component handle empty state or just stay on page
          }
        }

        // ** if (status === 401) {
        if (response && response.status === 401) {
          if (!this.isAlreadyFetchingAccessToken) {
            this.isAlreadyFetchingAccessToken = true
            this.refreshToken().then(r => {
              this.isAlreadyFetchingAccessToken = false

              // ** Update accessToken in localStorage
              this.setToken(r.data.accessToken)
              this.setRefreshToken(r.data.refreshToken)

              this.onAccessTokenFetched(r.data.accessToken)
            }).catch(refreshError => {
              // If refresh fails, redirect to login
              this.isAlreadyFetchingAccessToken = false
              localStorage.removeItem('userData')
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              window.location.href = '/login'
            })
          }
          const retryOriginalRequest = new Promise(resolve => {
            this.addSubscriber(accessToken => {
              // ** Make sure to assign accessToken according to your response.
              // ** Check: https://pixinvent.ticksy.com/ticket/2413870
              // ** Change Authorization header
              originalRequest.headers.Authorization = `${this.jwtConfig.tokenType} ${accessToken}`
              resolve(this.axios(originalRequest))
            })
          })
          return retryOriginalRequest
        }
        return Promise.reject(error)
      }
    )
  }

  onAccessTokenFetched(accessToken) {
    this.subscribers = this.subscribers.filter(callback => callback(accessToken))
  }

  addSubscriber(callback) {
    this.subscribers.push(callback)
  }

  getToken() {
    return localStorage.getItem(this.jwtConfig.storageTokenKeyName)
  }

  getRefreshToken() {
    return localStorage.getItem(this.jwtConfig.storageRefreshTokenKeyName)
  }

  setToken(value) {
    localStorage.setItem(this.jwtConfig.storageTokenKeyName, value)
  }

  setRefreshToken(value) {
    localStorage.setItem(this.jwtConfig.storageRefreshTokenKeyName, value)
  }

  login(...args) {
    return axios.post(this.jwtConfig.loginEndpoint, ...args)
  }

  register(...args) {
    return axios.post(this.jwtConfig.registerEndpoint, ...args)
  }

  refreshToken() {
    return axios.post(this.jwtConfig.refreshEndpoint, {
      refreshToken: this.getRefreshToken()
    })
  }
}
