import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { getDomailUrl } from "@src/utility/Utils";
import { appsRoot } from "@constant/defaultValues";

/**
 * Payment API utility functions
 */

// ** Error handling utility
export const handleApiError = (error) => {
    const defaultMessage = "An unexpected error occurred. Please try again.";

    if (error?.response?.data?.message) {
        return error.response.data.message;
    }

    if (error?.message) {
        return error.message;
    }

    return defaultMessage;
};

// ** Network error handling with retry logic
export const handleNetworkError = (error) => {
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNABORTED') {
        return "Network connection failed. Please check your internet connection and try again.";
    }

    if (error?.response?.status >= 500) {
        return "Server error occurred. Please try again in a few moments.";
    }

    if (error?.response?.status === 429) {
        return "Too many requests. Please wait a moment before trying again.";
    }

    return handleApiError(error);
};

// ** Retry configuration
export const getRetryConfig = (attemptNumber) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    if (attemptNumber >= maxRetries) {
        return null;
    }

    return {
        attemptNumber: attemptNumber + 1,
        maxRetries,
        delay: baseDelay * Math.pow(2, attemptNumber), // Exponential backoff
    };
};

// ** PayPal card payment request
export const paypalCardPaymentRequest = async (payload) => {
    try {
        const response = await instance.post(API_ENDPOINTS.payments.paypalCardPayment, payload);
        return {
            success: true,
            data: response.data,
            statusCode: response.status
        };
    } catch (error) {
        return {
            success: false,
            error: handleApiError(error),
            statusCode: error?.response?.status || 500
        };
    }
};

// ** Confirm PayPal redirect payment request
export const confirmPaypalPaymentRequest = async (payload) => {
    try {
        const response = await instance.post(API_ENDPOINTS.payments.confirmPaypalPayment, payload);
        return {
            success: true,
            data: response.data,
            statusCode: response.status
        };
    } catch (error) {
        return {
            success: false,
            error: handleApiError(error),
            statusCode: error?.response?.status || 500
        };
    }
};

// ** Build payment payload
export const buildPaymentPayload = ({
    registerItem,
    selectedPlan,
    selectedTools,
    billingCycle,
    paymentData,
    language = 'en'
}) => {
    if (!registerItem?._id || !selectedPlan || !paymentData) {
        throw new Error("Missing required payment data");
    }

    // Calculate pricing
    const selectedToolsData = selectedPlan.tools?.filter(tool =>
        selectedTools.includes(tool._id)
    ) || [];

    const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + (tool.price || 0), 0);
    const basePrice = selectedPlan.special_price && selectedPlan.special_price > 0
        ? selectedPlan.special_price
        : selectedPlan.price || 0;

    const subtotal = toolsTotal + basePrice;
    const platformFee = selectedPlan.platform_price || 0;
    const taxValue = selectedPlan.tax_value || 0;
    const finalPrice = subtotal + platformFee + (subtotal * (taxValue / 100));

    return {
        lang: language,
        customer_id: registerItem._id,
        plan_id: selectedPlan._id,
        holder_name: paymentData.holder_name,
        card_number: paymentData.card_number,
        expiry_month: paymentData.expiry_month,
        expiry_year: paymentData.expiry_year,
        card_cvv: paymentData.card_cvv,
        price: basePrice,
        special_price: selectedPlan.special_price || null,
        special_price_duration: selectedPlan.special_price_duration || null,
        final_price: parseFloat(finalPrice.toFixed(2)),
        tax_value: taxValue,
        platform_fee: platformFee,
        total: parseFloat(finalPrice.toFixed(2)),
        redirect_url: `${getDomailUrl()}${appsRoot}/register/payment-process`,
        selected_tools: selectedTools,
        billing_cycle: billingCycle,
        // Additional metadata
        metadata: {
            plan_name: selectedPlan.name,
            tools_count: selectedTools.length,
            company_name: registerItem.company_name,
            customer_email: registerItem.email
        }
    };
};

