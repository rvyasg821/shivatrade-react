import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { handleApiError } from "./paymentApi";

/**
 * Stripe Payment API utility functions
 */

// ** Get Stripe configuration (publishable key)
export const getStripeConfigRequest = async () => {
    try {
        const response = await instance.get(API_ENDPOINTS.payments.stripeConfig);
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

// ** Stripe card payment request
export const stripeCardPaymentRequest = async (payload) => {
    try {
        const response = await instance.post(API_ENDPOINTS.payments.stripeCardPayment, payload);
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

// ** Confirm Stripe payment after 3D Secure authentication
export const confirmStripePaymentRequest = async (payload) => {
    try {
        const response = await instance.post(API_ENDPOINTS.payments.stripeConfirmPayment, payload);
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

// ** Build Stripe payment payload
export const buildStripePaymentPayload = ({
    registerItem,
    selectedPlan,
    selectedTools,
    billingCycle,
    paymentMethodId,
    saveCard = true,
    requestId,
    language = 'en',
    discountCode = null,
    discountPrice = null,
    appliedDiscount = null,
    taxInfo = {},
    selectedLocations = 1,
    calculateToolPrice = null,
    getPlanBasePrice = null
}) => {
    if (!registerItem?._id || !selectedPlan || !paymentMethodId) {
        throw new Error("Missing required payment data");
    }

    // Calculate pricing
    const selectedToolsData = selectedPlan.tools?.filter(tool =>
        selectedTools.includes(tool._id)
    ) || [];

    // Use provided calculation functions or fallback to default
    const calcToolPrice = calculateToolPrice || ((tool) => tool.price || 0);
    const calcPlanPrice = getPlanBasePrice || ((plan) => {
        const locationTiers = plan.location_pricing || [];
        const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
        const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
        return currentTier?.special_price > 0
            ? currentTier.special_price
            : (currentTier?.price || plan.platform_price || 0);
    });

    const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calcToolPrice(tool), 0);
    const planBasePrice = calcPlanPrice(selectedPlan);
    const subtotal = toolsTotal + planBasePrice;
    const taxValue = taxInfo.value || 0;

    let taxPrice = (subtotal * (taxValue / 100));
    let finalPrice = subtotal + taxPrice;

    if (appliedDiscount?.price) {
        finalPrice = appliedDiscount.price + (appliedDiscount.price * (taxValue / 100));
        taxPrice = (appliedDiscount.price * (taxValue / 100));
    }

    const payload = {
        lang: language,
        user_id: registerItem._id,
        plan_id: selectedPlan._id,
        payment_method_id: paymentMethodId,
        save_card: saveCard,
        request_id: requestId,
        selected_tools: selectedTools,
        billing_cycle: billingCycle,
        locations: selectedLocations,
        price: planBasePrice,
        plan_price: planBasePrice,
        special_price: null,
        special_price_duration: null,
        final_price: finalPrice,
        tax_value: taxPrice,
        subtotal: subtotal,
        total: appliedDiscount?.price ?? subtotal,
        tools_price: toolsTotal,
        platform_fee: planBasePrice,
        plan_details: {
            name: selectedPlan.name,
            description: selectedPlan.description,
            duration: selectedPlan.duration,
            duration_type: selectedPlan.duration_type,
            tools_count: selectedToolsData.length,
            total_tools_available: selectedPlan.tools?.length || 0,
            locations: selectedLocations
        },
        tools: selectedToolsData.map(tool => ({
            _id: tool._id,
            name: tool.name,
            base_price: tool.base_price ?? tool.price ?? 0,
            price: calcToolPrice(tool),
            calculated_price: calcToolPrice(tool),
            pricing_mode: tool.pricing_mode || 'fixed',
            location_multiplier: tool.location_multiplier || 1.0
        })),
        user_details: {
            company_name: registerItem.company_name,
            email: registerItem.email,
            fname: registerItem.fname,
            lname: registerItem.lname,
            mobile: registerItem.mobile,
            country_code: registerItem.country_code?.code || '+1'
        },
        timestamp: new Date().toISOString(),
        source: 'registration_flow'
    };

    if (discountCode?.trim()) {
        payload.discount_code = discountCode.trim();
    }
    if (discountPrice) {
        payload.discount_price = discountPrice;
    }
    if (appliedDiscount?.data?._id) {
        payload.discount_id = appliedDiscount.data._id;
    }
    // Add discount duration info
    if (appliedDiscount?.duration?.type || appliedDiscount?.duration_type) {
        payload.discount_duration_type = appliedDiscount.duration?.type || appliedDiscount.duration_type;
    }
    if (appliedDiscount?.duration?.months || appliedDiscount?.duration_months) {
        payload.discount_duration_months = appliedDiscount.duration?.months || appliedDiscount.duration_months;
    }
    if (appliedDiscount?.data?.name || appliedDiscount?.discount_name) {
        payload.discount_name = appliedDiscount.data?.name || appliedDiscount.discount_name;
    }
    // Add location rules
    if (appliedDiscount?.location_rules || appliedDiscount?.data?.location_rules) {
        payload.discount_location_rules = appliedDiscount.location_rules || appliedDiscount.data?.location_rules || [];
    }

    return payload;
};

// ** Build Stripe confirmation payload
export const buildStripeConfirmationPayload = ({
    paymentIntentId,
    requestId,
    language = 'en'
}) => {
    if (!paymentIntentId || !requestId) {
        throw new Error("Missing required confirmation data");
    }

    return {
        lang: language,
        payment_intent_id: paymentIntentId,
        request_id: requestId
    };
};

// ** Validate Stripe payment response
export const validateStripePaymentResponse = (response) => {
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

    // Check if 3D Secure authentication required
    if (data.requires_action && data.client_secret) {
        return {
            isValid: true,
            requires3DS: true,
            clientSecret: data.client_secret,
            paymentIntentId: data.payment_intent_id,
            data
        };
    }

    // Check for completed payment
    if (data.success && data.status === "succeeded") {
        return {
            isValid: true,
            isCompleted: true,
            data
        };
    }

    // Payment initiated but not completed
    if (data.payment_intent_id) {
        return {
            isValid: true,
            isPending: true,
            data
        };
    }

    return { isValid: false, error: "Invalid payment response" };
};

// ** Generate payment request ID
export const generateStripeRequestId = (customerId, planId) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `STRIPE_${customerId}_${planId}_${timestamp}_${random}`.toUpperCase();
};

// ** Default export with all utilities
export default {
    getStripeConfigRequest,
    stripeCardPaymentRequest,
    confirmStripePaymentRequest,
    buildStripePaymentPayload,
    buildStripeConfirmationPayload,
    validateStripePaymentResponse,
    generateStripeRequestId,
    handleApiError
};
