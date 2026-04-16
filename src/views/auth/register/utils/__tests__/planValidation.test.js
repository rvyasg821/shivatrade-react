import {
    validatePlanData,
    validatePlansArray,
    calculateTotalPrice,
    validateBillingCycle,
    handleNetworkError,
    getRetryConfig
} from '../planValidation';

const validPlan = {
    _id: 'plan_1',
    name: 'Premium Plan',
    tools: [
        {
            _id: 'tool_1',
            name: 'wazuh',
            price: 9.99
        }
    ],
    platform_price: 5,
    duration_type: 'MONTHLY',
    duration: 1,
    status: 1
};

describe('planValidation', () => {
    describe('validatePlanData', () => {
        test('returns no errors for valid plan', () => {
            const errors = validatePlanData(validPlan);
            expect(errors).toEqual([]);
        });

        test('returns error for missing plan', () => {
            const errors = validatePlanData(null);
            expect(errors).toContain('Plan data is missing');
        });

        test('returns error for missing plan ID', () => {
            const invalidPlan = { ...validPlan, _id: undefined };
            const errors = validatePlanData(invalidPlan);
            expect(errors).toContain('Plan ID is missing');
        });

        test('returns error for invalid plan name', () => {
            const invalidPlan = { ...validPlan, name: null };
            const errors = validatePlanData(invalidPlan);
            expect(errors).toContain('Plan name is invalid');
        });

        test('returns error for invalid tools array', () => {
            const invalidPlan = { ...validPlan, tools: 'not an array' };
            const errors = validatePlanData(invalidPlan);
            expect(errors).toContain('Plan tools data is invalid');
        });

        test('returns error for tool missing ID', () => {
            const invalidPlan = {
                ...validPlan,
                tools: [{ name: 'tool', price: 10 }]
            };
            const errors = validatePlanData(invalidPlan);
            expect(errors).toContain('Tool 1 is missing ID');
        });

        test('returns error for invalid platform price', () => {
            const invalidPlan = { ...validPlan, platform_price: -5 };
            const errors = validatePlanData(invalidPlan);
            expect(errors).toContain('Platform price is invalid');
        });

        test('returns error for invalid duration type', () => {
            const invalidPlan = { ...validPlan, duration_type: 'INVALID' };
            const errors = validatePlanData(invalidPlan);
            expect(errors).toContain('Plan duration type is invalid');
        });
    });

    describe('validatePlansArray', () => {
        test('returns no errors for valid plans array', () => {
            const errors = validatePlansArray([validPlan]);
            expect(errors).toEqual([]);
        });

        test('returns error for non-array input', () => {
            const errors = validatePlansArray('not an array');
            expect(errors).toContain('Plans data must be an array');
        });

        test('returns error for empty array', () => {
            const errors = validatePlansArray([]);
            expect(errors).toContain('No plans available');
        });

        test('returns errors for invalid plans in array', () => {
            const invalidPlan = { ...validPlan, _id: undefined };
            const errors = validatePlansArray([invalidPlan]);
            expect(errors[0]).toContain('Plan 1: Plan ID is missing');
        });
    });

    describe('calculateTotalPrice', () => {
        test('calculates correct total price', () => {
            const result = calculateTotalPrice(validPlan);
            expect(result.toolsTotal).toBe(9.99);
            expect(result.platformFee).toBe(5);
            expect(result.totalPrice).toBe(14.99);
            expect(result.isValid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('handles missing plan', () => {
            const result = calculateTotalPrice(null);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Plan is required for price calculation');
        });

        test('handles invalid plan data', () => {
            const invalidPlan = { ...validPlan, _id: undefined };
            const result = calculateTotalPrice(invalidPlan);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Invalid plan data');
        });

        test('handles multiple tools correctly', () => {
            const planWithMultipleTools = {
                ...validPlan,
                tools: [
                    { _id: 'tool_1', name: 'tool1', price: 10 },
                    { _id: 'tool_2', name: 'tool2', price: 15 }
                ]
            };
            const result = calculateTotalPrice(planWithMultipleTools);
            expect(result.toolsTotal).toBe(25);
            expect(result.totalPrice).toBe(30);
        });
    });

    describe('validateBillingCycle', () => {
        test('returns true for valid cycles', () => {
            expect(validateBillingCycle('MONTHLY')).toBe(true);
            expect(validateBillingCycle('YEARLY')).toBe(true);
        });

        test('returns false for invalid cycles', () => {
            expect(validateBillingCycle('WEEKLY')).toBe(false);
            expect(validateBillingCycle('monthly')).toBe(false);
            expect(validateBillingCycle(null)).toBe(false);
        });
    });

    describe('handleNetworkError', () => {
        test('handles offline status', () => {
            // Mock navigator.onLine
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            const result = handleNetworkError({});
            expect(result).toContain('No internet connection');
        });

        test('handles 404 error', () => {
            const error = {
                response: {
                    status: 404,
                    data: { message: 'Not found' }
                }
            };
            const result = handleNetworkError(error);
            expect(result).toContain('Plans not found');
        });

        test('handles 500 error', () => {
            const error = {
                response: {
                    status: 500,
                    data: { message: 'Server error' }
                }
            };
            const result = handleNetworkError(error);
            expect(result).toContain('Server error');
        });

        test('handles timeout error', () => {
            const error = {
                code: 'ECONNABORTED',
                message: 'timeout of 5000ms exceeded'
            };
            const result = handleNetworkError(error);
            expect(result).toContain('Request timed out');
        });

        test('handles generic error', () => {
            const error = {
                message: 'Something went wrong'
            };
            const result = handleNetworkError(error);
            expect(result).toBe('Something went wrong');
        });
    });

    describe('getRetryConfig', () => {
        test('returns retry config for first attempt', () => {
            const config = getRetryConfig(0);
            expect(config.shouldRetry).toBe(true);
            expect(config.delay).toBe(1000);
            expect(config.attemptNumber).toBe(1);
            expect(config.maxRetries).toBe(3);
        });

        test('returns exponential backoff delay', () => {
            const config1 = getRetryConfig(1);
            const config2 = getRetryConfig(2);

            expect(config1.delay).toBe(2000);
            expect(config2.delay).toBe(4000);
        });

        test('returns null when max retries exceeded', () => {
            const config = getRetryConfig(3);
            expect(config).toBe(null);
        });

        test('caps delay at maximum', () => {
            const config = getRetryConfig(10);
            expect(config).toBe(null); // Should be null due to max retries
        });
    });
});