/**
 * Comprehensive error handling utilities for payment flow
 */

// ** Error types
export const ERROR_TYPES = {
    NETWORK: 'network',
    SERVER: 'server',
    TIMEOUT: 'timeout',
    PAYMENT: 'payment',
    VALIDATION: 'validation',
    GENERAL: 'general'
};

// ** Error codes mapping
export const ERROR_CODES = {
    // Network errors
    NETWORK_ERROR: ERROR_TYPES.NETWORK,
    ECONNABORTED: ERROR_TYPES.TIMEOUT,
    ENOTFOUND: ERROR_TYPES.NETWORK,
    ECONNREFUSED: ERROR_TYPES.NETWORK,

    // HTTP status codes
    400: ERROR_TYPES.VALIDATION,
    401: ERROR_TYPES.VALIDATION,
    403: ERROR_TYPES.VALIDATION,
    404: ERROR_TYPES.NETWORK,
    408: ERROR_TYPES.TIMEOUT,
    422: ERROR_TYPES.VALIDATION,
    429: ERROR_TYPES.SERVER,
    500: ERROR_TYPES.SERVER,
    502: ERROR_TYPES.SERVER,
    503: ERROR_TYPES.SERVER,
    504: ERROR_TYPES.TIMEOUT,

    // Payment specific errors
    CARD_DECLINED: ERROR_TYPES.PAYMENT,
    INSUFFICIENT_FUNDS: ERROR_TYPES.PAYMENT,
    INVALID_CARD: ERROR_TYPES.VALIDATION,
    EXPIRED_CARD: ERROR_TYPES.VALIDATION,
    INVALID_CVV: ERROR_TYPES.VALIDATION,
    PROCESSING_ERROR: ERROR_TYPES.PAYMENT
};

// ** Determine error type from error object
export const getErrorType = (error) => {
    // Check error code first
    if (error?.code && ERROR_CODES[error.code]) {
        return ERROR_CODES[error.code];
    }

    // Check HTTP status
    if (error?.response?.status && ERROR_CODES[error.response.status]) {
        return ERROR_CODES[error.response.status];
    }

    // Check error message for specific patterns
    const message = error?.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('connection')) {
        return ERROR_TYPES.NETWORK;
    }

    if (message.includes('timeout') || message.includes('time out')) {
        return ERROR_TYPES.TIMEOUT;
    }

    if (message.includes('server') || message.includes('internal')) {
        return ERROR_TYPES.SERVER;
    }

    if (message.includes('card') || message.includes('payment') || message.includes('declined')) {
        return ERROR_TYPES.PAYMENT;
    }

    if (message.includes('invalid') || message.includes('required') || message.includes('validation')) {
        return ERROR_TYPES.VALIDATION;
    }

    return ERROR_TYPES.GENERAL;
};

// ** Get user-friendly error message
export const getUserFriendlyMessage = (error, errorType = null) => {
    const type = errorType || getErrorType(error);

    const messages = {
        [ERROR_TYPES.NETWORK]: 'Unable to connect to our servers. Please check your internet connection and try again.',
        [ERROR_TYPES.SERVER]: 'Our payment system is temporarily unavailable. Please try again in a few moments.',
        [ERROR_TYPES.TIMEOUT]: 'The request took too long to process. Please try again.',
        [ERROR_TYPES.PAYMENT]: 'Your payment could not be processed. Please check your payment details and try again.',
        [ERROR_TYPES.VALIDATION]: 'Please check your information and correct any errors.',
        [ERROR_TYPES.GENERAL]: 'An unexpected error occurred. Please try again.'
    };

    // Try to get specific message from error response
    const specificMessage = error?.response?.data?.message || error?.message;

    if (specificMessage && type === ERROR_TYPES.PAYMENT) {
        // Return specific payment error message if available
        return specificMessage;
    }

    return messages[type] || messages[ERROR_TYPES.GENERAL];
};

// ** Check if error is retryable
export const isRetryableError = (error, errorType = null) => {
    const type = errorType || getErrorType(error);

    const retryableTypes = [
        ERROR_TYPES.NETWORK,
        ERROR_TYPES.SERVER,
        ERROR_TYPES.TIMEOUT,
        ERROR_TYPES.GENERAL
    ];

    return retryableTypes.includes(type);
};

