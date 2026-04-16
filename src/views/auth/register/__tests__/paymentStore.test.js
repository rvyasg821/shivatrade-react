import { configureStore } from '@reduxjs/toolkit';
import registerReducer, {
    paypalCardPayment,
    confirmRedirectPaypalPayment,
    cleanPaymentMessage,
    resetPaymentState
} from '../store';

// Mock axios
jest.mock('@src/utility/AxiosConfig', () => ({
    post: jest.fn()
}));

jest.mock('@src/utility/ApiEndPoints', () => ({
    API_ENDPOINTS: {
        payments: {
            paypalCardPayment: '/api/payments/paypal-card',
            confirmPaypalPayment: '/api/payments/confirm-redirect'
        }
    }
}));

describe('Payment Store Tests', () => {
    let store;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                register: registerReducer
            }
        });
    });

    describe('Initial State', () => {
        it('should have correct initial payment state', () => {
            const state = store.getState().register;

            expect(state.paymentItem).toBeNull();
            expect(state.paymentLoading).toBe(false);
            expect(state.paymentActionFlag).toBe('');
            expect(state.paymentSuccess).toBe('');
            expect(state.paymentError).toBe('');
        });
    });

    describe('Payment Actions', () => {
        describe('cleanPaymentMessage', () => {
            it('should clear payment messages', () => {
                // Set some payment state
                store.dispatch({
                    type: 'register/paypalCardPayment/fulfilled',
                    payload: {
                        paymentActionFlag: 'PPAL_CRD_PMNT_SCS',
                        paymentSuccess: 'Payment successful',
                        paymentError: ''
                    }
                });

                // Clean messages
                store.dispatch(cleanPaymentMessage());

                const state = store.getState().register;
                expect(state.paymentActionFlag).toBe('');
                expect(state.paymentSuccess).toBe('');
                expect(state.paymentError).toBe('');
            });
        });

        describe('resetPaymentState', () => {
            it('should reset entire payment state', () => {
                // Set some payment state
                store.dispatch({
                    type: 'register/paypalCardPayment/fulfilled',
                    payload: {
                        paymentItem: { _id: 'payment123' },
                        paymentActionFlag: 'PPAL_CRD_PMNT_SCS',
                        paymentSuccess: 'Payment successful',
                        paymentError: ''
                    }
                });

                // Reset state
                store.dispatch(resetPaymentState());

                const state = store.getState().register;
                expect(state.paymentItem).toBeNull();
                expect(state.paymentLoading).toBe(false);
                expect(state.paymentActionFlag).toBe('');
                expect(state.paymentSuccess).toBe('');
                expect(state.paymentError).toBe('');
            });
        });
    });

    describe('PayPal Card Payment Async Thunk', () => {
        const mockAxios = require('@src/utility/AxiosConfig');

        beforeEach(() => {
            mockAxios.post.mockClear();
        });

        it('should handle successful payment', async () => {
            const mockResponse = {
                data: {
                    statusCode: 200,
                    data: {
                        _id: 'payment123',
                        status: 'pending',
                        redirectConfirm: 'https://paypal.com/confirm'
                    },
                    message: 'Payment initiated'
                }
            };

            mockAxios.post.mockResolvedValue(mockResponse);

            const paymentData = {
                customer_id: 'user123',
                plan_id: 'plan123',
                holder_name: 'John Doe',
                card_number: '4532015112830366',
                expiry_month: '12',
                expiry_year: '2025',
                card_cvv: '123',
                final_price: 100
            };

            await store.dispatch(paypalCardPayment(paymentData));

            const state = store.getState().register;
            expect(state.paymentLoading).toBe(false);
            expect(state.paymentActionFlag).toBe('PPAL_CRD_PMNT_SCS');
            expect(state.paymentSuccess).toBe('Payment initiated');
            expect(state.paymentItem).toEqual(mockResponse.data.data);
        });

        it('should handle payment failure', async () => {
            const mockError = {
                response: {
                    data: {
                        message: 'Payment declined'
                    }
                }
            };

            mockAxios.post.mockRejectedValue(mockError);

            const paymentData = {
                customer_id: 'user123',
                plan_id: 'plan123',
                holder_name: 'John Doe',
                card_number: '4532015112830366',
                expiry_month: '12',
                expiry_year: '2025',
                card_cvv: '123',
                final_price: 100
            };

            await store.dispatch(paypalCardPayment(paymentData));

            const state = store.getState().register;
            expect(state.paymentLoading).toBe(false);
            expect(state.paymentActionFlag).toBe('PPAL_CRD_PMNT_ERR');
            expect(state.paymentError).toBe('Payment declined');
            expect(state.paymentItem).toBeNull();
        });

        it('should set loading state during payment', () => {
            const promise = store.dispatch(paypalCardPayment({}));

            const state = store.getState().register;
            expect(state.paymentLoading).toBe(true);
            expect(state.paymentActionFlag).toBe('');
            expect(state.paymentSuccess).toBe('');
            expect(state.paymentError).toBe('');

            return promise;
        });
    });

    describe('Confirm PayPal Payment Async Thunk', () => {
        const mockAxios = require('@src/utility/AxiosConfig');

        beforeEach(() => {
            mockAxios.post.mockClear();
        });

        it('should handle successful payment confirmation', async () => {
            const mockResponse = {
                data: {
                    statusCode: 200,
                    data: {
                        _id: 'payment123',
                        status: 'completed',
                        amount: 100
                    },
                    message: 'Payment confirmed'
                }
            };

            mockAxios.post.mockResolvedValue(mockResponse);

            const confirmationData = {
                request_id: 'req123',
                state: 'approved',
                action: 'confirm',
                customer_id: 'user123'
            };

            await store.dispatch(confirmRedirectPaypalPayment(confirmationData));

            const state = store.getState().register;
            expect(state.paymentLoading).toBe(false);
            expect(state.paymentActionFlag).toBe('PPAL_RDRT_PMNT_CNFRM_SCS');
            expect(state.paymentSuccess).toBe('Payment confirmed');
            expect(state.paymentItem).toEqual(mockResponse.data.data);
        });

        it('should handle confirmation failure', async () => {
            const mockError = {
                response: {
                    data: {
                        message: 'Confirmation failed'
                    }
                }
            };

            mockAxios.post.mockRejectedValue(mockError);

            const confirmationData = {
                request_id: 'req123',
                state: 'cancelled',
                action: 'cancel',
                customer_id: 'user123'
            };

            await store.dispatch(confirmRedirectPaypalPayment(confirmationData));

            const state = store.getState().register;
            expect(state.paymentLoading).toBe(false);
            expect(state.paymentActionFlag).toBe('PPAL_RDRT_PMNT_CNFRM_ERR');
            expect(state.paymentError).toBe('Confirmation failed');
            expect(state.paymentItem).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            const mockAxios = require('@src/utility/AxiosConfig');
            const networkError = new Error('Network Error');
            networkError.code = 'NETWORK_ERROR';

            mockAxios.post.mockRejectedValue(networkError);

            await store.dispatch(paypalCardPayment({}));

            const state = store.getState().register;
            expect(state.paymentError).toBe('Network Error');
        });

        it('should handle server errors', async () => {
            const mockAxios = require('@src/utility/AxiosConfig');
            const serverError = {
                response: {
                    status: 500,
                    data: {
                        message: 'Internal Server Error'
                    }
                }
            };

            mockAxios.post.mockRejectedValue(serverError);

            await store.dispatch(paypalCardPayment({}));

            const state = store.getState().register;
            expect(state.paymentError).toBe('Internal Server Error');
        });

        it('should handle malformed responses', async () => {
            const mockAxios = require('@src/utility/AxiosConfig');
            const malformedResponse = {
                data: null
            };

            mockAxios.post.mockResolvedValue(malformedResponse);

            await store.dispatch(paypalCardPayment({}));

            const state = store.getState().register;
            expect(state.paymentActionFlag).toBe('PPAL_CRD_PMNT_ERR');
            expect(state.paymentError).toContain('failed');
        });
    });

    describe('State Transitions', () => {
        it('should handle complete payment flow state transitions', async () => {
            const mockAxios = require('@src/utility/AxiosConfig');

            // Step 1: Initiate payment
            const paymentResponse = {
                data: {
                    statusCode: 200,
                    data: {
                        _id: 'payment123',
                        status: 'pending',
                        redirectConfirm: 'https://paypal.com/confirm'
                    },
                    message: 'Payment initiated'
                }
            };

            mockAxios.post.mockResolvedValueOnce(paymentResponse);

            await store.dispatch(paypalCardPayment({}));

            let state = store.getState().register;
            expect(state.paymentActionFlag).toBe('PPAL_CRD_PMNT_SCS');
            expect(state.paymentItem.status).toBe('pending');

            // Step 2: Confirm payment
            const confirmResponse = {
                data: {
                    statusCode: 200,
                    data: {
                        _id: 'payment123',
                        status: 'completed',
                        amount: 100
                    },
                    message: 'Payment confirmed'
                }
            };

            mockAxios.post.mockResolvedValueOnce(confirmResponse);

            await store.dispatch(confirmRedirectPaypalPayment({}));

            state = store.getState().register;
            expect(state.paymentActionFlag).toBe('PPAL_RDRT_PMNT_CNFRM_SCS');
            expect(state.paymentItem.status).toBe('completed');
        });

        it('should maintain state consistency during concurrent actions', async () => {
            const mockAxios = require('@src/utility/AxiosConfig');

            // Mock delayed response
            mockAxios.post.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({
                        data: {
                            statusCode: 200,
                            data: { _id: 'payment123' },
                            message: 'Success'
                        }
                    }), 100)
                )
            );

            // Dispatch multiple actions
            const promise1 = store.dispatch(paypalCardPayment({}));
            const promise2 = store.dispatch(confirmRedirectPaypalPayment({}));

            await Promise.all([promise1, promise2]);

            const state = store.getState().register;
            expect(state.paymentLoading).toBe(false);
            expect(state.paymentItem).toBeTruthy();
        });
    });
});