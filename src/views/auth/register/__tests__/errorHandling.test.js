import {
    getErrorType,
    getUserFriendlyMessage,
    isRetryableError,
    getRetryDelay,
    handlePaymentError,
    handleFormError,
    getRecoverySuggestions,
    ERROR_TYPES
} from '../utils/errorHandling';

describe('Error Handling Utilities', () => {

    describe('getErrorType', () => {
        it('should identify network errors', () => {
            const networkError = { code: 'NETWORK_ERROR' };
            expect(getErrorType(networkError)).toBe(ERROR_TYPES.NETWORK);
        });

        it('should identify server errors by status code', () => {
            const serverError = { response: { status: 500 } };
            expect(getErrorType(serverError)).toBe(ERROR_TYPES.SERVER);
        });

        it('should identify timeout errors', () => {
            const timeoutError = { code: 'ECONNABORTED' };
            expect(getErrorType(timeoutError)).toBe(ERROR_TYPES.TIMEOUT);
        });

        it('should identify validation errors', () => {
            const validationError = { response: { status: 400 } };
            expect(getErrorType(validationError)).toBe(ERROR_TYPES.VALIDATION);
        });

        it('should identify payment errors by message', () => {
            const paymentError = { message: 'Card declined by bank' };
            expect(getErrorType(paymentError)).toBe(ERROR_TYPES.PAYMENT);
        });

        it('should default to general error type', () => {
            const unknownError = { message: 'Something went wrong' };
            expect(getErrorType(unknownError)).toBe(ERROR_TYPES.GENERAL);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return appropriate message for network errors', () => {
            const error = { code: 'NETWORK_ERROR' };
            const message = getUserFriendlyMessage(error);
            expect(message).toContain('connect to our servers');
        });

        it('should return appropriate message for server errors', () => {
            const error = { response: { status: 500 } };
            const message = getUserFriendlyMessage(error);
            expect(message).toContain('temporarily unavailable');
        });

        it('should return specific payment error message when available', () => {
            const error = {
                message: 'Insufficient funds',
                response: { data: { message: 'Insufficient funds' } }
            };
            const message = getUserFriendlyMessage(error, ERROR_TYPES.PAYMENT);
            expect(message).toBe('Insufficient funds');
        });

        it('should return generic message for unknown errors', () => {
            const error = {};
            const message = getUserFriendlyMessage(error);
            expect(message).toContain('unexpected error');
        });
    });

    describe('isRetryableError', () => {
        it('should identify retryable errors', () => {
            expect(isRetryableError({}, ERROR_TYPES.NETWORK)).toBe(true);
            expect(isRetryableError({}, ERROR_TYPES.SERVER)).toBe(true);
            expect(isRetryableError({}, ERROR_TYPES.TIMEOUT)).toBe(true);
            expect(isRetryableError({}, ERROR_TYPES.GENERAL)).toBe(true);
        });

        it('should identify non-retryable errors', () => {
            expect(isRetryableError({}, ERROR_TYPES.VALIDATION)).toBe(false);
            expect(isRetryableError({}, ERROR_TYPES.PAYMENT)).toBe(false);
        });
    });

    describe('getRetryDelay', () => {
        it('should calculate exponential backoff delay', () => {
            expect(getRetryDelay(1, 1000)).toBe(1000);
            expect(getRetryDelay(2, 1000)).toBe(2000);
            expect(getRetryDelay(3, 1000)).toBe(4000);
        });

        it('should cap delay at maximum value', () => {
            const delay = getRetryDelay(10, 1000);
            expect(delay).toBeLessThanOrEqual(10000);
        });

        it('should add jitter to delay', () => {
            const delay1 = getRetryDelay(2, 1000);
            const delay2 = getRetryDelay(2, 1000);
            // Due to jitter, delays should be slightly different
            expect(Math.abs(delay1 - delay2)).toBeGreaterThan(0);
        });
    });

    describe('handlePaymentError', () => {
        it('should return comprehensive error information', () => {
            const error = {
                code: 'NETWORK_ERROR',
                message: 'Connection failed'
            };
            const context = { retryCount: 1, maxRetries: 3 };

            const result = handlePaymentError(error, context);

            expect(result.type).toBe(ERROR_TYPES.NETWORK);
            expect(result.message).toContain('connect to our servers');
            expect(result.originalError).toBe('Connection failed');
            expect(result.isRetryable).toBe(true);
            expect(result.canRetry).toBe(true);
            expect(result.suggestions).toBeInstanceOf(Array);
            expect(result.errorInfo).toBeDefined();
        });

        it('should indicate when max retries reached', () => {
            const error = { code: 'NETWORK_ERROR' };
            const context = { retryCount: 3, maxRetries: 3 };

            const result = handlePaymentError(error, context);

            expect(result.canRetry).toBe(false);
        });

        it('should handle non-retryable errors', () => {
            const error = { response: { status: 400 } };

            const result = handlePaymentError(error);

            expect(result.isRetryable).toBe(false);
            expect(result.canRetry).toBe(false);
        });
    });

    describe('handleFormError', () => {
        it('should handle validation errors with field mapping', () => {
            const error = {
                response: {
                    status: 400,
                    data: {
                        errors: {
                            card_number: 'Invalid card number',
                            holder_name: 'Name is required'
                        }
                    }
                }
            };

            const result = handleFormError(error);

            expect(result.type).toBe('validation');
            expect(result.fieldErrors).toEqual({
                card_number: 'Invalid Card number',
                holder_name: 'Name is required'
            });
            expect(result.message).toContain('correct the errors');
        });

        it('should handle non-validation form errors', () => {
            const error = { code: 'NETWORK_ERROR' };

            const result = handleFormError(error);

            expect(result.type).toBe(ERROR_TYPES.NETWORK);
            expect(result.isRetryable).toBe(true);
        });
    });

    describe('getRecoverySuggestions', () => {
        it('should return appropriate suggestions for network errors', () => {
            const suggestions = getRecoverySuggestions(ERROR_TYPES.NETWORK);

            expect(suggestions).toContain('Check your internet connection');
            expect(suggestions).toContain('Try switching to a different network');
        });

        it('should return appropriate suggestions for payment errors', () => {
            const suggestions = getRecoverySuggestions(ERROR_TYPES.PAYMENT);

            expect(suggestions).toContain('Verify your card details are correct');
            expect(suggestions).toContain('Check if your card has sufficient funds');
        });

        it('should return appropriate suggestions for validation errors', () => {
            const suggestions = getRecoverySuggestions(ERROR_TYPES.VALIDATION);

            expect(suggestions).toContain('Double-check all required fields');
            expect(suggestions).toContain('Ensure card number is entered correctly');
        });

        it('should return general suggestions for unknown error types', () => {
            const suggestions = getRecoverySuggestions('unknown');

            expect(suggestions).toContain('Refresh the page and try again');
            expect(suggestions).toContain('Contact support for assistance');
        });
    });

    describe('Error Logging', () => {
        let consoleSpy;

        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        it('should log errors in development mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = { message: 'Test error' };
            handlePaymentError(error);

            expect(consoleSpy).toHaveBeenCalled();

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Edge Cases', () => {
        it('should handle null/undefined errors gracefully', () => {
            expect(getErrorType(null)).toBe(ERROR_TYPES.GENERAL);
            expect(getErrorType(undefined)).toBe(ERROR_TYPES.GENERAL);
            expect(getUserFriendlyMessage(null)).toContain('unexpected error');
        });

        it('should handle errors without message or response', () => {
            const error = {};
            const result = handlePaymentError(error);

            expect(result.type).toBe(ERROR_TYPES.GENERAL);
            expect(result.originalError).toBe('Unknown error');
        });

        it('should handle malformed error responses', () => {
            const error = {
                response: {
                    data: null
                }
            };

            const result = handleFormError(error);
            expect(result.type).toBe(ERROR_TYPES.GENERAL);
        });
    });

    describe('Performance', () => {
        it('should handle large numbers of errors efficiently', () => {
            const startTime = Date.now();

            for (let i = 0; i < 1000; i++) {
                const error = { message: `Error ${i}` };
                handlePaymentError(error);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should process 1000 errors in less than 100ms
            expect(duration).toBeLessThan(100);
        });
    });
});