// ** Build payment confirmation payload
export const buildConfirmationPayload = ({
    requestId,
    state,
    action,
    customerId,
    language = 'en'
}) => {
    if (!requestId || !customerId) {
        throw new Error("Missing required confirmation data");
    }

    return {
        lang: language,
        request_id: requestId,
        state: state || '',
        action: action || '',
        customer_id: customerId
    };
};

// ** Validate payment response
export const validatePaymentResponse = (response) => {
    if (!response) {
        return { isValid: false, error: "No response received" };
    }

    if (!response.success) {
        return { isValid: false, error: response.error || "Payment failed" };
    }

    const data = response.data?.data || response.data;

    if (!data) {
        return { isValid: false, error: "Invalid response format" };
    }

    // Check for redirect URL (PayPal flow)
    if (data.redirectConfirm) {
        return {
            isValid: true,
            requiresRedirect: true,
            redirectUrl: data.redirectConfirm,
            data
        };
    }

    // Check for completed payment
    if (data._id && data.status === "completed") {
        return {
            isValid: true,
            isCompleted: true,
            data
        };
    }

    // Payment initiated but not completed
    if (data._id) {
        return {
            isValid: true,
            isPending: true,
            data
        };
    }

    return { isValid: false, error: "Invalid payment response" };
};

// ** Secure data transmission utilities
export const sanitizePaymentData = (paymentData) => {
    // Remove any potentially sensitive data from logs/storage
    const sanitized = { ...paymentData };

    // Mask card number for logging
    if (sanitized.card_number) {
        const cardNumber = sanitized.card_number.replace(/\s/g, '');
        sanitized.card_number_masked = `****-****-****-${cardNumber.slice(-4)}`;
        delete sanitized.card_number;
    }

    // Remove CVV completely
    delete sanitized.card_cvv;

    return sanitized;
};

// ** Payment status checker
export const checkPaymentStatus = (paymentItem) => {
    if (!paymentItem) {
        return { status: 'unknown', message: 'No payment information available' };
    }

    switch (paymentItem.status?.toLowerCase()) {
        case 'completed':
            return { status: 'completed', message: 'Payment completed successfully' };
        case 'pending':
            return { status: 'pending', message: 'Payment is being processed' };
        case 'failed':
            return { status: 'failed', message: 'Payment failed' };
        case 'cancelled':
            return { status: 'cancelled', message: 'Payment was cancelled' };
        case 'refunded':
            return { status: 'refunded', message: 'Payment was refunded' };
        default:
            return { status: 'unknown', message: 'Unknown payment status' };
    }
};

// ** Format payment amount for display
export const formatPaymentAmount = (amount, currency = 'USD') => {
    if (typeof amount !== 'number') {
        return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

// ** Generate payment reference
export const generatePaymentReference = (customerId, planId) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `PAY_${customerId}_${planId}_${timestamp}_${random}`.toUpperCase();
};

// ** Validate payment form data before API call
export const validatePaymentFormData = (formData) => {
    const errors = [];

    if (!formData.holder_name?.trim()) {
        errors.push("Card holder name is required");
    }

    if (!formData.card_number?.replace(/\s/g, '')) {
        errors.push("Card number is required");
    }

    if (!formData.expiry_month || !formData.expiry_year) {
        errors.push("Card expiry date is required");
    }

    if (!formData.card_cvv) {
        errors.push("Card CVV is required");
    }

    // Validate expiry date is not in the past
    if (formData.expiry_month && formData.expiry_year) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const expiryYear = parseInt(formData.expiry_year);
        const expiryMonth = parseInt(formData.expiry_month);

        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
            errors.push("Card expiry date cannot be in the past");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// ** Default export with all utilities
export default {
    paypalCardPaymentRequest,
    confirmPaypalPaymentRequest,
    buildPaymentPayload,
    buildConfirmationPayload,
    validatePaymentResponse,
    sanitizePaymentData,
    checkPaymentStatus,
    formatPaymentAmount,
    generatePaymentReference,
    validatePaymentFormData,
    handleApiError,
    handleNetworkError,
    getRetryConfig
};