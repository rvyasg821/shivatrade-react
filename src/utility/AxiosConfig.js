/* eslint-disable no-underscore-dangle */

// ** Axios
import axios from "axios";

// ** Utils
import { getAccessToken, clearLocalStorage } from "@utils";

// ** Toast
import toast from 'react-hot-toast';

// ** Constants
import { hostRestApiUrl, hostRestApiPrefix } from "@constant/defaultValues";

// ** Helper function for retryable errors (was in tenantErrorHandling - multi-tenant removed)
const isRetryableError = (error) => {
    if (!error || !error.response) return false;
    const status = error.response.status;
    // Retry on 5xx server errors and 429 rate limiting
    return status >= 500 || status === 429;
};

const apiBaseUrl = `${hostRestApiUrl}${hostRestApiPrefix}`;

const instance = axios.create({
    baseURL: apiBaseUrl,
});

const handleClearAndReload = () => {
    clearLocalStorage();
    window.location.reload();
};

const getTenantId = () => {
    // Multi-tenant feature removed - always return null
    // x-tenant-id header will not be set
    return null;
};

// ---------------------
// Request Interceptor
// ---------------------
instance.interceptors.request.use((req) => {
    const token = getAccessToken();
    const lang = localStorage.getItem("i18nextLng") || "en";
    const tenantId = getTenantId();

    req.headers["x-custom-lang"] = lang;

    if (tenantId) {
        req.headers["x-tenant-id"] = tenantId;
    }

    if (token) {
        req.headers["Authorization"] = `Bearer ${token}`;
    }

    return req;
}, (err) => {
    return Promise.reject(err);
})

// ---------------------
// Response Interceptor
// ---------------------
instance.interceptors.response.use((res) => {
    return res;
}, async (error) => {
    const { response } = error;

    // ** Handle tenant-specific errors FIRST (before 401)
    if (response && response.data) {
        const { error: errorType, message, statusCode } = response.data;

        // Skip tenant error handling during registration/payment flows
        const isAuthOrPaymentRequest = response.config?.url && (
            response.config.url.includes('/payment/') ||
            response.config.url.includes('/auth/register') ||
            response.config.url.includes('/auth/me') ||
            response.config.url.includes('/public/auth/')
        );

        // ** Tenant Not Found - redirect to tenant not found page
        // Only match explicit TENANT_NOT_FOUND errors, not generic NOT_FOUND
        if (
            !isAuthOrPaymentRequest &&
            (
                errorType === 'TENANT_NOT_FOUND' ||
                (message && message.toLowerCase().includes('tenant') && message.toLowerCase().includes('not found'))
            )
        ) {
            console.warn('Tenant not found, redirecting to error page');

            // Show toast notification
            toast.error('Portal not found. Redirecting...', {
                duration: 1500,
                icon: '🏢',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });

            // Clear auth data and redirect after toast
            setTimeout(() => {
                clearLocalStorage();
                window.location.href = '/tenant/not-found';
            }, 1500);

            return Promise.reject(error);
        }

        // ** Tenant Suspended - redirect to suspended page
        // Only match explicit TENANT_SUSPENDED errors, not generic FORBIDDEN
        if (
            !isAuthOrPaymentRequest &&
            (
                errorType === 'TENANT_SUSPENDED' ||
                (message && message.toLowerCase().includes('tenant') && message.toLowerCase().includes('suspended'))
            )
        ) {
            console.warn('Tenant suspended, redirecting to suspended page');

            // Show toast notification
            toast.error('Account suspended. Redirecting...', {
                duration: 1500,
                icon: '⚠️',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });

            // Clear auth data and redirect after toast
            setTimeout(() => {
                clearLocalStorage();
                window.location.href = '/tenant/suspended';
            }, 1500);

            return Promise.reject(error);
        }

        // ** Tenant Validation Error - could indicate tenant issues
        if (
            !isAuthOrPaymentRequest &&
            errorType === 'TENANT_VALIDATION_ERROR' &&
            statusCode === 400 &&
            message &&
            (message.includes('not found') || message.includes('not accessible'))
        ) {
            console.warn('Tenant validation failed, redirecting to error page');
            // Clear auth data
            clearLocalStorage();
            // Redirect to tenant not found page
            window.location.href = '/tenant/not-found';
            return Promise.reject(error);
        }

        // ** Additional tenant error handling for 403/404 with tenant context
        // Only check for explicit tenant-related messages, not company errors
        if (!isAuthOrPaymentRequest && (statusCode === 403 || statusCode === 404)) {
            if (message && message.toLowerCase().includes('tenant')) {
                console.warn('Tenant access error detected:', message);
                // Determine if it's a not found or access denied issue
                if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('does not exist')) {
                    clearLocalStorage();
                    window.location.href = '/tenant/not-found';
                    return Promise.reject(error);
                } else if (message.toLowerCase().includes('suspended') || message.toLowerCase().includes('disabled')) {
                    clearLocalStorage();
                    window.location.href = '/tenant/suspended';
                    return Promise.reject(error);
                }
            }
        }
    }

    // ** Handle 401 Unauthorized (after tenant errors)
    let status = error?.status;
    if (error?.response?.status) {
        status = error.response.status;
    }

    if (status === 401) {
        handleClearAndReload();
    }

    // ** Retry logic for retryable errors (5xx, 429)
    const originalRequest = error.config;

    // Check if this is a retryable error and hasn't been retried yet
    if (isRetryableError(error) && !originalRequest._retry) {
        originalRequest._retry = true;
        originalRequest._retryCount = originalRequest._retryCount || 0;

        // Only retry up to 2 times
        if (originalRequest._retryCount < 2) {
            originalRequest._retryCount += 1;

            // Exponential backoff: 1s, 2s
            const delay = 1000 * Math.pow(2, originalRequest._retryCount - 1);

            console.log(`🔄 Retrying request (attempt ${originalRequest._retryCount}/2) after ${delay}ms...`);

            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(instance(originalRequest));
                }, delay);
            });
        } else {
            console.warn('⚠️ Max retry attempts reached');
            toast.error('Service temporarily unavailable. Please try again later.', {
                duration: 3000,
                icon: '⚠️',
            });
        }
    }

    return Promise.reject(error);
})

export default instance;
