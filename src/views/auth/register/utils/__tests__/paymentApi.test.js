import {
    handleApiError,
    handleNetworkError,
    getRetryConfig,
    buildPaymentPayload,
    buildConfirmationPayload,
    validatePaymentResponse,
    sanitizePaymentData,
    checkPaymentStatus,
    formatPaymentAmount,
    generatePaymentReference,
    validatePaymentFormData
} from '../paymentApi';

// Mock dependencies
jest.mock('@src/utility/Utils', () => ({
    getDomailUrl: () => 'https://example.com'
}));

jest.mock('@constant/defaultValues', () => ({
    appsRoot: '/app'
}));

describe('Payment API Utilities', () => {

    describe('handleApiError', () => {
        it('should return response message when available', () => {
            const error = {
                response: {
                    data: {
                        message: 'Payment failed'
                    }
                }
            };
            expect(handleApiError(error)).toBe('Payment failed');
        });

        it('should return error message when response message not available', () => {
            const error = {
                message: 'Network error'
            };
            expect(handleApiError(error)).toBe('Network error');
        });

        it('should return default message when no specific message available', () => {
            const error = {};
            expect(handleApiError(error)).toBe('An unexpected error occurred. Please try again.');
        });
    });

    describe('handleNetworkError', () => {
        it('should handle network connection errors', () => {
            const error = { code: 'NETWORK_ERROR' };
            expect(handleNetworkError(error)).toBe('Network connection failed. Please check your internet connection and try again.');
        });

        it('should handle server errors', () => {
            const error = { response: { status: 500 } };
            expect(handleNetworkError(error)).toBe('Server error occurred. Please try again in a few moments.');
        });

        it('should handle rate limiting', () => {
            const error = { response: { status: 429 } };
            expect(handleNetworkError(error)).toBe('Too many requests. Please wait a moment before trying again.');
        });
    });

    describe('getRetryConfig', () => {
        it('should return retry config for valid attempts', () => {
            const config = getRetryConfig(0);
            expect(config).toEqual({
                attemptNumber: 1,
                maxRetries: 3,
                delay: 1000
            });
        });

        it('should return null when max retries exceeded', () => {
            const config = getRetryConfig(3);
            expect(config).toBeNull();
        });

        it('should use exponential backoff', () => {
            const config1 = getRetryConfig(1);
            const config2 = getRetryConfig(2);
            expect(config2.delay).toBe(config1.delay * 2);
        });
    });

    describe('buildPaymentPayload', () => {
        const mockData = {
            registerItem: { _id: 'user123', company_name: 'Test Co', email: 'test@example.com' },
            selectedPlan: {
                _id: 'plan123',
                name: 'Pro Plan',
                price: 100,
                special_price: 80,
                platform_price: 10,
                tax_value: 10,
                tools: [
                    { _id: 'tool1', price: 20 },
                    { _id: 'tool2', price: 30 }
                ]
            },
            selectedTools: ['tool1', 'tool2'],
            billingCycle: 'MONTHLY',
            paymentData: {
                holder_name: 'John Doe',
                card_number: '4532015112830366',
                expiry_month: '12',
                expiry_year: '2025',
                card_cvv: '123'
            }
        };

        it('should build correct payment payload', () => {
            const payload = buildPaymentPayload(mockData);

            expect(payload.customer_id).toBe('user123');
            expect(payload.plan_id).toBe('plan123');
            expect(payload.holder_name).toBe('John Doe');
            expect(payload.selected_tools).toEqual(['tool1', 'tool2']);
            expect(payload.billing_cycle).toBe('MONTHLY');
            expect(payload.metadata.company_name).toBe('Test Co');
        });

        it('should calculate pricing correctly', () => {
            const payload = buildPaymentPayload(mockData);

            // Tools: 20 + 30 = 50
            // Base price (special): 80
            // Subtotal: 50 + 80 = 130
            // Platform fee: 10
            // Tax: 130 * 0.1 = 13
            // Final: 130 + 10 + 13 = 153
            expect(payload.final_price).toBe(153);
        });

        it('should throw error for missing required data', () => {
            expect(() => {
                buildPaymentPayload({ ...mockData, registerItem: null });
            }).toThrow('Missing required payment data');
        });
    });

    describe('buildConfirmationPayload', () => {
        it('should build correct confirmation payload', () => {
            const payload = buildConfirmationPayload({
                requestId: 'req123',
                state: 'approved',
                action: 'confirm',
                customerId: 'user123'
            });

            expect(payload).toEqual({
                lang: 'en',
                request_id: 'req123',
                state: 'approved',
                action: 'confirm',
                customer_id: 'user123'
            });
        });

        it('should throw error for missing required data', () => {
            expect(() => {
                buildConfirmationPayload({ requestId: null, customerId: 'user123' });
            }).toThrow('Missing required confirmation data');
        });
    });

    describe('validatePaymentResponse', () => {
        it('should validate successful response with redirect', () => {
            const response = {
                success: true,
                data: {
                    data: {
                        _id: 'payment123',
                        redirectConfirm: 'https://paypal.com/confirm'
                    }
                }
            };

            const result = validatePaymentResponse(response);
            expect(result.isValid).toBe(true);
            expect(result.requiresRedirect).toBe(true);
            expect(result.redirectUrl).toBe('https://paypal.com/confirm');
        });

        it('should validate completed payment', () => {
            const response = {
                success: true,
                data: {
                    data: {
                        _id: 'payment123',
                        status: 'completed'
                    }
                }
            };

            const result = validatePaymentResponse(response);
            expect(result.isValid).toBe(true);
            expect(result.isCompleted).toBe(true);
        });

        it('should handle failed response', () => {
            const response = {
                success: false,
                error: 'Payment declined'
            };

            const result = validatePaymentResponse(response);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Payment declined');
        });
    });

    describe('sanitizePaymentData', () => {
        it('should mask sensitive payment data', () => {
            const paymentData = {
                holder_name: 'John Doe',
                card_number: '4532 0151 1283 0366',
                card_cvv: '123',
                expiry_month: '12'
            };

            const sanitized = sanitizePaymentData(paymentData);

            expect(sanitized.card_number_masked).toBe('****-****-****-0366');
            expect(sanitized.card_number).toBeUndefined();
            expect(sanitized.card_cvv).toBeUndefined();
            expect(sanitized.holder_name).toBe('John Doe');
        });
    });

    describe('checkPaymentStatus', () => {
        it('should return correct status for completed payment', () => {
            const paymentItem = { status: 'completed' };
            const result = checkPaymentStatus(paymentItem);

            expect(result.status).toBe('completed');
            expect(result.message).toBe('Payment completed successfully');
        });

        it('should handle unknown status', () => {
            const paymentItem = { status: 'unknown_status' };
            const result = checkPaymentStatus(paymentItem);

            expect(result.status).toBe('unknown');
            expect(result.message).toBe('Unknown payment status');
        });

        it('should handle null payment item', () => {
            const result = checkPaymentStatus(null);

            expect(result.status).toBe('unknown');
            expect(result.message).toBe('No payment information available');
        });
    });

    describe('formatPaymentAmount', () => {
        it('should format amount correctly', () => {
            expect(formatPaymentAmount(100.50)).toBe('$100.50');
            expect(formatPaymentAmount(0)).toBe('$0.00');
        });

        it('should handle invalid amounts', () => {
            expect(formatPaymentAmount('invalid')).toBe('$0.00');
            expect(formatPaymentAmount(null)).toBe('$0.00');
        });
    });

    describe('generatePaymentReference', () => {
        it('should generate unique payment reference', () => {
            const ref1 = generatePaymentReference('user123', 'plan456');
            const ref2 = generatePaymentReference('user123', 'plan456');

            expect(ref1).toMatch(/^PAY_USER123_PLAN456_\d+_[A-Z0-9]+$/);
            expect(ref1).not.toBe(ref2); // Should be unique
        });
    });

    describe('validatePaymentFormData', () => {
        const validFormData = {
            holder_name: 'John Doe',
            card_number: '4532015112830366',
            expiry_month: '12',
            expiry_year: '2025',
            card_cvv: '123'
        };

        it('should validate correct form data', () => {
            const result = validatePaymentFormData(validFormData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing required fields', () => {
            const invalidData = { ...validFormData, holder_name: '' };
            const result = validatePaymentFormData(invalidData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Card holder name is required');
        });

        it('should detect past expiry date', () => {
            const invalidData = {
                ...validFormData,
                expiry_month: '01',
                expiry_year: '2020'
            };
            const result = validatePaymentFormData(invalidData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Card expiry date cannot be in the past');
        });
    });
});