// ** Get retry delay based on attempt number
export const getRetryDelay = (attemptNumber, baseDelay = 1000) => {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 10000); // Max 10 seconds
};

// ** Error logging utility
export const logError = (error, context = {}) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        error: {
            message: error?.message,
            code: error?.code,
            status: error?.response?.status,
            stack: error?.stack
        },
        context,
        userAgent: navigator.userAgent,
        url: window.location.href
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Payment Error:', errorInfo);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production' && window.reportError) {
        window.reportError(errorInfo);
    }

    return errorInfo;
};

// ** Validation error handler
export const handleValidationErrors = (errors) => {
    if (!errors || typeof errors !== 'object') {
        return {};
    }

    const formattedErrors = {};

    Object.entries(errors).forEach(([field, message]) => {
        // Convert field names to user-friendly labels
        const fieldLabels = {
            holder_name: 'Card holder name',
            card_number: 'Card number',
            expiry_month: 'Expiry month',
            expiry_year: 'Expiry year',
            card_cvv: 'CVV'
        };

        const label = fieldLabels[field] || field;
        formattedErrors[field] = message.replace(field, label);
    });

    return formattedErrors;
};

// ** Network error recovery suggestions
export const getRecoverySuggestions = (errorType) => {
    const suggestions = {
        [ERROR_TYPES.NETWORK]: [
            'Check your internet connection',
            'Try switching to a different network',
            'Disable VPN if you\'re using one',
            'Clear your browser cache and cookies'
        ],
        [ERROR_TYPES.SERVER]: [
            'Wait a few minutes and try again',
            'Check our status page for updates',
            'Try using a different browser',
            'Contact support if the issue persists'
        ],
        [ERROR_TYPES.TIMEOUT]: [
            'Ensure you have a stable internet connection',
            'Try again with a faster connection',
            'Close other browser tabs to free up resources',
            'Contact support if timeouts continue'
        ],
        [ERROR_TYPES.PAYMENT]: [
            'Verify your card details are correct',
            'Check if your card has sufficient funds',
            'Ensure your card is not expired',
            'Try a different payment method',
            'Contact your bank if the issue persists'
        ],
        [ERROR_TYPES.VALIDATION]: [
            'Double-check all required fields',
            'Ensure card number is entered correctly',
            'Verify expiry date is not in the past',
            'Check CVV matches your card type'
        ],
        [ERROR_TYPES.GENERAL]: [
            'Refresh the page and try again',
            'Clear your browser cache',
            'Try using a different browser',
            'Contact support for assistance'
        ]
    };

    return suggestions[errorType] || suggestions[ERROR_TYPES.GENERAL];
};

// ** Error boundary helper
export const createErrorBoundaryInfo = (error, errorInfo) => {
    return {
        error: {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        },
        errorInfo: {
            componentStack: errorInfo?.componentStack
        },
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
    };
};

// ** Payment specific error handler
export const handlePaymentError = (error, context = {}) => {
    const errorType = getErrorType(error);
    const userMessage = getUserFriendlyMessage(error, errorType);
    const isRetryable = isRetryableError(error, errorType);
    const suggestions = getRecoverySuggestions(errorType);

    // Log the error
    const errorInfo = logError(error, { ...context, errorType });

    return {
        type: errorType,
        message: userMessage,
        originalError: error?.message || 'Unknown error',
        isRetryable,
        suggestions,
        errorInfo,
        canRetry: isRetryable && (context.retryCount || 0) < (context.maxRetries || 3)
    };
};

// ** Form error handler
export const handleFormError = (error, formData = {}) => {
    const errorType = getErrorType(error);

    if (errorType === ERROR_TYPES.VALIDATION) {
        // Handle validation errors
        const validationErrors = error?.response?.data?.errors || {};
        return {
            type: 'validation',
            fieldErrors: handleValidationErrors(validationErrors),
            message: 'Please correct the errors below and try again.'
        };
    }

    // Handle other form-related errors
    return handlePaymentError(error, { context: 'form_submission', formData });
};

// ** Default export
export default {
    ERROR_TYPES,
    ERROR_CODES,
    getErrorType,
    getUserFriendlyMessage,
    isRetryableError,
    getRetryDelay,
    logError,
    handleValidationErrors,
    getRecoverySuggestions,
    createErrorBoundaryInfo,
    handlePaymentError,
    handleFormError
};